import { FIRESTORE_BASE, authHeaders, jsonResponse, errorResponse } from '../lib/firebase.js';

export async function onRequestPost({ request }) {
  try {
    const body = await request.json();
    const token = body.authToken || '';
    if (!token) return errorResponse('Se requiere autenticación', 401);

    const catId = body.id || '';
    if (!catId) return errorResponse('ID requerido', 400);

    const url = `${FIRESTORE_BASE}/categories/${catId}`;
    const res = await fetch(url, { method: 'DELETE', headers: authHeaders(token) });
    if (!res.ok) return errorResponse('Firestore error: ' + res.status, 502);

    return jsonResponse({ success: true });
  } catch (err) {
    return errorResponse('Error: ' + err.message);
  }
}
