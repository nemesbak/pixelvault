import { createWriteStream, existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import { query } from './db.js'

const BASE = 'https://api.themoviedb.org/3'
const IMG_BASE = 'https://image.tmdb.org/t/p/w500'

function token() {
  return process.env.TMDB_TOKEN
}

async function tmdbGet(path) {
  if (!token()) return null
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' }
  })
  if (!res.ok) return null
  return res.json()
}

async function downloadPoster(tmdbPath, localName) {
  if (!tmdbPath) return null
  const postersDir = join(process.env.THUMBNAILS_PATH || '/thumbnails', 'posters')
  if (!existsSync(postersDir)) mkdirSync(postersDir, { recursive: true })
  const localPath = join(postersDir, localName)
  if (existsSync(localPath)) return `posters/${localName}`
  try {
    const res = await fetch(`${IMG_BASE}${tmdbPath}`)
    if (!res.ok) return null
    const buffer = await res.arrayBuffer()
    const { writeFile } = await import('fs/promises')
    await writeFile(localPath, Buffer.from(buffer))
    return `posters/${localName}`
  } catch {
    return null
  }
}

// ─── Filename parser ────────────────────────────────────────────────────────

const JUNK = /\b(hdtv|bluray|blu-ray|webrip|web-dl|dvdrip|1080p|720p|480p|x264|x265|hevc|avc|h264|h265|aac|ac3|eac3|dts|castellano|español|spanish|latino|english|subs?|mkv|mp4|avi|multi|forced)\b|ac[\s\-]?3\b|dts[\s\-]?(hd|ma)?\b|eac[\s\-]?3\b/gi
const YEAR_RE = /[\[(]?(19|20)\d{2}[\])]?/

// Patterns for season/episode detection (order matters)
// split:'before' → show title is everything BEFORE the pattern (SxxExx style)
// split:'after'  → show title is everything AFTER the pattern (501 prefix style)
const EP_PATTERNS = [
  { re: /[Ss](\d{1,2})[Ee](\d{1,2})/, s: 1, e: 2, split: 'before' },
  { re: /(\d{1,2})x(\d{2})/, s: 1, e: 2, split: 'before' },
  { re: /[Tt]emp(?:orada)?\s*(\d+)\s*[Ee]p?(?:isodio)?\s*(\d+)/, s: 1, e: 2, split: 'before' },
  { re: /^(\d)(\d{2})\s*[-–]/, s: 1, e: 2, split: 'after' },
  { re: /^(\d{3,4})\s*[-–\s]/, capture: true, split: 'after' },
]

