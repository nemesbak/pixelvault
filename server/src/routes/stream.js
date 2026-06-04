import { createReadStream, statSync, existsSync } from 'fs'
import { PassThrough } from 'stream'
import { lookup } from 'mime-types'
import { createRequire } from 'module'
import { query } from '../db.js'

const require = createRequire(import.meta.url)
const ffmpeg = require('fluent-ffmpeg')

// Audio codecs that browsers can't decode natively
const INCOMPATIBLE_AUDIO = new Set(['ac3', 'eac3', 'dts', 'dca', 'truehd', 'mlp', 'dts-hd'])

export default async function streamRoutes(fastify) {
  fastify.get('/:id', async (req, reply) => {
    const { rows } = await query(
      'SELECT file_path, title, audio_codec FROM media_items WHERE id = $1',
      [req.params.id]
    )
    if (!rows[0]) return reply.code(404).send({ error: 'Not found' })

    const { file_path: filePath, audio_codec: audioCodec } = rows[0]
    if (!existsSync(filePath)) return reply.code(404).send({ error: 'File not found on disk' })

    const needsTranscode = INCOMPATIBLE_AUDIO.has(audioCodec?.toLowerCase())

    if (needsTranscode) {
      const startTime = parseInt(req.query.t || '0') || 0
      console.log(`[Stream] Transcoding audio (${audioCodec} → AAC) for ${rows[0].title}${startTime ? ` from ${startTime}s` : ''}`)

      reply.headers({
        'Content-Type': 'video/mp4',
        'Cache-Control': 'no-cache',
        'X-Pixelvault-Transcode': 'audio',
        'X-Pixelvault-Original-Codec': audioCodec
      })

      const pass = new PassThrough()
      const proc = ffmpeg(filePath)

      if (startTime > 0) proc.inputOptions([`-ss ${startTime}`])

      proc
        .outputOptions([
          '-map 0:V:0',
          '-map 0:a:0',
          '-c:v copy',
          '-c:a aac',
          '-b:a 192k',
          '-ac 2',
          '-movflags frag_keyframe+empty_moov+default_base_moof',
          '-f mp4'
        ])
        .on('error', (err) => {
          if (!err.message.includes('SIGKILL')) {
            console.warn(`[Stream] Transcode error: ${err.message}`)
          }
          pass.destroy()
        })
        .pipe(pass)

      req.raw.on('close', () => { try { proc.kill('SIGKILL') } catch {} })

      return reply.send(pass)
    }

    // Direct play with Range requests (compatible codecs)
    const stat = statSync(filePath)
    const fileSize = stat.size
    const mimeType = lookup(filePath) || 'video/mp4'
    const range = req.headers.range

    if (range) {
      const [startStr, endStr] = range.replace(/bytes=/, '').split('-')
      const start = parseInt(startStr, 10)
      const end = endStr ? parseInt(endStr, 10) : fileSize - 1
      const chunkSize = end - start + 1

      reply.code(206).headers({
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': mimeType,
        'Cache-Control': 'no-cache'
      })
      return reply.send(createReadStream(filePath, { start, end }))
    }

    reply.headers({
      'Content-Length': fileSize,
      'Content-Type': mimeType,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'no-cache'
    })
    return reply.send(createReadStream(filePath))
  })
}
