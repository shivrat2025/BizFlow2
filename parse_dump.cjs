const fs = require('fs');
const data = JSON.parse(fs.readFileSync('workspace_dump.json', 'utf8'));
console.log(JSON.stringify(data.accounts || (data.fields && data.fields.accounts), null, 2));
