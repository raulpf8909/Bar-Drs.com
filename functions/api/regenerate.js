import { jsonResponse, errorResponse } from './lib/firebase.js';

export async function onRequestPost({ request, env }) {
  try {
    const GITHUB_TOKEN = env.GITHUB_PAT || '';
    if (!GITHUB_TOKEN) return errorResponse('GitHub token not configured', 500);

    const body = JSON.stringify({ event_type: 'regenerate' });
    const r = await fetch('https://api.github.com/repos/raulpf8909/Bar-Drs.com/dispatches', {
      method: 'POST',
      headers: {
        'Authorization': 'token ' + GITHUB_TOKEN,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'bardrs-app/1.0',
      },
      body
    });

    const text = await r.text();
    if (!r.ok) return errorResponse('GitHub: ' + r.status + ' ' + text, 502);
    return jsonResponse({ success: true, message: 'Regenerating menu pages...' });
  } catch (err) {
    return errorResponse('Error: ' + err.message);
  }
}
