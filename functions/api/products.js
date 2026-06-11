const API_KEY = 'AIzaSyCPkfsrWoSkF7oYE_QAKkjJ5oYLzsXynao';
const FIRESTORE_URL = 'https://firestore.googleapis.com/v1/projects/bardrs-64b37/databases/(default)/documents';

export async function onRequestPost({ request }) {
  try {
    const body = await request.json();
    const category = body.category || '';

    const query = {
      structuredQuery: {
        from: [{ collectionId: 'products' }],
        where: category ? {
          fieldFilter: {
            field: { fieldPath: 'category' },
            op: 'EQUAL',
            value: { stringValue: category }
          }
        } : undefined
      }
    };

    const res = await fetch(FIRESTORE_URL + ':runQuery?key=' + API_KEY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(query)
    });

    if (!res.ok) {
      return new Response('Firestore error: ' + res.status, { status: 502 });
    }

    const data = await res.json();
    const products = (data || [])
      .filter(r => r.document)
      .map(r => {
        const fields = r.document.fields || {};
        const obj = { id: r.document.name.split('/').pop() };
        for (const [k, v] of Object.entries(fields)) {
          obj[k] = v.stringValue ?? v.integerValue ?? v.doubleValue ?? null;
          if ((k === 'price' || k === 'order') && obj[k] != null) obj[k] = parseFloat(obj[k]);
        }
        return obj;
      });

    return new Response(JSON.stringify(products), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  } catch (err) {
    return new Response('Proxy error: ' + err.message, { status: 500 });
  }
}
