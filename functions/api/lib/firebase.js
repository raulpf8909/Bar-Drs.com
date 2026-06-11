export const API_KEY = 'AIzaSyCPkfsrWoSkF7oYE_QAKkjJ5oYLzsXynao';
const PROJECT_ID = 'bardrs-64b37';

export const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
export const FIRESTORE_QUERY = FIRESTORE_BASE + ':runQuery?key=' + API_KEY;
export const IDENTITYKIT = 'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=' + API_KEY;
export const STORAGE_BASE = `https://firebasestorage.googleapis.com/v0/b/${PROJECT_ID}.firebasestorage.app/o`;

export function authHeaders(token) {
  return { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token };
}

export function serializeField(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') {
    if (Number.isInteger(v) && Math.abs(v) < 9007199254740991) return { integerValue: String(v) };
    return { doubleValue: v };
  }
  if (Array.isArray(v)) return { arrayValue: { values: v.map(x => ({ stringValue: String(x) })) } };
  if (v instanceof Date || (typeof v === 'string' && !isNaN(Date.parse(v)))) return { timestampValue: new Date(v).toISOString() };
  return { stringValue: String(v) };
}

export function convertFields(fields) {
  const obj = {};
  for (const [k, v] of Object.entries(fields || {})) {
    if (v.stringValue !== undefined) obj[k] = v.stringValue;
    else if (v.integerValue !== undefined) obj[k] = parseFloat(v.integerValue);
    else if (v.doubleValue !== undefined) obj[k] = v.doubleValue;
    else if (v.timestampValue !== undefined) obj[k] = v.timestampValue;
    else obj[k] = null;
  }
  return obj;
}

export function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
}

export function errorResponse(msg, status = 500) {
  return new Response(String(msg), { status, headers: { 'Access-Control-Allow-Origin': '*' } });
}
