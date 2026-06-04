import { query } from '../db.js'
import { enrichLibrary } from '../tmdb.js'

export default async function showRoutes(fastify) {
  // All shows/movies with episode count
  fastify.get('/', async (req) => {
    const { type, search } = req.query

    let q = `
      SELECT s.*,
        COUNT(m.id)::integer as item_count,
        MAX(m.scanned_at) as last_added
      FROM shows s
      LEFT JOIN media_items m ON m.show_id = s.id
    `
    const params = []
    const where = []
    if (type) { params.push(type); where.push(`s.type = $${params.length}`) }
    if (search) { params.push(`%${search}%`); where.push(`s.title ILIKE $${params.length}`) }
    if (where.length) q += ' WHERE ' + where.join(' AND ')
    q += ' GROUP BY s.id ORDER BY s.title ASC'

    const { rows } = await query(q, params)
    return rows
  })

  // Single show with episodes
  fastify.get('/:id', async (req, reply) => {
    const { rows: show } = await query('SELECT * FROM shows WHERE id = $1', [req.params.id])
    if (!show[0]) return reply.code(404).send({ error: 'Not found' })

    const { rows: episodes } = await query(
      `SELECT * FROM media_items WHERE show_id = $1
       ORDER BY season ASC NULLS LAST, episode ASC NULLS LAST, title ASC`,
      [req.params.id]
    )
    return { ...show[0], episodes }
  })

  // Trigger TMDB enrichment
  fastify.post('/enrich', async () => {
    enrichLibrary().catch(e => console.error('[Enrich error]', e.message))
    return { message: 'Enrichment started' }
  })

  // Items without a show (unmatched)
  fastify.get('/unmatched', async () => {
    const { rows } = await query(
      `SELECT * FROM media_items WHERE show_id IS NULL ORDER BY title ASC`
    )
    return rows
  })
}
