// Recopie les 42 <symbol> de icones.svg dans index.html (le jeu est
// mono-fichier : jamais de sprite chargé à part), entre deux repères, juste
// après <body>. Relancer après chaque `node construire.js`.
//   node integrer.js            → écrit
//   node integrer.js --verifier → code de sortie 1 si la copie diffère
const fs = require('fs'), path = require('path');
const RACINE = path.resolve(__dirname, '..');
const JEU = path.resolve(RACINE, '..', 'index.html');
const DEBUT = '<!-- ICONES SVG : début (copie de icones/icones.svg, générée par icones/outils/integrer.js — ne pas éditer à la main) -->';
const FIN = '<!-- ICONES SVG : fin -->';

const sprite = fs.readFileSync(path.join(RACINE, 'icones.svg'), 'utf8');
const symboles = sprite.slice(sprite.indexOf('>', sprite.indexOf('<svg')) + 1, sprite.lastIndexOf('</svg>')).trim();
const bloc = DEBUT + '\n<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true">\n' +
  symboles + '\n</svg>\n' + FIN;

let html = fs.readFileSync(JEU, 'utf8');
const i = html.indexOf(DEBUT), j = html.indexOf(FIN);
let neuf;
if (i >= 0 && j > i) neuf = html.slice(0, i) + bloc + html.slice(j + FIN.length);
else {
  const k = html.indexOf('<body>'); if (k < 0) throw new Error('<body> introuvable dans index.html');
  neuf = html.slice(0, k + 6) + '\n' + bloc + html.slice(k + 6);
}
if (process.argv.includes('--verifier')) {
  if (neuf !== html) { console.error('index.html : copie des icônes différente de icones.svg — lancer node integrer.js'); process.exit(1); }
  console.log('index.html : copie des 42 icônes identique à icones.svg'); process.exit(0);
}
fs.writeFileSync(JEU, neuf);
console.log('index.html : ' + (symboles.match(/<symbol /g) || []).length + ' icônes intégrées');
