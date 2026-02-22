import json
from datetime import datetime

with open('all_transactions.json', 'r') as f:
    data = json.load(f)

docs = data.get('documents', [])
indusind_id = "5abb6e32-bd50-4522-8950-8d75fecf6a14"

print(f"Analyzing {len(docs)} transactions...")

results = []
for doc in docs:
    fields = doc.get('fields', {})
    source = fields.get('sourceAccountId', {}).get('stringValue')
    dest = fields.get('destinationAccountId', {}).get('stringValue')
    
    if source == indusind_id or dest == indusind_id:
        amt_raw = fields.get('amount', {})
        amt = amt_raw.get('integerValue') or amt_raw.get('doubleValue')
        if not amt: continue
        
        type_ = fields.get('type', {}).get('stringValue')
        desc = fields.get('description', {}).get('stringValue', '')
        date_ts = int(fields.get('date', {}).get('integerValue', 0))
        date_str = datetime.fromtimestamp(date_ts/1000).strftime('%Y-%m-%d')
        pool = fields.get('incomeSource', {}).get('stringValue', 'NONE')
        id_ = doc['name'].split('/')[-1]
        
        results.append({
            'date': date_str,
            'type': type_,
            'amount': float(amt),
            'desc': desc,
            'pool': pool,
            'id': id_
        })

results.sort(key=lambda x: x['date'])

print("\n--- INDUSIND BANK FULL LEDGER ---")
for r in results:
    badge = f"[{r['pool']}]" if r['pool'] != 'NONE' else "[MISSING POOL]"
    print(f"{r['date']} | {r['type']:10} | ₹{r['amount']:8.2f} | {badge:15} | {r['desc']} ({r['id']})")
