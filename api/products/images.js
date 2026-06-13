import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end('Method not allowed');
  try {
    const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || 'dijkktqvx';
    const API_KEY = process.env.CLOUDINARY_API_KEY || '561341328954241';
    const API_SECRET = process.env.CLOUDINARY_API_SECRET || 'U2cO3wGPzgygTCD_DF6td96Hm5k';

    const body = req.body;
    const imageData = body.image || '';
    const filename = body.filename || `product_${Date.now()}.jpg`;
    const timestamp = Math.floor(Date.now() / 1000);
    const publicId = filename.replace(/\.[^.]+$/, '');
    const params = { public_id: publicId, timestamp: String(timestamp) };
    const sigStr = Object.keys(params).sort().map(k => k + '=' + params[k]).join('&') + API_SECRET;
    const signature = crypto.createHash('sha1').update(sigStr).digest('hex');

    const formBody = new URLSearchParams();
    formBody.append('file', `data:image/jpeg;base64,${imageData}`);
    formBody.append('api_key', API_KEY);
    formBody.append('timestamp', String(timestamp));
    formBody.append('public_id', publicId);
    formBody.append('signature', signature);

    const r = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
      method: 'POST', body: formBody
    });
    if (!r.ok) {
      const text = await r.text().catch(() => '');
      return res.status(502).send('Cloudinary error: ' + r.status + ' ' + text);
    }
    const result = await r.json();
    res.json({ url: result.secure_url || result.url, name: result.public_id });
  } catch (err) {
    res.status(500).send('Upload error: ' + err.message);
  }
}
