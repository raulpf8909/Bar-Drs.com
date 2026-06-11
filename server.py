import http.server
import urllib.request, urllib.parse
import json
import ssl
import socket
import sys
import os
import base64

FIRESTORE_BASE = "https://firestore.googleapis.com/v1/projects/bardrs-64b37/databases/(default)/documents"
FIRESTORE_QUERY = FIRESTORE_BASE + ":runQuery?key=AIzaSyCPkfsrWoSkF7oYE_QAKkjJ5oYLzsXynao"
ssl_ctx = ssl._create_unverified_context()

def convert_field(v):
    if 'arrayValue' in v:
        vals = v['arrayValue'].get('values', [])
        return [next(iter(x.values())) for x in vals]
    return v.get('stringValue') or v.get('integerValue') or v.get('doubleValue') or v.get('booleanValue') or None

def serialize_field(v):
    if v is None:
        return {"nullValue": None}
    if isinstance(v, bool):
        return {"booleanValue": v}
    if isinstance(v, int):
        return {"integerValue": str(v)}
    if isinstance(v, float):
        return {"doubleValue": v}
    if isinstance(v, list):
        return {"arrayValue": {"values": [{"stringValue": str(x)} for x in v]}}
    return {"stringValue": str(v)}

def build_auth_headers(token):
    return {'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token}

def firestore_request(url, data, headers):
    req = urllib.request.Request(url, data=data, headers=headers)
    with urllib.request.urlopen(req, timeout=15, context=ssl_ctx) as resp:
        return json.loads(resp.read())

class ProxyHandler(http.server.SimpleHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()

    def send_json(self, data, status=200):
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def send_error_msg(self, msg, status=500):
        self.send_response(status)
        self.send_header('Content-Type', 'text/plain')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(str(msg).encode())

    def read_body(self):
        length = int(self.headers.get('Content-Length', 0))
        return json.loads(self.rfile.read(length)) if length else {}

    def do_GET(self):
        if self.path.startswith('/images/'):
            image_name = os.path.basename(self.path)
            image_path = os.path.join('images', image_name)
            try:
                with open(image_path, 'rb') as f:
                    self.send_response(200)
                    self.send_header('Content-Type', self.guess_type(image_name))
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.send_header('Cache-Control', 'public, max-age=86400')
                    self.end_headers()
                    self.wfile.write(f.read())
            except FileNotFoundError:
                self.send_error(404)
        else:
            super().do_GET()

    def do_POST(self):
        if self.path == '/api/auth/login':
            try:
                body = self.read_body()
                email = body.get('email', '')
                password = body.get('password', '')
                url = "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=AIzaSyCPkfsrWoSkF7oYE_QAKkjJ5oYLzsXynao"
                payload = json.dumps({"email": email, "password": password, "returnSecureToken": True}).encode()
                req = urllib.request.Request(url, data=payload, headers={'Content-Type': 'application/json'})
                with urllib.request.urlopen(req, timeout=15, context=ssl_ctx) as resp:
                    result = json.loads(resp.read())
                self.send_json({"token": result["idToken"], "refreshToken": result.get("refreshToken", ""), "email": result.get("email", ""), "localId": result.get("localId", "")})
            except urllib.error.HTTPError as e:
                self.send_error_msg("Credenciales incorrectas", 401)
            except Exception as e:
                self.send_error_msg("Auth error: " + str(e))

        elif self.path == '/api/upload-image':
            try:
                body = self.read_body()
                image_data = body.get('image', '')
                filename = body.get('filename', f'product_{int(__import__("time").time())}.jpg')
                os.makedirs('images', exist_ok=True)
                filepath = os.path.join('images', filename)
                raw = base64.b64decode(image_data)
                with open(filepath, 'wb') as f:
                    f.write(raw)
                # Upload to Cloudinary
                import hashlib, time
                timestamp = int(time.time())
                folder = 'products'
                sig_str = f'folder={folder}&timestamp={timestamp}' + 'U2cO3wGPzgygTCD_DF6td96Hm5k'
                signature = hashlib.sha1(sig_str.encode()).hexdigest()
                cld_data = urllib.parse.urlencode({
                    'file': 'data:image/jpeg;base64,' + image_data,
                    'api_key': '561341328954241',
                    'timestamp': timestamp,
                    'folder': folder,
                    'signature': signature
                }).encode()
                cld_req = urllib.request.Request(
                    'https://api.cloudinary.com/v1_1/Root/image/upload',
                    data=cld_data
                )
                with urllib.request.urlopen(cld_req, timeout=15, context=ssl_ctx) as resp:
                    result = json.loads(resp.read())
                self.send_json({"url": result.get('secure_url') or result.get('url')})
            except Exception as e:
                self.send_json({"url": "/images/" + filename})

        elif self.path == '/api/products':
            # Query products by category (public, no auth needed)
            body = self.read_body()
            category = body.get('category', '')
            payload = json.dumps({
                "structuredQuery": {
                    "from": [{"collectionId": "products"}],
                    "where": {
                        "fieldFilter": {
                            "field": {"fieldPath": "category"},
                            "op": "EQUAL",
                            "value": {"stringValue": category}
                        }
                    }
                }
            }).encode()
            try:
                data = firestore_request(FIRESTORE_QUERY, payload, {'Content-Type': 'application/json'})
                products = []
                for r in data:
                    if 'document' not in r: continue
                    fields = r['document'].get('fields', {})
                    obj = {'id': r['document']['name'].split('/').pop()}
                    for k, v in fields.items():
                        obj[k] = convert_field(v)
                        if k in ('price', 'order') and obj[k] is not None: obj[k] = float(obj[k])
                    products.append(obj)
                self.send_json(products)
            except Exception as e:
                self.send_error_msg("Proxy error: " + str(e))

        elif self.path == '/api/products/save':
            # Create or update a product (auth required)
            try:
                body = self.read_body()
                token = body.get('authToken', '')
                product = body.get('product', {})
                product_id = body.get('id', '')

                fields = {}
                for k, v in product.items():
                    fields[k] = serialize_field(v)
                
                collection = body.get('collection', 'products')
                if product_id and product_id != 'new':
                    url = FIRESTORE_BASE + '/' + collection + '/' + product_id
                    payload = json.dumps({"fields": fields}).encode()
                    update_mask = "?updateMask.fieldPaths=" + "&updateMask.fieldPaths=".join(product.keys())
                    req = urllib.request.Request(url + update_mask, data=payload,
                        headers=build_auth_headers(token), method='PATCH')
                    with urllib.request.urlopen(req, context=ssl_ctx) as resp:
                        json.loads(resp.read())
                    self.send_json({"id": product_id, "success": True})
                else:
                    url = FIRESTORE_BASE + '/' + collection
                    payload = json.dumps({"fields": fields}).encode()
                    req = urllib.request.Request(url, data=payload,
                        headers=build_auth_headers(token))
                    with urllib.request.urlopen(req, context=ssl_ctx) as resp:
                        result = json.loads(resp.read())
                    new_id = result['name'].split('/').pop()
                    self.send_json({"id": new_id, "success": True})
            except Exception as e:
                self.send_error_msg("Save error: " + str(e))

        elif self.path == '/api/products/delete':
            try:
                body = self.read_body()
                token = body.get('authToken', '')
                product_id = body.get('id', '')
                collection = body.get('collection', 'products')
                url = FIRESTORE_BASE + '/' + collection + '/' + product_id
                req = urllib.request.Request(url, headers=build_auth_headers(token), method='DELETE')
                with urllib.request.urlopen(req, context=ssl_ctx):
                    pass
                self.send_json({"success": True})
            except Exception as e:
                self.send_error_msg("Delete error: " + str(e))

        elif self.path == '/api/products/all':
            # Get ALL products (auth required for admin)
            try:
                body = self.read_body()
                token = body.get('authToken', '')
                payload = json.dumps({
                    "structuredQuery": {
                        "from": [{"collectionId": "products"}]
                    }
                }).encode()
                data = firestore_request(FIRESTORE_QUERY, payload, build_auth_headers(token))
                products = []
                for r in data:
                    if 'document' not in r: continue
                    fields = r['document'].get('fields', {})
                    obj = {'id': r['document']['name'].split('/').pop()}
                    for k, v in fields.items():
                        obj[k] = convert_field(v)
                        if k in ('price', 'order') and obj[k] is not None: obj[k] = float(obj[k])
                    products.append(obj)
                self.send_json(products)
            except Exception as e:
                self.send_error_msg("Load error: " + str(e))

        elif self.path == '/api/categories':
            try:
                body = self.read_body()
                token = body.get('authToken', '')
                payload = json.dumps({
                    "structuredQuery": {
                        "from": [{"collectionId": "categories"}]
                    }
                }).encode()
                data = firestore_request(FIRESTORE_QUERY, payload, build_auth_headers(token))
                categories = []
                for r in data:
                    if 'document' not in r: continue
                    fields = r['document'].get('fields', {})
                    obj = {'id': r['document']['name'].split('/').pop()}
                    for k, v in fields.items():
                        obj[k] = convert_field(v)
                        if k == 'order' and obj[k] is not None: obj[k] = float(obj[k])
                    categories.append(obj)
                self.send_json(categories)
            except Exception as e:
                self.send_error_msg("Categories error: " + str(e))

        elif self.path == '/api/categories/save':
            try:
                body = self.read_body()
                token = body.get('authToken', '')
                cat = body.get('category', {})
                cat_id = body.get('id', '')
                fields = {}
                for k, v in cat.items():
                    fields[k] = serialize_field(v)
                if cat_id and cat_id != 'new':
                    url = FIRESTORE_BASE + '/categories/' + cat_id
                    update_mask = "?updateMask.fieldPaths=" + "&updateMask.fieldPaths=".join(cat.keys())
                    payload = json.dumps({"fields": fields}).encode()
                    req = urllib.request.Request(url + update_mask, data=payload,
                        headers=build_auth_headers(token), method='PATCH')
                    with urllib.request.urlopen(req, context=ssl_ctx) as resp:
                        json.loads(resp.read())
                    self.send_json({"id": cat_id, "success": True})
                else:
                    url = FIRESTORE_BASE + '/categories'
                    payload = json.dumps({"fields": fields}).encode()
                    req = urllib.request.Request(url, data=payload, headers=build_auth_headers(token))
                    with urllib.request.urlopen(req, context=ssl_ctx) as resp:
                        result = json.loads(resp.read())
                    self.send_json({"id": result['name'].split('/').pop(), "success": True})
            except Exception as e:
                self.send_error_msg("Category save error: " + str(e))

        elif self.path == '/api/categories/delete':
            try:
                body = self.read_body()
                token = body.get('authToken', '')
                cat_id = body.get('id', '')
                req = urllib.request.Request(FIRESTORE_BASE + '/categories/' + cat_id,
                    headers=build_auth_headers(token), method='DELETE')
                with urllib.request.urlopen(req, context=ssl_ctx):
                    pass
                self.send_json({"success": True})
            except Exception as e:
                self.send_error_msg("Category delete error: " + str(e))

        elif self.path == '/api/settings':
            try:
                body = self.read_body()
                token = body.get('authToken', '')
                doc_id = body.get('docId', 'business')
                url = FIRESTORE_BASE + '/settings/' + doc_id
                req = urllib.request.Request(url, headers=build_auth_headers(token))
                with urllib.request.urlopen(req, context=ssl_ctx) as resp:
                    data = json.loads(resp.read())
                fields = data.get('fields', {})
                obj = {'id': data['name'].split('/').pop()}
                for k, v in fields.items():
                    obj[k] = convert_field(v)
                self.send_json(obj)
            except urllib.error.HTTPError as e:
                if e.code == 404:
                    self.send_json({})
                else:
                    self.send_error_msg("Settings error: " + str(e))
            except Exception as e:
                self.send_error_msg("Settings error: " + str(e))

        elif self.path == '/api/settings/save':
            try:
                body = self.read_body()
                token = body.get('authToken', '')
                doc_id = body.get('docId', 'business')
                data = body.get('data', {})
                fields = {}
                for k, v in data.items():
                    fields[k] = serialize_field(v)
                url = FIRESTORE_BASE + '/settings?documentId=' + doc_id
                payload = json.dumps({"fields": fields}).encode()
                req = urllib.request.Request(url, data=payload, headers=build_auth_headers(token))
                with urllib.request.urlopen(req, context=ssl_ctx) as resp:
                    json.loads(resp.read())
                self.send_json({"success": True})
            except Exception as e:
                self.send_error_msg("Settings save error: " + str(e))

        else:
            super().do_POST()

    def handle(self):
        try:
            super().handle()
        except Exception:
            self.close_connection = True

if __name__ == '__main__':
    server = http.server.ThreadingHTTPServer(('0.0.0.0', 8080), ProxyHandler)
    server.timeout = 0.5
    print("Server running on http://0.0.0.0:8080", flush=True)
    while True:
        try:
            server.handle_request()
        except KeyboardInterrupt:
            print("\nShutdown", flush=True)
            sys.exit(0)
        except Exception:
            pass
