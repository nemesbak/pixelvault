/**
 * PixelVault Federation — P2P server linking
 *
 * Pairing strategy (priority order):
 *   1. Direct WebSocket via IP embedded in QR/code (instant if accessible)
 *   2. DHT lookup via BitTorrent DHT (works through most NATs, ~10-30s)
 *   3. Retry DHT every 30s (handles dynamic IP changes)
 *
 * Zero accounts, zero central servers. DHT bootstrap uses public BT nodes.
 */

import crypto from 'crypto'
import { createRequire } from 'module'
import { query } from './db.js'
import QRCode from 'qrcode'

const require = createRequire(import.meta.url)
const WS  = require('ws')
const DHT = require('bittorrent-dht')

const BOOTSTRAP = [
  'router.bittorrent.com:6881',
  'router.utorrent.com:6881',
  'dht.transmissionbt.com:6881',
  '67.215.246.10:6881',
  '82.221.103.244:6881',
  '91.108.4.1:6881'
]

const DHT_PORT   = parseInt(process.env.DHT_PORT || '6881')
const API_PORT   = parseInt(process.env.PORT     || '3000')
const REANNOUNCE = 20 * 60 * 1000

let   dht      = null
const peers    = new Map()
const pairingTimers = new Map()

process.on('SIGTERM', cleanup)
process.on('SIGINT',  cleanup)
function cleanup() { if (dht) { try { dht.destroy() } catch {} ; dht = null } }

// ─── Identity ─────────────────────────────────────────────────────────────────

export async function getServerId() {
  const { rows } = await query('SELECT id, name FROM server_identity LIMIT 1')
  return rows[0]
}

export async function setServerName(name) {
  await query('UPDATE server_identity SET name = $1', [name])
}

// ─── Info-hash ────────────────────────────────────────────────────────────────

function toHash(key) {
  return crypto.createHash('sha1').update(`pixelvault:v1:${key}`).digest()
}

// ─── Public IP ────────────────────────────────────────────────────────────────

async function getPublicIp() {
  try {
    const r = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(5000) })
    return (await r.json()).ip
  } catch { return null }
}

// ─── DHT operations ───────────────────────────────────────────────────────────

function dhtAnnounce(infoHash) {
  return new Promise(resolve => {
    if (!dht) return resolve()
    dht.announce(infoHash, API_PORT, err => {
      if (!err) console.log('[DHT] ✓ Announced in DHT')
      // "No nodes to query" is expected on Docker/Windows, silent on prod Linux
      resolve()
    })
  })
}

function dhtLookup(infoHash, timeoutMs = 30000) {
  const hexTarget = infoHash.toString('hex')
  return new Promise((resolve, reject) => {
    if (!dht) return reject(new Error('DHT not ready'))
    const found = []
    const seen  = new Set()

    const finish = () => {
      dht.removeListener('peer', onPeer)
      found.length ? resolve(found) : reject(new Error('No peers found in DHT'))
    }

    const timer = setTimeout(finish, timeoutMs)

    function onPeer(peer, hash) {
      if (hash.toString('hex') !== hexTarget) return
      const k = `${peer.host}:${peer.port}`
      if (seen.has(k)) return
      seen.add(k)
      found.push({ ip: peer.host, port: peer.port })
      if (found.length === 1) { clearTimeout(timer); setTimeout(finish, 3000) }
    }

    dht.on('peer', onPeer)
    dht.lookup(infoHash, err => {
      if (err && !found.length) { clearTimeout(timer); finish() }
    })
  })
}

// ─── Pairing code generation ──────────────────────────────────────────────────

