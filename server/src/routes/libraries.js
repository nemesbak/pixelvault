import { existsSync } from 'fs'
import { query } from '../db.js'
import { scanMedia } from '../scanner.js'

export default async function libraryRoutes(fastify) {
  fastify.get('/', async () => {
    const { rows } = await query(`
      SELECT l.*, COUNT(m.id)::int as item_count,
        COALESCE(SUM(m.file_size), 0)::bigint as total_size
      FROM libraries l
      LEFT JOIN media_items m ON m.library_id = l.id
      GROUP BY l.id ORDER BY l.created_at ASC
    `)
    return rows
  })

  fastify.post('/', async (req, reply) => {
    const { name, path } = req.body
    if (!name || !path) return reply.code(400).send({ error: 'Name and path required' })
    if (!existsSync(path)) return reply.code(400).send({ error: `Path not found in container: ${path}` })
    const { rows } = await query(
      `INSERT INTO libraries (name, path) VALUES ($1, $2) RETURNING *`,
      [name.trim(), path.trim()]
    )
    return rows[0]
  })

  fastify.delete('/:id', async (req, reply) => {
    const { rows } = await query('SELECT * FROM libraries WHERE id = $1', [req.params.id])
    if (!rows[0]) return reply.code(404).send({ error: 'Not found' })
    await query('UPDATE media_items SET library_id = NULL WHERE library_id = $1', [req.params.id])
    await query('DELETE FROM libraries WHERE id = $1', [req.params.id])
    return { ok: true }
  })

  fastify.post('/:id/scan', async (req, reply) => {
    const { rows } = await query('SELECT * FROM libraries WHERE id = $1', [req.params.id])
    if (!rows[0]) return reply.code(404).send({ error: 'Not found' })
    scanMedia(rows[0].path, rows[0].id).catch(e => console.error('[Scan]', e.message))
    return { message: 'Scan started', library: rows[0].name }
  })

  fastify.get('/stats', async () => {
    const [files, shows, users, size] = await Promise.all([
      query('SELECT COUNT(*) FROM media_items'),
      query('SELECT COUNT(*) FROM shows'),
      query('SELECT COUNT(*) FROM users'),
      query('SELECT COALESCE(SUM(file_size), 0) as total FROM media_items'),
    ])
    return {
      files: parseInt(files.rows[0].count),
      shows: parseInt(shows.rows[0].count),
      users: parseInt(users.rows[0].count),
      totalSize: parseInt(size.rows[0].total)
    }
  })
}
