import { FIRESTORE_BASE, authHeaders, serializeField, jsonResponse, errorResponse } from '../lib/firebase.js';

export async function onRequestPost({ request }) {
  try {
    const body = await request.json();
    const token = body.authToken || '';
    if (!token) return errorResponse('Se requiere autenticación', 401);

    const product = body.product || {};
    const productId = body.id || '';
    const collection = body.collection || 'products';

    const fields = {};
    for (const [k, v] of Object.entries(product)) {
      fields[k] = serializeField(v);
    }

    if (productId && productId !== 'new') {
      const url = `${FIRESTORE_BASE}/${collection}/${productId}?updateMask.fieldPaths=${Object.keys(product).join('&updateMask.fieldPaths=')}`;
      const res = await fetch(url, {
        method: 'PATCH', headers: authHeaders(token), body: JSON.stringify({ fields })
      });
      if (!res.ok) return errorResponse('Firestore error: ' + res.status, 502);
      return jsonResponse({ id: productId, success: true });
    } else {
      const url = `${FIRESTORE_BASE}/${collection}`;
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
