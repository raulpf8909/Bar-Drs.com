import { FIRESTORE_QUERY, authHeaders, convertFields, jsonResponse, errorResponse } from '../lib/firebase.js';

export async function onRequestPost({ request }) {
  try {
    const body = await request.json();
    const token = body.authToken || '';
    if (!token) return errorResponse('No auth token', 401);

    const query = { structuredQuery: { from: [{ collectionId: 'products' }] } };
    const res = await fetch(FIRESTORE_QUERY, {
      method: 'POST', headers: authHeaders(token), body: JSON.stringify(query)
    });
    if (!res.ok) return errorResponse('Firestore error: ' + res.status, 502);

    const data = await res.json();
    const products = (data || []).filter(r => r.document).map(r => ({
      id: r.document.name.split('/').pop(), ...convertFields(r.document.fields)
    }));

    return jsonResponse(products);
  } catch (err) {
    return errorResponse('Error: ' + err.message);
  }
}
