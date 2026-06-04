import jwt from 'jsonwebtoken'
import QRCode from 'qrcode'
import { query } from '../db.js'

const JWT_SECRET = process.env.JWT_SECRET || 'pixelvault_dev_secret'

function genCode() {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export default async function pairingRoutes(fastify) {
  // Generate a pairing code for an existing user (call from web after login)
  fastify.post('/generate', async (req, reply) => {
    const auth = req.headers.authorization
    if (!auth) return reply.code(401).send({ error: 'Unauthorized' })

    let userId
    try {
      const decoded = jwt.verify(auth.replace('Bearer ', ''), JWT_SECRET)
      userId = decoded.id
    } catch {
      return reply.code(401).send({ error: 'Invalid token' })
    }

    const code = genCode()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 min

    await query('DELETE FROM pairing_codes WHERE user_id = $1', [userId])
    await query(
      'INSERT INTO pairing_codes (code, user_id, expires_at) VALUES ($1, $2, $3)',
      [code, userId, expiresAt]
    )

    const serverUrl = `http://${req.hostname}:${process.env.PORT || 3000}`
    const qrData = `${serverUrl}/pair/${code}`
    const qrDataUri = await QRCode.toDataURL(qrData, { width: 200, margin: 1 })

    return { code, qr: qrDataUri, expiresAt }
  })

  // Redeem a pairing code (from mobile/Android)
  fastify.post('/redeem', async (req, reply) => {
    const { code } = req.body
    if (!code) return reply.code(400).send({ error: 'Code required' })

    const { rows } = await query(
      'SELECT * FROM pairing_codes WHERE code = $1 AND used = FALSE AND expires_at > NOW()',
      [code]
    )
    if (!rows[0]) return reply.code(400).send({ error: 'Invalid or expired code' })

    await query('UPDATE pairing_codes SET used = TRUE WHERE id = $1', [rows[0].id])

    const user = await query('SELECT id, username, is_admin FROM users WHERE id = $1', [rows[0].user_id])
    if (!user.rows[0]) return reply.code(404).send({ error: 'User not found' })

    const token = jwt.sign({ id: user.rows[0].id, username: user.rows[0].username }, JWT_SECRET, { expiresIn: '90d' })
    return { token, user: user.rows[0] }
  })
}
