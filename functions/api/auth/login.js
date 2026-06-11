const API_KEY = 'AIzaSyCPkfsrWoSkF7oYE_QAKkjJ5oYLzsXynao';

export async function onRequestPost({ request }) {
  try {
    const body = await request.json();
    const { email, password } = body;

    const url = 'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=' + API_KEY;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true })
    });

    if (!res.ok) {
      const err = await res.json();
      return new Response(err.error?.message || 'Credenciales incorrectas', { status: 401 });
    }

    const data = await res.json();
    return new Response(JSON.stringify({
      token: data.idToken,
      email: data.email || '',
      localId: data.localId || ''
    }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  } catch (err) {
    return new Response('Auth error: ' + err.message, { status: 500 });
  }
}
