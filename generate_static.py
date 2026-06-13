import urllib.request, json, os, ssl

FIREBASE_API_KEY = "AIzaSyCPkfsrWoSkF7oYE_QAKkjJ5oYLzsXynao"
PROJECT_ID = "bardrs-64b37"
FIRESTORE_QUERY = f"https://firestore.googleapis.com/v1/projects/{PROJECT_ID}/databases/(default)/documents:runQuery?key={FIREBASE_API_KEY}"
ssl_ctx = ssl._create_unverified_context()

def fetch_products():
    query = {"structuredQuery": {"from": [{"collectionId": "products"}]}}
    req = urllib.request.Request(FIRESTORE_QUERY, data=json.dumps(query).encode(), headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=15, context=ssl_ctx) as resp:
        data = json.loads(resp.read())

    products = []
    for item in data:
        doc = item.get("document")
        if not doc: continue
        pid = doc["name"].split("/")[-1]
        fields = doc.get("fields", {})
        p = {"id": pid}
        for k, v in fields.items():
            if "arrayValue" in v:
                p[k] = [x.get("stringValue") for x in v["arrayValue"].get("values", []) if x.get("stringValue")]
            elif "stringValue" in v:
                p[k] = v["stringValue"]
            elif "integerValue" in v:
                p[k] = int(v["integerValue"])
            elif "doubleValue" in v:
                p[k] = v["doubleValue"]
            elif "booleanValue" in v:
                p[k] = v["booleanValue"]
            elif "timestampValue" in v:
                p[k] = v["timestampValue"]
        if p.get("price") is not None: p["price"] = float(p["price"])
        if p.get("order") is not None: p["order"] = float(p["order"])
        products.append(p)
    return products

def inject_products(html_path, products):
    with open(html_path, "r", encoding="utf-8") as f:
        html = f.read()

    json_str = json.dumps(products, ensure_ascii=False, indent=2)

    tag = '<script id="products-data" type="application/json">'
    end_tag = "</script>"
    start = html.find(tag)
    if start >= 0:
        end = html.find(end_tag, start)
        if end >= 0:
            before = html[:start + len(tag)]
            after = html[end:]
            html = before + "\n" + json_str + "\n" + after
        else:
            print(f"  WARN: {html_path}: found start tag but no end tag")
            return
    else:
        print(f"  WARN: {html_path}: no <script id='products-data'> tag found")
        return

    with open(html_path, "w", encoding="utf-8") as f:
        f.write(html)
    print(f"  ✅ {html_path}: {len(products)} products injected")

if __name__ == "__main__":
    print("Fetching products from Firestore...")
    products = fetch_products()
    print(f"  Total: {len(products)} products")

    bebidas = [p for p in products if p.get("category") == "bebidas"]
    cocteles = [p for p in products if p.get("category") == "cocteles"]
    cocina = [p for p in products if p.get("category") == "cocina"]

    dir = os.path.dirname(os.path.abspath(__file__))
    inject_products(os.path.join(dir, "bebidas.html"), bebidas)
    inject_products(os.path.join(dir, "cocteles.html"), cocteles)
    inject_products(os.path.join(dir, "cocina.html"), cocina)
    print("Done!")
