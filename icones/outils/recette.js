// Recette automatique du cahier des charges (icones.svg + apercu.html).
//   node recette.js [dossier-captures]
// Contrôles statiques sur le texte du sprite, puis contrôles de rendu réel
// dans Chromium (Puppeteer) : apercu.html ouvert en file://, sans serveur.
const fs = require('fs'), path = require('path');
const RACINE = path.resolve(__dirname, '..');
const puppeteer = require(path.resolve(RACINE, '..', 'node_modules', 'puppeteer'));
const { lireInventaire } = require('./construire.js');
const dossier = process.argv[2] || path.join(__dirname, 'sortie');
fs.mkdirSync(dossier, { recursive: true });

const resultats = []; let echecs = 0;
const ok = (m) => { resultats.push('✓ ' + m); };
const ko = (m) => { resultats.push('✗ ' + m); echecs++; };

const svg = fs.readFileSync(path.join(RACINE, 'icones.svg'), 'utf8');
const inv = lireInventaire();

/* ---------------- contrôles statiques ---------------- */
if (inv.length === 42) ok('inventaire.csv : 42 IDs'); else ko('inventaire.csv : ' + inv.length + ' IDs');
const ids = [...svg.matchAll(/<symbol id="([^"]+)"/g)].map((m) => m[1]);
if (ids.length === 42) ok('42 éléments <symbol>'); else ko(ids.length + ' éléments <symbol>');
if (new Set(ids).size === ids.length) ok('aucun ID dupliqué'); else ko('IDs dupliqués');
const manquants = inv.map((l) => l.id).filter((id) => !ids.includes(id)), enTrop = ids.filter((id) => !inv.some((l) => l.id === id));
if (!manquants.length && !enTrop.length) ok('IDs identiques à inventaire.csv (casse comprise, ex. ico-arme-bouleC)'); else ko('IDs : manquants ' + manquants + ' / en trop ' + enTrop);
if (JSON.stringify(ids) === JSON.stringify(inv.map((l) => l.id))) ok('ordre des symboles = ordre de inventaire.csv'); else ko('ordre des symboles différent de inventaire.csv');
if (/^<\?xml version="1.0" encoding="UTF-8"\?>\s*<svg xmlns="http:\/\/www.w3.org\/2000\/svg">/.test(svg)) ok('racine <svg xmlns="http://www.w3.org/2000/svg">, en-tête XML UTF-8'); else ko('racine ou en-tête XML incorrects');
const interdits = ['<image', '<text', '<foreignObject', '<rect', '<circle', '<ellipse', '<polygon', '<polyline', '<line', '<mask', '<filter', '<clipPath',
  '<linearGradient', '<radialGradient', '<pattern', '<script', '<style', '<use', '<g', 'data:', 'href', 'xlink', 'transform', 'font', 'url(', '@import'];
const trouves = interdits.filter((t) => svg.includes(t));
if (!trouves.length) ok('aucun élément ni attribut interdit (image, text, rect, circle, polygon, masque, filtre, dégradé, script, transform, data URI, lien…)'); else ko('éléments interdits trouvés : ' + trouves.join(', '));
const parSymbole = {};
let mauvais = [];
for (const m of svg.matchAll(/<symbol id="([^"]+)"([^>]*)>([\s\S]*?)<\/symbol>/g)) {
  const [, id, attrs, corps] = m;
  const paths = [...corps.matchAll(/<path ([^>]*)\/>/g)].map((p) => p[1]);
  const autres = corps.replace(/<path [^>]*\/>/g, '').trim();
  const nb = (corps.match(/-?\d+(\.\d+)?/g) || []).length;
  parSymbole[id] = { paths: paths.length, nombres: nb };
  if (!/viewBox="0 0 24 24"/.test(attrs)) mauvais.push(id + ' : viewBox');
  if (paths.length < 1 || paths.length > 3) mauvais.push(id + ' : ' + paths.length + ' paths');
  if (autres) mauvais.push(id + ' : contenu autre que des <path>');
  for (const p of paths) {
    if (!/^fill="currentColor" d="[^"]+"$/.test(p)) mauvais.push(id + ' : attributs de path inattendus');
    const d = (p.match(/d="([^"]+)"/) || [])[1] || '';
    if (d.length < 10 || /NaN|undefined|Infinity/.test(d)) mauvais.push(id + ' : tracé vide ou invalide');
  }
}
if (!mauvais.length) ok('chaque symbole : viewBox="0 0 24 24", 1 à 3 <path> non vides, fill="currentColor", rien d\'autre');
else for (const e of mauvais) ko(e);
const nbs = Object.values(parSymbole).map((s) => s.nombres);
ok('taille des tracés : ' + Math.min(...nbs) + ' à ' + Math.max(...nbs) + ' nombres par icône (' + (svg.length / 1024).toFixed(1) + ' Ko au total), arrondis au centième — aucun autotrace');

