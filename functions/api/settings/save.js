import { FIRESTORE_BASE, authHeaders, serializeField, jsonResponse, errorResponse } from '../lib/firebase.js';

export async function onRequestPost({ request }) {
  try {
    const body = await request.json();
    const token = body.authToken || '';
    if (!token) return errorResponse('Se requiere autenticación', 401);

    const docId = body.docId || 'business';
    const data = body.data || {};

    const fields = {};
    for (const [k, v] of Object.entries(data)) {
      fields[k] = serializeField(v);
    }

    const url = `${FIRESTORE_BASE}/settings?documentId=${docId}`;
    const res = await fetch(url, {
      method: 'POST', headers: authHeaders(token), body: JSON.stringify({ fields })
    });
    if (!res.ok) return errorResponse('Firestore error: ' + res.status, 502);

    return jsonResponse({ success: true });
  } catch (err) {
    return errorResponse('Error: ' + err.message);
  }
}
