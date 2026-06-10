// API mockée pour la preview GitHub Pages (front seul, sans backend).
// Intercepte les fetch('/api/...') et renvoie des données de démo.
// Inactif partout ailleurs : sur le vrai site ce fichier n'est même pas chargé,
// et il se désactive hors *.github.io par sécurité.
;(function () {
  const MOCK_ON = location.hostname.endsWith('github.io')
    || localStorage.getItem('mockApi') === '1'
  if (!MOCK_ON) return

  const logged = () => localStorage.getItem('mock_logged') === '1'
  const empty  = () => localStorage.getItem('mock_empty')  === '1'

  // ── Données de démo ────────────────────────────────────────────────
  const USER = { id: 'demo-user', email: 'demo@exemple.fr', created_at: '2026-01-15T10:00:00Z' }

  const LISTINGS = [
    { id: 'demo-1', title: 'Appartement 3 pièces · 68 m² · Lyon', property_type: 'appartement',
      price: 320000, surface: 68, rooms: 3, bedrooms: 2, dpe: 'B', city: 'Lyon',
      created_at: '2026-05-18T09:00:00Z' },
    { id: 'demo-2', title: 'Maison 5 pièces · 120 m² · Bordeaux', property_type: 'maison',
      price: 450000, surface: 120, rooms: 5, bedrooms: 3, dpe: 'C', city: 'Bordeaux',
      created_at: '2026-05-12T14:30:00Z' },
    { id: 'demo-3', title: 'Appartement 2 pièces · 45 m² · Paris 11e', property_type: 'appartement',
      price: 520000, surface: 45, rooms: 2, bedrooms: 1, dpe: 'D', city: 'Paris',
      created_at: '2026-04-28T11:15:00Z' },
  ]

  const MY_LISTINGS = [
    { id: 'demo-1', title: 'Appartement 3 pièces · 68 m² · Lyon',
      price: 320000, status: 'actif', views: 42,  created_at: '2026-05-18T09:00:00Z' },
    { id: 'demo-2', title: 'Maison 5 pièces · 120 m² · Bordeaux',
      price: 450000, status: 'vendu', views: 128, created_at: '2026-05-12T14:30:00Z' },
  ]

  const SEARCHES = [
    { id: 'demo-s1', label: 'Appart · max 400k€ · 3p+ · Balcon', alerts_enabled: true,
      property_type: 'appartement', price_max: 400000, rooms_min: 3, has_balcony: true,
      created_at: '2026-05-01T08:00:00Z' },
    { id: 'demo-s2', label: 'Maison · Jardin', alerts_enabled: false,
      property_type: 'maison', has_garden: true, created_at: '2026-04-15T18:00:00Z' },
  ]

  const DETAIL = {
    ...LISTINGS[0], postal_code: '69003', lat: 45.757, lng: 4.842, status: 'actif',
    bathrooms: 1, floor: 2, total_floors: 6, ges: 'C', heating_type: 'gaz',
    heating_mode: 'collectif', year_built: 1987, condition: 'bon_etat',
    has_balcony: true, has_cave: true, parking: 'box_ferme', has_elevator: true,
    has_garden: false, photos: [], views: 43,
    description: "Bel appartement traversant au 2e étage d'un immeuble des années 80.",
  }

  // ── Routeur ────────────────────────────────────────────────────────
  const json = (data, status = 200) =>
    new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })

  function respond(route, method) {
    const [pathname, qs] = route.split('?')

    if (pathname === '/api/auth/me')     return json({ user: logged() ? USER : null })
    if (pathname === '/api/auth/logout') { localStorage.setItem('mock_logged', '0'); return json({ success: true }) }
    if (pathname === '/api/auth/magic-link') {
      // Pas d'email en démo : la connexion est immédiate
      localStorage.setItem('mock_logged', '1')
      return json({ success: true })
    }

    if (pathname === '/api/listings/me')
      return logged() ? json(empty() ? [] : MY_LISTINGS) : json({ error: 'Non authentifié' }, 401)

    if (pathname === '/api/listings' && method === 'GET') {
      if (empty()) return json([])
      const p = new URLSearchParams(qs || '')
      let results = LISTINGS
      if (p.get('type'))      results = results.filter(l => l.property_type === p.get('type'))
      if (p.get('price_max')) results = results.filter(l => l.price <= parseInt(p.get('price_max')))
      if (p.get('rooms_min')) results = results.filter(l => l.rooms >= parseInt(p.get('rooms_min')))
      return json(results)
    }
    if (pathname === '/api/listings' && method === 'POST') return json({ id: 'demo-1' }, 201)
    if (pathname.startsWith('/api/listings/'))
      return method === 'GET' ? json(DETAIL) : json({ success: true })

    if (pathname === '/api/searches' && method === 'GET')  return json(empty() ? [] : SEARCHES)
    if (pathname === '/api/searches' && method === 'POST') return json({ id: 'demo-s-new' }, 201)
    if (pathname.startsWith('/api/searches/')) return json({ success: true })

    if (pathname === '/api/contact') return json({ success: true })

    return json({ error: `Route mock inconnue : ${route}` }, 404)
  }

  // ── Interception de fetch ──────────────────────────────────────────
  const realFetch = window.fetch.bind(window)
  window.fetch = (url, opts = {}) => {
    const raw  = typeof url === 'string' ? url : url.url
    const path = raw.replace(/^https?:\/\/[^/]+/, '')
    const i    = path.indexOf('/api/')
    if (i === -1) return realFetch(url, opts)
    const method = (opts.method || 'GET').toUpperCase()
    return new Promise(r => setTimeout(() => r(respond(path.slice(i), method)), 150))
  }

  // ── Badge de contrôle ──────────────────────────────────────────────
  function makeBadge() {
    const div = document.createElement('div')
    div.style.cssText = 'position:fixed;bottom:1rem;right:1rem;z-index:10000;' +
      'background:#13171f;color:#fff;padding:.6rem .8rem;border-radius:.5rem;' +
      'font:.8rem sans-serif;display:flex;gap:.6rem;align-items:center;' +
      'box-shadow:0 2px 10px rgba(0,0,0,.4)'

    const btn = (txt, onclick) => {
      const b = document.createElement('button')
      b.textContent = txt
      b.style.cssText = 'font:inherit;padding:.2rem .5rem;margin:0;width:auto;' +
        'cursor:pointer;border-radius:.3rem;border:1px solid #fff;background:transparent;color:#fff'
      b.onclick = onclick
      return b
    }

    div.append(
      `Démo · ${logged() ? 'connecté' : 'déconnecté'}`,
      btn(logged() ? 'Se déconnecter' : 'Se connecter',
        () => { localStorage.setItem('mock_logged', logged() ? '0' : '1'); location.reload() }),
      btn(empty() ? 'Avec données' : 'Sans données',
        () => { localStorage.setItem('mock_empty', empty() ? '0' : '1'); location.reload() }),
    )
    document.body.appendChild(div)
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', makeBadge)
  else makeBadge()
})()
