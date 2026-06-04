import BonjourLib from 'bonjour-service'
const { Bonjour } = BonjourLib

let bonjour = null

export function startMdns(port, serverName = 'PixelVault') {
  try {
    bonjour = new Bonjour()
    bonjour.publish({
      name: serverName,
      type: 'pixelvault',
      port,
      txt: { version: '0.2.0', path: '/api' }
    })
    console.log(`[mDNS] Anunciando "${serverName}" en _pixelvault._tcp puerto ${port}`)
  } catch (e) {
    // mDNS no crítico — falla silenciosa en entornos sin multicast (Docker sin host network)
    console.warn('[mDNS] No disponible:', e.message)
  }
}

export function stopMdns() {
  try { bonjour?.destroy() } catch {}
}
