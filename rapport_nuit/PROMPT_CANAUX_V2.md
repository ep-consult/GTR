Chantier « Canaux V2 » : de vraies villas de Miami au bord de l'eau, des ponts tous différents.

Lis d'abord CLAUDE.md, la section « Canaux de Los Reyes » et rapport_nuit/CANAUX.md (ce qui a été fait, les décisions, le relevé du périmètre). Toutes les règles de CLAUDE.md s'appliquent : édition ciblée, français partout, un seul fichier, aucun tirage de plus pendant la génération de la ville, tests qui lisent la source, rendus réels pour le visuel.
Travaille sur une branche `canaux-v2` créée depuis l'état actuel, et commit après chaque étape qui marche. Suivi : rapport_nuit/CANAUX_V2.md (liste à cocher, décisions, mesures, captures avant/après dans rapport_nuit/captures/canaux_v2/). À la fin, mets à jour la section « Canaux de Los Reyes » de CLAUDE.md et la carte du fichier.
Je ne serai pas là pour répondre : décide, note la décision dans le suivi et continue.

## LE CONSTAT (retour de playtest)
Le quartier marche, mais il est basique et répétitif. Sur la carte (rapport_nuit/canaux_refs/6_resultat_actuel_minimap.png), on voit :
- des pâtés verts avec deux petites maisons blanches identiques ;
- de grands blocs gris génériques ;
- des villas tournées vers la rue, pas vers l'eau, sans ponton ;
- des ponts qui ne sont que des bouts de route, à part l'orange.
On ne sent ni le luxe, ni la vie au bord de l'eau.

## LES RÉFÉRENCES (à ouvrir et à regarder avant de dessiner quoi que ce soit)
Dans rapport_nuit/canaux_refs/ :
1. **1_canal_miami_beach.png** : un canal large bordé de palmiers, des yachts à quai, des tours de condos au loin, de l'eau turquoise.
2. **2_villa_blanche_ponton_cabane.png** : une villa blanche cubique avec balcon et escalier extérieur, un mur de quai en pierre, un ponton en bois sur pieux et une cabane de ponton blanche à claustras.
3. **3_villas_mediterraneennes_yacht.png** : des villas méditerranéennes (tuiles, crépi pastel, loggias à arcades), la pelouse jusqu'au quai, un gros yacht de pêche amarré le long du quai.
4. **4_villa_tropicale_moderne.png** : une villa tropicale contemporaine, toits plats débordants, toitures végétalisées, bois sombre, végétation luxuriante, un bateau au pied.
5. **5_vue_aerienne_lotissement.png** (LA référence pour le plan) : des « doigts » de terre entre des canaux parallèles. Une rue au milieu de chaque doigt, des lots étroits des deux côtés. Chaque lot : maison côté rue, jardin et piscine côté eau, mur de quai, ponton privé et bateau. Les maisons sont toutes différentes et serrées : il y en a beaucoup.

Décris dans le suivi ce que tu retiens de chaque photo (formes, matériaux, couleurs, proportions), puis traduis-le en éléments low-poly lisibles vue de dessus et en vue immersive. L'esprit, pas une copie photo.

## CE QUI NE CHANGE PAS (vérifié comme dans la passe précédente)
- Le réseau principal (deux canaux, deux embouchures, traverse, bras), dansCanal, le graphe de navigation et la police maritime gardent leurs garanties. Toute modification de l'eau met à jour dansCanal ET le graphe, et repasse tous les tests des canaux.
- Le relevé du périmètre (rapport_nuit/outils/releve_canaux.js) : relancé après chaque phase, avec une comparaison aussi stricte qu'avant. Aucun lieu, porte, véhicule posé ni destination ne disparaît, ne tombe à l'eau ni ne devient inaccessible.
- Le déterminisme : construit sur le générateur privé en fin de décor, avec la même empreinte de la ville hors zone.

