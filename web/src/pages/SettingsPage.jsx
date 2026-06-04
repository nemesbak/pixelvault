import { useState, useEffect } from 'react'
import { api } from '../api.js'

function fmtSize(bytes) {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let i = 0; let v = bytes
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++ }
  return `${v.toFixed(1)} ${units[i]}`
}

export default function SettingsPage({ user, onClose }) {
  const [tab, setTab] = useState('federation')
  const [identity, setIdentity] = useState(null)
  const [peers, setPeers] = useState([])
  const [pairCode, setPairCode] = useState(null)
  const [redeemInput, setRedeemInput] = useState('')
  const [libraries, setLibraries] = useState([])
  const [users, setUsers] = useState([])
  const [stats, setStats] = useState(null)
  const [newLibName, setNewLibName] = useState('')
  const [newLibPath, setNewLibPath] = useState('')
  const [newUsername, setNewUsername] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  useEffect(() => {
    api.getFederationIdentity().then(setIdentity).catch(() => {})
    api.getFederationPeers().then(setPeers).catch(() => {})
    api.getLibraries().then(setLibraries).catch(() => {})
    api.getStats().then(setStats).catch(() => {})
    if (user.is_admin) api.getUsers().then(setUsers).catch(() => {})
  }, [user])

  function flash(m, isErr = false) {
    if (isErr) setErr(m); else setMsg(m)
    setTimeout(() => { setMsg(''); setErr('') }, 3000)
  }

  async function addLibrary() {
    if (!newLibName || !newLibPath) return
    try {
      const lib = await api.addLibrary(newLibName, newLibPath)
      setLibraries(l => [...l, lib])
      setNewLibName(''); setNewLibPath('')
      flash('Biblioteca añadida')
    } catch(e) { flash(e.message, true) }
  }

  async function removeLibrary(id) {
    if (!confirm('¿Eliminar biblioteca? Los archivos no se borrarán del disco.')) return
    try { await api.deleteLibrary(id); setLibraries(l => l.filter(x => x.id !== id)) }
    catch(e) { flash(e.message, true) }
  }

  async function scanLib(id, name) {
    try { await api.scanLibrary(id); flash(`Escaneo iniciado: ${name}`) }
    catch(e) { flash(e.message, true) }
  }

  async function createUser() {
    if (!newUsername || !newPassword) return
    try {
      const { user: u } = await api.register(newUsername, newPassword)
      setUsers(list => [...list, u])
      setNewUsername(''); setNewPassword('')
      flash('Usuario creado')
    } catch(e) { flash(e.message, true) }
  }

  async function removeUser(id, username) {
    if (!confirm(`¿Eliminar usuario "${username}"?`)) return
    try { await api.deleteUser(id); setUsers(u => u.filter(x => x.id !== id)) }
    catch(e) { flash(e.message, true) }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <nav className="navbar">
        <div className="navbar-logo">PIXEL<span>VAULT</span> // CONFIG</div>
        <button className="pixel-btn" onClick={onClose}>← VOLVER</button>
      </nav>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '2px solid #222', padding: '0 24px', gap: 0 }}>
        {[['federation','🔗 CONECTAR'], ['libraries','📁 BIBLIOTECAS'], ['users','👥 USUARIOS'], ['system','📊 SISTEMA']].map(([k,l]) => (
          <button key={k} onClick={() => setTab(k)} style={{
            fontFamily: "'Press Start 2P', monospace", fontSize: 8,
            padding: '12px 16px', background: 'transparent', border: 'none',
            borderBottom: `3px solid ${tab===k ? 'var(--green)' : 'transparent'}`,
            color: tab===k ? 'var(--green)' : '#555', cursor: 'pointer', marginBottom: -2
          }}>{l}</button>
        ))}
      </div>

      {(msg || err) && (
        <div style={{ margin: '12px 24px', padding: '8px 12px', fontSize: 8, border: `2px solid ${err ? 'var(--magenta)' : 'var(--green)'}`, color: err ? 'var(--magenta)' : 'var(--green)' }}>
          {msg || err}
        </div>
      )}

      <div style={{ padding: 24, maxWidth: 800 }}>

        {/* FEDERATION TAB */}
        {tab === 'federation' && (
          <div>
            {identity && (
              <div style={{ padding: '12px 16px', background: 'var(--bg2)', border: '2px solid #333', marginBottom: 20 }}>
                <div style={{ fontSize: 7, color: 'var(--text-dim)', marginBottom: 6 }}>ID DE ESTE SERVIDOR</div>
                <div style={{ fontSize: 8, color: 'var(--green)', fontFamily: 'monospace', wordBreak: 'break-all' }}>{identity.id}</div>
                <div style={{ fontSize: 8, color: 'var(--text)', marginTop: 6 }}>{identity.name}</div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
              {/* Generate code */}
              <div style={{ padding: 16, border: '2px solid #333', background: 'var(--bg2)' }}>
                <div style={{ fontSize: 8, color: 'var(--text-dim)', marginBottom: 12 }}>COMPARTIR ESTE SERVIDOR</div>
                {pairCode ? (
                  <>
                    <div style={{ fontSize: 28, letterSpacing: 10, color: 'var(--green)', textShadow: '0 0 12px var(--green)', textAlign: 'center', padding: '12px 0', fontFamily: 'monospace' }}>
                      {pairCode.code}
                    </div>
                    {pairCode.qr && <img src={pairCode.qr} alt="QR" style={{ display: 'block', margin: '8px auto', border: '3px solid var(--green)', imageRendering: 'pixelated' }} width={140} height={140} />}
                    <div style={{ fontSize: 6, color: 'var(--text-dim)', textAlign: 'center', marginTop: 6 }}>Expira en 10 minutos</div>
                  </>
                ) : (
                  <button className="pixel-btn" style={{ width: '100%' }} onClick={async () => {
                    try { setPairCode(await api.generateFederationCode()) }
                    catch(e) { flash(e.message, true) }
                  }}>
                    GENERAR CÓDIGO
                  </button>
                )}
              </div>

              {/* Redeem code */}
              <div style={{ padding: 16, border: '2px solid #333', background: 'var(--bg2)' }}>
                <div style={{ fontSize: 8, color: 'var(--text-dim)', marginBottom: 12 }}>CONECTAR A OTRO SERVIDOR</div>
                <input
                  className="pixel-input"
                  placeholder="CÓDIGO DEL OTRO SERVER"
                  value={redeemInput}
                  onChange={e => setRedeemInput(e.target.value.toUpperCase())}
                  style={{ marginBottom: 10, letterSpacing: 4, textAlign: 'center' }}
                  maxLength={8}
                />
                <button className="pixel-btn" style={{ width: '100%' }} onClick={async () => {
                  try {
                    const r = await api.redeemFederationCode(redeemInput)
                    flash(r.message || 'Conectando...')
                    setRedeemInput('')
                    setTimeout(() => api.getFederationPeers().then(setPeers), 3000)
                  } catch(e) { flash(e.message, true) }
                }}>
                  CONECTAR
                </button>
              </div>
            </div>

            {/* Connected servers */}
            <div style={{ fontSize: 9, color: 'var(--green)', marginBottom: 12 }}>SERVIDORES CONECTADOS</div>
            {peers.length === 0 ? (
              <div style={{ fontSize: 8, color: 'var(--text-dim)', padding: 24, textAlign: 'center', border: '2px solid #222' }}>
                Sin servidores conectados aún
              </div>
            ) : peers.map(p => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'var(--bg2)', border: '2px solid #333', marginBottom: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: p.status === 'connected' ? 'var(--green)' : p.status === 'connecting' ? 'var(--yellow)' : '#555', boxShadow: p.status === 'connected' ? '0 0 6px var(--green)' : 'none', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 9, color: 'var(--text)' }}>{p.remote_name}</div>
                  <div style={{ fontSize: 7, color: 'var(--text-dim)', marginTop: 3 }}>
                    {p.status === 'connected' ? '● EN LÍNEA' : p.status === 'pending' ? '○ CONECTANDO...' : '○ DESCONECTADO'}
                    {p.last_seen && <span style={{ marginLeft: 8 }}>· Visto: {new Date(p.last_seen).toLocaleTimeString()}</span>}
                  </div>
                </div>
                <button className="pixel-btn danger" style={{ fontSize: 7 }} onClick={async () => {
                  if (!confirm(`¿Desconectar de ${p.remote_name}?`)) return
                  await api.removeFederationPeer(p.remote_server_id)
                  setPeers(prev => prev.filter(x => x.id !== p.id))
                }}>✕</button>
              </div>
            ))}
          </div>
        )}

        {/* LIBRARIES TAB */}
        {tab === 'libraries' && (
          <div>
            <div style={{ fontSize: 9, color: 'var(--text-dim)', marginBottom: 16 }}>
              Carpetas de media escaneadas por PixelVault. Las rutas son las del contenedor Docker.
            </div>
            {libraries.map(lib => (
              <div key={lib.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'var(--bg2)', border: '2px solid #333', marginBottom: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 9, color: 'var(--green)', marginBottom: 4 }}>{lib.name}</div>
                  <div style={{ fontSize: 7, color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lib.path}</div>
                  <div style={{ fontSize: 7, color: '#555', marginTop: 4 }}>{lib.item_count} archivos · {fmtSize(lib.total_size)}</div>
                </div>
                <button className="pixel-btn" style={{ fontSize: 7 }} onClick={() => scanLib(lib.id, lib.name)}>SCAN</button>
                <button className="pixel-btn danger" style={{ fontSize: 7 }} onClick={() => removeLibrary(lib.id)}>✕</button>
              </div>
            ))}
            <div style={{ marginTop: 24, padding: 16, border: '2px solid #333', background: 'var(--bg2)' }}>
              <div style={{ fontSize: 8, color: 'var(--text-dim)', marginBottom: 12 }}>AÑADIR BIBLIOTECA</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 7, color: 'var(--text-dim)', marginBottom: 6 }}>NOMBRE</div>
                    <input className="pixel-input" placeholder="Ej: Películas" value={newLibName} onChange={e => setNewLibName(e.target.value)} />
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 7, color: 'var(--text-dim)', marginBottom: 6 }}>RUTA EN EL CONTENEDOR</div>
                  <input className="pixel-input" placeholder="Ej: /media2" value={newLibPath} onChange={e => setNewLibPath(e.target.value)} />
                  <div style={{ fontSize: 6, color: '#555', marginTop: 4 }}>Debes montar la carpeta en docker-compose.yml primero</div>
                </div>
                <button className="pixel-btn" onClick={addLibrary}>+ AÑADIR</button>
              </div>
            </div>
          </div>
        )}

        {/* USERS TAB */}
        {tab === 'users' && (
          <div>
            {!user.is_admin && (
              <div style={{ fontSize: 8, color: 'var(--magenta)', padding: 16 }}>Solo admins pueden gestionar usuarios.</div>
            )}
            {user.is_admin && (
              <>
                {users.map(u => (
                  <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'var(--bg2)', border: '2px solid #333', marginBottom: 8 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 9, color: u.id === user.id ? 'var(--green)' : 'var(--text)' }}>
                        {u.username} {u.id === user.id && <span style={{ fontSize: 7, color: 'var(--text-dim)' }}>(tú)</span>}
                      </div>
                      <div style={{ fontSize: 7, color: u.is_admin ? 'var(--yellow)' : 'var(--text-dim)', marginTop: 4 }}>
                        {u.is_admin ? '★ ADMIN' : 'USUARIO'}
                      </div>
                    </div>
                    {u.id !== user.id && (
                      <button className="pixel-btn danger" style={{ fontSize: 7 }} onClick={() => removeUser(u.id, u.username)}>✕ BORRAR</button>
                    )}
                  </div>
                ))}
                <div style={{ marginTop: 24, padding: 16, border: '2px solid #333', background: 'var(--bg2)' }}>
                  <div style={{ fontSize: 8, color: 'var(--text-dim)', marginBottom: 12 }}>CREAR USUARIO</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <input className="pixel-input" placeholder="Username" value={newUsername} onChange={e => setNewUsername(e.target.value)} />
                    <input className="pixel-input" type="password" placeholder="Password" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                    <button className="pixel-btn" onClick={createUser}>+ CREAR</button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* SYSTEM TAB */}
        {tab === 'system' && stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16 }}>
            {[
              ['ARCHIVOS', stats.files],
              ['SERIES/PELIS', stats.shows],
              ['USUARIOS', stats.users],
              ['ALMACENAMIENTO', fmtSize(stats.totalSize)],
            ].map(([label, value]) => (
              <div key={label} style={{ padding: 20, border: '3px solid var(--green)', background: 'var(--bg2)', textAlign: 'center' }}>
                <div style={{ fontSize: 20, color: 'var(--green)', textShadow: '0 0 8px var(--green)', marginBottom: 8 }}>{value}</div>
                <div style={{ fontSize: 7, color: 'var(--text-dim)' }}>{label}</div>
              </div>
            ))}
            <div style={{ padding: 20, border: '3px solid #333', background: 'var(--bg2)', gridColumn: '1/-1' }}>
              <div style={{ fontSize: 8, color: 'var(--text-dim)', marginBottom: 12 }}>ACCIONES</div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button className="pixel-btn" onClick={() => { api.triggerScan(); flash('Escaneo global iniciado') }}>SCAN TODO</button>
                <button className="pixel-btn" onClick={() => { api.triggerEnrich(); flash('Enriquecimiento TMDB iniciado') }}>★ TMDB</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
