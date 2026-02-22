import json

with open('all_transactions.json', 'r') as f:
    data = json.load(f)

docs = data.get('documents', [])
ind_id = "5abb6e32-bd50-4522-8950-8d75fecf6a14"

bal = 0
for doc in docs:
    fields = doc.get('fields', {})
    s = fields.get('sourceAccountId', {}).get('stringValue')
    d = fields.get('destinationAccountId', {}).get('stringValue')
    
    amt_raw = fields.get('amount', {})
    amt = float(amt_raw.get('integerValue') or amt_raw.get('doubleValue') or 0)
    type_ = fields.get('type', {}).get('stringValue')
    
    if type_ == 'INCOME' and d == ind_id:
        bal += amt
    elif type_ == 'EXPENSE' and s == ind_id:
        bal -= amt
    elif type_ == 'WITHDRAWAL' and s == ind_id:
        bal -= amt
    elif type_ == 'REPAYMENT':
        if s == ind_id: bal -= amt
        if d == ind_id: bal += amt

print(f"Manual Balance Calculation: ₹{bal}")
