import { STORAGE_BASE, authHeaders, jsonResponse, errorResponse } from '../lib/firebase.js';

export async function onRequestPost({ request }) {
  try {
    const body = await request.json();
    const token = body.authToken || '';
    const imageData = body.image || '';
    const filename = body.filename || `product_${Date.now()}.jpg`;

    if (!token) return errorResponse('No auth token', 401);
    if (!imageData) return errorResponse('No image data', 400);

    const binary = Uint8Array.from(atob(imageData), c => c.charCodeAt(0));
    const url = STORAGE_BASE + '?name=products/' + filename + '&uploadType=media';

    const uploadRes = await fetch(url, {
      method: 'POST',
      headers: { ...authHeaders(token), 'Content-Type': 'image/jpeg' },
      body: binary
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      return errorResponse('Upload error: ' + uploadRes.status + ' ' + errText.slice(0, 100), 502);
    }

    const downloadUrl = `https://firebasestorage.googleapis.com/v0/b/bardrs-64b37.firebasestorage.app/o/products%2F${encodeURIComponent(filename)}?alt=media`;
    return jsonResponse({ url: downloadUrl });
  } catch (err) {
    return errorResponse('Upload error: ' + err.message);
  }
}
