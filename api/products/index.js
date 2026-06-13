import { FIRESTORE_QUERY, convertFields } from '../lib/firebase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end('Method not allowed');
  try {
    const category = req.body.category || '';
    const query = {
      structuredQuery: {
        from: [{ collectionId: 'products' }],
        where: category ? {
          fieldFilter: { field: { fieldPath: 'category' }, op: 'EQUAL', value: { stringValue: category } }
        } : undefined
      }
    };
    const r = await fetch(FIRESTORE_QUERY, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(query)
    });
    if (!r.ok) return res.status(502).send('Firestore error: ' + r.status);
    const data = await r.json();
    const products = (data || []).filter(r => r.document).map(r => ({
      id: r.document.name.split('/').pop(), ...convertFields(r.document.fields)
    }));
    res.json(products);
  } catch (err) {
    res.status(500).send('Proxy error: ' + err.message);
  }
}
