export default async function handler(req, res) {
  // Supabase gère l'échange de token côté client via le fragment d'URL (#access_token=...)
  // On redirige simplement vers le profil — le JS côté client finalisera la session
  res.redirect(302, '/profil')
}
