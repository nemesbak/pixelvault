import pg from 'pg'

const { Pool } = pg

export const pool = new Pool({ connectionString: process.env.DATABASE_URL })

export async function query(text, params) {
  const res = await pool.query(text, params)
  return res
}

export async function runMigrations() {
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      username VARCHAR(50) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      is_admin BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `)

  await query(`
    CREATE TABLE IF NOT EXISTS media_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title VARCHAR(500) NOT NULL,
      file_path VARCHAR(2000) NOT NULL UNIQUE,
      file_size BIGINT,
      duration INTEGER,
      width INTEGER,
      height INTEGER,
      video_codec VARCHAR(50),
      audio_codec VARCHAR(50),
      container VARCHAR(20),
      thumbnail VARCHAR(500),
      scanned_at TIMESTAMPTZ DEFAULT NOW()
    )
  `)

  await query(`
    CREATE TABLE IF NOT EXISTS watch_progress (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      media_id UUID REFERENCES media_items(id) ON DELETE CASCADE,
      position INTEGER DEFAULT 0,
      completed BOOLEAN DEFAULT FALSE,
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id, media_id)
    )
  `)

  await query(`
    CREATE TABLE IF NOT EXISTS pairing_codes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      code VARCHAR(6) NOT NULL UNIQUE,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      expires_at TIMESTAMPTZ NOT NULL,
      used BOOLEAN DEFAULT FALSE
    )
  `)

  await query(`
    CREATE TABLE IF NOT EXISTS shows (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tmdb_id INTEGER UNIQUE,
      title VARCHAR(500) NOT NULL,
      original_title VARCHAR(500),
      overview TEXT,
      poster VARCHAR(500),
      backdrop VARCHAR(500),
      first_air_date VARCHAR(20),
      vote_average NUMERIC(3,1),
      genres TEXT[],
      type VARCHAR(10) DEFAULT 'series',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `)

  // Extend media_items with series metadata
  const cols = await query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'media_items'
  `)
  const existing = new Set(cols.rows.map(r => r.column_name))

  if (!existing.has('show_id'))
    await query(`ALTER TABLE media_items ADD COLUMN show_id UUID REFERENCES shows(id) ON DELETE SET NULL`)
  if (!existing.has('season'))
    await query(`ALTER TABLE media_items ADD COLUMN season INTEGER`)
  if (!existing.has('episode'))
    await query(`ALTER TABLE media_items ADD COLUMN episode INTEGER`)
  if (!existing.has('episode_title'))
    await query(`ALTER TABLE media_items ADD COLUMN episode_title VARCHAR(500)`)
  if (!existing.has('overview'))
    await query(`ALTER TABLE media_items ADD COLUMN overview TEXT`)
  if (!existing.has('type'))
    await query(`ALTER TABLE media_items ADD COLUMN type VARCHAR(10) DEFAULT 'movie'`)
  // Libraries
  await query(`
    CREATE TABLE IF NOT EXISTS libraries (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(100) NOT NULL,
      path VARCHAR(2000) NOT NULL UNIQUE,
      enabled BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `)
  // Seed default library from env
  const defaultPath = process.env.MEDIA_PATH || '/media'
  await query(
    `INSERT INTO libraries (name, path) VALUES ('Principal', $1) ON CONFLICT (path) DO NOTHING`,
    [defaultPath]
  )
  // Link existing items to default library
  if (!existing.has('library_id')) {
    await query(`ALTER TABLE media_items ADD COLUMN library_id UUID REFERENCES libraries(id) ON DELETE SET NULL`)
    await query(`UPDATE media_items SET library_id = (SELECT id FROM libraries WHERE path = $1) WHERE library_id IS NULL`, [defaultPath])
  }

  if (!existing.has('has_subtitles'))
    await query(`ALTER TABLE media_items ADD COLUMN has_subtitles BOOLEAN DEFAULT FALSE`)
  if (!existing.has('subtitle_tracks'))
    await query(`ALTER TABLE media_items ADD COLUMN subtitle_tracks JSONB DEFAULT '[]'`)

  // Server identity (permanent UUID for federation)
  await query(`
    CREATE TABLE IF NOT EXISTS server_identity (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(100) NOT NULL DEFAULT 'Mi Servidor',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `)
  const identity = await query('SELECT id FROM server_identity LIMIT 1')
  if (!identity.rows[0]) {
    await query(`INSERT INTO server_identity (name) VALUES ('Mi Servidor')`)
  }

  // Federation — connected servers
  await query(`
    CREATE TABLE IF NOT EXISTS federations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      remote_server_id UUID NOT NULL UNIQUE,
      remote_name VARCHAR(100) NOT NULL,
      status VARCHAR(20) DEFAULT 'connecting',
      shared_libraries BOOLEAN DEFAULT TRUE,
      last_seen TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `)

  console.log('[DB] Migrations complete')
}