## 1. LE PLAN : BEAUCOUP DE VILLAS, TOUTES « LES PIEDS DANS L'EAU »
- **Règle d'or.** Chaque villa du quartier a une façade sur l'eau, avec jardin, piscine, mur de quai et ponton privé. Et une façade sur une rue ou une allée, avec portail, allée de garage et voiture. Fini les villas qui tournent le dos au canal.
- **Lots étroits et serrés**, comme sur la vue aérienne : largeur de 12 à 18 u selon le standing, profondeur mesurée sur la place réelle entre la rue et le quai. Vise au moins 3 fois plus de villas qu'aujourd'hui, en gardant des respirations : petits parcs au bord de l'eau, la placette de l'embarcadère, les vues dégagées sur les intersections et les entrées des bras.
- **Doigts de terre.** Là où un pâté est assez profond, découpe-le en doigt : une allée résidentielle au milieu (sens unique ou impasse avec rond de demi-tour), des lots des deux côtés. Si un pâté est trop large pour avoir de l'eau des deux côtés, tu peux creuser un canal secondaire en impasse au milieu, pour créer deux doigts, comme sur la photo aérienne. Conditions :
  - largeur suffisante pour qu'une vedette fasse demi-tour au bout (bassin) ;
  - intégré à dansCanal et au graphe ;
  - aucune rue conservée coupée sans être déclarée aux systèmes du trafic ;
  - tous les tests des canaux repassés.
  Les allées : trafic résidentiel rare ou aucun, mais jamais une voiture qui y entre et reste bloquée.
- **Différents standings :**
  - les lots ordinaires ;
  - quelques grands lots en pointe de doigt ou à l'angle de deux canaux (les plus belles villas, dont celles de la Krasnaya Brigada avec gardes et voitures de luxe, et la planque villa Miami si elle existe, qui devient la plus spectaculaire) ;
  - 2 à 4 résidences de condos de 4 à 8 niveaux, seulement en bordure nord et est, jamais devant un canal, comme les tours du fond de la photo 1.
- Supprime les grands blocs gris génériques de la zone. Tout ce qui est construit raconte « villas sur l'eau ».

## 2. LES VILLAS : UN GÉNÉRATEUR, PAS UN MODÈLE
Construis un générateur de villas paramétrique (par exemple villaCanal(lot, graine)), déterministe : une graine par lot, tirée d'un hachage de la position. Jamais Math.random.
- **Styles** (au moins 5, inspirés des photos) :
  - Miami moderne blanc : cubes empilés, étage en porte-à-faux, grandes baies, garde-corps en verre, escalier extérieur, brise-soleil (photo 2) ;
  - méditerranéen : crépi pastel (sable, rose, pêche, jaune pâle), toits de tuiles en croupe, loggias à arcades, balcons à balustres (photo 3) ;
  - tropical contemporain : toits plats très débordants, toitures végétalisées, bois sombre, pierre, pilotis, végétation qui déborde (photo 4) ;
  - Art déco Miami : angles arrondis, bandeaux horizontaux, hublots, couleurs pastel, néon discret la nuit ;
  - bungalow des années 50 : plain-pied, toit bas, carport.
- **Modules combinés** par style : volume principal, aile, étage en retrait, toit-terrasse, pergola, loggia, balcon, escalier extérieur, tour d'angle, auvent, garage.
- **Variations** : palette (2 à 3 par style), largeur, nombre d'étages (1 à 3), orientation en miroir.
- **Règle** : deux villas voisines ne sont jamais du même style ou de la même palette. Sur une rangée de 6, au moins 4 silhouettes différentes. Vérifie-le par un test qui lit la liste des lots.
- **Le jardin côté eau**, avec des éléments tirés par lot :
  - pelouse, terrasse en bois ou en dalles ;
  - piscine (rectangle, en L, à débordement face au canal, avec plage immergée), transats, parasols, cuisine d'été, foyer, hamac ;
  - palmiers royaux et cocotiers penchés vers l'eau, haies, massifs fleuris (bougainvilliers roses), rocaille.
- **Le bord de l'eau**, tiré par lot :
  - mur de quai (béton à couronnement blanc ou moellons, photo 2) ;
  - ponton privé sur pieux à têtes blanches, parallèle ou perpendiculaire au quai, en L ou en T ;
  - échelle de baignade ;
  - certains avec cabane de ponton à claustras (photo 2), élévateur à bateau ou carport de bateau ;
  - lampadaires bas de ponton allumés la nuit.
