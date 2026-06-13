import { FIRESTORE_BASE, authHeaders, serializeField } from '../lib/firebase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end('Method not allowed');
  try {
    const body = req.body;
    const token = body.authToken || '';
    if (!token) return res.status(401).send('Se requiere autenticación');
    const product = body.product || {};
    const productId = body.id || '';
    const collection = body.collection || 'products';
    const fields = {};
    for (const [k, v] of Object.entries(product)) fields[k] = serializeField(v);

    if (productId && productId !== 'new') {
      const url = `${FIRESTORE_BASE}/${collection}/${productId}?updateMask.fieldPaths=${Object.keys(product).join('&updateMask.fieldPaths=')}`;
      const r = await fetch(url, { method: 'PATCH', headers: authHeaders(token), body: JSON.stringify({ fields }) });
      if (!r.ok) return res.status(502).send('Firestore error: ' + r.status);
      res.json({ id: productId, success: true });
    } else {
      const r = await fetch(`${FIRESTORE_BASE}/${collection}`, { method: 'POST', headers: authHeaders(token), body: JSON.stringify({ fields }) });
      if (!r.ok) return res.status(502).send('Firestore error: ' + r.status);
      const result = await r.json();
      res.json({ id: result.name.split('/').pop(), success: true });
    }
  } catch (err) {
    res.status(500).send('Error: ' + err.message);
  }
}
