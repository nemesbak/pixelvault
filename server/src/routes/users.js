import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { query } from '../db.js'

const JWT_SECRET = process.env.JWT_SECRET || 'pixelvault_dev_secret'

function verifyToken(req, reply) {
  const auth = req.headers.authorization
  if (!auth) { reply.code(401).send({ error: 'Unauthorized' }); return null }
  try { return jwt.verify(auth.replace('Bearer ', ''), JWT_SECRET) }
  catch { reply.code(401).send({ error: 'Invalid token' }); return null }
}

export default async function userRoutes(fastify) {
  fastify.post('/register', async (req, reply) => {
    const { username, password } = req.body
    if (!username || !password) return reply.code(400).send({ error: 'Username and password required' })

    const existing = await query('SELECT id FROM users WHERE username = $1', [username])
    if (existing.rows.length > 0) return reply.code(409).send({ error: 'Username taken' })

    const hash = await bcrypt.hash(password, 10)
    const { rows } = await query(
      `INSERT INTO users (username, password_hash, is_admin) VALUES ($1, $2, $3) RETURNING id, username, is_admin`,
      [username, hash, (await query('SELECT COUNT(*) FROM users')).rows[0].count === '0']
    )
    const token = jwt.sign({ id: rows[0].id, username: rows[0].username }, JWT_SECRET, { expiresIn: '30d' })
    return { token, user: rows[0] }
  })

  fastify.post('/login', async (req, reply) => {
    const { username, password } = req.body
    const { rows } = await query('SELECT * FROM users WHERE username = $1', [username])
    if (!rows[0]) return reply.code(401).send({ error: 'Invalid credentials' })

    const ok = await bcrypt.compare(password, rows[0].password_hash)
    if (!ok) return reply.code(401).send({ error: 'Invalid credentials' })

    const token = jwt.sign({ id: rows[0].id, username: rows[0].username }, JWT_SECRET, { expiresIn: '30d' })
    return { token, user: { id: rows[0].id, username: rows[0].username, is_admin: rows[0].is_admin } }
  })

  // Admin: list all users
  fastify.get('/', async (req, reply) => {
    const user = verifyToken(req, reply)
    if (!user) return
    const { rows: me } = await query('SELECT is_admin FROM users WHERE id = $1', [user.id])
    if (!me[0]?.is_admin) return reply.code(403).send({ error: 'Admin only' })
    const { rows } = await query('SELECT id, username, is_admin, created_at FROM users ORDER BY created_at ASC')
    return rows
  })

  // Admin: delete user
  fastify.delete('/:id', async (req, reply) => {
    const user = verifyToken(req, reply)
    if (!user) return
    const { rows: me } = await query('SELECT is_admin FROM users WHERE id = $1', [user.id])
    if (!me[0]?.is_admin) return reply.code(403).send({ error: 'Admin only' })
    if (req.params.id === user.id) return reply.code(400).send({ error: 'Cannot delete yourself' })
    await query('DELETE FROM users WHERE id = $1', [req.params.id])
    return { ok: true }
  })

  fastify.get('/me', async (req, reply) => {
    const auth = req.headers.authorization
    if (!auth) return reply.code(401).send({ error: 'Unauthorized' })
    try {
      const user = jwt.verify(auth.replace('Bearer ', ''), JWT_SECRET)
      const { rows } = await query('SELECT id, username, is_admin FROM users WHERE id = $1', [user.id])
      return rows[0] || reply.code(404).send({ error: 'User not found' })
    } catch {
      return reply.code(401).send({ error: 'Invalid token' })
    }
  })
}
