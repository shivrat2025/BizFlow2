import json
with open('all_transactions.json', 'r') as f:
    data = json.load(f)
for doc in data['documents']:
    if "11b45fd6-1359-430a-96d1-9b88dc0c0aa2" in doc['name']:
        print(json.dumps(doc, indent=2))
