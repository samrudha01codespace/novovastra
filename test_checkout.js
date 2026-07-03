const https = require('https');

const req = https.request('https://novavastra.samrudhakshirsagar.tech/api/checkout', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
}, res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('Status:', res.statusCode, '\nBody:', data));
});
req.write(JSON.stringify({ planId: 'credits_1' }));
req.end();
