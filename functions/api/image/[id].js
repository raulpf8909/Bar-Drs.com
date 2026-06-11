import { errorResponse } from '../lib/firebase.js';

const API_KEY = 'AIzaSyCPkfsrWoSkF7oYE_QAKkjJ5oYLzsXynao';
const FW_BASE = 'https://firestore.googleapis.com/v1/projects/bardrs-64b37/databases/(default)/documents';

export async function onRequestGet({ params }) {
  try {
    const docId = params.id;
    if (!docId) return errorResponse('Missing image id', 400);

    const url = `${FW_BASE}/uploads/${docId}?key=${API_KEY}`;
    const res = await fetch(url);

    if (!res.ok) return errorResponse('Not found', 404);

    const data = await res.json();
    const fields = data.fields || {};
    const imgData = fields.data?.stringValue || '';
    const contentType = fields.contentType?.stringValue || 'image/jpeg';

    const binary = Uint8Array.from(atob(imgData), c => c.charCodeAt(0));
    return new Response(binary, {
      headers: { 'Content-Type': contentType, 'Cache-Control': 'public, max-age=86400' }
    });
  } catch (err) {
    return errorResponse('Error: ' + err.message);
  }
}
