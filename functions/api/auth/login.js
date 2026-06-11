import { IDENTITYKIT, jsonResponse, errorResponse } from '../lib/firebase.js';

export async function onRequestPost({ request }) {
  try {
    const { email, password } = await request.json();
    const res = await fetch(IDENTITYKIT, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true })
    });
    if (!res.ok) {
      const err = await res.json();
      return errorResponse(err.error?.message || 'Credenciales incorrectas', 401);
    }
    const data = await res.json();
    return jsonResponse({ token: data.idToken, email: data.email || '', localId: data.localId || '' });
  } catch (err) {
    return errorResponse('Auth error: ' + err.message);
  }
}