- **Le côté rue** : portail, muret, allée pavée, voiture garée (luxe ou ordinaire selon le standing), boîte aux lettres, palmiers d'alignement.
- **Matériaux** : partagés entre toutes les villas (un petit nombre par style et par palette), créés à la première utilisation sous le générateur privé. Jamais un matériau de mat() modifié.

## 3. LES PONTONS SONT ACCESSIBLES POUR DE VRAI
- On amarre un bateau à n'importe quel ponton privé et on en descend : le ponton est praticable (PLATS/PONTONS orientés) et relié au jardin, puis à la rue par un passage libre (jamais une clôture qui enferme).
- Depuis la rue, on traverse le jardin à pied jusqu'au ponton, et on monte dans le bateau amarré s'il est pilotable.
- Un ponton ne déborde jamais dans le chenal utile mesuré pour les vedettes. Un bateau amarré non plus (il est le long du ponton, côté quai).
- Échelle ou marches à chaque ponton : un nageur ressort de l'eau à n'importe quel lot (rivePlusProche les trouve).

## 4. LES BATEAUX DES VILLAS
- Environ 60 % des pontons ont un bateau, varié selon le standing :
  - gros yacht de pêche sportive avec tour (photo 3) ;
  - yacht à moteur, open à console centrale, day-cruiser ;
  - petit bateau de promenade, voilier à mât ;
  - jet-skis par deux.
  Les grands lots ont les plus gros bateaux, jamais un grand yacht dans un bras étroit.
- **Décor ou pilotable** : la majorité est du décor (géométries partagées, fusionnées ou instanciées, pas des véhicules). Une partie est pilotable : quelques open et jet-skis répartis dans le quartier, au moins un sur chaque canal principal. Dis lesquels dans le rapport.
- Les bateaux de décor sont SOLIDES pour les bateaux qui passent (on les heurte, on ne les traverse pas) et suivent une houle très faible.

