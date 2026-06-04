import { readdirSync, statSync, mkdirSync, existsSync } from 'fs'
import { join, extname, basename, dirname } from 'path'
import { createRequire } from 'module'
import { query } from './db.js'
import { enrichMediaItem } from './tmdb.js'

const require = createRequire(import.meta.url)
const ffmpeg = require('fluent-ffmpeg')

const VIDEO_EXTS = new Set(['.mp4', '.mkv', '.avi', '.mov', '.webm', '.m4v', '.ts', '.wmv', '.flv', '.mpg', '.mpeg'])

function walkDir(dir) {
  const files = []
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) files.push(...walkDir(full))
      else if (entry.isFile() && VIDEO_EXTS.has(extname(entry.name).toLowerCase())) files.push(full)
    }
  } catch {}
  return files
}

function probeFile(filePath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, meta) => {
      if (err) reject(err)
      else resolve(meta)
    })
  })
}

function extractThumb(filePath, thumbPath, offset) {
  return new Promise((resolve, reject) => {
    const dir = dirname(thumbPath)
    const filename = basename(thumbPath)
    ffmpeg(filePath)
      .screenshots({ count: 1, timemarks: [offset], filename, folder: dir, size: '320x?' })
      .on('end', () => resolve())
      .on('error', (e) => reject(e))
  })
}

function cleanTitle(filename) {
  return basename(filename, extname(filename))
    .replace(/[._\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export async function scanMedia(mediaPath, libraryId = null) {
  // Resolve library id from path if not given
  if (!libraryId) {
    const { rows } = await query('SELECT id FROM libraries WHERE path = $1', [mediaPath])
    libraryId = rows[0]?.id ?? null
  }
  const thumbsDir = process.env.THUMBNAILS_PATH || '/thumbnails'
  if (!existsSync(thumbsDir)) mkdirSync(thumbsDir, { recursive: true })

  console.log(`[Scanner] Scanning ${mediaPath}...`)
  const files = walkDir(mediaPath)
  console.log(`[Scanner] Found ${files.length} video files`)

  let added = 0
  let skipped = 0

  for (const filePath of files) {
    const existing = await query('SELECT id FROM media_items WHERE file_path = $1', [filePath])
    if (existing.rows.length > 0) { skipped++; continue }

    try {
      const stat = statSync(filePath)
      const meta = await probeFile(filePath)
      const videoStream = meta.streams.find(s => s.codec_type === 'video')
      const audioStream = meta.streams.find(s => s.codec_type === 'audio')

      const duration = Math.floor(meta.format.duration || 0)
      const thumbOffset = Math.floor(duration * 0.1) || 5
      const mediaId = crypto.randomUUID()
      const thumbFile = `${mediaId}.jpg`
      const thumbPath = join(thumbsDir, thumbFile)

      try {
        await extractThumb(filePath, thumbPath, thumbOffset)
      } catch {}

      const subTracks = meta.streams
        .filter(s => s.codec_type === 'subtitle')
        .map((s, i) => ({ index: i, codec: s.codec_name, language: s.tags?.language || 'und', title: s.tags?.title || null }))

      await query(
        `INSERT INTO media_items (id, title, file_path, file_size, duration, width, height, video_codec, audio_codec, container, thumbnail, has_subtitles, subtitle_tracks, library_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
        [
          mediaId,
          cleanTitle(filePath),
          filePath,
          stat.size,
          duration,
          videoStream?.width || null,
          videoStream?.height || null,
          videoStream?.codec_name || null,
          audioStream?.codec_name || null,
          extname(filePath).slice(1).toLowerCase(),
          existsSync(thumbPath) ? thumbFile : null,
          subTracks.length > 0,
          JSON.stringify(subTracks),
          libraryId
        ]
      )
      await enrichMediaItem({ id: mediaId, title: cleanTitle(filePath) })
      added++
    } catch (e) {
      console.warn(`[Scanner] Skipped ${filePath}: ${e.message}`)
    }
  }

  console.log(`[Scanner] Done — ${added} added, ${skipped} already indexed`)
  return { added, skipped, total: files.length }
}
