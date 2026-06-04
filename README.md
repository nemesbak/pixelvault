```
██████╗ ██╗██╗  ██╗███████╗██╗    ██╗   ██╗ █████╗ ██╗   ██╗██╗  ████████╗
██╔══██╗██║╚██╗██╔╝██╔════╝██║    ██║   ██║██╔══██╗██║   ██║██║  ╚══██╔══╝
██████╔╝██║ ╚███╔╝ █████╗  ██║    ██║   ██║███████║██║   ██║██║     ██║
██╔═══╝ ██║ ██╔██╗ ██╔══╝  ██║    ╚██╗ ██╔╝██╔══██║██║   ██║██║     ██║
██║     ██║██╔╝ ██╗███████╗███████╗╚████╔╝ ██║  ██║╚██████╔╝███████╗██║
╚═╝     ╚═╝╚═╝  ╚═╝╚══════╝╚══════╝ ╚═══╝  ╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚═╝
```

<div align="center">

**Your self-hosted media vault with pixel-art soul.**

[![CI](https://github.com/nemesbak/pixelvault/actions/workflows/ci.yml/badge.svg)](https://github.com/nemesbak/pixelvault/actions/workflows/ci.yml)
[![Android](https://github.com/nemesbak/pixelvault/actions/workflows/android.yml/badge.svg)](https://github.com/nemesbak/pixelvault/actions/workflows/android.yml)
[![Docker Hub](https://img.shields.io/docker/pulls/nemesbak/pixelvault-server?label=Docker%20pulls&logo=docker)](https://hub.docker.com/r/nemesbak/pixelvault-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-brightgreen.svg)](LICENSE)
[![Node 20](https://img.shields.io/badge/Node-20-brightgreen?logo=node.js)](https://nodejs.org)
[![Android 7+](https://img.shields.io/badge/Android-7%2B-brightgreen?logo=android)](https://github.com/nemesbak/pixelvault/releases)

</div>

---

## WHAT IS THIS?

PixelVault is a **self-hosted media server** — think Jellyfin, but with a retro pixel-art identity and no bloat. Drop your videos in a folder, point PixelVault at it, and stream from any browser or Android device.

```
┌─────────────────────────────────────┐
│  ░░░ YOUR MEDIA FOLDER ░░░          │
│  ├── /movies                        │
│  │   ├── Blade Runner 2049.mkv      │
│  │   └── ...                        │
│  └── /shows                         │
│      └── Breaking Bad/S01E01.mkv    │
└──────────────┬──────────────────────┘
               │  auto-scan
               ▼
┌─────────────────────────────────────┐
│  PixelVault API  :3000              │
│  • FFmpeg thumbnails                │
│  • TMDB metadata enrichment         │
│  • JWT auth + QR pairing            │
│  • HTTP 206 range streaming         │
└──────────┬───────────────┬──────────┘
           │               │
           ▼               ▼
┌──────────────────┐  ┌─────────────────┐
│  Web UI :80      │  │  Android app    │
│  Press Start 2P  │  │  Kotlin+Compose │
│  neon green      │  │  ExoPlayer      │
│  no frameworks   │  │  QR pairing     │
└──────────────────┘  └─────────────────┘
```

---

## FEATURES

| Feature | Status |
|---|---|
| Auto library scan + manual trigger | ✅ |
| HTTP 206 video streaming (seek support) | ✅ |
| FFmpeg auto-thumbnails | ✅ |
| TMDB metadata (poster, overview, year) | ✅ |
| JWT auth + bcrypt passwords | ✅ |
| QR + 6-digit device pairing | ✅ |
| Per-user watch progress | ✅ |
| TV show / season grouping | ✅ |
| Multi-library support | ✅ |
| SRT / VTT subtitle sidecars | ✅ |
| **Android app** (native Compose + ExoPlayer) | ✅ |
| Audio transcoding (AC3/DTS → AAC) | ✅ |
| Federation via BitTorrent DHT | 🧪 Experimental |

---

## QUICK START

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) + [Docker Compose](https://docs.docker.com/compose/install/)
- A folder full of video files
- (Optional) A [TMDB API token](https://www.themoviedb.org/settings/api) for metadata

### 1 — Clone & configure

```bash
git clone https://github.com/nemesbak/pixelvault.git
cd pixelvault

cp .env.example .env
# Edit .env:
#   MEDIA_PATH=/absolute/path/to/your/videos
#   TMDB_TOKEN=your_tmdb_token
```

### 2 — Launch

```bash
docker compose up -d
```

Open **http://localhost:5173**, register your account, and the library scan starts automatically.

### 3 — Connect Android

1. Download the APK from [Releases](https://github.com/nemesbak/pixelvault/releases)
2. Install it (allow "Unknown sources" if prompted)
3. Enter your server URL: `http://YOUR_SERVER_IP:3000`
4. Login or go to Settings → **Pair Device** on the web UI to get a 6-digit code / QR

---

## ANDROID APP

Native Android client built with Kotlin + Jetpack Compose.

| Screen | Description |
|---|---|
| Setup | Enter server URL, connectivity check |
| Login / Register | Username + password |
| Pair | 6-digit code or QR scan with camera |
| Library | Thumbnail grid, live search |
| Player | ExoPlayer full-screen · pixel-art controls · ±10s seek · progress saved |

**Requirements:** Android 7.0+ (API 24)

### Build from source

```bash
# Open android/ in Android Studio, or:
cd android
gradle assembleDebug
# APK: app/build/outputs/apk/debug/app-debug.apk
```

---

## PRODUCTION DEPLOYMENT

```bash
export DB_PASSWORD=$(openssl rand -hex 32)
export JWT_SECRET=$(openssl rand -hex 32)
export MEDIA_PATH=/srv/media
export TMDB_TOKEN=your_token

docker compose -f docker-compose.prod.yml up -d
```

> Put nginx or Traefik in front for HTTPS. Never expose port 5432 publicly.

Full guide: [`docs/DEPLOY.md`](docs/DEPLOY.md)

---

## ARCHITECTURE

```
pixelvault/
├── server/                  # Node.js 20 + Fastify 5 API
│   └── src/
│       ├── index.js         # Entry point, plugin registration
│       ├── db.js            # PostgreSQL client + migrations
│       ├── scanner.js       # FFmpeg metadata + thumbnail generator
│       ├── tmdb.js          # TMDB metadata enrichment
│       ├── federation.js    # BitTorrent DHT peer discovery
│       └── routes/
│           ├── media.js     # Library CRUD + watch progress
│           ├── stream.js    # HTTP 206 range streaming + audio transcode
│           ├── users.js     # Auth (register/login/JWT)
│           ├── pairing.js   # QR + 6-digit device pairing
│           ├── shows.js     # TV show grouping
│           ├── subtitles.js # SRT/VTT extraction via FFmpeg
│           ├── libraries.js # Multi-library management
│           └── federation.js
│
├── web/                     # React 18 + Vite 5 SPA
│   └── src/
│       ├── api.js           # Typed fetch wrappers
│       ├── index.css        # All styles — pixel-art, zero CSS frameworks
│       ├── components/      # MediaCard, ShowCard, ShowDetail, PairScreen
│       └── pages/           # LibraryPage, PlayerPage, LoginPage, SettingsPage
│
├── android/                 # Native Android app
│   └── app/src/main/
│       ├── java/com/pixelvault/app/
│       │   ├── MainActivity.kt
│       │   ├── Navigation.kt
│       │   ├── data/        # ApiClient (Ktor), Models, Prefs (DataStore)
│       │   ├── viewmodel/   # AppViewModel
│       │   └── ui/
│       │       ├── theme/   # Press Start 2P · neon green palette
│       │       ├── components/ # PixelButton, PixelCard, PixelTextField
│       │       └── screens/ # Setup, Login, Pair, Library, Player
│       └── res/
│
├── signaling/               # Optional self-hosted WebRTC signaling server
├── docker-compose.yml       # Dev (hot reload, source mounts)
├── docker-compose.prod.yml  # Production (Docker Hub images, nginx)
└── .env.example
```

### API endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/users/register` | Create account |
| `POST` | `/api/users/login` | Get JWT |
| `GET` | `/api/media` | List media (`?search=&page=&limit=`) |
| `POST` | `/api/media/scan` | Trigger library scan |
| `GET` | `/api/stream/:id` | Stream video (HTTP 206) |
| `GET` | `/api/shows` | List TV shows |
| `GET` | `/api/libraries` | List libraries |
| `POST` | `/api/pair/generate` | Generate QR + 6-digit code |
| `POST` | `/api/pair/redeem` | Redeem code → JWT |
| `GET` | `/api/health` | Health check |

Full reference: [`docs/API.md`](docs/API.md)

---

## DESIGN PHILOSOPHY

- **Pixel-art everywhere** — Press Start 2P font, `#39FF14` neon green, `#0a0a0a` background. Web and Android share the same visual language. No CSS frameworks, no UI component libraries.
- **Zero tracking** — no analytics, no telemetry, no cloud accounts required.
- **Direct play first** — the browser and ExoPlayer play the source file directly. Transcoding only kicks in for incompatible audio codecs (AC3/DTS → AAC).
- **One command** — `docker compose up -d` starts everything.

---

## CONTRIBUTING

Read [`CONTRIBUTING.md`](CONTRIBUTING.md) before opening a PR.

```
main   ← stable releases (tagged)
 └── dev ← target for all PRs
      ├── feat/your-feature
      └── fix/the-bug
```

---

## DOCKER HUB

| Image | Pull |
|---|---|
| `nemesbak/pixelvault-server` | `docker pull nemesbak/pixelvault-server` |
| `nemesbak/pixelvault-web` | `docker pull nemesbak/pixelvault-web` |

Multi-arch: `linux/amd64` + `linux/arm64` (Raspberry Pi 4+).

---

## ROADMAP

- [ ] User roles (admin / read-only)
- [ ] Playlist support
- [ ] Stable federation / peer library sharing
- [ ] Transcoding profiles for older devices
- [ ] OIDC / SSO

---

## LICENSE

MIT © [nemesbak](https://github.com/nemesbak)
