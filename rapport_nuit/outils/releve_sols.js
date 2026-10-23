// Bloc pour le harnais des outils de nuit (bloc_run.js : page déjà ouverte en 390 × 844, SANSBOUCLE=1). Sortie : SORTIE (par défaut rapport_nuit/).
// Relevé des sols qui se superposent : rayons verticaux sur une grille, surfaces horizontales à moins de EPS l'une de l'autre
const PAS = +(process.env.PAS || 3), EPS = +(process.env.EPS || 0.06);
const BX = (process.env.BOX || '-460,660,-360,740').split(',').map(Number);
const r = await page.evaluate((PAS, EPS, BX) => {
  if (P.veh) sortirVehicule(true); META.vue = 'classique'; startRun(); ecran(null); ETAT.mode = 'jeu'; ETAT.jour = 40;
  let T = dernierT + 1000; for (let i = 0; i < 30; i++) { T += 1000 / 60; tick(T); }
  scene.updateMatrixWorld(true);
  const visible = (o) => { for (let q = o; q; q = q.parent) if (!q.visible) return false; return true; };
  const cands = []; const bb = new THREE.Box3();
  scene.traverse((o) => { if (!o.isMesh || o.isInstancedMesh || !visible(o) || !o.geometry) return; if (o.layers.mask === 0) return; const m = Array.isArray(o.material) ? o.material[0] : o.material; if (!m || m.visible === false) return;
    bb.setFromObject(o); if (bb.min.x < -4000) return; const h = bb.max.y - bb.min.y; if (bb.min.y > 3 || bb.max.y < -3) return; if ((bb.max.x - bb.min.x) * (bb.max.z - bb.min.z) < 20) return; cands.push(o); });
  const nomDe = (o) => { const m = Array.isArray(o.material) ? o.material[0] : o.material; let n = o.name || ''; if (!n) for (let q = o.parent; q && !n; q = q.parent) n = q.name || ''; return (n ? n + '|' : '') + m.type.replace('Mesh', '').replace('Material', '') + '#' + (m.color ? m.color.getHexString() : '-') + (m.map ? '+tex' : '') + (m.onBeforeCompile && String(m.onBeforeCompile).length > 30 ? '+sh' : '') + (m.polygonOffset ? '+po' : '') + (m.depthWrite === false ? '+nodw' : '') + (m.transparent ? '+tr' : '') + '/' + o.uuid.slice(0, 4); };
  const rc = new THREE.Raycaster(); rc.far = 200; const dir = new THREE.Vector3(0, -1, 0), org = new THREE.Vector3(), nm = new THREE.Matrix3(), n = new THREE.Vector3();
  const paires = {}; const t0 = performance.now(); let rays = 0;
  for (let x = BX[0]; x <= BX[1]; x += PAS) for (let z = BX[2]; z <= BX[3]; z += PAS) {
    org.set(x + 0.37, 50, z + 0.61); rc.set(org, dir); rays++;
    const hs = rc.intersectObjects(cands, false); const hz = [];
    for (const h of hs) { if (!h.face) continue; nm.getNormalMatrix(h.object.matrixWorld); n.copy(h.face.normal).applyMatrix3(nm).normalize(); if (n.y < 0.9) continue; hz.push(h); }
    for (let i = 0; i + 1 < hz.length; i++) { const a = hz[i], b = hz[i + 1]; const dy = a.point.y - b.point.y; if (dy > EPS) continue; if (a.object === b.object && Math.abs(dy) < 1e-4) continue;
      const k = nomDe(a.object) + ' / ' + nomDe(b.object); const p = paires[k] || (paires[k] = { n: 0, ya: a.point.y, yb: b.point.y, dyMin: 9, x0: 1e9, x1: -1e9, z0: 1e9, z1: -1e9 }); p.n++; p.dyMin = Math.min(p.dyMin, dy); p.x0 = Math.min(p.x0, x); p.x1 = Math.max(p.x1, x); p.z0 = Math.min(p.z0, z); p.z1 = Math.max(p.z1, z); } }
  const L = Object.entries(paires).map(([k, p]) => ({ k, surf: p.n * PAS * PAS, ya: +p.ya.toFixed(3), yb: +p.yb.toFixed(3), dyMin: +p.dyMin.toFixed(4), box: [p.x0, p.x1, p.z0, p.z1] })).sort((a, b) => b.surf - a.surf);
  return { cands: cands.length, rays, ms: Math.round(performance.now() - t0), L }; }, PAS, EPS, BX);
console.log('candidats', r.cands, 'rayons', r.rays, 'ms', r.ms, 'paires', r.L.length);
for (const p of r.L) console.log(String(p.surf).padStart(7), 'dy', String(p.dyMin).padEnd(7), p.ya, p.yb, JSON.stringify(p.box), p.k);
fs.writeFileSync((process.env.SORTIE || 'C:/app/GTR/rapport_nuit/') + (process.env.NOM || 'sols') + '.json', JSON.stringify(r.L, null, 1));
