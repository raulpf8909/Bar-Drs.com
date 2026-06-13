const API_KEY = 'AIzaSyCPkfsrWoSkF7oYE_QAKkjJ5oYLzsXynao';
const PROJECT_ID = 'bardrs-64b37';
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
const FIRESTORE_QUERY = FIRESTORE_BASE + ':runQuery?key=' + API_KEY;
const IDENTITYKIT = 'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=' + API_KEY;
const CLOUD_NAME = 'dijkktqvx';
const CLOUD_API_KEY = '561341328954241';
const CLOUD_API_SECRET = 'U2cO3wGPzgygTCD_DF6td96Hm5k';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

function authHeaders(token) {
  return { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token };
}

function serializeField(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') {
    if (Number.isInteger(v) && Math.abs(v) < 9007199254740991) return { integerValue: String(v) };
    return { doubleValue: v };
  }
  if (Array.isArray(v)) return { arrayValue: { values: v.map(x => ({ stringValue: String(x) })) } };
  return { stringValue: String(v) };
}

function convertFields(fields) {
  const obj = {};
  for (const [k, v] of Object.entries(fields || {})) {
    if (v.arrayValue) {
      obj[k] = (v.arrayValue.values || []).map(x => x.stringValue ?? null);
    } else if (v.stringValue !== undefined) obj[k] = v.stringValue;
    else if (v.integerValue !== undefined) obj[k] = parseFloat(v.integerValue);
    else if (v.doubleValue !== undefined) obj[k] = v.doubleValue;
    else if (v.timestampValue !== undefined) obj[k] = v.timestampValue;
    else obj[k] = null;
    if ((k === 'price' || k === 'order') && obj[k] != null) obj[k] = parseFloat(obj[k]);
  }
  return obj;
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: corsHeaders });
}

function error(msg, status = 500) {
  return new Response(String(msg), { status, headers: corsHeaders });
}

async function sha1(str) {
  const buf = new TextEncoder().encode(str);
  const hash = await crypto.subtle.digest('SHA-1', buf);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ── AUTH ──
async function handleLogin(body) {
  const { email, password } = body;
  const r = await fetch(IDENTITYKIT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true })
  });
  const data = await r.json();
  if (!r.ok) return json({ error: data.error?.message || 'Login failed' }, 401);
  return json({ token: data.idToken, refreshToken: data.refreshToken || '' });
}

// ── PRODUCTS ──
async function handleProductsAll(body) {
  const token = body.authToken || '';
  if (!token) return error('Se requiere autenticación', 401);
  const r = await fetch(FIRESTORE_QUERY, {
    method: 'POST', headers: authHeaders(token),
    body: JSON.stringify({ structuredQuery: { from: [{ collectionId: 'products' }] } })
  });
  if (!r.ok) return error('Firestore error: ' + r.status, 502);
  const data = await r.json();
  const products = (data || []).filter(x => x.document).map(x => ({
    id: x.document.name.split('/').pop(), ...convertFields(x.document.fields)
  }));
  return json(products);
}

async function handleProductsPublic(body) {
  const category = body.category || '';
  const query = {
    structuredQuery: {
      from: [{ collectionId: 'products' }],
      where: category
        ? { fieldFilter: { field: { fieldPath: 'category' }, op: 'EQUAL', value: { stringValue: category } } }
        : undefined
    }
  };
  const r = await fetch(FIRESTORE_QUERY, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(query)
  });
  if (!r.ok) return error('Firestore error: ' + r.status, 502);
  const data = await r.json();
  const products = (data || []).filter(x => x.document).map(x => ({
    id: x.document.name.split('/').pop(), ...convertFields(x.document.fields)
  }));
  return json(products);
}

async function handleProductsSave(body) {
  const token = body.authToken || '';
  if (!token) return error('Se requiere autenticación', 401);
  const product = body.product || {};
  const productId = body.id || '';
  const collection = body.collection || 'products';
  const fields = {};
  for (const [k, v] of Object.entries(product)) fields[k] = serializeField(v);
  if (productId && productId !== 'new') {
    const url = `${FIRESTORE_BASE}/${collection}/${productId}?updateMask.fieldPaths=${Object.keys(product).join('&updateMask.fieldPaths=')}`;
    const r = await fetch(url, { method: 'PATCH', headers: authHeaders(token), body: JSON.stringify({ fields }) });
    if (!r.ok) return error('Firestore error: ' + r.status, 502);
    return json({ id: productId, success: true });
  } else {
    const r = await fetch(`${FIRESTORE_BASE}/${collection}`, { method: 'POST', headers: authHeaders(token), body: JSON.stringify({ fields }) });
    if (!r.ok) return error('Firestore error: ' + r.status, 502);
    const result = await r.json();
    return json({ id: result.name.split('/').pop(), success: true });
  }
}

async function handleProductsDelete(body) {
  const token = body.authToken || '';
  if (!token) return error('Se requiere autenticación', 401);
  const id = body.id || '';
  const collection = body.collection || 'products';
  if (!id) return error('ID requerido', 400);
  const r = await fetch(`${FIRESTORE_BASE}/${collection}/${id}`, { method: 'DELETE', headers: authHeaders(token) });
  if (!r.ok) return error('Firestore error: ' + r.status, 502);
  return json({ success: true });
}

