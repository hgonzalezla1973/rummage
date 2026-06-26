const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;
const file = path.join(__dirname, 'index.html');

http.createServer((req, res) => {
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(500); res.end('Error reading file'); return; }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(data);
  });
}).listen(PORT, () => console.log('Open http://localhost:' + PORT));
