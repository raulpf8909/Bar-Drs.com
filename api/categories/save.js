import { FIRESTORE_BASE, authHeaders, serializeField } from '../lib/firebase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end('Method not allowed');
  try {
    const body = req.body;
    const token = body.authToken || '';
    if (!token) return res.status(401).send('Se requiere autenticación');
    const cat = body.category || {};
    const catId = body.id || '';
    const fields = {};
    for (const [k, v] of Object.entries(cat)) fields[k] = serializeField(v);

    if (catId && catId !== 'new') {
      const url = `${FIRESTORE_BASE}/categories/${catId}?updateMask.fieldPaths=${Object.keys(cat).join('&updateMask.fieldPaths=')}`;
      const r = await fetch(url, { method: 'PATCH', headers: authHeaders(token), body: JSON.stringify({ fields }) });
      if (!r.ok) return res.status(502).send('Firestore error: ' + r.status);
      res.json({ id: catId, success: true });
    } else {
      const r = await fetch(`${FIRESTORE_BASE}/categories`, { method: 'POST', headers: authHeaders(token), body: JSON.stringify({ fields }) });
      if (!r.ok) return res.status(502).send('Firestore error: ' + r.status);
      const result = await r.json();
      res.json({ id: result.name.split('/').pop(), success: true });
    }
  } catch (err) {
    res.status(500).send('Error: ' + err.message);
  }
}