// ── CATEGORIES ──
async function handleCategoriesList(body) {
  const token = body.authToken || '';
  if (!token) return error('Se requiere autenticación', 401);
  const r = await fetch(FIRESTORE_QUERY, {
    method: 'POST', headers: authHeaders(token),
    body: JSON.stringify({ structuredQuery: { from: [{ collectionId: 'categories' }] } })
  });
  if (!r.ok) return error('Firestore error: ' + r.status, 502);
  const data = await r.json();
  const cats = (data || []).filter(x => x.document).map(x => ({
    id: x.document.name.split('/').pop(), ...convertFields(x.document.fields)
  }));
  return json(cats);
}

async function handleCategoriesSave(body) {
  const token = body.authToken || '';
  if (!token) return error('Se requiere autenticación', 401);
  const cat = body.category || {};
  const catId = body.id || '';
  const fields = {};
  for (const [k, v] of Object.entries(cat)) fields[k] = serializeField(v);
  if (catId && catId !== 'new') {
    const url = `${FIRESTORE_BASE}/categories/${catId}?updateMask.fieldPaths=${Object.keys(cat).join('&updateMask.fieldPaths=')}`;
    const r = await fetch(url, { method: 'PATCH', headers: authHeaders(token), body: JSON.stringify({ fields }) });
    if (!r.ok) return error('Firestore error: ' + r.status, 502);
    return json({ id: catId, success: true });
  } else {
    const r = await fetch(`${FIRESTORE_BASE}/categories`, { method: 'POST', headers: authHeaders(token), body: JSON.stringify({ fields }) });
    if (!r.ok) return error('Firestore error: ' + r.status, 502);
    const result = await r.json();
    return json({ id: result.name.split('/').pop(), success: true });
  }
}

async function handleCategoriesDelete(body) {
  const token = body.authToken || '';
  if (!token) return error('Se requiere autenticación', 401);
  const id = body.id || '';
  if (!id) return error('ID requerido', 400);
  const r = await fetch(`${FIRESTORE_BASE}/categories/${id}`, { method: 'DELETE', headers: authHeaders(token) });
  if (!r.ok) return error('Firestore error: ' + r.status, 502);
  return json({ success: true });
}

// ── SETTINGS ──
async function handleSettingsGet(body) {
  const token = body.authToken || '';
  if (!token) return error('Se requiere autenticación', 401);
  const docId = body.docId || 'business';
  const r = await fetch(`${FIRESTORE_BASE}/settings/${docId}`, { headers: authHeaders(token) });
  if (r.status === 404) return json({});
  if (!r.ok) return error('Firestore error: ' + r.status, 502);
  const data = await r.json();
  return json({ id: data.name.split('/').pop(), ...convertFields(data.fields || {}) });
}

async function handleSettingsSave(body) {
  const token = body.authToken || '';
  if (!token) return error('Se requiere autenticación', 401);
  const docId = body.docId || 'business';
  const data = body.data || {};
  const fields = {};
  for (const [k, v] of Object.entries(data)) fields[k] = serializeField(v);
  const r = await fetch(`${FIRESTORE_BASE}/settings?documentId=${docId}`, {
    method: 'POST', headers: authHeaders(token), body: JSON.stringify({ fields })
  });
  if (!r.ok) return error('Firestore error: ' + r.status, 502);
  return json({ success: true });
}

// ── IMAGE UPLOAD ──
async function handleImageUpload(body) {
  const imageData = body.image || '';
  const filename = body.filename || `product_${Date.now()}.jpg`;
  const timestamp = Math.floor(Date.now() / 1000);
  const publicId = filename.replace(/\.[^.]+$/, '');
  const params = { public_id: publicId, timestamp: String(timestamp) };
  const sigStr = Object.keys(params).sort().map(k => k + '=' + params[k]).join('&') + CLOUD_API_SECRET;
  const signature = await sha1(sigStr);
  const formBody = new URLSearchParams();
  formBody.append('file', `data:image/jpeg;base64,${imageData}`);
  formBody.append('api_key', CLOUD_API_KEY);
  formBody.append('timestamp', String(timestamp));
  formBody.append('public_id', publicId);
  formBody.append('signature', signature);
  const r = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: 'POST', body: formBody
  });
  if (!r.ok) {
    const text = await r.text().catch(() => '');
    return error('Cloudinary error: ' + r.status + ' ' + text, 502);
  }
  const result = await r.json();
  return json({ url: result.secure_url || result.url, name: result.public_id });
}

// ── ROUTER ──
export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    if (method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: corsHeaders });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return error('Invalid JSON', 400);
    }

    try {
      switch (path) {
        case '/api/auth/login':
          return await handleLogin(body);

        case '/api/products/all':
          return await handleProductsAll(body);

        case '/api/products':
          return await handleProductsPublic(body);

        case '/api/products/save':
          return await handleProductsSave(body);

        case '/api/products/delete':
          return await handleProductsDelete(body);

        case '/api/products/images':
          return await handleImageUpload(body);

        case '/api/categories':
          return await handleCategoriesList(body);

        case '/api/categories/save':
          return await handleCategoriesSave(body);

        case '/api/categories/delete':
          return await handleCategoriesDelete(body);

        case '/api/settings':
          return await handleSettingsGet(body);

        case '/api/settings/save':
          return await handleSettingsSave(body);

        default:
          return error('Not found: ' + path, 404);
      }
    } catch (err) {
      return error('Worker error: ' + err.message);
    }
  }
};
