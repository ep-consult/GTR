// Cockpits : chaque clé de VEHDEFS (lue dans la source), véhicule créé, joueur au volant en vue 1P, rendu réel + cockpitDiagnostic
const path = require('path'), fs = require('fs'); const { ouvrir } = require('./harnais'); const att = (ms) => new Promise((r) => setTimeout(r, ms));
const SEUL = process.env.VEH ? process.env.VEH.split(',') : null;
(async () => { const h = await ouvrir({ dpr: 1, sansBoucle: true, fichier: process.env.FICHIER }); const p = h.page;
  const cles = await p.evaluate(() => { META.vue = 'fps'; startRun(); ecran(null); ETAT.mode = 'jeu'; P.hp = P.maxHp = 1e9; ETAT.jour = 40; for (const e of ennemis) e.mort = true; WAVES.etat = 'repos'; WAVES.t = 1e9;
    for (const v of vehicules) { scene.remove(v.mesh); libererEntite(v.mesh); } vehicules.length = 0; return Object.keys(VEHDEFS); });
  const shots = [], diag = {};
  for (const k of cles) { if (SEUL && !SEUL.includes(k)) continue;
    const r = await p.evaluate((k) => { try { if (P.veh) sortirVehicule(true); for (const v of vehicules) { scene.remove(v.mesh); libererEntite(v.mesh); } vehicules.length = 0;
      const d = VEHDEFS[k], mer = !!d.eau; const x = mer ? -60 : POIS.place.x + 40, z = mer ? MER + 40 : POIS.place.z + 10;
      const v = creerVehicule(k, x, z, 0); if (!v) return { err: 'pas de véhicule' }; P.x = x; P.z = z + 1; P.y = 0; entrerVehicule(v); if (P.veh !== v) return { err: 'pas monté' };
      v.v = 0; if (d.air) { v.alt = 0; } for (let i = 0; i < 20; i++) { majVehicules(1 / 30); majCamera(1 / 30); majBalises(1 / 30); } renderer.render(scene, camera); if (typeof rendreCockpit === "function") rendreCockpit();
      const dg = cockpitDiagnostic(v); return { url: renderer.domElement.toDataURL('image/jpeg', 0.82), nom: d.nom, dg }; } catch (e) { return { err: e.message + ' ' + (e.stack || '').split('\n')[1] }; } }, k);
    if (r.err) { console.log(k, 'ERREUR', r.err); diag[k] = { err: r.err }; continue; }
    diag[k] = Object.assign({ nom: r.nom }, r.dg); console.log(k.padEnd(14), (r.dg.ok ? 'OK ' : 'KO ') + r.dg.fam.padEnd(10), 'œil', JSON.stringify(r.dg.eye), 'haut', r.dg.haut, r.dg.dansXZ ? '' : 'HORS-XZ', r.dg.dansY ? '' : 'HORS-Y', r.dg.libre ? '' : 'BOUCHÉ ' + r.dg.devant, r.dg.instrVu === false ? 'INSTR-HORS-CHAMP' : '', r.dg.approx ? 'approx' : '');
    shots.push({ k, nom: r.nom, url: r.url, ok: r.dg.ok }); if (process.env.SEPARE) fs.writeFileSync(path.join(__dirname, 'ck_' + k + '.jpg'), Buffer.from(r.url.split(',')[1], 'base64')); }
  if (!SEUL) fs.writeFileSync(path.join(__dirname, 'cockpits_diag.json'), JSON.stringify(diag, null, 1)); // une galerie partielle (VEH=...) ne remplace jamais la liste complète
  const w = 300, hh = 649, cols = 5, PAR = 20; const p2 = await h.nav.newPage();
  for (let pg = 0; pg * PAR < shots.length; pg++) { const part = shots.slice(pg * PAR, pg * PAR + PAR); await p2.setViewport({ width: cols * (w + 4), height: Math.ceil(part.length / cols) * (hh + 18) });
    await p2.setContent('<body style="margin:0;background:#222">' + part.map((s) => '<div style="display:inline-block;margin:2px;text-align:center;color:' + (s.ok ? '#fff' : '#ff6a6a') + ';font:12px Arial;width:' + w + 'px;vertical-align:top"><div style="width:' + w + 'px;height:' + hh + 'px;background:url(' + s.url + ') no-repeat;background-size:' + w + 'px auto;background-position:0 0px"></div>' + s.k + ' — ' + s.nom.slice(0, 30) + '</div>').join('') + '</body>');
    await att(900); const out = path.join(__dirname, 'cockpits_' + (process.env.NOM || 'a') + '_' + (pg + 1) + '.png'); await p2.screenshot({ path: out, fullPage: true }); console.log(out); }
  console.log('erreurs', h.erreurs.slice(0, 3)); await h.fermer(); })();
