import { FIRESTORE_QUERY, convertFields, jsonResponse, errorResponse } from '../lib/firebase.js';

export async function onRequestPost({ request }) {
  try {
    const body = await request.json();
    const category = body.category || '';

    const query = {
      structuredQuery: {
        from: [{ collectionId: 'products' }],
        where: category ? {
          fieldFilter: { field: { fieldPath: 'category' }, op: 'EQUAL', value: { stringValue: category } }
        } : undefined
      }
    };

    const res = await fetch(FIRESTORE_QUERY, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(query)
    });
    if (!res.ok) return errorResponse('Firestore error: ' + res.status, 502);

    const data = await res.json();
    const products = (data || []).filter(r => r.document).map(r => ({
      id: r.document.name.split('/').pop(), ...convertFields(r.document.fields)
    }));

    return jsonResponse(products);
  } catch (err) {
    return errorResponse('Proxy error: ' + err.message);
  }
}
