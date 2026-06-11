import { FIRESTORE_QUERY, authHeaders, convertFields, jsonResponse, errorResponse } from '../lib/firebase.js';

export async function onRequestPost({ request }) {
  try {
    const { authToken } = await request.json();
    if (!authToken) return errorResponse('No auth token', 401);

    const query = { structuredQuery: { from: [{ collectionId: 'categories' }] } };
    const res = await fetch(FIRESTORE_QUERY, {
      method: 'POST', headers: authHeaders(authToken), body: JSON.stringify(query)
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
