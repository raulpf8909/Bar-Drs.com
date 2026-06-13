import { IDENTITYKIT } from '../lib/firebase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end('Method not allowed');
  try {
    const { email, password } = req.body;
    const r = await fetch(IDENTITYKIT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true })
    });
    const data = await r.json();
    if (!r.ok) return res.status(401).json({ error: data.error?.message || 'Login failed' });
    res.json({ token: data.idToken, refreshToken: data.refreshToken || '' });
  } catch (err) {
    res.status(500).send('Proxy error: ' + err.message);
  }
}
