import json
with open('all_transactions.json', 'r') as f:
    data = json.load(f)
for doc in data['documents']:
    amt = doc['fields'].get('amount', {})
    v = amt.get('integerValue') or amt.get('doubleValue')
    if v and float(v) == 77998:
        print(json.dumps(doc, indent=2))
