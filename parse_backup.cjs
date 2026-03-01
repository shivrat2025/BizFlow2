const fs = require('fs');
const data = JSON.parse(fs.readFileSync('backup/2026-02-13/SHIVRAT.json', 'utf8'));
console.log(JSON.stringify(data.accounts, null, 2));
