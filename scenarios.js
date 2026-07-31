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
      for (let i = 0; i < 437; i++) majInterieur(0.1); // 43,7 s simulées
      const pos1 = INT.actif.gardiens.map((gd) => ({ x: gd.x, z: gd.z, ang: gd.ang }));
      const cam1 = INT.actif.cameras.map((c) => c.angActuel);
      sortirInterieur();
      entrerInterieur('musee', p);
      for (let i = 0; i < 437; i++) majInterieur(0.1); // exactement le même temps simulé
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
      for (let i = 0; i < 20; i++) majInterieur(0.1); // 2 s : largement assez pour les 1,5 s de maintien
      const coneForce = META.museeArtefacts.cone === true;
      // force le Canard
      P.x = s.canard.x; P.z = s.canard.z; majAction(); document.getElementById('btnAction')._fn();
      for (let i = 0; i < 20; i++) majInterieur(0.1);
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
      majInterieur(0.1); // le chrono passe sous 0 -> alarme -> éjection
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
      for (let i = 0; i < 40; i++) { majJoueur(0.1); majInterieur(0.1); } // 4 s simulées
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
        majJoueur(0.1); majInterieur(0.1);
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
        majInterieur(0.1);
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
        majInterieur(0.1);
        if (s.gardiens.some((gd) => gd.deviationT > 0)) devie = true;
      }
      INPUT.btn.sprint = false; INPUT.mx = 0; INPUT.mz = 0;
      if (INT.actif) sortirInterieur();
      return { devie };
    });
    if (!bruitPartiel.devie) fail('Musée : sprinter à 80 % de la poussée maximale ne fait pas de bruit — la moitié de la plage de sprint reste silencieuse, la mécanique perd sa substance');
    else ok('Musée : sprinter à 80 % de la poussée maximale fait bien du bruit');

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
      const actives = BORNES_ARCADE.filter((b) => b.actif).map((b) => b.id);
      // une seule borne battue : pas de curiosité
      META.arcadeScores.vipere[0] = { init: 'AAA', score: 999 };
      META.arcadeScores.chantier[0] = { init: 'AAA', score: 0 };
      verifierJetonDore();
      const pasEncore = aCurio('jeton_dore');
      // les deux bornes actives battues : curiosité accordée
      META.arcadeScores.chantier[0] = { init: 'AAA', score: 999 };
      verifierJetonDore();
      const accordee = aCurio('jeton_dore');
      return { actives, pasEncore, accordee };
    });
    if (jetonDore.actives.length !== 2 || !jetonDore.actives.includes('vipere') || !jetonDore.actives.includes('chantier')) {
      fail('Arcade : la liste des bornes actives n\'est plus vipere+chantier (' + jetonDore.actives.join(',') + ') — ce test suppose ces deux-là, à ajuster si de nouvelles bornes sont activées');
    }
    if (jetonDore.pasEncore) fail('Arcade : Le Jeton Doré accordé alors qu\'une seule borne active était battue');
    else ok('Arcade : battre une seule borne active ne donne pas Le Jeton Doré');
    if (!jetonDore.accordee) fail('Arcade : Le Jeton Doré non accordé alors que toutes les bornes actives sont battues');
    else ok('Arcade : battre toutes les bornes actives donne bien Le Jeton Doré');

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
      majInterieur(11); // largement plus que spT (10 s pour la barre 1) : le temps s'écoule
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
        majInterieur(1.2); // laisse l'animation de la boule se terminer avant le lancer suivant
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
      META.argent = v.argent; META.niveau = v.niveau; sauveMeta();
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
