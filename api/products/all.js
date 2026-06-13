import { FIRESTORE_QUERY, authHeaders, convertFields } from '../lib/firebase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end('Method not allowed');
  try {
    const token = req.body.authToken || '';
    if (!token) return res.status(401).send('Se requiere autenticación');

    const query = { structuredQuery: { from: [{ collectionId: 'products' }] } };
    const r = await fetch(FIRESTORE_QUERY, {
      method: 'POST', headers: authHeaders(token), body: JSON.stringify(query)
    });
    if (!r.ok) return res.status(502).send('Firestore error: ' + r.status);

    const data = await r.json();
    const products = (data || []).filter(x => x.document).map(x => ({
      id: x.document.name.split('/').pop(), ...convertFields(x.document.fields)
    }));
    res.json(products);
  } catch (err) {
    res.status(500).send('Error: ' + err.message);
  }
}
