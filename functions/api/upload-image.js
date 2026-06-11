import { jsonResponse, errorResponse } from './lib/firebase.js';

const API_KEY = 'AIzaSyCPkfsrWoSkF7oYE_QAKkjJ5oYLzsXynao';
const FW_BASE = 'https://firestore.googleapis.com/v1/projects/bardrs-64b37/databases/(default)/documents';

async function getAccessToken(refreshToken) {
  if (!refreshToken) return null;
  // Try exchanging as Firebase refresh token first
  const res = await fetch('https://securetoken.googleapis.com/v1/token?key=' + API_KEY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=refresh_token&refresh_token=' + encodeURIComponent(refreshToken)
  });
  if (res.ok) {
    const data = await res.json();
    return data.access_token || null;
  }
  // If exchange fails, might already be a Google OAuth2 token, use directly
  return refreshToken;
}

export async function onRequestPost({ request }) {
  try {
    const body = await request.json();
    const refreshToken = body.refreshToken || '';
    const imageData = body.image || '';
    const filename = body.filename || `product_${Date.now()}.jpg`;
    const raw = Uint8Array.from(atob(imageData), c => c.charCodeAt(0));
    const path = encodeURIComponent(filename);
    const bucket = 'bardrs-64b37.firebasestorage.app';

    // Get Google OAuth2 access token from refresh token
    const accessToken = await getAccessToken(refreshToken);

    if (accessToken) {
      // Try Firebase Storage resumable upload with OAuth2 token
      const initUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${path}?uploadType=resumable&name=${path}&key=${API_KEY}`;
      const initRes = await fetch(initUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=UTF-8',
          'Authorization': 'Bearer ' + accessToken,
          'X-Firebase-Storage-Version': 'Standalone'
        },
        body: '{}'
      });

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

      // Fallback: use access token for Firestore
      const doc = {
        fields: {
          data: { stringValue: imageData },
          filename: { stringValue: filename },
          contentType: { stringValue: 'image/jpeg' },
          createdAt: { timestampValue: new Date().toISOString() }
        }
      };
      const fsRes = await fetch(FW_BASE + '/uploads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + accessToken },
        body: JSON.stringify(doc)
      });
      if (fsRes.ok) {
        const result = await fsRes.json();
        const docId = result.name.split('/').pop();
        return jsonResponse({ url: '/api/image/' + docId, name: filename });
      }
      return errorResponse('Both failed. Storage init: ' + initRes.status + ' Firestore: ' + fsRes.status, 502);
    }

    return errorResponse('No access token available', 502);
  } catch (err) {
    return errorResponse('Upload error: ' + err.message);
  }
}
