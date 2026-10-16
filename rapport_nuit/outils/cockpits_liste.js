// Génère rapport_nuit/COCKPITS.md : une ligne par clé de VEHDEFS (lue dans index.html), cochée si le diagnostic (cockpits_diag.json) est bon
// ET si la clé figure dans cockpits_vus.txt (vérifiée à l'œil sur la galerie). node cockpits_liste.js
const fs = require('fs'), path = require('path');
const s = fs.readFileSync('C:/app/GTR/index.html', 'utf8'); const i = s.indexOf('const VEHDEFS='); const j = s.indexOf('\n};', i); const body = s.slice(i, j);
const cles = [...body.matchAll(/^\s{2}([a-zA-Z0-9_]+):\{/gm)].map((m) => m[1]);
for (const m of s.matchAll(/Object\.assign\(VEHDEFS,\{([\s\S]*?)\n\}\);/g)) for (const q of m[1].matchAll(/^\s{2}([a-zA-Z0-9_]+):\{/gm)) cles.push(q[1]);
const diag = JSON.parse(fs.readFileSync(path.join(__dirname, 'cockpits_diag.json') /* produit par cap_cockpits.js (harnais : scratchpad) */, 'utf8'));
const vus = new Set(fs.existsSync(path.join(__dirname, 'cockpits_vus.txt')) ? fs.readFileSync(path.join(__dirname, 'cockpits_vus.txt'), 'utf8').split(/\s+/).filter(Boolean) : []);
const notes = fs.existsSync(path.join(__dirname, 'cockpits_notes.json')) ? JSON.parse(fs.readFileSync(path.join(__dirname, 'cockpits_notes.json'), 'utf8')) : {};
const FAM = { auto: 'voiture (planche de bord, volant, mains, montants, pavillon, rétroviseur, siège voisin)', camion: 'camion ou bus (planche large, volant couché)', char: 'char (tourelleau, périscope)', moto: 'moto (guidon, compteur, rétroviseurs, réservoir)', jetski: 'jet-ski (guidon, capot)', velo: 'vélo (guidon, sonnette)', debout: 'debout (rien à construire)', kayak: 'kayak (pagaie en mains, hiloire)', bateau: 'bateau (console, barre, manette, compas)', passerelle: 'passerelle (console large, barre, radar)', helico: 'hélico (tableau, cyclique, collectif, palonniers)', avion: 'avion (tableau, volant ou manche, manette)', ovni: 'OVNI (console, boule de commande)' };
let n = 0, ok = 0; const lignes = cles.map((k) => { n++; const d = diag[k] || {}; const bon = !!(d.ok && vus.has(k)); if (bon) ok++;
  const det = d.err ? 'ERREUR : ' + d.err : (d.fam ? FAM[d.fam] || d.fam : '?') + (d.approx ? ' ; œil estimé sur l’encombrement' : '') + (d.ok === false ? ' ; diagnostic : ' + [d.dansXZ ? '' : 'œil hors emprise', d.dansY ? '' : 'œil hors hauteur', d.libre ? '' : 'vue bouchée (' + d.devant + ')', d.instrVu === false ? 'instruments hors champ' : ''].filter(Boolean).join(', ') : '') + (vus.has(k) ? '' : ' ; pas encore regardé en rendu') + (notes[k] ? ' ; ' + notes[k] : '');
  return '- [' + (bon ? 'x' : ' ') + '] `' + k + '` — ' + (d.nom || '') + ' — ' + det; });
const md = `# Cockpits — liste de contrôle (nuit du 17 octobre 2026)

Un cockpit = la vue à la 1re personne au volant (META.vue 'fps', bouton 1P) : œil à la place du conducteur, intérieur construit pour la famille du véhicule, instruments qui vivent, volant qui suit le braquage, regard au doigt. Code : bandeau « COCKPITS » d'index.html (\`COCKPIT\`, \`cockpitDims\`, \`mkCockpitInterieur\`, \`cameraCockpit\`, \`cockpitDiagnostic\`, corrections à la main dans \`COCKPIT_DEFS\`).

Cette liste est **générée depuis la source** (\`VEHDEFS\`, ${n} clés, véhicules cachés et du Dépôt compris) par \`scratchpad/cockpits_liste.js\` : une case est cochée seulement si (1) \`cockpitDiagnostic\` est bon — œil dans l'emprise du véhicule et à bonne hauteur, vue libre devant sur trois rayons (hors vitrage), instruments dans le champ, intérieur présent — et (2) la capture a été regardée. Le test « Cockpits » de scenarios.js rejoue (1) sur toutes les clés.

**${ok} / ${n} cochés.**

${lignes.join('\n')}
`;
fs.writeFileSync('C:/app/GTR/rapport_nuit/COCKPITS.md', md); console.log(ok + '/' + n);
