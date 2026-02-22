import json
from datetime import datetime

with open('all_transactions.json', 'r') as f:
    data = json.load(f)

docs = data.get('documents', [])
ind_id = "5abb6e32-bd50-4522-8950-8d75fecf6a14"

out = []
for doc in docs:
    fields = doc.get('fields', {})
    s = fields.get('sourceAccountId', {}).get('stringValue')
    d = fields.get('destinationAccountId', {}).get('stringValue')
    
    if s == ind_id or d == ind_id:
        amt_raw = fields.get('amount', {})
        amt = amt_raw.get('integerValue') or amt_raw.get('doubleValue')
        type_ = fields.get('type', {}).get('stringValue')
        date_ts = int(fields.get('date', {}).get('integerValue', 0))
        date_str = datetime.fromtimestamp(date_ts/1000).strftime('%Y-%m-%d')
        desc = fields.get('description', {}).get('stringValue', '')
        pool = fields.get('incomeSource', {}).get('stringValue', 'NONE')
        out.append(f"{date_str} | {type_:10} | ₹{float(amt):8.2f} | Pool: {pool:8} | {desc}")

out.sort()
with open('indusind_ledger.txt', 'w') as f:
    f.write("\n".join(out))
    
print(f"Dumped {len(out)} transactions to indusind_ledger.txt")
