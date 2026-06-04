import { useState, useEffect } from 'react'
import { api } from '../api.js'

export default function ShowDetail({ showId, onClose, onPlay, formatDuration, user }) {
  const [show, setShow] = useState(null)
  const [progress, setProgress] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getShow(showId).then(async data => {
      setShow(data)
      // Load progress for all episodes
      if (user && data.episodes?.length) {
        const prog = {}
        await Promise.all(data.episodes.map(async ep => {
          try {
            const p = await api.getProgress(user.id, ep.id)
            if (p?.position > 0) prog[ep.id] = p
          } catch {}
        }))
        setProgress(prog)
      }
      setLoading(false)
    })
  }, [showId, user])

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <div className="loader"><div className="loader-bar"><div className="loader-bar-fill" /></div><div className="loader-text blink">CARGANDO...</div></div>
    </div>
  )

  if (!show) return null

  const poster = api.posterUrl(show.poster)
  const backdrop = api.posterUrl(show.backdrop)

  // Group episodes by season
  const seasons = {}
  for (const ep of (show.episodes ?? [])) {
    const s = ep.season ?? 0
    if (!seasons[s]) seasons[s] = []
    seasons[s].push(ep)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <nav className="navbar">
        <button className="pixel-btn" onClick={onClose}>← VOLVER</button>
        <div style={{ fontSize: 9, color: 'var(--green)', flex: 1, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', padding: '0 12px' }}>{show.title}</div>
        <div style={{ width: 80 }} />
      </nav>

      {/* Hero */}
      <div style={{ position: 'relative', height: 260, overflow: 'hidden' }}>
        {backdrop ? (
          <img src={backdrop} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.3 }} />
        ) : (
          <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #0d1117 0%, #1a1a2e 100%)' }} />
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(0,0,0,0.95) 0%, transparent 60%)' }} />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', gap: 24, padding: 24, alignItems: 'flex-end' }}>
          {poster && (
            <img src={poster} alt={show.title}
              style={{ height: 200, width: 133, objectFit: 'cover', border: '3px solid var(--green)', flexShrink: 0 }}
            />
          )}
          <div style={{ flex: 1, maxWidth: 600 }}>
            <div style={{ fontSize: 18, color: 'var(--green)', marginBottom: 8, textShadow: '0 0 10px var(--green)' }}>{show.title}</div>
            <div style={{ display: 'flex', gap: 12, fontSize: 8, marginBottom: 10, flexWrap: 'wrap' }}>
              {show.first_air_date && <span style={{ color: 'var(--text-dim)' }}>{show.first_air_date?.slice(0,4)}</span>}
              {show.vote_average > 0 && <span style={{ color: 'var(--yellow)' }}>★ {show.vote_average}</span>}
              <span style={{ color: show.type === 'movie' ? 'var(--cyan)' : 'var(--magenta)' }}>
                {show.type === 'movie' ? 'PELÍCULA' : 'SERIE'}
              </span>
              <span style={{ color: 'var(--text-dim)' }}>{show.episodes?.length ?? 0} archivos</span>
            </div>
            {show.overview && (
              <div style={{ fontSize: 8, color: 'var(--text-dim)', lineHeight: 2, maxHeight: 80, overflow: 'hidden' }}>
                {show.overview}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Episodes */}
      <div style={{ padding: 24 }}>
        {Object.entries(seasons).sort(([a],[b]) => Number(a)-Number(b)).map(([season, eps]) => (
          <div key={season} style={{ marginBottom: 32 }}>
            {Object.keys(seasons).length > 1 && (
              <div style={{ fontSize: 10, color: 'var(--green)', marginBottom: 12, borderBottom: '2px solid var(--green)', paddingBottom: 6 }}>
                {season === '0' ? 'SIN TEMPORADA' : `TEMPORADA ${season}`}
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {eps.map(ep => {
                const prog = progress[ep.id]
                const pct = prog && ep.duration ? Math.min(100, (prog.position / ep.duration) * 100) : 0
                const thumb = api.thumbUrl(ep.thumbnail)
                return (
                  <div
                    key={ep.id}
                    onClick={() => onPlay(ep.id)}
                    style={{ display: 'flex', gap: 12, padding: '10px 12px', cursor: 'pointer', background: 'var(--bg2)', border: '2px solid transparent', alignItems: 'center' }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--green)'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'transparent'}
                  >
                    {/* Thumbnail */}
                    <div style={{ width: 120, height: 68, flexShrink: 0, position: 'relative', background: '#111' }}>
                      {thumb ? (
                        <img src={thumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: '#333' }}>▶</div>
                      )}
                      {pct > 0 && (
                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: '#333' }}>
                          <div style={{ height: '100%', background: 'var(--green)', width: `${pct}%` }} />
                        </div>
                      )}
                    </div>
                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 8, color: 'var(--text)', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {ep.episode != null ? `E${String(ep.episode).padStart(2,'0')} ` : ''}{ep.episode_title || ep.title}
                      </div>
                      <div style={{ fontSize: 7, color: 'var(--text-dim)', display: 'flex', gap: 10 }}>
                        <span>{formatDuration(ep.duration)}</span>
                        {ep.audio_codec && <span style={{ color: ['ac3','eac3','dts'].includes(ep.audio_codec) ? 'var(--yellow)' : 'var(--text-dim)' }}>{ep.audio_codec.toUpperCase()}</span>}
                        {prog?.completed && <span style={{ color: 'var(--green)' }}>✓ VISTO</span>}
                      </div>
                    </div>
                    <div style={{ fontSize: 18, color: 'var(--green)', flexShrink: 0 }}>▶</div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
