import { IDENTITYKIT, jsonResponse, errorResponse } from '../lib/firebase.js';

export async function onRequestPost({ request }) {
  try {
    const { email, password } = await request.json();
    const res = await fetch(IDENTITYKIT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true })
    });
    const data = await res.json();
    if (!res.ok) return errorResponse(data.error?.message || 'Login failed', 401);
    return jsonResponse({ token: data.idToken });
  } catch (err) {
    return errorResponse('Proxy error: ' + err.message);
  }
}