## 5. DES PONTS TOUS DIFFÉRENTS
Les 4 ponts routiers ne sont plus des bouts de route. Chacun a son caractère, sa silhouette lisible vue de dessus, son tablier qui s'efface quand il cache le joueur, et un tirant d'air suffisant :
1. **Le pont-levis** (sud-ouest, l'orange actuel, gardé) : tablier en acier orange à deux volées, cabine de l'éclusier, contrepoids, barrières rayées, feux. Toujours fixe : pas de mécanisme.
2. **Le pont vénitien** : arche en béton blanc, balustres, lanternes à chaque extrémité, légère bosse que les voitures ressentent (pente douce, jamais un saut).
3. **Le pont de la promenade Art déco** : tablier plat, garde-corps à bandeaux pastel et hublots, jardinières à palmiers aux quatre coins, lampadaires rétro, trottoirs larges où les promeneurs s'arrêtent pour regarder l'eau.
4. **Le pont en bois tropical** : tablier de planches sur pieux, garde-corps en bois, cordages, lanternes tiki la nuit.

Ajoute aussi 3 à 4 passerelles piétonnes, différentes entre elles (arche blanche en dos d'âne, passerelle en bois sur pieux, passerelle en acier légère). Elles relient les doigts et les petits parcs, sont praticables à pied et à vélo, et les bateaux passent dessous. Les voitures ne peuvent pas y monter (bornes à l'entrée).

Toutes les passerelles et tous les ponts obéissent au mécanisme validé (chaussée dessus, eau navigable dessous) et figurent sur la minimap avec leur forme.

## 6. LA VIE ET L'AMBIANCE
- **Figurants** (figurant()) : quelqu'un qui bronze au bord de la piscine, un barbecue, des gens qui lavent le bateau sur le ponton, un pêcheur au bout d'un ponton, un joggeur sur le pont de la promenade, quelqu'un qui promène son chien, des enfants qui sautent du ponton.
- Quelques jet-skis de décor et une ou deux annexes qui se déplacent lentement dans les canaux, sur le graphe, en se rangeant devant le joueur.
- **Eau** : turquoise plus claire que la mer, ombres des pontons et des bateaux, reflet doux. Ni reflets en temps réel ni simulation.
- **La nuit** : piscines éclairées, lampes de ponton, fenêtres chaudes, lanternes des ponts. Peu de vraies lumières : sprites et matériaux émissifs.
- **Sons** : clapot contre les quais, drisses qui tintent, moteur lointain, musique d'une fête au bord d'une piscine.

## 7. CARTE
La minimap et la grande carte dessinent les lots comme sur la vue aérienne : toits colorés par style, piscines bleues, pontons, bateaux, allées, et ponts et passerelles avec leur forme.

## 8. PERFORMANCES (iPhone)
- Plus de villas ne doit pas faire exploser le rendu : géométries de modules partagées, fusion par matériau et par îlot (comme les façades, par cellule de 120 u), instanciation pour les palmiers, transats, pieux et bateaux de décor, détail réduit au loin.
- Mesure avant et après au centre du quartier et en survol (temps d'image, appels de rendu, triangles, mémoire des géométries). Fixe-toi un budget au départ, note-le dans le suivi et respecte-le. Si le budget casse, réduis le détail lointain, pas le nombre de villas proches.

## ORDRE DES PHASES (chacune vérifiée avant la suivante)
1. Plan des lots et doigts, éventuels canaux secondaires, allées, relevé du périmètre.
2. Générateur de villas, jardins côté eau, côté rue.
3. Pontons accessibles et bateaux des villas.
4. Les 4 ponts et les passerelles.
5. Vie, ambiance, nuit, sons.
6. Carte et performances.

Si le temps manque, livre complètes et vérifiées les phases 1 à 4 plutôt que tout à moitié.

## VÉRIFICATIONS (ajoute un bloc « Canaux V2 » à scenarios.js, listes lues dans la source)
1. Nombre de villas : au moins 3 fois l'ancien. Chaque villa a une façade sur l'eau ET un accès depuis une rue ou une allée (chemin à pied et en voiture vérifiés).
2. Variété : jamais deux voisines du même style ou de la même palette, au moins 4 silhouettes sur 6 voisines, au moins 5 styles présents.
3. Pontons : chaque ponton est praticable, relié à la rue à pied et hors du chenal utile. Un pilote simulé amarre un bateau à 3 pontons pris au hasard, descend et rejoint la rue.
4. Nage : un nageur ressort de l'eau à n'importe quel lot.
5. Bateaux de décor : solides pour les bateaux, jamais dans le chenal. Bateaux pilotables : on monte, on part, on revient.
6. Ponts : chacun traversé en voiture dans les deux sens, sans saut. Chaque passerelle traversée à pied et à vélo, et refusée aux voitures. Passage en bateau sous chacun, dans les deux sens. Tablier qui s'efface au-dessus du joueur.
7. Si un canal secondaire est ajouté : une vedette de police y entre, fait demi-tour au bout et ressort. Graphe et dansCanal cohérents (aucun nœud hors de l'eau).
8. Tous les anciens tests des canaux, du périmètre (« Canaux : rien de cassé ») et de la police maritime repassent. Puis valider.js et la suite complète de scenarios.js, sans régression.
9. Empreinte de la ville identique hors zone.
10. Captures Puppeteer réelles en 390×844, comparées aux photos dans le suivi (avant/après) :
    - vue aérienne du quartier (le même cadrage que la photo 5) ;
    - un canal en vue immersive (la photo 1) ;
    - une villa blanche et son ponton (la photo 2) ;
    - une villa méditerranéenne et son yacht (la photo 3) ;
    - chaque pont ;
    - une passerelle ;
    - la nuit ;
    - la minimap.
11. Performances avant/après, budget respecté.

Les performances réelles et le ressenti se jugeront sur iPhone : ne les déclare pas validés. Si une vérification n'a pas pu être faite, dis-le explicitement.

## RESTITUTION (fin de CANAUX_V2.md)
- Ce qui a changé et les fichiers modifiés.
- Les styles et leurs modules.
- Le nombre de villas, de pontons et de bateaux (décor et pilotables, avec leur emplacement).
- Les ponts et les passerelles.
- Les canaux secondaires ajoutés ou non, et pourquoi.
- Les décisions prises seul.
- Les mesures.
- Ce que je dois regarder en priorité sur l'iPhone.
