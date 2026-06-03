const http = require('http');
const fs   = require('fs');
const path = require('path');

const PORT     = process.env.PORT || 3000;
const GROQ_KEY = process.env.GROQ_API_KEY || '';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css',
  '.js':   'application/javascript',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.ico':  'image/x-icon',
  '.txt':  'text/plain'
};

http.createServer((req, res) => {
  let urlPath = req.url.split('?')[0];
  if (urlPath === '/' || urlPath === '') urlPath = '/AgenteDentIA_ProtesisHibridas.html';

  const filePath = path.join(__dirname, urlPath);
  const ext      = path.extname(filePath).toLowerCase();

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404); res.end('Not found'); return;
    }

    // Inyectar GROQ_API_KEY en el HTML como variable global
    if (ext === '.html' && GROQ_KEY) {
      const inject = `<script>window.__GROQ_KEY__="${GROQ_KEY}";</script>`;
      data = Buffer.from(data.toString().replace('</head>', inject + '</head>'));
    }

    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(PORT, () => console.log(`DentIA corriendo en puerto ${PORT}`));
