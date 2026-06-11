import { jsonResponse, errorResponse } from './lib/firebase.js';

export async function onRequestPost({ request }) {
  try {
    const body = await request.json();
    const token = body.authToken || '';
    const imageData = body.image || '';
    const filename = body.filename || `product_${Date.now()}.jpg`;
    const raw = Uint8Array.from(atob(imageData), c => c.charCodeAt(0));

    const bucket = 'bardrs-64b37.firebasestorage.app';
    const initiateUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o?name=${encodeURIComponent(filename)}&uploadType=resumable`;

    // Step 1: Initiate resumable upload with Firebase auth
    const initRes = await fetch(initiateUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=UTF-8',
        'Authorization': 'Firebase ' + token,
        'X-Firebase-Storage-Version': 'Standalone'
      },
      body: '{}'
    });

    if (!initRes.ok) {
      const text = await initRes.text().catch(() => '');
      return errorResponse(`Init failed: ${initRes.status} ${text}`, 502);
    }

    // Step 2: Get the upload URL from response
    const uploadUrl = initRes.headers.get('x-goog-upload-url') || initiateUrl;

    // Step 3: Upload the actual file content
    const uploadRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'image/jpeg',
        'Content-Length': String(raw.length)
      },
      body: raw
    });

    if (!uploadRes.ok) {
      const text = await uploadRes.text().catch(() => '');
      return errorResponse(`Upload failed: ${uploadRes.status} ${text}`, 502);
    }

    const downloadUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(filename)}?alt=media`;
    return jsonResponse({ url: downloadUrl, name: filename });
  } catch (err) {
    return errorResponse('Upload error: ' + err.message);
  }
}
