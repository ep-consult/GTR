// Relevé du chantier « Les Canaux de Los Reyes » (rapport_nuit/CANAUX.md) : tout ce qui a une position et que le jeu lit,
// exporté en JSON, avec l'accessibilité de chaque élément (à pied depuis une rue conservée, en voiture pour les garages et
// les véhicules posés). Rien n'est recopié du jeu : tout est lu dans la page (PORTES, POIS, GARAGES_TUNING, INTDEFS…).
//   node rapport_nuit/outils/releve_canaux.js [sortie.json]                      → relevé (défaut : rapport_nuit/canaux_avant.json)
//   node rapport_nuit/outils/releve_canaux.js sortie.json --comparer ref.json   → relevé, puis comparaison avec la référence
// Comparaison : hors zone, tout doit être IDENTIQUE ; dans la zone, seul un déplacement listé dans
// rapport_nuit/canaux_deplacements.json (clé → raison) est permis ; partout : jamais dans l'eau, jamais sur un tablier de pont,
// accessible (à pied ; en voiture pour un garage ou un véhicule posé), porte avec du trottoir sec devant et SORTIE hors de l'eau.
const fs = require('fs'), path = require('path');
const { ouvrir, R } = require('./harnais.js');
const args = process.argv.slice(2), sortie = args[0] && !args[0].startsWith('--') ? args[0] : path.join(R, 'rapport_nuit/canaux_avant.json');
const iRef = args.indexOf('--comparer'), ref = iRef >= 0 ? args[iRef + 1] : null;
/* la zone du chantier : le quartier « port » (bx 9–13 × bz 6–9, bx 10–13 × bz 10–12) et la plage devant (bz 13) */
const ZONE = { x0: 84, x1: 300, z0: -48, z1: 312, neon: { x0: 84, x1: 126, z0: 126, z1: 252 } };
const dansZone = (x, z) => x >= ZONE.x0 && x <= ZONE.x1 && z >= ZONE.z0 && z <= ZONE.z1 && !(x < ZONE.neon.x1 && z > ZONE.neon.z0 && z < ZONE.neon.z1);
(async () => {
  const src = fs.readFileSync(path.join(R, 'index.html'), 'utf8');
  /* REPLIS est une variable locale de placerPortes : ses identifiants sont lus dans la source */
  const mR = src.match(/const REPLIS=\[([\s\S]*?)\];/); const replis = mR ? [...mR[1].matchAll(/\['([a-z0-9_]+)'/g)].map((m) => m[1]) : [];
  if (/REPLIS\.push\(\['radio'/.test(src)) replis.push('radio'); if (/REPLIS\.push\(\['tuning'/.test(src)) replis.push('tuning');
  const mL = src.match(/const lieux=\[(\[[\s\S]*?\])\];/); const lieuxMission = mL ? [...mL[1].matchAll(/\['([a-z0-9_]+)'/g)].map((m) => m[1]) : [];
  const h = await ouvrir({ sansBoucle: true });
  const page = h.page;
  const r = await page.evaluate((replis, lieuxMission) => {
    const out = { replis, lieuxMission, portes: [], pois: [], garages: [], sorties: [], vehicules: [], stands: [], planques: [], activites: [], rides: [], stations: [], caches: [] };
    startRun(); ecran(null); ETAT.mode = 'jeu'; P.hp = P.maxHp = 1e9;
    const pos = (o) => ({ x: +o.x.toFixed(2), z: +o.z.toFixed(2) });
    for (const p of PORTES) out.portes.push({ cle: 'porte:' + p.id + (p.garageId ? ':' + p.garageId : '') + (p.boutiqueId ? ':' + p.boutiqueId : ''), id: p.id, garageId: p.garageId || null, ...pos(p), nx: +(p.nx || 0).toFixed(3), nz: +(p.nz === undefined ? 1 : p.nz).toFixed(3), devant: +(typeof profondeurDevant === 'function' ? profondeurDevant(p) : 0).toFixed(2) });
    for (const k of Object.keys(POIS)) { const v = POIS[k]; if (v && typeof v.x === 'number' && typeof v.z === 'number') out.pois.push({ cle: 'poi:' + k, ...pos(v) });
      else if (Array.isArray(v)) v.forEach((o, i) => { if (o && typeof o.x === 'number') out.pois.push({ cle: 'poi:' + k + '[' + i + ']', ...pos(o) }); }); }
    for (const g of GARAGES_TUNING) { const p = PORTES.find((q) => q.garageId === g.id); out.garages.push({ cle: 'garage:' + g.id, bx: g.bx, bz: g.bz, ...(p ? pos(p) : { x: null, z: null }) }); }
    for (const p of PORTES) { if (!INTDEFS[p.id]) continue; try { entrerInterieur(p.id, p); if (INT.actif) { sortirInterieur(); out.sorties.push({ cle: 'sortie:' + p.id + (p.garageId ? ':' + p.garageId : '') + (p.boutiqueId ? ':' + p.boutiqueId : ''), ...pos(P) }); } } catch (e) { out.sorties.push({ cle: 'sortie:' + p.id, erreur: String(e) }); } }
    startRun(); ecran(null); ETAT.mode = 'jeu';
    for (const v of vehicules) { if (v.mort || v._traf || v.conduit === 'trafic' || v.conduit === 'police') continue; out.vehicules.push({ cle: 'veh:' + v.key + '@' + Math.round(v.x) + ',' + Math.round(v.z), key: v.key, ...pos(v), ang: +(v.ang || 0).toFixed(2), conduit: v.conduit || null, bateau: !!(v.def && v.def.eau), air: v.def && v.def.air || null }); }
    if (typeof STANDS !== 'undefined') STANDS.forEach((s, i) => out.stands.push({ cle: 'stand:' + Math.round(s.x) + ',' + Math.round(s.z), ...pos(s), q: s.q || null }));
    if (typeof PLANQUES !== 'undefined') for (const q of PLANQUES.liste) out.planques.push({ cle: 'planque:' + q.def.id, ...pos(q), porte: q.porte ? pos(q.porte) : null, entree: q.entree ? pos(q.entree) : null });
    if (typeof pointsActivites === 'function') pointsActivites().forEach((a) => { if (a && typeof a.x === 'number') out.activites.push({ cle: 'activite:' + (a.nom || a.id || '?') + '@' + Math.round(a.x) + ',' + Math.round(a.z), ...pos(a) }); });
    if (typeof RIDE_DEFS !== 'undefined' && typeof rideDepart === 'function') for (const k of Object.keys(RIDE_DEFS)) { try { const d = rideDepart(k); if (d) out.rides.push({ cle: 'course:' + k, ...pos(d) }); } catch (e) {} }
    if (typeof STATIONS_VELO !== 'undefined') STATIONS_VELO.forEach((s) => out.stations.push({ cle: 'stationVelo:' + Math.round(s.x) + ',' + Math.round(s.z), ...pos(s) }));
    if (POIS.rack) out.caches.push({ cle: 'cache:rack', ...pos(POIS.rack) });
    /* accessibilité : inondation sur une grille de 1 u (à pied : rayon 0,45 ; en voiture : rayon 1,4), depuis une rue loin de la zone */
    const X0 = 60, X1 = 312, Z0 = -70, Z1 = 312, W = X1 - X0 + 1, Hh = Z1 - Z0 + 1;
    const grille = (ray) => { const ok = new Uint8Array(W * Hh), y = new Float32Array(W * Hh);
      for (let i = 0; i < W; i++) for (let j = 0; j < Hh; j++) { const x = X0 + i, z = Z0 + j, k = i * Hh + j; y[k] = solY(x, z); ok[k] = !estEau(x, z) && !solidAt(x, z, ray) && y[k] < 3.5 ? 1 : 0; }
      const vu = new Uint8Array(W * Hh), file = []; let k0 = -1; for (let d = 0; d < 30 && k0 < 0; d++) { const k = (70 - X0) * Hh + (-60 - Z0 + d); if (ok[k]) k0 = k; }
      if (k0 >= 0) { vu[k0] = 1; file.push(k0); }
      while (file.length) { const k = file.pop(), i = Math.floor(k / Hh), j = k % Hh;
        for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = i + di, b = j + dj; if (a < 0 || b < 0 || a >= W || b >= Hh) continue; const q = a * Hh + b; if (vu[q] || !ok[q] || Math.abs(y[q] - y[k]) > 0.6) continue; vu[q] = 1; file.push(q); } }
      return (x, z, rr) => { for (let d = 0; d <= (rr || 3); d++) for (let di = -d; di <= d; di++) for (let dj = -d; dj <= d; dj++) { const i = Math.round(x) - X0 + di, j = Math.round(z) - Z0 + dj; if (i < 0 || j < 0 || i >= W || j >= Hh) continue; if (vu[i * Hh + j]) return true; } return false; }; };
    const aPied = grille(0.45), enVoiture = grille(1.4);
    for (const L of ['portes', 'pois', 'garages', 'sorties', 'vehicules', 'stands', 'planques', 'activites', 'rides', 'stations', 'caches']) for (const e of out[L]) { if (typeof e.x !== 'number') continue;
      const dx = L === 'portes' ? e.nx * 1.6 : 0, dz = L === 'portes' ? e.nz * 1.6 : 0;
      e.eau = estEau(e.x + dx, e.z + dz); e.pont = typeof pontCanal === 'function' ? !!pontCanal(e.x, e.z) : false;
      e.aPied = e.x > X0 && e.x < X1 && e.z > Z0 && e.z < Z1 ? aPied(e.x + dx, e.z + dz, 3) : null;
      if (L === 'garages' || L === 'vehicules') e.enVoiture = e.x > X0 && e.x < X1 && e.z > Z0 && e.z < Z1 ? enVoiture(e.x + dx * 2, e.z + dz * 2, 4) : null; }
    return out;
  }, replis, lieuxMission);
  r.date = new Date().toISOString(); r.graine = 20260731; r.zone = ZONE;
  for (const L of Object.keys(r)) if (Array.isArray(r[L]) && r[L].length && typeof r[L][0] === 'object') for (const e of r[L]) if (typeof e.x === 'number') e.zone = dansZone(e.x, e.z);
  fs.writeFileSync(sortie, JSON.stringify(r, null, 1));
  const n = Object.keys(r).filter((k) => Array.isArray(r[k])).map((k) => k + ' ' + r[k].length).join(', ');
  console.log('relevé écrit : ' + sortie + ' (' + n + ')'); if (h.erreurs.length) console.log('erreurs page', h.erreurs.slice(0, 5));
  await h.fermer();
  if (!ref) return;
  /* comparaison */
  const A = JSON.parse(fs.readFileSync(ref, 'utf8')), dep = fs.existsSync(path.join(R, 'rapport_nuit/canaux_deplacements.json')) ? JSON.parse(fs.readFileSync(path.join(R, 'rapport_nuit/canaux_deplacements.json'), 'utf8')) : {};
  const ko = [], notes = [];
  for (const L of ['portes', 'pois', 'garages', 'sorties', 'vehicules', 'stands', 'planques', 'activites', 'rides', 'stations', 'caches']) {
    const nouv = new Map((r[L] || []).map((e) => [e.cle, e]));
    for (const a of A[L] || []) { const b = nouv.get(a.cle);
      if (!b) { if (L === 'vehicules' || L === 'stands' || L === 'activites') { /* clé à la position : retrouvé par proximité ou par déplacement noté */
          const proche = (r[L] || []).find((e) => (e.key || '') === (a.key || '') && Math.hypot(e.x - a.x, e.z - a.z) < 0.05); if (proche) continue; }
        if (dep[a.cle]) { notes.push(a.cle + ' : ' + dep[a.cle]); continue; } ko.push(L + ' ' + a.cle + ' : disparu'); continue; }
      const bouge = Math.hypot(b.x - a.x, b.z - a.z) > 0.01;
      if (bouge && !dep[a.cle]) ko.push(L + ' ' + a.cle + ' : déplacé (' + a.x + ',' + a.z + ' → ' + b.x + ',' + b.z + ')' + (a.zone ? ' sans être noté dans canaux_deplacements.json' : ' HORS ZONE'));
      else if (bouge) notes.push(a.cle + ' déplacé (' + a.x + ',' + a.z + ' → ' + b.x + ',' + b.z + ') : ' + dep[a.cle]);
      if (b.eau && !(L === 'vehicules' && b.bateau)) ko.push(L + ' ' + a.cle + ' : dans l’eau'); /* un bateau, lui, doit être à flot */
      if (L === 'vehicules' && b.bateau && a.eau && !b.eau) ko.push(L + ' ' + a.cle + ' : bateau plus à flot');
      if (b.pont) ko.push(L + ' ' + a.cle + ' : sur un tablier de pont');
      if (a.aPied && b.aPied === false) ko.push(L + ' ' + a.cle + ' : plus accessible à pied');
      if (a.enVoiture && b.enVoiture === false) ko.push(L + ' ' + a.cle + ' : plus accessible en voiture');
      if (L === 'portes' && a.devant >= 1.4 && b.devant < 1.4) ko.push('porte ' + a.cle + ' : plus de trottoir devant (' + b.devant + ')'); } }
  console.log('\nCOMPARAISON avec ' + ref + ' : ' + (ko.length ? ko.length + ' écart(s)' : 'aucun écart'));
  for (const k of ko) console.log('  ✗ ' + k); for (const n2 of notes) console.log('  · ' + n2);
  process.exit(ko.length ? 1 : 0);
})();
