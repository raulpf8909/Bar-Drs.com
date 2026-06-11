import { jsonResponse, errorResponse } from './lib/firebase.js';

export async function onRequestPost({ request }) {
  try {
    const body = await request.json();
    const token = body.authToken || '';
    const imageData = body.image || '';
    const filename = body.filename || `product_${Date.now()}.jpg`;

    const buckets = ['bardrs-64b37.firebasestorage.app', 'bardrs-64b37.appspot.com'];
    let lastErr = null;
    for (const bucket of buckets) {
      const uploadUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o?name=${encodeURIComponent(filename)}`;
      const res = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'image/jpeg', 'Authorization': 'Bearer ' + token },
        body: Uint8Array.from(atob(imageData), c => c.charCodeAt(0))
      });
      if (res.ok) {
        const result = await res.json();
        const downloadUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(filename)}?alt=media`;
        return jsonResponse({ url: downloadUrl, name: result.name });
      }
      lastErr = 'Storage error: ' + res.status;
    }
    return errorResponse(lastErr || 'Upload failed', 502);
  } catch (err) {
    return errorResponse('Upload error: ' + err.message);
  }
}
