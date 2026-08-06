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

let echecs = 0;
function fail(msg) { echecs++; console.error('✗ ' + msg); }
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
  console.log('Démarrage du serveur local...');
  const server = await demarrerServeur();
  info('http://127.0.0.1:' + PORT + '/ (Three.js et eruda servis en local, aucun réseau requis)');

  console.log('Lancement de Chromium headless...');
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });

  const erreursPage = [];
  page.on('pageerror', (e) => erreursPage.push('pageerror: ' + (e && e.message || e)));
  page.on('console', (msg) => { if (msg.type() === 'error') erreursPage.push('console.error: ' + msg.text()); });
  page.on('requestfailed', (req) => {
    if (!req.url().startsWith('http://127.0.0.1')) return; // ressources externes non pertinentes (aucune attendue)
    erreursPage.push('requestfailed: ' + req.url() + ' — ' + (req.failure() && req.failure().errorText));
  });

  try {
    console.log('\nChargement de la page...');
    await page.goto('http://127.0.0.1:' + PORT + '/', { waitUntil: 'load', timeout: 30000 });
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
        texteToastPanneau = document.getElementById('toastBox').lastElementChild.textContent;
      }
      // premier appui sur le boîtier : arme + toast d'avertissement (pas encore le casse)
      P.x = s.boitier.x; P.z = s.boitier.z; majAction(); document.getElementById('btnAction')._fn();
      const texteToastBoitier = document.getElementById('toastBox').lastElementChild.textContent;
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
      // place le frelon juste devant la tête et force un pas, 5 fois de suite
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
    if (vipereTest.scoreApresRepas !== 5) fail('Arcade : VIPÈRE — score attendu 5 après 5 Frelons avalés, obtenu ' + vipereTest.scoreApresRepas);
    else ok('Arcade : VIPÈRE compte bien les Frelons avalés');
    if (vipereTest.timeScaleAvant !== 1 || vipereTest.timeScalePendant !== 1) fail('Arcade : jouer à une borne modifie ETAT.timeScale — le temps ne coûte plus le même prix qu\'ailleurs');
    else ok('Arcade : jouer à une borne ne met pas le jeu en pause (ETAT.timeScale inchangé)');
    if (!vipereTest.jeuTermineApresMur) fail('Arcade : VIPÈRE — toucher le mur n\'a pas terminé la partie');
    else ok('Arcade : VIPÈRE se termine bien en touchant un mur');
    if (vipereTest.tickets !== 1) fail('Arcade : VIPÈRE — tickets attendus 1 (5 Frelons / 4), obtenu ' + vipereTest.tickets);
    else ok('Arcade : VIPÈRE crédite le bon nombre de tickets (1 par tranche de 4 Frelons)');

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
    else if (demolition.verreDetruit === null) info('Arcade : aucune brique de verre dans cette tour (tirage), sous-test ignoré');
    else ok('Arcade : le verre se détruit bien en 1 coup pour 1 point');
    if (demolition.vieApres1Coup === 1 && demolition.acierDetruitApres2Coups === true) ok('Arcade : l\'acier se fissure au 1er coup puis se détruit au 2e (4 points)');
    else if (demolition.vieApres1Coup === null) info('Arcade : aucune brique d\'acier dans cette tour (tirage), sous-test ignoré');
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
      // 1er jeton : une partie de VIPÈRE menée jusqu'au bout (4 Frelons, mur)
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
    // Ciné-Palace : effet de La Bobine « ASPHALTE I » (suite — la curiosité
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
    if (!fouilleCine.rareConfiserie || !fouilleCine.resultat.confiserie.some((v) => v >= fouilleCine.rareConfiserie.min && v <= fouilleCine.rareConfiserie.max)) info('Ciné-Palace : la somme rare de la confiserie n\'est pas tombée sur 60 tirages (probabilité ~6 %, possible par hasard)');
    else ok('Ciné-Palace : la somme rare de la confiserie est bien tombée dans sa fourchette déclarée au moins une fois');

    // -------------------------------------------------------------------
    // Deux horloges dans boucle() : dt (mis à l'échelle par ETAT.timeScale,
    // pour le spectacle — rendu, déplacement des entités, physique) et
    // dtJeu (temps réel, jamais mis à l'échelle, pour les compteurs de
    // gameplay). Un ralenti (chef de gang, ou La Bobine « ASPHALTE I » sur
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
    if (!fouilleMetro.rareMetro3 || !fouilleMetro.resultat.metro3.some((v) => v >= fouilleMetro.rareMetro3.min && v <= fouilleMetro.rareMetro3.max)) info('Métro : la somme rare de la table metro3 n\'est pas tombée sur 60 tirages (probabilité ~15 %, possible par hasard)');
    else ok('Métro : la somme rare de la table metro3 est bien tombée dans sa fourchette déclarée au moins une fois');
    if (!fouilleMetro.pileTrouvee) info('Métro : aucune pile trouvée en fouille sur 60 tirages de la table metro3 (probabilité ~20 % par tirage, possible par hasard)');
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
    // Radio pirate Solara FM : verrouillée sans la curiosité 'platine'. La
    // porte n'existe nulle part tant qu'elle n'a pas été acquise AVANT la
    // génération de la ville — vérifié ici, avant de l'accorder et de
    // recharger (le karaoké, plus haut dans la suite, l'a déjà acquise en
    // mémoire, mais la ville de ce chargement-ci a été générée avant).
    // -------------------------------------------------------------------
    console.log('\n--- Radio pirate Solara FM : verrouillée sans la curiosité \'platine\' ---');
    const radioAvant = await page.evaluate(() => PORTES.some((p) => p.id === 'radio'));
    if (radioAvant) fail('Radio : la porte existe alors que la ville a été générée sans la curiosité \'platine\'');
    else ok('Radio : aucune porte tant que la curiosité \'platine\' n\'était pas acquise à la génération de la ville');

    console.log('\n--- Radio pirate Solara FM : porte + curiosité \'micro\' après acquisition de \'platine\' (rechargement) ---');
    await page.evaluate(() => { META.curios.platine = 1; sauveMeta(); });
    await page.reload({ waitUntil: 'load', timeout: 30000 });
    await page.waitForFunction(() => typeof PORTES !== 'undefined' && PORTES.length > 0, { timeout: 20000 });
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
    console.log('\n--- Radio pirate Solara FM : espacements (console, racks, sortie) ---');
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
    console.log('\n--- Radio pirate Solara FM : démarrage, aiguille dans/hors la porteuse, triangulation ---');
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
    console.log('\n--- Radio pirate Solara FM : le glissement du doigt pilote directement l\'aiguille ---');
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
    console.log('\n--- Radio pirate Solara FM : segment réussi à 70 %, gains, bonus des 3 segments ---');
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
    console.log('\n--- Radio pirate Solara FM : appel d\'auditeur pendant la pause, jamais répété dans la même émission ---');
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
    console.log('\n--- Radio pirate Solara FM : curiosité Le Micro Vintage (émission parfaite uniquement) ---');
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
    console.log('\n--- Radio pirate Solara FM : limite de 2 émissions par vague, l\'abandon consomme l\'émission ---');
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
    console.log('\n--- Radio pirate Solara FM : triangulation à 100 % = descente de police ---');
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
    console.log('\n--- Radio pirate Solara FM : réinitialisations (vague, mort, game over) ---');
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
    console.log('\n--- Radio pirate Solara FM : table de fouille des racks (jamais négatif, encaissement immédiat) ---');
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
    if (!fouilleRadio.rareRadio || !fouilleRadio.gains.some((v) => v >= fouilleRadio.rareRadio.min && v <= fouilleRadio.rareRadio.max)) info('Radio : la somme rare n\'est pas tombée sur 60 tirages (probabilité ~5 %, possible par hasard)');
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
    console.log('\n--- Radio pirate Solara FM : la curiosité Le Micro Vintage n\'entraîne aucune erreur sur la minimap ---');
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
    // Chalutier « Sainte-Odile » : porte, quartier, curiosité activée.
    // -------------------------------------------------------------------
    console.log('\n--- Chalutier « Sainte-Odile » : porte, quartier, curiosité activée ---');
    const chalPorte = await page.evaluate(() => {
      const p = PORTES.find((x) => x.id === 'chalutier');
      const c = CURIOS.find((x) => x.id === 'boussole');
      return {
        porteExiste: !!p,
        quartierAttendu: quartier(11, 8),
        curioActive: c ? c.actif : null,
        curioA_eff: c ? !!c.eff : false,
        curioA_ind: c ? !!c.ind : false,
      };
    });
    if (!chalPorte.porteExiste) fail('Chalutier : aucune porte posée pour la salle');
    else ok('Chalutier : la porte est bien posée');
    if (chalPorte.quartierAttendu !== 'port') fail('Chalutier : quartier(11,8) ne vaut plus \'port\' (' + chalPorte.quartierAttendu + ') — repositionner caseCentre(11,8)');
    else ok('Chalutier : quartier(11,8) vaut bien \'port\', comme demandé');
    if (!chalPorte.curioActive || !chalPorte.curioA_eff || !chalPorte.curioA_ind) fail('Chalutier : la curiosité \'boussole\' n\'est pas correctement activée (actif/eff/ind)');
    else ok('Chalutier : la curiosité \'boussole\' est bien activée avec ses textes');

    // -------------------------------------------------------------------
    // Espacements — lus depuis la salle réelle, jamais recopiés (voir
    // CLAUDE.md). Les 3 postes + les 2 contenants à ≥8 u entre eux et de
    // la sortie.
    // -------------------------------------------------------------------
    console.log('\n--- Chalutier « Sainte-Odile » : espacements (barre, canne, treuil, contenants, sortie) ---');
    const espacementsChal = await page.evaluate(() => {
      const p = PORTES.find((x) => x.id === 'chalutier');
      entrerInterieur('chalutier', p);
      const s = INT.actif;
      const zones = [s.barre, s.canne, s.treuil, s.billot].concat(s.fouilles.map((f) => ({ x: f.x, z: f.z })));
      const distEntreZones = [];
      for (let i = 0; i < zones.length; i++) for (let j = i + 1; j < zones.length; j++) {
        distEntreZones.push(Math.hypot(zones[i].x - zones[j].x, zones[i].z - zones[j].z));
      }
      const zonesVsSortie = zones.map((z) => Math.hypot(z.x - s.sortie.x, z.z - s.sortie.z));
      const nbFouilles = s.fouilles.length;
      if (INT.actif) sortirInterieur();
      return { distEntreZones, zonesVsSortie, nbFouilles };
    });
    if (Math.min(...espacementsChal.distEntreZones) < 7.99) fail('Chalutier : deux zones interactives sont à moins de 8 unités l\'une de l\'autre (' + JSON.stringify(espacementsChal.distEntreZones) + ')');
    else ok('Chalutier : la barre, la canne, le treuil, le billot et les contenants sont bien espacés d\'au moins 8 unités entre eux');
    if (espacementsChal.zonesVsSortie.some((d) => d < 7.99)) fail('Chalutier : une zone interactive est à moins de 8 unités du centre de la sortie (' + JSON.stringify(espacementsChal.zonesVsSortie) + ')');
    else ok('Chalutier : toutes les zones interactives sont bien à au moins 8 unités de la sortie');
    if (espacementsChal.nbFouilles !== 2) fail('Chalutier : nombre de contenants fouillables inattendu (' + espacementsChal.nbFouilles + ', attendu 2)');
    else ok('Chalutier : les 2 contenants fouillables (coffre du pont, cabine du capitaine) sont bien enregistrés');

    // -------------------------------------------------------------------
    // Zones de pêche : seuils de distance.
    // -------------------------------------------------------------------
    console.log('\n--- Chalutier « Sainte-Odile » : zones de pêche selon la distance au ponton ---');
    const zonesDist = await page.evaluate(() => ({
      z1: chalutierZoneDe(0),
      z1b: chalutierZoneDe(CHALUTIER_ZONE1_MAX - 1),
      z2: chalutierZoneDe(CHALUTIER_ZONE1_MAX + 1),
      z2b: chalutierZoneDe(CHALUTIER_ZONE2_MAX - 1),
      z3: chalutierZoneDe(CHALUTIER_ZONE2_MAX + 1),
    }));
    if (zonesDist.z1 !== 1 || zonesDist.z1b !== 1) fail('Chalutier : les Hauts-Fonds ne couvrent pas correctement [0, ' + 'ZONE1_MAX[ (' + JSON.stringify(zonesDist) + ')');
    else ok('Chalutier : les Hauts-Fonds sont bien la zone la plus proche du ponton');
    if (zonesDist.z2 !== 2 || zonesDist.z2b !== 2) fail('Chalutier : le Banc du Large ne couvre pas correctement la zone intermédiaire (' + JSON.stringify(zonesDist) + ')');
    else ok('Chalutier : le Banc du Large est bien la zone intermédiaire');
    if (zonesDist.z3 !== 3) fail('Chalutier : la Fosse ne commence pas au-delà de ZONE2_MAX');
    else ok('Chalutier : la Fosse est bien la zone la plus éloignée');

    // -------------------------------------------------------------------
    // Démarrage d'une sortie, prise de la barre, pilotage au joystick.
    // -------------------------------------------------------------------
    console.log('\n--- Chalutier « Sainte-Odile » : démarrage de la sortie, pilotage à la barre ---');
    const sortie = await page.evaluate(() => {
      const p = PORTES.find((x) => x.id === 'chalutier');
      startRun();
      entrerInterieur('chalutier', p);
      const s = INT.actif;
      P.x = s.barre.x; P.z = s.barre.z;
      majAction(); document.getElementById('btnAction')._fn(); // LARGUER LES AMARRES
      const demarree = s.sortieEnCours;
      majAction(); document.getElementById('btnAction')._fn(); // PRENDRE LA BARRE
      const auxCommandes = s.auxCommandes;
      INPUT.mx = 0; INPUT.mz = -1;
      const xAvant = s.bateau.x, zAvant = s.bateau.z;
      for (let i = 0; i < 60; i++) majInterieur(0.05, 0.05);
      const distParcourue = Math.hypot(s.bateau.x - xAvant, s.bateau.z - zAvant);
      INPUT.mx = 0; INPUT.mz = 0;
      if (INT.actif) sortirInterieur();
      return { demarree, auxCommandes, distParcourue };
    });
    if (!sortie.demarree) fail('Chalutier : LARGUER LES AMARRES ne démarre pas la sortie');
    else ok('Chalutier : LARGUER LES AMARRES démarre bien la sortie en mer');
    if (!sortie.auxCommandes) fail('Chalutier : PRENDRE LA BARRE ne passe pas aux commandes');
    else ok('Chalutier : PRENDRE LA BARRE passe bien aux commandes');
    if (sortie.distParcourue < 1) fail('Chalutier : le joystick à la barre ne fait pas avancer le bateau (distance=' + sortie.distParcourue + ')');
    else ok('Chalutier : le joystick à la barre fait bien avancer le bateau, avec inertie');

    // -------------------------------------------------------------------
    // Combat à la canne : morsure -> ferrage -> tension entre deux limites.
    // Une alternance simple (bascule près des bords de la bonne plage) doit
    // suffire à ferrer un maquereau — vérifié en simulant vraiment la
    // séquence, pas en supposant (voir CLAUDE.md, cadences de tap).
    // -------------------------------------------------------------------
    console.log('\n--- Chalutier « Sainte-Odile » : canne — morsure, ferrage, combat de tension ---');
    const canneBase = await page.evaluate(() => {
      const p = PORTES.find((x) => x.id === 'chalutier');
      startRun();
      entrerInterieur('chalutier', p);
      const s = INT.actif;
      P.x = s.barre.x; P.z = s.barre.z;
      majAction(); document.getElementById('btnAction')._fn();
      P.x = s.canne.x; P.z = s.canne.z;
      majAction(); document.getElementById('btnAction')._fn(); // jeter la ligne
      const enAttente = s.canneEtat === 'attente';
      s.canneDelai = 0;
      majInterieur(0.01, 0.01);
      const enMorsure = s.canneEtat === 'morsure';
      majAction(); document.getElementById('btnAction')._fn(); // FERRE
      const enCombat = s.canneEtat === 'combat', especeValide = !!CHALUTIER_POISSONS[s.canneEspece];
      // tension à 0 : le poisson se libère
      s.canneTension = 1; INPUT.btn.action = false;
      majInterieur(1, 1);
      const libereApres = s.canneEtat === null && s.canneTension === 50;
      // tension à 100 : la ligne casse
      s.canneEtat = 'combat'; s.canneTension = 98; s.canneEspece = 'maquereau'; s.canneProgres = 0;
      INPUT.btn.action = true;
      majInterieur(1, 1);
      const casseApres = s.canneEtat === null && s.canneTension === 50;
      INPUT.btn.action = false;
      if (INT.actif) sortirInterieur();
      return { enAttente, enMorsure, enCombat, especeValide, libereApres, casseApres };
    });
    if (!canneBase.enAttente) fail('Chalutier : JETER LA LIGNE ne passe pas en attente de morsure');
    else ok('Chalutier : JETER LA LIGNE passe bien en attente de morsure');
    if (!canneBase.enMorsure) fail('Chalutier : le délai de morsure écoulé ne déclenche pas la fenêtre de ferrage');
    else ok('Chalutier : le délai de morsure écoulé déclenche bien la fenêtre de ferrage');
    if (!canneBase.enCombat || !canneBase.especeValide) fail('Chalutier : FERRER pendant la fenêtre ne démarre pas un combat avec une espèce valide');
    else ok('Chalutier : ferrer pendant la fenêtre démarre bien le combat de tension');
    if (!canneBase.libereApres) fail('Chalutier : une tension à 0 ne libère pas le poisson');
    else ok('Chalutier : une tension tombée à 0 libère bien le poisson (trop peu de tension)');
    if (!canneBase.casseApres) fail('Chalutier : une tension à 100 ne casse pas la ligne');
    else ok('Chalutier : une tension montée à 100 casse bien la ligne (trop de tension)');

    const ferrageRate = await page.evaluate(() => {
      const p = PORTES.find((x) => x.id === 'chalutier');
      startRun();
      entrerInterieur('chalutier', p);
      const s = INT.actif;
      P.x = s.barre.x; P.z = s.barre.z;
      majAction(); document.getElementById('btnAction')._fn();
      P.x = s.canne.x; P.z = s.canne.z;
      majAction(); document.getElementById('btnAction')._fn();
      s.canneDelai = 0;
      majInterieur(0.01, 0.01);
      // fenêtre de ferrage manquée -> le poisson file, prêt à recaster
      s.canneFerrageT = 0;
      majInterieur(0.01, 0.01);
      const fenetreManquee = s.canneEtat === null;
      if (INT.actif) sortirInterieur();
      return { fenetreManquee };
    });
    if (!ferrageRate.fenetreManquee) fail('Chalutier : une fenêtre de ferrage manquée ne relâche pas le poisson');
    else ok('Chalutier : une fenêtre de ferrage manquée relâche bien le poisson (prêt à recaster)');

    console.log('\n--- Chalutier « Sainte-Odile » : le combat se gagne avec une alternance simple, jamais en mashant un seul bouton ---');
    const combatSim = await page.evaluate(() => {
      const p = PORTES.find((x) => x.id === 'chalutier');
      const centre = (CHALUTIER_TENSION_BONNE[0] + CHALUTIER_TENSION_BONNE[1]) / 2;
      const demiLarg = 15; // maquereau : bande large (35-65)
      function combat(strategie) {
        startRun();
        entrerInterieur('chalutier', p);
        const s = INT.actif;
        P.x = s.barre.x; P.z = s.barre.z;
        majAction(); document.getElementById('btnAction')._fn();
        s.canneEtat = 'combat'; s.canneEspece = 'maquereau'; s.canneTension = 50; s.canneProgres = 0;
        let tenant = true, ticks = 0, gagne = false, casse = false, libere = false;
        while (ticks < 4000 && s.canneEtat === 'combat') {
          if (strategie === 'alterne') {
            if (s.canneTension > centre + demiLarg * 0.6) tenant = false;
            else if (s.canneTension < centre - demiLarg * 0.6) tenant = true;
          } else tenant = strategie === 'tenir';
          INPUT.btn.action = tenant;
          majInterieur(0.05, 0.05);
          ticks++;
        }
        gagne = s.cale.length > 0;
        casse = s.cale.length === 0 && ticks < 4000; // sorti du combat sans prise = échec (casse ou libéré)
        INPUT.btn.action = false;
        if (INT.actif) sortirInterieur();
        return { gagne, ticks, tempsSimule: Math.round(ticks * 0.05 * 10) / 10 };
      }
      return { alterne: combat('alterne'), toujoursTenir: combat('tenir'), toujoursRelacher: combat('relacher') };
    });
    if (!combatSim.alterne.gagne) fail('Chalutier : une alternance simple (bascule près des bords de la bonne plage) ne suffit pas à ferrer un maquereau en ' + combatSim.alterne.tempsSimule + ' s simulées — le combat serait ingagnable à l\'intuition');
    else ok('Chalutier : une alternance simple ferre bien un maquereau (' + combatSim.alterne.tempsSimule + ' s simulées)');
    if (combatSim.toujoursTenir.gagne) fail('Chalutier : tenir en continu (sans jamais relâcher) réussit le combat — la ligne devrait casser');
    else ok('Chalutier : tenir en continu casse bien la ligne, sans jamais aboutir à une prise');
    if (combatSim.toujoursRelacher.gagne) fail('Chalutier : relâcher en continu (sans jamais tirer) réussit le combat — le poisson devrait se libérer');
    else ok('Chalutier : relâcher en continu libère bien le poisson, sans jamais aboutir à une prise');

    // -------------------------------------------------------------------
    // Filet : charge tant qu'il traîne, conversion en prises au remontage,
    // risque réel de déchirure au-delà de la zone rouge.
    // -------------------------------------------------------------------
    console.log('\n--- Chalutier « Sainte-Odile » : filet — charge, remontage, risque de déchirure ---');
    const filet = await page.evaluate(() => {
      const p = PORTES.find((x) => x.id === 'chalutier');
      startRun();
      entrerInterieur('chalutier', p);
      const s = INT.actif;
      P.x = s.barre.x; P.z = s.barre.z;
      majAction(); document.getElementById('btnAction')._fn();
      P.x = s.treuil.x; P.z = s.treuil.z;
      majAction(); document.getElementById('btnAction')._fn(); // jeter le filet
      const traine = s.filetEtat === 'traine';
      s.filetCharge = 55;
      const caleAvant = s.cale.length;
      majAction(); document.getElementById('btnAction')._fn(); // remonter
      const caleApres = s.cale.length, filetVide = s.filetEtat === null;
      // risque de déchirure : très nombreuses tentatives en zone rouge
      let dechireAuMoinsUneFois = false;
      for (let i = 0; i < 500 && !dechireAuMoinsUneFois; i++) {
        if (s.filetEtat !== 'traine') { s.filetEtat = 'traine'; s.filetCharge = 99; }
        majInterieur(0.3, 0.3);
        if (s.filetEtat === null) dechireAuMoinsUneFois = true;
      }
      if (INT.actif) sortirInterieur();
      return { traine, caleAvant, caleApres, filetVide, dechireAuMoinsUneFois };
    });
    if (!filet.traine) fail('Chalutier : JETER LE FILET ne passe pas en traîne');
    else ok('Chalutier : JETER LE FILET passe bien en traîne');
    if (filet.caleApres <= filet.caleAvant) fail('Chalutier : remonter un filet chargé à 55 % n\'ajoute aucune prise à la cale');
    else ok('Chalutier : remonter le filet convertit bien la charge en prises dans la cale');
    if (!filet.filetVide) fail('Chalutier : le filet reste en traîne après avoir été remonté');
    else ok('Chalutier : le filet est bien vidé après remontage');
    if (!filet.dechireAuMoinsUneFois) fail('Chalutier : le filet ne se déchire jamais au-delà de la zone rouge, même après 150 s cumulées simulées');
    else ok('Chalutier : le filet finit bien par se déchirer (tout perdu) au-delà de la zone rouge');

    // -------------------------------------------------------------------
    // Objets étranges : uniquement à la Fosse, environ une fois sur huit.
    // -------------------------------------------------------------------
    console.log('\n--- Chalutier « Sainte-Odile » : objets étranges au filet, uniquement à la Fosse ---');
    const objetsTest = await page.evaluate(() => {
      const p = PORTES.find((x) => x.id === 'chalutier');
      startRun();
      entrerInterieur('chalutier', p);
      const s = INT.actif;
      const estObjet = (it) => CHALUTIER_OBJETS.some((o) => o.nom === it.nom);
      s.bateau.x = 0; s.bateau.z = CHALUTIER_ZONE2_MAX + 10; // en Fosse
      let trouveEnFosse = false;
      for (let i = 0; i < 200 && !trouveEnFosse; i++) {
        s.cale = []; s.calePoids = 0; s.caleValeur = 0;
        chalutierRemonterFilet(Object.assign(s, { filetCharge: 80 }));
        if (s.cale.some(estObjet)) trouveEnFosse = true;
      }
      s.bateau.x = 0; s.bateau.z = 10; // Hauts-Fonds
      let trouveHorsFosse = false;
      for (let i = 0; i < 200; i++) {
        s.cale = []; s.calePoids = 0; s.caleValeur = 0;
        chalutierRemonterFilet(Object.assign(s, { filetCharge: 80 }));
        if (s.cale.some(estObjet)) { trouveHorsFosse = true; break; }
      }
      if (INT.actif) sortirInterieur();
      return { trouveEnFosse, trouveHorsFosse };
    });
    if (!objetsTest.trouveEnFosse) fail('Chalutier : aucun objet étrange remonté en 200 tentatives à la Fosse (probabilité ~1/8 par remontage, quasi impossible par hasard)');
    else ok('Chalutier : les objets étranges apparaissent bien au filet, à la Fosse');
    if (objetsTest.trouveHorsFosse) fail('Chalutier : un objet étrange est remonté hors de la Fosse');
    else ok('Chalutier : aucun objet étrange hors de la Fosse, en 200 tentatives');

    // -------------------------------------------------------------------
    // Billot de préparation : suivre au doigt (en fraction, jamais en pixel)
    // la ligne de découpe d'un poisson remonté. Précise = +40 %, approximative
    // = bonus partiel, ratée (dérapage loin de la courbe, ou lâché avant la
    // fin) = -20 %. Le chrono continue de tourner pendant la préparation
    // (voir CLAUDE.md, dt vs dtJeu : rien à mettre à l'échelle ici, mais rien
    // ne doit non plus le suspendre). Les objets étranges ne sont jamais
    // proposés à la préparation (ce ne sont pas des poissons).
    // -------------------------------------------------------------------
    console.log('\n--- Chalutier « Sainte-Odile » : billot — préparation du poisson (découpe au doigt, valeur, chrono) ---');
    const billotTest = await page.evaluate(() => {
      const p = PORTES.find((x) => x.id === 'chalutier');
      startRun();
      entrerInterieur('chalutier', p);
      const s = INT.actif;
      majInterieur(0, 0); // règle chalutierVagueRef avant de démarrer manuellement une sortie
      chalutierDemarrerSortie(s);

      chalutierAjouterCale(s, { nom: 'Bar', valeur: 90, poids: 7 });
      chalutierAjouterCale(s, { nom: 'Botte', valeur: 5, poids: 1, texte: 'Pointure 44.' });
      const prochainIgnoreObjet = chalutierProchainAPreparer(s).nom;

      // découpe précise : suit exactement la courbe idéale, du début à la fin
      chalutierDemarrerBillot(s, s.cale[0]);
      let params = s.billotActif.params;
      for (let i = 0; i <= 50; i++) { const t = i / 50; chalutierBillotAvancer(s, t, chalutierBillotCourbe(params, t)); }
      const precise = { resultat: s.cale[0].qualitePrep, valeur: s.cale[0].valeur, preparee: s.cale[0].preparee };
      const plusRienAPreparer = !chalutierProchainAPreparer(s); // le Bar est préparé, ne reste que l'objet étrange

      // découpe approximative : décalage constant modéré par rapport à la courbe
      chalutierAjouterCale(s, { nom: 'Maquereau', valeur: 40, poids: 4 });
      const itApprox = s.cale[s.cale.length - 1];
      chalutierDemarrerBillot(s, itApprox);
      params = s.billotActif.params;
      for (let i = 0; i <= 50; i++) { const t = i / 50; chalutierBillotAvancer(s, t, chalutierBillotCourbe(params, t) + 0.06); }
      const approx = { resultat: itApprox.qualitePrep, valeur: itApprox.valeur };

      // découpe ratée par dérapage : courbe connue (déterministe), point de test loin d'elle
      chalutierAjouterCale(s, { nom: 'Congre', valeur: 160, poids: 11 });
      const itDerapage = s.cale[s.cale.length - 1];
      chalutierDemarrerBillot(s, itDerapage);
      s.billotActif.params = { amp: 0.15, freq: 2, phase: 0, taille: 0.5 };
      chalutierBillotAvancer(s, 0.1, 0.02); // très loin de la courbe (≈0,64 à t=0,1)
      const derapage = { resultat: itDerapage.qualitePrep, valeur: itDerapage.valeur, billotActifApres: !!s.billotActif };

      // découpe ratée par abandon : relâché à mi-chemin, jamais fini la ligne
      chalutierAjouterCale(s, { nom: 'Thon de Solara', valeur: 350, poids: 22 });
      const itAbandon = s.cale[s.cale.length - 1];
      chalutierDemarrerBillot(s, itAbandon);
      params = s.billotActif.params;
      for (let i = 0; i <= 25; i++) { const t = i / 50; chalutierBillotAvancer(s, t, chalutierBillotCourbe(params, t)); }
      chalutierBillotRelacher(s);
      const abandon = { resultat: itAbandon.qualitePrep, valeur: itAbandon.valeur };

      // le chrono de la sortie continue de décompter pendant une préparation, même sans toucher l'écran
      chalutierAjouterCale(s, { nom: 'Bar', valeur: 90, poids: 7 });
      chalutierDemarrerBillot(s, s.cale[s.cale.length - 1]);
      const chronoAvant = s.chrono;
      for (let i = 0; i < 30; i++) majInterieur(0.05, 0.05);
      const chronoAvance = s.chrono - chronoAvant;
      const encoreActifPendantAttente = !!s.billotActif && !s.billotActif.termine;
      chalutierBillotRelacher(s);

      // espacement (fait aussi partie du test dédié plus haut, ici on vérifie juste que le champ existe et est cohérent)
      const billotExiste = !!s.billot;

      // reset : abandonner la sortie efface l'état du billot en cours
      chalutierAjouterCale(s, { nom: 'Bar', valeur: 90, poids: 7 });
      chalutierDemarrerBillot(s, s.cale[s.cale.length - 1]);
      chalutierArreterSortie(s);
      const billotActifApresAbandonSortie = s.billotActif;

      // rejeter la prise en cours de préparation ne double-compte pas sa valeur
      chalutierDemarrerSortie(s);
      chalutierAjouterCale(s, { nom: 'Bar', valeur: 90, poids: 7 });
      chalutierDemarrerBillot(s, s.cale[s.cale.length - 1]);
      const caleValeurAvantRejet = s.caleValeur;
      chalutierRejeterDerniere(s);

      if (INT.actif) sortirInterieur();
      return {
        prochainIgnoreObjet, precise, plusRienAPreparer, approx, derapage, abandon,
        chronoAvance, encoreActifPendantAttente, billotExiste, billotActifApresAbandonSortie,
        caleValeurApresRejet: s.caleValeur, caleValeurAttendueApresRejet: caleValeurAvantRejet - 90,
        billotActifApresRejet: s.billotActif,
      };
    });
    if (billotTest.prochainIgnoreObjet !== 'Bar') fail('Billot : un objet étrange est proposé à la préparation comme s\'il s\'agissait d\'un poisson (' + billotTest.prochainIgnoreObjet + ')');
    else ok('Billot : les objets étranges ne sont jamais proposés à la préparation, seuls les poissons/prises le sont');
    if (billotTest.precise.resultat !== 'precise' || billotTest.precise.valeur !== 126 || !billotTest.precise.preparee) fail('Billot : une découpe qui suit exactement la courbe idéale ne donne pas le bonus complet (' + JSON.stringify(billotTest.precise) + ', attendu valeur=126=round(90*1.4))');
    else ok('Billot : une découpe précise (suit exactement la ligne) donne bien +40 % et marque la prise comme préparée');
    if (!billotTest.plusRienAPreparer) fail('Billot : le Bar déjà préparé est encore proposé à la préparation');
    else ok('Billot : une prise déjà préparée n\'est plus reproposée');
    if (billotTest.approx.resultat !== 'approx' || billotTest.approx.valeur !== 46) fail('Billot : une découpe à écart constant modéré ne donne pas un bonus partiel (' + JSON.stringify(billotTest.approx) + ', attendu valeur=46=round(40*1.15))');
    else ok('Billot : une découpe approximative donne bien un bonus partiel, inférieur au bonus complet');
    if (billotTest.derapage.resultat !== 'ratee' || billotTest.derapage.valeur !== 128 || billotTest.derapage.billotActifApres) fail('Billot : un dérapage loin de la courbe ne rate pas immédiatement la découpe (' + JSON.stringify(billotTest.derapage) + ', attendu valeur=128=round(160*0.8))');
    else ok('Billot : un dérapage loin de la ligne rate immédiatement la découpe (-20 %), la session se referme');
    if (billotTest.abandon.resultat !== 'ratee' || billotTest.abandon.valeur !== 280) fail('Billot : lâcher avant la fin de la ligne ne compte pas comme une découpe ratée (' + JSON.stringify(billotTest.abandon) + ', attendu valeur=280=round(350*0.8))');
    else ok('Billot : lâcher avant la fin de la ligne compte bien comme une découpe ratée (-20 %)');
    if (billotTest.chronoAvance < 1.49 || billotTest.chronoAvance > 1.51) fail('Billot : le chrono de la sortie ne continue pas de décompter normalement pendant une préparation (avance de ' + billotTest.chronoAvance + ' s pour 1,5 s réelle)');
    else ok('Billot : le chrono de la sortie continue bien de décompter pendant une préparation — un pari, pas une pause');
    if (!billotTest.encoreActifPendantAttente) fail('Billot : une préparation en cours est annulée par la seule attente, sans intervention du joueur');
    else ok('Billot : une préparation en cours n\'est pas annulée tant que le joueur ne relâche pas ou ne dérape pas');
    if (!billotTest.billotExiste) fail('Billot : la salle du chalutier n\'a pas de poste billot (s.billot manquant)');
    else ok('Billot : le poste billot est bien enregistré dans la salle');
    if (billotTest.billotActifApresAbandonSortie !== null) fail('Billot : abandonner la sortie ne referme pas une préparation en cours (' + JSON.stringify(billotTest.billotActifApresAbandonSortie) + ')');
    else ok('Billot : abandonner la sortie referme bien une préparation en cours');
    if (Math.abs(billotTest.caleValeurApresRejet - billotTest.caleValeurAttendueApresRejet) > 1e-9 || billotTest.billotActifApresRejet !== null) fail('Billot : rejeter la prise en cours de préparation double-compte sa valeur ou laisse une préparation orpheline (' + JSON.stringify(billotTest) + ')');
    else ok('Billot : rejeter la prise en cours de préparation referme proprement la session, sans double-compter sa valeur');

    // -------------------------------------------------------------------
    // Cale : poids/valeur cumulés, rejet de la dernière prise, refus une
    // fois pleine.
    // -------------------------------------------------------------------
    console.log('\n--- Chalutier « Sainte-Odile » : la cale (poids, valeur, rejet, plafond) ---');
    const caleTest = await page.evaluate(() => {
      const p = PORTES.find((x) => x.id === 'chalutier');
      startRun();
      entrerInterieur('chalutier', p);
      const s = INT.actif;
      s.cale = []; s.calePoids = 0; s.caleValeur = 0; // isole du test précédent (même salle mise en cache)
      chalutierAjouterCale(s, { nom: 'Test1', valeur: 100, poids: 10 });
      chalutierAjouterCale(s, { nom: 'Test2', valeur: 50, poids: 5 });
      const poidsApres2 = s.calePoids, valeurApres2 = s.caleValeur;
      chalutierRejeterDerniere(s);
      const poidsApresRejet = s.calePoids, valeurApresRejet = s.caleValeur, aRejeteApres = s.aRejete;
      const accepte = chalutierAjouterCale(s, { nom: 'OK', valeur: 5, poids: 1 });
      const refusePleine = !chalutierAjouterCale(s, { nom: 'Trop', valeur: 10, poids: CHALUTIER_CALE_MAX + 1 });
      if (INT.actif) sortirInterieur();
      return { poidsApres2, valeurApres2, poidsApresRejet, valeurApresRejet, aRejeteApres, accepte, refusePleine };
    });
    if (caleTest.poidsApres2 !== 15 || caleTest.valeurApres2 !== 150) fail('Chalutier : la cale n\'accumule pas correctement poids/valeur (' + JSON.stringify(caleTest) + ')');
    else ok('Chalutier : la cale accumule bien le poids et la valeur des prises');
    if (caleTest.poidsApresRejet !== 10 || caleTest.valeurApresRejet !== 100 || !caleTest.aRejeteApres) fail('Chalutier : rejeter la dernière prise ne retire pas la bonne prise et/ou ne marque pas aRejete');
    else ok('Chalutier : rejeter la dernière prise l\'enlève bien de la cale (poids et valeur) et marque le rejet');
    if (!caleTest.accepte) fail('Chalutier : une prise qui tient dans la cale est refusée à tort');
    if (!caleTest.refusePleine) fail('Chalutier : une prise qui dépasse la capacité de la cale est acceptée à tort');
    else ok('Chalutier : une prise qui dépasserait la capacité de la cale est bien refusée');

    // -------------------------------------------------------------------
    // Le poids de la cale réduit la vitesse du bateau, jusqu'à 40 % à
    // pleine charge.
    // -------------------------------------------------------------------
    console.log('\n--- Chalutier « Sainte-Odile » : le poids de la cale réduit la vitesse (jusqu\'à 40 %) ---');
    const vitesseTest = await page.evaluate(() => {
      const p = PORTES.find((x) => x.id === 'chalutier');
      startRun();
      entrerInterieur('chalutier', p);
      const s = INT.actif;
      P.x = s.barre.x; P.z = s.barre.z;
      majAction(); document.getElementById('btnAction')._fn();
      majAction(); document.getElementById('btnAction')._fn();
      INPUT.mx = 0; INPUT.mz = -1;
      s.calePoids = 0; s.meteoEtat = 'calme'; s.bateau.v = 0;
      for (let i = 0; i < 300; i++) majInterieur(0.05, 0.05);
      const vitesseVide = s.bateau.v;
      s.bateau.v = 0; s.calePoids = CHALUTIER_CALE_MAX; s.meteoEtat = 'calme';
      for (let i = 0; i < 300; i++) majInterieur(0.05, 0.05);
      const vitessePleine = s.bateau.v;
      INPUT.mx = 0; INPUT.mz = 0;
      if (INT.actif) sortirInterieur();
      return { vitesseVide, vitessePleine };
    });
    if (vitesseTest.vitessePleine >= vitesseTest.vitesseVide) fail('Chalutier : la cale pleine ne réduit pas la vitesse du bateau (vide=' + vitesseTest.vitesseVide + ', pleine=' + vitesseTest.vitessePleine + ')');
    else {
      const ratio = vitesseTest.vitessePleine / vitesseTest.vitesseVide;
      if (Math.abs(ratio - 0.6) > 0.05) fail('Chalutier : la perte de vitesse à pleine charge n\'est pas d\'environ 40 % (ratio=' + ratio.toFixed(3) + ')');
      else ok('Chalutier : la cale pleine réduit bien la vitesse d\'environ 40 %');
    }

    // -------------------------------------------------------------------
    // Météo : dégradation continue, seuils houle/tempête, perte de la
    // moitié de la cale après 30 s de tempête.
    // -------------------------------------------------------------------
    console.log('\n--- Chalutier « Sainte-Odile » : météo — dégradation, seuils, perte de cale en tempête ---');
    const meteoTest = await page.evaluate(() => {
      const p = PORTES.find((x) => x.id === 'chalutier');
      startRun();
      entrerInterieur('chalutier', p);
      const s = INT.actif;
      P.x = s.barre.x; P.z = s.barre.z;
      majAction(); document.getElementById('btnAction')._fn();
      s.bateau.x = 0; s.bateau.z = 0; // zone 1
      s.meteoJauge = CHALUTIER_METEO_HOULE - 1;
      majInterieur(0.01, 4);
      const passageHoule = s.meteoEtat === 'houle';
      s.meteoJauge = CHALUTIER_METEO_TEMPETE - 1;
      majInterieur(0.01, 4);
      const passageTempete = s.meteoEtat === 'tempete';
      s.cale = []; s.calePoids = 0; s.caleValeur = 0;
      for (let i = 0; i < 10; i++) chalutierAjouterCale(s, { nom: 'x' + i, valeur: 10, poids: 10 });
      s.tempeteT = CHALUTIER_TEMPETE_DELAI - 0.1;
      majInterieur(0.01, 1);
      const poidsApresPerte = s.calePoids, valeurApresPerte = s.caleValeur;
      if (INT.actif) sortirInterieur();
      return { passageHoule, passageTempete, poidsApresPerte, valeurApresPerte };
    });
    if (!meteoTest.passageHoule) fail('Chalutier : la jauge météo ne fait pas passer en HOULE au seuil attendu');
    else ok('Chalutier : la météo passe bien en HOULE au seuil attendu');
    if (!meteoTest.passageTempete) fail('Chalutier : la jauge météo ne fait pas passer en TEMPÊTE au seuil attendu');
    else ok('Chalutier : la météo passe bien en TEMPÊTE au seuil attendu');
    if (meteoTest.poidsApresPerte !== 50 || meteoTest.valeurApresPerte !== 50) fail('Chalutier : 30 s de tempête ne font pas perdre exactement la moitié de la cale (poids=' + meteoTest.poidsApresPerte + ', valeur=' + meteoTest.valeurApresPerte + ')');
    else ok('Chalutier : 30 s de tempête sans être rentré font bien perdre la moitié de la cale');

    // -------------------------------------------------------------------
    // Chrono de 180 s : au-delà, le joueur rentre remorqué et perd la
    // moitié de sa cale.
    // -------------------------------------------------------------------
    console.log('\n--- Chalutier « Sainte-Odile » : chrono de 180 s — remorqué, moitié de la cale perdue ---');
    const chronoExpire = await page.evaluate(() => {
      const p = PORTES.find((x) => x.id === 'chalutier');
      startRun();
      entrerInterieur('chalutier', p);
      const s = INT.actif;
      P.x = s.barre.x; P.z = s.barre.z;
      majAction(); document.getElementById('btnAction')._fn();
      s.cale = []; s.calePoids = 0; s.caleValeur = 0;
      for (let i = 0; i < 10; i++) chalutierAjouterCale(s, { nom: 'x' + i, valeur: 10, poids: 10 });
      s.bateau.x = 50; s.bateau.z = 50;
      s.chrono = CHALUTIER_DUREE - 0.5;
      const argentAvant = META.argent;
      majInterieur(0.01, 1);
      const sortieFinie = !s.sortieEnCours, argentApres = META.argent;
      if (INT.actif) sortirInterieur();
      return { sortieFinie, argentApres, argentAvant };
    });
    if (!chronoExpire.sortieFinie) fail('Chalutier : le chrono à 180 s ne termine pas la sortie');
    else ok('Chalutier : le chrono à 180 s termine bien la sortie (remorqué)');
    if (chronoExpire.argentApres !== chronoExpire.argentAvant + 50) fail('Chalutier : le remorquage ne vend pas exactement la moitié de la cale restante (obtenu +' + (chronoExpire.argentApres - chronoExpire.argentAvant) + ' $, attendu +50 $)');
    else ok('Chalutier : le remorquage vend bien ce qu\'il reste de cale après avoir perdu la moitié');

    // -------------------------------------------------------------------
    // Retour au ponton : vente automatique dès qu'on est revenu à moins de
    // 8 u, mais seulement après avoir vraiment quitté le port.
    // -------------------------------------------------------------------
    console.log('\n--- Chalutier « Sainte-Odile » : retour au ponton, vente automatique ---');
    const retour = await page.evaluate(() => {
      const p = PORTES.find((x) => x.id === 'chalutier');
      startRun();
      entrerInterieur('chalutier', p);
      const s = INT.actif;
      P.x = s.barre.x; P.z = s.barre.z;
      majAction(); document.getElementById('btnAction')._fn();
      const pasDeVenteAuDepart = s.sortieEnCours; // bateau encore à (0,0), aQuitteLePort=false
      s.cale = []; s.calePoids = 0; s.caleValeur = 0;
      chalutierAjouterCale(s, { nom: 'Prise', valeur: 200, poids: 40 });
      s.aQuitteLePort = true; s.bateau.x = 3; s.bateau.z = 3;
      const argentAvant = META.argent;
      majInterieur(0.01, 0.01);
      const sortieFinie = !s.sortieEnCours, argentApres = META.argent;
      if (INT.actif) sortirInterieur();
      return { pasDeVenteAuDepart, sortieFinie, argentApres, argentAvant };
    });
    if (!retour.pasDeVenteAuDepart) fail('Chalutier : la sortie se termine toute seule dès le départ, sans jamais avoir quitté le port');
    else ok('Chalutier : rester au ponton (sans l\'avoir quitté) ne termine pas la sortie tout seul');
    if (!retour.sortieFinie || retour.argentApres !== retour.argentAvant + 200) fail('Chalutier : le retour au ponton (après avoir pris le large) ne vend pas automatiquement la cale (obtenu +' + (retour.argentApres - retour.argentAvant) + ' $)');
    else ok('Chalutier : le retour au ponton vend bien automatiquement la cale');

    // -------------------------------------------------------------------
    // Curiosité La Boussole du Capitaine : condition stricte (Fosse, cale
    // pleine, rien rejeté, avant la tempête). Testé AVANT toute sortie qui
    // l'obtiendrait pour de bon (même discipline que les curiosités
    // précédentes — voir CLAUDE.md).
    // -------------------------------------------------------------------
    console.log('\n--- Chalutier « Sainte-Odile » : curiosité La Boussole du Capitaine (condition stricte) ---');
    const boussoleTest = await page.evaluate(() => {
      const p = PORTES.find((x) => x.id === 'chalutier');
      startRun();
      const dejaAcquise = aCurio('boussole');
      // 1) presque mérité, mais une prise a été rejetée -> pas de curiosité
      entrerInterieur('chalutier', p);
      const s = INT.actif;
      P.x = s.barre.x; P.z = s.barre.z;
      majAction(); document.getElementById('btnAction')._fn();
      s.zoneMax = 3; s.cale = []; s.calePoids = 0; s.caleValeur = 0;
      chalutierAjouterCale(s, { nom: 'Pleine', valeur: 999, poids: CHALUTIER_CALE_MAX });
      s.aRejete = true; s.meteoEtat = 'calme';
      s.aQuitteLePort = true; s.bateau.x = 2; s.bateau.z = 2;
      majInterieur(0.01, 0.01);
      const curioApresRejet = aCurio('boussole');
      if (INT.actif) sortirInterieur();
      // 2) vraiment mérité
      entrerInterieur('chalutier', p);
      const s2 = INT.actif;
      P.x = s2.barre.x; P.z = s2.barre.z;
      majAction(); document.getElementById('btnAction')._fn();
      s2.zoneMax = 3; s2.cale = []; s2.calePoids = 0; s2.caleValeur = 0;
      chalutierAjouterCale(s2, { nom: 'Pleine', valeur: 999, poids: CHALUTIER_CALE_MAX });
      s2.aRejete = false; s2.meteoEtat = 'calme';
      const clocheAvant = s2.boussoleMesh.material.color.getHex();
      s2.aQuitteLePort = true; s2.bateau.x = 2; s2.bateau.z = 2;
      majInterieur(0.01, 0.01);
      const curioApresMerite = aCurio('boussole');
      const clocheApres = s2.boussoleMesh.material.color.getHex();
      if (INT.actif) sortirInterieur();
      return { dejaAcquise, curioApresRejet, curioApresMerite, clocheAvant, clocheApres };
    });
    if (boussoleTest.dejaAcquise) fail('Chalutier : le test suppose la curiosité \'boussole\' pas encore acquise à ce stade de la suite');
    if (boussoleTest.curioApresRejet) fail('Chalutier : la curiosité est donnée alors qu\'une prise a été rejetée pendant la sortie');
    else ok('Chalutier : rejeter ne serait-ce qu\'une prise prive bien de la curiosité, même cale pleine depuis la Fosse');
    if (!boussoleTest.curioApresMerite) fail('Chalutier : rentrer de la Fosse avec la cale pleine, sans rien rejeter, ne donne pas la curiosité');
    else ok('Chalutier : rentrer de la Fosse avec la cale pleine, sans rien rejeter, donne bien la curiosité');
    if (boussoleTest.clocheAvant === boussoleTest.clocheApres) fail('Chalutier : la boussole ne s\'illumine pas à l\'obtention de la curiosité');
    else ok('Chalutier : la boussole s\'illumine bien à l\'obtention de la curiosité');

    // -------------------------------------------------------------------
    // Limite de 2 sorties par vague, l'abandon (sortie en pleine mer) la
    // consomme quand même.
    // -------------------------------------------------------------------
    console.log('\n--- Chalutier « Sainte-Odile » : limite de 2 sorties par vague, l\'abandon consomme la sortie ---');
    const capChal = await page.evaluate(() => {
      const p = PORTES.find((x) => x.id === 'chalutier');
      startRun();
      entrerInterieur('chalutier', p);
      const s = INT.actif;
      P.x = s.barre.x; P.z = s.barre.z;
      majAction(); document.getElementById('btnAction')._fn();
      const premiereDemarree = s.sortieEnCours;
      sortirInterieur();
      const sortieAnnuleeApresAbandon = !s.sortieEnCours;
      const compteurApresAbandon = s.sortiesVague;
      entrerInterieur('chalutier', p);
      P.x = s.barre.x; P.z = s.barre.z;
      majAction(); document.getElementById('btnAction')._fn();
      const deuxiemeDemarree = s.sortieEnCours;
      sortirInterieur();
      const compteurApres2 = s.sortiesVague;
      entrerInterieur('chalutier', p);
      P.x = s.barre.x; P.z = s.barre.z;
      majAction();
      const label3e = document.getElementById('btnAction').textContent;
      document.getElementById('btnAction')._fn();
      const troisiemeRefusee = !s.sortieEnCours;
      if (INT.actif) sortirInterieur();
      return { premiereDemarree, sortieAnnuleeApresAbandon, compteurApresAbandon, deuxiemeDemarree, compteurApres2, label3e, troisiemeRefusee };
    });
    if (!capChal.premiereDemarree || !capChal.sortieAnnuleeApresAbandon || capChal.compteurApresAbandon !== 1) fail('Chalutier : abandonner une sortie en cours ne la consomme pas correctement (' + JSON.stringify(capChal) + ')');
    else ok('Chalutier : sortir en pleine mer annule la sortie et la consomme quand même');
    if (!capChal.deuxiemeDemarree || capChal.compteurApres2 !== 2) fail('Chalutier : la 2e sortie de la vague ne démarre pas correctement (compteur=' + capChal.compteurApres2 + ')');
    else ok('Chalutier : la 2e sortie de la vague démarre normalement');
    if (!capChal.troisiemeRefusee || !/deux sorties/i.test(capChal.label3e)) fail('Chalutier : une 3e sortie dans la même vague n\'est pas refusée (label=' + capChal.label3e + ')');
    else ok('Chalutier : une 3e sortie dans la même vague est bien refusée');

    // -------------------------------------------------------------------
    // Bug déjà rencontré : marcher jusqu'à la zone de SORTIE en pleine mer
    // faisait quitter la salle (aucun sens, à des kilomètres du ponton). La
    // zone doit être inerte pendant une sortie, avec un message dédié ; seul
    // le bouton ⚓ ABANDONNER LA SORTIE peut écourter la sortie (et la
    // consomme), sans jamais faire quitter la salle.
    // -------------------------------------------------------------------
    console.log('\n--- Chalutier « Sainte-Odile » : la zone de SORTIE est inerte en pleine mer, l\'abandon passe par un bouton dédié ---');
    const sortieEnMer = await page.evaluate(() => {
      const p = PORTES.find((x) => x.id === 'chalutier');
      startRun();
      entrerInterieur('chalutier', p);
      ETAT.intT = 0; // règle la temporisation « viens d'entrer » (0,5 s posée par entrerInterieur), sinon elle masque aussi la zone de SORTIE
      const s = INT.actif;
      P.x = s.barre.x; P.z = s.barre.z;
      majAction(); document.getElementById('btnAction')._fn(); // LARGUER LES AMARRES
      P.x = s.sortie.x; P.z = s.sortie.z; // debout dans la zone de SORTIE, en pleine mer
      majAction();
      const labelEnMer = document.getElementById('btnAction').textContent;
      document.getElementById('btnAction')._fn();
      const encoreDansLaSalleApresTentative = !!INT.actif;
      const encoreEnMerApresTentative = s.sortieEnCours;
      const compteurAvantAbandon = s.sortiesVague;
      document.getElementById('chalAbandonner').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
      const sortieAnnuleeParBouton = !s.sortieEnCours;
      const encoreDansLaSalleApresAbandon = !!INT.actif;
      const compteurApresAbandon = s.sortiesVague;
      // de retour au ponton (sortieEnCours=false) : la même zone redevient utilisable normalement
      majAction();
      const labelAuPonton = document.getElementById('btnAction').textContent;
      document.getElementById('btnAction')._fn();
      const salleQuitteeAuPonton = !INT.actif;
      return {
        labelEnMer, encoreDansLaSalleApresTentative, encoreEnMerApresTentative,
        compteurAvantAbandon, sortieAnnuleeParBouton, encoreDansLaSalleApresAbandon, compteurApresAbandon,
        labelAuPonton, salleQuitteeAuPonton,
      };
    });
    if (!/rentrer au port/i.test(sortieEnMer.labelEnMer)) fail('Chalutier : le bouton d\'action dans la zone de SORTIE en pleine mer n\'affiche pas le message attendu (label=' + sortieEnMer.labelEnMer + ')');
    else ok('Chalutier : la zone de SORTIE affiche bien « il faut rentrer au port pour débarquer » en pleine mer');
    if (!sortieEnMer.encoreDansLaSalleApresTentative || !sortieEnMer.encoreEnMerApresTentative) fail('Chalutier : la zone de SORTIE fait quitter la salle (ou annule la sortie) en pleine mer (' + JSON.stringify(sortieEnMer) + ')');
    else ok('Chalutier : la zone de SORTIE ne fait ni quitter la salle ni annuler la sortie en pleine mer');
    if (!sortieEnMer.sortieAnnuleeParBouton || !sortieEnMer.encoreDansLaSalleApresAbandon) fail('Chalutier : le bouton ⚓ ABANDONNER LA SORTIE n\'abandonne pas la sortie sans faire quitter la salle (' + JSON.stringify(sortieEnMer) + ')');
    else ok('Chalutier : le bouton ⚓ ABANDONNER LA SORTIE abandonne bien la sortie en cours, sans faire quitter la salle');
    if (sortieEnMer.compteurApresAbandon !== sortieEnMer.compteurAvantAbandon) fail('Chalutier : le bouton ⚓ ABANDONNER LA SORTIE modifie le compteur de sorties de la vague de façon inattendue (avant=' + sortieEnMer.compteurAvantAbandon + ', après=' + sortieEnMer.compteurApresAbandon + ')');
    else ok('Chalutier : le bouton ⚓ ABANDONNER LA SORTIE consomme bien la sortie (compteur inchangé, pas remis à 0)');
    if (!/^SORTIR/.test(sortieEnMer.labelAuPonton) || !sortieEnMer.salleQuitteeAuPonton) fail('Chalutier : la zone de SORTIE ne redevient pas utilisable normalement une fois de retour au ponton (' + JSON.stringify(sortieEnMer) + ')');
    else ok('Chalutier : la zone de SORTIE redevient normalement utilisable une fois de retour au ponton');

    // -------------------------------------------------------------------
    // Réinitialisations : passage de vague et mort en pleine sortie
    // annulent la sortie (cale perdue, météo à zéro, bateau au ponton) ;
    // seuls le passage de vague et le game over remettent le compteur à 0.
    // -------------------------------------------------------------------
    console.log('\n--- Chalutier « Sainte-Odile » : réinitialisations (vague, mort, game over) ---');
    const resetsChal = await page.evaluate(() => {
      const p = PORTES.find((x) => x.id === 'chalutier');
      startRun();
      entrerInterieur('chalutier', p);
      const s = INT.actif;
      P.x = s.barre.x; P.z = s.barre.z;
      majAction(); document.getElementById('btnAction')._fn();
      s.cale = []; s.calePoids = 0; s.caleValeur = 0;
      chalutierAjouterCale(s, { nom: 'x', valeur: 100, poids: 10 });
      s.meteoJauge = 50; s.meteoEtat = 'houle'; s.bateau.x = 30; s.bateau.z = 30;
      WAVES.n++;
      majInterieur(0, 0);
      const sortieApresVague = s.sortieEnCours, caleApresVague = s.calePoids, meteoApresVague = s.meteoJauge,
        bateauApresVague = Math.hypot(s.bateau.x, s.bateau.z), compteurApresVague = s.sortiesVague;
      P.x = s.barre.x; P.z = s.barre.z;
      majAction(); document.getElementById('btnAction')._fn();
      s.cale = []; s.calePoids = 0; s.caleValeur = 0;
      chalutierAjouterCale(s, { nom: 'y', valeur: 100, poids: 10 });
      P.hp = 1; toucherJoueur(9999); // -> mourir(), en pleine sortie
      const sortieApresMort = s.sortieEnCours, caleApresMort = s.calePoids, modeApresMort = ETAT.mode;
      startRun();
      const sa = INT.salles.chalutier;
      const sortieApresGameOver = sa.sortieEnCours, compteurApresGameOver = sa.sortiesVague;
      return {
        sortieApresVague, caleApresVague, meteoApresVague, bateauApresVague, compteurApresVague,
        sortieApresMort, caleApresMort, modeApresMort, sortieApresGameOver, compteurApresGameOver,
      };
    });
    if (resetsChal.sortieApresVague || resetsChal.caleApresVague !== 0 || resetsChal.meteoApresVague !== 0 || resetsChal.bateauApresVague !== 0) fail('Chalutier : le passage de vague ne coupe pas la sortie et/ou ne réinitialise pas cale/météo/position du bateau (' + JSON.stringify(resetsChal) + ')');
    else ok('Chalutier : le passage de vague coupe bien la sortie en cours et réinitialise cale, météo et position du bateau');
    if (resetsChal.compteurApresVague !== 0) fail('Chalutier : le passage de vague ne remet pas le compteur de sorties à zéro');
    else ok('Chalutier : le passage de vague remet bien le compteur de sorties à zéro');
    if (resetsChal.modeApresMort !== 'mort') fail('Chalutier : mourir() n\'a pas été déclenché correctement pendant le test');
    if (resetsChal.sortieApresMort || resetsChal.caleApresMort !== 0) fail('Chalutier : mourir en pleine sortie ne coupe pas la sortie et/ou ne fait pas perdre la cale');
    else ok('Chalutier : mourir en pleine sortie coupe bien la sortie et fait perdre la cale');
    if (resetsChal.sortieApresGameOver || resetsChal.compteurApresGameOver !== 0) fail('Chalutier : le game over ne coupe pas la sortie et/ou ne remet pas le compteur à zéro');
    else ok('Chalutier : le game over coupe bien la sortie et remet le compteur à zéro');

    // -------------------------------------------------------------------
    // Tables de fouille (coffre du pont, cabine du capitaine) : jamais de
    // gain négatif, encaissement immédiat (contrairement à la cale de
    // pêche, différée jusqu'à la vente), META.fouilles incrémenté.
    // -------------------------------------------------------------------
    console.log('\n--- Chalutier « Sainte-Odile » : tables de fouille (jamais négatif, encaissement immédiat) ---');
    const fouilleChal = await page.evaluate(() => {
      const p = PORTES.find((x) => x.id === 'chalutier');
      startRun();
      entrerInterieur('chalutier', p);
      const s = INT.actif;
      const fouillesAvant = META.fouilles;
      const resultat = { chalutierPont: [], chalutierCabine: [] };
      for (const table of ['chalutierPont', 'chalutierCabine']) {
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
    if (fouilleChal.fouillesTotal !== 120) fail('Chalutier : META.fouilles n\'est pas incrémenté exactement une fois par fouille résolue (delta=' + fouilleChal.fouillesTotal + '/120)');
    else ok('Chalutier : chaque fouille résolue incrémente bien META.fouilles');
    for (const table of ['chalutierPont', 'chalutierCabine']) {
      const vals = fouilleChal.resultat[table];
      if (vals.some((v) => v < 0)) fail('Chalutier : la table ' + table + ' a produit un gain négatif sur 60 tirages');
      else ok('Chalutier : la table ' + table + ' ne produit jamais de gain négatif (60 tirages), encaissé immédiatement');
    }

    // -------------------------------------------------------------------
    // Horloges séparées : chrono, météo, charge du filet ET déplacement du
    // bateau doivent tous suivre le temps réel (dtJeu) pendant un ralenti.
    // Le bateau semblait pur spectacle (aucune jauge dessus, jamais appliqué
    // à un mesh) mais la distance parcourue est exactement ce qui se joue
    // contre le chrono — un déplacement en course contre un chrono partage
    // son horloge, même sans jauge dédiée (voir CLAUDE.md, « Horloges »).
    // -------------------------------------------------------------------
    console.log('\n--- Horloges séparées : chrono/météo/filet/déplacement du Chalutier suivent tous dtJeu ---');
    const chronoChal = await page.evaluate(() => {
      const p = PORTES.find((x) => x.id === 'chalutier');
      startRun();
      entrerInterieur('chalutier', p);
      const s = INT.actif;
      P.x = s.barre.x; P.z = s.barre.z;
      majAction(); document.getElementById('btnAction')._fn();
      s.bateau.x = 0; s.bateau.z = 0; // zone 1
      s.filetEtat = 'traine'; s.filetCharge = 0;
      const dtReel = 1;
      const dt = dtReel * 0.5, dtJeu = dtReel; // ralenti à ×0,5 simulé comme boucle()
      const chronoAvant = s.chrono;
      majInterieur(dt, dtJeu);
      const chronoDelta = s.chrono - chronoAvant;
      const filetAttendu = CHALUTIER_FILET_VIT * dtJeu;
      return { chronoDelta, dtJeu, filetDelta: s.filetCharge, filetAttendu };
    });
    if (Math.abs(chronoChal.chronoDelta - chronoChal.dtJeu) > 1e-9) fail('Chalutier : le chrono de sortie ralentit pendant un ralenti au lieu de suivre le temps réel');
    else ok('Chalutier : le chrono de sortie avance bien au temps réel pendant un ralenti (sur dtJeu)');
    if (Math.abs(chronoChal.filetDelta - chronoChal.filetAttendu) > 1e-9) fail('Chalutier : la charge du filet ralentit pendant un ralenti au lieu de suivre le temps réel');
    else ok('Chalutier : la charge du filet avance bien au temps réel pendant un ralenti (sur dtJeu)');

    console.log('\n--- Horloges séparées : la distance parcourue par le bateau du Chalutier est la même pendant un ralenti qu\'à vitesse normale ---');
    const distanceRalenti = await page.evaluate(() => {
      const s = INT.actif; // toujours la salle du test précédent, sortie en cours
      P.x = s.barre.x; P.z = s.barre.z;
      s.auxCommandes = true;
      INPUT.mx = 0; INPUT.mz = -1;
      const dtJeu = 1; // une seconde réelle, dans les deux cas
      // vitesse normale : dt = dtJeu (aucun ralenti)
      s.bateau.v = 0; s.bateau.ang = 0; s.bateau.x = 0; s.bateau.z = 0;
      majInterieur(dtJeu, dtJeu);
      const distNormale = Math.hypot(s.bateau.x, s.bateau.z);
      // ralenti actif : dt très inférieur à dtJeu, mais la même seconde réelle
      s.bateau.v = 0; s.bateau.ang = 0; s.bateau.x = 0; s.bateau.z = 0;
      majInterieur(dtJeu * 0.2, dtJeu);
      const distRalentie = Math.hypot(s.bateau.x, s.bateau.z);
      INPUT.mx = 0; INPUT.mz = 0;
      if (INT.actif) sortirInterieur();
      return { distNormale, distRalentie };
    });
    if (Math.abs(distanceRalenti.distNormale - distanceRalenti.distRalentie) > 1e-9) fail('Chalutier : le bateau parcourt une distance différente en une seconde réelle selon qu\'un ralenti est actif ou non (normale=' + distanceRalenti.distNormale + ', ralentie=' + distanceRalenti.distRalentie + ') — la distance ne doit dépendre que de dtJeu, jamais de dt');
    else ok('Chalutier : le bateau parcourt bien la même distance en une seconde réelle, ralenti actif ou non (déplacement sur dtJeu)');

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
  if (echecs) {
    console.error(echecs + ' vérification(s) en échec.');
    process.exit(1);
  } else {
    console.log('Tous les scénarios sont passés.');
    process.exit(0);
  }
}

main();
