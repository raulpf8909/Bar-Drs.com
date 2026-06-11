import { FIRESTORE_BASE, authHeaders, serializeField, jsonResponse, errorResponse } from '../lib/firebase.js';

export async function onRequestPost({ request }) {
  try {
    const { authToken, docId = 'business', data } = await request.json();
    if (!authToken) return errorResponse('No auth token', 401);

    const fields = {};
    for (const [k, v] of Object.entries(data || {})) {
      fields[k] = serializeField(v);
    }

    const res = await fetch(FIRESTORE_BASE + '/settings?documentId=' + docId, {
      method: 'POST', headers: authHeaders(authToken), body: JSON.stringify({ fields })
    });
    if (!res.ok) return errorResponse('Settings save error: ' + res.status, 502);

    return jsonResponse({ success: true });
  } catch (err) {
    return errorResponse('Error: ' + err.message);
  }
}
