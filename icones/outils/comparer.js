// Outil de dessin et de recette des icônes (n'est PAS un livrable du jeu).
//
//   node comparer.js grille [filtre] [dossier]   → références quadrillées 24×24
//   node comparer.js superpose [filtre] [dossier] → mon dessin sur la référence
//
// grille : chaque grand pictogramme de référence est découpé et calé dans le
// repère 24×24 (marge 1, centré, proportions conservées) avec un quadrillage
// d'une unité : on y LIT les coordonnées à l'œil pour dessiner les tracés à
// la main. Aucun contour n'est extrait de l'image.
// superpose : rend le symbole de icones.svg dans le même cadre que sa
// référence ; blanc = commun, rouge = référence seule, cyan = dessin seul.
// Score = recouvrement (intersection / union) des deux silhouettes.
const fs = require('fs'), path = require('path');
const RACINE = path.resolve(__dirname, '..');
const puppeteer = require(path.resolve(RACINE, '..', 'node_modules', 'puppeteer'));
const CASES = require('./cases.js');
const [mode = 'grille', filtre = '', dossier = path.join(__dirname, 'sortie')] = process.argv.slice(2);
fs.mkdirSync(dossier, { recursive: true });

(async () => {
  const navigateur = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await navigateur.newPage();
  const planches = {};
  for (const f of Object.keys(CASES)) planches[f] = 'data:image/png;base64,' + fs.readFileSync(path.join(RACINE, 'references', f)).toString('base64');
  const sprite = fs.existsSync(path.join(RACINE, 'icones.svg')) ? fs.readFileSync(path.join(RACINE, 'icones.svg'), 'utf8') : '';
  const travaux = [];
  for (const f of Object.keys(CASES)) for (const c of CASES[f]) if (c[0].includes(filtre)) travaux.push([f, ...c]);
  // sonde : node comparer.js sonde <id> "h:12,h:14.5,v:8" → bords de la
  // référence (en unités du repère 24) le long de lignes choisies — une
  // lecture du quadrillage plus précise, pour placer les points à la main
  if (mode === 'sonde') {
    const lignes = (process.argv[5] || process.argv[4] || '').split(',').filter(Boolean);
    const sondes = await page.evaluate(async (planches, travaux, lignes) => {
      const charger = (src) => new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.src = src; });
      const [f, id, x0, y0, x1, y1] = travaux[0];
      const img = await charger(planches[f]);
      const c0 = document.createElement('canvas'); c0.width = x1 - x0; c0.height = y1 - y0;
      const g0 = c0.getContext('2d'); g0.drawImage(img, -x0, -y0);
      const d = g0.getImageData(0, 0, c0.width, c0.height).data, W = c0.width, H = c0.height;
      const blanc = (x, y) => { const k = (y * W + x) * 4; return d[k] + d[k + 1] + d[k + 2] > 3 * 110; };
      let bx0 = 1e9, by0 = 1e9, bx1 = -1, by1 = -1;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (blanc(x, y)) { bx0 = Math.min(bx0, x); by0 = Math.min(by0, y); bx1 = Math.max(bx1, x); by1 = Math.max(by1, y); }
      const w = bx1 - bx0 + 1, h = by1 - by0 + 1, s = 22 / Math.max(w, h);
      const ox = (24 - w * s) / 2 - bx0 * s, oy = (24 - h * s) / 2 - by0 * s;
      const out = [];
      for (const l of lignes) {
        const [axe, v] = l.split(':'); const u = +v, runs = [];
        if (axe === 'h') { const y = Math.round((u - oy) / s); let deb = null; for (let x = 0; x <= W; x++) { const b = x < W && y >= 0 && y < H && blanc(x, y); if (b && deb === null) deb = x; if (!b && deb !== null) { runs.push([deb * s + ox, x * s + ox]); deb = null; } } }
        else { const x = Math.round((u - ox) / s); let deb = null; for (let y = 0; y <= H; y++) { const b = y < H && x >= 0 && x < W && blanc(x, y); if (b && deb === null) deb = y; if (!b && deb !== null) { runs.push([deb * s + oy, y * s + oy]); deb = null; } } }
        out.push(l + '  ' + runs.map((r) => r[0].toFixed(1) + '–' + r[1].toFixed(1)).join('  '));
      }
      return out;
    }, planches, travaux, lignes);
    console.log(sondes.join('\n'));
    await navigateur.close();
    return;
  }
  const res = await page.evaluate(async (planches, travaux, mode, sprite) => {
    const charger = (src) => new Promise((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = ko; i.src = src; });
    const imgs = {}; for (const f in planches) imgs[f] = await charger(planches[f]);
    const T = 480, U = T / 24, sorties = [];
    for (const [f, id, x0, y0, x1, y1] of travaux) {
      // boîte englobante des pixels clairs de la zone
      const c0 = document.createElement('canvas'); c0.width = x1 - x0; c0.height = y1 - y0;
      const g0 = c0.getContext('2d'); g0.drawImage(imgs[f], -x0, -y0);
      const d = g0.getImageData(0, 0, c0.width, c0.height).data;
      let bx0 = 1e9, by0 = 1e9, bx1 = -1, by1 = -1;
      for (let y = 0; y < c0.height; y++) for (let x = 0; x < c0.width; x++) {
        const k = (y * c0.width + x) * 4; if (d[k] + d[k + 1] + d[k + 2] > 3 * 110) { bx0 = Math.min(bx0, x); by0 = Math.min(by0, y); bx1 = Math.max(bx1, x); by1 = Math.max(by1, y); }
      }
      const w = bx1 - bx0 + 1, h = by1 - by0 + 1, s = 22 * U / Math.max(w, h);          // px de rendu par px source
      const ox = (T - w * s) / 2 - bx0 * s, oy = (T - h * s) / 2 - by0 * s;
      const cv = document.createElement('canvas'); cv.width = T; cv.height = T; const g = cv.getContext('2d');
      g.fillStyle = '#0d1016'; g.fillRect(0, 0, T, T);
      g.imageSmoothingEnabled = true;
      // masque de référence (binaire)
      const cr = document.createElement('canvas'); cr.width = T; cr.height = T; const gr = cr.getContext('2d');
      gr.drawImage(c0, ox, oy, c0.width * s, c0.height * s);
      const dr = gr.getImageData(0, 0, T, T).data;
      const out = g.getImageData(0, 0, T, T);
      let inter = 0, union = 0, dm = null;
      if (mode === 'superpose') {
        const m = sprite.match(new RegExp('<symbol id="' + id + '"[^>]*>([\\s\\S]*?)</symbol>'));
        if (m) {
          const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="' + T + '" height="' + T + '" color="#ffffff">' + m[1] + '</svg>';
          const im = await charger('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg));
          const cm = document.createElement('canvas'); cm.width = T; cm.height = T; const gm = cm.getContext('2d'); gm.drawImage(im, 0, 0);
          dm = gm.getImageData(0, 0, T, T).data;
        }
      }
      for (let k = 0; k < T * T * 4; k += 4) {
        const r = dr[k] + dr[k + 1] + dr[k + 2] > 3 * 110, mi = dm ? dm[k + 3] > 128 : false;
        if (r && mi) inter++; if (r || mi) union++;
        let col = [13, 16, 22];
        if (mode === 'grille') col = r ? [235, 235, 235] : col;
        else col = r && mi ? [235, 235, 235] : r ? [230, 60, 60] : mi ? [60, 200, 230] : col;
        out.data[k] = col[0]; out.data[k + 1] = col[1]; out.data[k + 2] = col[2]; out.data[k + 3] = 255;
      }
      g.putImageData(out, 0, 0);
      // quadrillage : 1 unité, renforcé toutes les 2, numéroté toutes les 4
      if (mode !== 'cote') for (let i = 0; i <= 24; i++) {
        g.strokeStyle = i % 4 === 0 ? 'rgba(255,200,0,.55)' : i % 2 === 0 ? 'rgba(120,160,255,.35)' : 'rgba(120,160,255,.15)';
        g.lineWidth = 1;
        g.beginPath(); g.moveTo(i * U + .5, 0); g.lineTo(i * U + .5, T); g.stroke();
        g.beginPath(); g.moveTo(0, i * U + .5); g.lineTo(T, i * U + .5); g.stroke();
        if (i % 4 === 0 && i < 24) { g.fillStyle = '#ffc800'; g.font = '11px monospace'; g.fillText(i, i * U + 2, 11); g.fillText(i, 2, i * U + 11); }
      }
      g.fillStyle = '#fff'; g.font = 'bold 14px sans-serif';
      const score = union ? inter / union : 0;
      if (mode !== 'cote') g.fillText(id + (mode === 'superpose' ? '  ' + (dm ? Math.round(score * 100) + ' %' : 'ABSENT') : ''), 6, T - 8);
      sorties.push({ id, url: cv.toDataURL('image/png'), score: dm ? score : null });
    }
    return sorties;
  }, planches, travaux, mode, sprite);
  // côte à côte : référence découpée | mon dessin, en grand puis aux tailles réelles
  if (mode === 'cote') {
    const sym = {}; for (const r of res) sym[r.id] = (sprite.match(new RegExp('<symbol id="' + r.id + '"[^>]*>([\\s\\S]*?)</symbol>')) || [])[1] || '';
    const carte = (r) => '<div class="c"><img src="' + r.url + '" width="96" height="96" style="filter:grayscale(1)">' +
      ['96', '64', '48', '24'].map((t) => '<svg viewBox="0 0 24 24" width="' + t + '" height="' + t + '" style="color:#eef">' + sym[r.id] + '</svg>').join('') + '<span>' + r.id + '</span></div>';
    await page.setViewport({ width: 900, height: 140 * res.length + 20 });
    await page.setContent('<style>body{margin:0;background:#0d1016;font:12px sans-serif;color:#aab}.c{display:flex;align-items:center;gap:14px;padding:8px 12px;border-bottom:1px solid #223}.c span{margin-left:auto}</style>' + res.map(carte).join(''));
    await page.screenshot({ path: path.join(dossier, 'cote_' + (filtre || 'tout') + '.png'), fullPage: true });
    console.log(res.length + ' icône(s), comparaison côte à côte dans ' + dossier);
    await navigateur.close();
    return;
  }
  // planches de 6 (3 × 2)
  for (let p = 0; p * 6 < res.length; p++) {
    const lot = res.slice(p * 6, p * 6 + 6);
    await page.setViewport({ width: 1440, height: 960 });
    await page.setContent('<body style="margin:0;background:#000;display:flex;flex-wrap:wrap;width:1440px">' + lot.map((r) => '<img src="' + r.url + '" width="480" height="480">').join('') + '</body>');
    await page.screenshot({ path: path.join(dossier, mode + '_' + (filtre || 'tout') + '_' + p + '.png') });
  }
  if (mode === 'superpose') for (const r of res) console.log((r.score === null ? 'ABSENT' : Math.round(r.score * 100) + ' %').padStart(7) + '  ' + r.id);
  console.log(res.length + ' icône(s), planches dans ' + dossier);
  await navigateur.close();
})().catch((e) => { console.error(e); process.exit(1); });
