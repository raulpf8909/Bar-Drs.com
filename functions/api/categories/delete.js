import { FIRESTORE_BASE, authHeaders, jsonResponse, errorResponse } from '../lib/firebase.js';

export async function onRequestPost({ request }) {
  try {
    const { authToken, id } = await request.json();
    if (!authToken) return errorResponse('No auth token', 401);
    if (!id) return errorResponse('No category id', 400);

    const res = await fetch(FIRESTORE_BASE + '/categories/' + id, {
      method: 'DELETE', headers: authHeaders(authToken)
    });
    if (!res.ok) return errorResponse('Delete error: ' + res.status, 502);

    return jsonResponse({ success: true });
  } catch (err) {
    return errorResponse('Error: ' + err.message);
  }
}
