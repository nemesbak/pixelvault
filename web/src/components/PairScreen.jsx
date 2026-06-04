import { useState, useEffect } from 'react'
import { api } from '../api.js'

export default function PairScreen({ onClose }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.generatePairCode()
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  function refresh() {
    setLoading(true)
    setError('')
    api.generatePairCode()
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }

  const expiresIn = data?.expiresAt
    ? Math.max(0, Math.round((new Date(data.expiresAt) - Date.now()) / 60000))
    : 0

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <nav className="navbar">
        <div className="navbar-logo">PIXEL<span>VAULT</span> // PAIR DEVICE</div>
        <button className="pixel-btn danger" onClick={onClose}>✕ CLOSE</button>
      </nav>

      <div className="pair-container">
        <div style={{ fontSize: 9, color: 'var(--text-dim)', marginBottom: 16 }}>
          &gt; Connect a new device to your account
        </div>

        {loading && (
          <div className="loader">
            <div className="loader-bar"><div className="loader-bar-fill" /></div>
            <div className="loader-text blink">GENERATING CODE...</div>
          </div>
        )}

        {error && (
          <div className="login-error" style={{ marginBottom: 16 }}>&gt; ERR: {error}</div>
        )}

        {data && !loading && (
          <>
            <div style={{ fontSize: 8, color: 'var(--text-dim)', marginBottom: 8 }}>
              ENTER THIS CODE ON YOUR DEVICE:
            </div>

            <div className="pair-code">{data.code}</div>

            <div style={{ fontSize: 7, color: 'var(--text-dim)', textAlign: 'center', marginBottom: 16 }}>
              Expires in ~{expiresIn} minutes
            </div>

            {data.qr && (
              <>
                <div style={{ fontSize: 8, color: 'var(--text-dim)', textAlign: 'center', marginBottom: 8 }}>
                  OR SCAN QR CODE:
                </div>
                <img
                  src={data.qr}
                  alt="QR Pairing Code"
                  className="pair-qr"
                  width={200}
                  height={200}
                />
              </>
            )}

            <div style={{ marginTop: 24 }}>
              <button className="pixel-btn" onClick={refresh} style={{ width: '100%' }}>
                GENERATE NEW CODE
              </button>
            </div>

            <div style={{ marginTop: 24, padding: 16, border: '2px solid #333', fontSize: 7, color: 'var(--text-dim)', lineHeight: 2 }}>
              <div style={{ color: 'var(--green)', marginBottom: 8 }}>&gt; HOW TO PAIR:</div>
              <div>1. Open PixelVault on your device</div>
              <div>2. Select "QR" on the login screen</div>
              <div>3. Enter the code above or scan the QR</div>
              <div>4. You will be logged in automatically</div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
