// Initialise le client Supabase et gère la session côté client.
// Expose window._authReady (Promise) qui résout en { sb, session }.

window._authReady = fetch('/api/config')
  .then(r => r.json())
  .then(({ supabaseUrl, supabaseAnonKey }) => {
    const sb = window.supabase.createClient(supabaseUrl, supabaseAnonKey)
    // getSession() échange automatiquement le token du fragment #access_token=...
    return sb.auth.getSession().then(({ data: { session } }) => {
      window._sb = sb

      document.querySelectorAll('[data-nav-auth]').forEach(el => {
        el.innerHTML = session
          ? `<a href="/profil">Mon profil</a>`
          : `<a href="/connexion">Se connecter</a>`
      })

      return { sb, session }
    })
  })
