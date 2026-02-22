import json
import os

def find_tx():
    try:
        with open('workspace_dump.json', 'r') as f:
            data = json.load(f)
            
        # Check legacy transactions in metadata
        fields = data.get('fields', {})
        txs_field = fields.get('transactions', {}).get('arrayValue', {}).get('values', [])
        
        print(f"Checking {len(txs_field)} legacy transactions...")
        for tx_val in txs_field:
            tx = tx_val.get('mapValue', {}).get('fields', {})
            amt = tx.get('amount', {}).get('integerValue') or tx.get('amount', {}).get('doubleValue')
            desc = tx.get('description', {}).get('stringValue', '')
            if amt and ('77' in str(amt) or '15' in str(amt)):
                print(f"MATCH: ₹{amt} | {desc} | {tx.get('type', {}).get('stringValue')}")

    except Exception as e:
        print(f"Error: {e}")

find_tx()
