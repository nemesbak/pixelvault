import { useState } from 'react'
import { api } from '../api.js'

export default function LoginPage({ onLogin }) {
  const [tab, setTab] = useState('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      let res
      if (tab === 'login') res = await api.login(username, password)
      else if (tab === 'register') res = await api.register(username, password)
      else res = await api.redeemPairCode(code.trim())
      onLogin(res.token, res.user)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container scanlines">
      <div className="login-box pixel-box">
        <div className="login-title">PIXEL<span>VAULT</span></div>
        <div className="login-subtitle">// YOUR RETRO MEDIA SERVER //</div>

        <div className="login-tabs">
          {['login', 'register', 'pair'].map(t => (
            <button
              key={t}
              className={`login-tab${tab === t ? ' active' : ''}`}
              onClick={() => { setTab(t); setError('') }}
            >
              {t === 'pair' ? 'QR' : t.toUpperCase()}
            </button>
          ))}
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          {(tab === 'login' || tab === 'register') && (
            <>
              <div className="form-group">
                <label className="form-label">&gt; USERNAME</label>
                <input
                  className="pixel-input"
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="PLAYER_1"
                  autoComplete="username"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">&gt; PASSWORD</label>
                <input
                  className="pixel-input"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
              </div>
            </>
          )}

          {tab === 'pair' && (
            <div className="form-group">
              <label className="form-label">&gt; ENTER 6-DIGIT CODE</label>
              <input
                className="pixel-input"
                type="text"
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                placeholder="000000"
                maxLength={6}
                style={{ fontSize: 18, letterSpacing: 12, textAlign: 'center' }}
                required
              />
              <div style={{ fontSize: 7, color: 'var(--text-dim)', textAlign: 'center', marginTop: 8 }}>
                Generate the code in the web app after logging in
              </div>
            </div>
          )}

          {error && <div className="login-error">&gt; ERR: {error}</div>}

          <button className="pixel-btn" type="submit" disabled={loading} style={{ width: '100%', padding: '14px' }}>
            {loading ? '...' : tab === 'login' ? 'PRESS START' : tab === 'register' ? 'CREATE ACCOUNT' : 'CONNECT'}
          </button>
        </form>

        {tab === 'login' && (
          <div style={{ textAlign: 'center', marginTop: 16, fontSize: 7, color: 'var(--text-dim)' }}>
            First time? Switch to REGISTER to create your account
          </div>
        )}
      </div>
    </div>
  )
}
