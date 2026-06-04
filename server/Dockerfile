# ── Stage 1: dependencies ──────────────────────────────
FROM node:20-alpine AS deps

RUN apk add --no-cache python3 make g++

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

# ── Stage 2: production image ──────────────────────────
FROM node:20-alpine AS production

# ffmpeg for thumbnail generation and media probing
RUN apk add --no-cache ffmpeg

# Non-root user for security
RUN addgroup -S pixelvault && adduser -S pixelvault -G pixelvault

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Directories that Docker volumes will mount — ensure they exist
RUN mkdir -p /media /thumbnails && chown -R pixelvault:pixelvault /app /media /thumbnails

USER pixelvault

EXPOSE 3000 6881/udp

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

CMD ["node", "src/index.js"]

# ── Dev image (default for docker compose up) ──────────
FROM production AS dev
USER root
RUN apk add --no-cache curl
USER pixelvault
CMD ["node", "--watch", "src/index.js"]