export async function generatePairingCode() {
  const identity = await getServerId()
  const pubIp    = await getPublicIp()
  const code     = crypto.randomBytes(3).toString('hex').toUpperCase() // "A3F9B2"

  // Encode IP + port + serverId + authToken directly in the QR
  // This allows instant connection without DHT
  const token = crypto.randomBytes(16).toString('hex')
  const payload = Buffer.from(JSON.stringify({
    id:   identity.id,
    name: identity.name,
    ip:   pubIp,
    port: API_PORT,
    token,
    code
  })).toString('base64url')

  // Also announce in DHT as fallback (fire and forget)
  const hash = toHash(`pair:${code}`)
  dhtAnnounce(hash).catch(() => {})

  // Store token for verification (10 min)
  await query(
    `INSERT INTO pairing_codes (code, user_id, expires_at)
     SELECT $1, id, NOW() + INTERVAL '10 minutes' FROM server_identity LIMIT 1
     ON CONFLICT (code) DO UPDATE SET expires_at = NOW() + INTERVAL '10 minutes'`,
    [token]
  ).catch(() => {})

  // Re-announce every 5 min until expiry
  const iv = setInterval(() => dhtAnnounce(hash).catch(() => {}), 5 * 60 * 1000)
  pairingTimers.set(code, iv)
  setTimeout(() => { clearInterval(pairingTimers.get(code)); pairingTimers.delete(code) }, 10 * 60 * 1000)

  const display = `${code.slice(0, 3)}-${code.slice(3)}`
  const qr = await QRCode.toDataURL(`pvconnect://${payload}`, { width: 220, margin: 1 })
  return { code, display, payload, serverId: identity.id, serverName: identity.name, qr, expiresIn: 600 }
}

// ─── Redeem ───────────────────────────────────────────────────────────────────

export async function redeemCode(input) {
  // input can be: raw code "A3F9B2", formatted "A3F-9B2", or full base64url payload
  if (input.length > 10) {
    // It's a full payload (from QR scan)
    try {
      const data = JSON.parse(Buffer.from(input, 'base64url').toString())
      console.log(`[Fed] Redeeming QR payload for ${data.name} (${data.ip}:${data.port})`)
      return connectToPeer(data.id, data.name, [{ ip: data.ip, port: data.port }], data)
    } catch (e) {
      throw new Error('Payload QR inválido')
    }
  }

  // It's a short code — use DHT lookup
  const code = input.replace('-', '').toUpperCase()
  console.log(`[Fed] DHT lookup for code: ${code}`)
  const hash = toHash(`pair:${code}`)
  const candidates = await dhtLookup(hash, 30000)
  return connectToPeer(null, 'Servidor remoto', candidates)
}

// ─── Connection ───────────────────────────────────────────────────────────────

export async function connectToPeer(remoteId, remoteName, candidates, extra = {}) {
  const identity = await getServerId()

  for (const cand of (candidates || [])) {
    if (!cand.ip) continue
    const url = `ws://${cand.ip}:${cand.port}/api/federation/ws`
    console.log(`[Fed] Trying ${url}`)
    const ws = await tryConnect(url, identity.id, identity.name)
    if (ws) {
      const resolvedId = remoteId || 'pending'
      attachPeer(resolvedId, remoteName, ws)
      if (remoteId) await upsertFederation(remoteId, remoteName, 'connected')
      return { ok: true, message: `Conectando a ${remoteName}...` }
    }
  }

  if (remoteId) await upsertFederation(remoteId, remoteName, 'pending')
  return { ok: false, message: 'No se pudo conectar aún. Reintentando automáticamente...' }
}

function tryConnect(url, myId, myName) {
  return new Promise(resolve => {
    const ws = new WS(url, { headers: { 'x-pv-id': myId, 'x-pv-name': myName }, handshakeTimeout: 5000 })
    ws.once('open',  () => resolve(ws))
    ws.once('error', () => resolve(null))
    setTimeout(() => { if (ws.readyState !== WS.OPEN) { ws.terminate(); resolve(null) } }, 6000)
  })
}

// ─── Peer management ──────────────────────────────────────────────────────────

function attachPeer(remoteId, remoteName, ws) {
  peers.set(remoteId, { ws, name: remoteName, status: 'connected' })
  console.log(`[Fed] ✓ Conectado a ${remoteName}`)

  ws.on('message', data => handleMsg(remoteId, data.toString()))
  ws.on('close',   () => {
    peers.set(remoteId, { ws: null, name: remoteName, status: 'disconnected' })
    query('UPDATE federations SET status=$1 WHERE remote_server_id=$2', ['disconnected', remoteId]).catch(() => {})
    if (remoteId !== 'pending') scheduleReconnect(remoteId)
  })
  ws.on('error', e => console.warn(`[Fed] WS (${remoteName}):`, e.message))
  send(remoteId, { type: 'hello' })
}

