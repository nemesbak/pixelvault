import { existsSync } from 'fs'
import { PassThrough } from 'stream'
import { createRequire } from 'module'
import { query } from '../db.js'

const require = createRequire(import.meta.url)
const ffmpeg = require('fluent-ffmpeg')

export default async function subtitleRoutes(fastify) {
  // GET /api/subtitles/:mediaId?track=0
  fastify.get('/:mediaId', async (req, reply) => {
    const { rows } = await query(
      'SELECT file_path, has_subtitles, subtitle_tracks FROM media_items WHERE id = $1',
      [req.params.mediaId]
    )
    if (!rows[0]) return reply.code(404).send()
    if (!rows[0].has_subtitles) return reply.code(404).send({ error: 'No subtitles' })

    const filePath = rows[0].file_path
    if (!existsSync(filePath)) return reply.code(404).send()

    const trackIndex = parseInt(req.query.track ?? '0')

    reply.headers({
      'Content-Type': 'text/vtt; charset=utf-8',
      'Cache-Control': 'public, max-age=3600'
    })

    const pass = new PassThrough()
    ffmpeg(filePath)
      .outputOptions([`-map 0:s:${trackIndex}`, '-f webvtt'])
      .on('error', (e) => { console.warn('[Subs]', e.message); pass.destroy() })
      .pipe(pass)

    req.raw.on('close', () => pass.destroy())
    return reply.send(pass)
  })
}
