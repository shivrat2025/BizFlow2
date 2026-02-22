import json
with open('all_transactions.json', 'r') as f:
    data = json.load(f)
for doc in data['documents']:
    if "a2084b4a-3842-478f-a289-788463360141" in doc['name']:
        print(json.dumps(doc, indent=2))
