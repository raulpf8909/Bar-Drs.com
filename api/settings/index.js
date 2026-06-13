import { FIRESTORE_BASE, authHeaders, convertFields } from '../lib/firebase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end('Method not allowed');
  try {
    const body = req.body;
    const token = body.authToken || '';
    if (!token) return res.status(401).send('Se requiere autenticación');
    const docId = body.docId || 'business';
    const r = await fetch(`${FIRESTORE_BASE}/settings/${docId}`, { headers: authHeaders(token) });
    if (r.status === 404) return res.json({});
    if (!r.ok) return res.status(502).send('Firestore error: ' + r.status);
    const data = await r.json();
    res.json({ id: data.name.split('/').pop(), ...convertFields(data.fields || {}) });
  } catch (err) {
    res.status(500).send('Error: ' + err.message);
  }
}