export function parseFilename(filename) {
  // Remove extension
  let name = filename.replace(/\.[^.]+$/, '')

  // Remove bracket/paren blocks first — always contain quality/lang junk
  name = name.replace(/\[.*?\]/g, ' ').replace(/\(.*?\)/g, ' ').replace(/\s+/g, ' ').trim()

  let season = null
  let episode = null

  for (const pat of EP_PATTERNS) {
    const m = name.match(pat.re)
    if (!m) continue
    if (pat.capture) {
      const num = m[1]
      if (num.length === 3) { season = parseInt(num[0]); episode = parseInt(num.slice(1)) }
      else if (num.length === 4) { season = parseInt(num.slice(0, 2)); episode = parseInt(num.slice(2)) }
    } else {
      season = parseInt(m[pat.s])
      episode = parseInt(m[pat.e])
    }
    // For SxxExx: show title = everything before the code
    // For 501 prefix: show title = everything after the code
    if (pat.split === 'before') {
      name = name.slice(0, m.index).trim()
    } else {
      name = (name.slice(0, m.index) + name.slice(m.index + m[0].length)).trim()
    }
    break
  }

  // Clean up remaining junk
  let title = name
    .replace(YEAR_RE, '')
    .replace(JUNK, '')
    .replace(/[-–_\.]+/g, ' ')
    .replace(/\[.*?\]/g, '')
    .replace(/\(.*?\)/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim()

  const isEpisode = season !== null && episode !== null
  return { title, season, episode, isEpisode }
}

// ─── TMDB search ────────────────────────────────────────────────────────────

export async function searchShow(title) {
  const data = await tmdbGet(`/search/tv?query=${encodeURIComponent(title)}&language=es-ES`)
  return data?.results?.[0] ?? null
}

export async function searchMovie(title) {
  const data = await tmdbGet(`/search/movie?query=${encodeURIComponent(title)}&language=es-ES`)
  return data?.results?.[0] ?? null
}

export async function getEpisodeInfo(tmdbId, season, episode) {
  return tmdbGet(`/tv/${tmdbId}/season/${season}/episode/${episode}?language=es-ES`)
}

// ─── Upsert show in DB ──────────────────────────────────────────────────────

export async function upsertShow(tmdbShow) {
  const existing = await query('SELECT id FROM shows WHERE tmdb_id = $1', [tmdbShow.id])
  if (existing.rows[0]) return existing.rows[0].id

  const poster = await downloadPoster(tmdbShow.poster_path, `show_${tmdbShow.id}.jpg`)
  const backdrop = await downloadPoster(tmdbShow.backdrop_path, `backdrop_${tmdbShow.id}.jpg`)

  const { rows } = await query(
    `INSERT INTO shows (tmdb_id, title, original_title, overview, poster, backdrop, first_air_date, vote_average, genres, type)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'series') RETURNING id`,
    [
      tmdbShow.id,
      tmdbShow.name,
      tmdbShow.original_name,
      tmdbShow.overview,
      poster,
      backdrop,
      tmdbShow.first_air_date,
      tmdbShow.vote_average,
      tmdbShow.genre_ids ? [] : (tmdbShow.genres?.map(g => g.name) ?? [])
    ]
  )
  return rows[0].id
}

export async function upsertMovie(tmdbMovie) {
  const existing = await query('SELECT id FROM shows WHERE tmdb_id = $1', [tmdbMovie.id])
  if (existing.rows[0]) return existing.rows[0].id

  const poster = await downloadPoster(tmdbMovie.poster_path, `movie_${tmdbMovie.id}.jpg`)
  const backdrop = await downloadPoster(tmdbMovie.backdrop_path, `mbackdrop_${tmdbMovie.id}.jpg`)

  const { rows } = await query(
    `INSERT INTO shows (tmdb_id, title, original_title, overview, poster, backdrop, first_air_date, vote_average, type)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'movie') RETURNING id`,
    [
      tmdbMovie.id,
      tmdbMovie.title,
      tmdbMovie.original_title,
      tmdbMovie.overview,
      poster,
      backdrop,
      tmdbMovie.release_date,
      tmdbMovie.vote_average
    ]
  )
  return rows[0].id
}

// ─── Enrich a single media item ─────────────────────────────────────────────

export async function enrichMediaItem(item) {
  if (!token()) return
  const { title, season, episode, isEpisode } = parseFilename(item.title)
  if (!title || title.length < 2) return

  try {
    if (isEpisode) {
      const show = await searchShow(title)
      if (!show) return
      const showId = await upsertShow(show)
      let epTitle = null
      let overview = null
      const epInfo = await getEpisodeInfo(show.id, season, episode)
      if (epInfo) { epTitle = epInfo.name; overview = epInfo.overview }
      await query(
        `UPDATE media_items SET show_id=$1, season=$2, episode=$3, episode_title=$4, overview=$5, type='episode'
         WHERE id=$6`,
        [showId, season, episode, epTitle, overview, item.id]
      )
    } else {
      // Try as movie first, fall back to series
      const movie = await searchMovie(title)
      if (movie && movie.vote_count > 5) {
        const showId = await upsertMovie(movie)
        await query(
          `UPDATE media_items SET show_id=$1, overview=$2, type='movie' WHERE id=$3`,
          [showId, movie.overview, item.id]
        )
      } else {
        const show = await searchShow(title)
        if (show) {
          const showId = await upsertShow(show)
          await query(`UPDATE media_items SET show_id=$1, type='episode' WHERE id=$2`, [showId, item.id])
        }
      }
    }
  } catch (e) {
    console.warn(`[TMDB] Failed for "${title}": ${e.message}`)
  }
}

// ─── Enrich entire library ───────────────────────────────────────────────────

export async function enrichLibrary() {
  if (!token()) {
    console.log('[TMDB] No token — skipping metadata enrichment')
    return
  }
  const { rows } = await query(`SELECT id, title FROM media_items WHERE show_id IS NULL`)
  console.log(`[TMDB] Enriching ${rows.length} items...`)
  let done = 0
  for (const item of rows) {
    await enrichMediaItem(item)
    done++
    if (done % 10 === 0) console.log(`[TMDB] ${done}/${rows.length}`)
    await new Promise(r => setTimeout(r, 250)) // rate limit: 4 req/s
  }
  console.log(`[TMDB] Done enriching library`)
}
