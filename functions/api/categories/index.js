import { FIRESTORE_QUERY, authHeaders, convertFields, jsonResponse, errorResponse } from '../lib/firebase.js';

export async function onRequestPost({ request }) {
  try {
    const body = await request.json();
    const token = body.authToken || '';
    if (!token) return errorResponse('Se requiere autenticación', 401);

    const query = { structuredQuery: { from: [{ collectionId: 'categories' }] } };
    const res = await fetch(FIRESTORE_QUERY, {
      method: 'POST', headers: authHeaders(token), body: JSON.stringify(query)
    });
    if (!res.ok) return errorResponse('Firestore error: ' + res.status, 502);

    const data = await res.json();
    const categories = (data || []).filter(r => r.document).map(r => ({
      id: r.document.name.split('/').pop(), ...convertFields(r.document.fields)
    }));

    return jsonResponse(categories);
  } catch (err) {
    return errorResponse('Error: ' + err.message);
  }
}
