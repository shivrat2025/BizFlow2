import json
from datetime import datetime

with open('all_transactions.json', 'r') as f:
    data = json.load(f)

docs = data.get('documents', [])
ind_id = "5abb6e32-bd50-4522-8950-8d75fecf6a14"

# Let's see the first 5 transactions for IndusInd
out = []
for doc in docs:
    fields = doc.get('fields', {})
    s = fields.get('sourceAccountId', {}).get('stringValue')
    d = fields.get('destinationAccountId', {}).get('stringValue')
    
    if s == ind_id or d == ind_id:
        amt_raw = fields.get('amount', {})
        amt = float(amt_raw.get('integerValue') or amt_raw.get('doubleValue') or 0)
        type_ = fields.get('type', {}).get('stringValue')
        date_ts = int(fields.get('date', {}).get('integerValue', 0))
        date_str = datetime.fromtimestamp(date_ts/1000).strftime('%Y-%m-%d')
        desc = fields.get('description', {}).get('stringValue', '')
        pool = fields.get('incomeSource', {}).get('stringValue', 'NONE')
        id_ = doc['name'].split('/')[-1]
        out.append({'date': date_str, 'type': type_, 'amt': amt, 'pool': pool, 'desc': desc, 'id': id_})

out.sort(key=lambda x: x['date'])
print("--- EARLIEST INDUSIND TRANSACTIONS ---")
for x in out[:10]:
    print(f"{x['date']} | {x['type']:10} | ₹{x['amt']:8.2f} | Pool: {x['pool']:8} | {x['desc']} ({x['id']})")
