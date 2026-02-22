import json
from datetime import datetime

with open('all_transactions.json', 'r') as f:
    data = json.load(f)

docs = data.get('documents', [])
print(f"Searching {len(docs)} transactions...")

for doc in docs:
    fields = doc.get('fields', {})
    amt_raw = fields.get('amount', {})
    amt = amt_raw.get('integerValue') or amt_raw.get('doubleValue')
    if amt and (float(amt) == 77992 or float(amt) == 15000):
        date_ts = int(fields.get('date', {}).get('integerValue', 0))
        date_str = datetime.fromtimestamp(date_ts/1000).strftime('%Y-%m-%d')
        desc = fields.get('description', {}).get('stringValue', '')
        type_ = fields.get('type', {}).get('stringValue', '')
        source = fields.get('sourceAccountId', {}).get('stringValue', 'NA')
        dest = fields.get('destinationAccountId', {}).get('stringValue', 'NA')
        pool = fields.get('incomeSource', {}).get('stringValue', 'NONE')
        print(f"{date_str} | ₹{amt:8} | {type_:10} | Source: {source:15} | Dest: {dest:15} | Pool: {pool}")
