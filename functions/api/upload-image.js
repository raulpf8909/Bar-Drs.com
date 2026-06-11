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

    const initText = await initRes.text().catch(() => '');
    if (!initRes.ok) {
      return errorResponse(`Init ${initRes.status}: ${initText}`, 502);
    }

    let uploadUrl = initRes.headers.get('x-goog-upload-url');
    if (!uploadUrl && initText) {
      try { uploadUrl = JSON.parse(initText).uploadUrl; } catch(e) {}
    }
    if (!uploadUrl) uploadUrl = initiateUrl;

    const uploadRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'image/jpeg' },
      body: raw
    });

    const uploadText = await uploadRes.text().catch(() => '');
    if (!uploadRes.ok) {
      return errorResponse(`Upload ${uploadRes.status}: ${uploadText}`, 502);
    }

    const downloadUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(filename)}?alt=media`;
    return jsonResponse({ url: downloadUrl, name: filename });
  } catch (err) {
    return errorResponse('Upload error: ' + err.message);
  }
}
