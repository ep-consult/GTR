# Icônes ASPHALTE — rapport de validation

**Livrés :** `icones.svg` (42 symboles), `apercu.html`, `README-integration.md`,
`inventaire.csv`, `references/` (les 4 PNG d'origine).
**Statut :** la recette automatique passe entièrement (24/24 contrôles). Les 42
icônes ont aussi été vérifiées visuellement, une par une, à 24, 48 et 64 px.
Ce rapport donne les écarts qui subsistent avec les planches et les simplifications
faites pour la lisibilité à 24 px.

À refaire après toute modification : `cd icones/outils && node construire.js && node recette.js ../rapport`.

## 1. Méthode

1. **Lecture des références.** Pour chaque ID, le grand pictogramme de sa planche
   (pas les miniatures 24/48/64) est découpé et calé dans le repère 24 × 24 :
   marge de 1 unité, centré, proportions conservées. Un quadrillage d'une unité
   est posé dessus (`comparer.js grille`). Pour les cotes fines, des **sondes**
   donnent les bords exacts de la référence le long de lignes choisies, avec un
   pas de 1 puis de 0,5 unité (`comparer.js sonde`). Aucun contour n'est extrait
   automatiquement de l'image.
2. **Dessin à la main.** Chaque icône est composée dans `outils/dessins.js` de
   formes simples placées à ces cotes : polygones, contours adoucis, cercles et
   ellipses, arcs épais, traits épaissis, pièces découpées en bandes. Les
   évidements sont tracés en sens inverse et restent transparents.
3. **Comparaison.** Chaque dessin est superposé à sa référence
   (`comparer.js superpose`) : blanc = commun, rouge = référence seule,
   cyan = dessin seul. Puis il est comparé côte à côte aux tailles réelles
   (`comparer.js cote`). Les icônes les plus éloignées ont été reprises, souvent
   plusieurs fois. Les captures finales sont dans `rapport/`.
4. **Recette** sur le rendu réel de Chromium (`recette.js`), avec `apercu.html`
   ouvert directement en `file://`.

## 2. Recette (contrat technique)

| Contrôle | Résultat |
|---|---|
| inventaire.csv : 42 IDs ; 42 `<symbol>` ; aucun doublon | ✓ |
| IDs identiques à l'inventaire, casse comprise (`ico-arme-bouleC`, `ico-arme-batte2`, `ico-arme-silence`, `ico-arme-desintegrateur`), dans le même ordre | ✓ |
| XML UTF-8, racine `<svg xmlns="http://www.w3.org/2000/svg">` | ✓ |
| chaque symbole : `viewBox="0 0 24 24"`, 1 à 3 `<path>` non vides, `fill="currentColor"`, rien d'autre | ✓ |
| aucun élément ou attribut interdit : image, text, rect, circle, ellipse, polygon, line, masque, filtre, clipPath, dégradé, motif, script, style, use, g, transform, data URI, lien, police | ✓ |
| taille : 48 à 1 022 nombres par icône (63 Ko au total), coordonnées arrondies au centième | ✓ |
| géométrie entièrement dans le viewBox, aucun clipping | ✓ |
| marges : minimum 0,80 u (`ico-btn-cible`), médiane 1,00 u | ✓ (voir ci-dessous) |
| les 42 icônes ont un rendu non vide à 24, 48 et 64 px | ✓ |
| `currentColor` hérité partout (rendu sur fond rouge, couleur bleue : aucun autre pixel) | ✓ |
| évidements transparents sur fond clair comme sombre (rendu croisé noir/blanc) | ✓ |
| apercu.html : copie embarquée des symboles **identique** au sprite livré | ✓ |
| 126 rendus aux dimensions effectives exactes de 24, 48 et 64 px (aucun zoom CSS) | ✓ |
| recherche par ID : « nitro » → 1 carte, « ico-arme- » → 17, vide → 42 | ✓ |
| couleur initiale claire sur fond sombre ; le sélecteur pilote la couleur ; bascule fond clair/sombre | ✓ |
| section « Références PNG — images raster, pas les SVG finaux » : 4 planches chargées | ✓ |
| ouverture directe en `file://` : aucune requête réseau, aucun fetch, aucune erreur | ✓ |

**Marges.** Le cahier vise une marge de 1 unité. Chaque dessin est calé sur la
boîte de sa référence ramenée à 22 × 22. Selon l'icône, une pointe, un clou ou
une barre de réticule dépasse de 0,1 à 0,2 unité : marge réelle entre 0,80 et
1,00 u, jamais de rognage.

Captures de la page : `rapport/apercu_sombre.png` et `rapport/apercu_clair.png`.

## 3. Fidélité aux planches

**Recouvrement** = surface commune / surface totale des deux silhouettes à 240 px
(`comparer.js superpose`, détail dans `rapport/scores.txt`). C'est un indicateur
sévère : un trait fin décalé d'un demi-pixel compte double. Les sujets détaillés
(moteur, pneu) restent donc sous 60 % alors qu'ils se reconnaissent bien.
La référence visuelle reste la comparaison côte à côte : `rapport/cote_*.png`.

| Recouvrement | Icônes |
|---|---|
| 90 % et plus | pause 98, bouleC 92, switch 90, action 90 |
| 80 à 89 % | poings 88, munitions 82, cible 81, vitesse 81, pistolet 80 |
| 70 à 79 % | grenade 78, bâtiments 78, batte2 77, brake 77, néon 77, couteau 76, pompe 76, sabre 76, ennemis 76, véhicules 76, adrénaline 75, gadget 74, taxi 74, roquette 73, commerces 73, fusil 72, uzi 72, porte 72, nitro 72, pm 70, jetpack 70, onde 70 |
| 60 à 69 % | peinture 68, sniper 67, sprint 67, jump 65, silence 63, batte 62, flamme 61, dodge 60 |
| sous 60 % | désintégrateur 59, moteur 56, pneu (tenue) 55 |

## 4. Simplifications et écarts, icône par icône

Règle générale : silhouette, orientation et composition dominantes conservées.
Les grisés et reflets des PNG deviennent une seule couleur, et leurs zones noires
des évidements. Les détails sous ~0,75 unité sont soit élargis (rainures,
fentes : 0,4 à 0,75 u), soit supprimés lorsqu'ils disparaissent à 24 px.

**Armes**
- **poings** : plis du poignet et séparations des doigts ramenés à 2 étoiles et 5 fentes.
- **couteau** : 4 crans de dos (la référence en a davantage), gorge de lame réduite à une fente effilée, 3 bagues de manche.
- **batte** : 9 clous à tête ronde au lieu du fil barbelé enchevêtré ; le barbelé devient 3 bagues évidées.
- **batte2** : tête d'os bosselée simplifiée, 2 fissures, 3 ligatures.
- **sabre** : garde en D en un seul trait épais, poignée à 3 bagues.
- **bouleC** : fidèle (3 trous, reflet en croissant).
- **gadget** : œil = orbite évidée et pupille ; crête en 3 pointes ; doigts des pattes en 4 pointes.
- **pistolet / silence** : même modèle, réduit pour le pistolet silencieux. Crans de culasse ramenés à 3 fentes, poignée évidée, pontet.
- **pompe** : canon, magasin et pompe à 4 crans mesurés ; lumière d'éjection.
- **uzi / pm / fusil** : lumières du boîtier simplifiées (2 fentes) ; chargeurs fendus.
- **sniper** : lunette à deux cloches, garde-main, crosse à trou de pouce ; les vis de lunette sont omises.
- **flamme** : 2 réservoirs à dôme cerclés, tuyau en boucle, flamme à 3 langues (la référence a des volutes plus fines).
- **roquette** : pavillon, bague et ogive suivent le profil mesuré.
- **désintégrateur** : 4 anneaux décroissants au lieu des spires et rondelles intermédiaires, corps à deux fenêtres. **Écart restant** : les rondelles plus fines entre les anneaux.

**HUD**
- **sprint / dodge** : silhouettes humaines en volumes (tête, buste, membres épaissis) ; les plis de vêtements et les doigts sont omis. Traits et arcs de vitesse conservés.
- **switch** : flèches sur des arcs **elliptiques** (10,2 × 8,9 et 7,1 × 5,6) avec coupes obliques, comme la référence.
- **grenade** : quadrillage en 3 rainures courbes × 3 rainures obliques, pavé par pavé ; anneau ouvert ; tête d'allumeur fendue.
- **brake** : 17 perforations sur deux rangs ; 5 vis de moyeu ; étrier à facettes avec plaquette et liseré qui le détache du disque.
- **jump** : 6 suspentes à 0,42 u, en dessous des 0,75 u recommandés. Elles s'estompent volontairement à 24 px, où la voile et le parachutiste portent la lecture.
- **jetpack / action / pause / cible / munitions** : fidèles.
- **taxi** : enseigne de toit **sans texte** (4 pavés évoquent « TAXI », comme demandé), damier de portière en 2 rangées, roues dans leurs passages ; les reflets de carrosserie sont omis.

**Capacités et carte**
- **adrénaline** : tracé de pulsation évidé, 5 traits de vitesse.
- **nitro** : bouteille suivie bord à bord, en perspective, avec 2 bandes ; manomètre et robinet.
- **onde** : arcs latéraux et arcs haut/bas sur des rayons différents, comme mesuré. Bouts arrondis : la référence les effile.
- **ennemis** : yeux plissés évidés, col en V, réticule à 4 brèches.
- **véhicules** : vue du dessus ; vitres, toit ouvrant et rétroviseurs. Les fines nervures de carrosserie sont omises.
- **commerces / bâtiments** : fidèles. Les reflets de vitrine sont omis ; fenêtres de la tour en bandes obliques.

**Garage**
- **porte** : 5 lattes en perspective, poignée.
- **peinture** : 5 rayons de pulvérisation (2 tirets puis 1 point) ; pot avec coulure.
- **néon** : face avant pleine aux phares effilés évidés ; les 3 bandes de lumière deviennent des aplats, sans dégradé (interdit).
- **moteur** : **le plus simplifié.** Bloc, 3 bougies, 4 bobines, 2 poulies à gorges concentriques, vallée du V et nervures, contre des dizaines de pièces sur la référence. À 24 px, l'icône comme la référence se lisent surtout comme « bloc + poulies + bougies ».
- **vitesse** : 10 graduations, zone rouge en 4 pavés, aiguille effilée, moyeu évidé.
- **tenue** : bande de roulement cylindrique à 3 rainures courbes et crans obliques, séparée par une fente de la face portant jante et moyeu à 3 lumières, plus la trajectoire en deux traits. Le recouvrement reste bas à cause des rainures fines, mais la silhouette et la lecture correspondent.

## 5. Points d'attention

- **Détails fins.** Quelques détails restent sous 0,75 u parce qu'ils font l'identité de l'objet : suspentes du parachute, gorges de lame, bagues de manche. À 24 px, ils deviennent une texture légère et ne gênent pas la silhouette.
- **Icônes les plus denses.** Le moteur, le pneu et le désintégrateur sont les trois icônes les plus éloignées de leur planche. Une passe supplémentaire est possible si un écart précis gêne.
- **Validation sur appareil.** Elle reste à faire : la recette tourne dans Chromium. Il faudra un contrôle sur iPhone (Safari) une fois les icônes intégrées au jeu, comme pour tout le reste du projet.
