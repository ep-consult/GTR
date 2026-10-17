// Coche dans rapport_nuit/SUIVI_COCKPITS.md les véhicules des familles refaites (FAITS=auto,camion,…) et écrit le cadran choisi,
// lu dans la source (CK_HAB, CK_CADRANS) : jamais recopié à la main.
const fs = require('fs'), path = require('path');
const R = path.join(__dirname, '..', '..'), src = fs.readFileSync(path.join(R, 'index.html'), 'utf8');
const lire = (nom) => { const i = src.indexOf('const ' + nom + '={'); let j = src.indexOf('{', i), n = 0, k = j; for (; k < src.length; k++) { if (src[k] === '{') n++; else if (src[k] === '}') { n--; if (!n) break; } } return eval('(' + src.slice(j, k + 1) + ')'); };
const HAB = lire('CK_HAB'), CAD = lire('CK_CADRANS'), diag = require('../captures/cockpits_v2/diag_avant.json');
const faits = new Set((process.env.FAITS || '').split(',').filter(Boolean)), cles = new Set((process.env.CLES || '').split(',').filter(Boolean));
const p = path.join(R, 'rapport_nuit', 'SUIVI_COCKPITS.md'); let s = fs.readFileSync(p, 'utf8'); let n = 0;
for (const [k, d] of Object.entries(diag)) { if (!faits.has(d.fam) && !cles.has(k)) continue; const h = HAB[k] || {}, desc = CAD[h.cad] || '';
  const re = new RegExp('- \\[[ x]\\] `' + k + '` — [^\\n]*'); const ligne = '- [x] `' + k + '` — ' + d.nom + ' — cadran `' + (h.cad || '?') + '` : ' + desc + (h.th ? ' ; garnissage `' + h.th + '`' : '');
  if (re.test(s)) { s = s.replace(re, ligne); n++; } }
fs.writeFileSync(p, s); console.log(n + ' véhicules cochés');
