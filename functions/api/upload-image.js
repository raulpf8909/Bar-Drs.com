import { jsonResponse, errorResponse } from './lib/firebase.js';

const API_KEY = 'AIzaSyCPkfsrWoSkF7oYE_QAKkjJ5oYLzsXynao';

export async function onRequestPost({ request }) {
  try {
    const body = await request.json();
    const token = body.authToken || '';
    const imageData = body.image || '';
    const filename = body.filename || `product_${Date.now()}.jpg`;
    const raw = Uint8Array.from(atob(imageData), c => c.charCodeAt(0));
    const path = encodeURIComponent(filename);
    const bucket = 'bardrs-64b37.firebasestorage.app';

    // Firebase resumable upload (same as Firebase JS SDK)
    const initUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${path}?uploadType=resumable&name=${path}&key=${API_KEY}`;
    const authSchemes = ['Firebase', 'Bearer'];
    let initRes;
    for (const scheme of authSchemes) {
      initRes = await fetch(initUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=UTF-8',
          'Authorization': scheme + ' ' + token,
          'X-Firebase-Storage-Version': 'Standalone'
        },
        body: '{}'
      });
      if (initRes.ok) break;
    }

    if (initRes.ok) {
      let uploadUrl = initRes.headers.get('x-goog-upload-url') || initRes.headers.get('Location') || '';
      if (!uploadUrl) {
        const text = await initRes.text().catch(() => '{}');
        try { const j = JSON.parse(text); uploadUrl = j.uploadUrl || j.location || j.url || ''; } catch(e) {}
      }
      if (uploadUrl) {
        const putRes = await fetch(uploadUrl, {
          method: 'PUT', headers: { 'Content-Type': 'image/jpeg' }, body: raw
        });
        if (putRes.ok) {
          const downloadUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${path}?alt=media`;
          return jsonResponse({ url: downloadUrl, name: filename });
        }
      }
    }

    // Fallback: store in Firestore if Storage fails
    const FW_BASE = 'https://firestore.googleapis.com/v1/projects/bardrs-64b37/databases/(default)/documents';
    const doc = {
      fields: {
        data: { stringValue: imageData },
        filename: { stringValue: filename },
        contentType: { stringValue: 'image/jpeg' },
        createdAt: { timestampValue: new Date().toISOString() }
      }
    };
    const fsRes = await fetch(FW_BASE + '/uploads?key=' + API_KEY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify(doc)
    });
    if (fsRes.ok) {
      const result = await fsRes.json();
      const docId = result.name.split('/').pop();
      return jsonResponse({ url: '/api/image/' + docId, name: filename });
    }

    return errorResponse('Upload failed. Init: ' + initRes.status + ' FS: ' + fsRes.status, 502);
  } catch (err) {
    return errorResponse('Upload error: ' + err.message);
  }
}
