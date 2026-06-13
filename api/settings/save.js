import { FIRESTORE_BASE, authHeaders, serializeField } from '../lib/firebase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end('Method not allowed');
  try {
    const body = req.body;
    const token = body.authToken || '';
    if (!token) return res.status(401).send('Se requiere autenticación');
    const docId = body.docId || 'business';
    const data = body.data || {};
    const fields = {};
    for (const [k, v] of Object.entries(data)) fields[k] = serializeField(v);
    const r = await fetch(`${FIRESTORE_BASE}/settings?documentId=${docId}`, {
      method: 'POST', headers: authHeaders(token), body: JSON.stringify({ fields })
    });
    if (!r.ok) return res.status(502).send('Firestore error: ' + r.status);
    res.json({ success: true });
  } catch (err) {
    res.status(500).send('Error: ' + err.message);
  }
}
