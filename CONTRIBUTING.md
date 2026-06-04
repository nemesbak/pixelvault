# Contributing to PixelVault

Thanks for wanting to contribute! Here's everything you need to know.

---

## Branch model

```
main  ← stable, tagged releases only
 └── dev ← all PRs target here
      ├── feat/your-feature
      ├── fix/the-bug
      └── docs/update-readme
```

**Always open PRs against `dev`**, never directly against `main`.

---

## Getting started

### 1 — Fork & clone

```bash
git clone https://github.com/YOUR_USERNAME/pixelvault.git
cd pixelvault
git remote add upstream https://github.com/nemesbak/pixelvault.git
```

### 2 — Create a branch off dev

```bash
git checkout dev
git pull upstream dev
git checkout -b feat/my-awesome-feature
```

### 3 — Set up local dev environment

```bash
cp .env.example .env
# Fill in MEDIA_PATH and optionally TMDB_TOKEN

docker compose up -d
```

The dev compose mounts source files directly, so changes to `server/src/` or `web/src/` are reflected live (Node --watch + Vite HMR).

- Web UI: http://localhost:5173
- API: http://localhost:3000
- DB: localhost:5432

---

## Code style

- **Backend (Node.js):** ES Modules (`import`/`export`), no TypeScript, no linter config yet — follow the existing style.
- **Frontend (React):** Functional components + hooks only. Plain CSS in `index.css` — no Tailwind, no CSS-in-JS.
- **Pixel-art UI rule:** All UI contributions must use `Press Start 2P` font and respect the neon green (`#39FF14`) / dark (`#0a0a0a`) palette.
- **No comments that explain *what* the code does** — name your variables clearly instead. A comment is welcome only when the *why* isn't obvious.

---

## Commit messages

Use the conventional commits style:

```
feat: add playlist support
fix: scanner skipping mkv files with uppercase extension
docs: add API.md
chore: bump fastify to 4.29
```

---

## Pull request checklist

- [ ] PR targets `dev`, not `main`
- [ ] `docker compose up --build` runs without errors
- [ ] Web UI still loads and the golden path (login → library → play) works
- [ ] No `.env` or secrets committed
- [ ] If adding a new API endpoint — documented in `docs/API.md`

---

## Reporting bugs

Use the [Bug Report](.github/ISSUE_TEMPLATE/bug_report.yml) template. Include `docker compose logs` output.

## Requesting features

Use the [Feature Request](.github/ISSUE_TEMPLATE/feature_request.yml) template.
