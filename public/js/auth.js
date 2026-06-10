// Récupère l'utilisateur courant via le cookie de session.
// Expose window._authReady (Promise) qui résout en { user } (user = null si déconnecté).

window._authReady = fetch('/api/auth/me')
  .then(r => r.json())
  .then(({ user }) => {
    document.querySelectorAll('[data-nav-auth]').forEach(el => {
      el.innerHTML = user
        ? `<a href="/profil">Mon profil</a>`
        : `<a href="/connexion">Se connecter</a>`
    })
    return { user }
  })
  .catch(() => ({ user: null }))
