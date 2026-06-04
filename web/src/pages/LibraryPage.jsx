import { useState, useEffect, useCallback } from 'react'
import { api } from '../api.js'
import MediaCard from '../components/MediaCard.jsx'
import ShowCard from '../components/ShowCard.jsx'
import ShowDetail from '../components/ShowDetail.jsx'
import PairScreen from '../components/PairScreen.jsx'

const FILTERS = [
  { key: 'all',    label: 'TODO' },
  { key: 'series', label: 'SERIES' },
  { key: 'movie',  label: 'PELIS' },
  { key: 'other',  label: 'OTROS' },
]

function fmt(sec) {
  if (!sec) return '--:--'
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60
  return h > 0 ? `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}` : `${m}:${String(s).padStart(2,'0')}`
}

export default function LibraryPage({ user, onLogout, onPlay, onSettings }) {
  const [filter, setFilter] = useState('all')
  const [shows, setShows] = useState([])
  const [unmatched, setUnmatched] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [continueWatching, setContinueWatching] = useState([])
  const [scanning, setScanning] = useState(false)
  const [enriching, setEnriching] = useState(false)
  const [selectedShow, setSelectedShow] = useState(null)
  const [showPair, setShowPair] = useState(false)

  const loadAll = useCallback(async (s) => {
    setLoading(true)
    try {
      const [showData, unmatchedData] = await Promise.all([
        api.getShows(s ? { search: s } : {}),
        api.getUnmatched()
      ])
      setShows(showData)
      // Filter unmatched by search
      setUnmatched(s
        ? unmatchedData.filter(i => i.title.toLowerCase().includes(s.toLowerCase()))
        : unmatchedData
      )
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => {
    const t = setTimeout(() => loadAll(search), 300)
    return () => clearTimeout(t)
  }, [search, loadAll])

  useEffect(() => {
    if (!user?.id) return
    api.getContinueWatching(user.id).then(setContinueWatching).catch(() => {})
  }, [user])

  async function handleScan() {
    setScanning(true)
    try { await api.triggerScan() } catch {}
    setTimeout(() => { setScanning(false); loadAll(search) }, 5000)
  }

  async function handleEnrich() {
    setEnriching(true)
    try { await api.triggerEnrich() } catch {}
    setTimeout(() => { setEnriching(false); loadAll(search) }, 15000)
  }

  // Build unified item list based on active filter
  const visibleItems = (() => {
    if (filter === 'series') return shows.filter(s => s.type === 'series').map(s => ({ ...s, _card: 'show' }))
    if (filter === 'movie')  return shows.filter(s => s.type === 'movie').map(s => ({ ...s, _card: 'show' }))
    if (filter === 'other')  return unmatched.map(i => ({ ...i, _card: 'media' }))
    // 'all': shows + unmatched, sorted by title
    return [
      ...shows.map(s => ({ ...s, _card: 'show' })),
      ...unmatched.map(i => ({ ...i, _card: 'media' }))
    ].sort((a, b) => a.title.localeCompare(b.title))
  })()

  if (showPair) return <PairScreen onClose={() => setShowPair(false)} />
  if (selectedShow) return (
    <ShowDetail showId={selectedShow} onClose={() => setSelectedShow(null)} onPlay={onPlay} formatDuration={fmt} user={user} />
  )

  return (
    <div style={{ minHeight: '100vh' }}>
      <nav className="navbar">
        <div className="navbar-logo">PIXEL<span>VAULT</span></div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 7, color: 'var(--text-dim)' }}>&gt; {user.username}</span>
          <button className="pixel-btn" onClick={() => setShowPair(true)}>QR</button>
          <button className="pixel-btn" onClick={handleScan} disabled={scanning}>{scanning ? '...' : 'SCAN'}</button>
          <button className="pixel-btn" onClick={handleEnrich} disabled={enriching} title="Fetch TMDB metadata">
            {enriching ? '...' : '★ TMDB'}
          </button>
          <button className="pixel-btn" onClick={onSettings}>⚙</button>
          <button className="pixel-btn danger" onClick={onLogout}>EXIT</button>
        </div>
      </nav>

      {/* Search + filter bar */}
      <div style={{ display: 'flex', gap: 10, padding: '12px 24px 0', alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          className="pixel-input" style={{ maxWidth: 300, flex: 1 }}
          type="text" placeholder="> BUSCAR..."
          value={search} onChange={e => setSearch(e.target.value)}
        />
        <div style={{ display: 'flex', gap: 0 }}>
          {FILTERS.map(f => (
            <button
              key={f.key}
              className="pixel-btn"
              style={{
                fontSize: 8, padding: '8px 12px',
                borderColor: filter === f.key ? 'var(--green)' : '#333',
                color: filter === f.key ? 'var(--green)' : '#555',
                background: filter === f.key ? 'rgba(57,255,20,0.08)' : 'transparent'
              }}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="stats-bar">
        <div>TOTAL: <span>{visibleItems.length}</span></div>
        <div>SERIES: <span>{shows.filter(s => s.type === 'series').length}</span></div>
        <div>PELIS: <span>{shows.filter(s => s.type === 'movie').length}</span></div>
        <div>OTROS: <span>{unmatched.length}</span></div>
        {scanning  && <div className="blink glow-green">ESCANEANDO...</div>}
        {enriching && <div className="blink" style={{ color: 'var(--yellow)' }}>CARGANDO TMDB...</div>}
      </div>

      {/* Continue Watching */}
      {continueWatching.length > 0 && !search && filter === 'all' && (
        <div style={{ padding: '20px 24px 0' }}>
          <div style={{ fontSize: 10, color: 'var(--green)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>▶</span> CONTINUAR VIENDO
          </div>
          <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 12 }}>
            {continueWatching.map(item => {
              const pct = item.duration ? Math.round((item.position / item.duration) * 100) : 0
              const thumb = api.thumbUrl(item.thumbnail)
              return (
                <div
                  key={item.id}
                  onClick={() => onPlay(item.id)}
                  style={{ flexShrink: 0, width: 200, cursor: 'pointer', border: '2px solid #333', background: 'var(--bg2)', position: 'relative' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--green)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = '#333'}
                >
                  {thumb
                    ? <img src={thumb} alt={item.title} style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', display: 'block' }} />
                    : <div style={{ width: '100%', aspectRatio: '16/9', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>▶</div>
                  }
                  {/* Progress bar */}
                  <div style={{ height: 3, background: '#222' }}>
                    <div style={{ height: '100%', background: 'var(--green)', width: `${pct}%` }} />
                  </div>
                  <div style={{ padding: '6px 8px' }}>
                    <div style={{ fontSize: 7, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.show_title || item.title}
                    </div>
                    {item.episode != null && (
                      <div style={{ fontSize: 6, color: 'var(--text-dim)', marginTop: 2 }}>
                        T{item.season}E{String(item.episode).padStart(2,'0')} · {fmt(item.position)} / {fmt(item.duration)}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {loading ? (
        <div className="loader">
          <div className="loader-bar"><div className="loader-bar-fill" /></div>
          <div className="loader-text blink">CARGANDO...</div>
        </div>
      ) : visibleItems.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 24px', color: 'var(--text-dim)', fontSize: 9 }}>
          <div style={{ fontSize: 36, marginBottom: 16 }}>📭</div>
          <div>SIN CONTENIDO</div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 20 }}>
            <button className="pixel-btn" onClick={handleScan}>SCAN</button>
            <button className="pixel-btn" onClick={handleEnrich}>★ TMDB</button>
          </div>
        </div>
      ) : (
        <div className="media-grid">
          {visibleItems.map(item =>
            item._card === 'show' ? (
              <ShowCard key={item.id} show={item} onClick={() => setSelectedShow(item.id)} />
            ) : (
              <MediaCard key={item.id} item={item} formatDuration={fmt} onClick={() => onPlay(item.id)} />
            )
          )}
        </div>
      )}
    </div>
  )
}
