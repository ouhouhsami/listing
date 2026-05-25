export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  // La déconnexion est gérée côté client via supabase.auth.signOut()
  res.redirect(302, '/')
}
