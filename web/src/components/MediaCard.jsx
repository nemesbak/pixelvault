import { api } from '../api.js'

export default function MediaCard({ item, formatDuration, onClick, progress }) {
  const thumbUrl = api.thumbUrl(item.thumbnail)
  const res = item.width && item.height ? `${item.width}x${item.height}` : null
  const pct = progress && item.duration ? Math.min(100, (progress.position / item.duration) * 100) : 0

  return (
    <div className="media-card" onClick={onClick}>
      {thumbUrl ? (
        <img className="card-thumb" src={thumbUrl} alt={item.title} loading="lazy" />
      ) : (
        <div className="card-thumb-placeholder">🎬</div>
      )}

      {/* Progress bar */}
      {pct > 0 && (
        <div style={{ height: 3, background: '#222', position: 'absolute', bottom: 58, left: 0, right: 0 }}>
          <div style={{ height: '100%', background: 'var(--green)', width: `${pct}%` }} />
        </div>
      )}

      {/* Watched badge */}
      {progress?.completed && (
        <div style={{
          position: 'absolute', top: 6, right: 6,
          background: 'var(--green)', color: '#000',
          fontFamily: "'Press Start 2P', monospace", fontSize: 7,
          padding: '2px 5px'
        }}>✓</div>
      )}

      {/* Subtitle badge */}
      {item.has_subtitles && (
        <div style={{
          position: 'absolute', top: 6, left: 6,
          background: 'rgba(0,255,255,0.85)', color: '#000',
          fontFamily: "'Press Start 2P', monospace", fontSize: 6,
          padding: '2px 4px'
        }}>SUB</div>
      )}

      <div className="card-overlay">
        <span className="play-icon">▶</span>
      </div>

      <div className="card-info">
        <div className="card-title" title={item.title}>{item.title}</div>
        <div className="card-meta">
          <span>{formatDuration(item.duration)}</span>
          {item.container && <span>{item.container.toUpperCase()}</span>}
          {res && <span>{res}</span>}
        </div>
      </div>
    </div>
  )
}
