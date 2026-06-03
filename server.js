const http  = require('http');
const https = require('https');
const fs    = require('fs');
const path  = require('path');

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
  // ── CORS headers para todas las respuestas ──
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  // ── Proxy Groq: POST /api/groq ──
  if (req.method === 'POST' && req.url === '/api/groq') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      const options = {
        hostname: 'api.groq.com',
        path: '/openai/v1/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_KEY}`
        }
      };
      const groqReq = https.request(options, groqRes => {
        let data = '';
        groqRes.on('data', c => data += c);
        groqRes.on('end', () => {
          res.writeHead(groqRes.statusCode, { 'Content-Type': 'application/json' });
          res.end(data);
        });
      });
      groqReq.on('error', err => {
        res.writeHead(502); res.end(JSON.stringify({ error: err.message }));
      });
      groqReq.write(body);
      groqReq.end();
    });
    return;
  }

  // ── Archivos estáticos ──
  let urlPath = req.url.split('?')[0];
  if (urlPath === '/' || urlPath === '') urlPath = '/AgenteDentIA_ProtesisHibridas.html';

  const filePath = path.join(__dirname, urlPath);
  const ext      = path.extname(filePath).toLowerCase();

  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }

    // Indicar al cliente que Groq está disponible (key configurada)
    if (ext === '.html' && GROQ_KEY) {
      const inject = `<script>window.__GROQ_READY__=true;</script>`;
      data = Buffer.from(data.toString().replace('</head>', inject + '</head>'));
    }

    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(PORT, () => console.log(`DentIA en puerto ${PORT} — Groq: ${GROQ_KEY ? 'OK' : 'sin key'}`));
