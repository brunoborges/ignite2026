const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');

const assets = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/app.js', ['app.js', 'text/javascript; charset=utf-8']],
  ['/styles.css', ['styles.css', 'text/css; charset=utf-8']],
]);

function createServer(backendUrl = process.env.BACKEND_URL || 'http://127.0.0.1:8080') {
  const backend = new URL(backendUrl);
  if (backend.protocol !== 'http:') {
    throw new Error('BACKEND_URL must use http://');
  }
  return http.createServer(async (request, response) => {
    const url = new URL(request.url, 'http://localhost');
    if (url.pathname.startsWith('/api/')) {
      const headers = { ...request.headers, host: backend.host };
      const proxy = http.request({
        hostname: backend.hostname,
        port: backend.port || 80,
        path: url.pathname + url.search,
        method: request.method,
        headers,
      }, (upstream) => {
        response.writeHead(upstream.statusCode, upstream.headers);
        upstream.pipe(response);
      });
      proxy.setTimeout(10000, () => proxy.destroy(new Error('Backend timeout')));
      proxy.on('error', () => {
        if (!response.headersSent && !response.destroyed) {
          response.writeHead(502, { 'Content-Type': 'application/json' });
          response.end(JSON.stringify({ message: 'The scheduling service is unavailable. Please try again.' }));
        } else {
          response.destroy();
        }
      });
      request.on('aborted', () => proxy.destroy());
      response.on('close', () => {
        if (!response.writableFinished) proxy.destroy();
      });
      request.pipe(proxy);
      return;
    }
    const asset = assets.get(url.pathname);
    if (!asset || !['GET', 'HEAD'].includes(request.method)) {
      response.writeHead(404);
      response.end('Not found');
      return;
    }
    try {
      const body = await fs.readFile(path.join(__dirname, 'public', asset[0]));
      response.writeHead(200, {
        'Content-Type': asset[1],
        'Content-Length': body.length,
        'Cache-Control': 'no-cache',
        'X-Content-Type-Options': 'nosniff',
      });
      response.end(request.method === 'HEAD' ? undefined : body);
    } catch {
      response.writeHead(500);
      response.end('Unable to load application');
    }
  });
}

if (require.main === module) {
  const port = Number(process.env.PORT || 3000);
  createServer().listen(port, '127.0.0.1', () => {
    console.log(`Advisor scheduler: http://localhost:${port}`);
  });
}

module.exports = { createServer };
