import Fastify from 'fastify'
import cors from '@fastify/cors'
import staticPlugin from '@fastify/static'
import websocketPlugin from '@fastify/websocket'
import { runMigrations } from './db.js'
import { scanMedia } from './scanner.js'
import mediaRoutes from './routes/media.js'
import streamRoutes from './routes/stream.js'
import userRoutes from './routes/users.js'
import pairingRoutes from './routes/pairing.js'
import showRoutes from './routes/shows.js'
import subtitleRoutes from './routes/subtitles.js'
import libraryRoutes from './routes/libraries.js'
import federationRoutes from './routes/federation.js'
import { startFederation } from './federation.js'

const app = Fastify({ logger: true })

await app.register(cors, { origin: true, credentials: true })
await app.register(websocketPlugin)

// Allow POST routes with empty body
app.addContentTypeParser('application/json', { parseAs: 'string' }, (req, body, done) => {
  if (!body || body.trim() === '') return done(null, {})
  try { done(null, JSON.parse(body)) } catch (e) { done(e) }
})

await app.register(staticPlugin, {
  root: process.env.THUMBNAILS_PATH || '/thumbnails',
  prefix: '/thumbnails/'
})

await app.register(userRoutes, { prefix: '/api/users' })
await app.register(mediaRoutes, { prefix: '/api/media' })
await app.register(streamRoutes, { prefix: '/api/stream' })
await app.register(pairingRoutes, { prefix: '/api/pair' })
await app.register(showRoutes, { prefix: '/api/shows' })
await app.register(subtitleRoutes, { prefix: '/api/subtitles' })
await app.register(libraryRoutes, { prefix: '/api/libraries' })
await app.register(federationRoutes, { prefix: '/api/federation' })

app.get('/api/health', async () => ({
  status: 'ok',
  service: 'PixelVault',
  version: '0.1.0'
}))

try {
  await runMigrations()
  await app.listen({ port: parseInt(process.env.PORT || '3000'), host: '0.0.0.0' })

  startFederation().catch(e => console.error('[Federation startup]', e.message))

  const mediaPath = process.env.MEDIA_PATH || '/media'
  console.log(`[PixelVault] Starting initial scan of ${mediaPath}`)
  scanMedia(mediaPath).catch(e => console.error('[Scan error]', e.message))
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
