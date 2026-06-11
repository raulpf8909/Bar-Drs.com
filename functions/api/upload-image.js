import { jsonResponse, errorResponse } from './lib/firebase.js';

const API_KEY = 'AIzaSyCPkfsrWoSkF7oYE_QAKkjJ5oYLzsXynao';
const FW_BASE = 'https://firestore.googleapis.com/v1/projects/bardrs-64b37/databases/(default)/documents';

export async function onRequestPost({ request }) {
  try {
    const body = await request.json();
    const token = body.authToken || '';
    const imageData = body.image || '';
    const filename = body.filename || `product_${Date.now()}.jpg`;

    // Save image to Firestore 'uploads' collection
    const doc = {
      fields: {
        data: { stringValue: imageData },
        filename: { stringValue: filename },
        contentType: { stringValue: 'image/jpeg' },
        createdAt: { timestampValue: new Date().toISOString() }
      }
    };

    const res = await fetch(FW_BASE + '/uploads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify(doc)
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return errorResponse('Firestore error: ' + res.status + ' ' + text, 502);
    }

    const result = await res.json();
    const docId = result.name.split('/').pop();

    return jsonResponse({ url: '/api/image/' + docId, name: filename });
  } catch (err) {
    return errorResponse('Upload error: ' + err.message);
  }
}
