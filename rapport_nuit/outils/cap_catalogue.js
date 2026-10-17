// Ouvre catalogue.html (servi depuis C:/app/GTR, Three.js local), attend la section Cockpits, la photographie
const fs = require('fs'), path = require('path'), http = require('http'); const R = 'C:/app/GTR';
const puppeteer = require(path.join(R, 'node_modules/puppeteer'));
(async () => {
  const three = fs.readFileSync(path.join(R, 'node_modules/three/build/three.min.js'), 'utf8');
  const server = http.createServer((q, r) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u === '/') u = '/catalogue.html';
    if (u === '/t.js') { r.writeHead(200, { 'Content-Type': 'application/javascript' }); return r.end(three); }
    if (u === '/e.js') { r.writeHead(200, { 'Content-Type': 'application/javascript' }); return r.end('window.eruda={init(){}}'); }
    const f = path.join(R, u); if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
    let b = fs.readFileSync(f); const ext = path.extname(f);
    if (u === '/index.html') b = Buffer.from(b.toString('utf8').replace('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js', '/t.js').replace('//cdn.jsdelivr.net/npm/eruda', '/e.js'), 'utf8');
    r.writeHead(200, { 'Content-Type': { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.md': 'text/plain; charset=utf-8', '.svg': 'image/svg+xml' }[ext] || 'application/octet-stream' }); r.end(b); });
  await new Promise((r) => server.listen(0, '127.0.0.1', r)); const port = server.address().port;
  const nav = await puppeteer.launch({ headless: true, protocolTimeout: 900000, args: ['--no-sandbox'] }); const page = await nav.newPage();
  await page.setViewport({ width: 1200, height: 900 }); const err = []; page.on('pageerror', (e) => err.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') err.push(m.text()); });
  await page.goto('http://127.0.0.1:' + port + '/catalogue.html', { waitUntil: 'load', timeout: 180000 });
  const t0 = Date.now(); let n = 0;
  while (Date.now() - t0 < 600000) { n = await page.evaluate(() => document.querySelectorAll('#cockpits .carte img').length + document.querySelectorAll('#cockpits .carte .img').length * 0); if (n >= 80) break; await new Promise((r) => setTimeout(r, 2000)); }
  const info = await page.evaluate(() => ({ cartes: document.querySelectorAll('#cockpits .carte').length, vides: [...document.querySelectorAll('#cockpits .carte .img')].filter((z) => !z.querySelector('img')).length, nav: [...document.querySelectorAll('#nav a')].map((a) => a.textContent).join(' | ') }));
  console.log('images', n, JSON.stringify(info), 'en', Math.round((Date.now() - t0) / 1000), 's');
  const urls = await page.evaluate(() => [...document.querySelectorAll('#cockpits .carte')].slice(0, 80).map((c) => ({ k: (c.querySelector('.pastille:last-child') || {}).textContent, u: (c.querySelector('.img img') || {}).src })));
  for (const o of urls) if (['citadine', 'ovni', 'chasseur', 'bateau', 'velo', 'suvLuxe'].includes(o.k) && o.u) fs.writeFileSync(path.join(__dirname, 'cat_' + o.k + '.jpg'), Buffer.from(o.u.split(',')[1], 'base64'));
  const el = await page.$('#cockpits'); await el.screenshot({ path: path.join(__dirname, 'catalogue_cockpits.png') });
  console.log('erreurs', err.slice(0, 5)); await nav.close(); server.close(); })();
