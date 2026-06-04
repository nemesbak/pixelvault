# Changelog

All notable changes to PixelVault are documented here.  
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased]

---

## [0.2.0] — 2026-06-04

### Added
- **Android app** — native Kotlin + Jetpack Compose client
  - Screens: Setup, Login/Register, Pair (QR + 6-digit code), Library grid, Player
  - ExoPlayer with pixel-art custom controls, ±10s seek, seekbar
  - CameraX + ML Kit for QR code scanning
  - Watch progress saved every 10 seconds and on exit
  - Press Start 2P font (Google Fonts) + neon green theme
- **Audio transcoding** — AC3/DTS/EAC3 → AAC via FFmpeg for browser/Android compatibility
- **Android CI** — debug APK on every push; signed release APK + GitHub Release on tag

### Changed
- Migrated **Fastify 4 → 5** (+ `@fastify/cors` v11, `@fastify/static` v9, `@fastify/websocket` v11)
- `npm audit` now reports **0 vulnerabilities** — restored `--audit-level=high` in CI

### Infrastructure
- Added `dependabot.yml` — weekly updates for npm/docker/actions targeting `dev`
- Added `PULL_REQUEST_TEMPLATE.md`
- Added `Makefile` with `make dev / up / release / audit`
- Added `DOCKERHUB_USERNAME` GitHub secret for release workflow
- Optimized Dockerfiles: multi-stage builds, non-root user, healthchecks
- Production `docker-compose.prod.yml` with required-env validation

---

## [0.1.0] — 2026-06-04

### Added
- **Media library** — automatic scan on startup + manual SCAN button
- **Video player** — native HTML5 with pixel-art controls, HTTP 206 range requests
- **Thumbnails** — auto-generated via FFmpeg at 10% of video duration
- **Auth** — register / login with JWT (30-day tokens), bcrypt passwords
- **Pairing** — QR code + 6-digit code flow for TV/mobile (10-minute expiry)
- **Watch progress** — per-user playback position in PostgreSQL
- **TV shows** — episode grouping, season navigation
- **Libraries** — multi-library support with custom media paths
- **Subtitles** — external SRT/VTT sidecar file support
- **TMDB integration** — metadata enrichment (poster, overview, year)
- **Federation** — experimental DHT-based peer discovery (BitTorrent DHT)
- **Pixel-art UI** — Press Start 2P font, neon green (#39FF14), zero CSS frameworks
