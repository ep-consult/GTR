// Construit icones.svg (et apercu.html, qui en embarque une copie EXACTE des
// symboles) à partir des dessins manuels de dessins.js, dans l'ordre de
// inventaire.csv.   node construire.js
const fs = require('fs'), path = require('path');
const RACINE = path.resolve(__dirname, '..');
const DESSINS = require('./dessins.js');

function lireInventaire() {
  const lignes = fs.readFileSync(path.join(RACINE, 'inventaire.csv'), 'utf8').trim().split(/\r?\n/).slice(1);
  return lignes.map((l) => { const [planche, id, ...desc] = l.split(','); return { planche, id, description: desc.join(',') }; });
}
function symboles(inv, avecManquants) {
  const out = [];
  for (const { id } of inv) {
    if (!DESSINS[id]) { if (avecManquants) continue; throw new Error('Icône non dessinée : ' + id); }
    const chemins = DESSINS[id]().filter((c) => c && c.length);
    if (chemins.length < 1 || chemins.length > 3) throw new Error(id + ' : ' + chemins.length + ' chemins (1 à 3 attendus)');
    for (const c of chemins) if (/NaN|undefined|Infinity/.test(c.join(''))) throw new Error(id + ' : coordonnée invalide');
    out.push('  <symbol id="' + id + '" viewBox="0 0 24 24">\n' +
      chemins.map((c) => '    <path fill="currentColor" d="' + c.join('') + '"/>').join('\n') + '\n  </symbol>');
  }
  return out;
}
function sprite(inv, avecManquants) {
  return '<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg">\n' + symboles(inv, avecManquants).join('\n') + '\n</svg>\n';
}
module.exports = { lireInventaire, symboles, sprite };

if (require.main === module) {
  const brouillon = process.argv.includes('--brouillon'); // tolère des icônes pas encore dessinées
  const inv = lireInventaire();
  const svg = sprite(inv, brouillon);
  fs.writeFileSync(path.join(RACINE, 'icones.svg'), svg);
  console.log('icones.svg : ' + (svg.match(/<symbol /g) || []).length + ' symboles');
  if (!brouillon) {
    const page = require('./apercu.js')(inv, svg);
    fs.writeFileSync(path.join(RACINE, 'apercu.html'), page);
    console.log('apercu.html écrit');
  }
}
