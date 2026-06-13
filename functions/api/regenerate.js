import { jsonResponse, errorResponse } from './lib/firebase.js';

export async function onRequestPost({ request, env }) {
  try {
    const GITHUB_TOKEN = env.GITHUB_PAT || '';
    if (!GITHUB_TOKEN) return errorResponse('GitHub token not configured', 500);

    const r = await fetch('https://api.github.com/repos/raulpf8909/Bar-Drs.com/dispatches', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + GITHUB_TOKEN,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ event_type: 'regenerate' })
    });

    if (!r.ok) return errorResponse('GitHub dispatch failed: ' + r.status, 502);
    return jsonResponse({ success: true, message: 'Regenerating menu pages...' });
  } catch (err) {
    return errorResponse('Error: ' + err.message);
  }
}
