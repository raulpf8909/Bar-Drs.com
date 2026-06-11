import { jsonResponse, errorResponse } from './lib/firebase.js';

const PROJECT_ID = 'bardrs-64b37';

export async function onRequestPost({ request }) {
  try {
    const body = await request.json();
    const token = body.authToken || '';
    const imageData = body.image || '';
    const filename = body.filename || `product_${Date.now()}.jpg`;

    const uploadUrl = `https://firebasestorage.googleapis.com/v0/b/${PROJECT_ID}.firebasestorage.app/o?name=${encodeURIComponent(filename)}`;
    const res = await fetch(uploadUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'image/jpeg', 'Authorization': 'Bearer ' + token },
      body: Uint8Array.from(atob(imageData), c => c.charCodeAt(0))
    });
    if (!res.ok) return errorResponse('Storage error: ' + res.status, 502);

    const result = await res.json();
    const downloadUrl = `https://firebasestorage.googleapis.com/v0/b/${PROJECT_ID}.firebasestorage.app/o/${encodeURIComponent(filename)}?alt=media`;

    return jsonResponse({ url: downloadUrl, name: result.name });
  } catch (err) {
    return errorResponse('Upload error: ' + err.message);
  }
}
