import { api } from '../api.js'

export default function ShowCard({ show, onClick }) {
  const poster = api.posterUrl(show.poster)

  return (
    <div className="media-card" onClick={onClick}>
      {poster ? (
        <img
          src={poster}
          alt={show.title}
          loading="lazy"
          style={{ width: '100%', aspectRatio: '2/3', objectFit: 'cover', display: 'block', background: '#111' }}
        />
      ) : (
        <div style={{
          width: '100%', aspectRatio: '2/3',
          background: 'linear-gradient(135deg, #111 0%, #1a1a2e 100%)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          gap: 8, padding: 16
        }}>
          <div style={{ fontSize: 36 }}>{show.type === 'movie' ? '🎬' : '📺'}</div>
          <div style={{ fontSize: 7, color: '#555', textAlign: 'center', lineHeight: 1.8 }}>{show.title}</div>
        </div>
      )}

      <div className="card-overlay">
        <span className="play-icon" style={{ fontSize: 28 }}>▶</span>
      </div>

      <div className="card-info">
        <div className="card-title" title={show.title}>{show.title}</div>
        <div className="card-meta">
          <span style={{ color: show.type === 'movie' ? 'var(--cyan)' : 'var(--magenta)' }}>
            {show.type === 'movie' ? 'PELÍCULA' : 'SERIE'}
          </span>
          {show.item_count > 0 && <span>{show.item_count} ep</span>}
          {show.vote_average > 0 && <span style={{ color: 'var(--yellow)' }}>★ {show.vote_average}</span>}
        </div>
      </div>
    </div>
  )
}
