// Bloc pour le harnais des outils de nuit (bloc_run.js : page déjà ouverte en 390 × 844, SANSBOUCLE=1). Sortie : SORTIE (par défaut rapport_nuit/).
// Combat de profondeur mesuré : chaque sol plat opaque reçoit une couleur unique ; quel sol gagne chaque pixel au plan proche réel
// (divisé par K pour imiter une profondeur moins précise que le rendu logiciel) contre un rendu de référence très précis (plan proche 60)
const X = +(process.env.X || 430), Z = +(process.env.Z || 140), ALT = +(process.env.ALT || 168), K = +(process.env.K || 64), NOM = process.env.NOM || 'zf', VUE = process.env.VUE || 'classique';
const r = await page.evaluate((X, Z, ALT, K, VUE) => {
  let T = dernierT + 1000; if (P.veh) sortirVehicule(true); META.vue = VUE; startRun(); ecran(null); ETAT.mode = 'jeu'; ETAT.jour = 40; P.hp = P.maxHp = 1e9; WAVES.etat = 'repos'; WAVES.t = 1e9;
  const v = creerVehicule('ovni', X, Z, 0, null); P.x = X; P.z = Z; entrerVehicule(v); v.alt = ALT; v.mesh.position.y = ALT; INPUT.jx = INPUT.jy = 0;
  for (let i = 0; i < 120; i++) { for (const e of ennemis) e.mort = true; v.alt = ALT; v.x = X; v.z = Z; T += 1000 / 60; tick(T); }
  ETAT.shake = 0; majCamera(0); const nearJeu = camera.near; scene.updateMatrixWorld(true);
  const bb = new THREE.Box3(), sols = [];
  scene.traverse((o) => { if (!o.isMesh || o.isInstancedMesh || !o.geometry || Array.isArray(o.material)) return; const m = o.material; if (!m || m.transparent || m.depthWrite === false || m.visible === false) return;
    bb.setFromObject(o); if (bb.min.x < -4000 || bb.max.y - bb.min.y > 0.4 || bb.max.y > 3.5 || bb.max.y < -0.8) return; if ((bb.max.x - bb.min.x) * (bb.max.z - bb.min.z) < 16) return; sols.push(o); });
  const vis = []; scene.traverse((o) => { if ((o.isMesh || o.isSprite || o.isPoints || o.isLine) && o.visible) vis.push(o); });
  const orig = new Map(); sols.forEach((o, i) => { const m = o.material; const c = new THREE.Color().setHex(((i + 1) * 2654435761) & 0xffffff); const b = new THREE.MeshBasicMaterial({ color: c, side: m.side, polygonOffset: m.polygonOffset, polygonOffsetFactor: m.polygonOffsetFactor, polygonOffsetUnits: m.polygonOffsetUnits }); orig.set(o, m); o.material = b; });
  const estSol = new Set(sols); for (const o of vis) if (!estSol.has(o)) o.visible = false;
  const gl = renderer.getContext(), W = gl.drawingBufferWidth, H = gl.drawingBufferHeight; const fog = scene.fog; scene.fog = null; const bg = scene.background; scene.background = new THREE.Color(0);
  const rendre = (near) => { camera.near = near; camera.updateProjectionMatrix(); renderer.render(scene, camera); const b = new Uint8Array(W * H * 4); gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, b); return b; };
  const ref = rendre(60); const res = { nearJeu: +nearJeu.toFixed(2), sols: sols.length, K, erreurs: [] }; let carte = null;
  for (const dx of [0, 0.77]) { camera.position.x += dx; camera.updateMatrixWorld(); const ref2 = dx ? rendre(60) : ref; const b = rendre(nearJeu / K); camera.position.x -= dx; camera.updateMatrixWorld();
    let n = 0, fond = 0; if (!carte) carte = { b, ref2 }; for (let i = 0; i < b.length; i += 4) { if (ref2[i] + ref2[i + 1] + ref2[i + 2] === 0) { fond++; continue; } if (b[i] !== ref2[i] || b[i + 1] !== ref2[i + 1] || b[i + 2] !== ref2[i + 2]) n++; } res.erreurs.push(n); res.pixelsSol = b.length / 4 - fond; }
  let url = ''; { const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d'); const im = g.createImageData(W, H); const { b, ref2 } = carte;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const p = ((H - 1 - y) * W + x) * 4, q = (y * W + x) * 4; const err = b[p] !== ref2[p] || b[p + 1] !== ref2[p + 1] || b[p + 2] !== ref2[p + 2]; im.data[q] = err ? 255 : ref2[p] * 0.35; im.data[q + 1] = err ? 0 : ref2[p + 1] * 0.35; im.data[q + 2] = err ? 0 : ref2[p + 2] * 0.35; im.data[q + 3] = 255; }
    g.putImageData(im, 0, 0); url = cv.toDataURL('image/png'); }
  for (const [o, m] of orig) { o.material.dispose(); o.material = m; } for (const o of vis) o.visible = true; scene.fog = fog; scene.background = bg; camera.near = nearJeu; camera.updateProjectionMatrix();
  return { res, url }; }, X, Z, ALT, K, VUE);
console.log(JSON.stringify(r.res));
fs.writeFileSync((process.env.SORTIE || 'C:/app/GTR/rapport_nuit/') + NOM + '.png', Buffer.from(r.url.split(',')[1], 'base64'));
