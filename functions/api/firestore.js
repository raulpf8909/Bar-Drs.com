import { FIRESTORE_BASE, STORAGE_BASE, authHeaders, jsonResponse, errorResponse } from '../lib/firebase.js';

const PROJECT_ID = 'bardrs-64b37';
const API_KEY = 'AIzaSyCPkfsrWoSkF7oYE_QAKkjJ5oYLzsXynao';

export async function onRequestPost({ request }) {
  try {
    const { path, method, body, params, _upload, filename, _data, contentType, authToken } = await request.json();

    if (_upload) {
      const url = STORAGE_BASE + '?uploadType=media&name=' + encodeURIComponent(filename) + '&key=' + API_KEY;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': contentType || 'image/jpeg', 'Authorization': 'Bearer ' + authToken },
        body: Uint8Array.from(atob(_data), c => c.charCodeAt(0))
      });
      const data = await res.json();
      if (!res.ok) return errorResponse(data.error?.message || 'Upload failed', res.status);
      const downloadUrl = `https://firebasestorage.googleapis.com/v0/b/${PROJECT_ID}.firebasestorage.app/o/${encodeURIComponent(data.name)}?alt=media`;
      return jsonResponse({ url: downloadUrl, name: data.name });
    }

    let url = FIRESTORE_BASE + path + '?key=' + API_KEY;
    if (params) {
      const q = [];
      for (const [k, v] of Object.entries(params)) {
        if (Array.isArray(v)) {
          for (const x of v) q.push(`${k}=${encodeURIComponent(x)}`);
        } else {
          q.push(`${k}=${encodeURIComponent(v)}`);
        }
      }
      url += '&' + q.join('&');
    }

    const fetchOpts = { method: method || 'GET', headers: authHeaders(authToken) };
    if (body) fetchOpts.body = JSON.stringify(body);

    const res = await fetch(url, fetchOpts);
    const text = await res.text();
    if (!res.ok) return errorResponse(text, res.status);

    try { return jsonResponse(JSON.parse(text)); }
    catch { return jsonResponse(text); }
  } catch (err) {
    return errorResponse('Proxy error: ' + err.message);
  }
}
