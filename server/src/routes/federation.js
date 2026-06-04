import {
  getServerId, generatePairingCode, redeemCode, connectToPeer,
  getPeers, setServerName, handleIncomingWs
} from '../federation.js'
import { query } from '../db.js'
import QRCode from 'qrcode'

export default async function federationRoutes(fastify) {
  // Server identity
  fastify.get('/identity', async () => {
    const identity = await getServerId()
    return identity
  })

  fastify.post('/identity/name', async (req) => {
    const { name } = req.body
    if (!name) throw new Error('Name required')
    await setServerName(name)
    return { ok: true }
  })

  // Generate pairing code + QR (IP embedded for direct connection)
  fastify.post('/pair/generate', async () => {
    return generatePairingCode()
  })

  // Redeem a code from another server
  fastify.post('/pair/redeem', async (req, reply) => {
    const { code } = req.body
    if (!code) return reply.code(400).send({ error: 'Code required' })
    try {
      const result = await redeemCode(code.toUpperCase())
      return result
    } catch (e) {
      return reply.code(400).send({ error: e.message })
    }
  })

  // List connected peers
  fastify.get('/peers', async () => {
    const { rows: dbPeers } = await query(
      'SELECT * FROM federations ORDER BY created_at DESC'
    )
    const livePeers = getPeers()
    return dbPeers.map(p => ({
      ...p,
      status: livePeers.find(l => l.id === p.remote_server_id.toString())?.status || p.status
    }))
  })

  // Remove a federation
  fastify.delete('/peers/:id', async (req) => {
    await query(
      'UPDATE federations SET status=$1 WHERE remote_server_id=$2',
      ['removed', req.params.id]
    )
    return { ok: true }
  })

  // WebSocket endpoint for incoming peer connections
  fastify.get('/ws', { websocket: true }, (ws, req) => {
    handleIncomingWs(ws, req)
  })
}
