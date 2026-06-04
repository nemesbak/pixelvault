# Deployment Guide

## Local / homelab (recommended for most users)

See the [Quick Start](../README.md#quick-start) in README — just `docker compose up -d`.

---

## Production on a VPS / server

### Requirements

- Docker + Docker Compose installed
- Open ports: `80` (web), `3000` (API, optional — only if you want direct API access), `6881/udp` (DHT, optional)
- A reverse proxy (nginx / Traefik) for HTTPS

### 1 — Pull the production compose

```bash
curl -O https://raw.githubusercontent.com/nemesbak/pixelvault/main/docker-compose.prod.yml
curl -O https://raw.githubusercontent.com/nemesbak/pixelvault/main/.env.example
cp .env.example .env
```

### 2 — Set environment variables

Edit `.env` (or export to your shell / secrets manager):

```bash
DB_PASSWORD=generate_with_openssl_rand_hex_32
JWT_SECRET=generate_with_openssl_rand_hex_32
MEDIA_PATH=/srv/media
TMDB_TOKEN=your_tmdb_token
```

Generate secure values:
```bash
openssl rand -hex 32
```

### 3 — Start

```bash
docker compose -f docker-compose.prod.yml up -d
```

---

## Reverse proxy with nginx

Create `/etc/nginx/sites-available/pixelvault`:

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Web UI
    location / {
        proxy_pass http://localhost:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # API (optional — expose only if needed)
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;

        # Required for video streaming
        proxy_buffering off;
        proxy_request_buffering off;
    }
}
```

Then: `certbot --nginx -d yourdomain.com`

---

## Raspberry Pi 4 (ARM64)

All images are built for `linux/arm64`. Same steps as above — just run on your Pi.

Recommended: 4GB RAM Pi 4 minimum (FFmpeg thumbnail generation is memory-intensive for large libraries).

---

## Updating

```bash
# Pull latest images
docker compose -f docker-compose.prod.yml pull

# Restart containers
docker compose -f docker-compose.prod.yml up -d
```

---

## Backup

The only persistent data is the PostgreSQL volume (`pixelvault_postgres_data`) and the thumbnails volume (`pixelvault_thumbnails_data`).

```bash
# Backup database
docker exec pixelvault_db pg_dump -U pixelvault pixelvault > backup_$(date +%Y%m%d).sql

# Restore
docker exec -i pixelvault_db psql -U pixelvault pixelvault < backup_20260604.sql
```

Thumbnails are regenerated from source files, so you don't strictly need to back them up.
