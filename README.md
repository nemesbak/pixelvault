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
[![Docker Hub](https://img.shields.io/docker/pulls/nemesbak/pixelvault-server?label=Docker%20pulls&logo=docker)](https://hub.docker.com/r/nemesbak/pixelvault-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-brightgreen.svg)](LICENSE)
[![Node 20](https://img.shields.io/badge/Node-20-brightgreen?logo=node.js)](https://nodejs.org)

</div>

---

## WHAT IS THIS?

PixelVault is a **self-hosted media server** — think Jellyfin, but with a retro pixel-art identity and no bloat. Drop your videos in a folder, point PixelVault at it, and get a neon-lit library you can stream from any browser or TV.

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
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  PixelVault UI  :5173 / :80         │
│  Press Start 2P · neon green        │
│  pixel-art controls · no frameworks │
└─────────────────────────────────────┘
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
| Federation via BitTorrent DHT | 🧪 Experimental |
| Android app | 🗺️ Roadmap |

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

That's it. Open **http://localhost:5173**, create your account, and your library will start scanning automatically.

### 3 — First run

1. Register an account at the login screen
2. Wait ~30 seconds for the initial scan (bottom bar shows progress)
3. Use the **SCAN** button anytime to pick up new files

---

## PRODUCTION DEPLOYMENT

Use `docker-compose.prod.yml` which pulls pre-built images from Docker Hub and exposes the web UI on port 80:

```bash
# Required env vars for production
export DB_PASSWORD=a_strong_random_password
export JWT_SECRET=a_long_random_secret_min_32_chars
export MEDIA_PATH=/srv/media
export TMDB_TOKEN=your_token

docker compose -f docker-compose.prod.yml up -d
```

> **Tip:** Put nginx or Traefik in front for HTTPS. Never expose the PostgreSQL port (5432) publicly.

---

## ARCHITECTURE

```
pixelvault/
├── server/                 # Node.js 20 + Fastify 4 API
│   └── src/
│       ├── index.js        # Entry point, plugin registration
│       ├── db.js           # PostgreSQL client + migrations
│       ├── scanner.js      # Media scanner (FFmpeg metadata + thumbnails)
│       ├── tmdb.js         # TMDB API client
│       ├── federation.js   # BitTorrent DHT peer discovery
│       └── routes/
│           ├── media.js    # Library CRUD
│           ├── stream.js   # HTTP 206 range streaming
│           ├── users.js    # Auth (register/login/JWT)
│           ├── pairing.js  # QR + 6-digit device pairing
│           ├── shows.js    # TV show grouping
│           ├── subtitles.js
│           ├── libraries.js
│           └── federation.js
│
├── web/                    # React 18 + Vite 5 SPA
│   └── src/
│       ├── App.jsx
│       ├── api.js          # Typed fetch wrappers
│       ├── index.css       # All styles — pixel-art, zero frameworks
│       ├── components/
│       │   ├── MediaCard.jsx
│       │   ├── ShowCard.jsx
│       │   ├── ShowDetail.jsx
│       │   └── PairScreen.jsx
│       └── pages/
│           ├── LibraryPage.jsx
│           ├── PlayerPage.jsx
│           ├── LoginPage.jsx
│           └── SettingsPage.jsx
│
├── signaling/              # Optional self-hosted WebRTC signaling
│   ├── server.js           # Node.js WebSocket server
│   └── worker.js           # Cloudflare Worker alternative
│
├── docker-compose.yml      # Dev (hot reload, source mounts)
├── docker-compose.prod.yml # Production (pre-built images, nginx)
└── .env.example            # Config template
```

### API endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/users/register` | Create account |
| `POST` | `/api/users/login` | Get JWT |
| `GET` | `/api/media` | List all media |
| `GET` | `/api/media/scan` | Trigger library scan |
| `GET` | `/api/stream/:id` | Stream video (HTTP 206) |
| `GET` | `/api/shows` | List TV shows |
| `GET` | `/api/libraries` | List libraries |
| `POST` | `/api/pair/generate` | Generate QR pairing code |
| `POST` | `/api/pair/redeem` | Redeem 6-digit code → JWT |
| `GET` | `/api/health` | Health check |

Full API docs: [`docs/API.md`](docs/API.md)

---

## DESIGN PHILOSOPHY

- **Pixel-art only** — Press Start 2P font, `#39FF14` neon green, `#0a0a0a` background. No CSS frameworks, no Tailwind, no component libraries.
- **Zero client-side tracking** — no analytics, no telemetry.
- **Direct play first** — no transcoding overhead; browser plays the source file.
- **One Docker Compose** — spin up the whole stack with one command.

---

## CONTRIBUTING

Contributions are welcome! Please read [`CONTRIBUTING.md`](CONTRIBUTING.md) before opening a PR.

**Branch model:**

```
main   ← stable releases (tagged)
 └── dev ← integration branch for PRs
      └── feat/your-feature
      └── fix/the-bug
```

Always target `dev` with your PRs. `main` is only updated via releases.

---

## DOCKER HUB

| Image | Pull |
|---|---|
| `nemesbak/pixelvault-server` | `docker pull nemesbak/pixelvault-server` |
| `nemesbak/pixelvault-web` | `docker pull nemesbak/pixelvault-web` |

Images are built for `linux/amd64` and `linux/arm64` (Raspberry Pi 4+).

---

## ROADMAP

- [ ] Android native app
- [ ] Transcoding profiles (for older devices)
- [ ] User roles (admin / viewer)
- [ ] Playlist support
- [ ] Stable federation / peer sharing
- [ ] OIDC / SSO support

---

## LICENSE

MIT © [nemesbak](https://github.com/nemesbak)
