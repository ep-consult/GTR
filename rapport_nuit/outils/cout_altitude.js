// Bloc pour le harnais des outils de nuit (bloc_run.js, SANSBOUCLE=1) : coût d'une image selon l'altitude de la soucoupe.
// Coût d'une image selon l'altitude de la soucoupe (vue 2D par défaut) : calcul, rendu (attente de la carte comprise), appels, triangles
const VUE = process.env.VUE || 'classique', N = +(process.env.N || 40);
const r = await page.evaluate((VUE, N) => {
  const gl = renderer.getContext(), px = new Uint8Array(4); const sync = () => gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
  let T = dernierT + 1000; if (P.veh) sortirVehicule(true); META.vue = VUE; startRun(); ecran(null); ETAT.mode = 'jeu'; ETAT.jour = 40; P.hp = P.maxHp = 1e9; WAVES.etat = 'repos'; WAVES.t = 1e9;
  const v = creerVehicule('ovni', POIS.place.x, POIS.place.z, 0, null); P.x = v.x; P.z = v.z; entrerVehicule(v); v.hp = 1e9;
  const lieux = { centre: [POIS.place.x, POIS.place.z], aeroport: [400, 60], canaux: [190, 110], mont: [520, -200] }; const res = {};
  for (const [nom, [x, z]] of Object.entries(lieux)) for (const alt of [20, 80, 170]) {
    for (let i = 0; i < 20; i++) { for (const e of ennemis) e.mort = true; v.alt = alt; v.mesh.position.y = alt; v.x = x; v.z = z; P.x = x; P.z = z; T += 1000 / 30; tick(T); renderer.render(scene, camera); }
    let tk = 0, tr = 0, calls = 0, tri = 0; for (let i = 0; i < N; i++) { for (const e of ennemis) e.mort = true; v.alt = alt; v.mesh.position.y = alt; v.x = x + (i % 2) * 0.5; v.z = z; P.x = v.x; P.z = z; T += 1000 / 30;
      const a = performance.now(); tick(T); const b = performance.now(); typeof rendreImage === 'function' ? rendreImage() : renderer.render(scene, camera); sync(); tr += performance.now() - b; tk += b - a; calls += renderer.info.render.calls; tri += renderer.info.render.triangles; }
    res[nom + ' ' + alt] = { calcul: +(tk / N).toFixed(1), rendu: +(tr / N).toFixed(1), appels: Math.round(calls / N), triangles: Math.round(tri / N), near: +camera.near.toFixed(1), far: camera.far, brouillard: Math.round(scene.fog.far) }; }
  return res; }, VUE, N);
for (const [k, x] of Object.entries(r)) console.log(k.padEnd(14), JSON.stringify(x));