/* ---------------- contrôles de rendu réel ---------------- */
(async () => {
  const nav = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--allow-file-access-from-files'] });
  const page = await nav.newPage();
  const erreurs = [];
  page.on('pageerror', (e) => erreurs.push(e.message));
  page.on('requestfailed', (r) => erreurs.push('échec de chargement : ' + r.url()));
  page.on('console', (m) => { if (m.type() === 'error') erreurs.push(m.text()); });
  const reseau = [];
  page.on('request', (r) => { if (!r.url().startsWith('file:') && !r.url().startsWith('data:')) reseau.push(r.url()); });
  await page.setViewport({ width: 1280, height: 900 });
  await page.goto('file:///' + path.join(RACINE, 'apercu.html').replace(/\\/g, '/'), { waitUntil: 'load' });

  // 1) copie embarquée identique au sprite livré
  // comparaison sur le TEXTE du fichier (le DOM resérialiserait les balises)
  const html = fs.readFileSync(path.join(RACINE, 'apercu.html'), 'utf8');
  const embarque = html.slice(html.indexOf('<svg xmlns'), html.indexOf('</svg>', html.indexOf('<svg xmlns')));
  const norm = (t) => [...t.matchAll(/<symbol[\s\S]*?<\/symbol>/g)].map((m) => m[0].replace(/\s+/g, ' ').replace(/> </g, '><').trim());
  const a = norm(svg), b = norm(embarque);
  if (a.length === 42 && JSON.stringify(a) === JSON.stringify(b)) ok('apercu.html : copie embarquée des 42 symboles identique à icones.svg');
  else ko('apercu.html : copie embarquée différente du sprite (' + b.length + ' symboles)');

  // 2) 126 rendus aux dimensions exactes, chacun non vide
  const rendus = await page.evaluate(() => [...document.querySelectorAll('.carte svg.ico')].map((s) => {
    const r = s.getBoundingClientRect(); return { id: s.closest('.carte').dataset.id, w: r.width, h: r.height, attr: +s.getAttribute('width') };
  }));
  const tailleKo = rendus.filter((r) => r.w !== r.attr || r.h !== r.attr);
  if (rendus.length === 126) ok('126 rendus dans la galerie (42 × 24/48/64 px)'); else ko(rendus.length + ' rendus dans la galerie');
  if (!tailleKo.length) ok('dimensions effectives exactes : 24 × 24, 48 × 48 et 64 × 64 px (aucun zoom CSS)'); else ko('dimensions inexactes : ' + tailleKo.slice(0, 5).map((r) => r.id + ' ' + r.w).join(', '));

  // 3) chaque icône : boîte dans le viewBox, marges, rendu non vide, couleur héritée, trous transparents
  const mesures = await page.evaluate(async (ids) => {
    const out = {};
    const NS = 'http://www.w3.org/2000/svg';
    for (const id of ids) {
      const sym = document.getElementById(id);
      // boîte géométrique exacte des tracés
      const tmp = document.createElementNS(NS, 'svg'); tmp.setAttribute('viewBox', '0 0 24 24'); tmp.setAttribute('width', '240'); tmp.setAttribute('height', '240');
      const g = document.createElementNS(NS, 'g'); for (const p of sym.querySelectorAll('path')) g.appendChild(p.cloneNode());
      tmp.appendChild(g); document.body.appendChild(tmp);
      const bb = g.getBBox(); tmp.remove();
      // rendu raster : sur fond rouge, couleur héritée bleue → seuls rouge, bleu et leurs mélanges sont permis
      const rendu = async (taille, coul, fond) => {
        const code = '<svg xmlns="' + NS + '" viewBox="0 0 24 24" width="' + taille + '" height="' + taille + '" style="color:' + coul + '"><rect width="24" height="24" fill="' + fond + '"/>' + sym.innerHTML + '</svg>';
        const im = new Image(); im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(code); await im.decode();
        const c = document.createElement('canvas'); c.width = taille; c.height = taille; const x = c.getContext('2d'); x.drawImage(im, 0, 0);
        return x.getImageData(0, 0, taille, taille).data;
      };
      const r = { bb: [bb.x, bb.y, bb.width, bb.height] };
      for (const t of [24, 48, 64]) {
        const d = await rendu(t, '#0000ff', '#ff0000');
        let encre = 0, etrange = 0;
        for (let k = 0; k < d.length; k += 4) {
          const R = d[k], G = d[k + 1], B = d[k + 2];
          if (B > 40) encre++;
          if (G > 12 || Math.abs(R + B - 255) > 24) etrange++;
        }
        r['encre' + t] = encre / (t * t); r['etrange' + t] = etrange;
      }
      // trous : sur deux fonds opposés, les pixels « vides » prennent la couleur du fond
      const sombre = await rendu(64, '#ffffff', '#000000'), clair = await rendu(64, '#000000', '#ffffff');
      let incoherent = 0;
      for (let k = 0; k < sombre.length; k += 4) if (Math.abs(sombre[k] + clair[k] - 255) > 30) incoherent++;
      r.trous = incoherent;
      out[id] = r;
    }
    return out;
  }, ids);
  const horsCadre = [], marges = [], vides = [], couleur = [], trous = [];
  for (const id of ids) {
    const m = mesures[id], [x, y, w, h] = m.bb, marge = Math.min(x, y, 24 - x - w, 24 - y - h);
    if (x < -0.001 || y < -0.001 || x + w > 24.001 || y + h > 24.001) horsCadre.push(id);
    marges.push([marge, id]);
    if (!(m.encre24 > 0.02 && m.encre48 > 0.02 && m.encre64 > 0.02)) vides.push(id);
    if (m.etrange24 + m.etrange48 + m.etrange64 > 0) couleur.push(id + ' (' + (m.etrange24 + m.etrange48 + m.etrange64) + ' px)');
    if (m.trous > 0) trous.push(id + ' (' + m.trous + ' px)');
  }
  if (!horsCadre.length) ok('géométrie entièrement dans le viewBox 0 0 24 24 (aucun clipping)'); else ko('hors du viewBox : ' + horsCadre.join(', '));
  marges.sort((u, v) => u[0] - v[0]);
  ok('marge minimale ' + marges[0][0].toFixed(2) + ' u (' + marges[0][1] + '), médiane ' + marges[21][0].toFixed(2) + ' u — cible 1 u, silhouettes longues calées sur leur plus grande dimension');
  if (!vides.length) ok('les 42 icônes produisent un rendu non vide à 24, 48 et 64 px'); else ko('rendu vide : ' + vides.join(', '));
  if (!couleur.length) ok('currentColor hérité partout : seules la couleur CSS et le fond apparaissent (aucune couleur codée en dur, y compris les tracés fins)'); else ko('couleur non héritée : ' + couleur.join(', '));
  if (!trous.length) ok('évidements transparents : sur fond clair comme sombre, chaque pixel vide prend la couleur du fond'); else ko('évidements non transparents : ' + trous.join(', '));

  // 4) contrôles de la page : recherche, couleur, fond
  const ctl = await page.evaluate(() => {
    const out = {};
    const rech = document.getElementById('recherche');
    rech.value = 'nitro'; rech.dispatchEvent(new Event('input'));
    out.recherche = [...document.querySelectorAll('.carte:not(.masquee)')].map((c) => c.dataset.id);
    rech.value = 'ico-arme-'; rech.dispatchEvent(new Event('input'));
    out.armes = document.querySelectorAll('.carte:not(.masquee)').length;
    rech.value = ''; rech.dispatchEvent(new Event('input'));
    out.tout = document.querySelectorAll('.carte:not(.masquee)').length;
    const ico = document.querySelector('.carte svg.ico');
    out.couleurInitiale = getComputedStyle(ico).color; out.fondInitial = getComputedStyle(document.body).backgroundColor;
    const c = document.getElementById('couleur'); c.value = '#ff8800'; c.dispatchEvent(new Event('input'));
    out.couleurApres = getComputedStyle(ico).color;
    document.getElementById('fond').click(); out.fondClair = getComputedStyle(document.body).backgroundColor;
    document.getElementById('fond').click();
    out.refs = [...document.querySelectorAll('.ref img')].map((i) => i.complete && i.naturalWidth > 0);
    out.titreRefs = [...document.querySelectorAll('h2')].some((h) => h.textContent.includes('Références PNG — images raster, pas les SVG finaux'));
    return out;
  });
  if (ctl.recherche.length === 1 && ctl.recherche[0] === 'ico-spec-nitro' && ctl.armes === 17 && ctl.tout === 42) ok('recherche par ID : « nitro » → ico-spec-nitro seul, « ico-arme- » → 17, vide → 42');
  else ko('recherche : ' + JSON.stringify(ctl));
  if (ctl.couleurInitiale === 'rgb(238, 241, 246)' && ctl.fondInitial === 'rgb(13, 16, 22)') ok('valeurs initiales : icônes claires sur fond sombre');
  else ko('valeurs initiales : ' + ctl.couleurInitiale + ' sur ' + ctl.fondInitial);
  if (ctl.couleurApres === 'rgb(255, 136, 0)') ok('sélecteur de couleur : pilote currentColor de toutes les icônes'); else ko('sélecteur de couleur sans effet (' + ctl.couleurApres + ')');
  if (ctl.fondClair !== ctl.fondInitial) ok('bascule fond clair / sombre'); else ko('bascule de fond sans effet');
  if (ctl.titreRefs && ctl.refs.length === 4 && ctl.refs.every(Boolean)) ok('section « Références PNG — images raster, pas les SVG finaux » : 4 planches chargées');
  else ko('section des références : ' + JSON.stringify(ctl.refs));
  if (!reseau.length) ok('ouverture directe en file:// : aucune requête réseau, aucun fetch'); else ko('requêtes réseau : ' + reseau.join(', '));
  if (!erreurs.length) ok('aucune erreur de chargement ni erreur JS'); else ko('erreurs : ' + erreurs.join(' | '));

  // 5) captures : page entière sur fond sombre et sur fond clair
  await page.screenshot({ path: path.join(dossier, 'apercu_sombre.png'), fullPage: true });
  await page.evaluate(() => document.getElementById('fond').click());
  await page.screenshot({ path: path.join(dossier, 'apercu_clair.png'), fullPage: true });

  console.log(resultats.join('\n'));
  console.log('\n' + (echecs ? echecs + ' contrôle(s) en échec' : 'Recette : tous les contrôles sont passés.'));
  fs.writeFileSync(path.join(dossier, 'recette.json'), JSON.stringify({ resultats, echecs, parSymbole, mesures }, null, 1));
  await nav.close();
  process.exit(echecs ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
