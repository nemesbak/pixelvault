# Changelog

All notable changes to PixelVault are documented here.  
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [0.1.0] — 2026-06-04

### Added
- **Media library** — automatic scan on startup + manual SCAN button
- **Video player** — native HTML5 with pixel-art controls, HTTP 206 range requests for seek support
- **Thumbnails** — auto-generated via FFmpeg at 10% of video duration
- **Auth system** — register / login with JWT (30-day tokens), bcrypt passwords
- **Pairing** — QR code + 6-digit code flow for TV/mobile (10-minute expiry)
- **Watch progress** — per-user playback position persisted in PostgreSQL
- **TV shows** — episode grouping, season navigation
- **Libraries** — multi-library support with custom media paths
- **Subtitles** — external SRT/VTT sidecar file support
- **TMDB integration** — metadata enrichment (poster, overview, year)
- **Federation** — experimental DHT-based peer discovery (BitTorrent DHT)
- **WebRTC signaling** — Cloudflare Worker fallback + optional self-hosted server
- **Pixel-art UI** — Press Start 2P font, neon green (#39FF14) on dark bg, zero CSS frameworks
