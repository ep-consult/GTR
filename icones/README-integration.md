# Icônes ASPHALTE — intégration

42 pictogrammes vectoriels, dessinés à la main d'après les quatre planches de
`references/`. Ce sont de vrais tracés SVG : aucune image, aucun tracé automatique.

| Fichier | Rôle |
|---|---|
| `icones.svg` | **le sprite** : 42 `<symbol>`, `viewBox="0 0 24 24"`, 1 à 3 `<path>` chacun, `fill="currentColor"` |
| `apercu.html` | galerie autonome : 42 icônes × 24/48/64 px, recherche, couleur, fond clair/sombre |
| `inventaire.csv` | liste contractuelle des 42 IDs (planche, ID, description) |
| `references/` | les quatre planches PNG d'origine — **références raster, pas les icônes** |
| `rapport-validation.md` | recette et simplifications à 24 px |
| `outils/` | outils de dessin et de vérification (voir plus bas) — pas nécessaires à l'usage |

## Utiliser une icône

Le sprite est servi en HTTP, à côté de la page qui l'utilise :

```html
<svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
  <use href="./icones.svg#ico-arme-poings"></use>
</svg>
```

- **Couleur** : tous les tracés sont en `currentColor`. La couleur vient donc de
  la propriété CSS `color` du `<svg>` ou de son parent
  (`.btn svg { color: #ffd23f; }`). Aucune couleur n'est codée en dur, et les
  évidements sont de vrais trous transparents : l'icône marche sur n'importe quel fond.
- **Taille** : fixer `width` et `height` (24, 48, 64…). Il n'y a qu'un seul dessin par
  ID, pensé d'abord pour rester lisible à 24 px.
- **Accessibilité** : `aria-hidden="true"` quand un libellé texte accompagne l'icône.
  Pour une icône seule, utiliser un `aria-label` sur le bouton parent.

> `<use href="fichier.svg#id">` vers un fichier **externe** ne fonctionne pas
> ouvert en `file://` dans certains navigateurs, à cause de la politique d'origine.
> Il faut le servir en HTTP, par exemple avec `npx live-server` comme pour le jeu.
> `apercu.html` contourne ce problème en embarquant une copie des symboles.

## Intégration dans le jeu (`index.html`)

Le jeu tient en **un seul fichier**, et c'est une règle du projet. Pour l'intégration,
on ne charge donc pas `icones.svg` à part : on recopie ses `<symbol>` dans un SVG
masqué placé au début du `<body>` d'`index.html`, puis on y fait référence localement :

```html
<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0"
     style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true">
  <!-- copie exacte des 42 <symbol> de icones/icones.svg -->
</svg>
…
<div class="btn" id="btnSprint">
  <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true"><use href="#ico-btn-sprint"></use></svg>
  <small>SPRINT</small>
</div>
```

Ce mécanisme est exactement celui d'`apercu.html` : il marche hors ligne, en
`file://` comme sur iPhone en écran d'accueil. Le remplacement des emojis
actuels du HUD (💣, 🔁, 🪝…) par ces icônes reste à faire, dans une étape séparée.

## Modifier ou ajouter une icône

Les tracés **ne s'éditent pas à la main dans `icones.svg`** : ce fichier est produit.
La source est `outils/dessins.js`. Chaque icône y est composée de formes simples
(polygones, contours adoucis, cercles, arcs, bandes), dans le repère 24 × 24,
à partir des cotes lues sur la référence.

```bash
cd icones/outils
node construire.js                         # régénère icones.svg ET apercu.html
node recette.js ../rapport                 # recette complète (rendu réel Chromium)
node comparer.js grille  <filtre> <dossier>   # référence quadrillée 24×24, pour lire des cotes
node comparer.js sonde   <id> x "h:12,v:8"   # bords exacts de la référence le long de lignes choisies
node comparer.js superpose <filtre> <dossier> # dessin posé sur la référence + taux de recouvrement
node comparer.js cote    <filtre> <dossier>   # référence | dessin à 96/64/48/24 px
```

- `outils/forme.js` contient la boîte à outils géométrique.
- `outils/cases.js` donne la zone de chaque grand pictogramme dans sa planche, et sert uniquement à la comparaison.
- `outils/remplacer.js` remplace la définition d'une icône dans `dessins.js`.

Le remplissage est en `nonzero` : un évidement tourne en sens inverse
(`trou = true`) et doit être posé **entièrement dans un seul plein**. Deux
évidements qui se chevauchent, ou un évidement qui déborde du plein, se
rempliraient au lieu de percer. La recette le détecte, avec son contrôle
« évidements transparents ».

Pour ajouter une icône :
1. ajouter la ligne dans `inventaire.csv` ;
2. ajouter la zone de référence dans `outils/cases.js` ;
3. ajouter le dessin dans `dessins.js` ;
4. lancer `node construire.js`, puis `node recette.js`.

La recette attend 42 IDs : il faut adapter ce nombre dans `recette.js`.
