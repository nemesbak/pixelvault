# PixelVault API Reference

Base URL: `http://localhost:3000`

All authenticated endpoints require the header:
```
Authorization: Bearer <jwt_token>
```

---

## Auth

### `POST /api/users/register`
Create a new account.

**Body:**
```json
{ "username": "string", "password": "string" }
```

**Response `201`:**
```json
{ "token": "jwt_string", "userId": 1, "username": "string" }
```

---

### `POST /api/users/login`
Authenticate and receive a JWT (30-day expiry).

**Body:**
```json
{ "username": "string", "password": "string" }
```

**Response `200`:**
```json
{ "token": "jwt_string", "userId": 1, "username": "string" }
```

---

## Media

### `GET /api/media`
List all media items. Requires auth.

**Query params:** `search` (optional string)

**Response `200`:**
```json
[
  {
    "id": 1,
    "filename": "Blade Runner 2049.mkv",
    "title": "Blade Runner 2049",
    "year": 2017,
    "duration": 9720,
    "size": 15728640000,
    "thumbnail": "/thumbnails/1.jpg",
    "tmdb_id": 335984,
    "overview": "..."
  }
]
```

---

### `GET /api/media/scan`
Trigger a library scan. Requires auth.

**Response `200`:**
```json
{ "message": "Scan started" }
```

---

### `GET /api/media/:id/progress`
Get watch progress for the authenticated user.

**Response `200`:**
```json
{ "position": 3600, "duration": 9720 }
```

---

### `POST /api/media/:id/progress`
Save watch progress.

**Body:**
```json
{ "position": 3600, "duration": 9720 }
```

---

## Streaming

### `GET /api/stream/:id`
Stream a video file. Supports `Range` header for seek.

**Headers:** `Range: bytes=0-` (optional)

**Response:** `200` (full) or `206` (partial) with video stream.

---

## TV Shows

### `GET /api/shows`
List all TV shows (grouped from scanned media). Requires auth.

---

### `GET /api/shows/:id`
Get show details with episodes.

---

## Pairing

### `POST /api/pair/generate`
Generate a QR code + 6-digit code for device pairing. Requires auth.

**Response `200`:**
```json
{
  "code": "ABC123",
  "qr": "data:image/png;base64,...",
  "expiresAt": "2026-06-04T10:10:00.000Z"
}
```

---

### `POST /api/pair/redeem`
Exchange a 6-digit code for a JWT (no prior auth needed).

**Body:**
```json
{ "code": "ABC123" }
```

**Response `200`:**
```json
{ "token": "jwt_string", "userId": 1, "username": "string" }
```

---

## Libraries

### `GET /api/libraries`
List all configured libraries. Requires auth.

---

### `POST /api/libraries`
Create a new library. Requires auth.

**Body:**
```json
{ "name": "Movies", "path": "/media/movies" }
```

---

## Subtitles

### `GET /api/subtitles/:mediaId`
List available subtitle tracks for a media item.

---

### `GET /api/subtitles/:mediaId/:track`
Download a subtitle file (SRT or VTT).

---

## Health

### `GET /api/health`
No auth required.

**Response `200`:**
```json
{ "status": "ok", "service": "PixelVault", "version": "0.1.0" }
```
