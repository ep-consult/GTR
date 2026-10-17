// Cockpits V2 : chaque clé de VEHDEFS (lue dans la source), joueur au volant en vue 1P, rendu réel en trois directions
// (devant, tête tournée à gauche, tête tournée à droite) + cockpitDiagnostic. VEH=cle1,cle2 pour une partie ; NOM= le préfixe des pages ;
// NUIT=1 pour la nuit ; VIT=12 pour rouler (u/s) ; BRAQ=-1 pour braquer à droite pendant la capture.
const path = require('path'), fs = require('fs'); const { ouvrir } = require('./harnais'); const att = (ms) => new Promise((r) => setTimeout(r, ms));
const SEUL = process.env.VEH ? process.env.VEH.split(',') : null, NUIT = !!process.env.NUIT, VIT = +(process.env.VIT || 0), BRAQ = +(process.env.BRAQ || 0);
const SORTIE = process.env.SORTIE || path.join(__dirname, '..', 'captures', 'cockpits_v2');
(async () => { fs.mkdirSync(SORTIE, { recursive: true }); const h = await ouvrir({ dpr: +(process.env.DPR || 1), sansBoucle: true, fichier: process.env.FICHIER }); const p = h.page;
  const cles = await p.evaluate((nuit) => { META.vue = 'fps'; startRun(); ecran(null); ETAT.mode = 'jeu'; P.hp = P.maxHp = 1e9; ETAT.jour = nuit ? 160 : 40; for (const e of ennemis) e.mort = true; WAVES.etat = 'repos'; WAVES.t = 1e9;
    creerTrafic = () => {}; for (const v of vehicules) { scene.remove(v.mesh); libererEntite(v.mesh); } vehicules.length = 0; return Object.keys(VEHDEFS); }, NUIT);
  const shots = [], diag = {};
  for (const k of cles) { if (SEUL && !SEUL.includes(k)) continue;
    const r = await p.evaluate((k, vit, braq, nuit, offs) => { try { ETAT.jour = nuit ? 160 : 40; if (P.veh) sortirVehicule(true); for (const v of vehicules) { scene.remove(v.mesh); libererEntite(v.mesh); } vehicules.length = 0;
      const d = VEHDEFS[k], mer = !!d.eau; const x = mer ? -60 : POIS.place.x + 40, z = mer ? MER + 40 : POIS.place.z + 10;
      const v = creerVehicule(k, x, z, 0); if (!v) return { err: 'pas de véhicule' }; P.x = x; P.z = z + 1; P.y = 0; entrerVehicule(v); if (P.veh !== v) return { err: 'pas monté' };
      v.v = 0; if (d.air) { v.alt = d.air === 'helico' || d.ovni ? 0 : 0; }
      const urls = [];
      for (const off of offs) {
        VUE.drag = off !== 0; VUE.offVeh = off;
        for (let i = 0; i < 12; i++) { v.v = vit; v.steerIn = braq; if (typeof jourNuit === 'function') { try { jourNuit(1 / 30); } catch (e) {} } majCamera(1 / 30); majBalises(1 / 30); }
        VUE.offVeh = off; majCamera(1 / 30); renderer.render(scene, camera); rendreCockpit(); urls.push(renderer.domElement.toDataURL('image/jpeg', 0.84)); }
      VUE.drag = false; VUE.offVeh = 0; majCamera(1 / 30);
      const dg = cockpitDiagnostic(v); let nbObj = 0, nbMat = new Set(); if (COCKPIT.g) COCKPIT.g.traverse((o) => { if (o.isMesh || o.isSprite) { nbObj++; nbMat.add(o.material); } });
      return { urls, nom: d.nom, dg, nbObj, nbMat: nbMat.size }; } catch (e) { return { err: e.message + ' ' + (e.stack || '').split('\n')[1] }; } }, k, VIT, BRAQ, NUIT, [0, +(process.env.OFF || 1.05), -(process.env.OFF || 1.05)]);
    if (r.err) { console.log(k, 'ERREUR', r.err); diag[k] = { err: r.err }; continue; }
    diag[k] = Object.assign({ nom: r.nom, nbObj: r.nbObj, nbMat: r.nbMat }, r.dg);
    console.log(k.padEnd(14), (r.dg.ok ? 'OK ' : 'KO ') + String(r.dg.fam).padEnd(10), String(r.dg.style).padEnd(12), 'obj', String(r.nbObj).padStart(3), 'mat', String(r.nbMat).padStart(2), r.dg.libre ? '' : 'BOUCHÉ ' + r.dg.devant, r.dg.instrVu === false ? 'INSTR-HORS-CHAMP' : '');
    shots.push({ k, nom: r.nom, urls: r.urls, ok: r.dg.ok, st: r.dg.style }); }
  fs.writeFileSync(path.join(SORTIE, 'diag_' + (process.env.NOM || 'a') + '.json'), JSON.stringify(diag, null, 1));
  const w = 195, hh = 422, PAR = 6; const p2 = await h.nav.newPage();
  for (let pg = 0; pg * PAR < shots.length; pg++) { const part = shots.slice(pg * PAR, pg * PAR + PAR); await p2.setViewport({ width: 2 * (3 * (w + 2) + 8), height: Math.ceil(part.length / 2) * (hh + 18) });
    await p2.setContent('<body style="margin:0;background:#222">' + part.map((s) => '<div style="display:inline-block;margin:2px 4px;text-align:center;color:' + (s.ok ? '#fff' : '#ff6a6a') + ';font:12px Arial;vertical-align:top">' + s.urls.map((u) => '<img src="' + u + '" style="width:' + w + 'px;height:' + hh + 'px;margin:0 1px">').join('') + '<br>' + s.k + ' — ' + String(s.nom).slice(0, 26) + ' [' + s.st + ']</div>').join('') + '</body>');
    await att(700); const out = path.join(SORTIE, (process.env.NOM || 'a') + '_' + String(pg + 1).padStart(2, '0') + '.jpg'); await p2.screenshot({ path: out, type: 'jpeg', quality: 86, fullPage: true }); console.log(out); }
  if (process.env.GRAND) for (const s of shots) s.urls.forEach((u, i) => fs.writeFileSync(path.join(SORTIE, 'g_' + s.k + '_' + ['av', 'g', 'd'][i] + '.jpg'), Buffer.from(u.split(',')[1], 'base64')));
  if (process.env.CROP) { const [y0, y1] = process.env.CROP.split(',').map(Number); const p3 = await h.nav.newPage();
    for (const s of shots) { const u = await p3.evaluate((u, y0, y1) => new Promise((ok) => { const im = new Image(); im.onload = () => { const c = document.createElement('canvas'), H = im.height * (y1 - y0); c.width = im.width; c.height = H; c.getContext('2d').drawImage(im, 0, -im.height * y0); ok(c.toDataURL('image/jpeg', 0.9)); }; im.src = u; }), s.urls[0], y0, y1);
      fs.writeFileSync(path.join(SORTIE, 'z_' + s.k + '.jpg'), Buffer.from(u.split(',')[1], 'base64')); } }
  console.log('erreurs', h.erreurs.slice(0, 3)); await h.fermer(); })();
