const BASE = '/api'

function getToken() {
  return localStorage.getItem('pv_token')
}

function authHeaders() {
  const t = getToken()
  return t ? { Authorization: `Bearer ${t}` } : {}
}

async function req(method, path, body) {
  const headers = { ...authHeaders() }
  if (body) headers['Content-Type'] = 'application/json'
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `HTTP ${res.status}`)
  }
  return res.json()
}

export const api = {
  health: () => req('GET', '/health'),

  login: (username, password) => req('POST', '/users/login', { username, password }),
  register: (username, password) => req('POST', '/users/register', { username, password }),
  me: () => req('GET', '/users/me'),

  getMedia: (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return req('GET', `/media${qs ? '?' + qs : ''}`)
  },
  getMediaItem: (id) => req('GET', `/media/${id}`),
  triggerScan: () => req('POST', '/media/scan'),

  getProgress: (userId, mediaId) => req('GET', `/media/progress/${userId}/${mediaId}`),
  saveProgress: (userId, mediaId, position, completed) =>
    req('POST', '/media/progress', { userId, mediaId, position, completed }),

  generatePairCode: () => req('POST', '/pair/generate', { clientHost: window.location.hostname }),
  redeemPairCode: (code) => req('POST', '/pair/redeem', { code }),

  getShows: (params = {}) => { const qs = new URLSearchParams(params).toString(); return req('GET', `/shows${qs ? '?' + qs : ''}`) },
  getShow: (id) => req('GET', `/shows/${id}`),
  triggerEnrich: () => req('POST', '/shows/enrich'),
  getUnmatched: () => req('GET', '/shows/unmatched'),

  getFederationIdentity: () => req('GET', '/federation/identity'),
  generateFederationCode: () => req('POST', '/federation/pair/generate'),
  redeemFederationCode: (code) => req('POST', '/federation/pair/redeem', { code }),
  getFederationPeers: () => req('GET', '/federation/peers'),
  removeFederationPeer: (id) => req('DELETE', `/federation/peers/${id}`),

  getLibraries: () => req('GET', '/libraries'),
  getStats: () => req('GET', '/libraries/stats'),
  addLibrary: (name, path) => req('POST', '/libraries', { name, path }),
  deleteLibrary: (id) => req('DELETE', `/libraries/${id}`),
  scanLibrary: (id) => req('POST', `/libraries/${id}/scan`),

  getUsers: () => req('GET', '/users'),
  deleteUser: (id) => req('DELETE', `/users/${id}`),

  posterUrl: (path) => path ? `/thumbnails/${path}` : null,

  streamUrl: (id, startTime = 0) => `/api/stream/${id}${startTime > 0 ? `?t=${Math.floor(startTime)}` : ''}`,
  subtitleUrl: (id, track = 0) => `/api/subtitles/${id}?track=${track}`,
  getContinueWatching: (userId) => req('GET', `/media/continue-watching/${userId}`),
  INCOMPATIBLE_AUDIO: new Set(['ac3', 'eac3', 'dts', 'dca', 'truehd', 'mlp', 'dts-hd']),
  thumbUrl: (thumb) => thumb ? `/thumbnails/${thumb}` : null
}