export function handleIncomingWs(socket, req) {
  const remoteId   = req.headers['x-pv-id']   || 'unknown'
  const remoteName = req.headers['x-pv-name']  || 'Servidor remoto'
  console.log(`[Fed] Incoming: ${remoteName}`)
  attachPeer(remoteId, remoteName, socket)
  upsertFederation(remoteId, remoteName, 'connected').catch(() => {})
}

function send(remoteId, data) {
  const p = peers.get(remoteId)
  if (p?.ws?.readyState === WS.OPEN) p.ws.send(JSON.stringify(data))
}

async function handleMsg(remoteId, raw) {
  let msg; try { msg = JSON.parse(raw) } catch { return }
  switch (msg.type) {
    case 'hello': {
      const identity = await getServerId()
      send(remoteId, { type: 'identity', serverId: identity.id, serverName: identity.name })
      const [s, m] = await Promise.all([
        query('SELECT COUNT(*) FROM shows'),
        query('SELECT COUNT(*) FROM media_items')
      ])
      send(remoteId, { type: 'library_info', shows: +s.rows[0].count, items: +m.rows[0].count })
      break
    }
    case 'identity': {
      const peer = peers.get(remoteId)
      if (remoteId === 'pending' || remoteId === 'unknown') {
        peers.delete(remoteId)
        peers.set(msg.serverId, { ...peer, name: msg.serverName })
      }
      await upsertFederation(msg.serverId, msg.serverName, 'connected')
      break
    }
    case 'library_info':
      console.log(`[Fed] ${peers.get(remoteId)?.name}: ${msg.shows} series, ${msg.items} archivos`)
      await query('UPDATE federations SET last_seen=NOW() WHERE remote_server_id=$1', [remoteId])
      break
    case 'ping': send(remoteId, { type: 'pong' }); break
  }
}

// ─── Reconnect ────────────────────────────────────────────────────────────────

function scheduleReconnect(remoteId) {
  setTimeout(async () => {
    const { rows } = await query('SELECT * FROM federations WHERE remote_server_id=$1', [remoteId])
    if (!rows[0] || rows[0].status === 'removed') return
    console.log(`[Fed] Reconnecting to ${rows[0].remote_name}...`)
    try {
      const candidates = await dhtLookup(toHash(remoteId), 20000)
      const r = await connectToPeer(remoteId, rows[0].remote_name, candidates)
      if (!r.ok) scheduleReconnect(remoteId)
    } catch { scheduleReconnect(remoteId) }
  }, 30000)
}

async function upsertFederation(remoteId, remoteName, status) {
  if (!remoteId || remoteId === 'pending' || remoteId === 'unknown') return
  await query(
    `INSERT INTO federations (remote_server_id, remote_name, status, last_seen)
     VALUES ($1,$2,$3,NOW())
     ON CONFLICT (remote_server_id) DO UPDATE
     SET remote_name=$2, status=$3, last_seen=NOW()`,
    [remoteId, remoteName, status]
  )
}

export function getPeers() {
  return Array.from(peers.entries()).map(([id, p]) => ({ id, name: p.name, status: p.status }))
}

// ─── Startup ──────────────────────────────────────────────────────────────────

export async function startFederation() {
  cleanup()
  const identity = await getServerId()
  console.log(`[Fed] ID: ${identity.id} — ${identity.name}`)

  dht = new DHT({ bootstrap: BOOTSTRAP, concurrency: 16 })
  dht.on('error', e => console.warn('[DHT]', e.message))

  dht.listen(DHT_PORT, () => {
    console.log(`[DHT] Escuchando en UDP ${DHT_PORT}`)
    // Once listening, try announcing immediately and periodically
    const hash = toHash(identity.id)
    const tryAnnounce = () => {
      dhtAnnounce(hash).catch(() => {}) // Silent on Docker/Windows — works on Linux
      setTimeout(tryAnnounce, REANNOUNCE)
    }
    setTimeout(tryAnnounce, 8000)
  })

  // Reconnect to saved federations using DHT
  const { rows } = await query(`SELECT * FROM federations WHERE status != 'removed'`)
  for (const fed of rows) scheduleReconnect(fed.remote_server_id)
}
