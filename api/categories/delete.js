import { FIRESTORE_BASE, authHeaders } from '../lib/firebase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end('Method not allowed');
  try {
    const body = req.body;
    const token = body.authToken || '';
    if (!token) return res.status(401).send('Se requiere autenticación');
    const id = body.id || '';
    if (!id) return res.status(400).send('ID requerido');
    const r = await fetch(`${FIRESTORE_BASE}/categories/${id}`, { method: 'DELETE', headers: authHeaders(token) });
    if (!r.ok) return res.status(502).send('Firestore error: ' + r.status);
    res.json({ success: true });
  } catch (err) {
    res.status(500).send('Error: ' + err.message);
  }
}
