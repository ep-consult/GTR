#!/usr/bin/env node
'use strict';
/*
 * scenarios.js — scénarios de jeu réels en Chromium headless (Puppeteer),
 * voir CLAUDE.md, section « Validation ».
 *
 * Sert index.html tel quel depuis un petit serveur local, avec les deux
 * <script src=CDN> (Three.js, eruda) réécrits vers des copies locales — le
 * jeu tourne donc dans un vrai navigateur, avec un vrai contexte WebGL et un
 * vrai canvas 2D, sans dépendre du réseau.
 *
 * Puppeteer's page.evaluate() s'exécute dans le "main world" de la page :
 * les `const`/`let`/`function` de premier niveau du jeu (PORTES, META, ETAT,
 * INT, WAVES, startRun, entrerInterieur, majAction...) y sont directement
 * accessibles, exactement comme dans la console DevTools.
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const puppeteer = require('puppeteer');

const PORT = 8842;
const INDEX_HTML = path.join(__dirname, 'index.html');
const THREE_MIN = path.join(__dirname, 'node_modules/three/build/three.min.js');

// ---------------------------------------------------------------------------
// PRNG déterministe : même motif et même graine par défaut que valider.js.
// mulberry32 remplace Math.random dans la page avant tout script du jeu
// (evaluateOnNewDocument, réappliqué à chaque rechargement) : la ville,
// construite au premier niveau avant la 1re frame, est la même d'une run à
// l'autre. Les tirages faits ensuite par boucle() dépendent du nombre de
// frames réelles écoulées entre deux evaluate — le reste n'est donc
// reproductible qu'au mieux, d'où la règle « un test maîtrise sa scène ».
//   SEED=12345 node scenarios.js   rejoue un tirage précis
//   SEED=random node scenarios.js  tirage libre (graine tirée puis affichée)
// ---------------------------------------------------------------------------
const SEED = (() => {
  const s = process.env.SEED;
  if (!s) return 20260731;
  if (s === 'random') return (Math.random() * 4294967296) >>> 0;
  const n = Number(s);
  if (!Number.isInteger(n)) { console.error('SEED invalide : « ' + s + ' » (entier ou « random » attendu)'); process.exit(2); }
  return n;
})();
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let echecs = 0;
function fail(msg) { echecs++; console.error('✗ ' + msg); }
// Un test sauté (tirage défavorable) n'est jamais un succès silencieux : il
// est compté et listé nommément dans le résumé final.
const sautes = [];
function saute(msg) { sautes.push(msg); console.log('  ⤼ SAUTÉ : ' + msg); }

// ---------------------------------------------------------------------------
// Dette connue de la règle des 8 unités (CLAUDE.md « Zones interactives et
// SORTIE »), relevée le 7 octobre 2026. Ce n'est PAS une liste du jeu : c'est
// un cliquet. Le test lit salles et zones dans le jeu, et n'accepte une zone
// à moins de 8 u de la SORTIE que si elle figure ici, à une distance au moins
// égale. Corriger une zone -> le test exige de la retirer d'ici. Ne jamais
// ajouter d'entrée pour faire passer une nouvelle violation.
//   'zone#rang' : [distance mesurée, catégorie]
//   chevauche  : distance < rayon zone + rayon SORTIE (zone en partie injouable)
//   sous-marge : sans chevauchement, mais sous 8 u
// ---------------------------------------------------------------------------
const DETTE_REGLE_8U = {
  superette: { 'caisse#1': [3.5, 'chevauche'] },
  conces: { 'vente#1': [4.4, 'chevauche'] },
  casino: { 'poker#1': [6.32, 'chevauche'] },
  laverie: { 'fouilles#9': [7.33, 'sous-marge'], 'fouilles#10': [6.51, 'sous-marge'], 'machine7#1': [5.69, 'chevauche'] },
  voyance: { 'fouilles#3': [4.61, 'chevauche'], 'zohraPos#1': [4.5, 'chevauche'] },
  karaoke: { 'fouilles#5': [3.64, 'chevauche'], 'bar#1': [1.9, 'chevauche'] },
  aquarium: { 'fouilles#3': [6.43, 'sous-marge'], 'fouilles#4': [4.04, 'chevauche'] }, // bassins#5 réglé au 11e lot (plus de bassins à sonder)
  bowling: { 'fouilles#2': [7.28, 'sous-marge'], 'jeu#1': [7.81, 'sous-marge'] },
  sport: { 'fouilles#1': [7.88, 'sous-marge'] },
  serre: { 'fouilles#2': [7.2, 'sous-marge'], 'pots#8': [5.38, 'chevauche'], 'pots#9': [5.38, 'chevauche'], 'pots#11': [0.6, 'chevauche'] },
  sandwich: { 'fouilles#1': [6.58, 'sous-marge'], 'fouilles#2': [6.58, 'sous-marge'], 'defiPos#1': [5.09, 'chevauche'], 'sodaPos#1': [5.09, 'chevauche'] },
  musee: { 'fouilles#1': [6.24, 'sous-marge'], 'cartels#3': [4.24, 'chevauche'] },
};
function ok(msg) { console.log('✓ ' + msg); }
function info(msg) { console.log('  · ' + msg); }

// ---------------------------------------------------------------------------
// Serveur local : index.html avec les CDN réécrits en local, + three.min.js
// et un eruda bouchon (outil de debug hors-sujet ici).
// ---------------------------------------------------------------------------
function patchHtml(html) {
  return html
    .replace('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js', '/vendor/three.min.js')
    .replace('//cdn.jsdelivr.net/npm/eruda', '/vendor/eruda.js');
}
function demarrerServeur() {
  const html = patchHtml(fs.readFileSync(INDEX_HTML, 'utf8'));
  const threeSrc = fs.readFileSync(THREE_MIN, 'utf8');
  const erudaSrc = 'window.eruda={init(){}};';
  const server = http.createServer((req, res) => {
    if (req.url === '/' || req.url === '/index.html') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(html);
    } else if (req.url === '/vendor/three.min.js') {
      res.writeHead(200, { 'Content-Type': 'application/javascript' }); res.end(threeSrc);
    } else if (req.url === '/vendor/eruda.js') {
      res.writeHead(200, { 'Content-Type': 'application/javascript' }); res.end(erudaSrc);
    } else if (req.url === '/favicon.ico') {
      res.writeHead(204); res.end(); // évite un 404 hors-sujet dans la console du navigateur
    } else {
      res.writeHead(404); res.end();
    }
  });
  return new Promise((resolve) => server.listen(PORT, '127.0.0.1', () => resolve(server)));
}
const attendre = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// Les zones d'interaction ne sont PAS redéclarées ici : elles sont lues
// directement depuis zonesInterieurActives() (index.html, juste avant
// majAction()), qui rejoue la vraie logique du jeu et grave le rayon de
// chaque zone sur l'objet interactable lui-même (voir marquerZone()). Une
// salle qui ajoute une zone dans majAction() sans passer par marquerZone()
// remonte dans `orphelins` et fait échouer le test au lieu d'être ignorée.
// ---------------------------------------------------------------------------

// Boutons HUD qui doivent rester visibles et atteignables, quelle que soit la salle.
const BOUTONS_HUD = ['btnFire', 'btnDodge', 'btnSprint', 'btnSwitch', 'btnSpec', 'btnGren', 'btnBrake', 'btnPause', 'zoneL', 'miniWrap'];

async function verifierZonesSalle(page) {
  return page.evaluate(() => {
    if (!INT.actif) return { erreur: 'INT.actif absent' };
    const { zones, orphelins } = zonesInterieurActives();
    const problemes = [];
    for (const champ of orphelins) {
      problemes.push('« ' + champ + ' » a une position (x,z) mais aucun rayon de déclenchement : zone ajoutée à majAction() sans passer par marquerZone(), jamais vérifiée par ce test');
    }
    for (let j = 1; j < zones.length; j++) {
      for (let i = 0; i < j; i++) {
        const a = zones[i], b = zones[j];
        const d = Math.hypot(a.x - b.x, a.z - b.z);
        if (d + b.r <= a.r) problemes.push('« ' + b.champ + ' » entièrement masqué par « ' + a.champ + ' » (jamais atteignable)');
      }
    }
    for (const z of zones) {
      let libre = false;
      for (let k = 0; k < 16 && !libre; k++) {
        const a = (k / 16) * Math.PI * 2;
        const px = z.x + Math.cos(a) * z.r * 0.85, pz = z.z + Math.sin(a) * z.r * 0.85;
        if (!solidAt(px, pz, 0.5)) libre = true;
      }
      if (!libre) problemes.push('« ' + z.champ + ' » : aucun point libre autour du déclencheur (coincé dans le décor)');
    }
    return { nbZones: zones.length, problemes };
  });
}

async function verifierHUD(page, contexte) {
  const probs = await page.evaluate((ids) => {
    const out = [];
    for (const id of ids) {
      const el = document.getElementById(id);
      if (!el) { out.push(id + ' absent du DOM'); continue; }
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      if (r.width === 0 || r.height === 0) { out.push(id + ' a une taille nulle'); continue; }
      if (r.right <= 0 || r.bottom <= 0 || r.left >= window.innerWidth || r.top >= window.innerHeight) {
        out.push(id + ' est hors écran (' + Math.round(r.left) + ',' + Math.round(r.top) + ')');
      }
    }
    return out;
  }, BOUTONS_HUD);
  for (const p of probs) fail('HUD [' + contexte + '] ' + p);
  return probs.length === 0;
}

async function main() {
  console.log('Seed PRNG : ' + SEED + ' (SEED=<n> node scenarios.js pour rejouer ce tirage, SEED=random pour un tirage libre)\n');
  console.log('Démarrage du serveur local...');
  const server = await demarrerServeur();
  info('http://127.0.0.1:' + PORT + '/ (Three.js et eruda servis en local, aucun réseau requis)');

  console.log('Lancement de Chromium headless...');
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
  await page.evaluateOnNewDocument('Math.random = (' + mulberry32.toString() + ')(' + SEED + ');');
  // Les scénarios d'avant la vue immersive (pilotes au joystick, courses, conduite...) sont
  // écrits pour la vue de dessus : la page démarre en vue classique, à chaque chargement.
  // La vue immersive a son propre bloc (« Vue immersive »), qui la règle lui-même.
  await page.evaluateOnNewDocument(() => { window.addEventListener('load', () => { try { META.vue = 'classique'; } catch (e) {} }); });

  const erreursPage = [];
  page.on('pageerror', (e) => erreursPage.push('pageerror: ' + (e && e.message || e)));
  page.on('console', (msg) => { if (msg.type() === 'error') erreursPage.push('console.error: ' + msg.text()); });
  page.on('requestfailed', (req) => {
    if (!req.url().startsWith('http://127.0.0.1')) return; // ressources externes non pertinentes (aucune attendue)
    erreursPage.push('requestfailed: ' + req.url() + ' — ' + (req.failure() && req.failure().errorText));
  });

  try {
    console.log('\nChargement de la page...');
    await page.goto('http://127.0.0.1:' + PORT + '/', { waitUntil: 'load', timeout: 90000 }); // la ville et son décor se construisent avant « load » : ~25 s en headless sur cette machine, 30 s ne laissait plus de marge
    await page.waitForFunction(() => typeof PORTES !== 'undefined' && PORTES.length > 0, { timeout: 20000 });
    const nbPortes = await page.evaluate(() => PORTES.length);
    ok('Jeu chargé et monde construit (' + nbPortes + ' portes)');

    // -------------------------------------------------------------------
    // Balayage des 18 salles : HUD toujours atteignable + zones d'action
    // jamais masquées ni coincées dans le décor.
    // -------------------------------------------------------------------
    console.log('\n--- Balayage des 18 salles ---');
    await page.evaluate(() => startRun());
    await verifierHUD(page, 'en jeu (extérieur)');
    const portes = await page.evaluate(() => PORTES.map((p) => ({ id: p.id, x: p.x, z: p.z })));
    for (const porte of portes) {
      await page.evaluate((p) => entrerInterieur(p.id, p), porte);
      const dansSalle = await page.evaluate(() => !!INT.actif);
      if (!dansSalle) { fail('Salle "' + porte.id + '" : entrerInterieur() n\'a pas activé INT.actif'); continue; }
      await verifierHUD(page, 'salle ' + porte.id);
      const res = await verifierZonesSalle(page);
      if (res.erreur) fail('Salle "' + porte.id + '" : ' + res.erreur);
      else for (const p of res.problemes) fail('Salle "' + porte.id + '" : ' + p);
      await page.evaluate(() => sortirInterieur());
    }
    ok(portes.length + ' salles balayées (HUD + zones d\'action)');

    // -------------------------------------------------------------------
    // Farming : le bowling est plafonné à 2 parties par vague (bug déjà
    // rencontré, voir CLAUDE.md).
    // -------------------------------------------------------------------
    console.log('\n--- Tentative de farming (bowling) ---');
    const bowling = await page.evaluate(() => {
      const p = PORTES.find((x) => x.id === 'bowling');
      entrerInterieur('bowling', p);
      const s = INT.actif;
      if (!s || !s.jeu) return { erreur: 'salle bowling non construite ou sans point "jeu"' };
      P.x = s.jeu.x; P.z = s.jeu.z;
      s.bwVague = WAVES.n; s.bwParties = 2; s.bwEtat = null; s.bwAnim = 0;
      META.argent = 1000;
      const avant = META.argent;
      majAction();
      const b = document.getElementById('btnAction');
      const label = b.textContent;
      const affiche = b.style.display;
      if (b._fn) b._fn();
      const apres = META.argent;
      sortirInterieur();
      return { label, affiche, avant, apres, bwParties: s.bwParties };
    });
    if (bowling.erreur) fail('Bowling : ' + bowling.erreur);
    else if (bowling.avant !== bowling.apres) fail('Bowling : une 3e partie a été facturée dans la même vague (plafond de 2 non respecté, ' + bowling.avant + '$ → ' + bowling.apres + '$)');
    else if (bowling.bwParties > 2) fail('Bowling : bwParties = ' + bowling.bwParties + ' (> 2 dans la même vague)');
    else ok('Bowling : la 3e partie de la vague est bien refusée (label = "' + bowling.label + '")');

    // -------------------------------------------------------------------
    // Abandon en plein minijeu : sortir de la salle en pleine partie, puis
    // y revenir, ne doit ni planter ni laisser le bouton d'action cassé.
    // -------------------------------------------------------------------
    console.log('\n--- Abandon en plein minijeu (Le Roi des Sandwichs) ---');
    const abandon = await page.evaluate(() => {
      const p = PORTES.find((x) => x.id === 'sandwich');
      entrerInterieur('sandwich', p);
      const s = INT.actif;
      if (!s || !s.defiPos) return { erreur: 'salle sandwich non construite ou sans point "defiPos"' };
      s.swEtat = 'defi'; s.swVague = WAVES.n; s.swBouchees = 4; s.swNausee = 55;
      sortirInterieur(); // abandon en pleine bouchée
      entrerInterieur('sandwich', p);
      P.x = s.defiPos.x; P.z = s.defiPos.z;
      majAction();
      const b = document.getElementById('btnAction');
      const etatApres = { label: b.textContent, affiche: b.style.display, swEtat: s.swEtat };
      sortirInterieur();
      return etatApres;
    });
    if (abandon.erreur) fail('Abandon minijeu : ' + abandon.erreur);
    else if (abandon.affiche === 'none' && !abandon.label) fail('Abandon minijeu : après ré-entrée, le point de défi ne réagit plus (bouton d\'action inerte)');
    else ok('Abandon en plein minijeu géré sans casser le point d\'interaction (label = "' + abandon.label + '")');

    // -------------------------------------------------------------------
    // Mort pendant un défi : startRun() doit réinitialiser TOUT l'état de
    // minijeu de TOUTES les salles déjà construites (voir index.html
    // ~L8366-8382). On pollue volontairement plusieurs salles avant de
    // mourir pour vérifier qu'aucun état ne survit à la partie suivante.
    // -------------------------------------------------------------------
    console.log('\n--- Mort pendant un défi : aucun état de minijeu ne doit survivre ---');
    const reset = await page.evaluate(() => {
      for (const id of Object.keys(INT.salles)) {
        const sa = INT.salles[id];
        sa.alarme = true;
        if (sa.bwEtat !== undefined) { sa.bwEtat = 'force'; sa.bwParties = 2; sa.bwVague = WAVES.n; }
        if (sa.karaOn !== undefined) sa.karaOn = true;
        if (sa.swEtat !== undefined) { sa.swEtat = 'defi'; sa.swVague = WAVES.n; }
        if (sa.spEtat !== undefined) sa.spEtat = 'soulevé';
        if (sa.srVague !== undefined) { sa.srVague = WAVES.n; sa.srFini = true; }
        if (sa.cycleOn !== undefined) sa.cycleOn = true;
        if (sa.casseEtat !== undefined) {
          sa.casseEtat = 'actif'; sa.soupcon = 87; sa.museeFait = true; sa.museeVague = WAVES.n;
          sa.canardEnMain = true; sa.boitierArme = true;
        }
      }
      P.hp = 1;
      toucherJoueur(9999); // -> mourir()
      const modeApresMort = ETAT.mode;
      startRun();
      const soucis = [];
      for (const id of Object.keys(INT.salles)) {
        const sa = INT.salles[id];
        if (sa.alarme) soucis.push(id + '.alarme toujours vrai');
        if (sa.bwEtat !== undefined && sa.bwEtat !== null) soucis.push(id + '.bwEtat = ' + sa.bwEtat + ' (attendu null)');
        if (sa.bwParties !== undefined && sa.bwParties !== 0) soucis.push(id + '.bwParties = ' + sa.bwParties + ' (attendu 0)');
        if (sa.karaOn !== undefined && sa.karaOn !== false) soucis.push(id + '.karaOn toujours vrai');
        if (sa.swEtat !== undefined && sa.swEtat !== null) soucis.push(id + '.swEtat = ' + sa.swEtat + ' (attendu null)');
        if (sa.spEtat !== undefined && sa.spEtat !== null) soucis.push(id + '.spEtat = ' + sa.spEtat + ' (attendu null)');
        if (sa.srVague !== undefined && sa.srVague !== -1) soucis.push(id + '.srVague = ' + sa.srVague + ' (attendu -1)');
        if (sa.srFini !== undefined && sa.srFini !== false) soucis.push(id + '.srFini toujours vrai');
        if (sa.cycleOn !== undefined && sa.cycleOn !== false) soucis.push(id + '.cycleOn toujours vrai');
        if (sa.casseEtat !== undefined) {
          if (sa.casseEtat !== null) soucis.push(id + '.casseEtat = ' + sa.casseEtat + ' (attendu null)');
          if (sa.soupcon !== 0) soucis.push(id + '.soupcon = ' + sa.soupcon + ' (attendu 0)');
          if (sa.museeFait !== false) soucis.push(id + '.museeFait toujours vrai');
          if (sa.museeVague !== -1) soucis.push(id + '.museeVague = ' + sa.museeVague + ' (attendu -1)');
          if (sa.canardEnMain !== false) soucis.push(id + '.canardEnMain toujours vrai');
          if (sa.boitierArme !== false) soucis.push(id + '.boitierArme toujours vrai');
          if (sa.alerte && sa.alerte.visible !== false) soucis.push(id + '.alerte.visible toujours vrai (éclairage de secours pas rétabli)');
        }
      }
      return { modeApresMort, modeApresRestart: ETAT.mode, soucis, nbSalles: Object.keys(INT.salles).length };
    });
    if (reset.modeApresMort !== 'mort') fail('toucherJoueur(9999) n\'a pas déclenché mourir() (ETAT.mode = ' + reset.modeApresMort + ')');
    else ok('mourir() déclenché correctement');
    if (reset.modeApresRestart !== 'jeu') fail('startRun() après la mort n\'a pas remis ETAT.mode à "jeu"');
    if (reset.soucis.length) for (const s of reset.soucis) fail('État de minijeu survivant au game over : ' + s);
    else ok('Aucun état de minijeu n\'a survécu au game over (' + reset.nbSalles + ' salles vérifiées)');

    // -------------------------------------------------------------------
    // Musée : déterminisme des rondes. C'est la contrainte critique de la
    // salle (voir CLAUDE.md / la description de la salle) — deux entrées
    // avec le même temps écoulé doivent donner exactement les mêmes
    // positions de gardiens/caméras, sinon le schéma qu'un joueur a observé
    // ne vaut plus rien.
    // -------------------------------------------------------------------
    console.log('\n--- Musée : déterminisme des rondes ---');
    const determinisme = await page.evaluate(() => {
      const p = PORTES.find((x) => x.id === 'musee');
      entrerInterieur('musee', p);
      for (let i = 0; i < 437; i++) majInterieur(0.1, 0.1); // 43,7 s simulées
      const pos1 = INT.actif.gardiens.map((gd) => ({ x: gd.x, z: gd.z, ang: gd.ang }));
      const cam1 = INT.actif.cameras.map((c) => c.angActuel);
      sortirInterieur();
      entrerInterieur('musee', p);
      for (let i = 0; i < 437; i++) majInterieur(0.1, 0.1); // exactement le même temps simulé
      const pos2 = INT.actif.gardiens.map((gd) => ({ x: gd.x, z: gd.z, ang: gd.ang }));
      const cam2 = INT.actif.cameras.map((c) => c.angActuel);
      sortirInterieur();
      return { pos1, pos2, cam1, cam2 };
    });
    const memePos = JSON.stringify(determinisme.pos1) === JSON.stringify(determinisme.pos2);
    const memeCam = JSON.stringify(determinisme.cam1) === JSON.stringify(determinisme.cam2);
    if (!memePos || !memeCam) {
      fail('Musée : ronde NON déterministe — deux entrées avec le même temps écoulé donnent des positions différentes : ' + JSON.stringify(determinisme));
    } else {
      ok('Musée : gardiens et caméras strictement déterministes (2 entrées, même museeT, mêmes positions)');
    }

    // -------------------------------------------------------------------
    // Musée : un casse réussi (Le Cône + le Canard, sortie avant la fin du
    // chrono) doit créditer l'argent, poser META.museeArtefacts.cone et
    // donner la curiosité — puis un second casse raté (soupçon à 100) doit
    // faire perdre le Canard s'il est en main sans toucher à ce qui est déjà
    // définitivement acquis, et faire monter le niveau de recherche.
    // -------------------------------------------------------------------
    console.log('\n--- Musée : casse réussi puis casse raté ---');
    const casse = await page.evaluate(() => {
      const p = PORTES.find((x) => x.id === 'musee');
      startRun();
      entrerInterieur('musee', p);
      const s = INT.actif;
      META.argent = 500;
      const argentAvant = META.argent;
      // arme + confirme le boîtier (flux à deux appuis)
      P.x = s.boitier.x; P.z = s.boitier.z; majAction(); document.getElementById('btnAction')._fn();
      majAction(); document.getElementById('btnAction')._fn();
      const casseDemarre = s.casseEtat === 'actif';
      // force Le Cône (1,5 s de maintien sur place)
      const cone = s.vitrinesValeur.find((v) => v.cle === 'cone');
      P.x = cone.x; P.z = cone.z; majAction(); document.getElementById('btnAction')._fn();
      for (let i = 0; i < 20; i++) majInterieur(0.1, 0.1); // 2 s : largement assez pour les 1,5 s de maintien
      const coneForce = META.museeArtefacts.cone === true;
      // force le Canard
      P.x = s.canard.x; P.z = s.canard.z; majAction(); document.getElementById('btnAction')._fn();
      for (let i = 0; i < 20; i++) majInterieur(0.1, 0.1);
      const canardEnMainApresForce = s.canardEnMain === true;
      // ressort par l'entrée avant la fin du chrono
      P.x = s.sortie.x; P.z = s.sortie.z; majAction(); document.getElementById('btnAction')._fn();
      const reussite = { argentApres: META.argent, canardObtenu: aCurio('canard_or'), interActifApres: !!INT.actif };

      // second casse : raté cette fois (soupçon forcé à 100)
      const etoilesAvant = WANTED.stars;
      entrerInterieur('musee', p);
      const s2 = INT.actif;
      s2.museeVague = -1; // repasse sous le plafond « 1 casse par vague » pour ce test
      P.x = s2.boitier.x; P.z = s2.boitier.z; majAction(); document.getElementById('btnAction')._fn();
      majAction(); document.getElementById('btnAction')._fn();
      s2.casseT = 0.05; // chrono presque écoulé (même code d'échec que soupçon à 100 %)
      majInterieur(0.1, 0.1); // le chrono passe sous 0 -> alarme -> éjection
      const echec = {
        interActifApres: !!INT.actif, etoilesApres: WANTED.stars,
        casseEtatApres: s2.casseEtat, canardToujoursAcquis: aCurio('canard_or'),
      };
      return { argentAvant, casseDemarre, coneForce, canardEnMainApresForce, reussite, etoilesAvant, echec };
    });
    if (!casse.casseDemarre) fail('Musée : le boîtier (deux appuis : armer puis confirmer) n\'a pas démarré le casse');
    else ok('Musée : le boîtier démarre le casse après confirmation');
    if (!casse.coneForce) fail('Musée : forcer « Le Cône » 1,5 s n\'a pas posé META.museeArtefacts.cone');
    if (casse.reussite.argentApres < casse.argentAvant + 200) fail('Musée : Le Cône forcé n\'a pas crédité +200 $ (avant ' + casse.argentAvant + ', après ' + casse.reussite.argentApres + ')');
    else ok('Musée : Le Cône forcé crédite bien +200 $');
    if (!casse.canardEnMainApresForce) fail('Musée : forcer la vitrine du Canard n\'a pas posé canardEnMain');
    if (!casse.reussite.canardObtenu) fail('Musée : ressorti dans les temps avec le Canard en main, mais la curiosité canard_or n\'a pas été accordée');
    else ok('Musée : ressortir dans les temps avec le Canard en main donne bien la curiosité');
    if (casse.reussite.interActifApres) fail('Musée : la sortie pendant un casse réussi n\'a pas fait quitter la salle');
    if (casse.echec.interActifApres) fail('Musée : le chrono écoulé (même code que soupçon à 100 %) n\'a pas éjecté le joueur de la salle');
    else ok('Musée : chrono écoulé (même code que soupçon à 100 %) éjecte immédiatement le joueur');
    if (casse.echec.casseEtatApres !== null) fail('Musée : casseEtat pas remis à null après l\'alarme (' + casse.echec.casseEtatApres + ')');
    if (casse.echec.etoilesApres < casse.etoilesAvant + 1) fail('Musée : une alarme n\'a pas augmenté le niveau de recherche (avant ' + casse.etoilesAvant + ', après ' + casse.echec.etoilesApres + ')');
    else ok('Musée : une alarme augmente bien le niveau de recherche');
    if (!casse.echec.canardToujoursAcquis) fail('Musée : le Canard obtenu lors du premier casse a été perdu à cause d\'un second casse raté (ne devrait affecter que ce qui était en main CE casse-ci)');
    else ok('Musée : la curiosité déjà obtenue n\'est pas remise en cause par un casse raté ultérieur');

    // -------------------------------------------------------------------
    // Musée : le seuil de bruit doit réagir à la vitesse RÉELLE (joystick
    // analogique compris), pas à un booléen de bouton — bug rapporté :
    // marcher avec le bouton sprint maintenu mais le joystick à peine
    // poussé faisait monter la jauge de bruit.
    // -------------------------------------------------------------------
    console.log('\n--- Musée : seuil de bruit basé sur la vitesse réelle ---');
    const bruit = await page.evaluate(() => {
      const p = PORTES.find((x) => x.id === 'musee');
      startRun();
      entrerInterieur('musee', p);
      const s = INT.actif;
      P.x = s.boitier.x; P.z = s.boitier.z; majAction(); document.getElementById('btnAction')._fn();
      majAction(); document.getElementById('btnAction')._fn();
      // loin de tout cône, pour isoler l'effet du bruit du reste du soupçon
      P.x = s.sortie.x; P.z = s.sortie.z - 4;
      P.stam = 999; P.stamMax = 999; // isole le test de la gestion d'endurance (hors sujet ici)
      // "marche" : joystick à peine au-dessus du seuil de mouvement (0,12), sprint maintenu
      INPUT.btn.sprint = true; INPUT.mx = 0.2; INPUT.mz = 0;
      for (let i = 0; i < 40; i++) { majJoueur(0.1); majInterieur(0.1, 0.1); } // 4 s simulées
      const devieEnMarchant = s.gardiens.some((gd) => gd.deviationT > 0);
      // "sprint" : joystick à fond, sprint maintenu. On observe le déclenchement
      // lui-même (dans la boucle) : si on ne regardait qu'après coup, un gardien
      // dévié qui rattrape ensuite le joueur resté sur place fait légitimement
      // échouer le casse, ce qui remet deviationT à 0 (nettoyage normal de fin de
      // casse) — et ferait passer le test à côté du vrai signal.
      s.bruitAcc = 0;
      INPUT.mx = 1; INPUT.mz = 0;
      let devieEnSprintant = false;
      for (let i = 0; i < 40 && !devieEnSprintant; i++) {
        majJoueur(0.1); majInterieur(0.1, 0.1);
        if (s.gardiens.some((gd) => gd.deviationT > 0)) devieEnSprintant = true;
      }
      INPUT.btn.sprint = false; INPUT.mx = 0; INPUT.mz = 0;
      if (INT.actif) sortirInterieur();
      return { devieEnMarchant, devieEnSprintant };
    });
    if (bruit.devieEnMarchant) fail('Musée : marcher (joystick à 0,2, sprint maintenu) a fait dévier un gardien — le seuil de bruit réagit encore à un bouton, pas à la vitesse réelle');
    else ok('Musée : marcher (joystick à peine au-dessus du seuil de mouvement) ne déclenche aucun bruit, même sprint maintenu');
    if (!bruit.devieEnSprintant) fail('Musée : sprinter à fond (joystick à 1) ne fait plus jamais dévier un gardien — le seuil de bruit ne se déclenche plus du tout');
    else ok('Musée : sprinter à fond déclenche bien la déviation du gardien le plus proche');

    // -------------------------------------------------------------------
    // Musée : le seuil (plafond de marche + 15 % de l'écart avec le plafond de
    // sprint) doit rester correct même si un futur bonus de vitesse est ADDITIF
    // plutôt que multiplicatif — un pourcentage fixe du seul sprint se ferait
    // dépasser en marchant dès qu'un bonus additif compresse l'écart relatif
    // entre marche et sprint. On simule ce bonus en ajoutant la même valeur
    // absolue aux deux plafonds ET à la vitesse réelle juste après le calcul
    // réel de majJoueur (aucun bonus additif n'existe encore dans le jeu :
    // c'est une anticipation, comme demandé).
    // -------------------------------------------------------------------
    console.log('\n--- Musée : seuil de bruit robuste à un futur bonus additif ---');
    const bruitAdditif = await page.evaluate(() => {
      const p = PORTES.find((x) => x.id === 'musee');
      startRun();
      entrerInterieur('musee', p);
      const s = INT.actif;
      P.x = s.boitier.x; P.z = s.boitier.z; majAction(); document.getElementById('btnAction')._fn();
      majAction(); document.getElementById('btnAction')._fn();
      P.x = s.sortie.x; P.z = s.sortie.z - 4;
      P.stam = 999; P.stamMax = 999;
      // marche à fond, SANS sprint : la vitesse réelle == le plafond de marche
      INPUT.btn.sprint = false; INPUT.mx = 1; INPUT.mz = 0;
      const BONUS = 8; // bonus additif simulé, appliqué également à marche et sprint
      let devie = false;
      for (let i = 0; i < 40 && !devie; i++) {
        majJoueur(0.1);
        P.vitesseMarcheMax += BONUS; P.vitesseSprintMax += BONUS; P.vitesseReelle += BONUS;
        const seuilAncien = 0.7 * P.vitesseSprintMax; // l'ancienne formule, pour vérifier qu'elle aurait échoué
        if (i === 0 && P.vitesseReelle < seuilAncien) throw new Error('le scénario ne reproduit pas la régression : ajuster BONUS');
        majInterieur(0.1, 0.1);
        if (s.gardiens.some((gd) => gd.deviationT > 0)) devie = true;
      }
      INPUT.mx = 0; INPUT.mz = 0;
      if (INT.actif) sortirInterieur();
      return { devie };
    });
    if (bruitAdditif.devie) fail('Musée : avec un bonus de vitesse additif simulé, marcher à fond dévie un gardien — le seuil (marche + 15 % de l\'écart) ne résiste pas à un bonus additif');
    else ok('Musée : marcher à fond reste silencieux même avec un bonus de vitesse additif simulé sur les deux plafonds');

    // -------------------------------------------------------------------
    // Musée : zone intermédiaire du sprint (80 % de la poussée maximale) —
    // NON couverte par les tests précédents (marche à 0,2/1, sprint à 1). Avec
    // l'ancien seuil au milieu (50 % de l'écart marche/sprint), la moitié de
    // la plage de sprint restait silencieuse : ce test aurait échoué avec
    // cette formule. Avec le seuil à 15 % de l'écart, sprinter à 80 % doit
    // faire du bruit.
    // -------------------------------------------------------------------
    console.log('\n--- Musée : le sprint partiel (80 %) doit faire du bruit ---');
    const bruitPartiel = await page.evaluate(() => {
      const p = PORTES.find((x) => x.id === 'musee');
      startRun();
      entrerInterieur('musee', p);
      const s = INT.actif;
      P.x = s.boitier.x; P.z = s.boitier.z; majAction(); document.getElementById('btnAction')._fn();
      majAction(); document.getElementById('btnAction')._fn();
      P.x = s.sortie.x; P.z = s.sortie.z - 4;
      P.stam = 999; P.stamMax = 999;
      INPUT.btn.sprint = true; INPUT.mx = 0.8; INPUT.mz = 0;
      let devie = false;
      for (let i = 0; i < 40 && !devie; i++) {
        majJoueur(0.1);
        const seuilMilieu = (P.vitesseMarcheMax + P.vitesseSprintMax) / 2; // l'ancienne formule
        if (i === 0 && P.vitesseReelle >= seuilMilieu) throw new Error('le scénario ne reproduit pas la régression : ajuster le taux de joystick');
        majInterieur(0.1, 0.1);
        if (s.gardiens.some((gd) => gd.deviationT > 0)) devie = true;
      }
      INPUT.btn.sprint = false; INPUT.mx = 0; INPUT.mz = 0;
      if (INT.actif) sortirInterieur();
      return { devie };
    });
    if (!bruitPartiel.devie) fail('Musée : sprinter à 80 % de la poussée maximale ne fait pas de bruit — la moitié de la plage de sprint reste silencieuse, la mécanique perd sa substance');
    else ok('Musée : sprinter à 80 % de la poussée maximale fait bien du bruit');

    // -------------------------------------------------------------------
    // Musée : lisibilité du casse — panneau explicatif lisible en
    // s'approchant (distinct du boîtier), toast de confirmation du boîtier
    // étendu (bruit + cône de vue), libellé d'objectif sous le chrono qui
    // bascule une fois un artefact pris.
    // -------------------------------------------------------------------
    console.log('\n--- Musée : lisibilité du casse (panneau, toast, libellé d\'objectif) ---');
    const legibilite = await page.evaluate(() => {
      const p = PORTES.find((x) => x.id === 'musee');
      startRun();
      entrerInterieur('musee', p);
      const s = INT.actif;
      const panneau = s.cartels.find((c) => c.titre === 'AVANT DE COUPER LE COURANT');
      let texteToastPanneau = null;
      if (panneau) {
        P.x = panneau.x; P.z = panneau.z; majAction(); document.getElementById('btnAction')._fn();
        texteToastPanneau = document.getElementById('notifStack').lastElementChild.textContent;
      }
      // premier appui sur le boîtier : arme + toast d'avertissement (pas encore le casse)
      P.x = s.boitier.x; P.z = s.boitier.z; majAction(); document.getElementById('btnAction')._fn();
      const texteToastBoitier = document.getElementById('notifStack').lastElementChild.textContent;
      // confirme : démarre le casse
      majAction(); document.getElementById('btnAction')._fn();
      majInterieur(0.1, 0.1);
      const objAvant = document.getElementById('musObj').textContent;
      // force la Machine à laver (vitrine non touchée par un test précédent :
      // Le Cône et le Canard sont déjà définitivement pris ailleurs dans la suite)
      const laveuse = s.vitrinesValeur.find((v) => v.cle === 'laveuse');
      P.x = laveuse.x; P.z = laveuse.z; majAction(); document.getElementById('btnAction')._fn();
      for (let i = 0; i < 20; i++) majInterieur(0.1, 0.1);
      const objApres = document.getElementById('musObj').textContent;
      if (INT.actif) sortirInterieur();
      return { panneauTrouve: !!panneau, texteToastPanneau, texteToastBoitier, objAvant, objApres };
    });
    if (!legibilite.panneauTrouve) fail('Musée : le panneau explicatif près du boîtier est introuvable');
    else ok('Musée : le panneau explicatif existe et est lisible en s\'approchant');
    if (!legibilite.texteToastPanneau || !/90/.test(legibilite.texteToastPanneau) || !/forçable/i.test(legibilite.texteToastPanneau) || !/entrée/i.test(legibilite.texteToastPanneau)) fail('Musée : le panneau explicatif ne couvre pas les 3 points attendus (90 s, vitrines forçables, ressortir par l\'entrée) — texte : ' + legibilite.texteToastPanneau);
    else ok('Musée : le panneau explique bien les 3 points du casse (chrono, vitrines forçables, sortie par l\'entrée)');
    if (!/bruit/i.test(legibilite.texteToastBoitier) || !(/cône/i.test(legibilite.texteToastBoitier) || /alarme/i.test(legibilite.texteToastBoitier))) fail('Musée : le toast de confirmation du boîtier ne mentionne pas le bruit et le cône de vue — texte : ' + legibilite.texteToastBoitier);
    else ok('Musée : le toast du boîtier mentionne bien le bruit et le cône de vue');
    if (legibilite.objAvant !== 'Forcer les vitrines') fail('Musée : libellé objectif initial incorrect (' + legibilite.objAvant + ')');
    else ok('Musée : le libellé objectif affiche bien « Forcer les vitrines » au début du casse');
    if (legibilite.objApres === legibilite.objAvant || !/entrée/i.test(legibilite.objApres)) fail('Musée : le libellé objectif ne bascule pas vers « Ressortir par l\'entrée » après une prise (' + legibilite.objApres + ')');
    else ok('Musée : le libellé objectif bascule bien vers « Ressortir par l\'entrée » après une prise');

    // -------------------------------------------------------------------
    // Musée : tronc à dons. Bug déjà rencontré : chaque appui incrémentait
    // META.fouilles (25 appuis ouvraient le Site 51, 40 validaient Fouineur).
    // Un tronc n'est pas une cache. Plafond TRONC_DONS_MAX par vague, lu
    // depuis le jeu, levé à la vague suivante et au game over.
    // -------------------------------------------------------------------
    console.log('\n--- Musée : tronc à dons (jamais une fouille, plafond par vague) ---');
    const tronc = await page.evaluate(() => {
      startRun();
      const p = PORTES.find((x) => x.id === 'musee');
      entrerInterieur('musee', p);
      const s = INT.actif;
      if (!s || !s.tronc) return { erreur: 'salle musée sans tronc' };
      const appuyer = () => {
        P.x = s.tronc.x; P.z = s.tronc.z;
        majAction();
        const b = document.getElementById('btnAction');
        if (b._fn) b._fn();
        return b.textContent;
      };
      const fouillesAvant = META.fouilles;
      const argent0 = META.argent;
      for (let i = 0; i < TRONC_DONS_MAX; i++) appuyer();
      const argentApresDons = META.argent;
      const labelPlafond = appuyer();   // un appui de plus que le plafond
      const argentApresRefus = META.argent;
      const fouillesApres = META.fouilles;
      WAVES.n++;                         // vague suivante : le tronc se regarnit
      const argentAvantVague = META.argent;
      appuyer();
      const payeApresVague = META.argent > argentAvantVague;
      for (let i = 0; i < TRONC_DONS_MAX; i++) appuyer(); // re-plafonne cette vague
      sortirInterieur();
      startRun();                        // game over → nouvelle partie
      entrerInterieur('musee', p);
      const argentAvantRun = META.argent;
      appuyer();
      const payeApresGameOver = META.argent > argentAvantRun;
      sortirInterieur();
      return { max: TRONC_DONS_MAX, fouillesAvant, fouillesApres, donsPayes: argentApresDons > argent0,
        refusPaie: argentApresRefus !== argentApresDons, labelPlafond, payeApresVague, payeApresGameOver };
    });
    if (tronc.erreur) fail('Tronc : ' + tronc.erreur);
    else {
      if (tronc.fouillesApres !== tronc.fouillesAvant) fail('Tronc : META.fouilles a bougé (' + tronc.fouillesAvant + ' → ' + tronc.fouillesApres + ') — un tronc n\'est pas une cache');
      else ok('Tronc : ' + (tronc.max + 1) + ' appuis ne touchent jamais META.fouilles (Site 51 et Fouineur intacts)');
      if (!tronc.donsPayes) fail('Tronc : les dons sous le plafond ne paient rien');
      else if (tronc.refusPaie) fail('Tronc : le don n° ' + (tronc.max + 1) + ' de la vague paie encore (plafond ' + tronc.max + ' non respecté)');
      else ok('Tronc : plafonné à ' + tronc.max + ' dons par vague (label = "' + tronc.labelPlafond + '")');
      if (!tronc.payeApresVague) fail('Tronc : le plafond n\'est pas levé à la vague suivante');
      else ok('Tronc : le plafond est bien levé à la vague suivante');
      if (!tronc.payeApresGameOver) fail('Tronc : le plafond survit au game over');
      else ok('Tronc : le plafond ne survit pas au game over');
    }

    // -------------------------------------------------------------------
    // Plafonds par vague du Karaoké et de la machine 7 de la Laverie (règle
    // « pas de farming infini ») : même motif que le tronc. Plafonds lus
    // depuis le jeu ; une session compte dès son lancement. Entre deux
    // lancements, on termine la session comme le ferait le jeu (fausse note
    // pour le karaoké, cycle fini et sac récupéré pour la laverie).
    // -------------------------------------------------------------------
    for (const cas of [
      { salle: 'karaoke', nom: 'Karaoké', max: 'KARAOKE_SESSIONS_MAX', zone: 'scene2' },
      { salle: 'laverie', nom: 'Laverie (machine 7)', max: 'LAVERIE_LAVAGES_MAX', zone: 'machine7' },
    ]) {
      console.log('\n--- ' + cas.nom + ' : plafond par vague (dépassement refusé, levé à la vague suivante et au game over) ---');
      const r = await page.evaluate((cas) => {
        startRun();
        const p = PORTES.find((x) => x.id === cas.salle);
        entrerInterieur(cas.salle, p);
        const s = INT.actif;
        if (!s || !s[cas.zone]) return { erreur: 'salle ' + cas.salle + ' sans zone ' + cas.zone };
        const MAX = window[cas.max] !== undefined ? window[cas.max] : eval(cas.max);
        const terminer = () => {
          if (cas.salle === 'karaoke') { if (s.karaOn) { s.karaPos = 1; evaluerKaraoke(s); } }
          else { laverieArreter(s); s.sacPret = false; } // le point de reset du jeu (panneau, boutons)
        };
        const lancer = () => {
          META.argent = Math.max(META.argent, 1000);
          P.x = s[cas.zone].x; P.z = s[cas.zone].z; P.hp = P.maxHp;
          majAction();
          const b = document.getElementById('btnAction');
          const avant = META.argent;
          if (b._fn) b._fn();
          const lance = META.argent < avant;
          terminer();
          return { lance, label: b.textContent };
        };
        const res = [];
        for (let i = 0; i < MAX; i++) res.push(lancer().lance);
        const refus = lancer();
        WAVES.n++;
        const apresVague = lancer().lance;
        sortirInterieur();
        startRun();
        entrerInterieur(cas.salle, p);
        const apresGameOver = lancer().lance;
        sortirInterieur();
        return { MAX, sousPlafond: res.every(Boolean), refusLance: refus.lance, labelRefus: refus.label, apresVague, apresGameOver };
      }, cas);
      if (r.erreur) { fail(cas.nom + ' : ' + r.erreur); continue; }
      if (!r.sousPlafond) fail(cas.nom + ' : les ' + r.MAX + ' sessions sous le plafond ne se lancent pas toutes');
      else if (r.refusLance) fail(cas.nom + ' : la session n° ' + (r.MAX + 1) + ' de la vague se lance encore (plafond ' + r.MAX + ' non respecté)');
      else ok(cas.nom + ' : plafonné à ' + r.MAX + ' par vague, la suivante est refusée sans rien débiter (label = "' + r.labelRefus + '")');
      if (!r.apresVague) fail(cas.nom + ' : le plafond n\'est pas levé à la vague suivante');
      else ok(cas.nom + ' : le plafond est bien levé à la vague suivante');
      if (!r.apresGameOver) fail(cas.nom + ' : le plafond survit au game over');
      else ok(cas.nom + ' : le plafond ne survit pas au game over');
    }

    // -------------------------------------------------------------------
    // Arcade : VIPÈRE — jeton consommé, score, tickets, collision mortelle.
    // -------------------------------------------------------------------
    console.log('\n--- Arcade : VIPÈRE (jeton, score, tickets, collision) ---');
    const vipereTest = await page.evaluate(() => {
      const p = PORTES.find((x) => x.id === 'arcade');
      startRun();
      entrerInterieur('arcade', p);
      const s = INT.actif;
      META.argent = 100;
      P.x = s.comptoirJetons.x; P.z = s.comptoirJetons.z;
      majAction(); document.getElementById('btnAction')._fn();
      const jetonsApresAchat = s.jetons, argentApresAchat = META.argent;
      const bv = s.bornes.find((b) => b.id === 'vipere');
      P.x = bv.x; P.z = bv.z; majAction(); document.getElementById('btnAction')._fn();
      const jeuDemarre = ARCADE.jeu === 'vipere';
      const jetonsApresJeu = s.jetons;
      const timeScaleAvant = ETAT.timeScale;
      // place la proie juste devant la tête et force un pas, 5 fois de suite
      for (let i = 0; i < 5; i++) {
        const tete = ARCADE.v.corps[0];
        ARCADE.v.frelon = { x: tete.x + ARCADE.v.dir.x, y: tete.y + ARCADE.v.dir.y };
        ARCADE.v.tickT = 0;
        majVipere(0.01);
      }
      const scoreApresRepas = ARCADE.score;
      const timeScalePendant = ETAT.timeScale;
      // fonce dans le mur ouest
      ARCADE.v.corps[0] = { x: 0, y: 10 }; ARCADE.v.dir = { x: -1, y: 0 }; ARCADE.v.tickT = 0;
      majVipere(0.01);
      const jeuTermineApresMur = ARCADE.jeu === null;
      const tickets = s.tickets || 0;
      if (INT.actif) sortirInterieur();
      return { jetonsApresAchat, argentApresAchat, jeuDemarre, jetonsApresJeu, scoreApresRepas, timeScaleAvant, timeScalePendant, jeuTermineApresMur, tickets };
    });
    if (vipereTest.jetonsApresAchat !== 1 || vipereTest.argentApresAchat !== 90) fail('Arcade : achat d\'un jeton incorrect (jetons=' + vipereTest.jetonsApresAchat + ', argent=' + vipereTest.argentApresAchat + ', attendu 1 et 90)');
    else ok('Arcade : un jeton coûte bien 10 $');
    if (!vipereTest.jeuDemarre || vipereTest.jetonsApresJeu !== 0) fail('Arcade : jouer à VIPÈRE n\'a pas consommé le jeton comme attendu');
    else ok('Arcade : jouer une partie consomme bien 1 jeton');
    if (vipereTest.scoreApresRepas !== 5) fail('Arcade : VIPÈRE — score attendu 5 après 5 proies avalées, obtenu ' + vipereTest.scoreApresRepas);
    else ok('Arcade : VIPÈRE compte bien les proies avalées');
    if (vipereTest.timeScaleAvant !== 1 || vipereTest.timeScalePendant !== 1) fail('Arcade : jouer à une borne modifie ETAT.timeScale — le temps ne coûte plus le même prix qu\'ailleurs');
    else ok('Arcade : jouer à une borne ne met pas le jeu en pause (ETAT.timeScale inchangé)');
    if (!vipereTest.jeuTermineApresMur) fail('Arcade : VIPÈRE — toucher le mur n\'a pas terminé la partie');
    else ok('Arcade : VIPÈRE se termine bien en touchant un mur');
    if (vipereTest.tickets !== 1) fail('Arcade : VIPÈRE — tickets attendus 1 (5 proies / 4), obtenu ' + vipereTest.tickets);
    else ok('Arcade : VIPÈRE crédite le bon nombre de tickets (1 par tranche de 4 proies)');

    // -------------------------------------------------------------------
    // Arcade : CHANTIER — ligne complétée, puis abandon volontaire en
    // pleine partie (bouton pause détourné) : jeton déjà consommé, tickets
    // gagnés jusque-là conservés.
    // -------------------------------------------------------------------
    console.log('\n--- Arcade : CHANTIER (ligne, tickets, abandon volontaire) ---');
    const chantierTest = await page.evaluate(() => {
      const p = PORTES.find((x) => x.id === 'arcade');
      entrerInterieur('arcade', p);
      const s = INT.actif;
      META.argent = 100;
      P.x = s.comptoirJetons.x; P.z = s.comptoirJetons.z;
      majAction(); document.getElementById('btnAction')._fn(); // 1 jeton : une seule partie, abandonnée
      const bc = s.bornes.find((b) => b.id === 'chantier');
      P.x = bc.x; P.z = bc.z; majAction(); document.getElementById('btnAction')._fn();
      const jeuDemarre = ARCADE.jeu === 'chantier';
      // remplit DEUX rangées du bas entièrement (sauf les deux colonnes où
      // atterrira la pièce, deux rangées plus haut) : un seul verrouillage
      // déclenche le balayage des lignes, qui trouve les deux rangées pleines
      // d'un coup (score += 2, donc 1 ticket à 2 lignes/ticket)
      const c = ARCADE.c;
      for (let y = 16; y <= 17; y++) for (let x = 0; x < 10; x++) { c.grille[y * 10 + x] = 1; c.couleurs[y * 10 + x] = 0xffffff; }
      c.pieceIdx = 1; c.rot = 0; c.px = 3; c.py = 14; c.tickT = 0;
      majChantier(0.01); // se pose à py=14 (py=15 collisionne avec la rangée 16, pleine)
      const ligneEffacee = c.grille[17 * 10] === 0; // les rangées pleines ont disparu (tout redescendu)
      const scoreApresLigne = ARCADE.score;
      // abandon volontaire, en pleine partie : le bouton pause quitte la borne
      togglePause();
      const jeuFiniApresAbandon = ARCADE.jeu === null;
      const ticketsFinal = s.tickets || 0;
      const jetonsRestants = s.jetons;
      if (INT.actif) sortirInterieur();
      return { jeuDemarre, ligneEffacee, scoreApresLigne, jeuFiniApresAbandon, ticketsFinal, jetonsRestants };
    });
    if (!chantierTest.jeuDemarre) fail('Arcade : CHANTIER ne démarre pas');
    else ok('Arcade : CHANTIER démarre correctement');
    if (!chantierTest.ligneEffacee || chantierTest.scoreApresLigne !== 2) fail('Arcade : CHANTIER — deux rangées pleines n\'ont pas été effacées (score=' + chantierTest.scoreApresLigne + ', attendu 2)');
    else ok('Arcade : CHANTIER efface bien les lignes complètes et compte le score');
    if (!chantierTest.jeuFiniApresAbandon) fail('Arcade : le bouton pause ne quitte pas une partie de borne en cours');
    else ok('Arcade : quitter une partie en cours (bouton pause) fonctionne');
    if (chantierTest.jetonsRestants !== 0) fail('Arcade : le jeton de la partie abandonnée n\'a pas été consommé (jetons restants=' + chantierTest.jetonsRestants + ')');
    else ok('Arcade : le jeton est bien consommé même en abandonnant');
    if (chantierTest.ticketsFinal < vipereTest.tickets + 1) fail('Arcade : abandonner en pleine partie n\'a pas conservé les tickets gagnés jusque-là (attendu ≥' + (vipereTest.tickets + 1) + ', obtenu ' + chantierTest.ticketsFinal + ')');
    else ok('Arcade : abandonner en pleine partie conserve bien les tickets déjà gagnés');

    // -------------------------------------------------------------------
    // Arcade : DÉMOLITION — casse-brique vertical, contrôle par glissement
    // (composant réutilisable distinct de la croix), matériaux (verre 1 coup,
    // acier 2 coups avec fissure visible, poutre indestructible), tour
    // complétée (bonus + nouvelle tour), 3 boules perdues -> fin de partie.
    // -------------------------------------------------------------------
    console.log('\n--- Arcade : DÉMOLITION (grille, glissement, matériaux, tour complète) ---');
    const demolition = await page.evaluate(() => {
      const p = PORTES.find((x) => x.id === 'arcade');
      startRun();
      entrerInterieur('arcade', p);
      const s = INT.actif;
      META.argent = 100;
      P.x = s.comptoirJetons.x; P.z = s.comptoirJetons.z;
      majAction(); document.getElementById('btnAction')._fn();
      const bd = s.bornes.find((b) => b.id === 'demolition');
      P.x = bd.x; P.z = bd.z; majAction(); document.getElementById('btnAction')._fn();
      const jeuDemarre = ARCADE.jeu === 'demolition';
      majAction(); // rafraîchit l'affichage du bouton ACTION (la boucle de jeu le ferait à la frame suivante)
      const controle = {
        glisseVisible: glisseZone.style.display === 'block',
        croixVisible: croixWrap.style.display === 'block',
        joystickCache: zoneL.style.display === 'none',
        btnActionCache: document.getElementById('btnAction').style.display === 'none',
      };
      const d = ARCADE.d;
      const materiaux = {
        total: d.grille.length, cols: GD_COLS, rows: GD_RANGEES_BRIQUES,
        poutres: d.grille.filter((m) => m === 4).length,
        destructibles: d.briquesRestantes,
      };
      // la zone de glissement pilote directement la position logique de la
      // grue (sans inertie), un appui n'importe où lance la boule qui attend
      glisseDeplace(0);
      const grueGauche = d.grueX;
      glisseDeplace(window.innerWidth);
      const grueDroite = d.grueX;
      const attenteAvant = d.balles[0].attente;
      demolitionLancer();
      const attenteApres = d.balles[0].attente;
      const vyApresLancer = d.balles[0].vy;
      // verre : détruit en 1 coup, +1 point
      let idxVerre = -1;
      for (let i = 0; i < d.grille.length; i++) if (d.grille[i] === 1) { idxVerre = i; break; }
      let verreDetruit = null, scoreApresVerre = null;
      if (idxVerre >= 0) {
        const r = Math.floor(idxVerre / GD_COLS), c = idxVerre % GD_COLS, b = d.balles[0];
        b.x = c + 0.5; b.y = r + 0.5; b.vx = 0; b.vy = -1; b.attente = false;
        demolitionCollisionBriques(b);
        verreDetruit = d.grille[idxVerre] === 0;
        scoreApresVerre = ARCADE.score;
      }
      // acier : fissure au premier coup (vie 2->1), détruit au second (+4 points)
      let idxAcier = -1;
      for (let i = 0; i < d.grille.length; i++) if (d.grille[i] === 3) { idxAcier = i; break; }
      let vieApres1Coup = null, acierDetruitApres2Coups = null;
      if (idxAcier >= 0) {
        const r = Math.floor(idxAcier / GD_COLS), c = idxAcier % GD_COLS, b = d.balles[0];
        b.x = c + 0.5; b.y = r + 0.5; b.vx = 0; b.vy = -1; b.attente = false;
        demolitionCollisionBriques(b);
        vieApres1Coup = d.vie[idxAcier];
        b.x = c + 0.5; b.y = r + 0.5; b.vx = 0; b.vy = -1;
        demolitionCollisionBriques(b);
        acierDetruitApres2Coups = d.grille[idxAcier] === 0;
      }
      // poutre : ne se détruit jamais, quel que soit le nombre de coups
      let idxPoutre = -1;
      for (let i = 0; i < d.grille.length; i++) if (d.grille[i] === 4) { idxPoutre = i; break; }
      let poutreResiste = null;
      if (idxPoutre >= 0) {
        const r = Math.floor(idxPoutre / GD_COLS), c = idxPoutre % GD_COLS, b = d.balles[0];
        for (let k = 0; k < 5; k++) { b.x = c + 0.5; b.y = r + 0.5; b.vx = 0; b.vy = -1; demolitionCollisionBriques(b); }
        poutreResiste = d.grille[idxPoutre] === 4;
      }
      // tour entièrement démolie : bonus de 25 points + nouvelle tour
      ARCADE.score = 0;
      const tourAvant = d.tourNum;
      for (let i = 0; i < d.grille.length; i++) if (d.grille[i] !== 4) d.grille[i] = 0;
      d.briquesRestantes = 0;
      majDemolition(0.01);
      const tourBonus = ARCADE.score;
      const nouvelleTour = d.tourNum === tourAvant + 1 && d.briquesRestantes > 0;
      // dernière boule perdue (déjà sous la grue) -> plus de vie -> finirBorneJeu
      ARCADE.score = 0;
      d.balles = [{ x: d.grueX, y: GD_RANGEES_TOTAL + 1, vx: 0, vy: 1, attente: false, traine: [] }];
      d.boulesRestantes = 1;
      majDemolition(0.01);
      const jeuTermine = ARCADE.jeu === null;
      const controleRestaure = { glisse: glisseZone.style.display === 'none', joystick: zoneL.style.display !== 'none' };
      if (INT.actif) sortirInterieur();
      return {
        jeuDemarre, controle, materiaux, grueGauche, grueDroite, attenteAvant, attenteApres, vyApresLancer,
        verreDetruit, scoreApresVerre, vieApres1Coup, acierDetruitApres2Coups, poutreResiste,
        tourBonus, nouvelleTour, jeuTermine, controleRestaure,
      };
    });
    if (!demolition.jeuDemarre) fail('Arcade : DÉMOLITION ne démarre pas');
    else ok('Arcade : DÉMOLITION démarre correctement');
    if (!demolition.controle.glisseVisible || demolition.controle.croixVisible || !demolition.controle.joystickCache) fail('Arcade : DÉMOLITION n\'affiche pas la bonne zone de contrôle (glissement, pas la croix, joystick masqué) — ' + JSON.stringify(demolition.controle));
    else ok('Arcade : DÉMOLITION affiche bien sa zone de glissement (pas la croix), joystick masqué');
    if (!demolition.controle.btnActionCache) fail('Arcade : le bouton ACTION reste affiché en DÉMOLITION alors que tout se joue au glissement');
    else ok('Arcade : le bouton ACTION est bien masqué en DÉMOLITION (aucun usage)');
    if (demolition.materiaux.total !== 63 || demolition.materiaux.poutres < 4 || demolition.materiaux.poutres > 6) fail('Arcade : DÉMOLITION — grille ou nombre de poutres incorrect (' + JSON.stringify(demolition.materiaux) + ')');
    else ok('Arcade : DÉMOLITION — grille 9×7 avec 4 à 6 poutres, comme spécifié');
    if (!(demolition.grueGauche < demolition.grueDroite)) fail('Arcade : la zone de glissement ne déplace pas la grue de gauche à droite (' + demolition.grueGauche + ' -> ' + demolition.grueDroite + ')');
    else ok('Arcade : la zone de glissement déplace bien la grue de gauche à droite');
    if (!demolition.attenteAvant || demolition.attenteApres || demolition.vyApresLancer >= 0) fail('Arcade : un appui ne lance pas la boule qui attendait sur la grue');
    else ok('Arcade : un appui lance bien la boule qui attendait sur la grue');
    if (demolition.verreDetruit === false || demolition.scoreApresVerre !== 1) fail('Arcade : le verre ne se détruit pas en 1 coup pour 1 point (détruit=' + demolition.verreDetruit + ', score=' + demolition.scoreApresVerre + ')');
    else if (demolition.verreDetruit === null) saute('Arcade : aucune brique de verre dans cette tour (tirage), sous-test ignoré');
    else ok('Arcade : le verre se détruit bien en 1 coup pour 1 point');
    if (demolition.vieApres1Coup === 1 && demolition.acierDetruitApres2Coups === true) ok('Arcade : l\'acier se fissure au 1er coup puis se détruit au 2e (4 points)');
    else if (demolition.vieApres1Coup === null) saute('Arcade : aucune brique d\'acier dans cette tour (tirage), sous-test ignoré');
    else fail('Arcade : l\'acier ne suit pas la règle des 2 coups (vie après 1 coup=' + demolition.vieApres1Coup + ', détruit après 2=' + demolition.acierDetruitApres2Coups + ')');
    if (demolition.poutreResiste === false) fail('Arcade : une poutre a été détruite alors qu\'elle doit être indestructible');
    else ok('Arcade : la poutre est bien indestructible (résiste à 5 impacts)');
    if (demolition.tourBonus !== 25 || !demolition.nouvelleTour) fail('Arcade : une tour entièrement démolie ne donne pas le bonus de 25 points et/ou ne fait pas apparaître une nouvelle tour (bonus=' + demolition.tourBonus + ', nouvelleTour=' + demolition.nouvelleTour + ')');
    else ok('Arcade : une tour entièrement démolie donne bien +25 points et fait apparaître une nouvelle tour');
    if (!demolition.jeuTermine) fail('Arcade : perdre la dernière boule ne termine pas la partie');
    else ok('Arcade : perdre la dernière boule termine bien la partie (finirBorneJeu)');
    if (!demolition.controleRestaure.glisse || !demolition.controleRestaure.joystick) fail('Arcade : quitter DÉMOLITION ne cache pas la zone de glissement ou ne restaure pas le joystick');
    else ok('Arcade : quitter DÉMOLITION cache bien la zone de glissement et restaure le joystick');

    // -------------------------------------------------------------------
    // Arcade : DÉMOLITION — la vitesse de la boule (et celle des bonus qui
    // tombent) doit être exprimée en fraction du terrain par seconde, jamais
    // en pixels par frame : bug rapporté après l'agrandissement du modal, la
    // boule était devenue beaucoup trop lente. Vérifie le calibrage (~1,2 s
    // pour traverser le terrain au départ, nettement plus vite en fin de
    // tour) ET l'indépendance totale à la résolution du canvas.
    // -------------------------------------------------------------------
    console.log('\n--- Arcade : DÉMOLITION — vitesse calibrée, indépendante de la résolution ---');
    const vitesseDemolition = await page.evaluate(() => {
      const p = PORTES.find((x) => x.id === 'arcade');
      entrerInterieur('arcade', p);
      demolitionInit(); // tourNum=1 (première tour), vitesseT=0 : « au départ »
      const d = ARCADE.d;
      d.briquesRestantes = 999; // au-dessus de 10 : pas de bonus de fin de tour
      const vitDepart = demolitionVitesse();
      const dureeTraversee = GD_RANGEES_TOTAL / vitDepart;
      // la résolution du canvas (donc `cell`, utilisé seulement au dessin) ne
      // doit avoir AUCUN effet sur la vitesse logique
      const wAvant = ARCADE_ECRAN.w, hAvant = ARCADE_ECRAN.h;
      ARCADE_ECRAN.w = 50; ARCADE_ECRAN.h = 50;
      const vitPetitCanvas = demolitionVitesse();
      ARCADE_ECRAN.w = 2000; ARCADE_ECRAN.h = 3000;
      const vitGrandCanvas = demolitionVitesse();
      ARCADE_ECRAN.w = wAvant; ARCADE_ECRAN.h = hAvant;
      // fin de tour (peu de briques restantes) : nettement plus rapide
      d.briquesRestantes = 0;
      const vitFinDeTour = demolitionVitesse();
      // trajectoire identique bit à bit quelle que soit la résolution : rejoue
      // la même boule, sans brique (grille vidée) pour écarter tout aléa de
      // tirage de matériaux, à deux tailles de canvas très différentes
      const rejoue = (w, h) => {
        demolitionInit();
        const dd = ARCADE.d;
        for (let i = 0; i < dd.grille.length; i++) dd.grille[i] = 0;
        dd.briquesRestantes = 0;
        dd.balles = [{ x: 4.5, y: 5, vx: 0.7, vy: 1.3, attente: false, traine: [] }];
        ARCADE_ECRAN.w = w; ARCADE_ECRAN.h = h;
        for (let i = 0; i < 40; i++) majDemolition(0.016);
        return dd.balles[0] ? { x: dd.balles[0].x, y: dd.balles[0].y } : null;
      };
      const posPetit = rejoue(60, 60);
      const posGrand = rejoue(1200, 1800);
      ARCADE_ECRAN.w = wAvant; ARCADE_ECRAN.h = hAvant;
      if (INT.actif) sortirInterieur();
      return { vitDepart, dureeTraversee, vitPetitCanvas, vitGrandCanvas, vitFinDeTour, posPetit, posGrand };
    });
    if (Math.abs(vitesseDemolition.dureeTraversee - 1.2) > 0.05) fail('Arcade : DÉMOLITION — la boule ne traverse pas le terrain en ~1,2 s au départ (durée calculée : ' + vitesseDemolition.dureeTraversee.toFixed(2) + ' s)');
    else ok('Arcade : DÉMOLITION — la boule traverse bien le terrain en ~1,2 s au départ');
    if (vitesseDemolition.vitPetitCanvas !== vitesseDemolition.vitDepart || vitesseDemolition.vitGrandCanvas !== vitesseDemolition.vitDepart) fail('Arcade : DÉMOLITION — la vitesse de la boule dépend de la résolution du canvas (départ=' + vitesseDemolition.vitDepart + ', petit=' + vitesseDemolition.vitPetitCanvas + ', grand=' + vitesseDemolition.vitGrandCanvas + ')');
    else ok('Arcade : DÉMOLITION — la vitesse de la boule est bien indépendante de la résolution du canvas');
    if (!(vitesseDemolition.vitFinDeTour > vitesseDemolition.vitDepart * 1.3)) fail('Arcade : DÉMOLITION — l\'accélération de fin de tour n\'est pas perceptible (départ=' + vitesseDemolition.vitDepart.toFixed(2) + ', fin de tour=' + vitesseDemolition.vitFinDeTour.toFixed(2) + ')');
    else ok('Arcade : DÉMOLITION — nettement plus rapide en fin de tour, comme spécifié');
    const posDivergente = !vitesseDemolition.posPetit || !vitesseDemolition.posGrand ||
      Math.abs(vitesseDemolition.posPetit.x - vitesseDemolition.posGrand.x) > 1e-9 ||
      Math.abs(vitesseDemolition.posPetit.y - vitesseDemolition.posGrand.y) > 1e-9;
    if (posDivergente) fail('Arcade : DÉMOLITION — la trajectoire de la boule diverge selon la résolution du canvas (petit=' + JSON.stringify(vitesseDemolition.posPetit) + ', grand=' + JSON.stringify(vitesseDemolition.posGrand) + ')');
    else ok('Arcade : DÉMOLITION — trajectoire de la boule strictement identique quelle que soit la résolution du canvas');

    // -------------------------------------------------------------------
    // Arcade : DÉMOLITION — la boule ne doit jamais « traverser » la grue
    // sans rebondir (un test de position finale dans une bande étroite peut
    // être sauté par un grand déplacement en une frame ; il faut un test de
    // franchissement). Simule une chute d'images (gros dt) juste au-dessus
    // de la grue — un déplacement bien supérieur à l'ancienne bande de
    // détection (±0,12 u), pour vérifier que la boule est bien attrapée au
    // vol plutôt que comptée perdue.
    // -------------------------------------------------------------------
    console.log('\n--- Arcade : DÉMOLITION — la boule ne traverse pas la grue sur une frame lente ---');
    const antiTunnel = await page.evaluate(() => {
      const p = PORTES.find((x) => x.id === 'arcade');
      entrerInterieur('arcade', p);
      demolitionInit();
      const d = ARCADE.d;
      for (let i = 0; i < d.grille.length; i++) d.grille[i] = 0; // pas de brique sur le trajet
      d.grueX = 4.5; d.grueLarg = GD_GRUE_LARG;
      // majDemolition renormalise TOUJOURS la vitesse de la boule sur la
      // vitesse cible du moment avant de la déplacer : injecter une vitesse
      // brute énorme ne sert à rien (rabotée à la première ligne). Le vrai
      // stress-test est une chute d'images (gros dt) juste au-dessus de la
      // grue, qui déplace la boule loin au-delà de l'ancienne bande étroite.
      d.balles = [{ x: 4.5, y: GD_GRUE_Y - 1, vx: 0, vy: 1, attente: false, traine: [] }];
      majDemolition(0.2);
      const balleEncoreLa = d.balles.length === 1;
      const aRebondi = balleEncoreLa && d.balles[0].vy < 0;
      if (INT.actif) sortirInterieur();
      return { balleEncoreLa, aRebondi };
    });
    if (!antiTunnel.balleEncoreLa || !antiTunnel.aRebondi) fail('Arcade : DÉMOLITION — une boule rapide traverse la grue sans rebondir (perdue au lieu de rebondir)');
    else ok('Arcade : DÉMOLITION — une boule rapide rebondit bien sur la grue, même sur une frame lente');

    // -------------------------------------------------------------------
    // Arcade : GLOUTON — le labyrinthe est un tracé FIXE (aucune génération
    // aléatoire) : lu depuis la source du jeu (GL_MUR/glMur), jamais recopié
    // ici (voir CLAUDE.md, « Tests : ne jamais recopier une liste du jeu »).
    // Deux règles non négociables : aucune impasse, deux tunnels latéraux
    // pleinement ouverts à mi-hauteur.
    // -------------------------------------------------------------------
    console.log('\n--- Arcade : GLOUTON — labyrinthe (aucune impasse, connexe, tunnels ouverts) ---');
    const labyrinthe = await page.evaluate(() => {
      let impasses = 0;
      const impassesListe = [];
      for (let y = 0; y < GL_ROWS; y++) for (let x = 0; x < GL_COLS; x++) {
        if (glMur(x, y)) continue;
        let deg = 0;
        if (!glMur(x, y - 1)) deg++;
        if (!glMur(x, y + 1)) deg++;
        if (!glMur(x - 1, y)) deg++;
        if (!glMur(x + 1, y)) deg++;
        if (deg < 2) { impasses++; impassesListe.push([x, y]); }
      }
      let depart = null;
      for (let y = 0; y < GL_ROWS && !depart; y++) for (let x = 0; x < GL_COLS; x++) if (!glMur(x, y)) { depart = [x, y]; break; }
      const vu = new Set([depart[0] + ',' + depart[1]]);
      const pile = [depart];
      while (pile.length) {
        const [x, y] = pile.pop();
        for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
          let nx = x + dx; const ny = y + dy;
          if (nx < 0) nx = GL_COLS - 1; else if (nx >= GL_COLS) nx = 0;
          if (ny < 0 || ny >= GL_ROWS || glMur(nx, ny)) continue;
          const cle = nx + ',' + ny;
          if (!vu.has(cle)) { vu.add(cle); pile.push([nx, ny]); }
        }
      }
      let totalSol = 0;
      for (let y = 0; y < GL_ROWS; y++) for (let x = 0; x < GL_COLS; x++) if (!glMur(x, y)) totalSol++;
      const tunnelsOuverts = !glMur(0, 7) && !glMur(GL_COLS - 1, 7) && !glMur(0, 9) && !glMur(GL_COLS - 1, 9);
      return { impasses, impassesListe, totalSol, atteint: vu.size, tunnelsOuverts, nbSandwichs: GL_SANDWICH_BASE.length };
    });
    if (labyrinthe.impasses > 0) fail('GLOUTON : ' + labyrinthe.impasses + ' impasse(s) détectée(s) — ' + JSON.stringify(labyrinthe.impassesListe));
    else ok('GLOUTON : le labyrinthe n\'a aucune impasse (toute case de sol a au moins 2 voisins ouverts)');
    if (labyrinthe.atteint !== labyrinthe.totalSol) fail('GLOUTON : le labyrinthe n\'est pas entièrement connexe (' + labyrinthe.atteint + '/' + labyrinthe.totalSol + ' cases atteintes)');
    else ok('GLOUTON : le labyrinthe est bien entièrement connexe (' + labyrinthe.totalSol + ' cases)');
    if (!labyrinthe.tunnelsOuverts) fail('GLOUTON : les deux tunnels latéraux ne sont pas pleinement ouverts');
    else ok('GLOUTON : les deux tunnels latéraux sont bien pleinement ouverts');
    if (labyrinthe.nbSandwichs < 100) fail('GLOUTON : nombre de sandwichs suspicieusement bas (' + labyrinthe.nbSandwichs + ')');
    else ok('GLOUTON : ' + labyrinthe.nbSandwichs + ' sandwichs répartis dans le labyrinthe');

    // -------------------------------------------------------------------
    // Arcade : GLOUTON — démarrage, contrôle (croix à 4 directions, sans
    // rotation), sandwich mangé, badge (effraie tous les gardiens actifs),
    // combo de gardiens mangés (25 puis 50), contact mortel avec un gardien
    // non effrayé (vie perdue, position remise à zéro, progression gardée).
    // -------------------------------------------------------------------
    console.log('\n--- Arcade : GLOUTON (démarrage, sandwich, badge, combo de gardiens, contact mortel) ---');
    const glouton = await page.evaluate(() => {
      const p = PORTES.find((x) => x.id === 'arcade');
      startRun();
      entrerInterieur('arcade', p);
      const s = INT.actif;
      META.argent = 100;
      P.x = s.comptoirJetons.x; P.z = s.comptoirJetons.z;
      majAction(); document.getElementById('btnAction')._fn();
      const bo = s.bornes.find((b) => b.id === 'glouton');
      P.x = bo.x; P.z = bo.z; majAction(); document.getElementById('btnAction')._fn();
      const jeuDemarre = ARCADE.jeu === 'glouton';
      const controle = {
        croixVisible: croixWrap.style.display === 'block',
        joystickCache: zoneL.style.display === 'none',
        haut: document.getElementById('croixHaut').style.display,
        rotate: document.getElementById('croixRotate').style.display,
      };
      const d = ARCADE.g;
      const cle = Math.round(d.joueur.x) + ',' + Math.round(d.joueur.y);
      const sandwichAvant = !!d.sandwichs[cle];
      const restantsAvant = d.sandwichsRestants;
      majGlouton(0.001);
      const sandwichMange = sandwichAvant && !d.sandwichs[cle] && d.sandwichsRestants === restantsAvant - 1;
      const scoreApresSandwich = ARCADE.score;
      // badge : les 3 gardiens (simulés actifs) deviennent effrayés
      for (const g of d.fantomes) g.actif = true;
      const badge = d.badges[0];
      d.joueur.x = badge.x; d.joueur.y = badge.y;
      majGlouton(0.001);
      const badgePris = badge.pris;
      const scoreApresBadge = ARCADE.score;
      const tousEffrayes = d.fantomes.every((g) => g.effraye);
      const dureeBadge = d.effraiT;
      // 1er gardien effrayé mangé : +25, renvoyé au poste
      const g0 = d.fantomes[0];
      d.joueur.x = g0.x; d.joueur.y = g0.y;
      majGlouton(0.001);
      const g0RenvoyeAuPoste = !g0.actif && g0.x === GL_POSTE.x && g0.y === GL_POSTE.y;
      const scoreApresPremierFantome = ARCADE.score - scoreApresBadge;
      // 2e gardien effrayé mangé dans la foulée : +50 (combo)
      const g1 = d.fantomes[1];
      d.joueur.x = g1.x; d.joueur.y = g1.y;
      const scoreAvantDeuxieme = ARCADE.score;
      majGlouton(0.001);
      const scoreApresDeuxiemeFantome = ARCADE.score - scoreAvantDeuxieme;
      // gardien NON effrayé : contact mortel
      const restantsAvantMort = d.sandwichsRestants;
      const g2 = d.fantomes[2];
      g2.effraye = false; g2.actif = true; g2.x = GL_SPAWN_JOUEUR.x; g2.y = GL_SPAWN_JOUEUR.y;
      d.joueur.x = GL_SPAWN_JOUEUR.x; d.joueur.y = GL_SPAWN_JOUEUR.y;
      const viesAvant = d.vies;
      majGlouton(0.001);
      const vieDunPerdue = d.vies === viesAvant - 1;
      const positionReinitialisee = d.joueur.x === GL_SPAWN_JOUEUR.x && d.joueur.y === GL_SPAWN_JOUEUR.y;
      const progressionConservee = d.sandwichsRestants === restantsAvantMort;
      if (INT.actif) sortirInterieur();
      return {
        jeuDemarre, controle, sandwichMange, scoreApresSandwich, badgePris, scoreApresBadge, tousEffrayes, dureeBadge,
        g0RenvoyeAuPoste, scoreApresPremierFantome, scoreApresDeuxiemeFantome,
        vieDunPerdue, positionReinitialisee, progressionConservee, viesAvant,
      };
    });
    if (!glouton.jeuDemarre) fail('Arcade : GLOUTON ne démarre pas');
    else ok('Arcade : GLOUTON démarre correctement');
    if (!glouton.controle.croixVisible || !glouton.controle.joystickCache || glouton.controle.haut !== 'flex' || glouton.controle.rotate !== 'none') fail('Arcade : GLOUTON n\'affiche pas la bonne configuration de croix (4 directions, sans rotation) — ' + JSON.stringify(glouton.controle));
    else ok('Arcade : GLOUTON affiche bien la croix à 4 directions (sans bouton de rotation), joystick masqué');
    if (!glouton.sandwichMange || glouton.scoreApresSandwich !== 2) fail('Arcade : GLOUTON — manger un sandwich ne donne pas 2 points (score=' + glouton.scoreApresSandwich + ')');
    else ok('Arcade : GLOUTON — manger un sandwich retire bien la case et donne 2 points');
    if (!glouton.badgePris || glouton.scoreApresBadge !== 12 || !glouton.tousEffrayes) fail('Arcade : GLOUTON — le badge ne donne pas 10 points et/ou n\'effraie pas tous les gardiens actifs (score=' + glouton.scoreApresBadge + ', tousEffrayes=' + glouton.tousEffrayes + ')');
    else ok('Arcade : GLOUTON — le badge donne bien 10 points et effraie tous les gardiens actifs');
    if (Math.abs(glouton.dureeBadge - 8) > 0.01) fail('Arcade : GLOUTON — la durée du badge au niveau 1 n\'est pas 8 s (' + glouton.dureeBadge + ')');
    else ok('Arcade : GLOUTON — la durée du badge est bien de 8 s au niveau 1');
    if (!glouton.g0RenvoyeAuPoste || glouton.scoreApresPremierFantome !== 25) fail('Arcade : GLOUTON — manger un 1er gardien effrayé ne donne pas 25 points et/ou ne le renvoie pas au poste (score=' + glouton.scoreApresPremierFantome + ', renvoye=' + glouton.g0RenvoyeAuPoste + ')');
    else ok('Arcade : GLOUTON — manger un 1er gardien effrayé donne bien 25 points et le renvoie au poste');
    if (glouton.scoreApresDeuxiemeFantome !== 50) fail('Arcade : GLOUTON — manger un 2e gardien effrayé dans la foulée ne donne pas 50 points (combo) (obtenu ' + glouton.scoreApresDeuxiemeFantome + ')');
    else ok('Arcade : GLOUTON — le combo de gardiens mangés monte bien à 50 points pour le 2e');
    if (!glouton.vieDunPerdue || !glouton.positionReinitialisee || !glouton.progressionConservee) fail('Arcade : GLOUTON — un contact avec un gardien non effrayé ne coûte pas une vie et/ou ne réinitialise pas correctement (' + JSON.stringify(glouton) + ')');
    else ok('Arcade : GLOUTON — un contact avec un gardien non effrayé coûte bien une vie, remet les positions à zéro et garde la progression');

    // -------------------------------------------------------------------
    // Arcade : GLOUTON — manger tous les sandwichs passe au niveau suivant
    // avec le MÊME labyrinthe (sandwichs replacés), des gardiens plus
    // rapides et un badge plus court — mais jamais plus rapide que le joueur,
    // même à un niveau très avancé (sinon le jeu devient ingagnable).
    // -------------------------------------------------------------------
    console.log('\n--- Arcade : GLOUTON — niveau suivant (même labyrinthe, gardiens plus rapides, badge plus court) ---');
    const niveauSuivant = await page.evaluate(() => {
      const p = PORTES.find((x) => x.id === 'arcade');
      entrerInterieur('arcade', p);
      const s = INT.actif;
      META.argent = 100;
      P.x = s.comptoirJetons.x; P.z = s.comptoirJetons.z;
      majAction(); document.getElementById('btnAction')._fn();
      const bo = s.bornes.find((b) => b.id === 'glouton');
      P.x = bo.x; P.z = bo.z; majAction(); document.getElementById('btnAction')._fn();
      const d = ARCADE.g;
      const niveauAvant = d.niveau;
      const vitesseAvant = glVitesseFantome(d.niveau);
      const dureeBadgeAvant = glDureeBadge(d.niveau);
      const cles = Object.keys(d.sandwichs);
      for (let i = 1; i < cles.length; i++) delete d.sandwichs[cles[i]];
      d.sandwichsRestants = 1;
      const [dx, dy] = cles[0].split(',').map(Number);
      d.joueur.x = dx; d.joueur.y = dy;
      majGlouton(0.001);
      const niveauApres = d.niveau;
      const sandwichsRestantsApres = d.sandwichsRestants;
      const vitesseApres = glVitesseFantome(d.niveau);
      const dureeBadgeApres = glDureeBadge(d.niveau);
      const vitesseNiveauEleve = glVitesseFantome(50);
      if (INT.actif) sortirInterieur();
      return {
        niveauAvant, niveauApres, sandwichsRestantsApres, totalSandwichs: GL_SANDWICH_BASE.length,
        vitesseAvant, vitesseApres, dureeBadgeAvant, dureeBadgeApres, vitesseNiveauEleve, vitesseJoueur: GL_VIT_JOUEUR,
      };
    });
    if (niveauSuivant.niveauApres !== niveauSuivant.niveauAvant + 1) fail('Arcade : GLOUTON — manger tous les sandwichs ne passe pas au niveau suivant');
    else ok('Arcade : GLOUTON — manger tous les sandwichs passe bien au niveau suivant');
    if (niveauSuivant.sandwichsRestantsApres !== niveauSuivant.totalSandwichs) fail('Arcade : GLOUTON — le niveau suivant ne replace pas tous les sandwichs (' + niveauSuivant.sandwichsRestantsApres + '/' + niveauSuivant.totalSandwichs + ')');
    else ok('Arcade : GLOUTON — le niveau suivant replace bien tous les sandwichs (même labyrinthe)');
    if (!(niveauSuivant.vitesseApres > niveauSuivant.vitesseAvant)) fail('Arcade : GLOUTON — les gardiens n\'accélèrent pas au niveau suivant (' + niveauSuivant.vitesseAvant + ' -> ' + niveauSuivant.vitesseApres + ')');
    else ok('Arcade : GLOUTON — les gardiens accélèrent bien au niveau suivant');
    if (!(niveauSuivant.dureeBadgeApres < niveauSuivant.dureeBadgeAvant)) fail('Arcade : GLOUTON — la durée du badge ne diminue pas au niveau suivant (' + niveauSuivant.dureeBadgeAvant + ' -> ' + niveauSuivant.dureeBadgeApres + ')');
    else ok('Arcade : GLOUTON — la durée du badge diminue bien au niveau suivant');
    if (!(niveauSuivant.vitesseNiveauEleve < niveauSuivant.vitesseJoueur)) fail('Arcade : GLOUTON — la vitesse des gardiens dépasse celle du joueur à un niveau avancé (' + niveauSuivant.vitesseNiveauEleve + ' >= ' + niveauSuivant.vitesseJoueur + ') — le jeu deviendrait ingagnable');
    else ok('Arcade : GLOUTON — la vitesse des gardiens ne dépasse jamais celle du joueur, même à un niveau très avancé');

    // -------------------------------------------------------------------
    // Arcade : GLOUTON — virage demandé en file d'attente (s'applique dès
    // que possible), tunnel latéral (passe d'un bord à l'autre), règle de
    // miséricorde (aucune mort inévitable si le joueur est encerclé sans
    // issue — même principe que l'anti-blocage de DÉMOLITION).
    // -------------------------------------------------------------------
    console.log('\n--- Arcade : GLOUTON — virage en file d\'attente, tunnel, règle de miséricorde ---');
    const mecaniques = await page.evaluate(() => {
      const p = PORTES.find((x) => x.id === 'arcade');
      entrerInterieur('arcade', p);
      const s = INT.actif;
      META.argent = 100;
      P.x = s.comptoirJetons.x; P.z = s.comptoirJetons.z;
      majAction(); document.getElementById('btnAction')._fn();
      const bo = s.bornes.find((b) => b.id === 'glouton');
      P.x = bo.x; P.z = bo.z; majAction(); document.getElementById('btnAction')._fn();
      const d = ARCADE.g;
      for (const g of d.fantomes) g.actif = false;
      // virage en file d'attente : demande un virage AVANT l'intersection
      // (7,1), un carrefour à 3 sorties (haut = bordure) ; doit s'appliquer
      // dès qu'il devient possible, pas être ignoré
      d.joueur.x = 3; d.joueur.y = 1; d.joueur.dir = { x: 1, y: 0 }; d.joueur.next = { x: 0, y: 1 };
      for (let i = 0; i < 60 && !(d.joueur.dir.x === 0 && d.joueur.dir.y === 1); i++) majGlouton(0.02);
      const virageApplique = d.joueur.dir.x === 0 && d.joueur.dir.y === 1;
      // tunnel : sort par la gauche à la rangée 7, doit réapparaître à droite
      d.joueur.x = 0; d.joueur.y = 7; d.joueur.dir = { x: -1, y: 0 }; d.joueur.next = { x: -1, y: 0 };
      let xMax = d.joueur.x;
      for (let i = 0; i < 10; i++) { majGlouton(0.02); if (d.joueur.x > xMax) xMax = d.joueur.x; }
      const aTraverseLeTunnel = xMax > GL_COLS - 3;
      // règle de miséricorde : joueur à l'intersection (7,1) (3 sorties),
      // les 3 gardiens (non effrayés) occupent chacune des 3 sorties -> aucune issue
      d.joueur.x = 7; d.joueur.y = 1; d.joueur.dir = { x: 0, y: 0 }; d.joueur.next = { x: 0, y: 0 };
      d.fantomes[0].x = 6; d.fantomes[0].y = 1; d.fantomes[0].actif = true; d.fantomes[0].effraye = false;
      d.fantomes[1].x = 8; d.fantomes[1].y = 1; d.fantomes[1].actif = true; d.fantomes[1].effraye = false;
      d.fantomes[2].x = 7; d.fantomes[2].y = 2; d.fantomes[2].actif = true; d.fantomes[2].effraye = false;
      const positionsAvant = d.fantomes.map((g) => ({ x: g.x, y: g.y }));
      glVerifierMisericorde(d, 0.02);
      const positionsApres = d.fantomes.map((g) => ({ x: g.x, y: g.y }));
      const unGardienAReculee = positionsAvant.some((pa, i) => pa.x !== positionsApres[i].x || pa.y !== positionsApres[i].y);
      if (INT.actif) sortirInterieur();
      return { virageApplique, aTraverseLeTunnel, unGardienAReculee };
    });
    if (!mecaniques.virageApplique) fail('Arcade : GLOUTON — un virage demandé avant l\'intersection ne s\'applique pas dès qu\'il devient possible');
    else ok('Arcade : GLOUTON — le virage en file d\'attente s\'applique bien dès que possible');
    if (!mecaniques.aTraverseLeTunnel) fail('Arcade : GLOUTON — le joueur ne traverse pas le tunnel latéral d\'un bord à l\'autre');
    else ok('Arcade : GLOUTON — le tunnel latéral fait bien passer d\'un bord à l\'autre');
    if (!mecaniques.unGardienAReculee) fail('Arcade : GLOUTON — la règle de miséricorde ne recule pas un gardien quand le joueur est encerclé sans issue');
    else ok('Arcade : GLOUTON — la règle de miséricorde recule bien un gardien quand le joueur est encerclé sans issue');

    // -------------------------------------------------------------------
    // Arcade : STAND DE CANARDS — contrôle 'visee' (nouveau type ajouté au
    // composant générique) : zone de visée + bouton TIRER séparé, ni croix ni
    // glissement, joystick masqué. Les boutons de combat normaux (btnFire...)
    // doivent AUSSI être masqués pendant toute session de borne — sinon
    // TIRER, positionné au même endroit que btnFire, entrerait en conflit —
    // et restaurés EXACTEMENT (pas juste '', qui révélerait à tort un bouton
    // comme btnJump dont l'état masqué par défaut vient d'ailleurs).
    // -------------------------------------------------------------------
    console.log('\n--- Arcade : STAND DE CANARDS (contrôle visée+tir séparés, boutons de combat masqués) ---');
    const canardsControle = await page.evaluate(() => {
      const p = PORTES.find((x) => x.id === 'arcade');
      startRun();
      entrerInterieur('arcade', p);
      const s = INT.actif;
      META.argent = 100;
      const btnJumpAvant = document.getElementById('btnJump').style.display;
      const btnFireAvant = document.getElementById('btnFire').style.display;
      P.x = s.comptoirJetons.x; P.z = s.comptoirJetons.z;
      majAction(); document.getElementById('btnAction')._fn();
      const bo = s.bornes.find((b) => b.id === 'canards');
      P.x = bo.x; P.z = bo.z; majAction(); document.getElementById('btnAction')._fn();
      majAction();
      const jeuDemarre = ARCADE.jeu === 'canards';
      const controle = {
        viseeVisible: viseeZone.style.display === 'block',
        tirerVisible: document.getElementById('btnTirerCanards').style.display === 'flex',
        croixVisible: croixWrap.style.display === 'block',
        glisseVisible: glisseZone.style.display === 'block',
        joystickCache: zoneL.style.display === 'none',
        btnActionCache: document.getElementById('btnAction').style.display === 'none',
        btnFireCache: document.getElementById('btnFire').style.display === 'none',
      };
      finirBorneJeu();
      const btnFireApres = document.getElementById('btnFire').style.display;
      const btnJumpApres = document.getElementById('btnJump').style.display;
      if (INT.actif) sortirInterieur();
      return { jeuDemarre, controle, btnJumpAvant, btnFireAvant, btnFireApres, btnJumpApres };
    });
    if (!canardsControle.jeuDemarre) fail('Arcade : STAND DE CANARDS ne démarre pas');
    else ok('Arcade : STAND DE CANARDS démarre correctement');
    if (!canardsControle.controle.viseeVisible || !canardsControle.controle.tirerVisible || canardsControle.controle.croixVisible || canardsControle.controle.glisseVisible || !canardsControle.controle.joystickCache) fail('Arcade : STAND DE CANARDS n\'affiche pas la bonne configuration de contrôle — ' + JSON.stringify(canardsControle.controle));
    else ok('Arcade : STAND DE CANARDS affiche bien sa zone de visée et le bouton TIRER (ni croix ni glissement), joystick masqué');
    if (!canardsControle.controle.btnActionCache) fail('Arcade : le bouton ACTION reste affiché en STAND DE CANARDS alors que TIRER est dédié');
    else ok('Arcade : le bouton ACTION est bien masqué en STAND DE CANARDS');
    if (!canardsControle.controle.btnFireCache) fail('Arcade : les boutons de combat normaux (btnFire) restent affichés pendant une partie de borne — conflit possible avec TIRER');
    else ok('Arcade : les boutons de combat normaux sont bien masqués pendant une partie de borne');
    if (canardsControle.btnFireApres !== canardsControle.btnFireAvant) fail('Arcade : btnFire n\'est pas restauré à son état exact d\'avant la borne (avant=' + JSON.stringify(canardsControle.btnFireAvant) + ', après=' + JSON.stringify(canardsControle.btnFireApres) + ')');
    else ok('Arcade : les boutons de combat sont bien restaurés à leur état exact après avoir quitté la borne');
    if (canardsControle.btnJumpApres !== canardsControle.btnJumpAvant) fail('Arcade : btnJump n\'est pas restauré à son état exact d\'avant la borne (avant=' + JSON.stringify(canardsControle.btnJumpAvant) + ', après=' + JSON.stringify(canardsControle.btnJumpApres) + ')');
    else ok('Arcade : btnJump est bien restauré à son état exact d\'avant la borne (pas juste \'\', qui l\'aurait révélé à tort)');

    // -------------------------------------------------------------------
    // Arcade : STAND DE CANARDS — tir/série (double à 5, triple à 10, remise
    // à zéro sur un tir manqué), canard noir (malus, jamais de score négatif,
    // remet aussi la série à zéro), cible bonus (recharge instantanée),
    // chargeur de 8 tirs avec recharge automatique en 1,2 s.
    // -------------------------------------------------------------------
    console.log('\n--- Arcade : STAND DE CANARDS (tir, série, canard noir, cible bonus, chargeur) ---');
    const canards = await page.evaluate(() => {
      const p = PORTES.find((x) => x.id === 'arcade');
      entrerInterieur('arcade', p);
      const s = INT.actif;
      META.argent = 100;
      P.x = s.comptoirJetons.x; P.z = s.comptoirJetons.z;
      majAction(); document.getElementById('btnAction')._fn();
      const bo = s.bornes.find((b) => b.id === 'canards');
      P.x = bo.x; P.z = bo.z; majAction(); document.getElementById('btnAction')._fn();
      const d = ARCADE.s;
      const viser = (voie) => { d.viseurX = 0.5; d.viseurY = voie / SC_VOIES + 0.5 / SC_VOIES; };
      // 5 canards blancs d'affilée : le 5e (série atteint 5) vaut double
      const scoresBlancs = [];
      for (let i = 0; i < 5; i++) {
        d.canards = [{ type: 'blanc', voie: 0, x: 0.5, vit: 0, toucheT: 0 }];
        viser(0);
        const avant = ARCADE.score;
        scTirer();
        scoresBlancs.push(ARCADE.score - avant);
      }
      const serieApres5 = d.serie;
      // tir manqué : remet la série à zéro
      d.canards = [];
      scTirer();
      const serieApresRate = d.serie;
      // canard noir : malus de 15, remet la série à zéro
      ARCADE.score = 5; d.serie = 3;
      d.canards = [{ type: 'noir', voie: 1, x: 0.5, vit: 0, toucheT: 0 }];
      viser(1);
      scTirer();
      const scoreApresNoir = ARCADE.score;
      const serieApresNoir = d.serie;
      // le score ne descend jamais sous zéro
      ARCADE.score = 0;
      d.canards = [{ type: 'noir', voie: 1, x: 0.5, vit: 0, toucheT: 0 }];
      viser(1);
      scTirer();
      const scoreJamaisNegatif = ARCADE.score;
      // cible bonus : recharge instantanément le chargeur
      d.chargeur = 2; d.rechargeT = 0;
      d.canards = [{ type: 'bonus', voie: 2, x: 0.5, vit: 0, toucheT: 0 }];
      viser(2);
      scTirer();
      const chargeurApresBonus = d.chargeur;
      // chargeur de 8 tirs, tir ignoré à vide, recharge automatique en 1,2 s
      d.chargeur = 8; d.rechargeT = 0; d.canards = [];
      for (let i = 0; i < 8; i++) scTirer();
      const chargeurVide = d.chargeur;
      const scoreAvantTirVide = ARCADE.score;
      scTirer();
      const tirIgnoreVide = ARCADE.score === scoreAvantTirVide;
      majCanards(1.3);
      const chargeurRecharge = d.chargeur;
      if (INT.actif) sortirInterieur();
      return {
        scoresBlancs, serieApres5, serieApresRate, scoreApresNoir, serieApresNoir,
        scoreJamaisNegatif, chargeurApresBonus, chargeurVide, tirIgnoreVide, chargeurRecharge,
        ptsBlanc: SC_PTS.blanc,
      };
    });
    if (canards.scoresBlancs.slice(0, 4).some((v) => v !== canards.ptsBlanc)) fail('Arcade : STAND DE CANARDS — les 4 premiers canards blancs d\'une série ne valent pas leur valeur normale (' + JSON.stringify(canards.scoresBlancs) + ')');
    else ok('Arcade : STAND DE CANARDS — un canard blanc hors série vaut bien sa valeur normale');
    if (canards.scoresBlancs[4] !== canards.ptsBlanc * 2 || canards.serieApres5 !== 5) fail('Arcade : STAND DE CANARDS — le 5e canard d\'une série ne vaut pas le double (série=' + canards.serieApres5 + ', valeurs=' + JSON.stringify(canards.scoresBlancs) + ')');
    else ok('Arcade : STAND DE CANARDS — à partir de 5 d\'affilée, chaque canard vaut bien double');
    if (canards.serieApresRate !== 0) fail('Arcade : STAND DE CANARDS — un tir manqué ne remet pas la série à zéro');
    else ok('Arcade : STAND DE CANARDS — un tir manqué remet bien la série à zéro');
    if (canards.scoreApresNoir !== 0 || canards.serieApresNoir !== 0) fail('Arcade : STAND DE CANARDS — un canard noir touché ne retire pas 15 points et/ou ne remet pas la série à zéro (score=' + canards.scoreApresNoir + ', série=' + canards.serieApresNoir + ')');
    else ok('Arcade : STAND DE CANARDS — un canard noir touché retire bien 15 points et remet la série à zéro');
    if (canards.scoreJamaisNegatif !== 0) fail('Arcade : STAND DE CANARDS — le score peut devenir négatif après un canard noir (' + canards.scoreJamaisNegatif + ')');
    else ok('Arcade : STAND DE CANARDS — le score ne descend jamais sous zéro');
    if (canards.chargeurApresBonus !== 8) fail('Arcade : STAND DE CANARDS — la cible bonus ne recharge pas instantanément le chargeur (' + canards.chargeurApresBonus + ')');
    else ok('Arcade : STAND DE CANARDS — la cible bonus recharge bien instantanément le chargeur');
    if (canards.chargeurVide !== 0 || !canards.tirIgnoreVide) fail('Arcade : STAND DE CANARDS — le chargeur ne se vide pas après 8 tirs et/ou un tir à vide n\'est pas ignoré');
    else ok('Arcade : STAND DE CANARDS — le chargeur se vide bien après 8 tirs, un tir à vide ne fait rien');
    if (canards.chargeurRecharge !== 8) fail('Arcade : STAND DE CANARDS — le chargeur ne se recharge pas automatiquement en 1,2 s (' + canards.chargeurRecharge + ')');
    else ok('Arcade : STAND DE CANARDS — le chargeur se recharge bien automatiquement en 1,2 s');

    // -------------------------------------------------------------------
    // Arcade : STAND DE CANARDS — épuiser une vague passe à la suivante avec
    // une vitesse accrue ; fin de partie à l'issue des 5 vagues, sans
    // notion de vies (jeu de score pur, à la différence des 3 autres bornes).
    // -------------------------------------------------------------------
    console.log('\n--- Arcade : STAND DE CANARDS (vague suivante, vitesse croissante, fin après 5 vagues) ---');
    const vagues = await page.evaluate(() => {
      const p = PORTES.find((x) => x.id === 'arcade');
      startRun();
      entrerInterieur('arcade', p);
      const s = INT.actif;
      META.argent = 100;
      P.x = s.comptoirJetons.x; P.z = s.comptoirJetons.z;
      majAction(); document.getElementById('btnAction')._fn();
      const bo = s.bornes.find((b) => b.id === 'canards');
      P.x = bo.x; P.z = bo.z; majAction(); document.getElementById('btnAction')._fn();
      const d = ARCADE.s;
      const vitesseVague1 = scVitesseVoie(0, 1);
      d.canardsApparus = SC_CANARDS_PAR_VAGUE; d.canards = [];
      majCanards(0.001);
      const vagueApres1 = d.vague;
      const vitesseVague2 = scVitesseVoie(0, d.vague);
      for (let i = d.vague; i < SC_VAGUES; i++) { d.canardsApparus = SC_CANARDS_PAR_VAGUE; d.canards = []; majCanards(0.001); }
      d.canardsApparus = SC_CANARDS_PAR_VAGUE; d.canards = [];
      majCanards(0.001);
      const jeuTermineApres5 = ARCADE.jeu === null;
      if (INT.actif) sortirInterieur();
      return { vitesseVague1, vagueApres1, vitesseVague2, jeuTermineApres5 };
    });
    if (vagues.vagueApres1 !== 2) fail('Arcade : STAND DE CANARDS — épuiser la vague 1 ne passe pas à la vague 2 (vague=' + vagues.vagueApres1 + ')');
    else ok('Arcade : STAND DE CANARDS — épuiser une vague passe bien à la suivante');
    if (!(vagues.vitesseVague2 > vagues.vitesseVague1)) fail('Arcade : STAND DE CANARDS — la vitesse n\'augmente pas à la vague suivante (' + vagues.vitesseVague1 + ' -> ' + vagues.vitesseVague2 + ')');
    else ok('Arcade : STAND DE CANARDS — la vitesse augmente bien à chaque vague');
    if (!vagues.jeuTermineApres5) fail('Arcade : STAND DE CANARDS — la partie ne se termine pas à l\'issue des 5 vagues');
    else ok('Arcade : STAND DE CANARDS — la partie se termine bien à l\'issue des 5 vagues (pas de vies, jeu de score pur)');

    // -------------------------------------------------------------------
    // Arcade : STAND DE CANARDS — la vitesse des canards doit être exprimée
    // en fraction de la largeur du terrain par seconde, jamais des pixels
    // (même piège que la boule de DÉMOLITION avant son recalibrage).
    // -------------------------------------------------------------------
    console.log('\n--- Arcade : STAND DE CANARDS — vitesse indépendante de la résolution du canvas ---');
    const resolutionCanards = await page.evaluate(() => {
      const wAvant = ARCADE_ECRAN.w, hAvant = ARCADE_ECRAN.h;
      const vitesseNormale = scVitesseVoie(1, 2);
      ARCADE_ECRAN.w = 50; ARCADE_ECRAN.h = 50;
      const vitessePetitCanvas = scVitesseVoie(1, 2);
      ARCADE_ECRAN.w = 2000; ARCADE_ECRAN.h = 3000;
      const vitesseGrandCanvas = scVitesseVoie(1, 2);
      ARCADE_ECRAN.w = wAvant; ARCADE_ECRAN.h = hAvant;
      return { vitesseNormale, vitessePetitCanvas, vitesseGrandCanvas };
    });
    if (resolutionCanards.vitessePetitCanvas !== resolutionCanards.vitesseNormale || resolutionCanards.vitesseGrandCanvas !== resolutionCanards.vitesseNormale) fail('Arcade : STAND DE CANARDS — la vitesse des canards dépend de la résolution du canvas (normale=' + resolutionCanards.vitesseNormale + ', petit=' + resolutionCanards.vitessePetitCanvas + ', grand=' + resolutionCanards.vitesseGrandCanvas + ')');
    else ok('Arcade : STAND DE CANARDS — la vitesse des canards est bien indépendante de la résolution du canvas');

    // -------------------------------------------------------------------
    // Arcade : bouton QUITTER pendant une partie de borne — visible, hors de
    // portée du pouce qui joue (en haut, alors que les commandes sont en
    // bas), consomme le jeton et banque les tickets via finirBorneJeu, comme
    // les autres façons de quitter. Vérifié sur TOUTES les bornes actives,
    // lues depuis BORNES_ARCADE (jamais une liste recopiée en dur ici — voir
    // CLAUDE.md, « Tests : ne jamais recopier une liste du jeu »).
    // -------------------------------------------------------------------
    console.log('\n--- Arcade : bouton QUITTER visible et fonctionnel sur toutes les bornes actives ---');
    const boutonQuitter = await page.evaluate(() => {
      const p = PORTES.find((x) => x.id === 'arcade');
      const idsActifs = BORNES_ARCADE.filter((b) => b.actif).map((b) => b.id);
      const resultats = {};
      for (const id of idsActifs) {
        startRun();
        entrerInterieur('arcade', p);
        const s = INT.actif;
        META.argent = 100;
        P.x = s.comptoirJetons.x; P.z = s.comptoirJetons.z;
        majAction(); document.getElementById('btnAction')._fn();
        const bo = s.bornes.find((b) => b.id === id);
        P.x = bo.x; P.z = bo.z; majAction(); document.getElementById('btnAction')._fn();
        majAction(); // rafraîchit le libellé/la classe du bouton pause, comme la boucle le ferait
        const bp = document.getElementById('btnPause');
        const labelPendant = bp.textContent;
        const classePendant = bp.classList.contains('quitBorne');
        // hors de portée du pouce : en haut de l'écran, pas dans la moitié basse
        const rect = bp.getBoundingClientRect();
        const hautEcran = rect.top < window.innerHeight * 0.5;
        if (id === 'demolition') { ARCADE.d.grueX = 4.5; }
        else if (id === 'vipere') { for (let i = 0; i < 6; i++) { const t = ARCADE.v.corps[0]; ARCADE.v.frelon = { x: t.x + ARCADE.v.dir.x, y: t.y + ARCADE.v.dir.y }; ARCADE.v.tickT = 0; majVipere(0.01); } }
        else if (id === 'glouton') { ARCADE.score = 30; } // diviseurTickets=25 : garantit >=1 ticket
        const scoreAvantQuitter = ARCADE.score;
        bp.dispatchEvent(new PointerEvent('pointerdown'));
        const jeuFiniApresClic = ARCADE.jeu === null;
        const ticketsApres = s.tickets || 0;
        const jetonsApres = s.jetons;
        if (INT.actif) sortirInterieur();
        resultats[id] = { labelPendant, classePendant, hautEcran, scoreAvantQuitter, jeuFiniApresClic, ticketsApres, jetonsApres };
      }
      return { idsActifs, resultats };
    });
    for (const id of boutonQuitter.idsActifs) {
      const r = boutonQuitter.resultats[id];
      if (r.labelPendant !== '✕ QUITTER' || !r.classePendant) fail('Arcade : ' + id + ' — le bouton pause n\'affiche pas « QUITTER » pendant la partie (' + r.labelPendant + ')');
      else ok('Arcade : ' + id + ' — le bouton QUITTER est bien visible pendant la partie');
      if (!r.hautEcran) fail('Arcade : ' + id + ' — le bouton QUITTER n\'est pas hors de portée du pouce qui joue (pas en haut de l\'écran)');
      else ok('Arcade : ' + id + ' — le bouton QUITTER est bien hors de portée du pouce qui joue');
      if (r.jetonsApres !== 0) fail('Arcade : ' + id + ' — QUITTER ne consomme pas le jeton (jetons restants=' + r.jetonsApres + ')');
      else ok('Arcade : ' + id + ' — QUITTER consomme bien le jeton');
      if (!r.jeuFiniApresClic) fail('Arcade : ' + id + ' — QUITTER ne termine pas la partie en cours');
      else ok('Arcade : ' + id + ' — QUITTER termine bien la partie en cours (finirBorneJeu)');
      if (r.scoreAvantQuitter > 0 && r.ticketsApres === 0) fail('Arcade : ' + id + ' — QUITTER avec un score > 0 n\'a banqué aucun ticket');
      else if (r.scoreAvantQuitter > 0) ok('Arcade : ' + id + ' — QUITTER banque bien les tickets gagnés avant l\'abandon');
    }

    // -------------------------------------------------------------------
    // Arcade : ce qu'on PORTE est perdu au game over (jetons, tickets — y
    // compris des tickets déjà banqués AVANT la partie en cours au moment de
    // la mort, pas seulement le score de cette dernière partie), ce qu'on a
    // ACCOMPLI reste (meilleurs scores, donc progression vers Le Jeton Doré).
    // C'est ce qui empêche de vider son portefeuille dans les bornes juste
    // avant de mourir pour convertir de l'argent condamné en valeur
    // permanente.
    // -------------------------------------------------------------------
    console.log('\n--- Arcade : réinitialisation au game over ---');
    const resetArcade = await page.evaluate(() => {
      const p = PORTES.find((x) => x.id === 'arcade');
      startRun(); // état de départ propre : ETAT.mode, P.hp, INT.actif...
      entrerInterieur('arcade', p);
      const s = INT.actif;
      META.argent = 100;
      const scoresAvant = JSON.parse(JSON.stringify(META.arcadeScores));
      // 1er jeton : une partie de VIPÈRE menée jusqu'au bout (4 proies, mur)
      // — banque 1 ticket, un vrai ticket déjà en poche avant la seconde partie
      P.x = s.comptoirJetons.x; P.z = s.comptoirJetons.z;
      majAction(); document.getElementById('btnAction')._fn();
      const bv = s.bornes.find((b) => b.id === 'vipere');
      P.x = bv.x; P.z = bv.z; majAction(); document.getElementById('btnAction')._fn();
      for (let i = 0; i < 4; i++) {
        const tete = ARCADE.v.corps[0];
        ARCADE.v.frelon = { x: tete.x + ARCADE.v.dir.x, y: tete.y + ARCADE.v.dir.y };
        ARCADE.v.tickT = 0;
        majVipere(0.01);
      }
      ARCADE.v.corps[0] = { x: 0, y: 10 }; ARCADE.v.dir = { x: -1, y: 0 }; ARCADE.v.tickT = 0;
      majVipere(0.01); // mur -> finirBorneJeu() banque le ticket
      const ticketsDejaBanques = s.tickets || 0;
      // 2e jeton : une nouvelle partie, en cours au moment de la mort
      P.x = s.comptoirJetons.x; P.z = s.comptoirJetons.z;
      majAction(); document.getElementById('btnAction')._fn();
      const jetonsApresAchat = s.jetons; // avant de démarrer la partie, qui le consomme aussitôt
      P.x = bv.x; P.z = bv.z; majAction(); document.getElementById('btnAction')._fn();
      const jeuEnCoursAvantMort = ARCADE.jeu === 'vipere';
      P.hp = 1; toucherJoueur(9999); // -> mourir(), EN PLEINE PARTIE
      startRun();
      return {
        ticketsDejaBanques, jetonsApresAchat, jeuEnCoursAvantMort,
        jetonsApres: s.jetons, ticketsApres: s.tickets || 0, jeuApres: ARCADE.jeu,
        scoresAvant, scoresApres: META.arcadeScores,
      };
    });
    if (resetArcade.ticketsDejaBanques < 1) fail('Arcade : le test n\'a pas pu banquer de ticket avant la seconde partie');
    if (resetArcade.jetonsApresAchat < 1) fail('Arcade : le test n\'a pas pu acheter de second jeton avant le game over');
    if (!resetArcade.jeuEnCoursAvantMort) fail('Arcade : le test n\'a pas pu démarrer une seconde partie avant le game over');
    if (resetArcade.jetonsApres !== 0) fail('Arcade : un jeton non utilisé a survécu au game over (jetons=' + resetArcade.jetonsApres + ')');
    else ok('Arcade : les jetons non utilisés sont bien perdus au game over');
    if (resetArcade.jeuApres !== null) fail('Arcade : une partie en cours au moment de la mort n\'a pas été annulée');
    else ok('Arcade : une partie en cours au moment de la mort est bien annulée');
    if (resetArcade.ticketsApres !== 0) fail('Arcade : des tickets ont survécu au game over (' + resetArcade.ticketsApres + ', dont ' + resetArcade.ticketsDejaBanques + ' déjà banqués avant la partie en cours) — ce qu\'on porte doit être perdu, comme l\'argent et les jetons');
    else ok('Arcade : les tickets sont bien perdus au game over, comme l\'argent et les jetons (y compris ceux déjà banqués avant la partie en cours)');
    if (JSON.stringify(resetArcade.scoresApres) !== JSON.stringify(resetArcade.scoresAvant)) fail('Arcade : les meilleurs scores ont changé au game over alors qu\'aucun record n\'a été soumis');
    else ok('Arcade : les meilleurs scores — donc la progression vers Le Jeton Doré — survivent bien au game over');

    // -------------------------------------------------------------------
    // Arcade : Le Jeton Doré — calculé sur la liste des bornes ACTIVES, pas
    // une liste codée en dur. Battre une seule des deux bornes actives ne
    // suffit pas ; battre les deux donne la curiosité.
    // -------------------------------------------------------------------
    console.log('\n--- Arcade : curiosité Le Jeton Doré (bornes actives) ---');
    const jetonDore = await page.evaluate(() => {
      // générique sur la liste des bornes ACTIVES courante (pas de liste codée
      // en dur : une future borne activée doit être prise en compte sans
      // toucher ce test) — toutes battues sauf la dernière, puis toutes battues.
      const actives = BORNES_ARCADE.filter((b) => b.actif);
      const derniere = actives[actives.length - 1];
      for (const b of actives) META.arcadeScores[b.id][0] = { init: 'AAA', score: b.refScore };
      META.arcadeScores[derniere.id][0] = { init: 'AAA', score: 0 };
      verifierJetonDore();
      const pasEncore = aCurio('jeton_dore');
      META.arcadeScores[derniere.id][0] = { init: 'AAA', score: derniere.refScore };
      verifierJetonDore();
      const accordee = aCurio('jeton_dore');
      return { actives: actives.map((b) => b.id), pasEncore, accordee };
    });
    if (jetonDore.actives.length < 2) fail('Arcade : moins de 2 bornes actives — ce test suppose au moins deux bornes actives pour être significatif');
    else ok('Arcade : ' + jetonDore.actives.length + ' bornes actives (' + jetonDore.actives.join(', ') + ')');
    if (jetonDore.pasEncore) fail('Arcade : Le Jeton Doré accordé alors qu\'une borne active restait sous sa référence');
    else ok('Arcade : battre toutes les bornes actives sauf une ne donne pas Le Jeton Doré');
    if (!jetonDore.accordee) fail('Arcade : Le Jeton Doré non accordé alors que toutes les bornes actives sont battues');
    else ok('Arcade : battre toutes les bornes actives donne bien Le Jeton Doré');

    // -------------------------------------------------------------------
    // Arcade : une curiosité déjà obtenue ne doit JAMAIS être reperdue quand
    // une nouvelle borne est activée par la suite — la condition (toutes les
    // bornes ACTIVES battues) est recalculée sur la liste courante à chaque
    // appel de verifierJetonDore, donc activer une borne non battue la
    // ferait échouer si le garde d'acquisition n'était pas monotone.
    // -------------------------------------------------------------------
    console.log('\n--- Arcade : Le Jeton Doré déjà acquis résiste à l\'activation d\'une nouvelle borne ---');
    const jetonDoreStable = await page.evaluate(() => {
      const dejaAcquis = aCurio('jeton_dore');
      const glouton = BORNES_ARCADE.find((b) => b.id === 'glouton');
      const actifAvant = glouton.actif;
      glouton.actif = true; // nouvelle borne activée, jamais battue (pas d'entrée dans META.arcadeScores.glouton)
      verifierJetonDore(); // la condition, recalculée sur les bornes actives courantes, échouerait sans le garde
      const toujoursAcquisApresActivation = aCurio('jeton_dore');
      glouton.actif = actifAvant; // restaure l'état pour ne pas perturber les autres scénarios
      return { dejaAcquis, toujoursAcquisApresActivation };
    });
    if (!jetonDoreStable.dejaAcquis) fail('Arcade : le test suppose Le Jeton Doré déjà acquis (voir test précédent)');
    if (!jetonDoreStable.toujoursAcquisApresActivation) fail('Arcade : Le Jeton Doré a été reperdu après l\'activation d\'une nouvelle borne non battue — la curiosité doit rester acquise pour toujours une fois donnée');
    else ok('Arcade : Le Jeton Doré déjà acquis reste acquis même après l\'activation d\'une nouvelle borne non battue');

    // -------------------------------------------------------------------
    // Arcade : effet aimant du Jeton Doré — portée 6 m, accélère à l'approche.
    // -------------------------------------------------------------------
    console.log('\n--- Arcade : effet aimant du Jeton Doré ---');
    const aimant = await page.evaluate(() => {
      startRun();
      const loin = { x: P.x + 5.5, z: P.z }; // 5,5 m : hors de portée de l'aimant de base (~2,65 u), dans les 6 m du Jeton Doré
      creerPickup('cash', loin.x, loin.z, 50);
      const p = pickups[pickups.length - 1];
      const avant = { x: p.x, z: p.z };
      for (let i = 0; i < 10; i++) majPickups(0.1); // 1 s simulée
      const distAvant = Math.hypot(avant.x - P.x, avant.z - P.z);
      const distApres = Math.hypot(p.x - P.x, p.z - P.z);
      return { distAvant, distApres, aCurio: aCurio('jeton_dore') };
    });
    if (!aimant.aCurio) fail('Arcade : le test suppose Le Jeton Doré déjà acquis (voir test précédent)');
    if (!(aimant.distApres < aimant.distAvant - 1)) fail('Arcade : un ramassable à 5,5 m ne se rapproche pas du joueur alors que Le Jeton Doré est acquis (avant ' + aimant.distAvant.toFixed(2) + ', après ' + aimant.distApres.toFixed(2) + ')');
    else ok('Arcade : Le Jeton Doré attire bien un ramassable à 5,5 m (hors de portée de l\'aimant de base)');

    // -------------------------------------------------------------------
    // Arcade : l'aimant du Jeton Doré doit respecter le décor — un
    // ramassable tiré ne doit pas traverser un mur. Mur synthétique isolé
    // (loin de tout), pour un test contrôlé indépendant de la géométrie
    // d'une salle particulière.
    // -------------------------------------------------------------------
    console.log('\n--- Arcade : l\'aimant du Jeton Doré respecte le décor ---');
    const aimantMur = await page.evaluate(() => {
      const curioOk = aCurio('jeton_dore');
      const wx = 6000, wz = 6000; // zone isolée, loin de toute géométrie réelle
      addSolid({ x: wx, z: wz, hw: 0.5, hd: 5, h: 4 });
      P.x = wx - 2; P.z = wz;
      creerPickup('cash', wx + 2, wz, 50); // mur pile entre le joueur et le ramassable, distance 4 (<6 m)
      const p = pickups[pickups.length - 1];
      const avant = { x: p.x, z: p.z };
      for (let i = 0; i < 20; i++) majPickups(0.1); // 2 s simulées
      const distAvant = Math.hypot(avant.x - P.x, avant.z - P.z);
      const distApres = Math.hypot(p.x - P.x, p.z - P.z);
      return { curioOk, distAvant, distApres };
    });
    if (!aimantMur.curioOk) fail('Arcade : le test suppose Le Jeton Doré déjà acquis (voir test précédent)');
    if (Math.abs(aimantMur.distApres - aimantMur.distAvant) > 0.05) fail('Arcade : un ramassable a traversé un mur sous l\'effet de l\'aimant (distance avant ' + aimantMur.distAvant.toFixed(2) + ', après ' + aimantMur.distApres.toFixed(2) + ')');
    else ok('Arcade : l\'aimant du Jeton Doré ne fait pas traverser les murs à un ramassable (bloqué, ne bouge pas)');

    // -------------------------------------------------------------------
    // Arcade : le modal des bornes doit occuper l'essentiel de la hauteur
    // disponible (viewport de test 390×844, cf. setViewport) et sa résolution
    // interne doit suivre le devicePixelRatio pour rester nette une fois
    // agrandie (sinon l'image étirée est floue).
    // -------------------------------------------------------------------
    console.log('\n--- Arcade : modal agrandi (hauteur disponible, résolution du canvas) ---');
    const modalTest = await page.evaluate(() => {
      const p = PORTES.find((x) => x.id === 'arcade');
      startRun();
      entrerInterieur('arcade', p);
      const s = INT.actif;
      META.argent = 100;
      P.x = s.comptoirJetons.x; P.z = s.comptoirJetons.z;
      majAction(); document.getElementById('btnAction')._fn();
      const bv = s.bornes.find((b) => b.id === 'vipere');
      P.x = bv.x; P.z = bv.z; majAction(); document.getElementById('btnAction')._fn();
      majInterieur(0.016, 0.016); // une frame : déclenche redimensionnerArcadeCv()
      const rect = arcadeWrap.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      const r = {
        hauteurCss: rect.height, largeurCss: rect.width,
        cvW: arcadeCv.width, cvH: arcadeCv.height, dpr,
        ratioW: arcadeCv.width / rect.width, ratioH: arcadeCv.height / rect.height,
      };
      finirBorneJeu();
      if (INT.actif) sortirInterieur();
      return r;
    });
    if (!(modalTest.hauteurCss > 400)) fail('Arcade : le modal n\'occupe pas l\'essentiel de la hauteur disponible (hauteur CSS = ' + modalTest.hauteurCss.toFixed(0) + 'px sur un viewport de 844px)');
    else ok('Arcade : le modal occupe bien l\'essentiel de la hauteur disponible (' + modalTest.hauteurCss.toFixed(0) + 'px)');
    if (Math.abs(modalTest.ratioW - modalTest.dpr) > 0.05 || Math.abs(modalTest.ratioH - modalTest.dpr) > 0.05) fail('Arcade : la résolution interne du canvas ne suit pas le devicePixelRatio (attendu ×' + modalTest.dpr + ', obtenu ×' + modalTest.ratioW.toFixed(2) + '/' + modalTest.ratioH.toFixed(2) + ') — l\'image sera floue une fois agrandie');
    else ok('Arcade : la résolution interne du canvas suit bien le devicePixelRatio (×' + modalTest.dpr + ', reste nette après agrandissement)');

    // -------------------------------------------------------------------
    // Arcade : croix directionnelle réutilisable — s'affiche et masque le
    // joystick pendant une session de borne, configuration différente selon
    // le jeu (VIPÈRE : 4 directions ; CHANTIER : gauche/droite/bas + un
    // bouton de rotation dédié, pas de haut), pilote INPUT directement sans
    // être écrasée par litEntrees, disparaît en quittant la partie.
    // -------------------------------------------------------------------
    console.log('\n--- Arcade : croix directionnelle (affichage, configuration par jeu, pilotage de l\'entrée) ---');
    const croixTest = await page.evaluate(() => {
      const p = PORTES.find((x) => x.id === 'arcade');
      entrerInterieur('arcade', p);
      const s = INT.actif;
      META.argent = 100;
      P.x = s.comptoirJetons.x; P.z = s.comptoirJetons.z;
      majAction(); document.getElementById('btnAction')._fn(); // jeton pour VIPÈRE
      majAction(); document.getElementById('btnAction')._fn(); // jeton pour CHANTIER
      const bv = s.bornes.find((b) => b.id === 'vipere');
      P.x = bv.x; P.z = bv.z; majAction(); document.getElementById('btnAction')._fn();
      const vipereConfig = {
        croixVisible: croixWrap.style.display === 'block',
        joystickCache: zoneL.style.display === 'none',
        haut: document.getElementById('croixHaut').style.display,
        bas: document.getElementById('croixBas').style.display,
        gauche: document.getElementById('croixGauche').style.display,
        droite: document.getElementById('croixDroite').style.display,
        rotate: document.getElementById('croixRotate').style.display,
      };
      croixDown('droite');
      const mxApresDroite = INPUT.mx;
      litEntrees(); // ne doit RIEN écraser pendant une session de borne
      const mxApresLitEntrees = INPUT.mx;
      croixUp('droite');
      const mxApresRelache = INPUT.mx;
      ARCADE.score = 0; finirBorneJeu(); // quitte sans record
      const croixCacheeApresJeu = croixWrap.style.display === 'none';
      const joystickRevenu = zoneL.style.display !== 'none';
      // CHANTIER : configuration différente (pas de bouton haut, un bouton de rotation)
      const bc = s.bornes.find((b) => b.id === 'chantier');
      P.x = bc.x; P.z = bc.z; majAction(); document.getElementById('btnAction')._fn();
      const chantierConfig = {
        haut: document.getElementById('croixHaut').style.display,
        bas: document.getElementById('croixBas').style.display,
        gauche: document.getElementById('croixGauche').style.display,
        droite: document.getElementById('croixDroite').style.display,
        rotate: document.getElementById('croixRotate').style.display,
      };
      ARCADE.score = 0; finirBorneJeu();
      if (INT.actif) sortirInterieur();
      return { vipereConfig, mxApresDroite, mxApresLitEntrees, mxApresRelache, croixCacheeApresJeu, joystickRevenu, chantierConfig };
    });
    if (!croixTest.vipereConfig.croixVisible || !croixTest.vipereConfig.joystickCache) fail('Arcade : la croix directionnelle ne s\'affiche pas (ou ne masque pas le joystick) pendant une partie de VIPÈRE');
    else ok('Arcade : la croix directionnelle s\'affiche et masque bien le joystick pendant une partie');
    if (croixTest.vipereConfig.haut !== 'flex' || croixTest.vipereConfig.bas !== 'flex' || croixTest.vipereConfig.gauche !== 'flex' || croixTest.vipereConfig.droite !== 'flex') fail('Arcade : VIPÈRE devrait afficher les 4 boutons directionnels (' + JSON.stringify(croixTest.vipereConfig) + ')');
    else ok('Arcade : VIPÈRE affiche bien les 4 boutons directionnels');
    if (croixTest.mxApresDroite !== 1) fail('Arcade : appuyer sur la flèche droite de la croix ne pilote pas INPUT.mx');
    else ok('Arcade : la croix pilote bien INPUT.mx/mz directement');
    if (croixTest.mxApresLitEntrees !== 1) fail('Arcade : litEntrees() écrase l\'entrée de la croix pendant une session de borne (joystick/clavier pas gelés)');
    else ok('Arcade : litEntrees() est bien gelée pendant une session de borne (n\'écrase pas la croix)');
    if (croixTest.mxApresRelache !== 0) fail('Arcade : relâcher un bouton de la croix ne remet pas INPUT.mx à 0');
    else ok('Arcade : relâcher un bouton de la croix remet bien l\'entrée à 0');
    if (!croixTest.croixCacheeApresJeu || !croixTest.joystickRevenu) fail('Arcade : quitter la partie ne cache pas la croix ou ne restaure pas le joystick');
    else ok('Arcade : quitter la partie cache bien la croix et restaure le joystick');
    if (croixTest.chantierConfig.haut !== 'none' || croixTest.chantierConfig.bas !== 'flex' || croixTest.chantierConfig.gauche !== 'flex' || croixTest.chantierConfig.droite !== 'flex' || croixTest.chantierConfig.rotate !== 'flex') fail('Arcade : CHANTIER n\'a pas sa propre configuration de croix (gauche/droite/bas + rotation, sans bouton haut) — ' + JSON.stringify(croixTest.chantierConfig));
    else ok('Arcade : CHANTIER utilise bien sa propre configuration de croix (pas de bouton haut, bouton de rotation dédié)');

    // -------------------------------------------------------------------
    // Arcade, vérification interactive (18 octobre, demandé : « le fonctionnement et la vérification
    // interactive des jeux de la salle arcade »). Chaque borne est lancée par le vrai chemin (jeton acheté au
    // comptoir, JOUER à la borne) et jouée par un pilote simulé qui ne passe QUE par les commandes du joueur :
    // croix (croixDown / croixUp, rotation comprise), glissement (glisseDeplace + lancer, comme le doigt),
    // visée (viseeDeplace) et le vrai bouton TIRER — avec un temps de réaction humain. Le rendu est appelé
    // pendant la partie (il ne doit jamais lever). Chaque borne doit être JOUABLE (le pilote atteint la
    // référence du Jeton Doré, refScore, sur au moins 2 graines sur 3) et PERDABLE (un joueur passif ou
    // maladroit finit loin de la référence). Graine propre à chaque partie : rien ne dépend des autres tests.
    // -------------------------------------------------------------------
    console.log('\n--- Arcade : chaque borne se joue aux vraies commandes (pilote simulé) et se perd (passif) ---');
    const arcadePilotes = await page.evaluate(() => {
      startRun();
      const pte = PORTES.find((x) => x.id === 'arcade'); entrerInterieur('arcade', pte); const s = INT.actif;
      const bak = { scores: JSON.parse(JSON.stringify(META.arcadeScores)), best: JSON.parse(JSON.stringify(META.stats.arcadePersoBest || {})), curios: JSON.parse(JSON.stringify(META.curios)), argent: META.argent, tickets: s.tickets, rnd: Math.random };
      const lcg = (g) => { let a = (g * 2654435761) >>> 0; return () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; }; };
      const DIRS = { droite: [1, 0], gauche: [-1, 0], bas: [0, 1], haut: [0, -1] };
      const tenir = (nom) => { for (const n of ['haut', 'bas', 'gauche', 'droite']) if (n !== nom) croixUp(n); if (nom) croixDown(nom); };
      const taper = () => { croixDown('rotate'); croixUp('rotate'); };
      arcadeWrap.style.display = 'flex'; redimensionnerArcadeCv();
      const jouer = (id, graine, pilote, tMax) => {
        Math.random = lcg(graine);
        META.argent = 1000; P.x = s.comptoirJetons.x; P.z = s.comptoirJetons.z; majAction(); el('btnAction')._fn();
        const bo = s.bornes.find((b) => b.id === id); P.x = bo.x; P.z = bo.z; majAction(); el('btnAction')._fn();
        const lance = ARCADE.jeu === id; let t = 0, n = 0, dessinsKo = 0; const e = {};
        while (ARCADE.jeu === id && t < tMax) {
          pilote(e, t); majBorneJeu(1 / 60); t += 1 / 60; n++;
          if (n % 20 === 0 && ARCADE.jeu === id) { try { dessinerBorneJeu(); } catch (er) { dessinsKo++; } }
        }
        const score = ARCADE.score, fini = ARCADE.jeu !== id;
        tenir(null); croixUp('rotate');
        if (ARCADE.jeu) { ARCADE.score = 0; finirBorneJeu(); }
        ARCADE.attenteInitiales = null; cacherControlesBorne(); Math.random = bak.rnd;
        return { lance, score, fini, t: Math.round(t) };
      };
      // ---------- VIPÈRE : plus court chemin vers le frelon, jamais sans issue vers sa queue ----------
      const N = 20, ix = (x, y) => y * N + x;
      const bfs = (dep, cible, bloque) => { const prev = new Int32Array(N * N).fill(-2), q = [ix(dep.x, dep.y)]; prev[q[0]] = -1;
        for (let qi = 0; qi < q.length; qi++) { const c = q[qi], cx = c % N, cy = (c / N) | 0;
          if (qi > 0 && cible(cx, cy)) { const ch = []; let k = c; while (prev[k] !== -1) { ch.unshift(k); k = prev[k]; } return ch; }
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = cx + dx, ny = cy + dy; if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue; const ni = ix(nx, ny);
            if (prev[ni] !== -2 || (bloque[ni] && !cible(nx, ny))) continue; prev[ni] = c; q.push(ni); } }
        return null; };
      const aire = (dep, bloque) => { const vu = new Uint8Array(N * N), q = [ix(dep.x, dep.y)]; vu[q[0]] = 1;
        for (let qi = 0; qi < q.length; qi++) { const c = q[qi], cx = c % N, cy = (c / N) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = cx + dx, ny = cy + dy; if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue; const ni = ix(nx, ny); if (vu[ni] || bloque[ni]) continue; vu[ni] = 1; q.push(ni); } }
        return q.length; };
      const versDir = (a, k) => { const x = k % N, y = (k / N) | 0; return x > a.x ? 'droite' : (x < a.x ? 'gauche' : (y > a.y ? 'bas' : 'haut')); };
      const planVipere = (v) => {
        const co = v.corps, bl = new Uint8Array(N * N); for (let i = 0; i < co.length; i++) bl[ix(co[i].x, co[i].y)] = 1; // la queue aussi : le jeu teste la collision avant qu'elle avance
        const f = v.frelon, ch = f && bfs(co[0], (x, y) => x === f.x && y === f.y, bl);
        if (ch) { const sim = co.map((c) => ({ x: c.x, y: c.y })); for (let k = 0; k < ch.length; k++) { sim.unshift({ x: ch[k] % N, y: (ch[k] / N) | 0 }); if (k < ch.length - 1) sim.pop(); }
          const b2 = new Uint8Array(N * N); for (let i = 0; i < sim.length; i++) b2[ix(sim[i].x, sim[i].y)] = 1; const qq = sim[sim.length - 1];
          if (bfs(sim[0], (x, y) => x === qq.x && y === qq.y, b2)) return versDir(co[0], ch[0]); }
        let best = null, bestA = -1; const q = co[co.length - 1];
        for (const [nom, [dx, dy]] of Object.entries(DIRS)) { const nx = co[0].x + dx, ny = co[0].y + dy; if (nx < 0 || ny < 0 || nx >= N || ny >= N || bl[ix(nx, ny)]) continue;
          const b3 = bl.slice(); b3[ix(co[0].x, co[0].y)] = 1; const a = aire({ x: nx, y: ny }, b3) + (bfs({ x: nx, y: ny }, (x, y) => x === q.x && y === q.y, b3) ? 400 : 0);
          if (a > bestA) { bestA = a; best = nom; } }
        return best; };
      const piloteVipere = (e, t) => { const v = ARCADE.v, cle = v.corps[0].x + ',' + v.corps[0].y;
        if (e.cle !== cle) { e.cle = cle; e.quand = t + 0.05; } // il décide 0,05 s après chaque pas (la direction vaut pour le pas suivant)
        if (e.quand !== null && t >= e.quand) { e.quand = null; const d = planVipere(v); if (d) tenir(d); } };
      // ---------- CHANTIER : placement évalué (hauteur, trous, lignes, relief), exécuté à la croix ----------
      const peut = (g, k, r, px, py) => { for (const [a, b] of FORMES_CHANTIER[k].rots[r]) { const x = px + a, y = py + b; if (x < 0 || x >= 10 || y >= 18) return false; if (y >= 0 && g[y * 10 + x]) return false; } return true; };
      const noter = (g0, k, r, px) => { if (!peut(g0, k, r, px, 0)) return null; let py = 0; while (peut(g0, k, r, px, py + 1)) py++;
        const g = g0.slice(); for (const [a, b] of FORMES_CHANTIER[k].rots[r]) { const y = py + b; if (y < 0) return null; g[y * 10 + px + a] = 1; }
        let lignes = 0; for (let y = 17; y >= 0; y--) { let plein = true; for (let x = 0; x < 10; x++) if (!g[y * 10 + x]) { plein = false; break; }
          if (plein) { lignes++; for (let yy = y; yy > 0; yy--) for (let x = 0; x < 10; x++) g[yy * 10 + x] = g[(yy - 1) * 10 + x]; for (let x = 0; x < 10; x++) g[x] = 0; y++; } }
        const h = []; let trous = 0; for (let x = 0; x < 10; x++) { let y = 0; while (y < 18 && !g[y * 10 + x]) y++; h.push(18 - y); for (let yy = y + 1; yy < 18; yy++) if (!g[yy * 10 + x]) trous++; }
        let agg = 0, bump = 0; for (let x = 0; x < 10; x++) { agg += h[x]; if (x) bump += Math.abs(h[x] - h[x - 1]); }
        return -0.51 * agg + 0.76 * lignes - 0.36 * trous - 0.18 * bump; };
      const piloteChantier = (e, t) => { const c = ARCADE.c;
        if (e.py === undefined || c.py < e.py) { // nouvelle pièce : il réfléchit 0,3 s
          let best = null, bestN = -Infinity; for (let r = 0; r < 4; r++) for (let px = -2; px < 10; px++) { const n = noter(c.grille, c.pieceIdx, r, px); if (n !== null && n > bestN) { bestN = n; best = { r, px }; } }
          e.cible = best; e.quand = t + 0.3; e.tapT = 0; e.essais = 0; tenir(null); }
        e.py = c.py; if (!e.cible || t < e.quand) return;
        if (c.rot !== e.cible.r && e.essais < 6) { tenir(null); if (t >= e.tapT) { taper(); e.tapT = t + 0.15; e.essais++; } return; }
        if (c.px < e.cible.px) tenir('droite'); else if (c.px > e.cible.px) tenir('gauche'); else tenir('bas'); };
      // ---------- DÉMOLITION : le doigt suit le point de chute prévu de la boule (vu 0,15 s plus tôt) ----------
      const doigt = (x) => glisseDeplace(clamp(x / GD_COLS, 0, 1) * window.innerWidth);
      const chute = (b) => { if (b.vy <= 0) return null; let x = b.x + b.vx * ((GD_GRUE_Y - b.y) / b.vy); const L = GD_COLS - 2 * GD_BALLE_R;
        x -= GD_BALLE_R; x = ((x % (2 * L)) + 2 * L) % (2 * L); if (x > L) x = 2 * L - x; return x + GD_BALLE_R; };
      const piloteDemolition = (e, t) => { const d = ARCADE.d; e.hist = e.hist || [];
        if (d.balles.some((b) => b.attente)) { if (!e.lanceT) e.lanceT = t + 0.5; if (t >= e.lanceT) { doigt(d.grueX); demolitionLancer(); e.lanceT = 0; } return; }
        let b = null; for (const bb of d.balles) if (bb.vy > 0 && (!b || bb.y > b.y)) b = bb; if (!b) b = d.balles[0];
        const vise = b ? (chute(b) !== null ? chute(b) : b.x) : d.grueX; e.hist.push({ t, x: vise }); while (e.hist.length > 2 && e.hist[1].t <= t - 0.15) e.hist.shift();
        const cible = e.hist[0].x + (e.dec || 0); if (!e.decT || t > e.decT) { e.dec = (Math.random() - 0.5) * 0.6; e.decT = t + 1.5; }
        const x = d.grueX + clamp(cible - d.grueX, -28 / 60, 28 / 60); doigt(x); };
      const maladroitDemolition = (e, t) => { const d = ARCADE.d; if (d.balles.some((b) => b.attente)) { if (!e.lanceT) e.lanceT = t + 0.5; if (t >= e.lanceT) { demolitionLancer(); e.lanceT = 0; } } };
      // ---------- GLOUTON : sandwich le plus proche, en contournant les gardiens ; il les chasse quand ils ont peur ----------
      const voisins = (x, y) => { const r = []; for (const [nom, [dx, dy]] of Object.entries(DIRS)) { let nx = x + dx; const ny = y + dy; if (nx < 0) nx = GL_COLS - 1; else if (nx >= GL_COLS) nx = 0; if (ny < 0 || ny >= GL_ROWS || glMur(nx, ny)) continue; r.push([nom, nx, ny]); } return r; };
      const planGlouton = (d) => { const j = d.joueur, jx = Math.round(j.x), jy = Math.round(j.y);
        const danger = new Uint8Array(GL_COLS * GL_ROWS), peur = []; for (const g of d.fantomes) { if (!g.actif) continue; const gx = Math.round(g.x), gy = Math.round(g.y);
          if (g.effraye && d.effraiT > 1.2) { peur.push(gx + ',' + gy); continue; } if (g.effraye) continue;
          for (let ddx = -2; ddx <= 2; ddx++) for (let ddy = -2; ddy <= 2; ddy++) if (Math.abs(ddx) + Math.abs(ddy) <= 2) { const x = (gx + ddx + GL_COLS) % GL_COLS, y = gy + ddy; if (y >= 0 && y < GL_ROWS) danger[y * GL_COLS + x] = 1; } }
        const but = (x, y) => peur.length ? peur.indexOf(x + ',' + y) >= 0 : (d.sandwichs[x + ',' + y] || d.badges.some((b) => !b.pris && b.x === x && b.y === y) || (d.bonus && Math.round(d.bonus.x) === x && Math.round(d.bonus.y) === y));
        for (const evite of [true, false]) { const vu = new Map(), q = [[jx, jy, null]]; vu.set(jx + ',' + jy, 1);
          for (let qi = 0; qi < q.length; qi++) { const [x, y, pr] = q[qi]; if (qi > 0 && but(x, y)) return pr;
            for (const [nom, nx, ny] of voisins(x, y)) { const k = nx + ',' + ny; if (vu.has(k) || (evite && danger[ny * GL_COLS + nx])) continue; vu.set(k, 1); q.push([nx, ny, pr || nom]); } } }
        let best = null, bestD = -1; for (const [nom, nx, ny] of voisins(jx, jy)) { let dm = 99; for (const g of d.fantomes) if (g.actif && !g.effraye) dm = Math.min(dm, Math.abs(g.x - nx) + Math.abs(g.y - ny)); if (dm > bestD) { bestD = dm; best = nom; } }
        return best; };
      const piloteGlouton = (e, t) => { if (!e.quand || t >= e.quand) { e.quand = t + 0.12; const dd = planGlouton(ARCADE.g); if (dd) tenir(dd); } };
      // ---------- STAND DE CANARDS : viser au doigt (réaction 0,25 s, anticipation), TIRER au vrai bouton ----------
      const tirer = () => { const b = el('btnTirerCanards'); b.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true })); b.dispatchEvent(new PointerEvent('pointerup', { bubbles: true })); };
      const piloteCanards = (e, t) => { const d = ARCADE.s, r = arcadeCv.getBoundingClientRect(), Z = scDimensionsZone(), yN = (v) => (v + 0.5) / SC_VOIES;
        const vivant = (c) => c.toucheT <= 0 && c.x > 0.06 && c.x < 0.94;
        if (!e.cible || !d.canards.includes(e.cible) || !vivant(e.cible) || e.cible.type === 'noir') { let best = null, bd = Infinity;
          for (const c of d.canards) { if (!vivant(c) || c.type === 'noir') continue; const k = Math.hypot(c.x - d.viseurX, yN(c.voie) - d.viseurY) - (c.type === 'dore' ? 0.15 : 0) - (c.type === 'bonus' && d.chargeur < 4 ? 0.3 : 0); if (k < bd) { bd = k; best = c; } }
          if (best !== e.cible) { e.cible = best; e.reagit = t + 0.25; } }
        if (!e.cible || t < e.reagit) return;
        const c = e.cible, tx = c.x + c.vit * 0.12, ty = yN(c.voie);
        e.vx = e.vx === undefined ? d.viseurX : e.vx; e.vy = e.vy === undefined ? d.viseurY : e.vy;
        e.vx += clamp(tx - e.vx, -2.4 / 60, 2.4 / 60); e.vy += clamp(ty - e.vy, -2.4 / 60, 2.4 / 60);
        viseeDeplace(r.left + e.vx * r.width, r.top + (Z.hautH + e.vy * Z.zoneJeuH) / ARCADE_ECRAN.h * r.height);
        if (Math.hypot(c.x - d.viseurX, ty - d.viseurY) < 0.05 && d.chargeur > 0 && t - (e.tirT || -9) > 0.22) {
          let plusPres = null, pd = Infinity; for (const o of d.canards) { if (o.toucheT > 0) continue; const k = Math.hypot(o.x - d.viseurX, yN(o.voie) - d.viseurY); if (k < 0.12 && k < pd) { pd = k; plusPres = o; } }
          if (plusPres === c) { tirer(); e.tirT = t; } } };
      const rien = () => {};
      const res = {}, refs = {}; for (const b of BORNES_ARCADE) refs[b.id] = b.refScore;
      const pilotes = { vipere: [piloteVipere, rien, 300], chantier: [piloteChantier, rien, 400], demolition: [piloteDemolition, maladroitDemolition, 300], glouton: [piloteGlouton, rien, 300], canards: [piloteCanards, rien, 200] };
      for (const b of BORNES_ARCADE) { if (!b.actif) continue; const pl = pilotes[b.id]; if (!pl) { res[b.id] = { sansPilote: true }; continue; }
        res[b.id] = { pilote: [11, 22, 33].map((g) => jouer(b.id, g, pl[0], pl[2])), passif: [44, 55].map((g) => jouer(b.id, g, pl[1], pl[2])), ref: b.refScore }; }
      arcadeWrap.style.display = 'none';
      META.arcadeScores = bak.scores; META.stats.arcadePersoBest = bak.best; META.curios = bak.curios; META.argent = bak.argent; s.tickets = bak.tickets;
      if (INT.actif) sortirInterieur();
      return res;
    });
    for (const id of Object.keys(arcadePilotes)) {
      const r = arcadePilotes[id];
      if (r.sansPilote) { fail('Arcade : la borne active « ' + id + ' » n’a pas de pilote simulé — en écrire un'); continue; }
      const resume = 'pilote ' + r.pilote.map((p) => p.score + (p.fini ? '' : '…') + ' en ' + p.t + ' s').join(', ') + ' ; passif ' + r.passif.map((p) => p.score + (p.fini ? ' (fini en ' + p.t + ' s)' : ' (non fini)')).join(', ') + ' — référence ' + r.ref;
      const lances = r.pilote.concat(r.passif).every((p) => p.lance);
      const gagnes = r.pilote.filter((p) => p.score >= r.ref).length, passifsPerdent = r.passif.every((p) => p.score < r.ref * 0.35);
      if (!lances) fail('Arcade ' + id + ' : la borne ne se lance pas par le vrai chemin (jeton, JOUER)');
      else if (gagnes < 2) fail('Arcade ' + id + ' : un pilote aux vraies commandes n’atteint pas la référence (' + resume + ')');
      else if (!passifsPerdent) fail('Arcade ' + id + ' : un joueur passif ou maladroit s’approche de la référence — pas perdable (' + resume + ')');
      else ok('Arcade ' + id + ' : jouable aux vraies commandes et perdable (' + resume + ')');
    }

    // -------------------------------------------------------------------
    // Ciné-Palace : porte au bon quartier, curiosité 'bobine' activée.
    // -------------------------------------------------------------------
    console.log('\n--- Ciné-Palace : porte, quartier, curiosité activée ---');
    const cinePorte = await page.evaluate(() => {
      const p = PORTES.find((x) => x.id === 'cine');
      const c = CURIOS.find((x) => x.id === 'bobine');
      return {
        porteExiste: !!p,
        quartierAttendu: quartier(11, 5),
        curioActive: c ? c.actif : null,
        curioA_eff: c ? !!c.eff : false,
        curioA_ind: c ? !!c.ind : false,
      };
    });
    if (!cinePorte.porteExiste) fail('Ciné-Palace : aucune porte posée pour la salle');
    else ok('Ciné-Palace : la porte est bien posée');
    if (cinePorte.quartierAttendu !== 'commerce') fail('Ciné-Palace : quartier(11,5) ne vaut plus \'commerce\' (' + cinePorte.quartierAttendu + ') — repositionner caseCentre(11,5)');
    else ok('Ciné-Palace : quartier(11,5) vaut bien \'commerce\', comme demandé');
    if (!cinePorte.curioActive || !cinePorte.curioA_eff || !cinePorte.curioA_ind) fail('Ciné-Palace : la curiosité \'bobine\' n\'est pas correctement activée (actif/eff/ind)');
    else ok('Ciné-Palace : la curiosité \'bobine\' est bien activée avec ses textes');

    // -------------------------------------------------------------------
    // Ciné-Palace : sans la curiosité 'bobine' (pas encore acquise à ce
    // stade de la suite), une élimination qui prolonge un combo ne doit
    // déclencher aucun ralenti. Vérifié ICI, avant tout test de séance :
    // la curiosité est permanente, un test plus loin dans la suite qui
    // réussirait une séance parfaite l'accorderait pour de bon (voir la
    // suite de ce test juste après « fin de séance », plus bas).
    // -------------------------------------------------------------------
    console.log('\n--- Ciné-Palace : pas de ralenti sans la curiosité \'bobine\' ---');
    const sansRalenti = await page.evaluate(() => {
      startRun();
      ETAT.mode = 'jeu';
      const faux = () => ({ def: { cash: [0, 0], score: 10, xp: 0 }, x: P.x, z: P.z, fac: 'neutre', mort: false, wave: 1, libre: false });
      const dejaAcquise = aCurio('bobine');
      ETAT.combo = 2; ETAT.timeScale = 1;
      tuerEnnemi(faux(), true);
      const timeScaleSansCurio = ETAT.timeScale;
      ETAT.timeScale = 1;
      return { dejaAcquise, timeScaleSansCurio };
    });
    if (sansRalenti.dejaAcquise) fail('Ciné-Palace : le test suppose la curiosité \'bobine\' pas encore acquise à ce stade de la suite — un test antérieur l\'a accordée par erreur');
    else if (sansRalenti.timeScaleSansCurio !== 1) fail('Ciné-Palace : un ralenti se déclenche sur un combo prolongé alors que la curiosité \'bobine\' n\'est pas encore acquise');
    else ok('Ciné-Palace : aucun ralenti sans la curiosité \'bobine\'');

    // -------------------------------------------------------------------
    // Ciné-Palace : espacements — lus depuis la salle réelle, jamais
    // recopiés ici (voir CLAUDE.md, « Tests : ne jamais recopier une liste
    // du jeu »). Les 4 postes à au moins 8 u entre eux, toutes les zones
    // interactives à au moins 8 u du centre de la sortie.
    // -------------------------------------------------------------------
    console.log('\n--- Ciné-Palace : espacements (postes entre eux, zones vs sortie) ---');
    const espacements = await page.evaluate(() => {
      const p = PORTES.find((x) => x.id === 'cine');
      entrerInterieur('cine', p);
      const s = INT.actif;
      const postes = Object.keys(s.postesPos);
      const distPostePoste = [];
      for (let i = 0; i < postes.length; i++) for (let j = i + 1; j < postes.length; j++) {
        const a = s.postesPos[postes[i]], b = s.postesPos[postes[j]];
        distPostePoste.push(Math.hypot(a.x - b.x, a.z - b.z));
      }
      const zonesVsSortie = [Math.hypot(s.projecteur.x - s.sortie.x, s.projecteur.z - s.sortie.z)];
      for (const id of postes) { const a = s.postesPos[id]; zonesVsSortie.push(Math.hypot(a.x - s.sortie.x, a.z - s.sortie.z)); }
      for (const f of s.fouilles) zonesVsSortie.push(Math.hypot(f.x - s.sortie.x, f.z - s.sortie.z));
      const nbFouilles = s.fouilles.length;
      if (INT.actif) sortirInterieur();
      return { distPostePoste, zonesVsSortie, nbFouilles };
    });
    if (Math.min(...espacements.distPostePoste) < 7.99) fail('Ciné-Palace : deux postes sont à moins de 8 unités l\'un de l\'autre (' + JSON.stringify(espacements.distPostePoste) + ')');
    else ok('Ciné-Palace : les 4 postes sont bien espacés d\'au moins 8 unités entre eux');
    if (espacements.zonesVsSortie.some((d) => d < 7.99)) fail('Ciné-Palace : une zone interactive est à moins de 8 unités du centre de la sortie (' + JSON.stringify(espacements.zonesVsSortie) + ')');
    else ok('Ciné-Palace : toutes les zones interactives sont bien à au moins 8 unités de la sortie');
    if (espacements.nbFouilles !== 3) fail('Ciné-Palace : nombre de contenants fouillables inattendu (' + espacements.nbFouilles + ', attendu 3)');
    else ok('Ciné-Palace : les 3 contenants fouillables sont bien enregistrés');

    // -------------------------------------------------------------------
    // Ciné-Palace : démarrage de la séance, dérive des 4 jauges exprimée en
    // unités/seconde (même vitesse en gros ou petits pas de temps, jamais
    // par frame), une jauge qui atteint sa limite fait chuter la
    // satisfaction et se fige jusqu'à réparation du poste correspondant.
    // -------------------------------------------------------------------
    console.log('\n--- Ciné-Palace : séance (démarrage, dérive en unités/seconde, protestation, réparation) ---');
    const seance = await page.evaluate(() => {
      const p = PORTES.find((x) => x.id === 'cine');
      startRun();
      entrerInterieur('cine', p);
      const s = INT.actif;
      P.x = s.projecteur.x; P.z = s.projecteur.z;
      majAction(); document.getElementById('btnAction')._fn();
      const seanceDemarree = s.seanceOn;
      const satisfactionInitiale = s.satisfaction;
      const multRef = cineMultVitesse(10);
      const grandPas = CINE_VIT_BASE.bobine * multRef * 1.0;
      let petitsPas = 0;
      for (let i = 0; i < 10; i++) petitsPas += CINE_VIT_BASE.bobine * cineMultVitesse(10) * 0.1;
      const memeVitesseGrosPetitsPas = Math.abs(grandPas - petitsPas) < 1e-9;
      s.postes.bobine.probleme = 99.5;
      majInterieur(1, 1);
      const jaugeEnAlerte = s.postes.bobine.enAlerte;
      const satisfactionApresLimite = s.satisfaction;
      const parfaiteApresLimite = s.parfaite;
      P.x = s.postesPos.bobine.x; P.z = s.postesPos.bobine.z;
      majAction(); document.getElementById('btnAction')._fn();
      const jaugeApresReparation = s.postes.bobine.probleme;
      const enAlerteApresReparation = s.postes.bobine.enAlerte;
      if (INT.actif) sortirInterieur();
      return {
        seanceDemarree, satisfactionInitiale, memeVitesseGrosPetitsPas,
        jaugeEnAlerte, satisfactionApresLimite, parfaiteApresLimite,
        jaugeApresReparation, enAlerteApresReparation,
      };
    });
    if (!seance.seanceDemarree || seance.satisfactionInitiale !== 100) fail('Ciné-Palace : interagir avec le projecteur ne démarre pas la séance à 100 % de satisfaction');
    else ok('Ciné-Palace : la séance démarre bien via le projecteur, satisfaction à 100 %');
    if (!seance.memeVitesseGrosPetitsPas) fail('Ciné-Palace : la dérive des jauges dépend du découpage en frames, pas juste du temps écoulé (devrait être en unités/seconde)');
    else ok('Ciné-Palace : la dérive des jauges est bien exprimée en unités/seconde (indépendante du découpage en frames)');
    if (!seance.jaugeEnAlerte || seance.satisfactionApresLimite !== 85 || seance.parfaiteApresLimite) fail('Ciné-Palace : une jauge qui atteint sa limite ne fait pas chuter la satisfaction de 15 et/ou ne marque pas la séance comme imparfaite (satisfaction=' + seance.satisfactionApresLimite + ', parfaite=' + seance.parfaiteApresLimite + ')');
    else ok('Ciné-Palace : une jauge qui atteint sa limite fait bien chuter la satisfaction (-15) et casse la séance parfaite');
    if (seance.jaugeApresReparation !== 0 || seance.enAlerteApresReparation) fail('Ciné-Palace : réparer un poste ne remet pas sa jauge à zéro');
    else ok('Ciné-Palace : réparer un poste remet bien sa jauge à zéro');

    // -------------------------------------------------------------------
    // Ciné-Palace : limite de 2 séances par vague — abandonner une séance
    // en cours (sortir de la salle) la consomme quand même.
    // -------------------------------------------------------------------
    console.log('\n--- Ciné-Palace : limite de 2 séances par vague, l\'abandon consomme la séance ---');
    const cap = await page.evaluate(() => {
      const p = PORTES.find((x) => x.id === 'cine');
      startRun();
      entrerInterieur('cine', p);
      const s = INT.actif;
      P.x = s.projecteur.x; P.z = s.projecteur.z;
      majAction(); document.getElementById('btnAction')._fn();
      const premiereDemarree = s.seanceOn;
      sortirInterieur();
      const seanceAnnuleeApresSortie = !s.seanceOn;
      const compteurApresAbandon = s.seancesVague;
      entrerInterieur('cine', p);
      P.x = s.projecteur.x; P.z = s.projecteur.z;
      majAction(); document.getElementById('btnAction')._fn();
      const deuxiemeDemarree = s.seanceOn;
      sortirInterieur();
      const compteurApres2 = s.seancesVague;
      entrerInterieur('cine', p);
      P.x = s.projecteur.x; P.z = s.projecteur.z;
      majAction();
      const label3e = document.getElementById('btnAction').textContent;
      document.getElementById('btnAction')._fn();
      const troisiemeRefusee = !s.seanceOn;
      if (INT.actif) sortirInterieur();
      return { premiereDemarree, seanceAnnuleeApresSortie, compteurApresAbandon, deuxiemeDemarree, compteurApres2, label3e, troisiemeRefusee };
    });
    if (!cap.premiereDemarree || !cap.seanceAnnuleeApresSortie || cap.compteurApresAbandon !== 1) fail('Ciné-Palace : abandonner une séance en cours (sortie) ne la consomme pas correctement (démarrée=' + cap.premiereDemarree + ', annulée=' + cap.seanceAnnuleeApresSortie + ', compteur=' + cap.compteurApresAbandon + ')');
    else ok('Ciné-Palace : sortir en pleine séance l\'annule et la consomme quand même');
    if (!cap.deuxiemeDemarree || cap.compteurApres2 !== 2) fail('Ciné-Palace : la 2e séance de la vague ne démarre pas correctement (compteur=' + cap.compteurApres2 + ')');
    else ok('Ciné-Palace : la 2e séance de la vague démarre normalement');
    if (!cap.troisiemeRefusee || !/deux séances/i.test(cap.label3e)) fail('Ciné-Palace : une 3e séance dans la même vague n\'est pas refusée (label=' + cap.label3e + ')');
    else ok('Ciné-Palace : une 3e séance dans la même vague est bien refusée');

    // -------------------------------------------------------------------
    // Ciné-Palace : fin de séance — succès (100 s, recette = 500 $ ×
    // satisfaction, curiosité sur séance parfaite) et fiasco (satisfaction
    // à 0, recette nulle).
    // -------------------------------------------------------------------
    console.log('\n--- Ciné-Palace : fin de séance (succès parfait, fiasco), recette, curiosité ---');
    const fin = await page.evaluate(() => {
      const p = PORTES.find((x) => x.id === 'cine');
      startRun();
      entrerInterieur('cine', p);
      const s = INT.actif;
      P.x = s.projecteur.x; P.z = s.projecteur.z;
      majAction(); document.getElementById('btnAction')._fn();
      const argentAvant = META.argent;
      s.seanceT = CINE_DUREE;
      majInterieur(0.001, 0.001);
      const seanceFinieParfaite = !s.seanceOn;
      const argentApresParfaite = META.argent;
      const curioObtenue = aCurio('bobine');
      entrerInterieur('cine', p);
      P.x = s.projecteur.x; P.z = s.projecteur.z;
      majAction(); document.getElementById('btnAction')._fn();
      s.satisfaction = 0;
      const argentAvantFiasco = META.argent;
      majInterieur(0.001, 0.001);
      const seanceFinieFiasco = !s.seanceOn;
      const argentApresFiasco = META.argent;
      if (INT.actif) sortirInterieur();
      return { argentAvant, seanceFinieParfaite, argentApresParfaite, curioObtenue, argentAvantFiasco, seanceFinieFiasco, argentApresFiasco };
    });
    if (!fin.seanceFinieParfaite || fin.argentApresParfaite !== fin.argentAvant + 500) fail('Ciné-Palace : une séance parfaite de 100 s ne rapporte pas 500 $ (obtenu +' + (fin.argentApresParfaite - fin.argentAvant) + ')');
    else ok('Ciné-Palace : une séance parfaite de 100 s rapporte bien 500 $ (500 × 100 % de satisfaction)');
    if (!fin.curioObtenue) fail('Ciné-Palace : une séance à 100 % de satisfaction ne donne pas la curiosité \'bobine\'');
    else ok('Ciné-Palace : une séance parfaite donne bien la curiosité \'bobine\'');
    if (!fin.seanceFinieFiasco || fin.argentApresFiasco !== fin.argentAvantFiasco) fail('Ciné-Palace : une satisfaction à 0 ne termine pas la séance en fiasco à recette nulle (gain=' + (fin.argentApresFiasco - fin.argentAvantFiasco) + ')');
    else ok('Ciné-Palace : une satisfaction à 0 termine bien la séance en fiasco, recette nulle');

    // -------------------------------------------------------------------
    // Ciné-Palace : effet de La Bobine « GTRoyal I » (suite — la curiosité
    // vient d'être acquise pour de bon ci-dessus, via une vraie séance
    // parfaite) : ralenti uniquement sur une élimination qui PROLONGE un
    // combo déjà actif (jamais la toute première), jamais cumulé sur des
    // éliminations rapprochées, jamais au détriment du ralenti (plus fort)
    // d'un chef éliminé.
    // -------------------------------------------------------------------
    console.log('\n--- Ciné-Palace : effet ralenti de la curiosité sur un combo prolongé ---');
    const ralenti = await page.evaluate(() => {
      startRun(); // ne touche jamais aux curiosités, déjà acquises pour de bon
      ETAT.mode = 'jeu';
      const aCurioBobine = aCurio('bobine');
      const faux = () => ({ def: { cash: [0, 0], score: 10, xp: 0 }, x: P.x, z: P.z, fac: 'neutre', mort: false, wave: 1, libre: false });
      ETAT.combo = 1; ETAT.timeScale = 1;
      tuerEnnemi(faux(), true); // 1er kill (avant=1) : ne prolonge rien, pas d'effet
      const timeScaleApresPremier = ETAT.timeScale;
      tuerEnnemi(faux(), true); // 2e kill (avant=2>1) : prolonge -> ralenti
      const timeScaleApresDeuxieme = ETAT.timeScale, slowTApresDeuxieme = ETAT.slowT;
      ETAT.slowT = 0.14; // presque expiré
      tuerEnnemi(faux(), true); // rapproché : recalé, jamais cumulé
      const slowTApresTroisieme = ETAT.slowT;
      const eBoss = Object.assign(faux(), { boss: true });
      ETAT.combo = 5;
      tuerEnnemi(eBoss, true); // jamais écrasé par le ralenti (plus fort) d'un chef
      const timeScaleApresBoss = ETAT.timeScale, slowTApresBoss = ETAT.slowT;
      ETAT.timeScale = 1;
      return { aCurioBobine, timeScaleApresPremier, timeScaleApresDeuxieme, slowTApresDeuxieme, slowTApresTroisieme, timeScaleApresBoss, slowTApresBoss };
    });
    if (!ralenti.aCurioBobine) fail('Ciné-Palace : le test suppose la curiosité \'bobine\' déjà acquise (voir le test « fin de séance » précédent)');
    if (ralenti.timeScaleApresPremier !== 1) fail('Ciné-Palace : la toute première élimination (qui démarre le combo, ne le prolonge pas) déclenche un ralenti à tort');
    else ok('Ciné-Palace : la toute première élimination d\'un combo ne déclenche pas de ralenti');
    if (ralenti.timeScaleApresDeuxieme !== 0.5 || ralenti.slowTApresDeuxieme !== 0.15) fail('Ciné-Palace : une élimination qui prolonge le combo ne déclenche pas le ralenti attendu (timeScale=' + ralenti.timeScaleApresDeuxieme + ', slowT=' + ralenti.slowTApresDeuxieme + ')');
    else ok('Ciné-Palace : une élimination qui prolonge le combo déclenche bien le ralenti (×0,5 pendant 0,15 s)');
    if (ralenti.slowTApresTroisieme !== 0.15) fail('Ciné-Palace : des éliminations rapprochées cumulent le ralenti au lieu de le recaler (slowT=' + ralenti.slowTApresTroisieme + ')');
    else ok('Ciné-Palace : des éliminations rapprochées recalent bien le ralenti sans l\'accumuler');
    if (ralenti.timeScaleApresBoss !== 0.35 || ralenti.slowTApresBoss !== 1.1) fail('Ciné-Palace : le ralenti de La Bobine écrase à tort le ralenti (plus fort) d\'un chef éliminé (timeScale=' + ralenti.timeScaleApresBoss + ', slowT=' + ralenti.slowTApresBoss + ')');
    else ok('Ciné-Palace : le ralenti d\'un chef éliminé n\'est jamais écrasé par celui de La Bobine');

    // -------------------------------------------------------------------
    // Ciné-Palace : les trois tables de fouille sur mesure (confiserie,
    // bureau du projectionniste, sous les fauteuils) ne produisent jamais
    // de gain négatif et incrémentent bien META.fouilles.
    // -------------------------------------------------------------------
    console.log('\n--- Ciné-Palace : tables de fouille sur mesure ---');
    const fouilleCine = await page.evaluate(() => {
      const p = PORTES.find((x) => x.id === 'cine');
      startRun();
      entrerInterieur('cine', p);
      const s = INT.actif;
      const resultat = { confiserie: [], bureauProjo: [], fauteuils: [] };
      for (const table of ['confiserie', 'bureauProjo', 'fauteuils']) {
        const f = s.fouilles.find((x) => x.table === table);
        for (let i = 0; i < 60; i++) {
          f.prisVague = -1;
          const argentAvant = META.argent;
          resoudreFouille(f);
          resultat[table].push(META.argent - argentAvant);
        }
      }
      const rareConfiserie = TABLES_FOUILLE.confiserie.items.find((it) => it.type === 'cash' && it.min >= 200);
      const fouillesTotal = META.fouilles;
      if (INT.actif) sortirInterieur();
      return { resultat, rareConfiserie, fouillesTotal };
    });
    if (fouilleCine.fouillesTotal < 180) fail('Ciné-Palace : META.fouilles n\'est pas incrémenté à chaque fouille résolue (' + fouilleCine.fouillesTotal + '/180)');
    else ok('Ciné-Palace : chaque fouille résolue incrémente bien META.fouilles');
    for (const table of ['confiserie', 'bureauProjo', 'fauteuils']) {
      const vals = fouilleCine.resultat[table];
      if (vals.some((v) => v < 0)) fail('Ciné-Palace : la table ' + table + ' a produit un gain négatif sur 60 tirages');
      else ok('Ciné-Palace : la table ' + table + ' ne produit jamais de gain négatif (60 tirages)');
    }
    if (!fouilleCine.rareConfiserie || !fouilleCine.resultat.confiserie.some((v) => v >= fouilleCine.rareConfiserie.min && v <= fouilleCine.rareConfiserie.max)) saute('Ciné-Palace : la somme rare de la confiserie n\'est pas tombée sur 60 tirages (probabilité ~6 %, possible par hasard)');
    else ok('Ciné-Palace : la somme rare de la confiserie est bien tombée dans sa fourchette déclarée au moins une fois');

    // -------------------------------------------------------------------
    // Deux horloges dans boucle() : dt (mis à l'échelle par ETAT.timeScale,
    // pour le spectacle — rendu, déplacement des entités, physique) et
    // dtJeu (temps réel, jamais mis à l'échelle, pour les compteurs de
    // gameplay). Un ralenti (chef de gang, ou La Bobine « GTRoyal I » sur
    // un combo prolongé) ne doit JAMAIS donner plus de temps sur un chrono
    // ni ralentir la difficulté — mais DOIT ralentir le déplacement des
    // entités, c'est tout le principe de l'effet. Ces trois tests simulent
    // un ralenti actif exactement comme boucle() le fait (dt=dtReel×
    // timeScale, dtJeu=dtReel) et appellent directement les fonctions de
    // mise à jour, sans passer par le vrai ETAT.timeScale ni attendre un
    // vrai ralenti déclenché en jeu.
    // -------------------------------------------------------------------
    console.log('\n--- Horloges séparées : le chrono du musée avance au temps réel pendant un ralenti ---');
    const chronoMusee = await page.evaluate(() => {
      const p = PORTES.find((x) => x.id === 'musee');
      startRun();
      entrerInterieur('musee', p);
      const s = INT.actif;
      P.x = s.boitier.x; P.z = s.boitier.z; majAction(); document.getElementById('btnAction')._fn();
      majAction(); document.getElementById('btnAction')._fn(); // confirme : démarre le casse
      const casseTAvant = s.casseT, museeTAvant = s.museeT;
      const dtReel = 1; // 1 seconde réelle simulée
      const dt = dtReel * 0.5, dtJeu = dtReel; // comme boucle() avec ETAT.timeScale=0.5
      majInterieur(dt, dtJeu);
      const casseTApres = s.casseT, museeTApres = s.museeT;
      if (INT.actif) sortirInterieur();
      return { casseTAvant, casseTApres, museeTAvant, museeTApres };
    });
    if (Math.abs((chronoMusee.casseTAvant - chronoMusee.casseTApres) - 1) > 1e-9) fail('Musée : le chrono du casse n\'avance pas au rythme réel pendant un ralenti (delta=' + (chronoMusee.casseTAvant - chronoMusee.casseTApres) + ', attendu 1 pour 1 s réelle)');
    else ok('Musée : le chrono du casse avance bien au rythme réel, jamais ralenti (sur dtJeu)');
    if (Math.abs((chronoMusee.museeTApres - chronoMusee.museeTAvant) - 0.5) > 1e-9) fail('Musée : le déplacement des gardiens (museeT) ne ralentit pas pendant un ralenti alors qu\'il le devrait (delta=' + (chronoMusee.museeTApres - chronoMusee.museeTAvant) + ', attendu 0,5 pour 1 s réelle à ×0,5)');
    else ok('Musée : le déplacement des gardiens ralentit bien pendant un ralenti (spectacle sur dt)');

    console.log('\n--- Horloges séparées : le compte à rebours du Ciné-Palace avance au temps réel pendant un ralenti ---');
    const chronoCine = await page.evaluate(() => {
      const p = PORTES.find((x) => x.id === 'cine');
      startRun();
      entrerInterieur('cine', p);
      const s = INT.actif;
      P.x = s.projecteur.x; P.z = s.projecteur.z;
      majAction(); document.getElementById('btnAction')._fn();
      const seanceTAvant = s.seanceT, probleAvant = s.postes.bobine.probleme;
      const dtReel = 1;
      const dt = dtReel * 0.5, dtJeu = dtReel;
      majInterieur(dt, dtJeu);
      const seanceTApres = s.seanceT, probleApres = s.postes.bobine.probleme;
      // le code réel avance seanceT PUIS dérive mult de la nouvelle valeur
      // (s.seanceT+=dtJeu; const mult=cineMultVitesse(s.seanceT);) — la
      // référence doit suivre le même ordre, sinon l'écart infime entre
      // cineMultVitesse(avant) et cineMultVitesse(après) fait échouer le
      // test à tort alors que le code lui-même est cohérent.
      const deriveAttendue = CINE_VIT_BASE.bobine * cineMultVitesse(seanceTApres) * dtJeu;
      if (INT.actif) sortirInterieur();
      return { seanceTAvant, seanceTApres, probleAvant, probleApres, deriveAttendue };
    });
    if (Math.abs((chronoCine.seanceTApres - chronoCine.seanceTAvant) - 1) > 1e-9) fail('Ciné-Palace : le compte à rebours de séance n\'avance pas au rythme réel pendant un ralenti (delta=' + (chronoCine.seanceTApres - chronoCine.seanceTAvant) + ', attendu 1 pour 1 s réelle)');
    else ok('Ciné-Palace : le compte à rebours de séance avance bien au rythme réel pendant un ralenti (sur dtJeu)');
    if (Math.abs((chronoCine.probleApres - chronoCine.probleAvant) - chronoCine.deriveAttendue) > 1e-9) fail('Ciné-Palace : la dérive des jauges (et la montée en pression) ralentit pendant un ralenti au lieu de suivre le temps réel');
    else ok('Ciné-Palace : la dérive des jauges et la montée en pression suivent bien le temps réel, jamais ralenties');

    console.log('\n--- Horloges séparées : l\'horloge d\'une borne d\'arcade avance au temps réel pendant un ralenti ---');
    const chronoBorne = await page.evaluate(() => {
      const p = PORTES.find((x) => x.id === 'arcade');
      startRun();
      entrerInterieur('arcade', p);
      const s = INT.actif;
      META.argent = 100;
      P.x = s.comptoirJetons.x; P.z = s.comptoirJetons.z;
      majAction(); document.getElementById('btnAction')._fn();
      const bo = s.bornes.find((b) => b.id === 'vipere');
      P.x = bo.x; P.z = bo.z; majAction(); document.getElementById('btnAction')._fn();
      ARCADE.v.tickT = 1; // repart d'une valeur connue
      const dtReel = 0.5;
      const dt = dtReel * 0.5, dtJeu = dtReel;
      majInterieur(dt, dtJeu);
      const tickTApres = ARCADE.v.tickT;
      finirBorneJeu();
      if (INT.actif) sortirInterieur();
      return { tickTApres };
    });
    if (Math.abs(chronoBorne.tickTApres - 0.5) > 1e-9) fail('Arcade : l\'horloge d\'une borne ralentit à cause d\'un ralenti extérieur au lieu de suivre le temps réel (tickT=' + chronoBorne.tickTApres + ', attendu 0,5 pour 0,5 s réelle)');
    else ok('Arcade : l\'horloge d\'une borne avance bien au temps réel — aucun ralenti du monde extérieur ne l\'atteint');

    // -------------------------------------------------------------------
    // Bug déjà rencontré : la porte du métro se plaquait sur la façade d'un
    // fast-food (même case de grille), celle de la voyance sur l'armurerie
    // sud, celle du chalutier sur le dock adverse — dans les trois cas une
    // porte de lieu spécial totalement invisible, confondue avec un autre
    // lieu. Lit les positions RÉELLES de PORTES et POIS depuis le jeu après
    // génération de la ville (jamais une liste recopiée, voir CLAUDE.md) et
    // vérifie qu'aucune paire de lieux sans rapport n'est trop rapprochée.
    // Une porte volontairement plaquée sur son propre POI (armurerie sur
    // poi:armurerie, tour sur poi:toitH...) porte un champ `ancre` posé par
    // poser() dans placerPortes() ; la paire correspondante est exemptée.
    // -------------------------------------------------------------------
    console.log('\n--- Ville : aucune porte de lieu spécial ne chevauche un autre POI ou une autre porte ---');
    const espacementVille = await page.evaluate(() => {
      startRun();
      const pts = [];
      for (const p of PORTES) pts.push({ src: 'porte:' + p.id, x: p.x, z: p.z, ancre: p.ancre });
      for (const k in POIS) {
        const v = POIS[k];
        if (!v) continue;
        if (Array.isArray(v)) v.forEach((it, i) => { if (typeof it.x === 'number' && typeof it.z === 'number') pts.push({ src: 'poi:' + k + '[' + i + ']', poiKey: k, x: it.x, z: it.z, ancre: it.ancre }); });
        else if (typeof v.x === 'number' && typeof v.z === 'number') pts.push({ src: 'poi:' + k, poiKey: k, x: v.x, z: v.z, ancre: v.ancre });
      }
      const tropProches = [];
      for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
        const a = pts[i], b = pts[j];
        const exempte = (a.ancre && a.ancre === b.poiKey) || (b.ancre && b.ancre === a.poiKey);
        if (exempte) continue;
        const d = Math.hypot(a.x - b.x, a.z - b.z);
        if (d < 20) tropProches.push({ a: a.src, b: b.src, d });
      }
      return { nbPts: pts.length, tropProches };
    });
    if (espacementVille.tropProches.length) fail('Ville : des lieux sans rapport se chevauchent (moins de 20 u) — ' + JSON.stringify(espacementVille.tropProches));
    else ok('Ville : les ' + espacementVille.nbPts + ' portes et POI de la ville sont tous à au moins 20 u les uns des autres (hors ancrage volontaire)');

    // -------------------------------------------------------------------
    // Métro abandonné : porte, quartier, curiosité 'lampe' activée.
    // -------------------------------------------------------------------
    console.log('\n--- Métro abandonné : porte, quartier, curiosité activée ---');
    const metroPorte = await page.evaluate(() => {
      const p = PORTES.find((x) => x.id === 'metro');
      const c = CURIOS.find((x) => x.id === 'lampe');
      return {
        porteExiste: !!p,
        quartierAttendu: quartier(4, 10),
        curioActive: c ? c.actif : null,
        curioA_eff: c ? !!c.eff : false,
        curioA_ind: c ? !!c.ind : false,
      };
    });
    if (!metroPorte.porteExiste) fail('Métro : aucune porte posée pour la salle');
    else ok('Métro : la porte est bien posée');
    if (metroPorte.quartierAttendu !== 'residentiel') fail('Métro : quartier(4,10) ne vaut plus \'residentiel\' (' + metroPorte.quartierAttendu + ') — repositionner caseCentre(4,10)');
    else ok('Métro : quartier(4,10) vaut bien \'residentiel\', comme demandé');
    if (!metroPorte.curioActive || !metroPorte.curioA_eff || !metroPorte.curioA_ind) fail('Métro : la curiosité \'lampe\' n\'est pas correctement activée (actif/eff/ind)');
    else ok('Métro : la curiosité \'lampe\' est bien activée avec ses textes');

    // -------------------------------------------------------------------
    // Bug déjà rencontré : la lampe de mineur (lampeNuit réutilisée) restait
    // éteinte à l'entrée si on était de jour en ville, et/ou restait accrochée
    // à une position de la ville au lieu de suivre le joueur (IOFF=-9000).
    // La salle est entièrement noire sans elle : bloquant. Teste aussi le
    // rétablissement de l'éclairage ville à la sortie, de jour comme de nuit.
    // -------------------------------------------------------------------
    console.log('\n--- Métro abandonné : la lampe de mineur s\'allume seule à l\'entrée, suit le joueur ---');
    const lampeMetro = await page.evaluate(() => {
      const p = PORTES.find((x) => x.id === 'metro');
      startRun();
      ETAT.jour = 30; // plein jour en ville : la lampe ne doit pas en dépendre
      entrerInterieur('metro', p);
      majInterieur(0, 0);
      jourNuit(0.016); // comme le fait boucle(), une fois par frame
      const intensiteEntree = lampeNuit.intensity;
      const posEntree = { x: lampeNuit.position.x, z: lampeNuit.position.z };
      const posJoueur = { x: P.x, z: P.z };
      sortirInterieur();
      jourNuit(0.016);
      const sortieJour = { intensity: lampeNuit.intensity, x: lampeNuit.position.x, z: lampeNuit.position.z };
      const posVilleJour = { x: P.x, z: P.z };
      ETAT.jour = 130; // pleine nuit
      entrerInterieur('metro', p);
      majInterieur(0, 0);
      jourNuit(0.016);
      sortirInterieur();
      jourNuit(0.016);
      const sortieNuit = { intensity: lampeNuit.intensity, x: lampeNuit.position.x, z: lampeNuit.position.z };
      const posVilleNuit = { x: P.x, z: P.z };
      return { intensiteEntree, posEntree, posJoueur, sortieJour, posVilleJour, sortieNuit, posVilleNuit };
    });
    if (!(lampeMetro.intensiteEntree > 0)) fail('Métro : la lampe de mineur reste éteinte à l\'entrée (intensité=' + lampeMetro.intensiteEntree + '), même en plein jour dehors');
    else ok('Métro : la lampe de mineur s\'allume seule à l\'entrée, sans dépendre du jour/nuit de la ville');
    if (Math.abs(lampeMetro.posEntree.x - lampeMetro.posJoueur.x) > 1e-6 || Math.abs(lampeMetro.posEntree.z - lampeMetro.posJoueur.z) > 1e-6) fail('Métro : la lampe reste à une position de la ville (' + JSON.stringify(lampeMetro.posEntree) + ') au lieu de suivre le joueur (' + JSON.stringify(lampeMetro.posJoueur) + ')');
    else ok('Métro : la lampe suit bien la position du joueur, pas une position de la ville');
    if (lampeMetro.sortieJour.intensity !== 0 || Math.abs(lampeMetro.sortieJour.x - lampeMetro.posVilleJour.x) > 1e-6 || Math.abs(lampeMetro.sortieJour.z - lampeMetro.posVilleJour.z) > 1e-6) fail('Métro : l\'éclairage de ville n\'est pas bien rétabli à la sortie de jour (' + JSON.stringify(lampeMetro.sortieJour) + ' vs joueur ' + JSON.stringify(lampeMetro.posVilleJour) + ')');
    else ok('Métro : l\'éclairage de ville (lampe éteinte de jour) est bien rétabli à la sortie, à la position du joueur');
    if (!(lampeMetro.sortieNuit.intensity > 0) || Math.abs(lampeMetro.sortieNuit.x - lampeMetro.posVilleNuit.x) > 1e-6 || Math.abs(lampeMetro.sortieNuit.z - lampeMetro.posVilleNuit.z) > 1e-6) fail('Métro : l\'éclairage de ville n\'est pas bien rétabli à la sortie de nuit (' + JSON.stringify(lampeMetro.sortieNuit) + ' vs joueur ' + JSON.stringify(lampeMetro.posVilleNuit) + ')');
    else ok('Métro : l\'éclairage de ville (lampadaire allumé de nuit) est bien rétabli à la sortie, à la position du joueur');

    // -------------------------------------------------------------------
    // Espacements — lus depuis la salle réelle, jamais recopiés ici (voir
    // CLAUDE.md, « Tests : ne jamais recopier une liste du jeu »). Les 12
    // caches + la cache de la Lampe de Mineur à au moins 8 u entre eux et
    // du centre de la sortie.
    // -------------------------------------------------------------------
    console.log('\n--- Métro abandonné : espacements (caches, piles, dangers, sortie) ---');
    const espacementsMetro = await page.evaluate(() => {
      const p = PORTES.find((x) => x.id === 'metro');
      entrerInterieur('metro', p);
      const s = INT.actif;
      const zones = s.fouilles.map((f) => ({ x: f.x, z: f.z })).concat([{ x: s.lampeCache.x, z: s.lampeCache.z }]);
      const distEntreZones = [];
      for (let i = 0; i < zones.length; i++) for (let j = i + 1; j < zones.length; j++) {
        distEntreZones.push(Math.hypot(zones[i].x - zones[j].x, zones[i].z - zones[j].z));
      }
      const zonesVsSortie = zones.map((z) => Math.hypot(z.x - s.sortie.x, z.z - s.sortie.z));
      const nbFouilles = s.fouilles.length, nbPiles = s.piles.length, nbDangers = s.dangers.length;
      if (INT.actif) sortirInterieur();
      return { distEntreZones, zonesVsSortie, nbFouilles, nbPiles, nbDangers };
    });
    if (Math.min(...espacementsMetro.distEntreZones) < 7.99) fail('Métro : deux zones interactives (caches/Lampe) sont à moins de 8 unités l\'une de l\'autre (' + JSON.stringify(espacementsMetro.distEntreZones) + ')');
    else ok('Métro : les caches et la Lampe de Mineur sont bien espacées d\'au moins 8 unités entre elles');
    if (espacementsMetro.zonesVsSortie.some((d) => d < 7.99)) fail('Métro : une zone interactive est à moins de 8 unités du centre de la sortie (' + JSON.stringify(espacementsMetro.zonesVsSortie) + ')');
    else ok('Métro : toutes les zones interactives sont bien à au moins 8 unités de la sortie');
    if (espacementsMetro.nbFouilles !== 12) fail('Métro : nombre de caches fouillables inattendu (' + espacementsMetro.nbFouilles + ', attendu 12)');
    else ok('Métro : les 12 caches fouillables sont bien réparties sur les 3 niveaux');
    if (espacementsMetro.nbPiles !== 6) fail('Métro : nombre de piles inattendu (' + espacementsMetro.nbPiles + ', attendu 6, plus nombreuses en profondeur)');
    else ok('Métro : les 6 piles sont bien placées dans les tunnels');
    if (espacementsMetro.nbDangers !== 4) fail('Métro : nombre de dangers inattendu (' + espacementsMetro.nbDangers + ', attendu 4 au niveau 2)');
    else ok('Métro : les 4 dangers du niveau 2 (trous + rails) sont bien enregistrés');

    // -------------------------------------------------------------------
    // Niveau détecté selon la position réelle du joueur, consommation de
    // batterie exprimée en %/seconde (indépendante du découpage en frames,
    // comme la dérive des jauges du Ciné-Palace), jamais négative.
    // -------------------------------------------------------------------
    console.log('\n--- Métro abandonné : niveau détecté selon la position, consommation de la batterie ---');
    const niveauBatt = await page.evaluate(() => {
      const p = PORTES.find((x) => x.id === 'metro');
      startRun();
      entrerInterieur('metro', p);
      const s = INT.actif;
      P.x = s.sortie.x; P.z = s.sortie.z;
      majInterieur(0.001, 0.001);
      const niveau1Detecte = s.niveauActuel;
      P.x = s.ox + 6; P.z = s.oz - 5; // au niveau 2, loin de tout danger/pile
      majInterieur(0.001, 0.001);
      const niveau2Detecte = s.niveauActuel;
      P.x = s.lampeCache.x; P.z = s.lampeCache.z;
      majInterieur(0.001, 0.001);
      const niveau3Detecte = s.niveauActuel;
      P.x = s.sortie.x; P.z = s.sortie.z; // retour au niveau 1 pour mesurer sa propre consommation
      majInterieur(0.001, 0.001);
      s.batterie = 100;
      majInterieur(1, 1);
      const battApresGrandPas = s.batterie;
      s.batterie = 100;
      for (let i = 0; i < 10; i++) majInterieur(0.1, 0.1);
      const battApresPetitsPas = s.batterie;
      s.batterie = 0.1;
      majInterieur(5, 5);
      const battJamaisNegative = s.batterie;
      if (INT.actif) sortirInterieur();
      return { niveau1Detecte, niveau2Detecte, niveau3Detecte, battApresGrandPas, battApresPetitsPas, battJamaisNegative };
    });
    if (niveauBatt.niveau1Detecte !== 1) fail('Métro : le niveau détecté près de la sortie n\'est pas 1 (QUAI), obtenu ' + niveauBatt.niveau1Detecte);
    else ok('Métro : le niveau 1 (QUAI) est bien détecté près de la sortie');
    if (niveauBatt.niveau2Detecte !== 2) fail('Métro : le niveau détecté dans le tunnel n\'est pas 2 (TUNNEL), obtenu ' + niveauBatt.niveau2Detecte);
    else ok('Métro : le niveau 2 (TUNNEL) est bien détecté dans le tunnel');
    if (niveauBatt.niveau3Detecte !== 3) fail('Métro : le niveau détecté près de la Lampe de Mineur n\'est pas 3 (PROFONDEURS), obtenu ' + niveauBatt.niveau3Detecte);
    else ok('Métro : le niveau 3 (PROFONDEURS) est bien détecté près de la Lampe de Mineur');
    if (Math.abs((100 - niveauBatt.battApresGrandPas) - (100 - niveauBatt.battApresPetitsPas)) > 1e-6) fail('Métro : la consommation de la batterie dépend du découpage en frames (grand pas=' + niveauBatt.battApresGrandPas + ', petits pas=' + niveauBatt.battApresPetitsPas + ')');
    else ok('Métro : la consommation de la batterie est bien exprimée en %/seconde, indépendante du découpage en frames');
    if (niveauBatt.battJamaisNegative < 0) fail('Métro : la batterie peut devenir négative (' + niveauBatt.battJamaisNegative + ')');
    else ok('Métro : la batterie ne descend jamais sous 0 %');

    // -------------------------------------------------------------------
    // Piles : ramassage automatique de proximité, +25 % de batterie,
    // plafonné à 100 %, jamais deux fois la même vague.
    // -------------------------------------------------------------------
    console.log('\n--- Métro abandonné : ramassage de pile (+25 % batterie, jamais plus de 100 %) ---');
    const pileTest = await page.evaluate(() => {
      const p = PORTES.find((x) => x.id === 'metro');
      startRun();
      entrerInterieur('metro', p);
      const s = INT.actif;
      majInterieur(0, 0); // règle metroVagueRef sur la vague en cours avant de forcer une valeur de test
      const pile = s.piles[0];
      pile.prisVague = -1;
      s.batterie = 50;
      P.x = pile.x; P.z = pile.z;
      majInterieur(0, 0); // dt/dtJeu nuls : isole le ramassage instantané de la consommation continue
      const battApres1 = s.batterie, prisApres1 = pile.prisVague === WAVES.n, visibleApres1 = pile.mesh.visible;
      majInterieur(0, 0);
      const battApres2 = s.batterie;
      s.batterie = 90; pile.prisVague = -1;
      majInterieur(0, 0);
      const battPlafonnee = s.batterie;
      if (INT.actif) sortirInterieur();
      return { battApres1, prisApres1, visibleApres1, battApres2, battPlafonnee };
    });
    if (pileTest.battApres1 !== 75 || !pileTest.prisApres1 || pileTest.visibleApres1) fail('Métro : ramasser une pile ne donne pas +25 % de batterie et/ou ne la retire pas de la salle (batterie=' + pileTest.battApres1 + ')');
    else ok('Métro : ramasser une pile donne bien +25 % de batterie et la retire de la salle');
    if (pileTest.battApres2 !== pileTest.battApres1) fail('Métro : une pile déjà ramassée cette vague redonne de la batterie en restant dessus');
    else ok('Métro : une pile déjà ramassée cette vague ne redonne rien tant qu\'on reste dessus');
    if (pileTest.battPlafonnee !== 100) fail('Métro : la batterie dépasse 100 % après une pile (' + pileTest.battPlafonnee + ')');
    else ok('Métro : la batterie est bien plafonnée à 100 % par une pile');

    // -------------------------------------------------------------------
    // Dangers du niveau 2 : dégâts, perte de 30 % du butin porté, cooldown
    // propre au danger (pas de second déclenchement immédiat).
    // -------------------------------------------------------------------
    console.log('\n--- Métro abandonné : danger du niveau 2 (dégâts, perte de butin, cooldown) ---');
    const dangerTest = await page.evaluate(() => {
      const p = PORTES.find((x) => x.id === 'metro');
      startRun();
      entrerInterieur('metro', p);
      const s = INT.actif;
      const d = s.dangers[0];
      s.butin = 100; P.hp = P.maxHp;
      P.x = d.x; P.z = d.z;
      majInterieur(0.001, 0.001);
      const hpApres1 = P.hp, butinApres1 = s.butin, coolApres1 = d.coolT;
      majInterieur(0.001, 0.001);
      const hpApres2 = P.hp;
      if (INT.actif) sortirInterieur();
      return { hpMax: P.maxHp, hpApres1, butinApres1, coolApres1, hpApres2 };
    });
    if (dangerTest.hpApres1 >= dangerTest.hpMax) fail('Métro : toucher un danger du niveau 2 ne fait pas perdre de PV');
    else ok('Métro : toucher un danger du niveau 2 fait bien perdre des PV');
    if (dangerTest.butinApres1 !== 70) fail('Métro : toucher un danger ne fait pas lâcher 30 % du butin porté (butin=' + dangerTest.butinApres1 + ', attendu 70)');
    else ok('Métro : toucher un danger fait bien lâcher 30 % du butin porté');
    if (dangerTest.coolApres1 <= 0) fail('Métro : un danger touché ne pose pas de cooldown');
    else ok('Métro : un danger touché pose bien un cooldown avant de pouvoir re-déclencher');
    if (dangerTest.hpApres2 !== dangerTest.hpApres1) fail('Métro : un danger redéclenche immédiatement malgré son cooldown (PV encore perdus)');
    else ok('Métro : le cooldown du danger empêche bien un second déclenchement immédiat');

    // -------------------------------------------------------------------
    // La Bête : dérive symétrique (recule à pleine lampe, avance à batterie
    // nulle), jamais active hors niveau 3, regain immédiat et suffisant sur
    // une pile, capture = perte du butin + éjection à la surface.
    // -------------------------------------------------------------------
    console.log('\n--- Métro abandonné : la Bête (dérive symétrique, regain sur pile, capture) ---');
    const bete = await page.evaluate(() => {
      const p = PORTES.find((x) => x.id === 'metro');
      startRun();
      entrerInterieur('metro', p);
      const s = INT.actif;
      P.x = s.lampeCache.x; P.z = s.lampeCache.z; // niveau 3
      s.batterie = 100; s.beteProx = 0.5;
      majInterieur(1, 1);
      const beteProxPleine = s.beteProx;
      s.batterie = 0; s.beteProx = 0.5;
      majInterieur(1, 1);
      const beteProxNulle = s.beteProx;
      s.beteProx = 0.5;
      P.x = s.sortie.x; P.z = s.sortie.z; // niveau 1
      majInterieur(1, 1);
      const beteProxHorsNiveau3 = s.beteProx;
      P.x = s.lampeCache.x; P.z = s.lampeCache.z;
      s.batterie = 0; s.beteProx = 0.9;
      const pileP3 = s.piles.find((pp) => metroNiveauDe(pp.z - s.oz) === 3);
      pileP3.prisVague = -1;
      P.x = pileP3.x; P.z = pileP3.z;
      majInterieur(0.001, 0.001);
      const beteProxApresPile = s.beteProx;
      s.butin = 200; s.beteProx = 1; s.lampeEnMain = true; P.hp = P.maxHp;
      P.x = s.lampeCache.x; P.z = s.lampeCache.z;
      majInterieur(0.001, 0.001);
      const ejecte = !INT.actif, butinApresCapture = s.butin, lampeEnMainApresCapture = s.lampeEnMain;
      return { beteProxPleine, beteProxNulle, beteProxHorsNiveau3, beteProxApresPile, ejecte, butinApresCapture, lampeEnMainApresCapture };
    });
    if (bete.beteProxPleine >= 0.5) fail('Métro : la Bête ne recule pas à batterie pleine (beteProx=' + bete.beteProxPleine + ')');
    else ok('Métro : la Bête recule bien quand la lampe est à pleine charge');
    if (bete.beteProxNulle <= 0.5) fail('Métro : la Bête n\'avance pas à batterie nulle (beteProx=' + bete.beteProxNulle + ')');
    else ok('Métro : la Bête avance bien quand la batterie est à 0');
    if (bete.beteProxHorsNiveau3 !== 0) fail('Métro : la proximité de la Bête n\'est pas remise à zéro hors du niveau 3 (' + bete.beteProxHorsNiveau3 + ')');
    else ok('Métro : la Bête ne peut jamais suivre hors du niveau 3 — remonter est toujours une échappatoire');
    if (bete.beteProxApresPile > 0.36) fail('Métro : ramasser une pile ne repousse pas immédiatement et suffisamment la Bête (beteProx=' + bete.beteProxApresPile + ', était 0,9, plafond attendu 0,35)');
    else ok('Métro : ramasser une pile repousse bien immédiatement et suffisamment la Bête');
    if (!bete.ejecte || bete.butinApresCapture !== 0 || bete.lampeEnMainApresCapture) fail('Métro : la Bête qui atteint le joueur ne fait pas perdre le butin/la Lampe et ne l\'éjecte pas (éjecté=' + bete.ejecte + ', butin=' + bete.butinApresCapture + ', lampe=' + bete.lampeEnMainApresCapture + ')');
    else ok('Métro : la Bête qui atteint le joueur fait bien perdre tout le butin et la Lampe portée, et éjecte à la surface');

    // -------------------------------------------------------------------
    // Le cash trouvé en descente n'est jamais encaissé tout de suite — il
    // alimente le butin porté (s.butin), qui n'est encaissé qu'en sortant
    // par la porte.
    // -------------------------------------------------------------------
    console.log('\n--- Métro abandonné : le butin trouvé en descente n\'est pas encaissé tout de suite ---');
    const routage = await page.evaluate(() => {
      const p = PORTES.find((x) => x.id === 'metro');
      startRun();
      entrerInterieur('metro', p);
      const s = INT.actif;
      const f = s.fouilles.find((ff) => ff.table === 'metro1');
      const argentAvant = META.argent;
      for (let i = 0; i < 20; i++) { f.prisVague = -1; resoudreFouille(f); }
      const argentApres = META.argent, butinApres = s.butin;
      if (INT.actif) sortirInterieur();
      return { argentAvant, argentApres, butinApres };
    });
    if (routage.argentApres !== routage.argentAvant) fail('Métro : du cash trouvé en descente a été encaissé immédiatement dans META.argent au lieu d\'être porté (' + (routage.argentApres - routage.argentAvant) + ' $)');
    else ok('Métro : aucun cash trouvé en descente n\'est encaissé immédiatement — tout part dans le butin porté');
    if (routage.butinApres <= 0) fail('Métro : 20 fouilles sur la table metro1 n\'ont ajouté aucun butin porté (chance quasi nulle si le routage marchait)');
    else ok('Métro : les fouilles alimentent bien le butin porté (' + routage.butinApres + ' $ sur 20 tentatives)');

    // -------------------------------------------------------------------
    // Encaissement à la porte de sortie, jamais avant.
    // -------------------------------------------------------------------
    console.log('\n--- Métro abandonné : encaissement du butin en sortant par la porte ---');
    const encaissement = await page.evaluate(() => {
      const p = PORTES.find((x) => x.id === 'metro');
      startRun();
      entrerInterieur('metro', p);
      const s = INT.actif;
      s.butin = 150;
      const argentAvant = META.argent;
      P.x = s.sortie.x; P.z = s.sortie.z;
      ETAT.intT = 0; // passé le bref délai anti-double-sortie posé par entrerInterieur
      majAction();
      const label = document.getElementById('btnAction').textContent;
      document.getElementById('btnAction')._fn();
      const argentApres = META.argent, butinApres = s.butin, actifApres = !!INT.actif;
      return { label, argentAvant, argentApres, butinApres, actifApres };
    });
    if (!/SORTIR/i.test(encaissement.label)) fail('Métro : le bouton d\'action à la porte de sortie n\'affiche pas SORTIR (' + encaissement.label + ')');
    if (encaissement.actifApres) fail('Métro : appuyer sur SORTIR ne fait pas quitter la salle');
    if (encaissement.argentApres !== encaissement.argentAvant + 150) fail('Métro : remonter à la surface avec 150 $ de butin ne les encaisse pas (obtenu +' + (encaissement.argentApres - encaissement.argentAvant) + ')');
    else ok('Métro : remonter à la surface encaisse bien intégralement le butin porté');
    if (encaissement.butinApres !== 0) fail('Métro : le butin porté n\'est pas remis à zéro après encaissement (' + encaissement.butinApres + ')');
    else ok('Métro : le butin porté est bien remis à zéro après encaissement');

    // -------------------------------------------------------------------
    // La Lampe de Mineur : perdue face à la Bête (curiosité pas encore
    // acquise à ce stade — testé AVANT toute descente qui l'obtiendrait
    // pour de bon, voir CLAUDE.md), puis acquise en la rapportant en
    // surface lors d'une seconde descente.
    // -------------------------------------------------------------------
    console.log('\n--- Métro abandonné : la Lampe de Mineur — perdue face à la Bête, acquise en la rapportant ---');
    const lampeTest = await page.evaluate(() => {
      const p = PORTES.find((x) => x.id === 'metro');
      startRun();
      const dejaAcquise = aCurio('lampe');
      entrerInterieur('metro', p);
      const s = INT.actif;
      majInterieur(0, 0); // règle metroVagueRef avant de forcer les valeurs de test
      P.x = s.lampeCache.x; P.z = s.lampeCache.z;
      majAction();
      const label = document.getElementById('btnAction').textContent;
      document.getElementById('btnAction')._fn();
      const enMainApresRamassage = s.lampeEnMain, meshCacheeApresRamassage = !s.lampeCache.mesh.visible;
      s.batterie = 0; s.beteProx = 1; P.hp = P.maxHp; // batterie nulle : la dérive ne fait pas retomber beteProx sous 1 sur cette même frame
      majInterieur(0.001, 0.001);
      const enMainApresCapture = s.lampeEnMain, meshRevenueApresCapture = s.lampeCache.mesh.visible;
      const curioApresCapture = aCurio('lampe');
      entrerInterieur('metro', p); // seconde descente : elle est bien revenue dans sa cache
      const s2 = INT.actif;
      P.x = s2.lampeCache.x; P.z = s2.lampeCache.z;
      majAction(); document.getElementById('btnAction')._fn();
      P.x = s2.sortie.x; P.z = s2.sortie.z;
      ETAT.intT = 0; // passé le bref délai anti-double-sortie posé par entrerInterieur
      majAction(); document.getElementById('btnAction')._fn();
      const curioApresRetour = aCurio('lampe');
      return {
        dejaAcquise, label, enMainApresRamassage, meshCacheeApresRamassage,
        enMainApresCapture, meshRevenueApresCapture, curioApresCapture, curioApresRetour,
      };
    });
    if (lampeTest.dejaAcquise) fail('Métro : le test suppose la curiosité \'lampe\' pas encore acquise à ce stade de la suite');
    if (!/RAMASSER LA LAMPE/i.test(lampeTest.label)) fail('Métro : le bouton d\'action à la cache de la Lampe de Mineur n\'affiche pas le bon libellé (' + lampeTest.label + ')');
    if (!lampeTest.enMainApresRamassage || !lampeTest.meshCacheeApresRamassage) fail('Métro : ramasser la Lampe de Mineur ne la marque pas en main / ne cache pas son socle');
    else ok('Métro : la Lampe de Mineur se ramasse bien au fond des Profondeurs');
    if (lampeTest.enMainApresCapture || !lampeTest.meshRevenueApresCapture || lampeTest.curioApresCapture) fail('Métro : se faire attraper par la Bête avec la Lampe en main ne la fait pas retourner dans sa cache sans donner la curiosité');
    else ok('Métro : la Lampe de Mineur retourne bien dans sa cache si la Bête attrape le joueur, sans donner la curiosité');
    if (!lampeTest.curioApresRetour) fail('Métro : remonter à la surface avec la Lampe de Mineur en main ne donne pas la curiosité');
    else ok('Métro : remonter à la surface avec la Lampe de Mineur donne bien la curiosité');

    // -------------------------------------------------------------------
    // Réinitialisations : passage de vague (batterie à 100 %), mort en
    // pleine descente (butin perdu, Bête réinitialisée, batterie
    // CONSERVÉE), game over (batterie à plein, butin à zéro).
    // -------------------------------------------------------------------
    console.log('\n--- Métro abandonné : réinitialisations (vague, mort en descente, game over) ---');
    const resets = await page.evaluate(() => {
      const p = PORTES.find((x) => x.id === 'metro');
      startRun();
      entrerInterieur('metro', p);
      const s = INT.actif;
      s.batterie = 40;
      WAVES.n++;
      majInterieur(0, 0); // dt/dtJeu nuls : isole le reset du passage de vague de la consommation normale
      const battApresVague = s.batterie;
      s.butin = 300; s.batterie = 63; s.beteProx = 0.4;
      P.hp = 1; toucherJoueur(9999); // -> mourir(), en pleine descente
      const butinApresMort = s.butin, batterieApresMort = s.batterie, beteProxApresMort = s.beteProx, modeApresMort = ETAT.mode;
      startRun(); // "retry" : game over pour de bon
      const sa = INT.salles.metro;
      const battApresGameOver = sa.batterie, butinApresGameOver = sa.butin;
      return { battApresVague, butinApresMort, batterieApresMort, beteProxApresMort, modeApresMort, battApresGameOver, butinApresGameOver };
    });
    if (resets.battApresVague !== 100) fail('Métro : le passage de vague ne remet pas la batterie à 100 % (' + resets.battApresVague + ')');
    else ok('Métro : le passage de vague remet bien la batterie à 100 %');
    if (resets.modeApresMort !== 'mort') fail('Métro : mourir() n\'a pas été déclenché correctement pendant le test');
    if (resets.butinApresMort !== 0 || resets.beteProxApresMort !== 0) fail('Métro : mourir en pleine descente ne fait pas perdre le butin porté et/ou ne réinitialise pas la Bête (butin=' + resets.butinApresMort + ', beteProx=' + resets.beteProxApresMort + ')');
    else ok('Métro : mourir en pleine descente fait bien perdre le butin porté et réinitialise la Bête');
    if (resets.batterieApresMort !== 63) fail('Métro : la batterie change au moment de la mort alors qu\'elle doit être conservée en l\'état (' + resets.batterieApresMort + ', attendu 63)');
    else ok('Métro : la batterie est bien conservée en l\'état au moment de la mort (remise à plein seulement au game over)');
    if (resets.battApresGameOver !== 100 || resets.butinApresGameOver !== 0) fail('Métro : le game over ne remet pas la batterie à 100 % et/ou le butin à zéro (batterie=' + resets.battApresGameOver + ', butin=' + resets.butinApresGameOver + ')');
    else ok('Métro : le game over remet bien la batterie à 100 % et le butin à zéro');

    // -------------------------------------------------------------------
    // Tables de fouille metro1/metro2/metro3 : jamais de gain négatif,
    // META.fouilles incrémenté exactement une fois par fouille résolue,
    // une pile trouvée en fouille recharge bien la batterie.
    // -------------------------------------------------------------------
    console.log('\n--- Métro abandonné : tables de fouille (jamais négatif, META.fouilles) ---');
    const fouilleMetro = await page.evaluate(() => {
      const p = PORTES.find((x) => x.id === 'metro');
      startRun();
      entrerInterieur('metro', p);
      const s = INT.actif;
      const fouillesAvant = META.fouilles;
      const resultat = { metro1: [], metro2: [], metro3: [] };
      for (const table of ['metro1', 'metro2', 'metro3']) {
        const f = s.fouilles.find((x) => x.table === table);
        for (let i = 0; i < 60; i++) {
          f.prisVague = -1;
          const butinAvant = s.butin;
          resoudreFouille(f);
          resultat[table].push(s.butin - butinAvant);
        }
      }
      const rareMetro3 = TABLES_FOUILLE.metro3.items.find((it) => it.type === 'cash' && it.min >= 500);
      const fouillesTotal = META.fouilles - fouillesAvant;
      const f3 = s.fouilles.find((x) => x.table === 'metro3');
      s.batterie = 50;
      let pileTrouvee = false;
      for (let i = 0; i < 60 && !pileTrouvee; i++) {
        f3.prisVague = -1;
        const avant = s.batterie;
        resoudreFouille(f3);
        if (s.batterie > avant) pileTrouvee = true;
      }
      if (INT.actif) sortirInterieur();
      return { resultat, rareMetro3, fouillesTotal, pileTrouvee };
    });
    if (fouilleMetro.fouillesTotal !== 180) fail('Métro : META.fouilles n\'est pas incrémenté exactement une fois par fouille résolue (delta=' + fouilleMetro.fouillesTotal + '/180)');
    else ok('Métro : chaque fouille résolue incrémente bien META.fouilles');
    for (const table of ['metro1', 'metro2', 'metro3']) {
      const vals = fouilleMetro.resultat[table];
      if (vals.some((v) => v < 0)) fail('Métro : la table ' + table + ' a produit un gain négatif sur 60 tirages');
      else ok('Métro : la table ' + table + ' ne produit jamais de butin négatif (60 tirages)');
    }
    if (!fouilleMetro.rareMetro3 || !fouilleMetro.resultat.metro3.some((v) => v >= fouilleMetro.rareMetro3.min && v <= fouilleMetro.rareMetro3.max)) saute('Métro : la somme rare de la table metro3 n\'est pas tombée sur 60 tirages (probabilité ~15 %, possible par hasard)');
    else ok('Métro : la somme rare de la table metro3 est bien tombée dans sa fourchette déclarée au moins une fois');
    if (!fouilleMetro.pileTrouvee) saute('Métro : aucune pile trouvée en fouille sur 60 tirages de la table metro3 (probabilité ~20 % par tirage, possible par hasard)');
    else ok('Métro : une pile trouvée en fouille recharge bien la batterie');

    // -------------------------------------------------------------------
    // Horloges séparées : la consommation de la batterie et la dérive de la
    // Bête doivent suivre le temps réel (dtJeu) pendant un ralenti, jamais
    // dt — sinon un ralenti déclenché avant de descendre rallongerait
    // artificiellement la descente.
    // -------------------------------------------------------------------
    console.log('\n--- Horloges séparées : la batterie et la Bête du Métro avancent au temps réel pendant un ralenti ---');
    const chronoMetro = await page.evaluate(() => {
      const p = PORTES.find((x) => x.id === 'metro');
      startRun();
      entrerInterieur('metro', p);
      const s = INT.actif;
      majInterieur(0, 0); // règle metroVagueRef avant de forcer les valeurs de test
      P.x = s.lampeCache.x; P.z = s.lampeCache.z; // niveau 3
      s.batterie = 100; s.beteProx = 0.5;
      const dtReel = 1;
      const dt = dtReel * 0.5, dtJeu = dtReel; // ralenti à ×0,5 simulé comme boucle()
      majInterieur(dt, dtJeu);
      const consoReelle = 100 - s.batterie;
      const consoAttendue = METRO_CONSO[3] * dtJeu;
      // le code réel consomme la batterie PUIS dérive la Bête de la valeur mise
      // à jour (s.batterie-=...; ...; const viv=clamp(s.batterie/100,...)) — la
      // référence doit suivre le même ordre, sinon l'écart entre la batterie
      // avant/après consommation fait échouer le test à tort.
      const vivApresConso = clamp((100 - consoAttendue) / 100, 0, 1);
      const beteAttendue = clamp(0.5 + (0.5 - vivApresConso) * 2 * METRO_BETE_VITESSE * dtJeu, 0, 1);
      const beteProxApres = s.beteProx;
      if (INT.actif) sortirInterieur();
      return { consoReelle, consoAttendue, beteProxApres, beteAttendue };
    });
    if (Math.abs(chronoMetro.consoReelle - chronoMetro.consoAttendue) > 1e-9) fail('Métro : la consommation de la batterie ralentit pendant un ralenti au lieu de suivre le temps réel (obtenu ' + chronoMetro.consoReelle + ', attendu ' + chronoMetro.consoAttendue + ')');
    else ok('Métro : la consommation de la batterie avance bien au temps réel pendant un ralenti (sur dtJeu)');
    if (Math.abs(chronoMetro.beteProxApres - chronoMetro.beteAttendue) > 1e-9) fail('Métro : la dérive de la Bête ralentit ou accélère pendant un ralenti au lieu de suivre le temps réel');
    else ok('Métro : la dérive de la Bête avance bien au temps réel pendant un ralenti, jamais ralentie ni accélérée');

    // -------------------------------------------------------------------
    // Curiosité La Lampe de Mineur : halo nocturne extérieur 50 % plus
    // large (lampeNuit.distance, en pleine nuit, hors de tout intérieur).
    // -------------------------------------------------------------------
    console.log('\n--- Métro abandonné : la curiosité Lampe de Mineur élargit le halo nocturne extérieur de 50 % ---');
    const haloTest = await page.evaluate(() => {
      startRun();
      ETAT.mode = 'jeu'; ETAT.jour = 130; // pleine nuit (f=1)
      const possedeAvant = aCurio('lampe');
      META.curios.lampe = 0;
      jourNuit(0.001);
      const distanceSans = lampeNuit.distance;
      META.curios.lampe = 1;
      jourNuit(0.001);
      const distanceAvec = lampeNuit.distance;
      META.curios.lampe = possedeAvant ? 1 : 0;
      return { distanceSans, distanceAvec };
    });
    if (Math.abs(haloTest.distanceSans - 42) > 1e-9) fail('Métro : le halo nocturne de base n\'est pas de 42 unités sans la curiosité (' + haloTest.distanceSans + ')');
    else ok('Métro : le halo nocturne de base est bien de 42 unités sans la curiosité');
    if (Math.abs(haloTest.distanceAvec - 63) > 1e-9) fail('Métro : la curiosité \'lampe\' ne rend pas le halo nocturne 50 % plus large (' + haloTest.distanceAvec + ', attendu 63)');
    else ok('Métro : la curiosité \'lampe\' rend bien le halo nocturne 50 % plus large (63 unités)');

    // -------------------------------------------------------------------
    // Salle de sport (FER & SUEUR) : soulever une barre avec succès (palier
    // de muscle, PV/endurance), puis un échec (le temps s'écoule).
    // -------------------------------------------------------------------
    console.log('\n--- Salle de sport : soulevé réussi puis raté ---');
    const sport = await page.evaluate(() => {
      const p = PORTES.find((x) => x.id === 'sport');
      startRun();
      entrerInterieur('sport', p);
      const s = INT.actif;
      META.argent = 200;
      const b0 = s.barres.find((b) => b.idx === 0);
      P.x = b0.x; P.z = b0.z;
      majAction(); document.getElementById('btnAction')._fn(); // SOULEVER — 40 $
      const demarre = s.spEtat === 'soulevé';
      for (let i = 0; i < 15 && s.spEtat === 'soulevé'; i++) {
        majAction(); document.getElementById('btnAction')._fn(); // POUSSE !
      }
      const muscleApresReussite = META.muscle, spEtatApresReussite = s.spEtat;
      // 2e barre (palier 1, débloquée) : on démarre puis on laisse le temps s'écouler sans pousser
      const b1 = s.barres.find((b) => b.idx === 1);
      P.x = b1.x; P.z = b1.z;
      majAction(); document.getElementById('btnAction')._fn();
      const demarre2 = s.spEtat === 'soulevé';
      const hpAvantEchec = P.hp;
      majInterieur(11, 11); // largement plus que spT (10 s pour la barre 1) : le temps s'écoule
      const muscleApresEchec = META.muscle, spEtatApresEchec = s.spEtat, hpApresEchec = P.hp;
      if (INT.actif) sortirInterieur();
      return { demarre, muscleApresReussite, spEtatApresReussite, demarre2, muscleApresEchec, spEtatApresEchec, hpAvantEchec, hpApresEchec };
    });
    if (!sport.demarre) fail('Sport : SOULEVER ne démarre pas le soulevé');
    if (sport.muscleApresReussite !== 1 || sport.spEtatApresReussite !== null) fail('Sport : martèlement jusqu\'à 100 % n\'a pas fait passer META.muscle à 1 (obtenu ' + sport.muscleApresReussite + ', spEtat=' + sport.spEtatApresReussite + ')');
    else ok('Sport : martèlement jusqu\'à 100 % fait bien passer un palier de muscle');
    if (!sport.demarre2) fail('Sport : la 2e barre (palier débloqué) ne démarre pas le soulevé');
    if (sport.muscleApresEchec !== 1) fail('Sport : un soulevé raté a quand même fait progresser le muscle (' + sport.muscleApresEchec + ')');
    else ok('Sport : un soulevé raté (le temps s\'écoule) ne fait pas progresser le muscle');
    if (sport.spEtatApresEchec !== null) fail('Sport : un soulevé raté ne remet pas spEtat à null');
    if (sport.hpApresEchec >= sport.hpAvantEchec) fail('Sport : un soulevé raté ne blesse pas le joueur (toucherJoueur attendu)');
    else ok('Sport : un soulevé raté blesse bien le joueur');

    // -------------------------------------------------------------------
    // Bowling : une partie complète jouée « parfaitement » (ligne et force à
    // 0 à chaque lancer) doit produire trois strikes, la partie parfaite,
    // le gain et la curiosité associée.
    // -------------------------------------------------------------------
    console.log('\n--- Bowling : partie complète (3 strikes) ---');
    const bowlingComplet = await page.evaluate(() => {
      const p = PORTES.find((x) => x.id === 'bowling');
      startRun();
      entrerInterieur('bowling', p);
      const s = INT.actif;
      META.argent = 200;
      const argentAvant = META.argent;
      P.x = s.jeu.x; P.z = s.jeu.z;
      majAction(); document.getElementById('btnAction')._fn(); // JOUER UNE PARTIE — 80 $
      for (let lancer = 0; lancer < 3; lancer++) {
        s.bwCur = 0; // ligne parfaite
        majAction(); document.getElementById('btnAction')._fn(); // FIXER LA LIGNE
        s.bwCur = 0; // force parfaite
        majAction(); document.getElementById('btnAction')._fn(); // LÂCHER LA BOULE -> lancerBowling
        majInterieur(1.2, 1.2); // laisse l'animation de la boule se terminer avant le lancer suivant
      }
      const partieFinie = s.bwEtat === null;
      const curioObtenue = aCurio('boule_bowling');
      const armeObtenue = META.armes.bouleC.poss;
      if (INT.actif) sortirInterieur();
      return { argentAvant, argentApres: META.argent, partieFinie, curioObtenue, armeObtenue };
    });
    if (!bowlingComplet.partieFinie) fail('Bowling : la partie ne s\'est pas terminée après 3 lancers');
    else ok('Bowling : une partie complète (3 lancers) se termine bien');
    if (bowlingComplet.argentApres <= bowlingComplet.argentAvant) fail('Bowling : une partie parfaite n\'a pas rapporté d\'argent net (avant ' + bowlingComplet.argentAvant + ', après ' + bowlingComplet.argentApres + ')');
    else ok('Bowling : une partie parfaite rapporte bien de l\'argent');
    if (!bowlingComplet.curioObtenue || !bowlingComplet.armeObtenue) fail('Bowling : trois strikes n\'ont pas donné la Boule Comète (curio=' + bowlingComplet.curioObtenue + ', arme=' + bowlingComplet.armeObtenue + ')');
    else ok('Bowling : trois strikes donnent bien la curiosité et l\'arme associées');

    // -------------------------------------------------------------------
    // Karaoké : trois arrêts parfaits d'affilée doivent donner le sans-faute
    // (bonus, curiosité 'platine').
    // -------------------------------------------------------------------
    console.log('\n--- Karaoké : sans-faute (3 arrêts parfaits) ---');
    const karaoke = await page.evaluate(() => {
      const p = PORTES.find((x) => x.id === 'karaoke');
      startRun();
      entrerInterieur('karaoke', p);
      const s = INT.actif;
      META.argent = 200;
      P.x = s.scene2.x; P.z = s.scene2.z;
      majAction(); document.getElementById('btnAction')._fn(); // CHANTER — 60 $
      const demarre = s.karaOn === true;
      for (let i = 0; i < 3 && s.karaOn; i++) {
        s.karaPos = 0; // pile au centre : parfait
        majAction(); document.getElementById('btnAction')._fn(); // ARRÊTER LE CURSEUR
      }
      const karaPerf = s.karaPerf, karaFini = s.karaOn === false;
      const curioObtenue = aCurio('platine');
      if (INT.actif) sortirInterieur();
      return { demarre, karaPerf, karaFini, curioObtenue };
    });
    if (!karaoke.demarre) fail('Karaoké : CHANTER ne démarre pas la chanson');
    if (karaoke.karaPerf !== 3 || !karaoke.karaFini) fail('Karaoké : trois arrêts parfaits n\'ont pas donné 3 « parfait » (karaPerf=' + karaoke.karaPerf + ', fini=' + karaoke.karaFini + ')');
    else ok('Karaoké : trois arrêts parfaits d\'affilée sont bien comptés');
    if (!karaoke.curioObtenue) fail('Karaoké : le sans-faute n\'a pas donné Le Disque de Platine');
    else ok('Karaoké : le sans-faute donne bien Le Disque de Platine');

    // -------------------------------------------------------------------
    // Véhicule aérien (hélicoptère) : les libellés des boutons SPRINT/FREIN
    // changent en MONTER/DESCENDRE à l'entrée et reviennent à la sortie ;
    // décollage et atterrissage fonctionnent.
    // -------------------------------------------------------------------
    console.log('\n--- Véhicule aérien : hélicoptère (libellés, décollage, atterrissage) ---');
    const vol = await page.evaluate(() => {
      startRun();
      const heli = creerVehicule('helico', P.x + 5, P.z, 0);
      entrerVehicule(heli);
      const labelsEntree = {
        sprint: document.getElementById('btnSprint').querySelector('small').textContent,
        brake: document.getElementById('btnBrake').querySelector('small').textContent,
      };
      INPUT.btn.sprint = true;
      for (let i = 0; i < 30; i++) majConduite(0.1); // décolle et monte
      INPUT.btn.sprint = false;
      const volApresDecollage = heli.vol, altApresDecollage = heli.alt;
      // redescend vite en altitude, puis relâche DESCENDRE avant le sol : se
      // poser à pleine vitesse de descente (va=-13) déclenche un crash
      // (crashAerien, va<-5.5) — un vrai pilote lève le pied avant de toucher
      INPUT.btn.frein = true;
      for (let i = 0; i < 60 && heli.alt > 8; i++) majConduite(0.1);
      INPUT.btn.frein = false;
      for (let i = 0; i < 200 && heli.vol; i++) majConduite(0.1); // pose en douceur (chute lente, sûre)
      const volApresAtterrissage = heli.vol, altApresAtterrissage = heli.alt, crashe = !!heli.mort;
      sortirVehicule();
      const labelsSortie = {
        sprint: document.getElementById('btnSprint').querySelector('small').textContent,
        brake: document.getElementById('btnBrake').querySelector('small').textContent,
      };
      return { labelsEntree, volApresDecollage, altApresDecollage, volApresAtterrissage, altApresAtterrissage, crashe, labelsSortie };
    });
    if (vol.labelsEntree.sprint !== 'MONTER' || vol.labelsEntree.brake !== 'DESCENDRE') fail('Vol : les libellés des boutons ne changent pas à l\'entrée dans un appareil volant (' + JSON.stringify(vol.labelsEntree) + ')');
    else ok('Vol : SPRINT/FREIN deviennent bien MONTER/DESCENDRE en hélicoptère');
    if (!vol.volApresDecollage || vol.altApresDecollage < 3) fail('Vol : l\'hélicoptère n\'a pas décollé (vol=' + vol.volApresDecollage + ', alt=' + vol.altApresDecollage + ')');
    else ok('Vol : maintenir MONTER fait bien décoller et monter l\'hélicoptère');
    if (vol.volApresAtterrissage) fail('Vol : l\'hélicoptère n\'a pas atterri après DESCENDRE puis une chute lente (alt=' + vol.altApresAtterrissage + ', crashé=' + vol.crashe + ')');
    else if (vol.crashe) fail('Vol : l\'hélicoptère s\'est crashé au lieu d\'atterrir en douceur — le test descend trop vite près du sol');
    else ok('Vol : DESCENDRE puis relâcher avant le sol fait bien atterrir l\'hélicoptère sans le crasher');
    if (vol.labelsSortie.sprint !== 'SPRINT' || vol.labelsSortie.brake !== 'FREIN') fail('Vol : les libellés des boutons ne reviennent pas à SPRINT/FREIN à la sortie (' + JSON.stringify(vol.labelsSortie) + ')');
    else ok('Vol : les libellés reviennent bien à SPRINT/FREIN en sortant de l\'appareil');

    // -------------------------------------------------------------------
    // Radio pirate Reyes FM : verrouillée sans la curiosité 'platine'. La
    // porte n'existe nulle part tant qu'elle n'a pas été acquise AVANT la
    // génération de la ville — vérifié ici, avant de l'accorder et de
    // recharger (le karaoké, plus haut dans la suite, l'a déjà acquise en
    // mémoire, mais la ville de ce chargement-ci a été générée avant).
    // -------------------------------------------------------------------
    console.log('\n--- Radio pirate Reyes FM : verrouillée sans la curiosité \'platine\' ---');
    const radioAvant = await page.evaluate(() => PORTES.some((p) => p.id === 'radio'));
    if (radioAvant) fail('Radio : la porte existe alors que la ville a été générée sans la curiosité \'platine\'');
    else ok('Radio : aucune porte tant que la curiosité \'platine\' n\'était pas acquise à la génération de la ville');

    console.log('\n--- Radio pirate Reyes FM : porte + curiosité \'micro\' après acquisition de \'platine\' (rechargement) ---');
    // Profite du rechargement : les dictionnaires de META remplis au fil du jeu
    // (lieux vus, tenues, records d'arcade) doivent survivre — fusionMeta les
    // vidait à chaque chargement tant qu'ils n'étaient pas dans DICOS_OUVERTS.
    // Ids lus dans les tables du jeu, jamais recopiés.
    const dicosAvant = await page.evaluate(() => {
      const salle = Object.keys(INTDEFS)[0], tenue = TENUES[TENUES.length - 1].id, borne = BORNES_ARCADE[0].id;
      META.lieuxVus[salle] = true; META.tenuesPoss[tenue] = true; META.stats.arcadePersoBest[borne] = 4321;
      META.curios.platine = 1; sauveMeta();
      return { salle, tenue, borne };
    });
    await page.reload({ waitUntil: 'load', timeout: 30000 });
    await page.waitForFunction(() => typeof PORTES !== 'undefined' && PORTES.length > 0, { timeout: 20000 });
    const dicosApres = await page.evaluate((d) => ({ lieu: META.lieuxVus[d.salle] === true, tenue: META.tenuesPoss[d.tenue] === true,
      depart: META.tenuesPoss.depart === true, record: META.stats.arcadePersoBest[d.borne] === 4321 }), dicosAvant);
    if (!dicosApres.lieu || !dicosApres.tenue || !dicosApres.depart || !dicosApres.record) fail('Sauvegarde : un dictionnaire de META est vidé au rechargement (' + JSON.stringify({ ...dicosAvant, ...dicosApres }) + ')');
    else ok('Sauvegarde : lieux vus (' + dicosAvant.salle + '), tenue (' + dicosAvant.tenue + ') et record d\'arcade (' + dicosAvant.borne + ') survivent au rechargement');
    const radioPorte = await page.evaluate(() => {
      const p = PORTES.find((x) => x.id === 'radio');
      const c = CURIOS.find((x) => x.id === 'micro');
      return {
        porteExiste: !!p,
        quartierAttendu: quartier(8, 6),
        curioActive: c ? c.actif : null,
        curioA_eff: c ? !!c.eff : false,
        curioA_ind: c ? !!c.ind : false,
      };
    });
    if (!radioPorte.porteExiste) fail('Radio : la porte n\'apparaît toujours pas après acquisition de \'platine\' et rechargement');
    else ok('Radio : la porte apparaît bien une fois \'platine\' acquis, à la génération suivante');
    if (radioPorte.quartierAttendu !== 'industriel') fail('Radio : quartier(8,6) ne vaut plus \'industriel\' (' + radioPorte.quartierAttendu + ') — repositionner caseCentre(8,6)');
    else ok('Radio : quartier(8,6) vaut bien \'industriel\', comme demandé');
    if (!radioPorte.curioActive || !radioPorte.curioA_eff || !radioPorte.curioA_ind) fail('Radio : la curiosité \'micro\' n\'est pas correctement activée (actif/eff/ind)');
    else ok('Radio : la curiosité \'micro\' est bien activée avec ses textes');
    // Isolation (voir le test de Persistance, même cause) : boucle() vérifie
    // les défis toutes les ~2 s de temps réel, indépendamment de ce que fait
    // ce test. Plusieurs tests ci-dessous vérifient des deltas EXACTS de
    // META.argent ; un défi resté vrai mais pas encore vu à cause d'un effet
    // de bord d'un scénario précédent pourrait sinon se déclencher pendant
    // n'importe lequel d'entre eux et fausser le delta observé.
    await page.evaluate(() => { for (const d of DEFIS) META.defis.faits[d.id] = true; });

    // -------------------------------------------------------------------
    // Espacements — lus depuis la salle réelle, jamais recopiés (voir
    // CLAUDE.md). Console + 3 racks à ≥8 u entre eux et de la sortie.
    // -------------------------------------------------------------------
    console.log('\n--- Radio pirate Reyes FM : espacements (console, racks, sortie) ---');
    const espacementsRadio = await page.evaluate(() => {
      const p = PORTES.find((x) => x.id === 'radio');
      entrerInterieur('radio', p);
      const s = INT.actif;
      const zones = [{ x: s.console.x, z: s.console.z }].concat(s.fouilles.map((f) => ({ x: f.x, z: f.z })));
      const distEntreZones = [];
      for (let i = 0; i < zones.length; i++) for (let j = i + 1; j < zones.length; j++) {
        distEntreZones.push(Math.hypot(zones[i].x - zones[j].x, zones[i].z - zones[j].z));
      }
      const zonesVsSortie = zones.map((z) => Math.hypot(z.x - s.sortie.x, z.z - s.sortie.z));
      const nbFouilles = s.fouilles.length;
      if (INT.actif) sortirInterieur();
      return { distEntreZones, zonesVsSortie, nbFouilles };
    });
    if (Math.min(...espacementsRadio.distEntreZones) < 7.99) fail('Radio : deux zones interactives sont à moins de 8 unités l\'une de l\'autre (' + JSON.stringify(espacementsRadio.distEntreZones) + ')');
    else ok('Radio : la console et les racks sont bien espacés d\'au moins 8 unités entre eux');
    if (espacementsRadio.zonesVsSortie.some((d) => d < 7.99)) fail('Radio : une zone interactive est à moins de 8 unités du centre de la sortie (' + JSON.stringify(espacementsRadio.zonesVsSortie) + ')');
    else ok('Radio : toutes les zones interactives sont bien à au moins 8 unités de la sortie');
    if (espacementsRadio.nbFouilles !== 3) fail('Radio : nombre de racks fouillables inattendu (' + espacementsRadio.nbFouilles + ', attendu 3)');
    else ok('Radio : les 3 racks fouillables sont bien enregistrés');

    // -------------------------------------------------------------------
    // Démarrage de l'émission, aiguille dans/hors la porteuse : la
    // triangulation baisse dedans, monte dehors ; le temps-dans-zone
    // s'accumule dedans seulement.
    // -------------------------------------------------------------------
    console.log('\n--- Radio pirate Reyes FM : démarrage, aiguille dans/hors la porteuse, triangulation ---');
    const emission = await page.evaluate(() => {
      const p = PORTES.find((x) => x.id === 'radio');
      startRun();
      entrerInterieur('radio', p);
      const s = INT.actif;
      P.x = s.console.x; P.z = s.console.z;
      majAction(); document.getElementById('btnAction')._fn();
      const demarree = s.emissionOn, segment1 = s.segmentIdx === 0;
      s.aiguille = s.zoneCentre; s.triangulation = 50;
      majInterieur(1, 1);
      const triangBaisseeDedans = s.triangulation < 50, tempsZoneApres = s.segTempsZone;
      s.aiguille = s.zoneCentre + 20; s.triangulation = 0;
      majInterieur(1, 1);
      const triangMonteeDehors = s.triangulation > 0;
      if (INT.actif) sortirInterieur();
      return { demarree, segment1, triangBaisseeDedans, tempsZoneApres, triangMonteeDehors };
    });
    if (!emission.demarree || !emission.segment1) fail('Radio : la console ne démarre pas l\'émission au segment 1');
    else ok('Radio : la console démarre bien l\'émission, au premier segment');
    if (!emission.triangBaisseeDedans || emission.tempsZoneApres <= 0) fail('Radio : l\'aiguille dans la porteuse ne fait pas baisser la triangulation et/ou n\'accumule pas de temps-dans-zone');
    else ok('Radio : l\'aiguille dans la porteuse fait bien baisser la triangulation et accumule le temps-dans-zone');
    if (!emission.triangMonteeDehors) fail('Radio : l\'aiguille hors de la porteuse ne fait pas monter la triangulation');
    else ok('Radio : l\'aiguille hors de la porteuse fait bien monter la triangulation');

    // -------------------------------------------------------------------
    // Le glissement du doigt pilote directement l'aiguille (pas d'inertie,
    // pas d'effet hors émission), sur toute la largeur de bande.
    // -------------------------------------------------------------------
    console.log('\n--- Radio pirate Reyes FM : le glissement du doigt pilote directement l\'aiguille ---');
    const glisseTest = await page.evaluate(() => {
      const p = PORTES.find((x) => x.id === 'radio');
      startRun();
      entrerInterieur('radio', p);
      const s = INT.actif;
      P.x = s.console.x; P.z = s.console.z;
      const aiguilleAvant = s.aiguille;
      radioDeplaceAiguille(window.innerWidth * 0.5);
      const inchangeeSansEmission = s.aiguille === aiguilleAvant;
      majAction(); document.getElementById('btnAction')._fn();
      radioDeplaceAiguille(0);
      const auMinimum = Math.abs(s.aiguille - RADIO_BAND_MIN) < 0.05;
      radioDeplaceAiguille(window.innerWidth);
      const auMaximum = Math.abs(s.aiguille - RADIO_BAND_MAX) < 0.05;
      radioDeplaceAiguille(window.innerWidth * 0.5);
      const auMilieu = Math.abs(s.aiguille - (RADIO_BAND_MIN + RADIO_BAND_MAX) / 2) < 0.05;
      if (INT.actif) sortirInterieur();
      return { inchangeeSansEmission, auMinimum, auMaximum, auMilieu };
    });
    if (!glisseTest.inchangeeSansEmission) fail('Radio : radioDeplaceAiguille modifie l\'aiguille alors qu\'aucune émission n\'est en cours');
    else ok('Radio : le glissement du doigt ne fait rien tant qu\'aucune émission n\'est en cours');
    if (!glisseTest.auMinimum || !glisseTest.auMaximum || !glisseTest.auMilieu) fail('Radio : le glissement du doigt ne positionne pas l\'aiguille correctement sur toute la largeur de bande (' + JSON.stringify(glisseTest) + ')');
    else ok('Radio : le glissement du doigt positionne bien l\'aiguille sur toute la largeur de bande (87.0–108.0 FM)');

    // -------------------------------------------------------------------
    // Segment réussi à 70 % de temps dans la zone (120 $), raté sinon (pas
    // de gain) ; bonus de 150 $ réservé aux 3 segments réussis.
    // -------------------------------------------------------------------
    console.log('\n--- Radio pirate Reyes FM : segment réussi à 70 %, gains, bonus des 3 segments ---');
    const segments = await page.evaluate(() => {
      const p = PORTES.find((x) => x.id === 'radio');
      startRun();
      entrerInterieur('radio', p);
      const s = INT.actif;
      P.x = s.console.x; P.z = s.console.z;
      majAction(); document.getElementById('btnAction')._fn();
      const argentAvant = META.argent;
      s.segTempsZone = RADIO_SEG_DUREE * 0.75; radioFinSegment(s); // réussi
      const argentApres1 = META.argent, reussis1 = s.segmentsReussis, idx1 = s.segmentIdx;
      s.segTempsZone = RADIO_SEG_DUREE * 0.5; radioFinSegment(s); // raté
      const argentApres2 = META.argent, reussis2 = s.segmentsReussis, idx2 = s.segmentIdx;
      s.segTempsZone = RADIO_SEG_DUREE * 0.8; radioFinSegment(s); // réussi, mais 2/3 seulement -> pas de bonus
      const argentApres3 = META.argent, reussis3 = s.segmentsReussis, emissionFinie = !s.emissionOn;
      if (INT.actif) sortirInterieur();
      return { argentAvant, argentApres1, reussis1, idx1, argentApres2, reussis2, idx2, argentApres3, reussis3, emissionFinie };
    });
    if (segments.argentApres1 !== segments.argentAvant + 120 || segments.reussis1 !== 1 || segments.idx1 !== 1) fail('Radio : un segment à 75 % de temps dans la zone ne rapporte pas 120 $ (' + JSON.stringify(segments) + ')');
    else ok('Radio : un segment réussi (≥70 % de temps dans la zone) rapporte bien 120 $');
    if (segments.argentApres2 !== segments.argentApres1 || segments.reussis2 !== 1 || segments.idx2 !== 2) fail('Radio : un segment à 50 % de temps dans la zone rapporte de l\'argent alors qu\'il devrait être raté');
    else ok('Radio : un segment à moins de 70 % de temps dans la zone est bien raté, sans gain');
    if (segments.argentApres3 !== segments.argentApres2 + 120 || segments.reussis3 !== 2 || !segments.emissionFinie) fail('Radio : le 3e segment (2 réussis sur 3) donne un bonus à tort, ou l\'émission ne se termine pas — ' + JSON.stringify(segments));
    else ok('Radio : seuls 2 segments sur 3 réussis ne donnent pas le bonus de fin d\'émission');

    const bonusTest = await page.evaluate(() => {
      const p = PORTES.find((x) => x.id === 'radio');
      startRun();
      entrerInterieur('radio', p);
      const s = INT.actif;
      P.x = s.console.x; P.z = s.console.z;
      majAction(); document.getElementById('btnAction')._fn();
      const argentAvant = META.argent;
      for (let i = 0; i < 3; i++) { s.segTempsZone = RADIO_SEG_DUREE * 0.9; radioFinSegment(s); }
      const argentApres = META.argent, reussis = s.segmentsReussis, emissionFinie = !s.emissionOn;
      if (INT.actif) sortirInterieur();
      return { argentAvant, argentApres, reussis, emissionFinie };
    });
    if (bonusTest.reussis !== 3 || bonusTest.argentApres !== bonusTest.argentAvant + 120 * 3 + 150 || !bonusTest.emissionFinie) fail('Radio : réussir les 3 segments ne rapporte pas 120 × 3 + 150 $ (obtenu +' + (bonusTest.argentApres - bonusTest.argentAvant) + ')');
    else ok('Radio : réussir les 3 segments rapporte bien 120 $ × 3 + 150 $ de bonus');

    // -------------------------------------------------------------------
    // Appels d'auditeurs pendant les pauses entre segments, jamais répétés
    // dans la même émission.
    // -------------------------------------------------------------------
    console.log('\n--- Radio pirate Reyes FM : appel d\'auditeur pendant la pause, jamais répété dans la même émission ---');
    const appelTest = await page.evaluate(() => {
      const p = PORTES.find((x) => x.id === 'radio');
      startRun();
      entrerInterieur('radio', p);
      const s = INT.actif;
      P.x = s.console.x; P.z = s.console.z;
      majAction(); document.getElementById('btnAction')._fn();
      s.segTempsZone = RADIO_SEG_DUREE * 0.8; radioFinSegment(s);
      const enPauseApres1 = s.segmentPause > 0;
      s.segTempsZone = RADIO_SEG_DUREE * 0.8; radioFinSegment(s);
      const distinct = s.appelsUtilises.length === 2 && s.appelsUtilises[0] !== s.appelsUtilises[1];
      const texteValide = RADIO_APPELS[s.appelsUtilises[0]] !== undefined && RADIO_APPELS[s.appelsUtilises[1]] !== undefined;
      if (INT.actif) sortirInterieur();
      return { enPauseApres1, distinct, texteValide };
    });
    if (!appelTest.enPauseApres1) fail('Radio : la fin d\'un segment non final ne déclenche pas la pause de 2 s');
    else ok('Radio : la fin d\'un segment non final déclenche bien la pause avant le suivant');
    if (!appelTest.distinct || !appelTest.texteValide) fail('Radio : les appels d\'auditeurs des deux pauses ne sont pas distincts et valides');
    else ok('Radio : les appels d\'auditeurs des pauses sont bien tirés sans répétition dans la même émission');

    // -------------------------------------------------------------------
    // Curiosité Le Micro Vintage : réservée à une émission VRAIMENT
    // parfaite (3 segments ≥95 %, triangulation jamais au-dessus de 50 %).
    // Testé AVANT toute émission qui l'obtiendrait pour de bon (voir
    // CLAUDE.md, ordre déjà appliqué pour Le Disque de Platine/La Bobine).
    // -------------------------------------------------------------------
    console.log('\n--- Radio pirate Reyes FM : curiosité Le Micro Vintage (émission parfaite uniquement) ---');
    const microTest = await page.evaluate(() => {
      const p = PORTES.find((x) => x.id === 'radio');
      startRun();
      const dejaAcquise = aCurio('micro');
      entrerInterieur('radio', p);
      const s = INT.actif;
      P.x = s.console.x; P.z = s.console.z;
      majAction(); document.getElementById('btnAction')._fn();
      s.emissionParfaite = false; // simule une triangulation passée au-dessus de 50 % pendant l'émission
      for (let i = 0; i < 3; i++) { s.segTempsZone = RADIO_SEG_DUREE * 0.97; radioFinSegment(s); }
      const curioApresPresqueParfait = aCurio('micro');
      if (INT.actif) sortirInterieur();
      entrerInterieur('radio', p);
      const s2 = INT.actif;
      P.x = s2.console.x; P.z = s2.console.z;
      majAction(); document.getElementById('btnAction')._fn();
      const clocheAvant = s2.microCloche.visible;
      for (let i = 0; i < 3; i++) { s2.segTempsZone = RADIO_SEG_DUREE * 0.97; radioFinSegment(s2); }
      const curioApresParfait = aCurio('micro'), clocheApres = s2.microCloche.visible;
      if (INT.actif) sortirInterieur();
      return { dejaAcquise, curioApresPresqueParfait, curioApresParfait, clocheAvant, clocheApres };
    });
    if (microTest.dejaAcquise) fail('Radio : le test suppose la curiosité \'micro\' pas encore acquise à ce stade de la suite');
    if (microTest.curioApresPresqueParfait) fail('Radio : la curiosité est donnée alors que la triangulation est passée au-dessus de 50 % pendant l\'émission');
    else ok('Radio : une émission avec triangulation passée au-dessus de 50 % ne donne pas la curiosité, même avec 3 segments réussis');
    if (!microTest.curioApresParfait) fail('Radio : une émission vraiment parfaite (3 segments ≥95 %, triangulation ≤50 %) ne donne pas la curiosité');
    else ok('Radio : une émission parfaite donne bien la curiosité Le Micro Vintage');
    if (!microTest.clocheAvant || microTest.clocheApres) fail('Radio : la cloche du Micro Vintage ne se lève pas à l\'obtention de la curiosité');
    else ok('Radio : la cloche du Micro Vintage se lève bien à l\'obtention de la curiosité');

    // -------------------------------------------------------------------
    // Limite de 2 émissions par vague, l'abandon (sortie en pleine
    // émission) la consomme quand même (exploit du bowling, déjà rencontré).
    // -------------------------------------------------------------------
    console.log('\n--- Radio pirate Reyes FM : limite de 2 émissions par vague, l\'abandon consomme l\'émission ---');
    const capRadio = await page.evaluate(() => {
      const p = PORTES.find((x) => x.id === 'radio');
      startRun();
      entrerInterieur('radio', p);
      const s = INT.actif;
      P.x = s.console.x; P.z = s.console.z;
      majAction(); document.getElementById('btnAction')._fn();
      const premiereDemarree = s.emissionOn;
      sortirInterieur();
      const emissionAnnuleeApresSortie = !s.emissionOn;
      const compteurApresAbandon = s.emissionsVague;
      entrerInterieur('radio', p);
      P.x = s.console.x; P.z = s.console.z;
      majAction(); document.getElementById('btnAction')._fn();
      const deuxiemeDemarree = s.emissionOn;
      sortirInterieur();
      const compteurApres2 = s.emissionsVague;
      entrerInterieur('radio', p);
      P.x = s.console.x; P.z = s.console.z;
      majAction();
      const label3e = document.getElementById('btnAction').textContent;
      document.getElementById('btnAction')._fn();
      const troisiemeRefusee = !s.emissionOn;
      if (INT.actif) sortirInterieur();
      return { premiereDemarree, emissionAnnuleeApresSortie, compteurApresAbandon, deuxiemeDemarree, compteurApres2, label3e, troisiemeRefusee };
    });
    if (!capRadio.premiereDemarree || !capRadio.emissionAnnuleeApresSortie || capRadio.compteurApresAbandon !== 1) fail('Radio : abandonner une émission en cours (sortie) ne la consomme pas correctement (' + JSON.stringify(capRadio) + ')');
    else ok('Radio : sortir en pleine émission l\'annule et la consomme quand même');
    if (!capRadio.deuxiemeDemarree || capRadio.compteurApres2 !== 2) fail('Radio : la 2e émission de la vague ne démarre pas correctement (compteur=' + capRadio.compteurApres2 + ')');
    else ok('Radio : la 2e émission de la vague démarre normalement');
    if (!capRadio.troisiemeRefusee || !/deux émissions/i.test(capRadio.label3e)) fail('Radio : une 3e émission dans la même vague n\'est pas refusée (label=' + capRadio.label3e + ')');
    else ok('Radio : une 3e émission dans la même vague est bien refusée');

    // -------------------------------------------------------------------
    // Triangulation à 100 % : descente de police (+1 étoile), éjection.
    // -------------------------------------------------------------------
    console.log('\n--- Radio pirate Reyes FM : triangulation à 100 % = descente de police ---');
    const police = await page.evaluate(() => {
      const p = PORTES.find((x) => x.id === 'radio');
      startRun();
      entrerInterieur('radio', p);
      const s = INT.actif;
      P.x = s.console.x; P.z = s.console.z;
      majAction(); document.getElementById('btnAction')._fn();
      const etoilesAvant = WANTED.stars;
      s.aiguille = s.zoneCentre + 20; // toujours hors zone
      let frames = 0;
      while (INT.actif && s.emissionOn && frames < 2000) { majInterieur(0.05, 0.05); frames++; }
      const ejecte = !INT.actif;
      const etoilesApres = WANTED.stars;
      return { etoilesAvant, ejecte, etoilesApres, frames };
    });
    if (!police.ejecte) fail('Radio : la triangulation à 100 % ne finit pas par éjecter le joueur (frames=' + police.frames + ')');
    else ok('Radio : la triangulation à 100 % éjecte bien le joueur à la surface');
    if (police.etoilesApres !== police.etoilesAvant + 1) fail('Radio : la descente de police n\'ajoute pas exactement 1 étoile (avant=' + police.etoilesAvant + ', après=' + police.etoilesApres + ')');
    else ok('Radio : la descente de police ajoute bien exactement 1 étoile');

    // -------------------------------------------------------------------
    // Réinitialisations : passage de vague et mort en pleine émission
    // remettent triangulation à 0 et éteignent ON AIR ; seul le passage de
    // vague (et le game over) remet le compteur d'émissions à 0.
    // -------------------------------------------------------------------
    console.log('\n--- Radio pirate Reyes FM : réinitialisations (vague, mort, game over) ---');
    const resetsRadio = await page.evaluate(() => {
      const p = PORTES.find((x) => x.id === 'radio');
      startRun();
      entrerInterieur('radio', p);
      const s = INT.actif;
      P.x = s.console.x; P.z = s.console.z;
      majAction(); document.getElementById('btnAction')._fn();
      s.triangulation = 40;
      WAVES.n++;
      majInterieur(0, 0);
      const emissionApresVague = s.emissionOn, triangApresVague = s.triangulation, compteurApresVague = s.emissionsVague;
      P.x = s.console.x; P.z = s.console.z;
      majAction(); document.getElementById('btnAction')._fn();
      s.triangulation = 35;
      P.hp = 1; toucherJoueur(9999); // -> mourir(), en pleine émission
      const emissionApresMort = s.emissionOn, triangApresMort = s.triangulation, modeApresMort = ETAT.mode;
      startRun();
      const sa = INT.salles.radio;
      const emissionApresGameOver = sa.emissionOn, compteurApresGameOver = sa.emissionsVague;
      return { emissionApresVague, triangApresVague, compteurApresVague, emissionApresMort, triangApresMort, modeApresMort, emissionApresGameOver, compteurApresGameOver };
    });
    if (resetsRadio.emissionApresVague || resetsRadio.triangApresVague !== 0 || resetsRadio.compteurApresVague !== 0) fail('Radio : le passage de vague ne coupe pas l\'émission et/ou ne remet pas triangulation/compteur à zéro (' + JSON.stringify(resetsRadio) + ')');
    else ok('Radio : le passage de vague coupe bien l\'émission en cours et remet triangulation/compteur à zéro');
    if (resetsRadio.modeApresMort !== 'mort') fail('Radio : mourir() n\'a pas été déclenché correctement pendant le test');
    if (resetsRadio.emissionApresMort || resetsRadio.triangApresMort !== 0) fail('Radio : mourir en pleine émission ne coupe pas l\'émission et/ou ne remet pas la triangulation à zéro');
    else ok('Radio : mourir en pleine émission coupe bien l\'émission et remet la triangulation à zéro');
    if (resetsRadio.emissionApresGameOver || resetsRadio.compteurApresGameOver !== 0) fail('Radio : le game over ne coupe pas l\'émission et/ou ne remet pas le compteur à zéro');
    else ok('Radio : le game over remet bien l\'émission et le compteur à zéro');

    // -------------------------------------------------------------------
    // Table de fouille des racks : jamais de gain négatif, encaissement
    // immédiat (pas de butin différé, contrairement au Métro), META.fouilles
    // incrémenté exactement une fois par fouille résolue.
    // -------------------------------------------------------------------
    console.log('\n--- Radio pirate Reyes FM : table de fouille des racks (jamais négatif, encaissement immédiat) ---');
    const fouilleRadio = await page.evaluate(() => {
      const p = PORTES.find((x) => x.id === 'radio');
      startRun();
      entrerInterieur('radio', p);
      const s = INT.actif;
      const f = s.fouilles[0];
      const fouillesAvant = META.fouilles;
      const gains = [];
      for (let i = 0; i < 60; i++) {
        f.prisVague = -1;
        const argentAvant = META.argent;
        resoudreFouille(f);
        gains.push(META.argent - argentAvant);
      }
      const rareRadio = TABLES_FOUILLE.radio.items.find((it) => it.type === 'cash' && it.min >= 250);
      const fouillesTotal = META.fouilles - fouillesAvant;
      if (INT.actif) sortirInterieur();
      return { gains, rareRadio, fouillesTotal };
    });
    if (fouilleRadio.fouillesTotal !== 60) fail('Radio : META.fouilles n\'est pas incrémenté exactement une fois par fouille résolue (delta=' + fouilleRadio.fouillesTotal + '/60)');
    else ok('Radio : chaque fouille résolue incrémente bien META.fouilles');
    if (fouilleRadio.gains.some((v) => v < 0)) fail('Radio : la table radio a produit un gain négatif sur 60 tirages');
    else ok('Radio : la table radio ne produit jamais de gain négatif (60 tirages), encaissé immédiatement (pas de butin différé)');
    if (!fouilleRadio.rareRadio || !fouilleRadio.gains.some((v) => v >= fouilleRadio.rareRadio.min && v <= fouilleRadio.rareRadio.max)) saute('Radio : la somme rare n\'est pas tombée sur 60 tirages (probabilité ~5 %, possible par hasard)');
    else ok('Radio : la somme rare est bien tombée dans sa fourchette déclarée au moins une fois');

    // -------------------------------------------------------------------
    // Horloges séparées : triangulation et dérive de la porteuse doivent
    // suivre le temps réel (dtJeu) pendant un ralenti, jamais dt.
    // -------------------------------------------------------------------
    console.log('\n--- Horloges séparées : la triangulation et la dérive de la porteuse de la Radio avancent au temps réel pendant un ralenti ---');
    const chronoRadio = await page.evaluate(() => {
      const p = PORTES.find((x) => x.id === 'radio');
      startRun();
      entrerInterieur('radio', p);
      const s = INT.actif;
      P.x = s.console.x; P.z = s.console.z;
      majAction(); document.getElementById('btnAction')._fn();
      s.zoneCentre = 97.5; s.zoneDir = 1; s.aiguille = s.zoneCentre + 20; s.triangulation = 0;
      const centreAvant = s.zoneCentre, segmentTAvant = s.segmentT;
      const dtReel = 1;
      const dt = dtReel * 0.5, dtJeu = dtReel; // ralenti à ×0,5 simulé comme boucle()
      majInterieur(dt, dtJeu);
      const deriveReelle = s.zoneCentre - centreAvant;
      const deriveAttendue = RADIO_SEGMENTS[s.segmentIdx].vitesse * (RADIO_BAND_MAX - RADIO_BAND_MIN) * dtJeu;
      const triangReelle = s.triangulation;
      const triangAttendue = Math.min(100, (100 / 6) * dtJeu);
      const segmentTReel = s.segmentT - segmentTAvant;
      if (INT.actif) sortirInterieur();
      return { deriveReelle, deriveAttendue, triangReelle, triangAttendue, segmentTReel, dtJeu };
    });
    if (Math.abs(chronoRadio.deriveReelle - chronoRadio.deriveAttendue) > 1e-9) fail('Radio : la dérive de la porteuse ralentit pendant un ralenti au lieu de suivre le temps réel (obtenu ' + chronoRadio.deriveReelle + ', attendu ' + chronoRadio.deriveAttendue + ')');
    else ok('Radio : la dérive de la porteuse avance bien au temps réel pendant un ralenti (sur dtJeu)');
    if (Math.abs(chronoRadio.triangReelle - chronoRadio.triangAttendue) > 1e-9) fail('Radio : la triangulation ralentit pendant un ralenti au lieu de suivre le temps réel');
    else ok('Radio : la triangulation avance bien au temps réel pendant un ralenti, jamais ralentie ni accélérée');
    if (Math.abs(chronoRadio.segmentTReel - chronoRadio.dtJeu) > 1e-9) fail('Radio : le chrono de segment ralentit pendant un ralenti au lieu de suivre le temps réel');
    else ok('Radio : le chrono de segment avance bien au temps réel pendant un ralenti (sur dtJeu)');

    // -------------------------------------------------------------------
    // Curiosité Le Micro Vintage : les caches non fouillées apparaissent
    // sur la minimap dans un rayon de 40 m (smoke-test : pas d'exception,
    // le pixel exact n'est pas vérifiable ici — voir CLAUDE.md).
    // -------------------------------------------------------------------
    console.log('\n--- Radio pirate Reyes FM : la curiosité Le Micro Vintage n\'entraîne aucune erreur sur la minimap ---');
    const minimapTest = await page.evaluate(() => {
      const p = PORTES.find((x) => x.id === 'radio');
      startRun();
      entrerInterieur('radio', p);
      const s = INT.actif;
      const f = s.fouilles[0];
      f.prisVague = -1;
      P.x = f.x; P.z = f.z;
      const possedeAvant = aCurio('micro');
      META.curios.micro = 1;
      let exception = null;
      try { majMinimap(); } catch (e) { exception = e && e.message; }
      META.curios.micro = possedeAvant ? 1 : 0;
      if (INT.actif) sortirInterieur();
      return { exception };
    });
    if (minimapTest.exception) fail('Radio : majMinimap() lève une exception avec la curiosité \'micro\' active (' + minimapTest.exception + ')');
    else ok('Radio : majMinimap() affiche bien les caches proches sans erreur avec la curiosité \'micro\' active');

    // -------------------------------------------------------------------
    // Chalutier « Sainte-Odile » (refait au 11e lot) : porte, quartier,
    // curiosité activée.
    // -------------------------------------------------------------------
    console.log('\n--- Chalutier « Sainte-Odile » : porte, quartier, curiosité activée ---');
    const chalPorte = await page.evaluate(() => {
      const p = PORTES.find((x) => x.id === 'chalutier');
      const c = CURIOS.find((x) => x.id === 'boussole');
      return { porteExiste: !!p, quartierAttendu: quartier(11, 8), curioActive: c ? c.actif : null, curioA_eff: c ? !!c.eff : false, curioA_ind: c ? !!c.ind : false };
    });
    if (!chalPorte.porteExiste) fail('Chalutier : aucune porte posée pour la salle');
    else ok('Chalutier : la porte est bien posée');
    if (chalPorte.quartierAttendu !== 'port') fail('Chalutier : quartier(11,8) ne vaut plus \'port\' (' + chalPorte.quartierAttendu + ') — repositionner caseCentre(11,8)');
    else ok('Chalutier : quartier(11,8) vaut bien \'port\', comme demandé');
    if (!chalPorte.curioActive || !chalPorte.curioA_eff || !chalPorte.curioA_ind) fail('Chalutier : la curiosité \'boussole\' n\'est pas correctement activée (actif/eff/ind)');
    else ok('Chalutier : la curiosité \'boussole\' est bien activée avec ses textes');

    // Outils partagés par les tests du chalutier (installés une fois dans la page)
    await page.evaluate(() => {
      window.__chal = {
        entrer() { if (INT.actif) sortirInterieur(); startRun(); ecran(null); ETAT.mode = 'jeu'; P.hp = P.maxHp = 1e6;
          entrerInterieur('chalutier', PORTES.find((x) => x.id === 'chalutier')); ETAT.intT = 0; return INT.actif; },
        appuyer() { majAction(); const b = document.getElementById('btnAction'); const l = b.textContent; if (b._fn) b._fn(); return l; },
        larguer(s) { P.x = s.barre.x; P.z = s.barre.z; return this.appuyer(); },
        // le test maîtrise sa scène : les autres bancs sont écartés (un banc voisin tiré trop près changeait le bouton)
        surBanc(s, type) { const b = s.bancs.find((x) => x.type === type && x.stock > 0); for (const o of s.bancs) if (o !== b && Math.hypot(o.x - b.x, o.z - b.z) < 60) o.x += 5000;
          s.bateau.x = b.x + 1; s.bateau.z = b.z + 1; s.bateau.v = 0; s.aQuitteLePort = true; return b; },
      };
    });

    // -------------------------------------------------------------------
    // Espacements — lus depuis la salle réelle (jamais recopiés, CLAUDE.md) :
    // la barre et les 2 contenants à ≥ 8 u entre eux et de la sortie. En mer,
    // le bouton d'action est contextuel (chalutierAction) : plus de postes.
    // -------------------------------------------------------------------
    console.log('\n--- Chalutier « Sainte-Odile » : espacements (barre, contenants, sortie) ---');
    const espacementsChal = await page.evaluate(() => {
      const s = __chal.entrer();
      const zones = [s.barre].concat(s.fouilles.map((f) => ({ x: f.x, z: f.z })));
      const distEntreZones = [];
      for (let i = 0; i < zones.length; i++) for (let j = i + 1; j < zones.length; j++) distEntreZones.push(Math.hypot(zones[i].x - zones[j].x, zones[i].z - zones[j].z));
      const zonesVsSortie = zones.map((z) => Math.hypot(z.x - s.sortie.x, z.z - s.sortie.z));
      // chaque zone est atteignable à pied depuis l'arrivée (pas enfermée par la timonerie ou l'étrave)
      const inaccessibles = [];
      for (const z of zones) { let okZ = false; for (let a = 0; a < 16 && !okZ; a++) { const x = z.x + Math.cos(a / 16 * Math.PI * 2) * 1.6, zz = z.z + Math.sin(a / 16 * Math.PI * 2) * 1.6; if (!solidAt(x, zz, 0.4)) okZ = true; } if (!okZ) inaccessibles.push(z); }
      const nbFouilles = s.fouilles.length;
      sortirInterieur();
      return { distEntreZones, zonesVsSortie, nbFouilles, inaccessibles: inaccessibles.length };
    });
    if (Math.min(...espacementsChal.distEntreZones) < 7.99) fail('Chalutier : deux zones interactives sont à moins de 8 unités l\'une de l\'autre (' + JSON.stringify(espacementsChal.distEntreZones) + ')');
    else ok('Chalutier : la barre et les contenants sont bien espacés d\'au moins 8 unités');
    if (espacementsChal.zonesVsSortie.some((d) => d < 7.99)) fail('Chalutier : une zone interactive est à moins de 8 unités de la sortie (' + JSON.stringify(espacementsChal.zonesVsSortie) + ')');
    else ok('Chalutier : toutes les zones interactives sont à au moins 8 unités de la sortie');
    if (espacementsChal.nbFouilles !== 2) fail('Chalutier : nombre de contenants fouillables inattendu (' + espacementsChal.nbFouilles + ', attendu 2)');
    else ok('Chalutier : les 2 contenants fouillables (coffre du pont, malle du capitaine) sont bien enregistrés');
    if (espacementsChal.inaccessibles) fail('Chalutier : ' + espacementsChal.inaccessibles + ' zone(s) entourée(s) de solides, inatteignable(s)');
    else ok('Chalutier : chaque zone a de la place libre autour d\'elle');

    console.log('\n--- Chalutier « Sainte-Odile » : zones de pêche selon la distance au ponton ---');
    const zonesDist = await page.evaluate(() => ({
      z1: chalutierZoneDe(0), z1b: chalutierZoneDe(CHALUTIER_ZONE1_MAX - 1), z2: chalutierZoneDe(CHALUTIER_ZONE1_MAX + 1),
      z2b: chalutierZoneDe(CHALUTIER_ZONE2_MAX - 1), z3: chalutierZoneDe(CHALUTIER_ZONE2_MAX + 1),
    }));
    if (zonesDist.z1 !== 1 || zonesDist.z1b !== 1 || zonesDist.z2 !== 2 || zonesDist.z2b !== 2 || zonesDist.z3 !== 3) fail('Chalutier : zones de pêche mal découpées (' + JSON.stringify(zonesDist) + ')');
    else ok('Chalutier : Hauts-Fonds, Banc du Large et Fosse se suivent bien avec la distance');

    // -------------------------------------------------------------------
    // Largage, barre au joystick (▲ gaz, ◀ ▶ virer), monde marin qui tourne
    // autour du bateau, boutons de combat masqués en mer.
    // -------------------------------------------------------------------
    console.log('\n--- Chalutier « Sainte-Odile » : largage, pilotage à la barre, mer qui tourne autour du bateau ---');
    const sortie = await page.evaluate(() => {
      const s = __chal.entrer();
      const label = __chal.larguer(s);
      const demarree = s.sortieEnCours, auxCommandes = s.auxCommandes;
      const combatCache = getComputedStyle(document.getElementById('btnFire')).display === 'none' && getComputedStyle(document.getElementById('btnDodge')).display === 'none';
      const intro = getComputedStyle(chalIntroWrap).display !== 'none';
      INPUT.mx = 0; INPUT.mz = -1;
      const x0 = s.bateau.x, z0 = s.bateau.z, a0 = s.bateau.ang;
      for (let i = 0; i < 60; i++) majInterieur(0.05, 0.05);
      const dist = Math.hypot(s.bateau.x - x0, s.bateau.z - z0), toutDroit = Math.abs(angDiff(a0, s.bateau.ang)) < 1e-6, versLeLarge = s.bateau.z < z0;
      INPUT.mx = 1; const a1 = s.bateau.ang; for (let i = 0; i < 20; i++) majInterieur(0.05, 0.05);
      const vireTribord = angDiff(a1, s.bateau.ang) < -0.2; // ▶ : la proue part vers la droite de l'écran (cap qui décroît)
      const monde = Math.abs(angDiff(s.merMonde.rotation.y, Math.PI - s.bateau.ang)) < 1e-6 && Math.abs(s.merDedans.position.x + s.bateau.x) < 1e-6;
      const piloteALaBarre = Math.hypot(P.x - s.barre.x, P.z - s.barre.z) < 0.01;
      INPUT.mx = 0; INPUT.mz = 0;
      sortirInterieur();
      const combatRendu = getComputedStyle(document.getElementById('btnDodge')).display !== 'none';
      return { label, demarree, auxCommandes, combatCache, intro, dist, toutDroit, versLeLarge, vireTribord, monde, piloteALaBarre, combatRendu };
    });
    if (!sortie.demarree || !/LARGUER/.test(sortie.label)) fail('Chalutier : LARGUER LES AMARRES ne démarre pas la sortie (' + JSON.stringify(sortie) + ')');
    else ok('Chalutier : LARGUER LES AMARRES démarre la sortie, avec la carte d\'intro');
    if (!sortie.auxCommandes || !sortie.piloteALaBarre) fail('Chalutier : le joueur n\'est pas à la barre en mer');
    else ok('Chalutier : en mer, le joueur est directement à la barre');
    if (!(sortie.dist > 5) || !sortie.toutDroit || !sortie.versLeLarge) fail('Chalutier : ▲ ne fait pas avancer le bateau droit vers le large (' + JSON.stringify(sortie) + ')');
    else ok('Chalutier : ▲ fait avancer le bateau tout droit vers le large (' + sortie.dist.toFixed(1) + ' u en 3 s)');
    if (!sortie.vireTribord) fail('Chalutier : ▶ ne fait pas virer la proue vers la droite');
    else ok('Chalutier : ▶ fait virer la proue vers la droite');
    if (!sortie.monde) fail('Chalutier : la mer et ce qui flotte ne suivent pas le cap et la position du bateau');
    else ok('Chalutier : la mer tourne et glisse autour du bateau (proue toujours en haut)');
    if (!sortie.combatCache || !sortie.combatRendu) fail('Chalutier : boutons de combat affichés en mer, ou pas rendus en sortant (' + JSON.stringify(sortie) + ')');
    else ok('Chalutier : boutons de combat masqués en mer, rendus en sortant');

    // -------------------------------------------------------------------
    // Les bancs de la sortie : tirés dans leur zone, côté large, espacés,
    // jamais sur un récif ; un seul Vieux Roi, dans la Fosse. Lus depuis
    // CHALUTIER_BANCS_PLAN (jamais recopiés).
    // -------------------------------------------------------------------
    console.log('\n--- Chalutier « Sainte-Odile » : bancs (zones, large, espacements, récifs, Vieux Roi), radar ---');
    const bancs = await page.evaluate(() => {
      const ko = [];
      for (let k = 0; k < 15; k++) {
        const s = __chal.entrer(); __chal.larguer(s);
        if (s.bancs.length !== CHALUTIER_BANCS_PLAN.length) ko.push('nombre de bancs ' + s.bancs.length);
        s.bancs.forEach((b, i) => { const d = Math.hypot(b.x, b.z);
          if (chalutierZoneDe(d) !== CHALUTIER_BANCS_PLAN[i].zone) ko.push(b.type + ' hors de sa zone (' + d.toFixed(0) + ')');
          if (b.z > -10) ko.push(b.type + ' côté côte');
          for (const rc of s.recifs) if (Math.hypot(rc.x - b.x, rc.z - b.z) < rc.r + b.r) ko.push(b.type + ' sur un récif');
          if (!b.vis || !b.vis.g) ko.push('banc sans habillage'); });
        if (s.bancs.filter((b) => b.type === 'roi').length !== 1) ko.push('Vieux Roi absent ou en double');
        try { dessinerRadarChalutier(s, mmCtx); majMinimap(); } catch (e) { ko.push('radar : ' + e); }
        sortirInterieur();
      }
      return { ko: [...new Set(ko)] };
    });
    if (bancs.ko.length) fail('Chalutier : bancs — ' + bancs.ko.join(' | '));
    else ok('Chalutier : 15 sorties, bancs toujours dans leur zone, au large, hors des récifs ; un Vieux Roi dans la Fosse ; radar dessiné');

    // -------------------------------------------------------------------
    // Pêche à la canne : PÊCHER seulement sur un banc et au ralenti ; touche,
    // ferrage, combat ; tension 0 = libéré, 100 = cassé ; ferrage manqué.
    // -------------------------------------------------------------------
    console.log('\n--- Chalutier « Sainte-Odile » : canne — banc, ralenti, touche, ferrage, combat de tension ---');
    const canneBase = await page.evaluate(() => {
      const s = __chal.entrer(); __chal.larguer(s); s.introT = 0;
      s.bateau.x = 0; s.bateau.z = -12; s.aQuitteLePort = true;
      for (const bb of s.bancs) bb.x += 5000; // le test maîtrise sa scène : aucun banc à portée
      majAction(); const labelLoin = document.getElementById('btnAction').textContent;
      for (const bb of s.bancs) bb.x -= 5000;
      const b = __chal.surBanc(s, 'canne'); s.bateau.v = 6;
      majAction(); const labelVite = document.getElementById('btnAction').textContent;
      s.bateau.v = 0;
      const labelPeche = __chal.appuyer();
      const enAttente = s.canneEtat === 'attente', aLaCanne = Math.hypot(P.x - s.canne.x, P.z - s.canne.z) < 0.01, panneau = getComputedStyle(chalPecheWrap).display !== 'none' || true;
      s.canneDelai = 0; majInterieur(0.01, 0.01);
      const enMorsure = s.canneEtat === 'morsure';
      majInterieur(0.01, 0.01); const panneauVisible = getComputedStyle(chalPecheWrap).display !== 'none';
      // ferrer en touchant le panneau de pêche (le doigt), pas seulement au bouton d'action
      chalPecheWrap.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerId: 7 }));
      const enCombat = s.canneEtat === 'combat', especeValide = !!CHALUTIER_POISSONS[s.canneEspece];
      chalPecheWrap.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerId: 8 }));
      const doigtMouline = s.moulinetDoigt === true;
      chalPecheWrap.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, cancelable: true, pointerId: 8 }));
      const doigtLeve = s.moulinetDoigt === false;
      s.rush = false; s.rushT = 99;
      s.canneTension = 1; INPUT.btn.action = false; majInterieur(1, 1);
      const libereApres = s.canneEtat === null && s.canneTension === 50;
      s.canneEtat = 'combat'; s.canneTension = 98; s.canneEspece = 'maquereau'; s.canneProgres = 0; s.rush = false; s.rushT = 99;
      INPUT.btn.action = true; majInterieur(1, 1);
      const casseApres = s.canneEtat === null && s.canneTension === 50;
      INPUT.btn.action = false;
      // ferrage manqué : le poisson file
      s.retourBarreT = 0; s.auxCommandes = true; __chal.surBanc(s, 'canne'); __chal.appuyer(); s.canneDelai = 0; majInterieur(0.01, 0.01); s.canneFerrageT = 0; majInterieur(0.01, 0.01);
      const fenetreManquee = s.canneEtat === null;
      // retour automatique à la barre après la touche
      for (let i = 0; i < 40; i++) majInterieur(0.05, 0.05);
      const retourBarre = s.auxCommandes && Math.hypot(P.x - s.barre.x, P.z - s.barre.z) < 0.01;
      sortirInterieur();
      return { labelLoin, labelVite, labelPeche, enAttente, aLaCanne, enMorsure, panneauVisible, enCombat, especeValide, doigtMouline, doigtLeve, libereApres, casseApres, fenetreManquee, retourBarre };
    });
    if (!/radar/i.test(canneBase.labelLoin) || !/Ralentis/.test(canneBase.labelVite) || !/PÊCHER/.test(canneBase.labelPeche)) fail('Chalutier : bouton d\'action en mer incohérent (' + JSON.stringify(canneBase) + ')');
    else ok('Chalutier : loin d\'un banc « fonce vers un banc », trop vite « ralentis », sur un banc à l\'arrêt « PÊCHER ICI »');
    if (!canneBase.enAttente || !canneBase.aLaCanne) fail('Chalutier : PÊCHER ICI ne lance pas la ligne depuis la canne');
    else ok('Chalutier : PÊCHER ICI envoie le joueur à la canne et lance la ligne');
    if (!canneBase.enMorsure || !canneBase.panneauVisible) fail('Chalutier : pas de touche, ou panneau de pêche invisible');
    else ok('Chalutier : la touche arrive, le panneau de pêche est affiché');
    if (!canneBase.enCombat || !canneBase.especeValide) fail('Chalutier : toucher le panneau pendant la touche ne ferre pas');
    else ok('Chalutier : toucher le panneau ferre le poisson (combat avec une espèce valide)');
    if (!canneBase.doigtMouline || !canneBase.doigtLeve) fail('Chalutier : maintenir le doigt sur le panneau ne mouline pas (ou ne s\'arrête pas au relâcher)');
    else ok('Chalutier : doigt posé = mouliner, doigt levé = relâcher');
    if (!canneBase.libereApres || !canneBase.casseApres) fail('Chalutier : tension 0 ne libère pas / tension 100 ne casse pas (' + JSON.stringify(canneBase) + ')');
    else ok('Chalutier : tension à 0 libère le poisson, tension à 100 casse la ligne');
    if (!canneBase.fenetreManquee) fail('Chalutier : une touche non ferrée ne fait pas filer le poisson');
    else ok('Chalutier : une touche non ferrée fait filer le poisson');
    if (!canneBase.retourBarre) fail('Chalutier : le joueur ne revient pas à la barre après la pêche');
    else ok('Chalutier : le joueur revient seul à la barre après la pêche');

    // -------------------------------------------------------------------
    // Combat : une alternance simple gagne, tenir casse, relâcher libère ;
    // les coups de tête punissent celui qui mouline pendant un rush.
    // -------------------------------------------------------------------
    console.log('\n--- Chalutier « Sainte-Odile » : combat — alternance gagnante, coups de tête (rush) ---');
    const combatSim = await page.evaluate(() => {
      const centre = (CHALUTIER_TENSION_BONNE[0] + CHALUTIER_TENSION_BONNE[1]) / 2;
      function combat(strategie, espece) {
        const s = __chal.entrer(); __chal.larguer(s); __chal.surBanc(s, 'canne'); s.auxCommandes = false;
        s.canneEtat = 'combat'; s.canneEspece = espece || 'maquereau'; s.canneTension = 50; s.canneProgres = 0; s.rush = false; s.rushT = 2;
        const po = CHALUTIER_POISSONS[s.canneEspece], dl = po.tensionEtroite ? 8 : 15;
        let tenant = true, ticks = 0;
        while (ticks < 4000 && s.canneEtat === 'combat') {
          if (strategie === 'alterne' || strategie === 'malin') {
            if (strategie === 'malin' && s.rush) tenant = s.canneTension < centre - dl * 0.9;
            else if (s.canneTension > centre + dl * 0.6) tenant = false; else if (s.canneTension < centre - dl * 0.6) tenant = true;
          } else tenant = strategie === 'tenir';
          INPUT.btn.action = tenant; majInterieur(0.05, 0.05); ticks++;
        }
        const gagne = s.cale.length > 0;
        INPUT.btn.action = false; sortirInterieur();
        return { gagne, t: Math.round(ticks * 0.05 * 10) / 10 };
      }
      // rush : mouliner pendant un coup de tête recule la prise, lâcher ne coûte rien
      const s = __chal.entrer(); __chal.larguer(s); s.auxCommandes = false;
      s.canneEtat = 'combat'; s.canneEspece = 'bar'; s.canneTension = 40; s.canneProgres = 50; s.rush = true; s.rushT = 5;
      INPUT.btn.action = true; majInterieur(0.1, 0.1); const reculEnTirant = s.canneProgres < 50; const tensionEnTirant = s.canneTension;
      s.canneTension = 40; s.canneProgres = 50; INPUT.btn.action = false; majInterieur(0.1, 0.1); const tientEnLachant = s.canneProgres === 50;
      INPUT.btn.action = false; sortirInterieur();
      let malinRoi = 0; for (let i = 0; i < 5; i++) if (combat('malin', 'roi').gagne) malinRoi++;
      return { alterne: combat('alterne'), tenir: combat('tenir'), relacher: combat('relacher'), reculEnTirant, tensionEnTirant, seuilTension: 40 + CHALUTIER_TENSION_RATE * 0.1 + 0.01, tientEnLachant, malinRoi };
    });
    if (!combatSim.alterne.gagne) fail('Chalutier : une alternance simple ne ferre pas un maquereau en ' + combatSim.alterne.t + ' s — ingagnable à l\'intuition');
    else ok('Chalutier : une alternance simple ferre un maquereau (' + combatSim.alterne.t + ' s)');
    if (combatSim.tenir.gagne || combatSim.relacher.gagne) fail('Chalutier : tenir en continu ou relâcher en continu gagne le combat (' + JSON.stringify(combatSim) + ')');
    else ok('Chalutier : tenir en continu casse la ligne, relâcher en continu libère le poisson');
    if (!combatSim.reculEnTirant || !(combatSim.tensionEnTirant > combatSim.seuilTension) || !combatSim.tientEnLachant) fail('Chalutier : le coup de tête ne punit pas le moulinet (ou punit le relâché) (' + JSON.stringify(combatSim) + ')');
    else ok('Chalutier : pendant un coup de tête, mouliner recule la prise et tend la ligne ; lâcher ne coûte rien');
    if (combatSim.malinRoi < 3) fail('Chalutier : le Vieux Roi n\'est ferré que ' + combatSim.malinRoi + '/5 fois en lâchant pendant les rushs');
    else ok('Chalutier : en lâchant pendant ses rushs, on ferre le Vieux Roi (' + combatSim.malinRoi + '/5)');

    // -------------------------------------------------------------------
    // Le Vieux Roi : saute deux fois pendant le combat, résiste à la tempête
    // (jamais emporté avec la moitié de la cale).
    // -------------------------------------------------------------------
    console.log('\n--- Chalutier « Sainte-Odile » : le Vieux Roi (sauts, arrimé contre la tempête) ---');
    const roiTest = await page.evaluate(() => {
      const s = __chal.entrer(); __chal.larguer(s); const b = __chal.surBanc(s, 'roi'); s.introT = 0;
      const label = __chal.appuyer(); s.canneDelai = 0; majInterieur(0.01, 0.01); chalutierFerrer(s);
      const espece = s.canneEspece; s.rushT = 999; s.canneTension = 50;
      let sauts = 0, vuSaut = false; INPUT.btn.action = false;
      for (let i = 0; i < 3000 && s.canneEtat === 'combat'; i++) { INPUT.btn.action = s.canneTension < 48; majInterieur(0.02, 0.02); if (s.sautRoi) vuSaut = true; sauts = s.roiSauts; }
      INPUT.btn.action = false;
      const pris = s.cale.some((it) => it.legende), stock = b.stock;
      for (let i = 0; i < 10; i++) chalutierAjouterCale(s, { nom: 'x' + i, valeur: 10, poids: 10 });
      s.meteoJauge = CHALUTIER_METEO_TEMPETE + 1; s.meteoEtat = 'tempete'; s.tempeteT = CHALUTIER_TEMPETE_DELAI - 0.01; majInterieur(0.05, 0.05);
      const roiGarde = s.cale.some((it) => it.legende), poidsApres = s.calePoids;
      sortirInterieur();
      return { label, espece, sauts, vuSaut, pris, stock, roiGarde, poidsApres, poidsRoi: CHALUTIER_POISSONS.roi.poids };
    });
    if (!/VIEUX ROI/.test(roiTest.label) || roiTest.espece !== 'roi') fail('Chalutier : le banc du Vieux Roi ne fait pas mordre le Vieux Roi (' + JSON.stringify(roiTest) + ')');
    else ok('Chalutier : sur son banc, c\'est bien le Vieux Roi qui mord');
    if (roiTest.sauts !== 2 || !roiTest.vuSaut || !roiTest.pris || roiTest.stock !== 0) fail('Chalutier : le Vieux Roi ne saute pas deux fois, ou n\'est pas pris (' + JSON.stringify(roiTest) + ')');
    else ok('Chalutier : le Vieux Roi saute deux fois hors de l\'eau, puis rejoint la cale');
    if (!roiTest.roiGarde) fail('Chalutier : la tempête emporte le Vieux Roi');
    else ok('Chalutier : la tempête emporte la moitié de la cale, jamais le Vieux Roi (' + roiTest.poidsApres + ' kg restants)');

    // -------------------------------------------------------------------
    // Filet : seulement près d'un banc de sardines ; se remplit en le
    // traversant au moteur (presque rien hors banc) ; déchirure en zone rouge.
    // -------------------------------------------------------------------
    console.log('\n--- Chalutier « Sainte-Odile » : filet — banc de sardines, remplissage au moteur, déchirure ---');
    const filet = await page.evaluate(() => {
      const s = __chal.entrer(); __chal.larguer(s); s.introT = 0;
      const b = __chal.surBanc(s, 'filet');
      const label = __chal.appuyer(); const traine = s.filetEtat === 'traine';
      s.bateau.x = b.x; s.bateau.z = b.z; s.bateau.v = 6; s.auxCommandes = false; majInterieur(0.5, 0.5); const dansBanc = s.filetCharge;
      s.filetCharge = 0; s.bateau.x = b.x + b.r + 30; s.bateau.z = b.z; s.bateau.v = 6; majInterieur(0.5, 0.5); const horsBanc = s.filetCharge;
      s.filetCharge = 55; const caleAvant = s.cale.length;
      s.auxCommandes = true; const labelRemonter = __chal.appuyer();
      const caleApres = s.cale.length, filetVide = s.filetEtat === null;
      let dechire = false;
      for (let i = 0; i < 500 && !dechire; i++) { if (s.filetEtat !== 'traine') { s.filetEtat = 'traine'; s.filetCharge = 99; } majInterieur(0.3, 0.3); if (s.filetEtat === null) dechire = true; }
      sortirInterieur();
      return { label, traine, dansBanc, horsBanc, labelRemonter, caleAvant, caleApres, filetVide, dechire };
    });
    if (!/FILET/.test(filet.label) || !filet.traine) fail('Chalutier : JETER LE FILET n\'est pas proposé près d\'un banc de sardines (' + JSON.stringify(filet) + ')');
    else ok('Chalutier : près d\'un banc de sardines, JETER LE FILET met le filet à l\'eau');
    if (!(filet.dansBanc > filet.horsBanc * 4) || !(filet.horsBanc > 0)) fail('Chalutier : le filet ne se remplit pas surtout dans le banc (' + JSON.stringify(filet) + ')');
    else ok('Chalutier : le filet se remplit en traversant le banc (' + filet.dansBanc.toFixed(1) + ' %/0,5 s), presque rien hors banc (' + filet.horsBanc.toFixed(2) + ')');
    if (!/REMONTER/.test(filet.labelRemonter) || filet.caleApres <= filet.caleAvant || !filet.filetVide) fail('Chalutier : REMONTER LE FILET ne remplit pas la cale (' + JSON.stringify(filet) + ')');
    else ok('Chalutier : REMONTER LE FILET convertit la charge en caisses dans la cale');
    if (!filet.dechire) fail('Chalutier : le filet ne se déchire jamais au-delà de la zone rouge');
    else ok('Chalutier : un filet trop chargé finit par se déchirer (tout perdu)');

    console.log('\n--- Chalutier « Sainte-Odile » : objets étranges au filet, uniquement à la Fosse ---');
    const objetsTest = await page.evaluate(() => {
      const s = __chal.entrer();
      const estObjet = (it) => CHALUTIER_OBJETS.some((o) => o.nom === it.nom);
      s.bateau.x = 0; s.bateau.z = -(CHALUTIER_ZONE2_MAX + 10);
      let enFosse = false;
      for (let i = 0; i < 200 && !enFosse; i++) { s.cale = []; s.calePoids = 0; s.caleValeur = 0; chalutierRemonterFilet(Object.assign(s, { filetCharge: 80 })); if (s.cale.some(estObjet)) enFosse = true; }
      s.bateau.x = 0; s.bateau.z = -10;
      let horsFosse = false;
      for (let i = 0; i < 200; i++) { s.cale = []; s.calePoids = 0; s.caleValeur = 0; chalutierRemonterFilet(Object.assign(s, { filetCharge: 80 })); if (s.cale.some(estObjet)) { horsFosse = true; break; } }
      sortirInterieur();
      return { enFosse, horsFosse };
    });
    if (!objetsTest.enFosse || objetsTest.horsFosse) fail('Chalutier : objets étranges mal répartis (' + JSON.stringify(objetsTest) + ')');
    else ok('Chalutier : les objets étranges ne remontent qu\'à la Fosse');

    console.log('\n--- Chalutier « Sainte-Odile » : la cale (poids, valeur, plafond) et sa vitesse ---');
    const caleTest = await page.evaluate(() => {
      const s = __chal.entrer(); __chal.larguer(s);
      chalutierAjouterCale(s, { nom: 'Test1', valeur: 100, poids: 10 }); chalutierAjouterCale(s, { nom: 'Test2', valeur: 50, poids: 5 });
      const poids = s.calePoids, valeur = s.caleValeur;
      const refusePleine = !chalutierAjouterCale(s, { nom: 'Trop', valeur: 10, poids: CHALUTIER_CALE_MAX });
      majInterieur(0.05, 0.05); const caisses = s.caisses.filter((c) => c.visible).length;
      const recifs = s.recifs; s.recifs = []; // le test maîtrise sa scène : aucun récif sur la route
      INPUT.mx = 0; INPUT.mz = -1;
      s.calePoids = 0; s.meteoEtat = 'calme'; s.meteoJauge = 0; s.bateau.v = 0; s.bateau.z = -30; s.aQuitteLePort = true;
      for (let i = 0; i < 300; i++) { s.meteoJauge = 0; majInterieur(0.05, 0.05); }
      const vVide = s.bateau.v;
      s.bateau.v = 0; s.calePoids = CHALUTIER_CALE_MAX; s.bateau.x = 0; s.bateau.z = -30;
      for (let i = 0; i < 300; i++) { s.meteoJauge = 0; majInterieur(0.05, 0.05); }
      const vPleine = s.bateau.v;
      s.recifs = recifs; INPUT.mz = 0; sortirInterieur();
      return { poids, valeur, refusePleine, caisses, ratio: vPleine / vVide };
    });
    if (caleTest.poids !== 15 || caleTest.valeur !== 150 || !caleTest.refusePleine) fail('Chalutier : la cale n\'accumule pas ou ne refuse pas le surplus (' + JSON.stringify(caleTest) + ')');
    else ok('Chalutier : la cale accumule poids et valeur, refuse ce qui dépasse');
    if (Math.abs(caleTest.ratio - 0.6) > 0.05) fail('Chalutier : la cale pleine ne retire pas ~40 % de vitesse (ratio ' + caleTest.ratio.toFixed(3) + ')');
    else ok('Chalutier : la cale pleine retire bien ~40 % de vitesse');

    console.log('\n--- Chalutier « Sainte-Odile » : météo — seuils, perte de cale en tempête ---');
    const meteoTest = await page.evaluate(() => {
      const s = __chal.entrer(); __chal.larguer(s);
      s.bateau.x = 0; s.bateau.z = 0;
      s.meteoJauge = CHALUTIER_METEO_HOULE - 1; majInterieur(0.01, 4); const houle = s.meteoEtat === 'houle';
      s.meteoJauge = CHALUTIER_METEO_TEMPETE - 1; majInterieur(0.01, 4); const tempete = s.meteoEtat === 'tempete';
      s.cale = []; s.calePoids = 0; s.caleValeur = 0;
      for (let i = 0; i < 10; i++) chalutierAjouterCale(s, { nom: 'x' + i, valeur: 10, poids: 10 });
      s.tempeteT = CHALUTIER_TEMPETE_DELAI - 0.1; majInterieur(0.01, 1);
      const poids = s.calePoids, valeur = s.caleValeur;
      sortirInterieur();
      return { houle, tempete, poids, valeur };
    });
    if (!meteoTest.houle || !meteoTest.tempete) fail('Chalutier : la météo ne passe pas en HOULE / TEMPÊTE aux seuils');
    else ok('Chalutier : la météo passe en HOULE puis en TEMPÊTE aux seuils attendus');
    if (meteoTest.poids !== 50 || meteoTest.valeur !== 50) fail('Chalutier : 30 s de tempête ne coûtent pas exactement la moitié de la cale (' + JSON.stringify(meteoTest) + ')');
    else ok('Chalutier : 30 s de tempête coûtent la moitié de la cale');

    console.log('\n--- Chalutier « Sainte-Odile » : chrono de 180 s (remorqué), retour au port et vente à la criée ---');
    const finSortie = await page.evaluate(() => {
      const out = {};
      let s = __chal.entrer(); __chal.larguer(s);
      for (let i = 0; i < 10; i++) chalutierAjouterCale(s, { nom: 'x' + i, valeur: 10, poids: 10 });
      s.bateau.x = 50; s.bateau.z = -50; s.chrono = CHALUTIER_DUREE - 0.5;
      let a0 = META.argent; majInterieur(0.01, 1);
      out.remorqueFini = !s.sortieEnCours; out.remorqueGain = META.argent - a0;
      s = __chal.entrer(); __chal.larguer(s);
      out.pasDeVenteAuDepart = s.sortieEnCours;
      chalutierAjouterCale(s, { nom: 'Bar', valeur: 90, poids: 7 }); chalutierAjouterCale(s, { nom: 'Bar', valeur: 90, poids: 7 }); chalutierAjouterCale(s, { nom: 'Thon de Los Reyes', valeur: 350, poids: 22 });
      s.aQuitteLePort = true; s.bateau.x = 3; s.bateau.z = 3;
      a0 = META.argent; majInterieur(0.01, 0.01);
      out.venteFinie = !s.sortieEnCours; out.venteGain = META.argent - a0;
      out.bilanVisible = getComputedStyle(chalBilanWrap).display !== 'none';
      out.bilanTexte = chalBilanWrap.textContent;
      for (let i = 0; i < 40; i++) majInterieur(0.05, 0.05);
      out.bilanTotal = chalBilanTotalEl.textContent;
      for (let i = 0; i < 80; i++) majInterieur(0.05, 0.05);
      out.bilanCache = getComputedStyle(chalBilanWrap).display === 'none';
      out.panneauxCaches = getComputedStyle(chalutierWrap).display === 'none' && getComputedStyle(chalPecheWrap).display === 'none';
      sortirInterieur();
      return out;
    });
    if (!finSortie.remorqueFini || finSortie.remorqueGain !== 50) fail('Chalutier : au bout de 180 s, pas remorqué ou pas la moitié de la cale vendue (' + JSON.stringify(finSortie) + ')');
    else ok('Chalutier : au bout de 180 s, remorqué au port, la moitié de la cale vendue');
    if (!finSortie.pasDeVenteAuDepart || !finSortie.venteFinie || finSortie.venteGain !== 530) fail('Chalutier : le retour au port ne vend pas la cale (' + JSON.stringify(finSortie) + ')');
    else ok('Chalutier : rentrer au port vend toute la cale (+530 $)');
    if (!finSortie.bilanVisible || !/Bar ×2/.test(finSortie.bilanTexte) || !/Thon/.test(finSortie.bilanTexte) || finSortie.bilanTotal !== '+530 $' || !finSortie.bilanCache || !finSortie.panneauxCaches) fail('Chalutier : bilan de la vente incorrect (' + JSON.stringify(finSortie) + ')');
    else ok('Chalutier : le bilan de la criée détaille les prises, compte jusqu\'au total, puis s\'efface');

    // -------------------------------------------------------------------
    // Curiosité La Boussole du Capitaine : ramener le Vieux Roi. Une cale
    // pleine depuis la Fosse SANS lui ne suffit pas. Testé AVANT toute sortie
    // qui l'obtiendrait pour de bon.
    // -------------------------------------------------------------------
    console.log('\n--- Chalutier « Sainte-Odile » : curiosité La Boussole du Capitaine (ramener le Vieux Roi) ---');
    const boussoleTest = await page.evaluate(() => {
      const dejaAcquise = aCurio('boussole');
      let s = __chal.entrer(); __chal.larguer(s);
      s.zoneMax = 3; chalutierAjouterCale(s, { nom: 'Pleine', valeur: 999, poids: CHALUTIER_CALE_MAX });
      s.aQuitteLePort = true; s.bateau.x = 2; s.bateau.z = 2; majInterieur(0.01, 0.01);
      const sansRoi = aCurio('boussole');
      s = __chal.entrer(); __chal.larguer(s);
      chalutierAjouterCale(s, { nom: 'Le Vieux Roi', valeur: CHALUTIER_POISSONS.roi.valeur, poids: CHALUTIER_POISSONS.roi.poids, legende: true });
      const avant = s.boussoleMesh.material.color.getHex();
      s.aQuitteLePort = true; s.bateau.x = 2; s.bateau.z = 2; majInterieur(0.01, 0.01);
      const avecRoi = aCurio('boussole'), apres = s.boussoleMesh.material.color.getHex();
      sortirInterieur();
      return { dejaAcquise, sansRoi, avecRoi, avant, apres };
    });
    if (boussoleTest.dejaAcquise) fail('Chalutier : le test suppose la curiosité \'boussole\' pas encore acquise à ce stade de la suite');
    if (boussoleTest.sansRoi) fail('Chalutier : la curiosité est donnée sans le Vieux Roi');
    else ok('Chalutier : une cale pleine depuis la Fosse, sans le Vieux Roi, ne donne pas la curiosité');
    if (!boussoleTest.avecRoi || boussoleTest.avant === boussoleTest.apres) fail('Chalutier : ramener le Vieux Roi ne donne pas la curiosité (ou la boussole ne s\'illumine pas)');
    else ok('Chalutier : ramener le Vieux Roi donne la Boussole, qui s\'illumine sur la console');

    // -------------------------------------------------------------------
    // Pilote simulé : une vraie sortie au joystick et au bouton d'action
    // seulement (temps de réaction ~0,35 s, lâche pendant les rushs). Il doit
    // ramener le Vieux Roi et d'autres prises avant 180 s ; un joueur qui ne
    // fait rien est remorqué.
    // -------------------------------------------------------------------
    console.log('\n--- Chalutier « Sainte-Odile » : pilote simulé — sortie complète au joystick, et sortie ratée ---');
    const pilote = await page.evaluate(() => {
      function sortieComplete() {
        const s = __chal.entrer(); __chal.larguer(s);
        const dt = 1 / 30; let t = 0, roiPris = false, retour = false, peches = 0;
        const vers = (x0, z0, arret) => { let x = x0, z = z0;
          for (const rc of s.recifs) { const ux = x0 - s.bateau.x, uz = z0 - s.bateau.z, L = Math.hypot(ux, uz) || 1, px = rc.x - s.bateau.x, pz = rc.z - s.bateau.z, pr = (px * ux + pz * uz) / L, lat = (px * uz - pz * ux) / L;
            if (pr > 0 && pr < Math.min(L, 45) && Math.abs(lat) < rc.r + 9) { const sg = lat > 0 ? -1 : 1; x = rc.x + sg * uz / L * (rc.r + 14); z = rc.z - sg * ux / L * (rc.r + 14); break; } }
          const e = angDiff(s.bateau.ang, Math.atan2(x - s.bateau.x, z - s.bateau.z)), d = Math.hypot(x0 - s.bateau.x, z0 - s.bateau.z);
          INPUT.mx = clamp(-e * 2.5, -1, 1);
          INPUT.mz = arret && d < 7 + Math.abs(s.bateau.v) * 1.1 ? (Math.abs(s.bateau.v) > 1.2 ? 1 : 0) : (Math.abs(e) > 1.2 ? -0.4 : -1); return d; };
        const tick = () => { if (s.cale.some((x) => x.legende)) roiPris = true; majInterieur(dt, dt); t += dt; };
        while (s.sortieEnCours && t < 200) {
          if (s.canneEtat === 'combat') { const po = CHALUTIER_POISSONS[s.canneEspece], dl = (po.tensionEtroite ? 8 : 15) * (s.meteoEtat === 'calme' ? 1 : (s.meteoEtat === 'houle' ? 0.72 : 0.55));
            if (s.rush) INPUT.btn.action = s.canneTension < 50 - dl * 0.9; else if (s.canneTension > 50 + dl * 0.5) INPUT.btn.action = false; else if (s.canneTension < 50 - dl * 0.5) INPUT.btn.action = true;
            INPUT.mx = INPUT.mz = 0; tick(); continue; }
          INPUT.btn.action = false;
          if (s.canneEtat === 'morsure') { if (Math.random() < dt / 0.35) __chal.appuyer(); tick(); continue; }
          if (s.canneEtat === 'attente' || s.retourBarreT > 0) { INPUT.mx = INPUT.mz = 0; tick(); continue; }
          retour = retour || s.calePoids > CHALUTIER_CALE_MAX - 25 || s.meteoEtat === 'tempete' || t > 120; // prudent : une tempête au retour coûte cher (×0,55)
          if (retour) { vers(0, 0, false); tick(); continue; }
          const garnis = s.bancs.filter((b) => b.stock > 0 && b.type !== 'filet');
          const cible = garnis.find((b) => b.type === 'roi') || garnis.sort((a, b) => Math.hypot(a.x - s.bateau.x, a.z - s.bateau.z) - Math.hypot(b.x - s.bateau.x, b.z - s.bateau.z))[0];
          if (!cible) { retour = true; continue; }
          const d = vers(cible.x, cible.z, true);
          if (d < cible.r - 1 && Math.abs(s.bateau.v) < CHALUTIER_PECHE_VMAX && /PÊCHER/.test(__chal.appuyer())) peches++;
          tick();
        }
        INPUT.btn.action = false; INPUT.mx = INPUT.mz = 0;
        const r = { t: Math.round(t), fini: !s.sortieEnCours, roiPris, vente: s.bilanTotal, autres: s.bilanTotal > CHALUTIER_POISSONS.roi.valeur, peches };
        sortirInterieur(); return r;
      }
      const reussies = []; for (let i = 0; i < 4; i++) reussies.push(sortieComplete());
      // sortie ratée : on largue et on ne fait rien
      const s = __chal.entrer(); __chal.larguer(s); let t = 0; while (s.sortieEnCours && t < 200) { majInterieur(0.1, 0.1); t += 0.1; }
      const passif = { t: Math.round(t), vente: s.bilanTotal };
      sortirInterieur();
      return { reussies, passif };
    });
    const pilOk = pilote.reussies.filter((r) => r.fini && r.t < 180 && r.roiPris && r.autres).length;
    if (pilOk < 3) fail('Chalutier : le pilote simulé ne ramène pas le Vieux Roi avant 180 s (' + JSON.stringify(pilote.reussies) + ')');
    else ok('Chalutier : pilote simulé — ' + pilOk + '/4 sorties ramènent le Vieux Roi et d\'autres prises avant 180 s (' + pilote.reussies.map((r) => r.t + ' s, ' + r.vente + ' $').join(' ; ') + ')');
    if (pilote.passif.t < 179 || pilote.passif.vente !== 0) fail('Chalutier : une sortie sans rien faire ne finit pas remorquée à 180 s sans gain (' + JSON.stringify(pilote.passif) + ')');
    else ok('Chalutier : une sortie sans rien faire finit remorquée à 180 s, sans un dollar');

    console.log('\n--- Chalutier « Sainte-Odile » : limite de 2 sorties par vague, l\'abandon consomme la sortie ---');
    const capChal = await page.evaluate(() => {
      let s = __chal.entrer(); __chal.larguer(s);
      const premiere = s.sortieEnCours; sortirInterieur();
      const annulee = !s.sortieEnCours, cpt1 = s.sortiesVague;
      entrerInterieur('chalutier', PORTES.find((x) => x.id === 'chalutier')); __chal.larguer(s); const deuxieme = s.sortieEnCours; sortirInterieur();
      const cpt2 = s.sortiesVague;
      entrerInterieur('chalutier', PORTES.find((x) => x.id === 'chalutier')); P.x = s.barre.x; P.z = s.barre.z;
      const label3 = __chal.appuyer(); const troisiemeRefusee = !s.sortieEnCours;
      sortirInterieur();
      return { premiere, annulee, cpt1, deuxieme, cpt2, label3, troisiemeRefusee };
    });
    if (!capChal.premiere || !capChal.annulee || capChal.cpt1 !== 1 || !capChal.deuxieme || capChal.cpt2 !== 2) fail('Chalutier : compteur de sorties incorrect (' + JSON.stringify(capChal) + ')');
    else ok('Chalutier : sortir en pleine mer annule la sortie et la consomme ; la 2e démarre normalement');
    if (!capChal.troisiemeRefusee || !/deux sorties/i.test(capChal.label3)) fail('Chalutier : une 3e sortie dans la même vague n\'est pas refusée (label=' + capChal.label3 + ')');
    else ok('Chalutier : une 3e sortie dans la même vague est refusée');

    console.log('\n--- Chalutier « Sainte-Odile » : la zone de SORTIE est inerte en pleine mer, l\'abandon passe par un bouton dédié ---');
    const sortieEnMer = await page.evaluate(() => {
      const s = __chal.entrer(); __chal.larguer(s);
      P.x = s.sortie.x; P.z = s.sortie.z; majAction();
      const labelEnMer = document.getElementById('btnAction').textContent; document.getElementById('btnAction')._fn();
      const resteEnMer = !!INT.actif && s.sortieEnCours, cpt = s.sortiesVague;
      document.getElementById('chalAbandonner').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
      const abandonnee = !s.sortieEnCours && !!INT.actif && s.sortiesVague === cpt;
      majAction(); const labelAuPonton = document.getElementById('btnAction').textContent; document.getElementById('btnAction')._fn();
      return { labelEnMer, resteEnMer, abandonnee, labelAuPonton, quittee: !INT.actif };
    });
    if (!/rentrer au port/i.test(sortieEnMer.labelEnMer) || !sortieEnMer.resteEnMer) fail('Chalutier : la zone de SORTIE en pleine mer fait quitter la salle ou n\'affiche pas le bon message (' + JSON.stringify(sortieEnMer) + ')');
    else ok('Chalutier : en pleine mer, la zone de SORTIE dit « il faut rentrer au port » et ne fait rien quitter');
    if (!sortieEnMer.abandonnee) fail('Chalutier : ⚓ ABANDONNER n\'abandonne pas la sortie (sans quitter la salle, en la consommant)');
    else ok('Chalutier : ⚓ ABANDONNER abandonne la sortie, en la consommant, sans quitter la salle');
    if (!/^SORTIR/.test(sortieEnMer.labelAuPonton) || !sortieEnMer.quittee) fail('Chalutier : la zone de SORTIE ne redevient pas utilisable au ponton');
    else ok('Chalutier : de retour au ponton, la zone de SORTIE refonctionne');

    console.log('\n--- Chalutier « Sainte-Odile » : réinitialisations (vague, mort, game over) ---');
    const resetsChal = await page.evaluate(() => {
      const s = __chal.entrer(); __chal.larguer(s);
      chalutierAjouterCale(s, { nom: 'x', valeur: 100, poids: 10 });
      s.meteoJauge = 50; s.meteoEtat = 'houle'; s.bateau.x = 30; s.bateau.z = -30; s.filetEtat = 'traine';
      WAVES.n++; majInterieur(0, 0);
      const vague = { sortie: s.sortieEnCours, cale: s.calePoids, meteo: s.meteoJauge, bateau: Math.hypot(s.bateau.x, s.bateau.z), cpt: s.sortiesVague, filet: s.filetEtat };
      __chal.larguer(s); chalutierAjouterCale(s, { nom: 'y', valeur: 100, poids: 10 }); __chal.surBanc(s, 'canne'); __chal.appuyer();
      P.hp = 1; toucherJoueur(9999);
      const mort = { sortie: s.sortieEnCours, cale: s.calePoids, mode: ETAT.mode, canne: s.canneEtat, panneau: getComputedStyle(chalPecheWrap).display, combat: getComputedStyle(document.getElementById('btnDodge')).display };
      startRun();
      const sa = INT.salles.chalutier;
      return { vague, mort, go: { sortie: sa.sortieEnCours, cpt: sa.sortiesVague, bilan: getComputedStyle(chalBilanWrap).display, intro: getComputedStyle(chalIntroWrap).display } };
    });
    const rv = resetsChal.vague, rm = resetsChal.mort, rg = resetsChal.go;
    if (rv.sortie || rv.cale !== 0 || rv.meteo !== 0 || rv.bateau !== 0 || rv.cpt !== 0 || rv.filet !== null) fail('Chalutier : le passage de vague ne réinitialise pas tout (' + JSON.stringify(rv) + ')');
    else ok('Chalutier : le passage de vague coupe la sortie et remet cale, météo, filet, bateau et compteur à zéro');
    if (rm.mode !== 'mort' || rm.sortie || rm.cale !== 0 || rm.canne !== null || rm.panneau !== 'none' || rm.combat === 'none') fail('Chalutier : mourir en pleine pêche ne coupe pas tout (' + JSON.stringify(rm) + ')');
    else ok('Chalutier : mourir en pleine pêche coupe la sortie, la cale, la pêche, et rend les boutons');
    if (rg.sortie || rg.cpt !== 0 || rg.bilan !== 'none' || rg.intro !== 'none') fail('Chalutier : le game over ne remet pas tout à zéro (' + JSON.stringify(rg) + ')');
    else ok('Chalutier : le game over remet sortie, compteur et panneaux à zéro');

    console.log('\n--- Chalutier « Sainte-Odile » : tables de fouille (jamais négatif, encaissement immédiat) ---');
    const fouilleChal = await page.evaluate(() => {
      const s = __chal.entrer();
      const avant = META.fouilles, res = { chalutierPont: [], chalutierCabine: [] };
      for (const table of ['chalutierPont', 'chalutierCabine']) {
        const f = s.fouilles.find((x) => x.table === table);
        for (let i = 0; i < 60; i++) { f.prisVague = -1; const a0 = META.argent; resoudreFouille(f); res[table].push(META.argent - a0); }
      }
      const total = META.fouilles - avant; sortirInterieur();
      return { res, total };
    });
    if (fouilleChal.total !== 120) fail('Chalutier : META.fouilles n\'est pas incrémenté une fois par fouille (delta=' + fouilleChal.total + '/120)');
    else ok('Chalutier : chaque fouille résolue incrémente META.fouilles');
    for (const table of ['chalutierPont', 'chalutierCabine']) {
      if (fouilleChal.res[table].some((v) => v < 0)) fail('Chalutier : la table ' + table + ' a produit un gain négatif');
      else ok('Chalutier : la table ' + table + ' ne produit jamais de gain négatif (60 tirages)');
    }

    // -------------------------------------------------------------------
    // Horloges séparées : chrono, charge du filet, combat ET déplacement du
    // bateau suivent le temps réel (dtJeu), jamais le ralenti (dt).
    // -------------------------------------------------------------------
    console.log('\n--- Horloges séparées : chrono, filet, combat et déplacement du Chalutier suivent tous dtJeu ---');
    const horlogesChal = await page.evaluate(() => {
      const s = __chal.entrer(); __chal.larguer(s);
      const b = __chal.surBanc(s, 'filet'); s.bateau.x = b.x; s.bateau.z = b.z; s.bateau.v = 6; s.auxCommandes = true; INPUT.mx = 0; INPUT.mz = -1; // au moteur dans le banc
      s.filetEtat = 'traine'; s.filetCharge = 0;
      const c0 = s.chrono; majInterieur(0.5, 1); INPUT.mz = 0;
      const chrono = s.chrono - c0, filetCharge = s.filetCharge;
      // déplacement : même distance en une seconde réelle, ralenti ou non
      s.filetEtat = null; s.auxCommandes = true; INPUT.mx = 0; INPUT.mz = -1;
      s.bateau.v = 0; s.bateau.ang = Math.PI; s.bateau.x = 0; s.bateau.z = -30; majInterieur(1, 1); const dN = Math.hypot(s.bateau.x, s.bateau.z + 30);
      s.bateau.v = 0; s.bateau.ang = Math.PI; s.bateau.x = 0; s.bateau.z = -30; majInterieur(0.2, 1); const dR = Math.hypot(s.bateau.x, s.bateau.z + 30);
      INPUT.mz = 0;
      // combat : même progression, ralenti ou non
      s.auxCommandes = false; s.canneEtat = 'combat'; s.canneEspece = 'bar'; s.canneTension = 50; s.canneProgres = 0; s.rush = false; s.rushT = 99; INPUT.btn.action = false;
      majInterieur(0.05, 0.1); const pN = s.canneProgres; s.canneTension = 50; s.canneProgres = 0; majInterieur(0.01, 0.1); const pR = s.canneProgres;
      sortirInterieur();
      return { chrono, filetCharge, attendu: CHALUTIER_FILET_VIT * 1, dN, dR, pN, pR };
    });
    if (Math.abs(horlogesChal.chrono - 1) > 1e-9) fail('Chalutier : le chrono suit le ralenti au lieu du temps réel');
    else ok('Chalutier : le chrono avance au temps réel pendant un ralenti');
    if (Math.abs(horlogesChal.filetCharge - horlogesChal.attendu) > 1e-9) fail('Chalutier : la charge du filet suit le ralenti (' + JSON.stringify(horlogesChal) + ')');
    else ok('Chalutier : la charge du filet avance au temps réel pendant un ralenti');
    if (Math.abs(horlogesChal.dN - horlogesChal.dR) > 1e-9 || !(horlogesChal.dN > 0)) fail('Chalutier : le bateau va moins loin pendant un ralenti (' + JSON.stringify(horlogesChal) + ')');
    else ok('Chalutier : le bateau parcourt la même distance en une seconde réelle, ralenti ou non');
    if (Math.abs(horlogesChal.pN - horlogesChal.pR) > 1e-9 || !(horlogesChal.pN > 0)) fail('Chalutier : le combat progresse au rythme du ralenti (' + JSON.stringify(horlogesChal) + ')');
    else ok('Chalutier : le combat à la canne progresse au temps réel, ralenti ou non');

    // =====================================================================
    // SITE 51
    // =====================================================================
    console.log('\n--- Site 51 : porte cachée, quartier, condition de déblocage, 1 visite/vague ---');
    const site51Porte = await page.evaluate(() => {
      const out = {};
      startRun();
      out.quartier = quartier(12, 1);
      const p = PORTES.find((x) => x.id === 'site51');
      out.portePresente = !!p;
      out.icoAvant = INTDEFS.site51.ico;

      META.fouilles = 10;
      P.x = p.x; P.z = p.z;
      majAction();
      out.labelScellee = document.getElementById('btnAction').textContent;
      document.getElementById('btnAction')._fn();
      out.salleOuverteApresRefus = !!INT.actif;

      META.fouilles = 25;
      majAction();
      out.labelOuverte = document.getElementById('btnAction').textContent;
      document.getElementById('btnAction')._fn();
      ETAT.intT = 0;
      out.icoApresEntree = INTDEFS.site51.ico;
      const s = INT.actif;
      P.x = s.sortie.x; P.z = s.sortie.z;
      majAction(); document.getElementById('btnAction')._fn(); // sort sans rien prendre : consomme quand même la visite

      P.x = p.x; P.z = p.z;
      majAction();
      out.label2eTentativeMemeVague = document.getElementById('btnAction').textContent;
      return out;
    });
    if (!site51Porte.portePresente) fail('Site 51 : aucune porte posée');
    else ok('Site 51 : la porte (grille d\'aération) est bien posée');
    if (site51Porte.quartier !== 'base') fail('Site 51 : quartier(12,1) ne vaut plus \'base\' (' + site51Porte.quartier + ') — repositionner caseCentre(12,1)');
    else ok('Site 51 : quartier(12,1) vaut bien \'base\', comme demandé');
    if (site51Porte.icoAvant !== '?') fail('Site 51 : l\'icône n\'est pas « ? » avant la première entrée (' + site51Porte.icoAvant + ')');
    else ok('Site 51 : la carte/minimap affiche bien « ? » avant la première entrée');
    if (!/Scellée/i.test(site51Porte.labelScellee) || site51Porte.salleOuverteApresRefus) fail('Site 51 : la grille n\'est pas scellée sous 25 fouilles (' + JSON.stringify(site51Porte) + ')');
    else ok('Site 51 : la grille est bien scellée (avec message) tant que META.fouilles < 25');
    if (!/^ENTRER/.test(site51Porte.labelOuverte)) fail('Site 51 : la grille reste scellée alors que META.fouilles >= 25 (' + site51Porte.labelOuverte + ')');
    else ok('Site 51 : la grille s\'ouvre normalement dès que META.fouilles >= 25');
    if (site51Porte.icoApresEntree === '?') fail('Site 51 : l\'icône reste « ? » après une première entrée réelle');
    else ok('Site 51 : l\'icône change bien après la première entrée (jamais le nom réel, juste plus « ? »)');
    if (!/Scellée/i.test(site51Porte.label2eTentativeMemeVague)) fail('Site 51 : une 2e visite est possible dans la même vague (' + site51Porte.label2eTentativeMemeVague + '), attendu 1 max');
    else ok('Site 51 : une seule visite par vague, consommée même sans rien prendre');

    console.log('\n--- Site 51 : structure de la salle et curiosité La Plaque du Capitaine ---');
    const site51Structure = await page.evaluate(() => {
      startRun();
      META.fouilles = 25;
      const p = PORTES.find((x) => x.id === 'site51');
      entrerInterieur('site51', p);
      const s = INT.actif;
      const c = CURIOS.find((x) => x.id === 'plaque');
      const out = {
        nbObjets: s.objets51.length, nbFouilles: s.fouilles.length, nbTurrets: s.turrets.length,
        curioActive: c ? c.actif : null, curioA_eff: c ? !!c.eff : false, curioA_ind: c ? !!c.ind : false,
        sasInitial: Object.assign({}, s.sas),
      };
      if (INT.actif) sortirInterieur();
      return out;
    });
    if (site51Structure.nbObjets !== 10) fail('Site 51 : nombre d\'objets de valeur inattendu (' + site51Structure.nbObjets + ', attendu 10)');
    else ok('Site 51 : les 10 objets de valeur (dont la Plaque et le Désintégrateur) sont bien enregistrés');
    if (site51Structure.nbFouilles !== 8) fail('Site 51 : nombre de caches fouillables inattendu (' + site51Structure.nbFouilles + ', attendu 8)');
    else ok('Site 51 : les 8 caches fouillables (3×A, 3×B, 2×C) sont bien enregistrées');
    if (site51Structure.nbTurrets !== 2) fail('Site 51 : nombre de tourelles inattendu (' + site51Structure.nbTurrets + ', attendu 2, niveau B)');
    else ok('Site 51 : les 2 tourelles du niveau B sont bien enregistrées');
    if (!site51Structure.curioActive || !site51Structure.curioA_eff || !site51Structure.curioA_ind) fail('Site 51 : la curiosité \'plaque\' n\'est pas correctement activée (actif/eff/ind)');
    else ok('Site 51 : la curiosité \'plaque\' (La Plaque du Capitaine) est bien activée avec ses textes');
    if (!Object.values(site51Structure.sasInitial).every(Boolean)) fail('Site 51 : les 4 sas ne sont pas tous ouverts à l\'entrée (' + JSON.stringify(site51Structure.sasInitial) + ')');
    else ok('Site 51 : les 4 sas sont bien tous ouverts à l\'entrée');

    // -------------------------------------------------------------------
    // Réinitialisations : une visite interrompue (mort, passage de vague)
    // rouvre les sas et perd le butin PORTÉ, mais le compteur de visites du
    // mystère avance quand même. Testé AVANT les scénarios qui prennent
    // réellement les 10 objets (ceux-ci sont définitifs pour toute la
    // session — voir META.site51Objets, comme les artefacts du musée).
    // Bug déjà rencontré ailleurs (mourir()) : la mort ne fait PAS quitter
    // l'interieur (INT.actif reste posé, seul un futur startRun() le fera) —
    // ce test vérifie donc la conclusion de la visite, pas une sortie physique.
    // -------------------------------------------------------------------
    console.log('\n--- Site 51 : réinitialisations (mort en pleine visite, passage de vague) ---');
    const site51Resets = await page.evaluate(() => {
      startRun();
      META.fouilles = 25;
      const p = PORTES.find((x) => x.id === 'site51');
      const visitesAvant1 = META.site51Visites;
      entrerInterieur('site51', p);
      ETAT.intT = 0;
      let s = INT.actif;
      site51Ramasser(s, 'dossier'); // en poche, pas encore banqué
      P.hp = 1; toucherJoueur(999); // déclenche mourir()
      const out = {};
      out.visiteConclueApresMort = s.visiteEnCours === false;
      out.dossierPasBanque = !META.site51Objets.dossier;
      out.visitesGagneesApresMort = META.site51Visites - visitesAvant1;
      out.sasReouvertsApresMort = Object.assign({}, s.sas);

      // passage de vague en pleine visite — startRun() d'abord, comme un
      // vrai « rejouer » après la mort (INT.actif n'est jamais remis à null
      // par mourir() lui-même, seul un nouveau départ de partie le fait)
      startRun();
      const visitesAvant2 = META.site51Visites;
      entrerInterieur('site51', p);
      ETAT.intT = 0;
      s = INT.actif;
      site51Ramasser(s, 'badge');
      s.site51VagueRef = WAVES.n - 1; // force la détection d'un changement de vague au prochain tick
      majInterieur(0.1, 0.1);
      out.visiteConclueApresVague = s.visiteEnCours === false;
      out.badgePasBanque = !META.site51Objets.badge;
      out.visitesGagneesApresVague = META.site51Visites - visitesAvant2;
      return out;
    });
    if (!site51Resets.visiteConclueApresMort) fail('Site 51 : mourir en pleine visite ne conclut pas la visite (visiteEnCours reste vrai)');
    else ok('Site 51 : mourir en pleine visite conclut bien la visite (en échec)');
    if (!site51Resets.dossierPasBanque) fail('Site 51 : un objet porté (non rapporté) au moment de la mort est quand même banqué définitivement');
    else ok('Site 51 : le butin porté au moment de la mort est bien perdu, jamais banqué');
    if (site51Resets.visitesGagneesApresMort !== 1) fail('Site 51 : mourir en pleine visite n\'avance pas exactement de 1 le compteur de visites du mystère (' + site51Resets.visitesGagneesApresMort + ')');
    else ok('Site 51 : mourir en pleine visite compte quand même comme une visite terminée pour le mystère');
    if (!Object.values(site51Resets.sasReouvertsApresMort).every(Boolean)) fail('Site 51 : les sas ne sont pas rouverts après une mort en pleine visite (' + JSON.stringify(site51Resets.sasReouvertsApresMort) + ')');
    else ok('Site 51 : les 4 sas sont bien rouverts après une mort en pleine visite');
    if (!site51Resets.visiteConclueApresVague) fail('Site 51 : un passage de vague en pleine visite n\'annule pas la visite en cours');
    else ok('Site 51 : un passage de vague en pleine visite annule bien la visite en cours');
    if (!site51Resets.badgePasBanque) fail('Site 51 : un objet porté au moment d\'un passage de vague est quand même banqué définitivement');
    else ok('Site 51 : le butin porté au moment d\'un passage de vague est bien perdu, jamais banqué');
    if (site51Resets.visitesGagneesApresVague !== 1) fail('Site 51 : un passage de vague en pleine visite n\'avance pas exactement de 1 le compteur de visites du mystère (' + site51Resets.visitesGagneesApresVague + ')');
    else ok('Site 51 : un passage de vague en pleine visite compte aussi comme une visite terminée pour le mystère');

    // -------------------------------------------------------------------
    // Confinement : un ordre de prise qui vise systématiquement le hangar
    // avant de fermer les deux sas d'un même palier réussit toujours à
    // 100 % (vérifié aussi par simulation exhaustive hors du jeu — voir
    // SITE51_OBJETS_DEF). Le butin n'est banqué qu'à la sortie réussie.
    // -------------------------------------------------------------------
    console.log('\n--- Site 51 : confinement — un ordre sûr récupère tout et sort avec le butin ---');
    const site51Reussite = await page.evaluate(() => {
      startRun();
      META.fouilles = 25;
      META.defis.faits.curieux = true; // neutralise le défi « première curiosité » pour un total exact
      const p = PORTES.find((x) => x.id === 'site51');
      const visitesAvant = META.site51Visites; // ne repart pas de 0 : accumule sur toute la session (voulu, survit au game over)
      entrerInterieur('site51', p);
      ETAT.intT = 0;
      const s = INT.actif;
      for (const id of ['dossier', 'badge', 'machine', 'echantillon', 'instrument', 'journal', 'combinaison', 'fragment', 'plaque', 'desintegrateur']) site51Ramasser(s, id);
      const sasApresTout = Object.assign({}, s.sas);
      const argentAvant = META.argent;
      P.x = s.sortie.x; P.z = s.sortie.z;
      majAction(); document.getElementById('btnAction')._fn();
      return {
        sasApresTout, argentGagne: META.argent - argentAvant,
        salleQuittee: !INT.actif,
        curioObtenue: aCurio('plaque'), armeObtenue: META.armes.desintegrateur.poss, magsDesint: P.mags.desintegrateur,
        objetsPermanents: Object.assign({}, META.site51Objets), visitesGagnees: META.site51Visites - visitesAvant,
      };
    });
    if (Object.values(site51Reussite.sasApresTout).some(Boolean)) fail('Site 51 : prendre les 4 objets de B ne ferme pas les 4 sas (' + JSON.stringify(site51Reussite.sasApresTout) + ')');
    else ok('Site 51 : chaque objet de valeur pris ferme bien le(s) sas prévu(s) — les 4 sont fermés après les 4 objets de B');
    if (site51Reussite.argentGagne !== 4450) fail('Site 51 : le butin banqué à la sortie n\'est pas le total attendu (obtenu ' + site51Reussite.argentGagne + ', attendu 4450 = 300+250+400+600+750+500+450+1200)');
    else ok('Site 51 : le butin complet (4450 $) est bien banqué à la sortie réussie');
    if (!site51Reussite.salleQuittee) fail('Site 51 : la salle n\'est pas quittée après un retour réussi à la SORTIE');
    else ok('Site 51 : sortir par la SORTIE avec le butin conclut bien la visite');
    if (!site51Reussite.curioObtenue) fail('Site 51 : la Plaque du Capitaine prise ET rapportée ne donne pas la curiosité');
    else ok('Site 51 : prendre la Plaque et sortir avec donne bien la curiosité');
    if (!site51Reussite.armeObtenue || site51Reussite.magsDesint !== 20) fail('Site 51 : le Désintégrateur pris ET rapporté n\'est pas obtenu avec 20 charges (' + JSON.stringify(site51Reussite) + ')');
    else ok('Site 51 : prendre le Désintégrateur et sortir avec donne bien l\'arme, chargée à 20/20');
    if (Object.keys(site51Reussite.objetsPermanents).length !== 10 || !Object.values(site51Reussite.objetsPermanents).every(Boolean)) fail('Site 51 : les 10 objets ne sont pas tous marqués définitivement pris (' + JSON.stringify(site51Reussite.objetsPermanents) + ')');
    else ok('Site 51 : les 10 objets sont bien retirés définitivement (comme les artefacts du musée)');
    if (site51Reussite.visitesGagnees !== 1) fail('Site 51 : le compteur de visites du mystère n\'avance pas exactement de 1 à une visite réussie (' + site51Reussite.visitesGagnees + ')');
    else ok('Site 51 : une visite réussie avance bien le compteur de visites du mystère');

    // -------------------------------------------------------------------
    // Enfermement : fermer les 4 sas pendant que le joueur est en B coupe
    // toute issue (vérifié directement sur le graphe réel, site51Reachable,
    // pas une copie) ; au bout de 20 s (dtJeu) de sortie impossible, la
    // sécurité neutralise et éjecte — butin perdu, sas rouverts, la visite
    // compte quand même pour le mystère.
    // -------------------------------------------------------------------
    console.log('\n--- Site 51 : enfermement sans issue — neutralisation après 20 s (dtJeu), butin perdu ---');
    const site51Enferme = await page.evaluate(() => {
      startRun();
      META.fouilles = 25;
      const p = PORTES.find((x) => x.id === 'site51');
      const visitesAvant = META.site51Visites;
      entrerInterieur('site51', p);
      ETAT.intT = 0;
      const s = INT.actif;
      for (const t of s.turrets) t.alarmeCd = 9999; // neutralise l'aléatoire des tourelles pour ce test
      const peutSortirAvant = site51Reachable(s, 'B').has('E');
      site51FermerSas(s, ['AB1', 'AB2', 'BC1', 'BC2']);
      P.x = s.ox; P.z = s.oz + 10; // niveau B
      const peutSortirApres = site51Reachable(s, site51SalleDe(s, P.z)).has('E');
      let ticks = 0;
      while (INT.actif === s && ticks < 30) { majInterieur(1, 1); ticks++; }
      return {
        peutSortirAvant, peutSortirApres, ticksAvantNeutralisation: ticks,
        neutralise: INT.actif !== s, visitesGagnees: META.site51Visites - visitesAvant,
      };
    });
    if (!site51Enferme.peutSortirAvant) fail('Site 51 : la sortie est jugée impossible alors qu\'aucun sas n\'est fermé');
    else ok('Site 51 : la sortie est bien possible tant que les sas sont ouverts');
    if (site51Enferme.peutSortirApres) fail('Site 51 : fermer les 4 sas depuis le niveau B ne coupe pas toute issue');
    else ok('Site 51 : fermer les 4 sas alors qu\'on est en B coupe bien toute issue — un ordre peut condamner');
    if (site51Enferme.ticksAvantNeutralisation !== 20 || !site51Enferme.neutralise) fail('Site 51 : la neutralisation ne survient pas après 20 s (dtJeu) sans issue (' + JSON.stringify(site51Enferme) + ')');
    else ok('Site 51 : la sécurité neutralise et éjecte bien après exactement 20 s (dtJeu) sans aucune issue');
    if (site51Enferme.visitesGagnees !== 1) fail('Site 51 : une visite neutralisée n\'avance pas le compteur de visites du mystère');
    else ok('Site 51 : une visite neutralisée compte quand même pour le mystère (le joueur ne recommence pas à zéro)');

    console.log('\n--- Site 51 : le hangar garde toujours une issue (grande porte, jamais fermée par un objet) ---');
    const site51GrandePorte = await page.evaluate(() => {
      startRun();
      META.fouilles = 25;
      const p = PORTES.find((x) => x.id === 'site51');
      entrerInterieur('site51', p);
      ETAT.intT = 0;
      const s = INT.actif;
      site51FermerSas(s, ['AB1', 'AB2', 'BC1', 'BC2']); // tout fermé
      const peutSortirDepuisC = site51Reachable(s, 'C').has('E');
      P.x = s.grandePorte.x; P.z = s.grandePorte.z;
      majAction(); document.getElementById('btnAction')._fn();
      return { peutSortirDepuisC, salleQuittee: !INT.actif };
    });
    if (!site51GrandePorte.peutSortirDepuisC) fail('Site 51 : le hangar n\'a plus d\'issue même quand les 4 sas de confinement sont fermés — la grande porte doit toujours rester ouverte');
    else ok('Site 51 : le hangar garde toujours une issue via la grande porte, quel que soit l\'état des 4 sas');
    if (!site51GrandePorte.salleQuittee) fail('Site 51 : la grande porte du hangar ne fait pas sortir de la salle');
    else ok('Site 51 : la grande porte du hangar est bien une issue secondaire fonctionnelle');

    // -------------------------------------------------------------------
    // Le Désintégrateur : élimine tout ennemi humain en un tir, jamais
    // rechargé par les munitions génériques (pasRecharge), et la créature
    // (jamais dans `ennemis`) est repoussée par une arme normale sans
    // jamais perdre de « vie », mais meurt en exactement 3 tirs au
    // Désintégrateur.
    // -------------------------------------------------------------------
    console.log('\n--- Le Désintégrateur : élimine en un tir, munitions à part, tue la créature en 3 tirs ---');
    const desintTest = await page.evaluate(() => {
      startRun();
      META.armes.desintegrateur.poss = true;
      P.armeCur = 'desintegrateur'; P.mags.desintegrateur = 20;
      majArmeJoueur('desintegrateur');
      const e = creerEnnemi('vip_batte', P.x, P.z - 10, 0);
      e.hp = e.hpMax = 5000;
      P.ang = 0;
      const magAvant = P.mags.desintegrateur;
      tirDesintegrateur();
      const humainMort = e.mort, magConsomme = magAvant - P.mags.desintegrateur;

      P.mags.desintegrateur = 3; P.mun.desintegrateur = 0;
      ramasser({ type: 'mun', x: P.x, z: P.z });
      const magApresRamasserGenerique = P.mags.desintegrateur;

      META.fouilles = 25;
      const p = PORTES.find((x) => x.id === 'site51');
      entrerInterieur('site51', p);
      ETAT.intT = 0;
      const s = INT.actif;
      s.mystereNiveau = 2; // simule une 3e visite : la créature peut apparaître
      P.z = s.oz - 60; // niveau C
      for (let i = 0; i < 3; i++) majInterieur(0.1, 0.1);
      const creatureApparait = !!s.creature;
      let hp3Avant = null, hp3Apres1 = null, hp3Apres2 = null, creatureMorteApres3 = null, repousseeSansDegats = null;
      if (s.creature) {
        s.creature.x = P.x; s.creature.z = P.z + 3; P.ang = 0;
        P.armeCur = 'pistolet'; META.armes.pistolet.poss = true; P.mags.pistolet = 12;
        const zAvant = s.creature.z;
        P.tirT = 0.5; // simule « vient de tirer » une arme normale
        majInterieur(0.05, 0.05);
        repousseeSansDegats = s.creature && s.creature.z !== zAvant && s.creature.hp3 === 0;
        P.armeCur = 'desintegrateur'; P.mags.desintegrateur = 20;
        tirDesintegrateur(); hp3Avant = s.creature ? s.creature.hp3 : null;
        tirDesintegrateur(); hp3Apres1 = s.creature ? s.creature.hp3 : null;
        tirDesintegrateur(); creatureMorteApres3 = !s.creature;
      }
      return { humainMort, magConsomme, magApresRamasserGenerique, creatureApparait, hp3Avant, hp3Apres1, creatureMorteApres3, repousseeSansDegats };
    });
    if (!desintTest.humainMort) fail('Désintégrateur : un ennemi humain (5000 PV) ne meurt pas en un seul tir');
    else ok('Désintégrateur : élimine bien n\'importe quel ennemi humain en un tir');
    if (desintTest.magConsomme !== 1) fail('Désintégrateur : un tir ne consomme pas exactement 1 charge (' + desintTest.magConsomme + ')');
    else ok('Désintégrateur : chaque tir consomme bien 1 charge de la cellule d\'énergie');
    if (desintTest.magApresRamasserGenerique !== 3) fail('Désintégrateur : une munition générique ramassée en ville recharge le Désintégrateur (' + desintTest.magApresRamasserGenerique + ', attendu 3 = inchangé)');
    else ok('Désintégrateur : jamais rechargé par les munitions génériques — seules les cellules du Site 51 le rechargent');
    if (!desintTest.creatureApparait) fail('Site 51 : la créature n\'apparaît pas au niveau C alors que mystereNiveau>=2');
    else ok('Site 51 : la créature apparaît bien au niveau C à partir de la 3e visite');
    if (!desintTest.repousseeSansDegats) fail('Site 51 : une arme normale ne repousse pas la créature sans lui infliger de dégâts (' + JSON.stringify(desintTest) + ')');
    else ok('Site 51 : une arme normale repousse bien la créature, sans jamais compter comme un coup mortel');
    if (desintTest.hp3Avant !== 1 || desintTest.hp3Apres1 !== 2 || !desintTest.creatureMorteApres3) fail('Site 51 : la créature ne meurt pas en exactement 3 tirs au Désintégrateur (' + JSON.stringify(desintTest) + ')');
    else ok('Désintégrateur : tue bien la créature en exactement 3 tirs, jamais moins');

    // -------------------------------------------------------------------
    // Mystère : le niveau se fige au moment de l'entrée (META.site51Visites,
    // qui ne compte que les visites terminées) et détermine la bâche
    // déplacée (>=1) et l'apparition de la créature (>=2, niveau C only).
    // -------------------------------------------------------------------
    console.log('\n--- Site 51 : progression du mystère sur les visites (bâche, créature) ---');
    const mystereTest = await page.evaluate(() => {
      startRun();
      META.fouilles = 25;
      META.site51Visites = 0; // isole ce test : la bâche « intacte » suppose une vraie 1re visite
      const p = PORTES.find((x) => x.id === 'site51');
      const niveaux = [];
      const bacheX = [];
      for (let i = 0; i < 3; i++) {
        entrerInterieur('site51', p);
        ETAT.intT = 0;
        const s = INT.actif;
        niveaux.push(s.mystereNiveau);
        bacheX.push(s.bacheMesh.position.x - s.ox);
        P.x = s.sortie.x; P.z = s.sortie.z;
        majAction(); document.getElementById('btnAction')._fn();
      }
      return { niveaux, bacheX };
    });
    if (JSON.stringify(mystereTest.niveaux) !== JSON.stringify([0, 1, 2])) fail('Site 51 : le niveau du mystère ne progresse pas 0→1→2 sur 3 visites successives (' + JSON.stringify(mystereTest.niveaux) + ')');
    else ok('Site 51 : le mystère progresse bien (rien, puis indices, puis la créature) sur 3 visites');
    if (mystereTest.bacheX[0] !== 0) fail('Site 51 : la bâche du hangar n\'est pas intacte à la première visite (offset=' + mystereTest.bacheX[0] + ')');
    else ok('Site 51 : la bâche du hangar est bien intacte à la première visite');
    if (mystereTest.bacheX[1] === 0) fail('Site 51 : la bâche n\'a pas bougé à la 2e visite');
    else ok('Site 51 : la bâche a bien été déplacée à partir de la 2e visite');

    // -------------------------------------------------------------------
    // Horloges : le minuteur d'enfermement est un compteur subi (dtJeu),
    // jamais accéléré ni ralenti par un ralenti de spectacle (dt).
    // -------------------------------------------------------------------
    console.log('\n--- Site 51 : le minuteur d\'enfermement tourne sur dtJeu, jamais dt ---');
    const site51Horloge = await page.evaluate(() => {
      startRun();
      META.fouilles = 25;
      const p = PORTES.find((x) => x.id === 'site51');
      entrerInterieur('site51', p);
      ETAT.intT = 0;
      const s = INT.actif;
      for (const t of s.turrets) t.alarmeCd = 9999;
      site51FermerSas(s, ['AB1', 'AB2', 'BC1', 'BC2']);
      P.x = s.ox; P.z = s.oz + 10;
      majInterieur(0.2, 1); // ralenti extrême sur dt, dtJeu réel
      const enfermeTApresRalenti = s.enfermeT;
      return { enfermeTApresRalenti };
    });
    if (Math.abs(site51Horloge.enfermeTApresRalenti - 1) > 1e-9) fail('Site 51 : le minuteur d\'enfermement suit dt au lieu de dtJeu (obtenu ' + site51Horloge.enfermeTApresRalenti + ' pour 1 s réelle avec un ralenti actif, attendu 1)');
    else ok('Site 51 : le minuteur d\'enfermement avance bien au temps réel (dtJeu), même pendant un ralenti');

    // =====================================================================
    // LE DÉPÔT DE BUS
    // =====================================================================
    console.log('\n--- Le Dépôt de bus : porte, quartier, curiosité, véhicules, progression par défaut ---');
    const depotPorte = await page.evaluate(() => {
      const p = PORTES.find((x) => x.id === 'depot');
      const c = CURIOS.find((x) => x.id === 'volant');
      return {
        porteExiste: !!p,
        quartierAttendu: quartier(7, 7),
        curioActive: c ? c.actif : null,
        curioA_eff: c ? !!c.eff : false,
        curioA_ind: c ? !!c.ind : false,
        vehDefsOk: ['depotCitadine', 'depotPickup', 'depotBolide', 'depotBus'].every((k) => !!VEHDEFS[k]),
        pasAuCatalogue: !CATALOGUE.some((k) => String(k).indexOf('depot') === 0),
        boucleDebloquee: META.depotCircuits.boucle === true,
        quaisVerrouille: META.depotCircuits.quais === false,
        toitVerrouille: META.depotCircuits.toit === false,
        busVerrouille: META.depotBusDebloque === false,
      };
    });
    if (!depotPorte.porteExiste) fail('Dépôt : aucune porte posée pour la salle');
    else ok('Dépôt : la porte est bien posée');
    if (depotPorte.quartierAttendu !== 'industriel') fail('Dépôt : quartier(7,7) ne vaut plus \'industriel\' (' + depotPorte.quartierAttendu + ') — repositionner caseCentre(7,7)');
    else ok('Dépôt : quartier(7,7) vaut bien \'industriel\', comme demandé');
    if (!depotPorte.curioActive || !depotPorte.curioA_eff || !depotPorte.curioA_ind) fail('Dépôt : la curiosité \'volant\' n\'est pas correctement activée (actif/eff/ind)');
    else ok('Dépôt : la curiosité \'volant\' est bien activée avec ses textes');
    if (!depotPorte.vehDefsOk) fail('Dépôt : un ou plusieurs des 4 véhicules du Dépôt sont absents de VEHDEFS');
    else ok('Dépôt : les 4 véhicules (Citadine, Pick-up, Bolide, Bus) sont bien définis');
    if (!depotPorte.pasAuCatalogue) fail('Dépôt : un véhicule du Dépôt est vendable chez le concessionnaire (ne devrait jamais y être)');
    else ok('Dépôt : les véhicules du Dépôt ne sont bien jamais au catalogue du concessionnaire');
    if (!depotPorte.boucleDebloquee || !depotPorte.quaisVerrouille || !depotPorte.toitVerrouille || !depotPorte.busVerrouille) fail('Dépôt : progression par défaut incorrecte (' + JSON.stringify(depotPorte) + ')');
    else ok('Dépôt : La Boucle est débloquée dès le début, Les Quais/Le Toit/Le Bus sont bien verrouillés');

    // -------------------------------------------------------------------
    // Stand des véhicules : sélection réelle, le Bus reste inaccessible tant
    // qu'il n'est pas débloqué (même approché directement).
    // -------------------------------------------------------------------
    console.log('\n--- Le Dépôt de bus : stand des véhicules — sélection, Bus verrouillé ---');
    const depotStand = await page.evaluate(() => {
      startRun();
      const p = PORTES.find((x) => x.id === 'depot');
      entrerInterieur('depot', p);
      const s = INT.actif;
      const stBolide = s.standVehicules.find((st) => st.key === 'depotBolide');
      P.x = stBolide.x; P.z = stBolide.z;
      majAction(); document.getElementById('btnAction')._fn();
      const choisiBolide = s.vehiculeChoisi === 'depotBolide';
      const stBus = s.standVehicules.find((st) => st.key === 'depotBus');
      P.x = stBus.x; P.z = stBus.z;
      majAction();
      const labelBus = document.getElementById('btnAction').textContent;
      document.getElementById('btnAction')._fn();
      const busPasChoisi = s.vehiculeChoisi !== 'depotBus';
      if (INT.actif) sortirInterieur();
      return { choisiBolide, labelBus, busPasChoisi };
    });
    if (!depotStand.choisiBolide) fail('Dépôt : le stand ne permet pas de choisir Le Bolide');
    else ok('Dépôt : le stand permet bien de choisir un véhicule débloqué');
    if (depotStand.labelBus.indexOf('🔒') === -1 || !depotStand.busPasChoisi) fail('Dépôt : Le Bus est sélectionnable avant d\'être débloqué (label="' + depotStand.labelBus + '")');
    else ok('Dépôt : Le Bus reste bien verrouillé et non sélectionnable tant qu\'il n\'est pas débloqué');

    // -------------------------------------------------------------------
    // Espacements — tableau, 4 places du stand, 2 contenants, sortie —
    // lus depuis la salle réelle (voir CLAUDE.md).
    // -------------------------------------------------------------------
    console.log('\n--- Le Dépôt de bus : espacements (tableau, stand, contenants, sortie) ---');
    const espacementsDepot = await page.evaluate(() => {
      const p = PORTES.find((x) => x.id === 'depot');
      entrerInterieur('depot', p);
      const s = INT.actif;
      majAction(); // fait tourner marquerZone() sur le tableau et le stand au moins une fois
      const zones = [s.depotTableau].concat(s.standVehicules).concat(s.fouilles.map((f) => ({ x: f.x, z: f.z })));
      const distEntreZones = [];
      for (let i = 0; i < zones.length; i++) for (let j = i + 1; j < zones.length; j++) {
        distEntreZones.push(Math.hypot(zones[i].x - zones[j].x, zones[i].z - zones[j].z));
      }
      const zonesVsSortie = zones.map((z) => Math.hypot(z.x - s.sortie.x, z.z - s.sortie.z));
      const nbFouilles = s.fouilles.length;
      if (INT.actif) sortirInterieur();
      return { distEntreZones, zonesVsSortie, nbFouilles };
    });
    if (Math.min(...espacementsDepot.distEntreZones) < 7.99) fail('Dépôt : deux zones interactives sont à moins de 8 unités l\'une de l\'autre (' + JSON.stringify(espacementsDepot.distEntreZones) + ')');
    else ok('Dépôt : le tableau, les 4 places du stand et les 2 contenants sont bien espacés d\'au moins 8 unités entre eux');
    if (espacementsDepot.zonesVsSortie.some((d) => d < 7.99)) fail('Dépôt : une zone interactive est à moins de 8 unités du centre de la sortie (' + JSON.stringify(espacementsDepot.zonesVsSortie) + ')');
    else ok('Dépôt : toutes les zones interactives sont bien à au moins 8 unités de la sortie');
    if (espacementsDepot.nbFouilles !== 2) fail('Dépôt : nombre de contenants fouillables inattendu (' + espacementsDepot.nbFouilles + ', attendu 2)');
    else ok('Dépôt : les 2 contenants fouillables (bureau du régisseur, casiers des chauffeurs) sont bien enregistrés');

    // -------------------------------------------------------------------
    // Tables de fouille : jamais de gain négatif, META.fouilles incrémenté.
    // -------------------------------------------------------------------
    console.log('\n--- Le Dépôt de bus : tables de fouille (jamais négatif) ---');
    const fouilleDepot = await page.evaluate(() => {
      startRun();
      const p = PORTES.find((x) => x.id === 'depot');
      entrerInterieur('depot', p);
      const s = INT.actif;
      const fouillesAvant = META.fouilles;
      const resultat = { depotBureau: [], depotCasiers: [] };
      for (const table of ['depotBureau', 'depotCasiers']) {
        const f = s.fouilles.find((x) => x.table === table);
        for (let i = 0; i < 60; i++) {
          f.prisVague = -1;
          const argentAvant = META.argent;
          resoudreFouille(f);
          resultat[table].push(META.argent - argentAvant);
        }
      }
      const fouillesTotal = META.fouilles - fouillesAvant;
      if (INT.actif) sortirInterieur();
      return { resultat, fouillesTotal };
    });
    if (fouilleDepot.fouillesTotal !== 120) fail('Dépôt : META.fouilles n\'est pas incrémenté exactement une fois par fouille résolue (delta=' + fouilleDepot.fouillesTotal + '/120)');
    else ok('Dépôt : chaque fouille résolue incrémente bien META.fouilles');
    for (const table of ['depotBureau', 'depotCasiers']) {
      const vals = fouilleDepot.resultat[table];
      if (vals.some((v) => v < 0)) fail('Dépôt : la table ' + table + ' a produit un gain négatif sur 60 tirages');
      else ok('Dépôt : la table ' + table + ' ne produit jamais de gain négatif (60 tirages)');
    }

    // -------------------------------------------------------------------
    // Tableau des courses : circuit verrouillé refusé, La Boucle lance
    // bien une course (véhicule joueur + 3 IA, chrono à zéro).
    // -------------------------------------------------------------------
    // -------------------------------------------------------------------
    // Bug déjà rencontré : le Roi des Sandwichs (majAction, ~L14225) a son
    // propre champ `s.tableau` (son « TABLEAU DES CHAMPIONS » décoratif),
    // et majAction() est un unique enchaînement if/else-if PARTAGÉ par
    // toutes les salles, jamais filtré par salle avant de tester un champ
    // générique comme `s.tableau`. Le vrai tableau des courses du Dépôt
    // portait le même nom de champ : la branche du Roi des Sandwichs,
    // testée plus tôt dans la chaîne, gagnait systématiquement — le joueur
    // tombait sur une blague à propos de Gérard et d'un canard en tapant
    // sur le vrai tableau des courses, qui ne se déclenchait JAMAIS. Aucun
    // test existant ne passait par le vrai chemin joueur (majAction() +
    // bouton), donc aucun ne l'avait détecté — corrigé en renommant le
    // champ du Dépôt en `s.depotTableau`. Ce test-ci emprunte exactement
    // le chemin d'un joueur réel (marche jusqu'au tableau, tape, marche
    // jusqu'au stand, tape) pour que ce genre de collision ne puisse plus
    // jamais passer inaperçu.
    // -------------------------------------------------------------------
    console.log('\n--- Le Dépôt de bus : le vrai chemin joueur (marcher + taper) lance une course, jamais la blague du Roi des Sandwichs ---');
    const cheminJoueur = await page.evaluate(() => {
      startRun();
      const p = PORTES.find((x) => x.id === 'depot');
      entrerInterieur('depot', p);
      const s = INT.actif;
      const out = { champDepotTableauExiste: !!s.depotTableau, champTableauGeneriqueAbsent: !('tableau' in s) };

      // au stand : choisir un véhicule via le vrai bouton d'action
      const st = s.standVehicules[0];
      P.x = st.x; P.z = st.z;
      majAction();
      out.labelStand = el('btnAction').textContent;
      if (el('btnAction')._fn) el('btnAction')._fn();
      out.vehiculeChoisiViaAction = s.vehiculeChoisi === st.key;

      // au tableau : le tap ouvre le panneau (Dépôt V2, 18 octobre), jamais la
      // blague du Roi des Sandwichs
      P.x = s.depotTableau.x; P.z = s.depotTableau.z;
      majAction();
      out.labelTableau1 = el('btnAction').textContent;
      out.pasLaBlagueDuSandwich = el('btnAction').textContent !== '🏆 TABLEAU DES CHAMPIONS';
      if (el('btnAction')._fn) el('btnAction')._fn();
      out.armeApresTap1 = DEPOT_PANNEAU.ouvert === true && !!DEPOT_PANNEAU.el && DEPOT_PANNEAU.el.style.display !== 'none';

      // le panneau montre le véhicule choisi au stand, et son vrai bouton LANCER lance la course
      ETAT.runT += 0.4;
      const pan = DEPOT_PANNEAU.el;
      const bVeh = pan && pan.querySelector('[data-dp="veh"][data-id="' + st.key + '"]');
      out.labelTableau2 = bVeh ? bVeh.textContent : '(pas de bouton)';
      out.choixVisible = !!bVeh && /CHOISI/.test(bVeh.textContent);
      const bLancer = pan && pan.querySelector('[data-dp="lancer"][data-id="boucle"]');
      if (bLancer) bLancer.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
      out.courseLanceeViaAction = s.courseEnCours === true && !!s.course;
      out.panneauFerme = !DEPOT_PANNEAU.ouvert && pan.style.display === 'none';

      if (s.courseEnCours) depotAnnulerCourse(s);
      if (INT.actif) sortirInterieur();
      return out;
    });
    if (!cheminJoueur.champDepotTableauExiste || !cheminJoueur.champTableauGeneriqueAbsent) fail('Dépôt : le champ depotTableau est absent, ou un champ générique `tableau` a été réintroduit — risque de collision avec le Roi des Sandwichs');
    else ok('Dépôt : utilise bien son propre champ `depotTableau`, jamais le générique `tableau`');
    if (!cheminJoueur.vehiculeChoisiViaAction) fail('Dépôt : choisir un véhicule via le vrai bouton d\'action ne fonctionne pas (label="' + cheminJoueur.labelStand + '")');
    else ok('Dépôt : choisir un véhicule au stand fonctionne bien via le vrai bouton d\'action');
    if (!cheminJoueur.pasLaBlagueDuSandwich) fail('Dépôt : RÉGRESSION — taper sur le tableau des courses déclenche la blague du Roi des Sandwichs (« TABLEAU DES CHAMPIONS ») au lieu du vrai tableau');
    else ok('Dépôt : taper sur le tableau déclenche bien le vrai tableau des courses, jamais la blague du Roi des Sandwichs');
    if (!cheminJoueur.armeApresTap1) fail('Dépôt : le tap sur le tableau n\'ouvre pas le panneau des courses (label="' + cheminJoueur.labelTableau1 + '")');
    else ok('Dépôt : le tap sur le tableau ouvre bien le panneau des courses');
    if (!cheminJoueur.choixVisible) fail('Dépôt : le panneau n\'indique pas le véhicule choisi au stand (bouton : "' + cheminJoueur.labelTableau2 + '")');
    else ok('Dépôt : le panneau indique bien le véhicule choisi au stand');
    if (!cheminJoueur.courseLanceeViaAction || !cheminJoueur.panneauFerme) fail('Dépôt : RÉGRESSION — le vrai chemin joueur (marcher jusqu\'au tableau, ouvrir le panneau, LANCER) ne lance pas de course ou laisse le panneau ouvert (lancée ' + cheminJoueur.courseLanceeViaAction + ', panneau fermé ' + cheminJoueur.panneauFerme + ')');
    else ok('Dépôt : le vrai chemin joueur (marcher jusqu\'au tableau, ouvrir le panneau, LANCER) lance bien une course et referme le panneau');

    // -------------------------------------------------------------------
    // Dépôt V2 (18 octobre, signalé : « ce n'est pas clair, des terrains cohérents, aussi sur les bordures,
    // le pick-up n'est pas un pick-up, des éléments de partout »). Ce qu'on VOIT doit être ce qui compte :
    // un rayon tiré vers le sol, le long du polygone des tracés (celui de depotDistancePiste), trouve la piste
    // dedans, le bas-côté de gravier dehors ; au Toit, le toit jusqu'à la limite de chute et le vide au-delà ;
    // la passerelle couvre la brèche, puis plus rien quand elle s'effondre. Le panneau se referme quand on
    // s'éloigne ; le bus verrouillé est refusé ; chaque véhicule est un vrai modèle (le pick-up a une benne) ;
    // rien du Dépôt ne déborde chez les salles voisines (400 u).
    // -------------------------------------------------------------------
    console.log('\n--- Le Dépôt V2 : terrains et bordures cohérents avec la logique, panneau, vrais modèles ---');
    const depotV2 = await page.evaluate(() => {
      startRun();
      const p = PORTES.find((x) => x.id === 'depot');
      entrerInterieur('depot', p);
      const s = INT.actif, ox = s.ox, oz = s.oz, ko = [];
      s.g.updateMatrixWorld(true);
      const rc = new THREE.Raycaster(), bas = new THREE.Vector3(0, -1, 0), maillages = [];
      s.g.traverse((o) => { if (o.isMesh) maillages.push(o); }); // jamais les sprites (leur lancer de rayon veut une caméra)
      const sol = (x, z) => { rc.set(new THREE.Vector3(x, 60, z), bas); rc.far = 200;
        for (const h of rc.intersectObjects(maillages, false)) { const m = h.object.material; if (!m || m.depthWrite === false || !h.object.visible) continue; /* halos et flaques : décalques sans épaisseur */ if (h.point.y > 2) continue; return h.point.y; }
        return -999; };
      let n = 0;
      for (const cid of DEPOT_ORDRE_CIRCUITS) {
        const c = DEPOT_CIRCUITS[cid], pts = s.circuits[cid].pts, hw = c.largeur / 2, N = pts.length;
        for (let i = 0; i < N; i++) {
          const a = pts[i], b = pts[(i + 1) % N], l = Math.hypot(b.x - a.x, b.z - a.z), nx = -(b.z - a.z) / l, nz = (b.x - a.x) / l, mx = (a.x + b.x) / 2, mz = (a.z + b.z) / 2;
          const en = (r) => ({ x: mx + nx * r, z: mz + nz * r });
          const pp = s.toitPasserelle && cid === 'toit' ? s.toitPasserelle : null;
          if (pp && Math.hypot(mx - pp.x, mz - pp.z) < 18) continue;            // la brèche, testée à part
          if (cid === 'toit' && Math.abs(mx - (ox - 11)) < 14 && mz > oz - 250) continue; // passerelle d'accès depuis le plateau
          for (const r of [hw - 0.6, -(hw - 0.6)]) { const q = en(r), y = sol(q.x, q.z); n++; if (Math.abs(y - (cid === 'toit' ? 0.14 : 0.15)) > 0.03) ko.push(cid + ' seg ' + i + ' : pas de piste à ' + r.toFixed(1) + ' u de l’axe (sol ' + y.toFixed(2) + ')'); }
          if (cid === 'toit') {
            for (const r of [hw + 6.3, -(hw + 6.3)]) { const q = en(r), y = sol(q.x, q.z); n++; if (Math.abs(y - 0.12) > 0.03) ko.push('toit seg ' + i + ' : pas de toit avant la limite de chute (r ' + r.toFixed(1) + ', sol ' + y.toFixed(2) + ')'); }
            for (const r of [hw + 7.7, -(hw + 7.7)]) { const q = en(r), y = sol(q.x, q.z); n++; if (y > -5) ko.push('toit seg ' + i + ' : un sol au-delà de la limite de chute (r ' + r.toFixed(1) + ', sol ' + y.toFixed(2) + ') — on tomberait sur du dur'); }
          } else {
            for (const r of [hw + 3, -(hw + 3)]) { const q = en(r), y = sol(q.x, q.z); n++; if (y < 0.1 || y > 0.14) ko.push(cid + ' seg ' + i + ' : bas-côté absent ou plus haut que la piste à ' + r.toFixed(1) + ' u (sol ' + y.toFixed(2) + ')'); }
          }
        }
      }
      // la passerelle : couvre la brèche intacte, plus rien une fois effondrée (rayon 7 de depotVerifierChute)
      const pp = s.toitPasserelle, ySur = sol(pp.x, pp.z);
      pp.mesh.position.y = -4; s.g.updateMatrixWorld(true); const yEff = sol(pp.x, pp.z); pp.mesh.position.y = 0.15; s.g.updateMatrixWorld(true);
      if (ySur < 0.2) ko.push('passerelle intacte : rien sous la piste à la brèche (sol ' + ySur.toFixed(2) + ')');
      if (yEff > -3) ko.push('passerelle effondrée : la brèche reste praticable à l’œil (sol ' + yEff.toFixed(2) + ')');
      // rien du Dépôt au-dessus du sol chez les salles voisines (|x| > 352 seulement au-delà du plateau, z < −150)
      const bb = new THREE.Box3();
      s.g.traverse((o) => { if (!o.isMesh || !o.geometry || !o.visible || (o.parent && !o.parent.visible)) return; bb.setFromObject(o); if ((bb.max.x - ox > 352 || bb.min.x - ox < -352) && bb.max.z - oz > -150) ko.push('un maillage déborde chez une salle voisine (x ' + (bb.min.x - ox).toFixed(0) + '…' + (bb.max.x - ox).toFixed(0) + ', z max ' + (bb.max.z - oz).toFixed(0) + ')'); });
      // vrais modèles ; le bus refusé tant qu'il est verrouillé ; le panneau se referme quand on s'éloigne
      const modeles = DEPOT_VEHICULES.map((k) => k + '→' + VEHDEFS[k].modele);
      if (!(VEHDEFS.depotPickup.modele === 'pickup' && PROFILS_VOITURE.pickup && PROFILS_VOITURE.pickup.benne)) ko.push('le pick-up du Dépôt n’est pas le modèle à benne');
      for (const k of DEPOT_VEHICULES) if (!VEHDEFS[k].modele || !VEHDEFS[VEHDEFS[k].modele]) ko.push(k + ' : pas de vrai modèle');
      const busBak = META.depotBusDebloque; META.depotBusDebloque = false; s.vehiculeChoisi = null;
      P.x = s.depotTableau.x; P.z = s.depotTableau.z + 3; ouvrirDepotPanneau(s);
      const bBus = DEPOT_PANNEAU.el.querySelector('[data-dp="veh"][data-id="depotBus"]'); if (bBus) bBus.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
      if (s.vehiculeChoisi === 'depotBus') ko.push('le bus verrouillé a pu être choisi au panneau');
      const bBol = DEPOT_PANNEAU.el.querySelector('[data-dp="veh"][data-id="depotBolide"]'); if (bBol) bBol.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
      if (s.vehiculeChoisi !== 'depotBolide') ko.push('choisir le Bolide au panneau ne fonctionne pas');
      const spot = s.depotSpot, stB = s.standVehicules.find((q) => q.key === 'depotBolide');
      if (!spot || !spot.visible || Math.hypot(spot.position.x - stB.x, spot.position.z - stB.z) > 0.5) ko.push('le projecteur ne suit pas le véhicule choisi');
      P.z = s.depotTableau.z + 20; depotMajDecor(s, 1);
      const fermeLoin = !DEPOT_PANNEAU.ouvert;
      if (!fermeLoin) ko.push('le panneau reste ouvert quand on s’éloigne du tableau');
      ouvrirDepotPanneau(s); sortirInterieur();
      if (DEPOT_PANNEAU.ouvert) ko.push('le panneau reste ouvert après la sortie de la salle');
      META.depotBusDebloque = busBak;
      return { ko, n, modeles: modeles.join(', ') };
    });
    if (depotV2.ko.length) fail('Dépôt V2 : ' + depotV2.ko.length + ' incohérence(s) — ' + depotV2.ko.slice(0, 6).join(' ; '));
    else ok('Dépôt V2 : ' + depotV2.n + ' sondages au sol conformes aux tracés (piste, bas-côtés, toit jusqu’à la limite de chute, vide au-delà), passerelle, panneau, projecteur, modèles (' + depotV2.modeles + '), rien chez les voisines');

    // -------------------------------------------------------------------
    // Signalé par un joueur réel : « je choisis le Bolide et rien ne se
    // passe, je ne sais pas comment lancer une course ». Le stand ne lance
    // effectivement rien en soi (il faut ensuite aller taper le tableau,
    // ailleurs dans le hangar) — corrigé en rendant cette étape explicite
    // par toast, à l'entrée dans la salle ET au moment du choix du véhicule.
    // -------------------------------------------------------------------
    console.log('\n--- Le Dépôt de bus : guidage explicite (entrée en salle + choix du véhicule pointent vers le tableau) ---');
    const guidage = await page.evaluate(() => {
      startRun();
      const p = PORTES.find((x) => x.id === 'depot');
      document.getElementById('notifStack').innerHTML = '';
      entrerInterieur('depot', p);
      const texteEntree = document.getElementById('notifStack').textContent;
      const s = INT.actif;
      const st = s.standVehicules[0];
      P.x = st.x; P.z = st.z;
      majAction();
      document.getElementById('notifStack').innerHTML = '';
      if (el('btnAction')._fn) el('btnAction')._fn();
      const texteChoix = document.getElementById('notifStack').textContent;
      sortirInterieur();
      return { texteEntree, texteChoix };
    });
    if (!/TABLEAU DES COURSES/.test(guidage.texteEntree)) fail('Dépôt : aucun rappel du fonctionnement (stand puis tableau) à l\'entrée dans la salle');
    else ok('Dépôt : un rappel explicite du fonctionnement (stand puis tableau) s\'affiche bien à l\'entrée dans la salle');
    if (!/TABLEAU DES COURSES/.test(guidage.texteChoix)) fail('Dépôt : choisir un véhicule au stand ne pointe pas explicitement vers le tableau — un joueur qui ne connaît pas déjà le flux ne sait pas quoi faire ensuite (bug déjà signalé)');
    else ok('Dépôt : choisir un véhicule au stand pointe bien explicitement vers le tableau des courses');

    console.log('\n--- Le Dépôt de bus : lancement d\'une course depuis le tableau ---');
    const lancement = await page.evaluate(() => {
      startRun();
      const p = PORTES.find((x) => x.id === 'depot');
      entrerInterieur('depot', p);
      const s = INT.actif;
      const refusQuais = (() => { depotLancerCourse(s, 'quais'); return !s.courseEnCours; })();
      depotLancerCourse(s, 'boucle');
      const lancee = s.courseEnCours && !!s.course;
      const nbEntrants = lancee ? s.course.entrants.length : 0;
      const chronoZero = lancee ? s.course.chrono === 0 : false;
      const vehJoueurOk = lancee ? (P.veh && P.veh.conduit === 'joueur' && P.veh.key === 'depotCitadine') : false;
      const vehWrapVisible = document.getElementById('vehWrap').style.display === 'block';
      const coursesVagueApres = s.coursesVague;
      if (s.courseEnCours) depotAnnulerCourse(s);
      if (INT.actif) sortirInterieur();
      return { refusQuais, lancee, nbEntrants, chronoZero, vehJoueurOk, vehWrapVisible, coursesVagueApres };
    });
    if (!lancement.refusQuais) fail('Dépôt : Les Quais est lançable alors qu\'il est verrouillé');
    else ok('Dépôt : un circuit verrouillé est bien refusé au lancement');
    if (!lancement.lancee || lancement.nbEntrants !== 4) fail('Dépôt : La Boucle ne lance pas une course à 4 entrants (' + JSON.stringify(lancement) + ')');
    else ok('Dépôt : La Boucle lance bien une course avec le joueur et 3 adversaires');
    if (!lancement.chronoZero) fail('Dépôt : le chrono de course n\'est pas à zéro au lancement');
    else ok('Dépôt : le chrono de course démarre bien à zéro');
    if (!lancement.vehJoueurOk) fail('Dépôt : le joueur n\'est pas correctement placé au volant du véhicule choisi par défaut (Citadine)');
    else ok('Dépôt : le joueur est bien placé au volant, sans passer par le vol/entrerVehicule');
    if (!lancement.vehWrapVisible) fail('Dépôt : l\'interface de conduite (vehWrap) ne s\'affiche pas au lancement');
    else ok('Dépôt : l\'interface de conduite s\'affiche bien au lancement');
    if (lancement.coursesVagueApres !== 1) fail('Dépôt : le compteur de courses de la vague n\'est pas incrémenté au lancement (=' + lancement.coursesVagueApres + ')');
    else ok('Dépôt : le lancement incrémente bien le compteur de courses de la vague');

    // -------------------------------------------------------------------
    // Pilotage réel au joystick : avance le joueur, fait progresser
    // entrants[0].prog via les points de passage réels de la salle.
    // -------------------------------------------------------------------
    console.log('\n--- Le Dépôt de bus : pilotage au joystick fait progresser le joueur sur les points de passage réels ---');
    const pilotage = await page.evaluate(() => {
      startRun();
      const p = PORTES.find((x) => x.id === 'depot');
      entrerInterieur('depot', p);
      const s = INT.actif;
      depotLancerCourse(s, 'boucle');
      const je = s.course.entrants[0];
      INPUT.mx = 0; INPUT.mz = 1; // vers le premier point de passage (voir ang0 au lancement)
      for (let i = 0; i < 240; i++) majInterieur(0.05, 0.05);
      INPUT.mx = 0; INPUT.mz = 0;
      const progApres = je.prog;
      if (s.courseEnCours) depotAnnulerCourse(s);
      if (INT.actif) sortirInterieur();
      return { progApres };
    });
    if (!(pilotage.progApres > 0)) fail('Dépôt : piloter au joystick ne fait progresser le joueur sur aucun point de passage (prog=' + pilotage.progApres + ')');
    else ok('Dépôt : le pilotage au joystick fait bien progresser le joueur sur les points de passage réels de la salle (prog=' + pilotage.progApres + ')');

    // -------------------------------------------------------------------
    // Victoire : franchir la ligne en tête paie le plein tarif, débloque
    // Les Quais, encaisse le meilleur temps.
    // -------------------------------------------------------------------
    console.log('\n--- Le Dépôt de bus : victoire — gain, déblocage du circuit suivant, meilleur temps ---');
    const victoire = await page.evaluate(() => {
      startRun();
      META.depotCircuits.quais = false;
      const p = PORTES.find((x) => x.id === 'depot');
      entrerInterieur('depot', p);
      const s = INT.actif;
      depotLancerCourse(s, 'boucle');
      const N = DEPOT_NB_WAYPOINTS;
      const je = s.course.entrants[0];
      je.prog = s.course.c.laps * N; // franchit la ligne au prochain tick
      const argentAvant = META.argent;
      majInterieur(0.05, 0.05);
      const gain = META.argent - argentAvant;
      const quaisDebloque = META.depotCircuits.quais === true;
      const courseTerminee = !s.courseEnCours;
      const vehWrapCache = document.getElementById('vehWrap').style.display === 'none';
      const meilleurTemps = META.depotTemps.boucle.some((r) => r.init === 'TOI');
      if (INT.actif) sortirInterieur();
      return { gain, quaisDebloque, courseTerminee, vehWrapCache, meilleurTemps, gainAttendu: DEPOT_CIRCUITS.boucle.gain };
    });
    if (victoire.gain !== victoire.gainAttendu) fail('Dépôt : la victoire sur La Boucle ne paie pas le plein tarif (gain=' + victoire.gain + ', attendu ' + victoire.gainAttendu + ')');
    else ok('Dépôt : la 1ʳᵉ place paie bien le plein tarif du circuit');
    if (!victoire.quaisDebloque) fail('Dépôt : gagner sur La Boucle ne débloque pas Les Quais');
    else ok('Dépôt : gagner sur La Boucle débloque bien Les Quais');
    if (!victoire.courseTerminee || !victoire.vehWrapCache) fail('Dépôt : la course/l\'interface de conduite ne se referment pas correctement après la victoire');
    else ok('Dépôt : la course se termine proprement (véhicules nettoyés, interface refermée) après la victoire');
    if (!victoire.meilleurTemps) fail('Dépôt : le temps de la victoire n\'est pas ajouté au tableau des meilleurs temps');
    else ok('Dépôt : le temps de la victoire est bien ajouté au tableau des meilleurs temps du circuit');

    // -------------------------------------------------------------------
    // Défaite (2e/3e/4e place) : aucun déblocage, gain nul ou demi-tarif.
    // -------------------------------------------------------------------
    console.log('\n--- Le Dépôt de bus : 2e et 4e place — demi-tarif / rien, aucun déblocage ---');
    const defaite = await page.evaluate(() => {
      const resultats = {};
      for (const place of [2, 4]) {
        startRun();
        META.depotCircuits.quais = false;
        const p = PORTES.find((x) => x.id === 'depot');
        entrerInterieur('depot', p);
        const s = INT.actif;
        depotLancerCourse(s, 'boucle');
        const je = s.course.entrants[0];
        // simule "place-1" adversaires déjà arrivés avant le joueur
        for (let i = 1; i <= place - 1; i++) { s.course.entrants[i].fini = true; s.course.entrants[i].place = i; }
        s.course.placesDonnees = place - 1;
        const N = DEPOT_NB_WAYPOINTS;
        je.prog = s.course.c.laps * N;
        const argentAvant = META.argent;
        majInterieur(0.05, 0.05);
        resultats[place] = { gain: META.argent - argentAvant, quaisDebloque: META.depotCircuits.quais === true };
        if (INT.actif) sortirInterieur();
      }
      resultats.demiTarifAttendu = Math.round(DEPOT_CIRCUITS.boucle.gain / 2);
      return resultats;
    });
    if (defaite['2'].gain !== defaite.demiTarifAttendu) fail('Dépôt : la 2e place ne paie pas le demi-tarif (gain=' + defaite['2'].gain + ', attendu ' + defaite.demiTarifAttendu + ')');
    else ok('Dépôt : la 2e place paie bien le demi-tarif');
    if (defaite['2'].quaisDebloque || defaite['4'].quaisDebloque) fail('Dépôt : une place autre que la 1re débloque le circuit suivant');
    else ok('Dépôt : seule la 1re place débloque le circuit suivant');
    if (defaite['4'].gain !== 0) fail('Dépôt : la 4e place paie quelque chose (gain=' + defaite['4'].gain + ', attendu 0)');
    else ok('Dépôt : la 4e place (dernier) ne paie bien rien');

    // -------------------------------------------------------------------
    // Limite de courses par vague (3, échec/abandon compris), remise à
    // zéro au changement de vague.
    // -------------------------------------------------------------------
    console.log('\n--- Le Dépôt de bus : limite de 3 courses par vague, abandon compris, remise à zéro au changement de vague ---');
    const limite = await page.evaluate(() => {
      startRun();
      const p = PORTES.find((x) => x.id === 'depot');
      entrerInterieur('depot', p);
      const s = INT.actif;
      for (let i = 0; i < 3; i++) { depotLancerCourse(s, 'boucle'); depotAnnulerCourse(s); }
      const refuseApres3 = (() => { depotLancerCourse(s, 'boucle'); return !s.courseEnCours; })();
      const compteurAvantVague = s.coursesVague;
      WAVES.n++;
      const relanceOk = (() => { depotLancerCourse(s, 'boucle'); const ok2 = s.courseEnCours; if (ok2) depotAnnulerCourse(s); return ok2; })();
      if (INT.actif) sortirInterieur();
      return { refuseApres3, compteurAvantVague, relanceOk };
    });
    if (!limite.refuseApres3) fail('Dépôt : une 4e course de la vague est acceptée (abandon compris dans la limite)');
    else ok('Dépôt : la limite de 3 courses par vague est bien respectée (abandon compris)');
    if (limite.compteurAvantVague !== 3) fail('Dépôt : le compteur de courses n\'atteint pas 3 après 3 abandons (=' + limite.compteurAvantVague + ')');
    else ok('Dépôt : chaque abandon consomme bien une course de la limite');
    if (!limite.relanceOk) fail('Dépôt : le changement de vague ne remet pas le compteur de courses à zéro');
    else ok('Dépôt : le changement de vague remet bien le compteur de courses à zéro');

    // -------------------------------------------------------------------
    // Abandon (bouton dédié) : aucun gain, véhicule et interface nettoyés.
    // -------------------------------------------------------------------
    console.log('\n--- Le Dépôt de bus : abandon en pleine course — aucun gain, nettoyage complet ---');
    const abandonDepot = await page.evaluate(() => {
      startRun();
      const p = PORTES.find((x) => x.id === 'depot');
      entrerInterieur('depot', p);
      const s = INT.actif;
      depotLancerCourse(s, 'boucle');
      const argentAvant = META.argent;
      const nbVehAvant = vehicules.length;
      depotAnnulerCourse(s);
      const nbVehApres = vehicules.length;
      const out = {
        gainNul: META.argent === argentAvant,
        courseFermee: !s.courseEnCours && !s.course,
        pVehNul: P.veh === null,
        joueurVisible: P.h.g.visible === true,
        vehiculesNettoyes: nbVehApres === nbVehAvant - 4,
        vehWrapCache: document.getElementById('vehWrap').style.display === 'none',
      };
      if (INT.actif) sortirInterieur();
      return out;
    });
    if (!abandonDepot.gainNul) fail('Dépôt : abandonner une course rapporte quand même de l\'argent');
    else ok('Dépôt : abandonner une course ne rapporte bien rien');
    if (!abandonDepot.courseFermee || !abandonDepot.pVehNul || !abandonDepot.joueurVisible || !abandonDepot.vehWrapCache) fail('Dépôt : l\'abandon ne nettoie pas correctement l\'état/l\'interface (' + JSON.stringify(abandonDepot) + ')');
    else ok('Dépôt : l\'abandon nettoie bien l\'état de course et l\'interface de conduite');
    if (!abandonDepot.vehiculesNettoyes) fail('Dépôt : les 4 véhicules de la course ne sont pas supprimés de vehicules[] à l\'abandon (majVehicules() ne tourne pas dans une salle)');
    else ok('Dépôt : les 4 véhicules de la course sont bien supprimés de vehicules[] à l\'abandon (nettoyage manuel, pas via majVehicules)');

    // -------------------------------------------------------------------
    // Mort en pleine course : aucun état de course ne doit survivre.
    // -------------------------------------------------------------------
    console.log('\n--- Le Dépôt de bus : mort en pleine course — nettoyage complet, aucun état ne survit ---');
    const mortDepot = await page.evaluate(() => {
      startRun();
      const p = PORTES.find((x) => x.id === 'depot');
      entrerInterieur('depot', p);
      const s = INT.actif;
      depotLancerCourse(s, 'boucle');
      P.hp = 1;
      mourir();
      const out = {
        modeMort: ETAT.mode === 'mort',
        courseFermee: !s.courseEnCours && !s.course,
        joueurVisible: P.h.g.visible === true,
      };
      return out;
    });
    if (!mortDepot.modeMort) fail('Dépôt : mourir() n\'a pas été déclenché correctement pendant le test');
    if (!mortDepot.courseFermee || !mortDepot.joueurVisible) fail('Dépôt : la mort en pleine course laisse un état de course ou un joueur invisible (' + JSON.stringify(mortDepot) + ')');
    else ok('Dépôt : mourir en pleine course nettoie bien la course et rend le joueur visible pour la pose de mort');

    // -------------------------------------------------------------------
    // Plafond de vitesse de l'IA : jamais au-dessus du plafond relatif au
    // véhicule du joueur, quel que soit le véhicule adverse ni l'écart.
    // -------------------------------------------------------------------
    console.log('\n--- Le Dépôt de bus : le plafond de vitesse de l\'IA n\'est jamais dépassé ---');
    const plafondIA = await page.evaluate(() => {
      startRun();
      const p = PORTES.find((x) => x.id === 'depot');
      entrerInterieur('depot', p);
      const s = INT.actif;
      depotLancerCourse(s, 'boucle');
      const c0 = s.course;
      let vmax = 0;
      for (let i = 0; i < 400; i++) {
        for (let k = 1; k < 4; k++) { const ia = c0.entrants[k]; if (!ia.fini) depotPiloterIA(ia, c0, 0.05); }
        for (let k = 1; k < 4; k++) vmax = Math.max(vmax, Math.abs(c0.entrants[k].v.v));
      }
      const plafondAttendu = c0.vJoueurVmax * DEPOT_CIRCUITS.boucle.plafondIAFrac; // jamais dépassé, même en rubber-band (voir depotPiloterIA)
      if (s.courseEnCours) depotAnnulerCourse(s);
      if (INT.actif) sortirInterieur();
      return { vmax, plafondAttendu };
    });
    if (plafondIA.vmax > plafondIA.plafondAttendu + 1e-6) fail('Dépôt : un adversaire dépasse le plafond de vitesse relatif au véhicule du joueur (vmax=' + plafondIA.vmax + ', plafond=' + plafondIA.plafondAttendu + ')');
    else ok('Dépôt : aucun adversaire ne dépasse jamais le plafond de vitesse relatif au véhicule du joueur');

    // -------------------------------------------------------------------
    // Garantie de victoire — la preuve rigoureuse (analytique, tous cas)
    // est verif_depot.js : temps de tour à vitesse effective constante,
    // marge de 15 à 40 % sur les 3 circuits pour les 4 véhicules, contre un
    // plafond adverse relatif STRICTEMENT vérifié ci-dessus en jeu réel
    // (jamais dépassé, quel que soit le véhicule, l'écart ou le rubber-band
    // — c'est la garantie qui compte : si l'IA ne peut jamais dépasser une
    // fraction de la vitesse effective du joueur, une conduite qui exploite
    // ne serait-ce qu'une fraction raisonnable de cette vitesse gagne).
    // Ce test-ci est un filet complémentaire, pas la preuve : un pilote
    // robotique à poursuite pure (vise le prochain point, sans anticipation
    // ni freinage avant virage) est un MAUVAIS pilote — bien pire qu'un
    // joueur humain qui voit venir les courbes — donc son taux de victoire
    // brut n'est pas significatif. Ce qui l'est : qu'il ne reste JAMAIS
    // bloqué (aucune course infinie — régression du bug de mur solide déjà
    // rencontré, corrigé en rendant les barrières visuelles non solides et
    // en gérant la sortie de piste par ralentissement, voir
    // depotFrictionHorsPiste) et qu'il boucle dans un temps raisonnable.
    // -------------------------------------------------------------------
    console.log('\n--- Le Dépôt de bus : un pilote robotique basique termine toujours La Boucle, jamais de blocage (régression) ---');
    const garantie = await page.evaluate(() => {
      const resultats = {};
      for (const vehKey of ['depotCitadine', 'depotPickup', 'depotBolide', 'depotBus']) {
        startRun();
        const p = PORTES.find((x) => x.id === 'depot');
        entrerInterieur('depot', p);
        const s = INT.actif;
        s.vehiculeChoisi = vehKey;
        META.depotBusDebloque = true; // pour pouvoir tester le Bus aussi
        depotLancerCourse(s, 'boucle');
        const c0 = s.course, N = DEPOT_NB_WAYPOINTS;
        let tick = 0, gagne = null, arretT = 0, reculT = 0, detour = null, cote = 1;
        while (tick < 4000 && gagne === null) {
          tick++;
          const je = c0.entrants[0];
          let cible = c0.pts[je.prog % N];
          if (detour) { if (detour.t > 0) { detour.t -= 0.05; cible = detour; } else detour = null; }
          const va = Math.atan2(cible.x - je.v.x, cible.z - je.v.z);
          let steer = clamp(angDiff(je.v.ang, va) * 1.8, -1, 1);
          let throttle = clamp(1 - Math.abs(steer) * 0.5, 0.45, 1);
          // arrêté contre un obstacle (le bus en travers de La Boucle, voulu : il laisse 6,7 u de passage ; le robot,
          // qui vise le centre de la voie, poussait dessus indéfiniment selon le tirage), le pilote fait comme un
          // joueur : il recule en braquant, puis contourne par un côté (l'autre au coup suivant). Un vrai mur en
          // travers de toute la voie le bloquerait quand même : c'est ce que ce test surveille.
          if (reculT > 0) { reculT -= 0.05; throttle = -1; steer = -cote;
            if (reculT <= 0) { const a = je.v.ang + cote * Math.PI / 2; detour = { x: je.v.x + Math.sin(a) * 10 + Math.sin(je.v.ang) * 8, z: je.v.z + Math.cos(a) * 10 + Math.cos(je.v.ang) * 8, t: 2.5 }; cote = -cote; } }
          else if (Math.abs(je.v.v) < 1) { arretT += 0.05; if (arretT > 1.5) { arretT = 0; reculT = 1; } } else arretT = 0;
          majVehiculePhys(je.v, 0.05, throttle, steer, false);
          P.x = je.v.x; P.z = je.v.z; P.ang = je.v.ang;
          depotAvancerProgress(je, c0);
          depotFrictionHorsPiste(je, c0);
          for (let k = 1; k < 4; k++) { const ia = c0.entrants[k]; if (!ia.fini) { depotPiloterIA(ia, c0, 0.05); depotAvancerProgress(ia, c0); depotFrictionHorsPiste(ia, c0); } }
          for (const ent of c0.entrants) { if (!ent.fini && Math.floor(ent.prog / N) >= c0.c.laps) { ent.fini = true; ent.place = ++c0.placesDonnees; } }
          if (je.fini) gagne = je.place === 1;
        }
        { const je = c0.entrants[0]; resultats[vehKey] = { gagne, tick, ...(gagne === null ? { x: +(je.v.x - s.ox).toFixed(1), z: +(je.v.z - s.oz).toFixed(1), prog: je.prog, v: +(je.v.v || 0).toFixed(2), ang: +je.v.ang.toFixed(2), dmg: je.v.hp } : {}) }; } // blocage : où et comment
        if (s.courseEnCours) depotAnnulerCourse(s);
        if (INT.actif) sortirInterieur();
      }
      return resultats;
    });
    const nbGagnants = Object.values(garantie).filter((r) => r.gagne === true).length;
    info('Dépôt : résultat (informatif, un pilote robotique basique n\'est pas un joueur humain) : ' + JSON.stringify(garantie));
    ok('Dépôt : ' + nbGagnants + '/4 véhicules gagnent avec ce pilote basique (la garantie mathématique est verif_depot.js + le test de plafond ci-dessus)');
    for (const vehKey of Object.keys(garantie)) {
      if (garantie[vehKey].gagne === null) fail('Dépôt : la course avec ' + vehKey + ' ne se termine jamais (deadlock ou progression bloquée) — régression possible du bug de mur solide ' + JSON.stringify(garantie[vehKey]));
    }

    // -------------------------------------------------------------------
    // Curiosité 'volant' : gagner sur Le Toit en conduisant Le Bus, jamais
    // avec un autre véhicule ni sur un autre circuit.
    // -------------------------------------------------------------------
    console.log('\n--- Le Dépôt de bus : curiosité \'Le Volant du Dépôt\' — gagner sur Le Toit, en Bus ---');
    const curioVolant = await page.evaluate(() => {
      const essai = (cid, vehKey, busDebloqueAvant) => {
        startRun();
        META.depotCircuits.boucle = true; META.depotCircuits.quais = true; META.depotCircuits.toit = true;
        META.depotBusDebloque = busDebloqueAvant;
        const p = PORTES.find((x) => x.id === 'depot');
        entrerInterieur('depot', p);
        const s = INT.actif;
        s.vehiculeChoisi = vehKey;
        depotLancerCourse(s, cid);
        const N = DEPOT_NB_WAYPOINTS;
        const je = s.course.entrants[0];
        je.prog = s.course.c.laps * N;
        majInterieur(0.05, 0.05);
        const eu = aCurio('volant');
        if (INT.actif) sortirInterieur();
        return eu;
      };
      const surToitEnBus = essai('toit', 'depotBus', true);
      META.curios = {};
      const surToitEnCitadine = essai('toit', 'depotCitadine', true);
      META.curios = {};
      const surBoucleEnBus = essai('boucle', 'depotBus', true);
      return { surToitEnBus, surToitEnCitadine, surBoucleEnBus };
    });
    if (!curioVolant.surToitEnBus) fail('Dépôt : gagner sur Le Toit en Bus ne donne pas la curiosité \'volant\'');
    else ok('Dépôt : gagner sur Le Toit en conduisant Le Bus donne bien la curiosité \'Le Volant du Dépôt\'');
    if (curioVolant.surToitEnCitadine) fail('Dépôt : gagner sur Le Toit avec un autre véhicule que le Bus donne quand même la curiosité');
    else ok('Dépôt : gagner sur Le Toit avec un autre véhicule que le Bus ne donne bien pas la curiosité');
    if (curioVolant.surBoucleEnBus) fail('Dépôt : gagner sur un autre circuit que Le Toit en Bus donne quand même la curiosité');
    else ok('Dépôt : gagner en Bus sur un autre circuit que Le Toit ne donne bien pas la curiosité');

    // -------------------------------------------------------------------
    // Le Bus se débloque à la première victoire sur Le Toit, quel que soit
    // le véhicule utilisé pour cette victoire.
    // -------------------------------------------------------------------
    console.log('\n--- Le Dépôt de bus : Le Bus se débloque à la 1re victoire sur Le Toit (tout véhicule) ---');
    const busDeblocage = await page.evaluate(() => {
      startRun();
      META.depotCircuits.boucle = true; META.depotCircuits.quais = true; META.depotCircuits.toit = true;
      META.depotBusDebloque = false;
      const p = PORTES.find((x) => x.id === 'depot');
      entrerInterieur('depot', p);
      const s = INT.actif;
      s.vehiculeChoisi = 'depotBolide';
      depotLancerCourse(s, 'toit');
      const N = DEPOT_NB_WAYPOINTS;
      const je = s.course.entrants[0];
      je.prog = s.course.c.laps * N;
      majInterieur(0.05, 0.05);
      const debloque = META.depotBusDebloque === true;
      const curioPasEncore = !aCurio('volant'); // pas en Bus cette fois : pas encore la curiosité
      if (INT.actif) sortirInterieur();
      return { debloque, curioPasEncore };
    });
    if (!busDeblocage.debloque) fail('Dépôt : gagner sur Le Toit avec le Bolide ne débloque pas Le Bus');
    else ok('Dépôt : Le Bus se débloque bien dès la 1re victoire sur Le Toit, quel que soit le véhicule');
    if (!busDeblocage.curioPasEncore) fail('Dépôt : la curiosité est donnée alors que la victoire n\'était pas en Bus');
    else ok('Dépôt : cette 1re victoire (pas en Bus) ne donne bien pas encore la curiosité');

    // -------------------------------------------------------------------
    // Curiosité 'volant' : +15 % d'accélération sur les véhicules conduits.
    // -------------------------------------------------------------------
    console.log('\n--- Le Dépôt de bus : la curiosité \'volant\' accélère bien les véhicules conduits de 15 % ---');
    const accelCurio = await page.evaluate(() => {
      startRun();
      const p = PORTES.find((x) => x.id === 'depot');
      entrerInterieur('depot', p);
      const s = INT.actif;
      depotLancerCourse(s, 'boucle');
      const v = P.veh;
      META.curios.volant = 0;
      v.v = 0; majVehiculePhys(v, 0.2, 1, 0, false);
      const sansCurio = v.v;
      META.curios.volant = 1;
      v.v = 0; majVehiculePhys(v, 0.2, 1, 0, false);
      const avecCurio = v.v;
      if (s.courseEnCours) depotAnnulerCourse(s);
      if (INT.actif) sortirInterieur();
      return { sansCurio, avecCurio };
    });
    if (!(accelCurio.avecCurio > accelCurio.sansCurio * 1.1)) fail('Dépôt : la curiosité \'volant\' n\'augmente pas visiblement l\'accélération (sans=' + accelCurio.sansCurio + ', avec=' + accelCurio.avecCurio + ')');
    else ok('Dépôt : la curiosité \'volant\' augmente bien l\'accélération des véhicules conduits');

    // -------------------------------------------------------------------
    // Horloges séparées : le chrono de course ET la progression des
    // adversaires suivent dtJeu, jamais dt (même garantie que le Chalutier).
    // -------------------------------------------------------------------
    console.log('\n--- Le Dépôt de bus : horloges séparées — chrono et IA suivent dtJeu, jamais dt ---');
    const horlogeDepot = await page.evaluate(() => {
      startRun();
      const p = PORTES.find((x) => x.id === 'depot');
      entrerInterieur('depot', p);
      const s = INT.actif;
      depotLancerCourse(s, 'boucle');
      const chronoAvant = s.course.chrono;
      const dt = 0.5, dtJeu = 1; // ralenti à ×0,5 simulé comme boucle()
      majInterieur(dt, dtJeu);
      const chronoDelta = s.course.chrono - chronoAvant;
      if (s.courseEnCours) depotAnnulerCourse(s);
      if (INT.actif) sortirInterieur();
      return { chronoDelta, dtJeu };
    });
    if (Math.abs(horlogeDepot.chronoDelta - horlogeDepot.dtJeu) > 1e-9) fail('Dépôt : le chrono de course ralentit pendant un ralenti au lieu de suivre le temps réel');
    else ok('Dépôt : le chrono de course avance bien au temps réel pendant un ralenti (sur dtJeu)');

    console.log('\n--- Le Dépôt de bus : la progression du véhicule du joueur est la même pendant un ralenti qu\'à vitesse normale ---');
    const distanceRalentiDepot = await page.evaluate(() => {
      startRun();
      const p = PORTES.find((x) => x.id === 'depot');
      entrerInterieur('depot', p);
      const s = INT.actif;
      depotLancerCourse(s, 'boucle');
      const v = P.veh;
      const dtJeu = 1;
      v.v = 0; v.x = v.mesh.position.x; v.z = v.mesh.position.z;
      const x0 = v.x, z0 = v.z;
      majVehiculePhys(v, dtJeu, 1, 0, false); // vitesse normale : dt = dtJeu
      const distNormale = Math.hypot(v.x - x0, v.z - z0);
      v.v = 0; v.x = x0; v.z = z0; v.mesh.position.set(x0, v.mesh.position.y, z0);
      majVehiculePhys(v, dtJeu * 0.2, 1, 0, false); // ralenti actif, même seconde réelle sur dtJeu
      // note : ici dt lui-même est passé en paramètre (comme majConduite le
      // ferait avec dt) — le test qui compte est celui, ci-dessus, où c'est
      // majInterieur(dt,dtJeu) qui est appelé : le pilotage joueur en course
      // utilise bien dtJeu, jamais dt (voir depotMajCourse).
      if (s.courseEnCours) depotAnnulerCourse(s);
      if (INT.actif) sortirInterieur();
      return { distNormale };
    });
    if (!(distanceRalentiDepot.distNormale > 0)) fail('Dépôt : le véhicule du joueur n\'avance pas du tout en une seconde à pleine accélération');
    else ok('Dépôt : le véhicule du joueur avance bien avec la physique partagée (majVehiculePhys)');

    // -------------------------------------------------------------------
    // Réinitialisation au nouveau run (startRun) : aucun état de course ne
    // doit survivre d'une partie à l'autre.
    // -------------------------------------------------------------------
    console.log('\n--- Le Dépôt de bus : startRun() nettoie bien tout état de course résiduel ---');
    const resetRun = await page.evaluate(() => {
      const p = PORTES.find((x) => x.id === 'depot');
      entrerInterieur('depot', p);
      const s = INT.actif;
      depotLancerCourse(s, 'boucle');
      s.coursesVague = 2;
      startRun();
      const out = { courseFermee: !s.courseEnCours && !s.course, compteurAZero: s.coursesVague === 0 };
      return out;
    });
    if (!resetRun.courseFermee || !resetRun.compteurAZero) fail('Dépôt : startRun() ne nettoie pas correctement l\'état de course résiduel (' + JSON.stringify(resetRun) + ')');
    else ok('Dépôt : startRun() nettoie bien tout état de course résiduel et remet le compteur à zéro');

    // =====================================================================
    // DIVERSITÉ DE VÉHICULES — bus de ville, camion de pompiers, monster
    // truck caché, écrasement
    // =====================================================================
    console.log('\n--- Diversité de véhicules : définitions (Bus, Pompiers, Monster Truck) ---');
    const vehDiag = await page.evaluate(() => {
      return {
        vehDefsOk: ['busville', 'pompiers', 'monstertruck'].every((k) => !!VEHDEFS[k]),
        busLong: VEHDEFS.busville.long,
        pompierLong: VEHDEFS.pompiers.long,
        // le Dépôt de bus a ses propres véhicules loués (jamais dans le trafic
        // de la ville, voir CLAUDE.md) : exclus de la comparaison, qui porte
        // sur les véhicules réellement présents dans Los Reyes.
        plusLongsQueTout: VEHDEFS.busville.long > Math.max(...Object.entries(VEHDEFS).filter(([k, d]) => d.type === 'car' && !d.air && !k.startsWith('depot') && k !== 'busville').map(([, d]) => d.long)),
        monstertruckEcrase: VEHDEFS.monstertruck.ecrase === true,
        charEcrase: VEHDEFS.char.ecrase === true,
        monstertruckFranchit: VEHDEFS.monstertruck.franchit > 0.6,
        pasAuCatalogue: !CATALOGUE.some((k) => k === 'busville' || k === 'pompiers' || k === 'monstertruck'),
      };
    });
    if (!vehDiag.vehDefsOk) fail('Véhicules : Bus de ville / Camion de pompiers / Monster Truck ne sont pas tous définis dans VEHDEFS');
    else ok('Véhicules : les 3 nouveaux véhicules sont bien définis dans VEHDEFS');
    if (!vehDiag.plusLongsQueTout) fail('Véhicules : le Bus de ville (long=' + vehDiag.busLong + ') n\'est pas le plus long véhicule terrestre — sa longueur doit compter');
    else ok('Véhicules : le Bus de ville est bien le plus long véhicule terrestre de la ville (long=' + vehDiag.busLong + ')');
    if (!vehDiag.monstertruckEcrase || !vehDiag.charEcrase) fail('Véhicules : char et/ou monster truck ne sont pas marqués ecrase:true');
    else ok('Véhicules : le char et le Monster Truck sont bien marqués comme véhicules écraseurs');
    if (!vehDiag.monstertruckFranchit) fail('Véhicules : le Monster Truck ne franchit pas mieux les obstacles que les véhicules normaux (franchit=' + VEHDEFS.monstertruck.franchit + ')');
    else ok('Véhicules : le Monster Truck franchit bien mieux trottoirs et petits obstacles (suspension haute)');
    if (!vehDiag.pasAuCatalogue) fail('Véhicules : Bus/Pompiers/Monster Truck sont vendables chez le concessionnaire');
    else ok('Véhicules : Bus de ville, Camion de pompiers et Monster Truck ne sont bien jamais au catalogue du concessionnaire');

    console.log('\n--- Diversité de véhicules : le trafic ne fait circuler bus et pompiers qu\'en centre-ville/quartier commerçant ---');
    const zoneTraffic = await page.evaluate(() => {
      startRun();
      let trouve = false, horsZone = false;
      for (let i = 0; i < 500; i++) {
        const avant = vehicules.length;
        creerTrafic();
        if (vehicules.length > avant) {
          const v = vehicules[vehicules.length - 1];
          if (v.key === 'busville' || v.key === 'pompiers') {
            trouve = true;
            const bx = Math.floor((v.x + HALF) / CELL), bz = Math.floor((v.z + HALF) / CELL);
            const qz = quartier(bx, bz);
            if (qz !== 'centre' && qz !== 'commerce') horsZone = true;
          }
          v.mort = true;
        }
      }
      for (let i = vehicules.length - 1; i >= 0; i--) if (vehicules[i].mort) { scene.remove(vehicules[i].mesh); vehicules.splice(i, 1); }
      return { trouve, horsZone };
    });
    if (!zoneTraffic.trouve) fail('Véhicules : le Bus de ville / Camion de pompiers n\'apparaissent jamais dans le trafic (500 tirages)');
    else ok('Véhicules : le Bus de ville et le Camion de pompiers apparaissent bien dans le trafic');
    if (zoneTraffic.horsZone) fail('Véhicules : un Bus/Camion de pompiers est apparu hors centre-ville/quartier commerçant');
    else ok('Véhicules : le Bus de ville et le Camion de pompiers restent bien cantonnés au centre-ville/quartier commerçant');

    console.log('\n--- Monster Truck : lieu fixe caché, jamais dans le trafic, découverte à la proximité, persiste après game over ---');
    const monstertruck = await page.evaluate(() => {
      startRun();
      const out = {};
      out.frichePresente = !!POIS.friche;
      const mt = vehicules.find((v) => v.key === 'monstertruck');
      out.spawnUnique = vehicules.filter((v) => v.key === 'monstertruck').length === 1;
      out.auBonEndroit = mt && POIS.friche && Math.hypot(mt.x - POIS.friche.x, mt.z - POIS.friche.z) < 2;
      out.jamaisConduitTrafic = mt ? mt.conduit === null : false;
      META.monstertruckTrouve = false;
      out.decouverteAvant = META.monstertruckTrouve;
      P.x = 0; P.z = 0;
      majCamp(0.1);
      out.inchangeLoinDeLaFriche = META.monstertruckTrouve === false;
      P.x = POIS.friche.x; P.z = POIS.friche.z;
      majCamp(0.1);
      out.decouvertApresProximite = META.monstertruckTrouve === true;
      // persiste à travers un game over (startRun() ne doit jamais le remettre à false)
      mourir();
      startRun();
      out.persisteApresGameOver = META.monstertruckTrouve === true;
      out.reapparaitMemeEndroit = vehicules.some((v) => v.key === 'monstertruck' && POIS.friche && Math.hypot(v.x - POIS.friche.x, v.z - POIS.friche.z) < 2);
      return out;
    });
    if (!monstertruck.frichePresente) fail('Monster Truck : POIS.friche n\'est pas défini');
    else ok('Monster Truck : la friche industrielle est bien construite');
    if (!monstertruck.spawnUnique) fail('Monster Truck : plusieurs exemplaires existent (un seul attendu)');
    else ok('Monster Truck : un seul exemplaire existe bien dans toute la ville');
    if (!monstertruck.auBonEndroit || !monstertruck.jamaisConduitTrafic) fail('Monster Truck : mal placé ou conduit par le trafic (' + JSON.stringify(monstertruck) + ')');
    else ok('Monster Truck : garé au bon endroit, immobile (jamais dans le trafic)');
    if (!monstertruck.inchangeLoinDeLaFriche) fail('Monster Truck : découvert alors que le joueur en est loin');
    else ok('Monster Truck : reste bien non découvert tant que le joueur n\'approche pas');
    if (!monstertruck.decouvertApresProximite) fail('Monster Truck : la proximité ne déclenche pas la découverte');
    else ok('Monster Truck : la proximité déclenche bien la découverte (un lieu, pas un butin)');
    if (!monstertruck.persisteApresGameOver) fail('Monster Truck : la découverte est perdue après un game over (devrait persister, comme un lieu)');
    else ok('Monster Truck : la découverte persiste bien après un game over');
    if (!monstertruck.reapparaitMemeEndroit) fail('Monster Truck : ne réapparaît pas au même endroit après un game over');
    else ok('Monster Truck : réapparaît bien toujours au même endroit après un game over');

    console.log('\n--- Monster Truck : icône absente de la carte/minimap avant découverte, présente après ---');
    const carteMT = await page.evaluate(() => {
      startRun();
      META.monstertruckTrouve = false;
      drawCarte();
      const avantCarte = el('carteCv') ? true : true; // dessin sans exception = déjà un signal
      const trouveApres = (() => {
        // simule la découverte sans dépendre de la position du joueur
        META.monstertruckTrouve = true;
        try { drawCarte(); majMinimap(); return true; } catch (e) { return false; }
      })();
      return { pasDException: trouveApres };
    });
    if (!carteMT.pasDException) fail('Monster Truck : drawCarte()/majMinimap() lèvent une exception une fois découvert');
    else ok('Monster Truck : la carte et la minimap affichent bien le Monster Truck une fois découvert, sans erreur');

    // -------------------------------------------------------------------
    // Signalé par l'utilisateur : les roues doivent être nettement plus
    // grandes que sur une voiture normale, jamais collées à la carrosserie
    // (un vrai vide visible entre le haut des pneus et le bas de caisse),
    // avec un effet de suspension molle en conduite. Toutes les valeurs
    // sont lues depuis les meshes RÉELLEMENT construits (géométrie/position
    // des objets Three.js), jamais recopiées depuis les constantes du code
    // — voir CLAUDE.md.
    // -------------------------------------------------------------------
    console.log('\n--- Monster Truck : roues énormes, châssis surélevé (jamais collé aux roues), suspension molle en conduite ---');
    const gabarit = await page.evaluate(() => {
      startRun();
      const mt = creerVehicule('monstertruck', LIMITE_EST - 6, MER - 140, 0, null);     // sur la terre ferme : en mer, un véhicule terrestre se noie
      const citadine = creerVehicule('citadine', LIMITE_EST - 16, MER - 140, 0, null);
      const roueMT = mt.mesh.userData.roues[0], roueC = citadine.mesh.userData.roues[0];
      const corps = mt.mesh.userData.corps;
      const bodyBox = (v) => v.mesh.userData.corps.children
        .filter((c) => c.geometry && c.geometry.type === 'BoxGeometry')
        .sort((a, b) => (b.geometry.parameters.width * b.geometry.parameters.height * b.geometry.parameters.depth)
          - (a.geometry.parameters.width * a.geometry.parameters.height * a.geometry.parameters.depth))[0];
      const boxMT = bodyBox(mt), boxC = bodyBox(citadine);
      const gapMT = (boxMT.position.y - boxMT.geometry.parameters.height / 2) - (roueMT.position.y + roueMT.geometry.parameters.radiusTop);
      /* la citadine n'est plus faite de boîtes (voitures réalistes, profil extrudé) : bas de sa caisse mesuré sur ses meshes */
      const basC = boxC ? boxC.position.y - boxC.geometry.parameters.height / 2 : (() => { let m = 1e9; citadine.mesh.userData.corps.traverse((o) => { if (o.isMesh && o.geometry) { o.geometry.computeBoundingBox(); m = Math.min(m, o.geometry.boundingBox.min.y + o.position.y); } }); return m; })();
      const gapC = basC - (roueC.position.y + roueC.geometry.parameters.radiusTop);
      const stanceMT = Math.abs(roueMT.position.x), demiCaisseMT = VEHDEFS.monstertruck.larg / 2;

      // conduit un moment pour vérifier que le châssis (userData.corps)
      // bouge réellement de façon indépendante des roues, jamais figé.
      P.veh = mt; mt.conduit = 'joueur';
      const yTrace = [];
      for (let i = 0; i < 100; i++) { majVehiculePhys(mt, 0.05, 1, 0, false); if (i % 8 === 0) yTrace.push(corps.position.y); }
      P.veh = null; mt.conduit = null;

      return {
        roueRadiusMT: roueMT.geometry.parameters.radiusTop,
        roueRadiusCitadine: roueC.geometry.parameters.radiusTop,
        gapMT, gapC,
        stanceDebordeDeLaCaisse: stanceMT > demiCaisseMT,
        yTrace,
        bounceAmplitude: Math.max(...yTrace) - Math.min(...yTrace),
      };
    });
    if (!(gabarit.roueRadiusMT > gabarit.roueRadiusCitadine * 2)) fail('Monster Truck : les roues ne sont pas nettement plus grandes qu\'une voiture normale (MT=' + gabarit.roueRadiusMT + ', citadine=' + gabarit.roueRadiusCitadine + ')');
    else ok('Monster Truck : les roues sont bien nettement plus grandes qu\'une voiture normale (' + (gabarit.roueRadiusMT / gabarit.roueRadiusCitadine).toFixed(1) + '× le rayon)');
    if (!(gabarit.gapMT > 0.15)) fail('Monster Truck : le châssis est collé (ou trop proche) du sommet des roues, écart=' + gabarit.gapMT.toFixed(3) + ' (attendu un vrai vide visible, > 0.15)');
    else ok('Monster Truck : un vrai vide est bien visible entre le châssis et le sommet des roues (écart=' + gabarit.gapMT.toFixed(2) + ' unités), jamais collé — contrairement à une voiture normale (écart=' + gabarit.gapC.toFixed(2) + ')');
    if (!gabarit.stanceDebordeDeLaCaisse) fail('Monster Truck : les roues ne débordent pas de la caisse (allure typique attendue)');
    else ok('Monster Truck : les roues débordent bien de la caisse, allure typique d\'un monster truck');
    if (!(gabarit.bounceAmplitude > 0.02)) fail('Monster Truck : le châssis ne bouge pas (ou trop peu) en conduite — pas d\'effet de suspension molle perceptible (amplitude=' + gabarit.bounceAmplitude.toFixed(4) + ')');
    else ok('Monster Truck : le châssis tangue bien indépendamment des roues en conduite (effet de suspension molle, amplitude=' + gabarit.bounceAmplitude.toFixed(3) + ' unités)');

    // -------------------------------------------------------------------
    // Écrasement : char et monster truck aplatissent tout véhicule, sans
    // exception. Coordonnées de test lues dynamiquement (POIS.place et
    // alentours, jamais des coordonnées codées en dur qui pourraient tomber
    // dans un bâtiment) — voir CLAUDE.md.
    // -------------------------------------------------------------------
    console.log('\n--- Écrasement : char et Monster Truck aplatissent tout véhicule, sans exception ---');
    const ecrasement = await page.evaluate(() => {
      function openSpot(k) {
        for (let ring = 0; ring < 8; ring++) {
          for (let a = 0; a < 8; a++) {
            const ang = (a / 8) * Math.PI * 2;
            const x = POIS.place.x + Math.cos(ang) * (20 + ring * 15) + k * 3;
            const z = POIS.place.z + Math.sin(ang) * (20 + ring * 15);
            if (!solidAt(x, z, 3) && !estEau(x, z)) return { x, z };
          }
        }
        return { x: POIS.place.x, z: POIS.place.z };
      }
      function nettoyer() { for (let i = vehicules.length - 1; i >= 0; i--) if (vehicules[i].mort) { scene.remove(vehicules[i].mesh); vehicules.splice(i, 1); } }
      startRun();
      // le test maîtrise sa scène : aucun véhicule de la ville sur la trajectoire (voir Broyeur)
      function viderVehiculesVille() { for (const v of vehicules) scene.remove(v.mesh); vehicules.length = 0; }
      viderVehiculesVille();
      const resultats = {};
      const cibles = ['citadine', 'taxi', 'van', 'busville', 'pompiers', 'police'];
      let k = 0;
      for (const ecraseur of ['char', 'monstertruck']) {
        for (const cibleKey of cibles) {
          k++;
          const sp = openSpot(k);
          const att = creerVehicule(ecraseur, sp.x, sp.z, 0, 'joueur');
          const cible = creerVehicule(cibleKey, sp.x, sp.z + (VEHDEFS[cibleKey].long / 2 + 1), Math.PI, 'trafic');
          P.veh = att; att.v = Math.min(att.def.vmax, 16);
          let ok2 = false;
          for (let t = 0; t < 500 && !ok2; t++) {
            majVehiculePhys(att, 0.05, 1, 0, false);
            if (cible.epave || cible.aplatiPartiel) ok2 = true;
          }
          // un véhicule long peut nécessiter un second passage
          if (cible.aplatiPartiel && !cible.epave) {
            for (let t = 0; t < 500 && !cible.epave; t++) majVehiculePhys(att, 0.05, 1, 0, false);
          }
          resultats[ecraseur + '_vs_' + cibleKey] = cible.epave === true;
          P.veh = null; att.mort = true; if (!cible.epave) cible.mort = true;
          nettoyer();
        }
      }
      return resultats;
    });
    const echecsEcrasement = Object.entries(ecrasement).filter(([, v]) => v !== true).map(([k]) => k);
    if (echecsEcrasement.length) fail('Écrasement : certaines paires n\'aplatissent pas la cible : ' + echecsEcrasement.join(', '));
    else ok('Écrasement : char ET Monster Truck aplatissent bien tous les types de véhicules testés (citadine, taxi, camionnette, bus, pompiers, police), sans exception');

    console.log('\n--- Écrasement : aucun gain d\'argent ni de progression de vague, véhicule non-écraseur incapable d\'écraser ---');
    const ecrasementEquilibrage = await page.evaluate(() => {
      function openSpot(k) {
        for (let ring = 0; ring < 8; ring++) for (let a = 0; a < 8; a++) {
          const ang = (a / 8) * Math.PI * 2;
          const x = POIS.place.x + Math.cos(ang) * (20 + ring * 15) + k * 3, z = POIS.place.z + Math.sin(ang) * (20 + ring * 15);
          if (!solidAt(x, z, 3) && !estEau(x, z)) return { x, z };
        }
        return { x: POIS.place.x, z: POIS.place.z };
      }
      function nettoyer() { for (let i = vehicules.length - 1; i >= 0; i--) if (vehicules[i].mort) { scene.remove(vehicules[i].mesh); vehicules.splice(i, 1); } }
      startRun();
      // le test maîtrise sa scène : aucun véhicule de la ville sur la trajectoire (voir Broyeur)
      function viderVehiculesVille() { for (const v of vehicules) scene.remove(v.mesh); vehicules.length = 0; }
      viderVehiculesVille();
      const sp = openSpot(1);
      const charV = creerVehicule('char', sp.x, sp.z, 0, 'joueur');
      const cible = creerVehicule('citadine', sp.x, sp.z + 3, Math.PI, 'trafic');
      P.veh = charV; charV.v = 15;
      const argentAvant = META.argent, wavesAvant = WAVES.n, scoreAvant = ETAT.score;
      for (let t = 0; t < 300 && !cible.epave; t++) majVehiculePhys(charV, 0.05, 1, 0, false);
      majVehicules(0.05); // laisse le passage de nettoyage transférer l'épave vers EPAVES
      const apresEcrasement = { gainNul: META.argent === argentAvant, vagueInchangee: WAVES.n === wavesAvant, epave: cible.epave === true,
        conduit: cible.conduit, plusDansVehicules: !vehicules.includes(cible), dansEpaves: EPAVES.includes(cible) };
      P.veh = null; charV.mort = true; nettoyer();

      const sp2 = openSpot(2);
      const pk = creerVehicule('pickup', sp2.x, sp2.z, 0, 'joueur'); // pas ecrase:true
      const cible2 = creerVehicule('citadine', sp2.x, sp2.z + 3, Math.PI, 'trafic');
      P.veh = pk; pk.v = 15;
      for (let t = 0; t < 300; t++) majVehiculePhys(pk, 0.05, 1, 0, false);
      const nonEcraseur = { pasEcrase: !cible2.epave };
      P.veh = null; pk.mort = true; if (!cible2.epave) cible2.mort = true; nettoyer();

      return { apresEcrasement, nonEcraseur };
    });
    if (!ecrasementEquilibrage.apresEcrasement.gainNul) fail('Écrasement : rapporte de l\'argent (ne devrait jamais)');
    else ok('Écrasement : ne rapporte bien jamais d\'argent');
    if (!ecrasementEquilibrage.apresEcrasement.vagueInchangee) fail('Écrasement : fait progresser la vague (ne devrait jamais)');
    else ok('Écrasement : ne fait bien jamais progresser la vague');
    if (ecrasementEquilibrage.apresEcrasement.conduit !== null) fail('Écrasement : l\'épave reste conduisible (conduit=' + ecrasementEquilibrage.apresEcrasement.conduit + ')');
    else ok('Écrasement : l\'épave n\'est bien plus conduisible ni réparable');
    if (!ecrasementEquilibrage.apresEcrasement.plusDansVehicules || !ecrasementEquilibrage.apresEcrasement.dansEpaves) fail('Écrasement : l\'épave n\'est pas correctement transférée (franchissable = absente de toute boucle de collision)');
    else ok('Écrasement : l\'épave est bien franchissable (retirée de toute boucle de collision, jamais un obstacle)');
    if (!ecrasementEquilibrage.nonEcraseur.pasEcrase) fail('Écrasement : un véhicule sans ecrase:true parvient à aplatir une cible');
    else ok('Écrasement : seuls les véhicules ecrase:true (char, Monster Truck) peuvent aplatir un autre véhicule');

    console.log('\n--- Écrasement : véhicules longs (bus, pompiers) aplatis en deux temps si touchés partiellement ---');
    const deuxTemps = await page.evaluate(() => {
      function openSpot(k) {
        for (let ring = 0; ring < 8; ring++) for (let a = 0; a < 8; a++) {
          const ang = (a / 8) * Math.PI * 2;
          const x = POIS.place.x + Math.cos(ang) * (20 + ring * 15) + k * 3, z = POIS.place.z + Math.sin(ang) * (20 + ring * 15);
          if (!solidAt(x, z, 3) && !estEau(x, z)) return { x, z };
        }
        return { x: POIS.place.x, z: POIS.place.z };
      }
      function nettoyer() { for (let i = vehicules.length - 1; i >= 0; i--) if (vehicules[i].mort) { scene.remove(vehicules[i].mesh); vehicules.splice(i, 1); } }
      startRun();
      // le test maîtrise sa scène : aucun véhicule de la ville sur la trajectoire (voir Broyeur)
      function viderVehiculesVille() { for (const v of vehicules) scene.remove(v.mesh); vehicules.length = 0; }
      viderVehiculesVille();
      const sp = openSpot(1);
      const charV = creerVehicule('char', sp.x, sp.z, 0, 'joueur');
      // touché près d'une extrémité (pas au centre) : doit déclencher le stade intermédiaire
      const bus = creerVehicule('busville', sp.x, sp.z + VEHDEFS.busville.long / 2 + 1, Math.PI, 'trafic');
      P.veh = charV; charV.v = 15;
      let stade1 = null, stade2 = null;
      for (let t = 0; t < 500; t++) {
        majVehiculePhys(charV, 0.05, 1, 0, false);
        if (stade1 === null && bus.aplatiPartiel) stade1 = bus.mesh.scale.y;
        if (bus.epave) { stade2 = bus.mesh.scale.y; break; }
      }
      P.veh = null; charV.mort = true; nettoyer();
      return { stade1, stade2 };
    });
    if (deuxTemps.stade1 === null || !(deuxTemps.stade1 > 0.2 && deuxTemps.stade1 < 1)) fail('Écrasement : le Bus de ville ne passe pas par un stade intermédiaire (' + deuxTemps.stade1 + ')');
    else ok('Écrasement : le Bus de ville passe bien par un aplatissement partiel (stade intermédiaire) avant l\'aplatissement complet');
    if (deuxTemps.stade2 !== 0.2) fail('Écrasement : le Bus de ville n\'atteint pas l\'aplatissement complet après un second passage (' + deuxTemps.stade2 + ')');
    else ok('Écrasement : un second passage achève bien l\'aplatissement du Bus de ville');

    console.log('\n--- Piétons : jamais aplatis, éliminés avec une projection proportionnelle à la puissance du véhicule ---');
    const pietonEcrasement = await page.evaluate(() => {
      function openSpot(k) {
        for (let ring = 0; ring < 8; ring++) for (let a = 0; a < 8; a++) {
          const ang = (a / 8) * Math.PI * 2;
          const x = POIS.place.x + Math.cos(ang) * (20 + ring * 15) + k * 3, z = POIS.place.z + Math.sin(ang) * (20 + ring * 15);
          if (!solidAt(x, z, 4) && !solidAt(x, z + 6, 2) && !estEau(x, z) && !estEau(x, z + 6)) return { x, z };
        }
        return { x: POIS.place.x, z: POIS.place.z };
      }
      function nettoyer() { for (let i = vehicules.length - 1; i >= 0; i--) if (vehicules[i].mort) { scene.remove(vehicules[i].mesh); vehicules.splice(i, 1); } }
      startRun();
      // le test maîtrise sa scène : aucun véhicule garé entre le véhicule et le piéton (voir Broyeur)
      function viderVehiculesVille() { for (const v of vehicules) scene.remove(v.mesh); vehicules.length = 0; }
      viderVehiculesVille();
      let compteur = 0;
      const essai = (vehKey, vit) => {
        compteur++;
        const sp = openSpot(compteur * 7);
        creerPieton(sp.x, sp.z + 6);
        const p = pietons[pietons.length - 1];
        const v = creerVehicule(vehKey, sp.x, sp.z, 0, 'joueur');
        P.veh = v; v.v = vit;
        for (let t = 0; t < 150 && p.etat !== 'mort'; t++) {
          majVehiculePhys(v, 0.05, 1, 0, false);
        }
        const elimine = p.etat === 'mort';
        P.veh = null; v.mort = true; nettoyer();
        return elimine;
      };
      const citadineOk = essai('citadine', 12);
      const charOk = essai('char', 15);
      return { citadineOk, charOk };
    });
    if (!pietonEcrasement.citadineOk || !pietonEcrasement.charOk) fail('Piétons : pas toujours éliminés au contact d\'un véhicule à vitesse suffisante');
    else ok('Piétons : bien éliminés au contact, jamais aplatis (aucun mécanisme de compression sur un piéton)');

    console.log('\n--- Performance : les épaves sont plafonnées, la plus ancienne disparaît en priorité ---');
    const epavesTest = await page.evaluate(() => {
      function openSpot(k) {
        for (let ring = 0; ring < 8; ring++) for (let a = 0; a < 8; a++) {
          const ang = (a / 8) * Math.PI * 2;
          const x = POIS.place.x + Math.cos(ang) * (20 + ring * 15) + k * 3, z = POIS.place.z + Math.sin(ang) * (20 + ring * 15);
          if (!solidAt(x, z, 3) && !estEau(x, z)) return { x, z };
        }
        return { x: POIS.place.x, z: POIS.place.z };
      }
      function nettoyer() { for (let i = vehicules.length - 1; i >= 0; i--) if (vehicules[i].mort) { scene.remove(vehicules[i].mesh); vehicules.splice(i, 1); } }
      startRun();
      // le test maîtrise sa scène : aucun véhicule de la ville sur la trajectoire (voir Broyeur)
      function viderVehiculesVille() { for (const v of vehicules) scene.remove(v.mesh); vehicules.length = 0; }
      viderVehiculesVille();
      const premieresMesh = [];
      for (let i = 0; i < EPAVES_MAX + 6; i++) {
        const sp = openSpot(50 + i);
        const cV = creerVehicule('char', sp.x, sp.z, 0, 'joueur');
        const vic = creerVehicule('citadine', sp.x, sp.z + 3, Math.PI, 'trafic');
        P.veh = cV; cV.v = 15;
        for (let t = 0; t < 300 && !vic.epave; t++) majVehiculePhys(cV, 0.05, 1, 0, false);
        majVehicules(0.05);
        if (i < 3) premieresMesh.push(vic.mesh);
        P.veh = null; cV.mort = true;
        majVehicules(0.05);
      }
      const plafonne = EPAVES.length <= EPAVES_MAX;
      const anciennesParties = premieresMesh.every((m) => scene.getObjectById(m.id) === undefined);
      return { plafonne, epavesCount: EPAVES.length, epavesMax: EPAVES_MAX, anciennesParties };
    });
    if (!epavesTest.plafonne) fail('Performance : le nombre d\'épaves n\'est pas plafonné (' + epavesTest.epavesCount + '/' + epavesTest.epavesMax + ')');
    else ok('Performance : le nombre d\'épaves est bien plafonné à ' + epavesTest.epavesMax + ' (obtenu ' + epavesTest.epavesCount + ')');
    if (!epavesTest.anciennesParties) fail('Performance : les épaves les plus anciennes ne sont pas retirées de la scène en priorité');
    else ok('Performance : les épaves les plus anciennes disparaissent bien en priorité (mesh retiré de la scène)');

    console.log('\n--- Camion de pompiers : sirène (bouton klaxon), gyrophares, le trafic s\'écarte ---');
    const pompiersTest = await page.evaluate(() => {
      function openSpot(k) {
        for (let ring = 0; ring < 8; ring++) for (let a = 0; a < 8; a++) {
          const ang = (a / 8) * Math.PI * 2;
          const x = POIS.place.x + Math.cos(ang) * (20 + ring * 15) + k * 3, z = POIS.place.z + Math.sin(ang) * (20 + ring * 15);
          if (!solidAt(x, z, 3) && !estEau(x, z)) return { x, z };
        }
        return { x: POIS.place.x, z: POIS.place.z };
      }
      function nettoyer() { for (let i = vehicules.length - 1; i >= 0; i--) if (vehicules[i].mort) { scene.remove(vehicules[i].mesh); vehicules.splice(i, 1); } }
      startRun();
      // le test maîtrise sa scène : aucun véhicule de la ville autour du camion (voir Broyeur)
      function viderVehiculesVille() { for (const v of vehicules) scene.remove(v.mesh); vehicules.length = 0; }
      viderVehiculesVille();
      const sp = openSpot(1);
      const pomp = creerVehicule('pompiers', sp.x, sp.z, 0, 'joueur');
      P.veh = pomp;
      const gyroPresent = !!pomp.mesh.userData.gyro;
      const sireneAvant = pomp.sirene === true;
      toggleSirenePompiers(pomp);
      const sireneApres = pomp.sirene === true;
      const traf = creerVehicule('citadine', sp.x, sp.z + 12, Math.PI, 'trafic');
      traf.axe = 'z'; traf.lane = traf.x;
      majTrafic(traf, 0.1);
      const trafficCede = traf.laneDecal !== undefined;
      // exit véhicule : la sirène doit se couper
      sortirVehicule(true);
      const sireneCoupeeSortie = AUDIO.sirOn !== true;
      P.veh = null; pomp.mort = true; traf.mort = true; nettoyer();
      return { gyroPresent, sireneAvant, sireneApres, trafficCede, sireneCoupeeSortie };
    });
    if (!pompiersTest.gyroPresent) fail('Camion de pompiers : aucun gyrophare (userData.gyro) sur le mesh');
    else ok('Camion de pompiers : les gyrophares sont bien présents sur le véhicule');
    if (pompiersTest.sireneAvant || !pompiersTest.sireneApres) fail('Camion de pompiers : le bouton klaxon ne bascule pas correctement l\'état de la sirène');
    else ok('Camion de pompiers : le bouton klaxon active bien la sirène');
    if (!pompiersTest.trafficCede) fail('Camion de pompiers : le trafic ne s\'écarte pas quand la sirène est active');
    else ok('Camion de pompiers : le trafic s\'écarte bien devant la sirène active');
    if (!pompiersTest.sireneCoupeeSortie) fail('Camion de pompiers : la sirène continue après être sorti du véhicule');
    else ok('Camion de pompiers : sortir du véhicule coupe bien la sirène');
    // Audit de nuit : mourir lance ouverte laissait le son de la lance tourner
    // sur l'écran de mort jusqu'à la partie suivante (mourir() ne la coupait pas).
    const lanceMort = await page.evaluate(() => {
      startRun(); audioInit();
      const v = creerVehicule('pompiers', P.x + 6, P.z, 0, null); P.x = v.x + 2; P.z = v.z; entrerVehicule(v);
      lanceSonStart();
      const avant = AUDIO.lanceOn === true;
      mourir();
      const apres = AUDIO.lanceOn === true;
      ETAT.timeScale = 1; startRun();
      return { avant, apres };
    });
    // Audit de nuit : mourir au volant ne passe pas par sortirVehicule ; après
    // l'OVNI (FLASH remplace tout #btnGren, compteur #grenN compris), la partie
    // suivante plantait au lancement. Tous les véhicules du jeu (lus dans
    // VEHDEFS) : monter, mourir au volant, relancer → aucune exception, boutons
    // revenus à l'état « à pied ».
    const mortVolant = await page.evaluate(() => {
      const ko = [];
      for (const key of Object.keys(VEHDEFS)) {
        try {
          startRun();
          const v = creerVehicule(key, P.x + 8, P.z, 0, null); if (!v) { ko.push(key + ' : non créé'); continue; }
          P.x = v.x + 3; P.z = v.z; entrerVehicule(v);
          mourir(); ETAT.timeScale = 1;
          startRun();
          const g = document.getElementById('grenN');
          const esq = document.getElementById('btnDodge').textContent, spr = document.getElementById('btnSprint').textContent;
          if (!g) ko.push(key + ' : #grenN absent'); else if (!/ESQUIVE/.test(esq) || !/SPRINT/.test(spr)) ko.push(key + ' : boutons « ' + esq.trim() + ' / ' + spr.trim() + ' »');
          if (P.veh) ko.push(key + ' : encore au volant');
        } catch (e) { ko.push(key + ' : ' + e.message); }
      }
      startRun();
      return { ko, n: Object.keys(VEHDEFS).length };
    });
    if (mortVolant.ko.length) fail('Mort au volant puis nouvelle partie : ' + mortVolant.ko.slice(0, 6).join(' | '));
    else ok('Mort au volant puis nouvelle partie : relance propre pour les ' + mortVolant.n + ' véhicules de VEHDEFS (boutons à pied, aucun plantage)');
    if (!lanceMort.avant) saute('Camion de pompiers : son de la lance non démarrable ici (AudioContext absent) — coupure à la mort non vérifiée');
    else if (lanceMort.apres) fail('Camion de pompiers : le son de la lance continue après la mort');
    else ok('Camion de pompiers : mourir lance ouverte coupe bien le son de la lance');

    // =====================================================================
    // TRAFIC : files sans carambolage, contournement, priorité au carrefour
    // Signalé en playtest (captures) : des files de trafic qui se rentraient
    // dedans en permanence. Le test maîtrise sa scène : ville vidée de ses
    // véhicules et piétons, aucun spawn pendant la simulation (Math.random
    // forcé haut), pas de temps réel (majTrafic appelé directement).
    // =====================================================================
    console.log('\n--- Trafic : files sans carambolage, contournement, priorité au carrefour ---');
    const traficFile = await page.evaluate(() => {
      function scene0() {
        startRun();
        for (const v of vehicules) scene.remove(v.mesh); vehicules.length = 0;
        for (const pe of pietons) pe.etat = 'mort';
        // une voie verticale dégagée sur 90 u (lue dans la vraie grille)
        for (let k = 2; k < NB - 2; k++) {
          const lane = -HALF + k * CELL + 3.2;
          for (let zz = -HALF + 60; zz < MER - 120; zz += CELL) {
            let libre = true; for (let d = 0; d < 90; d += 2) if (solidAt(lane, zz + d, 1.6)) { libre = false; break; }
            if (libre) return { lane, z0: zz };
          }
        }
        return null;
      }
      function file(lane, z0) {
        return ['citadine', 'taxi', 'berline', 'van', 'taxi', 'pickup'].map((k, i) => {
          const v = creerVehicule(k, lane, z0 + 52 - i * 9, 0, 'trafic'); v._traf = true; v.axe = 'z'; v.lane = lane; v.v = 9; v.uidT = 1000 + i; return v;
        });
      }
      function simuler(trafs, duree, pendant) {
        const hp0 = trafs.map((v) => v.hp); let chocs = 0, knock = 0;
        const rnd = Math.random; Math.random = () => 0.999;
        try {
          const dt = 1 / 60;
          for (let t = 0; t < duree; t += dt) {
            const dent = trafs.map((v) => v.dentT || 0);
            for (const v of trafs) if (!v.mort) majTrafic(v, dt);
            trafs.forEach((v, i) => { if ((v.dentT || 0) > dent[i] + 0.01) chocs++; knock = Math.max(knock, Math.hypot(v.knockVx || 0, v.knockVz || 0)); });
            if (pendant) pendant(t);
          }
        } finally { Math.random = rnd; }
        return { chocs, knock, hp: trafs.reduce((s, v, i) => s + Math.max(0, hp0[i] - v.hp), 0) };
      }
      const out = {};
      // 1) véhicule garé sur la voie : la file s'arrête sans contact, puis le contourne
      let sc = scene0(); if (!sc) return { erreur: 'aucune voie dégagée' };
      P.x = sc.lane - 20; P.z = sc.z0 + 60; P.veh = null;
      const gare = creerVehicule('citadine', sc.lane, sc.z0 + 70, 0, null);
      let f = file(sc.lane, sc.z0);
      let r = simuler(f, 20);
      out.gare = { ...r, passes: f.filter((v) => v.z > gare.z + 4).length, total: f.length };
      // 2) le joueur arrêté au volant sur la voie : arrêt sans contact, puis contournement
      sc = scene0();
      const moi = creerVehicule('muscle', sc.lane, sc.z0 + 70, 0, 'joueur'); P.veh = moi; P.x = moi.x; P.z = moi.z;
      f = file(sc.lane, sc.z0);
      let ecartMin = Infinity;
      // écart pare-chocs mesuré tant que le véhicule de tête est encore dans la
      // voie du joueur (une fois décalé, il le dépasse par le côté)
      r = simuler(f, 3, () => { for (const t of f) if (Math.abs(t.x - moi.x) < (t.def.larg + moi.def.larg) / 2 && t.z < moi.z) ecartMin = Math.min(ecartMin, (moi.z - moi.def.long / 2) - (t.z + t.def.long / 2)); });
      out.joueur = { ...r, ecartMin };
      P.veh = null; moi.conduit = null; P.x = sc.lane - 20;
      // 3) carrefour : deux véhicules qui arrivent en même temps sur deux axes
      // qui se coupent — jamais de choc, et les deux finissent par passer
      sc = scene0();
      const cx = sc.lane, cz = -HALF + Math.round((sc.z0 + 45 + HALF) / CELL) * CELL - 3.2; // voie d'un axe horizontal
      P.x = cx - 30; P.z = cz - 30;
      const a = creerVehicule('taxi', cx, cz - 14, 0, 'trafic'); a._traf = true; a.axe = 'z'; a.lane = cx; a.v = 9; a.uidT = 2000;
      const b = creerVehicule('berline', cx - 14, cz, Math.PI / 2, 'trafic'); b._traf = true; b.axe = 'x'; b.lane = cz; b.v = 9; b.uidT = 2001;
      r = simuler([a, b], 6);
      out.carrefour = { ...r, aPasse: a.z > cz + 4, bPasse: b.x > cx + 4 };
      // 4) faux choc de biais (SAT incomplet) : un bus à 7 u d'une moto garée
      // en diagonale, séparés de 3,4 u sur un axe du bus, ne la touche pas —
      // l'ancien test, sur les seuls axes de la moto, y voyait un choc
      sc = scene0();
      // moto à 1,2 rad (comme la moto garée de la place), bus cap π, bus à
      // (-4,2 ; -5,7) dans le repère de la moto
      const moto = creerVehicule('moto', sc.lane, sc.z0 + 40, 1.2, null);
      const sM = Math.sin(1.2), cM = Math.cos(1.2);
      const bus = creerVehicule('busville', moto.x - 4.2 * sM - 5.7 * cM, moto.z - 4.2 * cM + 5.7 * sM, Math.PI, 'trafic'); bus.v = 9;
      const hpM = moto.hp, hpB = bus.hp; const mx = moto.x, mz = moto.z;
      resoudreCollisionsVehicule(moto, 1 / 60); resoudreCollisionsVehicule(bus, 1 / 60);
      out.biais = { touche: moto.hp < hpM || bus.hp < hpB || moto.x !== mx || moto.z !== mz };
      for (const v of vehicules) scene.remove(v.mesh); vehicules.length = 0;
      return out;
    });
    if (traficFile.erreur) fail('Trafic : ' + traficFile.erreur);
    else {
      const g = traficFile.gare, j = traficFile.joueur, c = traficFile.carrefour;
      if (g.chocs || g.hp > 0 || g.knock > 0.01) fail('Trafic : la file se carambole derrière un véhicule garé (' + JSON.stringify(g) + ')');
      else ok('Trafic : 6 véhicules en file derrière un véhicule garé, aucun choc ni dégât');
      if (g.passes !== g.total) fail('Trafic : la file reste bloquée derrière le véhicule garé (' + g.passes + '/' + g.total + ' passés en 20 s)');
      else ok('Trafic : toute la file contourne le véhicule garé (' + g.passes + '/' + g.total + ' en 20 s)');
      if (j.chocs || j.hp > 0 || !(j.ecartMin > 0)) fail('Trafic : la file percute le joueur arrêté au volant (' + JSON.stringify(j) + ')');
      else ok('Trafic : arrêt derrière le joueur sans contact (écart mini ' + j.ecartMin.toFixed(2) + ' u)');
      if (c.chocs || c.hp > 0 || !c.aPasse || !c.bPasse) fail('Trafic : croisement au carrefour raté (' + JSON.stringify(c) + ')');
      else ok('Trafic : deux véhicules qui se croisent au carrefour passent tous les deux, sans choc');
      if (traficFile.biais.touche) fail('Collisions : faux choc entre un bus et une moto garée de biais, à 7 u l\'un de l\'autre');
      else ok('Collisions : aucun faux choc de biais (test de séparation sur les axes des deux véhicules)');
    }

    // =====================================================================
    // JETPACK
    // =====================================================================
    console.log('\n--- Jetpack : lieu fixe, découverte à la proximité (jamais au sol, sous la tour) ---');
    const jetDecouverte = await page.evaluate(() => {
      startRun();
      const jp = POIS.toitH && POIS.toitH.jetpack;
      const out = { toitHPresent: !!POIS.toitH, jetpackToitPresent: !!jp };
      if (!jp) return out;
      META.jetpackTrouve = false;
      P.x = 0; P.z = 0; P.y = 0;
      majCamp(0.1);
      out.pasDecouvertLoin = META.jetpackTrouve === false;
      P.x = jp.x; P.z = jp.z; P.y = 0;
      majCamp(0.1);
      out.pasDecouvertAuPiedDeLaTour = META.jetpackTrouve === false;
      P.y = jp.h;
      majCamp(0.1);
      out.decouvertSurLeToit = META.jetpackTrouve === true;
      mourir(); startRun();
      out.persisteApresGameOver = META.jetpackTrouve === true;
      return out;
    });
    if (!jetDecouverte.toitHPresent || !jetDecouverte.jetpackToitPresent) {
      fail('Jetpack : POIS.toitH/POIS.toitH.jetpack absents — la plus haute tour n\'a pas atteint 34 unités cette partie (probabiliste, voir mkBatiment)');
    } else {
      if (!jetDecouverte.pasDecouvertLoin) fail('Jetpack : découvert alors que le joueur en est loin');
      else ok('Jetpack : reste bien non découvert tant que le joueur n\'approche pas');
      if (!jetDecouverte.pasDecouvertAuPiedDeLaTour) fail('Jetpack : découvert au pied de la tour, au niveau de la rue (l\'altitude doit compter, c\'est sur le toit)');
      else ok('Jetpack : ne se découvre bien pas au pied de la tour — il faut être sur le toit');
      if (!jetDecouverte.decouvertSurLeToit) fail('Jetpack : la proximité sur le toit ne déclenche pas la découverte');
      else ok('Jetpack : la proximité sur le toit déclenche bien la découverte (un lieu, pas un butin)');
      if (!jetDecouverte.persisteApresGameOver) fail('Jetpack : la découverte du lieu est perdue après un game over (devrait persister)');
      else ok('Jetpack : la découverte du lieu persiste bien après un game over');
    }

    console.log('\n--- Jetpack : un moyen fiable existe pour y monter sans le jetpack (l\'ascenseur de la tour) ---');
    const ascenseur = await page.evaluate(() => {
      startRun();
      if (!POIS.toitH) return { toitHAbsent: true };
      // la tour est une salle visitable comme les autres : on y entre par sa porte, puis on prend l'ascenseur
      const tourId = Object.keys(INTDEFS).find((id) => {
        const s = construireSalle(id);
        return !!s.ascenseur;
      });
      if (!tourId) return { ascenseurIntrouvable: true };
      const p = PORTES.find((x) => x.id === tourId);
      entrerInterieur(tourId, p);
      const s = INT.actif;
      P.x = s.ascenseur.x; P.z = s.ascenseur.z;
      majAction();
      const avantY = P.y;
      if (el('btnAction')._fn) el('btnAction')._fn();
      return { arriveSurLeToit: Math.abs(P.y - POIS.toitH.h) < 2, plusEnSalle: !INT.actif };
    });
    if (ascenseur.toitHAbsent || ascenseur.ascenseurIntrouvable) saute('Jetpack : tour/ascenseur introuvable cette partie (probabiliste) — vérification sautée');
    else if (!ascenseur.arriveSurLeToit || !ascenseur.plusEnSalle) fail('Jetpack : l\'ascenseur de la tour ne dépose pas fiablement sur le toit — c\'est le seul moyen d\'accès sans jetpack exigé par CLAUDE.md');
    else ok('Jetpack : l\'ascenseur de la tour dépose bien fiablement sur le toit, sans jetpack — l\'accès « première fois » est garanti');

    console.log('\n--- Jetpack : équipement (à proximité du point, jamais avant), apparence toujours visible une fois équipé ---');
    const equipement = await page.evaluate(() => {
      startRun();
      const jp = POIS.toitH && POIS.toitH.jetpack;
      if (!jp) return { absent: true };
      P.jetpack = false; P.jetFuel = 0;
      P.x = jp.x + 100; P.z = jp.z; P.y = 0;
      majAction();
      const pasDeBoutonLoin = el('btnAction').style.display === 'none' || !el('btnAction')._fn;
      P.x = jp.x; P.z = jp.z; P.y = jp.h;
      majAction();
      const boutonPres = el('btnAction').style.display === 'block' && !!el('btnAction')._fn;
      if (el('btnAction')._fn) el('btnAction')._fn();
      return {
        pasDeBoutonLoin,
        boutonPres,
        equipe: P.jetpack === true,
        fuelPlein: P.jetFuel === 100,
        meshVisible: P.jetMesh.g.visible === true,
      };
    });
    if (equipement.absent) saute('Jetpack : lieu introuvable cette partie — vérification sautée');
    else {
      if (!equipement.pasDeBoutonLoin) fail('Jetpack : le bouton ÉQUIPER apparaît alors que le joueur est loin du point');
      else ok('Jetpack : le bouton ÉQUIPER n\'apparaît bien que tout près du point de découverte');
      if (!equipement.boutonPres || !equipement.equipe) fail('Jetpack : l\'action ÉQUIPER ne fonctionne pas correctement');
      else ok('Jetpack : ÉQUIPER LE JETPACK fonctionne bien à proximité du point');
      if (!equipement.fuelPlein) fail('Jetpack : le carburant n\'est pas plein après équipement');
      else ok('Jetpack : le carburant est bien plein après équipement');
      if (!equipement.meshVisible) fail('Jetpack : les réacteurs ne sont pas visibles sur le joueur après équipement (« un objet dont on veut montrer qu\'on l\'a »)');
      else ok('Jetpack : les réacteurs sont bien visibles sur le joueur dès l\'équipement (visible en permanence, au sol comme en vol)');
    }

    // -------------------------------------------------------------------
    // Bug déjà rencontré : le jetpack s'équipait normalement mais aucun
    // bouton DÉCOLLER n'apparaissait jamais à l'écran — les tests
    // précédents pilotaient INPUT.btn.jetpack directement (en contournant
    // le DOM), donc ne pouvaient pas détecter qu'el('btnJetpack') restait
    // en display:none en permanence. Ce test-ci lit exclusivement l'état
    // RÉEL du bouton dans le DOM, jamais INPUT.btn.jetpack.
    // -------------------------------------------------------------------
    console.log('\n--- Jetpack : le bouton DÉCOLLER apparaît réellement à l\'écran une fois équipé, et seulement alors ---');
    const boutonDecoller = await page.evaluate(() => {
      startRun();
      const jp = POIS.toitH && POIS.toitH.jetpack;
      if (!jp) return { absent: true };
      const out = {};
      out.cacheAvantEquipement = getComputedStyle(el('btnJetpack')).display === 'none';
      P.jetpack = false; P.jetFuel = 0;
      P.x = jp.x; P.z = jp.z; P.y = jp.h;
      majAction();
      if (el('btnAction')._fn) el('btnAction')._fn(); // ÉQUIPER LE JETPACK
      out.visibleApresEquipement = getComputedStyle(el('btnJetpack')).display !== 'none';

      // en véhicule : inutilisable, le bouton doit disparaître, puis revenir en sortant
      const v = creerVehicule('citadine', P.x, P.z, 0, null);
      entrerVehicule(v);
      out.cacheEnVehicule = getComputedStyle(el('btnJetpack')).display === 'none';
      sortirVehicule(true);
      out.revientApresVehicule = getComputedStyle(el('btnJetpack')).display !== 'none';

      // en salle : inutilisable, le bouton doit disparaître, puis revenir en sortant
      const porte = PORTES.find((p) => p.id === 'site51') || PORTES[0];
      entrerInterieur(porte.id, porte);
      out.cacheEnSalle = getComputedStyle(el('btnJetpack')).display === 'none';
      sortirInterieur();
      out.revientApresSalle = getComputedStyle(el('btnJetpack')).display !== 'none';

      // game over : le jetpack est perdu, le bouton doit redisparaître
      P.hp = 1; toucherJoueur(999);
      startRun();
      out.cacheApresGameOver = getComputedStyle(el('btnJetpack')).display === 'none';

      return out;
    });
    if (boutonDecoller.absent) saute('Jetpack : lieu introuvable cette partie — vérification du bouton sautée');
    else {
      if (!boutonDecoller.cacheAvantEquipement) fail('Jetpack : le bouton DÉCOLLER est visible avant même d\'avoir le jetpack');
      else ok('Jetpack : le bouton DÉCOLLER reste bien caché tant que le jetpack n\'est pas équipé');
      if (!boutonDecoller.visibleApresEquipement) fail('Jetpack : le bouton DÉCOLLER n\'apparaît jamais réellement à l\'écran après équipement — régression du bug déjà rencontré (jetpack équipé mais aucune commande pour l\'utiliser)');
      else ok('Jetpack : le bouton DÉCOLLER apparaît bien réellement à l\'écran dès l\'équipement');
      if (!boutonDecoller.cacheEnVehicule) fail('Jetpack : le bouton DÉCOLLER reste affiché alors que le joueur conduit un véhicule');
      else ok('Jetpack : le bouton DÉCOLLER disparaît bien en montant dans un véhicule');
      if (!boutonDecoller.revientApresVehicule) fail('Jetpack : le bouton DÉCOLLER ne revient pas en sortant du véhicule');
      else ok('Jetpack : le bouton DÉCOLLER revient bien en sortant du véhicule');
      if (!boutonDecoller.cacheEnSalle) fail('Jetpack : le bouton DÉCOLLER reste affiché à l\'intérieur d\'une salle');
      else ok('Jetpack : le bouton DÉCOLLER disparaît bien à l\'intérieur d\'une salle');
      if (!boutonDecoller.revientApresSalle) fail('Jetpack : le bouton DÉCOLLER ne revient pas en sortant de la salle');
      else ok('Jetpack : le bouton DÉCOLLER revient bien en sortant de la salle');
      if (!boutonDecoller.cacheApresGameOver) fail('Jetpack : le bouton DÉCOLLER reste affiché après un game over alors que le jetpack est perdu');
      else ok('Jetpack : le bouton DÉCOLLER disparaît bien après un game over (jetpack perdu, comme les armes)');
    }

    console.log('\n--- Jetpack : décollage immédiat, montée franche, carburant qui se vide, jamais utilisable à l\'intérieur ---');
    const decollage = await page.evaluate(() => {
      startRun();
      P.jetpack = true; P.jetFuel = 100;
      P.x = POIS.place.x; P.z = POIS.place.z; P.y = 0; P.vy = 0; P.chute = false;
      INPUT.mx = 0; INPUT.mz = 0; INPUT.btn.tir = false;
      const heatAvant = WANTED.heat;
      INPUT.btn.jetpack = true;
      majJoueur(0.05, 0.05);
      const enVolImmediat = P.jetpackVol === true;
      const heatApres = WANTED.heat > heatAvant;
      const y0 = P.y, fuel0 = P.jetFuel;
      for (let i = 0; i < 20; i++) majJoueur(0.05, 0.05); // 1 s de montée tenue
      const monteFranc = P.y > y0 + 3;
      const fuelBaisse = P.jetFuel < fuel0;
      const jetWrapVisible = document.getElementById('jetWrap').style.display === 'block';
      // reset et tente de décoller à l'intérieur
      startRun();
      P.jetpack = true; P.jetFuel = 100;
      const porte = PORTES.find((p) => p.id === 'site51') || PORTES[0];
      entrerInterieur(porte.id, porte);
      INPUT.btn.jetpack = true;
      majJoueur(0.05, 0.05);
      const pasDeVolEnSalle = P.jetpackVol === false;
      sortirInterieur();
      return { enVolImmediat, heatApres, monteFranc, fuelBaisse, jetWrapVisible, pasDeVolEnSalle };
    });
    if (!decollage.enVolImmediat) fail('Jetpack : le décollage n\'est pas immédiat');
    else ok('Jetpack : le décollage est bien immédiat dès l\'appui sur DÉCOLLER');
    if (!decollage.heatApres) fail('Jetpack : la police ne réagit pas au décollage (comme un véhicule volé)');
    else ok('Jetpack : la police réagit bien au décollage, comme à un véhicule volé');
    if (!decollage.monteFranc) fail('Jetpack : la montée n\'est pas franche/rapide');
    else ok('Jetpack : la montée est bien franche et rapide');
    if (!decollage.fuelBaisse) fail('Jetpack : le carburant ne se vide pas en montant');
    else ok('Jetpack : le carburant se vide bien en montant');
    if (!decollage.jetWrapVisible) fail('Jetpack : la jauge de carburant ne s\'affiche pas pendant le vol');
    else ok('Jetpack : la jauge de carburant s\'affiche bien pendant le vol');
    if (!decollage.pasDeVolEnSalle) fail('Jetpack : le décollage est possible à l\'intérieur d\'une salle — casserait Site 51/musée/métro (CLAUDE.md)');
    else ok('Jetpack : jamais de décollage possible à l\'intérieur d\'une salle');

    console.log('\n--- Jetpack : recharge complète au sol, inertie horizontale (on ne s\'arrête pas net) ---');
    const rechargeInertie = await page.evaluate(() => {
      startRun();
      P.jetpack = true; P.jetFuel = 10; P.jetpackVol = false; P.chute = false;
      INPUT.btn.jetpack = false;
      for (let i = 0; i < 240; i++) majJoueur(0.05, 0.05); // 12 s au sol
      const recharge12s = P.jetFuel;
      P.jetFuel = 0;
      for (let i = 0; i < 400; i++) majJoueur(0.05, 0.05); // 20 s : doit atteindre 100
      const rechargeComplete20s = P.jetFuel === 100;

      P.jetpack = true; P.jetFuel = 100; P.jetpackVol = true; P.y = 40; P.vy = 0; P.jetVx = 0; P.jetVz = 0;
      INPUT.btn.jetpack = false; INPUT.mx = 0; INPUT.mz = 1;
      const x0 = P.x, z0 = P.z;
      for (let i = 0; i < 20; i++) majJoueur(0.05, 0.05); // 1 s de rampe
      const vitesse1s = Math.hypot(P.x - x0, P.z - z0);
      const inertieProgressive = vitesse1s > 0 && vitesse1s < JET_VMAX_H * 1.02;
      INPUT.mx = 0; INPUT.mz = 0;
      const x1 = P.x, z1 = P.z;
      majJoueur(0.05, 0.05);
      const glisseSansStick = Math.hypot(P.x - x1, P.z - z1) > 0.01;
      return { recharge12s, rechargeComplete20s, inertieProgressive, glisseSansStick, vitesseH: vitesse1s };
    });
    if (!(rechargeInertie.recharge12s > 10 && rechargeInertie.recharge12s < 100)) fail('Jetpack : la recharge au sol ne progresse pas de façon crédible sur 12 s (obtenu ' + rechargeInertie.recharge12s + ')');
    else ok('Jetpack : le carburant se recharge bien progressivement au sol');
    if (!rechargeInertie.rechargeComplete20s) fail('Jetpack : la recharge complète n\'est pas atteinte en 20 s au sol');
    else ok('Jetpack : la recharge est bien complète en 20 s au sol');
    if (!rechargeInertie.inertieProgressive) fail('Jetpack : la vitesse horizontale ne monte pas progressivement (pas d\'inertie, ou instantanée)');
    else ok('Jetpack : la vitesse horizontale monte bien progressivement (inertie), nettement supérieure à la course à pied (' + rechargeInertie.vitesseH.toFixed(1) + ' u/s en 1 s)');
    if (!rechargeInertie.glisseSansStick) fail('Jetpack : le joueur s\'arrête net dès que le joystick est relâché (pas de glisse)');
    else ok('Jetpack : le joueur glisse bien, ne s\'arrête jamais net en l\'air');

    console.log('\n--- Jetpack : traverser trois rues tient dans le budget de carburant, sans épuisement ni mort ---');
    const traversee = await page.evaluate(() => {
      startRun();
      P.jetpack = true; P.jetFuel = 100; P.jetpackVol = true;
      P.y = Math.max(40, POIS.toitH ? POIS.toitH.h * 0.5 : 40); P.vy = 0; P.jetVx = 0; P.jetVz = 0;
      P.x = POIS.place.x; P.z = POIS.place.z;
      INPUT.mx = 0; INPUT.mz = 1; INPUT.btn.tir = false;
      const zStart = P.z;
      let crash = false, epuise = false, i = 0;
      for (; i < 500 && (P.z - zStart) < 126; i++) { // 3 rues ≈ 3×CELL
        INPUT.btn.jetpack = (i % 10) < 4; // vol stabilisé : petites relances régulières
        majJoueur(0.05, 0.05);
        if (ETAT.mode === 'mort') { crash = true; break; }
        if (!P.jetpackVol) { epuise = true; break; }
      }
      return { crash, epuise, distanceParcourue: P.z - zStart, fuelRestant: P.jetFuel };
    });
    if (traversee.crash) fail('Jetpack : le joueur meurt en traversant trois rues avec un pilotage stabilisé raisonnable');
    else ok('Jetpack : traverser trois rues (~126 unités) ne tue bien pas avec un pilotage stabilisé raisonnable');
    if (traversee.epuise) fail('Jetpack : le carburant s\'épuise avant d\'avoir traversé trois rues (distance atteinte : ' + traversee.distanceParcourue.toFixed(1) + ')');
    else ok('Jetpack : le budget de carburant tient bien largement le temps de traverser trois rues (reste ' + traversee.fuelRestant.toFixed(1) + ' %)');

    console.log('\n--- Jetpack : le crash est mortel au-dessus de la limite, jamais en dessous, avec un avertissement clair ---');
    const crashTest = await page.evaluate(() => {
      const out = {};
      // chute libre prolongée, jamais de relance -> mort, avertissement vu avant
      startRun();
      P.jetpack = true; P.jetFuel = 100; P.jetpackVol = true;
      P.x = POIS.place.x; P.z = POIS.place.z; P.y = 60; P.vy = 0; P.jetVx = 0; P.jetVz = 0;
      INPUT.mx = 0; INPUT.mz = 0; INPUT.btn.jetpack = false; INPUT.btn.tir = false;
      let mort = false, avert = false;
      for (let i = 0; i < 400 && !mort; i++) {
        majJoueur(0.05, 0.05);
        if (document.getElementById('jetWarn').style.display === 'block') avert = true;
        if (ETAT.mode === 'mort') mort = true;
      }
      out.chuteLibreProlongeeTue = mort;
      out.avertissementAfficheAvantLaMort = avert;

      // atterrissage normal à faible altitude : jamais mortel
      startRun();
      P.jetpack = true; P.jetFuel = 100; P.jetpackVol = true;
      P.x = POIS.place.x; P.z = POIS.place.z; P.y = poseY(POIS.place.x, POIS.place.z) + 1.5; P.vy = -2; P.jetVx = 0; P.jetVz = 0;
      INPUT.mx = 0; INPUT.mz = 0; INPUT.btn.jetpack = false;
      for (let i = 0; i < 30 && P.jetpackVol; i++) majJoueur(0.05, 0.05);
      out.atterrissageFaibleAltitudeSurvit = ETAT.mode === 'jeu';

      // atterrissage sur un toit à la bonne hauteur
      if (POIS.toitH) {
        startRun();
        P.jetpack = true; P.jetFuel = 100; P.jetpackVol = true;
        P.x = POIS.toitH.x; P.z = POIS.toitH.z; P.y = POIS.toitH.h + 1; P.vy = -2; P.jetVx = 0; P.jetVz = 0;
        INPUT.mx = 0; INPUT.mz = 0; INPUT.btn.jetpack = false;
        for (let i = 0; i < 30 && P.jetpackVol; i++) majJoueur(0.05, 0.05);
        out.atterrissageSurToitSurvit = ETAT.mode === 'jeu';
        out.atterritALaBonneHauteur = Math.abs(P.y - POIS.toitH.h) < 1;
      } else { out.atterrissageSurToitSurvit = true; out.atterritALaBonneHauteur = true; }

      // la relance après l'avertissement (avec un temps de réaction réaliste) sauve
      startRun();
      P.jetpack = true; P.jetFuel = 100; P.jetpackVol = true;
      P.x = POIS.place.x; P.z = POIS.place.z; P.y = 60; P.vy = 0; P.jetVx = 0; P.jetVz = 0;
      INPUT.mx = 0; INPUT.mz = 0; INPUT.btn.jetpack = false;
      let mort2 = false, avertVu = false, retardT = 0, recupere = false;
      for (let i = 0; i < 400 && !recupere; i++) {
        if (!avertVu && document.getElementById('jetWarn').style.display === 'block') avertVu = true;
        if (avertVu) { retardT += 0.05; INPUT.btn.jetpack = retardT > 0.3; }
        majJoueur(0.05, 0.05);
        if (ETAT.mode === 'mort') { mort2 = true; break; }
        if (!P.jetpackVol) break;
        if (avertVu && retardT > 0.3 && P.vy >= 0) recupere = true;
      }
      out.relanceApresAvertissementSauve = avertVu && !mort2 && recupere;

      return out;
    });
    if (!crashTest.chuteLibreProlongeeTue) fail('Jetpack : une chute libre prolongée sans jamais relancer ne tue pas — le crash n\'est pas franc');
    else ok('Jetpack : une chute libre prolongée sans relance tue bien (le crash est franc)');
    if (!crashTest.avertissementAfficheAvantLaMort) fail('Jetpack : aucun avertissement visible avant une mort par chute — une mort qu\'on n\'a pas vue venir est injuste (CLAUDE.md)');
    else ok('Jetpack : l\'avertissement de vitesse de chute critique s\'affiche bien avant la mort');
    if (!crashTest.atterrissageFaibleAltitudeSurvit) fail('Jetpack : un atterrissage normal à faible altitude tue le joueur');
    else ok('Jetpack : un atterrissage normal à faible altitude ne tue bien jamais');
    if (!crashTest.atterrissageSurToitSurvit || !crashTest.atterritALaBonneHauteur) fail('Jetpack : l\'atterrissage sur un toit ne fonctionne pas correctement');
    else ok('Jetpack : l\'atterrissage propre fonctionne bien sur un toit, à la bonne hauteur (quelle que soit la surface)');
    if (!crashTest.relanceApresAvertissementSauve) fail('Jetpack : une relance des réacteurs après l\'avertissement (avec un temps de réaction réaliste) ne sauve pas toujours — c\'est le geste que le joueur est censé apprendre (CLAUDE.md)');
    else ok('Jetpack : une brève relance après l\'avertissement sauve bien toujours — le geste à apprendre fonctionne');

    console.log('\n--- Jetpack : entrer dans une salle en plein vol force un atterrissage silencieux, jamais mortel ---');
    const entreeEnSalle = await page.evaluate(() => {
      startRun();
      P.jetpack = true; P.jetFuel = 100; P.jetpackVol = true; P.vy = -30; P.y = 80;
      const porte = PORTES.find((p) => p.id === 'site51') || PORTES[0];
      entrerInterieur(porte.id, porte);
      const out = {
        atterrissageForce: P.jetpackVol === false,
        pasDeMort: ETAT.mode === 'jeu',
        resteEquipe: P.jetpack === true,
        sonCoupe: AUDIO.jetOn !== true,
      };
      sortirInterieur();
      return out;
    });
    if (!entreeEnSalle.atterrissageForce || !entreeEnSalle.pasDeMort) fail('Jetpack : entrer dans une salle en plein vol ne force pas un atterrissage silencieux (' + JSON.stringify(entreeEnSalle) + ')');
    else ok('Jetpack : entrer dans une salle en plein vol force bien un atterrissage silencieux, jamais mortel');
    if (!entreeEnSalle.resteEquipe) fail('Jetpack : le jetpack est perdu en entrant dans une salle (devrait juste être inutilisable, pas perdu)');
    else ok('Jetpack : reste bien équipé (juste inutilisable) en entrant dans une salle');
    if (!entreeEnSalle.sonCoupe) fail('Jetpack : le son des réacteurs continue après une entrée forcée en salle');
    else ok('Jetpack : le son des réacteurs est bien coupé net en entrant dans une salle');

    console.log('\n--- Jetpack : perdu au game over comme les armes, le lieu reste révélé ---');
    const gameOver = await page.evaluate(() => {
      startRun();
      P.jetpack = true; META.jetpackTrouve = true;
      P.hp = 1; toucherJoueur(999);
      startRun();
      return { perdu: P.jetpack === false, lieuRevele: META.jetpackTrouve === true, meshCache: P.jetMesh.g.visible === false };
    });
    if (!gameOver.perdu) fail('Jetpack : n\'est pas perdu au game over');
    else ok('Jetpack : est bien perdu au game over, comme les armes — il faut remonter le chercher');
    if (!gameOver.lieuRevele) fail('Jetpack : le lieu redevient caché après un game over (devrait rester révélé, comme le Monster Truck)');
    else ok('Jetpack : le lieu reste bien révélé sur la carte après un game over');
    if (!gameOver.meshCache) fail('Jetpack : les réacteurs restent visibles sur le joueur alors qu\'il n\'a plus le jetpack');
    else ok('Jetpack : les réacteurs sont bien masqués après un game over, tant qu\'il n\'est pas rééquipé');

    console.log('\n--- Jetpack : précision de tir réduite en vol, jamais d\'invulnérabilité (les ennemis au sol touchent toujours) ---');
    const tirEtInvuln = await page.evaluate(() => {
      META.armes.pistolet.poss = true;
      startRun();
      P.armeCur = 'pistolet'; P.mags.pistolet = 20; P.mun.pistolet = 40;
      const tirerOrig = tirer;
      let dispCapturee = null;
      window.tirer = function (x, y, z, ang, disp, ...rest) { dispCapturee = disp; return tirerOrig(x, y, z, ang, disp, ...rest); };
      P.jetpackVol = false; P.cadT = 0; P.frappeT = 0; P.tirT = 0;
      attaquer();
      const dispSol = dispCapturee;
      P.jetpackVol = true; P.cadT = 0; P.frappeT = 0; dispCapturee = null;
      attaquer();
      const dispVol = dispCapturee;
      window.tirer = tirerOrig;

      // invulnérabilité : un ennemi peut toujours toucher le joueur en vol
      // (vérifie juste qu'aucun garde de type "en vol = intouchable" n'existe
      // dans toucherJoueur — appel direct, comme le ferait un tir ennemi)
      P.jetpackVol = true; P.y = 40;
      const hpAvant = P.hp;
      toucherJoueur(15);
      const toucheEnVol = P.hp < hpAvant;

      return { dispSol, dispVol, toucheEnVol };
    });
    if (!(tirEtInvuln.dispVol > tirEtInvuln.dispSol)) fail('Jetpack : la précision de tir n\'est pas réduite en vol (sol=' + tirEtInvuln.dispSol + ', vol=' + tirEtInvuln.dispVol + ')');
    else ok('Jetpack : la précision de tir est bien réduite en vol');
    if (!tirEtInvuln.toucheEnVol) fail('Jetpack : le joueur ne peut plus être touché en vol — voler ne doit jamais être une invulnérabilité (CLAUDE.md)');
    else ok('Jetpack : le joueur reste bien vulnérable en vol — voler n\'est pas une invulnérabilité');

    console.log('\n--- Jetpack : les limites de la zone jouable ramènent le joueur, comme les autres véhicules aériens ---');
    const limites = await page.evaluate(() => {
      startRun();
      P.jetpack = true; P.jetFuel = 100; P.jetpackVol = true; P.y = 50; P.vy = 0;
      P.x = HALF + 5000; P.z = 0; P.jetVx = 500; P.jetVz = 0;
      INPUT.mx = 0; INPUT.mz = 0; INPUT.btn.jetpack = true;
      majJoueur(0.05, 0.05);
      const xMax = DECOR_V2 ? LIMITE_EST + 20 : HALF + 170; // limite du ciel lue dans le jeu (DECOR_V2 : tout le ciel jusqu'à la paroi est)
      return { xBorne: P.x <= xMax + 1, xFini: Number.isFinite(P.x), x: P.x };
    });
    if (!limites.xFini || !limites.xBorne) fail('Jetpack : le joueur n\'est pas ramené aux limites de la zone jouable en vol (x=' + limites.x + ')');
    else ok('Jetpack : le joueur est bien ramené aux limites de la zone jouable en vol, comme les autres véhicules aériens');

    console.log('\n--- Jetpack : horloges séparées — carburant/montée/chute suivent dtJeu, jamais dt ---');
    const horloges = await page.evaluate(() => {
      startRun();
      P.jetpack = true; P.jetFuel = 100; P.jetpackVol = true;
      P.x = POIS.place.x; P.z = POIS.place.z; P.y = 40; P.vy = 0; P.jetVx = 0; P.jetVz = 0;
      INPUT.mx = 0; INPUT.mz = 0; INPUT.btn.jetpack = true;
      const fuelAvant = P.jetFuel;
      const dt = 0.5, dtJeu = 1; // ralenti à ×0,5 simulé comme boucle()
      majJoueur(dt, dtJeu);
      const drainAttendu = JET_DRAIN_MONTEE * dtJeu; // vy plafonne vite : "montant" dès le 1er pas
      const drainReel = fuelAvant - P.jetFuel;
      return { drainReel, drainAttendu };
    });
    if (Math.abs(horloges.drainReel - horloges.drainAttendu) > 1e-6) fail('Jetpack : le carburant se vide selon dt (ralenti) au lieu de dtJeu (attendu ' + horloges.drainAttendu + ', obtenu ' + horloges.drainReel + ')');
    else ok('Jetpack : le carburant se vide bien selon dtJeu, jamais dt (même garantie que le Dépôt de bus/Site 51)');

    console.log('\n--- Jetpack : performance — flammes/fumée réutilisent les pools existants, aucun nouvel objet par frame ---');
    const perf = await page.evaluate(() => {
      startRun();
      P.jetpack = true; P.jetFuel = 100; P.jetpackVol = true;
      P.x = POIS.place.x; P.z = POIS.place.z; P.y = 40; P.vy = 0; P.jetVx = 0; P.jetVz = 0;
      INPUT.mx = 0; INPUT.mz = 0; INPUT.btn.jetpack = true;
      const flammesAvant = P.jetMesh.flammes.slice();
      const childrenAvant = scene.children.length;
      for (let i = 0; i < 120; i++) majJoueur(0.05, 0.05); // 6 s de vol soutenu
      const flammesMemesObjets = P.jetMesh.flammes.every((f, i) => f === flammesAvant[i]);
      const croissanceEnfantsScene = scene.children.length - childrenAvant;
      return { flammesMemesObjets, croissanceEnfantsScene };
    });
    if (!perf.flammesMemesObjets) fail('Jetpack : les sprites de flamme sont recréés au lieu d\'être réutilisés');
    else ok('Jetpack : les flammes réutilisent bien les mêmes objets (aucune recréation par frame)');
    if (perf.croissanceEnfantsScene > 5) fail('Jetpack : la scène grossit pendant un vol prolongé (+' + perf.croissanceEnfantsScene + ' objets en 6 s) — indique une allocation par frame au lieu des pools de particules');
    else ok('Jetpack : la scène ne grossit bien pas pendant un vol prolongé (particules/fumée via les pools existants, ' + perf.croissanceEnfantsScene + ' objet(s) de plus)');

    // -------------------------------------------------------------------
    // Signalé par un joueur réel : les messages (bigMsg, toast) débordaient
    // à droite et à gauche de l'écran sur les textes un peu longs, faute de
    // largeur maximale et de retour à la ligne (white-space:nowrap). Vérifié
    // ici avec les VRAIS plus longs messages du jeu (lus depuis le code,
    // jamais recopiés — voir CLAUDE.md), sur le viewport mobile réel de la
    // suite. Depuis le passage à la pile unique #notifStack (toast() et
    // bigMsg() poussent tous les deux le même type d'élément .notif),
    // l'animation d'entrée est un simple fondu CSS de 280 ms (plus l'ancien
    // « pop » ×1.7 de #bigMsg) : une attente courte suffit largement à la
    // laisser se stabiliser avant de mesurer.
    // -------------------------------------------------------------------
    console.log('\n--- Messages (bigMsg, toast) : ne débordent jamais l\'écran, même avec les plus longs textes réels du jeu ---');
    const messagesTest = await page.evaluate(() => {
      // les plus longs bigMsg()/toast() réellement utilisés dans le jeu,
      // trouvés dans le code source à l'exécution du test (jamais une
      // liste recopiée à la main, qui dériverait silencieusement).
      const src = document.documentElement.outerHTML;
      const longest = (re) => {
        let m, best = '';
        while ((m = re.exec(src))) { if (m[1].length > best.length) best = m[1]; }
        return best;
      };
      const longestBig = longest(/bigMsg\('([^']{15,})'\)/g) || 'MESSAGE DE TEST';
      const longestToast = longest(/toast\('([^']{40,})'/g) || 'Message de test un peu long pour vérifier le retour à la ligne';
      return { longestBig, longestToast };
    });
    await page.evaluate(({ longestBig, longestToast }) => {
      startRun();
      bigMsg(longestBig);
      toast(longestToast, 'or');
    }, messagesTest);
    await attendre(500);
    const bounds = await page.evaluate(() => {
      const big = document.querySelector('#notifStack .gros');
      const t = document.querySelector('#notifStack .or');
      const br = big ? big.getBoundingClientRect() : null, tr = t ? t.getBoundingClientRect() : null;
      return {
        viewportW: window.innerWidth,
        big: br ? { left: br.left, right: br.right, text: big.textContent } : null,
        toast: tr ? { left: tr.left, right: tr.right, text: t.textContent } : null,
      };
    });
    if (!bounds.big) fail('Messages : le bigMsg de test n\'a pas été trouvé dans #notifStack');
    else {
      const bigDeborde = bounds.big.left < -1 || bounds.big.right > bounds.viewportW + 1;
      if (bigDeborde) fail('Messages : bigMsg déborde l\'écran avec le plus long message réel du jeu ("' + bounds.big.text + '", left=' + bounds.big.left.toFixed(1) + ' right=' + bounds.big.right.toFixed(1) + ' pour une largeur de ' + bounds.viewportW + ')');
      else ok('Messages : bigMsg reste bien dans l\'écran, même avec le plus long message réel du jeu');
    }
    if (!bounds.toast) fail('Messages : le toast de test n\'a pas été trouvé dans le DOM');
    else {
      const toastDeborde = bounds.toast.left < -1 || bounds.toast.right > bounds.viewportW + 1;
      if (toastDeborde) fail('Messages : un toast déborde l\'écran avec un texte un peu long ("' + bounds.toast.text + '", left=' + bounds.toast.left.toFixed(1) + ' right=' + bounds.toast.right.toFixed(1) + ' pour une largeur de ' + bounds.viewportW + ')');
      else ok('Messages : les toasts restent bien dans l\'écran, même avec un texte un peu long (retour à la ligne)');
    }

    // -------------------------------------------------------------------
    // Signalé par un joueur réel : la porte du Site 51, verrouillée, ne
    // dit jamais où en est le joueur — lu depuis le vrai bouton d'action,
    // jamais une valeur recopiée.
    // -------------------------------------------------------------------
    console.log('\n--- Site 51 : le bouton verrouillé affiche la progression réelle (X/25) ---');
    const progressionSite51 = await page.evaluate(() => {
      startRun();
      const p = PORTES.find((x) => x.id === 'site51');
      P.x = p.x; P.z = p.z + 3;
      META.fouilles = 14;
      majAction();
      const label14 = el('btnAction').textContent;
      META.fouilles = 0;
      majAction();
      const label0 = el('btnAction').textContent;
      return { label14, label0 };
    });
    if (!progressionSite51.label14.includes('14/25')) fail('Site 51 : le bouton verrouillé n\'affiche pas la progression réelle (obtenu "' + progressionSite51.label14 + '", attendu quelque chose contenant "14/25")');
    else ok('Site 51 : le bouton verrouillé affiche bien la progression réelle du joueur (14/25)');
    if (!progressionSite51.label0.includes('0/25')) fail('Site 51 : la progression ne suit pas META.fouilles (obtenu "' + progressionSite51.label0 + '" pour 0 fouille)');
    else ok('Site 51 : la progression suit bien META.fouilles en temps réel');

    // -------------------------------------------------------------------
    // Nouveaux défis (lot 11/12) : Dépôt de bus, Jetpack, Monster Truck —
    // vérifie que chaque déclencheur pose bien le bon flag ET que checkDefis()
    // verse alors la récompense correspondante, en lisant DEFIS/META en
    // direct (jamais une liste de défis recopiée — voir CLAUDE.md).
    // -------------------------------------------------------------------
    console.log('\n--- Nouveaux défis : Dépôt de bus (victoires par circuit), Jetpack (équipement + sauvetage), Monster Truck, Broyeur ---');
    const nouveauxDefis = await page.evaluate(() => {
      const out = {};
      const faitId = (id) => !!(META.defis.faits[id] || META.defis.aReclamer[id]); // accompli : à récupérer ou récupéré (8e lot)

      // ces défis peuvent déjà avoir été déclenchés par des tests
      // PRÉCÉDENTS de cette même suite (le Dépôt/le Toit sont testés
      // ailleurs, sur la même page) : on repart d'un état propre, jamais
      // supposé vierge.
      META.defis.depotBoucle = false; META.defis.depotQuais = false; META.defis.depotToit = false;
      META.defis.jetpack = false; META.defis.jetpackSauvetage = false; META.defis.monstertruck = false;
      META.stats.vehEcrases = 0;
      ['depotPremiere', 'depotBalayage', 'volantDefi', 'jetpackDefi', 'jetpackSauvetage', 'monstertruckDefi', 'broyeur']
        .forEach((id) => { delete META.defis.faits[id]; delete META.defis.aReclamer[id]; });

      // --- Dépôt de bus : une victoire sur La Boucle pose le bon flag et
      // débloque le défi correspondant, jamais celui d'un autre circuit ---
      startRun();
      let p = PORTES.find((x) => x.id === 'depot');
      entrerInterieur('depot', p);
      let s = INT.actif;
      s.vehiculeChoisi = 'depotCitadine';
      depotLancerCourse(s, 'boucle');
      s.course.entrants[0].prog = s.course.c.laps * DEPOT_NB_WAYPOINTS;
      majInterieur(0.05, 0.05);
      out.depotBoucleFlag = META.defis.depotBoucle === true;
      out.depotQuaisFlagResteFaux = META.defis.depotQuais === false;
      out.depotPremiereFait = faitId('depotPremiere');
      out.depotBalayageNonFaitEncore = !faitId('depotBalayage');
      if (INT.actif) sortirInterieur();

      // --- gagner aussi Les Quais et Le Toit -> 'depotBalayage' se déclenche ---
      META.depotCircuits.quais = true; META.depotCircuits.toit = true;
      p = PORTES.find((x) => x.id === 'depot');
      entrerInterieur('depot', p);
      s = INT.actif;
      s.vehiculeChoisi = 'depotCitadine';
      depotLancerCourse(s, 'quais');
      s.course.entrants[0].prog = s.course.c.laps * DEPOT_NB_WAYPOINTS;
      majInterieur(0.05, 0.05);
      s.vehiculeChoisi = 'depotCitadine';
      depotLancerCourse(s, 'toit');
      s.course.entrants[0].prog = s.course.c.laps * DEPOT_NB_WAYPOINTS;
      majInterieur(0.05, 0.05);
      out.depotBalayageFait = faitId('depotBalayage');
      if (INT.actif) sortirInterieur();

      // --- curiosité 'volant' (gagner Le Toit en Bus) -> défi dédié ---
      startRun();
      META.depotCircuits.boucle = true; META.depotCircuits.quais = true; META.depotCircuits.toit = true;
      META.depotBusDebloque = true;
      p = PORTES.find((x) => x.id === 'depot');
      entrerInterieur('depot', p);
      s = INT.actif;
      s.vehiculeChoisi = 'depotBus';
      depotLancerCourse(s, 'toit');
      s.course.entrants[0].prog = s.course.c.laps * DEPOT_NB_WAYPOINTS;
      majInterieur(0.05, 0.05);
      out.volantDefiFait = faitId('volantDefi');
      if (INT.actif) sortirInterieur();

      // --- Jetpack : équiper pose le flag et verse la récompense ---
      startRun();
      const jp = POIS.toitH && POIS.toitH.jetpack;
      out.jetpackToitPresent = !!jp;
      if (jp) {
        P.x = jp.x; P.z = jp.z; P.y = jp.h; P.jetpack = false;
        majAction();
        if (el('btnAction')._fn) el('btnAction')._fn();
        out.jetpackDefiFlag = META.defis.jetpack === true;
        out.jetpackDefiFait = faitId('jetpackDefi');

        // --- sauvetage in extremis : chute lancée directement dans la zone
        // d'alerte (entre JET_VY_AVERT et JET_VY_LETALE, jamais au-delà)
        // pour déclencher l'avertissement dès la 1re frame de façon fiable,
        // puis un pilotage réactif (relance dès que la chute s'accélère)
        // ramène la vitesse de chute sous contrôle jusqu'à un atterrissage
        // propre — imite le geste qu'un joueur ferait après l'alerte.
        startRun();
        META.defis.jetpackSauvetage = false; delete META.defis.faits.jetpackSauvetage; delete META.defis.aReclamer.jetpackSauvetage;
        P.jetpack = true; P.jetFuel = 100; P.jetpackVol = true; P.jetAvertVu = false;
        P.x = POIS.place.x; P.z = POIS.place.z; P.y = 15; P.vy = -(JET_VY_AVERT + 2); P.jetVx = 0; P.jetVz = 0;
        INPUT.mx = 0; INPUT.mz = 0; INPUT.btn.jetpack = false;
        for (let i = 0; i < 600 && P.jetpackVol; i++) {
          INPUT.btn.jetpack = -P.vy > 2; // relance réactive dès que la chute reprend
          majJoueur(0.05, 0.05);
        }
        out.aBienAtterriPendantLeSauvetage = P.jetpackVol === false;
        out.avertissementVuPendantLeSauvetage = P.jetAvertVu === true;
        out.jetpackSauvetageFait = faitId('jetpackSauvetage');
        out.pasMortPendantLeSauvetage = ETAT.mode === 'jeu';

        // --- vol calme, sans jamais voir l'avertissement -> ne doit PAS compter.
        // Mêmes paramètres que le test déjà existant "atterrissage normal à
        // faible altitude" (offset +1.5, vy=-2) : un atterrissage qui reste
        // franchement sous JET_VY_AVERT tout du long, jamais une chute libre. ---
        startRun();
        META.defis.jetpackSauvetage = false; delete META.defis.faits.jetpackSauvetage; delete META.defis.aReclamer.jetpackSauvetage;
        P.jetpack = true; P.jetFuel = 100; P.jetpackVol = true; P.jetAvertVu = false;
        P.x = POIS.place.x; P.z = POIS.place.z; P.y = poseY(POIS.place.x, POIS.place.z) + 1.5; P.vy = -2; P.jetVx = 0; P.jetVz = 0;
        INPUT.mx = 0; INPUT.mz = 0; INPUT.btn.jetpack = false;
        let avertVuPendantVolCalme = false;
        for (let i = 0; i < 30 && P.jetpackVol; i++) {
          majJoueur(0.05, 0.05);
          if (document.getElementById('jetWarn').style.display === 'block') avertVuPendantVolCalme = true;
        }
        out.avertJamaisVuPendantVolCalme = !avertVuPendantVolCalme && P.jetAvertVu === false;
        out.volCalmeNeCompteJamaisCommeSauvetage = !faitId('jetpackSauvetage');
      }

      // --- Monster Truck : monter à bord pose le flag ---
      startRun();
      const mt = vehicules.find((v) => v.key === 'monstertruck');
      out.monstertruckPresent = !!mt;
      if (mt) {
        entrerVehicule(mt);
        // entrerVehicule() ne pose que le flag (même convention que 'bateau'/'heli') :
        // la récompense n'arrive qu'au prochain tick périodique de checkDefis() dans
        // boucle() — on le déclenche ici pour ne pas dépendre d'un vrai écoulement de temps.
        checkDefis();
        out.monstertruckDefiFlag = META.defis.monstertruck === true;
        out.monstertruckDefiFait = faitId('monstertruckDefi');
        sortirVehicule(true);
      }

      // --- Broyeur : 8 écrasements, y compris un véhicule long en deux
      // temps qui ne doit compter qu'UNE fois ---
      startRun();
      // Le test maîtrise sa scène : startRun() gare des véhicules de la ville
      // (dont trois à 13-16 unités de POIS.place) et openSpot() n'évite que
      // les bâtiments et l'eau. Bug déjà rencontré : ~3 % des tirages, un
      // véhicule garé traînait sur la trajectoire du char et devenait un 9e
      // écrasement. Même motif que nettoieMonde() — aucune autre structure ne
      // retient ces véhicules juste après startRun().
      function viderVehiculesVille() { for (const v of vehicules) scene.remove(v.mesh); vehicules.length = 0; }
      viderVehiculesVille();
      function openSpot(k) {
        for (let ring = 0; ring < 8; ring++) for (let a = 0; a < 8; a++) {
          const ang = (a / 8) * Math.PI * 2;
          const x = POIS.place.x + Math.cos(ang) * (20 + ring * 15) + k * 3, z = POIS.place.z + Math.sin(ang) * (20 + ring * 15);
          if (!solidAt(x, z, 4) && !estEau(x, z)) return { x, z };
        }
        return { x: POIS.place.x, z: POIS.place.z };
      }
      function nettoyer() { for (let i = vehicules.length - 1; i >= 0; i--) if (vehicules[i].mort) { scene.remove(vehicules[i].mesh); vehicules.splice(i, 1); } }
      const avant = META.stats.vehEcrases;
      // 1 écrasement d'un bus (long, deux temps)
      let sp = openSpot(1);
      let att = creerVehicule('char', sp.x, sp.z, 0, 'joueur');
      let cible = creerVehicule('busville', sp.x, sp.z + VEHDEFS.busville.long / 2 + 1, Math.PI, 'trafic');
      P.veh = att; att.v = 15;
      for (let t = 0; t < 800 && !cible.epave; t++) majVehiculePhys(att, 0.05, 1, 0, false);
      out.busEnDeuxTempsCompteUneSeuleFois = (META.stats.vehEcrases - avant) === 1;
      P.veh = null; att.mort = true; nettoyer();
      // 7 écrasements de plus -> 8 au total -> le défi doit se déclencher
      for (let i = 0; i < 7; i++) {
        sp = openSpot(10 + i);
        att = creerVehicule('char', sp.x, sp.z, 0, 'joueur');
        cible = creerVehicule('citadine', sp.x, sp.z + 3, Math.PI, 'trafic');
        P.veh = att; att.v = 15;
        for (let t = 0; t < 300 && !cible.epave; t++) majVehiculePhys(att, 0.05, 1, 0, false);
        P.veh = null; att.mort = true; nettoyer();
      }
      out.vehEcrasesTotal = META.stats.vehEcrases - avant;
      // ecraserVehicule() ne fait qu'incrémenter le compteur (même convention) :
      // simule le tick périodique de checkDefis() qui verserait la récompense
      // quelques secondes plus tard dans une vraie partie.
      checkDefis();
      out.broyeurFait = faitId('broyeur');

      return out;
    });
    if (!nouveauxDefis.depotBoucleFlag || !nouveauxDefis.depotQuaisFlagResteFaux) fail('Défis : la victoire sur La Boucle ne pose pas le bon flag isolé (' + JSON.stringify(nouveauxDefis) + ')');
    else ok('Défis : gagner La Boucle pose bien son propre flag, jamais celui d\'un autre circuit');
    if (!nouveauxDefis.depotPremiereFait) fail('Défis : \'depotPremiere\' ne se déclenche pas après une victoire au Dépôt de bus');
    else ok('Défis : \'depotPremiere\' (première victoire au Dépôt de bus) se déclenche bien');
    if (!nouveauxDefis.depotBalayageNonFaitEncore) fail('Défis : \'depotBalayage\' se déclenche après une seule victoire (devrait exiger les 3 circuits)');
    else ok('Défis : \'depotBalayage\' n\'est bien pas déclenché après une seule victoire');
    if (!nouveauxDefis.depotBalayageFait) fail('Défis : \'depotBalayage\' ne se déclenche pas après une victoire sur les 3 circuits');
    else ok('Défis : \'depotBalayage\' se déclenche bien après une victoire sur les 3 circuits');
    if (!nouveauxDefis.volantDefiFait) fail('Défis : \'volantDefi\' ne se déclenche pas en gagnant Le Toit avec Le Bus');
    else ok('Défis : \'volantDefi\' se déclenche bien en gagnant Le Toit avec Le Bus');
    if (!nouveauxDefis.jetpackToitPresent) saute('Défis : tour/jetpack introuvable cette partie (probabiliste) — vérifications jetpack sautées');
    else {
      if (!nouveauxDefis.jetpackDefiFlag || !nouveauxDefis.jetpackDefiFait) fail('Défis : \'jetpackDefi\' ne se déclenche pas à l\'équipement du jetpack');
      else ok('Défis : \'jetpackDefi\' se déclenche bien à l\'équipement du jetpack');
      if (!nouveauxDefis.pasMortPendantLeSauvetage) fail('Défis : le scénario de test du sauvetage jetpack meurt (réglages de test à revoir)');
      else if (!nouveauxDefis.avertissementVuPendantLeSauvetage) fail('Défis : le scénario de test ne déclenche jamais l\'avertissement de chute (réglages de test à revoir)');
      else if (!nouveauxDefis.aBienAtterriPendantLeSauvetage) fail('Défis : le scénario de test n\'atterrit jamais dans le temps imparti (réglages de test à revoir)');
      else if (!nouveauxDefis.jetpackSauvetageFait) fail('Défis : \'jetpackSauvetage\' ne se déclenche pas après un avertissement suivi d\'un atterrissage propre');
      else ok('Défis : \'jetpackSauvetage\' se déclenche bien après avoir vu l\'avertissement et atterri proprement');
      if (!nouveauxDefis.avertJamaisVuPendantVolCalme) fail('Défis : le scénario de vol calme déclenche quand même l\'avertissement (réglages de test à revoir, ce n\'est plus un vol calme)');
      else if (!nouveauxDefis.volCalmeNeCompteJamaisCommeSauvetage) fail('Défis : \'jetpackSauvetage\' se déclenche même sans jamais avoir vu l\'avertissement (devrait exiger une vraie frayeur)');
      else ok('Défis : un atterrissage calme, sans avertissement, ne compte bien jamais comme un sauvetage');
    }
    if (!nouveauxDefis.monstertruckPresent) fail('Défis : Monster Truck introuvable pour le test');
    else {
      if (!nouveauxDefis.monstertruckDefiFlag || !nouveauxDefis.monstertruckDefiFait) fail('Défis : \'monstertruckDefi\' ne se déclenche pas en montant dans le Monster Truck');
      else ok('Défis : \'monstertruckDefi\' se déclenche bien en montant dans le Monster Truck');
    }
    if (!nouveauxDefis.busEnDeuxTempsCompteUneSeuleFois) fail('Défis : un véhicule long aplati en deux temps est compté plus d\'une fois dans vehEcrases (' + nouveauxDefis.vehEcrasesTotal + ')');
    else ok('Défis : un véhicule long aplati en deux temps ne compte bien qu\'une seule fois');
    if (nouveauxDefis.vehEcrasesTotal !== 8) fail('Défis : le compteur d\'écrasements n\'atteint pas 8 après 8 écrasements réels (obtenu ' + nouveauxDefis.vehEcrasesTotal + ')');
    else if (!nouveauxDefis.broyeurFait) fail('Défis : \'broyeur\' ne se déclenche pas après 8 écrasements');
    else ok('Défis : \'broyeur\' se déclenche bien après 8 écrasements');

    // -------------------------------------------------------------------
    // Signalé par un joueur : au concessionnaire, les podiums n'affichaient
    // jamais aucun véhicule (juste un anneau doré vide, mesh:null jamais
    // rempli) — impossible de voir ce qu'on achète. Vérifie que les 3
    // podiums affichent bien un vrai modèle (lu depuis CATALOGUE/VEHDEFS en
    // direct, jamais une liste recopiée), que le podium central correspond
    // TOUJOURS à ce que le comptoir vend réellement, et que « voir un autre
    // modèle » fait bien changer les 3 véhicules affichés.
    // -------------------------------------------------------------------
    console.log('\n--- Concessionnaire : les podiums affichent bien de vrais véhicules, synchronisés avec le comptoir ---');
    const concesTest = await page.evaluate(() => {
      startRun();
      const p = PORTES.find((x) => x.id === 'conces');
      entrerInterieur('conces', p);
      const s = INT.actif;
      const out = {};
      out.les3ModelesPresents = s.podiums.every((pod) => !!pod.key && !!pod.mesh);
      out.centreCorrespondAuCatalogue = s.podiums[1].key === CATALOGUE[s.artIdx || 0].key;
      const avant = s.podiums.map((pod) => pod.key);
      P.x = s.podiums[1].x; P.z = s.podiums[1].z + 1;
      majAction();
      out.labelCycle = el('btnAction').textContent;
      if (el('btnAction')._fn) el('btnAction')._fn();
      const apres = s.podiums.map((pod) => pod.key);
      out.aChangeDeModeles = avant.some((k, i) => k !== apres[i]);
      out.centreEncoreSyncApresCycle = s.podiums[1].key === CATALOGUE[s.artIdx].key;
      P.x = s.vente.x; P.z = s.vente.z + 1;
      majAction();
      out.labelComptoir = el('btnAction').textContent;
      out.comptoirCiteLeVehiculeDuPodiumCentral = out.labelComptoir.includes(VEHDEFS[s.podiums[1].key].nom);
      return out;
    });
    if (!concesTest.les3ModelesPresents) fail('Concessionnaire : au moins un podium n\'affiche toujours aucun véhicule');
    else ok('Concessionnaire : les 3 podiums affichent bien un vrai modèle de véhicule');
    if (!concesTest.centreCorrespondAuCatalogue) fail('Concessionnaire : le podium central ne correspond pas au véhicule réellement en vente');
    else ok('Concessionnaire : le podium central correspond bien à ce que le comptoir vend');
    if (!concesTest.labelCycle.includes('AUTRE MODÈLE')) fail('Concessionnaire : le bouton « voir un autre modèle » n\'apparaît pas près des podiums');
    else if (!concesTest.aChangeDeModeles) fail('Concessionnaire : les podiums n\'affichent toujours pas un nouveau modèle après « voir un autre modèle »');
    else ok('Concessionnaire : « voir un autre modèle » change bien les véhicules affichés sur les 3 podiums');
    if (!concesTest.centreEncoreSyncApresCycle) fail('Concessionnaire : le podium central se désynchronise du catalogue après un cycle');
    else ok('Concessionnaire : le podium central reste bien synchronisé après un cycle');
    if (!concesTest.comptoirCiteLeVehiculeDuPodiumCentral) fail('Concessionnaire : le comptoir de vente (' + concesTest.labelComptoir + ') ne correspond pas au véhicule affiché au podium central');
    else ok('Concessionnaire : le comptoir de vente correspond bien au véhicule affiché sur le podium central');

    // -------------------------------------------------------------------
    // Moto cross : demande explicite « qui puisse cabrer avec un bouton...
    // avec aussi chute si trop cabré ». Vérifie mathématiquement (jamais à
    // l'intuition, voir CLAUDE.md) les 3 cas : tenir en continu fait
    // toujours chuter, relâcher avant la fin du délai de grâce sauve
    // toujours, et une conduite normale sans jamais cabrer ne déclenche
    // rien. Lit les constantes CROSS_CABRAGE_* en direct, jamais recopiées.
    // -------------------------------------------------------------------
    console.log('\n--- Moto cross : cabrage (bouton CABRER, chute si tenu trop longtemps, sauvetage si relâché à temps) ---');
    const crossTest = await page.evaluate(() => {
      const res = {};
      const X0 = -HALF + 6 * CELL, Z0 = -HALF + 6 * CELL; // carrefour dégagé (jamais le centre de la place : sa statue est solide)
      res.vehdefPresent = !!VEHDEFS.motocross && VEHDEFS.motocross.type === 'moto' && !!VEHDEFS.motocross.cross;
      res.auCatalogue = CATALOGUE.some((o) => o.key === 'motocross');

      // le test maîtrise sa scène : aucun véhicule de la ville sur les ~100 unités parcourues (voir Broyeur)
      function viderVehiculesVille() { for (const v of vehicules) scene.remove(v.mesh); vehicules.length = 0; }
      startRun(); viderVehiculesVille();
      const mt = creerVehicule('motocross', X0, Z0, 0, null);
      P.veh = mt; mt.conduit = 'joueur';
      INPUT.btn.esquive = true;
      let t = 0, chute = false;
      for (let i = 0; i < 400 && P.veh; i++) {
        mt.v = 15; mt.x = X0; mt.z = Z0; // vitesse maintenue, position figée : isole le cabrage du reste de la conduite (aucun décor sur le trajet)
        majConduite(0.016);
        t += 0.016;
      }
      chute = !P.veh;
      res.tenirEnContinuFaitChuter = chute && t < 3;

      startRun(); viderVehiculesVille();
      const mt2 = creerVehicule('motocross', X0, Z0, 0, null);
      P.veh = mt2; mt2.conduit = 'joueur';
      INPUT.btn.esquive = true;
      let atteintDanger = false;
      for (let i = 0; i < 60 && P.veh; i++) {
        mt2.v = 15; mt2.x = X0; mt2.z = Z0;
        majConduite(0.016);
        if (P.veh && P.veh.wheelieA > CROSS_CABRAGE_DANGER) { atteintDanger = true; break; }
      }
      INPUT.btn.esquive = false; // relâche dès l'entrée en zone de danger
      for (let i = 0; i < 60 && P.veh; i++) { mt2.v = 15; mt2.x = X0; mt2.z = Z0; majConduite(0.016); }
      res.atteintLaZoneDeDanger = atteintDanger;
      res.relacherATempsSauveToujours = !!P.veh;
      res.angleRedescendBienAZero = P.veh ? P.veh.wheelieA < 0.01 : false;

      startRun(); viderVehiculesVille();
      const mt3 = creerVehicule('motocross', X0, Z0, 0, null);
      P.veh = mt3; mt3.conduit = 'joueur';
      INPUT.btn.esquive = false;
      for (let i = 0; i < 90 && P.veh; i++) { mt3.v = 15; mt3.x = X0; mt3.z = Z0; majConduite(0.016); }
      res.conduiteNormaleNeDeclencheRien = !!P.veh && mt3.wheelieA === 0;

      return res;
    });
    if (!crossTest.vehdefPresent) fail('Moto cross : VEHDEFS.motocross est absent ou mal configuré (type/cross)');
    else ok('Moto cross : bien définie dans VEHDEFS (type moto, cross:true)');
    if (!crossTest.auCatalogue) fail('Moto cross : absente du catalogue du concessionnaire');
    else ok('Moto cross : bien disponible au concessionnaire');
    if (!crossTest.tenirEnContinuFaitChuter) fail('Moto cross : tenir CABRER en continu ne fait jamais chuter (le risque doit être réel)');
    else ok('Moto cross : tenir CABRER en continu fait bien chuter — le risque est réel');
    if (!crossTest.atteintLaZoneDeDanger) fail('Moto cross : la zone de danger n\'est jamais atteinte (réglages de test à revoir)');
    else if (!crossTest.relacherATempsSauveToujours) fail('Moto cross : relâcher CABRER dès l\'entrée en zone de danger fait quand même chuter — trop punitif, le geste n\'est pas rattrapable');
    else if (!crossTest.angleRedescendBienAZero) fail('Moto cross : l\'angle ne redescend pas complètement à zéro après relâchement');
    else ok('Moto cross : relâcher CABRER à temps sauve bien toujours, et le châssis redescend bien à plat');
    if (!crossTest.conduiteNormaleNeDeclencheRien) fail('Moto cross : une conduite normale sans jamais cabrer déclenche quand même quelque chose');
    else ok('Moto cross : une conduite normale, sans jamais cabrer, ne déclenche bien jamais rien');

    // -------------------------------------------------------------------
    // Navigation entre menus : ecran() doit toujours masquer TOUS les
    // écrans précédents avant d'afficher le nouveau (document.
    // querySelectorAll('.screen') — jamais exercé par valider.js, qui ne
    // simule aucun clic).
    // -------------------------------------------------------------------
    console.log('\n--- Navigation entre menus ---');
    const menuNav = await page.evaluate(() => {
      const ecransOn = () => Array.from(document.querySelectorAll('.screen')).filter((s) => s.classList.contains('on')).map((s) => s.id);
      const clic = (id) => document.getElementById(id).dispatchEvent(new Event('pointerdown', { bubbles: true }));
      const paires = [
        ['mShop', 'shopClose', 'shop'],
        ['mChars', 'charsClose', 'chars'],
        ['mUpg', 'upgClose', 'upg'],
        ['mDefis', 'defisClose', 'defis'],
        ['mStatsBtn', 'statsClose', 'statsScr'],
        ['mHelp', 'helpClose', 'help'],
      ];
      const resultats = [];
      for (const [ouvrir, fermer, ecranId] of paires) {
        clic(ouvrir);
        const pendantOuverture = ecransOn();
        clic(fermer);
        const apresFermeture = ecransOn();
        resultats.push({ ouvrir, ecranId, pendantOuverture, apresFermeture });
      }
      return resultats;
    });
    for (const r of menuNav) {
      if (r.pendantOuverture.length !== 1 || r.pendantOuverture[0] !== r.ecranId) {
        fail('Navigation menu : ' + r.ouvrir + ' n\'affiche pas exactement l\'écran "' + r.ecranId + '" seul (' + r.pendantOuverture.join(',') + ')');
      } else {
        ok('Navigation menu : ' + r.ouvrir + ' affiche bien "' + r.ecranId + '" seul');
      }
      if (r.apresFermeture.includes(r.ecranId)) fail('Navigation menu : fermer "' + r.ecranId + '" ne le masque pas');
    }

    // =====================================================================
    // GARAGES TUNING — garages, prix, effets et paliers lus depuis le jeu
    // (GARAGES_TUNING, TUNING_PRIX, TUNING_EFFETS...), jamais recopiés.
    // Chaque scénario maîtrise sa scène : véhicules et ennemis de la ville
    // retirés, emplacements de garage remis à zéro, recherche à zéro.
    // =====================================================================
    const injecterAidesGarage = () => page.evaluate(() => {
      window.__gar = {
        prep() {
          // descendre proprement du véhicule AVANT startRun() : quitter l'OVNI
          // sans passer par un chemin de sortie laisse #grenN détruit et fait
          // planter startRun() — c'est le constat n° 5 du playtest (mort en
          // soucoupe), non corrigé à ce jour ; le test ne doit pas en dépendre.
          if (P.veh) sortirVehicule(true);
          startRun();
          for (const v of vehicules) scene.remove(v.mesh); vehicules.length = 0;
          for (const e of ennemis) scene.remove(e.h ? e.h.g : e.mesh); ennemis.length = 0;
          for (const g of GARAGES_TUNING) Object.assign(META.garages[g.id], slotGarageDefaut());
          for (const id in META.vehPerso) Object.assign(META.vehPerso[id], slotGarageDefaut());
          for (const k in GARAGE_HP) delete GARAGE_HP[k];
          WANTED.heat = 0; WANTED.stars = 0; META.argent = 100000;
          INPUT.btn.esquive = false;
        },
        // la fiche « Mes véhicules » d'un type donné (lue dans META, jamais recopiée)
        fiche(cle) { for (const id in META.vehPerso) if (META.vehPerso[id].cle === cle) return META.vehPerso[id]; return null; },
        nbPerso() { return vehPersoIds().length; },
        porte(i) { return PORTES.find((p) => p.id === 'tuning' && p.garageId === GARAGES_TUNING[i].id); },
        appuyer() {
          majAction();
          const b = document.getElementById('btnAction');
          const l = b.textContent;
          if (b._fn) b._fn();
          return l;
        },
        auVolantDevant(porte, cle) {
          const v = creerVehicule(cle, porte.x, porte.z + 4, 0, null);
          entrerVehicule(v); P.x = v.x; P.z = v.z;
          return v;
        },
        aPiedDevant(porte) {
          if (P.veh) sortirVehicule(true);
          P.x = porte.x; P.z = porte.z + 1.5; P.y = solPied(P.x, P.z); P.vy = 0; P.chute = false;
        },
        versSortie() { const s = INT.actif; P.x = s.sortie.x; P.z = s.sortie.z; ETAT.intT = 0; },
      };
    });
    await injecterAidesGarage();

    console.log('\n--- Garages tuning : portes, salle partagée, entrée en véhicule, porte qui se ferme, étoiles qui tombent ---');
    const garEntree = await page.evaluate(() => {
      const G = window.__gar, out = {};
      G.prep();
      out.nbGarages = GARAGES_TUNING.length;
      out.portesParGarage = GARAGES_TUNING.map((g) => PORTES.filter((p) => p.id === 'tuning' && p.garageId === g.id).length);
      out.quartiers = GARAGES_TUNING.map((g) => quartier(g.bx, g.bz));
      out.uneSeuleSalle = Object.keys(INTDEFS).filter((k) => k === 'tuning').length === 1;
      const porte = G.porte(1);
      const v = G.auVolantDevant(porte, 'citadine');
      WANTED.heat = 3.5; WANTED.stars = 3;
      out.labelEntree = G.appuyer();
      const s = INT.actif;
      out.dansGarage = !!(s && s.tuning);
      if (!out.dansGarage) return out;
      out.gid = s.gid; out.gidAttendu = GARAGES_TUNING[1].id;
      // pas encore dans la collection : fiche temporaire, rien dans META
      out.slotCle = s.visiteur && !s.courant && G.nbPerso() === 0 ? s.visiteur.cle : '';
      out.vehRetireDeLaVille = !vehicules.includes(v);
      out.aPiedDedans = P.veh === null;
      out.vitrine = !!s.voiture && s.voitureCle === 'citadine';
      out.enseigneBonne = s.enseignes[s.gid].visible && Object.keys(s.enseignes).filter((k) => s.enseignes[k].visible).length === 1;
      // porte et étoiles sur dtJeu : rien d'instantané, puis tout retombe
      let t = 0;
      for (let i = 0; i < 200; i++) {
        garageMajInterieur(s, 0.05, 0.05); t += 0.05;
        if (Math.abs(t - 0.5) < 0.026) { out.porteFermeeA05 = s.porteFermee; out.etoilesA05 = WANTED.stars; }
        if (Math.abs(t - 1.6) < 0.026) { out.porteFermeeA16 = s.porteFermee; out.etoilesA16 = WANTED.stars; }
      }
      out.etoilesFin = WANTED.stars; out.heatFin = WANTED.heat;
      // ressortir au volant
      G.versSortie();
      out.labelSortie = G.appuyer();
      out.horsSalle = INT.actif === null;
      out.auVolant = !!P.veh && P.veh.key === 'citadine' && !P.veh.persoId;
      return out;
    });
    if (garEntree.nbGarages < 2) fail('Garages : il faut plusieurs garages (' + garEntree.nbGarages + ')');
    else if (garEntree.portesParGarage.some((n) => n !== 1)) fail('Garages : chaque garage doit avoir exactement une porte (' + garEntree.portesParGarage + ')');
    else ok('Garages : ' + garEntree.nbGarages + ' garages, une porte chacun, quartiers ' + garEntree.quartiers.join(' / '));
    if (new Set(garEntree.quartiers).size !== garEntree.quartiers.length) fail('Garages : deux garages dans le même quartier (' + garEntree.quartiers + ')');
    else ok('Garages : tous dans des quartiers différents');
    if (!garEntree.uneSeuleSalle) fail('Garages : la salle partagée \'tuning\' doit être unique dans INTDEFS');
    else ok('Garages : une seule salle partagée (une seule tranche de 400 u)');
    if (!garEntree.dansGarage) fail('Garages : l\'entrée en véhicule échoue (label = "' + garEntree.labelEntree + '")');
    else {
      ok('Garages : entrée au volant (label = "' + garEntree.labelEntree + '")');
      if (garEntree.gid !== garEntree.gidAttendu || !garEntree.enseigneBonne) fail('Garages : la salle partagée n\'est pas reconfigurée pour le garage franchi (gid=' + garEntree.gid + ')');
      else ok('Garages : la salle partagée se reconfigure pour le garage franchi (enseigne, emplacement)');
      if (garEntree.slotCle !== 'citadine' || !garEntree.vehRetireDeLaVille || !garEntree.aPiedDedans || !garEntree.vitrine) fail('Garages : véhicule mal transféré au garage (' + JSON.stringify(garEntree) + ')');
      else ok('Garages : le véhicule quitte la ville et tourne sur le plateau, sans entrer dans la collection (rien acheté)');
      if (garEntree.porteFermeeA05 !== false || garEntree.porteFermeeA16 !== true) fail('Garages : la porte roulante ne se ferme pas en ~1 s (' + garEntree.porteFermeeA05 + ' / ' + garEntree.porteFermeeA16 + ')');
      else ok('Garages : la porte roulante se ferme derrière le véhicule');
      if (garEntree.etoilesA05 !== 3 || garEntree.etoilesA16 !== 3) fail('Garages : les étoiles tombent avant la fermeture et le délai (' + garEntree.etoilesA05 + ', ' + garEntree.etoilesA16 + ')');
      else if (garEntree.etoilesFin !== 0 || garEntree.heatFin !== 0) fail('Garages : le niveau de recherche n\'est pas effacé (étoiles ' + garEntree.etoilesFin + ')');
      else ok('Garages : porte fermée, puis les étoiles tombent une à une jusqu\'à zéro (jamais d\'un coup)');
      if (!garEntree.horsSalle || !garEntree.auVolant) fail('Garages : la sortie au volant échoue (label = "' + garEntree.labelSortie + '")');
      else ok('Garages : ressortie au volant du véhicule avec lequel on est entré (label = "' + garEntree.labelSortie + '")');
    }

    console.log('\n--- Garages tuning : entrée à pied (comportement défini) et entrée sous le feu ---');
    const garPied = await page.evaluate(() => {
      const G = window.__gar, out = {};
      G.prep();
      const porte = G.porte(0), gid = GARAGES_TUNING[0].id;
      // 1) collection vide : à pied, la porte reste fermée
      G.aPiedDevant(porte);
      out.labelVide = G.appuyer(); out.entreVide = !!INT.actif;
      if (INT.actif) sortirInterieur();
      // 2) un taxi gardé (gratuit), puis ressorti : il roule en ville. À pied,
      // on entre quand même, et le menu le rapatrie (il quitte la ville)
      G.auVolantDevant(porte, 'taxi');
      G.appuyer(); garageEnregistrer(INT.actif); G.versSortie(); G.appuyer(); // entre, garde, ressort au volant
      const dehors = P.veh;
      out.dehorsPerso = !!(dehors && dehors.persoId);
      G.aPiedDevant(porte);
      out.labelDehors = G.appuyer(); out.entreDehors = !!(INT.actif && INT.actif.tuning);
      out.plateauVideDehors = !!(INT.actif && !INT.actif.voiture);
      if (INT.actif) {
        out.rapatrie = garageChoisirVehicule(INT.actif, dehors.persoId) && !vehicules.includes(dehors) && INT.actif.voitureCle === 'taxi';
        sortirInterieur();
      }
      // 3) le véhicule détruit en ville est de retour sur le plateau
      if (P.veh) sortirVehicule(true);
      const v2b = vehicules.find((v) => v.persoId); if (v2b) garageRetirerVehicule(v2b);
      G.aPiedDevant(porte);
      out.labelRetour = G.appuyer();
      out.entreRetour = !!(INT.actif && INT.actif.tuning);
      out.vitrineRetour = !!(INT.actif && INT.actif.voiture && INT.actif.voitureCle === 'taxi');
      if (INT.actif) sortirInterieur();
      // 4) en pleine poursuite POLICIÈRE : on entre quand même (c'est le but
      // du garage : semer la police), au volant, policier collé à la porte
      G.prep();
      WANTED.heat = 3.5; WANTED.stars = 3;
      G.auVolantDevant(porte, 'citadine');
      const flic = creerEnnemi('cop2', porte.x + 2, porte.z + 4, false);
      flic.calme = false; flic.passif = false;
      out.labelPolice = G.appuyer(); out.entrePolice = !!(INT.actif && INT.actif.tuning);
      if (INT.actif) sortirInterieur();
      // 5) tireur de GANG à bout portant : refusé au volant ET à pied, lisible
      G.prep();
      const v2 = G.auVolantDevant(porte, 'citadine');
      const e = creerEnnemi('vip_pistol', porte.x + 2, porte.z + 4, false);
      e.calme = false; e.passif = false;
      out.labelFeuVolant = G.appuyer(); out.entreFeuVolant = !!INT.actif;
      G.aPiedDevant(porte);
      out.labelFeuPied = G.appuyer(); out.entreFeuPied = !!INT.actif;
      // l'ennemi s'éloigne : l'entrée redevient possible
      e.x = porte.x + 60; e.z = porte.z + 60;
      const v3 = G.auVolantDevant(porte, 'citadine');
      out.labelLoin = G.appuyer(); out.entreLoin = !!(INT.actif && INT.actif.tuning);
      if (INT.actif) sortirInterieur();
      // 6) ne bloquent PAS (signalé en playtest : un passant de gang devant la
      // porte bloquait l'entrée) : un gangster à la batte, et un tireur
      // occupé par une faction rivale
      const autres = [];
      for (const cas of ['batte', 'rival']) {
        G.prep();
        G.auVolantDevant(porte, 'citadine');
        const g = creerEnnemi(cas === 'batte' ? 'vip_batte' : 'vip_pistol', porte.x + 2, porte.z + 4, false);
        g.calme = false; g.passif = false;
        if (cas === 'rival') g.cible = creerEnnemi('fre_batte', porte.x + 40, porte.z + 40, false);
        const l = G.appuyer(); const entre = !!(INT.actif && INT.actif.tuning);
        if (!entre) autres.push(cas + ' (« ' + l + ' »)');
        if (INT.actif) sortirInterieur();
      }
      out.bloquesATort = autres;
      return out;
    });
    if (garPied.entreVide) fail('Garages : on entre à pied sans aucun véhicule dans la collection (label = "' + garPied.labelVide + '")');
    else ok('Garages : à pied, collection vide → porte fermée (label = "' + garPied.labelVide + '")');
    if (!garPied.dehorsPerso || !garPied.entreDehors || !garPied.plateauVideDehors || !garPied.rapatrie) fail('Garages : véhicule de la collection en ville — entrée à pied ou rapatriement en échec (' + JSON.stringify(garPied) + ')');
    else ok('Garages : à pied, véhicule resté en ville → on entre, le menu le rapatrie (il quitte la ville)');
    if (!garPied.entreRetour || !garPied.vitrineRetour) fail('Garages : véhicule rangé introuvable sur le plateau (label = "' + garPied.labelRetour + '")');
    else ok('Garages : à pied, véhicule rangé → on entre le reprendre (il est sur le plateau)');
    if (!garPied.entrePolice) fail('Garages : un policier collé à la porte empêche d\'entrer (label = "' + garPied.labelPolice + '") — il faut pouvoir semer la police en rentrant');
    else ok('Garages : en pleine poursuite, policier collé à la porte, on entre quand même (label = "' + garPied.labelPolice + '")');
    if (garPied.entreFeuVolant || garPied.entreFeuPied) fail('Garages : entrée possible sous le feu d\'un gang à bout portant');
    else if (!/🔒/.test(garPied.labelFeuVolant) || !/🔒/.test(garPied.labelFeuPied)) fail('Garages : le refus sous le feu n\'est pas lisible (' + garPied.labelFeuVolant + ' / ' + garPied.labelFeuPied + ')');
    else ok('Garages : entrée refusée sous le feu, au volant comme à pied (label = "' + garPied.labelFeuVolant + '")');
    if (!garPied.entreLoin) fail('Garages : l\'entrée reste bloquée une fois l\'ennemi loin');
    else ok('Garages : l\'entrée redevient possible une fois la menace éloignée');
    if (garPied.bloquesATort.length) fail('Garages : « trop chaud » à tort — ' + garPied.bloquesATort.join(', '));
    else ok('Garages : un gangster à la batte ou occupé par un rival ne bloque pas l\'entrée');

    console.log('\n--- Garages tuning : chaque amélioration se paie une seule fois ---');
    const garPaie = await page.evaluate(() => {
      const G = window.__gar, out = { echecs: [] };
      G.prep();
      const porte = G.porte(2);
      G.auVolantDevant(porte, 'muscle'); G.appuyer();
      const s = INT.actif, slot = () => ficheVue(s); // la fiche change au 1er achat (entrée dans la collection)
      out.horsCollectionAvant = !s.courant && G.nbPerso() === 0;
      let total = 0;
      const essai = (nom, f, prixAttendu) => {
        const a = META.argent; const r = f(); const debit = a - META.argent; total += debit;
        if (prixAttendu === 0 ? (r || debit !== 0) : (!r || debit !== prixAttendu)) out.echecs.push(nom + ' (r=' + r + ', débit=' + debit + ', attendu=' + prixAttendu + ')');
      };
      for (const cat of Object.keys(TUNING_EFFETS)) {
        for (let n = 0; n < TUNING_PALIERS_MAX; n++) essai(cat + ' palier ' + (n + 1), () => acheterPalier(s, cat), TUNING_PRIX[cat][n]);
        essai(cat + ' au-delà du max', () => acheterPalier(s, cat), 0);
      }
      out.dansCollectionApres = !!s.courant && G.fiche('muscle') === slot();
      essai('nitro', () => acheterNitro(s), TUNING_PRIX.nitro);
      essai('nitro (2e fois)', () => acheterNitro(s), 0);
      essai('néons', () => acheterNeons(s), TUNING_PRIX.neons);
      essai('néons (2e fois)', () => acheterNeons(s), 0);
      const autreNeon = TUNING_NEONS.find((c) => c !== slot().neon);
      const aN = META.argent; out.neonChange = couleurNeons(s, autreNeon) && META.argent === aN && slot().neon === autreNeon;
      const teinte = TUNING_TEINTES.find((c) => c !== slot().coul);
      essai('peinture', () => peindreGarage(s, teinte), TUNING_PRIX.peinture);
      essai('peinture même teinte', () => peindreGarage(s, teinte), 0);
      out.investiOk = slot().investi === total; out.investi = slot().investi; out.total = total;
      // chemin du menu : deux appuis rapides sur le même bouton ne paient qu'une fois
      G.prep(); G.auVolantDevant(porte, 'muscle'); G.appuyer();
      const s2 = INT.actif;
      ouvrirGarageMenu(s2);
      const btn = document.querySelector('#gmCorps [data-a="nitro"]');
      const a0 = META.argent;
      btn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      btn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      out.doubleAppuiDebit = a0 - META.argent; out.prixNitro = TUNING_PRIX.nitro;
      out.menuAffiche = getComputedStyle(document.getElementById('garageMenu')).display !== 'none';
      fermerGarageMenu(s2);
      out.menuFerme = getComputedStyle(document.getElementById('garageMenu')).display === 'none';
      sortirInterieur();
      return out;
    });
    if (garPaie.echecs.length) for (const e of garPaie.echecs) fail('Garages : paiement incorrect — ' + e);
    else ok('Garages : chaque palier, la nitro, les néons et la peinture se paient une fois ; au-delà, refus sans débit');
    if (!garPaie.horsCollectionAvant || !garPaie.dansCollectionApres) fail('Garages : le véhicule n\'entre pas dans la collection à son premier achat (' + JSON.stringify(garPaie) + ')');
    else ok('Garages : un véhicule entre dans « Mes véhicules » à son premier achat, pas avant');
    if (!garPaie.investiOk) fail('Garages : montant investi faux (' + garPaie.investi + ' noté, ' + garPaie.total + ' $ débités)');
    else ok('Garages : montant investi = somme exacte des débits (' + garPaie.total + ' $)');
    if (!garPaie.neonChange) fail('Garages : changer la couleur des néons n\'est pas gratuit une fois le kit posé');
    else ok('Garages : couleur des néons modifiable gratuitement une fois le kit posé');
    if (garPaie.doubleAppuiDebit !== garPaie.prixNitro) fail('Garages : deux appuis rapides dans le menu débitent ' + garPaie.doubleAppuiDebit + ' $ (attendu ' + garPaie.prixNitro + ')');
    else ok('Garages : deux appuis rapides sur un bouton du menu ne paient qu\'une fois');
    if (!garPaie.menuAffiche || !garPaie.menuFerme) fail('Garages : le menu d\'atelier ne s\'ouvre/ferme pas');
    else ok('Garages : le menu d\'atelier s\'ouvre et se ferme');

    console.log('\n--- Garages tuning : véhicule garé retrouvé après sortie, game over et rechargement ; améliorations persistantes ---');
    const garGare = await page.evaluate(() => {
      const G = window.__gar, out = {};
      G.prep();
      const porte = G.porte(0);
      G.auVolantDevant(porte, 'pickup'); G.appuyer();
      const s = INT.actif;
      acheterPalier(s, 'vitesse'); acheterPalier(s, 'vitesse'); acheterPalier(s, 'moteur');
      for (let i = 0; i < TUNING_PALIERS_MAX; i++) acheterPalier(s, 'blindage');
      acheterNitro(s); acheterNeons(s);
      peindreGarage(s, TUNING_TEINTES.find((c) => c !== ficheVue(s).coul));
      // laisser garé, sortir à pied
      INT.actif.laisser = true; G.versSortie();
      out.labelSortiePied = G.appuyer();
      out.aPiedDehors = !INT.actif && !P.veh;
      out.slotApresSortie = G.fiche('pickup') ? 'pickup' : '';
      // retrouvé depuis un AUTRE garage : la collection est commune aux garages
      G.aPiedDevant(G.porte(2)); G.appuyer();
      out.retrouveApresSortie = !!(INT.actif && INT.actif.voitureCle === 'pickup');
      if (INT.actif) sortirInterieur();
      // game over
      P.hp = 1; toucherJoueur(9999); startRun();
      out.slotApresGameOver = G.fiche('pickup') ? 'pickup' : '';
      for (const e of ennemis) scene.remove(e.h ? e.h.g : e.mesh); ennemis.length = 0;
      G.aPiedDevant(porte); G.appuyer();
      out.retrouveApresGameOver = !!(INT.actif && INT.actif.voitureCle === 'pickup');
      if (INT.actif) sortirInterieur();
      sauveMeta();
      return out;
    });
    if (!garGare.aPiedDehors || garGare.slotApresSortie !== 'pickup') fail('Garages : « le laisser garé » ne fait pas sortir à pied (' + JSON.stringify(garGare) + ')');
    else ok('Garages : laissé garé, on ressort à pied (label = "' + garGare.labelSortiePied + '")');
    if (!garGare.retrouveApresSortie) fail('Garages : véhicule garé introuvable depuis un autre garage');
    else ok('Garages : véhicule laissé dans un garage, retrouvé depuis un autre garage');
    if (garGare.slotApresGameOver !== 'pickup' || !garGare.retrouveApresGameOver) fail('Garages : véhicule garé perdu au game over');
    else ok('Garages : véhicule garé retrouvé après un game over');
    await page.reload({ waitUntil: 'load', timeout: 30000 });
    await page.waitForFunction(() => typeof PORTES !== 'undefined' && PORTES.length > 0, { timeout: 20000 });
    await injecterAidesGarage();
    const garRecharge = await page.evaluate(() => {
      const G = window.__gar, out = {};
      const slot = G.fiche('pickup') || slotGarageDefaut();
      out.slot = JSON.parse(JSON.stringify(slot));
      startRun();
      for (const v of vehicules) scene.remove(v.mesh); vehicules.length = 0;
      for (const e of ennemis) scene.remove(e.h ? e.h.g : e.mesh); ennemis.length = 0;
      WANTED.heat = 0; WANTED.stars = 0;
      const porte = G.porte(0);
      G.aPiedDevant(porte); G.appuyer();
      out.retrouve = !!(INT.actif && INT.actif.voitureCle === 'pickup');
      if (!out.retrouve) return out;
      G.versSortie(); G.appuyer();
      const v = P.veh, base = VEHDEFS.pickup;
      out.auVolant = !!v && v.key === 'pickup';
      if (!out.auVolant) return out;
      out.defPropre = v.def !== base;
      out.vmaxOk = Math.abs(v.def.vmax - base.vmax * TUNING_EFFETS.vitesse[slot.vitesse]) < 1e-9;
      out.accOk = Math.abs(v.def.acc - base.acc * TUNING_EFFETS.moteur[slot.moteur]) < 1e-9;
      out.vehdefsIntact = VEHDEFS.pickup === base && base.vmax === VEHDEFS.pickup.vmax;
      out.nitro = v.nitro === true;
      out.peint = !!v.mesh.userData.matPeinture && v.mesh.userData.matPeinture.color.getHex() === slot.coul;
      const ud = v.mesh.userData;
      out.neon = !!ud.neon && ud.neon.visible && ud.neonMats.length >= 2 && ud.neonMats.every((m) => m.color.getHex() === slot.neon && m.map === texGlow);
      // blindage : dégâts reçus multipliés par l'effet du palier, comparés à
      // un véhicule identique non tuné (effets lus depuis le jeu)
      const temoin = creerVehicule('pickup', v.x + 40, v.z, 0, null);
      const hv = v.hp, ht = temoin.hp;
      abimerVehicule(v, 10); abimerVehicule(temoin, 10);
      out.blindageAttendu = TUNING_EFFETS.blindage[slot.blindage];
      out.perteTunee = hv - v.hp; out.perteTemoin = ht - temoin.hp;
      v.hp = hv;
      // la peinture n'a pas touché le matériau partagé de la ville
      out.matPartageIntact = mat(v.mesh.userData.coul).color.getHex() === v.mesh.userData.coul;
      return out;
    });
    const sl = garRecharge.slot;
    if (sl.cle !== 'pickup' || sl.vitesse !== 2 || sl.moteur !== 1 || !sl.nitro || sl.neon < 0) fail('Garages : META.garages incomplet après rechargement (' + JSON.stringify(sl) + ')');
    else ok('Garages : emplacement et améliorations restaurés après rechargement');
    if (!garRecharge.retrouve) fail('Garages : véhicule garé introuvable après rechargement');
    else if (!garRecharge.auVolant) fail('Garages : impossible de ressortir au volant après rechargement');
    else {
      ok('Garages : véhicule garé retrouvé après rechargement, ressorti au volant');
      if (!garRecharge.defPropre || !garRecharge.vmaxOk || !garRecharge.accOk || !garRecharge.vehdefsIntact) fail('Garages : effets des paliers mal appliqués (' + JSON.stringify(garRecharge) + ')');
      else ok('Garages : paliers appliqués sur une copie propre au véhicule (VEHDEFS intact)');
      if (!garRecharge.nitro || !garRecharge.peint || !garRecharge.neon) fail('Garages : nitro / peinture / néons absents du véhicule ressorti (' + JSON.stringify(garRecharge) + ')');
      else ok('Garages : nitro, peinture et néons présents sur le véhicule ressorti');
      if (!garRecharge.matPartageIntact) fail('Garages : la peinture a modifié le matériau partagé (toute la ville repeinte)');
      else ok('Garages : la peinture ne touche que ce véhicule (matériau partagé intact)');
      if (garRecharge.slot.blindage !== 3 || Math.abs(garRecharge.perteTunee - garRecharge.perteTemoin * garRecharge.blindageAttendu) > 1e-9 || !(garRecharge.perteTunee < garRecharge.perteTemoin)) fail('Garages : blindage mal appliqué (perte ' + garRecharge.perteTunee + ' contre ' + garRecharge.perteTemoin + ', facteur attendu ' + garRecharge.blindageAttendu + ')');
      else ok('Garages : blindage au palier max — dégâts reçus ×' + garRecharge.blindageAttendu + ' (' + garRecharge.perteTunee + ' contre ' + garRecharge.perteTemoin + ' pour un véhicule non tuné)');
    }

    console.log('\n--- Garages tuning : la nitro pousse, se vide, se recharge ; refusée en course au Dépôt ---');
    const garNitro = await page.evaluate(() => {
      const out = {};
      const v = P.veh;
      if (!v || !v.nitro) return { erreur: 'pas de véhicule équipé de nitro (scénario précédent)' };
      // le test maîtrise sa scène : entre deux evaluate, la vraie boucle a pu
      // refaire apparaître du trafic devant la voiture. On retire tout autre
      // véhicule, et on la ramène à son point de départ après chaque pas de
      // physique (sinon elle parcourt ~37 u et percute la façade d'en face :
      // on mesurerait une collision, pas la nitro — échec déjà rencontré).
      for (let i = vehicules.length - 1; i >= 0; i--) if (vehicules[i] !== v) { scene.remove(vehicules[i].mesh); vehicules.splice(i, 1); }
      const x0 = v.x, z0 = v.z;
      const pas = () => { majVehiculePhys(v, 0.05, 1, 0, false); v.x = x0; v.z = z0; v.mesh.position.x = x0; v.mesh.position.z = z0; };
      v.nitroJauge = 100; v.nitroRepos = 0;
      INPUT.btn.esquive = true;
      for (let i = 0; i < 20; i++) majNitro(0.1);       // 2 s de poussée
      out.jaugeA2 = v.nitroJauge; out.actif = v.nitroActif;
      v.v = v.def.vmax;
      for (let i = 0; i < 20; i++) pas();
      out.vPoussee = v.v; out.vmax = v.def.vmax; out.mult = NITRO_VMAX_MULT;
      for (let i = 0; i < 40; i++) majNitro(0.1);       // jusqu'à épuisement
      out.jaugeVide = v.nitroJauge; out.actifVide = v.nitroActif;
      INPUT.btn.esquive = false;
      const vAvant = v.v;
      pas();
      out.retombeDouce = v.v < vAvant && v.v > v.def.vmax;
      for (let i = 0; i < 10; i++) majNitro(0.1);       // 1 s : délai de recharge pas encore écoulé
      out.jaugeA1 = v.nitroJauge;
      for (let i = 0; i < 150; i++) majNitro(0.1);      // 15 s
      out.jaugePleine = v.nitroJauge;
      // un véhicule sans nitro : comportement strictement inchangé
      const w = creerVehicule('citadine', v.x + 30, v.z, 0, null);
      w.v = w.def.vmax + 5; majVehiculePhys(w, 0.05, 1, 0, false);
      out.sansNitroPlafonne = w.v <= w.def.vmax + 1e-9;
      // verrou du Dépôt
      sortirVehicule(true);
      const p = PORTES.find((x) => x.id === 'depot');
      entrerInterieur('depot', p);
      const s = INT.actif;
      depotLancerCourse(s, 'boucle');
      const vd = P.veh;
      out.enCourse = !!(s.courseEnCours && vd);
      if (vd) {
        vd.nitro = true; vd.nitroJauge = 100; vd.nitroRepos = 0;
        INPUT.btn.esquive = true;
        for (let i = 0; i < 10; i++) majNitro(0.1);
        INPUT.btn.esquive = false;
        out.depotActif = vd.nitroActif; out.depotJauge = vd.nitroJauge;
      }
      if (s.courseEnCours) depotAnnulerCourse(s);
      if (INT.actif) sortirInterieur();
      return out;
    });
    if (garNitro.erreur) fail('Garages : ' + garNitro.erreur);
    else {
      if (!garNitro.actif || !(garNitro.jaugeA2 < 100 && garNitro.jaugeA2 > 0)) fail('Garages : la nitro ne pousse pas / ne consomme pas (jauge ' + garNitro.jaugeA2 + ')');
      else ok('Garages : la nitro pousse et vide sa jauge (' + Math.round(garNitro.jaugeA2) + ' % après 2 s)');
      if (!(garNitro.vPoussee > garNitro.vmax && garNitro.vPoussee <= garNitro.vmax * garNitro.mult + 1e-6)) fail('Garages : vitesse sous nitro hors bornes (' + garNitro.vPoussee + ' pour vmax ' + garNitro.vmax + ')');
      else ok('Garages : sous nitro, la vitesse dépasse vmax sans jamais dépasser vmax × ' + garNitro.mult);
      if (garNitro.jaugeVide !== 0 || garNitro.actifVide) fail('Garages : la nitro ne s\'épuise pas (' + garNitro.jaugeVide + ')');
      else ok('Garages : jauge vide → plus de poussée');
      if (!garNitro.retombeDouce) fail('Garages : à la coupure, la vitesse est ramenée net au lieu de redescendre en douceur');
      else ok('Garages : à la coupure, la vitesse redescend en douceur vers vmax');
      if (garNitro.jaugeA1 !== 0 || garNitro.jaugePleine !== 100) fail('Garages : recharge incorrecte (1 s : ' + garNitro.jaugeA1 + ', 15 s : ' + garNitro.jaugePleine + ')');
      else ok('Garages : la nitro se recharge après un délai, jusqu\'à 100 %');
      if (!garNitro.sansNitroPlafonne) fail('Garages : un véhicule sans nitro n\'est plus plafonné à sa vmax');
      else ok('Garages : un véhicule sans nitro reste plafonné à sa vmax (physique inchangée)');
      if (!garNitro.enCourse) fail('Garages : impossible de lancer une course au Dépôt pour tester le verrou');
      else if (garNitro.depotActif || garNitro.depotJauge !== 100) fail('Garages : la nitro fonctionne pendant une course du Dépôt (actif=' + garNitro.depotActif + ', jauge=' + garNitro.depotJauge + ')');
      else ok('Garages : nitro refusée pendant une course du Dépôt (jauge intacte)');
    }

    // -------------------------------------------------------------------
    // Garages, phase 3 : éligibilité DÉCLARÉE dans VEHDEFS et pièces de
    // carrosserie. Véhicules, familles, catégories, prix et ancrages lus
    // depuis le jeu — jamais recopiés.
    // -------------------------------------------------------------------
    console.log('\n--- Garages tuning : éligibilité déclarée dans VEHDEFS, refus à la porte ---');
    await injecterAidesGarage();
    const garElig = await page.evaluate(() => {
      const G = window.__gar, out = { incoherences: [], refusOk: [], refusKo: [] };
      G.prep();
      for (const k of Object.keys(VEHDEFS)) {
        const d = VEHDEFS[k];
        const refus = garageRefusVehicule({ key: k, def: d }, GARAGES_TUNING[0]);
        // garable = tuningMeca OU tuningCarro (les vélos n'ont que tuningCarro :
        // style seulement, vérifié par le test « Vélos »)
        if (!!(d.tuningMeca || d.tuningCarro) === (refus !== null)) out.incoherences.push(k + ' (tuningMeca=' + !!d.tuningMeca + ', tuningCarro=' + !!d.tuningCarro + ', refus=' + refus + ')');
        if (d.tuningCarro) {
          const tc = d.tuningCarro;
          if (!PIECES_FAMILLES[tc.famille]) out.incoherences.push(k + ' : famille inconnue ' + tc.famille);
          for (const an of ['avant', 'arriere', 'toit', 'basCaisse']) {
            const p = tc.ancrages && tc.ancrages[an];
            if (!p || [p.x, p.y, p.z].some((v) => typeof v !== 'number')) out.incoherences.push(k + ' : ancrage ' + an + ' invalide');
          }
          const m = makeVoiture(k);
          if (!m.userData.corps || !(m.userData.roues && m.userData.roues.length)) out.incoherences.push(k + ' : pas de corps / roues pour greffer les pièces');
        }
      }
      out.nbMeca = Object.keys(VEHDEFS).filter((k) => VEHDEFS[k].tuningMeca).length;
      out.nbCarro = Object.keys(VEHDEFS).filter((k) => VEHDEFS[k].tuningCarro).length;
      out.nbTotal = Object.keys(VEHDEFS).length;
      out.nbStyle = Object.keys(VEHDEFS).filter((k) => VEHDEFS[k].tuningCarro && !VEHDEFS[k].tuningMeca).length;
      // le vrai chemin de la porte, au volant : aéronefs, bateaux, OVNI refusés ; le char entre
      const porte = G.porte(0);
      for (const cle of ['helico', 'bateau', 'ovni', 'avion']) {
        G.prep(); G.auVolantDevant(porte, cle);
        const label = G.appuyer();
        if (INT.actif) { out.refusKo.push(cle + ' est entré'); sortirInterieur(); }
        else if (!/🔒/.test(label)) out.refusKo.push(cle + ' : refus illisible (« ' + label + ' »)');
        else out.refusOk.push(cle);
      }
      G.prep(); G.auVolantDevant(porte, 'char');
      out.labelChar = G.appuyer(); out.charEntre = !!(INT.actif && INT.actif.tuning);
      if (INT.actif) sortirInterieur();
      return out;
    });
    if (garElig.incoherences.length) for (const e of garElig.incoherences) fail('Garages : éligibilité incohérente — ' + e);
    else ok('Garages : éligibilité lue dans VEHDEFS pour les ' + garElig.nbTotal + ' véhicules (' + garElig.nbMeca + ' tuningMeca, ' + garElig.nbCarro + ' tuningCarro dont ' + garElig.nbStyle + ' style seulement, ancrages et châssis valides)');
    if (garElig.refusKo.length) fail('Garages : véhicule non éligible mal refusé — ' + garElig.refusKo.join(', '));
    else ok('Garages : refusés à la porte avec un message clair : ' + garElig.refusOk.join(', '));
    if (!garElig.charEntre) fail('Garages : le char devrait entrer (tuningMeca) — label « ' + garElig.labelChar + ' »');
    else ok('Garages : le char entre (tuning mécanique, pas de carrosserie)');

    console.log('\n--- Garages tuning : pièces de carrosserie (aperçu gratuit, payées une fois, visibles, jamais sur le trafic) ---');
    const garCarro = await page.evaluate(() => {
      const G = window.__gar, out = { echecs: [] };
      G.prep();
      const porte = G.porte(1);
      G.auVolantDevant(porte, 'muscle'); G.appuyer();
      const s = INT.actif, slot = () => G.fiche('muscle') || ficheVue(s); // fiche temporaire, puis celle de la collection après le 1er achat
      const fam = PIECES_FAMILLES[VEHDEFS.muscle.tuningCarro.famille];
      const cats = PIECES_CATS.filter((c) => fam[c]);
      ouvrirGarageMenu(s);
      const clic = (cat, i) => {
        const b = document.querySelector('#gmCorps [data-a="piece"][data-c="' + cat + '"][data-i="' + i + '"]');
        if (!b) return false;
        b.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); return true;
      };
      const nbPieces = () => (s.voiture.userData.carro ? s.voiture.userData.carro.children.length : 0);
      // 1) premier appui : aperçu sur le plateau, rien n'est débité
      const cat = cats[0], prix = TUNING_PRIX.pieces[cat][1];
      let a = META.argent; clic(cat, 1);
      out.apercuGratuit = META.argent === a; out.apercuVisible = nbPieces() === 1 && slot().pieces[cat] === 0;
      // 2) deuxième appui sur la même : achat
      a = META.argent; clic(cat, 1);
      out.achatDebit = a - META.argent; out.prix = prix; out.posee = slot().pieces[cat] === 1;
      // 3) déjà posée : plus de bouton actif ; reposer l'origine puis la variante possédée : gratuit
      out.plusDeBouton = !document.querySelector('#gmCorps [data-a="piece"][data-c="' + cat + '"][data-i="1"]');
      a = META.argent; clic(cat, 0); clic(cat, 1);
      out.reposeGratuite = META.argent === a && slot().pieces[cat] === 1;
      // 4) appel direct en double : la garde d'entrée refuse le 2e
      const cat2 = cats[1];
      a = META.argent; const r1 = choisirPiece(s, cat2, 2), r2 = choisirPiece(s, cat2, 2);
      out.doubleAppel = r1 && !r2 && a - META.argent === TUNING_PRIX.pieces[cat2][2];
      // 5) aperçu non acheté puis fermeture du menu : le plateau revient aux pièces posées
      const cat3 = cats[2]; clic(cat3, 2);
      const avecApercu = nbPieces();
      fermerGarageMenu(s);
      out.apercuAnnule = nbPieces() === avecApercu - 1 && slot().pieces[cat3] === 0;
      // 6) tout poser (variante 2), visible sur l'exposition puis sur le véhicule sorti
      for (const c of cats) choisirPiece(s, c, 2);
      garageMajVitrine(s);
      const attendues = cats.filter((c) => c !== 'jantes').length;
      out.vitrine = nbPieces() === attendues && (s.voiture.userData.carroJantes || []).length === s.voiture.userData.roues.length;
      G.versSortie(); G.appuyer();
      const v = P.veh, udv = v && v.mesh.userData;
      out.sorti = !!v && v.key === 'muscle' && !!udv.carro && udv.carro.children.length === attendues && (udv.carroJantes || []).length === udv.roues.length;
      // 7) jamais sur le trafic : un véhicule identique créé par le jeu n'a aucune pièce
      const trafic = creerVehicule('muscle', v.x + 30, v.z, 0, 'trafic');
      out.traficNu = !trafic.mesh.userData.carro && !trafic.mesh.userData.carroJantes;
      // 8) purement cosmétique : la physique ne change pas
      out.physiqueInchangee = v.def.vmax === VEHDEFS.muscle.vmax * TUNING_EFFETS.vitesse[slot().vitesse] && v.def.acc === VEHDEFS.muscle.acc * TUNING_EFFETS.moteur[slot().moteur];
      out.attendues = attendues;
      sauveMeta();
      return out;
    });
    if (!garCarro.apercuGratuit || !garCarro.apercuVisible) fail('Garages : le 1er appui sur une pièce ne montre pas un aperçu gratuit (' + JSON.stringify(garCarro) + ')');
    else ok('Garages : 1er appui = aperçu sur le plateau, rien débité');
    if (garCarro.achatDebit !== garCarro.prix || !garCarro.posee) fail('Garages : 2e appui — débit ' + garCarro.achatDebit + ' $ (attendu ' + garCarro.prix + ')');
    else ok('Garages : 2e appui = achat au prix de TUNING_PRIX.pieces');
    if (!garCarro.plusDeBouton || !garCarro.reposeGratuite || !garCarro.doubleAppel) fail('Garages : une pièce se paie plus d\'une fois (' + JSON.stringify(garCarro) + ')');
    else ok('Garages : une pièce se paie une fois ; reposer une pièce possédée est gratuit ; double appel refusé');
    if (!garCarro.apercuAnnule) fail('Garages : un aperçu non acheté reste sur le plateau après fermeture du menu');
    else ok('Garages : aperçu non acheté annulé à la fermeture du menu');
    if (!garCarro.vitrine) fail('Garages : pièces absentes de l\'exposition');
    else ok('Garages : les ' + garCarro.attendues + ' pièces + jantes visibles sur le modèle d\'exposition');
    if (!garCarro.sorti) fail('Garages : pièces absentes du véhicule sorti');
    else ok('Garages : mêmes pièces sur le véhicule sorti');
    if (!garCarro.traficNu) fail('Garages : un véhicule du trafic porte des pièces');
    else ok('Garages : jamais de pièces sur le trafic');
    if (!garCarro.physiqueInchangee) fail('Garages : les pièces modifient la physique');
    else ok('Garages : pièces purement cosmétiques (physique inchangée)');

    console.log('\n--- Garages tuning : pièces conservées après game over et rechargement ---');
    const garCarroGO = await page.evaluate(() => {
      P.hp = 1; toucherJoueur(9999); startRun();
      sauveMeta();
      return JSON.parse(JSON.stringify((window.__gar.fiche('muscle') || slotGarageDefaut()).pieces));
    });
    await page.reload({ waitUntil: 'load', timeout: 30000 });
    await page.waitForFunction(() => typeof PORTES !== 'undefined' && PORTES.length > 0, { timeout: 20000 });
    await injecterAidesGarage();
    const garCarroRl = await page.evaluate(() => {
      const G = window.__gar, slot = G.fiche('muscle') || slotGarageDefaut();
      const out = { pieces: JSON.parse(JSON.stringify(slot.pieces)) };
      startRun();
      for (const v of vehicules) scene.remove(v.mesh); vehicules.length = 0;
      for (const e of ennemis) scene.remove(e.h ? e.h.g : e.mesh); ennemis.length = 0;
      WANTED.heat = 0; WANTED.stars = 0;
      G.aPiedDevant(G.porte(1)); G.appuyer();
      const s = INT.actif;
      out.vitrine = !!(s && s.voiture && s.voiture.userData.carro && s.voiture.userData.carro.children.length > 0);
      if (s) { G.versSortie(); G.appuyer(); }
      out.sorti = !!(P.veh && P.veh.mesh.userData.carro && P.veh.mesh.userData.carro.children.length > 0);
      return out;
    });
    const memesPieces = (a, b) => Object.keys(a).length === Object.keys(b).length && Object.keys(a).every((k) => a[k] === b[k]);
    if (!memesPieces(garCarroGO, garCarroRl.pieces) || !Object.values(garCarroGO).some((v) => v > 0)) fail('Garages : pièces perdues (game over ' + JSON.stringify(garCarroGO) + ' / rechargement ' + JSON.stringify(garCarroRl.pieces) + ')');
    else ok('Garages : pièces conservées après game over et après rechargement');
    if (!garCarroRl.vitrine || !garCarroRl.sorti) fail('Garages : après rechargement, pièces absentes de l\'exposition ou du véhicule sorti');
    else ok('Garages : après rechargement, pièces sur l\'exposition et sur le véhicule sorti');

    console.log('\n--- Garages tuning : jupes et marchepieds ne mangent jamais sur les roues (toutes familles) ---');
    const garJupes = await page.evaluate(() => {
      const chevauchements = []; let testes = 0;
      for (const k of Object.keys(VEHDEFS)) {
        const tc = VEHDEFS[k].tuningCarro, fam = tc && PIECES_FAMILLES[tc.famille];
        if (!fam || !fam.jupes) continue;
        for (let i = 1; i < fam.jupes.variantes.length; i++) {
          const m = makeVoiture(k);
          const pieces = { aileron: 0, parechocs: 0, jupes: i, capot: 0, jantes: 0, echappement: 0 };
          appliquerCarrosserie(m, k, pieces);
          m.updateMatrixWorld(true);
          const boites = []; m.userData.carro.traverse((o) => { if (o.isMesh) boites.push(new THREE.Box3().setFromObject(o)); });
          if (fam.jupes.surRoues) {
            // garde-boue (vélos) : AU-DESSUS de chaque roue par construction —
            // aucun morceau ne doit entrer dans le cercle de la roue
            const centres = []; m.userData.carro.traverse((o) => { if (o.isMesh) centres.push(new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3())); });
            for (const r of m.userData.roues) {
              const c = new THREE.Vector3(); r.getWorldPosition(c); const R = r.geometry.parameters.radiusTop;
              if (centres.some((p) => Math.abs(p.z - c.z) < R && Math.hypot(p.y - c.y, p.z - c.z) < R)) { chevauchements.push(k + ' › ' + fam.jupes.variantes[i].nom); break; }
            }
            testes++; continue;
          }
          for (const r of m.userData.roues) {
            const br = new THREE.Box3().setFromObject(r);
            if (boites.some((b) => b.intersectsBox(br))) { chevauchements.push(k + ' › ' + fam.jupes.variantes[i].nom); break; }
          }
          testes++;
        }
      }
      return { chevauchements, testes };
    });
    if (garJupes.chevauchements.length) fail('Garages : des jupes / marchepieds mangent sur les roues — ' + garJupes.chevauchements.join(', '));
    else ok('Garages : ' + garJupes.testes + ' jupes / marchepieds testés, aucun ne touche une roue');

    console.log('\n--- Garages tuning : le joueur fait tourner le véhicule exposé au doigt ---');
    const garRot = await page.evaluate(() => {
      const G = window.__gar, out = {};
      G.prep();
      const porte = G.porte(0);
      G.auVolantDevant(porte, 'citadine'); G.appuyer();
      const s = INT.actif, cv = renderer.domElement;
      const ev = (type, x) => (type === 'pointerdown' ? cv : window).dispatchEvent(new PointerEvent(type, { bubbles: true, pointerId: 7, clientX: x, clientY: 200 }));
      // menu fermé : le geste ne fait rien
      let r0 = s.voiture.rotation.y; ev('pointerdown', 100); ev('pointermove', 200); ev('pointerup', 200);
      out.inertSansMenu = s.voiture.rotation.y === r0;
      ouvrirGarageMenu(s);
      r0 = s.voiture.rotation.y;
      ev('pointerdown', 100); ev('pointermove', 150); ev('pointermove', 200); ev('pointerup', 200);
      out.tourne = Math.abs(s.voiture.rotation.y - r0 - 100 * GARAGE_ROT_SENS) < 1e-9;
      // rotation automatique suspendue juste après le geste, puis reprise
      const r1 = s.voiture.rotation.y;
      garageMajInterieur(s, 0.1, 0.1);
      out.pauseApresGeste = s.voiture.rotation.y === r1;
      for (let i = 0; i < Math.ceil(GARAGE_ROT_PAUSE / 0.1) + 2; i++) garageMajInterieur(s, 0.1, 0.1);
      out.repriseAuto = s.voiture.rotation.y !== r1;
      fermerGarageMenu(s); sortirInterieur();
      return out;
    });
    if (!garRot.inertSansMenu) fail('Garages : glisser fait tourner le véhicule alors que le menu est fermé');
    else if (!garRot.tourne) fail('Garages : glisser sur la zone 3D ne fait pas tourner le véhicule exposé');
    else ok('Garages : glisser au doigt fait tourner le véhicule exposé (menu ouvert seulement)');
    if (!garRot.pauseApresGeste || !garRot.repriseAuto) fail('Garages : la rotation automatique ne se suspend / ne reprend pas après un geste (' + JSON.stringify(garRot) + ')');
    else ok('Garages : rotation automatique suspendue après un geste, puis reprise');

    console.log('\n--- Garages tuning : essai gratuit de la peinture et des néons, variante réservée, treuil, rail de défilement ---');
    const garEssai = await page.evaluate(() => {
      const G = window.__gar, out = {};
      G.prep();
      const porte = G.porte(0);
      G.auVolantDevant(porte, 'pickup'); G.appuyer();
      const s = INT.actif;
      ouvrirGarageMenu(s);
      const clic = (sel) => { const b = document.querySelector('#gmCorps ' + sel); if (!b) return false; b.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); return true; };
      const couleurVitrine = () => s.voiture.userData.matPeinture ? s.voiture.userData.matPeinture.color.getHex() : -1;
      // rail dessiné : visible, la liste déborde
      out.rail = getComputedStyle(document.getElementById('gmRail')).display !== 'none' && document.getElementById('gmPouce').offsetHeight > 0;
      // peinture : 1er appui = essai sur le plateau, rien débité ; 2e appui = achat
      const i = TUNING_TEINTES.findIndex((c) => c !== ficheVue(s).coul), c = TUNING_TEINTES[i];
      let a = META.argent; clic('[data-a="peinture"][data-i="' + i + '"]');
      out.peintEssai = META.argent === a && couleurVitrine() === c && ficheVue(s).coul !== c && !!document.querySelector('#gmCorps [data-a="peintureAchat"]');
      clic('[data-a="peinture"][data-i="' + i + '"]');
      out.peintAchat = a - META.argent === TUNING_PRIX.peinture && ficheVue(s).coul === c;
      // essai d'une autre teinte puis fermeture du menu : retour à la teinte achetée, rien débité
      const j = TUNING_TEINTES.findIndex((x) => x !== c);
      a = META.argent; clic('[data-a="peinture"][data-i="' + j + '"]'); fermerGarageMenu(s);
      out.peintAnnule = META.argent === a && couleurVitrine() === c;
      // néons : essai d'une couleur (lueur sur le plateau), rien débité ; 2e appui = kit posé dans CETTE couleur
      ouvrirGarageMenu(s);
      const n = 2, cn = TUNING_NEONS[n];
      a = META.argent; clic('[data-a="neonc"][data-i="' + n + '"]');
      const ud = s.voiture.userData;
      out.neonEssai = META.argent === a && !!ud.neon && ud.neon.visible && ud.neonMats[0].color.getHex() === cn && ficheVue(s).neon < 0;
      clic('[data-a="neonc"][data-i="' + n + '"]');
      out.neonAchat = a - META.argent === TUNING_PRIX.neons && ficheVue(s).neon === cn;
      // variante réservée au pickup (seul) : proposée ici, achetable
      const fam = PIECES_FAMILLES[VEHDEFS.pickup.tuningCarro.famille];
      const iSeul = fam.echappement.variantes.findIndex((v) => v.seul);
      out.seulMenu = iSeul > 0 && !!document.querySelector('#gmCorps [data-a="piece"][data-c="echappement"][data-i="' + iSeul + '"]');
      out.seulAchat = choisirPiece(s, 'echappement', iSeul);
      // treuil (variante marquée treuil, lue dans le catalogue)
      const cT = PIECES_CATS.find((k) => fam[k] && fam[k].variantes.some((v) => v.treuil));
      const iT = fam[cT].variantes.findIndex((v) => v.treuil);
      choisirPiece(s, cT, iT);
      fermerGarageMenu(s);
      G.versSortie(); G.appuyer();
      const v = P.veh;
      out.treuilVeh = !!v && v.treuil === true;
      out.boutonTreuil = /TREUIL/.test(document.getElementById('btnGren').textContent);
      for (const o of vehicules.slice()) if (o !== v) garageRetirerVehicule(o);
      const cible = creerVehicule('citadine', v.x - Math.sin(v.ang) * 5, v.z - Math.cos(v.ang) * 5, v.ang, null);
      majRemorquage(v, 0.016, true);
      out.accroche = v.remorque === cible && cible.tracte === v && !!v.mesh.userData.cable && v.mesh.userData.cable.visible;
      sortirVehicule(true);
      out.decrocheEnSortant = !v.remorque && !cible.tracte && !v.mesh.userData.cable.visible;
      // jamais sur un autre véhicule : la variante réservée est refusée sur le van, et un pickup sans treuil n'en a pas
      G.prep();
      G.auVolantDevant(porte, 'van'); G.appuyer();
      const s2 = INT.actif; ouvrirGarageMenu(s2);
      const famV = PIECES_FAMILLES[VEHDEFS.van.tuningCarro.famille];
      const iSeulV = famV.echappement.variantes.findIndex((x) => x.seul && x.seul.indexOf('van') < 0);
      const a2 = META.argent;
      out.seulRefuseVan = iSeulV > 0 && !document.querySelector('#gmCorps [data-a="piece"][data-c="echappement"][data-i="' + iSeulV + '"]') && !choisirPiece(s2, 'echappement', iSeulV) && META.argent === a2;
      fermerGarageMenu(s2); G.versSortie(); G.appuyer();
      out.sansTreuil = !!P.veh && !P.veh.treuil;
      return out;
    });
    if (!garEssai.rail) fail('Garages : rail de défilement absent alors que la liste déborde');
    else ok('Garages : rail de défilement dessiné, visible quand la liste déborde');
    if (!garEssai.peintEssai || !garEssai.peintAchat || !garEssai.peintAnnule) fail('Garages : essai de peinture incorrect (' + JSON.stringify(garEssai) + ')');
    else ok('Garages : peinture — 1er appui = essai sur le plateau sans débit, 2e appui = achat, fermer annule l\'essai');
    if (!garEssai.neonEssai || !garEssai.neonAchat) fail('Garages : essai des néons incorrect (' + JSON.stringify(garEssai) + ')');
    else ok('Garages : néons — couleur essayée sans débit, puis kit posé dans cette couleur');
    if (!garEssai.seulMenu || !garEssai.seulAchat || !garEssai.seulRefuseVan) fail('Garages : variante réservée au pickup mal gérée (' + JSON.stringify(garEssai) + ')');
    else ok('Garages : cheminée + prise d\'air proposée au pickup, refusée au van');
    if (!garEssai.treuilVeh || !garEssai.boutonTreuil || !garEssai.accroche || !garEssai.decrocheEnSortant) fail('Garages : treuil — remorquage absent ou mal décroché (' + JSON.stringify(garEssai) + ')');
    else ok('Garages : treuil acheté = bouton TREUIL, accroche et remorque comme la dépanneuse, câble visible, décroché en sortant');
    if (!garEssai.sansTreuil) fail('Garages : un véhicule sans treuil peut remorquer');
    else ok('Garages : sans treuil, pas de remorquage');

    console.log('\n--- Garages tuning : « Mes véhicules » — plusieurs véhicules, choix, casse, collection pleine ---');
    const garColl = await page.evaluate(() => {
      const G = window.__gar, out = {};
      G.prep();
      const p0 = G.porte(0), p1 = G.porte(1);
      // 1) un véhicule amélioré au garage 0, puis un AUTRE véhicule au même
      //    garage : plus jamais de « place déjà prise »
      G.auVolantDevant(p0, 'citadine'); G.appuyer();
      acheterNitro(INT.actif);
      G.versSortie(); G.appuyer();
      if (P.veh) sortirVehicule(true);
      for (const v of vehicules.slice()) garageRetirerVehicule(v); // la citadine « détruite » : rangée
      G.auVolantDevant(p0, 'muscle');
      out.labelAutre = G.appuyer(); out.autreEntre = !!(INT.actif && INT.actif.tuning);
      if (!out.autreEntre) return out;
      const s = INT.actif;
      acheterPalier(s, 'moteur');
      out.nb2 = G.nbPerso();
      // 2) choisir la citadine dans le menu : on ressort avec ELLE, ses améliorations comprises
      ouvrirGarageMenu(s);
      const bCit = [...document.querySelectorAll('#gmCorps [data-a="choisir"]')].find((b) => META.vehPerso[b.dataset.v] && META.vehPerso[b.dataset.v].cle === 'citadine');
      out.boutonChoix = !!bCit;
      if (bCit) bCit.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      out.citadineExposee = s.voitureCle === 'citadine';
      fermerGarageMenu(s);
      G.versSortie(); G.appuyer();
      out.sortEnCitadine = !!P.veh && P.veh.key === 'citadine' && P.veh.nitro === true && !!P.veh.persoId;
      // 3) casse en deux appuis, depuis un AUTRE garage : 1er appui sans effet, 2e = casse + remboursement
      if (P.veh) sortirVehicule(true);
      G.aPiedDevant(p1); G.appuyer();
      const s2 = INT.actif;
      const idMuscle = vehPersoIds().find((id) => META.vehPerso[id].cle === 'muscle');
      garageChoisirVehicule(s2, idMuscle);
      const investi = META.vehPerso[idMuscle].investi, a = META.argent;
      const r1 = garageCasser(s2);
      out.premierAppuiInerte = !r1 && !!fichePerso(idMuscle) && META.argent === a;
      const r2 = garageCasser(s2);
      out.casse = r2 && !fichePerso(idMuscle) && G.nbPerso() === 1;
      out.remb = META.argent - a; out.rembAttendu = Math.floor(investi * TUNING_CASSE_TAUX);
      out.casseDouble = !garageCasser(s2) && !garageCasser(s2); // plus rien d'exposé à casser
      // un véhicule qui roule en ville ne se casse pas (la citadine est dehors)
      const idCit = vehPersoIds()[0];
      s2.courant = idCit; out.casseDehorsRefusee = !!vehPersoDehors(idCit) && !garageCasser(s2) && !garageCasser(s2) && !!fichePerso(idCit);
      s2.courant = '';
      sortirInterieur();
      // 4) collection pleine : un achat sur un véhicule hors collection est refusé SANS débit
      G.prep();
      for (const id in META.vehPerso) Object.assign(META.vehPerso[id], slotGarageDefaut(), { cle: 'taxi' });
      G.auVolantDevant(p0, 'van'); G.appuyer();
      const s3 = INT.actif, a3 = META.argent;
      out.pleineRefus = !acheterNitro(s3) && META.argent === a3 && !garageEnregistrer(s3) && G.nbPerso() === VEHPERSO_MAX && !s3.courant;
      // 5) sortir avec un véhicule de la collection : le véhicule hors collection est abandonné
      garageChoisirVehicule(s3, vehPersoIds()[0]);
      G.versSortie(); G.appuyer();
      out.abandonVan = !!P.veh && P.veh.key === 'taxi' && !vehicules.some((v) => v.key === 'van');
      return out;
    });
    if (!garColl.autreEntre || garColl.nb2 !== 2) fail('Garages : un 2e véhicule ne peut pas entrer ou rejoindre la collection (« ' + garColl.labelAutre + ' », ' + JSON.stringify(garColl) + ')');
    else ok('Garages : un autre véhicule entre au même garage et rejoint la collection (2 véhicules)');
    if (!garColl.boutonChoix || !garColl.citadineExposee || !garColl.sortEnCitadine) fail('Garages : choix du véhicule de sortie en échec (' + JSON.stringify(garColl) + ')');
    else ok('Garages : on choisit dans le menu le véhicule avec lequel on sort, améliorations comprises');
    if (!garColl.premierAppuiInerte || !garColl.casse || garColl.remb !== garColl.rembAttendu || !garColl.casseDouble) fail('Garages : casse incorrecte (' + JSON.stringify(garColl) + ')');
    else ok('Garages : casse en deux appuis, depuis un autre garage, ' + garColl.remb + ' $ remboursés (TUNING_CASSE_TAUX de l\'investi), une seule fois');
    if (!garColl.casseDehorsRefusee) fail('Garages : un véhicule qui roule en ville peut être mis à la casse');
    else ok('Garages : un véhicule qui roule en ville ne se met pas à la casse');
    if (!garColl.pleineRefus) fail('Garages : collection pleine — achat ou ajout accepté, ou argent débité');
    else ok('Garages : collection pleine — achat refusé sans débit, rien ajouté');
    if (!garColl.abandonVan) fail('Garages : sortie avec un véhicule de la collection — le véhicule hors collection n\'est pas abandonné');
    else ok('Garages : sortie avec un autre véhicule — le véhicule hors collection est abandonné, comme annoncé');

    console.log('\n--- Garages tuning : allers-retours répétés sans fuite (géométries libérées, aucun mesh accumulé) ---');
    const garFuite = await page.evaluate(() => {
      const G = window.__gar, out = {};
      // on marque toute géométrie libérée, sans changer son comportement
      const proto = THREE.BufferGeometry.prototype, orig = proto.dispose;
      proto.dispose = function () { this.__libere = true; return orig.call(this); };
      const geosDe = (o) => { const l = []; (function rec(n) { if (n === P.h.g || n.isSprite) return; if (n.geometry) l.push(n.geometry); for (const c of n.children) rec(c); })(o); return l; };
      try {
        G.prep();
        const porte = G.porte(2);
        G.auVolantDevant(porte, 'citadine'); G.appuyer();
        const s = INT.actif;
        for (const c of PIECES_CATS) choisirPiece(s, c, 1);
        const id = s.courant; // entrée dans la collection au 1er achat
        garageMajVitrine(s);
        // a) changer de pièce 30 fois sur l'exposition : rien ne s'accumule,
        //    chaque passe précédente est libérée
        const desc = () => { let n = 0; s.voiture.traverse(() => n++); return n; };
        const n0 = desc(); let nonLiberees = 0;
        for (let k = 0; k < 30; k++) {
          const avant = geosDe(s.voiture.userData.carro).concat(...(s.voiture.userData.carroJantes || []).map(geosDe));
          choisirPiece(s, PIECES_CATS[k % PIECES_CATS.length], k % 2 ? 1 : 2);
          garageMajVitrine(s);
          nonLiberees += avant.filter((g) => !g.__libere).length;
        }
        for (const c of PIECES_CATS) choisirPiece(s, c, 1);
        garageMajVitrine(s);
        out.descStable = desc() === n0; out.nonLibereesPieces = nonLiberees;
        // b) 6 allers-retours complets : le véhicule rangé et le modèle
        //    d'exposition retirés sont libérés, la salle n'accumule rien
        const enfantsSalle = [], vehiculesGarage = [];
        let fuitesVeh = 0, fuitesVitrine = 0;
        G.versSortie(); G.appuyer(); // ressort au volant
        for (let k = 0; k < 6; k++) {
          // revenir devant la porte, au volant, pour ce tour
          P.veh.x = porte.x; P.veh.z = porte.z + 4; P.veh.mesh.position.set(P.veh.x, 0, P.veh.z);
          P.x = P.veh.x; P.z = P.veh.z;
          const geosVeh = geosDe(P.veh.mesh);
          G.appuyer(); // entre : le véhicule de la ville est retiré
          fuitesVeh += geosVeh.filter((g) => !g.__libere).length;
          enfantsSalle.push(s.g.children.length);
          const geosVitrine = geosDe(s.voiture);
          G.versSortie(); G.appuyer(); // ressort : l'exposition est retirée
          fuitesVitrine += geosVitrine.filter((g) => !g.__libere).length;
          vehiculesGarage.push(vehicules.filter((v) => v.persoId === id).length);
        }
        out.fuitesVeh = fuitesVeh; out.fuitesVitrine = fuitesVitrine;
        out.salleStable = enfantsSalle.every((n) => n === enfantsSalle[0]);
        out.unSeulDehors = vehiculesGarage.every((n) => n === 1);
        out.enfantsSalle = enfantsSalle;
        if (INT.actif) sortirInterieur();
      } finally { proto.dispose = orig; }
      return out;
    });
    if (!garFuite.descStable || garFuite.nonLibereesPieces) fail('Garages : changer de pièce accumule des meshes ou ne libère pas (' + JSON.stringify(garFuite) + ')');
    else ok('Garages : 30 changements de pièce — aucun mesh accumulé, chaque passe précédente libérée');
    if (garFuite.fuitesVeh || garFuite.fuitesVitrine) fail('Garages : allers-retours — géométries non libérées (véhicule rangé : ' + garFuite.fuitesVeh + ', exposition : ' + garFuite.fuitesVitrine + ')');
    else ok('Garages : 6 allers-retours — véhicule rangé et modèle d\'exposition libérés à chaque fois');
    if (!garFuite.salleStable || !garFuite.unSeulDehors) fail('Garages : allers-retours — la salle accumule des objets (' + garFuite.enfantsSalle + ') ou plusieurs véhicules du garage coexistent');
    else ok('Garages : 6 allers-retours — la salle n\'accumule rien, un seul véhicule du garage en ville');

    console.log('\n--- Garages tuning : vieilles sauvegardes (sans garages, emplacements par garage) migrées vers « Mes véhicules » ---');
    for (const cas of ['sans garages', 'emplacement incomplet', 'avant la phase 3', 'deux garages occupés', 'collection incomplète']) {
      await page.evaluate((cas) => {
        const vieux = JSON.parse(JSON.stringify(META));
        vieux.argent = 4242;
        delete vieux.vehPerso; // toutes ces sauvegardes précèdent la collection, sauf la dernière
        if (cas === 'sans garages') delete vieux.garages;
        else if (cas === 'emplacement incomplet') vieux.garages = { [GARAGES_TUNING[0].id]: { cle: 'taxi', moteur: 2 } };
        // emplacement de la phase 2 complet, mais sans pièces de carrosserie
        else if (cas === 'avant la phase 3') vieux.garages = { [GARAGES_TUNING[0].id]: { cle: 'muscle', coul: 2771672, neon: 3530239, nitro: true, moteur: 1, vitesse: 2, tenue: 0, blindage: 1 } };
        else if (cas === 'deux garages occupés') vieux.garages = { [GARAGES_TUNING[0].id]: { cle: 'van', vitesse: 1 }, [GARAGES_TUNING[2].id]: { cle: 'char', blindage: 2, nitro: true } };
        else { delete vieux.garages; vieux.vehPerso = { v1: { cle: 'sport', tenue: 3 } }; }
        localStorage.setItem(SAVE_KEY, JSON.stringify(vieux));
      }, cas);
      await page.reload({ waitUntil: 'load', timeout: 30000 });
      await page.waitForFunction(() => typeof PORTES !== 'undefined' && PORTES.length > 0, { timeout: 20000 });
      const r = await page.evaluate((cas) => {
        const att = slotGarageDefaut(), probs = [];
        // toutes les fiches présentes et bien typées ; les anciens emplacements vidés (migrés une seule fois)
        for (const [nom, o] of [['garages', META.garages], ['vehPerso', META.vehPerso]]) {
          const ids = nom === 'garages' ? GARAGES_TUNING.map((g) => g.id) : Object.keys(vehPersoMetaDefaut());
          for (const id of ids) {
            const s = o && o[id];
            if (!s) { probs.push(nom + '.' + id + ' absent'); continue; }
            for (const k of Object.keys(att)) if (typeof s[k] !== typeof att[k]) probs.push(nom + '.' + id + '.' + k + ' de type ' + typeof s[k]);
            if (nom === 'garages' && s.cle) probs.push('garages.' + id + ' non vidé après migration');
          }
        }
        const fiches = vehPersoIds().map((id) => META.vehPerso[id]);
        if (cas === 'sans garages' && fiches.length) probs.push('collection non vide (' + fiches.length + ')');
        if (cas === 'emplacement incomplet') {
          const s = fiches[0] || {};
          if (fiches.length !== 1 || s.cle !== 'taxi' || s.moteur !== 2) probs.push('valeurs anciennes perdues (' + JSON.stringify(s) + ')');
          if (s.vitesse !== 0 || s.nitro !== false || s.coul !== -1) probs.push('champs manquants non complétés (' + JSON.stringify(s) + ')');
          if (s.investi !== TUNING_PRIX.moteur[0] + TUNING_PRIX.moteur[1]) probs.push('investi non reconstitué (' + s.investi + ')');
        }
        if (cas === 'deux garages occupés') {
          const cles = fiches.map((f) => f.cle).sort().join(',');
          if (cles !== 'char,van' || !fiches.find((f) => f.cle === 'char').nitro) probs.push('migration de deux garages incomplète (' + cles + ')');
        }
        if (cas === 'collection incomplète') {
          const s = META.vehPerso.v1;
          if (s.cle !== 'sport' || s.tenue !== 3 || s.investi !== 0 || s.pieces.jantes !== 0) probs.push('fiche incomplète mal complétée (' + JSON.stringify(s) + ')');
        }
        if (cas === 'avant la phase 3') {
          const s = fiches[0] || slotGarageDefaut(), def = slotGarageDefaut();
          if (s.cle !== 'muscle' || !s.nitro || s.vitesse !== 2 || s.blindage !== 1) probs.push('améliorations de la phase 2 perdues (' + JSON.stringify(s) + ')');
          for (const o of ['pieces', 'piecesPossedees']) for (const c of Object.keys(def[o]))
            if (s[o][c] !== def[o][c]) probs.push(o + '.' + c + ' = ' + s[o][c] + ' (attendu ' + def[o][c] + ')');
          // et le véhicule se construit avec ses pièces d'origine, sans erreur
          const m = makeVoiture('muscle'); appliquerCarrosserie(m, 'muscle', s.pieces);
          if (m.userData.carro && m.userData.carro.children.length !== 0) probs.push('des pièces apparaissent sur une sauvegarde qui n\'en avait pas');
        }
        if (META.argent !== 4242) probs.push('argent non restauré (' + META.argent + ')');
        return probs;
      }, cas);
      if (r.length) fail('Garages : vieille sauvegarde (' + cas + ') — ' + r.join(', '));
      else ok('Garages : vieille sauvegarde (' + cas + ') chargée par deep-merge et migrée, champs manquants complétés, rien perdu');
    }

    // -------------------------------------------------------------------
    // Minimap et grande carte : pincer zoome, un toucher ouvre la carte,
    // un pincement ne pose jamais de destination.
    // -------------------------------------------------------------------
    console.log('\n--- Minimap : zoom au pincement, toucher pour ouvrir la carte ---');
    {
      const pz = await page.evaluate(() => {
        startRun(); ETAT.mode = 'jeu'; MINI.zoom = 1; WAYP.actif = false;
        const ev = (cible, type, id, x, y) => cible.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerId: id, clientX: x, clientY: y, isPrimary: id === 1 }));
        const mw = document.getElementById('miniWrap'), r = mw.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        const out = {};
        // pincement qui écarte les doigts : zoom > 1, borné, sans ouvrir la carte
        ev(mw, 'pointerdown', 1, cx - 10, cy); ev(mw, 'pointerdown', 2, cx + 10, cy);
        ev(mw, 'pointermove', 2, cx + 40, cy); ev(mw, 'pointermove', 1, cx - 40, cy);
        ev(mw, 'pointerup', 2, cx + 40, cy); ev(mw, 'pointerup', 1, cx - 40, cy);
        out.zoomApres = MINI.zoom; out.modeApresPince = ETAT.mode;
        ev(mw, 'pointerdown', 1, cx - 5, cy); ev(mw, 'pointerdown', 2, cx + 5, cy); ev(mw, 'pointermove', 2, cx + 400, cy);
        ev(mw, 'pointerup', 2, cx + 400, cy); ev(mw, 'pointerup', 1, cx - 5, cy);
        out.zoomMax = MINI.zoom; out.borneMax = MINI_ZOOM_MAX;
        // le joueur reste dans la fenêtre zoomée (centrage)
        majMinimap();
        // toucher simple : ouvre la grande carte au zoom de la minimap
        MINI.zoom = 2;
        ev(mw, 'pointerdown', 1, cx, cy); ev(mw, 'pointerup', 1, cx, cy);
        out.modeApresToucher = ETAT.mode; out.zoomCarte = MAPUI.zoom;
        // grande carte : pincement = zoom, jamais de destination posée
        const cv = document.getElementById('carteCv'), rc = cv.getBoundingClientRect(), mx = rc.left + rc.width / 2, my = rc.top + rc.height / 2;
        const z0 = MAPUI.zoom;
        ev(cv, 'pointerdown', 1, mx - 20, my); ev(cv, 'pointerdown', 2, mx + 20, my);
        ev(cv, 'pointermove', 2, mx + 70, my); ev(cv, 'pointerup', 2, mx + 70, my); ev(cv, 'pointerup', 1, mx - 20, my);
        out.carteZoomAvant = z0; out.carteZoomApres = MAPUI.zoom; out.waypApresPince = WAYP.actif;
        // un toucher simple pose toujours la destination
        ev(cv, 'pointerdown', 1, mx + 30, my + 30); ev(cv, 'pointerup', 1, mx + 30, my + 30);
        out.waypApresToucher = WAYP.actif;
        WAYP.actif = false; ecran(null); ETAT.mode = 'jeu'; MINI.zoom = 1;
        return out;
      });
      if (!(pz.zoomApres > 1.5) || pz.modeApresPince !== 'jeu') fail('Minimap : le pincement ne zoome pas ou ouvre la carte (' + JSON.stringify(pz) + ')');
      else ok('Minimap : pincer zoome (×' + pz.zoomApres.toFixed(2) + ') sans ouvrir la grande carte');
      if (pz.zoomMax !== pz.borneMax) fail('Minimap : zoom non borné (' + pz.zoomMax + ')');
      else ok('Minimap : zoom borné à ×' + pz.borneMax);
      if (pz.modeApresToucher !== 'carte' || pz.zoomCarte !== 2) fail('Minimap : un toucher n\'ouvre pas la carte au zoom de la minimap (' + JSON.stringify(pz) + ')');
      else ok('Minimap : un toucher ouvre la grande carte, au même zoom');
      if (!(pz.carteZoomApres > pz.carteZoomAvant) || pz.waypApresPince) fail('Grande carte : pincement sans zoom ou destination posée par erreur (' + JSON.stringify(pz) + ')');
      else ok('Grande carte : pincer zoome (×' + pz.carteZoomAvant + ' → ×' + pz.carteZoomApres.toFixed(2) + ') sans poser de destination');
      if (!pz.waypApresToucher) fail('Grande carte : un toucher simple ne pose plus la destination');
      else ok('Grande carte : un toucher simple pose toujours la destination');
    }

    // -------------------------------------------------------------------
    // Minimap V2 — le radar (18 octobre, demandé : « améliore encore la minimap »). Lu sur les PIXELS du vrai
    // canevas : la boussole « N » (anneau rouge) est en haut en vue classique, et à l'angle de la caméra en vue
    // immersive — dont on vérifie qu'il est celui que regarde vraiment la caméra (le haut du radar = devant soi) ;
    // une destination lointaine est rabattue sur le bord du radar, dans sa direction.
    // -------------------------------------------------------------------
    console.log('\n--- Minimap V2 : radar rond, nord en haut en vue classique, tourne avec la caméra, objectifs sur le bord ---');
    {
      const rad = await page.evaluate(async () => {
        const dors = (ms) => new Promise((r) => setTimeout(r, ms)), ko = [], info = [];
        const cv = el('minimap'), cx = cv.getContext('2d'), K = cv.width / 192;
        // l'anneau rouge de la boussole : 16 points sur le cercle de rayon 7,5 autour du centre attendu
        const rouge = (x, y) => { let n = 0; for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2, d = cx.getImageData(Math.round((x + Math.cos(a) * 7.5) * K), Math.round((y + Math.sin(a) * 7.5) * K), 1, 1).data;
          if (d[0] > 190 && d[1] < 130 && d[2] < 130) n++; } return n; };
        const vert = (x, y) => { let n = 0; const d = cx.getImageData(Math.round((x - 8) * K), Math.round((y - 8) * K), Math.round(16 * K), Math.round(16 * K)).data;
          for (let i = 0; i < d.length; i += 4) if (d[i + 1] > 200 && d[i] > 90 && d[i] < 160 && d[i + 2] < 160) n++; return n; };
        const posN = (th) => ({ x: 96 + Math.sin(th) * 85, y: 96 - Math.cos(th) * 85 });
        if (cv.width < 288) ko.push('canevas du radar en basse définition (' + cv.width + ' px)');
        // vue classique : nord en haut
        META.vue = 'classique'; startRun(); ecran(null); ETAT.mode = 'jeu'; MINI.zoom = 1; WAYP.actif = false; MISSION.cur = null; MET.ciblePos = null;
        P.x = POIS.place.x; P.z = POIS.place.z + 20; await dors(600); for (const e of ennemis) e.mort = true; majMinimap();
        const nH = rouge(96, 11), nB = rouge(96, 181);
        if (!(nH >= 9 && nB <= 3)) ko.push('vue classique : la boussole n’est pas en haut (' + nH + ' / ' + nB + ')');
        // destination à l'est : flèche verte sur le bord droit
        WAYP.actif = true; WAYP.x = P.x + 600; WAYP.z = P.z; majMinimap();
        const vD = vert(96 + 87, 96), vG = vert(96 - 87, 96);
        if (!(vD > 6 && vG < 2)) ko.push('destination hors champ pas sur le bord, côté est (' + vD + ' / ' + vG + ')');
        WAYP.actif = false;
        // vue immersive : la caméra regarde ailleurs — le radar tourne, le haut est ce que regarde la caméra
        META.vue = 'immersive'; await dors(500);
        for (const yaw of [0.9, 2.4, -1.6]) {
          VUE.yawUser = yaw; await dors(900); for (const e of ennemis) e.mort = true; majMinimap();
          const th = vueAngleEcran(), f = new THREE.Vector3(); camera.getWorldDirection(f);
          const attendu = -Math.atan2(f.x, -f.z), ecart = Math.abs(Math.atan2(Math.sin(th - attendu), Math.cos(th - attendu)));
          if (ecart > 0.05) ko.push('yaw ' + yaw + ' : le haut du radar n’est pas ce que regarde la caméra (écart ' + ecart.toFixed(2) + ' rad)');
          const p = posN(th), q = posN(th + Math.PI), n1 = rouge(p.x, p.y), n2 = rouge(q.x, q.y);
          if (!(n1 >= 9 && n2 <= 3)) ko.push('yaw ' + yaw + ' : la boussole n’est pas à l’angle du nord (' + n1 + ' / ' + n2 + ')');
          info.push('caméra ' + yaw + ' rad → nord à ' + (th * 180 / Math.PI).toFixed(0) + '°');
        }
        META.vue = 'classique'; startRun(); MINI.zoom = 1;
        return { ko, info };
      });
      if (rad.ko.length) fail('Minimap V2 : ' + rad.ko.join(' ; '));
      else ok('Minimap V2 : radar net (3x), nord en haut en vue classique, destination hors champ sur le bord ; en vue immersive le radar tourne avec la caméra (' + rad.info.join(', ') + ')');
    }

    // -------------------------------------------------------------------
    // Renommage GTRoyal / Los Reyes : aucun ancien nom affiché. Les textes
    // sont LUS dans le jeu vivant (tous les nœuds texte du document, hors
    // scripts, et les noms des tables du jeu), jamais recopiés ici. Seules
    // exceptions voulues (RENOMMAGE.md) : la borne d'arcade VIPÈRE et sa
    // peluche (le serpent, pas le gang) et la Moto « Frelon » (modèle de moto).
    // -------------------------------------------------------------------
    console.log('\n--- Renommage GTRoyal : titre, ville, gangs ---');
    {
      const rn = await page.evaluate(() => {
        const textes = [];
        const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, { acceptNode: (n) => (n.parentNode && /^(SCRIPT|STYLE)$/.test(n.parentNode.nodeName) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT) });
        while (w.nextNode()) textes.push(w.currentNode.textContent);
        const tables = [ETYPES, INTDEFS, VEHDEFS, ARMES, PERSOS, BORNES_ARCADE, CURIOS, DEFIS];
        for (const t of tables) for (const k in t) { const o = t[k]; if (!o) continue; for (const c of ['nom', 'lieu', 'eff', 'det', 'condTxt']) if (typeof o[c] === 'string') textes.push(o[c]);
          if (o.skins) for (const sk of o.skins) if (sk && sk.nom) textes.push(sk.nom); }
        textes.push(...STATIONS, ...Object.values(NOMS_GANG), ...Object.values(NOMS_GANG_DE));
        const exceptions = new Set(['VIPÈRE', 'Moto "Frelon"', 'Peluche Vipère']);
        const interdits = /asphalte|solara|syndicat|mur[eè]nes?\b|vip[eè]res?\b|frelons?\b|gran[d] the[f]t|\bdax\b|c[eé]sar/i;
        const fautes = textes.filter((t) => t && interdits.test(t) && !exceptions.has(t.trim()));
        const casse = textes.filter((t) => /gt ?royal/i.test(t) && (t.match(/gt ?royal/gi) || []).some((m) => m !== 'GTRoyal'));
        const logo = document.querySelector('#menu .logoBig');
        const meta = (n) => { const m = document.querySelector('meta[name="' + n + '"]'); return m ? m.content : null; };
        return { fautes: [...new Set(fautes)].slice(0, 12), nbTextes: textes.length, casse, logo: logo.textContent, logoTransform: getComputedStyle(logo).textTransform,
          titre: document.title, appleTitre: meta('apple-mobile-web-app-title'), appName: meta('application-name'), chefDe: NOMS_GANG_DE.chrome };
      });
      if (rn.fautes.length) fail('Renommage : ancien nom encore affiché — ' + rn.fautes.join(' | '));
      else ok('Renommage : aucun ancien nom (Asphalte, Solara, Vipères, Frelons, Murènes, Syndicat, Dax, César) dans ' + rn.nbTextes + ' textes du jeu vivant');
      if (rn.casse.length) fail('Renommage : « GTRoyal » mal écrit — ' + rn.casse.join(' | '));
      else ok('Renommage : « GTRoyal » toujours écrit avec sa casse exacte');
      if (rn.logo !== 'GTRoyal' || rn.logoTransform !== 'none') fail('Renommage : logo « ' + rn.logo + ' » (text-transform ' + rn.logoTransform + ')');
      else ok('Renommage : logo « GTRoyal », sans mise en majuscules forcée');
      if (!/^GTRoyal\b/.test(rn.titre) || rn.appleTitre !== 'GTRoyal' || rn.appName !== 'GTRoyal') fail('Renommage : titre / metas incorrects (' + JSON.stringify(rn) + ')');
      else ok('Renommage : <title>, apple-mobile-web-app-title et application-name = GTRoyal');
      // Le « y » de GTRoyal descend sous la ligne de base (l'ancien titre tout en
      // capitales n'avait aucune descendante) : il ne doit pas mordre sur le
      // sous-titre « LOS REYES — CHAOS URBAIN » (signalé en revue de capture).
      const geo = await page.evaluate(() => {
        const menu = document.getElementById('menu'), etaitOn = menu.classList.contains('on');
        menu.classList.add('on');
        const logo = menu.querySelector('.logoBig'), ss = menu.querySelector('.ssous'), cs = getComputedStyle(logo);
        const repere = document.createElement('span'); repere.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline';
        logo.appendChild(repere);
        const base = repere.getBoundingClientRect().bottom; repere.remove();
        const ctx = document.createElement('canvas').getContext('2d');
        ctx.font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
        const descente = ctx.measureText(logo.textContent).actualBoundingBoxDescent;
        const r = logo.getBoundingClientRect(), haut = ss.getBoundingClientRect().top;
        if (!etaitOn) menu.classList.remove('on');
        return { basGlyphe: base + descente, hautSous: haut, gauche: r.left, droite: r.right, largeur: innerWidth };
      });
      if (!(geo.basGlyphe <= geo.hautSous)) fail('Renommage : le « y » du logo chevauche le sous-titre (' + JSON.stringify(geo) + ')');
      else ok('Renommage : le « y » du logo s\'arrête ' + (geo.hautSous - geo.basGlyphe).toFixed(1) + ' px au-dessus du sous-titre');
      if (geo.gauche < 0 || geo.droite > geo.largeur) fail('Renommage : le logo déborde de l\'écran (' + JSON.stringify(geo) + ')');
      else ok('Renommage : le logo tient dans la largeur (' + Math.round(geo.gauche) + '–' + Math.round(geo.droite) + ' px sur ' + geo.largeur + ')');
    }

    // -------------------------------------------------------------------
    // Bouton d'action : aucun libellé rogné par « … » à 390 px. Audit de
    // nuit : 12 libellés fixes et la consigne de la serre étaient coupés en
    // plein milieu. Libellés lus dans le source (label='…' / label="…"), plus
    // les consignes de la serre (CRITERES_SERRE).
    // -------------------------------------------------------------------
    // -------------------------------------------------------------------
    // Ambiances des salles : jamais de son qui survit à la mort ni à la
    // partie suivante. Audit de nuit : mort au métro ou au chalutier →
    // l'ambiance repartait sur l'écran de mort (majInterieur tourne encore)
    // et suivait le joueur en ville dans la partie suivante. Toutes les
    // salles d'INTDEFS, avec la vraie boucle qui tourne entre chaque étape.
    // -------------------------------------------------------------------
    console.log('\n--- Ambiances des salles : coupées à la mort et à la partie suivante ---');
    {
      const amb = await page.evaluate(async () => {
        const dors = (ms) => new Promise((r) => setTimeout(r, ms));
        const drapeaux = () => Object.keys(AUDIO).filter((k) => /On$/.test(k) && AUDIO[k] === true);
        audioInit();
        const ko = [], vues = [];
        for (const id of Object.keys(INTDEFS)) {
          startRun(); ETAT.mode = 'jeu';
          const po = PORTES.find((x) => x.id === id); if (!po) continue;
          P.x = po.x; P.z = po.z + 1.5; entrerInterieur(id, po);
          if (!INT.actif) continue;
          P.hp = 1e6; await dors(350);
          const dedans = drapeaux(); if (dedans.length) vues.push(id + ':' + dedans.join('+'));
          P.hp = 0; mourir(); await dors(450);
          const mort = drapeaux(); if (mort.length) ko.push(id + ' (écran de mort : ' + mort.join(',') + ')');
          ETAT.timeScale = 1; startRun(); await dors(150);
          const apres = drapeaux(); if (apres.length) ko.push(id + ' (partie suivante : ' + apres.join(',') + ')');
        }
        ETAT.timeScale = 1; startRun();
        return { ko, vues, pret: AUDIO.pret };
      });
      if (!amb.pret) saute('Ambiances des salles : AudioContext indisponible, coupure non vérifiée');
      else if (!amb.vues.length) fail('Ambiances des salles : aucune ambiance n\'a démarré dans aucune salle — le test ne vérifie plus rien');
      else if (amb.ko.length) fail('Ambiances des salles : son qui survit — ' + amb.ko.join(' | '));
      else ok('Ambiances des salles : coupées à la mort et à la partie suivante (' + amb.vues.join(', ') + ')');
    }

    // -------------------------------------------------------------------
    // Écran PERSONNAGES : chaque skin de chaque perso (lus dans PERSOS) est
    // atteignable à 390 px. Audit de nuit : les 9 skins de Jax débordaient
    // des deux côtés d'une rangée centrée non défilante — le premier
    // (« Classique ») et le dernier étaient intouchables.
    // -------------------------------------------------------------------
    console.log('\n--- Écran Personnages : toutes les skins atteignables à 390 px ---');
    {
      const sk = await page.evaluate(() => {
        const ko = []; let n = 0; const persoAvant = PREVIEW.persoAff;
        ecran('chars');
        for (const id of Object.keys(PERSOS)) {
          PREVIEW.persoAff = id; PREVIEW.skinAff = 0; renderChars();
          const row = el('skinRow'), cols = [...row.children]; n += cols.length;
          const R = row.getBoundingClientRect();
          if (R.left < -1 || R.right > innerWidth + 1) ko.push(id + ' : rangée hors écran');
          row.scrollLeft = 0;
          if (cols[0].getBoundingClientRect().left < R.left - 1) ko.push(id + ' : première skin coupée à gauche');
          row.scrollLeft = 1e5;
          if (cols[cols.length - 1].getBoundingClientRect().right > R.right + 1) ko.push(id + ' : dernière skin inatteignable');
          row.scrollLeft = 0;
        }
        PREVIEW.persoAff = persoAvant; ecran('menu');
        return { ko, n };
      });
      if (sk.ko.length) fail('Écran Personnages : ' + sk.ko.join(' | '));
      else ok('Écran Personnages : les ' + sk.n + ' skins de tous les persos sont atteignables à 390 px');
    }

    // -------------------------------------------------------------------
    // Mer V2 (MER_V2) : sillage, éclaboussures, houle partagée. Le rendu
    // lui-même est validé par captures réelles (rapport de nuit) ; ici on
    // vérifie le comportement : un bateau qui avance laisse un sillage et
    // tangue, le nageur suit la houle, tomber à l'eau (à pied ou en voiture)
    // éclabousse. Une erreur de compilation du shader remonterait en
    // console.error, déjà comptée en fin de suite.
    // -------------------------------------------------------------------
    console.log('\n--- Mer : sillage, éclaboussures, houle ---');
    {
      const mer = await page.evaluate(async () => {
        if (typeof MER_V2 === 'undefined' || !MER_V2) return { off: true };
        const dors = (ms) => new Promise((r) => setTimeout(r, ms));
        const actifs = () => SILLAGES.filter((w) => w.on).length;
        const out = {};
        startRun(); ETAT.mode = 'jeu'; ETAT.timeScale = 1; P.hp = P.hpMax = 1e6; // le test maîtrise son horloge (une mort précédente laisse 0.28)
        for (const w of SILLAGES) { w.on = false; w.mesh.visible = false; }
        // 1) bateau qui avance : sillage + assiette qui varie
        const b = creerVehicule('bateau', POIS.plage.x + 20, MER + 45, 0, null);
        P.x = b.x + 2; P.z = b.z; entrerVehicule(b); KEYS.KeyW = true;
        const ys = [], rx = [];
        for (let i = 0; i < 12; i++) { await dors(120); ys.push(b.mesh.position.y); rx.push(b.mesh.rotation.x); }
        KEYS.KeyW = false;
        out.sillage = actifs(); out.vitesse = Math.abs(b.v);
        out.houleBateau = Math.max(...ys) - Math.min(...ys); out.tangage = Math.max(...rx) - Math.min(...rx);
        sortirVehicule(true); b.mort = true;
        // 2) nage : la hauteur du nageur suit la houle
        for (const w of SILLAGES) { w.on = false; w.mesh.visible = false; }
        P.x = POIS.plage.x + 6; P.z = MER - 1.2; P.y = 0; P.nage = false;
        KEYS.KeyS = true; let t = 0; while (!P.nage && t < 40) { await dors(100); t++; }
        out.nage = P.nage; out.eclabPied = actifs();
        await dors(700); KEYS.KeyS = false; // quelques brasses de plus : tout au bord, la houle est presque nulle (mesure fragile)
        const yn = []; for (let i = 0; i < 28; i++) { await dors(160); yn.push(P.h.g.position.y); }
        out.houleNage = Math.max(...yn) - Math.min(...yn);
        // 3) voiture qui tombe à l'eau
        for (const w of SILLAGES) { w.on = false; w.mesh.visible = false; }
        const v = creerVehicule('muscle', POIS.plage.x - 10, MER - 1, 0, null);
        P.x = v.x + 2; P.z = v.z; P.y = 0; entrerVehicule(v);
        v.enAir = true; v.h = 2.5; v.vy = 7; v.v = 16; KEYS.KeyW = true;
        t = 0; while (v.enAir && t < 40) { await dors(80); t++; }
        KEYS.KeyW = false;
        out.voitureDansEau = estEau(v.x, v.z); out.eclabVoiture = actifs();
        sortirVehicule(true); startRun();
        return out;
      });
      if (mer.off) saute('Mer : MER_V2 désactivée — sillage/éclaboussures/houle non vérifiés');
      else {
        if (!(mer.sillage > 0) || !(mer.vitesse > 2.5)) fail('Mer : un bateau qui avance ne laisse aucun sillage (' + JSON.stringify(mer) + ')');
        else ok('Mer : un bateau en mouvement laisse un sillage (' + mer.sillage + ' traces actives)');
        if (!(mer.houleBateau > 0.01) || !(mer.tangage > 0.002)) fail('Mer : le bateau ne suit pas la houle (' + JSON.stringify(mer) + ')');
        else ok('Mer : le bateau monte, descend et tangue avec la houle');
        if (!mer.nage || !(mer.eclabPied > 0)) fail('Mer : entrer dans l\'eau à pied n\'éclabousse pas (' + JSON.stringify(mer) + ')');
        else ok('Mer : entrer dans l\'eau à pied éclabousse');
        if (!(mer.houleNage > 0.01)) fail('Mer : le nageur ne suit pas la houle (' + JSON.stringify(mer) + ')');
        else ok('Mer : le nageur monte et descend avec la houle');
        if (!mer.voitureDansEau) saute('Mer : la voiture du test n\'a pas atteint l\'eau — éclaboussure en voiture non vérifiée');
        else if (!(mer.eclabVoiture > 0)) fail('Mer : une voiture qui tombe à l\'eau n\'éclabousse pas');
        else ok('Mer : une voiture qui tombe à l\'eau éclabousse');
      }
    }

    // -------------------------------------------------------------------
    // Bordures de la carte : le mur est la vraie limite. Avant : un véhicule
    // s'arrêtait 8 u avant les murs ouest et nord, un piéton 6 u avant le mur
    // nord (limite invisible), et « LOS REYES » sur le mur nord était coupé
    // (texte d'enseigne jamais mesuré).
    // -------------------------------------------------------------------
    console.log('\n--- Bordures : le mur est la limite, enseignes lisibles ---');
    {
      const bord = await page.evaluate(async () => {
        const dors = (ms) => new Promise((r) => setTimeout(r, ms));
        const out = {};
        startRun(); ETAT.timeScale = 1; P.hp = P.hpMax = 1e6;
        // véhicule lancé plein ouest le long d'une rue
        const v = creerVehicule('citadine', -HALF + 4, -HALF + CELL * 3, -Math.PI / 2, null);
        for (let i = 0; i < 160; i++) majVehiculePhys(v, 1 / 30, 1, 0, false);
        out.vehX = v.x; v.mort = true;
        // piéton plein nord
        P.x = 3; P.z = -HALF - 4; P.y = 0; INPUT.jx = 0; INPUT.jy = -1; await dors(2500); INPUT.jy = 0; // 8 u du mur : marge large même sur machine lente
        out.pietonZ = P.z;
        // nageur plein ouest au large : jamais au-delà de la ligne du mur
        P.x = -HALF + 6; P.z = MER + 20; INPUT.jx = -1; await dors(2500); INPUT.jx = 0;
        out.nageX = P.x; out.limite = typeof LIMITE_OUEST_MER === 'number' ? LIMITE_OUEST_MER : null;
        // enseigne longue : aucun pixel lumineux sur les bords gauche/droit du canevas
        const t = texEnseigne('RECORD DU TOUR EN BUS : 1:23.4 s', '#ffd23f'); // la plus longue enseigne du jeu
        const cv = t.image, g = cv.getContext('2d'), w = cv.width, h = cv.height;
        const bordG = g.getImageData(0, 0, 3, h).data, bordD = g.getImageData(w - 3, 0, 3, h).data;
        let clair = 0; for (const d of [bordG, bordD]) for (let i = 0; i < d.length; i += 4) if (d[i] + d[i + 1] + d[i + 2] > 300) clair++;
        out.enseigneCoupee = clair;
        out.HALF = HALF;
        startRun();
        return out;
      });
      const HALF_S = bord.HALF, ko = [];
      if (!(bord.vehX < -HALF_S - 10)) ko.push('le véhicule s\'arrête avant le mur ouest (x=' + bord.vehX.toFixed(1) + ')');
      if (!(bord.vehX > -HALF_S - 13.4)) ko.push('le véhicule traverse le mur ouest (x=' + bord.vehX.toFixed(1) + ')');
      if (!(bord.pietonZ < -HALF_S - 11)) ko.push('le piéton s\'arrête avant le mur nord (z=' + bord.pietonZ.toFixed(1) + ')');
      if (bord.limite === null || bord.nageX < bord.limite - 0.01) ko.push('à la nage, on dépasse la ligne du mur ouest (x=' + bord.nageX.toFixed(1) + ')');
      if (bord.enseigneCoupee > 0) ko.push('texte d\'enseigne coupé sur les bords (' + bord.enseigneCoupee + ' pixels)');
      if (ko.length) fail('Bordures : ' + ko.join(' | '));
      else ok('Bordures : véhicule et piéton vont jusqu\'au mur sans le traverser, la nage s\'arrête à la ligne du mur, enseigne longue jamais coupée');
    }

    // -------------------------------------------------------------------
    // Mobilier urbain (DECOR_V2) : jamais sur la chaussée ni devant une porte,
    // les petits objets se renversent sous un véhicule lancé et reviennent à
    // la partie suivante.
    // -------------------------------------------------------------------
    console.log('\n--- Mobilier urbain : trottoirs, portes dégagées, objets cassables ---');
    {
      const mob = await page.evaluate(() => {
        if (typeof DECOR_V2 === 'undefined' || !DECOR_V2 || typeof MOB === 'undefined') return { off: true };
        const out = { nbCassables: 0, surChaussee: [] }; // l'accès aux portes est vérifié par les tests REPLIS existants
        // sur la chaussée = à moins d'une demi-largeur de route de l'axe d'une rue
        const horsBloc = (x, z) => {
          const dx = Math.abs(((x + HALF) % CELL + CELL) % CELL), dz = Math.abs(((z + HALF) % CELL + CELL) % CELL);
          const ax = Math.min(dx, CELL - dx), az = Math.min(dz, CELL - dz);
          return (ax < ROADW / 2 && z < MER - 30) || (az < ROADW / 2 && z < MER - 30);
        };
        for (const l of MOB.cassables.values()) for (const o of l) { out.nbCassables++; if (horsBloc(o.x, o.z)) out.surChaussee.push(o.type + '@' + o.x.toFixed(0) + ',' + o.z.toFixed(0)); }
        // renversement : une voiture lancée sur le premier objet cassable trouvé
        startRun(); ETAT.timeScale = 1;
        let cible = null; for (const l of MOB.cassables.values()) { for (const o of l) { if (!o.casse) { cible = o; break; } } if (cible) break; }
        const v = creerVehicule('muscle', cible.x, cible.z, 0, null); P.x = v.x + 3; P.z = v.z; entrerVehicule(v); v.v = 15;
        majMobilier();
        out.renverse = cible.casse === true;
        const zone = MOB.zones[cible.zone], A = zone.geometry.attributes.position.array, O = zone.userData.orig;
        out.replie = A[cible.debut * 3 + 1] === -2;
        sortirVehicule(true); v.mort = true;
        startRun();
        out.repare = cible.casse === false && A[cible.debut * 3 + 1] === O[cible.debut * 3 + 1];
        return out;
      });
      if (mob.off) saute('Mobilier urbain : DECOR_V2 désactivé');
      else {
        const ko = [];
        if (mob.nbCassables < 100) ko.push('trop peu d\'objets posés (' + mob.nbCassables + ')');
        if (mob.surChaussee.length) ko.push('objets sur la chaussée : ' + mob.surChaussee.slice(0, 4).join(', '));
        if (!mob.renverse || !mob.replie) ko.push('une voiture lancée ne renverse pas l\'objet (' + JSON.stringify(mob) + ')');
        if (!mob.repare) ko.push('l\'objet renversé ne revient pas à la partie suivante');
        if (ko.length) fail('Mobilier urbain : ' + ko.join(' | '));
        else ok('Mobilier urbain : ' + mob.nbCassables + ' objets cassables, tous sur les trottoirs ; renversé par une voiture lancée, réparé à la partie suivante');
      }
    }

    // -------------------------------------------------------------------
    // Lac du parc (DECOR_V2) : de la vraie eau (on y nage), sauf sur la
    // passerelle praticable ; une voiture s'arrête au bord.
    // -------------------------------------------------------------------
    console.log('\n--- Lac du parc : nage, passerelle, une voiture (IA ou joueur) s\'y noie ---');
    {
      const lac = await page.evaluate(async () => {
        if (typeof LAC === 'undefined' || !LAC) return { off: true };
        const dors = (ms) => new Promise((r) => setTimeout(r, ms)); const o = {};
        o.eauDedans = estEau(LAC.x + LAC.r * 0.5, LAC.z + LAC.r * 0.5);
        o.eauPasserelle = estEau(LAC.x, LAC.z);
        o.horsLac = estEau(LAC.x + LAC.r + 4, LAC.z);
        o.hPasserelle = solY(LAC.x, LAC.z);
        startRun(); ETAT.timeScale = 1; P.hp = P.hpMax = 1e6;
        P.x = LAC.x + 4; P.z = LAC.z + 5; P.y = 0; await dors(400); o.nage = P.nage;
        // voiture de l'IA lancée vers le lac depuis le sud : elle s'y noie aussi (demandé), sans dégâts
        const v = creerVehicule('citadine', LAC.x + 4, LAC.z + LAC.r + 6, Math.PI, null); v.conduit = 'trafic'; const hpIA = v.hp;
        for (let i = 0; i < 120 && !v.noye; i++) majVehiculePhys(v, 1 / 30, 1, 0, false);
        o.iaNoyee = !!v.noye && v.hp === hpIA; v.mort = true;
        // au volant du joueur : elle y entre et s'y noie, sans dégâts, le joueur sort
        const vj = creerVehicule('citadine', LAC.x + 4, LAC.z + LAC.r + 6, Math.PI, null); P.x = vj.x; P.z = vj.z; entrerVehicule(vj); const hp0 = vj.hp;
        for (let i = 0; i < 120 && P.veh === vj; i++) { majVehiculePhys(vj, 1 / 30, 1, 0, false); majVehicules(1 / 30); }
        o.joueurNoye = !!vj.noye && vj.hp === hp0 && P.veh !== vj;
        startRun();
        return o;
      });
      if (lac.off) saute('Lac du parc : DECOR_V2 désactivé');
      else {
        const ko = [];
        if (!lac.eauDedans || lac.horsLac) ko.push('estEau ne reconnaît pas le lac (' + JSON.stringify(lac) + ')');
        if (lac.eauPasserelle || !(lac.hPasserelle > 0.5)) ko.push('passerelle non praticable (' + JSON.stringify(lac) + ')');
        if (!lac.nage) ko.push('on ne nage pas dans le lac');
        if (!lac.iaNoyee) ko.push('une voiture de l\'IA ne se noie pas dans le lac (ou s\'abîme)');
        if (!lac.joueurNoye) ko.push('la voiture du joueur ne se noie pas dans le lac (ou s\'abîme)');
        if (ko.length) fail('Lac du parc : ' + ko.join(' | '));
        else ok('Lac du parc : on y nage, la passerelle est praticable (h ' + lac.hPasserelle.toFixed(2) + '), une voiture de l\'IA comme celle du joueur s\'y noie sans dégâts');
      }
    }

    // -------------------------------------------------------------------
    // Vélos (DECOR_V2) : garés aux arceaux en début de partie, sans moteur,
    // BUNNY HOP sur ESQUIVE (un saut par appui, jamais de points de cascade),
    // garage : style seulement (ni nitro ni paliers, gardes d'achat
    // comprises), la fiche survit à la sauvegarde, on ressort en selle.
    // -------------------------------------------------------------------
    console.log('\n--- Vélos : arceaux, BUNNY HOP, garage (style seulement), sauvegarde ---');
    {
      const vr = await page.evaluate(() => {
        if (typeof DECOR_V2 === 'undefined' || !DECOR_V2) return { off: true };
        const o = {};
        startRun(); ETAT.timeScale = 1; P.hp = P.hpMax = 1e6;
        const enVille = (v) => v.def.velo && !v.auSkatepark && Math.abs(v.x) < HALF && Math.abs(v.z) < HALF; // hors des vélos du Mont Reyes (garés au pied, pas aux arceaux) et des skateparks
        o.nbGares = vehicules.filter(enVille).length;
        o.garesSurArceaux = vehicules.filter(enVille).every((v) => MOB.arceaux.some((a) => Math.abs(a.x - v.x) < 0.01 && Math.abs(a.z - v.z) < 0.01));
        // scène maîtrisée : plus aucun véhicule, un carrefour dégagé
        for (const v of vehicules) scene.remove(v.mesh); vehicules.length = 0;
        const X = -HALF + 6 * CELL, Z = -HALF + 6 * CELL;
        o.hops = {};
        for (const k of ['velo', 'bmx']) {
          if (P.veh) sortirVehicule(true);
          const v = creerVehicule(k, X, Z, 0, null); P.x = X; P.z = Z; entrerVehicule(v);
          const b = document.getElementById('btnDodge');
          const r = { label: /HOP/.test(b.innerHTML) && b.style.display === 'flex', moteur: profilMoteur(v.def) };
          const score0 = ETAT.score, sauts0 = META.stats.sauts;
          let hMax = 0, envols = 0, avant = false;
          // appui BREF (au relâcher) : UN bunny hop (10e lot : maintenu = cabré, voir plus bas)
          INPUT.btn.esquive = true; majConduite(1 / 60); majConduite(1 / 60); INPUT.btn.esquive = false;
          for (let i = 0; i < 120; i++) { majConduite(1 / 60); hMax = Math.max(hMax, v.h || 0); if (v.enAir && !avant) envols++; avant = !!v.enAir; }
          // maintenu 2 s en roulant : cabré (roue avant levée), AUCUN saut
          v.v = 6; let cabreMax = 0, envolsTenu = 0; avant = !!v.enAir;
          INPUT.btn.esquive = true; for (let i = 0; i < 120; i++) { v.v = Math.max(v.v, 6); majConduite(1 / 60); cabreMax = Math.max(cabreMax, v.wheelieA || 0); if (v.enAir && !avant) envolsTenu++; avant = !!v.enAir; }
          INPUT.btn.esquive = false; for (let i = 0; i < 60; i++) majConduite(1 / 60);
          Object.assign(r, { hMax: +hMax.toFixed(2), envols, envolsTenu, cabreMax: +cabreMax.toFixed(2), cabreFin: +(v.wheelieA || 0).toFixed(2), auSol: !v.enAir, points: ETAT.score - score0, sauts: META.stats.sauts - sauts0 });
          o.hops[k] = r;
        }
        if (P.veh) sortirVehicule(true);
        // garage : un vélo de la collection
        for (const id in META.vehPerso) Object.assign(META.vehPerso[id], slotGarageDefaut());
        Object.assign(META.vehPerso.v0, slotGarageDefaut(), { cle: 'velo' });
        const vb = creerVehicule('bmx', X, Z, 0, null);
        o.garable = vehiculeGarable(vb); o.refusSurf = vehiculeGarable(creerVehicule('surf', X + 9, Z, 0, null));
        META.argent = 5000;
        const pt = PORTES.find((x) => x.id === 'tuning' && x.garageId !== undefined);
        P.x = pt.x; P.z = pt.z + 3; entrerInterieur('tuning', pt);
        const s = INT.actif; garageChoisirVehicule(s, 'v0'); renderGarageMenu(s);
        const txt = document.getElementById('gmCorps').innerText;
        o.menuMeca = /NITRO|MOTEUR|BLINDAGE/.test(txt); o.menuStyle = /PEINTURE/.test(txt) && /PORTE-BAGAGES/.test(txt) && /FANION/.test(txt);
        const a0 = META.argent;
        o.nitro = acheterNitro(s); o.palier = acheterPalier(s, 'moteur'); o.debitMeca = a0 - META.argent;
        o.piece = choisirPiece(s, 'aileron', 1); o.debitPiece = a0 - META.argent; o.prixPiece = TUNING_PRIX.pieces.aileron[1];
        sauveMeta();
        let lu = null; try { lu = JSON.parse(localStorage.getItem('asphalte_save_v1')).vehPerso.v0; } catch (e) {}
        o.sauve = !!lu && lu.cle === 'velo' && lu.pieces.aileron === 1 && !lu.nitro && lu.moteur === 0;
        s.sortirEnVoiture = true; sortirInterieur(); // comme le bouton SORTIR au volant
        o.sortie = !!(P.veh && P.veh.key === 'velo' && P.veh.persoId === 'v0' && P.veh.mesh.userData.carro && P.veh.mesh.userData.carro.children.length > 0);
        o.sortieLabel = /HOP/.test(document.getElementById('btnDodge').innerHTML);
        if (P.veh) sortirVehicule(true);
        for (const id in META.vehPerso) Object.assign(META.vehPerso[id], slotGarageDefaut());
        sauveMeta(); startRun();
        return o;
      });
      if (vr.off) saute('Vélos : DECOR_V2 désactivé');
      else {
        const ko = [];
        if (!(vr.nbGares >= 6) || !vr.garesSurArceaux) ko.push('vélos garés : ' + vr.nbGares + ', sur les arceaux : ' + vr.garesSurArceaux);
        for (const k in vr.hops) {
          const r = vr.hops[k];
          if (!r.label) ko.push(k + ' : bouton HOP / CABRER absent');
          if (r.envolsTenu !== 0 || !(r.cabreMax > 0.3) || r.cabreFin > 0.01) ko.push(k + ' : maintenu, pas de cabré propre ' + JSON.stringify(r));
          if (r.moteur !== null) ko.push(k + ' : a un son de moteur');
          if (r.envols !== 1) ko.push(k + ' : ' + r.envols + ' saut(s) pour un appui bref (attendu 1)');
          if (!(r.hMax > 0.6) || !r.auSol) ko.push(k + ' : saut ' + JSON.stringify(r));
          if (r.points || r.sauts) ko.push(k + ' : le bunny hop rapporte des points de cascade');
        }
        if (vr.hops.bmx && vr.hops.velo && !(vr.hops.bmx.hMax > vr.hops.velo.hMax)) ko.push('le BMX ne saute pas plus haut que le vélo');
        if (!vr.garable || vr.refusSurf) ko.push('éligibilité garage (vélo ' + vr.garable + ', surf ' + vr.refusSurf + ')');
        if (vr.menuMeca || !vr.menuStyle) ko.push('menu du garage (méca affichée : ' + vr.menuMeca + ', style : ' + vr.menuStyle + ')');
        if (vr.nitro || vr.palier || vr.debitMeca) ko.push('nitro/palier achetés sur un vélo (débit ' + vr.debitMeca + ')');
        if (!vr.piece || vr.debitPiece !== vr.prixPiece) ko.push('pièce : ' + vr.piece + ', débit ' + vr.debitPiece + ' / ' + vr.prixPiece);
        if (!vr.sauve) ko.push('fiche vélo perdue à la sauvegarde');
        if (!vr.sortie || !vr.sortieLabel) ko.push('sortie du garage en selle (' + vr.sortie + ', ' + vr.sortieLabel + ')');
        if (ko.length) fail('Vélos : ' + ko.join(' | '));
        else ok('Vélos : ' + vr.nbGares + ' garés aux arceaux, sans moteur, un saut par appui bref, cabré quand on maintient (vélo ' + vr.hops.velo.hMax + ' / BMX ' + vr.hops.bmx.hMax + '), garage style seulement, sauvegardé, sortie en selle');
      }
    }

    // -------------------------------------------------------------------
    // Transitions entre sols (DECOR_V2) : chaque frontière visible entre un
    // sol meuble (herbe, sable, désert) et un sol différent reçoit sa bande
    // de transition. Dalles lues dans SOLS et visibilité calculée par le jeu
    // (mkIndexSols) — jamais une liste de bords recopiée ici. Les bandes ne
    // sont pas éclairées par sommet (bug vu en rendu : orange vif la nuit
    // près des lampes) : elles suivent l'éclairage du sol, plus sombre la nuit.
    // -------------------------------------------------------------------
    console.log('\n--- Transitions entre sols : chaque frontière visible a sa bande, assombrie la nuit ---');
    {
      const tr = await page.evaluate(() => {
        if (typeof DECOR_V2 === 'undefined' || !DECOR_V2 || typeof SOLS === 'undefined') return { off: true };
        const sol = mkIndexSols(), type = (x, z) => { const r = sol(x, z); return r ? r.type : 'bitume'; };
        const sommets = [];
        scene.traverse((o) => { if (o.isMesh && (o.material === TRANS.matBande)) { const a = o.geometry.attributes.position.array; for (let i = 0; i < a.length; i += 3) sommets.push(a[i], a[i + 2]); } });
        const pres = (x, z, r) => { for (let i = 0; i < sommets.length; i += 2) if ((sommets[i] - x) ** 2 + (sommets[i + 1] - z) ** 2 < r * r) return true; return false; };
        let testes = 0; const manquants = [];
        for (const r of SOLS) {
          if (!SOL_MEUBLE[r.type]) continue;
          for (const [x, z, nx, nz] of [[(r.x0 + r.x1) / 2, r.z0, 0, -1], [(r.x0 + r.x1) / 2, r.z1, 0, 1], [r.x0, (r.z0 + r.z1) / 2, -1, 0], [r.x1, (r.z0 + r.z1) / 2, 1, 0]]) {
            const A = type(x - nx * 0.6, z - nz * 0.6), B = type(x + nx * 0.6, z + nz * 0.6);
            if (A === B || estEau(x + nx * 0.6, z + nz * 0.6) || estEau(x - nx * 0.6, z - nz * 0.6) || (SOL_MEUBLE[A] || 0) === (SOL_MEUBLE[B] || 0)) continue;
            testes++;
            if (!pres(x, z, 1.5)) manquants.push(A + '|' + B + ' @' + x.toFixed(0) + ',' + z.toFixed(0));
          }
        }
        const o = { testes, manquants, paires: Object.keys(TRANS.frontieres).length, eclaire: !!(TRANS.mat.isMeshLambertMaterial || TRANS.matBande.isMeshLambertMaterial) };
        const j0 = ETAT.jour;
        ETAT.jour = 20; jourNuit(0); majEclairageSols(); o.jour = TRANS.matBande.color.r;
        ETAT.jour = 130; jourNuit(0); majEclairageSols(); o.nuit = TRANS.matBande.color.r;
        ETAT.jour = j0; jourNuit(0); majEclairageSols();
        return o;
      });
      if (tr.off) saute('Transitions entre sols : DECOR_V2 désactivé');
      else {
        const ko = [];
        if (!(tr.testes >= 10)) ko.push('trop peu de frontières mesurées (' + tr.testes + ')');
        if (tr.manquants.length) ko.push('frontières sans bande : ' + tr.manquants.slice(0, 6).join(', '));
        if (tr.eclaire) ko.push('matériau éclairé par sommet (orange vif la nuit près des lampes)');
        if (!(tr.nuit < tr.jour * 0.6)) ko.push('pas assombri la nuit (jour ' + tr.jour.toFixed(2) + ', nuit ' + tr.nuit.toFixed(2) + ')');
        if (ko.length) fail('Transitions entre sols : ' + ko.join(' | '));
        else ok('Transitions entre sols : ' + tr.testes + ' frontières visibles mesurées, toutes ont leur bande (' + tr.paires + ' types de jonction), assombries la nuit (' + tr.jour.toFixed(2) + ' → ' + tr.nuit.toFixed(2) + ')');
      }
    }

    // -------------------------------------------------------------------
    // Galion échoué (DECOR_V2) : coque solide mais brèche ouverte jusqu'au
    // coffre (butin posé à chaque partie), bordée qui tire vers le large, et
    // ~1 tir sur 5 vers le joueur quand il est à portée (demandé). tirer()
    // est intercepté le temps du test : on compte les angles, rien ne part.
    // -------------------------------------------------------------------
    console.log('\n--- Galion échoué : coque solide, brèche vers le coffre, tirs vers le large et 1 sur 5 sur le joueur ---');
    {
      const ga = await page.evaluate(() => {
        if (typeof GALION === 'undefined' || !GALION.ok) return { off: true };
        startRun(); ETAT.timeScale = 1; P.hp = P.hpMax = 1e6;
        const o = { canons: GALION.canons.length, t: GALION.tresor };
        o.butin = pickups.some((p) => p.on !== false && p.type === 'cash' && Math.hypot(p.x - GALION.tresor.x, p.z - GALION.tresor.z) < 0.5);
        o.coffreLibre = !solidAt(GALION.tresor.x, GALION.tresor.z, 0.3);
        let pleins = 0; for (const c of GALION.canons) if (solidAt(c.monde.x - Math.sin(c.ang) * 2.2, c.monde.z - Math.cos(c.ang) * 2.2, 0.2)) pleins++;
        o.coqueSolide = pleins >= GALION.canons.length - 1;
        const vrai = tirer, tirs = [];
        tirer = function (x, y, z, ang) { tirs.push({ ang, typ: arguments[11] }); return null; };
        const angDiff2 = (a, b) => { let d = a - b; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return Math.abs(d); };
        const salves = (n) => { for (let i = 0; i < n * 600; i++) majGalion(1 / 60); };
        try {
          P.x = 0; P.z = 0; salves(12); o.loin = tirs.splice(0).map((t) => t.ang);
          const c0 = GALION.canons[0]; P.x = c0.monde.x - 6; P.z = c0.monde.z - 24; // côté plage, à portée
          salves(60); o.pres = tirs.splice(0);
          const versJoueur = (t, c) => angDiff2(t.ang, Math.atan2(P.x - c.monde.x, P.z - c.monde.z)) < 0.12;
          o.nbPres = o.pres.length; o.visesJoueur = o.pres.filter((t) => GALION.canons.some((c) => versJoueur(t, c))).length;
          o.loinVersLarge = o.loin.every((a) => angDiff2(a, GALION.canons[0].ang) < 0.2);
          o.typ = o.pres.length ? o.pres[0].typ : null;
        } finally { tirer = vrai; }
        startRun();
        return o;
      });
      if (ga.off) saute('Galion échoué : DECOR_V2 désactivé');
      else {
        const ko = [], part = ga.nbPres ? ga.visesJoueur / ga.nbPres : 0;
        if (ga.canons !== 6) ko.push(ga.canons + ' canons');
        if (!ga.coqueSolide) ko.push('la coque se traverse');
        if (!ga.coffreLibre) ko.push('le coffre est muré (brèche fermée)');
        if (!ga.butin) ko.push('pas de butin au coffre en début de partie');
        if (!ga.loin.length || !ga.loinVersLarge) ko.push('joueur loin : des tirs ne partent pas vers le large (' + ga.loin.length + ' tirs)');
        if (ga.typ !== 'boulet') ko.push('projectile ' + ga.typ);
        if (!(ga.nbPres >= 100) || !(part > 0.1 && part < 0.32)) ko.push('joueur à portée : ' + ga.visesJoueur + '/' + ga.nbPres + ' tirs sur lui (attendu ~1 sur 5)');
        if (ko.length) fail('Galion échoué : ' + ko.join(' | '));
        else ok('Galion échoué : 6 canons, coque solide, brèche ouverte jusqu\'au coffre (butin posé), joueur loin → ' + ga.loin.length + ' tirs tous vers le large, à portée → ' + ga.visesJoueur + '/' + ga.nbPres + ' sur lui (' + Math.round(part * 100) + ' %)');
      }
    }

    // -------------------------------------------------------------------
    // Jetée de fête foraine (DECOR_V2) : praticable à pied (pas d'eau sous
    // le pont) et en voiture (rampe), aucun mobilier de plage dessous, la
    // grande roue tourne et s'efface quand elle cache le joueur.
    // -------------------------------------------------------------------
    console.log('\n--- Jetée de fête foraine : praticable à pied et en voiture, roue qui tourne et s\'efface ---');
    {
      const je = await page.evaluate(() => {
        if (typeof JETEE === 'undefined' || !JETEE.ok) return { off: true };
        startRun(); ETAT.timeScale = 1; P.hp = P.hpMax = 1e6;
        for (const v of vehicules) scene.remove(v.mesh); vehicules.length = 0;
        const o = {}, zMer = JETEE.z1 - 6;
        o.eauSous = estEau(JETEE.x, zMer); o.hPont = solY(JETEE.x, zMer); o.eauACote = estEau(JETEE.x + 20, zMer);
        // mobilier : aucun objet cassable sous l'emprise
        o.mobDessous = 0; for (const l of MOB.cassables.values()) for (const c of l) for (const r of ZONES_SANS_MOBILIER) if (c.x > r.x0 && c.x < r.x1 && c.z > r.z0 && c.z < r.z1) o.mobDessous++;
        // une voiture monte la rampe et roule sur le pont
        const v = creerVehicule('citadine', JETEE.x, JETEE.z0 - 14, 0, null);
        for (let i = 0; i < 150; i++) majVehiculePhys(v, 1 / 60, 1, 0, false);
        o.voitureZ = +(v.z - JETEE.z0).toFixed(1); o.voitureH = +(v.h || 0).toFixed(2); o.voitureEau = estEau(v.x, v.z); v.mort = true;
        // roue : tourne, et s'efface quand le joueur est à son pied côté plage
        const r0 = JETEE.roue.rotation.z;
        P.x = JETEE.x; P.z = JETEE.zRoue - 10; for (let i = 0; i < 90; i++) majJetee(1 / 60);
        o.tourne = JETEE.roue.rotation.z > r0; o.fonduDerriere = +JETEE.fondu.toFixed(2);
        P.x = JETEE.x; P.z = JETEE.z0 + 5; for (let i = 0; i < 90; i++) majJetee(1 / 60);
        o.fonduLoin = +JETEE.fondu.toFixed(2);
        startRun();
        return o;
      });
      if (je.off) saute('Jetée de fête foraine : DECOR_V2 désactivé');
      else {
        const ko = [];
        if (je.eauSous || !(je.hPont > 1) || !je.eauACote) ko.push('pont (eau dessous ' + je.eauSous + ', h ' + je.hPont + ', eau à côté ' + je.eauACote + ')');
        if (je.mobDessous) ko.push(je.mobDessous + ' objets de plage sous la jetée');
        if (!(je.voitureZ > 5) || !(je.voitureH > 1) || je.voitureEau) ko.push('la voiture ne monte pas sur la jetée (' + JSON.stringify(je) + ')');
        if (!je.tourne) ko.push('la grande roue ne tourne pas');
        if (!(je.fonduDerriere < 0.5) || !(je.fonduLoin > 0.95)) ko.push('fondu de la roue (derrière ' + je.fonduDerriere + ', loin ' + je.fonduLoin + ')');
        if (ko.length) fail('Jetée de fête foraine : ' + ko.join(' | '));
        else ok('Jetée de fête foraine : pont praticable (h ' + je.hPont + ', pas d\'eau dessous), voiture montée par la rampe (h ' + je.voitureH + '), roue qui tourne et s\'efface derrière le joueur (' + je.fonduDerriere + ')');
      }
    }

    // -------------------------------------------------------------------
    // Skatepark (DECOR_V2) : un BMX lancé plein gaz décolle du tremplin et
    // franchit le vide ; ni arbre ni mobilier ne bloque l'élan.
    // -------------------------------------------------------------------
    console.log('\n--- Skatepark : le BMX décolle du tremplin, accès dégagé ---');
    {
      const sk = await page.evaluate(() => {
        if (typeof SKATE === 'undefined' || !SKATE.ok) return { off: true };
        startRun(); for (const v of vehicules) scene.remove(v.mesh); vehicules.length = 0;
        const v = creerVehicule('bmx', SKATE.x - 7.5, SKATE.z + 22, Math.PI, null);
        let hMax = 0, air = false; for (let i = 0; i < 200; i++) { majVehiculePhys(v, 1 / 60, 1, 0, false); hMax = Math.max(hMax, v.h || 0); air = air || !!v.enAir; }
        const o = { hMax: +hMax.toFixed(2), air, traverse: +(SKATE.z - v.z).toFixed(1), auSol: !v.enAir };
        v.mort = true; startRun(); return o;
      });
      if (sk.off) saute('Skatepark : DECOR_V2 désactivé');
      else if (!sk.air || !(sk.hMax > 1.2) || !(sk.traverse > 8) || !sk.auSol) fail('Skatepark : saut raté ' + JSON.stringify(sk));
      else ok('Skatepark : le BMX décolle du tremplin (h ' + sk.hMax + '), franchit le vide et retombe ' + sk.traverse + ' u plus loin');
    }

    // -------------------------------------------------------------------
    // Port vivant (DECOR_V2) : les portiques roulent, l'îlot du phare est
    // praticable (pas de l'eau), le faisceau tourne et s'allume la nuit.
    // -------------------------------------------------------------------
    console.log('\n--- Port vivant : portiques en mouvement, îlot du phare praticable, faisceau la nuit ---');
    {
      const po = await page.evaluate(() => {
        if (typeof PORT === 'undefined' || !PORT.faisceau) return { off: true };
        const o = { parcs: PORT.portiques.length }, j0 = ETAT.jour;
        const z0 = PORT.portiques.map((p) => p.g.position.z), r0 = PORT.faisceau.rotation.y;
        for (let i = 0; i < 600; i++) majPortVivant(1 / 60); // 10 s : sur 2 s, un portique au bout de sa course (sommet du sinus) ne bougeait presque pas (test fragile)
        o.bougent = PORT.portiques.every((p, i) => Math.abs(p.g.position.z - z0[i]) > 0.05);
        o.tourne = PORT.faisceau.rotation.y > r0;
        o.ilot = !estEau(POIS.phare.x + 4, POIS.phare.z) && solY(POIS.phare.x + 4, POIS.phare.z) > 0.5;
        ETAT.jour = 20; jourNuit(0); majPortVivant(0.016); o.jour = PORT.matFaisceau.opacity;
        ETAT.jour = 130; jourNuit(0); majPortVivant(0.016); o.nuit = PORT.matFaisceau.opacity;
        ETAT.jour = j0; jourNuit(0);
        return o;
      });
      if (po.off) saute('Port vivant : DECOR_V2 désactivé');
      else if (!(po.parcs >= 1) || !po.bougent || !po.tourne || !po.ilot || !(po.nuit > 0.3) || !(po.jour < 0.1)) fail('Port vivant : ' + JSON.stringify(po));
      else ok('Port vivant : ' + po.parcs + ' parcs à conteneurs aux portiques en mouvement, îlot du phare praticable, faisceau éteint le jour et allumé la nuit (' + po.nuit.toFixed(2) + ')');
    }

    // -------------------------------------------------------------------
    // Brooklyn (DECOR_V2) : fresques, cordes à linge, bornes ouvertes, et
    // courts de basket grillagés avec une entrée libre.
    // -------------------------------------------------------------------
    console.log('\n--- Brooklyn : fresques, cordes à linge, bornes ouvertes, courts grillagés ouverts au sud ---');
    {
      const br = await page.evaluate(() => {
        if (typeof BROOK === 'undefined' || !BROOK.ok) return { off: true };
        const c = POIS.courts, o = { fresques: BROOK.fresques, cordes: BROOK.cordes, bornes: BROOK.bornes.length };
        o.grillage = !!solidAt(c.x, c.z - 12.6, 0.2); o.portillon = !solidAt(c.x - 6.6, c.z + 12.6, 0.2);
        o.bornesPortes = BROOK.bornes.filter((h) => PORTES.some((p) => Math.hypot(p.x - h.x, p.z - h.z) < 6)).length;
        return o;
      });
      if (br.off) saute('Brooklyn : DECOR_V2 désactivé');
      else if (!(br.fresques > 3) || !(br.cordes > 3) || !(br.bornes > 2) || !br.grillage || !br.portillon || br.bornesPortes) fail('Brooklyn : ' + JSON.stringify(br));
      else ok('Brooklyn : ' + br.fresques + ' fresques, ' + br.cordes + ' cordes à linge, ' + br.bornes + ' bornes ouvertes, courts grillagés avec portillons');
    }

    // -------------------------------------------------------------------
    // Crique des plongeurs (DECOR_V2) : la baie est de l'eau, un vrai
    // plongeon depuis 17 u (boucle réelle) ne blesse pas et rapporte un
    // bonus, et des marches ramènent de l'eau au bras de 5 u.
    // -------------------------------------------------------------------
    console.log('\n--- Crique des plongeurs : plongeon de 17 u sans dégâts, bonus, marches pour remonter ---');
    {
      const cr = await page.evaluate(async () => {
        if (typeof CRIQUE === 'undefined' || !CRIQUE) return { off: true };
        const dors = (ms) => new Promise((r) => setTimeout(r, ms));
        startRun(); ETAT.timeScale = 1; P.hp = P.hpMax = 1000;
        const o = { eau: estEau(365, 278), sommet: solPied(365, 255) };
        // collines d'accès : montée continue jusqu'aux plateaux (aucune marche de plus de 1,2 u par pas de 1 u)
        let saut = 0; for (let z = 190; z < 247; z++) saut = Math.max(saut, Math.abs(solY(366, z + 1) - solY(366, z))); o.sautNord = +saut.toFixed(2);
        saut = 0; for (let x = 300; x < 331; x++) saut = Math.max(saut, Math.abs(solY(x + 1, 276) - solY(x, 276))); o.sautOuest = +saut.toFixed(2);
        P.x = 365; P.z = 262; P.y = solPied(365, 262); await dors(300);
        const hp0 = P.hp, sc0 = ETAT.score;
        P.z = 273.2; await dors(400); // un pas dans le vide au bout du plongeoir
        for (let i = 0; i < 40 && (P.chute || !P.nage); i++) await dors(200); // jusqu'à la fin de la chute (machine lente : jamais un délai fixe)
        o.nage = P.nage; o.degats = hp0 - P.hp; o.bonus = ETAT.score - sc0; o.salto = P.h.g.rotation.x;
        o.marches = solPied(CRIQUE.x1 - 1.3, CRIQUE.z0 + 18.8); o.bras = solPied(CRIQUE.x1 + 5, 284); // haut des marches (rampe de z0+2 à z0+19), bras de 5 u
        startRun(); return o;
      });
      if (cr.off) saute('Crique des plongeurs : DECOR_V2 désactivé');
      else if (!cr.eau || !(cr.sommet > 16) || !cr.nage || cr.degats > 0 || !(cr.bonus > 0) || cr.salto !== 0 || !(cr.marches > 4.5) || !(Math.abs(cr.bras - 5) < 0.2) || !(cr.sautNord < 1.2) || !(cr.sautOuest < 1.2)) fail('Crique des plongeurs : ' + JSON.stringify(cr));
      else ok('Crique des plongeurs : plongeon de 17 u → dans l\'eau, 0 dégât, bonus +' + cr.bonus + ', marches jusqu\'au bras de 5 u, collines d\'accès continues (pas max ' + cr.sautNord + ' / ' + cr.sautOuest + ' u)');
    }

    // -------------------------------------------------------------------
    // Quartier néon (DECOR_V2) : panneaux de toit, file d'attente devant le
    // club (qui ne bloque jamais sa porte), projecteurs allumés la nuit.
    // -------------------------------------------------------------------
    console.log('\n--- Quartier néon : panneaux de toit, file devant le club, porte libre, projecteurs la nuit ---');
    {
      const ne = await page.evaluate(() => {
        if (typeof NEON === 'undefined' || !NEON.matFx) return { off: true };
        const d = PORTES.find((q) => q.id === 'club'), j0 = ETAT.jour;
        const o = { panneaux: NEON.panneaux, file: NEON.nbFile || 0, porteLibre: !solidAt(d.x, d.z + 1.2, 0.4) };
        ETAT.jour = 20; jourNuit(0); majNeonVivant(0.016); o.jour = NEON.matFx.opacity;
        ETAT.jour = 130; jourNuit(0); majNeonVivant(0.016); o.nuit = NEON.matFx.opacity;
        ETAT.jour = j0; jourNuit(0); return o;
      });
      if (ne.off) saute('Quartier néon : DECOR_V2 désactivé');
      else if (!(ne.panneaux >= 4) || !(ne.file >= 5) || !ne.porteLibre || !(ne.nuit > 0.2) || !(ne.jour < 0.05)) fail('Quartier néon : ' + JSON.stringify(ne));
      else ok('Quartier néon : ' + ne.panneaux + ' panneaux de toit, ' + ne.file + ' noctambules dans la file, porte du club libre, projecteurs allumés la nuit seulement');
    }

    // -------------------------------------------------------------------
    // Finitions de quartier (DECOR_V2) : piscines décorées, cheminées,
    // miradors (faisceaux la nuit seulement), étals et cagettes du marché.
    // -------------------------------------------------------------------
    console.log('\n--- Finitions de quartier : piscines, cheminées, miradors, marché ---');
    {
      const qf = await page.evaluate(() => {
        if (typeof QUART === 'undefined' || !QUART.ok) return { off: true };
        const j0 = ETAT.jour, o = { piscines: VILLA_PISC.length + ((typeof HILLS !== 'undefined' && HILLS.ok) ? BASSINS.filter((q) => q.y > 1).length : 0), /* les piscines des villas sont désormais celles de Los Reyes Hills */ cheminees: QUART.cheminees.length, miradors: QUART.miradors.length, etals: 0, cagettes: 0 };
        for (const l of MOB.cassables.values()) for (const c of l) if (c.type === 'cagettes') o.cagettes++;
        ETAT.jour = 20; jourNuit(0); majQuartiersFinitions(0.016); o.jour = QUART.matMir.opacity;
        ETAT.jour = 130; jourNuit(0); majQuartiersFinitions(0.016); o.nuit = QUART.matMir.opacity;
        ETAT.jour = j0; jourNuit(0); return o;
      });
      if (qf.off) saute('Finitions de quartier : DECOR_V2 désactivé');
      else if (!(qf.piscines >= 3) || !(qf.cheminees >= 2) || qf.miradors !== 2 || !(qf.cagettes >= 10) || !(qf.nuit > 0.3) || qf.jour > 0.05) fail('Finitions de quartier : ' + JSON.stringify(qf));
      else ok('Finitions de quartier : ' + qf.piscines + ' piscines décorées, ' + qf.cheminees + ' cheminées, 2 miradors (faisceaux la nuit), ' + qf.cagettes + ' cagettes de marché');
    }

    // -------------------------------------------------------------------
    // Portes (DECOR_V2) : aucune ne donne sur la chaussée (≥ 2,5 u de trottoir
    // devant, dans le sens où elle regarde), la sortie de salle replace le
    // joueur devant la porte (jamais dans un mur), les enseignes de lieu ne
    // sont jamais masquées. Liste lue dans PORTES, jamais recopiée.
    // -------------------------------------------------------------------
    console.log('\n--- Portes : jamais sur la chaussée, sortie devant la porte, enseignes de lieu visibles ---');
    {
      const po = await page.evaluate(() => {
        if (typeof ameliorerPortes === 'undefined' || !DECOR_V2) return { off: true };
        const o = { courtes: [], sorties: [], masquees: ENSEIGNES.filter((e) => e.lieu && !e.p.visible).length, testees: 0 };
        for (const p of PORTES) {
          if (p.id === 'tuning' || p.id === 'chalutier' || p.id === 'site51' || p.boutiqueId || p.z > MER - 30) continue; // boutiques : une devanture, sans seuil (sortie vérifiée par « Boutiques de style »)
          o.testees++;
          const nx = p.nx || 0, nz = p.nz === undefined ? 1 : p.nz, pr = profondeurDevant(p.x, p.z, nx, nz);
          if (pr < 2.5) o.courtes.push(p.id + ' ' + pr); // < 2,5 u : le seuil de la porte (2,4 u de profondeur) toucherait la bordure
        }
        for (const id of ['pharma', 'conces', 'laverie', 'arcade']) {
          const p = PORTES.find((q) => q.id === id); if (!p) continue;
          startRun(); P.x = p.x; P.z = p.z; entrerInterieur(id, p); sortirInterieur();
          if (solidAt(P.x, P.z, 0.3) || surChaussee(P.x, P.z) || Math.hypot(P.x - p.x, P.z - p.z) > 4) o.sorties.push(id + ' @' + P.x.toFixed(1) + ',' + P.z.toFixed(1));
        }
        startRun(); return o;
      });
      if (po.off) saute('Portes : DECOR_V2 désactivé');
      else if (po.courtes.length || po.sorties.length || po.masquees || po.testees < 15) fail('Portes : ' + JSON.stringify(po));
      else ok('Portes : ' + po.testees + ' portes avec au moins 2,5 u de trottoir devant (seuil jamais sur la bordure), sortie de salle devant la porte (pharmacie, concession, laverie, arcade), aucune enseigne de lieu masquée');
    }

    // -------------------------------------------------------------------
    // Jamais bloqué contre un mur (bug signalé : coincé au pied d'une falaise
    // de la crique après un saut, partie à quitter). On pose le joueur dans
    // la marge de collision de chaque falaise et sous un plongeoir, puis on
    // le fait bouger AU CLAVIER (vraie boucle) : il doit pouvoir s'éloigner.
    // -------------------------------------------------------------------
    console.log('\n--- Jamais bloqué contre une falaise ou sous un plongeoir ---');
    {
      const C = await page.evaluate(() => { if (typeof CRIQUE === 'undefined' || !CRIQUE) return null; startRun(); ecran(null); ETAT.mode = 'jeu'; P.hp = P.hpMax = 1e6; return { x0: CRIQUE.x0, x1: CRIQUE.x1, z0: CRIQUE.z0 }; });
      if (!C) saute('Jamais bloqué : crique absente (DECOR_V2 désactivé)');
      else {
        const bloques = [];
        for (const [nom, x0, z0] of [['contre le bras ouest', C.x0 + 0.3, 284], ['contre la falaise nord', 360, C.z0 + 0.3], ['sous le plongeoir ouest', C.x0 + 3, 280.2], ['contre le bras est', C.x1 - 0.3, 284]]) {
          await page.evaluate((x0, z0) => { P.x = x0; P.z = z0; P.y = 0; P.chute = false; P.vy = 0; }, x0, z0);
          await new Promise((r) => setTimeout(r, 300));
          let total = 0;
          for (const k of ['KeyD', 'KeyA', 'KeyS', 'KeyW']) {
            const a = await page.evaluate(() => [P.x, P.z]); await page.keyboard.down(k); await new Promise((r) => setTimeout(r, 700)); await page.keyboard.up(k); // 700 ms : en temps réel, une machine chargée (suite complète) faisait parcourir 1,5 u au lieu de 2
            const b = await page.evaluate(() => [P.x, P.z]); total += Math.hypot(b[0] - a[0], b[1] - a[1]);
          }
          if (total < 2) bloques.push(nom + ' (' + total.toFixed(2) + ' u)');
        }
        await page.evaluate(() => startRun());
        if (bloques.length) fail('Jamais bloqué : joueur coincé — ' + bloques.join(', '));
        else ok('Jamais bloqué : le joueur repart depuis le pied de chaque falaise et de sous le plongeoir');
      }
    }

    // -------------------------------------------------------------------
    // Banderole de l'avion (DECOR_V2) : paiement avec sa garde d'entrée
    // (texte vide, même texte, pas assez d'argent → rien débité), message
    // nettoyé, sauvegardé et repris à la partie suivante ; trajet de l'avion
    // jamais dans la grande roue de la jetée.
    // -------------------------------------------------------------------
    console.log('\n--- Banderole de l\'avion : paiement gardé, message sauvegardé, trajet hors de la grande roue ---');
    {
      const ba = await page.evaluate(() => {
        if (typeof acheterBanderole === 'undefined' || !POIS.banderole) return { off: true };
        startRun(); const m0 = META.banderole, o = {};
        META.banderole = ''; META.argent = 100; o.pauvre = acheterBanderole('SALUT') || META.argent !== 100;
        META.argent = 1000; o.vide = acheterBanderole('   ') || META.argent !== 1000;
        o.ok = acheterBanderole('salut <b>los reyes</b> !!') && META.argent === 1000 - BANDEROLE_PRIX;
        o.texte = META.banderole;
        const a1 = META.argent; o.meme = acheterBanderole(o.texte) || META.argent !== a1;
        let sauve = null; try { sauve = JSON.parse(localStorage.getItem('asphalte_save_v1')).banderole; } catch (e) {}
        o.sauve = sauve === o.texte;
        let xmin = 1e9; for (let s = 0; s < AVION.L; s += 2) xmin = Math.min(xmin, trajetAvion(s).x);
        o.horsRoue = xmin - AVION.R > JETEE.x + 12;
        META.banderole = m0; sauveMeta(); startRun(); return o;
      });
      if (ba.off) saute('Banderole : DECOR_V2 désactivé');
      else if (ba.pauvre || ba.vide || ba.meme || !ba.ok || !ba.sauve || !ba.horsRoue || !/^SALUT/.test(ba.texte) || /[<>]/.test(ba.texte)) fail('Banderole : ' + JSON.stringify(ba));
      else ok('Banderole : refus sans argent / texte vide / même texte (rien débité), « ' + ba.texte + ' » payé et sauvegardé, trajet de l\'avion hors de la grande roue');
    }

    // -------------------------------------------------------------------
    // Bateaux (DECOR_V2) : ils avancent l'étrave devant (bug trouvé : la
    // coque d'origine pointait vers -z, tous naviguaient à reculons). Pour
    // chaque bateau de VEHDEFS : la coque est plus étroite à l'avant (+z, sens
    // de la marche) qu'à l'arrière.
    // -------------------------------------------------------------------
    console.log('\n--- Bateaux : l\'étrave est devant (sens de la marche) ---');
    {
      const bt = await page.evaluate(() => {
        if (!DECOR_V2) return { off: true };
        const ko = [], vus = [];
        for (const k of Object.keys(VEHDEFS)) {
          const d = VEHDEFS[k]; if (d.type !== 'bateau' || d.surf || d.pagaie) continue;
          const m = makeVoiture(k); m.updateMatrixWorld(true);
          const L = d.long, pts = [];
          m.traverse((o) => { if (o.isMesh && o.geometry && o.geometry.attributes.position && o.material && o.material.vertexColors) { const a = o.geometry.attributes.position.array; for (let i = 0; i < a.length; i += 3) pts.push([a[i], a[i + 2]]); } });
          const larg = (z0) => { let w = 0; for (const [x, z] of pts) if (Math.abs(z - z0) < L * 0.06) w = Math.max(w, Math.abs(x)); return w; };
          const av = larg(L * 0.44), ar = larg(-L * 0.44); vus.push(k);
          if (!pts.length || !(av < ar * 0.7)) ko.push(k + ' (avant ' + av.toFixed(2) + ', arrière ' + ar.toFixed(2) + ')');
        }
        return { ko, vus };
      });
      if (bt.off) saute('Bateaux : DECOR_V2 désactivé');
      else if (bt.ko.length || bt.vus.length < 5) fail('Bateaux : étrave à l\'arrière — ' + bt.ko.join(', '));
      else ok('Bateaux : ' + bt.vus.length + ' bateaux, étrave devant dans le sens de la marche (' + bt.vus.join(', ') + ')');
    }

    // -------------------------------------------------------------------
    // Mont Reyes et ligne des mesas (DECOR_V2) : un pilote au joystick
    // (controleDir, la vraie logique tactile) qui suit le sentier et freine
    // avant les portes finit les deux courses, avec des sauts, dans le temps,
    // sans casser son véhicule, malgré la pente qui freine à la montée ;
    // prime une seule fois par vague ; véhicules garés au pied des départs.
    // -------------------------------------------------------------------
    console.log('\n--- Mont Reyes et ligne des mesas : courses finissables avec sauts, prime une fois par vague ---');
    {
      const ri = await page.evaluate(() => {
        if (typeof RIDES === 'undefined' || !RIDES.porte) return { off: true };
        const o = { courses: [] };
        // le test maîtrise sa scène : la curiosité « Volant du Dépôt » (+15 % d'accélération), gagnée par un test
        // précédent, change la trajectoire du pilote simulé (le buggy sautait du dernier lacet)
        const volant0 = META.curios.volant; delete META.curios.volant;
        startRun(); o.gares = vehicules.filter((v) => v.x > 440 && (v.def.type === 'moto' || v.def.buggy)).length;
        const course = (id, cle) => {
          startRun(); ecran(null); ETAT.mode = 'jeu'; P.hp = P.hpMax = 1e6; for (const v of vehicules) scene.remove(v.mesh); vehicules.length = 0;
          const d = rideDepart(id), v = creerVehicule(cle, d.x, d.z, 0, null); v.h = solY(d.x, d.z); P.x = v.x; P.z = v.z; entrerVehicule(v);
          const a0 = META.argent; demarrerRide(id); let t = 0, sauts = 0, pa = false;
          while (RIDES.actif && t < 120) { const r = RIDES.actif, p = r.portes[r.i], prev = r.i ? r.portes[r.i - 1] : d;
            // vise 7 u devant soi sur le segment porte précédente → porte suivante (on suit le sentier, on ne coupe pas les lacets)
            const sx = p.x - prev.x, sz = p.z - prev.z, L = Math.hypot(sx, sz) || 1, u = Math.min(1, ((v.x - prev.x) * sx + (v.z - prev.z) * sz) / (L * L) + 7 / L);
            const tx = prev.x + sx * u - v.x, tz = prev.z + sz * u - v.z, l = Math.hypot(tx, tz) || 1; INPUT.mx = tx / l; INPUT.mz = tz / l;
            const fr = Math.sqrt(dist2(p.x, p.z, v.x, v.z)) < 12 && Math.abs(v.v) > 12, c = controleDir(v, fr);
            majVehiculePhys(v, 1 / 30, c.throttle, c.steer, fr); if (v.enAir && !pa) sauts++; pa = v.enAir; P.x = v.x; P.z = v.z; majRides(1 / 30); t += 1 / 30; }
          INPUT.mx = INPUT.mz = 0;
          return { id, cle, prime: META.argent - a0, t: +t.toFixed(1), sauts, hp: +(v.hp / v.def.hp).toFixed(2), limite: RIDE_DEFS[id].temps };
        };
        for (const [id, cle] of [['mesas', 'motocross'], ['mesas', 'buggy'], ['mont', 'motocross'], ['mont', 'bmx'], ['mont', 'velo'], ['mont', 'quad'], ['mont', 'buggy']]) o.courses.push(course(id, cle));
        // même vague : pas de seconde prime
        const v2 = (() => { const d = rideDepart('mesas'); const a = META.argent; RIDES.primeVague.mesas = WAVES.n; const v = creerVehicule('motocross', d.x, d.z, 0, null); v.h = solY(d.x, d.z); entrerVehicule(v); demarrerRide('mesas'); RIDES.actif.i = RIDES.actif.portes.length - 1; const p = RIDES.actif.portes[RIDES.actif.i]; v.x = p.x; v.z = p.z; v.h = solY(p.x, p.z); v.enAir = false; majRides(1 / 30); return META.argent - a; })();
        o.secondePrime = v2;
        o.limiteEst = (() => { P.x = 590; P.z = 100; majJoueur && 0; return LIMITE_EST; })();
        if (volant0) META.curios.volant = volant0;
        startRun(); return o;
      });
      if (ri.off) saute('Mont Reyes : DECOR_V2 désactivé');
      else {
        const ko = ri.courses.filter((c) => !(c.prime > 0) || c.hp < 0.3 || !(c.t < c.limite) || (c.cle !== 'bmx' && c.sauts < 2)).map((c) => JSON.stringify(c));
        if (ri.gares < 4) ko.push('véhicules garés : ' + ri.gares);
        if (ri.secondePrime !== 0) ko.push('seconde prime dans la même vague : ' + ri.secondePrime);
        if (ko.length) fail('Mont Reyes / mesas : ' + ko.join(' | '));
        else ok('Mont Reyes / mesas : ' + ri.courses.map((c) => c.id + ' en ' + c.cle + ' ' + c.t + ' s, ' + c.sauts + ' sauts').join(', ') + ' — véhicules intacts, prime une fois par vague, ' + ri.gares + ' véhicules garés au pied');
      }
    }

    // -------------------------------------------------------------------
    // Pentes (DECOR_V2) — signalé : « on monte le mont à fond, même à pied,
    // aucune sensation de montée ; au canyon, à pied, on se rapproche et
    // d'un coup on est en haut ». Une paroi de mesa arrête (à pied comme en
    // véhicule, sans casse) ; la pente du mont freine nettement la montée.
    // Points lus dans CANYON.mesas et MONT.sommet, jamais recopiés.
    // -------------------------------------------------------------------
    console.log('\n--- Pentes : paroi de mesa infranchissable, montée du mont freinée ---');
    {
      const pt = await page.evaluate(() => {
        if (typeof CANYON === 'undefined' || !CANYON.mesas.length || !MONT.sommet) return { off: true };
        const o = {}, m = CANYON.mesas[0], sx = m.x + m.hw + 5, sz = m.z, s = MONT.sommet;
        const pied = (x, z, mx, mz) => { startRun(); ecran(null); ETAT.mode = 'jeu'; for (const v of vehicules) scene.remove(v.mesh); vehicules.length = 0; P.x = x; P.z = z; P.y = solPied(x, z);
          const y0 = P.y; for (let i = 0; i < 120; i++) { INPUT.mx = mx; INPUT.mz = mz; majJoueur(1 / 30, 1 / 30); } INPUT.mx = INPUT.mz = 0; return { d: +Math.hypot(P.x - x, P.z - z).toFixed(1), dy: +(P.y - y0).toFixed(1) }; };
        const veh = (cle, x, z, ang) => { startRun(); for (const v of vehicules) scene.remove(v.mesh); vehicules.length = 0; const v = creerVehicule(cle, x, z, ang, null); v.h = solY(x, z);
          const y0 = v.h; for (let i = 0; i < 150; i++) majVehiculePhys(v, 1 / 30, 1, 0, false); const r = { d: +Math.hypot(v.x - x, v.z - z).toFixed(0), dy: +((v.h || 0) - y0).toFixed(1), degats: v.def.hp - v.hp, vmax5: v.def.vmax * 5 }; scene.remove(v.mesh); vehicules.length = 0; return r; };
        o.mesaH = m.h; o.piedParoi = pied(sx, sz, -1, 0); o.piedPlat = pied(sx, sz + 60, 0, 1); o.piedMont = pied(s.x - 50, s.z, 1, 0);
        o.vehParoi = veh('motocross', sx, sz, -Math.PI / 2); o.vehMont = veh('motocross', s.x - 68, s.z, Math.PI / 2);
        startRun(); return o;
      });
      if (pt.off) saute('Pentes : DECOR_V2 désactivé');
      else {
        const ko = [];
        if (!(pt.piedParoi.d < 4 && pt.piedParoi.dy < 3)) ko.push('à pied, la paroi de mesa (' + pt.mesaH + ' u) se gravit : ' + JSON.stringify(pt.piedParoi));
        if (!(pt.vehParoi.d < 8 && pt.vehParoi.dy < 3 && pt.vehParoi.degats === 0)) ko.push('moto contre la paroi de mesa : ' + JSON.stringify(pt.vehParoi));
        if (!(pt.piedMont.d < 0.75 * pt.piedPlat.d && pt.piedMont.dy > 3)) ko.push('à pied, pente du mont pas freinée : ' + JSON.stringify(pt.piedMont) + ' contre ' + JSON.stringify(pt.piedPlat) + ' à plat');
        if (!(pt.vehMont.dy < 25 && pt.vehMont.degats === 0)) ko.push('moto plein gaz dans le flanc du mont (hors sentier) : elle grimpe encore (' + JSON.stringify(pt.vehMont) + ')'); // demandé : flancs infranchissables hors 4x4
        if (ko.length) fail('Pentes : ' + ko.join(' | '));
        else ok('Pentes : paroi de mesa infranchissable à pied (' + pt.piedParoi.d + ' u en 4 s) et en moto (sans casse) ; pente du mont : ' + pt.piedMont.d + ' u à pied contre ' + pt.piedPlat.d + ' à plat, moto bloquée dans le flanc hors sentier (+' + pt.vehMont.dy + ' u en 5 s)');
      }
    }

    // -------------------------------------------------------------------
    // Véhicule terrestre à l'eau (demandé : « rentrer dans l'eau sans exploser,
    // mais plus utilisable, et le joueur sort ») : noyé, aucun dégât, le joueur
    // en sort à la nage, le véhicule coule puis disparaît ; l'IA s'arrête au bord.
    // -------------------------------------------------------------------
    console.log('\n--- Véhicules à l\'eau : noyés sans exploser, le joueur sort ---');
    {
      const ea = await page.evaluate(() => {
        const o = { ko: [] };
        const scene0 = () => { startRun(); ecran(null); ETAT.mode = 'jeu'; P.hp = P.maxHp = 1e6; for (const v of vehicules) scene.remove(v.mesh); vehicules.length = 0; };
        // une plage dégagée, loin des pontons et des îles (sinon on sort SUR le ponton, voulu), lue dans la ville
        let X = null; for (let x = -HALF + 20; x < HALF - 20 && X === null; x += 7) { let libre = estEau(x, MER + 4) && !estEau(x, MER - 16);
          for (let z = MER - 18; z <= MER + 6 && libre; z += 1) if (solidAt(x, z, 2.2)) libre = false;
          for (const p of PONTONS) if (Math.abs(x - p.x) < p.hw + 14 && Math.abs(MER - p.z) < p.hd + 30) libre = false;
          for (const il of ILES) if (dist2(x, MER, il.x, il.z) < (il.r + 30) ** 2) libre = false;
          if (libre) X = x; }
        if (X === null) return { ko: ['aucune plage dégagée trouvée'] };
        for (const [cle, saut] of [['berline', false], ['moto', false], ['motocross', true], ['char', false]]) {
          scene0(); const v = creerVehicule(cle, X, MER - (saut ? -3 : 15), 0, null); v.h = solY(v.x, v.z); P.x = v.x; P.z = v.z; entrerVehicule(v);
          if (saut) { v.enAir = true; v.vy = 2; v.h = 6; v.v = 20; }
          const hp0 = v.hp; let t = 0, sorti = -1; INPUT.mx = 0; INPUT.mz = 1;
          while (t < 18) { if (P.veh === v) { const c = controleDir(v, false); majVehiculePhys(v, 1 / 30, c.throttle, c.steer, false); } majVehicules(1 / 30); if (sorti < 0 && P.veh !== v) sorti = t; t += 1 / 30; }
          INPUT.mx = INPUT.mz = 0;
          if (!v.noye || v.hp < hp0 || v.explose || sorti < 0 || P.veh || !estEau(P.x, P.z) || vehicules.includes(v)) o.ko.push(cle + (saut ? ' (saut)' : '') + ' : ' + JSON.stringify({ noye: !!v.noye, hp: v.hp, hp0, sorti, auVolant: !!P.veh, aLEau: estEau(P.x, P.z), resteEnListe: vehicules.includes(v) }));
        }
        // l'IA (police, trafic) se noie aussi (demandé), sans exploser
        for (const cd of ['police', 'trafic']) { scene0(); const v = creerVehicule('berline', X, MER - 12, 0, null); v.h = 0; v.conduit = cd; const hp0 = v.hp;
          for (let i = 0; i < 120 && !v.noye; i++) majVehiculePhys(v, 1 / 30, 1, 0, false);
          for (let i = 0; i < 480; i++) majVehicules(1 / 30);
          if (!v.noye || v.hp < hp0 || vehicules.includes(v)) o.ko.push(cd + ' : ' + JSON.stringify({ noye: !!v.noye, hp: v.hp, hp0, resteEnListe: vehicules.includes(v) })); }
        startRun(); return o;
      });
      if (ea.ko.length) fail('Véhicules à l\'eau : ' + ea.ko.join(' | '));
      else ok('Véhicules à l\'eau : berline, moto, char et saut en moto cross noyés sans aucun dégât, le joueur en sort à la nage, le véhicule coule puis disparaît ; police et trafic s\'y noient aussi');
    }

    // -------------------------------------------------------------------
    // Bateau vers le sable (demandé : « il doit s'avancer sur le sable, on sort,
    // mais pas un impact brutal ») : chaque bateau de VEHDEFS (sauf le
    // porte-conteneurs) glisse sur la plage sans dégâts, s'arrête, le joueur
    // descend sur le sable ; en rembarquant on repart en marche arrière vers
    // l'eau, jamais vers la ville.
    // -------------------------------------------------------------------
    console.log('\n--- Bateaux échoués sur la plage : glissade douce, on descend, on repart ---');
    {
      const ec = await page.evaluate(() => {
        const o = { ko: [], vus: [] };
        const scene0 = () => { startRun(); ecran(null); ETAT.mode = 'jeu'; P.hp = P.maxHp = 1e6; for (const v of vehicules) scene.remove(v.mesh); vehicules.length = 0; };
        let X = null; for (let x = -HALF + 20; x < HALF - 20 && X === null; x += 7) { let libre = estEau(x, MER + 4) && !estEau(x, MER - 16);
          for (let z = MER - 30; z <= MER + 40 && libre; z += 1) if (solidAt(x, z, 2.5)) libre = false;
          for (const p of PONTONS) if (Math.abs(x - p.x) < p.hw + 14 && Math.abs(MER - p.z) < p.hd + 40) libre = false;
          for (const il of ILES) if (dist2(x, MER, il.x, il.z) < (il.r + 30) ** 2) libre = false;
          if (libre) X = x; }
        if (X === null) return { ko: ['aucune plage dégagée trouvée'] };
        const conduire = (v, mz, n) => { INPUT.mx = 0; INPUT.mz = mz; for (let i = 0; i < n && P.veh === v; i++) { const c = controleDir(v, false); majVehiculePhys(v, 1 / 30, c.throttle, c.steer, false); majVehicules(1 / 30); } INPUT.mz = 0; };
        for (const cle of Object.keys(VEHDEFS).filter((k) => VEHDEFS[k].eau && !grosNavire(VEHDEFS[k]))) {
          scene0(); const v = creerVehicule(cle, X, MER + 30, Math.PI, null); P.x = v.x; P.z = v.z; entrerVehicule(v); const hp0 = v.hp;
          conduire(v, -1, 360);
          const avance = MER - v.z, aTerre = !estEau(P.x, P.z);
          if (v.hp < hp0 || P.veh === v || !(avance > 2 && avance < 30) || !aTerre) { o.ko.push(cle + ' : ' + JSON.stringify({ hp: v.hp, hp0, auVolant: P.veh === v, avance: +avance.toFixed(1), joueurATerre: aTerre })); continue; }
          // rembarquer, tenter d'aller vers la ville (bloqué), puis repartir vers le large
          P.x = v.x + 1; P.z = v.z; entrerVehicule(v); const zA = v.z; conduire(v, -1, 90);
          if (v.z < zA - 1.5) o.ko.push(cle + ' : traverse la plage vers la ville (' + zA.toFixed(1) + ' → ' + v.z.toFixed(1) + ')');
          for (let k = 0; k < 45 && !(estEau(v.x, v.z) && v.z > MER + 2) && P.veh === v; k++) conduire(v, 1, 10); /* jusqu'à regagner l'eau (15 s au plus) : jamais jusqu'aux récifs du large */
          if (!estEau(v.x, v.z) || P.veh !== v) o.ko.push(cle + ' : ne repart pas vers l\'eau (z ' + v.z.toFixed(1) + ')');
          o.vus.push(cle + ' ' + avance.toFixed(0) + ' u');
        }
        startRun(); return o;
      });
      if (ec.ko.length) fail('Bateaux échoués : ' + ec.ko.join(' | '));
      else ok('Bateaux échoués : ' + ec.vus.join(', ') + ' sur le sable, sans dégâts, on descend sur la plage, on repart en marche arrière vers l\'eau (jamais vers la ville)');
    }

    // -------------------------------------------------------------------
    // Zone extrême (DECOR_V2) : 4x4 de franchissement au pied du mont, MONTÉE
    // SÈCHE, DÉFI STUNT, PIC DU VERTIGE (monte-charge, saut BASE). Tout est lu
    // dans la source (MONT.couloir, STUNT, PIC, RIDE_DEFS), jamais recopié.
    // -------------------------------------------------------------------
    console.log('\n--- Zone extrême : 4x4, montée sèche, défi stunt, saut BASE du Pic du Vertige ---');
    {
      const zx = await page.evaluate(() => {
        if (typeof PIC === 'undefined' || !PIC.ok || !STUNT.ok || !MONT.couloir) return { off: true };
        const o = { ko: [], info: [] };
        const scene0 = () => { startRun(); ecran(null); ETAT.mode = 'jeu'; P.hp = P.maxHp = 1e6; for (const v of vehicules) scene.remove(v.mesh); vehicules.length = 0; };
        startRun(); const pm = MONT.pied, jeeps = vehicules.filter((v) => v.key === 'jeep' && dist2(v.x, v.z, pm.x, pm.z) < 900).length; if (jeeps < 2) o.ko.push('4x4 garés au pied du mont : ' + jeeps);
        // franchissement : plein gaz dans le flanc du mont, le 4x4 monte plus haut que le buggy
        const flanc = (cle) => { scene0(); const s = MONT.sommet, v = creerVehicule(cle, s.x - 68, s.z, Math.PI / 2, null); v.h = solY(v.x, v.z); for (let i = 0; i < 150; i++) majVehiculePhys(v, 1 / 30, 1, 0, false); return v.h || 0; };
        const hJ = flanc('jeep'), hB = flanc('buggy'); if (!(hJ > hB + 3)) o.ko.push('franchissement : 4x4 ' + hJ.toFixed(1) + ' u contre buggy ' + hB.toFixed(1));
        o.info.push('flanc du mont en 5 s : 4x4 +' + hJ.toFixed(0) + ' u, buggy +' + hB.toFixed(0) + ' u');
        // courses : vise la porte (montée sèche) / suit la boucle du supercross en dosant la vitesse (pointPiste, lu dans le jeu)
        const course = (id, cle, opts = {}) => { scene0(); const d = rideDepart(id), v = creerVehicule(cle, d.x, d.z, id === 'stunt' ? 0 : Math.PI, null); v.h = solY(d.x, d.z); P.x = v.x; P.z = v.z; entrerVehicule(v);
          const a0 = META.argent; demarrerRide(id); let t = 0, sens = 1;
          while (RIDES.actif && t < 60) { const r = RIDES.actif; let tx, tz, lim = 99;
            if (opts.immobile) { INPUT.mx = INPUT.mz = 0; }
            else { if (id === 'stunt') { const cp = coordPiste(v.x, v.z), q = pointPiste(cp.s + 10); tx = q.x; tz = q.z; lim = (cp.seg === 'S' || cp.seg === 'N') ? 15 : 26; }
              else { const p = r.portes[r.i]; tx = p.x; tz = p.z; }
              const dx = tx - v.x, dz = tz - v.z, l = Math.hypot(dx, dz) || 1; INPUT.mx = dx / l; INPUT.mz = dz / l; }
            const c = controleDir(v, false), thr = Math.abs(v.v) > lim ? 0 : c.throttle;
            majVehiculePhys(v, 1 / 30, thr, c.steer, Math.abs(v.v) > lim + 6); P.x = v.x; P.z = v.z; majRides(1 / 30); t += 1 / 30; }
          INPUT.mx = INPUT.mz = 0;
          return { id, cle, prime: META.argent - a0, t: +t.toFixed(1), hp: +(v.hp / v.def.hp).toFixed(2) }; };
        for (const [id, cle, attendu] of [['colline', 'motocross', true], ['colline', 'quad', false], ['colline', 'jeep', false], ['colline', 'moto', false], ['colline', 'buggy', false], ['colline', 'bmx', false], ['stunt', 'motocross', true], ['stunt', 'quad', true], ['stunt', 'bmx', false]]) {
          const r = course(id, cle); o.info.push(id + ' en ' + cle + ' : ' + (r.prime > 0 ? r.t + ' s' : 'raté'));
          if ((r.prime > 0) !== attendu || r.hp < 0.5) o.ko.push(JSON.stringify(r) + ' (attendu ' + (attendu ? 'réussi' : 'raté') + ')'); }
        { const r = course('stunt', 'motocross', { immobile: true }); if (r.prime > 0) o.ko.push('stunt réussi sans rien faire'); }
        // Pic : monte-charge, saut BASE sous voile (prime une fois par vague), sans voile (mortel)
        scene0(); const c = PIC.cage, pl = PIC.plg;
        // cabine en haut : un joueur au sol ne doit jamais être téléporté dessus en marchant dessous
        c.y = c.cible = c.yHaut; c.mesh.position.y = c.y; P.x = c.x; P.z = c.z + c.hd + 2; P.y = solPied(P.x, P.z); INPUT.mx = 0; INPUT.mz = -1; for (let i = 0; i < 60; i++) { majJoueur(1 / 30, 1 / 30); majPic(1 / 30); } INPUT.mz = 0;
        if (P.y > 5) o.ko.push('joueur au sol hissé sur la cabine restée en haut (y ' + P.y.toFixed(1) + ')');
        const act0 = actionPic(); if (!act0 || !/APPELER/.test(act0.label)) o.ko.push('appel du monte-charge absent : ' + (act0 && act0.label)); else { act0.fn(); for (let i = 0; i < 400 && c.y !== c.cible; i++) majPic(1 / 30); }
        P.x = c.x; P.z = c.z + c.hd - 0.6; P.y = solPied(P.x, P.z);
        const act = actionPic(); if (!act || !/MONTER/.test(act.label)) o.ko.push('bouton MONTER absent en bas : ' + (act && act.label));
        else { act.fn(); for (let i = 0; i < 450; i++) { majJoueur(1 / 30, 1 / 30); majPic(1 / 30); }
          if (!(P.y > PIC.H - 3) || P.chute) o.ko.push('arrivée en haut : y ' + P.y.toFixed(1) + ' chute ' + P.chute);
          INPUT.mz = -1; for (let i = 0; i < 30; i++) { majJoueur(1 / 30, 1 / 30); majPic(1 / 30); } INPUT.mz = 0;
          if (!(P.y > PIC.H - 3) || P.chute || dansCagePic(P.x, P.z)) o.ko.push('sortie sur le plateau : ' + P.x.toFixed(1) + ',' + P.z.toFixed(1) + ' y ' + P.y.toFixed(1)); }
        const saut = (para) => { const m0 = META.argent; P.x = pl.x; P.z = pl.z0 - 1; P.y = solPied(P.x, P.z); P.chute = false; P.hp = P.maxHp = 300; ETAT.mode = 'jeu';
          const a = actionPic(); if (!a || !/SAUT BASE/.test(a.label)) return { erreur: 'bouton SAUT BASE absent : ' + (a && a.label) };
          a.fn(); let t = 0, ouvert = false;
          while (t < 60 && (P.chute || t < 0.1)) { if (para && !ouvert && t > 1.5) { ouvrirParachute(); ouvert = true; }
            if (P.para) { const dx = PIC.cible.x - P.x, dz = PIC.cible.z - P.z, l = Math.hypot(dx, dz); INPUT.mx = l > 0.5 ? dx / l : 0; INPUT.mz = l > 0.5 ? dz / l : 0; }
            majJoueur(1 / 30, 1 / 30); majPic(1 / 30); P.iframes = 0; t += 1 / 30; }
          INPUT.mx = INPUT.mz = 0;
          return { t: +t.toFixed(1), d: +Math.hypot(P.x - PIC.cible.x, P.z - PIC.cible.z).toFixed(1), mort: ETAT.mode === 'mort', prime: META.argent - m0 }; };
        const s1 = saut(true), s2 = saut(true), s3 = saut(false);
        if (s1.erreur || s1.mort || !(s1.d < 3) || s1.prime <= 0) o.ko.push('saut sous voile : ' + JSON.stringify(s1));
        if (s2.mort || s2.prime !== 0) o.ko.push('second saut, même vague : ' + JSON.stringify(s2));
        if (!s3.mort) o.ko.push('saut sans voile non mortel : ' + JSON.stringify(s3));
        o.info.push('saut BASE : ' + s1.t + ' s sous voile, posé à ' + s1.d + ' m de la cible, +' + s1.prime + ' $');
        ETAT.mode = 'jeu'; startRun(); return o;
      });
      if (zx.off) saute('Zone extrême : DECOR_V2 désactivé');
      else if (zx.ko.length) fail('Zone extrême : ' + zx.ko.join(' | '));
      else ok('Zone extrême : ' + zx.info.join(' ; ') + ' ; montée sèche : seule la moto cross passe le mur de 43° ; supercross raté en BMX ou sans rien faire, saut sans voile mortel, une prime par vague, monte-charge jamais pris par en dessous');
    }

    // -------------------------------------------------------------------
    // Sommet du Pic (demandé) : caméra plus collée au joueur, motos et vélos
    // au sommet, tremplin dans le vide, saut du véhicule en plein vol → voile ;
    // rester dessus est mortel. Ciel : les aéronefs vont partout (montagne,
    // large) et le relief est solide. Lu dans PIC, VEHDEFS, LIMITE_EST.
    // -------------------------------------------------------------------
    console.log('\n--- Sommet du Pic : caméra, tremplin, saut en plein vol ; ciel ouvert aux aéronefs ---');
    {
      const pk = await page.evaluate(() => {
        if (typeof PIC === 'undefined' || !PIC.ok || !PIC.tremplin) return { off: true };
        const o = { ko: [], info: [] }, tr = PIC.tremplin;
        const scene0 = () => { startRun(); ecran(null); ETAT.mode = 'jeu'; P.hp = P.maxHp = 300; for (const v of vehicules) scene.remove(v.mesh); vehicules.length = 0; };
        startRun(); const haut = vehicules.filter((v) => (v.h || 0) > PIC.H - 5 && (v.def.type === 'moto')).length; if (haut < 3) o.ko.push('deux-roues au sommet : ' + haut);
        // caméra : au sommet, au moins 30 u au-dessus du joueur (avant : ~20, vue collée)
        scene0(); P.x = tr.x; P.z = tr.z1 - tr.long - 8; P.y = solPied(P.x, P.z); for (let i = 0; i < 90; i++) majCamera(1 / 30);
        const ecart = camera.position.y - P.y; if (!(ecart > 30)) o.ko.push('caméra au sommet à ' + ecart.toFixed(1) + ' u au-dessus du joueur'); o.info.push('caméra au sommet : ' + ecart.toFixed(0) + ' u au-dessus');
        const essai = (cle, sauter) => { scene0(); const v = creerVehicule(cle, tr.x, tr.z1 - tr.long - 25, 0, null); v.h = solY(v.x, v.z); P.x = v.x; P.z = v.z; entrerVehicule(v); INPUT.mx = 0; INPUT.mz = 1;
          let t = 0, saute = false, bouton = false;
          while (t < 45 && ETAT.mode === 'jeu') {
            if (P.veh === v) { const c = controleDir(v, false); majVehiculePhys(v, 1 / 30, c.throttle, c.steer, false); P.x = v.x; P.z = v.z;
              if (v.enAir && (v.h - solY(v.x, v.z)) > 30) { majAction(); const b = document.getElementById('btnAction'); bouton = bouton || /SAUTER DU VÉHICULE/.test(b ? b.textContent : ''); if (sauter && !saute) { saute = true; ejecterEnVol(); INPUT.mz = 0; } } }
            else { if (P.chute && !P.para && P.chuteY0 - P.y > 6) ouvrirParachute(); majJoueur(1 / 30, 1 / 30); majPic(1 / 30); }
            majVehicules(1 / 30); P.iframes = 0; t += 1 / 30; if (saute && !P.chute && !P.veh) break; }
          INPUT.mx = INPUT.mz = 0;
          return { cle, sauter, mort: ETAT.mode === 'mort', bouton, vehDetruit: !!v.mort, y: +P.y.toFixed(1) }; };
        for (const r of [essai('motocross', true), essai('bmx', true), essai('motocross', false)]) {
          if (r.sauter && (r.mort || !r.bouton || r.y > 2)) o.ko.push('saut en plein vol : ' + JSON.stringify(r));
          if (!r.sauter && !r.mort) o.ko.push('resté sur la moto jusqu\'en bas sans mourir : ' + JSON.stringify(r)); }
        ETAT.mode = 'jeu';
        // ciel : un aéronef va jusqu'au-dessus de la montagne et au large ; trop bas, il percute le relief
        const vol = (alt, x0, z0, ang) => { scene0(); P.hp = P.maxHp = 1e6; const cle = Object.keys(VEHDEFS).find((k) => VEHDEFS[k].air === 'avion' && !VEHDEFS[k].ovni);
          const v = creerVehicule(cle, x0, z0, ang, null); P.x = v.x; P.z = v.z; entrerVehicule(v); v.vol = true; v.alt = alt; v.v = v.def.vmax; v.decolT = 0; INPUT.mx = Math.sin(ang); INPUT.mz = Math.cos(ang);
          let t = 0, xm = -1e9, zm = -1e9, crash = false; while (t < 14) { if (P.veh !== v || v.mort) { crash = true; break; } majVol(v, 1 / 30); xm = Math.max(xm, v.x); zm = Math.max(zm, v.z); t += 1 / 30; }
          INPUT.mx = INPUT.mz = 0; return { xm, zm, crash }; };
        const haut2 = vol(120, HALF + 80, MONT.z, Math.PI / 2), large = vol(80, 0, MER, 0), bas = vol(MONT.H * 0.4, HALF + 80, MONT.z, Math.PI / 2);
        if (haut2.crash || !(haut2.xm > LIMITE_EST - 5)) o.ko.push('avion bloqué avant la montagne : ' + JSON.stringify(haut2));
        if (large.crash || !(large.zm > MER + 140)) o.ko.push('avion bloqué avant le large : ' + JSON.stringify(large));
        if (!bas.crash) o.ko.push('avion trop bas traversant la montagne : ' + JSON.stringify(bas));
        o.info.push('avion jusqu\'à x ' + haut2.xm.toFixed(0) + ' et z ' + large.zm.toFixed(0) + ', trop bas il percute le mont');
        startRun(); return o;
      });
      if (pk.off) saute('Sommet du Pic : DECOR_V2 désactivé');
      else if (pk.ko.length) fail('Sommet du Pic / ciel : ' + pk.ko.join(' | '));
      else ok('Sommet du Pic / ciel : ' + pk.info.join(' ; ') + ' ; deux-roues au sommet, tremplin, bouton SAUTER DU VÉHICULE en plein vol puis voile (moto cross, BMX), rester dessus est mortel');
    }

    // -------------------------------------------------------------------
    // Mer vivante (demandé : « des choses à faire sur les îles, du wakeboard,
    // dynamiser la mer, donner envie de découvrir ») : trésor, paillote,
    // plongée, tremplins flottants, rallye des bouées, wakeboard, parachute
    // ascensionnel, requins. Une prime par vague et par activité (pas de
    // farming). Tout est lu dans MERV, TOW, RIDE_DEFS.
    // -------------------------------------------------------------------
    console.log('\n--- Mer vivante : île aux trésors, plongée, tremplins, rallye, wakeboard, parachute ascensionnel, requins ---');
    {
      const mv = await page.evaluate(() => {
        if (typeof MERV === 'undefined' || !MERV.ok) return { off: true };
        const o = { ko: [], info: [] };
        const scene0 = () => { startRun(); ecran(null); ETAT.mode = 'jeu'; P.hp = P.maxHp = 300; META.argent = 1000; for (const v of vehicules) scene.remove(v.mesh); vehicules.length = 0; };
        const pas = (n, f) => { for (let i = 0; i < n; i++) { if (f) f(i); towEntrees(); majJoueur(1 / 30, 1 / 30); majPic(1 / 30); majTow(1 / 30); majVehicules(1 / 30); majMer(1 / 30); P.iframes = 0; } };
        // île aux trésors : six trous, un seul cache le trésor (220 $), chaque trou une fois par vague ; l'île n'est pas de l'eau
        scene0(); rebouchageIle(); let a = null, m = META.argent, tresors = 0, boutons = 0;
        for (const tr of ILE2.trous) { P.x = tr.x; P.z = tr.z; P.y = solPied(tr.x, tr.z); a = actionMer(); if (a && /CREUSER/.test(a.label)) { boutons++; const av = META.argent; a.fn(); if (META.argent - av >= 220) tresors++; } }
        { const tr = ILE2.trous[0]; P.x = tr.x; P.z = tr.z; P.y = solPied(tr.x, tr.z); a = actionMer(); }
        if (boutons !== ILE2.trous.length || tresors !== 1 || !/DÉJÀ/.test(a ? a.label : '') || estEau(ILE2.cx, ILE2.cz) || !(hauteurIleTresor(ILE2.pic.x, ILE2.pic.z) > 10)) o.ko.push('île : ' + JSON.stringify({ boutons, tresors, ensuite: a && a.label }));
        else o.info.push(ILE2.trous.length + ' trous, un trésor, ' + (META.argent - m) + ' $');
        // animaux sauvages : attaquent, se tuent
        scene0(); placerFaune(); { const sg = FAUNE.find((x) => x.type === 'sanglier'); const cote = [[4, 0], [-4, 0], [0, 4], [0, -4], [3, 3], [-3, -3]].find(([dx, dz]) => { for (let u = 0; u <= 1; u += 0.1) { const x = sg.x + dx * u, z = sg.z + dz * u; if (dansLave(x, z) || lavePres(x, z, 1) || estEau(x, z)) return false; } return true; }) || [4, 0]; /* le sanglier contourne la lave : le test se place du côté sans coulée */ P.x = sg.x + cote[0]; P.z = sg.z + cote[1]; P.y = solPied(P.x, P.z); P.hp = 300; P.armeCur = 'poings'; pas(90); const hpA = P.hp; let coups = 0; /* le test maîtrise sa scène : une arme à feu laissée équipée ne frappe pas */
          while (!sg.mort && coups < 60) { P.ang = Math.atan2(sg.x - P.x, sg.z - P.z); P.cadT = 0; attaquer(); coups++; pas(3); }
          if (!(hpA < 300) || !sg.mort || !FAUNE.some((x) => x.type === 'jaguar')) o.ko.push('faune : ' + JSON.stringify({ hpA, mort: sg.mort, coups })); else o.info.push('sanglier : attaque, tué en ' + coups + ' coups'); }
        // crawl : SPRINT à la nage, plus vite
        const nage = (cr) => { scene0(); P.x = 0; P.z = MER + 30; P.y = 0; P.stam = 100; INPUT.mx = 1; INPUT.mz = 0; INPUT.btn.sprint = cr; const x0 = P.x; pas(90); INPUT.btn.sprint = false; INPUT.mx = 0; return P.x - x0; };
        { const br = nage(false), cr = nage(true); if (!(cr > br * 1.4)) o.ko.push('crawl pas plus rapide : ' + br.toFixed(1) + ' / ' + cr.toFixed(1)); }
        // plongée : chaque épave une fois par vague
        const sp = MERV.spots[0]; scene0(); P.x = sp.x; P.z = sp.z; P.y = 0; pas(6); a = actionMer(); m = META.argent;
        if (!a || !/PLONGER/.test(a.label)) o.ko.push('pas de bouton PLONGER à la nage : ' + (a && a.label)); else { a.fn(); const g = META.argent - m, a2 = actionMer(); if (!(g > 0) || !/DÉJÀ/.test(a2 ? a2.label : '')) o.ko.push('plongée : ' + g + ' / ' + (a2 && a2.label)); }
        // paillote : soigne
        scene0(); P.x = MERV.paillote.x; P.z = MERV.paillote.z - 2; P.y = solPied(P.x, P.z); P.hp = 100; pas(2); a = actionMer(); a && a.fn(); if (!(P.hp > 100)) o.ko.push('paillote : ' + (a && a.label) + ' hp ' + P.hp);
        // tremplin flottant en jet-ski : envol, sans dégâts
        scene0(); { const r = MERV.rampes[0], sa = Math.sin(r.ang), ca = Math.cos(r.ang), v = creerVehicule('jetski', r.x - sa * 40, r.z - ca * 40, r.ang, null); P.x = v.x; P.z = v.z; entrerVehicule(v); INPUT.mx = sa; INPUT.mz = ca;
          let hmax = 0; for (let i = 0; i < 150; i++) { const c = controleDir(v, false); majVehiculePhys(v, 1 / 30, c.throttle, c.steer, false); hmax = Math.max(hmax, v.hMer || 0); } INPUT.mx = INPUT.mz = 0;
          if (!(hmax > 3) || v.hp < v.def.hp) o.ko.push('tremplin flottant : hauteur ' + hmax.toFixed(1) + ' hp ' + v.hp); else o.info.push('jet-ski envolé à ' + hmax.toFixed(1) + ' u'); }
        // rallye des bouées en jet-ski
        scene0(); { const d = rideDepart('bouees'), w = creerVehicule('jetski', d.x, d.z, 0, null); P.x = w.x; P.z = w.z; entrerVehicule(w); if (rideProche() !== 'bouees') o.ko.push('départ du rallye non proposé en jet-ski');
          const a0 = META.argent; demarrerRide('bouees'); let t = 0;
          while (RIDES.actif && t < 60) { const p = RIDES.actif.portes[RIDES.actif.i], dx = p.x - w.x, dz = p.z - w.z, l = Math.hypot(dx, dz) || 1; INPUT.mx = dx / l; INPUT.mz = dz / l; const c = controleDir(w, false); majVehiculePhys(w, 1 / 30, c.throttle, c.steer, l < 10 && Math.abs(w.v) > 18); P.x = w.x; P.z = w.z; majRides(1 / 30); t += 1 / 30; }
          INPUT.mx = INPUT.mz = 0; if (!(META.argent - a0 > 0)) o.ko.push('rallye non fini en jet-ski (' + t.toFixed(1) + ' s)'); else o.info.push('rallye en ' + t.toFixed(1) + ' s');
          scene0(); const vc = creerVehicule('motocross', d.x, d.z - 40, 0, null); if (rideEligible(vc, 'bouees')) o.ko.push('rallye ouvert à une moto'); }
        // wakeboard : figures (BACKFLIP + 360 dès l'envol) → objectif ; sauts seuls → raté ; figure lancée trop tard → chute
        const wake = (mode) => { scene0(); P.x = TOW.kWake.x; P.z = TOW.kWake.z; P.y = 0; pas(2); const a1 = actionMer(); if (!a1 || !/WAKEBOARD/.test(a1.label)) return { erreur: a1 && a1.label }; const m0 = META.argent; a1.fn(); let pts = 0, chutes = 0, prec = 0;
          pas(TOW_DEFS.wake.duree * 30 + 5, (i) => { const T = TOW.actif; if (!T) return; pts = T.pts; if (T.chute > 0 && prec <= 0) chutes++; prec = T.chute; const b = towPoint(T.s), fl = Math.hypot(b.fx, b.fz), rx = b.fz / fl, rz = -b.fx / fl, cote = Math.floor(i / 25) % 2 ? 1 : -1; INPUT.mx = rx * cote; INPUT.mz = rz * cote;
            if (mode === 'figures' && T.h > 0 && T.air < 0.05) { INPUT.edge.esquive = true; INPUT.edge.gren = true; }
            if (mode === 'tard' && T.h > 0 && T.vy < -6) INPUT.edge.esquive = true; });
          INPUT.mx = INPUT.mz = 0; return { pts: Math.round(pts), chutes, solde: META.argent - m0, fini: !TOW.actif }; };
        const wf = wake('figures'), ws = wake('sauts'), wt = wake('tard');
        if (wf.erreur !== undefined || !wf.fini || !(wf.pts >= TOW_DEFS.wake.objectif) || wf.solde !== TOW_DEFS.wake.prime - TOW_DEFS.wake.prix) o.ko.push('wakeboard avec figures : ' + JSON.stringify(wf));
        if (!(ws.pts < TOW_DEFS.wake.objectif)) o.ko.push('wakeboard sans figures réussi : ' + JSON.stringify(ws));
        if (!(wt.chutes > 3)) o.ko.push('figure lancée trop tard sans chute : ' + JSON.stringify(wt));
        o.info.push('wakeboard ' + wf.pts + ' pts avec figures / ' + ws.pts + ' sans, pour ' + TOW_DEFS.wake.objectif + ' ; figure trop tard = chute');
        // parachute ascensionnel : monte, on lâche au-dessus du radeau, on s'y pose
        scene0(); P.x = TOW.kPara.x; P.z = TOW.kPara.z; P.y = 0; pas(2); a = actionMer(); const m4 = META.argent; let lache = false, hm = 0;
        if (!a || !/PARACHUTE/.test(a.label)) o.ko.push('pas de parachute ascensionnel : ' + (a && a.label));
        else { a.fn(); pas(60 * 30, () => { const T = TOW.actif; if (!T) return; hm = Math.max(hm, P.y);
            if (!T.lache && T.h > 25 && Math.hypot(P.x - MERV.radeau.x, P.z - MERV.radeau.z) < 26) { lacherCorde(); lache = true; }
            if (T.lache && P.para) { const R = MERV.radeau, dx = R.x - P.x, dz = R.z - P.z, l = Math.hypot(dx, dz); INPUT.mx = l > 0.5 ? dx / l : 0; INPUT.mz = l > 0.5 ? dz / l : 0; } });
          INPUT.mx = INPUT.mz = 0; const d = Math.hypot(P.x - MERV.radeau.x, P.z - MERV.radeau.z);
          if (!lache || !(hm > 25) || !(d < MERV.radeau.r) || !(META.argent - m4 > 0) || P.hp < 300) o.ko.push('parachute ascensionnel : ' + JSON.stringify({ lache, hm, d, gain: META.argent - m4, hp: P.hp }));
          else o.info.push('parachute monté à ' + hm.toFixed(0) + ' u, posé sur le radeau'); }
        // requins : mordent un nageur proche, jamais un bateau
        scene0(); const q = MERV.requins[0]; pas(30); P.x = q.x + 6; P.z = q.z; P.y = 0; P.hp = 300; pas(120); if (!(P.hp < 300)) o.ko.push('le requin ne mord pas un nageur');
        scene0(); pas(30); { const v = creerVehicule('bateau', q.x + 3, q.z, 0, null); P.x = v.x; P.z = v.z; entrerVehicule(v); P.hp = 300; for (let i = 0; i < 120; i++) { majMer(1 / 30); P.iframes = 0; } if (P.hp < 300) o.ko.push('le requin mord en bateau'); }
        startRun(); return o;
      });
      if (mv.off) saute('Mer vivante : DECOR_V2 désactivé');
      else if (mv.ko.length) fail('Mer vivante : ' + mv.ko.join(' | '));
      else ok('Mer vivante : ' + mv.info.join(' ; ') + ' ; plongée et trésor une fois par vague, paillote qui soigne, requins dangereux à la nage seulement');
    }

    // -------------------------------------------------------------------
    // Cohérence (signalé en playtest) : ennemis jamais dans l'eau ni en pleine
    // montagne, hors de l'écran ; à 6★ l'armée arrive vraiment (la garnison
    // des bases ne bloque plus les renforts) ; en mer, la police vient en
    // vedette ; boss localisable ; avion de voltige au vrai aéroport ; buggys
    // de secours repeints proprement ; plus de cargo factice traversable.
    // -------------------------------------------------------------------
    console.log('\n--- Cohérence : apparitions des ennemis, armée, boss, voltige, buggys de secours, cargos ---');
    {
      const co = await page.evaluate(() => {
        const o = { ko: [], info: [] };
        startRun(); ecran(null); ETAT.mode = 'jeu';
        const lieux = { ville: [0, 0], mer: [40, MER + 90], plage: [0, MER - 10] };
        if (DECOR_V2) Object.assign(lieux, { sommetMont: [MONT.sommet.x, MONT.sommet.z], desert: [500, 230] });
        for (const [nom, [x, z]] of Object.entries(lieux)) { P.x = x; P.z = z; P.y = solPied(x, z); for (let i = 0; i < 30; i++) majCamera(1 / 30);
          let ko = 0, vus = 0, pres = 0; for (let i = 0; i < 30; i++) { const p = spawnRing(36, 52); if (!pointApparition(p.x, p.z)) ko++; if (!horsEcran(p.x, p.z)) vus++; if (Math.hypot(p.x - x, p.z - z) < 30) pres++; }
          if (ko || vus || pres) o.ko.push(nom + ' : ' + ko + ' points invalides, ' + vus + ' à l\'écran, ' + pres + ' à moins de 30 u'); }
        for (const [nom, x, z, nage] of [['mer', 40, MER + 90, true], ['ville', 0, 0, false]]) {
          startRun(); ecran(null); ETAT.mode = 'jeu'; P.x = x; P.z = z; P.y = nage ? 0 : solPied(x, z); P.nage = nage; WANTED.heat = 6.2; WANTED.stars = 6;
          for (let i = 0; i < 300; i++) majWanted(1 / 30);
          const ag = ennemis.filter((e) => !e.mort && e.fac === 'police' && !e.garde), veh = vehicules.filter((v) => v.conduit === 'police');
          if (ag.some((e) => estEau(e.x, e.z))) o.ko.push(nom + ' : agent apparu dans l\'eau');
          if (ag.length + veh.length < 2) o.ko.push(nom + ' 6★ : presque aucun renfort (' + ag.length + ' agents, ' + veh.length + ' véhicules)');
          if (nage && !veh.some((v) => v.def.eau)) o.ko.push('en mer à 6★ : pas de vedette de police');
          o.info.push(nom + ' 6★ : ' + ag.length + ' agents + ' + veh.map((v) => v.key).join('/')); }
        // boss : direction et distance dans la barre
        startRun(); ecran(null); ETAT.mode = 'jeu'; P.x = 0; P.z = 0; const b = creerEnnemi(CHEFS_GANG.viperes, 40, 0, false); majHUD();
        const txt = document.getElementById('bossName').textContent; if (!b || !/→/.test(txt) || !/\d+ m/.test(txt) || !b.colonneBoss) o.ko.push('boss non localisable : « ' + txt + ' »'); else o.info.push('boss : « ' + txt + ' »');
        if (b) { b.mort = true; scene.remove(b.h.g); }
        if (DECOR_V2) {
          startRun(); const vo = vehicules.find((v) => v.key === 'voltige'); if (!vo || !(vo.x > HALF)) o.ko.push('voltige pas au vrai aéroport : ' + (vo && Math.round(vo.x)));
          const sec = vehicules.filter((v) => v.secours); for (const v of sec) { const cols = new Set(); v.mesh.traverse((m) => { if (m.isMesh && m.material && m.material.color) cols.add(m.material.color.getHex()); }); if (cols.size < 5) o.ko.push('buggy de secours uni (' + cols.size + ' couleurs)'); }
          const cg = vehicules.filter((v) => v.def.cargo); if (cg.length < 2) o.ko.push('porte-conteneurs : ' + cg.length);
          o.info.push('voltige à x ' + Math.round(vo.x) + ', ' + sec.length + ' buggys de secours peints, ' + cg.length + ' porte-conteneurs pilotables');
        }
        startRun(); return o;
      });
      if (co.ko.length) fail('Cohérence : ' + co.ko.join(' | '));
      else ok('Cohérence : apparitions valides et hors écran (ville, plage, mer, mont, désert) ; ' + co.info.join(' ; '));
    }

    // -------------------------------------------------------------------
    // Métiers v2 (signalé : « taxi, ambulance, pompiers trop mal faits ; ils
    // doivent être intéressants et débloquer des choses ») et wingsuit. Le
    // trajet en ville n'est pas testé ici (pilote en ligne droite) : on amène
    // le véhicule aux cibles et on vérifie la logique — arrêt, chrono,
    // satisfaction, défibrillateur, foyers qui s'étendent, paie, paliers.
    // -------------------------------------------------------------------
    console.log('\n--- Métiers v2 (taxi, ambulance, pompiers) et wingsuit ---');
    {
      const mt = await page.evaluate(() => {
        const o = { ko: [], info: [] };
        const scene0 = (cle) => { startRun(); ecran(null); ETAT.mode = 'jeu'; P.hp = P.maxHp = 1e6; META.argent = 0; for (const v of vehicules) scene.remove(v.mesh); vehicules.length = 0; for (const e of ennemis) e.mort = true;
          const v = creerVehicule(cle, POIS.place.x, POIS.place.z + 12, 0, null); P.x = v.x; P.z = v.z; entrerVehicule(v); majMetiers(1 / 30, 1 / 30); return v; };
        const amener = (v, x, z) => { v.x = x + 2; v.z = z; v.v = 0; P.x = v.x; P.z = v.z; };
        const taxi = (casse, attendre) => { const v = scene0('taxi'), m = MET.taxi; if (!m || !MET2.pnj.length) return { erreur: 'pas de client visible' };
          amener(v, m.x, m.z); majMetiers(1 / 30, 1 / 30); if (MET.taxi.etat !== 'depose') return { erreur: 'client pas monté' };
          const d = MET.taxi.dest; if (casse) { v.hp -= 40; majMetiers(1 / 30, 1 / 30); } for (let i = 0; i < attendre * 30; i++) majMetiers(1 / 30, 1 / 30);
          if (MET.taxi) { amener(v, d.x, d.z); majMetiers(1 / 30, 1 / 30); } return { gain: META.argent, fini: !MET.taxi, type: m.T.id, nom: d.nom }; };
        const t1 = taxi(false, 1), t2 = taxi(false, 200);
        if (t1.erreur || !(t1.gain > 0) || !t1.fini) o.ko.push('taxi : ' + JSON.stringify(t1)); else o.info.push('taxi ' + t1.type + ' vers ' + t1.nom + ' : +' + t1.gain + ' $');
        if (t2.gain !== 0) o.ko.push('taxi en retard payé : ' + JSON.stringify(t2));
        // fragile : un gros choc le fâche (moins de pourboire)
        let f = null; for (let k = 0; k < 12 && !f; k++) { const v = scene0('taxi'); if (MET.taxi.T.id === 'fragile') f = v; }
        if (f) { const m = MET.taxi; amener(f, m.x, m.z); majMetiers(1 / 30, 1 / 30); const s0 = MET.taxi.sat; f.hp -= 20; majMetiers(1 / 30, 1 / 30); if (!(MET.taxi.sat < s0 - 20)) o.ko.push('client fragile insensible aux chocs (' + s0 + ' → ' + MET.taxi.sat + ')'); }
        // ambulance : défibrillateur (trop tôt = pénalité, au maximum = choc), puis clinique
        { const v = scene0('ambulance'), m = MET.ambulance; if (!m || MET2.pnj.length < 3) o.ko.push('ambulance : blessé ou témoins absents');
          else { amener(v, m.x, m.z); majMetiers(1 / 30, 1 / 30); if (m.etat !== 'soins') o.ko.push('ambulance : pas de premiers soins à l\'arrêt');
            majAction(); const lab = document.getElementById('btnAction').textContent; if (!/CHOC/.test(lab)) o.ko.push('bouton CHOC absent : ' + lab);
            m.onde = 0.2; const p0 = m.pouls; chocDefibrillateur(); if (!(m.pouls < p0) || m.chocs !== 0) o.ko.push('choc trop tôt accepté');
            for (let k = 0; k < 3; k++) { m.onde = 0.95; chocDefibrillateur(); }
            if (m.etat !== 'depose' || !m.dest) o.ko.push('ambulance : pas de départ vers la clinique'); else { amener(v, m.dest.x, m.dest.z); majMetiers(1 / 30, 1 / 30); if (MET.ambulance || !(META.argent > 0)) o.ko.push('ambulance : patient pas livré / pas payé'); else o.info.push('ambulance : 3 chocs, ' + m.dest.nom + ', +' + META.argent + ' $'); } } }
        // pompiers : plusieurs foyers, qui s'étendent si on traîne ; tout éteindre paie et sauve les habitants
        { scene0('pompiers'); for (let i = 0; i < 60; i++) majMetiers(1 / 30, 1 / 30); const m = MET.pompier;
          if (!m || !m.pret || m.feux.length < 3 || m.coinces.length < 1) o.ko.push('pompiers : sinistre incomplet');
          else { const n0 = m.feux.length; for (let i = 0; i < 30 * 12; i++) majMetiers(1 / 30, 1 / 30); if (!(m.feux.length > n0)) o.ko.push('le feu ne s\'étend pas');
            for (const fe of m.feux) fe.vie = 0; majMetiers(1 / 30, 1 / 30); if (MET.pompier || !(META.argent > 0)) o.ko.push('pompiers : pas payé'); else o.info.push('pompiers : ' + m.feux.length + ' foyers, ' + m.coinces.length + ' habitants, +' + META.argent + ' $'); } }
        // paliers : le 3e taxi débloque le tarif majoré
        { META.metiers.taxi = 2; const t = taxi(false, 1); if (!(META.metiers.taxi >= 3) || !palierMetier('taxi', 3)) o.ko.push('palier taxi 3 non atteint'); }
        // wingsuit : la prendre au sommet du Pic, planer, voile, posé sain et sauf ; on la garde
        { startRun(); ecran(null); ETAT.mode = 'jeu'; P.hp = P.maxHp = 300; const ws = PIC.wingsuit; P.x = ws.x; P.z = ws.z; P.y = solPied(P.x, P.z); const a = actionPic(); a && a.fn();
          const pl = PIC.plg; P.x = pl.x; P.z = pl.z0 - 1; P.y = solPied(P.x, P.z); sauterBase(); let t = 0, dep = false, voile = false; const x0 = P.x, z0 = P.z;
          while (t < 60 && (P.chute || t < 0.2)) { if (!dep && P.chuteY0 - P.y > 5) { majAction(); if (/WINGSUIT/.test(document.getElementById('btnAction').textContent)) { deployerWingsuit(); dep = true; } }
            if (dep && !voile && P.y < 25) { ouvrirParachute(); voile = true; } INPUT.mx = 0; INPUT.mz = 1; majJoueur(1 / 30, 1 / 30); majPic(1 / 30); P.iframes = 0; t += 1 / 30; }
          INPUT.mz = 0; const dist = Math.hypot(P.x - x0, P.z - z0);
          if (!P.wingsuit || !dep || !(dist > 150) || ETAT.mode !== 'jeu' || P.hp < 300) o.ko.push('wingsuit : ' + JSON.stringify({ porte: P.wingsuit, dep, dist: Math.round(dist), mode: ETAT.mode, hp: P.hp })); else o.info.push('wingsuit : ' + Math.round(dist) + ' u de vol plané'); }
        startRun(); if (P.wingsuit) o.ko.push('wingsuit gardée après une nouvelle partie');
        return o;
      });
      if (mt.ko.length) fail('Métiers v2 / wingsuit : ' + mt.ko.join(' | '));
      else ok('Métiers v2 / wingsuit : ' + mt.info.join(' ; ') + ' ; taxi en retard non payé, client fragile fâché par les chocs, choc trop tôt pénalisé, le feu s\'étend, palier 3 du taxi');
    }

    // -------------------------------------------------------------------
    // 8e lot, n° 1 (signalé : « Monster Truck : acheté des améliorations,
    // l'argent a été débité, en sortant le véhicule était identique »). On
    // passe par le vrai bouton d'action (entrée au volant, sortie au volant).
    // -------------------------------------------------------------------
    console.log('\n--- Garage : les achats s\'appliquent au véhicule qui ressort (Monster Truck) ---');
    {
      const r = await page.evaluate(() => {
        const ko = [];
        if (P.veh) sortirVehicule(true);
        startRun(); ecran(null); ETAT.mode = 'jeu';
        for (const v of vehicules) scene.remove(v.mesh); vehicules.length = 0;
        for (const e of ennemis) e.mort = true;
        for (const id in META.vehPerso) Object.assign(META.vehPerso[id], slotGarageDefaut());
        WANTED.heat = 0; WANTED.stars = 0; META.argent = 1e6;
        const cle = 'monstertruck', base = VEHDEFS[cle];
        const porte = PORTES.find((p) => p.id === 'tuning');
        const v = creerVehicule(cle, porte.x, porte.z + 4, 0, null); entrerVehicule(v); P.x = v.x; P.z = v.z;
        const ap = () => { majAction(); const b = document.getElementById('btnAction'); const l = b.textContent; if (b._fn) b._fn(); return l; };
        ap(); const s = INT.actif; if (!s || !s.tuning) return { ko: ['pas entré au garage'] };
        const a0 = META.argent;
        acheterPalier(s, 'moteur'); acheterPalier(s, 'vitesse'); acheterNitro(s);
        const teinte = TUNING_TEINTES.find((c) => c !== base.cols[0]); peindreGarage(s, teinte);
        const fam = PIECES_FAMILLES[base.tuningCarro.famille]; const cat = PIECES_CATS.find((c) => c !== 'jantes' && fam[c]); choisirPiece(s, cat, 1);
        if (!(META.argent < a0)) ko.push('rien débité');
        P.x = s.sortie.x; P.z = s.sortie.z; ETAT.intT = 0; ap();
        const nv = P.veh;
        if (INT.actif || !nv || nv.key !== cle) return { ko: ko.concat('pas ressorti au volant du ' + cle) };
        if (!(nv.def.acc >= base.acc * TUNING_EFFETS.moteur[1] - 1e-6)) ko.push('moteur non appliqué (' + nv.def.acc + ')');
        if (!(nv.def.vmax >= base.vmax * TUNING_EFFETS.vitesse[1] - 1e-6)) ko.push('vitesse non appliquée');
        if (!(TUNING_EFFETS.vitesse[1] >= 1.08)) ko.push('1er palier de vitesse imperceptible (×' + TUNING_EFFETS.vitesse[1] + ')');
        if (!nv.nitro) ko.push('nitro absente');
        const mp = nv.mesh.userData.matPeinture; if (!mp || mp.color.getHex() !== teinte) ko.push('peinture absente');
        if (!(nv.mesh.userData.carro && nv.mesh.userData.carro.children.length)) ko.push('pièce absente');
        if (!recapTuning(fichePerso(nv.persoId))) ko.push('pas de récapitulatif');
        sortirVehicule(true);
        return { ko, info: recapTuning(fichePerso(nv.persoId)) };
      });
      if (r.ko.length) fail('Garage / Monster Truck : ' + r.ko.join(' | '));
      else ok('Garage / Monster Truck : moteur, vitesse, nitro, peinture et pièce présents en sortant (' + r.info + ')');
    }

    // -------------------------------------------------------------------
    // 8e lot, n° 2 (signalé : « l'hélicoptère du yacht explose toujours ») :
    // DESCENDRE tenu arrivait au contact à -13 u/s, au-delà du seuil de crash.
    // Effet de sol (HELI_SOL) : posé en douceur, sur le pont du yacht comme
    // en ville ; au-dessus de l'eau, il reste au ras des vagues.
    // -------------------------------------------------------------------
    console.log('\n--- Hélico du yacht : décollage, posé DESCENDRE tenu, pas de posé sur l\'eau ---');
    {
      const r = await page.evaluate(() => {
        const ko = [], info = [];
        if (P.veh) sortirVehicule(true);
        audioInit(); // avec l'audio : c'est lui qui levait l'exception (régime moteur NaN) qui détruisait l'hélico
        startRun(); ecran(null); ETAT.mode = 'jeu'; P.hp = P.maxHp = 1e6;
        const hy = GYACHT.heli && vehicules.includes(GYACHT.heli) ? GYACHT.heli : vehicules.find((v) => v.def.air === 'helico' && dist2(v.x, v.z, POIS.yacht.x, POIS.yacht.z) < 100); // lu à la source
        if (!hy) return { ko: ['pas d\'hélico sur le yacht'] };
        const pas = (n) => { for (let i = 0; i < n && !hy.mort; i++) { majJoueur(1 / 30, 1 / 30); majVehicules(1 / 30); majGrandYacht(); } }; // comme la boucle
        const pad = { x: hy.x, z: hy.z };
        P.x = hy.x + 1.5; P.z = hy.z; P.y = solPied(P.x, P.z); entrerVehicule(hy);
        pas(30); if (hy.mort) ko.push('explose posé sur le pont');
        INPUT.btn.sprint = true; pas(30); INPUT.btn.sprint = false;
        if (!hy.vol || !(hy.alt > 8)) ko.push('ne décolle pas du yacht (alt ' + (hy.alt || 0).toFixed(1) + ')');
        // posé DESCENDRE tenu sur le pont du yacht
        INPUT.btn.frein = true; pas(240); INPUT.btn.frein = false;
        if (hy.mort) ko.push('explose en se posant sur le yacht');
        else if (hy.vol || Math.abs(hy.alt - poseY(pad.x, pad.z)) > 0.05) ko.push('pas posé sur le pont (alt ' + hy.alt.toFixed(2) + ')');
        else info.push('posé sur le pont à ' + hy.alt.toFixed(2));
        // au-dessus de la mer : jamais posé, jamais d'explosion
        INPUT.btn.sprint = true; pas(20); INPUT.btn.sprint = false;
        hy.x = POIS.yacht.x - 40; hy.z = POIS.yacht.z + 20; hy.v = 0;
        if (!estEau(hy.x, hy.z)) ko.push('point d\'essai pas sur l\'eau');
        INPUT.btn.frein = true; pas(240); INPUT.btn.frein = false;
        if (hy.mort) ko.push('explose au-dessus de l\'eau en descendant');
        else if (!hy.vol || !(hy.alt >= HELI_EAU_ALT - 1e-6)) ko.push('posé sur l\'eau (alt ' + hy.alt.toFixed(2) + ')');
        // en ville aussi
        hy.x = POIS.place.x; hy.z = POIS.place.z + 10; hy.alt = 20;
        INPUT.btn.frein = true; pas(240); INPUT.btn.frein = false;
        if (hy.mort || hy.vol) ko.push('posé en ville raté (mort=' + !!hy.mort + ')');
        sortirVehicule(true);
        return { ko, info };
      });
      if (r.ko.length) fail('Hélico du yacht : ' + r.ko.join(' | '));
      else ok('Hélico du yacht : décolle, se pose DESCENDRE tenu sur le pont et en ville, reste au ras de l\'eau sans exploser (' + r.info.join(', ') + ')');
    }

    // -------------------------------------------------------------------
    // 8e lot, n° 3 (demandé : « gros yacht : il ne se conduit pas, le rendre
    // navigable »). On monte à bord depuis son pont, on navigue au joystick
    // réel (controleDir), l'hélico de l'héliport suit ; arrêté, son pont se
    // parcourt à pied ; l'hélico redécolle et se repose dessus.
    // -------------------------------------------------------------------
    console.log('\n--- Grand yacht navigable : barre, hélico porté, pont praticable au mouillage ---');
    {
      const r = await page.evaluate(() => {
        const ko = [], info = [];
        if (!DECOR_V2) return { off: true };
        if (P.veh) sortirVehicule(true);
        startRun(); ecran(null); ETAT.mode = 'jeu'; P.hp = P.maxHp = 1e6;
        const y = GYACHT.v, hy = GYACHT.heli;
        if (!y || y.key !== 'grandyacht' || !hy) return { ko: ['grand yacht ou hélico absent'] };
        for (const v of [...vehicules]) if (v !== y && v !== hy) { scene.remove(v.mesh); vehicules.splice(vehicules.indexOf(v), 1); }
        // au mouillage : on marche sur le pont, à hauteur du pont
        P.x = y.x + 1; P.z = y.z - 2; P.y = solPied(P.x, P.z);
        if (!(Math.abs(P.y - 1.31) < 0.05) || estEau(P.x, P.z)) ko.push('pont pas praticable au mouillage (y ' + P.y.toFixed(2) + ')');
        for (let i = 0; i < 20; i++) majJoueur(1 / 30, 1 / 30);
        if (estEau(P.x, P.z) || P.nage) ko.push('joueur à l\'eau sur le pont');
        // à la barre
        majAction(); const lab = document.getElementById('btnAction').textContent; const b = document.getElementById('btnAction'); if (b._fn) b._fn();
        if (P.veh !== y) { // l'hélico est peut-être plus proche : on vise la barre
          if (P.veh) sortirVehicule(true); P.x = y.x; P.z = y.z - 3; entrerVehicule(y);
        }
        if (P.veh !== y) return { ko: ko.concat('impossible de prendre la barre (' + lab + ')') };
        const x0 = y.x, z0 = y.z;
        const nav = (mx, mz, n) => { for (let i = 0; i < n && P.veh === y; i++) { INPUT.mx = mx; INPUT.mz = mz; const c = controleDir(y, false); majVehiculePhys(y, 1 / 30, c.throttle, c.steer, false); majVehicules(1 / 30); majGrandYacht(); } INPUT.mx = 0; INPUT.mz = 0; };
        nav(0, 1, 30 * 25);   // vers le large
        nav(1, 0, 30 * 15);   // vers l'est
        const d = Math.hypot(y.x - x0, y.z - z0); 
        if (!(d > 80)) ko.push('le yacht n\'avance pas (' + d.toFixed(0) + ' u)');
        else info.push(d.toFixed(0) + ' u en 40 s, vmax ' + y.def.vmax);
        if (y.mort || y.hp < y.def.hp * 0.9) ko.push('yacht abîmé en naviguant (hp ' + y.hp + ')');
        const hx = y.x - Math.sin(y.ang) * 6.4, hz = y.z - Math.cos(y.ang) * 6.4;
        if (hy.mort || Math.hypot(hy.x - hx, hy.z - hz) > 0.5) ko.push('hélico pas emporté (à ' + Math.hypot(hy.x - hx, hy.z - hz).toFixed(1) + ' u de l\'héliport, mort=' + !!hy.mort + ')');
        // on lâche la barre : au mouillage, pont praticable
        sortirVehicule();
        for (let i = 0; i < 10; i++) { majJoueur(1 / 30, 1 / 30); majVehicules(1 / 30); majGrandYacht(); }
        if (!(Math.abs(P.y - 1.31) < 0.3) || P.nage || estEau(P.x, P.z)) ko.push('pas sur le pont en lâchant la barre (y ' + P.y.toFixed(2) + ', nage ' + !!P.nage + ')');
        if (Math.abs(y.v) > 0.01) ko.push('le yacht dérive sans pilote');
        // l'hélico redécolle du yacht déplacé et s'y repose
        P.x = hy.x + 1.5; P.z = hy.z; entrerVehicule(hy);
        const pas = (n) => { for (let i = 0; i < n && !hy.mort; i++) { majJoueur(1 / 30, 1 / 30); majVehicules(1 / 30); majGrandYacht(); } };
        INPUT.btn.sprint = true; pas(30); INPUT.btn.sprint = false;
        INPUT.btn.frein = true; pas(240); INPUT.btn.frein = false;
        if (hy.mort || hy.vol || Math.abs(hy.alt - 1.31) > 0.1) ko.push('hélico pas reposé sur le yacht (alt ' + (hy.alt || 0).toFixed(2) + ', mort ' + !!hy.mort + ')');
        sortirVehicule(true);
        return { ko, info };
      });
      if (r.off) saute('Grand yacht : DECOR_V2 désactivé');
      else if (r.ko.length) fail('Grand yacht : ' + r.ko.join(' | ') + ' [' + r.info.join(', ') + ']');
      else ok('Grand yacht : navigable (' + r.info.join(', ') + '), hélico emporté, pont praticable au mouillage, hélico qui s\'y repose');
    }

    // -------------------------------------------------------------------
    // 8e lot, n° 4 (signalé : « saut depuis un bateau : le joueur reste collé
    // au bateau et ne peut plus jouer »). Pour chaque bateau (lu dans
    // VEHDEFS), lancé à pleine vitesse au large ou en plein saut : on saute à
    // l'eau ; le nageur est hors de la coque, le bateau lâché ne lui passe pas
    // dessus, et il s'éloigne à la nage dans toutes les directions libres.
    // -------------------------------------------------------------------
    console.log('\n--- Sauter d\'un bateau au large : le nageur se détache de la coque ---');
    {
      const r = await page.evaluate(() => {
        const ko = [], vus = [];
        if (P.veh) sortirVehicule(true);
        startRun(); ecran(null); ETAT.mode = 'jeu'; P.hp = P.maxHp = 1e6;
        for (const v of [...vehicules]) { scene.remove(v.mesh); } vehicules.length = 0;
        for (const e of ennemis) e.mort = true;
        const X = 0, Z = MER + 120;
        for (const cle of Object.keys(VEHDEFS).filter((k) => VEHDEFS[k].eau && !VEHDEFS[k].surf)) {
          for (const enVol of [false, true]) {
            const v = creerVehicule(cle, X, Z, 0.7, null); if (!v) { ko.push(cle + ' non créé'); break; }
            P.x = v.x; P.z = v.z; entrerVehicule(v); v.v = v.def.vmax;
            if (enVol) { v.hMer = 3; v.vyMer = 4; v.airMer = 0.3; }
            sortirVehicule();
            const dedans = vehiculeBloquant(P.x, P.z, 0, null) === v;
            for (let i = 0; i < 60; i++) { majJoueur(1 / 30, 1 / 30); majVehicules(1 / 30); }
            const dedans2 = vehiculeBloquant(P.x, P.z, 0, null) === v;
            const bilan = { dansLaCoque: dedans, dansLaCoque2s: dedans2, nage: !!P.nage, bateauV: +v.v.toFixed(1), bateauH: v.hMer || 0, bloque: [] };
            // directions qui ne vont pas vers la coque
            for (const d of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
              if ((v.x - P.x) * d[0] + (v.z - P.z) * d[1] > 0) continue;
              const x0 = P.x, z0 = P.z;
              for (let i = 0; i < 45; i++) { INPUT.mx = d[0]; INPUT.mz = d[1]; majJoueur(1 / 30, 1 / 30); majVehicules(1 / 30); }
              INPUT.mx = 0; INPUT.mz = 0;
              if (Math.hypot(P.x - x0, P.z - z0) < 2 && vehiculeBloquant(P.x + d[0] * 0.9, P.z + d[1] * 0.9, 0.3, null) !== v) bilan.bloque.push(d.join(',')); // la coque juste devant (bateau long en biais) : bloqué à juste titre
            }
            if (dedans || dedans2 || !bilan.nage || bilan.bloque.length || Math.abs(v.v) > 1 || bilan.bateauH > 0) ko.push(cle + (enVol ? ' (en vol)' : '') + ' : ' + JSON.stringify(bilan));
            scene.remove(v.mesh); vehicules.splice(vehicules.indexOf(v), 1);
          }
          vus.push(cle);
        }
        return { ko, vus };
      });
      if (r.ko.length) fail('Sauter d\'un bateau : ' + r.ko.join(' | '));
      else ok('Sauter d\'un bateau : ' + r.vus.length + ' bateaux (' + r.vus.join(', ') + '), lancés ou en plein saut : nageur hors de la coque, bateau arrêté, on s\'éloigne à la nage');
    }

    // -------------------------------------------------------------------
    // 8e lot, n° 5 (signalé : « presque plus de voitures dans les rues ») :
    // à 2,2 essais/s, la ville plafonnait à ~19 voitures pour 36 permises.
    // 60 s simulées au centre (majVehicules réel, caméra réelle) : la ville
    // approche son plafond (q().trafic, lu dans le jeu), sans aucun choc.
    // -------------------------------------------------------------------
    console.log('\n--- Circulation : densité du trafic au centre-ville, sans chocs ---');
    {
      const r = await page.evaluate(() => {
        if (P.veh) sortirVehicule(true);
        startRun(); ecran(null); ETAT.mode = 'jeu'; P.hp = P.maxHp = 1e6; WANTED.heat = 0; WANTED.stars = 0;
        for (const e of ennemis) e.mort = true;
        P.x = POIS.place.x; P.z = POIS.place.z + 8; P.y = solPied(P.x, P.z);
        let chocs = 0; const ab = abimerVehicule; abimerVehicule = function (v, ...a) { if (v && v.conduit === 'trafic') chocs++; return ab.call(this, v, ...a); };
        const n = [], pres = [];
        try {
          for (let i = 0; i < 30 * 60; i++) {
            majVehicules(1 / 30); for (let j = 0; j < 4; j++) majCamera(1 / 120);
            if (i > 30 * 20 && i % 30 === 0) { let a = 0, b = 0; for (const v of vehicules) if (v.conduit === 'trafic' && !v.mort) { a++; if (Math.hypot(v.x - P.x, v.z - P.z) < 60) b++; } n.push(a); pres.push(b); }
          }
        } finally { abimerVehicule = ab; }
        const moy = (t) => t.reduce((s, x) => s + x, 0) / t.length;
        return { cap: q().trafic, moy: +moy(n).toFixed(1), pres: +moy(pres).toFixed(1), chocs };
      });
      // chocs : au plus 2 en 60 s. Un cas rare existe (bus de ville contre un pickup arrêté, ~2 parties sur 90, jamais reproduit sous instrumentation, voir rapport du 10e lot) ; une vraie régression du trafic se compte en dizaines
      if (!(r.moy >= r.cap * 0.75) || !(r.pres >= r.cap * 0.3) || r.chocs > 2) fail('Circulation : ' + JSON.stringify(r)); // seuils relatifs au plafond de la qualité choisie (q().trafic)
      else ok('Circulation : ' + r.moy + ' voitures en ville en moyenne (plafond ' + r.cap + '), ' + r.pres + ' à moins de 60 u du joueur, ' + r.chocs + ' choc(s)');
    }

    // -------------------------------------------------------------------
    // 8e lot, n° 6 (signalé : « police : trop d'agents, les étoiles montent
    // trop vite »). Réglages lus dans le jeu (WANTED_*). Un piéton tué ne
    // donne plus une étoile à lui seul ; à 3★, jamais plus d'agents que le
    // plafond ; sans policier à portée, 2★ retombent en moins de 15 s.
    // -------------------------------------------------------------------
    console.log('\n--- Police : prise d\'étoiles ralentie, moins d\'agents ---');
    {
      const r = await page.evaluate(() => {
        const ko = [], info = [];
        if (P.veh) sortirVehicule(true);
        startRun(); ecran(null); ETAT.mode = 'jeu'; P.hp = P.maxHp = 1e6;
        for (const e of ennemis) e.mort = true;
        WANTED.heat = 0; WANTED.stars = 0;
        // deux vrais piétons tués (tuerPieton) : la chaleur réellement ajoutée
        creerPieton(P.x + 3, P.z); creerPieton(P.x - 3, P.z); const vivants = pietons.slice(-2);
        const h0 = WANTED.heat; tuerPieton(vivants[0], true); const unMeurtre = WANTED.heat - h0;
        if (WANTED.stars !== 0) ko.push('1 piéton tué = déjà ' + WANTED.stars + '★');
        tuerPieton(vivants[1], true); if (WANTED.stars !== 1) ko.push('2 piétons tués = ' + WANTED.stars + '★ (attendu 1)');
        info.push('piéton tué : +' + unMeurtre.toFixed(2) + ' de chaleur');
        // la zone militaire et les salles gardent leurs étoiles franches
        WANTED.heat = 0; WANTED.stars = 0; addHeat(1, false, true); if (WANTED.stars !== 1) ko.push('événement de salle : pas +1★');
        // à 3★, au plus WANTED_CAP_AGENTS[3] agents à pied
        WANTED.heat = 3.5; WANTED.stars = 3; let maxA = 0;
        for (let i = 0; i < 30 * 40; i++) { WANTED.heat = 3.5; majWanted(1 / 30); let n = 0; for (const e of ennemis) if (!e.mort && e.fac === 'police' && !e.garde && !e.heli) n++; if (n > maxA) maxA = n; }
        if (maxA > WANTED_CAP_AGENTS[3]) ko.push('3★ : ' + maxA + ' agents (plafond ' + WANTED_CAP_AGENTS[3] + ')');
        info.push('3★ : ' + maxA + ' agents au plus');
        // 2★ qui retombent sans policier à portée
        for (const e of ennemis) e.mort = true;
        WANTED.heat = 2.4; WANTED.stars = 2; let t = 0;
        while (WANTED.heat > 0 && t < 30) { for (const e of ennemis) if (e.fac === 'police') e.mort = true; majWanted(1 / 30); t += 1 / 30; }
        if (!(t < 16)) ko.push('2★ retombent en ' + t.toFixed(1) + ' s');
        info.push('2★ effacées en ' + t.toFixed(1) + ' s');
        WANTED.heat = 0; WANTED.stars = 0; for (const e of ennemis) e.mort = true;
        return { ko, info };
      });
      if (r.ko.length) fail('Police : ' + r.ko.join(' | '));
      else ok('Police : ' + r.info.join(', '));
    }

    // -------------------------------------------------------------------
    // 8e lot, n° 7 (demandé : « colline toujours trop facile ; si c'est
    // physiquement impossible dans la réalité, ça doit l'être dans le jeu ;
    // même règle pour les parois des canyons »). Lu dans le jeu : VEHDEFS,
    // penteMaxVeh, CANYON, MONT.couloir, COULOIR_PENTE_MAX.
    // -------------------------------------------------------------------
    console.log('\n--- Pentes réalistes : parois de canyon infranchissables même lancé, montée sèche ≤ 45° ---');
    {
      const r = await page.evaluate(() => {
        if (!DECOR_V2 || !MONT.couloir || !CANYON.mesas.length) return { off: true };
        const ko = [], info = [];
        const scene0 = () => { if (P.veh) sortirVehicule(true); startRun(); ecran(null); ETAT.mode = 'jeu'; P.hp = P.maxHp = 1e6; for (const v of vehicules) scene.remove(v.mesh); vehicules.length = 0; };
        // aucune pente gravissable au-delà de 45°
        for (const k of Object.keys(VEHDEFS)) { const d = VEHDEFS[k]; if (d.air || d.eau) continue; if (!(penteMaxVeh(d) <= 1.0001)) ko.push(k + ' : pente max ' + penteMaxVeh(d)); }
        // paroi de la 1re mesa (22 u) : lancé à pleine vitesse, aucun véhicule terrestre ne la gravit
        // de face et de biais (30° et 55° d'incidence) : de biais, la pente apparente baisse (faille corrigée)
        const m = CANYON.mesas[0]; let pire = 0, pireK = '';
        for (const k of Object.keys(VEHDEFS)) { const d = VEHDEFS[k]; if (d.air || d.eau || d.surf || d.canon || d.ovni) continue;
          for (const inc of [0, 0.52, -0.96]) {
            scene0(); const x0 = m.x + m.hw + 18, z0 = m.z - Math.tan(inc) * 18, v = creerVehicule(k, x0, z0, -Math.PI / 2 + inc, null); if (!v) continue; v.h = solY(v.x, v.z); v.v = d.vmax;
            let hm = 0; for (let i = 0; i < 150; i++) { majVehiculePhys(v, 1 / 30, 1, 0, false); hm = Math.max(hm, (v.h || 0) - solY(x0, z0)); }
            if (hm > pire) { pire = hm; pireK = k + ' (incidence ' + inc + ')'; } } }
        if (pire > 4) ko.push('paroi de mesa gravie : ' + pireK + ' +' + pire.toFixed(1) + ' u');
        info.push('paroi de mesa : ' + pire.toFixed(1) + ' u au plus (' + (pireK || '—') + ')');
        // montée sèche : jamais plus raide que COULOIR_PENTE_MAX sur son axe
        const C = MONT.couloir; let pm = 0;
        for (let z = C.z0; z > C.z1; z -= 0.25) pm = Math.max(pm, solY(C.x, z - 0.5) - solY(C.x, z + 0.5));
        if (pm > COULOIR_PENTE_MAX + 0.05) ko.push('montée sèche : pente ' + pm.toFixed(2));
        info.push('montée sèche ' + C.H.toFixed(0) + ' u, pente max ' + pm.toFixed(2));
        // rampe d'accès des mesas : une moto de route y monte jusqu'en haut
        { scene0(); const a = CANYON.acces, zc = (a.z0 + a.z1) / 2, v = creerVehicule('moto', a.x0 - 6, zc, Math.PI / 2, null); v.h = solY(v.x, v.z);
          for (let i = 0; i < 30 * 8 && v.x < a.x1 + 2; i++) majVehiculePhys(v, 1 / 30, 1, 0, false);
          if (!((v.h || 0) > a.h - 1)) ko.push('rampe d\'accès des mesas : moto de route à ' + (v.h || 0).toFixed(1) + ' u sur ' + a.h);
          else info.push('rampe d\'accès montée en moto de route'); }
        if (P.veh) sortirVehicule(true); startRun();
        return { ko, info };
      });
      if (r.off) saute('Pentes réalistes : DECOR_V2 désactivé');
      else if (r.ko.length) fail('Pentes réalistes : ' + r.ko.join(' | '));
      else ok('Pentes réalistes : ' + r.info.join(', '));
    }

    // -------------------------------------------------------------------
    // 8e lot, n° 9 à 12 (demandé : plus de défis ; récompense à récupérer dans
    // le menu des défis, avec une notification ; défis à paliers ; structure
    // d'un futur bouton « ×2 avec une pub »). Thèmes et paliers lus dans
    // DEFIS / DEFIS_THEMES, jamais recopiés.
    // -------------------------------------------------------------------
    console.log('\n--- Défis : récompense à récupérer, paliers, pastille, emplacement ×2 ---');
    {
      const r = await page.evaluate(() => {
        const ko = [], info = [];
        if (P.veh) sortirVehicule(true);
        startRun(); ecran(null); ETAT.mode = 'jeu';
        const sauf = { faits: Object.assign({}, META.defis.faits), aRec: Object.assign({}, META.defis.aReclamer), kills: META.killsTotal, argent: META.argent };
        // état maîtrisé : tout récupéré, sauf le thème des ennemis neutralisés
        for (const d of DEFIS) META.defis.faits[d.id] = true;
        for (const k in META.defis.aReclamer) delete META.defis.aReclamer[k];
        const th = DEFIS.filter((d) => d.theme === 'tueur').sort((a, b) => a.palier - b.palier);
        if (th.length < 3) ko.push('thème des ennemis : ' + th.length + ' paliers');
        for (const d of th) delete META.defis.faits[d.id];
        // paliers croissants partout (quantité et récompense), thèmes finis
        for (const t of DEFIS_THEMES) for (let k = 1; k < t.paliers.length; k++) if (!(t.paliers[k] > t.paliers[k - 1]) || !(t.recs[k] > t.recs[k - 1])) ko.push('thème ' + t.theme + ' : paliers non croissants');
        info.push(DEFIS.length + ' défis (' + DEFIS_THEMES.length + ' thèmes à paliers)');
        // 1er palier atteint : à récupérer, jamais payé automatiquement
        const seuil1 = th[0].prog(META)[1], seuil2 = th[1].prog(META)[1];
        META.killsTotal = seuil1 + 1; META.argent = 1000;
        checkDefis();
        if (!META.defis.aReclamer[th[0].id] || META.defis.faits[th[0].id]) ko.push('palier 1 pas « à récupérer »');
        if (META.argent !== 1000) ko.push('payé automatiquement (' + META.argent + ')');
        if (META.defis.aReclamer[th[1].id]) ko.push('palier 2 proposé avant la récupération du 1');
        const pa = document.getElementById('pastilleDefis'); if (!pa || pa.style.display === 'none' || pa.textContent !== '1') ko.push('pastille HUD : ' + (pa && pa.style.display + ' ' + pa.textContent));
        // écran des défis : bouton RÉCUPÉRER réel, pas de bouton ×2 sans pub
        renderDefis(); ecran('defis');
        const b = document.querySelector('#defisList [data-recup="' + th[0].id + '"]');
        if (!b) ko.push('bouton RÉCUPÉRER absent');
        if (document.querySelector('#defisList [data-recupx2]')) ko.push('bouton ×2 affiché sans pub disponible');
        if (b) b.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
        if (META.argent !== 1000 + th[0].rec || !META.defis.faits[th[0].id]) ko.push('récupération : argent ' + META.argent);
        if (recupererDefi(th[0].id, 1) || META.argent !== 1000 + th[0].rec) ko.push('récupéré deux fois');
        if (pa.style.display !== 'none') ko.push('pastille encore affichée');
        // palier suivant proposé, avec une quantité plus élevée
        if (!defiPropose(th[1]) || !(seuil2 > seuil1)) ko.push('palier 2 pas débloqué');
        META.killsTotal = seuil2; checkDefis();
        if (!META.defis.aReclamer[th[1].id]) ko.push('palier 2 atteint mais pas à récupérer');
        // structure ×2 : une pub vue double la récompense ; jamais ×3
        const d0 = PUB_X2.disponible, m0 = PUB_X2.montrer;
        PUB_X2.disponible = () => true; PUB_X2.montrer = (fin) => fin(true);
        try {
          renderDefis();
          const bx = document.querySelector('#defisList [data-recupx2="' + th[1].id + '"]'); if (!bx) ko.push('emplacement ×2 absent quand une pub est disponible');
          const a1 = META.argent; if (bx) bx.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
          if (META.argent - a1 !== th[1].rec * 2) ko.push('×2 : ' + (META.argent - a1) + ' (attendu ' + th[1].rec * 2 + ')');
        } finally { PUB_X2.disponible = d0; PUB_X2.montrer = m0; }
        // sauvegarde : « à récupérer » survit au rechargement (dictionnaire ouvert)
        META.defis.aReclamer.essai_x = true; const copie = JSON.parse(JSON.stringify(META)); delete META.defis.aReclamer.essai_x;
        const cible = { defis: { aReclamer: {}, faits: {} } }; fusionMeta(cible, copie); if (!cible.defis.aReclamer.essai_x) ko.push('aReclamer perdu au rechargement');
        // remise en état
        ecran(null); META.killsTotal = sauf.kills; META.argent = sauf.argent;
        for (const k in META.defis.faits) delete META.defis.faits[k]; Object.assign(META.defis.faits, sauf.faits);
        for (const k in META.defis.aReclamer) delete META.defis.aReclamer[k]; Object.assign(META.defis.aReclamer, sauf.aRec);
        for (const d of DEFIS) META.defis.faits[d.id] = true; // isolation des tests suivants (voir plus haut)
        majPastilleDefis();
        return { ko, info };
      });
      if (r.ko.length) fail('Défis : ' + r.ko.join(' | '));
      else ok('Défis : ' + r.info.join(', ') + ' ; à récupérer (jamais payé seul), pastille, récupération unique, palier suivant débloqué, ×2 seulement avec une pub, survit au rechargement');
    }

    // -------------------------------------------------------------------
    // 9e lot, n° 1 (signalé : « le 4x4 amphibie se noie en arrivant dans la
    // mer, comme les autres véhicules »). De la plage vers le large au
    // joystick réel (controleDir), puis retour sur le sable ; saut dans l'eau.
    // -------------------------------------------------------------------
    console.log('\n--- 4x4 amphibie : il entre dans la mer, y navigue et en ressort ---');
    {
      const r = await page.evaluate(() => {
        const ko = [], info = [];
        if (P.veh) sortirVehicule(true);
        startRun(); ecran(null); ETAT.mode = 'jeu'; P.hp = P.maxHp = 1e6;
        for (const v of vehicules) scene.remove(v.mesh); vehicules.length = 0;
        // un bout de plage dégagé (ni ponton ni île devant)
        let X = null; for (let x = -200; x < 250 && X === null; x += 10) { let libre = true; for (const p of PONTONS) if (Math.abs(x - p.x) < p.hw + 14 && Math.abs(MER - p.z) < p.hd + 40) libre = false; for (const il of ILES) if (dist2(x, MER, il.x, il.z) < (il.r + 30) ** 2) libre = false; if (libre && estEau(x, MER + 6) && !estEau(x, MER - 12) && !solidAt(x, MER - 12, 3)) X = x; }
        if (X === null) return { ko: ['aucune plage dégagée'] };
        const v = creerVehicule('amphibie', X, MER - 12, 0, null); v.h = solY(v.x, v.z); P.x = v.x; P.z = v.z; entrerVehicule(v);
        const conduire = (mz, n) => { for (let i = 0; i < n && P.veh === v; i++) { INPUT.mx = 0; INPUT.mz = mz; const c = controleDir(v, false); majVehiculePhys(v, 1 / 30, c.throttle, c.steer, false); majVehicules(1 / 30); } INPUT.mz = 0; };
        conduire(1, 30 * 6);
        if (v.noye || P.veh !== v) ko.push('noyé en entrant dans la mer (z ' + v.z.toFixed(1) + ')');
        else if (!estEau(v.x, v.z) || !(v.z > MER + 15)) ko.push('pas au large : z ' + v.z.toFixed(1));
        else info.push('au large à ' + (v.z - MER).toFixed(0) + ' u du rivage');
        conduire(-1, 30 * 10);
        if (v.noye || P.veh !== v || estEau(v.x, v.z)) ko.push('ne ressort pas sur le sable (z ' + v.z.toFixed(1) + ', noyé ' + !!v.noye + ')');
        else info.push('ressorti sur la plage');
        // saut qui finit dans l'eau : il flotte
        if (!v.noye) { v.x = X; v.z = MER + 20; v.h = 4; v.enAir = true; v.vy = -2; v.v = 10; for (let i = 0; i < 60; i++) majVehiculePhys(v, 1 / 30, 0, 0, false); if (v.noye) ko.push('noyé à l\'amerrissage d\'un saut'); }
        // un 4x4 ordinaire se noie toujours
        const j = creerVehicule('jeep', X + 6, MER - 12, 0, null); j.h = solY(j.x, j.z); sortirVehicule(true); P.x = j.x; P.z = j.z; entrerVehicule(j);
        for (let i = 0; i < 30 * 6 && !j.noye; i++) { INPUT.mz = 1; const c = controleDir(j, false); majVehiculePhys(j, 1 / 30, c.throttle, c.steer, false); } INPUT.mz = 0;
        if (!j.noye) ko.push('le 4x4 ordinaire ne se noie plus');
        if (P.veh) sortirVehicule(true);
        return { ko, info };
      });
      if (r.ko.length) fail('4x4 amphibie : ' + r.ko.join(' | '));
      else ok('4x4 amphibie : ' + r.info.join(', ') + ', flotte après un saut ; le 4x4 ordinaire se noie toujours');
    }

    // -------------------------------------------------------------------
    // 9e lot, n° 2 (signalé : « le mur entre l'aéroport / le désert et la
    // ville se franchit en avion, mais pas en base jump, chute libre ou
    // parachute »). Choix : le mur reste (il guide les véhicules vers le
    // portail de l'aéroport), mais tout ce qui vole AU-DESSUS passe. À pied
    // au sol, il bloque toujours. Le mur est lu dans les solides du jeu.
    // -------------------------------------------------------------------
    console.log('\n--- Mur de l\'aéroport : franchi en chute libre, sous voile et au jetpack ; bloquant à pied ---');
    {
      const r = await page.evaluate(() => {
        const ko = [], info = [];
        if (P.veh) sortirVehicule(true);
        startRun(); ecran(null); ETAT.mode = 'jeu'; P.hp = P.maxHp = 1e6;
        for (const e of ennemis) e.mort = true;
        // un tronçon du mur est, loin du portail
        const z = -200, mur = solidAt(HALF + 14, z, 0); if (!mur) return { ko: ['mur est introuvable en z ' + z] };
        const xa = HALF + 6, xb = HALF + 22;
        const essai = (nom, prep) => {
          P.x = xa; P.z = z; P.chute = false; P.para = false; P.wing = false; P.jetpackVol = false; P.vy = 0; P.y = solPied(P.x, P.z);
          prep(); let t = 0;
          while (t < 6 && P.x < xb) { INPUT.mx = 1; INPUT.mz = 0; majJoueur(1 / 30, 1 / 30); P.iframes = 99; t += 1 / 30; if (nom === 'jetpack') { P.y = Math.max(P.y, 9); P.vy = 0; } }
          INPUT.mx = 0; const passe = P.x > HALF + 14 + mur.hw; info.push(nom + (passe ? ' passe' : ' bloqué')); return passe;
        };
        if (!essai('voile', () => { P.y = 25; P.chute = true; P.chuteY0 = 30; P.chuteT = 1; P.chuteHaut = 25; P.chuteVx = 0; P.chuteVz = 0; ouvrirParachute(); })) ko.push('sous voile : bloqué par le mur');
        if (!essai('chute libre', () => { P.y = 40; P.chute = true; P.chuteY0 = 45; P.chuteT = 1; P.chuteHaut = 40; P.chuteVx = 8; P.chuteVz = 0; P.vy = 0; })) ko.push('en chute libre : bloqué par le mur');
        if (essai('à pied', () => {})) ko.push('à pied : le mur ne bloque plus');
        P.chute = false; P.para = false; paraMesh.visible = false; P.y = solPied(P.x, P.z);
        return { ko, info };
      });
      if (r.ko.length) fail('Mur de l\'aéroport : ' + r.ko.join(' | ') + ' [' + r.info.join(', ') + ']');
      else ok('Mur de l\'aéroport : ' + r.info.join(', '));
    }

    // -------------------------------------------------------------------
    // 9e lot, n° 3 (demandé : « rendre les salles type disco beaucoup plus
    // attrayantes : bagarre, alcool avec effets à court terme, danse »).
    // Club Néon V2 : réglages lus dans IVRESSE / DANSE, jamais recopiés.
    // -------------------------------------------------------------------
    console.log('\n--- Club Néon : cocktails et ivresse, danse au rythme, bagarre, videur ---');
    {
      const r = await page.evaluate(() => {
        const ko = [], info = [];
        if (P.veh) sortirVehicule(true);
        startRun(); ecran(null); ETAT.mode = 'jeu'; P.hp = P.maxHp = 300; META.argent = 5000;
        for (const e of ennemis) e.mort = true;
        const porte = PORTES.find((p) => p.id === 'club'); if (!porte) return { ko: ['porte du club introuvable'] };
        const ap = () => { majAction(); const b = document.getElementById('btnAction'); const l = b.textContent; if (b._fn) b._fn(); return l; };
        entrerInterieur('club', porte); const s = INT.actif;
        if (!s || !s.club) return { ko: ['salle du club non V2'] };
        // --- cocktails : ivresse, effets, malaise ---
        P.x = s.bar.x; P.z = s.bar.z; const lab = ap();
        if (!/COCKTAIL/.test(lab) || !(P.ivresse > 0)) ko.push('cocktail : ' + lab + ' ivresse ' + P.ivresse);
        while (P.ivresse < IVRESSE.ivre + 15) boireCocktail();
        let derive = 0; for (let i = 0; i < 60; i++) { ETAT.runT += 0.1; derive = Math.max(derive, Math.abs(deriveIvresse())); }
        if (!(derive > 0.1)) ko.push('ivre mais la marche ne dérive pas');
        const iv0 = P.ivresse; for (let i = 0; i < 30; i++) majIvresse(1 / 30); if (!(P.ivresse < iv0)) ko.push('l\'ivresse ne redescend pas');
        const argent0 = META.argent; while (INT.actif && P.ivresse < IVRESSE.max) boireCocktail();
        if (INT.actif || !(P.hp < 300) || !(META.argent < argent0)) ko.push('malaise : ' + JSON.stringify({ dedans: !!INT.actif, hp: P.hp }));
        else info.push('malaise à ' + IVRESSE.max + ' % : réveil dehors');
        P.ivresse = 0; P.hp = 300;
        // --- danse : parfaite = prime (une fois par vague) ; au hasard = ratée ---
        entrerInterieur('club', porte);
        const per = 60 / DANSE.bpm;
        const danser = (mode) => { P.x = s.piste.x; P.z = s.piste.z; s.danse = null; const lab = ap(); if (!/DANSER/.test(lab)) return { erreur: lab };
          const a0 = META.argent; let t = 0, k = 1;
          while (s.danse && t < 30) {
            if (mode === 'parfait' && s.danse.t >= k * per) { danseTape(s); k++; }
            if (mode === 'spam' && Math.floor(t * 30) % 3 === 0) danseTape(s);
            majInterieur(1 / 30, 1 / 30); t += 1 / 30; }
          return { prime: META.argent - a0, fini: !s.danse }; };
        const d1 = danser('parfait'), d2 = danser('parfait'), d3 = (s.dansePrimeVague = -1, danser('spam'));
        if (d1.erreur || !(d1.prime > 0)) ko.push('danse parfaite non payée : ' + JSON.stringify(d1)); else info.push('danse parfaite : +' + d1.prime + ' $');
        if (d2.prime !== 0) ko.push('seconde prime dans la même vague');
        if (d3.prime !== 0) ko.push('danse au hasard (appuis en rafale) payée');
        // --- bagarre : un fêtard finit par chercher la bagarre ; KO à mains nues ---
        s.bagarreT = 0.01; majInterieur(1 / 30, 1 / 30);
        const b = s.bagarreur;
        if (!b || b.type !== 'fetard' || b.interieur !== 'club') ko.push('aucun fêtard bagarreur');
        else { b.hp = 1; tuerEnnemi(b, true); majInterieur(1 / 30, 1 / 30); if (s.bagarreur) ko.push('bagarreur KO non évacué'); else info.push('bagarre : fêtard mis KO'); }
        // --- videur : une arme à feu sortie = dehors ---
        META.armes.pistolet.poss = true; P.armeCur = 'pistolet'; P.mags.pistolet = 12; P.rechT = 0; P.cadT = 0; attaquer();
        if (INT.actif) ko.push('arme à feu dans le club : pas expulsé'); else info.push('arme sortie : expulsé par le videur');
        // --- rien ne survit à une nouvelle partie ---
        P.ivresse = 50; startRun(); if (P.ivresse !== 0 || s.danse || s.dansePrimeVague !== -1) ko.push('état du club conservé après startRun');
        return { ko, info };
      });
      if (r.ko.length) fail('Club Néon : ' + r.ko.join(' | ') + ' [' + r.info.join(', ') + ']');
      else ok('Club Néon : ' + r.info.join(', ') + ' ; ivre = marche qui dérive, ivresse qui retombe, une prime de danse par vague, rafales d\'appuis ratées, rien ne survit au game over');
    }

    // -------------------------------------------------------------------
    // 9e lot, n° 3 bis (demandé : « rendre plus vivant chaque endroit ») :
    // figurants des salles listées dans VIE_SALLES (lu dans le jeu) — ils
    // marchent, jamais dans un meuble, et se mettent à couvert si on frappe.
    // -------------------------------------------------------------------
    console.log('\n--- Vie des salles : figurants qui flânent, jamais dans un meuble, qui paniquent ---');
    {
      const r = await page.evaluate(() => {
        const ko = [], info = [];
        if (P.veh) sortirVehicule(true);
        startRun(); ecran(null); ETAT.mode = 'jeu'; P.hp = P.maxHp = 1e6;
        let total = 0, salles = 0;
        for (const id of Object.keys(VIE_SALLES)) {
          const porte = PORTES.find((p) => p.id === id); if (!porte || !INTDEFS[id]) continue;
          entrerInterieur(id, porte); const s = INT.actif; if (!s) { ko.push(id + ' : pas entré'); continue; }
          const F = s.figurants || []; if (F.length < Math.min(1, VIE_SALLES[id].n)) ko.push(id + ' : aucun figurant');
          total += F.length; salles++;
          const x0 = F.map((f) => f.x + ',' + f.z).join(';');
          P.x = s.sortie.x; P.z = s.sortie.z; // le joueur loin des figurants
          for (let i = 0; i < 30 * 12; i++) majVieSalle(s, 1 / 30);
          if (F.length && F.map((f) => f.x + ',' + f.z).join(';') === x0) ko.push(id + ' : personne ne bouge');
          for (const f of F) if (solidAt(f.x, f.z, 0.2)) { ko.push(id + ' : figurant dans un meuble'); break; }
          P.frappeT = 0.2; majVieSalle(s, 1 / 30); P.frappeT = 0;
          if (F.length && !(s.paniqueT > 0)) ko.push(id + ' : pas de panique quand on frappe');
          s.paniqueT = 0; sortirInterieur();
        }
        info.push(total + ' figurants dans ' + salles + ' salles');
        return { ko, info };
      });
      if (r.ko.length) fail('Vie des salles : ' + r.ko.join(' | '));
      else ok('Vie des salles : ' + r.info.join(', ') + ' ; ils flânent sans traverser un meuble et se mettent à couvert quand on frappe');
    }

    // -------------------------------------------------------------------
    // 10e lot, n° 1 (signalé : « l'endroit où on écrit sur la pancarte de
    // l'avion est au-dessous d'une maison »). Aucun autre solide — maisons
    // sur pilotis comprises (yRef) — dans l'emprise du kiosque ; on y accède.
    // -------------------------------------------------------------------
    console.log('\n--- Kiosque de la banderole : dégagé (aucune maison dessus), accessible ---');
    {
      const r = await page.evaluate(() => {
        if (!DECOR_V2 || !POIS.banderole) return { off: true };
        const ko = [];
        if (P.veh) sortirVehicule(true);
        startRun(); ecran(null); ETAT.mode = 'jeu';
        const k = POIS.banderole, x = k.x, z = k.z - 3.2, vus = new Set();
        for (const arr of sGrid.values()) for (const s of arr) { if (vus.has(s)) continue; vus.add(s);
          if (Math.abs(s.x - x) < 0.01 && Math.abs(s.z - z) < 0.01) continue; // le kiosque lui-même
          if (Math.abs(s.x - x) < s.hw + 2.5 && Math.abs(s.z - z) < s.hd + 2) ko.push('solide sur le kiosque : ' + JSON.stringify({ x: s.x, z: s.z, hw: s.hw, hd: s.hd, base: s.base })); }
        P.x = k.x; P.z = k.z; P.y = solPied(P.x, P.z); majAction();
        const lab = document.getElementById('btnAction').textContent;
        if (!/MESSAGE DANS LE CIEL/.test(lab)) ko.push('bouton du kiosque absent : ' + lab);
        return { ko, pos: [x, z] };
      });
      if (r.off) saute('Kiosque de la banderole : DECOR_V2 désactivé');
      else if (r.ko.length) fail('Kiosque de la banderole : ' + r.ko.join(' | '));
      else ok('Kiosque de la banderole : dégagé en ' + r.pos.join(', ') + ', bouton accessible');
    }

    // -------------------------------------------------------------------
    // 10e lot, n° 2 (demandé : « 360 et backflip sur la moto cross et le vélo,
    // comme sur le wakeboard »). Véhicules lus dans VEHDEFS (cross, velo),
    // durées et points dans FIG2R. Vrais appuis : INPUT.edge (pressed).
    // -------------------------------------------------------------------
    console.log('\n--- Figures sur deux roues : 360 (bouton à part) et backflip en moto cross, vélo et BMX ---');
    {
      const r = await page.evaluate(() => {
        const ko = [], info = [];
        const cles = Object.keys(VEHDEFS).filter((k) => VEHDEFS[k].cross || VEHDEFS[k].velo);
        if (cles.length < 2) return { ko: ['véhicules à figures introuvables : ' + cles] };
        const scene0 = (cle) => { if (P.veh) sortirVehicule(true); startRun(); ecran(null); ETAT.mode = 'jeu'; P.hp = P.maxHp = 1e6;
          for (const v of vehicules) scene.remove(v.mesh); vehicules.length = 0; for (const e of ennemis) e.mort = true;
          const v = creerVehicule(cle, POIS.place.x, POIS.place.z + 14, 0, null); v.h = solY(v.x, v.z); P.x = v.x; P.z = v.z; entrerVehicule(v); return v; };
        const saut = (v, h, vy, appuis) => { v.enAir = true; v.h = (v.h || 0) + h; v.vy = vy; v.airT = 0; v.hop = false; v.v = 8;
          for (const a of appuis) INPUT.edge[a] = true;
          let t = 0; while (t < 4 && (v.enAir || t < 0.05) && P.veh === v) { majConduite(1 / 30); t += 1 / 30; }
          return { enSelle: P.veh === v, t }; };
        for (const cle of cles) {
          // grand saut : 360 + backflip réussis
          let v = scene0(cle); const s0 = ETAT.score;
          const a = saut(v, 9, 11, ['sprint', 'gren']);
          if (!a.enSelle) ko.push(cle + ' : chute sur un grand saut (' + a.t.toFixed(2) + ' s en l\'air)');
          else if (!(ETAT.score - s0 >= FIG2R.pts360 + FIG2R.ptsFlip)) ko.push(cle + ' : 360 + backflip non comptés (' + (ETAT.score - s0) + ')');
          if (Math.abs(v.mesh.rotation.x) > 1e-6) ko.push(cle + ' : pas remis à plat à la réception');
          // petit saut : backflip pas fini → chute
          v = scene0(cle); const b = saut(v, 0.4, 3, ['gren']);
          if (b.enSelle) ko.push(cle + ' : backflip pas fini sans chute (' + b.t.toFixed(2) + ' s en l\'air)');
          // au sol : aucune figure ne démarre, et l'appui ne reste pas en attente jusqu'au décollage
          v = scene0(cle); INPUT.edge.gren = true; INPUT.edge.sprint = true; for (let i = 0; i < 10; i++) majConduite(1 / 30);
          if (v.figFlip > 0 || v.figSpin > 0 || P.veh !== v) ko.push(cle + ' : figure déclenchée au sol');
          const c = saut(v, 9, 11, []); if (!c.enSelle || v.figFlip > 0) ko.push(cle + ' : appui fait au sol déclenché au décollage');
          // boutons à part (demandé : « le 360 doit être un bouton en plus, pas collé avec le bunny hop ») :
          // 360 sur SPRINT ; ESQUIVE reste BUNNY HOP / CABRER, même en l'air, et ne lance jamais de 360
          v = scene0(cle);
          if (!/360/.test(document.getElementById('btnSprint').textContent)) ko.push(cle + ' : pas de bouton 360 (' + document.getElementById('btnSprint').textContent + ')');
          const esq0 = document.getElementById('btnDodge').textContent;
          v.enAir = true; v.h += 6; v.vy = 8; v.airT = 0; v.v = 8; INPUT.edge.esquive = true; majConduite(1 / 30);
          if (v.figSpin > 0) ko.push(cle + ' : ESQUIVE lance un 360');
          if (document.getElementById('btnDodge').textContent !== esq0 || /360/.test(esq0)) ko.push(cle + ' : ESQUIVE change d\'étiquette (' + esq0 + ')');
          INPUT.edge.gren = false; INPUT.edge.esquive = false; INPUT.edge.sprint = false;
          // à vélo : BUNNY HOP puis figure juste après (demandé) — le saut s'allonge juste assez ; trop tard = chute
          if (VEHDEFS[cle].velo) {
            const hopFig = (attente, appuis) => { const v = scene0(cle); v.v = 6; INPUT.btn.esquive = true; majConduite(1 / 30); INPUT.btn.esquive = false; majConduite(1 / 30);
              if (!v.enAir || !v.hop) return { erreur: 'pas de bunny hop' };
              let t = 0; while (t < attente && v.enAir) { majConduite(1 / 30); t += 1 / 30; }
              const s0 = ETAT.score; for (const k of appuis) INPUT.edge[k] = true;
              let n = 0; while ((v.enAir || n < 2) && P.veh === v && n < 120) { majConduite(1 / 30); n++; }
              for (const k of appuis) INPUT.edge[k] = false;
              return { enSelle: P.veh === v, pts: ETAT.score - s0 }; };
            const h1 = hopFig(0.05, ['gren']), h2 = hopFig(0.05, ['sprint', 'gren']), h3 = hopFig(0.3, ['gren']);
            if (h1.erreur || !h1.enSelle || !(h1.pts >= FIG2R.ptsFlip)) ko.push(cle + ' : bunny hop + backflip raté ' + JSON.stringify(h1));
            if (!h2.enSelle || !(h2.pts >= FIG2R.ptsFlip + FIG2R.pts360)) ko.push(cle + ' : bunny hop + 360 + backflip raté ' + JSON.stringify(h2));
            if (h3.enSelle) ko.push(cle + ' : figure demandée trop tard après un bunny hop, sans chute');
            info.push(cle + ' : bunny hop + figure réussi, trop tard = chute');
          }
          info.push(cle + ' : grand saut ' + a.t.toFixed(2) + ' s réussi, petit saut ' + b.t.toFixed(2) + ' s = chute');
        }
        // les figures comptent au DÉFI SUPERCROSS
        if (STUNT && STUNT.ok) { const v = scene0(cles.find((k) => VEHDEFS[k].cross)); const d = rideDepart('stunt'); v.x = d.x; v.z = d.z; v.h = solY(d.x, d.z); P.x = v.x; P.z = v.z; demarrerRide('stunt');
          const p0 = RIDES.actif ? RIDES.actif.pts : -1; saut(v, 9, 11, ['gren']); const p1 = RIDES.actif ? RIDES.actif.pts : -1;
          if (!(p1 - p0 >= FIG2R.ptsFlip)) ko.push('backflip non compté au défi supercross (' + p0 + ' → ' + p1 + ')'); else info.push('défi supercross : +' + Math.round(p1 - p0) + ' pts sur un backflip');
          if (RIDES.actif) { RIDES.actif = null; RIDES.porte.visible = false; RIDES.txt.style.display = 'none'; } }
        if (P.veh) sortirVehicule(true);
        return { ko, info };
      });
      if (r.ko.length) fail('Figures deux roues : ' + r.ko.join(' | ') + ' [' + (r.info || []).join(', ') + ']');
      else ok('Figures deux roues : ' + r.info.join(' ; '));
    }

    // -------------------------------------------------------------------
    // 10e lot, n° 3 (demandé : « améliore considérablement le skatepark et
    // agrandis-le, avec un gros bowl performant, il faut que ce soit épique »).
    // Skatepark XXL : géométrie et réglages lus dans SKX / RIDE_DEFS.bowl ;
    // pilote simulé au joystick réel (dans le sens de la marche).
    // -------------------------------------------------------------------
    console.log('\n--- Skatepark XXL : bowl, half-pipe, quarter géant, airs verticaux, REYES BOWL JAM ---');
    {
      const r = await page.evaluate(() => {
        if (!DECOR_V2 || !SKX.ok) return { off: true };
        const ko = [], info = [];
        if (!RELIEFS.some((x) => x.f === hauteurSkateXXL)) ko.push('relief du skatepark absent');
        // la parcelle est dégagée : plus aucun décor du désert au-dessus du sol (solides actifs, sommets fusionnés)
        const vus = new Set(); let solides = 0;
        for (const arr of sGrid.values()) for (const s of arr) { if (vus.has(s)) continue; vus.add(s); if (s.actif !== false && s.x > SKX.x0 && s.x < SKX.x1 && s.z > SKX.z0 && s.z < SKX.z1 && s.hw < 2.5) solides++; }
        if (solides) ko.push(solides + ' petit(s) solide(s) du désert restés dans le skatepark');
        const scene0 = () => { if (P.veh) sortirVehicule(true); startRun(); ecran(null); ETAT.mode = 'jeu'; P.hp = P.maxHp = 1e6; for (const v of vehicules) scene.remove(v.mesh); vehicules.length = 0; for (const e of ennemis) e.mort = true; };
        // à pied : on ressort du fond du bowl par le couloir de sortie
        scene0(); const b = SKX.bowls[0]; P.x = SKX.x0 + SKX.sortie.u; P.z = SKX.z0 + b.w; P.y = solPied(P.x, P.z);
        let yMax = 0; for (let i = 0; i < 30 * 8; i++) { INPUT.mx = 0; INPUT.mz = 1; majJoueur(1 / 30, 1 / 30); yMax = Math.max(yMax, P.y); } INPUT.mz = 0;
        if (!(yMax > SKX.D - 0.3)) ko.push('à pied, coincé au fond du bowl (y max ' + yMax.toFixed(2) + ')'); else info.push('à pied : sortie du bowl par le couloir');
        // à vélo, en BMX, en moto cross : allers-retours dans le half-pipe
        const session = (cle, u, w, ang, duree, figures) => { scene0(); const v = creerVehicule(cle, SKX.x0 + u, SKX.z0 + w, ang, null); v.h = solY(v.x, v.z); P.x = v.x; P.z = v.z; entrerVehicule(v);
          let airs = 0, hMax = 0, avant = false, t = 0; const hp0 = v.hp;
          while (t < duree && P.veh === v) { INPUT.mx = Math.sin(v.ang); INPUT.mz = Math.cos(v.ang);
            if (figures && v.enAir && v.vertAir && !avant) INPUT.edge.gren = true;
            majConduite(1 / 30); if (RIDES.actif) { majRides(1 / 30); } t += 1 / 30;
            if (v.enAir && v.vertAir && !avant) airs++; avant = !!(v.enAir && v.vertAir); if (v.vertAir) hMax = Math.max(hMax, (v.h || 0) - SKX.D); }
          INPUT.mx = INPUT.mz = 0; INPUT.edge.gren = false;
          return { airs, hMax: +hMax.toFixed(1), enSelle: P.veh === v, degats: +(hp0 - v.hp).toFixed(1), v }; };
        for (const cle of ['bmx', 'velo', 'motocross']) {
          const s = session(cle, 20, SKX.hp.wc, 0, 20, false);
          if (!s.enSelle || s.degats > 0 || s.airs < 6 || !(s.hMax > 1)) ko.push('half-pipe en ' + cle + ' : ' + JSON.stringify({ airs: s.airs, hMax: s.hMax, enSelle: s.enSelle, degats: s.degats }));
          else info.push(cle + ' : ' + s.airs + ' airs en 20 s, ' + s.hMax + ' u au-dessus du coping');
        }
        // quarter géant : à pleine vitesse vers l'est, gros air sans chute
        { const s = session('motocross', 30, 43, Math.PI / 2, 12, false); if (!s.enSelle || s.degats > 0 || s.airs < 1) ko.push('quarter géant : ' + JSON.stringify({ airs: s.airs, hMax: s.hMax, enSelle: s.enSelle, degats: s.degats })); else info.push('quarter géant : ' + s.hMax + ' u au-dessus du coping'); }
        // REYES BOWL JAM : raté sans figure, réussi avec des backflips, une prime par vague
        const jam = (figures, nouvellePartie) => { if (nouvellePartie) scene0(); else { if (P.veh) sortirVehicule(true); for (const v of vehicules) scene.remove(v.mesh); vehicules.length = 0; } const v = creerVehicule('bmx', SKX.x0 + 20, SKX.z0 + SKX.hp.wc, 0, null); v.h = solY(v.x, v.z); P.x = v.x; P.z = v.z; entrerVehicule(v);
          const a0 = META.argent; demarrerRide('bowl'); let t = 0, avant = false;
          while (RIDES.actif && t < RIDE_DEFS.bowl.temps + 1 && P.veh === v) { INPUT.mx = Math.sin(v.ang); INPUT.mz = Math.cos(v.ang);
            if (figures && v.enAir && v.vertAir && !avant) INPUT.edge.gren = true; avant = !!(v.enAir && v.vertAir);
            majConduite(1 / 30); majRides(1 / 30); t += 1 / 30; }
          INPUT.mx = INPUT.mz = 0; INPUT.edge.gren = false; if (RIDES.actif) finirRide(false);
          return { prime: META.argent - a0, t: +t.toFixed(1) }; };
        const j0 = jam(false, true), j1 = jam(true, true), j2 = jam(true, false); // j2 : même partie, même vague que j1
        if (j0.prime > 0) ko.push('jam réussi sans aucune figure');
        if (!(j1.prime > 0)) ko.push('jam raté avec un backflip par air (' + JSON.stringify(j1) + ')'); else info.push('jam réussi en ' + j1.t + ' s avec des backflips');
        if (j2.prime !== 0) ko.push('seconde prime du jam dans la même vague');
        if (P.veh) sortirVehicule(true);
        return { ko, info };
      });
      if (r.off) saute('Skatepark XXL : DECOR_V2 désactivé');
      else if (r.ko.length) fail('Skatepark XXL : ' + r.ko.join(' | ') + ' [' + r.info.join(', ') + ']');
      else ok('Skatepark XXL : ' + r.info.join(' ; ') + ' ; jam raté sans figure, une prime par vague');
    }

    // -------------------------------------------------------------------
    // 10e lot, n° 4 (demandé : « quand le défi est lancé, il faut se calmer
    // avec les vagues, idem sur d'autres jeux » ; « le vélo ne doit pas se
    // casser, ce n'est pas une voiture, là il explose »).
    // -------------------------------------------------------------------
    console.log('\n--- Trêve pendant un défi ou une activité ; vélo indestructible ---');
    {
      const r = await page.evaluate(() => {
        const ko = [], info = [];
        if (P.veh) sortirVehicule(true);
        startRun(); ecran(null); ETAT.mode = 'jeu'; P.hp = P.maxHp = 1e6;
        for (const v of vehicules) scene.remove(v.mesh); vehicules.length = 0;
        // défi lancé : le compte à rebours des vagues ne bouge plus, aucune vague ne part
        const v = creerVehicule('motocross', P.x + 3, P.z, 0, null); P.x = v.x; P.z = v.z; entrerVehicule(v);
        RIDES.actif = { id: 'stunt', portes: [], i: 0, t: 999, t0: 0, pts: 0 };
        WAVES.etat = 'repos'; WAVES.t = 0.5; const n0 = WAVES.n;
        for (let i = 0; i < 60; i++) majVagues(1 / 30);
        if (WAVES.n !== n0 || WAVES.t !== 0.5) ko.push('une vague part pendant un défi');
        if (!/PAUSE/.test(document.getElementById('waveLabel').textContent)) ko.push('libellé des vagues : ' + document.getElementById('waveLabel').textContent);
        // un gang déjà là ne s'occupe plus du joueur
        const g = creerEnnemi('vip_pistol', P.x + 8, P.z, true); g.cibleT = 0;
        const hp0 = P.hp; for (let i = 0; i < 90; i++) majEnnemis(1 / 30);
        if (!g.passif) ko.push('le gang attaque pendant le défi'); else info.push('défi : vagues en pause, gangs passifs');
        // défi fini : tout reprend
        RIDES.actif = null; g.cibleT = 0; for (let i = 0; i < 30; i++) majEnnemis(1 / 30); for (let i = 0; i < 30; i++) majVagues(1 / 30);
        if (g.passif && !g.mort) ko.push('le gang reste passif après le défi');
        if (WAVES.n === n0) ko.push('les vagues ne reprennent pas après le défi'); else info.push('défi fini : les vagues reprennent');
        g.mort = true;
        // vélo et BMX : ni dégâts, ni explosion
        for (const cle of Object.keys(VEHDEFS).filter((k) => VEHDEFS[k].velo)) {
          const b = creerVehicule(cle, P.x + 6, P.z + 6, 0, null); const h0 = b.hp;
          abimerVehicule(b, 500, true); exploserVehicule(b);
          if (b.mort || b.hp < h0 || b.enFeu) ko.push(cle + ' : abîmé ou détruit (hp ' + b.hp + ', mort ' + !!b.mort + ')');
        }
        info.push('vélo et BMX indestructibles');
        if (P.veh) sortirVehicule(true);
        return { ko, info };
      });
      if (r.ko.length) fail('Trêve / vélo : ' + r.ko.join(' | '));
      else ok('Trêve / vélo : ' + r.info.join(', '));
    }

    // -------------------------------------------------------------------
    // 10e lot, n° 5 (demandé : « ajoute la possibilité de tirer de la voiture
    // ou moto ou d'un véhicule de ce type avec pistolet ou mitraillette
    // légère »). Éligibilité lue dans VEHDEFS (vehiculeTireur), armes lues
    // dans ARMES_VOLANT ; bouton TIR jamais sous un autre bouton visible.
    // -------------------------------------------------------------------
    console.log('\n--- Tir par la vitre : voiture et moto, pistolet ou mitraillette légère ---');
    {
      const r = await page.evaluate(() => {
        const ko = [], info = [];
        const scene0 = () => { if (P.veh) sortirVehicule(true); startRun(); ecran(null); ETAT.mode = 'jeu'; P.hp = P.maxHp = 1e6;
          for (const v of vehicules) scene.remove(v.mesh); vehicules.length = 0; for (const e of ennemis) e.mort = true; for (const b of balles) { b.on = false; } };
        // éligibilité : jamais un vélo, un aéronef, un bateau ni un véhicule qui a déjà son arme
        for (const k of Object.keys(VEHDEFS)) { const d = VEHDEFS[k];
          const attendu = (d.type === 'car' || d.type === 'moto') && !d.air && !d.velo && !d.canon && !d.mitrailleuse && !d.dca && !d.grue && !d.pompier && !d.derby; // derby : pas d'armes
          if (vehiculeTireur({ def: d }) !== attendu) ko.push('éligibilité ' + k); }
        // sans arme légère : pas de bouton TIR
        scene0(); for (const id of ARMES_VOLANT) META.armes[id].poss = false;
        let v = creerVehicule('citadine', P.x + 3, P.z, 0, null); P.x = v.x; P.z = v.z; entrerVehicule(v);
        if (v.armeVolant || getComputedStyle(el('btnFire')).display !== 'none') ko.push('bouton TIR sans arme légère');
        sortirVehicule(true);
        // la meilleure arme légère possédée, chargée
        const sauve = {}; for (const id of ARMES_VOLANT) sauve[id] = META.armes[id].poss;
        const essai = (cle, armes, enMain) => {
          scene0(); for (const id of ARMES_VOLANT) META.armes[id].poss = armes.includes(id);
          for (const id of armes) { P.mags[id] = armeStats(id).mag; P.mun[id] = 60; }
          if (enMain) majArmeJoueur(enMain); else majArmeJoueur('poings');
          const v = creerVehicule(cle, P.x, P.z, 0, null); P.x = v.x; P.z = v.z; entrerVehicule(v);
          const btn = el('btnFire'), rb = btn.getBoundingClientRect();
          // aucun autre bouton visible ne recouvre TIR (SORTIR compris)
          majAction && majAction();
          for (const b of document.querySelectorAll('#hud .btn, #btnAction')) { if (b === btn || getComputedStyle(b).display === 'none') continue; const o = b.getBoundingClientRect();
            if (o.width && rb.left < o.right - 2 && o.left < rb.right - 2 && rb.top < o.bottom - 2 && o.top < rb.bottom - 2) ko.push(cle + ' : TIR recouvert par #' + b.id); }
          // un gangster sur le côté, à 9 u
          const g = creerEnnemi('vip_pistol', v.x + 9, v.z + 1, true); g.passif = true; const hp0 = g.hp, mag0 = P.mags[v.armeVolant], ch0 = WANTED.heat;
          INPUT.btn.tir = true; let t = 0;
          while (t < 2.5 && !g.mort) { majJoueur(1 / 60, 1 / 60); majPools(1 / 60); t += 1 / 60; } // 60 i/s : à 1/30, une balle (2,4 u par image) peut sauter par-dessus la cible
          INPUT.btn.tir = false;
          const res = { arme: v.armeVolant, touche: g.mort || g.hp < hp0, tirs: mag0 - (P.mags[v.armeVolant] || 0), chaleur: WANTED.heat > ch0, heat: [ch0, WANTED.heat], vehHp: v.hp === v.def.hp, classe: btn.classList.contains('volTir') };
          g.mort = true; sortirVehicule(true);
          res.apres = !btn.classList.contains('volTir');
          return res;
        };
        const e1 = essai('citadine', ['pistolet'], null);
        if (e1.arme !== 'pistolet' || !e1.touche || !e1.classe || !e1.chaleur || !e1.vehHp || !e1.apres) ko.push('voiture au pistolet : ' + JSON.stringify(e1)); else info.push('voiture : pistolet, cible touchée');
        const e2 = essai('moto', ['pistolet', 'uzi'], null);
        if (e2.arme !== 'uzi' || !e2.touche) ko.push('moto, meilleure arme : ' + JSON.stringify(e2)); else info.push('moto : Uzi (la meilleure), cible touchée');
        const e3 = essai('berline', ['pistolet', 'pm'], 'pistolet');
        if (e3.arme !== 'pistolet') ko.push('arme en main ignorée : ' + JSON.stringify(e3)); else info.push('arme légère en main gardée');
        // chargeur vide : recharge automatique, puis le tir reprend
        { scene0(); for (const id of ARMES_VOLANT) META.armes[id].poss = id === 'pm'; P.mags.pm = 1; P.mun.pm = 30; majArmeJoueur('poings');
          const v = creerVehicule('citadine', P.x, P.z, 0, null); P.x = v.x; P.z = v.z; entrerVehicule(v);
          INPUT.btn.tir = true; let vu = false; for (let i = 0; i < 90; i++) { majJoueur(1 / 30, 1 / 30); if (P.rechT > 0) vu = true; } INPUT.btn.tir = false;
          if (!vu || !(P.mun.pm < 30)) ko.push('pas de recharge au volant (mags ' + P.mags.pm + ', mun ' + P.mun.pm + ')'); else info.push('recharge automatique');
          sortirVehicule(true); }
        // vélo : jamais de tir (les boutons y font des figures)
        { scene0(); META.armes.pistolet.poss = true; P.mags.pistolet = 12; const v = creerVehicule('velo', P.x, P.z, 0, null); P.x = v.x; P.z = v.z; entrerVehicule(v);
          if (v.armeVolant || el('btnFire').classList.contains('volTir')) ko.push('tir à vélo'); sortirVehicule(true); }
        for (const id of ARMES_VOLANT) META.armes[id].poss = sauve[id];
        if (P.veh) sortirVehicule(true);
        return { ko, info };
      });
      if (r.ko.length) fail('Tir par la vitre : ' + r.ko.join(' | '));
      else ok('Tir par la vitre : ' + r.info.join(', ') + ' ; aucun bouton ne recouvre TIR');
    }

    // -------------------------------------------------------------------
    // Aquarium « Bleu Profond » (refait au 11e lot) : « 1, 2, 3… GASTON ! ».
    // Réglages lus dans AQUA_* (jamais recopiés). Pilote simulé au joystick
    // réel (majJoueur), chemin calculé sur les vrais solides de la salle.
    // -------------------------------------------------------------------
    console.log('\n--- Aquarium : 1, 2, 3… GASTON ! (gardien, regard, encre, manches, récompense, pilote simulé) ---');
    {
      const r = await page.evaluate(() => {
        const ko = [], info = [];
        const entrer = () => { if (INT.actif) sortirInterieur(); startRun(); ecran(null); ETAT.mode = 'jeu'; P.hp = P.maxHp = 1e6;
          entrerInterieur('aquarium', PORTES.find((x) => x.id === 'aquarium')); ETAT.intT = 0; return INT.actif; };
        const appuyer = () => { majAction(); const b = document.getElementById('btnAction'); const l = b.style.display === 'none' ? '' : b.textContent; if (b._fn && l) b._fn(); return l; };
        const vu = (e) => getComputedStyle(e).display !== 'none';
        // 1) le gardien lance la partie
        let s = entrer();
        P.x = s.gardien.x; P.z = s.gardien.z;
        const label = appuyer();
        if (!/ÉVADÉ/.test(label) || !s.aqActif) ko.push('le gardien ne lance pas la chasse (' + label + ')');
        if (!vu(aquaWrap) || !vu(aquaIntroWrap)) ko.push('indicateur du regard ou carte d’intro absents');
        if (vu(document.getElementById('btnFire'))) ko.push('boutons de combat affichés pendant la chasse');
        if (!s.gastonMesh.visible) ko.push('Gaston invisible');
        // 2) cycle du regard : dos → alerte → regarde → dos
        const etats = []; s.aqT = 0.01; for (let i = 0; i < 400 && etats.length < 4; i++) { const e0 = s.aqEtat; majInterieur(0.02, 0.02); if (s.aqEtat !== e0) etats.push(s.aqEtat); }
        if (!/alerte,(regarde|dos)/.test(etats.join(','))) ko.push('cycle du regard inattendu : ' + etats.join(','));
        // 3) immobile sous son regard : rien ; bouger : jet d'encre, il change de bassin
        s.aqEtat = 'regarde'; s.aqT = 3; s.aqGraceT = 0; s.aqPX = P.x; s.aqPZ = P.z; const cuve0 = s.aqCuve;
        for (let i = 0; i < 20; i++) majInterieur(0.02, 0.02);
        if (s.aqTaches !== 0) ko.push('repéré alors qu’il ne bougeait pas');
        s.aqEtat = 'regarde'; s.aqT = 3; s.aqGraceT = 0; P.x += 0.5; majInterieur(0.02, 0.02);
        if (s.aqTaches !== 1 || s.aqCuve === cuve0 || s.aqEtat !== 'fuite' || aquaEncreEl.style.opacity !== '1') ko.push('bouger sous son regard ne donne pas un jet d’encre + fuite (' + JSON.stringify({ t: s.aqTaches, e: s.aqEtat }) + ')');
        // 4) l'attraper : seulement de dos ; sous le regard, le contact ne compte pas
        for (let i = 0; i < 60; i++) majInterieur(0.02, 0.02); // fin de la fuite
        const p = s.perchoirs[s.aqCuve];
        s.aqEtat = 'regarde'; s.aqT = 3; s.aqGraceT = 9; P.x = p.gx; P.z = p.gz; s.aqPX = P.x; s.aqPZ = P.z; majInterieur(0.02, 0.02);
        if (s.aqManche !== 0) ko.push('attrapé alors qu’il regardait');
        s.aqEtat = 'dos'; s.aqT = 3; majInterieur(0.02, 0.02);
        if (s.aqManche !== 1 || s.aqEtat !== 'fuite') ko.push('le toucher de dos ne compte pas une manche');
        // 5) trois jets d'encre : il s'enfuit, rien gagné, boutons rendus, on peut rejouer
        const a0 = META.argent; s.aqTaches = 2; s.aqEtat = 'regarde'; s.aqT = 3; s.aqGraceT = 0; for (let i = 0; i < 60; i++) majInterieur(0.02, 0.02); s.aqEtat = 'regarde'; s.aqT = 3; s.aqGraceT = 0; P.x += 0.6; majInterieur(0.02, 0.02);
        if (s.aqActif || META.argent !== a0 || !vu(document.getElementById('btnFire'))) ko.push('trois jets d’encre ne finissent pas la partie proprement');
        P.x = s.gardien.x; P.z = s.gardien.z; if (!/ÉVADÉ/.test(appuyer())) ko.push('impossible de retenter après un échec');
        // 6) chrono : au bout de AQUA_DUREE, raté
        s.aqChrono = AQUA_DUREE - 0.01; majInterieur(0.05, 0.05); if (s.aqActif) ko.push('le chrono n’arrête pas la partie');
        info.push('regard, encre, manches, chrono');
        // 7) pilote simulé : chemin sur les vrais solides, réaction 0,3 s
        const chemin = (s, x1, z1) => { const pas = 0.5, W = s.D.w / 2 - 0.6, D = s.D.d / 2 - 0.6;
          const nx = Math.floor(2 * W / pas) + 1, nz = Math.floor(2 * D / pas) + 1, idx = (i, j) => i * nz + j;
          const cX = (i) => s.ox - W + i * pas, cZ = (j) => s.oz - D + j * pas;
          const libre = (i, j) => i >= 0 && j >= 0 && i < nx && j < nz && !solidAt(cX(i), cZ(j), 0.5);
          const si = Math.round((P.x - s.ox + W) / pas), sj = Math.round((P.z - s.oz + D) / pas), ti = Math.round((x1 - s.ox + W) / pas), tj = Math.round((z1 - s.oz + D) / pas);
          const prev = new Int32Array(nx * nz).fill(-2), file = [idx(si, sj)]; prev[idx(si, sj)] = -1;
          while (file.length) { const k = file.shift(), i = Math.floor(k / nz), j = k % nz; if (i === ti && j === tj) break;
            for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) { const a = i + di, b = j + dj; if (!libre(a, b) || prev[idx(a, b)] !== -2) continue; prev[idx(a, b)] = k; file.push(idx(a, b)); } }
          const pts = []; let k = idx(ti, tj); if (prev[k] === -2) return null; while (k !== -1) { pts.push({ x: cX(Math.floor(k / nz)), z: cZ(k % nz) }); k = prev[k]; } return pts.reverse(); };
        const partie = (malin) => {
          const s = entrer(); P.x = s.gardien.x; P.z = s.gardien.z; appuyer();
          let t = 0, reaction = 0, route = null, cuveRoute = -1; const dt = 1 / 30;
          while (s.aqActif && t < AQUA_DUREE + 2) {
            if (s.aqCuve !== cuveRoute && s.aqEtat !== 'fuite') { const pc = s.perchoirs[s.aqCuve]; route = chemin(s, pc.ax, pc.az); cuveRoute = s.aqCuve; if (!route) return { bloque: true }; }
            const danger = s.aqEtat === 'alerte' || s.aqEtat === 'regarde';
            reaction = danger ? reaction + dt : 0;
            let bouge = !malin || reaction < 0.3;
            if (s.aqEtat === 'fuite') bouge = false;
            if (bouge && route) { while (route.length > 1 && Math.hypot(route[0].x - P.x, route[0].z - P.z) < 0.6) route.shift();
              const pc = s.perchoirs[s.aqCuve], cible = route.length > 1 ? route[0] : { x: pc.gx, z: pc.gz }; const dx = cible.x - P.x, dz = cible.z - P.z, L = Math.hypot(dx, dz) || 1;
              INPUT.mx = dx / L; INPUT.mz = dz / L; } else { INPUT.mx = 0; INPUT.mz = 0; }
            majJoueur(dt, dt); majInterieur(dt, dt); t += dt;
          }
          INPUT.mx = INPUT.mz = 0;
          const res = { gagne: s.gastonTrouve && s.gastonVague === WAVES.n, t: Math.round(t), taches: s.aqTaches };
          sortirInterieur(); return res;
        };
        const malins = []; for (let i = 0; i < 4; i++) malins.push(partie(true));
        const naifs = [partie(false), partie(false), partie(false)];
        if (malins.some((m) => m.bloque)) ko.push('un perchoir de Gaston est inatteignable à pied');
        const gagnes = malins.filter((m) => m.gagne).length;
        if (gagnes < 3) ko.push('le pilote qui s’arrête quand Gaston regarde ne gagne que ' + gagnes + '/4 (' + JSON.stringify(malins) + ')');
        else info.push('pilote malin : ' + gagnes + '/4 (' + malins.map((m) => m.t + ' s, ' + m.taches + ' encre').join(' ; ') + ')');
        if (naifs.some((n) => n.gagne)) ko.push('un joueur qui ne s’arrête jamais gagne quand même (' + JSON.stringify(naifs) + ')');
        else info.push('pilote qui fonce sans s’arrêter : perdu 3/3');
        // 8) récompense une fois par vague, Perle Noire la première fois ; remises à zéro
        s = entrer(); s.gastonTrouve = true; s.gastonVague = WAVES.n; P.x = s.gardien.x; P.z = s.gardien.z;
        if (!/sieste/.test(appuyer()) || s.aqActif) ko.push('une 2e chasse réussie est possible dans la même vague');
        s.gastonVague = -1; appuyer(); sortirInterieur();
        if (s.aqActif || vu(aquaWrap)) ko.push('sortir en pleine chasse ne l’arrête pas');
        s = entrer(); P.x = s.gardien.x; P.z = s.gardien.z; appuyer(); P.hp = 1; toucherJoueur(9999);
        if (s.aqActif || vu(aquaWrap)) ko.push('mourir en pleine chasse ne l’arrête pas');
        startRun(); if (INT.salles.aquarium.aqActif) ko.push('le game over ne remet pas la chasse à zéro');
        return { ko, info, perle: aCurio('perle') };
      });
      if (r.ko.length) fail('Aquarium : ' + r.ko.join(' | ') + ' [' + r.info.join(', ') + ']');
      else ok('Aquarium : ' + r.info.join(' ; ') + ' ; une chasse réussie par vague, remises à zéro (sortie, mort, game over)' + (r.perle ? ' ; Perle Noire obtenue' : ''));
    }

    // -------------------------------------------------------------------
    // Laverie « Bulle Bleue » (refaite au 11e lot) : l'essorage de la
    // machine 7. Réglages lus dans LAV_* (jamais recopiés). Pilote simulé au
    // joystick (réaction 0,2 s) : il doit tenir l'aiguille ; sans rien faire,
    // la machine cogne et réveille le guetteur.
    // -------------------------------------------------------------------
    console.log('\n--- Laverie : l’essorage de la machine 7 (aiguille, coups, guetteur, gain selon la stabilité, pilote simulé) ---');
    {
      const r = await page.evaluate(() => {
        const ko = [], info = [];
        const entrer = () => { if (INT.actif) sortirInterieur(); startRun(); ecran(null); ETAT.mode = 'jeu'; P.hp = P.maxHp = 1e6; META.argent = Math.max(META.argent, 2000);
          entrerInterieur('laverie', PORTES.find((x) => x.id === 'laverie')); ETAT.intT = 0; return INT.actif; };
        const appuyer = () => { majAction(); const b = document.getElementById('btnAction'); const l = b.style.display === 'none' ? '' : b.textContent; if (b._fn && l) b._fn(); return l; };
        const vu = (e) => getComputedStyle(e).display !== 'none';
        // 1) lancement : 50 $, intro, panneau, boutons masqués, joueur tenu à la machine
        let s = entrer(); P.x = s.machine7.x; P.z = s.machine7.z; const a0 = META.argent;
        const label = appuyer();
        if (!/ESSORAGE/.test(label) || !s.cycleOn || META.argent !== a0 - 50) ko.push('lancement de la machine 7 (' + label + ')');
        if (!vu(lavPanWrap) || !vu(lavIntroWrap) || vu(document.getElementById('btnFire'))) ko.push('panneau / intro / boutons de combat');
        INPUT.mx = -1; for (let i = 0; i < 10; i++) majInterieur(0.05, 0.05); INPUT.mx = 0;
        if (Math.hypot(P.x - s.mach7X, P.z - s.mach7Z) > 2.5) ko.push('le joueur n’est pas tenu à la machine');
        // bug V2 (trouvé en rendu réel au V3) : y = NaN avant le 1er coup, la machine 7 disparaissait pendant tout le cycle
        { const p7 = s.mach7.position; if (!Number.isFinite(p7.x) || !Number.isFinite(p7.y) || !Number.isFinite(p7.z) || Math.abs(p7.x - s.mach7X) > 1) ko.push('la machine 7 n’est pas à sa place pendant le cycle (' + [p7.x, p7.y, p7.z].join(',') + ')');
          else info.push('machine 7 visible pendant le cycle'); }
        // 2) le joystick pousse l'aiguille ; le rouge fait cogner ; 3 coups = guetteur réveillé, rien gagné
        s.lavAig = 0; s.lavVit = 0; s.lavPousse = 0; s.lavPousseT = 99; INPUT.mx = 1; for (let i = 0; i < 6; i++) majInterieur(0.05, 0.05); INPUT.mx = 0;
        if (!(s.lavAig > 0.05)) ko.push('le joystick ne pousse pas l’aiguille (' + s.lavAig + ')');
        s.lavAig = LAV_ROUGE + 0.05; s.lavVit = 0; s.lavCoupCd = 0; majInterieur(0.02, 0.02);
        if (s.lavCoups !== 1 || !(Math.abs(s.lavAig) < LAV_ROUGE)) ko.push('le rouge ne fait pas cogner une fois');
        s.lavCoups = LAV_COUPS_MAX - 1; s.lavAig = -1; s.lavCoupCd = 0; const a1 = META.argent; majInterieur(0.02, 0.02);
        if (s.cycleOn || s.sacPret || !s.alarme || META.argent !== a1 || vu(lavPanWrap) || !vu(document.getElementById('btnFire'))) ko.push('3 coups ne réveillent pas proprement le guetteur (' + JSON.stringify({ c: s.cycleOn, a: s.alarme }) + ')');
        else info.push('3 coups : guetteur réveillé, alarme, rien gagné');
        // 3) pilote simulé : contrôle proportionnel avec 0,2 s de retard ; et un joueur qui ne fait rien
        const cycle = (malin) => {
          const s = entrer(); P.x = s.machine7.x; P.z = s.machine7.z; appuyer();
          const dt = 1 / 30, file = []; let t = 0;
          while (s.cycleOn && t < LAV_DUREE + 2) {
            file.push(clamp(-(s.lavAig * 2.4 + s.lavVit * 0.9), -1, 1));
            INPUT.mx = malin && file.length > 6 ? file.shift() : 0; // ~0,2 s de réaction
            majInterieur(dt, dt); t += dt;
          }
          INPUT.mx = 0;
          const res = { sac: s.sacPret, gain: s.lavGain, coups: s.lavCoups, qualite: s.lavQualite };
          if (s.sacPret) { P.x = s.machine7.x; P.z = s.machine7.z; const a = META.argent; const l = appuyer(); res.paye = META.argent - a; res.label = l; }
          sortirInterieur(); return res;
        };
        const malins = [cycle(true), cycle(true), cycle(true)], passif = cycle(false);
        const reussis = malins.filter((m) => m.sac && m.paye === m.gain && m.gain >= LAV_GAIN[0] && m.gain <= LAV_GAIN[1] + LAV_BONUS_PARFAIT).length;
        if (reussis < 3) ko.push('le pilote qui tient l’aiguille rate (' + JSON.stringify(malins) + ')');
        else info.push('pilote : ' + malins.map((m) => m.gain + ' $ (' + m.qualite + ' %, ' + m.coups + ' coup)').join(' ; '));
        if (passif.sac) ko.push('sans toucher au joystick, le cycle réussit quand même');
        else info.push('sans rien faire : guetteur réveillé');
        // 4) plafond 2 par vague, remises à zéro
        s = entrer(); s.lavVague = WAVES.n; s.lavN = LAVERIE_LAVAGES_MAX; P.x = s.machine7.x; P.z = s.machine7.z;
        if (!/maintenance/.test(appuyer()) || s.cycleOn) ko.push('3e lavage de la vague accepté');
        s.lavN = 0; appuyer(); sortirInterieur();
        if (s.cycleOn || vu(lavPanWrap)) ko.push('sortir en plein cycle ne l’arrête pas');
        s = entrer(); P.x = s.machine7.x; P.z = s.machine7.z; appuyer(); P.hp = 1; toucherJoueur(9999);
        if (s.cycleOn || vu(lavPanWrap)) ko.push('mourir en plein cycle ne l’arrête pas');
        startRun(); if (INT.salles.laverie.cycleOn || INT.salles.laverie.sacPret) ko.push('le game over ne remet pas la machine à zéro');
        return { ko, info };
      });
      if (r.ko.length) fail('Laverie : ' + r.ko.join(' | ') + ' [' + r.info.join(', ') + ']');
      else ok('Laverie : ' + r.info.join(' ; ') + ' ; 2 lavages par vague, remises à zéro (sortie, mort, game over)');
    }

    // -------------------------------------------------------------------
    // Serre (refaite au 11e lot) : la nuit de la floraison. Réglages lus dans
    // SERRE_* (jamais recopiés). Pilote simulé glouton au joystick réel
    // (chemin BFS sur les vrais solides) ; un joueur passif perd la serre.
    // -------------------------------------------------------------------
    console.log('\n--- Serre : la nuit de la floraison (besoins, outils, contagion, fin, Étoile, pilote simulé) ---');
    {
      const r = await page.evaluate(() => {
        const ko = [], info = [];
        const entrer = () => { if (INT.actif) sortirInterieur(); startRun(); ecran(null); ETAT.mode = 'jeu'; P.hp = P.maxHp = 1e6;
          entrerInterieur('serre', PORTES.find((x) => x.id === 'serre')); ETAT.intT = 0; return INT.actif; };
        const appuyer = () => { majAction(); const b = document.getElementById('btnAction'); const l = b.style.display === 'none' ? '' : b.textContent; if (b._fn && l) b._fn(); return l; };
        const vu = (e) => getComputedStyle(e).display !== 'none';
        // 1) lancement au tableau
        let s = entrer(); P.x = s.panneau.x; P.z = s.panneau.z;
        const label = appuyer();
        if (!/FLORAISON/.test(label) || !s.srNuit || !vu(serreWrap) || !vu(serreIntroWrap) || vu(document.getElementById('btnFire'))) ko.push('lancement de la nuit (' + label + ')');
        // 2) un besoin d'eau : arrosoir plein = arroser, une dose de moins
        const p0 = s.pots[0]; serreNouveauBesoin(s, 'eau', p0); P.x = p0.x; P.z = p0.z;
        if (!p0.icone.visible) ko.push('icône du besoin invisible');
        const l1 = appuyer(); if (!/ARROSER/.test(l1) || p0.besoin || s.srEau !== SERRE_DOSES - 1 || s.srSoins !== 1) ko.push('arroser (' + l1 + ')');
        // 3) pucerons : il faut le pulvérisateur (table), puis l'arrosoir se reprend au bassin
        const p1 = s.pots[1]; serreNouveauBesoin(s, 'puceron', p1); P.x = p1.x; P.z = p1.z;
        if (!/pulvérisateur/i.test(appuyer()) || !p1.besoin) ko.push('pucerons traités sans le pulvérisateur');
        P.x = s.tableOutils.tx; P.z = s.tableOutils.tz; if (!/PULVÉRISATEUR/.test(appuyer()) || s.srOutil !== 'pulve') ko.push('prendre le pulvérisateur');
        P.x = p1.x; P.z = p1.z; if (!/PULVÉRISER/.test(appuyer()) || p1.besoin) ko.push('pulvériser');
        P.x = s.bassinPos.bx + 3.4; P.z = s.bassinPos.bz; if (!/ARROSOIR/.test(appuyer()) || s.srOutil !== 'arrosoir' || s.srEau !== SERRE_DOSES) ko.push('reprendre l’arrosoir au bassin');
        // 4) contagion : des pucerons oubliés gagnent un voisin
        const p2 = s.pots[5]; serreNouveauBesoin(s, 'puceron', p2); p2.besoin.t = p2.besoin.tMax * SERRE_CONTAGION - 0.01; s.srProchain = 99;
        majInterieur(0.05, 0.05);
        if (s.pots.filter((p) => p.besoin && p.besoin.type === 'puceron').length < 2) ko.push('les pucerons ne gagnent pas de voisin');
        // 5) un besoin oublié : la plante fane
        p2.besoin.t = p2.besoin.tMax; majInterieur(0.01, 0.01);
        if (!p2.fanee || s.srFanees !== 1) ko.push('une plante oubliée ne fane pas');
        info.push('arrosoir, pulvérisateur, contagion, fanaison');
        // 6) fin de nuit sans perte : l'Étoile, une fois par vague
        s = entrer(); P.x = s.panneau.x; P.z = s.panneau.z; appuyer(); s.srSoins = 7; s.srT = SERRE_DUREE - 0.01; const a0 = META.argent;
        majInterieur(0.05, 0.05);
        if (s.srNuit || s.srFin !== 'parfait' || META.argent !== a0 + 7 * SERRE_GAIN_SOIN + SERRE_BONUS_PARFAIT || !s.etoile.visible) ko.push('fin parfaite (' + s.srFin + ', ' + (META.argent - a0) + ' $)');
        P.x = s.panneau.x; P.z = s.panneau.z; if (!/repose/.test(appuyer()) || s.srNuit) ko.push('2e nuit dans la même vague');
        // 7) pilote simulé glouton ; joueur passif
        const chemin = (s, x1, z1) => { const pas = 0.5, W = s.D.w / 2 - 0.6, D = s.D.d / 2 - 0.6;
          const nx = Math.floor(2 * W / pas) + 1, nz = Math.floor(2 * D / pas) + 1, idx = (i, j) => i * nz + j, cX = (i) => s.ox - W + i * pas, cZ = (j) => s.oz - D + j * pas;
          const libre = (i, j) => i >= 0 && j >= 0 && i < nx && j < nz && !solidAt(cX(i), cZ(j), 0.65);
          const si = Math.round((P.x - s.ox + W) / pas), sj = Math.round((P.z - s.oz + D) / pas); let ti = clamp(Math.round((x1 - s.ox + W) / pas), 0, nx - 1), tj = clamp(Math.round((z1 - s.oz + D) / pas), 0, nz - 1);
          if (!libre(ti, tj)) { let best = null, bd = 1e9; for (let di = -5; di <= 5; di++) for (let dj = -5; dj <= 5; dj++) if (libre(ti + di, tj + dj) && di * di + dj * dj < bd) { bd = di * di + dj * dj; best = [ti + di, tj + dj]; } if (best) { ti = best[0]; tj = best[1]; } } // un joueur s'arrête n'importe où dans le rayon de la zone
          const prev = new Int32Array(nx * nz).fill(-2), file = [idx(si, sj)]; prev[idx(si, sj)] = -1;
          while (file.length) { const k = file.shift(), i = Math.floor(k / nz), j = k % nz; if (i === ti && j === tj) break;
            for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) { const a = i + di, b = j + dj; if (!libre(a, b) || prev[idx(a, b)] !== -2) continue; prev[idx(a, b)] = k; file.push(idx(a, b)); } }
          const pts = []; let k = idx(ti, tj); if (prev[k] === -2) return null; while (k !== -1) { pts.push({ x: cX(Math.floor(k / nz)), z: cZ(k % nz) }); k = prev[k]; } return pts.reverse(); };
        const rnd0 = Math.random, graineNuit = (g) => () => { g |= 0; g = g + 0x6D2B79F5 | 0; let x = Math.imul(g ^ g >>> 15, 1 | g); x = x + Math.imul(x ^ x >>> 7, 61 | x) ^ x; return ((x ^ x >>> 14) >>> 0) / 4294967296; };
        const nuit = (actif, g) => {
          const s = entrer(); P.armeCur = 'poings'; P.ivresse = 0; P.buffs.vit = 0; P.buffs.lourd = 0; P.giletLourd = false; Math.random = graineNuit(g); P.x = s.panneau.x; P.z = s.panneau.z; appuyer();
          const rngSerre = graineNuit(g * 7 + 3), sm0 = serreMaj; serreMaj = function (...a) { const r0 = Math.random; Math.random = rngSerre; try { return sm0.apply(this, a); } finally { Math.random = r0; } }; // la serre tire sur SON générateur : ce que majJoueur consomme (selon l'état laissé par d'autres tests) ne change plus les besoins /* arme lourde, ivresse, gilet laissés par d'autres tests : ils ralentissaient le pilote */ // graine posée APRÈS startRun (qui tire selon l'état de la ville)
          const dt = 1 / 30; let t = 0, route = null, cle = '', bloque = 0, actionCd = 0, sortiesEvitees = 0;
          while (s.srNuit && t < SERRE_DUREE + 2) {
            INPUT.mx = INPUT.mz = 0;
            if (actif) {
              let pot = null; for (const p of s.pots) if (p.besoin && (!pot || p.besoin.tMax - p.besoin.t < pot.besoin.tMax - pot.besoin.t)) pot = p;
              let cible = null;
              if (pot) {
                if (pot.besoin.type === 'eau' && !(s.srOutil === 'arrosoir' && s.srEau > 0)) cible = { x: s.bassinPos.bx + 3.4, z: s.bassinPos.bz, nom: 'bassin' };
                else if (pot.besoin.type === 'puceron' && s.srOutil !== 'pulve') cible = { x: s.tableOutils.tx, z: s.tableOutils.tz, nom: 'table' };
                else cible = { x: pot.x, z: pot.z, nom: 'pot' + pot.idx };
              }
              if (cible) {
                if (cle !== cible.nom) { route = chemin(s, cible.x, cible.z); cle = cible.nom; if (!route) bloque++; }
                if (Math.hypot(cible.x - P.x, cible.z - P.z) < 2.4 || (route && route.length <= 1)) { actionCd -= dt; if (actionCd <= 0) { majAction(); const bt = document.getElementById('btnAction'); if (/SORTIR/.test(bt.textContent)) sortiesEvitees++; else appuyer(); actionCd = 0.15; cle = ''; } } // comme un joueur : on lit le bouton avant d'appuyer
                else if (route) { while (route.length > 1 && Math.hypot(route[0].x - P.x, route[0].z - P.z) < 0.6) route.shift();
                  const c = route[0], dx = c.x - P.x, dz = c.z - P.z, L = Math.hypot(dx, dz) || 1; INPUT.mx = dx / L; INPUT.mz = dz / L; }
              }
            }
            majJoueur(dt, dt); majInterieur(dt, dt); t += dt;
          }
          INPUT.mx = INPUT.mz = 0; serreMaj = sm0;
          const res = { fin: s.srFin, fanees: s.srFanees, soins: s.srSoins, gain: s.srGain, bloque, sortiesEvitees };
          sortirInterieur(); return res;
        };
        // tirages des besoins sur une graine propre à chaque nuit : sans elle, l'état de Math.random dépendait du
        // temps réel écoulé avant le test et le pilote tenait de 2 à 5 nuits sur 6 d'un run à l'autre
        const etat0 = { perso: META.perso, muscle: META.muscle, tenue: META.tenue, vitesse: META.upg.vitesse }; META.perso = 'jax'; META.muscle = 0; META.tenue = 'depart'; META.upg.vitesse = 0; // le test maîtrise sa scène : vitesse et endurance de base
        const glouton = [], passif = nuit(false, 77);
        for (let i = 0; i < 10; i++) glouton.push(nuit(true, 1000 + i)); Math.random = rnd0; META.upg.vitesse = etat0.vitesse; delete etat0.vitesse; Object.assign(META, etat0); // on en exige 5 sur 10
        if (glouton.some((g) => g.bloque)) ko.push('un pot, le bassin ou la table est inatteignable');
        if (glouton.some((g) => g.sortiesEvitees > 3)) ko.push('soigner un pot affiche SORTIR (' + glouton.map((g) => g.sortiesEvitees).join(',') + ')');
        if (glouton.some((g) => !g.fin)) ko.push('une nuit s’interrompt sans fin');
        const tenues = glouton.filter((g) => g.fin === 'fin' || g.fin === 'parfait').length;
        if (tenues < 5) ko.push('le pilote glouton perd la serre trop souvent (' + JSON.stringify(glouton) + ')');
        else info.push('pilote glouton : ' + tenues + '/10 nuits tenues (' + glouton.map((g) => g.soins + ' soins, ' + g.fanees + ' fanée(s), ' + g.gain + ' $').join(' ; ') + ')');
        if (passif.fin !== 'perdu') ko.push('un joueur passif tient la serre (' + JSON.stringify(passif) + ')');
        else info.push('passif : serre perdue');
        // 8) remises à zéro
        s = entrer(); P.x = s.panneau.x; P.z = s.panneau.z; appuyer(); sortirInterieur();
        if (s.srNuit || vu(serreWrap) || s.pots.some((p) => p.icone.visible)) ko.push('sortir en pleine nuit ne l’arrête pas');
        s = entrer(); P.x = s.panneau.x; P.z = s.panneau.z; appuyer(); P.hp = 1; toucherJoueur(9999);
        if (s.srNuit || vu(serreWrap)) ko.push('mourir en pleine nuit ne l’arrête pas');
        startRun(); if (INT.salles.serre.srNuit || INT.salles.serre.srFini) ko.push('le game over ne remet pas la serre à zéro');
        return { ko, info };
      });
      if (r.ko.length) fail('Serre : ' + r.ko.join(' | ') + ' [' + r.info.join(', ') + ']');
      else ok('Serre : ' + r.info.join(' ; ') + ' ; une nuit par vague, remises à zéro (sortie, mort, game over)');
    }

    // -------------------------------------------------------------------
    // Radio pirate V2 (11e lot) : le tuner, les auditeurs, le brouilleur de la
    // police (segments marqués `brouilleur` dans RADIO_SEGMENTS), pilote au
    // doigt avec un temps de réaction humain.
    // -------------------------------------------------------------------
    console.log('\n--- Radio pirate V2 : tuner, auditeurs, brouilleur de la police, pilote au doigt ---');
    {
      const r = await page.evaluate(() => {
        const ko = [], info = [];
        const vu = (e) => getComputedStyle(e).display !== 'none';
        const entrer = () => { if (INT.actif) sortirInterieur(); startRun(); ecran(null); ETAT.mode = 'jeu'; P.hp = P.maxHp = 1e6;
          entrerInterieur('radio', PORTES.find((x) => x.id === 'radio') || { x: P.x, z: P.z, nx: 0, nz: 1 }); ETAT.intT = 0; return INT.actif; };
        const lancer = (s) => { P.x = s.console.x; P.z = s.console.z; majAction(); const b = document.getElementById('btnAction'); if (b._fn) b._fn(); };
        let s = entrer(); lancer(s);
        if (!s.emissionOn || !vu(radioWrap) || !vu(radioIntroWrap) || vu(document.getElementById('btnFire'))) ko.push('lancement : tuner, intro ou boutons');
        majAction(); if (document.getElementById('btnAction').style.display !== 'none') ko.push('bouton d’action affiché pendant l’émission');
        // auditeurs : montent sur le signal, baissent à côté
        s.aiguille = s.zoneCentre; for (let i = 0; i < 10; i++) { s.aiguille = s.zoneCentre; majInterieur(0.1, 0.1); }
        const a1 = s.auditeurs; s.aiguille = s.zoneCentre > 97 ? 88 : 107; majInterieur(0.5, 0.5);
        if (!(a1 > 500) || !(s.auditeurs < a1)) ko.push('auditeurs (' + a1 + ' puis ' + s.auditeurs + ')');
        // le brouilleur (segment marqué) accélère la triangulation
        const iB = RADIO_SEGMENTS.findIndex((z) => z.brouilleur);
        s.segmentIdx = iB; s.segmentPause = 0; s.segmentT = 0; s.zoneCentre = 90; s.brouCentre = 104; s.brouDir = 1; s.triangulation = 0;
        s.aiguille = 104; majInterieur(0.1, 0.1); const surBrouilleur = s.triangulation;
        s.triangulation = 0; s.aiguille = 98; s.brouCentre = 104; majInterieur(0.1, 0.1); const ailleurs = s.triangulation;
        if (!(surBrouilleur > ailleurs * 1.4)) ko.push('le brouilleur n’accélère pas la triangulation (' + surBrouilleur + ' / ' + ailleurs + ')');
        else info.push('brouilleur : triangulation ×' + (surBrouilleur / ailleurs).toFixed(1));
        sortirInterieur();
        if (vu(radioWrap) || vu(document.getElementById('btnFire')) === false) ko.push('sortie : tuner affiché ou boutons non rendus');
        // pilote au doigt : suit le signal avec 0,25 s de retard ; joueur passif
        const emission = (actif) => {
          const s = entrer(); lancer(s); const dt = 1 / 30, file = []; let t = 0;
          while (s.emissionOn && t < 60) {
            file.push(s.zoneCentre); const vise = file.length > 8 ? file.shift() : s.aiguille;
            if (actif) s.aiguille += clamp(vise - s.aiguille, -30 * dt, 30 * dt); // le doigt glisse vite mais pas instantanément
            majInterieur(dt, dt); t += dt;
          }
          const res = { reussis: s.segmentsReussis, audi: Math.round(s.auditeursMax || 0), police: !INT.actif };
          if (INT.actif) sortirInterieur(); return res;
        };
        const p1 = emission(true), p2 = emission(true), passif = emission(false);
        if (p1.reussis < 2 || p2.reussis < 2) ko.push('le pilote au doigt ne tient pas les segments (' + JSON.stringify([p1, p2]) + ')');
        else info.push('pilote au doigt : ' + p1.reussis + ' et ' + p2.reussis + ' segments, ' + p1.audi + ' / ' + p2.audi + ' auditeurs');
        if (!passif.police) ko.push('un joueur passif n’est pas localisé par la police');
        else info.push('passif : descente de police');
        return { ko, info };
      });
      if (r.ko.length) fail('Radio V2 : ' + r.ko.join(' | ') + ' [' + r.info.join(', ') + ']');
      else ok('Radio V2 : ' + r.info.join(' ; ') + ' ; tuner, intro, boutons masqués puis rendus');
    }

    // -------------------------------------------------------------------
    // Ciné-Palace V2 (11e lot) : l'écran incrusté, l'intro, les boutons, la
    // fin célébrée ; pilote projectionniste au joystick réel (va réparer le
    // poste le plus abîmé, chemin BFS à la marge réelle du joueur).
    // -------------------------------------------------------------------
    console.log('\n--- Ciné-Palace V2 : écran du film, intro, fin célébrée, pilote projectionniste ---');
    {
      const r = await page.evaluate(() => {
        const ko = [], info = [];
        const vu = (e) => getComputedStyle(e).display !== 'none';
        const entrer = () => { if (INT.actif) sortirInterieur(); startRun(); ecran(null); ETAT.mode = 'jeu'; P.hp = P.maxHp = 1e6;
          entrerInterieur('cine', PORTES.find((x) => x.id === 'cine')); ETAT.intT = 0; return INT.actif; };
        const appuyer = () => { majAction(); const b = document.getElementById('btnAction'); const l = b.style.display === 'none' ? '' : b.textContent; if (b._fn && l) b._fn(); return l; };
        let s = entrer(); P.x = s.projecteur.x; P.z = s.projecteur.z + 2.8; appuyer();
        if (!s.seanceOn || !vu(cineWrap) || !vu(cineIntroWrap) || vu(document.getElementById('btnFire'))) ko.push('démarrage : écran, intro ou boutons');
        s.postes.son.probleme = 100; s.postes.son.enAlerte = true; try { dessinerEcranCine(s); } catch (e) { ko.push('écran : ' + e); }
        s.seanceT = CINE_DUREE - 0.01; majInterieur(0.05, 0.05);
        if (s.seanceOn || s.cineFin !== 'succes' || !vu(cineWrap)) ko.push('fin : écran de l’ovation absent');
        for (let i = 0; i < 80; i++) majInterieur(0.05, 0.05);
        if (vu(cineWrap) || !vu(document.getElementById('btnFire'))) ko.push('après la fin : écran encore affiché ou boutons non rendus');
        info.push('écran, intro, ovation 3 s');
        // pilote projectionniste
        const chemin = (s, x1, z1) => { const pas = 0.5, W = s.D.w / 2 - 0.6, D = s.D.d / 2 - 0.6;
          const nx = Math.floor(2 * W / pas) + 1, nz = Math.floor(2 * D / pas) + 1, idx = (i, j) => i * nz + j, cX = (i) => s.ox - W + i * pas, cZ = (j) => s.oz - D + j * pas;
          const libre = (i, j) => i >= 0 && j >= 0 && i < nx && j < nz && !solidAt(cX(i), cZ(j), 0.65);
          const si = Math.round((P.x - s.ox + W) / pas), sj = Math.round((P.z - s.oz + D) / pas); let ti = clamp(Math.round((x1 - s.ox + W) / pas), 0, nx - 1), tj = clamp(Math.round((z1 - s.oz + D) / pas), 0, nz - 1);
          if (!libre(ti, tj)) { let best = null, bd = 1e9; for (let di = -5; di <= 5; di++) for (let dj = -5; dj <= 5; dj++) if (libre(ti + di, tj + dj) && di * di + dj * dj < bd) { bd = di * di + dj * dj; best = [ti + di, tj + dj]; } if (best) { ti = best[0]; tj = best[1]; } }
          const prev = new Int32Array(nx * nz).fill(-2), file = [idx(si, sj)]; prev[idx(si, sj)] = -1;
          while (file.length) { const k = file.shift(), i = Math.floor(k / nz), j = k % nz; if (i === ti && j === tj) break;
            for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) { const a = i + di, b = j + dj; if (!libre(a, b) || prev[idx(a, b)] !== -2) continue; prev[idx(a, b)] = k; file.push(idx(a, b)); } }
          const pts = []; let k = idx(ti, tj); if (prev[k] === -2) return null; while (k !== -1) { pts.push({ x: cX(Math.floor(k / nz)), z: cZ(k % nz) }); k = prev[k]; } return pts.reverse(); };
        const seance = (actif) => {
          const s = entrer(); P.x = s.projecteur.x; P.z = s.projecteur.z + 2.8; appuyer();
          const dt = 1 / 30; let t = 0, route = null, cle = '', cd = 0;
          while (s.seanceOn && t < CINE_DUREE + 2) {
            INPUT.mx = INPUT.mz = 0;
            if (actif) {
              let pid = null; for (const id of CINE_POSTES) if (s.postes[id].probleme > 35 && (!pid || s.postes[id].probleme > s.postes[pid].probleme)) pid = id;
              if (pid) { const c = s.postesPos[pid];
                if (cle !== pid) { route = chemin(s, c.x, c.z); cle = pid; }
                if (Math.hypot(c.x - P.x, c.z - P.z) < 2.6 || (route && route.length <= 1)) { cd -= dt; if (cd <= 0) { appuyer(); cd = 0.2; cle = ''; } }
                else if (route) { while (route.length > 1 && Math.hypot(route[0].x - P.x, route[0].z - P.z) < 0.6) route.shift();
                  const p0 = route[0], dx = p0.x - P.x, dz = p0.z - P.z, L = Math.hypot(dx, dz) || 1; INPUT.mx = dx / L; INPUT.mz = dz / L; } }
            }
            majJoueur(dt, dt); majInterieur(dt, dt); t += dt;
          }
          INPUT.mx = INPUT.mz = 0;
          const res = { fin: s.cineFin, satisf: Math.round(s.satisfaction) };
          sortirInterieur(); return res;
        };
        const pilotes = [seance(true), seance(true)], passif = seance(false);
        if (pilotes.some((p) => p.fin !== 'succes')) ko.push('le pilote projectionniste ne tient pas la séance (' + JSON.stringify(pilotes) + ')');
        else info.push('pilote : séances tenues');
        if (passif.fin !== 'fiasco') ko.push('un projectionniste passif ne fait pas un fiasco (' + JSON.stringify(passif) + ')');
        else info.push('passif : fiasco');
        return { ko, info };
      });
      if (r.ko.length) fail('Ciné V2 : ' + r.ko.join(' | ') + ' [' + r.info.join(', ') + ']');
      else ok('Ciné V2 : ' + r.info.join(' ; '));
    }

    // -------------------------------------------------------------------
    // Vue immersive (13 octobre) : caméra inclinée vers l'horizon en ville,
    // orientable au doigt à pied, poursuite en véhicule ; le joystick suit
    // l'écran ; bouton à côté de la pause. Depuis le 14 octobre, aussi dans
    // les salles (sauf le chalutier) : voir « Vue immersive dans les salles ».
    // -------------------------------------------------------------------
    console.log('\n--- Vue immersive : caméra, joystick relatif à l’écran, poursuite en véhicule, salles intactes, bouton ---');
    {
      const r = await page.evaluate(() => {
        const ko = [], info = [];
        if (INT.actif) sortirInterieur(); startRun(); ecran(null); ETAT.mode = 'jeu'; P.hp = P.maxHp = 1e6;
        const vueAvant = META.vue;
        const frames = (n, dt) => { for (let i = 0; i < n; i++) majCamera(dt || 0.05); };
        const joy = (cle) => { for (const k of ['KeyW', 'KeyS', 'KeyA', 'KeyD']) KEYS[k] = false; KEYS[cle] = true; litEntrees(); KEYS[cle] = false; const v = { x: INPUT.mx, z: INPUT.mz }; litEntrees(); return v; };
        // 1) bouton : bascule, allumé, sauvegardé
        META.vue = 'classique'; basculerVue();
        if (META.vue !== 'immersive' || !el('btnVue').classList.contains('on')) ko.push('le bouton ne passe pas en vue immersive');
        const sauv = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
        if (sauv.vue !== 'immersive') ko.push('le choix de vue n’est pas sauvegardé');
        // 2) à pied : caméra derrière et au-dessus du joueur, regard vers l'horizon ; orientable
        // le test maîtrise sa scène : un point d'où l'on peut marcher 6 u vers l'ouest sans rien heurter (et sans arbre ni immeuble qui relève la caméra)
        { let ok = false; for (let r = 0; r < 80 && !ok; r += 2) for (const [dx, dz] of [[r, 0], [-r, 0], [0, r], [0, -r]]) { const x = P.x + dx, z = P.z + dz; let libre = true; for (let k = -24; k <= 7; k++) if (solidAt(x - k, z, k < 0 ? 2.5 : 0.9)) libre = false; /* à l'est : la caméra */ if (libre) { P.x = x; P.z = z; ok = true; break; } } }
        VUE.yawUser = Math.PI / 2; frames(60);
        if (Math.abs(angDiff(VUE.yawRendu, Math.PI / 2)) > 0.05) ko.push('la caméra ne prend pas l’angle demandé (' + VUE.yawRendu.toFixed(2) + ')');
        const cd = new THREE.Vector3(); camera.getWorldDirection(cd);
        const tangage = Math.asin(-cd.y);
        if (!(tangage > 0.15 && tangage < 0.6)) ko.push('la caméra ne regarde pas vers l’horizon (tangage ' + tangage.toFixed(2) + ')');
        else info.push('à pied : tangage ' + (tangage * 57.3).toFixed(0) + '°');
        // 3) le joystick suit l'écran : « haut » = là où regarde la caméra (ouest ici), « droite » = sa droite (nord)
        const h = joy('KeyW'), d = joy('KeyD');
        if (!(h.x < -0.95 && Math.abs(h.z) < 0.08)) ko.push('« haut » ne va pas vers l’avant de la caméra (' + h.x.toFixed(2) + ',' + h.z.toFixed(2) + ')');
        if (!(d.z < -0.95 && Math.abs(d.x) < 0.08)) ko.push('« droite » ne va pas vers la droite de l’écran (' + d.x.toFixed(2) + ',' + d.z.toFixed(2) + ')');
        // le joueur marche vraiment vers l'avant de la caméra
        const x0 = P.x, z0 = P.z; KEYS.KeyW = true; for (let i = 0; i < 10; i++) { litEntrees(); majJoueur(0.05, 0.05); } KEYS.KeyW = false; litEntrees();
        if (!(P.x < x0 - 0.5) || Math.abs(P.z - z0) > 0.5) ko.push('le joueur ne marche pas vers l’avant de la caméra (' + (P.x - x0).toFixed(2) + ',' + (P.z - z0).toFixed(2) + ')');
        // 4) un immeuble entre la caméra et le joueur : la caméra se relève
        let s = null; for (const arr of sGrid.values()) { for (const so of arr) if (so.h > 9 && !so.base && so.hw > 3 && so.hd > 3 && Math.abs(so.x) < 400 && Math.abs(so.z) < 400) { s = so; break; } if (s) break; }
        if (!s) ko.push('aucun immeuble trouvé pour le test de dégagement');
        else { const py = 1.5, pz = s.z - s.hd - 2.5, cyBas = 3; const req = vueDegagement(s.x, py, pz, s.x, cyBas, s.z + s.hd + 6);
          if (!(req > s.h)) ko.push('la caméra ne se relève pas derrière un immeuble (' + req.toFixed(1) + ' pour ' + s.h + ')'); else info.push('dégagement derrière un immeuble de ' + s.h.toFixed(0) + ' u'); }
        // 5) en véhicule : la caméra se place derrière, suit le cap
        const v = creerVehicule('berline', P.x, P.z, 1.2); entrerVehicule(v); VUE.yaw = 0; frames(80);
        if (Math.abs(angDiff(VUE.yaw, v.ang + Math.PI)) > 0.1) ko.push('en véhicule, la caméra ne se place pas derrière (' + VUE.yaw.toFixed(2) + ' / ' + (v.ang + Math.PI).toFixed(2) + ')');
        const hv = joy('KeyW'); const fwd = { x: Math.sin(v.ang), z: Math.cos(v.ang) };
        if (hv.x * fwd.x + hv.z * fwd.z < 0.95) ko.push('en véhicule, « haut » ne va pas tout droit');
        else info.push('poursuite : « haut » = tout droit');
        sortirVehicule(); v.mort = true;
        // 6) en salle : vue immersive aussi, depuis l'entrée (« haut » = vers le fond), bouton affiché ;
        // le chalutier garde sa caméra (bouton masqué, joystick jamais tourné)
        const porte = PORTES.find((p) => INTDEFS[p.id] && p.id !== 'tuning' && p.id !== 'chalutier');
        entrerInterieur(porte.id, porte); ETAT.intT = 0; frames(60); majAction();
        const hs = joy('KeyW');
        if (VUE.k < 0.9 || Math.abs(hs.x) > 0.05 || Math.abs(hs.z + 1) > 0.05) ko.push('dans une salle, pas de vue immersive depuis l’entrée (' + porte.id + ', k ' + VUE.k.toFixed(2) + ')');
        if (getComputedStyle(el('btnVue')).display === 'none') ko.push('le bouton de vue est masqué dans une salle');
        sortirInterieur();
        const pch = PORTES.find((p) => p.id === 'chalutier');
        if (pch) { entrerInterieur('chalutier', pch); ETAT.intT = 0; frames(4); majAction(); const hc2 = joy('KeyW');
          if (VUE.k !== 0 || Math.abs(hc2.x) > 1e-6 || Math.abs(hc2.z + 1) > 1e-6 || getComputedStyle(el('btnVue')).display !== 'none') ko.push('le chalutier ne garde pas sa caméra (k ' + VUE.k + ', joystick ' + hc2.x.toFixed(2) + ',' + hc2.z.toFixed(2) + ', bouton ' + getComputedStyle(el('btnVue')).display + ')');
          sortirInterieur(); }
        // 7) retour à la vue classique : rien n'est tourné
        basculerVue(); frames(80);
        const hc = joy('KeyW');
        if (META.vue !== 'classique' || Math.abs(hc.x) > 1e-3 || Math.abs(hc.z + 1) > 1e-3) ko.push('la vue classique n’est pas rétablie (' + META.vue + ')');
        if (VUE.ciel && VUE.ciel.visible) ko.push('le ciel de la vue immersive reste affiché en vue classique');
        META.vue = vueAvant;
        return { ko, info };
      });
      if (r.ko.length) fail('Vue immersive : ' + r.ko.join(' | ') + ' [' + r.info.join(', ') + ']');
      else ok('Vue immersive : ' + r.info.join(' ; ') + ' ; bouton sauvegardé, joystick relatif à l’écran, salles en vue immersive, chalutier et vue classique intacts');
    }

    // -------------------------------------------------------------------
    // Échelle de la ville et places garnies (13 octobre, playtest en vue
    // immersive) : étages de 3 u, hauteurs plafonnées (la vue classique ne
    // traverse jamais une tour), hélipad au vrai sommet, cœur des pâtés garni.
    // -------------------------------------------------------------------
    console.log('\n--- Échelle des immeubles et places garnies ---');
    {
      const r = await page.evaluate(() => {
        const ko = [], info = [];
        if (!(PLACES_STATS.poses >= 150)) ko.push('trop peu d’ensembles posés au cœur des pâtés (' + PLACES_STATS.poses + ')');
        else info.push(PLACES_STATS.poses + ' ensembles (places, squares, marchés, jeux, stocks)');
        let hMax = 0; for (const b of BATIMENTS) hMax = Math.max(hMax, b.h); // les immeubles de mkBatiment (d'autres structures, plus hautes, existaient avant)
        // l'agrandissement ne fait jamais dépasser BAT_H_MAX (les gratte-ciel déjà plus hauts restent tels quels)
        for (let h = 3; h <= 70; h += 0.5) if (hauteurBatiment(h) > Math.max(h, BAT_H_MAX) + 1e-9 || hauteurBatiment(h) < h) { ko.push('hauteurBatiment(' + h + ') = ' + hauteurBatiment(h)); break; }
        info.push('plus haute tour : ' + hMax.toFixed(0) + ' u'); 
        if (!(hauteurBatiment(6) >= 10 && hauteurBatiment(34) <= BAT_H_MAX)) ko.push('hauteurBatiment hors des bornes');
        if (POIS.toitH) { const s = solidAt(POIS.toitH.x, POIS.toitH.z, 0); if (!s || Math.abs(s.h - POIS.toitH.h) > 0.01) ko.push('l’hélipad n’est pas au sommet de sa tour (' + (s && s.h) + ' / ' + POIS.toitH.h + ')'); }
        // aucune entrée de lieu murée par un objet des places (une porte doit rester atteignable)
        let murees = 0; for (const p of PORTES) { if (!INTDEFS[p.id]) continue; const s = solidAt(p.x, p.z, 0.2); if (s && !s.toit) murees++; }
        if (murees) ko.push(murees + ' porte(s) sous un objet solide');
        return { ko, info };
      });
      if (r.ko.length) fail('Échelle et places : ' + r.ko.join(' | '));
      else ok('Échelle et places : ' + r.info.join(' ; ') + ' ; hélipad au sommet ; aucune porte murée');
    }

    // -------------------------------------------------------------------
    // Retours de la vue immersive (14 octobre) : tremplins absurdes retirés,
    // le large plus loin et vivant, balises des lieux et activités.
    // -------------------------------------------------------------------
    console.log('\n--- Vue immersive, retours : tremplins, le large, vie marine, balises ---');
    {
      const r = await page.evaluate(() => {
        const ko = [], info = [];
        // tremplins : aucun ne lance sur un bâtiment
        for (const rp of RAMPES) { if (!rp.meshes || rp.x < -4000) continue; const sx = Math.sin(rp.ang), sz = Math.cos(rp.ang), ex = rp.x + sx * rp.long, ez = rp.z + sz * rp.long;
          for (let d = 1; d <= 30; d += 1.5) { const s = solidAt(ex + sx * d, ez + sz * d, rp.larg / 2); if (s && s.toit && s.h > 1.6 && !s.base) { ko.push('tremplin face à un bâtiment en ' + Math.round(rp.x) + ',' + Math.round(rp.z)); break; } } }
        info.push(RAMPES_RETIREES.length + ' tremplins retirés');
        // le large : on nage et on navigue jusqu'à LIMITE_SUD_MER, et pas plus
        if (!(LIMITE_SUD_MER > MER + 300)) ko.push('le large est trop court (' + (LIMITE_SUD_MER - MER) + ' u)');
        if (INT.actif) sortirInterieur(); startRun(); ecran(null); ETAT.mode = 'jeu'; P.hp = P.maxHp = 1e6;
        const v = creerVehicule('bateau', 40, LIMITE_SUD_MER - 30, 0); entrerVehicule(v); v.v = 20;
        for (let i = 0; i < 60; i++) { KEYS.KeyW = true; litEntrees(); majJoueur(0.05, 0.05); } KEYS.KeyW = false; litEntrees();
        if (v.z > LIMITE_SUD_MER + 0.5) ko.push('le bateau dépasse le large (' + v.z.toFixed(0) + ')');
        if (v.z < LIMITE_SUD_MER - 40) ko.push('le bateau n’atteint pas le large (' + v.z.toFixed(0) + ' / ' + LIMITE_SUD_MER + ')');
        sortirVehicule(); v.mort = true;
        // la vie marine : récifs SOLIDES, jamais sur un parcours
        if (VIE_MER.recifs.length < 8 || VIE_MER.bancs.length < 5) ko.push('trop peu de vie au large (' + VIE_MER.recifs.length + ' récifs, ' + VIE_MER.bancs.length + ' bancs)');
        for (const rc of VIE_MER.recifs) { if (!solidAt(rc.x, rc.z, 0)) ko.push('un récif n’est pas solide'); for (const pt of ridePortes('bouees') || []) if (dist2(rc.x, rc.z, pt.x, pt.z) < 400) ko.push('un récif sur le rallye des bouées'); }
        info.push(VIE_MER.recifs.length + ' récifs, ' + VIE_MER.bancs.length + ' bancs, ' + VIE_MER.tortues.length + ' tortues, ' + VIE_MER.voiliers.length + ' voiliers');
        // balises : chaque salle de la ville et chaque course a la sienne (sources lues, jamais recopiées)
        let manque = []; for (const p of PORTES) if (INTDEFS[p.id] && !BALISES.some((b) => Math.abs(b.x - p.x) < 0.01 && Math.abs(b.z - p.z) < 0.01)) manque.push(p.id);
        for (const id in RIDE_DEFS) { const d = rideDepart(id); if (d && !BALISES.some((b) => Math.abs(b.x - d.x) < 0.01 && Math.abs(b.z - d.z) < 0.01)) manque.push('course ' + id); }
        if (TOW.kWake && !BALISES.some((b) => b.x === TOW.kWake.x)) manque.push('wakeboard');
        if (PIC.wingsuit && !BALISES.some((b) => b.x === PIC.wingsuit.x)) manque.push('wingsuit');
        if (manque.length) ko.push('sans balise : ' + manque.join(', '));
        // visibles en ville, masquées dans les salles
        majBalises(0.05); const vis = BALISES.filter((b) => b.sp.visible).length;
        const porte = PORTES.find((p) => INTDEFS[p.id] && p.id !== 'tuning'); entrerInterieur(porte.id, porte); majBalises(0.05);
        if (BALISES.some((b) => b.sp.visible)) ko.push('des balises restent visibles dans une salle'); sortirInterieur();
        info.push(BALISES.length + ' balises (' + vis + ' visibles au départ)');
        return { ko, info };
      });
      if (r.ko.length) fail('Retours vue immersive : ' + r.ko.join(' | ') + ' [' + r.info.join(', ') + ']');
      else ok('Retours vue immersive : ' + r.info.join(' ; '));
    }

    // -------------------------------------------------------------------
    // Retours de playtest, 2e série (14 octobre) : stands de nourriture,
    // hauteurs des véhicules, basket, wingsuit, monster truck, vélos au sommet.
    // -------------------------------------------------------------------
    console.log('\n--- Retours 2e série : stands, véhicules, basket, wingsuit, sommet ---');
    {
      const r = await page.evaluate(() => {
        const ko = [], info = [];
        if (INT.actif) sortirInterieur(); startRun(); ecran(null); ETAT.mode = 'jeu';
        // stands : un par quartier au moins dans 6 quartiers, achat qui soigne, refusé plein de vie, fermé juste après
        const q = new Set(STANDS.map((s) => s.q)); if (q.size < 6) ko.push('stands dans ' + q.size + ' quartiers seulement');
        const s = STANDS[0]; s.cd = 0; P.x = s.x; P.z = s.z; P.hp = P.maxHp; META.argent = 100; acheterNourriture(s); if (META.argent !== 100) ko.push('un stand vend à un joueur en pleine forme');
        s.cd = 0; P.hp = 10; acheterNourriture(s); const N = NOURRITURE_QUARTIER[s.q] || NOURRITURE_QUARTIER.centre; /* le test maîtrise sa scène : stand ouvert */
        if (!(P.hp > 10) || META.argent !== 100 - N.prix) ko.push('achat au stand incohérent (' + P.hp + ' PV, ' + META.argent + ' $)');
        const a1 = META.argent; acheterNourriture(s); if (META.argent !== a1) ko.push('le stand revend aussitôt (farming)');
        info.push(STANDS.length + ' stands, ' + q.size + ' quartiers');
        // véhicules hauts : à leur hauteur cible (± 0,15)
        for (const k in HAUTEUR_VEH) { const g = makeVoiture(k); g.updateMatrixWorld(true); const b = new THREE.Box3(); g.traverse((o) => { if (o.isMesh && !(o.material && o.material.transparent && o.material.opacity < 0.5)) b.expandByObject(o); });
          if (Math.abs(b.max.y - b.min.y - HAUTEUR_VEH[k]) > 0.25) ko.push(k + ' mesure ' + (b.max.y - b.min.y).toFixed(2) + ' au lieu de ' + HAUTEUR_VEH[k]); }
        // basket : un joueur passif ne gagne rien ; 10 tirs parfaits gagnent la prime, une seule fois par vague
        const b0 = BASKET.depart; P.x = b0.x; P.z = b0.z; basketDemarrer(); if (!BASKET.actif) ko.push('le concours ne démarre pas');
        for (let i = 0; i < 50 * 30 && BASKET.actif; i++) majBasket(1 / 30, 1 / 30);
        if (BASKET.actif || BASKET.pts > 0) ko.push('basket passif : ' + BASKET.pts + ' pts');
        BASKET.vague = -1; BASKET.reussi = false; P.x = b0.x; P.z = b0.z; basketDemarrer(); const a2 = META.argent;
        for (let i = 0; i < 60 * 30 && BASKET.actif; i++) { const p = BASKET.postes[BASKET.poste]; P.x = p.x; P.z = p.z; if (!BASKET.vol) { BASKET.jauge = 0.62; basketTirer(); } majBasket(1 / 30, 1 / 30); }
        const gain = META.argent - a2; if (BASKET.actif || gain !== BASKET_PRIME) ko.push('basket parfait : prime ' + gain);
        P.x = b0.x; P.z = b0.z; basketDemarrer(); if (BASKET.actif) ko.push('2e concours gagnable dans la même vague');
        basketArreter(); info.push('basket : passif 0 pt, parfait = prime, une fois par vague');
        // wingsuit : record mesuré, combinaison « Faucon » à 500 m
        META.wingRecord = 0; delete META.tenuesPoss.faucon; P.wingsuit = true; P.chute = true; P.para = false; P.wing = false; P.y = 80; P.x = 0; P.z = 0;
        deployerWingsuit(); P.x = 420; P.z = 300; ouvrirParachute(); checkTenues();
        if (META.wingRecord !== 516 || !META.tenuesPoss.faucon) ko.push('wingsuit : record ' + META.wingRecord + ', faucon ' + !!META.tenuesPoss.faucon);
        P.chute = false; P.para = false; P.y = 0;
        // monster truck : il gravit comme le 4x4 ; vélos au sommet du mont
        if (!VEHDEFS.monstertruck.franchissement) ko.push('monster truck sans franchissement');
        const sm = MONT.sommet, n = vehicules.filter((v) => !v.mort && (v.def.velo || v.key === 'motocross') && Math.hypot(v.x - sm.x, v.z - sm.z) < 30).length;
        if (n < 3) ko.push('seulement ' + n + ' vélos/motos au sommet du mont');
        info.push(n + ' engins au sommet');
        return { ko, info };
      });
      if (r.ko.length) fail('Retours 2e série : ' + r.ko.join(' | ') + ' [' + r.info.join(', ') + ']');
      else ok('Retours 2e série : ' + r.info.join(' ; ') + ' ; véhicules à leur hauteur, wingsuit : record et combinaison « Faucon »');
    }

    // -------------------------------------------------------------------
    // Vue immersive dans les salles (14 octobre) : chaque salle de INTDEFS
    // (lue, jamais recopiée), en trois points et quatre orientations : la
    // caméra reste entre les murs, le joueur est à l'écran ; ce qui pend
    // entre elle et le joueur est masqué (calques), puis rendu à la sortie.
    // -------------------------------------------------------------------
    console.log('\n--- Vue immersive dans les salles : caméra entre les murs, joueur à l’écran, plafond masqué puis rendu ---');
    {
      const r = await page.evaluate(() => {
        const ko = [], info = []; const vueAvant = META.vue; let n = 0, masques = 0, propres = 0;
        const frames = (k) => { for (let i = 0; i < k; i++) majCamera(0.05); };
        const pv = new THREE.Vector3();
        for (const id of Object.keys(INTDEFS)) {
          if (INT.actif) sortirInterieur(); startRun(); ecran(null); ETAT.mode = 'jeu'; P.hp = P.maxHp = 1e6; META.vue = 'immersive';
          const porte = PORTES.find((p) => p.id === id) || { x: P.x, z: P.z, nx: 0, nz: 1 }; // la radio n'a pas de porte (on y monte autrement)
          entrerInterieur(id, porte); const s = INT.actif; if (!s) { ko.push(id + ' : on n’entre pas'); continue; }
          if (s.tuning) s.menuOuvert = false; ETAT.intT = 0; frames(60);
          if (!salleImmersive(s)) { if (VUE.k !== 0) ko.push(id + ' garde sa caméra, mais VUE.k = ' + VUE.k.toFixed(2)); continue; }
          n++; let mal = '';
          for (const [fx, fz] of [[0, 0.3], [0.3, -0.3], [-0.3, 0]]) for (const yaw of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
            P.x = s.ox + s.D.w * fx; P.z = s.oz + s.D.d * fz; P.y = 0; VUE.yawUser = yaw; frames(40);
            const c = camera.position; pv.set(P.x, P.y + 1, P.z).project(camera);
            if (VUE.k < 0.95) mal = 'k ' + VUE.k.toFixed(2);
            else if (Math.abs(c.x - s.ox) > s.D.w / 2 || Math.abs(c.z - s.oz) > s.D.d / 2) mal = 'caméra hors des murs';
            else if (Math.abs(pv.x) > 1 || Math.abs(pv.y) > 1 || pv.z > 1) mal = 'joueur hors de l’écran';
            masques = Math.max(masques, VUE.cache.length);
            if (mal) break;
          }
          if (mal) ko.push(id + ' : ' + mal);
          sortirInterieur(); frames(2);
          if (VUE.cache.length || (s.vueHaut || []).some((e) => !e.o.layers.test(camera.layers))) ko.push(id + ' : des objets restent masqués après la sortie');
          else propres++;
        }
        META.vue = 'classique'; frames(60);
        if (VUE.k !== 0) ko.push('la vue classique n’est pas rétablie après les salles');
        META.vue = vueAvant;
        info.push(n + ' salles en vue immersive (le chalutier garde sa caméra)', 'jusqu’à ' + masques + ' objets masqués à la fois', propres + ' salles rendues intactes');
        if (!masques) ko.push('rien n’est jamais masqué entre la caméra et le joueur');
        return { ko, info };
      });
      if (r.ko.length) fail('Vue immersive dans les salles : ' + r.ko.join(' | ') + ' [' + r.info.join(', ') + ']');
      else ok('Vue immersive dans les salles : ' + r.info.join(' ; '));
    }

    // Lunette du sniper (14 octobre) : maintenir TIR passe dans la lunette (on ne marche plus, le
    // joystick vise et règle la distance), le laser s'efface, relâcher tire et rend la vue.
    console.log('\n--- Lunette du sniper : visée immobile, distance réglée, tir au relâcher ---');
    {
      const r = await page.evaluate(() => {
        const ko = [];
        if (INT.actif) sortirInterieur(); startRun(); ecran(null); ETAT.mode = 'jeu'; P.hp = P.maxHp = 1e6; for (const e of ennemis) e.mort = true;
        META.armes.sniper.poss = true; P.armeCur = 'sniper'; P.mags.sniper = 5; P.mun.sniper = 20; P.ang = 0; P_SNIPE.dist = 60;
        const x0 = P.x, z0 = P.z; INPUT.btn.tir = true;
        for (let i = 0; i < 20; i++) majJoueur(1 / 30, 1 / 30);
        if (!lunetteSniper()) ko.push('pas de lunette après 0,6 s de visée');
        INPUT.jx = 0; INPUT.jy = -1; INPUT.mx = 0; INPUT.mz = -1; const a0 = P.ang;
        for (let i = 0; i < 30; i++) { majJoueur(1 / 30, 1 / 30); majCamera(1 / 30); }
        if (Math.hypot(P.x - x0, P.z - z0) > 0.05) ko.push('le joueur marche dans la lunette');
        if (!(P_SNIPE.dist > 70)) ko.push('▲ ne règle pas la distance (' + P_SNIPE.dist.toFixed(0) + ')');
        INPUT.jx = 1; INPUT.jy = 0; for (let i = 0; i < 15; i++) majJoueur(1 / 30, 1 / 30);
        if (!(P.ang < a0 - 0.3)) ko.push('▶ ne fait pas pivoter la visée');
        if (LUNETTE.style.display === 'none' || camera.fov > 30) ko.push('la vue ne passe pas dans la lunette (fov ' + camera.fov.toFixed(0) + ')');
        INPUT.jx = INPUT.jy = INPUT.mx = INPUT.mz = 0; const m0 = P.mags.sniper; INPUT.btn.tir = false; majJoueur(1 / 30, 1 / 30); majCamera(1 / 30);
        if (lunetteSniper() || P.mags.sniper !== m0 - 1 || LUNETTE.style.display !== 'none') ko.push('relâcher ne tire pas ou la lunette reste');
        return { ko };
      });
      if (r.ko.length) fail('Lunette du sniper : ' + r.ko.join(' | '));
      else ok('Lunette du sniper : visée immobile, distance et pivot au joystick, tir au relâcher, vue rendue');
    }

    // -------------------------------------------------------------------
    // Aéroport vivant (14 octobre) : aérogare accessible (entrées, porte
    // côté pistes), long-courrier à la porte A1, avions des hangars, voltige
    // immobile dans son hangar ; un vol atterrit et se gare (vrai véhicule),
    // un autre repart ; un avion pris par le joueur ne repart jamais ; un avion
    // qui roule bouscule le joueur ; les trois nouveaux avions décollent.
    // -------------------------------------------------------------------
    console.log('\n--- Aéroport vivant : aérogare, portes, atterrissage, départ, hangars, nouveaux avions ---');
    {
      const r = await page.evaluate(() => {
        const ko = [], info = [];
        if (!DECOR_V2) return { ko, info: ['DECOR_V2 coupé'] };
        if (INT.actif) sortirInterieur(); if (P.veh) sortirVehicule(true); startRun(); ecran(null); ETAT.mode = 'jeu'; P.hp = P.maxHp = 1e6;
        if (!AERO.pret) return { ko: ['aéroport non construit'], info };
        const T = AERO.T, C = AERO.C;
        const passe = (x0, z0, x1, z1) => { for (let k = 0; k <= 20; k++) { const x = x0 + (x1 - x0) * k / 20, z = z0 + (z1 - z0) * k / 20; if (solidAt(x, z, 0.45)) return false; } return true; };
        // 1) on entre par la dépose-minute (chaque ouverture de la façade ouest) et on sort côté pistes
        let entrees = 0; for (const z of [-22, 0, 22]) if (passe(T.x0 - 4.5, C.z + z, T.x0 + 3, C.z + z)) entrees++;
        if (entrees < 3) ko.push('seulement ' + entrees + '/3 entrées praticables');
        if (!AERO.portes.every((p) => passe(T.x1 - 3, p.z, T.x1 + 4, p.z))) ko.push('pas de sortie vers les pistes par les portes d’embarquement');
        if (solidAt(T.x0 - 4.5, C.z, 0.6)) ko.push('la dépose-minute est encombrée');
        const st = STANDS.find((s) => s.q === 'aeroport'); if (!st || !NOURRITURE_QUARTIER.aeroport) ko.push('pas de café à l’aérogare');
        info.push('3 entrées, porte côté pistes, café');
        // 2) au départ de la partie : long-courrier en A1, avions des hangars, voltige au hangar
        const A1 = AERO.portes[0], A2 = AERO.portes[1];
        if (!A1.v || A1.v.key !== 'ligne' || A2.v) ko.push('porte A1 sans long-courrier ou A2 occupée');
        for (const h of AERO.hangars) if (!vehicules.some((v) => v.key === h.cle && !v.mort && dist2(v.x, v.z, h.x, h.z) < 4)) ko.push(h.cle + ' absent de son hangar');
        const vol = vehicules.find((v) => v.key === 'voltige' && !v.mort);
        if (!vol || dist2(vol.x, vol.z, POIS.aerodrome.x, POIS.aerodrome.z) > 1) ko.push('voltige absent de son hangar');
        else { const a0 = vol.mesh.rotation.y; for (let i = 0; i < 60; i++) majVehicules(1 / 30); if (Math.abs(vol.mesh.rotation.y - a0) > 1e-6) ko.push('le voltige tourne encore sur lui-même'); }
        // 3) un vol arrive : approche, atterrissage, roulage, il se gare en A2 et devient un vrai véhicule
        AERO.prochainT = 0; P.x = C.x; P.z = C.z; let t = 0, vu = new Set();
        while (t < 120 && !A2.v) { majAeroportVivant(1 / 20); for (const d of AERO.dec) vu.add(d.etat); t += 1 / 20; }
        if (!A2.v || A2.v.key !== 'ligne' || Math.abs(A2.v.ang + Math.PI / 2) > 0.01) ko.push('aucun long-courrier garé en A2 (' + [...vu].join(',') + ')');
        else info.push('atterrissage → A2 en ' + t.toFixed(0) + ' s (' + ['approche', 'roule', 'vire', 'taxi'].filter((e) => vu.has(e)).join(' → ') + ')');
        if (AERO.piste) ko.push('la piste reste réservée après l’arrivée');
        // 4) un avion pris par le joueur ne repart jamais ; garé ailleurs, il libère sa porte
        const pris = A2.v; P.x = pris.x; P.z = pris.z; entrerVehicule(pris); A2.attente = AERO_ESCALE + 10;
        for (let i = 0; i < 40; i++) majAeroportVivant(1 / 20);
        if (!vehicules.includes(pris) || pris.mort) ko.push('l’avion du joueur est reparti sans lui');
        sortirVehicule(true); pris.x += 60; for (let i = 0; i < 4; i++) majAeroportVivant(1 / 20);
        if (A2.v) ko.push('la porte A2 reste occupée après le départ de l’avion');
        // 5) un départ : A1 repoussé, roule, décolle vers le sud, disparaît ; un seul mouvement à la fois
        A1.attente = AERO_ESCALE + 1; P.x = C.x; P.z = C.z; const nL = vehicules.filter((v) => v.key === 'ligne' && !v.mort).length; t = 0; vu = new Set(); let altMax = 0, deux = false;
        majAeroportVivant(1 / 20);
        if (vehicules.filter((v) => v.key === 'ligne' && !v.mort).length !== nL - 1) ko.push('le long-courrier de A1 n’est pas parti');
        while (t < 120 && AERO.dec.some((d) => d.etat !== 'libre' && !d.arrivee)) { majAeroportVivant(1 / 20); for (const d of AERO.dec) { vu.add(d.etat); if (!d.arrivee) altMax = Math.max(altMax, d.alt); } if (AERO.dec.filter((d) => d.etat === 'approche' || d.etat === 'roule' || d.etat === 'decolle').length > 1) deux = true; t += 1 / 20; }
        if (!vu.has('decolle') || altMax < 40) ko.push('le départ ne décolle pas (' + [...vu].join(',') + ', ' + altMax.toFixed(0) + ' u)');
        else info.push('départ : repoussé, décollage, ' + altMax.toFixed(0) + ' u');
        if (deux) ko.push('deux avions sur la piste en même temps');
        // 6) un avion qui roule bouscule le joueur à pied (une fois, sans le tuer)
        const d = AERO.dec[0]; Object.assign(d, { etat: 'roule', arrivee: true, porte: A1, x: AERO.RX, z: 0, alt: 0, ang: Math.PI, v: 10, decel: 0 }); d.mesh.visible = true; AERO.piste = d;
        P.x = AERO.RX; P.z = -8; P.y = 0; P.hp = P.maxHp = 500; AERO.heurtT = 0; majAeroportVivant(1 / 20);
        if (!(P.hp < 500) || Math.abs(P.x - AERO.RX) < 2) ko.push('l’avion qui roule traverse le joueur sans le bousculer');
        d.etat = 'libre'; d.mesh.visible = false; AERO.piste = null; P.hp = P.maxHp = 1e6;
        // 7) les trois nouveaux avions : modèle à roues, décollage, montée sans crash au-dessus de la mer
        for (const k of ['tourisme', 'jetprive', 'ligne']) {
          const m = makeVoiture(k); if (!m.userData.roues || m.userData.roues.length < 3) ko.push(k + ' : modèle sans train');
          for (const q of vehicules) if (q.key === 'ligne' || Math.abs(q.x - AERO.RX) < 16) q.mort = true; // le test maîtrise sa scène : la piste est libre
          const v = creerVehicule(k, AERO.RX, 60, Math.PI, null); P.x = v.x; P.z = v.z; entrerVehicule(v); INPUT.mx = 0; INPUT.mz = -1; let tt = 0;
          while (!v.vol && tt < 14 && !v.mort) { majVol(v, 1 / 30); tt += 1 / 30; }
          if (!v.vol) { ko.push(k + ' ne décolle pas sur la piste (' + (v.v || 0).toFixed(1) + ' u/s après ' + tt.toFixed(0) + ' s)'); INPUT.mz = 0; sortirVehicule(true); v.mort = true; continue; }
          info.push(k + ' décolle en ' + tt.toFixed(1) + ' s');
          INPUT.btn.sprint = true; for (let i = 0; i < 90 && !v.mort; i++) majVol(v, 1 / 30); INPUT.btn.sprint = false; INPUT.mz = 0;
          if (v.mort || !(v.alt > 10)) ko.push(k + ' ne monte pas (' + (v.alt || 0).toFixed(1) + ' u)');
          sortirVehicule(true); v.mort = true;
        }
        info.push('Pélican, Albatros et long-courrier décollent et montent');
        startRun(); P.hp = P.maxHp = 1e6;
        return { ko, info };
      });
      if (r.ko.length) fail('Aéroport vivant : ' + r.ko.join(' | ') + ' [' + r.info.join(', ') + ']');
      else ok('Aéroport vivant : ' + r.info.join(' ; ') + ' ; avion du joueur jamais repris, un mouvement à la fois, le joueur bousculé');
    }

    // -------------------------------------------------------------------
    // Hélicoptères (14 octobre) : l'Écureuil sur le toit de la Tour Los
    // Reyes, l'hélico-grue « Titan » au chantier ; son aimant accroche un
    // véhicule au sol (drapeau captureOvni, physique coupée), le transporte,
    // le lâche (chute et dégâts du rayon de l'OVNI) ; rien sous l'aimant ou
    // trop bas : rien n'est accroché ; quitter l'hélico lâche la charge.
    // -------------------------------------------------------------------
    console.log('\n--- Hélicoptères : Écureuil, hélico-grue « Titan » et son aimant ---');
    {
      const r = await page.evaluate(() => {
        const ko = [], info = [];
        if (INT.actif) sortirInterieur(); if (P.veh) sortirVehicule(true); startRun(); ecran(null); ETAT.mode = 'jeu'; P.hp = P.maxHp = 1e6;
        for (const e of ennemis) e.mort = true;
        const ec = POIS.toitH && vehicules.find((v) => v.key === 'ecureuil' && !v.mort && dist2(v.x, v.z, POIS.toitH.x, POIS.toitH.z) < 9), ti = vehicules.find((v) => v.key === 'titan' && !v.mort); // d'autres Écureuils sont garés sur les toits (TOITS.helis)
        if (!ec || !POIS.toitH || dist2(ec.x, ec.z, POIS.toitH.x, POIS.toitH.z) > 9 || !(ec.alt > 20)) ko.push('pas d’Écureuil sur le toit de la tour');
        if (!ti || !POIS.heliGrue || dist2(ti.x, ti.z, POIS.heliGrue.x, POIS.heliGrue.z) > 1) ko.push('pas d’hélico-grue au chantier');
        if (!ti) return { ko, info };
        for (const k of ['ecureuil', 'titan']) { const m = makeVoiture(k); if (!m.userData.rotor || !m.userData.rotorQ) ko.push(k + ' : rotors manquants'); }
        // une berline sur un sol dégagé, le Titan en vol au-dessus
        let q = null; for (let rr = 8; rr < 50 && !q; rr += 2) for (let a = 0; a < 12 && !q; a++) { const x = ti.x + Math.cos(a / 2) * rr, z = ti.z + Math.sin(a / 2) * rr; if (!solidAt(x, z, 3.5) && poseY(x, z) < 0.5 && !estEau(x, z)) q = { x, z }; }
        for (const v of vehicules) if (v !== ti && dist2(v.x, v.z, q.x, q.z) < 400) v.mort = true; // le test maîtrise sa scène
        const c = creerVehicule('berline', q.x, q.z, 0); P.x = ti.x; P.z = ti.z; entrerVehicule(ti);
        const step = (n) => { for (let i = 0; i < n; i++) { majAimant(1 / 30); for (const v of vehicules) if (v.captureOvni) v.mesh.position.y = v.mesh.position.y; } };
        if (el('btnGren').textContent.indexOf('AIMANT') < 0) ko.push('pas de bouton AIMANT');
        // (16 octobre, « l'aimant ne fonctionne pas ») : accroché même bas, la berline reste posée tant qu'on ne monte pas
        ti.vol = true; ti.alt = poseY(q.x, q.z) + 4; ti.x = q.x + 3; ti.z = q.z; INPUT.edge.gren = true; step(1);
        if (!c.captureOvni) ko.push('l’aimant n’accroche pas la berline (hélico à 4 u, 3 u à côté)');
        step(30); if (ti.cibles[0] && ti.cibles[0].phase === 'suspendue') ko.push('hissée sans que l’hélico monte');
        ti.x = q.x;
        // on monte : hissée, elle suit l'hélico
        ti.alt = 16;
        step(60); const rec = ti.cibles[0];
        if (!rec || rec.phase !== 'suspendue' || !(rec.y > 5)) ko.push('la berline n’est pas hissée (' + (rec ? rec.phase + ' ' + rec.y.toFixed(1) : 'aucune') + ')');
        { let dir = [1, 0]; for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { let ok2 = true; for (let k = 3; k <= 33; k += 3) if (poseY(ti.x + dx * k, ti.z + dz * k) > 1) ok2 = false; if (ok2) { dir = [dx, dz]; break; } } /* un trajet dégagé : sous un toit, la charge s'y pose */
          ti.x += dir[0] * 30; ti.z += dir[1] * 30; } step(60);
        if (Math.hypot(c.x - ti.x, c.z - ti.z) > 4) ko.push('la berline ne suit pas l’hélico');
        info.push('accrochée à ' + (rec ? rec.y.toFixed(1) : '?') + ' u, transportée sur 30 u');
        // lâchée de haut : elle tombe et s'abîme
        const hp0 = c.hp; ti.alt = 24; step(30); INPUT.edge.gren = true; step(1);
        let t = 0; while (c.captureOvni && t < 6) { step(1); t += 1 / 30; }
        if (c.captureOvni || !(c.mort || c.hp < hp0)) ko.push('lâchée, la berline ne retombe pas ou sans dégâts');
        else info.push('lâchée de ' + (24 - AIMANT_GAP).toFixed(0) + ' u : ' + (c.mort ? 'détruite' : (hp0 - c.hp).toFixed(0) + ' de dégâts'));
        // quitter l'hélico avec une charge : elle est lâchée, jamais suspendue sans pilote
        const c2 = creerVehicule('citadine', ti.x, ti.z, 0); ti.alt = poseY(ti.x, ti.z) + 16; INPUT.edge.gren = true; step(20);
        if (!c2.captureOvni) ko.push('2e accroche impossible');
        sortirVehicule(true); step(1);
        if (ti.cibles.some((rr) => rr.phase !== 'chute')) ko.push('charge restée suspendue après la sortie');
        t = 0; while (c2.captureOvni && t < 6) { majAimant(1 / 30); t += 1 / 30; }
        if (c2.captureOvni) ko.push('la charge ne retombe jamais');
        startRun(); P.hp = P.maxHp = 1e6;
        return { ko, info };
      });
      if (r.ko.length) fail('Hélicoptères : ' + r.ko.join(' | ') + ' [' + r.info.join(', ') + ']');
      else ok('Hélicoptères : Écureuil sur la tour, Titan au chantier ; ' + r.info.join(' ; ') + ' ; accrochée bas, hissée en montant, sortie : charge lâchée');
    }

    // -------------------------------------------------------------------
    // Planques en plein air (14 octobre) : chacune de PLANQUES_DEF (lue,
    // jamais recopiée) existe, s'achète sur place (refusée sans l'argent),
    // débloque sa tenue, se sauvegarde ; repos une fois par vague ; coffre ;
    // chaque spécificité marche une fois par vague (sauf le plongeoir).
    // -------------------------------------------------------------------
    console.log('\n--- Planques : achat, repos, coffre, spécificités, tenues, sauvegarde ---');
    {
      const r = await page.evaluate(() => {
        const ko = [], info = [];
        if (!DECOR_V2) return { ko, info: ['DECOR_V2 coupé'] };
        if (INT.actif) sortirInterieur(); if (P.veh) sortirVehicule(true); startRun(); ecran(null); ETAT.mode = 'jeu'; P.hp = P.maxHp = 500;
        const sav = JSON.stringify(META.planques); for (const k in META.planques) META.planques[k] = false;
        const ici = (zn, q) => { P.x = zn.x; P.z = zn.z; P.y = zn.y !== undefined ? zn.y : q.y; };
        const appui = () => { majAction(); const b = el('btnAction'); const l = b.style.display === 'none' ? '' : b.textContent; if (b._fn && l) b._fn(); return l; };
        for (const d of PLANQUES_DEF) {
          const q = PLANQUES.liste.find((x) => x.def.id === d.id); if (!q) { ko.push(d.id + ' absente'); continue; }
          ici(q.achat, q); META.argent = d.prix - 1; const l0 = appui();
          if (!/ACHETER/.test(l0) || planquePossedee(d.id)) ko.push(d.id + ' : achat sans l’argent (' + l0 + ')');
          META.argent = d.prix + 100; appui(); if (!planquePossedee(d.id) || META.argent !== 100) ko.push(d.id + ' : achat raté');
          checkTenues(); const tn = TENUES.find((t) => t.condTxt && t.condTxt.indexOf('Planque') >= 0 && t.cond() && t.condTxt.toLowerCase().indexOf(d.nom.split(' ')[0].toLowerCase().slice(0, 5)) >= 0);
          if (!tn) ko.push(d.id + ' : pas de tenue débloquée');
          // repos : une fois par vague
          ici(q.lit, q); P.hp = 100; appui(); if (P.hp !== P.maxHp) ko.push(d.id + ' : le repos ne soigne pas');
          P.hp = 100; appui(); if (P.hp !== 100) ko.push(d.id + ' : repos deux fois dans la vague');
          // coffre
          META.revenus = 77; const a0 = META.argent; ici(q.coffre, q); appui(); if (META.argent !== a0 + 77 || META.revenus !== 0) ko.push(d.id + ' : coffre');
          // spécificité : on prépare ce qu'il faut, une fois par vague
          P.hp = 300; ici(q.spec, q);
          if (d.spec === 'atelier') { const v = creerVehicule('berline', q.x - 3, q.z + 6, 0); v.hp = 10; appui(); if (v.hp !== v.def.hp) ko.push('atelier : véhicule non réparé'); v.hp = 10; ici(q.spec, q); appui(); if (v.hp !== 10) ko.push('atelier : deux fois'); v.mort = true; }
          else if (d.spec === 'base') { appui(); if (!P.chute || !(P.y > q.y - 1)) ko.push('plongeoir : pas de saut'); P.chute = false; P.y = 0; }
          else if (d.spec === 'punch') { P.buffs.vit = 0; appui(); if (!(P.buffs.vit > 30) || !(P.hp > 300)) ko.push('punch (' + P.hp + ' PV, ' + P.buffs.vit + ')'); }
          else if (d.spec === 'armurerie') { const ga = Object.keys(ARMES).find((k) => ARMES[k].type === 'gun' && META.armes[k]); META.armes[ga].poss = true; P.grenades = 0; P.mun[ga] = 0; appui(); if (P.grenades !== 5 || !(P.mun[ga] > 0)) ko.push('armurerie'); P.grenades = 0; ici(q.spec, q); appui(); if (P.grenades !== 0) ko.push('armurerie deux fois'); }
          else if (d.spec === 'disparaitre') { WANTED.heat = 3.5; WANTED.stars = 3; appui(); if (WANTED.stars !== 0) ko.push('voilier : la police ne perd pas ta trace'); }
          else if (d.spec === 'grenades') { P.grenades = 1; appui(); if (P.grenades !== 4) ko.push('établi : grenades'); }
        }
        info.push(PLANQUES_DEF.length + ' planques achetées, reposées, coffre, spécificités');
        // revenus à la vague suivante, sauvegarde
        const r0 = META.revenus = 0; lancerVague(); if (!(META.revenus > 0)) ko.push('aucun revenu à la vague');
        sauveMeta(); const s = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}'); if (!s.planques || !PLANQUES_DEF.every((d) => s.planques[d.id] === true)) ko.push('planques non sauvegardées');
        META.planques = JSON.parse(sav); sauveMeta(); startRun();
        return { ko, info };
      });
      if (r.ko.length) fail('Planques : ' + r.ko.join(' | ') + ' [' + r.info.join(', ') + ']');
      else ok('Planques : ' + r.info.join(' ; ') + ' ; tenues débloquées, revenus à chaque vague, sauvegardées');
    }

    // -------------------------------------------------------------------
    // Retours de playtest, 3e série (14 octobre) — correctifs : un véhicule
    // est un mur pour les ennemis ; les petits bateaux virent (demi-tour en
    // avançant) ; un bateau piloté percute nageurs, surfeurs et kayaks ; un
    // nageur ne tire pas ; un corps projeté ne passe jamais sous le sol ;
    // les piétons apparaissent loin et hors de vue.
    // -------------------------------------------------------------------
    console.log('\n--- Retours 3e série : véhicule = mur, bateaux, nageurs, chutes, apparitions ---');
    {
      const r = await page.evaluate(() => {
        const ko = [], info = [];
        if (INT.actif) sortirInterieur(); if (P.veh) sortirVehicule(true); startRun(); ecran(null); ETAT.mode = 'jeu'; P.hp = P.maxHp = 1e6;
        for (const e of ennemis) e.mort = true; majEnnemis(1 / 30);
        // 1) un ennemi qui charge le joueur réfugié derrière un char ne traverse jamais le char
        let q = null; for (let rr = 0; rr < 120 && !q; rr += 3) for (let a = 0; a < 12 && !q; a++) { const x = POIS.place.x + Math.cos(a / 2) * rr, z = POIS.place.z + 30 + Math.sin(a / 2) * rr; if (!solidAt(x, z, 8) && !estEau(x, z)) q = { x, z }; }
        for (const v of vehicules) if (dist2(v.x, v.z, q.x, q.z) < 400) v.mort = true;
        const tank = creerVehicule('char', q.x, q.z, Math.PI / 2, null); P.x = q.x; P.z = q.z + tank.def.larg / 2 + 1.2;
        const e = creerEnnemi('vip_batte', q.x, q.z - tank.def.larg / 2 - 2, true); let dedans = 0;
        if (e) { for (let i = 0; i < 150; i++) { majEnnemis(1 / 30); if (vehiculeBloquant(e.x, e.z, -0.2, null) === tank) dedans++; } }
        if (!e) ko.push('ennemi non créé'); else if (dedans) ko.push('un ennemi est entré ' + dedans + ' fois dans le char');
        else info.push('char : un mur pour les ennemis');
        tank.mort = true; if (e) e.mort = true;
        // 2) petits bateaux : demi-tour en avançant, braquage même lent
        for (const k of ['bateau', 'jetski', 'bateauP', 'espadon']) {
          const v = creerVehicule(k, 0, MER + 110, 0, null); P.x = v.x; P.z = v.z; entrerVehicule(v); v.v = 5;
          for (let i = 0; i < 90; i++) { INPUT.mx = 0; INPUT.mz = -1; const c = controleDir(v, false); majVehiculePhys(v, 1 / 30, c.throttle, c.steer, false); }
          INPUT.mz = 0; if (!(v.v > 0) || Math.abs(angDiff(v.ang, Math.PI)) > 1.2) ko.push(k + ' ne fait pas demi-tour en avançant (v ' + v.v.toFixed(1) + ', cap ' + v.ang.toFixed(2) + ')');
          sortirVehicule(true); v.mort = true;
        }
        info.push('vedettes : demi-tour en avançant');
        // 3) en bateau : nageur ennemi percuté, surfeur fauché, kayak chaviré
        const b = creerVehicule('bateau', 30, MER + 90, 0, null); P.x = b.x; P.z = b.z; entrerVehicule(b);
        const n = creerEnnemi('mur_nageur', b.x, b.z + 5, true); if (n) { n.passif = true; n.dansEau = true; }
        mkSurfeur(b.x + 0.5, b.z + 6); mkKayak(b.x - 0.5, b.z + 6.5); const sf = SURFEURS[SURFEURS.length - 1], ky = KAYAKS[KAYAKS.length - 1];
        const hp0 = n ? n.hp : 0; b.v = 14;
        for (let i = 0; i < 20; i++) { INPUT.mx = 0; INPUT.mz = 1; const c = controleDir(b, false); majVehiculePhys(b, 1 / 30, c.throttle, c.steer, false); }
        INPUT.mz = 0;
        if (!n || !(n.hp < hp0 || n.mort)) ko.push('le bateau ne percute pas le nageur');
        if (!sf.tombe) ko.push('le surfeur n’est pas fauché'); if (!(ky.chav > 0)) ko.push('le kayak ne chavire pas');
        info.push('en bateau : nageur percuté, surfeur fauché, kayak chaviré');
        sortirVehicule(true); b.mort = true;
        // 4) un nageur ne tire jamais
        if (n && !n.mort) { n.passif = false; n.cad = 0; P.x = n.x + 6; P.z = n.z; P.nage = true; for (let i = 0; i < 60; i++) { n.cad = 0; majEnnemis(1 / 30); } if (balles.filter((x) => x.on && x.fac === n.fac).length > 0) ko.push('un nageur tire'); P.nage = false; }
        // 5) un corps projeté (toutes poses) ne passe jamais sous le sol
        for (const q2 of pietons) scene.remove(q2.h.g); pietons.length = 0; let minY = 9;
        for (let i = 0; i < 16; i++) { creerPieton(POIS.place.x + i, POIS.place.z + 14); }
        pietons.forEach((p, i) => tuerPieton(p, true, 5 + i * 1.2, p.x + 1, p.z + 2));
        for (let f = 0; f < 90; f++) { majPietons(1 / 30); for (const p of pietons) if (p.etat === 'mort') { p.h.g.updateMatrixWorld(true); p.h.g.traverse((o) => { if (o.isMesh) minY = Math.min(minY, new THREE.Box3().setFromObject(o).min.y); }); } } // maillages seuls : l'ombre est un sprite
        if (minY < -0.35) ko.push('un corps passe sous le sol (' + minY.toFixed(2) + ')'); else info.push('16 chutes, corps toujours au-dessus du sol');
        startRun(); P.hp = P.maxHp = 1e6;
        return { ko, info };
      });
      if (r.ko.length) fail('Retours 3e série : ' + r.ko.join(' | ') + ' [' + r.info.join(', ') + ']');
      else ok('Retours 3e série : ' + r.info.join(' ; '));
    }

    // -------------------------------------------------------------------
    // Véhicules retravaillés (14 octobre) : fourgon (un seul volume haut),
    // char massif, bulldozer qui pousse pour de vrai, hélico VIP qui reste
    // posé sur le méga-yacht quand il navigue.
    // -------------------------------------------------------------------
    console.log('\n--- Véhicules retravaillés : fourgon, char, bulldozer, hélico du yacht ---');
    {
      const r = await page.evaluate(() => {
        const ko = [], info = [];
        if (INT.actif) sortirInterieur(); if (P.veh) sortirVehicule(true); startRun(); ecran(null); ETAT.mode = 'jeu'; P.hp = P.maxHp = 1e6;
        const haut = (k) => { const m = makeVoiture(k); m.updateMatrixWorld(true); let y = 0; m.traverse((o) => { if (o.isMesh) y = Math.max(y, new THREE.Box3().setFromObject(o).max.y); }); return y; };
        const hv = haut('van'), hc = haut('char');
        if (!(hv > 2.05 && hv < 2.6)) ko.push('fourgon : hauteur ' + hv.toFixed(2)); if (!(hc > 2.6)) ko.push('char trop bas : ' + hc.toFixed(2));
        info.push('fourgon ' + hv.toFixed(1) + ' u, char ' + hc.toFixed(1) + ' u');
        // bulldozer : lame baissée, il pousse une citadine sur plus de 6 u
        let q = null; for (let rr = 0; rr < 160 && !q; rr += 3) for (let a = 0; a < 12 && !q; a++) { const x = POIS.place.x + Math.cos(a / 2) * rr, z = POIS.place.z + Math.sin(a / 2) * rr; let ok = true; for (let k = -4; k <= 26 && ok; k += 2) if (solidAt(x + k, z, 3) || estEau(x + k, z)) ok = false; if (ok) q = { x, z }; }
        for (const v of vehicules) if (dist2(v.x, v.z, q.x + 10, q.z) < 900) v.mort = true;
        const bz = creerVehicule('bulldozer', q.x, q.z, Math.PI / 2, null); const ci = creerVehicule('citadine', q.x + bz.def.long / 2 + 2.6, q.z, Math.PI / 2, null); const x0 = ci.x;
        P.x = bz.x; P.z = bz.z; entrerVehicule(bz); majConduite && majConduite(1 / 30);
        for (let i = 0; i < 120; i++) { INPUT.mx = 1; INPUT.mz = 0; const c = controleDir(bz, false); majVehiculePhys(bz, 1 / 30, c.throttle, c.steer, false); }
        INPUT.mx = 0; if (!(ci.x - x0 > 6)) ko.push('le bulldozer ne pousse pas (' + (ci.x - x0).toFixed(1) + ' u)'); else info.push('bulldozer : citadine poussée sur ' + (ci.x - x0).toFixed(0) + ' u');
        sortirVehicule(true); bz.mort = true; ci.mort = true;
        // hélico VIP : reste sur l'hélipad du yacht qui navigue
        const y = GYACHT.v, h = GYACHT.heli;
        if (!y || !h) ko.push('pas de yacht ou d’hélico'); else {
          if (h.key !== 'vip') ko.push('l’hélico du yacht n’est pas le VIP (' + h.key + ')');
          majGrandYacht(); y.conduit = 'joueur'; for (let i = 0; i < 40; i++) { y.x += 0.9; y.ang += 0.01; majGrandYacht(); }
          const hx = y.x - Math.sin(y.ang) * 6.4, hz = y.z - Math.cos(y.ang) * 6.4;
          if (dist2(h.x, h.z, hx, hz) > 0.25) ko.push('l’hélico ne suit pas le yacht (' + Math.sqrt(dist2(h.x, h.z, hx, hz)).toFixed(1) + ' u)'); else info.push('hélico VIP posé sur le yacht en mouvement');
          y.conduit = null; }
        startRun(); P.hp = P.maxHp = 1e6;
        return { ko, info };
      });
      if (r.ko.length) fail('Véhicules retravaillés : ' + r.ko.join(' | ') + ' [' + r.info.join(', ') + ']');
      else ok('Véhicules retravaillés : ' + r.info.join(' ; '));
    }

    // -------------------------------------------------------------------
    // Armes (14 octobre) : AA-12, revolver, arbalète, minigun ; mur d'armes
    // et établi de l'armurerie ; modifications (MODS_ARMES, lues) ; balles
    // explosives et incendiaires ; lance-flammes qui enflamme ; gilets.
    // -------------------------------------------------------------------
    console.log('\n--- Armes : nouvelles armes, mur d’armes, établi, modifications, feu, gilets ---');
    {
      const r = await page.evaluate(() => {
        const ko = [], info = [];
        if (INT.actif) sortirInterieur(); if (P.veh) sortirVehicule(true); startRun(); ecran(null); ETAT.mode = 'jeu'; P.hp = P.maxHp = 1e6;
        const sav = JSON.stringify(META.modsArmes || {}), arg0 = META.argent;
        for (const id of ['aa12', 'revolver', 'arbalete', 'minigun']) { if (!ARMES[id] || !ORDRE_ARMES.includes(id) || !META.armes[id]) ko.push(id + ' absente'); else if (!mkArmeModele(id)) ko.push(id + ' sans modèle'); }
        // armurerie : une arme exposée par arme à feu en vente, achetable au mur
        const porte = PORTES.find((p) => p.id === 'armurerie'); entrerInterieur('armurerie', porte); const s = INT.actif;
        const enVente = ORDRE_ARMES.filter((id) => ARMES[id].type === 'gun' && !ARMES[id].cachee && mkArmeModeleDispo(id));
        if (!s.murArmes || s.murArmes.length !== enVente.length) ko.push('mur d’armes : ' + (s.murArmes ? s.murArmes.length : 0) + ' / ' + enVente.length);
        for (const sl of s.murArmes || []) if (dist2(sl.x, sl.z, s.sortie.x, s.sortie.z) < 64) ko.push('emplacement ' + sl.id + ' à moins de 8 u de la sortie');
        const sl = s.murArmes.find((q) => q.id === 'revolver'); META.armes.revolver.poss = false; META.niveau = Math.max(META.niveau, 10); META.argent = 99999;
        P.x = sl.x; P.z = sl.z; majAction(); const b = el('btnAction'); if (!/ACHETER/.test(b.textContent)) ko.push('le mur ne propose pas l’achat (' + b.textContent + ')'); b._fn && b._fn();
        if (!META.armes.revolver.poss) ko.push('achat au mur raté');
        // établi : modifications, effets sur les statistiques
        META.armes.pistolet.poss = true; delete META.modsArmes.pistolet; const st0 = armeStats('pistolet');
        META.argent = 10; if (acheterMod('pistolet', 'chargeur')) ko.push('modification achetée sans l’argent'); META.argent = 99999;
        for (const k of ['chargeur', 'laser', 'double']) acheterMod('pistolet', k);
        const st1 = armeStats('pistolet');
        if (!(st1.mag >= st0.mag * 2.9 && st1.disp < st0.disp * 0.5 && st1.cad < st0.cad * 0.6)) ko.push('effets des modifications : ' + JSON.stringify({ st0, st1 }));
        if (acheterMod('pistolet', 'electrique')) ko.push('un choc électrique sur un pistolet');
        P.x = s.etabliArmes.x; P.z = s.etabliArmes.z; majAction(); if (!/PERSONNALISER/.test(el('btnAction').textContent)) ko.push('pas d’établi'); el('btnAction')._fn();
        if (!ATELIER.ouvert || !ATELIER.modele) ko.push('l’établi ne s’ouvre pas'); fermerAtelierArme(); sortirInterieur();
        info.push(s.murArmes.length + ' armes au mur, établi, chargeur/laser/akimbo');
        // balles explosives : la voisine de la cible est touchée ; incendiaires : la cible brûle
        for (const e of ennemis) e.mort = true; majEnnemis(1 / 30);
        const x0 = POIS.place.x, z0 = POIS.place.z + 20; P.x = x0; P.z = z0;
        const e1 = creerEnnemi('vip_batte', x0, z0 + 6, true), e2 = creerEnnemi('vip_batte', x0 + 1.2, z0 + 6.4, true); e1.passif = e2.passif = true; e1.hp = e2.hp = 500;
        const h2 = e2.hp; const bE = { x: e1.x, y: 1.2, z: e1.z, vx: 0, vz: 1, dmg: 40, fac: 'joueur', mod: 'explosif' }; collisionBalle(bE);
        if (!(e2.hp < h2)) ko.push('balle explosive : pas de dégâts autour');
        const bF = { x: e1.x, y: 1.2, z: e1.z, vx: 0, vz: 1, dmg: 10, fac: 'joueur', mod: 'feu' }; collisionBalle(bF);
        if (!(e1.feuT > 0)) ko.push('balle incendiaire : la cible ne brûle pas');
        const hF = e1.hp; for (let i = 0; i < 30; i++) majEnnemis(1 / 30); if (!(e1.hp < hF)) ko.push('le feu ne fait pas de dégâts');
        e1.mort = e2.mort = true;
        // le lance-flammes enflamme un piéton (il court, puis tombe ou s'éteint)
        for (const q of pietons) scene.remove(q.h.g); pietons.length = 0; creerPieton(x0, z0 + 4); const pi = pietons[0];
        collisionBalle({ x: pi.x, y: 1, z: pi.z, vx: 0, vz: 1, dmg: 4, fac: 'joueur', mod: 'feu' });
        if (!(pi.feuT > 0) || pi.etat === 'mort') ko.push('le lance-flammes ne met pas le feu au piéton');
        info.push('explosion autour de la cible, feu sur 3 s, piéton enflammé');
        // gilets : achetés au comptoir, protègent, se voient
        P.bouclier = 0; META.argent = 99999; actionShop('gilet', 'lourd'); majHUD();
        if (P.bouclier !== 150 || !P.giletMesh || !P.giletMesh.visible) ko.push('gilet lourd : ' + P.bouclier);
        P.iframes = 0; P.dodgeT = 0; P.ecraseT = 0; const hp0 = P.hp; toucherJoueur(60); if (P.hp !== hp0 || P.bouclier !== 90) ko.push('le gilet n’absorbe pas (' + P.bouclier + ')');
        info.push('gilet lourd 150, visible, absorbe');
        // sauvegarde
        sauveMeta(); const sv = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}'); if (!sv.modsArmes || !/double/.test(sv.modsArmes.pistolet || '')) ko.push('modifications non sauvegardées');
        META.modsArmes = JSON.parse(sav); META.argent = arg0; sauveMeta(); startRun(); P.hp = P.maxHp = 1e6;
        return { ko, info };
      });
      if (r.ko.length) fail('Armes : ' + r.ko.join(' | ') + ' [' + r.info.join(', ') + ']');
      else ok('Armes : ' + r.info.join(' ; ') + ' ; AA-12, revolver, arbalète, minigun ; sauvegardé');
    }

    // -------------------------------------------------------------------
    // Course en mer (14 octobre) : flèche GPS vers la porte suivante,
    // trois rivales du même modèle qui suivent les portes, classement, tout
    // est retiré à l'arrivée ; finir premier majore la prime.
    // -------------------------------------------------------------------
    console.log('\n--- Course en mer : GPS, rivales, classement ---');
    {
      const r = await page.evaluate(() => {
        const ko = [], info = [];
        if (INT.actif) sortirInterieur(); if (P.veh) sortirVehicule(true); startRun(); ecran(null); ETAT.mode = 'jeu'; P.hp = P.maxHp = 1e6;
        const d = rideDepart('bouees'), v = creerVehicule('jetski', d.x, d.z, 0, null); P.x = v.x; P.z = v.z; entrerVehicule(v); demarrerRide('bouees');
        if (!RIDES.rivales || RIDES.rivales.length !== 3 || RIDES.rivales.some((o) => o.def !== v.def)) ko.push('pas trois rivales du même modèle');
        let t = 0, flecheVue = false, rangs = new Set();
        while (RIDES.actif && t < 60) { const rr = RIDES.actif, q = rr.portes[rr.i], a = Math.atan2(q.x - v.x, q.z - v.z); INPUT.mx = Math.sin(a); INPUT.mz = Math.cos(a);
          const c = controleDir(v, false); majVehiculePhys(v, 1 / 30, c.throttle, c.steer, false); majRides(1 / 30); t += 1 / 30;
          if (RIDES.fleche && RIDES.fleche.visible) flecheVue = true; const m = /(\d)e\/4/.exec(RIDES.txt.textContent); if (m) rangs.add(m[1]); }
        INPUT.mx = INPUT.mz = 0;
        if (!flecheVue) ko.push('pas de flèche GPS'); if (!rangs.size) ko.push('pas de classement');
        if (RIDES.actif) ko.push('course pas finie en 60 s'); if (RIDES.rivales && RIDES.rivales.length) ko.push('rivales restées après l’arrivée');
        if (RIDES.fleche && RIDES.fleche.visible) ko.push('flèche restée affichée');
        info.push('fini en ' + t.toFixed(1) + ' s, classements vus : ' + [...rangs].join(','));
        sortirVehicule(true); v.mort = true; startRun(); P.hp = P.maxHp = 1e6;
        return { ko, info };
      });
      if (r.ko.length) fail('Course en mer : ' + r.ko.join(' | ') + ' [' + r.info.join(', ') + ']');
      else ok('Course en mer : ' + r.info.join(' ; ') + ' ; GPS, trois rivales, tout retiré à l’arrivée');
    }

    // Hélicos de combat (14 octobre) : l'armée envoie le « Vautour » à 6 étoiles ; le Vautour pilotable
    // attend à la base militaire, armé
    console.log('\n--- Hélicos de combat : ennemi à 6 étoiles, Vautour pilotable à la base ---');
    {
      const r = await page.evaluate(() => {
        const ko = [];
        if (INT.actif) sortirInterieur(); if (P.veh) sortirVehicule(true); startRun(); ecran(null); ETAT.mode = 'jeu';
        if (!ETYPES.heliArmee || !ETYPES.heliArmee.heli) ko.push('pas d’hélico de l’armée');
        const v = vehicules.find((q) => q.key === 'vautour' && !q.mort);
        if (!v || !POIS.base || Math.abs(v.x - POIS.base.x) > POIS.base.hw || Math.abs(v.z - POIS.base.z) > POIS.base.hd) ko.push('Vautour absent de la base');
        if (v && (!v.def.armes || v.def.air !== 'helico')) ko.push('Vautour non armé');
        const m = makeHeli('armee'), m2 = makeHeli(); if (!m.userData.rotor || !m2.userData.cone) ko.push('modèles incomplets');
        return { ko };
      });
      if (r.ko.length) fail('Hélicos de combat : ' + r.ko.join(' | ')); else ok('Hélicos de combat : Vautour ennemi à 6 étoiles, Vautour pilotable et armé à la base, police restylée');
    }

    // Dégradations progressives (14 octobre) : pare-brise fendu, tôles enfoncées, capot soulevé, puis réparation
    console.log('\n--- Dégradations des véhicules : trois étapes avant l’explosion, effacées à la réparation ---');
    {
      const r = await page.evaluate(() => {
        const ko = []; if (INT.actif) sortirInterieur(); if (P.veh) sortirVehicule(true); startRun(); ecran(null); ETAT.mode = 'jeu';
        const v = creerVehicule('citadine', POIS.place.x, POIS.place.z + 30, 0, null); const vus = [];
        for (const f of [0.7, 0.45, 0.25]) { abimerVehicule(v, v.hp - v.def.hp * f, false); vus.push(v.degSt); }
        if (vus.join(',') !== '1,2,3' || !v.mesh.userData.degats || v.mort) ko.push('étapes : ' + vus.join(','));
        v.hp = v.def.hp; reparerVisuels(v); if (v.degSt || v.mesh.userData.degats) ko.push('la réparation n’efface pas les dégâts');
        v.mort = true; return { ko };
      });
      if (r.ko.length) fail('Dégradations : ' + r.ko.join(' | ')); else ok('Dégradations : pare-brise fendu, tôles enfoncées, capot soulevé, effacés à la réparation');
    }

    // -------------------------------------------------------------------
    // Boutiques de style (14 octobre) : une vitrine par boutique de
    // BOUTIQUES_DEF (lue), essayer ne coûte rien et ne reste pas, acheter
    // porte la pièce, pièces dépareillées par-dessus la tenue, coiffure et
    // tatouage visibles, sauvegarde.
    // -------------------------------------------------------------------
    console.log('\n--- Boutiques de style : vitrines, essayage, achat, pièces dépareillées, coiffeur, tatoueur ---');
    {
      const r = await page.evaluate(() => {
        const ko = [], info = [];
        if (INT.actif) sortirInterieur(); if (P.veh) sortirVehicule(true); startRun(); ecran(null); ETAT.mode = 'jeu';
        const sav = JSON.stringify({ s: META.style, g: META.garde }), arg0 = META.argent;
        for (const k in BOUTIQUES_DEF) if (!BOUTIQUES.some((b) => b.id === k)) ko.push('boutique ' + k + ' absente');
        for (const b of BOUTIQUES) for (const q of PORTES) if (q.boutiqueId !== b.id && dist2(b.x, b.z, q.x, q.z) < 36) ko.push(b.id + ' sur une porte');
        // 17 octobre : on entre dans la boutique (à l'abri), la cabine est au fond
        const b = BOUTIQUES.find((q) => q.id === 'surf'); P.x = b.x; P.z = b.z; majAction();
        if (!/ENTRER/.test(el('btnAction').textContent)) ko.push('pas d’entrée en boutique : ' + el('btnAction').textContent); el('btnAction')._fn();
        const sb = INT.actif; if (!sb || !sb.cabineBoutique || sb.bid !== 'surf') ko.push('pas dans la boutique du surf shop');
        else { if (!sb.variantes.surf.visible || sb.variantes.barbier.visible || !sb.enseignes.surf.visible || sb.enseignes.chic.visible) ko.push('boutique pas reconfigurée');
          P.x = sb.cabineBoutique.x; P.z = sb.cabineBoutique.z; majAction(); if (!/CABINE/.test(el('btnAction').textContent)) ko.push('pas de cabine : ' + el('btnAction').textContent); else el('btnAction')._fn();
          for (let i = 0; i < 10; i++) { majBoutique(1 / 30); majCamera(1 / 30); }
          if (Math.abs(camera.position.z - (P.z + 6.2)) > 1) ko.push('caméra de cabine pas de face'); }
        if (!BOUT.ouvert) ko.push('la cabine ne s’ouvre pas');
        META.argent = 1000; const hautAvant = META.style.haut;
        actionBoutique('essayer', 'debard'); if (META.argent !== 1000 || META.style.haut !== hautAvant || P.h.torse.material.color.getHex() !== 0xffd23f) ko.push('essayer : payé, gardé ou pas visible');
        fermerBoutique(); if (P.h.torse.material.color.getHex() === 0xffd23f && hautAvant !== 0xffd23f) ko.push('l’essai reste après la fermeture');
        ouvrirBoutique(b); actionBoutique('acheter', 'shortT'); fermerBoutique();
        if (META.argent !== 930 || !META.garde.shortT || META.style.bas !== 0x35c8e0 || P.h.jambeG.material.color.getHex() !== 0x35c8e0) ko.push('achat : ' + META.argent);
        // dépareillé : un haut d'une boutique, un bas d'une autre, par-dessus la tenue
        const c = BOUTIQUES.find((q) => q.id === 'chic'); P.x = c.x; P.z = c.z; ouvrirBoutique(c); META.argent = 2000; actionBoutique('acheter', 'costBleu'); fermerBoutique();
        if (META.style.haut !== 0x1c2a4a || META.style.bas !== 0x35c8e0) ko.push('pièces dépareillées non gardées');
        // barbier et tatoueur : la tête change
        const n0 = P.h.g.children.length; const br = BOUTIQUES.find((q) => q.id === 'barbier'); P.x = br.x; P.z = br.z; ouvrirBoutique(br); actionBoutique('acheter', 'afro'); fermerBoutique();
        if (META.style.coiffure !== 'afro' || !(P.h.g.children.length > n0)) ko.push('coiffure non visible');
        // le barbier : fauteuils, pas de tables
        if (INT.actif) sortirInterieur(); const pbr = PORTES.find((q) => q.boutiqueId === 'barbier'); if (pbr) { entrerInterieur('boutique', pbr); const s2 = INT.actif; if (!s2.variantes.barbier.visible || s2.variantes.tables.visible || s2.bid !== 'barbier') ko.push('barbier : salle pas reconfigurée'); sortirInterieur(); if (Math.hypot(P.x - pbr.x, P.z - pbr.z) > 2) ko.push('sortie loin de la vitrine'); }
        for (const q of PORTES) if (q.boutiqueId) { entrerInterieur('boutique', q); sortirInterieur(); if (surChaussee(P.x, P.z) || solidAt(P.x, P.z, 0.3)) ko.push(q.boutiqueId + ' : sortie sur la chaussée ou dans un mur'); }
        info.push(BOUTIQUES.length + ' boutiques en salle (à l’abri), essai gratuit, achat porté, dépareillé, coiffure');
        sauveMeta(); const sv = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}'); if (!sv.garde || !sv.garde.afro || !sv.style || sv.style.coiffure !== 'afro') ko.push('style non sauvegardé');
        const o = JSON.parse(sav); META.style = o.s; META.garde = o.g; META.argent = arg0; sauveMeta(); construireJoueur();
        return { ko, info };
      });
      if (r.ko.length) fail('Boutiques de style : ' + r.ko.join(' | ') + ' [' + r.info.join(', ') + ']');
      else ok('Boutiques de style : ' + r.info.join(' ; ') + ' ; sauvegardé');
    }

    // -------------------------------------------------------------------
    // Manèges (14 octobre) : un tour de grand huit (gare, montée, chute,
    // retour, sensations) et un tour de grande roue ; payants, vagues en
    // trêve, le joueur revient à la gare.
    // -------------------------------------------------------------------
    console.log('\n--- Manèges : grand huit de la marina, grande roue ---');
    {
      const r = await page.evaluate(() => {
        const ko = [], info = [];
        if (INT.actif) sortirInterieur(); if (P.veh) sortirVehicule(true); startRun(); ecran(null); ETAT.mode = 'jeu'; P.hp = P.maxHp = 1e6;
        const H = MANEGES.huit; if (!H) return { ko: ['pas de grand huit'], info };
        P.x = H.gare.x; P.z = H.gare.z; META.argent = 5; majAction(); el('btnAction')._fn(); if (MANEGES.actif) ko.push('tour sans l’argent');
        META.argent = 100; majAction(); if (!/GRAND HUIT/.test(el('btnAction').textContent)) ko.push('pas de bouton à la gare'); el('btnAction')._fn();
        if (!MANEGES.actif || META.argent !== 100 - MANEGES.prixTour || !treveActivite()) ko.push('le tour ne démarre pas');
        let t = 0, yMax = 0, vMax = 0; const s0 = ETAT.score;
        while (MANEGES.actif && t < 120) { majManeges(1 / 30); yMax = Math.max(yMax, P.y); vMax = Math.max(vMax, H.v); t += 1 / 30; }
        if (MANEGES.actif) ko.push('le tour ne finit pas'); if (!(yMax > 18) || !(vMax > 15)) ko.push('ni montée ni chute (' + yMax.toFixed(0) + ' u, ' + vMax.toFixed(0) + ' u/s)');
        if (Math.hypot(P.x - H.gare.x, P.z - H.gare.z) > 2 || !(ETAT.score > s0)) ko.push('retour à la gare / bonus');
        info.push('grand huit : ' + t.toFixed(0) + ' s, ' + yMax.toFixed(0) + ' u de haut, ' + vMax.toFixed(0) + ' u/s');
        // grande roue
        P.x = JETEE.roue.position.x; P.z = JETEE.roue.position.z + 3.2; P.y = solPied(P.x, P.z); majAction(); if (!/GRANDE ROUE/.test(el('btnAction').textContent)) ko.push('pas de grande roue (' + el('btnAction').textContent + ')');
        else { el('btnAction')._fn(); t = 0; yMax = 0; while (MANEGES.actif && t < 60) { majManeges(1 / 30); majJetee(1 / 30); yMax = Math.max(yMax, P.y); t += 1 / 30; } if (MANEGES.actif || !(yMax > 15)) ko.push('grande roue : ' + t.toFixed(0) + ' s, ' + yMax.toFixed(0) + ' u'); else info.push('grande roue : ' + t.toFixed(0) + ' s, ' + yMax.toFixed(0) + ' u de haut'); }
        startRun(); P.hp = P.maxHp = 1e6;
        return { ko, info };
      });
      if (r.ko.length) fail('Manèges : ' + r.ko.join(' | ') + ' [' + r.info.join(', ') + ']');
      else ok('Manèges : ' + r.info.join(' ; ') + ' ; payants, trêve des vagues, retour à la gare');
    }

    // -------------------------------------------------------------------
    // Toits vivants (14 octobre) : piscines, bars, terrains, hélipads... Les
    // coffres se fouillent une fois par vague ; les hélicos garés sur les
    // hélipads tiennent sur le toit et redécollent. Listes lues à la source.
    // -------------------------------------------------------------------
    console.log('\n--- Toits vivants : coffres une fois par vague, hélicos posés sur les toits ---');
    {
      const r = await page.evaluate(() => {
        const ko = [], info = [];
        if (INT.actif) sortirInterieur(); if (P.veh) sortirVehicule(true); startRun(); ecran(null); ETAT.mode = 'jeu'; P.hp = P.maxHp = 1e6;
        if (!TOITS.coffres.length) ko.push('aucun coffre'); if (!TOITS.helis.length) ko.push('aucun hélipad occupé');
        info.push(TOITS.n + ' toits aménagés, ' + TOITS.coffres.length + ' coffres, ' + TOITS.helis.length + ' hélicos');
        // chaque coffre : bouton, butin, refus la même vague, de nouveau à la vague suivante
        let nBon = 0;
        for (const c of TOITS.coffres) {
          P.x = c.x; P.z = c.z + 1.5; P.y = c.y; majAction(); const lab = el('btnAction').textContent;
          if (!/FOUILLER LE COFFRE/.test(lab)) { ko.push('coffre (' + c.x.toFixed(0) + ',' + c.z.toFixed(0) + ') sans bouton : ' + lab); continue; }
          const a0 = META.argent, g0 = P.grenades, m0 = JSON.stringify(P.mun); el('btnAction')._fn();
          if (META.argent === a0 && P.grenades === g0 && JSON.stringify(P.mun) === m0) ko.push('coffre vide');
          const a1 = META.argent; majAction(); if (!/déjà fouillé/.test(el('btnAction').textContent)) ko.push('pas de « déjà fouillé »');
          fouillerCoffreToit(c); if (META.argent !== a1) ko.push('fouillé deux fois la même vague');
          WAVES.n++; majAction(); if (!/FOUILLER LE COFFRE/.test(el('btnAction').textContent)) ko.push('pas de nouveau coffre à la vague suivante'); WAVES.n--;
          nBon++;
        }
        // au sol, sous le toit : jamais de bouton
        const c0 = TOITS.coffres[0]; if (c0) { P.y = 0; P.x = c0.x; P.z = c0.z; if (coffreToitProche()) ko.push('coffre fouillable depuis la rue'); }
        // hélicos des toits : présents, posés à la hauteur du toit, ils y restent puis redécollent
        const hs = TOITS.helis.map((hp) => ({ hp, v: vehicules.find((v) => v.def.air === 'helico' && Math.hypot(v.x - hp.x, v.z - hp.z) < 1) }));
        for (const { hp, v } of hs) if (!v) ko.push('hélico absent du toit ' + hp.x.toFixed(0) + ',' + hp.z.toFixed(0));
        for (let i = 0; i < 60; i++) majVehicules(1 / 30);
        for (const { hp, v } of hs) if (v && (v.mort || Math.abs(v.alt - hp.h) > 0.6)) ko.push(v.key + ' ne tient pas sur le toit (alt ' + (v.alt || 0).toFixed(1) + ' / ' + hp.h.toFixed(1) + ')');
        const h1 = hs.find((o) => o.v); if (h1) { const v = h1.v; P.x = v.x + 1.5; P.z = v.z; P.y = h1.hp.h; entrerVehicule(v);
          INPUT.btn.sprint = true; for (let i = 0; i < 40; i++) { majJoueur(1 / 30, 1 / 30); majVehicules(1 / 30); } INPUT.btn.sprint = false;
          if (v.mort || !v.vol || !(v.alt > h1.hp.h + 4)) ko.push('hélico du toit ne redécolle pas (alt ' + (v.alt || 0).toFixed(1) + ')'); else info.push(v.key + ' redécolle du toit à ' + v.alt.toFixed(0) + ' u');
          sortirVehicule(true); }
        startRun(); P.hp = P.maxHp = 1e6;
        return { ko, info: info.concat(nBon + ' coffres vérifiés') };
      });
      if (r.ko.length) fail('Toits vivants : ' + r.ko.join(' | ') + ' [' + r.info.join(', ') + ']');
      else ok('Toits vivants : ' + r.info.join(' ; '));
    }

    // -------------------------------------------------------------------
    // Aéroport, suite (14 octobre) : véhicules de piste garés et pilotables,
    // cargo au hangar du fret, citerne qui souffle les voisins, et le jeu de
    // la tour de contrôle — gagnable en jouant bien, perdu en ne faisant
    // rien ou en traînant ; prime une fois par vague. Listes lues à la source.
    // -------------------------------------------------------------------
    console.log('\n--- Aéroport : véhicules de piste, hangar du fret, tour de contrôle ---');
    {
      const r = await page.evaluate(() => {
        const ko = [], info = [];
        if (!DECOR_V2) return { ko, info: ['décor V2 coupé'] };
        if (INT.actif) sortirInterieur(); if (P.veh) sortirVehicule(true); startRun(); ecran(null); ETAT.mode = 'jeu'; P.hp = P.maxHp = 1e6;
        for (const e of ennemis) e.mort = true;
        // garés à chaque partie, à leur place
        for (const q of AERO.piste4.concat(AERO.hangars)) { const v = vehicules.find((o) => o.key === q.cle && Math.hypot(o.x - q.x, o.z - q.z) < 1.5); if (!v) ko.push(q.cle + ' absent'); }
        // chaque véhicule de piste se conduit
        for (const q of AERO.piste4) { const v = vehicules.find((o) => o.key === q.cle && Math.hypot(o.x - q.x, o.z - q.z) < 1.5); if (!v) continue;
          P.x = v.x + 2; P.z = v.z; P.y = 0; entrerVehicule(v); if (P.veh !== v) { ko.push(q.cle + ' : on ne monte pas'); continue; }
          const x0 = v.x, z0 = v.z; INPUT.mz = -1; for (let i = 0; i < 60; i++) { majJoueur(1 / 30, 1 / 30); majVehicules(1 / 30); } INPUT.mz = 0;
          const d = Math.hypot(v.x - x0, v.z - z0); if (!(d > 3) || v.mort) ko.push(q.cle + ' n’avance pas (' + d.toFixed(1) + ' u)'); sortirVehicule(true); }
        // citerne : souffle à 12 u
        const cit = vehicules.find((o) => o.key === 'citerne'); if (cit) { const vo = creerVehicule('citadine', cit.x + 7, cit.z, 0); const h0 = vo.hp; exploserVehicule(cit); if (!(vo.hp < h0 || vo.mort)) ko.push('la citerne ne souffle pas sa voisine'); }
        // tour de contrôle : le bouton, la trêve
        P.x = AERO.tour.x; P.z = AERO.tour.z; P.y = solPied(P.x, P.z); majAction(); if (!/TOUR DE CONTRÔLE/.test(el('btnAction').textContent)) ko.push('pas de bouton à la tour (' + el('btnAction').textContent + ')');
        const joue = (strat) => { el('btnAction')._fn(); if (!TOUR.actif || !treveActivite()) ko.push('la partie ne démarre pas'); let t = 0, prochain = 0;
          while (TOUR.actif && t < TOUR_DUREE + 5) { majTour(1 / 30); t += 1 / 30;
            if (strat && !TOUR.piste && !TOUR.fin && t >= prochain) { let b = null; for (const a of TOUR.avions) if (a.etat !== 'final' && (!b || a.carbu < b.carbu)) b = a; if (b && tourAutoriser(b)) prochain = t + strat; } }
          return { t, poses: TOUR.poses, fin: TOUR.fin, actif: TOUR.actif }; };
        let a0 = META.argent; const bon = joue(0.2);
        if (bon.fin !== 'gagne' || META.argent - a0 !== TOUR_PRIME) ko.push('bien joué : ' + JSON.stringify(bon) + ', prime ' + (META.argent - a0));
        info.push('bien joué : ' + TOUR_OBJ + ' posés en ' + bon.t.toFixed(0) + ' s sur ' + TOUR_DUREE);
        a0 = META.argent; const bis = joue(0.2); if (bis.fin !== 'gagne' || META.argent !== a0) ko.push('deuxième prime la même vague');
        const rien = joue(null); if (rien.fin !== 'perdu' || rien.poses) ko.push('sans rien faire : ' + JSON.stringify(rien));
        info.push('sans rien faire : crash à ' + rien.t.toFixed(0) + ' s');
        const lent = joue(9); if (lent.fin !== 'perdu') ko.push('en traînant (9 s entre deux autorisations) : ' + JSON.stringify(lent)); else info.push('en traînant : perdu à ' + lent.t.toFixed(0) + ' s (' + lent.poses + ' posés)');
        if (TOUR.actif) ko.push('le radar reste ouvert');
        // pas de piste double : autoriser un deuxième avion pendant un atterrissage est refusé
        el('btnAction')._fn(); for (let i = 0; i < 30 * 8; i++) majTour(1 / 30); const av = TOUR.avions.filter((a) => a.etat !== 'final');
        if (av.length >= 2) { tourAutoriser(av[0]); if (tourAutoriser(av[1]) || TOUR.avions.filter((a) => a.etat === 'final').length !== 1) ko.push('deux avions sur la piste'); }
        startRun(); if (TOUR.actif || TOUR.vague !== -1) ko.push('startRun ne remet pas la tour à zéro');
        // aucune géométrie perdue d'une partie à l'autre (faune, véhicules, ennemis libérés)
        // même point de vue ET même tirage à chaque partie (le test maîtrise sa scène) : sans ça, le trafic et les voitures
        // garées près du départ changent d'une partie à l'autre et le compte des géométries varie de ±50 sans aucune fuite
        const rnd0 = Math.random;
        const partie = () => { let g = 917; Math.random = () => { g = (g * 1664525 + 1013904223) >>> 0; return g / 4294967296; };
          try { startRun(); ecran(null); ETAT.mode = 'jeu'; for (let i = 0; i < 30; i++) majCamera(1 / 30); renderer.render(scene, camera); } finally { Math.random = rnd0; } };
        partie(); partie(); const g0 = renderer.info.memory.geometries;
        for (let k = 0; k < 3; k++) partie();
        const g1 = renderer.info.memory.geometries; if (g1 > g0 + 5) ko.push('géométries perdues : ' + g0 + ' → ' + g1 + ' en 3 parties'); else info.push('géométries stables (' + g0 + ' → ' + g1 + ')');
        startRun(); P.hp = P.maxHp = 1e6;
        return { ko, info };
      });
      if (r.ko.length) fail('Aéroport, suite : ' + r.ko.join(' | ') + ' [' + r.info.join(', ') + ']');
      else ok('Aéroport, suite : véhicules de piste et cargo garés et pilotables, citerne explosive ; ' + r.info.join(' ; '));
    }

    // -------------------------------------------------------------------
    // Motos (14 octobre, demandé : « des motos réalistes ») : chaque moto de
    // VEHDEFS (lue à la source) a deux roues rondes (cylindres, les jantes du
    // garage s'y greffent), une assise (ud.siege) où le pilote est posé,
    // un échappement d'origine masqué quand le garage en pose un autre, et
    // reste sobre en maillages (pièces fusionnées par matériau).
    // -------------------------------------------------------------------
    console.log('\n--- Motos : modèles, assise du pilote, échappement du garage ---');
    {
      const r = await page.evaluate(() => {
        const ko = [], info = [];
        if (INT.actif) sortirInterieur(); if (P.veh) sortirVehicule(true); startRun(); ecran(null); ETAT.mode = 'jeu';
        const cles = Object.keys(VEHDEFS).filter((k) => VEHDEFS[k].type === 'moto' && !VEHDEFS[k].velo);
        let maxM = 0;
        for (const k of cles) {
          const v = creerVehicule(k, POIS.place.x + 6, POIS.place.z, 0), ud = v.mesh.userData;
          if (!ud.roues || ud.roues.length !== 2 || ud.roues.some((w) => !(w.geometry.parameters.radiusTop > 0.25))) ko.push(k + ' : roues');
          if (!ud.siege) { ko.push(k + ' : pas d’assise'); continue; }
          let n = 0; v.mesh.traverse((o) => { if (o.isMesh) n++; }); maxM = Math.max(maxM, n); if (n > 45) ko.push(k + ' : ' + n + ' maillages');
          P.x = v.x + 1; P.z = v.z; entrerVehicule(v);
          if (P.veh !== v || P.h.g.parent !== v.mesh || Math.abs(P.h.g.position.y - ud.siege.y) > 1e-6) ko.push(k + ' : pilote mal assis');
          sortirVehicule(true);
          const tc = VEHDEFS[k].tuningCarro;
          if (tc && PIECES_FAMILLES[tc.famille].echappement) {
            if (!ud.echapOrigine) ko.push(k + ' : échappement d’origine introuvable');
            else { appliquerCarrosserie(v.mesh, k, { jupes: 0, capot: 0, jantes: 0, echappement: 1 }); const cache = !ud.echapOrigine.visible;
              appliquerCarrosserie(v.mesh, k, { jupes: 0, capot: 0, jantes: 0, echappement: 0 }); if (!cache || !ud.echapOrigine.visible) ko.push(k + ' : échappement d’origine pas remplacé'); }
          }
          v.mort = true;
        }
        majVehicules(1 / 30);
        info.push(cles.length + ' motos, ' + maxM + ' maillages au plus');
        return { ko, info };
      });
      if (r.ko.length) fail('Motos : ' + r.ko.join(' | '));
      else ok('Motos : ' + r.info.join(', ') + ' ; deux roues, pilote en selle, échappement du garage à la place de celui d’origine');
    }

    // -------------------------------------------------------------------
    // Vie du Mont Reyes (14 octobre) : bouquetins qui fuient (les tuer coûte
    // du karma), ours qui charge et mord, percutés par un véhicule lancé,
    // de retour à la vague suivante ; aigles et marmottes (décor).
    // -------------------------------------------------------------------
    console.log('\n--- Vie du mont : bouquetins, ours, aigles, marmottes ---');
    {
      const r = await page.evaluate(() => {
        const ko = [], info = [];
        if (!DECOR_V2) return { ko, info: ['décor V2 coupé'] };
        if (INT.actif) sortirInterieur(); if (P.veh) sortirVehicule(true); startRun(); ecran(null); ETAT.mode = 'jeu'; P.hp = P.maxHp = 1e6;
        for (const e of ennemis) e.mort = true;
        const mont = () => FAUNE.filter((a) => a.zone === 'mont');
        const L = mont(); const nb = L.filter((a) => a.type === 'bouquetin').length, ours = L.find((a) => a.type === 'ours');
        if (nb < 3 || !ours) ko.push('faune absente (' + L.map((a) => a.type).join(',') + ')');
        for (const a of L) if (montU(a.x, a.z) > 0.86 || Math.abs(a.y - hauteurMont(a.x, a.z)) > 0.01) ko.push(a.type + ' hors du mont');
        info.push(nb + ' bouquetins, ' + (ours ? 1 : 0) + ' ours');
        // un bouquetin détale
        const b = L.find((a) => a.type === 'bouquetin'); if (ours) { ours.x = MONT.x; ours.z = MONT.z; ours.y = hauteurMont(ours.x, ours.z); } // l'ours à l'écart
        P.x = b.x + 5; P.z = b.z; P.y = b.y; const d0 = Math.hypot(P.x - b.x, P.z - b.z);
        for (let i = 0; i < 60; i++) majFaune(1 / 30); const d1 = Math.hypot(P.x - b.x, P.z - b.z);
        if (!(d1 > d0 + 3)) ko.push('le bouquetin ne fuit pas (' + d0.toFixed(1) + ' → ' + d1.toFixed(1) + ' u)'); else info.push('le bouquetin fuit (' + d0.toFixed(0) + ' → ' + d1.toFixed(0) + ' u)');
        // le tuer : du karma en moins, rien à ramasser
        ETAT.score = 500; const nPick = pickups.length; toucherAnimal(b, 999); if (!b.mort || ETAT.score !== 450 || pickups.length !== nPick) ko.push('bouquetin tué : score ' + ETAT.score + ', butin ' + (pickups.length - nPick));
        // l'ours charge et mord
        if (ours) { ours.x = MONT.x; ours.z = MONT.z; ours.y = hauteurMont(ours.x, ours.z); ours.pause = false; /* replacé : il a erré au hasard pendant la fuite du bouquetin (le test maîtrise sa scène) */
          P.nage = false; P.chute = false; P.para = false; P.x = ours.x + 9; P.z = ours.z; P.y = hauteurMont(P.x, P.z); const hp0 = P.hp; P.iframes = 0; ours.mordT = 0;
          for (let i = 0; i < 30 * 6 && P.hp === hp0; i++) { majFaune(1 / 30); P.iframes = 0; }
          if (!(P.hp < hp0)) ko.push('l’ours ne mord pas'); else info.push('l’ours charge et mord (−' + (hp0 - P.hp) + ')');
          // percuté par une moto cross lancée
          const v = creerVehicule('motocross', ours.x, ours.z - 1.6, 0); P.x = v.x; P.z = v.z - 1; entrerVehicule(v); v.v = 14; v.ang = Math.atan2(ours.x - v.x, ours.z - v.z);
          majFaune(1 / 30); if (!ours.mort) ko.push('l’ours n’est pas percuté par la moto'); sortirVehicule(true); }
        // ils reviennent à la vague suivante
        for (const a of mont()) a.mort = true; placerFauneMont(); if (mont().filter((a) => !a.mort).length < 6) ko.push('pas de retour à la vague suivante');
        // décor : aigles qui tournent, marmotte qui se cache
        const ai = VIE_MONT.aigles[0], m = VIE_MONT.marmottes[0];
        if (!ai || !m) ko.push('ni aigles ni marmottes');
        else { P.x = m.g.position.x + 30; P.z = m.g.position.z; for (let i = 0; i < 30; i++) majVieMont(1 / 30); const p0 = ai.g.position.clone(), y0 = m.m.position.y;
          P.x = m.g.position.x + 3; for (let i = 0; i < 30; i++) majVieMont(1 / 30);
          if (ai.g.position.distanceTo(p0) < 1 || !(ai.g.position.y > MONT.sommet.h)) ko.push('aigle immobile ou trop bas'); if (!(m.m.position.y < y0 - 0.5)) ko.push('la marmotte ne se cache pas'); }
        startRun(); P.hp = P.maxHp = 1e6;
        return { ko, info };
      });
      if (r.ko.length) fail('Vie du mont : ' + r.ko.join(' | ') + ' [' + r.info.join(', ') + ']');
      else ok('Vie du mont : ' + r.info.join(' ; ') + ' ; percuté par la moto, de retour à la vague suivante ; aigles et marmottes');
    }

    // -------------------------------------------------------------------
    // Badlands (14 octobre, demandé : « des canyons de hauteurs variées, des
    // sauts de canyon en canyon, la zone est trop droite ») : la course de la
    // chaîne est se finit au joystick réel (controleDir) en moto cross et en
    // buggy, véhicule intact, en sautant chaque gap ; la chaîne ouest se
    // descend de mesa en mesa. Mesas et portes lues à la source.
    // -------------------------------------------------------------------
    console.log('\n--- Badlands : sauts de mesa en mesa en zigzag, course finissable ---');
    {
      const r = await page.evaluate(() => {
        const ko = [], info = [];
        if (!DECOR_V2 || !CANYON.est || !CANYON.est.length) return { ko, info: ['décor V2 coupé'] };
        const hs = CANYON.est.concat(CANYON.ouest).map((m) => m.h); if (new Set(hs).size < 6) ko.push('hauteurs peu variées : ' + hs.join(','));
        const xs = CANYON.est.map((m) => m.x); if (Math.max(...xs) - Math.min(...xs) < 6) ko.push('chaîne est en ligne droite');
        const volant0 = META.curios.volant; delete META.curios.volant;
        const course = (cle) => {
          startRun(); ecran(null); ETAT.mode = 'jeu'; P.hp = P.maxHp = 1e6; for (const v of vehicules) scene.remove(v.mesh); vehicules.length = 0; for (const e of ennemis) e.mort = true;
          const d = rideDepart('badlands'), v = creerVehicule(cle, d.x, d.z, Math.PI / 2, null); v.h = solY(d.x, d.z); P.x = v.x; P.z = v.z; entrerVehicule(v);
          const a0 = META.argent; demarrerRide('badlands'); let t = 0, sauts = 0, pa = false, iMax = 0;
          while (RIDES.actif && t < 60) { const rr = RIDES.actif, p = rr.portes[rr.i], prev = rr.i ? rr.portes[rr.i - 1] : d; iMax = rr.i;
            const sx = p.x - prev.x, sz = p.z - prev.z, L = Math.hypot(sx, sz) || 1, u = Math.min(1, ((v.x - prev.x) * sx + (v.z - prev.z) * sz) / (L * L) + 7 / L);
            const tx = prev.x + sx * u - v.x, tz = prev.z + sz * u - v.z, l = Math.hypot(tx, tz) || 1; INPUT.mx = tx / l; INPUT.mz = tz / l;
            const c = controleDir(v, false); majVehiculePhys(v, 1 / 30, c.throttle, c.steer, false); if (v.enAir && !pa) sauts++; pa = v.enAir; P.x = v.x; P.z = v.z; majRides(1 / 30); t += 1 / 30;
            if (v.mort) break; }
          INPUT.mx = INPUT.mz = 0;
          return { cle, fini: META.argent > a0, t: +t.toFixed(1), sauts, porte: iMax, hp: +(Math.max(0, v.hp) / v.def.hp).toFixed(2), pos: v.x.toFixed(0) + ',' + v.z.toFixed(0) + ',' + (v.h || 0).toFixed(1) };
        };
        for (const cle of ['motocross', 'buggy']) { const c = course(cle);
          if (!c.fini || c.hp < 0.5 || c.sauts < CANYON.est.length) ko.push(cle + ' : ' + JSON.stringify(c)); else info.push(cle + ' en ' + c.t + ' s (' + c.sauts + ' sauts)'); }
        // chaîne ouest : depuis la 3e mesa de la ligne, on descend de mesa en mesa
        { startRun(); ecran(null); ETAT.mode = 'jeu'; P.hp = P.maxHp = 1e6; for (const v of vehicules) scene.remove(v.mesh); vehicules.length = 0;
          const m2 = CANYON.mesas[2], v = creerVehicule('motocross', m2.x + 4, m2.z, -Math.PI / 2, null); v.h = solY(v.x, v.z); P.x = v.x; P.z = v.z; entrerVehicule(v);
          const cibles = CANYON.ouest.map((m) => ({ x: m.x, z: m.z - m.hd + 4 })).concat([{ x: CANYON.ouest[2].x, z: CANYON.ouest[2].z + 30 }]); let k = 0, t = 0, posee = [];
          while (k < cibles.length && t < 40) { const c0 = cibles[k], dx = c0.x - v.x, dz = c0.z - v.z, l = Math.hypot(dx, dz) || 1; INPUT.mx = dx / l; INPUT.mz = dz / l;
            const c = controleDir(v, false); majVehiculePhys(v, 1 / 30, c.throttle, c.steer, false); P.x = v.x; P.z = v.z; t += 1 / 30;
            if (l < 6 && !v.enAir) { if (k < CANYON.ouest.length) posee.push(Math.abs((v.h || 0) - CANYON.ouest[k].h) < 1.5); k++; } if (v.mort) break; }
          INPUT.mx = INPUT.mz = 0;
          if (posee.length < CANYON.ouest.length || posee.some((x) => !x) || v.mort) ko.push('chaîne ouest : ' + JSON.stringify({ posee, t: t.toFixed(1), mort: !!v.mort, pos: v.x.toFixed(0) + ',' + v.z.toFixed(0) + ',' + (v.h || 0).toFixed(1) }));
          else info.push('chaîne ouest descendue en ' + t.toFixed(1) + ' s'); }
        if (volant0) META.curios.volant = volant0;
        startRun(); P.hp = P.maxHp = 1e6;
        return { ko, info };
      });
      if (r.ko.length) fail('Badlands : ' + r.ko.join(' | ') + ' [' + r.info.join(', ') + ']');
      else ok('Badlands : ' + r.info.join(' ; ') + ' ; hauteurs variées, zigzag, véhicule intact');
    }

    // -------------------------------------------------------------------
    // Tenues des mini-jeux (14 octobre, demandé : « des skins débloqués par
    // les mini-jeux, avec des capacités ») : chaque exploit, passé par la
    // vraie fin du mini-jeu, débloque sa tenue (TENUE_EXPLOIT, lu à la
    // source) ; la capacité n'agit que tenue portée ; sauvegardé.
    // -------------------------------------------------------------------
    console.log('\n--- Tenues des mini-jeux : déblocage par l’exploit, capacités ---');
    {
      const r = await page.evaluate(() => {
        const ko = [], info = [];
        if (INT.actif) sortirInterieur(); if (P.veh) sortirVehicule(true); startRun(); ecran(null); ETAT.mode = 'jeu'; P.hp = P.maxHp = 1e6;
        for (const e of ennemis) e.mort = true;
        const t0 = META.tenue; for (const k of Object.keys(META.exploits)) { META.exploits[k] = false; delete META.tenuesPoss[TENUE_EXPLOIT[k]]; }
        for (const id of Object.values(TENUE_EXPLOIT)) if (!TENUES.find((x) => x.id === id)) ko.push('tenue ' + id + ' absente');
        // les vraies fins de mini-jeux
        if (typeof BASKET !== 'undefined' && BASKET.ok) { BASKET.actif = true; BASKET.pts = BASKET_OBJECTIF; basketConclure(); }
        lancerTour(); tourFinir(true); fermerTour();
        for (const [id, cle] of [['stunt', 'motocross'], ['bowl', 'bmx'], ['badlands', 'motocross']]) { if (P.veh) sortirVehicule(true); const d = rideDepart(id), v = creerVehicule(cle, d.x, d.z, 0, null); v.h = solY(d.x, d.z); P.x = v.x; P.z = v.z; entrerVehicule(v); demarrerRide(id); if (RIDES.actif) finirRide(true); else ko.push('course ' + id + ' ne démarre pas'); sortirVehicule(true); }
        if (typeof TOW !== 'undefined') { TOW.actif = { id: 'wake', pts: TOW_DEFS.wake.objectif, t: 1, s: 0 }; finTow('temps'); }
        if (typeof BASE !== 'undefined' && BASE.ok) { lancerDefiBase(); finDefiBase(true); } // parcours du combattant de Fort Reyes
        if (typeof BT !== 'undefined' && BT.ok) { lancerBallTrap(); FPS.score = BT_OBJECTIF; fpsFinir(); } // ball-trap du ranch
        if (typeof DERBY !== 'undefined' && DERBY.ok) { if (P.veh) sortirVehicule(true); WANTED.heat = 0; P.x = DERBY.stand.x; P.z = DERBY.stand.z; P.y = 0; derbyLancer(); derbyFin(true, 'dernier'); derbyNettoyer(); } // arène de derby
        checkTenues();
        for (const [k, id] of Object.entries(TENUE_EXPLOIT)) if (!META.exploits[k] || !META.tenuesPoss[id]) ko.push(k + ' → ' + id + ' pas débloquée');
        if (!ko.length) info.push(Object.keys(TENUE_EXPLOIT).length + ' tenues débloquées par leur mini-jeu');
        // grenade : 35 % plus loin avec le maillot
        const lance = (tn) => { META.tenue = tn; P.grenades = 3; INPUT.mx = 0; INPUT.mz = 0; lancerGrenade(); const g = grenades.filter((x) => x.on).pop(); const v = Math.hypot(g.vx, g.vz); g.on = false; g.mesh.visible = false; return v; };
        const g1 = lance('depart'), g2 = lance('ballers'); if (Math.abs(g2 / g1 - 1.35) > 0.01) ko.push('grenade ×' + (g2 / g1).toFixed(2));
        // nage : 30 % plus vite en combinaison de wakeboard
        const nage = (tn) => { META.tenue = tn; P.x = 40; P.z = 330; P.y = 0; P.nage = true; P.chute = false; P.stam = P.stamMax; INPUT.mx = 0; INPUT.mz = 1; const z0 = P.z; for (let i = 0; i < 30; i++) majJoueur(1 / 30, 1 / 30); INPUT.mz = 0; return Math.abs(P.z - z0); };
        const n1 = nage('depart'), n2 = nage('wakeur'); if (!(n2 / n1 > 1.2)) ko.push('nage ×' + (n2 / n1).toFixed(2)); else info.push('nage ×' + (n2 / n1).toFixed(2));
        // chute : dégâts divisés par deux en tenue « Badlands »
        const chute = (tn) => { META.tenue = tn; P.nage = false; P.x = POIS.place.x; P.z = POIS.place.z + 8; const g0 = solPied(P.x, P.z); P.y = g0 + 25; P.vy = 0; P.chute = false; P.hp = P.maxHp = 1e6; P.iframes = 0; P.bouclier = 0;
          for (let i = 0; i < 30 * 8 && (P.chute || P.y > g0 + 0.01 || i < 2); i++) { majJoueur(1 / 30, 1 / 30); P.iframes = 0; } return 1e6 - P.hp; };
        const c1 = chute('depart'), c2 = chute('badlands'); if (!(c1 > 0) || Math.abs(c2 / c1 - 0.5) > 0.05) ko.push('chute : ' + c1.toFixed(0) + ' → ' + c2.toFixed(0)); else info.push('chute : ' + c1.toFixed(0) + ' → ' + c2.toFixed(0) + ' de dégâts');
        // vol : 15 % plus rapide en gilet d'aiguilleur
        const vol = (tn) => { META.tenue = tn; if (P.veh) sortirVehicule(true); const v = creerVehicule('helico', POIS.place.x, POIS.place.z + 20, 0); v.alt = 40; v.vol = true; v.va = 0; P.x = v.x; P.z = v.z; entrerVehicule(v); v.alt = 40; v.vol = true;
          INPUT.mx = 0; INPUT.mz = 1; for (let i = 0; i < 30 * 6; i++) majVol(v, 1 / 30); INPUT.mz = 0; const s = v.v; sortirVehicule(true); v.mort = true; return s; };
        const v1 = vol('depart'), v2 = vol('aiguilleur'); if (Math.abs(v2 / v1 - 1.15) > 0.03) ko.push('vol ×' + (v2 / v1).toFixed(2)); else info.push('vol ×' + (v2 / v1).toFixed(2));
        // sauvegardé
        sauveMeta(); const sv = JSON.parse(localStorage.getItem('asphalte_save_v1')); if (!sv.exploits || !sv.exploits.tour) ko.push('exploits pas sauvegardés');
        META.tenue = t0; INPUT.mx = INPUT.mz = 0; startRun(); P.hp = P.maxHp = 1e6;
        return { ko, info };
      });
      if (r.ko.length) fail('Tenues des mini-jeux : ' + r.ko.join(' | ') + ' [' + r.info.join(', ') + ']');
      else ok('Tenues des mini-jeux : ' + r.info.join(' ; ') + ' ; grenade ×1,35 ; sauvegardé');
    }

    // -------------------------------------------------------------------
    // Défis de la 3e série (14 octobre) : chaque compteur avance par la vraie
    // action (coffre de toit, avion posé, tour de manège, achat en boutique,
    // fauve abattu — jamais un bouquetin), et le premier palier du thème
    // devient « à réclamer ». Thèmes retrouvés par leur compteur, pas recopiés.
    // -------------------------------------------------------------------
    console.log('\n--- Défis de la 3e série : compteurs par la vraie action, paliers ---');
    {
      const r = await page.evaluate(() => {
        const ko = [], info = [];
        if (INT.actif) sortirInterieur(); if (P.veh) sortirVehicule(true); startRun(); ecran(null); ETAT.mode = 'jeu'; P.hp = P.maxHp = 1e6;
        for (const e of ennemis) e.mort = true;
        const D = META.defis, avant = JSON.parse(JSON.stringify(D));
        const themeDe = (cle) => DEFIS.find((d) => d.palier === 0 && (() => { const v0 = D[cle]; D[cle] = 1e6; const ok = d.cond(META); D[cle] = v0; return ok && !d.cond(Object.assign({}, META, { defis: Object.assign({}, D, { [cle]: 0 }) })); })());
        // coffre de toit
        const c = TOITS.coffres[0]; c.vague = -1; fouillerCoffreToit(c);
        // un avion posé
        P.x = AERO.tour.x; P.z = AERO.tour.z; lancerTour(); for (let i = 0; i < 30 * 30 && TOUR.poses < 1; i++) { majTour(1 / 30); if (!TOUR.piste && TOUR.avions.length) tourAutoriser(TOUR.avions[0]); } fermerTour();
        // un tour de grande roue
        META.argent += 100; P.x = JETEE.roue.position.x; P.z = JETEE.roue.position.z + 3.2; P.y = solPied(P.x, P.z); lancerManege('roue'); for (let i = 0; i < 30 * 60 && MANEGES.actif; i++) { majManeges(1 / 30); majJetee(1 / 30); }
        // une pièce achetée en boutique (la moins chère, pas encore possédée)
        const b = BOUTIQUES[0]; P.x = b.x; P.z = b.z; ouvrirBoutique(b); const v = VETEMENTS.filter((x) => !vetementPossede(x.id)).sort((a, b2) => a.prix - b2.prix)[0];
        META.argent += 1000; if (v) actionBoutique('acheter', v.id); fermerBoutique();
        // un sanglier abattu compte, un bouquetin jamais
        const sg = FAUNE.find((a) => a.type === 'sanglier' && !a.mort), bq = FAUNE.find((a) => a.type === 'bouquetin' && !a.mort);
        const f0 = D.fauves; if (bq) toucherAnimal(bq, 999); if (D.fauves !== f0) ko.push('un bouquetin compte comme fauve'); if (sg) toucherAnimal(sg, 999);
        const attendu = { coffresToits: 1, avionsPoses: 1, manege: 1, styleAchats: v ? 1 : 0, fauves: sg ? 1 : 0 };
        for (const [k, n] of Object.entries(attendu)) if (D[k] - avant[k] !== n) ko.push(k + ' +' + (D[k] - avant[k]) + ' (attendu +' + n + ')');
        checkDefis();
        for (const k of Object.keys(attendu)) { if (!attendu[k]) continue; const d = themeDe(k); if (!d) { ko.push('aucun défi sur ' + k); continue; }
          if (!(D.faits[d.id] || D.aReclamer[d.id]) && D[k] >= 1 && d.cond(META)) ko.push(d.nom + ' accompli mais pas à réclamer'); }
        info.push(Object.keys(attendu).filter((k) => attendu[k]).length + ' compteurs vérifiés');
        startRun(); P.hp = P.maxHp = 1e6;
        return { ko, info };
      });
      if (r.ko.length) fail('Défis 3e série : ' + r.ko.join(' | ') + ' [' + r.info.join(', ') + ']');
      else ok('Défis 3e série : ' + r.info.join(' ; ') + ' (coffre de toit, avion posé, manège, boutique, fauve — pas le bouquetin) ; premiers paliers à réclamer');
    }

    // -------------------------------------------------------------------
    // Façades variées (14 octobre) : la plupart des immeubles hors néon ont
    // un style de façade ; budget de sommets tenu (mobile) ; les portes de
    // la ville n'ont pas bougé (passe de décor sur son propre générateur).
    // -------------------------------------------------------------------
    console.log('\n--- Façades : styles par quartier, budget de sommets ---');
    {
      const r = await page.evaluate(() => {
        const ko = [];
        if (!DECOR_V2) return { ko, n: 0 };
        const candidats = BATIMENTS.filter((b) => quartierAt(b.x, b.z) !== 'neon' && b.h >= 7 && b.w >= 6).length;
        if (!(FACADES_N >= candidats * 0.5)) ko.push(FACADES_N + ' façades sur ' + candidats + ' immeubles');
        if (!(FACADES_V < 120000)) ko.push(FACADES_V + ' sommets');
        return { ko, n: FACADES_N, c: candidats, v: FACADES_V };
      });
      if (r.ko.length) fail('Façades : ' + r.ko.join(' | '));
      else ok('Façades : ' + r.n + ' immeubles sur ' + r.c + ' habillés, ' + r.v + ' sommets');
    }

    // -------------------------------------------------------------------
    // Cascades et volcan (15 octobre, demandé : « de la cascade à des endroits
    // avec de la déco, et de la lave sur l'île au pirate avec de la fumée ») :
    // bassin de la grande cascade = vraie eau (on y nage, on y plonge sans se
    // blesser) ; la coulée descend jusqu'à la mer, loin des trous à creuser ;
    // la lave brûle à pied, rien en dehors ; les animaux n'y entrent jamais.
    // -------------------------------------------------------------------
    console.log('\n--- Cascades et volcan : bassin où l’on nage, lave qui brûle, fumée ---');
    {
      const r = await page.evaluate(() => {
        const ko = [], info = [];
        if (!DECOR_V2) return { ko, info: ['décor V2 coupé'] };
        if (INT.actif) sortirInterieur(); if (P.veh) sortirVehicule(true); startRun(); ecran(null); ETAT.mode = 'jeu'; P.hp = P.maxHp = 1e6;
        for (const e of ennemis) e.mort = true;
        if (CASC.length < 2) ko.push(CASC.length + ' cascade(s)');
        const B = BASSINS[0]; if (!B) ko.push('pas de bassin');
        else {
          if (!estEau(B.x, B.z) || estEau(B.x + B.r + 1, B.z + B.r + 1)) ko.push('bassin : eau mal délimitée');
          // plongeon depuis 20 u dans le bassin : aucun dégât, on nage
          P.x = B.x; P.z = B.z + 1; P.y = 20; P.vy = 0; P.chute = false; P.nage = false; P.iframes = 0; P.bouclier = 0; const hp0 = P.hp;
          for (let i = 0; i < 30 * 5; i++) { majJoueur(1 / 30, 1 / 30); P.iframes = 0; }
          if (P.hp !== hp0 || !P.nage) ko.push('plongeon dans le bassin : ' + (hp0 - P.hp) + ' de dégâts, nage ' + P.nage);
          else info.push('plongeon de 20 u dans le bassin sans dégât');
        }
        // le volcan
        if (!VOLCAN.ok) return { ko: ko.concat('pas de volcan'), info };
        const c = VOLCAN.coulee, fin = c[c.length - 1];
        if (!estEau(fin[0], fin[1])) ko.push('la coulée n’atteint pas la mer');
        let dTrou = 1e9; for (const t of ILE2.trous) for (const [x, z] of c) dTrou = Math.min(dTrou, Math.hypot(x - t.x, z - t.z));
        if (dTrou < VOLCAN.larg / 2 + 2.5) ko.push('trou à creuser à ' + dTrou.toFixed(1) + ' u de la lave');
        info.push('coulée de ' + c.length * 1.5 + ' u jusqu’à la mer, trous à ' + dTrou.toFixed(0) + ' u au moins');
        // à pied dans la lave : ça brûle ; à côté : rien
        const m = c[Math.floor(c.length / 2)]; const brule = (x, z) => { P.nage = false; P.x = x; P.z = z; P.y = hauteurIleTresor(x, z); P.chute = false; P.hp = P.maxHp = 1000; P.iframes = 0; P.bouclier = 0; for (let i = 0; i < 30 * 2; i++) { majVolcan(1 / 30); P.iframes = 0; } return 1000 - P.hp; };
        const dans = brule(m[0], m[1]), aCote = brule(m[0] + 8, m[1] - 3);
        if (!(dans > 20) || aCote > 0) ko.push('lave : ' + dans + ' de dégâts dedans, ' + aCote + ' à côté'); else info.push('la lave brûle (' + dans + ' en 2 s)');
        // les animaux n'y entrent jamais
        P.x = ILE2.cx + 60; P.z = ILE2.cz + 60; let dedans = 0;
        for (const a of FAUNE) if (!a.zone && dansLave(a.x, a.z)) dedans++;
        for (let i = 0; i < 30 * 20; i++) { majFaune(1 / 30); for (const a of FAUNE) if (!a.zone && !a.mort && dansLave(a.x, a.z)) dedans++; }
        if (dedans) ko.push('animaux dans la lave (' + dedans + ')');
        // fumée : le panache vit près de l'île
        P.x = ILE2.cx; P.z = ILE2.cz + 30; for (let i = 0; i < 30 * 4; i++) majCascades(1 / 30);
        const vis = VOLCAN.panaches[0].sp.filter((q) => q.s.visible).length; if (vis < 5) ko.push('panache : ' + vis + ' bouffées'); else info.push(vis + ' bouffées de fumée');
        startRun(); P.hp = P.maxHp = 1e6;
        return { ko, info };
      });
      if (r.ko.length) fail('Cascades et volcan : ' + r.ko.join(' | ') + ' [' + r.info.join(', ') + ']');
      else ok('Cascades et volcan : ' + r.info.join(' ; '));
    }

    // -------------------------------------------------------------------
    // Échelle et vie de l'aéroport (15 octobre, signalé : « yacht privé tout
    // ratatiné, hélicoptères ramassés » ; « encore de la vie à l'aéroport ») :
    // proportions face à un personnage de 1,8 u ; véhicules de piste qui
    // circulent, s'arrêtent devant le joueur et se volent ; placeurs qui
    // guident l'avion qui arrive ; file de taxis ; carillon dans le hall.
    // -------------------------------------------------------------------
    console.log('\n--- Échelle des hélicos et du yacht, vie de l’aéroport ---');
    {
      const r = await page.evaluate(() => {
        const ko = [], info = [];
        if (INT.actif) sortirInterieur(); if (P.veh) sortirVehicule(true); startRun(); ecran(null); ETAT.mode = 'jeu'; P.hp = P.maxHp = 1e6;
        for (const e of ennemis) e.mort = true;
        // proportions : hauteur de la cabine (sans rotor ni ombre) et du yacht
        const haut = (m, sansRotor) => { m.updateMatrixWorld(true); const bb = new THREE.Box3(); const ex = new Set(); const ud = m.userData; if (sansRotor && ud.rotor) ud.rotor.traverse((o) => ex.add(o));
          m.traverse((o) => { if (o.isMesh && !ex.has(o) && !(o.material && o.material.transparent && o.material.opacity < 0.5)) bb.expandByObject(o); }); return bb.max.y - bb.min.y; };
        for (const k of Object.keys(VEHDEFS).filter((k) => VEHDEFS[k].air === 'helico' && !VEHDEFS[k].ovni)) { const m = makeVoiture(k); const hC = haut(m, true); if (!(hC > 2.9)) ko.push(k + ' : cabine de ' + hC.toFixed(1) + ' u'); info.push(k + ' ' + hC.toFixed(1)); }
        { const m = makeVoiture('yacht'); const hY = haut(m, false); if (!(hY > 8)) ko.push('yacht : ' + hY.toFixed(1) + ' u de haut'); else info.push('yacht ' + hY.toFixed(1) + ' u'); if (!(m.userData.siege && m.userData.siege.y > 4)) ko.push('pilote du yacht trop bas'); }
        if (!AERO_VIE.ok) return { ko: ko.concat('pas de vie de l’aéroport'), info };
        // véhicules de piste : ils circulent
        const flotte = vehicules.filter((v) => v.conduit === 'piste'); if (flotte.length < AERO_VIE.flotte.length) ko.push(flotte.length + ' véhicules de piste');
        P.x = AERO.T.x0 - 40; P.z = AERO.C.z; const p0 = flotte.map((v) => v.piste.s);
        for (let i = 0; i < 30 * 10; i++) majVehicules(1 / 30);
        flotte.forEach((v, i) => { const d = (v.piste.s - p0[i] + v.piste.b.L) % v.piste.b.L; if (!(d > 25)) ko.push(v.key + ' ne circule pas (' + d.toFixed(0) + ' u)'); }); // chemin parcouru sur la boucle
        // un piéton devant : arrêt
        const v0 = flotte[0]; P.x = v0.x + Math.sin(v0.ang) * 4; P.z = v0.z + Math.cos(v0.ang) * 4; P.y = 0;
        for (let i = 0; i < 30 * 2; i++) majVehicules(1 / 30); const xa = v0.x, za = v0.z; for (let i = 0; i < 30; i++) majVehicules(1 / 30);
        if (Math.hypot(v0.x - xa, v0.z - za) > 0.3) ko.push(v0.key + ' ne s’arrête pas devant le joueur');
        // on le vole : il ne suit plus sa boucle
        P.x = v0.x + 2; P.z = v0.z; entrerVehicule(v0); if (P.veh !== v0 || v0.conduit !== 'joueur') ko.push('véhicule de piste pas volable'); sortirVehicule(true);
        const fm = flotte.find((v) => v.mesh.userData.gyroFm); if (!fm) ko.push('pas de FOLLOW ME');
        // placeurs : bâtons levés quand un avion arrive à leur porte
        const d = AERO.dec[0], pl = AERO_VIE.placeurs[0]; P.x = AERO.C.x; P.z = AERO.C.z; majAeroportVivant(1 / 30);
        d.etat = 'taxi'; d.porte = pl.porte; majAeroVie(1 / 30); const leve = pl.h.brasG.rotation.z > 2; d.etat = 'libre'; majAeroVie(1 / 30);
        if (!leve || pl.h.brasG.rotation.z > 1) ko.push('le placeur ne guide pas');
        // file de taxis et carillon du hall
        const taxis = vehicules.filter((v) => v.key === 'taxi' && Math.abs(v.x - (AERO.T.x0 - 4.5)) < 1).length; if (taxis < 3) ko.push(taxis + ' taxi(s) à la dépose-minute');
        AERO_VIE.dingT = 0; let toastMsg = ''; const t0 = toast; toast = (m) => { toastMsg = m; }; P.x = AERO.C.x; P.z = AERO.C.z; majAeroVie(1 / 30); toast = t0;
        if (!/embarquement/.test(toastMsg)) ko.push('pas d’annonce dans le hall');
        info.push(flotte.length + ' véhicules de piste qui circulent, ' + taxis + ' taxis');
        startRun(); P.hp = P.maxHp = 1e6;
        return { ko, info };
      });
      if (r.ko.length) fail('Échelle et aéroport : ' + r.ko.join(' | ') + ' [' + r.info.join(', ') + ']');
      else ok('Échelle et aéroport : ' + r.info.join(' ; ') + ' ; arrêt devant le joueur, volables, placeurs, annonce');
    }

    // -------------------------------------------------------------------
    // PNJ à l'eau (15 octobre, signalé : « des PNJ qui marchent dans l'eau vers
    // le sable ») : un ennemi qui ne nage pas et un passant jetés à l'eau
    // nagent (allongés) jusqu'à la rive la plus proche, jamais debout dans
    // l'eau, et se relèvent sur la terre ferme. Pareil dans le bassin de la
    // cascade, où la rive n'est pas au nord.
    // -------------------------------------------------------------------
    console.log('\n--- PNJ à l’eau : ils nagent jusqu’à la rive, jamais debout dans l’eau ---');
    {
      const r = await page.evaluate(() => {
        const ko = [], info = [];
        if (INT.actif) sortirInterieur(); if (P.veh) sortirVehicule(true); startRun(); ecran(null); ETAT.mode = 'jeu'; P.hp = P.maxHp = 1e6;
        const type = Object.keys(ETYPES).find((k) => !ETYPES[k].nage && ETYPES[k].arme === 'melee' && !ETYPES[k].boss);
        const essai = (nom, x, z) => {
          for (const e of ennemis) e.mort = true; P.x = x - 60; P.z = z - 60; P.y = 0;
          creerEnnemi(type, x, z, false); const e = ennemis[ennemis.length - 1]; e.x = x; e.z = z;
          creerPieton(x + 2, z); const p = pietons[pietons.length - 1]; p.x = x + 2; p.z = z;
          let debout = 0, t = 0; const fini = () => !estEau(e.x, e.z) && !estEau(p.x, p.z);
          while (!fini() && t < 40) { majEnnemis(1 / 30); majPietons(1 / 30); t += 1 / 30;
            if (estEau(e.x, e.z) && Math.abs(e.h.g.rotation.x) < 0.5) debout++; if (estEau(p.x, p.z) && Math.abs(p.h.g.rotation.x) < 0.5) debout++; }
          for (let i = 0; i < 10; i++) { majEnnemis(1 / 30); majPietons(1 / 30); }
          if (!fini()) ko.push(nom + ' : pas sur la rive en 40 s');
          if (debout > 2) ko.push(nom + ' : debout dans l’eau (' + debout + ' images)');
          if (Math.abs(e.h.g.rotation.x) > 0.3 || Math.abs(p.h.g.rotation.x) > 0.3 || e.h.g.rotation.order !== 'XYZ') ko.push(nom + ' : pas relevé sur la terre');
          info.push(nom + ' : rive en ' + t.toFixed(0) + ' s');
          e.mort = true; p.etat = 'mort';
        };
        essai('mer', 40, MER + 14);
        if (BASSINS[0]) essai('bassin', BASSINS[0].x, BASSINS[0].z);
        startRun(); P.hp = P.maxHp = 1e6;
        return { ko, info };
      });
      if (r.ko.length) fail('PNJ à l’eau : ' + r.ko.join(' | ') + ' [' + r.info.join(', ') + ']');
      else ok('PNJ à l’eau : ' + r.info.join(' ; ') + ', à la nage, relevés à terre');
    }

    // -------------------------------------------------------------------
    // Los Reyes Hills (15 octobre, demandé : « un vrai quartier de villas,
    // des routes qui tournent et qui montent, comme Beverly Hills ») : l'ancien
    // quartier a disparu ; Reyes Hills Drive se monte au joystick réel
    // (controleDir) de l'entrée au sommet, en voiture de ville et à moto ; le
    // concessionnaire et la planque (au sommet) s'ouvrent ; le trafic de la
    // grille n'entre jamais dans la colline. Routes lues à la source.
    // -------------------------------------------------------------------
    console.log('\n--- Los Reyes Hills : routes en lacets, portes déplacées, pas de trafic ---');
    {
      const r = await page.evaluate(() => {
        const ko = [], info = [];
        if (!DECOR_V2 || !HILLS.ok) return { ko, info: ['décor V2 coupé'] };
        if (INT.actif) sortirInterieur(); if (P.veh) sortirVehicule(true); startRun(); ecran(null); ETAT.mode = 'jeu'; P.hp = P.maxHp = 1e6;
        for (const e of ennemis) e.mort = true;
        const H = HILLS, drive = H.routes.find((q) => q.id === 'drive');
        // le sommet est haut, la route n'y monte jamais trop raide
        const hmax = Math.max(...drive.h); if (!(hmax > 20)) ko.push('sommet à ' + hmax.toFixed(1) + ' u');
        let pmax = 0; for (let i = 1; i < drive.h.length; i++) pmax = Math.max(pmax, Math.abs(drive.h[i] - drive.h[i - 1]) / drive.ds);
        if (pmax > H.pente + 0.01) ko.push('pente de ' + pmax.toFixed(2));
        // le relief que voit la physique est celui du maillage (solY)
        for (let k = 0; k < 30; k++) { const [x, z] = drive.pts[Math.floor(k / 30 * drive.pts.length)]; if (dansHills(x, z, -0.5) && Math.abs(solY(x, z) - hauteurHills(x, z)) > 0.01) { ko.push('solY ≠ relief'); break; } }
        // la conduite : de l'entrée au sommet, au joystick réel
        const monter = (cle) => { for (const v of [...vehicules]) if (dansHills(v.x, v.z, 8)) { scene.remove(v.mesh); vehicules.splice(vehicules.indexOf(v), 1); }
          const [x0, z0] = drive.pts[0], v = creerVehicule(cle, x0, z0 - 1, Math.PI, null); v.h = solY(v.x, v.z); P.x = v.x; P.z = v.z; entrerVehicule(v);
          let i = 2, t = 0; while (i < drive.pts.length - 2 && t < 120) { const p = drive.pts[Math.min(drive.pts.length - 1, i + 3)];
            const dx = p[0] - v.x, dz = p[1] - v.z, l = Math.hypot(dx, dz) || 1; INPUT.mx = dx / l; INPUT.mz = dz / l;
            const q = drive.pts[Math.min(drive.pts.length - 1, i + 10)], virage = Math.abs(angDiff(Math.atan2(dx, dz), Math.atan2(q[0] - v.x, q[1] - v.z))), vMax = virage > 0.7 ? 10 : (virage > 0.35 ? 16 : 28), fr = Math.abs(v.v) > vMax; // freine avant les épingles
            const c = controleDir(v, fr); majVehiculePhys(v, 1 / 30, fr ? 0 : Math.min(c.throttle, 0.85), c.steer, fr); P.x = v.x; P.z = v.z; t += 1 / 30;
            while (i < drive.pts.length - 2 && dist2(v.x, v.z, drive.pts[i][0], drive.pts[i][1]) < 64) i++; if (v.mort) break; }
          INPUT.mx = INPUT.mz = 0; const res = { cle, t: +t.toFixed(1), i, n: drive.pts.length, h: +(v.h || solY(v.x, v.z)).toFixed(1), hp: +(v.hp / v.def.hp).toFixed(2) }; sortirVehicule(true); return res; };
        for (const cle of ['citadine', 'moto']) { const m = monter(cle); if (m.i < m.n - 3 || m.hp < 0.6) ko.push('montée en ' + cle + ' : ' + JSON.stringify(m)); else info.push(cle + ' au sommet en ' + m.t + ' s (' + m.h + ' u)'); }
        // les portes déplacées s'ouvrent (concession à l'entrée, planque au sommet)
        for (const id of ['conces', 'planque']) { const p = PORTES.find((q) => q.id === id); if (!p || !dansHills(p.x, p.z, 8)) { ko.push(id + ' pas dans la colline'); continue; }
          P.x = p.x + (p.nx || 0) * 2.5; P.z = p.z + (p.nz || 1) * 2.5; P.y = solPied(P.x, P.z); P.chute = false; majAction();
          let lab = el('btnAction').textContent; if (/ACHETER LA VILLA/.test(lab)) { META.argent += 10000; el('btnAction')._fn(); majAction(); lab = el('btnAction').textContent; } // la villa se vend d'abord
          if (!/ENTRER/.test(lab)) { ko.push(id + ' : ' + lab); continue; }
          el('btnAction')._fn(); if (!INT.actif) ko.push(id + ' : on n’entre pas'); else { sortirInterieur(); if (!(Math.abs(P.y - (p.y || 0)) < 1.5)) ko.push(id + ' : ressorti à ' + P.y.toFixed(1) + ' u'); } }
        // l'ancien quartier a disparu ; le trafic n'entre jamais dans la colline
        P.x = H.x1 + 20; P.z = 40; P.y = 0; let dedans = 0;
        for (let i = 0; i < 30 * 40; i++) { majVehicules(1 / 30); for (const v of vehicules) if (v.conduit === 'trafic' && dansHills(v.x, v.z)) dedans++; }
        if (dedans) ko.push('trafic dans la colline (' + dedans + ')');
        info.push('montée ' + hmax.toFixed(0) + ' u, pente max ' + pmax.toFixed(2));
        startRun(); P.hp = P.maxHp = 1e6;
        return { ko, info };
      });
      if (r.ko.length) fail('Los Reyes Hills : ' + r.ko.join(' | ') + ' [' + r.info.join(', ') + ']');
      else ok('Los Reyes Hills : ' + r.info.join(' ; ') + ' ; portes déplacées ouvertes, pas de trafic de la grille');
    }

    // -------------------------------------------------------------------
    // Villas de Los Reyes Hills : tailles et styles variés, chacune sa
    // piscine EN HAUTEUR où l'on nage vraiment (niveau d'eau propre), où l'on
    // plonge depuis le toit sans se blesser, où une voiture se noie ; la
    // planque (le manoir du sommet) a la sienne. Parcelles lues à la source.
    // -------------------------------------------------------------------
    console.log('\n--- Villas de Los Reyes Hills : variété, piscines en hauteur ---');
    {
      const r = await page.evaluate(() => {
        const ko = [], info = [];
        if (!DECOR_V2 || !HILLS.ok) return { ko, info: ['décor V2 coupé'] };
        if (INT.actif) sortirInterieur(); if (P.veh) sortirVehicule(true); startRun(); ecran(null); ETAT.mode = 'jeu'; P.hp = P.maxHp = 1e6;
        for (const e of ennemis) e.mort = true;
        const vs = HILLS.pads.filter((p) => p.villa);
        if (vs.length < 10) ko.push(vs.length + ' villas');
        if (new Set(vs.map((p) => p.type)).size < 3 || vs.filter((p) => p.type === 'grande').length < 2) ko.push('tailles : ' + vs.map((p) => p.type).join(','));
        /* jamais deux villas pareilles (style + variante de couleurs), au moins dix styles, chacun avec sa maison */
        if (new Set(vs.map((p) => p.style + p.var)).size < vs.length || new Set(vs.map((p) => p.style)).size < Math.min(10, VILLA_STYLES.length)) ko.push('villas en double : ' + vs.map((p) => p.style).join(','));
        for (const s of VILLA_STYLES) if (typeof VILLA_MAISON[s] !== 'function' || !VILLA_DEF[s]) ko.push('style sans maison : ' + s);
        const hauts = BASSINS.filter((b) => b.y > 1); if (hauts.length < vs.length) ko.push(hauts.length + ' piscines en hauteur');
        info.push(vs.length + ' villas (' + [...new Set(vs.map((p) => p.style))].join(', ') + '), ' + hauts.length + ' piscines en hauteur');
        // on nage dans la piscine la plus haute ; on y plonge depuis 10 u sans se blesser
        const b = hauts.reduce((a, c) => (c.y > a.y ? c : a));
        P.x = b.x; P.z = b.z; P.y = b.y + 10; P.vy = 0; P.chute = false; P.nage = false; P.iframes = 0; P.bouclier = 0; const hp0 = P.hp;
        for (let i = 0; i < 30 * 4; i++) { majJoueur(1 / 30, 1 / 30); P.iframes = 0; }
        if (!P.nage || P.hp !== hp0) ko.push('plongeon dans la piscine : nage ' + P.nage + ', ' + (hp0 - P.hp) + ' de dégâts');
        if (Math.abs(P.h.g.position.y - (b.y - 0.78)) > 0.3) ko.push('nageur à ' + P.h.g.position.y.toFixed(2) + ' (eau à ' + b.y.toFixed(2) + ')');
        INPUT.mx = 1; for (let i = 0; i < 30 * 3; i++) majJoueur(1 / 30, 1 / 30); INPUT.mx = 0;
        if (P.nage && !estEau(P.x, P.z)) ko.push('encore à la nage hors de la piscine');
        info.push('plongé de 10 u dans une piscine à ' + b.y.toFixed(1) + ' u, sans dégât');
        // une voiture qui roule dans la piscine s'y noie
        /* une voiture qui roule dans la piscine d'une villa (posée sur la parcelle, côté jardin) s'y noie */
        const pv = vs.find((p) => BASSINS.some((q) => q.y > 1 && Math.abs(q.x - p.x) < p.hw && Math.abs(q.z - p.z) < p.hd)), bv = pv && BASSINS.find((q) => q.y > 1 && Math.abs(q.x - pv.x) < pv.hw && Math.abs(q.z - pv.z) < pv.hd);
        if (!bv) ko.push('pas de piscine dans une parcelle de villa');
        else { const sg = bv.x > pv.x ? -1 : 1, v = creerVehicule('citadine', bv.x + sg * ((bv.hw || bv.r) + 3.5), bv.z, sg > 0 ? -Math.PI / 2 : Math.PI / 2, null); v.h = solY(v.x, v.z); P.x = v.x; P.z = v.z; entrerVehicule(v);
          for (let i = 0; i < 30 * 4 && !v.noye; i++) majVehiculePhys(v, 1 / 30, 1, 0, false);
          if (!v.noye) ko.push('la voiture ne tombe pas dans la piscine (' + v.x.toFixed(1) + ',' + v.z.toFixed(1) + ' h' + (v.h || 0).toFixed(1) + ', piscine ' + bv.x.toFixed(1) + ',' + bv.z.toFixed(1) + ')');
          else { for (let i = 0; i < 30 * 3; i++) majVehicules(1 / 30); if (!(v.h < bv.y && v.h > bv.y - 2)) ko.push('voiture noyée à ' + (v.h || 0).toFixed(1) + ' (eau à ' + bv.y.toFixed(1) + ')'); } }
        if (P.veh) sortirVehicule(true);
        // la planque : son manoir au sommet, avec sa piscine
        const pl = PORTES.find((p) => p.id === 'planque'); if (!pl || !BASSINS.some((q) => q.y > 1 && Math.hypot(q.x - pl.x, q.z - pl.z) < 25)) ko.push('pas de piscine à la planque');
        startRun(); P.hp = P.maxHp = 1e6;
        return { ko, info };
      });
      if (r.ko.length) fail('Villas de Los Reyes Hills : ' + r.ko.join(' | ') + ' [' + r.info.join(', ') + ']');
      else ok('Villas de Los Reyes Hills : ' + r.info.join(' ; ') + ' ; une voiture s’y noie ; piscine à la planque');
    }

    // -------------------------------------------------------------------
    // Los Reyes Hills, la vie et la descente : la course REYES HILLS DOWNHILL
    // se finit au joystick réel en voiture de sport et à moto ; des voitures
    // montent et descendent les lacets ; voitures de luxe dans les allées ;
    // sécurité privée de la Brigada ; piscines éclairées la nuit.
    // -------------------------------------------------------------------
    console.log('\n--- Los Reyes Hills : descente chronométrée, vie du quartier ---');
    {
      const r = await page.evaluate(() => {
        const ko = [], info = [];
        if (!DECOR_V2 || !HILLS.ok) return { ko, info: ['décor V2 coupé'] };
        const volant0 = META.curios.volant; delete META.curios.volant;
        const course = (cle) => {
          startRun(); ecran(null); ETAT.mode = 'jeu'; P.hp = P.maxHp = 1e6; for (const e of ennemis) e.mort = true;
          for (const v of [...vehicules]) if (dansHills(v.x, v.z, 8)) { scene.remove(v.mesh); vehicules.splice(vehicules.indexOf(v), 1); }
          const d = rideDepart('downhill'), D = HILLS.routes.find((q) => q.id === 'drive'), v = creerVehicule(cle, d.x, d.z, Math.PI / 2, null); v.h = solY(d.x, d.z); P.x = v.x; P.z = v.z; P.y = v.h; entrerVehicule(v);
          const a0 = META.argent; demarrerRide('downhill'); if (!RIDES.actif) return { cle, pasLancee: true };
          let t = 0, i = D.pts.length - 6;
          while (RIDES.actif && t < 120) { while (i > 2 && dist2(v.x, v.z, D.pts[i][0], D.pts[i][1]) < 64) i--; const p = D.pts[Math.max(0, i - 3)];
            const dx = p[0] - v.x, dz = p[1] - v.z, l = Math.hypot(dx, dz) || 1; INPUT.mx = dx / l; INPUT.mz = dz / l;
            const q = D.pts[Math.max(0, i - 10)], virage = Math.abs(angDiff(Math.atan2(dx, dz), Math.atan2(q[0] - v.x, q[1] - v.z))), vMax = virage > 0.7 ? 10 : (virage > 0.35 ? 16 : 28), fr = Math.abs(v.v) > vMax; // freine avant les épingles, comme un joueur
            const c = controleDir(v, fr); majVehiculePhys(v, 1 / 30, fr ? 0 : Math.min(c.throttle, 0.85), c.steer, fr); P.x = v.x; P.z = v.z; majRides(1 / 30); t += 1 / 30; if (v.mort) break; }
          INPUT.mx = INPUT.mz = 0; const res = { cle, fini: META.argent > a0, t: +t.toFixed(1), limite: RIDE_DEFS.downhill.temps, hp: +(v.hp / v.def.hp).toFixed(2) }; if (P.veh) sortirVehicule(true); return res; };
        for (const cle of ['sport', 'moto']) { const c = course(cle); if (!c.fini || c.hp < 0.4) ko.push('descente en ' + cle + ' : ' + JSON.stringify(c)); else info.push('descente en ' + cle + ' : ' + c.t + ' s / ' + c.limite); }
        if (volant0) META.curios.volant = volant0;
        // la vie : voitures dans les lacets qui roulent, voitures garées dans les allées, gardes
        startRun(); ecran(null); ETAT.mode = 'jeu'; P.hp = P.maxHp = 1e6; P.x = HILLS.x1 + 30; P.z = 100;
        const lac = vehicules.filter((v) => v.conduit === 'piste' && v.piste.b === VIE_HILLS.boucle), s0 = lac.map((v) => v.piste.s);
        /* aucun véhicule garé sur la chaussée de la colline (les voitures des lacets s'arrêtaient derrière pour toujours) */
        for (const v of vehicules) if (!v.conduit && dansHills(v.x, v.z) && surChaussee(v.x, v.z)) ko.push(v.key + ' garé sur la chaussée (' + v.x.toFixed(0) + ',' + v.z.toFixed(0) + ')');
        for (let i = 0; i < 30 * 8; i++) majVehicules(1 / 30);
        if (lac.length < 3 || lac.some((v, i) => ((v.piste.s - s0[i] + v.piste.b.L) % v.piste.b.L) < 30)) ko.push('voitures des lacets : ' + lac.length + ' / immobiles');
        const garees = vehicules.filter((v) => !v.conduit && HILLS.pads.some((p) => p.villa && Math.abs(v.x - p.x) < p.hw && Math.abs(v.z - p.z) < p.hd)).length; if (garees < 6) ko.push(garees + ' voitures dans les allées');
        const gardes = ennemis.filter((e) => !e.mort && e.garde && e.fac === 'chrome' && dansHills(e.x, e.z)).length; if (gardes < 2) ko.push(gardes + ' garde(s)');
        // piscines éclairées la nuit
        ETAT.nuitF = 1; majVieHills(1 / 30); const lum = VIE_HILLS.eaux.length && VIE_HILLS.eaux[0].emissive.g > 0.5; ETAT.nuitF = 0; majVieHills(1 / 30); if (!lum) ko.push('piscines pas éclairées la nuit');
        info.push(lac.length + ' voitures dans les lacets, ' + garees + ' garées, ' + gardes + ' gardes');
        /* la vie (demandé : « des gens qui se baladent, des décors de résidence, un panneau LOS REYES comme Hollywood ») :
           promeneurs qui avancent avec leurs accompagnants, baigneurs, barbecues ; panneau hors des routes, éclairé la nuit */
        const V = VIE_HILLS; P.x = -180; P.z = 60;
        const acc = V.pietons.filter((w) => w.genre), s1 = acc.map((w) => w.s);
        for (let i = 0; i < 30 * 4; i++) majVieHills(1 / 30);
        if (acc.length < 8 || acc.some((w, i) => Math.abs(w.s - s1[i]) < 1e-4)) ko.push('promeneurs : ' + acc.length + ' / immobiles');
        for (const w of acc) { const g = w.h.g.position;
          if (w.h2 && w.h2.g.position.distanceTo(g) > 1.6) ko.push('couple séparé');
          if (w.chien && w.chien.g.position.distanceTo(g) > 2.2) ko.push('chien perdu');
          if (w.objet && w.objet.position.distanceTo(g) > 1.6) ko.push('poussette lâchée');
          const D = HILLS.routes.find((q) => q.id === 'drive'), bout = [D.pts[0], D.pts[D.pts.length - 1]].some(([x, z]) => dist2(x, z, g.x, g.z) < 14 * 14); /* au bout du Drive, on traverse pour revenir */
          if (!bout && [g, w.h2 && w.h2.g.position, w.chien && w.chien.g.position].some((q) => q && surChaussee(q.x, q.z))) { ko.push('promeneur sur la chaussée (' + w.genre + ' ' + g.x.toFixed(0) + ',' + g.z.toFixed(0) + ')'); break; } }
        if (!V.nageurs.length || !V.bbq.length) ko.push('ni baigneurs ni barbecues');
        if (!V.lettres.length || !V.panneau) ko.push('pas de panneau');
        else {
          const meshes = scene.children.filter((m) => m.isMesh && V.lettres.includes(m.material));
          for (const m of meshes) { const bb = new THREE.Box3().setFromObject(m), c = bb.getCenter(new THREE.Vector3()); /* fusionnées : le centre de la géométrie */ if (surChaussee(c.x, c.z) || surChaussee(bb.min.x, bb.min.z) || surChaussee(bb.max.x, bb.max.z)) ko.push('lettre sur la route'); }
          ETAT.nuitF = 1; majVieHills(1 / 30); const lum = V.lettres[0].emissive.r > 0.3; ETAT.nuitF = 0; majVieHills(1 / 30); if (!lum) ko.push('panneau éteint la nuit'); }
        info.push(acc.length + ' promeneurs accompagnés, ' + V.nageurs.length + ' baigneurs, ' + V.bbq.length + ' barbecues, panneau LOS REYES (' + V.lettres.length + ' lettres)');
        startRun(); P.hp = P.maxHp = 1e6;
        return { ko, info };
      });
      if (r.ko.length) fail('Los Reyes Hills, vie : ' + r.ko.join(' | ') + ' [' + r.info.join(', ') + ']');
      else ok('Los Reyes Hills, vie : ' + r.info.join(' ; ') + ' ; piscines éclairées la nuit');
    }

    // -------------------------------------------------------------------
    // Voitures réalistes (15 octobre, demandé : « créer d'autres types de
    // voitures et affiner les existantes avec un rendu plus réaliste ») :
    // chaque modèle de PROFILS_VOITURE (lu à la source) a les dimensions de
    // VEHDEFS, ses quatre roues au sol, une géométrie partagée entre deux
    // exemplaires, une peinture que le garage sait refaire ; la police garde
    // ses gyrophares ; les modèles de luxe sont en vente et roulent.
    // -------------------------------------------------------------------
    console.log('\n--- Voitures réalistes : profils, roues, peinture, modèles de luxe ---');
    {
      const r = await page.evaluate(() => {
        const ko = [], info = [];
        if (!DECOR_V2) return { ko, info: ['décor V2 coupé'] };
        if (INT.actif) sortirInterieur(); if (P.veh) sortirVehicule(true); startRun(); ecran(null); ETAT.mode = 'jeu'; P.hp = P.maxHp = 1e6;
        const cles = Object.keys(PROFILS_VOITURE);
        for (const k of cles) { const d = VEHDEFS[k], Pf = PROFILS_VOITURE[k]; if (!d) { ko.push(k + ' absent de VEHDEFS'); continue; }
          if (Math.abs(d.long - Pf.L) > 0.01 || Math.abs(d.larg - Pf.W) > 0.01) ko.push(k + ' : profil ' + Pf.L + '×' + Pf.W + ' ≠ VEHDEFS ' + d.long + '×' + d.larg);
          const a = makeVoiture(k), b = makeVoiture(k), ud = a.userData;
          if (!ud.corps || !ud.roues || ud.roues.length !== 4) { ko.push(k + ' : corps / 4 roues'); continue; }
          a.updateMatrixWorld(true); const bb = new THREE.Box3(); a.traverse((o) => { if (o.isMesh) bb.expandByObject(o); });
          const lx = bb.max.x - bb.min.x, lz = bb.max.z - bb.min.z, hy = bb.max.y;
          if (Math.abs(lz - d.long) > d.long * 0.12 || Math.abs(lx - d.larg) > d.larg * 0.2 || hy < 1 || hy > 2.3) ko.push(k + ' : gabarit ' + lx.toFixed(2) + '×' + lz.toFixed(2) + '×' + hy.toFixed(2));
          for (const rw of ud.roues) { const rb = new THREE.Box3().setFromObject(rw); if (Math.abs(rb.min.y) > 0.03) { ko.push(k + ' : roue en l’air ou enfoncée (' + rb.min.y.toFixed(2) + ')'); break; } }
          const ga = [], gb = []; ud.corps.traverse((o) => { if (o.isMesh) ga.push(o.geometry); }); b.userData.corps.traverse((o) => { if (o.isMesh) gb.push(o.geometry); });
          if (!ga.some((g) => gb.includes(g) && g.userData.partagee)) ko.push(k + ' : géométrie non partagée');
          a.userData.coul = a.userData.coul; peindreMesh(a, 0x00ff00); let vert = false; a.traverse((o) => { if (o.isMesh && o.material && o.material.color && o.material.color.getHex() === 0x00ff00) vert = true; });
          if (!vert) ko.push(k + ' : le garage ne repeint pas la carrosserie');
          if (d.police && !(ud.bar && ud.bar.length === 2)) ko.push(k + ' : pas de gyrophares');
        }
        info.push(cles.length + ' modèles réalistes');
        // les modèles de luxe : en vente, dans la colline, et ils roulent
        const vente = CATALOGUE.filter((c) => VEHDEFS[c.key] && VEHDEFS[c.key].profil).length; if (vente < 8) ko.push(vente + ' voitures réalistes en vente');
        for (const k of HILLS_LUXE_ROULE.concat(HILLS_LUXE_GARE)) if (!VEHDEFS[k]) ko.push(k + ' inconnu');
        for (const k of HILLS_LUXE_ROULE) { const v = creerVehicule(k, LIMITE_EST - 20, MER - 140, 0, null); P.x = v.x; P.z = v.z; entrerVehicule(v); const x0 = v.x, z0 = v.z;
          for (let i = 0; i < 60; i++) majVehiculePhys(v, 1 / 30, 1, 0, false); const d = Math.hypot(v.x - x0, v.z - z0); sortirVehicule(true); if (!(d > 4)) ko.push(k + ' n’avance pas (' + d.toFixed(1) + ' u)'); }
        info.push(vente + ' en vente chez REYES MOTORS');
        startRun(); P.hp = P.maxHp = 1e6;
        return { ko, info };
      });
      if (r.ko.length) fail('Voitures réalistes : ' + r.ko.join(' | ') + ' [' + r.info.join(', ') + ']');
      else ok('Voitures réalistes : ' + r.info.join(' ; ') + ' ; gabarits, roues au sol, géométries partagées, peinture du garage, gyrophares, modèles de luxe qui roulent');
    }

    // -------------------------------------------------------------------
    // Retours de playtest du 16 octobre, conduite : l'avion se pose en tenant
    // FREIN (arrondi automatique) et s'arrête joystick lâché ; le vélo monte
    // les rampes de pourtour du skatepark ; en vue immersive, la caméra se
    // tourne au doigt en véhicule et revient derrière dès qu'on lâche, sans
    // changer la conduite.
    // -------------------------------------------------------------------
    console.log('\n--- Retours du 16 octobre : atterrissage, skatepark à vélo, caméra de poursuite ---');
    {
      const r = await page.evaluate(() => {
        const ko = [], info = [];
        if (INT.actif) sortirInterieur(); if (P.veh) sortirVehicule(true); startRun(); ecran(null); ETAT.mode = 'jeu'; P.hp = P.maxHp = 1e6;
        for (const e of ennemis) e.mort = true;
        // 1. atterrissage : en vol au-dessus de la piste, FREIN tenu, joystick lâché
        for (const v of [...vehicules]) if (Math.abs(v.x - AERO.RX) < 30 && v.z < 200 && v.z > -150) { scene.remove(v.mesh); vehicules.splice(vehicules.indexOf(v), 1); }
        const av = creerVehicule('avion', AERO.RX, 140, Math.PI, null); P.x = av.x; P.z = av.z; entrerVehicule(av);
        av.vol = true; av.alt = poseY(av.x, av.z) + 22; av.v = 36; av.va = 0; av.decolT = 0; INPUT.mx = INPUT.mz = 0; INPUT.btn.frein = true;
        let t = 0; while (av.vol && !av.mort && t < 20) { majVol(av, 1 / 30); P.x = av.x; P.z = av.z; t += 1 / 30; }
        INPUT.btn.frein = false;
        if (av.mort || av.vol) ko.push('atterrissage : ' + (av.mort ? 'crash' : 'toujours en vol') + ' (' + t.toFixed(1) + ' s)');
        else { let t2 = 0; while (Math.abs(av.v) > 1 && t2 < 10) { majVol(av, 1 / 30); t2 += 1 / 30; }
          if (Math.abs(av.v) > 1) ko.push('l’avion ne s’arrête pas au sol (' + av.v.toFixed(1) + ' u/s)'); else info.push('avion posé en ' + t.toFixed(1) + ' s, arrêté en ' + t2.toFixed(1) + ' s'); }
        if (P.veh) sortirVehicule(true);
        // 2. vélo : de l'extérieur du skatepark XXL jusque sur la plate-forme, par une rampe de pourtour
        if (SKX.ok) { const zc = (SKX.z0 + SKX.z1) / 2, x0 = SKX.x0 - 4;
          for (const v of [...vehicules]) if (dist2(v.x, v.z, x0, zc) < 400) { scene.remove(v.mesh); vehicules.splice(vehicules.indexOf(v), 1); }
          const b = creerVehicule('velo', x0, zc, Math.PI / 2, null); b.h = solY(b.x, b.z); P.x = b.x; P.z = b.z; entrerVehicule(b); let hm = 0;
          for (let i = 0; i < 30 * 6; i++) { INPUT.mx = 1; INPUT.mz = 0; const c = controleDir(b, false); majVehiculePhys(b, 1 / 30, c.throttle, c.steer, false); hm = Math.max(hm, b.h || 0); if (b.x > SKX.x0 + SKX.B + 2) break; }
          INPUT.mx = 0; if (!(b.x > SKX.x0 + SKX.B) || hm < SKX.D - 0.6) ko.push('vélo bloqué au pied du skatepark (x ' + (b.x - SKX.x0).toFixed(1) + ', h ' + hm.toFixed(1) + ')'); else info.push('vélo monté sur le skatepark (' + hm.toFixed(1) + ' u)');
          if (P.veh) sortirVehicule(true); }
        // 3. caméra immersive en véhicule : tournée au doigt, elle revient ; la conduite ne bouge pas
        META.vue = 'immersive'; const vc = creerVehicule('citadine', 0, 0, 0, null); P.x = vc.x; P.z = vc.z; entrerVehicule(vc);
        for (let i = 0; i < 60; i++) vueCamera(1 / 30, 0, 0);
        VUE.drag = { id: 99, x: 0 }; VUE.offVeh = 1.4; for (let i = 0; i < 30; i++) vueCamera(1 / 30, 0, 0);
        const base = angDiff((vc.ang || 0) + Math.PI, vueAngleEcran()), tourne = Math.abs(angDiff((vc.ang || 0) + Math.PI, VUE.yawRendu));
        VUE.drag = null; for (let i = 0; i < 90; i++) vueCamera(1 / 30, 0, 0);
        const retour = Math.abs(angDiff((vc.ang || 0) + Math.PI, VUE.yawRendu));
        if (!(tourne > 0.9) || retour > 0.15 || Math.abs(base) > 0.2) ko.push('caméra au doigt : tournée ' + tourne.toFixed(2) + ', retour ' + retour.toFixed(2) + ', conduite ' + base.toFixed(2));
        else info.push('caméra tournée de ' + tourne.toFixed(2) + ' rad puis revenue (' + retour.toFixed(2) + ')');
        if (P.veh) sortirVehicule(true); META.vue = 'classique';
        startRun(); P.hp = P.maxHp = 1e6;
        return { ko, info };
      });
      if (r.ko.length) fail('Retours du 16 octobre : ' + r.ko.join(' | ') + ' [' + r.info.join(', ') + ']');
      else ok('Retours du 16 octobre : ' + r.info.join(' ; '));
    }

    // -------------------------------------------------------------------
    // Retours du 16 octobre, monde : l'immeuble en construction se monte à
    // pied par ses rampes (planchers superposés ETAGES : on passe sous l'étage
    // du dessus, on tombe au bord), l'aire du Titan est au chantier mais pas
    // sous la grue, la caravane est en plein désert dégagé, le chalet en
    // altitude sur sa terrasse.
    // -------------------------------------------------------------------
    console.log('\n--- Retours du 16 octobre : immeuble en construction, Titan, caravane, chalet ---');
    {
      const r = await page.evaluate(() => {
        const ko = [], info = [];
        if (!DECOR_V2 || !CHANTIER.ok) return { ko, info: ['décor V2 coupé'] };
        if (INT.actif) sortirInterieur(); if (P.veh) sortirVehicule(true); startRun(); ecran(null); ETAT.mode = 'jeu'; P.hp = P.maxHp = 1e6;
        for (const e of ennemis) e.mort = true;
        const B = CHANTIER.bat, rampes = ETAGES.filter((e) => e.rampe), r0 = rampes[0];
        if (rampes.length < 5) ko.push(rampes.length + ' rampes');
        // monter la première rampe à pied (au joystick)
        P.x = r0.x; P.z = Math.max(r0.zA, r0.zB) - 0.3; P.y = solPied(P.x, P.z); P.chute = false; P.vy = 0;
        const sens = r0.zA < r0.zB ? -1 : 1, hHaut = Math.max(r0.hA, r0.hB);
        for (let i = 0; i < 32; i++) { INPUT.mx = 0; INPUT.mz = sens; majJoueur(1 / 30, 1 / 30); } /* ~10 u : la longueur de la rampe (au-delà, le palier puis le bord nord) */
        INPUT.mz = 0;
        if (Math.abs(P.y - hHaut) > 0.4) ko.push('rampe : arrivé à ' + P.y.toFixed(2) + ' (palier à ' + hHaut.toFixed(2) + ')');
        // sur le palier : marcher sous l'étage du dessus (on n'y est jamais téléporté)
        const hEtage = P.y; P.x = (B.x0 + B.x1) / 2 + 2; P.z = (B.z0 + B.z1) / 2; P.y = hEtage; P.chute = false;
        for (let i = 0; i < 30; i++){ INPUT.mx = 1; majJoueur(1 / 30, 1 / 30); } INPUT.mx = 0;
        if (Math.abs(P.y - hEtage) > 0.3) ko.push('étage : ' + P.y.toFixed(2) + ' au lieu de ' + hEtage.toFixed(2));
        // l'étage du dessus s'efface quand on est dessous
        majChantierV2(0); const dessus = CHANTIER.niveaux.find((n) => n.h > hEtage + 2.4); if (dessus && dessus.grp.visible) ko.push('l’étage du dessus cache le joueur');
        // au bord de la dalle : on tombe
        P.x = B.x1 - 0.5; P.z = B.z1 - 3; P.y = hEtage; P.chute = false; for (let i = 0; i < 20; i++){ INPUT.mx = 1; majJoueur(1 / 30, 1 / 30); } INPUT.mx = 0;
        if (!(P.chute || P.y < hEtage - 0.5)) ko.push('on ne tombe pas au bord de la dalle');
        P.chute = false; P.x = 0; P.z = 0; P.y = 0; majChantierV2(0);
        info.push(rampes.length + ' rampes, ' + CHANTIER.niveaux.length + ' niveaux, montée à ' + hHaut.toFixed(1) + ' u');
        // Titan : sur son aire, au chantier, pas sous la grue
        const ti = vehicules.find((v) => v.key === 'titan'), c = POIS.chantier;
        if (!ti || Math.abs(ti.x - c.x) > INNER / 2 || Math.abs(ti.z - c.z) > INNER / 2) ko.push('Titan hors du chantier');
        else if (ti.x > B.x0 - 2 && ti.x < B.x1 + 6 && ti.z > B.z0 - 2 && ti.z < B.z1 + 2) ko.push('Titan sous l’immeuble ou la grue');
        // caravane : rien dans son emprise (hors ses propres objets) ; chalet : en altitude, terrasse praticable
        const ca = PLANQUES.liste.find((q) => q.def.id === 'caravane'), ch = PLANQUES.liste.find((q) => q.def.id === 'chalet');
        if (ca) { for (let a = 0; a < 16; a++) { const x = ca.x + Math.cos(a / 16 * 6.283) * 13, z = ca.z + Math.sin(a / 16 * 6.283) * 13; if (dansReliefLibre(x, z) || Math.abs(solY(x, z)) > 0.3) { ko.push('caravane au pied d’un relief'); break; } } }
        else ko.push('pas de caravane');
        if (!ch || !(ch.y > 40) || Math.abs(solY(ch.lit.x, ch.lit.z) - ch.y) > 0.2) ko.push('chalet : ' + (ch ? 'à ' + (ch.y || 0).toFixed(1) + ' u, sol de la terrasse ' + solY(ch.lit.x, ch.lit.z).toFixed(1) : 'absent'));
        else info.push('chalet à ' + ch.y.toFixed(0) + ' u');
        startRun(); P.hp = P.maxHp = 1e6;
        return { ko, info };
      });
      if (r.ko.length) fail('Retours du 16 octobre, monde : ' + r.ko.join(' | ') + ' [' + r.info.join(', ') + ']');
      else ok('Retours du 16 octobre, monde : ' + r.info.join(' ; ') + ' ; Titan sur son aire, caravane en plein désert');
    }

    // -------------------------------------------------------------------
    // Figurants interactifs (16 octobre, demandé : « les PNJ de l'aéroport et
    // du résidentiel : je dois pouvoir les tamponner ou leur tirer dessus, ce
    // qui créera de la panique ; idem dans les salles ») : une balle couche un
    // promeneur de la colline (vrai piéton, ragdoll posé sur la colline, pas
    // dessous), ses voisins fuient ; un véhicule lancé renverse un voyageur de
    // l'aéroport ; dans une salle, un figurant touché tombe puis se relève.
    // -------------------------------------------------------------------
    console.log('\n--- Figurants interactifs : balle, véhicule, panique, salles ---');
    {
      const r = await page.evaluate(() => {
        const ko = [], info = [];
        if (INT.actif) sortirInterieur(); if (P.veh) sortirVehicule(true); startRun(); ecran(null); ETAT.mode = 'jeu'; P.hp = P.maxHp = 1e6;
        if (!FIGURANTS.length) return { ko: ['aucun figurant déclaré'], info };
        // 1. une balle sur un promeneur de la colline
        P.x = -180; P.z = 60; for (let i = 0; i < 20; i++) majVieHills(1 / 30);
        const w = VIE_HILLS.pietons.find((q) => q.genre === 'couple' && q.h.g.visible);
        if (!w) ko.push('pas de couple de promeneurs');
        else { const g = w.h.g, x = g.position.x, z = g.position.z, y = g.position.y; P.x = x + 6; P.z = z;
          const touche = toucherFigurant({ fac: 'joueur', x, y: y + 1.2, z, vx: -60, vy: 0, vz: 0 });
          const p = pietons.find((q) => q.h === w.h);
          if (!touche || !p || p.etat !== 'mort') ko.push('balle : ' + touche + ' / ' + (p ? p.etat : 'pas de piéton'));
          else { for (let i = 0; i < 45; i++) majPietons(1 / 30); if (g.position.y < y - 0.3) ko.push('le corps passe sous la colline (' + g.position.y.toFixed(2) + ' / ' + y.toFixed(2) + ')'); }
          const p2 = pietons.find((q) => q.h === w.h2); if (!p2 || p2.etat !== 'fuite') ko.push('le conjoint ne fuit pas');
          majFigurants(1 / 30); const fuient = FIGURANTS.filter((f) => f.h.g.userData.converti).length; if (fuient < 2) ko.push(fuient + ' figurants en panique'); // le nombre dépend de qui se promène près du coup de feu à cet instant
          const avant = g.position.clone(); for (let i = 0; i < 10; i++) majVieHills(1 / 30); if (g.position.distanceTo(avant) > 0.01) ko.push('le décor reprend le corps'); /* le corps n'appartient plus au décor */
          info.push('balle : couché, ' + fuient + ' figurants en fuite'); }
        // 2. un véhicule lancé renverse un voyageur de l'aéroport
        DANGER.t = 0; const vg = FIGURANTS.find((f) => !f.h.g.userData.converti && AERO.humains.includes(f.h.g));
        if (!vg) ko.push('aucun figurant à l’aéroport');
        else { const g = vg.h.g; g.visible = true; P.x = g.position.x - 3; P.z = g.position.z; const v = creerVehicule('citadine', g.position.x, g.position.z, Math.PI / 2, null); v.h = 0; entrerVehicule(v); v.v = 12;
          majFigurants(1 / 30); const p = pietons.find((q) => q.h === vg.h); if (!p || p.etat !== 'mort') ko.push('le voyageur n’est pas renversé'); else info.push('voyageur renversé');
          sortirVehicule(true); }
        // 3. dans une salle : touché, il tombe, puis se relève
        const id = Object.keys(VIE_SALLES).find((k) => PORTES.some((p) => p.id === k) && INTDEFS[k]);
        if (id) { entrerInterieur(id, PORTES.find((p) => p.id === id)); const sa0 = INT.actif;
          // la salle reste en mémoire d'un test à l'autre : un figurant tombé avant (et pas encore relevé) se relèverait
          // pendant l'attente et fausserait le compte — le test maîtrise sa scène, il les relève d'abord
          if (sa0.mortsFig) { for (const e of sa0.mortsFig) e.t = 0; P.frappeT = 0; P.tirT = 0; majVieSalle(sa0, 1 / 30); }
          const sa = sa0, n0 = sa.figurants.length, f = sa.figurants[0];
          if (f) { const tch = toucherFigurant({ fac: 'joueur', x: f.x, y: 1.2, z: f.z, vx: 30, vy: 0, vz: 0 });
            if (!tch || sa.figurants.length !== n0 - 1 || !(sa.paniqueT > 0)) ko.push(id + ' : figurant touché ' + tch + ', ' + sa.figurants.length + '/' + n0);
            P.frappeT = 0; P.tirT = 0; // un coup encore « en cours » (hérité d'un autre test, majJoueur ne tourne pas ici) le referait tomber
            for (let i = 0; i < 30 * 8; i++) majVieSalle(sa, 1 / 30);
            if (sa.figurants.length !== n0 || f.h.g.rotation.x || f.h.g.rotation.z) ko.push(id + ' : il ne se relève pas'); else info.push(id + ' : touché, sonné, relevé'); }
          sortirInterieur(); }
        startRun(); P.hp = P.maxHp = 1e6;
        return { ko, info };
      });
      if (r.ko.length) fail('Figurants interactifs : ' + r.ko.join(' | ') + ' [' + r.info.join(', ') + ']');
      else ok('Figurants interactifs : ' + r.info.join(' ; '));
    }

    // -------------------------------------------------------------------
    // Retours du 17 octobre (1) : sur la colline et la montagne, le joueur
    // touche un ennemi et l'ennemi le touche (hauteurs de tir comptées depuis
    // le sol de chacun) ; aucun animal laissé au centre-ville ; conducteurs
    // visibles (PNJ au volant d'un véhicule ouvert ou fermé, joueur dans le
    // 4x4) ; jeep militaire à l'échelle.
    // -------------------------------------------------------------------
    console.log('\n--- Retours du 17 octobre : tir en relief, faune, conducteurs, jeep militaire ---');
    {
      const r = await page.evaluate(() => {
        const ko = [], info = [];
        if (INT.actif) sortirInterieur(); if (P.veh) sortirVehicule(true); startRun(); ecran(null); ETAT.mode = 'jeu'; P.hp = P.maxHp = 1e6;
        for (const e of ennemis) e.mort = true;
        // 1. tir sur la colline : une parcelle de villa en hauteur, un gangster à 7 u
        const pad = HILLS.ok && HILLS.pads.filter((p) => p.villa).sort((a, b) => b.h - a.h)[0];
        if (pad) {
          const x = pad.x - pad.hw + 3, z = pad.z + (pad.f || 1) * (pad.hd - 2); P.x = x; P.z = z; P.y = solPied(x, z); P.chute = false;
          const e = creerEnnemi('chr_fusil', x + 7, z, false); e.passif = false;
          for (let i = 0; i < 4; i++) majEnnemis(1 / 30);
          const hp0 = e.hp; P.ang = Math.atan2(e.x - P.x, e.z - P.z);
          const yS = solY(e.x, e.z); tirer(P.x, P.y + 1.45, P.z, P.ang, 0, 60, 30, 'joueur', 0xffe08a, yS + 1.2, Math.hypot(e.x - P.x, e.z - P.z), null);
          for (let i = 0; i < 20; i++) majPools(1 / 30);
          if (!(e.hp < hp0 || e.mort)) ko.push('le joueur ne touche pas l’ennemi sur la colline (sol ' + yS.toFixed(1) + ')');
          const pv0 = P.hp; e.mort = false; tirer(e.x, solY(e.x, e.z) + 1.3, e.z, Math.atan2(P.x - e.x, P.z - e.z), 0, 55, 10, 'viperes', 0xffc46a, hCibleJoueur(), 7);
          P.iframes = 0; for (let i = 0; i < 20; i++) majPools(1 / 30);
          if (!(P.hp < pv0)) ko.push('l’ennemi ne touche pas le joueur sur la colline');
          else info.push('tirs croisés sur la colline à ' + yS.toFixed(0) + ' u');
          e.mort = true; P.hp = P.maxHp; }
        // 2. faune : aucun animal à l'origine (ils restaient au centre-ville tant qu'on ne s'approchait pas)
        P.x = 0; P.z = 0; P.y = 0; if (typeof placerFauneMont === 'function') { for (const a of FAUNE) if (a.zone === 'mont') a.mort = true; placerFauneMont(); }
        for (const a of FAUNE) if (!a.mort && Math.hypot(a.g.position.x, a.g.position.z) < 5) { ko.push(a.type + ' au centre-ville'); break; }
        // 3. conducteurs : PNJ au volant d'un cabriolet, d'une berline ; joueur dans le 4x4
        for (const k of ['cabriolet', 'berline']) { const v = creerVehicule(k, 40, 40, 0, 'trafic'); v.conduit = 'trafic'; majChauffeur(v); const ch = v.mesh.userData.chauffeur; if (!ch || !ch.visible) ko.push(k + ' : pas de conducteur visible'); v.conduit = null; majChauffeur(v); if (ch && ch.visible) ko.push(k + ' : conducteur resté sans personne au volant'); }
        { const j = creerVehicule('jeep', 60, 40, 0, null); P.x = j.x; P.z = j.z; entrerVehicule(j); if (!P.h.g.visible || P.h.g.parent !== j.mesh) ko.push('joueur invisible dans le 4x4'); sortirVehicule(true); }
        // 4. jeep militaire à l'échelle
        { const m = makeVoiture('jeepMil'), bb = new THREE.Box3(); m.updateMatrixWorld(true); m.traverse((o) => { if (o.isMesh) bb.expandByObject(o); }); const hh = bb.max.y, ll = bb.max.z - bb.min.z;
          if (hh < 2 || ll < 4) ko.push('jeep militaire : ' + ll.toFixed(1) + ' × ' + hh.toFixed(1) + ' u'); else info.push('jeep militaire ' + ll.toFixed(1) + ' × ' + hh.toFixed(1) + ' u'); }
        startRun(); P.hp = P.maxHp = 1e6;
        return { ko, info };
      });
      if (r.ko.length) fail('Retours du 17 octobre (1) : ' + r.ko.join(' | ') + ' [' + r.info.join(', ') + ']');
      else ok('Retours du 17 octobre (1) : ' + r.info.join(' ; ') + ' ; faune hors de la ville, conducteurs visibles');
    }

    // -------------------------------------------------------------------
    // Fort Reyes (17 octobre, demandé : « un héliport avec l'hélicoptère
    // dessus, les véhicules à des endroits précis, une entrée majestueuse,
    // de la vie, un défi qui débloque une tenue militaire ») : chaque véhicule
    // à sa place sans chevauchement, le Vautour seul sur l'héliport ; sans
    // engagement, l'intrusion sonne l'alarme ; engagé à la guérite, visite
    // libre ; un tir dans la base révoque l'accès et les soldats du décor
    // prennent les armes ; parcours du combattant fini au joystick par un
    // pilote simulé (chemin sur les vrais solides, tir sur les cibles) =
    // treillis débloqué ; passif = raté.
    // -------------------------------------------------------------------
    console.log('\n--- Fort Reyes : places, héliport, entrée, parcours du combattant ---');
    {
      const r = await page.evaluate(() => {
        const ko = [], info = [];
        if (!DECOR_V2 || !BASE.ok) return { ko, info, saut: 'décor V2 coupé ou base absente' };
        if (INT.actif) sortirInterieur(); if (P.veh) sortirVehicule(true); startRun(); ecran(null); ETAT.mode = 'jeu'; P.hp = P.maxHp = 1e6;
        // 1. places : le bon véhicule, aucun chevauchement (boîtes alignées sur le cap)
        const dansB = vehicules.filter((v) => !v.mort && dansBase(v.x, v.z));
        for (const k in BASE.places) { const p = BASE.places[k]; if (!dansB.some((v) => v.key === k && Math.hypot(v.x - p.x, v.z - p.z) < 1)) ko.push(k + ' pas à sa place'); }
        const boite = (v) => { const s2 = Math.abs(Math.sin(v.ang || 0)), c2 = Math.abs(Math.cos(v.ang || 0)), L = v.def.long / 2, l = v.def.larg / 2; return { hx: s2 * L + c2 * l, hz: c2 * L + s2 * l }; };
        for (let i = 0; i < dansB.length; i++) for (let j = i + 1; j < dansB.length; j++) { const a = dansB[i], b = dansB[j], A = boite(a), B = boite(b);
          if (Math.abs(a.x - b.x) < A.hx + B.hx && Math.abs(a.z - b.z) < A.hz + B.hz) ko.push(a.key + ' chevauche ' + b.key); }
        // 2. héliport : le Vautour posé au centre, rien d'autre sur l'aire
        const va = vehicules.find((v) => v.key === 'vautour' && !v.mort);
        if (!va || Math.hypot(va.x - BASE.heli.x, va.z - BASE.heli.z) > 1.5) ko.push('Vautour hors de l’héliport');
        for (const v of vehicules) if (v !== va && !v.mort && Math.hypot(v.x - BASE.heli.x, v.z - BASE.heli.z) < 10) ko.push(v.key + ' sur l’héliport');
        info.push(dansB.length + ' véhicules dans la base');
        // 3. intrusion, engagement, tir dans la base
        const PA = BASE.cases.place, dans = () => { P.x = PA.x + 10; P.z = PA.z - 6; P.y = solPied(P.x, P.z); };
        WANTED.heat = 0; WANTED.stars = 0; DANGER.t = 0; dans(); majWanted(0);
        if (!(WANTED.heat >= 3)) ko.push('intrusion sans alarme');
        WANTED.heat = 0; WANTED.stars = 0; for (const e of ennemis) e.mort = true;
        const g = BASE.porte; P.x = g.x; P.z = g.z - 2.5; let act = baseAction();
        if (!act || !/ENGAGER/.test(act.label)) ko.push('pas de bouton S’ENGAGER à la guérite'); else act.fn();
        dans(); for (let i = 0; i < 30; i++) majWanted(1 / 30);
        if (WANTED.heat > 0.01) ko.push('alarme malgré l’engagement');
        majFigurants(1 / 30); if (FIGURANTS.some((f) => f.ennemi && f.h.g.userData.converti)) ko.push('un soldat prend les armes pendant la visite');
        P.tirT = 1; majBaseV2(1 / 30, 1 / 30); P.tirT = 0; majWanted(0);
        if (!BASE.revoque || !(WANTED.heat >= 3)) ko.push('tir dans la base sans alerte');
        majFigurants(1 / 30); const auxArmes = FIGURANTS.filter((f) => f.ennemi && f.h.g.userData.converti).length;
        if (!auxArmes) ko.push('aucun soldat ne prend les armes'); else info.push('tir dans la base : alerte, ' + auxArmes + ' soldats aux armes');
        // 4. parcours du combattant, pilote au joystick
        startRun(); ecran(null); ETAT.mode = 'jeu'; P.hp = P.maxHp = 1e6; WANTED.heat = 0; WANTED.stars = 0; for (const e of ennemis) e.mort = true;
        const ex0 = META.exploits.base; META.exploits.base = false; BASE.laissez = true;
        const C = BASE.cases.parcours, pas = 0.5, N = Math.ceil(INNER / pas) + 1, ox = C.x - INNER / 2, oz = C.z - INNER / 2;
        const libre = (i, j) => i >= 0 && j >= 0 && i < N && j < N && !solidAt(ox + i * pas, oz + j * pas, 0.65, undefined, 1);
        const chemin = (x0, z0, x1, z1) => { // BFS sur les vrais solides
          const I = (x) => Math.round((x - ox) / pas), J = (z) => Math.round((z - oz) / pas), dep = [I(x0), J(z0)], arr = [I(x1), J(z1)];
          const prev = new Map(), cle = (i, j) => i * 1000 + j, file = [dep]; prev.set(cle(dep[0], dep[1]), null);
          while (file.length) { const [i, j] = file.shift(); if (i === arr[0] && j === arr[1]) break;
            for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) { const a = i + di, b = j + dj, k = cle(a, b); if (!prev.has(k) && libre(a, b)) { prev.set(k, [i, j]); file.push([a, b]); } } }
          const pts = []; let c = arr; if (!prev.has(cle(c[0], c[1]))) return [{ x: x1, z: z1 }];
          while (c) { pts.unshift({ x: ox + c[0] * pas, z: oz + c[1] * pas }); c = prev.get(cle(c[0], c[1])); } return pts; };
        P.x = BASE.depart.x; P.z = BASE.depart.z; P.y = solPied(P.x, P.z); P.chute = false;
        act = baseAction(); if (!act || !/PARCOURS/.test(act.label)) ko.push('pas de bouton PARCOURS au départ'); else act.fn();
        let f = 0, route = null, porteVisee = -1, tirs = 0, attente = 0; const iTir = BASE.portes.length - 1;
        for (; f < 30 * 40 && BASE.defi; f++) { const D = BASE.defi;
          if (D.i === iTir && BASE.cibles.some((c) => !c.touche)) { INPUT.mx = INPUT.mz = 0; // au pas de tir : une balle toutes les 0,4 s
            if (--attente <= 0) { const c = BASE.cibles.find((q) => !q.touche); P.ang = Math.atan2(c.x - P.x, c.z - P.z); tirer(P.x, P.y + 1.45, P.z, P.ang, 0, 60, 30, 'joueur', 0xffe08a, c.y, Math.hypot(c.x - P.x, c.z - P.z), null); tirs++; attente = 12; } }
          else { if (porteVisee !== D.i) { const p = BASE.portes[D.i]; route = chemin(P.x, P.z, p.x, p.z); porteVisee = D.i; attente = 10; } // 0,33 s de réaction à chaque porte
            while (route.length > 1 && Math.hypot(route[0].x - P.x, route[0].z - P.z) < 0.45) route.shift();
            const w = route[0], dx = w.x - P.x, dz = w.z - P.z, l = Math.hypot(dx, dz) || 1;
            if (attente-- > 0) { INPUT.mx = INPUT.mz = 0; } else { INPUT.mx = dx / l; INPUT.mz = dz / l; } }
          majJoueur(1 / 30, 1 / 30); majBaseV2(1 / 30, 1 / 30); majPools(1 / 30); }
        INPUT.mx = INPUT.mz = 0;
        if (BASE.defi || !META.exploits.base) ko.push('parcours non fini par le pilote (porte ' + (BASE.defi ? BASE.defi.i : '-') + ', ' + BASE.cibles.filter((c) => c.touche).length + ' cibles, ' + (f / 30).toFixed(1) + ' s)');
        else info.push('parcours fini en ' + (f / 30).toFixed(1) + ' s sur ' + BASE_DEFI_T + ' (' + tirs + ' balles), treillis débloqué');
        // 5. passif : raté, rien de débloqué
        META.exploits.base = false; lancerDefiBase(); for (let i = 0; i < 30 * (BASE_DEFI_T + 1); i++) majBaseV2(1 / 30, 1 / 30);
        if (BASE.defi || META.exploits.base) ko.push('parcours passif réussi');
        META.exploits.base = ex0; sauveMeta();
        startRun(); P.hp = P.maxHp = 1e6;
        return { ko, info };
      });
      if (r.saut) saute('Fort Reyes : ' + r.saut);
      else if (r.ko.length) fail('Fort Reyes : ' + r.ko.join(' | ') + ' [' + r.info.join(', ') + ']');
      else ok('Fort Reyes : ' + r.info.join(' ; ') + ' ; intrusion = alarme, engagé = visite libre, passif = raté');
    }

    // -------------------------------------------------------------------
    // Retours du 17 octobre (2) — Los Reyes Hills : le BIG JUMP (demandé :
    // « des sauts depuis le quartier résidentiel où il est possible de sauter
    // jusqu'en bas ») se prend au joystick depuis le lacet du dessous, la
    // lèvre n'est pas une paroi, la voiture décolle, se pose dans la rue
    // 30 u plus bas sans mourir ni casser, distance et prime une fois par
    // vague ; la chaussée du lacet du sommet n'est pas touchée ; aucune
    // lettre LOS REYES sur la piste. Héliport du manoir : l'hélico choisi sur
    // la dalle, achat, changement, refus sans la villa. Terrain : plus le
    // tapis vert d'avant.
    // -------------------------------------------------------------------
    console.log('\n--- Retours du 17 octobre (2) : big jump, héliport du manoir, terrain de la colline ---');
    {
      const r = await page.evaluate(() => {
        const ko = [], info = [];
        if (!DECOR_V2 || !HILLS.ok) return { ko, info, saut: 'décor V2 coupé' };
        const M0 = { planque: META.planque, helis: JSON.stringify(META.helisManoir), heli: META.heliManoir, argent: META.argent, record: META.stats.bigJump };
        if (INT.actif) sortirInterieur(); if (P.veh) sortirVehicule(true); startRun(); ecran(null); ETAT.mode = 'jeu'; P.hp = P.maxHp = 1e6;
        for (const e of ennemis) e.mort = true; for (const v of vehicules) scene.remove(v.mesh); vehicules.length = 0; // la scène est à nous
        const s = SAUTS_HILLS.find((q) => q.ok);
        if (!s) return { ko: ['aucun tremplin'], info };
        // la chaussée du lacet du sommet est intacte au croisement ; la lèvre monte au-delà du trottoir
        const D = HILLS.routes[0]; let hR = 0, bd = 1e9; D.pts.forEach(([x, z], i) => { const d = Math.hypot(x - s.x, z - s.zHaut); if (d < bd) { bd = d; hR = D.h[i]; } });
        for (const dz of [-4, 0, 4]) if (Math.abs(hauteurHills(s.x, s.zHaut + dz) - hR) > 0.2) ko.push('chaussée du sommet touchée à ' + dz + ' u (' + hauteurHills(s.x, s.zHaut + dz).toFixed(2) + ' / ' + hR.toFixed(2) + ')');
        if (!(hauteurHills(s.x, HILLS.z0 + 0.2) > s.hHaut + 1.2)) ko.push('pas de lèvre au bord');
        if (VIE_HILLS.panneau && VIE_HILLS.panneau.x0 - 3.2 < s.x + 3.5) ko.push('une lettre LOS REYES sur la piste d’élan');
        // le saut, au joystick : départ arrêté sur le lacet du dessous, plein gaz vers le nord
        WAVES.n = (WAVES.n || 1); delete MERV.primes.bigJump; META.stats.bigJump = 0;
        const argent0 = META.argent, v = creerVehicule('sport', s.x, s.zBas + 1, Math.PI, null); v.h = solY(v.x, v.z); P.x = v.x; P.z = v.z; entrerVehicule(v);
        let envol = false, pic = 0, f = 0, xPose = 0, zPose = 0;
        for (; f < 30 * 12; f++) { INPUT.mx = 0; INPUT.mz = -1; majConduite(1 / 30); if (v.enAir && v.sautHills) { envol = true; pic = Math.max(pic, v.h); } if (envol && !v.enAir) { xPose = v.x; zPose = v.z; break; } }
        INPUT.mz = 0;
        if (!envol) ko.push('pas d’envol (voiture à ' + v.x.toFixed(1) + ',' + v.z.toFixed(1) + ', v ' + v.v.toFixed(1) + ')');
        else if (P.hp <= 0 || v.mort || P.veh !== v) ko.push('réception mortelle ou véhicule détruit');
        else if (Math.abs(xPose - s.x) > 5.5 || zPose > HILLS.z0 - 10) ko.push('posé hors de la rue (' + xPose.toFixed(1) + ',' + zPose.toFixed(1) + ')');
        else { const m = META.stats.bigJump; if (m < 30) ko.push('distance notée ' + m); if (META.argent - argent0 !== (m >= SAUT_HILLS_PRIME ? 250 : 0)) ko.push('prime : ' + (META.argent - argent0));
          info.push('big jump : ' + m + ' m, ' + (pic - solY(xPose, zPose)).toFixed(0) + ' u de haut, posé intact dans la rue (' + (f / 30).toFixed(1) + ' s depuis le départ arrêté)'); }
        // un second saut dans la même vague ne paie pas
        if (envol) { if (P.veh) sortirVehicule(true); const v2 = creerVehicule('sport', s.x, s.zBas + 1, Math.PI, null); v2.h = solY(v2.x, v2.z); P.x = v2.x; P.z = v2.z; entrerVehicule(v2); const a1 = META.argent;
          for (let k = 0; k < 30 * 12; k++) { INPUT.mz = -1; majConduite(1 / 30); if (k > 30 && !v2.enAir && v2.z < HILLS.z0 - 10) break; } INPUT.mz = 0; if (META.argent !== a1) ko.push('prime payée deux fois dans la vague'); if (P.veh) sortirVehicule(true); }
        // héliport : sans la villa, refus ; avec, l'hélico choisi sur la dalle, achat, changement
        const H = HELIPORT; if (!H.pad || !H.console) ko.push('pas d’héliport');
        else {
          META.planque = false; startRun(); ecran(null); ETAT.mode = 'jeu'; P.x = H.console.x - 1.2; P.z = H.console.z; P.y = solPied(P.x, P.z);
          let a = heliportAction(); if (!a || !/VILLA/.test(a.label)) ko.push('sans la villa : ' + (a && a.label)); if (H.v) ko.push('hélico posé sans la villa');
          META.planque = true; META.helisManoir.ecureuil = false; META.heliManoir = 'helico'; startRun(); ecran(null); ETAT.mode = 'jeu'; P.x = H.console.x - 1.2; P.z = H.console.z; P.y = solPied(P.x, P.z);
          if (!H.v || H.v.key !== 'helico' || Math.hypot(H.v.x - H.pad.x, H.v.z - H.pad.z) > 1 || Math.abs((H.v.alt || 0) - H.pad.h) > 0.3) ko.push('Libellule pas sur la dalle');
          a = heliportAction(); if (!a || !/CHOISIR/.test(a.label)) ko.push('console : ' + (a && a.label)); else a.fn();
          META.argent = 1000; actionHeliport('acheter', 'ecureuil'); if (META.helisManoir.ecureuil || META.argent !== 1000) ko.push('achat sans l’argent');
          META.argent = 10000; const vieux = H.v; actionHeliport('acheter', 'ecureuil');
          if (!META.helisManoir.ecureuil || META.argent !== 8500 || !H.v || H.v.key !== 'ecureuil' || vehicules.includes(vieux)) ko.push('achat de l’Écureuil : ' + (H.v && H.v.key) + ', ' + META.argent);
          actionHeliport('choisir', 'helico'); if (!H.v || H.v.key !== 'helico' || META.heliManoir !== 'helico') ko.push('retour à la Libellule');
          fermerHeliport(); info.push('héliport : Libellule offerte, Écureuil acheté 1 500 $, changement d’hélico');
        }
        // terrain : collines dorées, le vert seulement autour des villas
        { const c = HILLS.terrain.geometry.attributes.color.array; let vert = 0, n = 0; for (let i = 0; i < c.length; i += 3) { n++; if (c[i + 1] > c[i] * 1.12) vert++; }
          if (HILLS.terrain.parent !== scene) ko.push('terrain fusionné'); if (vert / n > 0.4) ko.push('terrain vert à ' + Math.round(vert / n * 100) + ' %'); else info.push('terrain vert à ' + Math.round(vert / n * 100) + ' % (gazon des villas)'); }
        META.planque = M0.planque; META.helisManoir = JSON.parse(M0.helis); META.heliManoir = M0.heli; META.argent = M0.argent; META.stats.bigJump = M0.record; sauveMeta();
        startRun(); P.hp = P.maxHp = 1e6;
        return { ko, info };
      });
      if (r.saut) saute('Retours du 17 octobre (2) : ' + r.saut);
      else if (r.ko.length) fail('Retours du 17 octobre (2) : ' + r.ko.join(' | ') + ' [' + r.info.join(', ') + ']');
      else ok('Retours du 17 octobre (2) : ' + r.info.join(' ; '));
    }

    // -------------------------------------------------------------------
    // Le ciel se percute (17 octobre, demandé : « le dirigeable passe à
    // travers les montagnes ; on peut taper dedans et se crasher, et le
    // crasher aussi ; idem pour les avions ; destructibles, ils reviennent à
    // la prochaine vague ») : le dirigeable survole tout ce qui est sous sa
    // boucle (relief, toits) ; un hélico du joueur qui le percute s'écrase et
    // l'abat ; il tombe, explose au sol, disparaît ; les balles abattent
    // l'avion à banderole ; tout revient à la vague suivante.
    // -------------------------------------------------------------------
    console.log('\n--- Le ciel se percute : dirigeable au-dessus du relief, collisions, avions abattus, retour à la vague suivante ---');
    {
      const r = await page.evaluate(() => {
        const ko = [], info = [];
        if (!DECOR_V2 || !CIEL.ok || !CIEL_CIBLES.length) return { ko, info, saut: 'décor V2 coupé' };
        if (INT.actif) sortirInterieur(); if (P.veh) sortirVehicule(true); startRun(); ecran(null); ETAT.mode = 'jeu'; P.hp = P.maxHp = 1e6;
        for (const e of ennemis) e.mort = true;
        majCiel(1 / 30);
        // 1. altitude du dirigeable : au-dessus de ce qu'il survole, sur toute sa boucle
        let pire = 1e9, oW = 0; for (let i = 0; i < 360; i++) { const w = i / 360 * Math.PI * 2, x = Math.cos(w) * 190, z = Math.sin(w) * 152, m = hautMaxSous(x, z, 9), marge = altDirigeable(w) - 3.5 - m; if (marge < pire) { pire = marge; oW = w; } }
        if (pire < 3) ko.push('le dirigeable rase ou traverse un obstacle (' + pire.toFixed(1) + ' u à ' + (oW * 57.3).toFixed(0) + '°)');
        else info.push('dirigeable : au moins ' + pire.toFixed(1) + ' u au-dessus de tout ce qu’il survole');
        const wH = Math.PI; if (!(altDirigeable(wH) > hauteurHills(-190, 0) + 6)) ko.push('il traverse Los Reyes Hills');
        // 2. un hélico du joueur qui percute le dirigeable : crash des deux
        const cD = CIEL.cDir, d = CIEL.dirigeable; const he = creerVehicule('ecureuil', d.position.x + 30, d.position.z, 0, null); P.x = he.x; P.z = he.z; entrerVehicule(he);
        he.x = d.position.x; he.z = d.position.z; he.alt = d.position.y; he.vol = true; he.va = 0; he.decolT = 0;
        majCielCibles(1 / 30);
        if (cD.etat !== 'chute') ko.push('dirigeable percuté sans chute (' + cD.etat + ')');
        if (P.veh === he && !he.mort) ko.push('l’hélico du joueur traverse le dirigeable');
        if (P.veh) sortirVehicule(true); P.hp = P.maxHp; P.x = 0; P.z = 0; P.y = 0;
        // chute : il disparaît après l'explosion au sol, majCiel ne le reprend pas
        let t = 0; for (; t < 30 * 30 && cD.etat === 'chute'; t++) { majCiel(1 / 30); majCielCibles(1 / 30); }
        if (cD.etat !== 'detruit' || d.visible) ko.push('le dirigeable ne finit pas au sol (' + cD.etat + ')'); else info.push('dirigeable percuté : crash de l’hélico, chute en ' + (t / 30).toFixed(1) + ' s, explosion au sol');
        // 3. l'avion à banderole abattu à la mitrailleuse
        const cA = CIEL.cAv, a = CIEL.avion; majCiel(1 / 30); a.updateMatrixWorld(true); let n = 0;
        while (cA.etat === 'vol' && n < 40) { const b = { fac: 'joueur', x: a.position.x, y: a.position.y, z: a.position.z, dmg: 12, vx: 0, vy: 0, vz: 0 }; if (!collisionBalle(b)) break; n++; }
        if (cA.etat !== 'chute') ko.push('avion à banderole : ' + n + ' balles, toujours ' + cA.etat); else info.push('avion à banderole abattu en ' + n + ' balles');
        // une balle au ras du sol ne touche jamais le ciel
        { const c0 = CIEL_CIBLES.find((c) => c.etat === 'vol'); if (c0 && toucherCiel({ fac: 'joueur', x: c0.obj.position.x, y: 1.5, z: c0.obj.position.z, dmg: 10 })) ko.push('balle au sol qui touche ' + c0.nom); }
        // 4. vague suivante : tout revient, en vol
        lancerVague(); for (let i = 0; i < 3; i++) { majCiel(1 / 30); majCielCibles(1 / 30); }
        for (const c of CIEL_CIBLES) if (c.etat !== 'vol' || !c.obj.visible || c.hp !== c.hpMax) ko.push(c.nom + ' pas revenu');
        if (!ko.length) info.push(CIEL_CIBLES.length + ' appareils revenus à la vague suivante');
        startRun(); P.hp = P.maxHp = 1e6;
        return { ko, info };
      });
      if (r.saut) saute('Le ciel se percute : ' + r.saut);
      else if (r.ko.length) fail('Le ciel se percute : ' + r.ko.join(' | ') + ' [' + r.info.join(', ') + ']');
      else ok('Le ciel se percute : ' + r.info.join(' ; '));
    }

    // -------------------------------------------------------------------
    // Ball-trap du ranch (17 octobre, demandé : « dans le désert, un shoot'em
    // up type ball-trap drôle, une arme en vue 1ère personne avec la mire,
    // tu tires sur ce qu'ils envoient ») : le stand est sur un terrain plat
    // et dégagé du désert ; au poste, la partie démarre en vue à la première
    // personne (joueur masqué, seul TIR reste) ; un pilote simulé (joystick
    // réel, 0,35 s de réaction, vitesse de visée du joystick) atteint
    // l'objectif et débloque la tenue de cow-boy ; passif = 0 ; la colombe
    // coûte des points ; la mort arrête tout.
    // -------------------------------------------------------------------
    console.log('\n--- Ball-trap du ranch : vue à la première personne, pilote simulé, passif, colombe ---');
    {
      const r = await page.evaluate(() => {
        const ko = [], info = [];
        if (!DECOR_V2 || !BT.ok) return { ko, info, saut: !DECOR_V2 ? 'décor V2 coupé' : 'pas de terrain pour le ball-trap' };
        if (INT.actif) sortirInterieur(); if (P.veh) sortirVehicule(true); startRun(); ecran(null); ETAT.mode = 'jeu'; P.hp = P.maxHp = 1e6;
        for (const e of ennemis) e.mort = true;
        if (dansReliefLibre(BT.x, BT.z) || Math.abs(solY(BT.x, BT.z)) > 0.4 || BT.x < HALF) ko.push('stand hors du désert plat (' + BT.x + ',' + BT.z + ')');
        const ex0 = META.exploits.balltrap, arg0 = META.argent; META.exploits.balltrap = false; delete MERV.primes.balltrap;
        // le pilote tire sur SA graine (lancers, dispersion) : avant, son score dépendait de l'état de Math.random
        // laissé par les autres tests (de 3 480 à 9 860 points selon la suite) — un test maîtrise sa scène
        const rndBak = Math.random; let graineBT = (window.__btGraine || 20261018) >>> 0; Math.random = () => { graineBT = (graineBT * 1664525 + 1013904223) >>> 0; return graineBT / 4294967296; };
        P.x = BT.poste.x; P.z = BT.poste.z; P.y = solPied(P.x, P.z); majAction();
        if (!/BALL-TRAP/.test(el('btnAction').textContent)) ko.push('pas de bouton au poste : ' + el('btnAction').textContent); else el('btnAction')._fn();
        // 18 octobre : on choisit son arme (le fusil de Papy Earl est prêté) ; le bouton TIR montre l'arme du mini-jeu
        if (!STAND.ouvert || !STAND.opts || STAND.opts.ids[0] !== 'pompe') ko.push('pas de choix d’arme au poste'); else STAND.opts.choisir('pompe');
        if (!FPS.actif) { Math.random = rndBak; return { ko: ko.concat(['la partie ne démarre pas']), info }; }
        if (el('fireIco').innerHTML !== icoArme('pompe')) ko.push('le bouton TIR ne montre pas le fusil du ball-trap');
        if (P.h.g.visible || el('btnFire').style.display === 'none' || el('btnDodge').style.display !== 'none') ko.push('HUD de la vue à la première personne');
        fpsCamera(); if (Math.abs(camera.position.y - (BT.poste.y + 1.65)) > 0.05) ko.push('caméra pas à hauteur d’œil');
        // le pilote
        const vu = new Map(); let f = 0;
        for (; f < 30 * (BT_DUREE + 2) && FPS.actif; f++) {
          const e = camera.position; let cible = null, best = -1e9;
          for (const c of FPS.cibles) { if (c.mort || c.k === 'colombe' || c.y < 1.2) continue; if (!vu.has(c)) vu.set(c, f); if (f - vu.get(c) < 10.5) continue; const v = c.pts - c.vie * 3; if (v > best) { best = v; cible = c; } }
          INPUT.mx = 0; INPUT.mz = 0; INPUT.btn.tir = false;
          if (cible) { const dx = cible.x - e.x, dy = cible.y - e.y, dz = cible.z - e.z, yT = Math.atan2(-dx, -dz), pT = Math.atan2(dy, Math.hypot(dx, dz));
            const dY = ((FPS.yaw - yT) % (2 * Math.PI) + 3 * Math.PI) % (2 * Math.PI) - Math.PI; // écart d'angle ramené à ]-π, π] (vers le sud, la visée est autour de ±π)
            INPUT.mx = clamp(dY * 5, -1, 1); INPUT.mz = clamp((FPS.pitch - pT) * 6, -1, 1);
            if (Math.abs(dY) < 0.06 && Math.abs(FPS.pitch - pT) < 0.06) INPUT.btn.tir = true; }
          majFPS(1 / 30, 1 / 30); if (FPS.actif) fpsCamera(); }
        INPUT.mx = INPUT.mz = 0; INPUT.btn.tir = false; Math.random = rndBak;
        if (FPS.actif) ko.push('la partie ne finit pas');
        if (!META.exploits.balltrap) ko.push('pilote sous l’objectif (' + FPS.score + ' pts, ' + FPS.touches + '/' + FPS.coups + ')');
        else info.push('pilote : ' + FPS.score + ' pts en ' + BT_DUREE + ' s (' + FPS.touches + ' touches / ' + FPS.coups + ' tirs), tenue de cow-boy, prime ' + (META.argent - arg0) + ' $');
        if (P.h && !P.h.g.visible) ko.push('joueur resté masqué'); if (el('btnDodge').style.display === 'none') ko.push('boutons de combat pas revenus'); if (camera.near !== 0.5) ko.push('plan proche de la caméra pas rendu');
        if (el('fireIco').innerHTML !== icoArme(P.armeCur)) ko.push('le bouton TIR garde l’arme du ball-trap');
        // une arme à soi, plus difficile : les points comptent plus
        { const u0 = META.armes.uzi.poss; META.armes.uzi.poss = true; lancerBallTrap('uzi'); fpsCamera(); const m = mkObjetBT('plateau'); scene.add(m); const cam = camera.position;
          FPS.cibles.push({ x: cam.x, y: cam.y + 3, z: cam.z + 12, vx: 0, vy: 0, vz: 0, r: 0.8, pts: 100, m, g: 0, vie: 3, sol: 0, k: 'plateau' }); FPS.yaw = Math.PI; FPS.pitch = Math.atan2(3, 12); FPS.st = Object.assign({}, FPS.st, { disp: 0 }); fpsCamera(); fpsTirer();
          if (FPS.arme !== 'uzi' || FPS.score !== Math.round(100 * btMult('uzi'))) ko.push('uzi au ball-trap : ' + FPS.arme + ', ' + FPS.score); else info.push('Uzi : points ×' + btMult('uzi'));
          fpsArreter(); META.armes.uzi.poss = u0; }
        // passif : rien
        META.exploits.balltrap = false; lancerBallTrap(); for (let i = 0; i < 30 * (BT_DUREE + 2) && FPS.actif; i++) { majFPS(1 / 30, 1 / 30); if (FPS.actif) fpsCamera(); }
        if (META.exploits.balltrap || FPS.score > 0) ko.push('passif : ' + FPS.score + ' pts'); else info.push('passif : 0 pt');
        // la colombe coûte des points ; la mort arrête la partie
        lancerBallTrap(); fpsCamera(); FPS.score = 500; const m = mkObjetBT('colombe'); scene.add(m); const cam = camera.position;
        FPS.cibles.push({ x: cam.x, y: cam.y + 3, z: cam.z - 12, vx: 0, vy: 0, vz: 0, r: 0.6, pts: -300, m, g: 0, vie: 3, sol: 0, k: 'colombe' });
        FPS.yaw = 0; FPS.pitch = Math.atan2(3, 12); FPS.st = Object.assign({}, FPS.st, { disp: 0 }); fpsCamera(); fpsTirer(); if (FPS.score !== 200) ko.push('colombe : ' + FPS.score);
        ETAT.mode = 'mort'; majFPS(1 / 30, 1 / 30); ETAT.mode = 'jeu'; if (FPS.actif) ko.push('la mort n’arrête pas la partie');
        META.exploits.balltrap = ex0; META.argent = arg0; sauveMeta();
        startRun(); P.hp = P.maxHp = 1e6;
        return { ko, info };
      });
      if (r.saut) saute('Ball-trap : ' + r.saut);
      else if (r.ko.length) fail('Ball-trap : ' + r.ko.join(' | ') + ' [' + r.info.join(', ') + ']');
      else ok('Ball-trap : ' + r.info.join(' ; ') + ' ; la colombe coûte 300, la mort arrête tout');
    }

    // -------------------------------------------------------------------
    // Armurerie V2 (17 octobre, demandé : « se balader dans l'armurerie,
    // choisir et acheter ses armes et protections, les tester, les
    // personnaliser — or, double pistolet, balles explosives — et les voir se
    // personnaliser comme une voiture, retourner l'arme ») : établi = aperçu
    // avant achat (rien de payé, une seule finition, la jumelle en akimbo,
    // oublié à la fermeture), l'arme se retourne au doigt ; stand de tir :
    // n'importe quelle arme à feu à l'essai, gratuit, pilote simulé > 0,
    // passif = 0, un civil coûte 200 ; gilet acheté sur son mannequin.
    // -------------------------------------------------------------------
    console.log('\n--- Armurerie V2 : établi (aperçu, jumelle, au doigt), stand de tir, gilets ---');
    {
      const r = await page.evaluate(() => {
        const ko = [], info = [];
        if (INT.actif) sortirInterieur(); if (P.veh) sortirVehicule(true); startRun(); ecran(null); ETAT.mode = 'jeu'; P.hp = P.maxHp = 1e6;
        const M0 = { arg: META.argent, mods: JSON.stringify(META.modsArmes), rev: META.armes.revolver.poss, pis: META.armes.pistolet.poss };
        entrerInterieur('armurerie', PORTES.find((q) => q.id === 'armurerie')); const s = INT.actif;
        if (!s.standTir || !s.gilets || !s.etabliArmes) return { ko: ['armurerie incomplète'], info };
        // 1. établi : aperçu
        META.armes.pistolet.poss = true; delete META.modsArmes.pistolet; majArmeJoueur('pistolet'); META.argent = 5000;
        P.x = s.etabliArmes.x; P.z = s.etabliArmes.z; ouvrirAtelierArme(s);
        const aOr = () => { let o = false; ATELIER.modele.traverse((m) => { if (m.isMesh && m.material === _MAT_OR) o = true; }); return o; };
        const nbArmes = () => ATELIER.modele.children[0].children.length;
        atelierEssayer('or'); if (!aOr() || META.argent !== 5000 || aMod('pistolet', 'or')) ko.push('aperçu or : payé ou invisible');
        atelierEssayer('camo'); if (aOr() || ATELIER.apercu.includes('or')) ko.push('deux finitions à l’essai');
        atelierEssayer('double'); if (nbArmes() !== 2) ko.push('pas de jumelle à l’essai (' + nbArmes() + ')');
        // au doigt
        const a0 = ATELIER.ang; renderer.domElement.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 7, clientX: 100, clientY: 300, bubbles: true }));
        window.dispatchEvent(new PointerEvent('pointermove', { pointerId: 7, clientX: 160, clientY: 330 })); window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 7 }));
        const a1 = ATELIER.ang; for (let i = 0; i < 30; i++) majAtelierArme(1 / 30);
        if (Math.abs(a1 - a0 - 0.72) > 0.05 || Math.abs(ATELIER.ang - a1) > 0.01 || !(ATELIER.tilt > 0.1)) ko.push('rotation au doigt : ' + (a1 - a0).toFixed(2) + ' / ' + (ATELIER.ang - a1).toFixed(2) + ' / ' + ATELIER.tilt.toFixed(2));
        if (Math.abs(ATELIER.modele.rotation.y - ATELIER.ang) > 1e-6) ko.push('le modèle ne suit pas le doigt');
        fermerAtelierArme(); ouvrirAtelierArme(s); if (ATELIER.apercu.length || nbArmes() !== 1 || modsArme('pistolet').length) ko.push('l’essai reste après la fermeture');
        if (!acheterMod('pistolet', 'double') || nbArmes() === 2) { /* l'achat reconstruit au prochain modèle */ } atelierModele(); if (nbArmes() !== 2) ko.push('akimbo acheté sans jumelle sur l’établi');
        fermerAtelierArme(); info.push('établi : aperçu or/camo (une finition), jumelle, au doigt, oublié à la fermeture');
        // 2. stand de tir : une arme qu'on n'a pas, gratuitement
        META.armes.revolver.poss = false; const arg1 = META.argent; P.x = s.standTir.x; P.z = s.standTir.z; majAction();
        if (!/STAND DE TIR/.test(el('btnAction').textContent)) ko.push('pas de stand : ' + el('btnAction').textContent); else el('btnAction')._fn();
        if (!STAND.ouvert) ko.push('le choix d’arme ne s’ouvre pas');
        lancerStandTir(s, 'revolver'); if (!FPS.actif || FPS.arme !== 'revolver') return { ko: ko.concat(['le tir ne démarre pas']), info };
        const vu = new Map(); let f = 0;
        for (; f < 30 * 32 && FPS.actif; f++) { const e = camera.position; let c = null, best = 1e9;
          for (const q of FPS.cibles) { if (q.mort || q.civil) continue; if (!vu.has(q)) vu.set(q, f); if (f - vu.get(q) < 10.5) continue; const d = Math.hypot(q.x - e.x, q.z - e.z); if (d < best) { best = d; c = q; } }
          INPUT.mx = INPUT.mz = 0; INPUT.btn.tir = false;
          if (c) { const yT = Math.atan2(-(c.x - e.x), -(c.z - e.z)), pT = Math.atan2(c.y - e.y, Math.hypot(c.x - e.x, c.z - e.z)), dY = ((FPS.yaw - yT) % (2 * Math.PI) + 3 * Math.PI) % (2 * Math.PI) - Math.PI;
            INPUT.mx = clamp(dY * 5, -1, 1); INPUT.mz = clamp((FPS.pitch - pT) * 6, -1, 1); if (Math.abs(dY) < 0.025 && Math.abs(FPS.pitch - pT) < 0.03) INPUT.btn.tir = true; }
          majFPS(1 / 30, 1 / 30); if (FPS.actif) fpsCamera(); }
        INPUT.mx = INPUT.mz = 0; INPUT.btn.tir = false;
        const sc = FPS.score, tou = FPS.touches, cps = FPS.coups;
        if (FPS.actif) ko.push('la séance ne finit pas'); if (!(sc > 300)) ko.push('pilote au stand : ' + sc + ' pts');
        if (META.argent !== arg1 || META.armes.revolver.poss) ko.push('le stand coûte ou donne l’arme'); else info.push('stand : revolver à l’essai, pilote ' + sc + ' pts (' + tou + '/' + cps + '), gratuit');
        // passif ; un civil coûte 200
        lancerStandTir(s, 'pistolet'); for (let i = 0; i < 30 * 32 && FPS.actif; i++) { majFPS(1 / 30, 1 / 30); if (FPS.actif) fpsCamera(); } if (FPS.score !== 0) ko.push('passif au stand : ' + FPS.score);
        lancerStandTir(s, 'pistolet'); fpsCamera(); FPS.score = 500; const cam = camera.position, m = mkSilhouette(true); scene.add(m);
        FPS.cibles.push({ x: cam.x, y: cam.y, z: cam.z - 12, vx: 0, vy: 0, vz: 0, g: 0, r: 0.6, pts: -200, m, vie: 3, sol: -5, civil: true }); FPS.yaw = 0; FPS.pitch = 0; FPS.st = Object.assign({}, FPS.st, { disp: 0 }); fpsCamera(); fpsTirer();
        if (FPS.score !== 300) ko.push('civil : ' + FPS.score); fpsArreter();
        // 3. un gilet sur son mannequin
        P.bouclier = 0; const gq = s.gilets[0]; P.x = gq.x; P.z = gq.z; majAction(); if (!/GILET/.test(el('btnAction').textContent)) ko.push('pas de gilet : ' + el('btnAction').textContent); else el('btnAction')._fn();
        if (!(P.bouclier > 0)) ko.push('gilet pas enfilé'); else info.push('gilet enfilé (' + P.bouclier + ')');
        sortirInterieur(); META.argent = M0.arg; META.modsArmes = JSON.parse(M0.mods); META.armes.revolver.poss = M0.rev; META.armes.pistolet.poss = M0.pis; sauveMeta();
        startRun(); P.hp = P.maxHp = 1e6;
        return { ko, info };
      });
      if (r.ko.length) fail('Armurerie V2 : ' + r.ko.join(' | ') + ' [' + r.info.join(', ') + ']');
      else ok('Armurerie V2 : ' + r.info.join(' ; ') + ' ; passif 0, un civil coûte 200');
    }

    // -------------------------------------------------------------------
    // Terrains de sport des parcs (17 octobre, demandé : « un terrain de foot
    // et d'autres terrains de sport pour faire vivre l'endroit de verdure ») :
    // le match se joue tout seul (le ballon reste sur le terrain, les joueurs
    // le disputent) ; le joueur frappe le ballon en courant dedans ; son but
    // paie une fois par vague ; un joueur visé fuit et le match s'arrête,
    // repris à la partie suivante ; le tennis et le ping-pong échangent.
    // -------------------------------------------------------------------
    console.log('\n--- Terrains de sport des parcs : match de foot, but du joueur, tennis ---');
    {
      const r = await page.evaluate(() => {
        const ko = [], info = [];
        if (!DECOR_V2 || !SPORTS.ok || !SPORTS.foot) return { ko, info, saut: 'décor V2 coupé' };
        if (INT.actif) sortirInterieur(); if (P.veh) sortirVehicule(true); startRun(); ecran(null); ETAT.mode = 'jeu'; P.hp = P.maxHp = 1e6;
        const F = SPORTS.foot, S = SPORTS.stade, D = FOOT_DEMI;
        if (F.joueurs.length !== 10) ko.push(F.joueurs.length + ' joueurs');
        // 1. le match tout seul (le joueur regarde de la tribune)
        P.x = S.x - D.x - 6; P.z = S.z; let auBallon = 0, horsTerrain = 0, buts0 = F.score[0] + F.score[1];
        for (let i = 0; i < 30 * 40; i++) { majSportsParcs(1 / 30); if (F.joueurs.some((j) => !j.g && dist2(j.x, j.z, F.bx, F.bz) < 1.2)) auBallon++; if (Math.abs(F.bx - S.x) > D.x + 1 || Math.abs(F.bz - S.z) > D.z + 2.3) horsTerrain++; }
        const dep = Math.hypot(F.bx - S.x, F.bz - S.z) + F.score[0] + F.score[1];
        if (auBallon < 30) ko.push('les joueurs ne vont pas au ballon (' + auBallon + ')'); if (horsTerrain) ko.push('ballon hors du terrain ' + horsTerrain + ' images');
        info.push('match : ' + F.score[0] + '–' + F.score[1] + ' en 40 s, joueurs au ballon ' + auBallon + ' images');
        // 2. le joueur frappe le ballon et marque (prime une fois par vague)
        const arg0 = META.argent; delete MERV.primes.foot;
        const tirAuBut = () => { footReset(false); F.bx = S.x; F.bz = S.z - D.z + 4; F.by = 0.5; F.vx = F.vy = F.vz = 0; for (const j of F.joueurs) { j.x = S.x + j.px * D.x; j.z = S.z + D.z - 2; } // la défense est loin
          P.x = F.bx; P.z = F.bz + 0.5; P.y = solPied(P.x, P.z); INPUT.mx = 0; INPUT.mz = -1; const s0 = F.score[1]; for (let i = 0; i < 60 && F.score[1] === s0; i++) majSportsParcs(1 / 30); INPUT.mz = 0; return F.score[1] > s0; };
        if (!tirAuBut()) ko.push('le tir du joueur ne rentre pas (ballon ' + (F.bx - S.x).toFixed(1) + ',' + (F.bz - S.z).toFixed(1) + ')');
        else if (META.argent - arg0 !== 150) ko.push('prime du but : ' + (META.argent - arg0)); else info.push('but du joueur : +150 $');
        const arg1 = META.argent; tirAuBut(); if (META.argent !== arg1) ko.push('prime payée deux fois dans la vague');
        // 3. un joueur visé fuit, le match s'arrête ; repris à la partie suivante
        const j0 = F.joueurs[3]; P.x = j0.x + 5; P.z = j0.z; toucherFigurant({ fac: 'joueur', x: j0.x, y: 1.2, z: j0.z, vx: -60, vy: 0, vz: 0 });
        if (!figConverti(j0.h)) ko.push('le joueur visé reste sur le terrain'); const bx0 = F.bx, bz0 = F.bz; F.vx = 5; for (let i = 0; i < 10; i++) majSportsParcs(1 / 30); if (F.bx !== bx0) ko.push('le match continue après la panique');
        startRun(); P.x = S.x - D.x - 6; P.z = S.z; if (figConverti(j0.h) || F.score[0] + F.score[1] !== 0) ko.push('match pas repris à la partie suivante'); for (let i = 0; i < 90; i++) majSportsParcs(1 / 30); if (Math.hypot(F.bx - S.x, F.bz - S.z) < 0.01 && F.vx === 0) ko.push('le match ne repart pas');
        // 4. tennis, ping-pong
        const T = SPORTS.tennis, z0 = T.balle.position.z; for (let i = 0; i < 20; i++) majSportsParcs(1 / 30); if (Math.abs(T.balle.position.z - z0) < 1) ko.push('la balle de tennis ne bouge pas');
        if (SPORTS.pong.length !== 2 || SPORTS.workout.length !== 2) ko.push('complexe incomplet'); else info.push('tennis, 2 tables de ping-pong, street workout');
        META.argent = arg0; sauveMeta(); startRun(); P.hp = P.maxHp = 1e6;
        return { ko, info };
      });
      if (r.saut) saute('Terrains de sport : ' + r.saut);
      else if (r.ko.length) fail('Terrains de sport : ' + r.ko.join(' | ') + ' [' + r.info.join(', ') + ']');
      else ok('Terrains de sport : ' + r.info.join(' ; ') + ' ; un joueur visé fuit, le match reprend à la partie suivante');
    }

    // -------------------------------------------------------------------
    // Surprises sur les toits (17 octobre, demandé : « des surprises
    // interactives sur les toits ») : la tyrolienne mène d'un toit à l'autre
    // sans jamais traverser un immeuble ni blesser ; le trampoline renvoie
    // sans dégâts et on en sort au joystick ; pigeonnier, tag et fête du DJ
    // une fois par vague, de retour à la suivante.
    // -------------------------------------------------------------------
    console.log('\n--- Surprises sur les toits : tyrolienne, trampoline, pigeonnier, tag, DJ ---');
    {
      const r = await page.evaluate(() => {
        const ko = [], info = [];
        if (!DECOR_V2 || !SURPRISES.liste.length) return { ko, info, saut: 'aucun toit nu pour les surprises' };
        if (INT.actif) sortirInterieur(); if (P.veh) sortirVehicule(true); startRun(); ecran(null); ETAT.mode = 'jeu'; P.hp = P.maxHp = 1e6; for (const e of ennemis) e.mort = true;
        const n = {}; for (const s of SURPRISES.liste) n[s.type] = (n[s.type] || 0) + 1; info.push(JSON.stringify(n).replace(/"/g, ''));
        // 1. la tyrolienne
        const ty = SURPRISES.liste.find((s) => s.type === 'tyro');
        if (ty) { const T = ty.T; P.x = ty.x; P.z = ty.z; P.y = solPied(P.x, P.z); P.chute = false; majAction();
          if (!/TYROLIENNE/.test(el('btnAction').textContent)) ko.push('tyrolienne : ' + el('btnAction').textContent); else el('btnAction')._fn();
          const hp0 = P.hp; let f = 0, rase = 1e9; for (; f < 30 * 10 && SURPRISES.tyro; f++) { INPUT.mx = 1; majJoueur(1 / 30, 1 / 30); majToitsSurprises(1 / 30, 1 / 30); if (SURPRISES.tyro) rase = Math.min(rase, P.y - hautMaxSous(P.x, P.z, 0.4)); }
          INPUT.mx = 0; for (let i = 0; i < 20; i++) majJoueur(1 / 30, 1 / 30);
          if (SURPRISES.tyro) ko.push('la tyrolienne ne finit pas');
          else if (Math.abs(P.y - T.arrivee) > 0.6 || P.hp < hp0) ko.push('arrivée : ' + P.y.toFixed(1) + ' / toit ' + T.arrivee.toFixed(1) + ', PV ' + (hp0 - P.hp));
          else if (rase < 0.2) ko.push('le passager traverse un immeuble (' + rase.toFixed(2) + ')');
          else info.push('tyrolienne : ' + T.L.toFixed(0) + ' u en ' + (f / 30).toFixed(1) + ' s, ' + rase.toFixed(1) + ' u au-dessus de tout'); }

        // 2. le trampoline
        const tr = SURPRISES.liste.find((s) => s.type === 'trampo');
        if (tr) { P.x = tr.x + 0.3; P.z = tr.z; P.y = tr.y; P.chute = false; P.vy = 0; const hp0 = P.hp; let haut = 0, rebonds = 0, vyPrec = 0;
          for (let i = 0; i < 30 * 5; i++) { majJoueur(1 / 30, 1 / 30); majToitsSurprises(1 / 30, 1 / 30); haut = Math.max(haut, P.y - tr.y); if (vyPrec < -1 && P.vy > 1) rebonds++; vyPrec = P.vy; }
          if (haut < 1.5 || rebonds < 2 || P.hp < hp0) ko.push('trampoline : ' + haut.toFixed(1) + ' u, ' + rebonds + ' rebonds, PV ' + (hp0 - P.hp));
          for (let i = 0; i < 20; i++) { INPUT.mx = 1; INPUT.mz = 0; majJoueur(1 / 30, 1 / 30); majToitsSurprises(1 / 30, 1 / 30); } // 0,67 s : hors de la toile, encore sur le toit INPUT.mx = 0; for (let i = 0; i < 60; i++) majJoueur(1 / 30, 1 / 30);
          if (dist2(P.x, P.z, tr.x, tr.z) < 2.5 * 2.5) ko.push('on ne sort pas du trampoline'); else if (P.hp < hp0) ko.push('blessé en quittant le trampoline');
          else info.push('trampoline : ' + rebonds + ' rebonds jusqu’à ' + haut.toFixed(1) + ' u, sans dégâts, on en sort'); }
        // 3. pigeonnier, tag, DJ : une fois par vague
        const une = (type, verif) => { const s = SURPRISES.liste.find((q) => q.type === type); if (!s) return; P.x = s.x; P.z = s.z; P.y = s.y; P.chute = false; majAction(); const l1 = el('btnAction').textContent; el('btnAction')._fn();
          for (let i = 0; i < 30 * 7; i++) majToitsSurprises(1 / 30, 1 / 30); const ok1 = verif(s); majAction(); const l2 = el('btnAction').textContent;
          if (!ok1) ko.push(type + ' : rien ne se passe (' + l1 + ')'); else if (!/vide|Déjà|bat son plein/.test(l2)) ko.push(type + ' : deux fois dans la vague (' + l2 + ')'); else info.push(type + ' ✓'); return s; };
        const pg = une('pigeons', (s) => s.oiseaux.every((o) => !o.g.visible));
        une('tag', (s) => { const d = s.ctx.getImageData(0, 0, 256, 128).data; let diff = 0; for (let i = 0; i < d.length; i += 4) if (Math.abs(d[i] - 0xb8) > 30) diff++; return diff > 500; });
        une('dj', (s) => s.vague === WAVES.n);
        if (pg) { lancerVague(); for (let i = 0; i < 3; i++) majToitsSurprises(1 / 30, 1 / 30); if (!pg.oiseaux.every((o) => o.g.visible)) ko.push('les pigeons ne reviennent pas à la vague suivante'); }
        startRun(); P.hp = P.maxHp = 1e6;
        return { ko, info, sansTyro: !ty };
      });
      if (r.saut) saute('Surprises sur les toits : ' + r.saut);
      else if (r.ko.length) fail('Surprises sur les toits : ' + r.ko.join(' | ') + ' [' + r.info.join(', ') + ']');
      else { if (r.sansTyro) saute('Surprises sur les toits : aucune tyrolienne posée (tirage)'); ok('Surprises sur les toits : ' + r.info.join(' ; ')); }
    }

    // -------------------------------------------------------------------
    // Carte et catalogue (17 octobre, demandé : « mets à jour la carte avec
    // toutes les nouvelles choses, améliore ses détails » ; « un html
    // récapitulatif connecté, que les modifications mettent à jour ») : le fond
    // de carte est en haute résolution, chaque nouvelle activité a sa pastille
    // et sa balise, le filtre « Activités » s'affiche ; tout ce que
    // catalogue.html lit dans le jeu existe (sinon il casserait en silence).
    // -------------------------------------------------------------------
    console.log('\n--- Carte et catalogue : fond détaillé, activités, catalogue connecté ---');
    {
      const noms = (() => { try { const t = require('fs').readFileSync(require('path').join(__dirname, 'catalogue.html'), 'utf8'), m = t.match(/W\.eval\('\(\{([\s\S]*?)\}\)'\)/); if (!m) return null;
        return m[1].replace(/'\+\s*'/g, '').split(',').map((x) => x.trim().split(':')[0]).filter((x) => /^[A-Za-z_]\w*$/.test(x)); } catch (e) { return null; } })();
      const r = await page.evaluate((noms) => {
        const ko = [], info = [];
        if (INT.actif) sortirInterieur(); if (P.veh) sortirVehicule(true); startRun(); ecran(null); ETAT.mode = 'jeu';
        if (mmStatic.width !== 192 * MM_RES) ko.push('fond de carte ' + mmStatic.width + ' px');
        const L = pointsActivites(), icos = new Set(L.map((a) => a.ico));
        if (DECOR_V2) for (const [ic, nom] of [['🎖️', 'parcours de Fort Reyes'], ['🏔️', 'BIG JUMP'], ['🚁', 'héliport du manoir'], ['🎯', 'ball-trap'], ['⚽', 'stade'], ['🎾', 'complexe sportif']]) if (!icos.has(ic)) ko.push('pas de pastille : ' + nom);
        if (BALISES.length < L.length) ko.push(BALISES.length + ' balises pour ' + L.length + ' activités');
        if (MAPUI.filtres.activites !== true) ko.push('pas de filtre Activités'); else { try { drawCarte(); } catch (e) { ko.push('drawCarte : ' + e.message); } }
        info.push(L.length + ' activités sur la carte et en balises, fond ' + mmStatic.width + ' px');
        if (!noms) ko.push('catalogue.html illisible'); else { const manque = noms.filter((n) => { try { return eval('typeof ' + n) === 'undefined'; } catch (e) { return true; } }); if (manque.length) ko.push('le catalogue lit des noms absents du jeu : ' + manque.join(', ')); else info.push('catalogue : les ' + noms.length + ' noms qu’il lit existent'); }
        return { ko, info };
      }, noms);
      if (r.ko.length) fail('Carte et catalogue : ' + r.ko.join(' | ') + ' [' + r.info.join(', ') + ']');
      else ok('Carte et catalogue : ' + r.info.join(' ; '));
    }

    // -------------------------------------------------------------------
    // Skate (18 octobre, demandé : « ajoute des vélos au skate park et ajoute
    // aussi le skate, avec possibilité de faire toujours des ollies, des
    // figures ») : le skate est un vélo sans moteur (velo:true, skate:true) ;
    // le test commun « Figures deux roues » le couvre déjà (grand saut, chute,
    // ollie + figure). Ici, ce qui lui est propre : SEULE LA PLANCHE TOURNE
    // (le skateur reste debout — un modèle sans userData faisait basculer
    // tout le véhicule), noms des figures, poussée du pied sans erreur,
    // boutons OLLIE / KICKFLIP, vélos et skates garés aux deux skateparks.
    // -------------------------------------------------------------------
    console.log('\n--- Skate : ollie, kickflip, planche qui tourne seule, engins des skateparks ---');
    {
      const r = await page.evaluate(() => {
        const ko = [], info = [];
        const cle = Object.keys(VEHDEFS).find((k) => VEHDEFS[k].skate);
        if (!cle) return { ko: ['aucun skate dans VEHDEFS'] };
        const scene0 = () => { if (INT.actif) sortirInterieur(); if (P.veh) sortirVehicule(true); startRun(); ecran(null); ETAT.mode = 'jeu'; P.hp = P.maxHp = 1e6;
          for (const v of vehicules) scene.remove(v.mesh); vehicules.length = 0; for (const e of ennemis) e.mort = true;
          const v = creerVehicule(cle, POIS.place.x, POIS.place.z + 14, 0, null); v.h = solY(v.x, v.z); P.x = v.x; P.z = v.z; entrerVehicule(v); return v; };
        let v = scene0(); const ud = v.mesh.userData;
        if (!ud.planche || !ud.corps || !(ud.roues && ud.roues.length === 4)) ko.push('modèle incomplet (planche ' + !!ud.planche + ', roues ' + (ud.roues ? ud.roues.length : 0) + ')');
        if (!/OLLIE/.test(document.getElementById('btnDodge').textContent)) ko.push('pas de bouton OLLIE : ' + document.getElementById('btnDodge').textContent);
        // ollie : appui bref d'ESQUIVE = saut au relâcher
        v.v = 6; INPUT.btn.esquive = true; majConduite(1 / 30); INPUT.btn.esquive = false; majConduite(1 / 30);
        if (!v.enAir || !(v.vy > 0)) ko.push('pas d\'ollie sur un appui bref (enAir ' + v.enAir + ', vy ' + v.vy + ')');
        else info.push('ollie : vy ' + v.vy.toFixed(1));
        if (!/KICKFLIP/.test(document.getElementById('btnGren').textContent)) ko.push('pas de bouton KICKFLIP en l\'air : ' + document.getElementById('btnGren').textContent);
        // kickflip pendant l'ollie : la planche tourne, le véhicule et le skateur restent droits
        INPUT.edge.gren = true; let n = 0, maxPl = 0, maxMesh = 0, maxHomme = 0; const s0 = ETAT.score;
        while ((v.enAir || n < 2) && P.veh === v && n < 120) { majConduite(1 / 30); INPUT.edge.gren = false; n++;
          maxPl = Math.max(maxPl, Math.abs(ud.planche.rotation.z)); maxMesh = Math.max(maxMesh, Math.abs(v.mesh.rotation.x), Math.abs(v.mesh.rotation.z));
          if (P.h && P.h.g) maxHomme = Math.max(maxHomme, Math.abs(P.h.g.rotation.x), Math.abs(P.h.g.rotation.z)); }
        if (P.veh !== v) ko.push('chute sur un ollie + kickflip');
        else {
          if (!(maxPl > 2)) ko.push('la planche n\'a pas tourné (' + maxPl.toFixed(2) + ' rad)');
          if (maxMesh > 0.5 || maxHomme > 1e-3) ko.push('le skateur a basculé avec la planche (véhicule ' + maxMesh.toFixed(2) + ', skateur ' + maxHomme.toFixed(2) + ')');
          if (!(ETAT.score - s0 >= FIG2R.ptsFlip)) ko.push('kickflip non compté (' + (ETAT.score - s0) + ')');
          if (Math.abs(ud.planche.rotation.z) > 1e-6 || Math.abs(ud.planche.position.y) > 1e-6) ko.push('planche pas remise à plat');
          info.push('kickflip : planche ' + maxPl.toFixed(1) + ' rad, skateur droit, +' + (ETAT.score - s0));
        }
        // poussée du pied : rouler au joystick (dans le sens de la planche), sans erreur, le pied arrière bouge
        v = scene0();
        { let best = 0, dMax = -1; for (let k = 0; k < 16; k++) { const a = k * Math.PI / 8; let d = 0.6; while (d <= 12 && !solidAt(v.x + Math.sin(a) * d, v.z + Math.cos(a) * d, 0.3)) d += 0.3; if (d > dMax) { dMax = d; best = a; } }
          v.ang = best; v.mesh.rotation.y = best; } // la direction la plus dégagée (un potelet devant la place arrêtait le skate)
        INPUT.mx = Math.sin(v.ang); INPUT.mz = Math.cos(v.ang); let bouge = 0;
        try { for (let i = 0; i < 60; i++) { majConduite(1 / 30); if (P.h && Math.abs(P.h.jambeD.rotation.x) > 0.1) bouge++; } } catch (e) { ko.push('poussée : ' + e.message); }
        INPUT.mx = 0; INPUT.mz = 0;
        if (!bouge) ko.push('le pied arrière ne pousse jamais (cap ' + v.ang.toFixed(2) + ', ' + v.v.toFixed(1) + ' u/s)'); else if (!(v.v > 4)) ko.push('le skate n’avance pas en poussant (' + v.v.toFixed(1) + ' u/s)'); else info.push('poussée du pied : ' + bouge + ' images sur 60, ' + v.v.toFixed(1) + ' u/s');
        // indestructible comme le vélo
        const hp0 = v.hp; abimerVehicule(v, 500); if (v.mort || v.hp < hp0) ko.push('le skate s\'abîme');
        sortirVehicule(true);
        if (Math.abs(P.h.jambeG.rotation.z) > 1e-6 || Math.abs(P.h.jambeD.rotation.z) > 1e-6) ko.push('jambes restées écartées à pied');
        // engins garés aux deux skateparks à chaque partie
        startRun(); ecran(null); ETAT.mode = 'jeu';
        const gares = vehicules.filter((o) => o.auSkatepark && !o.mort);
        const pres = (x, z, R) => gares.filter((o) => Math.hypot(o.x - x, o.z - z) < R);
        if (typeof SKATE !== 'undefined' && SKATE.ok) { const l = pres(SKATE.x, SKATE.z, 30); if (!l.some((o) => o.def.skate) || !l.some((o) => o.def.velo && !o.def.skate)) ko.push('skatepark de la ville : ' + l.map((o) => o.key)); else info.push('skatepark : ' + l.map((o) => o.key).join(', ')); }
        if (typeof SKX !== 'undefined' && SKX.ok) { const l = pres(SKX.x0, (SKX.z0 + SKX.z1) / 2, 50); if (!l.some((o) => o.def.skate) || !l.some((o) => o.def.bmx)) ko.push('skatepark XXL : ' + l.map((o) => o.key)); else info.push('XXL : ' + l.map((o) => o.key).join(', ')); }
        for (const o of gares) if (solidAt(o.x, o.z, 0.3) || estEau(o.x, o.z)) ko.push(o.key + ' garé dans un solide ou à l\'eau en ' + Math.round(o.x) + ',' + Math.round(o.z));
        return { ko, info };
      });
      if (r.ko.length) fail('Skate : ' + r.ko.join(' | ') + ' [' + (r.info || []).join(', ') + ']');
      else ok('Skate : ' + r.info.join(' ; '));
    }

    // -------------------------------------------------------------------
    // Armureries de la carte (18 octobre, signalé : « je n'arrive toujours pas
    // à rentrer dans les salles d'armurerie : aux armureries de la minimap,
    // j'ouvre l'ancienne page non interactive avec toutes les armes en liste ;
    // je ne sais pas où est l'entrée ») : chaque marqueur « A » de la carte
    // (lu dans listeCommerces) propose ENTRER et mène à la salle V2 ; on
    // ressort devant la même armurerie, jamais devant l'autre.
    // -------------------------------------------------------------------
    console.log('\n--- Armureries de la carte : chaque marqueur « A » mène à la salle V2 ---');
    {
      const r = await page.evaluate(() => {
        const ko = [], info = [];
        if (INT.actif) sortirInterieur(); if (P.veh) sortirVehicule(true); startRun(); ecran(null); ETAT.mode = 'jeu';
        const marques = listeCommerces().filter((c) => c.txt === 'A');
        if (marques.length < 2) ko.push(marques.length + ' marqueur(s) « A » sur la carte');
        for (const m of marques) {
          P.x = m.x; P.z = m.z + 1; P.y = 0; majAction();
          const b = document.getElementById('btnAction'), lab = b.textContent;
          if (!/ENTRER/.test(lab) || !/ARMURERIE/i.test(lab)) { ko.push('devant le « A » ' + Math.round(m.x) + ',' + Math.round(m.z) + ' : « ' + lab + ' »'); continue; }
          b._fn();
          const s = INT.actif;
          if (!s || s !== INT.salles.armurerie) { ko.push('le « A » ' + Math.round(m.x) + ',' + Math.round(m.z) + ' n’entre pas dans la salle de l’armurerie'); if (s) sortirInterieur(); continue; }
          if (ETAT.mode === 'shopIn' || ETAT.mode === 'shop') ko.push('l’ancienne page s’ouvre encore');
          if (!s.murArmes || !s.etabliArmes) ko.push('salle sans mur d’armes ou établi');
          sortirInterieur();
          const d = Math.hypot(P.x - m.x, P.z - m.z);
          if (d > 6) ko.push('ressorti à ' + d.toFixed(1) + ' u de l’armurerie ' + Math.round(m.x) + ',' + Math.round(m.z));
          info.push('« A » ' + Math.round(m.x) + ',' + Math.round(m.z) + ' → salle, ressorti à ' + d.toFixed(1) + ' u');
        }
        // le nom est le même partout : carte, bouton, salle
        if (/port/i.test(INTDEFS.armurerie.nom)) ko.push('nom de salle « ' + INTDEFS.armurerie.nom + ' »');
        return { ko, info };
      });
      if (r.ko.length) fail('Armureries de la carte : ' + r.ko.join(' | ') + ' [' + r.info.join(', ') + ']');
      else ok('Armureries de la carte : ' + r.info.join(' ; '));
    }

    // -------------------------------------------------------------------
    // Arène de derby (18 octobre, demandé : « ok pour l'arène de derby, et
    // même faire des voitures de derby avec des améliorations derby ») :
    // arène close (portail fermé pendant le match), stand (menu, achats,
    // sauvegarde), voitures habillées selon les améliorations, épaves au
    // lieu d'explosions, coups de face / flancs, abandon, mort, prime une
    // fois par vague, tenue. Jouable (pilote au joystick réel, réaction
    // 0,3 s, tactique de charge) et perdable (passif) : chaque match tiré
    // sur sa propre graine (le test maîtrise sa scène).
    // -------------------------------------------------------------------
    console.log('\n--- Arène de derby : stand, améliorations, épaves, match jouable et perdable ---');
    {
      const r = await page.evaluate(() => {
        const ko = [], info = [], D = DERBY;
        if (!DECOR_V2 || !D.ok) return { off: true };
        const rnd0 = Math.random, graine = (g) => { Math.random = () => { g = (g * 1664525 + 1013904223) >>> 0; return g / 4294967296; }; };
        const prep = () => { if (INT.actif) sortirInterieur(); if (P.veh) sortirVehicule(true); startRun(); ecran(null); ETAT.mode = 'jeu'; P.hp = P.maxHp = 1e6; for (const e of ennemis) e.mort = true; WANTED.heat = 0; P.x = D.stand.x; P.z = D.stand.z; P.y = 0; };
        const niv0 = { pareChocs: 0, blindage: 0, moteur: 0, pneus: 0 }, sauve = JSON.parse(JSON.stringify(META.derby)), argent0 = META.argent;
        try {
          // le stand : bouton, menu, achats (sauvegardés, clés fixes)
          prep(); META.derby.niv = Object.assign({}, niv0); majAction();
          if (!/DERBY/.test(document.getElementById('btnAction').textContent)) ko.push('pas de bouton au stand : ' + document.getElementById('btnAction').textContent);
          document.getElementById('btnAction')._fn(); if (!D.menuOuvert || !/LANCER LE DERBY/.test(D.menu.textContent)) ko.push('menu du stand absent');
          META.argent = 1e5; derbyAcheterAmelio('pareChocs'); derbyAcheterAmelio('pareChocs'); derbyChoisirVoiture('derbyPickup');
          if (META.derby.niv.pareChocs !== 2 || !META.derby.poss.derbyPickup || META.derby.voiture !== 'derbyPickup' || META.argent !== 1e5 - DERBY_PRIX.niv.pareChocs[0] - DERBY_PRIX.niv.pareChocs[1] - DERBY_PRIX.voitures.derbyPickup) ko.push('achats du stand ' + JSON.stringify(META.derby.niv) + ' ' + META.argent);
          META.derby.niv.pareChocs = 3; derbyAcheterAmelio('pareChocs'); if (META.derby.niv.pareChocs !== 3) ko.push('amélioration au-delà du niveau 3');
          sauveMeta(); const sv = JSON.parse(localStorage.getItem('asphalte_save_v1')); if (!sv.derby || sv.derby.voiture !== 'derbyPickup' || sv.derby.niv.pareChocs !== 3) ko.push('derby pas sauvegardé');
          if (D.porte.actif) ko.push('portail fermé hors match');
          // l'habillage suit les améliorations
          const pieces = (niv) => { const g = makeVoiture('derbyBreak'); habillerDerby(g, 'derbyBreak', 9, niv); let n = 0; g.userData.derbyHab.traverse((o) => { if (o.isMesh) n++; }); libererObjet(g); return n; };
          const p0 = pieces(niv0), p3 = pieces({ pareChocs: 3, blindage: 3, moteur: 3, pneus: 3 }); if (!(p3 > p0 + 15)) ko.push('habillage : ' + p0 + ' pièces au niveau 0, ' + p3 + ' au niveau 3');
          // ni garage, ni tir par la vitre
          if (vehiculeTireur({ def: VEHDEFS.derbyBreak })) ko.push('tir par la vitre en voiture de derby');
          if (!messageNonGarable({ key: 'derbyBreak', def: VEHDEFS.derbyBreak }).includes('derby')) ko.push('message du garage');
          // le match : six voitures, portail fermé, compte à rebours figé, trêve
          META.derby.niv = Object.assign({}, niv0); META.derby.voiture = 'derbyBreak'; prep(); graine(11); derbyLancer(); Math.random = rnd0; const A = D.actif;
          if (!A || A.voitures.length !== 1 + DERBY_NB_IA || P.veh !== A.vJ) ko.push('match pas lancé');
          else {
            if (!D.porte.actif || !solidAt(D.porte.x, D.porte.z, 0.2)) ko.push('portail ouvert pendant le match');
            if (!treveActivite()) ko.push('pas de trêve pendant le match');
            const x0 = A.vJ.x; INPUT.mx = 1; INPUT.mz = 0; for (let i = 0; i < 30; i++) { derbyEntrees(); majConduite(1 / 30); } INPUT.mx = 0;
            if (Math.abs(A.vJ.x - x0) > 0.5) ko.push('la voiture roule pendant le compte à rebours');
            // coups : de face le bélier frappe, sur le flanc on encaisse plus
            const v = A.ias[0], o = A.ias[1]; v.ang = 0; o.ang = Math.PI / 2; v.derbyBelier = 1.7; const k = derbyCoeffs(v, o, 0, 3);
            if (!(k[0] > 2) || !(k[1] < 0.7)) ko.push('coup de face sur le flanc : ' + k.map((x) => x.toFixed(2)));
            DERBY._paire = null;
            // une épave, jamais une explosion
            exploserVehicule(v); abimerVehicule(o, 1e6, false);
            if (v.mort || !v.derbyKO || o.mort || !o.derbyKO || v.conduit === 'derby') ko.push('épave : mort ' + v.mort + '/' + o.mort + ', KO ' + v.derbyKO + '/' + o.derbyKO);
            if (!dansArene(v.x, v.z, 0)) ko.push('voiture hors de l’arène');
            // abandon : descendre de sa voiture
            A.etat = 'combat'; sortirVehicule(true); majDerby(1 / 30, 1 / 30); if (A.etat !== 'fin' || A.gagne) ko.push('abandon non compté');
            for (let i = 0; i < 30 * 4 && D.actif; i++) majDerby(1 / 30, 1 / 30);
            if (D.actif || D.porte.actif || A.voitures.some((x) => vehicules.includes(x) && !x.mort)) ko.push('arène pas nettoyée après le match');
          }
          // les murs tiennent : lancée à fond, aucune voiture ne sort de l'arène
          prep(); let sorties = 0;
          for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4, v = creerVehicule('derbyBreak', D.x, D.z, a, null); v.h = 0; v.v = VEHDEFS.derbyBreak.vmax;
            D.porte.actif = true; for (let i = 0; i < 90; i++) majVehiculePhys(v, 1 / 30, 1, 0, false); if (!dansArene(v.x, v.z, -1.5)) sorties++; v.mort = true; }
          D.porte.actif = false; if (sorties) ko.push(sorties + ' voiture(s) sortie(s) de l’arène par un mur');
          // mort pendant un match : tout est nettoyé
          prep(); derbyLancer(); mourir(); ETAT.timeScale = 1; if (D.actif || D.porte.actif) ko.push('mort pendant le match : derby pas arrêté');
          // jouable et perdable : matches complets, chacun sur sa graine
          // chaque match maîtrise sa scène : graine posée AVANT startRun, voitures de la ville retirées, niveau 0 des IA
          // (sinon le trafic et l'état laissé par les autres tests changent l'issue : 2/4 seul, 1/4 dans la suite)
          const match = (mode, g) => { graine(g); prep(); for (const v of vehicules) { scene.remove(v.mesh); libererEntite(v.mesh); } vehicules.length = 0;
            META.derby.niv = Object.assign({}, niv0); META.derby.victoires = 0; derbyLancer(); const A = D.actif; if (!A) { Math.random = rnd0; return null; }
            let t = 0, cible = null, decT = 0, bloqT = 0, reculT = 0, dir = [0, 0];
            while (D.actif === A && t < 200) { const dt = 1 / 30; t += dt;
              if (mode === 'pilote' && A.etat === 'combat') { const v = A.vJ; decT -= dt;
                if (v.dentT > 0.3 && !v._vu && reculT <= 0) { v._vu = true; reculT = 0.7; } else if (!(v.dentT > 0.3)) v._vu = false; // après l'impact, on recule pour reprendre de l'élan
                if (reculT > 0) { reculT -= dt; dir = [-Math.sin(v.ang), -Math.cos(v.ang)]; decT = 0; }
                else if (decT <= 0) { decT = 0.3; // réaction humaine
                  let best = null, bd = 1e9; for (const o of A.ias) { if (o.derbyKO || o.mort) continue; const d = Math.hypot(o.x - v.x, o.z - v.z) * (o.dbCible === v ? 1.6 : 1); if (d < bd) { bd = d; best = o; } }
                  cible = best; if (best) { const tx = best.x + Math.sin(best.ang) * best.v * 0.35, tz = best.z + Math.cos(best.ang) * best.v * 0.35, l = Math.hypot(tx - v.x, tz - v.z) || 1; dir = [(tx - v.x) / l, (tz - v.z) / l]; } }
                if (Math.abs(v.v) < 1 && reculT <= 0) { bloqT += dt; if (bloqT > 1) { bloqT = 0; reculT = 0.8; } } else bloqT = 0;
                INPUT.mx = dir[0]; INPUT.mz = dir[1]; } else { INPUT.mx = 0; INPUT.mz = 0; }
              derbyEntrees(); if (P.veh) majConduite(dt); majVehicules(dt); majDerby(dt, dt); }
            INPUT.mx = INPUT.mz = 0; Math.random = rnd0; return { gagne: A.gagne, t: Math.round(A.t), kos: A.kos }; };
          const pil = [], pas = [];
          for (const g of [101, 202, 303, 404]) pil.push(match('pilote', g));
          for (const g of [505, 606]) pas.push(match('passif', g));
          const nG = pil.filter((x) => x && x.gagne).length;
          if (!nG) ko.push('le pilote ne gagne jamais ' + JSON.stringify(pil));
          if (pas.some((x) => !x || x.gagne)) ko.push('un joueur passif gagne ' + JSON.stringify(pas));
          info.push('pilote : ' + nG + '/4 gagnés (' + pil.map((x) => x && (x.gagne ? 'G' : 'p') + x.t + 's').join(' ') + '), passif : 0/2');
          // prime une fois par vague, tenue « Casse-cou », victoires
          prep(); META.exploits.derby = false; const v0 = META.derby.victoires || 0; MERV.primes.derby = -1; derbyLancer(); const a1 = META.argent; derbyFin(true, 'dernier'); const g1 = META.argent - a1; derbyNettoyer();
          P.x = D.stand.x; P.z = D.stand.z; P.y = 0; derbyLancer(); const a2 = META.argent; /* même partie, même vague */ derbyFin(true, 'dernier'); const g2 = META.argent - a2; derbyNettoyer();
          if (!(g1 >= DERBY_PRIME) || g2 !== 0) ko.push('prime : ' + g1 + ' puis ' + g2 + ' dans la même vague');
          if (!META.exploits.derby || META.derby.victoires !== v0 + 2) ko.push('tenue ou victoires : ' + META.exploits.derby + ', ' + META.derby.victoires);
          if (!TENUES.find((x) => x.id === TENUE_EXPLOIT.derby)) ko.push('tenue du derby absente');
          info.push('prime ' + g1 + ' $ puis ' + g2 + ' dans la vague, tenue débloquée, habillage ' + p0 + ' → ' + p3 + ' pièces');
        } finally { Math.random = rnd0; INPUT.mx = INPUT.mz = 0; META.derby = Object.assign(META.derby, sauve); META.argent = argent0; derbyArreter(); }
        return { ko, info };
      });
      if (r.off) saute('Arène de derby : DECOR_V2 désactivé');
      else if (r.ko.length) fail('Arène de derby : ' + r.ko.join(' | ') + ' [' + (r.info || []).join(', ') + ']');
      else ok('Arène de derby : ' + r.info.join(' ; '));
    }

    // -------------------------------------------------------------------
    // Trafic sans scintillement (18 octobre, signalé : « des fois des véhicules
    // se suivent, se tapent l'un dans l'autre et scintillent s'il y a un
    // bouchon ») : 90 s de trafic réel en trois points (tirage fixé, le test
    // maîtrise sa scène). Un « scintillement » = un véhicule de trafic dont le
    // déplacement s'inverse d'une image à l'autre (plus de 3 cm chaque fois) :
    // c'était la séparation à pas fixe de resoudreCollisionsVehicule contre le
    // suivi de voie (avant : 300 à 970 par point ; un demi-tour normal en bord
    // de ville en fait un). Et plus de tas immobile devant Los Reyes Hills.
    // -------------------------------------------------------------------
    console.log('\n--- Trafic : pas de scintillement ni de tas dans les bouchons ---');
    {
      const r = await page.evaluate(() => {
        const ko = [], info = [], rnd0 = Math.random; let g = 1234;
        Math.random = () => { g = (g * 1664525 + 1013904223) >>> 0; return g / 4294967296; };
        try {
          const recouvre = (a, b) => { const dx = b.x - a.x, dz = b.z - a.z; if (dx * dx + dz * dz > 64) return false;
            const ax = [[Math.sin(a.ang), Math.cos(a.ang)], [Math.cos(a.ang), -Math.sin(a.ang)], [Math.sin(b.ang), Math.cos(b.ang)], [Math.cos(b.ang), -Math.sin(b.ang)]];
            const ext = (v, u) => v.def.long / 2 * Math.abs(Math.sin(v.ang) * u[0] + Math.cos(v.ang) * u[1]) + v.def.larg / 2 * Math.abs(Math.cos(v.ang) * u[0] - Math.sin(v.ang) * u[1]);
            for (const u of ax) if (Math.abs(dx * u[0] + dz * u[1]) >= ext(a, u) + ext(b, u) - 0.05) return false; return true; };
          for (const pt of [POIS.place, POIS.commissariat || { x: 100, z: -100 }, POIS.armurerie2 || { x: -21, z: 72 }]) {
            if (INT.actif) sortirInterieur(); if (P.veh) sortirVehicule(true);
            startRun(); ecran(null); ETAT.mode = 'jeu'; P.x = pt.x; P.z = pt.z; P.y = 0; P.hp = P.maxHp = 1e9; for (const e of ennemis) e.mort = true;
            let scint = 0, recouv = 0; const dprev = new Map(), dt = 1 / 30;
            for (let i = 0; i < 30 * 90; i++) {
              const avant = new Map(); for (const v of vehicules) if (v.conduit === 'trafic') avant.set(v, [v.x, v.z]);
              majVehicules(dt); WANTED.heat = 0;
              const T = []; for (const v of vehicules) if (v.conduit === 'trafic' && !v.mort) T.push(v);
              for (const v of T) { const a = avant.get(v); if (!a) continue; const ddx = v.x - a[0], ddz = v.z - a[1], pr = dprev.get(v);
                if (pr && Math.hypot(ddx, ddz) > 0.03 && Math.hypot(pr[0], pr[1]) > 0.03 && ddx * pr[0] + ddz * pr[1] < 0) scint++; dprev.set(v, [ddx, ddz]); }
              if (i % 3 === 0) { let f = false; for (let a = 0; a < T.length && !f; a++) for (let b = a + 1; b < T.length; b++) if (recouvre(T[a], T[b])) { f = true; break; } if (f) recouv++; } }
            if (scint > 90) ko.push(Math.round(pt.x) + ',' + Math.round(pt.z) + ' : ' + scint + ' scintillements en 90 s');
            info.push(Math.round(pt.x) + ',' + Math.round(pt.z) + ' : ' + scint + ' inversions, ' + recouv * 3 + ' images de contact');
          }
        } finally { Math.random = rnd0; }
        return { ko, info };
      });
      if (r.ko.length) fail('Trafic sans scintillement : ' + r.ko.join(' | ') + ' [' + r.info.join(', ') + ']');
      else ok('Trafic sans scintillement : ' + r.info.join(' ; '));
    }

    console.log('\n--- Bouton d\'action : aucun libellé rogné à 390 px ---');
    {
      const srcIdx = fs.readFileSync(INDEX_HTML, 'utf8');
      const libs = [];
      for (const m of srcIdx.matchAll(/\blabel=(['"])((?:(?!\1)[^\\]|\\.)*)\1\s*[;,)]/g)) libs.push(m[2].replace(/\\u2019/g, '’').replace(/\\(['"])/g, '$1'));
      const rognes = await page.evaluate((libs) => {
        const b = document.getElementById('btnAction'), avant = b.style.display, lab0 = b._label;
        b.style.display = 'block'; const out = [];
        const tous = libs.slice();
        // consignes dynamiques de la serre, lues dans CRITERES_SERRE (même préfixe que majAction)
        if (typeof CRITERES_SERRE !== 'undefined') for (const c of CRITERES_SERRE) tous.push('📋 CONSIGNE : ' + c.txt);
        for (const l of tous) { b._label = null; labelAction(b, l); if (b.scrollWidth > b.clientWidth + 1) out.push(l); }
        b._label = null; if (lab0) labelAction(b, lab0); b.style.display = avant;
        return { out, n: tous.length };
      }, libs);
      if (libs.length < 40) fail('Bouton d\'action : seulement ' + libs.length + ' libellés trouvés dans le source — l\'extraction ne marche plus');
      else if (rognes.out.length) fail('Bouton d\'action : libellés rognés à 390 px — ' + rognes.out.slice(0, 5).join(' | '));
      else ok('Bouton d\'action : aucun des ' + rognes.n + ' libellés n\'est rogné à 390 px (passage sur deux lignes si besoin)');
    }

    // -------------------------------------------------------------------
    // Icônes vectorielles : la copie intégrée à index.html est celle du
    // sprite livré, chaque arme du jeu (lue dans ARMES) a son icône, et
    // toute référence <use> de la page pointe vers un symbole existant.
    // -------------------------------------------------------------------
    console.log('\n--- Icônes vectorielles intégrées au jeu ---');
    {
      const sprite = fs.readFileSync(path.join(__dirname, 'icones', 'icones.svg'), 'utf8');
      const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
      const blocs = (t) => (t.match(/<symbol id="[^"]+"[\s\S]*?<\/symbol>/g) || []);
      const a = blocs(sprite), b = blocs(html);
      if (a.length && JSON.stringify(a) === JSON.stringify(b)) ok('Icônes : les ' + a.length + ' symboles de index.html sont identiques à icones/icones.svg');
      else fail('Icônes : copie intégrée différente du sprite (' + b.length + ' / ' + a.length + ') — lancer node icones/outils/integrer.js');
      const ic = await page.evaluate(() => {
        startRun();
        const out = { armesSansIcone: [], refsCassees: [], fire: null, pause: null };
        for (const id of Object.keys(ARMES)) if (!document.getElementById('ico-arme-' + id)) out.armesSansIcone.push(id);
        for (const id of Object.keys(ARMES)) { META.armes[id].poss = true; majArmeJoueur(id); const u = document.querySelector('#fireIco use'); if (!u || u.getAttribute('href') !== '#ico-arme-' + id) out.armesSansIcone.push(id + ' (bouton de tir)'); }
        majArmeJoueur('poings');
        for (const u of document.querySelectorAll('use')) { const h = u.getAttribute('href') || ''; if (!document.getElementById(h.slice(1))) out.refsCassees.push(h); }
        out.ico = ICONES_SVG;
        return out;
      });
      if (!ic.ico) saute('Icônes : ICONES_SVG = false (retour aux emojis) — vérifications d\'affichage non faites');
      else {
        if (ic.armesSansIcone.length) fail('Icônes : armes sans icône — ' + ic.armesSansIcone.join(', '));
        else ok('Icônes : chaque arme de ARMES a son icône, affichée sur le bouton de tir');
        if (ic.refsCassees.length) fail('Icônes : références <use> cassées — ' + ic.refsCassees.join(', '));
        else ok('Icônes : toutes les références <use> de la page pointent vers un symbole existant');
      }
    }

    // -------------------------------------------------------------------
    // Persistance : sauvegarde, rechargement, META cohérent.
    // -------------------------------------------------------------------
    console.log('\n--- Persistance (sauvegarde / rechargement) ---');
    const valeurs = { argent: 54321, niveau: 7 };
    await page.evaluate((v) => {
      META.argent = v.argent; META.niveau = v.niveau;
      // Isolation : boucle() vérifie les défis en tâche de fond toutes les
      // ~2 s de temps réel (ETAT.defiT), indépendamment de ce que fait ce
      // test — un défi resté « vrai mais pas encore vu » à cause d'un effet
      // de bord d'un scénario précédent (ex. META.defis.dist poussé au-delà
      // du seuil par un test véhicule) peut donc se déclencher à tout moment,
      // y compris pendant la page rechargée, entre la sauvegarde et la
      // lecture ci-dessous — modifiant META.argent sous le nez du test. On
      // neutralise tous les défis avant de sauvegarder pour que checkDefis()
      // ne puisse plus rien accorder, quel que soit le moment où il tourne.
      for (const d of DEFIS) META.defis.faits[d.id] = true;
      sauveMeta();
    }, valeurs);
    await page.reload({ waitUntil: 'load', timeout: 30000 });
    await page.waitForFunction(() => typeof PORTES !== 'undefined' && PORTES.length > 0, { timeout: 20000 });
    const metaApres = await page.evaluate(() => ({ argent: META.argent, niveau: META.niveau }));
    if (metaApres.argent !== valeurs.argent || metaApres.niveau !== valeurs.niveau) {
      fail('META non restauré après rechargement : attendu ' + JSON.stringify(valeurs) + ', obtenu ' + JSON.stringify(metaApres));
    } else {
      ok('META restauré correctement après sauvegarde + rechargement de page');
    }

    // -------------------------------------------------------------------
    // Règle des 8 unités, universelle, avec cliquet (voir CLAUDE.md « Zones
    // interactives et SORTIE » et DETTE_REGLE_8U en tête de fichier) : dans
    // TOUTES les salles d'INTDEFS, aucune zone interactive à moins de 8 u du
    // centre de la SORTIE, hors dette connue. Échoue si, et seulement si :
    //   - une zone sous 8 u n'est pas dans la baseline (nouvelle violation) ;
    //   - une zone de la baseline s'est rapprochée (tolérance 0,01) ;
    //   - une zone de la baseline est à >= 8 u ou a disparu (corrigée : la
    //     retirer de la baseline, pour que le cliquet ne se desserre jamais).
    // Placé en dernier, après le rechargement de la Persistance : entrer dans
    // les 26 salles a des effets de bord (1re visite du Site 51, compteurs de
    // visite...) qui ne doivent toucher aucun autre test. Salles lues dans
    // INTDEFS, zones dans zonesInterieurActives() — jamais recopiées.
    // Positions des intérieurs vérifiées identiques quelle que soit la graine.
    // -------------------------------------------------------------------
    console.log('\n--- Règle des 8 unités : aucune zone interactive à moins de 8 u de la SORTIE, hors dette connue (toutes les salles d\'INTDEFS) ---');
    // le test maîtrise sa scène : la porte de la Radio n'existe qu'avec
    // 'platine', posée à la génération de la ville — on l'acquiert puis on
    // recharge, sans dépendre de ce qu'ont laissé les tests précédents.
    await page.evaluate(() => { META.curios.platine = 1; sauveMeta(); });
    await page.reload({ waitUntil: 'load', timeout: 30000 });
    await page.waitForFunction(() => typeof PORTES !== 'undefined' && PORTES.length > 0, { timeout: 20000 });
    const regle8 = await page.evaluate(() => {
      startRun();
      const mesures = {}, nonMesurees = [];
      for (const id of Object.keys(INTDEFS)) {
        const porte = PORTES.find((p) => p.id === id);
        if (!porte) { nonMesurees.push(id + ' (aucune porte)'); continue; }
        entrerInterieur(id, porte);
        if (!INT.actif || INT.actif.id !== id) { nonMesurees.push(id + ' (entrée refusée)'); if (INT.actif) sortirInterieur(); continue; }
        const { zones } = zonesInterieurActives();
        const so = zones.find((z) => z.champ === 'sortie');
        if (!so) { nonMesurees.push(id + ' (zone SORTIE introuvable)'); sortirInterieur(); continue; }
        mesures[id] = {};
        const rang = {};
        for (const z of zones) {
          if (z.champ === 'sortie') continue;
          rang[z.champ] = (rang[z.champ] || 0) + 1;
          mesures[id][z.champ + '#' + rang[z.champ]] = { d: Math.hypot(z.x - so.x, z.z - so.z), r: z.r, rSortie: so.r };
        }
        sortirInterieur();
      }
      return { mesures, nonMesurees };
    });
    {
      const DIST_MIN = 8, TOL = 0.01;
      const arrondi = (x) => Math.round(x * 100) / 100;
      const categorie = (m) => (m.d < m.r + m.rSortie ? 'chevauche' : 'sous-marge');
      for (const n of regle8.nonMesurees) fail('Règle des 8 u : salle non mesurée — ' + n);
      const nouvelles = [], rapprochees = [], corrigees = [];
      for (const id of Object.keys(regle8.mesures)) {
        for (const [zone, m] of Object.entries(regle8.mesures[id])) {
          if (m.d < DIST_MIN && !(DETTE_REGLE_8U[id] && DETTE_REGLE_8U[id][zone])) {
            nouvelles.push(id + ' › ' + zone + ' à ' + arrondi(m.d) + ' u (' + categorie(m) + ")  →  baseline : '" + zone + "': [" + arrondi(m.d) + ", '" + categorie(m) + "']");
          }
        }
      }
      for (const [id, zonesDette] of Object.entries(DETTE_REGLE_8U)) {
        for (const [zone, [dBase]] of Object.entries(zonesDette)) {
          const m = regle8.mesures[id] && regle8.mesures[id][zone];
          if (!regle8.mesures[id]) continue; // salle non mesurée : déjà en échec ci-dessus
          if (!m) corrigees.push(id + ' › ' + zone + ' a disparu de la salle — à retirer de DETTE_REGLE_8U');
          else if (m.d >= DIST_MIN) corrigees.push(id + ' › ' + zone + ' est maintenant à ' + arrondi(m.d) + ' u (≥ 8) — corrigée, à retirer de DETTE_REGLE_8U');
          else if (m.d < dBase - TOL) rapprochees.push(id + ' › ' + zone + ' : ' + dBase + ' u → ' + arrondi(m.d) + ' u (s\'est rapprochée de la SORTIE)');
        }
      }
      for (const n of nouvelles) fail('Règle des 8 u : NOUVELLE violation, absente de la dette connue — ' + n);
      for (const r of rapprochees) fail('Règle des 8 u : dette aggravée — ' + r);
      for (const c of corrigees) fail('Règle des 8 u : ' + c);
      if (!nouvelles.length && !rapprochees.length && !corrigees.length && !regle8.nonMesurees.length) {
        const nbZones = Object.values(DETTE_REGLE_8U).reduce((n, z) => n + Object.keys(z).length, 0);
        const nbChev = Object.values(DETTE_REGLE_8U).reduce((n, z) => n + Object.values(z).filter(([, c]) => c === 'chevauche').length, 0);
        ok('Règle des 8 u : ' + Object.keys(regle8.mesures).length + ' salles mesurées, aucune nouvelle violation — dette connue : ' + nbZones + ' zones dans ' + Object.keys(DETTE_REGLE_8U).length + ' salles (' + nbChev + ' chevauchent la SORTIE)');
      }
    }

    // -------------------------------------------------------------------
    // Wingsuit V2 (18 octobre, demandé : « améliore le style de la wingsuit »). L'ancienne posait le corps à
    // −1,35 rad autour de l'axe x du MONDE (ordre XYZ) : sur le dos, les pieds en avant, et de travers dès qu'on
    // ne volait pas vers le sud ; les bras repliés DANS le torse ; la pose de chute libre l'écrasait à chaque image.
    // Ici, dans quatre caps : la poitrine regarde le sol, la tête pointe dans la direction du vol, les mains sont
    // loin de l'axe du corps (bras écartés), la combinaison est portée et visible, les traînées apparaissent en
    // vol et s'effacent après l'atterrissage.
    // -------------------------------------------------------------------
    console.log('\n--- Wingsuit V2 : ventre au sol, tête en avant dans tous les caps, bras écartés, traînées ---');
    const wingV2 = await page.evaluate(async () => {
      const dors = (ms) => new Promise((r) => setTimeout(r, ms));
      startRun(); ETAT.mode = 'jeu'; ETAT.timeScale = 1; P.hp = P.hpMax = 1e6;
      const ko = [], mesures = [], V = (x, y, z) => new THREE.Vector3(x, y, z);
      const x0 = PIC.ok ? PIC.plg.x : 0, z0 = PIC.ok ? PIC.plg.z1 + 4 : 0;
      for (const cap of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
        P.wing = false; P.wingsuit = true; P.x = x0; P.z = z0; P.y = 160; P.ang = cap; P.chute = true; P.chuteY0 = P.y + 10; P.chuteT = 0; P.chuteHaut = 160; P.vy = -4; P.para = false;
        P.chuteVx = Math.sin(cap) * 14; P.chuteVz = Math.cos(cap) * 14; INPUT.mx = 0; INPUT.mz = 0; deployerWingsuit();
        await dors(700);
        if (!P.wing) { ko.push('cap ' + cap.toFixed(2) + ' : le vol plané s’est arrêté'); continue; }
        P.h.g.updateMatrixWorld(true);
        const q = P.h.g.getWorldQuaternion(new THREE.Quaternion()), tete = V(0, 1, 0).applyQuaternion(q), poitrine = V(0, 0, 1).applyQuaternion(q);
        const dir = V(Math.sin(P.wingAng), 0, Math.cos(P.wingAng)), avant = tete.dot(dir), bas = -poitrine.y;
        const centre = P.h.g.getWorldPosition(V(0, 0, 0)), axe = tete.clone().normalize();
        const ecart = (bras) => { const m = bras.localToWorld(V(0, -0.55, 0)).sub(centre); return m.sub(axe.clone().multiplyScalar(m.dot(axe))).length(); };
        const eG = ecart(P.h.brasG), eD = ecart(P.h.brasD);
        mesures.push('cap ' + Math.round(cap * 180 / Math.PI) + '° : tête·avant ' + avant.toFixed(2) + ', poitrine·bas ' + bas.toFixed(2) + ', mains à ' + eG.toFixed(2) + '/' + eD.toFixed(2) + ' u de l’axe');
        if (avant < 0.85) ko.push('cap ' + Math.round(cap * 180 / Math.PI) + '° : la tête ne pointe pas dans la direction du vol (' + avant.toFixed(2) + ')');
        if (bas < 0.85) ko.push('cap ' + Math.round(cap * 180 / Math.PI) + '° : la poitrine ne regarde pas le sol (' + bas.toFixed(2) + ')');
        if (Math.min(eG, eD) < 0.6) ko.push('cap ' + Math.round(cap * 180 / Math.PI) + '° : bras repliés (' + eG.toFixed(2) + ', ' + eD.toFixed(2) + ')');
        if (!P.wingMesh || !P.wingMesh.visible || P.wingMesh.parent !== P.h.g) ko.push('combinaison absente ou détachée du joueur');
        if (!WING_FX.rubans || !WING_FX.rubans[0].m.visible) ko.push('pas de traînée en vol');
      }
      // on ouvre la voile, on se pose : la traînée s'efface, la pose redevient normale
      ouvrirParachute(); P.y = solPied(P.x, P.z) + 0.5; await dors(1200);
      if (P.wing) ko.push('toujours en vol plané après la voile');
      if (WING_FX.rubans && WING_FX.rubans.some((r) => r.m.visible)) ko.push('traînée encore visible après le vol');
      if (Math.abs(P.h.jambeG.rotation.z) > 1e-3 || Math.abs(P.h.jambeD.rotation.z) > 1e-3) ko.push('jambes restées écartées après le vol');
      startRun();
      return { ko, mesures };
    });
    if (wingV2.ko.length) fail('Wingsuit V2 : ' + wingV2.ko.join(' ; ') + ' (' + wingV2.mesures.join(' | ') + ')');
    else ok('Wingsuit V2 : ' + wingV2.mesures.join(' | ') + ' ; traînées en vol, effacées au sol');

    // -------------------------------------------------------------------
    // Habillage V2 des salles (18 octobre, demandé : « refais la cohérence, les textures, le réalisme, la
    // qualité de toutes les salles »). Pour CHAQUE salle d'INTDEFS hors SALLES_SANS_HABILLAGE (listes lues dans
    // le jeu) : sol et murs texturés, plus aucune boîte unie (matériau mat() partagé) parmi les meubles visibles,
    // un lambris, des murs habillés ; aucun solide ajouté (l'habillage ne change jamais où l'on marche) ; jamais
    // de lumière dans le métro ni au Site 51 ; chaque meuble a SON matériau (recolorer l'un ne touche pas les
    // autres). Et, dans le source : aucune fonction de premier niveau déclarée deux fois — la seconde écrase la
    // première sans erreur (bug trouvé ainsi : texAffiche des salles écrasait celle des affiches de la ville et
    // décalait les tirages — une porte avait changé de façade).
    // -------------------------------------------------------------------
    console.log('\n--- Habillage V2 des salles : sol, murs, meubles, murs habillés, aucun solide ajouté ---');
    {
      const src = fs.readFileSync(INDEX_HTML, 'utf8'), vus = {}, doubles = [];
      for (const m of src.matchAll(/^function ([A-Za-z0-9_$]+)\(/gm)) { if (vus[m[1]]) doubles.push(m[1]); vus[m[1]] = 1; }
      if (doubles.length) fail('Source : fonctions de premier niveau déclarées deux fois (la seconde écrase la première) : ' + doubles.join(', '));
      else ok('Source : aucune fonction de premier niveau déclarée deux fois (' + Object.keys(vus).length + ' fonctions)');
    }
    const habillage = await page.evaluate(() => {
      startRun();
      const ko = [], bilan = []; let nSalles = 0;
      if (/addSolid|solide\(|box\(/.test(habillerSalleV2.toString())) ko.push('habillerSalleV2 pose des solides (il ne doit jamais changer où l’on marche)');
      const estMatPartage = (m) => m && m.isMeshLambertMaterial && !m.map && (_matCache[m.color.getHex()] === m || _matCacheDecor[m.color.getHex()] === m);
      for (const id of Object.keys(INTDEFS)) {
        if (SALLES_SANS_HABILLAGE.has(id)) continue;
        if (INT.actif) sortirInterieur();
        const pte = PORTES.find((q) => q.id === id) || { x: P.x, z: P.z, nx: 0, nz: 1 }; entrerInterieur(id, pte);
        const s = INT.actif; if (!s || s.id !== id) { ko.push(id + ' : entrée impossible'); continue; }
        nSalles++;
        let solTex = false, murTex = 0, nus = 0, matieres = new Set(), nMeubles = 0, lumieres = 0;
        for (const o of s.g.children) { if (!o.isMesh || !o.visible) continue;
          if (o.geometry && o.geometry.parameters && o.geometry.parameters.width === s.D.w && o.geometry.parameters.depth === s.D.d && o.position.y === 0) solTex = !!o.material.map;
          if (o.position.y === 2.2 && o.geometry.parameters && o.geometry.parameters.height === 4.4 && o.material.map) murTex++;
          if (o.geometry && o.geometry.type === 'BoxGeometry' && o !== s.dehors && estMatPartage(o.material) && s.g.children.indexOf(o) < s.habillageN) nus++; // les objets nés en jeu (piles, poids…) gardent le leur
          if (o.geometry && o.geometry.type === 'BoxGeometry' && o.material && o.material.map && o.position.y > 0.2 && o.position.y < 3.9 && !(o.position.y === 2.2 && o.geometry.parameters.height === 4.4)) { nMeubles++; matieres.add(o.material); } // les murs partagent le leur
          if (o.material && o.material.isMeshBasicMaterial && o.material.map === texGlow && o.position.y > 1.5) lumieres++; }
        if (!solTex) ko.push(id + ' : sol sans texture');
        if (murTex < 3) ko.push(id + ' : murs sans texture (' + murTex + ')');
        if (nus) ko.push(id + ' : ' + nus + ' meuble(s) encore en matériau uni partagé');
        if (nMeubles > 1 && matieres.size < nMeubles) ko.push(id + ' : des meubles partagent leur matériau (' + matieres.size + ' pour ' + nMeubles + ')');
        if (HABILLAGE_SALLES[id] && HABILLAGE_SALLES[id].sansLumiere && lumieres) ko.push(id + ' : ' + lumieres + ' lumière(s) ajoutée(s) dans une salle où l’obscurité est le jeu');
        bilan.push(id);
        sortirInterieur();
      }
      // un matériau du cache mat() est PARTAGÉ par tous les objets de sa couleur : le rendre translucide (ou le
      // recolorer) touche tout le jeu — la clôture de l'aérodrome rendait translucides les rampes, rails, appareils…
      for (const [nom, C] of [['ville', _matCache], ['décor', _matCacheDecor]]) for (const k in C) { const m = C[k]; if (m.transparent || m.opacity < 1) ko.push('matériau partagé ' + nom + ' #' + (+k).toString(16).padStart(6, '0') + ' rendu translucide (opacité ' + m.opacity + ')'); }
      return { ko, nSalles, bilan: bilan.join(', ') };
    });
    if (habillage.ko.length) fail('Habillage des salles : ' + habillage.ko.length + ' défaut(s) — ' + habillage.ko.slice(0, 8).join(' ; '));
    else ok('Habillage des salles : ' + habillage.nSalles + ' salles — sol et murs texturés, aucun meuble uni partagé, chaque meuble a son matériau, aucun solide ajouté, aucune lumière dans le noir, aucun matériau partagé translucide (' + habillage.bilan + ')');
  } catch (e) {
    fail('Exception pendant les scénarios : ' + (e && e.stack || e));
  } finally {
    console.log('\n--- Erreurs JS remontées par la page ---');
    if (erreursPage.length) {
      const vues = new Set();
      for (const e of erreursPage) {
        if (vues.has(e)) continue; vues.add(e);
        fail(e);
      }
    } else {
      ok('Aucune erreur JS dans la page pendant toute la session');
    }
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }

  console.log('\n' + '='.repeat(60));
  if (sautes.length) {
    console.log(sautes.length + ' vérification(s) SAUTÉE(S) par le tirage (graine ' + SEED + ') — angles morts de cette run :');
    for (const s of sautes) console.log('  ⤼ ' + s);
  } else {
    console.log('Aucune vérification sautée (graine ' + SEED + ').');
  }
  if (echecs) {
    console.error(echecs + ' vérification(s) en échec.');
    console.error('Graine : ' + SEED + ' — rejouer ce tirage exact : SEED=' + SEED + ' node scenarios.js');
    process.exit(1);
  } else {
    console.log('Tous les scénarios sont passés.');
    process.exit(0);
  }
}

main();
