// Remplace la définition d'une icône dans dessins.js par le contenu d'un
// fichier (outil de retouche) :  node remplacer.js <id> <fichier>
// Le bloc s'étend de « I['<id>'] = » jusqu'à la ligne qui précède la
// prochaine icône, le prochain bandeau de section ou module.exports.
const fs = require('fs'), path = require('path');
const [id, fichier] = process.argv.slice(2);
const p = path.join(__dirname, 'dessins.js');
const lignes = fs.readFileSync(p, 'utf8').split('\n');
const debut = lignes.findIndex((l) => l.startsWith("I['" + id + "'] ="));
if (debut < 0) { console.error('introuvable : ' + id); process.exit(1); }
let fin = debut + 1;
while (fin < lignes.length && !/^I\['|^\/\* =|^module\.exports|^\/\/ |^const /.test(lignes[fin])) fin++;
while (fin > debut + 1 && lignes[fin - 1].trim() === '') fin--;
const bloc = fs.readFileSync(fichier, 'utf8').replace(/\s+$/, '').split('\n');
lignes.splice(debut, fin - debut, ...bloc);
fs.writeFileSync(p, lignes.join('\n'));
console.log(id + ' : lignes ' + (debut + 1) + '–' + fin + ' remplacées par ' + bloc.length + ' ligne(s)');
