import { useState, useEffect } from 'react'
import { api } from './api.js'
import LoginPage from './pages/LoginPage.jsx'
import LibraryPage from './pages/LibraryPage.jsx'
import PlayerPage from './pages/PlayerPage.jsx'
import SettingsPage from './pages/SettingsPage.jsx'

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [playingId, setPlayingId] = useState(null)
  const [showSettings, setShowSettings] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('pv_token')
    if (!token) { setLoading(false); return }
    api.me()
      .then(u => setUser(u))
      .catch(() => localStorage.removeItem('pv_token'))
      .finally(() => setLoading(false))
  }, [])

  function handleLogin(token, u) {
    localStorage.setItem('pv_token', token)
    setUser(u)
  }

  function handleLogout() {
    localStorage.removeItem('pv_token')
    setUser(null)
  }

  if (loading) return (
    <div className="scanlines" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="loader">
        <div className="glow-green" style={{ fontSize: 14 }}>PIXEL VAULT</div>
        <div className="loader-bar"><div className="loader-bar-fill" /></div>
        <div className="loader-text blink">LOADING...</div>
      </div>
    </div>
  )

  if (!user) return <LoginPage onLogin={handleLogin} />

  if (showSettings) return (
    <SettingsPage user={user} onClose={() => setShowSettings(false)} />
  )

  if (playingId) return (
    <PlayerPage
      mediaId={playingId}
      userId={user.id}
      onClose={() => setPlayingId(null)}
    />
  )

  return (
    <div className="scanlines">
      <LibraryPage
        user={user}
        onLogout={handleLogout}
        onPlay={setPlayingId}
        onSettings={() => setShowSettings(true)}
      />
    </div>
  )
}
