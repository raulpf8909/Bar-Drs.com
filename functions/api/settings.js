import { FIRESTORE_BASE, authHeaders, convertFields, jsonResponse, errorResponse } from '../lib/firebase.js';

export async function onRequestPost({ request }) {
  try {
    const { authToken, docId = 'business' } = await request.json();
    if (!authToken) return errorResponse('No auth token', 401);

    const res = await fetch(FIRESTORE_BASE + '/settings/' + docId, {
      headers: authHeaders(authToken)
    });

    if (res.status === 404) return jsonResponse({});

    if (!res.ok) return errorResponse('Settings error: ' + res.status, 502);

    const data = await res.json();
    const obj = { id: data.name.split('/').pop(), ...convertFields(data.fields) };
    return jsonResponse(obj);
  } catch (err) {
    return errorResponse('Error: ' + err.message);
  }
}
