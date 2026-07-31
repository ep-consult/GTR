#!/usr/bin/env node
'use strict';
/*
 * valider.js — runtime simulé pour ASPHALTE (voir CLAUDE.md, section « Validation »).
 *
 * Charge index.html, extrait les blocs <script> inline, les exécute dans le
 * vrai contexte global Node. vm.runInThisContext partage un seul environnement
 * lexical global entre appels successifs — exactement comme plusieurs balises
 * <script> classiques dans une page partagent leurs `let`/`const` de sommet.
 *
 * THREE.js est la vraie librairie r128 installée dans node_modules (toute la
 * géométrie, les matériaux, la scène : c'est là que vivent les bugs d'API
 * post-r128). Seul THREE.WebGLRenderer est remplacé par un bouchon : Node n'a
 * pas de contexte WebGL, et le rendu pixel réel se teste à la main sur
 * appareil (voir CLAUDE.md) — ce script valide la logique, pas les pixels.
 *
 * Le DOM, WebAudio et localStorage sont bouchonnés a minima pour que le jeu
 * s'initialise sans exception.
 *
 * Toute exception — y compris celles avalées par un try/catch du jeu — est
 * remontée : le code source est instrumenté à la volée pour que chaque
 * `catch(e){...}` empile aussi l'erreur dans un collecteur global, sans rien
 * changer au comportement d'origine du catch.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const INDEX_HTML = path.join(__dirname, 'index.html');
const NB_FRAMES = 400; // "quelques centaines de frames"
const DT_FRAME_MS = 16.7;

let echecs = 0;
function fail(msg) { echecs++; console.error('✗ ' + msg); }
function ok(msg) { console.log('✓ ' + msg); }
function info(msg) { console.log('  · ' + msg); }

// ---------------------------------------------------------------------------
// PRNG déterministe : rend un échec éventuel reproductible d'une run à l'autre.
// ---------------------------------------------------------------------------
const SEED = process.env.SEED ? Number(process.env.SEED) : 20260731;
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
Math.random = mulberry32(SEED);
console.log('Seed PRNG : ' + SEED + ' (SEED=<n> node valider.js pour rejouer un autre tirage)\n');

// ---------------------------------------------------------------------------
// Collecteurs de diagnostics
// ---------------------------------------------------------------------------
const ERREURS = [];    // exceptions non rattrapées par le jeu
const CAPTURES = [];   // exceptions avalées par un try/catch du jeu (instrumentation)
global.__CAPTURES__ = CAPTURES;
process.on('uncaughtException', (e) => { ERREURS.push(e); });

// ---------------------------------------------------------------------------
// Bouchon canvas 2D : absorbe les appels de dessin (aucun rendu réel en
// headless Node) mais valide chaque nom de propriété/méthode accédé contre
// la VRAIE liste des membres de CanvasRenderingContext2D — un nom inconnu
// (typo comme fillRectt) lève une erreur au lieu d'être silencieusement
// avalé. Liste extraite une fois depuis un vrai Chromium (Puppeteer) :
//   const ctx=document.createElement('canvas').getContext('2d');
//   let proto=Object.getPrototypeOf(ctx), props=new Set();
//   while(proto&&proto!==Object.prototype){
//     for(const n of Object.getOwnPropertyNames(proto)) if(n!=='constructor') props.add(n);
//     proto=Object.getPrototypeOf(proto);
//   }
// À régénérer avec le même script si de nouvelles API canvas sont utilisées.
const API_CANVAS_2D = new Set([
  'arc', 'arcTo', 'beginPath', 'bezierCurveTo', 'canvas', 'clearRect', 'clip',
  'closePath', 'createConicGradient', 'createImageData', 'createLinearGradient',
  'createPattern', 'createRadialGradient', 'direction', 'drawFocusIfNeeded',
  'drawImage', 'ellipse', 'fill', 'fillRect', 'fillStyle', 'fillText', 'filter',
  'font', 'fontKerning', 'fontStretch', 'fontVariantCaps', 'getContextAttributes',
  'getImageData', 'getLineDash', 'getTransform', 'globalAlpha',
  'globalCompositeOperation', 'imageSmoothingEnabled', 'imageSmoothingQuality',
  'isContextLost', 'isPointInPath', 'isPointInStroke', 'lang', 'letterSpacing',
  'lineCap', 'lineDashOffset', 'lineJoin', 'lineTo', 'lineWidth', 'measureText',
  'miterLimit', 'moveTo', 'putImageData', 'quadraticCurveTo', 'rect', 'reset',
  'resetTransform', 'restore', 'rotate', 'roundRect', 'save', 'scale',
  'setLineDash', 'setTransform', 'shadowBlur', 'shadowColor', 'shadowOffsetX',
  'shadowOffsetY', 'stroke', 'strokeRect', 'strokeStyle', 'strokeText',
  'textAlign', 'textBaseline', 'textRendering', 'transform', 'translate',
  'wordSpacing',
]);
// createLinearGradient/createRadialGradient/createPattern renvoient un objet
// à l'API distincte (CanvasGradient/CanvasPattern) : addColorStop n'est pas
// une méthode de CanvasRenderingContext2D, valider avec la même liste que le
// contexte y ferait planter du code parfaitement correct.
const API_CANVAS_GRADIENT = new Set(['addColorStop']);
const METHODES_GRADIENT = new Set(['createLinearGradient', 'createRadialGradient', 'createPattern']);
// measureText() renvoie TextMetrics, une interface encore différente — et
// c'est justement ce que dessinerIconePOI() interroge (actualBoundingBox*)
// pour centrer un glyphe. Des vrais nombres plausibles (dérivés du texte et
// de la taille de police couramment assignée à .font) sont nécessaires pour
// que ce calcul soit réellement exercé, pas juste "ne plante pas".
function extraireTaillePolice(fontCss) {
  const m = /(\d+(?:\.\d+)?)px/.exec(String(fontCss || ''));
  return m ? parseFloat(m[1]) : 10;
}
function makeTextMetrics(texte, taillePx) {
  const largeur = String(texte).length * taillePx * 0.6; // approx. Arial
  return {
    width: largeur,
    actualBoundingBoxLeft: largeur / 2,
    actualBoundingBoxRight: largeur / 2,
    actualBoundingBoxAscent: taillePx * 0.8,
    actualBoundingBoxDescent: taillePx * 0.2,
    fontBoundingBoxAscent: taillePx * 0.9,
    fontBoundingBoxDescent: taillePx * 0.25,
  };
}
function quietMock(label, apiSet) {
  apiSet = apiSet || API_CANVAS_2D;
  const store = Object.create(null);
  const fn = function () { return quietMock(label + '()', apiSet); };
  return new Proxy(fn, {
    get(t, prop) {
      if (prop === Symbol.toPrimitive) return () => 0;
      if (typeof prop === 'symbol') return undefined;
      if (prop === 'measureText' && apiSet === API_CANVAS_2D) {
        return (texte) => makeTextMetrics(texte, extraireTaillePolice(store.font));
      }
      if (prop in store) return store[prop];
      if (!apiSet.has(prop)) {
        throw new Error('CanvasRenderingContext2D.' + String(prop) + ' n\'existe pas (typo ?) — accédé depuis ' + label);
      }
      const sousApi = METHODES_GRADIENT.has(prop) ? API_CANVAS_GRADIENT : apiSet;
      return quietMock(label + '.' + String(prop), sousApi);
    },
    set(t, prop, v) {
      if (typeof prop !== 'symbol' && !apiSet.has(prop)) {
        throw new Error('CanvasRenderingContext2D.' + String(prop) + ' n\'existe pas (typo ?) — assigné depuis ' + label);
      }
      store[prop] = v; return true;
    },
    apply() { return quietMock(label + '()', apiSet); },
  });
}

// ---------------------------------------------------------------------------
// DOM minimal
// ---------------------------------------------------------------------------
function makeStyleProxy() {
  // Mémorise ce qui est écrit et le relit, comme un vrai CSSStyleDeclaration
  // (propriété jamais assignée -> '', pas undefined). Avant, toute lecture
  // renvoyait toujours '' quoi qu'on ait écrit : du code qui relit un style
  // pour décider quelque chose (if(x.style.display!=='none')...) voyait
  // toujours '' — donc toujours vrai — sans jamais vérifier le vrai état.
  const store = Object.create(null);
  return new Proxy(store, {
    get(t, prop) {
      if (typeof prop === 'symbol') return undefined;
      return prop in store ? store[prop] : '';
    },
    set(t, prop, v) {
      if (typeof prop !== 'symbol') store[prop] = String(v);
      return true;
    },
    has() { return true; },
  });
}
class FakeClassList {
  constructor() { this._s = new Set(); }
  add(...c) { c.forEach((x) => this._s.add(x)); }
  remove(...c) { c.forEach((x) => this._s.delete(x)); }
  toggle(c, force) {
    if (force === undefined) force = !this._s.has(c);
    if (force) this._s.add(c); else this._s.delete(c);
    return force;
  }
  contains(c) { return this._s.has(c); }
}
function makeElement(tag) {
  tag = (tag || 'div').toLowerCase();
  const listeners = new Map();
  const elObj = {
    tagName: tag.toUpperCase(),
    nodeType: 1,
    children: [], childNodes: [],
    parentNode: null,
    get firstChild() { return this.children.length ? this.children[0] : null; },
    get lastChild() { return this.children.length ? this.children[this.children.length - 1] : null; },
    attributes: Object.create(null),
    dataset: {},
    style: makeStyleProxy(),
    classList: new FakeClassList(),
    _text: '', _html: '',
    get textContent() { return this._text; },
    set textContent(v) { this._text = String(v); },
    get innerText() { return this._text; },
    set innerText(v) { this._text = String(v); },
    get innerHTML() { return this._html; },
    set innerHTML(v) { this._html = String(v); },
    addEventListener(type, f) { if (!listeners.has(type)) listeners.set(type, []); listeners.get(type).push(f); },
    removeEventListener(type, f) {
      const a = listeners.get(type); if (!a) return;
      const i = a.indexOf(f); if (i >= 0) a.splice(i, 1);
    },
    dispatchEvent(ev) {
      const a = listeners.get(ev.type);
      if (a) for (const f of a.slice()) { try { f(ev); } catch (err) { ERREURS.push(err); } }
      return true;
    },
    appendChild(c) { this.children.push(c); this.childNodes.push(c); c.parentNode = this; return c; },
    removeChild(c) { const i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1); return c; },
    insertBefore(c) { this.children.push(c); return c; },
    setAttribute(k, v) { this.attributes[k] = String(v); },
    getAttribute(k) { return k in this.attributes ? this.attributes[k] : null; },
    hasAttribute(k) { return k in this.attributes; },
    removeAttribute(k) { delete this.attributes[k]; },
    // Un vrai querySelector nécessiterait de parser innerHTML (une chaîne
    // ici, jamais de vrais nœuds enfants) : plutôt que de renvoyer null (et
    // faire planter tout usage immédiat comme .getContext()), on renvoie un
    // nouvel élément générique "capable de tout" (canvas compris), cohérent
    // avec la philosophie de ce bouchon : jamais null, un porte-tout inerte.
    querySelector() { return makeElement('canvas'); },
    querySelectorAll() { return [makeElement('canvas')]; },
    setPointerCapture() {}, releasePointerCapture() {},
    focus() {}, blur() {}, click() {},
    getBoundingClientRect() { return { x: 0, y: 0, left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 }; },
  };
  if (tag === 'canvas') {
    elObj.width = 300; elObj.height = 150;
    elObj.getContext = (type) => (type && String(type).indexOf('2d') >= 0 ? quietMock('ctx2d') : null);
    elObj.toDataURL = () => 'data:,';
  }
  return elObj;
}
// ids des <canvas> déclarés dans index.html : getElementById doit leur donner
// un vrai getContext('2d'), pas un <div> générique.
const CANVAS_IDS = new Set(['minimap', 'persoCv', 'carteCv']);
const elementsById = new Map();
const documentMock = {
  body: makeElement('body'),
  documentElement: makeElement('html'),
  getElementById(id) {
    if (!elementsById.has(id)) elementsById.set(id, makeElement(CANVAS_IDS.has(id) ? 'canvas' : 'div'));
    return elementsById.get(id);
  },
  createElement(tag) { return makeElement(tag); },
  createElementNS(ns, tag) { return makeElement(tag); },
  querySelectorAll() { return []; },
  querySelector() { return null; },
  addEventListener() {}, removeEventListener() {},
};

// ---------------------------------------------------------------------------
// window + requestAnimationFrame piloté à la main (pas de vraie boucle rAF
// dans Node : on capture le callback et on l'appelle nous-même image par image)
// ---------------------------------------------------------------------------
let rafCallback = null, rafId = 0;
function fakeRAF(fn) { rafCallback = fn; return ++rafId; }
function fakeCancelRAF() { rafCallback = null; }
function pumpFrame(t) {
  const fn = rafCallback; rafCallback = null;
  if (!fn) return false;
  try { fn(t); } catch (e) { ERREURS.push(e); }
  return true;
}

const windowListeners = new Map();
const windowMock = {
  innerWidth: 390, innerHeight: 844, devicePixelRatio: 2,
  addEventListener(type, f) { if (!windowListeners.has(type)) windowListeners.set(type, []); windowListeners.get(type).push(f); },
  removeEventListener() {},
  dispatchEvent(ev) {
    const a = windowListeners.get(ev.type);
    if (a) for (const f of a.slice()) { try { f(ev); } catch (err) { ERREURS.push(err); } }
    return true;
  },
  requestAnimationFrame: fakeRAF,
  cancelAnimationFrame: fakeCancelRAF,
};

// ---------------------------------------------------------------------------
// WebAudio minimal (assez pour qu'audioInit()/moteurStart()/sirenUpdate()
// tournent réellement si le jeu les invoque)
// ---------------------------------------------------------------------------
function makeAudioParam(v) {
  return {
    value: v || 0,
    setValueAtTime(val) { this.value = val; return this; },
    linearRampToValueAtTime(val) { this.value = val; return this; },
    exponentialRampToValueAtTime(val) { this.value = val; return this; },
    setTargetAtTime(val) { this.value = val; return this; },
    cancelScheduledValues() { return this; },
  };
}
function makeAudioNode(extra) {
  return Object.assign({ connect() { return arguments.length ? arguments[0] : undefined; }, disconnect() {} }, extra || {});
}
class MockAudioContext {
  constructor() {
    this.sampleRate = 44100; this.currentTime = 0; this.state = 'running';
    this.destination = makeAudioNode();
  }
  createGain() { return makeAudioNode({ gain: makeAudioParam(1) }); }
  createOscillator() { return makeAudioNode({ type: 'sine', frequency: makeAudioParam(440), start() {}, stop() {} }); }
  createBufferSource() { return makeAudioNode({ buffer: null, loop: false, start() {}, stop() {} }); }
  createBiquadFilter() { return makeAudioNode({ type: 'lowpass', frequency: makeAudioParam(350), Q: makeAudioParam(1) }); }
  createBuffer(numCh, len, rate) {
    const data = new Float32Array(len);
    return { numberOfChannels: numCh, length: len, sampleRate: rate, getChannelData() { return data; } };
  }
  resume() { return Promise.resolve(); }
  suspend() { return Promise.resolve(); }
  close() { return Promise.resolve(); }
}
windowMock.AudioContext = MockAudioContext;
windowMock.webkitAudioContext = MockAudioContext;

// ---------------------------------------------------------------------------
// localStorage
// ---------------------------------------------------------------------------
function makeLocalStorage() {
  const store = new Map();
  return {
    getItem(k) { return store.has(k) ? store.get(k) : null; },
    setItem(k, v) { store.set(k, String(v)); },
    removeItem(k) { store.delete(k); },
    clear() { store.clear(); },
  };
}

// ---------------------------------------------------------------------------
// THREE.js réel, WebGLRenderer bouchonné (pas de GPU en headless Node)
// ---------------------------------------------------------------------------
const THREE = require('three');
class StubRenderer {
  constructor(opts) {
    opts = opts || {};
    this.domElement = opts.canvas || makeElement('canvas');
  }
  setPixelRatio() {} setSize() {} render() {} setClearColor() {} dispose() {}
  getSize() { return { width: 0, height: 0 }; }
}
THREE.WebGLRenderer = StubRenderer;

// ---------------------------------------------------------------------------
// Installation des globales avant exécution du jeu
// ---------------------------------------------------------------------------
global.window = windowMock;
global.document = documentMock;
// Node 22 définit déjà `navigator` en global via un getter sans setter :
// une simple affectation lève un TypeError en mode strict, il faut redéfinir
// la propriété entièrement.
Object.defineProperty(global, 'navigator', {
  value: { vibrate() { return true; }, userAgent: 'ValidatorNode/1.0' },
  writable: true, configurable: true, enumerable: true,
});
global.localStorage = makeLocalStorage();
global.requestAnimationFrame = fakeRAF;
global.cancelAnimationFrame = fakeCancelRAF;
global.THREE = THREE;
global.eruda = { init() {} }; // outil de debug, non pertinent pour la validation

// ---------------------------------------------------------------------------
// Extraction des <script> inline (ceux sans src=) + instrumentation des catch
// ---------------------------------------------------------------------------
function extraireScripts(html) {
  const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g;
  const blocs = [];
  let m;
  while ((m = re.exec(html))) blocs.push(m[1]);
  return blocs;
}
function instrumenterCatch(code) {
  // Injecte, au tout début de chaque bloc catch(e){...}, un enregistrement de
  // l'exception dans __CAPTURES__ — le comportement d'origine (le reste du
  // corps du catch) continue de s'exécuter ensuite, inchangé.
  return code.replace(
    /catch\s*\(\s*([A-Za-z_$][\w$]*)\s*\)\s*\{/g,
    (m, name) => `catch(${name}){__CAPTURES__.push({message:(${name}&&${name}.message)||String(${name}),stack:(${name}&&${name}.stack)||''});`
  );
}

console.log('Chargement de index.html...');
const html = fs.readFileSync(INDEX_HTML, 'utf8');
const blocs = extraireScripts(html);
info(blocs.length + ' bloc(s) <script> inline trouvé(s)');
const codeInstrumente = instrumenterCatch(blocs.join('\n;\n'));

let chargementOk = true;
try {
  new vm.Script(codeInstrumente, { filename: 'index.html (scripts inline)' }).runInThisContext();
  ok('Chargement du jeu (construireVille/recalcJoueur/construireJoueur + 1er requestAnimationFrame exécutés en top-level)');
} catch (e) {
  chargementOk = false;
  fail('Exception au chargement : ' + (e && e.stack || e));
}

if (!chargementOk) {
  console.error('\nArrêt : le jeu ne charge même pas, inutile de poursuivre.');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Pont vers les bindings `const`/`let` de premier niveau du jeu (PORTES, INT,
// INTDEFS, scene...) : elles ne sont pas des propriétés de l'objet global
// (contrairement aux `function` déclarées), mais vm.runInThisContext partage
// un seul environnement lexical global entre appels successifs — un second
// script exécuté dans le même contexte peut donc les lire directement.
// ---------------------------------------------------------------------------
try {
  new vm.Script(
    `global.__PORTES__=PORTES; global.__INT__=INT; global.__INTDEFS__=INTDEFS; global.__scene__=scene;`,
    { filename: 'pont-bindings.js' }
  ).runInThisContext();
  ok('Accès établi aux structures internes (PORTES, INT, INTDEFS, scene)');
} catch (e) {
  fail('Impossible d\'accéder aux structures internes du jeu : ' + (e && e.stack || e));
  process.exit(1);
}

const PORTES = global.__PORTES__;
const INT = global.__INT__;
const INTDEFS = global.__INTDEFS__;
const scene = global.__scene__;

// ---------------------------------------------------------------------------
// Vérification : aucune porte de lieu spécial manquante dans PORTES
// ---------------------------------------------------------------------------
console.log('\n--- Portes des 18 salles ---');
const idsAttendus = Object.keys(INTDEFS);
const idsPresents = new Set(PORTES.map((p) => p.id));
info(idsAttendus.length + ' salles définies dans INTDEFS, ' + PORTES.length + ' portes posées dans PORTES');
const manquantes = idsAttendus.filter((id) => !idsPresents.has(id));
if (manquantes.length) fail('Portes manquantes pour : ' + manquantes.join(', '));
else ok('Toutes les salles ont une porte dans PORTES');

// ---------------------------------------------------------------------------
// Vérification : aucun bâtiment invisible (finaliserMerge appelé)
// ---------------------------------------------------------------------------
console.log('\n--- Fusion des géométries (finaliserMerge) ---');
info('scene.children.length = ' + scene.children.length);
if (scene.children.length < 50) fail('La scène contient étonnamment peu d\'objets (' + scene.children.length + ') : le merge a-t-il vraiment eu lieu ?');
else ok('La scène contient un nombre d\'objets cohérent avec une ville fusionnée');

// ---------------------------------------------------------------------------
// Quelques centaines de frames de boucle()
// ---------------------------------------------------------------------------
console.log('\n--- Boucle principale ---');
let t = performance.now();
let frames = 0;
for (let i = 0; i < NB_FRAMES; i++) {
  t += DT_FRAME_MS;
  if (pumpFrame(t)) frames++;
}
info(frames + ' frames pompées');
if (frames < NB_FRAMES * 0.95) fail('La boucle s\'est arrêtée de se replanifier avant la fin (requestAnimationFrame non rappelé, ' + frames + '/' + NB_FRAMES + ')');
else ok(NB_FRAMES + ' frames de boucle() exécutées sans interruption');

// ---------------------------------------------------------------------------
// Bonus : construction forcée des 18 salles (entrée/sortie), pour exercer
// construireSalle() — exactement le code qui bâtit la géométrie des intérieurs,
// donc directement pertinent pour « aucun bâtiment invisible ».
// ---------------------------------------------------------------------------
console.log('\n--- Construction des 18 salles ---');
let sallesOk = 0;
for (const porte of PORTES) {
  try {
    global.entrerInterieur(porte.id, porte);
    t += DT_FRAME_MS; pumpFrame(t);
    if (INT.actif) { global.sortirInterieur(); sallesOk++; }
    else fail('entrerInterieur(' + porte.id + ') n\'a pas activé INT.actif');
  } catch (e) {
    fail('Salle "' + porte.id + '" : exception — ' + (e && e.stack || e));
  }
}
ok(sallesOk + '/' + PORTES.length + ' salles construites et quittées sans exception');

// ---------------------------------------------------------------------------
// Exceptions avalées par un try/catch du jeu
// ---------------------------------------------------------------------------
console.log('\n--- Exceptions avalées par un try/catch du jeu ---');
if (CAPTURES.length) {
  fail(CAPTURES.length + ' exception(s) silencieusement avalée(s) pendant la run :');
  const vues = new Set();
  for (const c of CAPTURES) {
    const cle = c.message;
    if (vues.has(cle)) continue;
    vues.add(cle);
    console.error('    - ' + c.message);
  }
} else {
  ok('Aucune exception avalée par un try/catch du jeu');
}

// ---------------------------------------------------------------------------
// Exceptions non rattrapées
// ---------------------------------------------------------------------------
console.log('\n--- Exceptions non rattrapées ---');
if (ERREURS.length) {
  fail(ERREURS.length + ' exception(s) non rattrapée(s) :');
  for (const e of ERREURS) console.error('    - ' + ((e && e.stack) || String(e)));
} else {
  ok('Aucune exception non rattrapée');
}

// ---------------------------------------------------------------------------
// Bilan
// ---------------------------------------------------------------------------
console.log('\n' + '='.repeat(60));
if (echecs) {
  console.error(echecs + ' vérification(s) en échec.');
  process.exit(1);
} else {
  console.log('Toutes les vérifications sont passées.');
  process.exit(0);
}
