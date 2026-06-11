import { FIRESTORE_BASE, authHeaders, jsonResponse, errorResponse } from '../lib/firebase.js';

export async function onRequestPost({ request }) {
  try {
    const body = await request.json();
    const token = body.authToken || '';
    if (!token) return errorResponse('Se requiere autenticación', 401);

    const productId = body.id || '';
    const collection = body.collection || 'products';
    if (!productId) return errorResponse('ID requerido', 400);

    const url = `${FIRESTORE_BASE}/${collection}/${productId}`;
    const res = await fetch(url, { method: 'DELETE', headers: authHeaders(token) });
    if (!res.ok) return errorResponse('Firestore error: ' + res.status, 502);

    return jsonResponse({ success: true });
  } catch (err) {
    return errorResponse('Error: ' + err.message);
  }
}
