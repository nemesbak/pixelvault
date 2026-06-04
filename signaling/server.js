// PixelVault Connect — self-hosted signaling server
// Stores only: code/serverId → IP candidates (in memory, TTL-based)
// No database, no accounts, no user data

import { createServer } from 'http'

const store = new Map() // key → { data, expiresAt }

function set(key, data, ttlSeconds) {
  store.set(key, { data, expiresAt: Date.now() + ttlSeconds * 1000 })
}

function get(key) {
  const entry = store.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) { store.delete(key); return null }
  return entry.data
}

// Cleanup expired entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, val] of store.entries()) {
    if (now > val.expiresAt) store.delete(key)
  }
}, 5 * 60 * 1000)

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
}

function json(res, data, status = 200) {
  res.writeHead(status, cors)
  res.end(JSON.stringify(data))
}

async function body(req) {
  return new Promise((resolve) => {
    let data = ''
    req.on('data', c => data += c)
    req.on('end', () => { try { resolve(JSON.parse(data)) } catch { resolve({}) } })
  })
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost')

  if (req.method === 'OPTIONS') { res.writeHead(204, cors); res.end(); return }

  if (req.method === 'POST' && url.pathname === '/register') {
    const { serverId, serverName, candidates } = await body(req)
    if (!serverId) return json(res, { error: 'Missing serverId' }, 400)
    set(`server:${serverId}`, { serverId, serverName, candidates, updatedAt: Date.now() }, 7200)
    return json(res, { ok: true })
  }

  if (req.method === 'POST' && url.pathname === '/pair') {
    const { code, serverId, serverName, candidates } = await body(req)
    if (!code || !serverId) return json(res, { error: 'Missing fields' }, 400)
    set(`pair:${code.toUpperCase()}`, { serverId, serverName, candidates, createdAt: Date.now() }, 600)
    return json(res, { ok: true, code: code.toUpperCase() })
  }

  const pairMatch = url.pathname.match(/^\/pair\/([A-Z0-9]+)$/)
  if (req.method === 'GET' && pairMatch) {
    const data = get(`pair:${pairMatch[1]}`)
    return data ? json(res, data) : json(res, { error: 'Code not found or expired' }, 404)
  }

  const serverMatch = url.pathname.match(/^\/server\/(.+)$/)
  if (req.method === 'GET' && serverMatch) {
    const data = get(`server:${serverMatch[1]}`)
    return data ? json(res, data) : json(res, { error: 'Server not found' }, 404)
  }

  if (req.method === 'GET' && url.pathname === '/health') {
    return json(res, { ok: true, entries: store.size })
  }

  json(res, { error: 'Not found' }, 404)
})

const PORT = process.env.PORT || 4747
server.listen(PORT, '0.0.0.0', () => {
  console.log(`[PixelVault Signal] Running on port ${PORT}`)
  console.log(`[PixelVault Signal] No accounts, no data stored beyond 2h TTL`)
})
