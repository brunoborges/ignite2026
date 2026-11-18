const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { once } = require('node:events');
const { createServer } = require('../server');

async function listen(server, t) {
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((resolve) => server.close(resolve)));
  return `http://127.0.0.1:${server.address().port}`;
}

test('serves frontend assets and does not expose server files', async (t) => {
  const base = await listen(createServer(), t);
  const page = await fetch(base);
  assert.equal(page.status, 200);
  assert.match(await page.text(), /Northstar Bank/);
  for (const asset of ['/app.js', '/styles.css']) {
    assert.equal((await fetch(base + asset)).status, 200);
  }
  assert.equal((await fetch(base + '/server.js')).status, 404);
});

test('proxies appointment payload, query, and conflict response', async (t) => {
  let received;
  const backend = http.createServer(async (req, res) => {
    let body = '';
    for await (const chunk of req) body += chunk;
    received = { method: req.method, url: req.url, body };
    res.writeHead(409, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Already booked' }));
  });
  const backendUrl = await listen(backend, t);
  const base = await listen(createServer(backendUrl), t);
  const payload = JSON.stringify({ advisorId: 1, customerName: 'Morgan Smith' });
  const response = await fetch(base + '/api/appointments?source=branch', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload,
  });
  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), { message: 'Already booked' });
  assert.deepEqual(received, { method: 'POST', url: '/api/appointments?source=branch', body: payload });
});

test('returns actionable error when API is unavailable', async (t) => {
  const unavailable = http.createServer();
  unavailable.listen(0, '127.0.0.1');
  await once(unavailable, 'listening');
  const port = unavailable.address().port;
  await new Promise((resolve) => unavailable.close(resolve));
  const base = await listen(createServer(`http://127.0.0.1:${port}`), t);
  const response = await fetch(base + '/api/schedule');
  assert.equal(response.status, 502);
  assert.match((await response.json()).message, /unavailable/);
});
