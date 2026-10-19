/* Essais du banc de vol (banc_vol.js) : chaque ligne affichée est un résultat ; les profils sont lus dans PROFILS_VOL. */
(function () {
  const out = [];
  const log = (s) => out.push(s);
  try {
    startRun(); ETAT.mode = 'jeu'; P.hp = P.maxHp = 1e9; ETAT.timeScale = 1;
    for (const e of ennemis) e.mort = true; WAVES.etat = 'repos'; WAVES.t = 1e9;
    const DT = 1 / 60, deg = (x) => (x * 180 / Math.PI).toFixed(1);
    const avionEnVol = (cle, V, alt, opts) => {
      opts = opts || {};
      if (P.veh) { P.veh = null; }
      const v = creerVehicule(cle, 0, MER + 160, Math.PI / 2, 'joueur'); P.veh = v; v.conduit = 'joueur';
      v.vol = true; v.alt = alt; v.v = V; v.ang = Math.PI / 2; v.bank = opts.bank || 0; v.tang = opts.tang || 0; v.gaz = opts.gaz !== undefined ? opts.gaz : 1; v.decolT = 0;
      volSimInit(v, v.tang); MANETTE.touche = false; INPUT.ex = 0; INPUT.ey = 0; return v; };
    const fwd = new THREE.Vector3();
    // 1. boucles
    for (const [cle, kV] of [['voltige', 1], ['chasseur', 1], ['avion', 1], ['tourisme', 1], ['jetprive', 1], ['ligne', 1], ['fret', 1]]) {
      const A = PROFILS_VOL[cle], v = avionEnVol(cle, A.Vmax * kV, 80);
      const h0x = Math.sin(v.ang), h0z = Math.cos(v.ang); let prev = 0, cum = 0, dos = false, decro = false, aMin = 1e9, aMax = -1e9, t = 0, r = 'vol', vMin = 1e9, fini = false;
      INPUT.ey = 1;
      for (; t < 30; t += DT) {
        majVol(v, DT); if (P.veh !== v || v.mort) { r = 'crash'; break; }
        fwd.set(0, 0, 1).applyQuaternion(v.q); const a = Math.atan2(fwd.y, fwd.x * h0x + fwd.z * h0z); let d = a - prev; if (d > Math.PI) d -= 2 * Math.PI; if (d < -Math.PI) d += 2 * Math.PI; cum += d; prev = a;
        if (Math.abs(v.bank) > 2.5) dos = true; if (v.decroche) decro = true; aMin = Math.min(aMin, v.alt); aMax = Math.max(aMax, v.alt); vMin = Math.min(vMin, v.v);
        if (cum >= Math.PI * 2 && !fini) { fini = true; INPUT.ey = 0; }
        if (fini && t > 0) { /* laisse 1 s */ if (!v._tFin) v._tFin = t; if (t - v._tFin > 1) break; }
      }
      INPUT.ey = 0;
      log('BOUCLE ' + cle + ' V0=' + (A.Vmax * kV) + ' : ' + (fini ? 'complète' : 'NON (' + deg(cum) + '°)') + ' en ' + t.toFixed(1) + ' s, alt 80 → ' + (v.alt || 0).toFixed(1) + ' (min ' + aMin.toFixed(0) + ', max ' + aMax.toFixed(0) + '), vmin ' + vMin.toFixed(1) + ', dos ' + dos + ', décroché ' + decro + ', ' + r);
    }
    // 2. boucle trop lente
    for (const cle of ['voltige', 'chasseur', 'avion']) {
      const A = PROFILS_VOL[cle], v = avionEnVol(cle, A.Vmin * 1.25, 100, { gaz: 0 }); let decro = false, t = 0; INPUT.ey = 1;
      for (; t < 8; t += DT) { majVol(v, DT); if (P.veh !== v) break; if (v.decroche) { decro = true; break; } }
      INPUT.ey = 0; log('BOUCLE LENTE ' + cle + ' : décrochage ' + (decro ? 'détecté à ' + t.toFixed(2) + ' s, v=' + v.v.toFixed(1) : 'NON'));
    }
    // 3. tonneau
    for (const cle of ['voltige', 'chasseur', 'avion']) {
      const A = PROFILS_VOL[cle], v = avionEnVol(cle, A.Vmax, 90); let prev = 0, cum = 0, t = 0, fin = -1; INPUT.ex = 1;
      for (; t < 20; t += DT) { majVol(v, DT); if (P.veh !== v) break; let d = v.bank - prev; if (d > Math.PI) d -= 2 * Math.PI; if (d < -Math.PI) d += 2 * Math.PI; cum += d; prev = v.bank;
        if (fin < 0 && Math.abs(cum) >= Math.PI * 2 - 0.15) { fin = t; INPUT.ex = 0; } if (fin >= 0 && t - fin > 3) break; }
      INPUT.ex = 0; log('TONNEAU ' + cle + ' : ' + (fin >= 0 ? 'complet en ' + fin.toFixed(2) + ' s' : 'NON (' + deg(cum) + ')') + ', inclinaison finale ' + deg(v.bank) + '°, assiette ' + deg(v.tang) + '°, alt ' + v.alt.toFixed(0));
    }
    // 4. voltige sur le dos, manche lâché, 10 s
    { const A = PROFILS_VOL.voltige, v = avionEnVol('voltige', A.Vmax * 0.9, 120, { bank: Math.PI, gaz: 0.8 }); let minB = 9, thMin = 9, thMax = -9, nan = false, qmax = 0, t = 0;
      for (; t < 10; t += DT) { majVol(v, DT); if (P.veh !== v) break; minB = Math.min(minB, Math.abs(v.bank)); thMin = Math.min(thMin, v.tang); thMax = Math.max(thMax, v.tang); if (!isFinite(v.q.x + v.q.y + v.q.z + v.q.w + v.alt + v.v)) nan = true; qmax = Math.max(qmax, Math.abs(1 - v.q.length())); }
      log('DOS voltige 10 s : |inclinaison| min ' + deg(minB) + '°, assiette ' + deg(thMin) + '…' + deg(thMax) + '°, alt 120 → ' + v.alt.toFixed(0) + ', NaN ' + nan + ', |1-|q|| max ' + qmax.toExponential(1) + ', t ' + t.toFixed(1)); }
    // 5. stables lâchés à 45°
    for (const cle of ['avion', 'tourisme', 'jetprive', 'ligne', 'fret', 'chasseur', 'voltige']) {
      const A = PROFILS_VOL[cle], v = avionEnVol(cle, A.Vmax * 0.9, 100, { bank: Math.PI / 4, gaz: 0.8 }); let t = 0, ok = -1;
      for (; t < 8; t += DT) { majVol(v, DT); if (P.veh !== v) break; if (ok < 0 && Math.abs(v.bank) < 3 * Math.PI / 180) ok = t; }
      log('LÂCHÉ À 45° ' + cle + ' (stabilité ' + A.stabilite + ') : ' + (ok >= 0 ? 'à plat en ' + ok.toFixed(2) + ' s' : 'toujours à ' + deg(v.bank) + '° après 8 s') + ', alt 100 → ' + v.alt.toFixed(0));
    }
    // 6. inversion de l'axe Y
    { META.inverserY = true; const v = avionEnVol('avion', 40, 100); INPUT.ey = 1; for (let t = 0; t < 1; t += DT) majVol(v, DT); INPUT.ey = 0; log('AXE Y INVERSÉ, tiré 1 s : assiette ' + deg(v.tang) + '° (doit être négative)'); META.inverserY = false;
      const w = avionEnVol('avion', 40, 100); INPUT.ey = 1; for (let t = 0; t < 1; t += DT) majVol(w, DT); INPUT.ey = 0; log('AXE Y NORMAL, tiré 1 s : assiette ' + deg(w.tang) + '°'); }
    // 7. palier : vitesse d'équilibre plein gaz, manche lâché
    for (const cle of ['avion', 'ligne', 'chasseur', 'voltige']) { const A = PROFILS_VOL[cle], v = avionEnVol(cle, A.Vmax * 0.8, 100); for (let t = 0; t < 15; t += DT) { majVol(v, DT); if (P.veh !== v) break; }
      log('PALIER ' + cle + ' 15 s plein gaz lâché : v ' + v.v.toFixed(1) + ' (Vmax ' + A.Vmax + '), alt 100 → ' + v.alt.toFixed(0) + ', assiette ' + deg(v.tang) + '°'); }
  } catch (e) { log('EXCEPTION ' + (e && e.stack || e)); }
  console.log(out.join('\n'));
})();
