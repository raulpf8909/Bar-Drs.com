import { FIRESTORE_BASE, authHeaders, serializeField, jsonResponse, errorResponse } from '../lib/firebase.js';

export async function onRequestPost({ request }) {
  try {
    const body = await request.json();
    const token = body.authToken || '';
    if (!token) return errorResponse('Se requiere autenticación', 401);

    const cat = body.category || {};
    const catId = body.id || '';

    const fields = {};
    for (const [k, v] of Object.entries(cat)) {
      fields[k] = serializeField(v);
    }

    if (catId && catId !== 'new') {
      const url = `${FIRESTORE_BASE}/categories/${catId}?updateMask.fieldPaths=${Object.keys(cat).join('&updateMask.fieldPaths=')}`;
      const res = await fetch(url, {
        method: 'PATCH', headers: authHeaders(token), body: JSON.stringify({ fields })
      });
      if (!res.ok) return errorResponse('Firestore error: ' + res.status, 502);
      return jsonResponse({ id: catId, success: true });
    } else {
      const url = `${FIRESTORE_BASE}/categories`;
      const res = await fetch(url, {
        method: 'POST', headers: authHeaders(token), body: JSON.stringify({ fields })
      });
      if (!res.ok) return errorResponse('Firestore error: ' + res.status, 502);
      const result = await res.json();
      return jsonResponse({ id: result.name.split('/').pop(), success: true });
    }
  } catch (err) {
    return errorResponse('Error: ' + err.message);
  }
}
