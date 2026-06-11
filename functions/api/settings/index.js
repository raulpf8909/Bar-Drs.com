import { FIRESTORE_BASE, authHeaders, convertFields, jsonResponse, errorResponse } from '../lib/firebase.js';

export async function onRequestPost({ request }) {
  try {
    const body = await request.json();
    const token = body.authToken || '';
    if (!token) return errorResponse('Se requiere autenticación', 401);

    const docId = body.docId || 'business';
    const url = `${FIRESTORE_BASE}/settings/${docId}`;
    const res = await fetch(url, { headers: authHeaders(token) });
    if (res.status === 404) return jsonResponse({});
    if (!res.ok) return errorResponse('Firestore error: ' + res.status, 502);

    const data = await res.json();
    const obj = { id: data.name.split('/').pop(), ...convertFields(data.fields || {}) };
    return jsonResponse(obj);
  } catch (err) {
    return errorResponse('Error: ' + err.message);
  }
}
