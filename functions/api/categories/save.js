import { FIRESTORE_BASE, authHeaders, serializeField, jsonResponse, errorResponse } from '../lib/firebase.js';

export async function onRequestPost({ request }) {
  try {
    const { authToken, id, category } = await request.json();
    if (!authToken) return errorResponse('No auth token', 401);

    const fields = {};
    for (const [k, v] of Object.entries(category || {})) {
      fields[k] = serializeField(v);
    }

    if (id && id !== 'new') {
      const mask = '?updateMask.fieldPaths=' + Object.keys(category).join('&updateMask.fieldPaths=');
      const res = await fetch(FIRESTORE_BASE + '/categories/' + id + mask, {
        method: 'PATCH', headers: authHeaders(authToken), body: JSON.stringify({ fields })
      });
      if (!res.ok) return errorResponse('Save error: ' + res.status, 502);
      return jsonResponse({ id, success: true });
    } else {
      const res = await fetch(FIRESTORE_BASE + '/categories', {
        method: 'POST', headers: authHeaders(authToken), body: JSON.stringify({ fields })
      });
      if (!res.ok) return errorResponse('Create error: ' + res.status, 502);
      const result = await res.json();
      return jsonResponse({ id: result.name.split('/').pop(), success: true });
    }
  } catch (err) {
    return errorResponse('Error: ' + err.message);
  }
}
