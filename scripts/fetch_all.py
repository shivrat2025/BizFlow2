import urllib.request
import json
import os

def fetch_all():
    base_url = "https://firestore.googleapis.com/v1/projects/bizflow-fb864/databases/(default)/documents/workspaces/SHIVRAT/transactions?pageSize=300"
    all_docs = []
    token = None
    
    while True:
        url = base_url
        if token:
            url += f"&pageToken={token}"
        
        print(f"Fetching from {url[:100]}...")
        with urllib.request.urlopen(url) as response:
            data = json.loads(response.read().decode())
            all_docs.extend(data.get('documents', []))
            token = data.get('nextPageToken')
            if not token:
                break
    
    print(f"Total docs fetched: {len(all_docs)}")
    with open('all_transactions.json', 'w') as f:
        json.dump({'documents': all_docs}, f)

fetch_all()
