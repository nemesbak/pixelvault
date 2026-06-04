import { query } from '../db.js'
import { scanMedia } from '../scanner.js'

export default async function mediaRoutes(fastify) {
  fastify.get('/', async (req, reply) => {
    const { search, page = 1, limit = 50 } = req.query
    const offset = (page - 1) * limit

    let q = 'SELECT * FROM media_items'
    const params = []
    if (search) {
      params.push(`%${search}%`)
      q += ` WHERE title ILIKE $1`
    }
    q += ` ORDER BY title ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`
    params.push(limit, offset)

    const rows = await query(q, params)
    const count = await query('SELECT COUNT(*) FROM media_items' + (search ? ` WHERE title ILIKE $1` : ''), search ? [`%${search}%`] : [])

    return {
      items: rows.rows,
      total: parseInt(count.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit)
    }
  })

  fastify.get('/:id', async (req, reply) => {
    const { rows } = await query('SELECT * FROM media_items WHERE id = $1', [req.params.id])
    if (!rows[0]) return reply.code(404).send({ error: 'Not found' })
    return rows[0]
  })

  fastify.post('/scan', async (req, reply) => {
    const mediaPath = process.env.MEDIA_PATH || '/media'
    // Run async, return immediately
    scanMedia(mediaPath).catch(e => console.error('[Scan error]', e))
    return { message: 'Scan started', path: mediaPath }
  })

  fastify.get('/progress/:userId/:mediaId', async (req, reply) => {
    const { rows } = await query(
      'SELECT * FROM watch_progress WHERE user_id = $1 AND media_id = $2',
      [req.params.userId, req.params.mediaId]
    )
    return rows[0] || { position: 0, completed: false }
  })

  fastify.get('/continue-watching/:userId', async (req) => {
    const { rows } = await query(`
      SELECT m.*, wp.position, wp.updated_at as watched_at,
             s.title as show_title, s.poster as show_poster, s.type as show_type
      FROM watch_progress wp
      JOIN media_items m ON m.id = wp.media_id
      LEFT JOIN shows s ON s.id = m.show_id
      WHERE wp.user_id = $1 AND wp.completed = FALSE AND wp.position > 30
        AND m.duration IS NOT NULL AND wp.position < m.duration * 0.9
      ORDER BY wp.updated_at DESC
      LIMIT 12
    `, [req.params.userId])
    return rows
  })

  fastify.post('/progress', async (req, reply) => {
    const { userId, mediaId, position, completed = false } = req.body
    await query(
      `INSERT INTO watch_progress (user_id, media_id, position, completed, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (user_id, media_id) DO UPDATE
       SET position = $3, completed = $4, updated_at = NOW()`,
      [userId, mediaId, position, completed]
    )
    return { ok: true }
  })
}
