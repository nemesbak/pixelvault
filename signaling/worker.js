// PixelVault Connect — Cloudflare Worker
// Deploy: wrangler deploy
// Free tier: 100k req/day, KV 1k writes/day — more than enough

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }

    if (request.method === 'OPTIONS') return new Response(null, { headers: cors })

    const json = (data, status = 200) =>
      new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

    try {
      // POST /register — server registers/updates its current candidates
      if (url.pathname === '/register' && request.method === 'POST') {
        const { serverId, candidates, serverName } = await request.json()
        if (!serverId || !candidates) return json({ error: 'Missing fields' }, 400)
        await env.PV_KV.put(
          `server:${serverId}`,
          JSON.stringify({ serverId, serverName, candidates, updatedAt: Date.now() }),
          { expirationTtl: 7200 } // 2h — refreshed every 30min
        )
        return json({ ok: true })
      }

      // POST /pair — store pairing offer (10 min TTL)
      if (url.pathname === '/pair' && request.method === 'POST') {
        const { code, serverId, serverName, candidates } = await request.json()
        if (!code || !serverId) return json({ error: 'Missing fields' }, 400)
        await env.PV_KV.put(
          `pair:${code.toUpperCase()}`,
          JSON.stringify({ serverId, serverName, candidates, createdAt: Date.now() }),
          { expirationTtl: 600 } // 10 min
        )
        return json({ ok: true, code: code.toUpperCase() })
      }

      // GET /pair/:code — retrieve pairing offer
      if (url.pathname.startsWith('/pair/') && request.method === 'GET') {
        const code = url.pathname.split('/pair/')[1].toUpperCase()
        const data = await env.PV_KV.get(`pair:${code}`)
        if (!data) return json({ error: 'Code not found or expired' }, 404)
        return json(JSON.parse(data))
      }

      // GET /server/:serverId — get current candidates for a known server
      if (url.pathname.startsWith('/server/') && request.method === 'GET') {
        const serverId = url.pathname.split('/server/')[1]
        const data = await env.PV_KV.get(`server:${serverId}`)
        if (!data) return json({ error: 'Server not found' }, 404)
        return json(JSON.parse(data))
      }

      return json({ error: 'Not found' }, 404)
    } catch (e) {
      return json({ error: e.message }, 500)
    }
  }
}
