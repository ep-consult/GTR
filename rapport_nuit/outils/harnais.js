// Harnais commun aux scripts de la nuit : sert index.html (Three.js local), ouvre une page 390×844.
const fs = require('fs'), path = require('path'), http = require('http');
const R = 'C:/app/GTR';
const puppeteer = require(path.join(R, 'node_modules/puppeteer'));
function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
async function ouvrir(opts = {}) {
  const fichier = opts.fichier || path.join(R, 'index.html');
  const html = fs.readFileSync(fichier, 'utf8')
    .replace('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js', '/t.js')
    .replace('//cdn.jsdelivr.net/npm/eruda', '/e.js');
  const three = fs.readFileSync(path.join(R, 'node_modules/three/build/three.min.js'), 'utf8');
  const server = http.createServer((q, r) => {
    if (q.url === '/') { r.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); r.end(html); }
    else if (q.url === '/t.js') { r.writeHead(200, { 'Content-Type': 'application/javascript' }); r.end(three); }
    else if (q.url === '/e.js') { r.writeHead(200, { 'Content-Type': 'application/javascript' }); r.end('window.eruda={init(){}}'); }
    else { r.writeHead(404); r.end(); }
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const nav = await puppeteer.launch({ headless: true, protocolTimeout: 900000, args: ['--no-sandbox', '--enable-precise-memory-info', '--autoplay-policy=no-user-gesture-required', ...(process.env.GCFLAG ? ['--js-flags=--expose-gc'] : []), ...(opts.gpu ? ['--use-angle=d3d11', '--enable-gpu'] : [])] });
  const page = await nav.newPage();
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: opts.dpr || 2 });
  const erreurs = [], consoleErr = [];
  page.on('pageerror', (e) => erreurs.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') consoleErr.push(m.text()); });
  let init = 'Math.random = (' + mulberry32.toString() + ')(' + (opts.graine || 20260731) + ');';
  if (opts.init) init += opts.init;
  if (opts.sansBoucle) init += 'window.requestAnimationFrame = () => 0;';
  if (opts.save) init += 'try{localStorage.setItem("asphalte_save_v1", ' + JSON.stringify(JSON.stringify(opts.save)) + ');}catch(e){}';
  await page.evaluateOnNewDocument(init);
  await page.goto('http://127.0.0.1:' + port + '/', { waitUntil: 'load', timeout: 180000 });
  await page.waitForFunction(() => typeof PORTES !== 'undefined' && PORTES.length > 0, { timeout: 60000 });
  return { page, nav, erreurs, consoleErr, port, fermer: async () => { await nav.close(); server.close(); } };
}
// FPS mesurés sur la vraie boucle (rAF) pendant ms millisecondes
async function mesurerFps(page, ms = 4000) {
  return page.evaluate((ms) => new Promise((res) => {
    let n = 0; const t0 = performance.now(); const dts = [];
    let prev = t0;
    function f(t) { n++; dts.push(t - prev); prev = t; if (t - t0 < ms) requestAnimationFrame(f); else { dts.sort((a, b) => a - b); res({ fps: +(n * 1000 / (t - t0)).toFixed(1), p95ms: +dts[Math.floor(dts.length * 0.95)].toFixed(1) }); } }
    requestAnimationFrame(f);
  }), ms);
}
module.exports = { ouvrir, attendre, mesurerFps, R };
