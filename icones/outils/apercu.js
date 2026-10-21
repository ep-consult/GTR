// Génère apercu.html : page autonome (aucune dépendance réseau, aucun fetch)
// qui embarque une copie EXACTE des <symbol> de icones.svg dans un SVG masqué
// et affiche chaque icône par <use href="#id"> à 24, 48 et 64 px.
const CATEGORIES = [
  ['01-armes.png', 'Armes'],
  ['02-hud.png', 'Commandes HUD'],
  ['03-capacites-carte.png', 'Capacités et carte'],
  ['04-garage.png', 'Garage'],
  ['05-lieux.png', 'Lieux de la carte'], // retours du 20 octobre, lot 2 : sans planche de référence
];
const echap = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

module.exports = (inventaire, sprite) => {
  // copie exacte des symboles du sprite livré (le texte entre <svg …> et </svg>)
  const symboles = sprite.slice(sprite.indexOf('>', sprite.indexOf('<svg')) + 1, sprite.lastIndexOf('</svg>')).trim();
  const tailles = [24, 48, 64];
  const sections = CATEGORIES.map(([planche, titre]) => {
    const icones = inventaire.filter((l) => l.planche === planche);
    const cartes = icones.map((l) => '      <article class="carte" data-id="' + l.id + '">\n' +
      '        <div class="rendus">' + tailles.map((t) =>
        '<figure><svg class="ico" width="' + t + '" height="' + t + '" viewBox="0 0 24 24" aria-hidden="true" style="width:' + t + 'px;height:' + t + 'px"><use href="#' + l.id + '"></use></svg><figcaption>' + t + ' px</figcaption></figure>').join('') + '</div>\n' +
      '        <code>' + l.id + '</code>\n        <p>' + echap(l.description) + '</p>\n      </article>').join('\n');
    return '    <section class="categorie">\n      <h2>' + titre + ' <span>(' + icones.length + ')</span></h2>\n      <div class="grille">\n' + cartes + '\n      </div>\n    </section>';
  }).join('\n');
  const refs = CATEGORIES.filter(([planche]) => require('fs').existsSync(require('path').join(__dirname, '..', 'references', planche))).map(([planche, titre]) => '      <figure class="ref"><img src="references/' + planche + '" alt="Planche de référence : ' + titre + '"><figcaption>references/' + planche + '</figcaption></figure>').join('\n');
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>GTRoyal — icônes</title>
<style>
  :root { --fond: #0d1016; --carte: #161b24; --bord: #262d3a; --texte: #e8ecf2; --doux: #8b93a7; --icone: #eef1f6; }
  body.clair { --fond: #f2f4f7; --carte: #ffffff; --bord: #d6dbe3; --texte: #1b2130; --doux: #5d6678; }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--fond); color: var(--texte); font: 14px/1.4 system-ui, -apple-system, "Segoe UI", sans-serif; }
  header { position: sticky; top: 0; z-index: 2; display: flex; flex-wrap: wrap; gap: 12px 20px; align-items: center; padding: 14px 20px;
    background: var(--fond); border-bottom: 1px solid var(--bord); }
  header h1 { margin: 0; font-size: 18px; letter-spacing: .04em; }
  header label { display: flex; align-items: center; gap: 8px; color: var(--doux); }
  header input[type=search] { width: 230px; padding: 7px 10px; border-radius: 8px; border: 1px solid var(--bord); background: var(--carte); color: var(--texte); }
  header input[type=color] { width: 36px; height: 28px; padding: 0; border: 1px solid var(--bord); border-radius: 6px; background: none; }
  header button { padding: 7px 12px; border-radius: 8px; border: 1px solid var(--bord); background: var(--carte); color: var(--texte); cursor: pointer; }
  #compte { color: var(--doux); margin-left: auto; }
  main { padding: 8px 20px 40px; max-width: 1400px; margin: 0 auto; }
  h2 { font-size: 15px; letter-spacing: .06em; text-transform: uppercase; margin: 26px 0 12px; }
  h2 span { color: var(--doux); font-weight: 400; }
  .grille { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 12px; }
  .carte { background: var(--carte); border: 1px solid var(--bord); border-radius: 12px; padding: 14px; }
  .carte.masquee { display: none; }
  .rendus { display: flex; align-items: flex-end; gap: 18px; margin-bottom: 10px; }
  figure { margin: 0; text-align: center; }
  figcaption { font-size: 11px; color: var(--doux); margin-top: 4px; }
  .ico { display: block; margin: 0 auto; color: var(--icone); }
  code { font: 12px ui-monospace, Menlo, Consolas, monospace; }
  .carte p { margin: 4px 0 0; color: var(--doux); font-size: 12px; }
  .refs { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 14px; }
  .ref img { width: 100%; height: auto; border-radius: 8px; border: 1px solid var(--bord); }
  .note { color: var(--doux); max-width: 900px; }
  .note code { color: var(--texte); }
  @media (max-width: 600px) { header input[type=search] { width: 100%; } #compte { margin-left: 0; } }
</style>
</head>
<body>
<!-- Copie exacte des symboles de icones.svg (vérifiée par outils/recette.js) :
     la galerie y fait référence localement (#id), sans aucun chargement. -->
<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true">
${symboles}
</svg>
<header>
  <h1>GTRoyal — icônes</h1>
  <label>Recherche par ID <input id="recherche" type="search" placeholder="ex. ico-arme-, nitro…" autocomplete="off"></label>
  <label>Couleur <input id="couleur" type="color" value="#eef1f6"></label>
  <button id="fond" type="button">Fond clair</button>
  <span id="compte"></span>
</header>
<main>
${sections}
    <section>
      <h2>Références PNG — images raster, pas les SVG finaux</h2>
      <p class="note">Les quatre planches ci-dessous sont les images de référence fournies, montrées pour comparaison uniquement. Elles ne sont ni intégrées au sprite ni utilisées par la galerie : chaque icône ci-dessus est un tracé vectoriel dessiné à la main dans <code>icones.svg</code>.</p>
      <div class="refs">
${refs}
      </div>
    </section>
    <section>
      <h2>Utiliser le sprite externe</h2>
      <p class="note">Servi en HTTP, le sprite s'utilise directement : <code>&lt;svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"&gt;&lt;use href="./icones.svg#ico-arme-poings"&gt;&lt;/use&gt;&lt;/svg&gt;</code>. La couleur vient de la propriété CSS <code>color</code> du SVG ou de son parent (tous les tracés sont en <code>currentColor</code>). Voir README-integration.md.</p>
    </section>
</main>
<script>
  const cartes = Array.from(document.querySelectorAll('.carte'));
  const compte = document.getElementById('compte');
  const majCompte = () => { const n = cartes.filter((c) => !c.classList.contains('masquee')).length; compte.textContent = n + ' / ' + cartes.length + ' icônes · ' + (n * 3) + ' rendus'; };
  document.getElementById('recherche').addEventListener('input', (e) => {
    const q = e.target.value.trim().toLowerCase();
    for (const c of cartes) c.classList.toggle('masquee', q !== '' && !c.dataset.id.toLowerCase().includes(q));
    for (const s of document.querySelectorAll('.categorie')) s.style.display = s.querySelector('.carte:not(.masquee)') ? '' : 'none';
    majCompte();
  });
  document.getElementById('couleur').addEventListener('input', (e) => document.documentElement.style.setProperty('--icone', e.target.value));
  const bouton = document.getElementById('fond');
  bouton.addEventListener('click', () => {
    const clair = document.body.classList.toggle('clair');
    bouton.textContent = clair ? 'Fond sombre' : 'Fond clair';
    // couleur par défaut : on garde un contraste lisible sur le nouveau fond
    const c = document.getElementById('couleur');
    if (c.value === '#eef1f6' || c.value === '#1b2130') { c.value = clair ? '#1b2130' : '#eef1f6'; document.documentElement.style.setProperty('--icone', c.value); }
  });
  majCompte();
</script>
</body>
</html>
`;
};
