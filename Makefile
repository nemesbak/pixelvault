.PHONY: dev up down logs build push tag release clean

# ── Dev ──────────────────────────────────────────────
dev:
	docker compose up

up:
	docker compose up -d

down:
	docker compose down

logs:
	docker compose logs -f

restart:
	docker compose restart server

scan:
	curl -s http://localhost:3000/api/media/scan | python3 -m json.tool

# ── Build ─────────────────────────────────────────────
build:
	docker build --target production -t nemesbak/pixelvault-server:dev ./server
	docker build --target production -t nemesbak/pixelvault-web:dev ./web

# ── Release ───────────────────────────────────────────
# Usage: make release VERSION=0.2.0
release:
	@if [ -z "$(VERSION)" ]; then echo "Usage: make release VERSION=x.y.z"; exit 1; fi
	git tag -a v$(VERSION) -m "PixelVault v$(VERSION)"
	git push origin v$(VERSION)
	@echo "Tag v$(VERSION) pushed — GitHub Actions will build and push to Docker Hub."

# ── Push (manual) ─────────────────────────────────────
# Requires: docker login
push:
	docker push nemesbak/pixelvault-server:dev
	docker push nemesbak/pixelvault-web:dev

# ── Clean ─────────────────────────────────────────────
clean:
	docker compose down -v
	docker image rm -f nemesbak/pixelvault-server nemesbak/pixelvault-web 2>/dev/null || true

# ── Lint ──────────────────────────────────────────────
audit:
	cd server && npm audit --audit-level=high
	cd web && npm audit --audit-level=high

lockfiles:
	cd server && npm install --package-lock-only
	cd web && npm install --package-lock-only
