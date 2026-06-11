import { jsonResponse, errorResponse } from './lib/firebase.js';

const CLOUD_NAME = 'Root';
const API_KEY = '561341328954241';
const API_SECRET = 'U2cO3wGPzgygTCD_DF6td96Hm5k';

async function sha1(str) {
  const buf = new TextEncoder().encode(str);
  const hash = await crypto.subtle.digest('SHA-1', buf);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function onRequestPost({ request }) {
  try {
    const body = await request.json();
    const imageData = body.image || '';
    const filename = body.filename || `product_${Date.now()}.jpg`;

    const timestamp = Math.floor(Date.now() / 1000);
    const folder = 'products';
    const params = { folder, timestamp: String(timestamp) };
    const sortedKeys = Object.keys(params).sort();
    const sigStr = sortedKeys.map(k => k + '=' + params[k]).join('&') + API_SECRET;
    const signature = await sha1(sigStr);

    const formBody = new URLSearchParams();
    formBody.append('file', `data:image/jpeg;base64,${imageData}`);
    formBody.append('api_key', API_KEY);
    formBody.append('timestamp', String(timestamp));
    formBody.append('folder', folder);
    formBody.append('signature', signature);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
      method: 'POST',
      body: formBody
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return errorResponse('Cloudinary error: ' + res.status + ' ' + text, 502);
    }

    const result = await res.json();
    return jsonResponse({ url: result.secure_url || result.url, name: result.public_id });
  } catch (err) {
    return errorResponse('Upload error: ' + err.message);
  }
}
