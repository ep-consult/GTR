# Monster Truck V3 et écrasement V2 — rapport (19 octobre 2026)

Branche : `monster-truck-ecrasement` (partie de `nuit-revue-globale`, à fusionner par toi). Captures :
`rapport_nuit/captures/monster_ecrasement/`.

## Ce qui a été fait, en bref

- **Monster Truck** (`monstertruck`) : refonte totale du modèle, de ses roues, de son échappement et de son cockpit. Il
  écrase visuellement le trafic : toit à 4,5 u du sol, cheminées à 5,2 u, roues de 3 u de diamètre (une citadine fait
  1,45 u de haut).
- **Écrasement** : trois niveaux et un seul moteur de déformation. Les lourds (bus, pompiers, camions…) enfoncent les
  voitures. Le char et le Monster Truck les écrasent progressivement, là où passent leurs roues ou leurs chenilles. Le
  Monster Truck monte réellement sur la voiture.
- Mesures avant/après, tests nouveaux et adaptés, CLAUDE.md et COCKPITS.md à jour.

## L'écrasement d'avant, en cinq lignes

1. Il n'y avait qu'un seul cas : un véhicule `ecrase:true` (char, Monster Truck) qui touchait n'importe quel autre véhicule
   (`resoudreCollisionsVehicule` → `ecraserVehicule`).
2. Au premier contact, la cible était réduite d'un coup à 20 % de sa hauteur (`mesh.scale.y = 0.2`), avec une petite
   rotation au hasard. L'écraseur n'avait aucun contact vertical : il traversait sans monter.
3. Un véhicule long (bus, pompiers) touché à un bout passait d'abord à 60 %, puis à 20 % au passage suivant.
4. La cible devenait une épave (`epave`), sortie de `vehicules` et rangée dans `EPAVES` (10 au plus). L'épave restait dans
   la scène jusqu'à la fin de la partie, et ses géométries n'étaient jamais libérées.
5. Retours : éclats de vitre, étincelles, un bruit de tôle, une secousse. Tous les autres chocs (un bus dans une voiture
   compris) restaient des dégâts classiques.

## Chantier 1 — le Monster Truck

**Carrosserie et châssis** (`VEH_V3.monstertruck`, `MONSTER_V3`) :
- Caisse de gros pick-up américain : capot long et bombé, traversé par un compresseur chromé à papillons ; cabine haute
  vitrée (verre teinté, conducteur visible) ; benne et son arceau.
- Calandre noire à barres chromées et quatre phares ronds, rampe de six projecteurs sur le toit, rétroviseurs de remorquage.
- Pare-chocs tubulaires avant et arrière, crochets rouges, élargisseurs noirs mats sur les passages de roue.
- **Livrée** : orange d'origine (repeignable au garage), flammes cernées de noir (jaune → orange → rouge) sur le capot et les
  ailes, numéro 73 sur les portières, détails noirs mats.
- **On voit le vide sous la caisse** : la caisse passe au-dessus des pneus (passages de roue taillés dans le profil).
  Dessous, on voit le châssis tubulaire (longerons, traverses, croix), le moteur et ses collecteurs, la boîte et les arbres
  de transmission.
- **Suspension** : ponts rigides, différentiels, bras et **quatre amortisseurs par roue** (jaunes, avec ressorts). Ils
  restent au sol avec les roues ; la caisse tangue et roule au-dessus.

**Roues** :
- 3 u de diamètre (avant : 2,24) et 1,1 u de large (avant : 0,64), plus grandes que la caisse n'est haute (1,83 u).
- Flancs bombés. **Crampons en chevrons** et épaulements en relief, dans la géométrie même du pneu : un seul maillage par
  pneu, partagé par les quatre roues. Jantes creuses à beadlock (anneau boulonné), voile percé de huit trous, moyeu, écrous.
- **Rotation à la vitesse réelle** : `v / R` rad/s (`ud.rayonRoue`). Mesuré : 7,97 rad pour 11,96 u parcourus, soit un
  rayon apparent de 1,50 = R.

**Échappement** :
- Deux cheminées chromées derrière la cabine, avec écrans thermiques.
- **Fumée noire** (`FNOIRE`) : un seul `InstancedMesh` de 72 bouffées, qui réutilise les shaders de la traînée des missiles.
  Un seul appel de rendu, aucune allocation en jeu, minuteurs sur `dtJeu`.
- La fumée sort à l'accélération forte et pendant 0,6 s au démarrage, jamais en croisière.

**Cockpit propre** (`CK_HAB.monstertruck`, `CK_TH.monster`, combiné `monster`) :
- Arceau dans l'habitacle, baquet passager, **harnais 4 points** : sur la poitrine du conducteur (on les voit en baissant
  les yeux) et sur le baquet passager.
- **Volant course** : jante suédée, trois branches alu ajourées, moyeu rouge à démontage rapide, repère de midi jaune.
- **Planche en alu riveté** à trois cadrans ronds : pression d'huile, grand compte-tours, température d'eau. Un voyant de
  passage à cinq diodes, le rapport engagé et la vitesse.
- Interrupteurs à bascule (console existante) et **levier séquentiel** à poignée en T sous la main droite.
- Vue très haute : l'œil est à 4 u du sol (une voiture : 1,2).
- `rapport_nuit/COCKPITS.md` et `SUIVI_COCKPITS.md` sont mis à jour.

**Physique et sensations** :
- Le roulis et le tangage de la caisse existaient déjà (grand débattement).
- **Rebond à la réception d'un saut** : un ressort amorti sur la caisse. Mesuré : la caisse descend de 0,27 u puis rebondit.
- 104 km/h et 650 PV sont inchangés. Je n'ai vu aucune raison de les modifier.
- **Encombrement** : hitbox et fiche passent de 5,2 × 2,7 u à **6,4 × 3,8 u**. C'est l'encombrement réel, pneus et
  pare-chocs compris. Les anciens pneus débordaient déjà de l'ancienne hitbox (3,8 u de large pour 2,7 déclarés). La fiche
  du catalogue lit `VEHDEFS` : elle affiche les nouvelles valeurs (capture).

Captures :
- `monster_angles.png` : 3/4 avant à côté d'une citadine, profil au ras du sol, 3/4 arrière, dessous de face entre les roues
  (pont, différentiel, amortisseurs, châssis), capot (compresseur, flammes).
- `monster_studio_v3.png` : studio V3, trois angles.
- `monster_en_jeu.png` : en jeu, trois vues 3D et trois vues 1re personne.
- `monster_cockpit.png` : cockpit devant, regard vers le bas (harnais), vers le passager (baquet à harnais, levier
  séquentiel), vers la portière.
- `monster_fumee.png` : fumée au démarrage et à plein gaz.
- `monster_fiche_catalogue.png` : la fiche « monstertruck — 6.4 × 3.8 u ».

## Chantier 2 — écrasement et enfoncement

**Hiérarchie** (lue dans `VEHDEFS`, `niveauChoc`) :

| Niveau | Véhicules | Effet |
|---|---|---|
| 1 — dégâts classiques | tous les autres | `bosseler`, débris, roues : inchangé |
| 2 — **enfoncement** (`enfonce:true`) | Camion « Aigle », Blindé « Bastion », Camion DCA, Bulldozer, Grue, Dépanneuse, Camion-citerne, Passerelle mobile, Bus de ville, Camion de pompiers | lancé à plus de 8 u/s contre un véhicule léger |
| 3 — **écrasement** (`ecrase:true`, eux seuls) | Char « Rhinocéros », Monster Truck | comme avant, et sur tous les autres véhicules |

**Moteur commun** : `deformerLocal(o, point, direction, profondeur, rayon, opts)`.
- Les sommets de la carrosserie situés dans le rayon se déplacent le long de la direction, un peu froissés, sur une copie de
  géométrie propre au véhicule.
- Vers le bas avec un plancher, la colonne se tasse au prorata de la hauteur : le toit descend, le bas de caisse ne bouge
  pas, rien ne passe sous le plancher. Les flancs s'évasent.
- Les niveaux 2 et 3 n'utilisent que ce moteur ; seul le scénario change. Le niveau 1 garde `bosseler`, intouché.

**Niveau 3 — écrasement** (`commencerEcrasement`, `majEcrasementPar`, appelée par la physique de l'écraseur) :
- La victime est découpée en 8 tranches × 2 côtés, dont les hauteurs sont mesurées sur sa carrosserie.
- Chaque roue du Monster Truck, ou chaque point des chenilles du char, qui passe sur une tranche l'affaisse à l'endroit où
  il passe, et seulement là : déformation progressive et localisée.
- **Le Monster Truck monte sur la voiture** : la roue se pose sur la tranche, même au bord (contact d'un cercle sur une
  marche). Il monte, tangue, roule sur le côté, et se fait retenir pendant que la tôle cède sous lui.
- **Le char aplatit** en tanguant à peine.
- Vitres qui éclatent (le verre disparaît, des éclats volent), flancs qui s'évasent, roues qui s'écartent (carrossage),
  étincelles.
- Retours : tôle qui grince, bruit de verre, petite secousse, et un ralenti de 0,22 s à 55 % seulement si c'est le joueur
  qui écrase. Le ralenti agit sur `dt` (`ETAT.timeScale`), jamais sur `dtJeu`.
- Mesuré en simulation, sur une citadine en travers :

  | Écraseur | Monte de | Tangue de | Sommets enfoncés | Roues écartées |
  |---|---|---|---|---|
  | Monster Truck | 0,61 u | 0,36 rad | 1 219 (jusqu'à 1,00 u) | 4 |
  | Char | 0,18 u | 0,04 rad | 1 725 (jusqu'à 1,16 u) | 4 |

**Niveau 2 — enfoncement** (`enfoncer`) :
- L'avant ou le flanc plie au point d'impact, dans le sens du choc, et le toit suit. Les vitres éclatent, une roue peut
  s'écarter.
- La voiture est projetée en tournant (selon l'endroit touché), puis **poussée devant le lourd** : il ne la traverse jamais.
- Le lourd perd 16 % de vitesse et prend des dégâts légers, sans jamais s'arrêter net. Il ne monte jamais dessus.
- Retours : tôle et verre, secousse plus légère, pas de ralenti.
- Mesuré : bus à 12,8 u/s contre une citadine en travers. Tôle pliée de 0,97 u, voiture projetée de 14,5 u et poussée
  devant le bus. Le bus passe de 12,8 à 10,9 u/s et perd 6,8 PV sur 480.

**Communs** :
- Épaves déformées, noircies (matières copiées, jamais celles du cache `mat()`) ; elles glissent puis fument 9 s.
- 10 épaves au plus. Une épave est retirée au bout de 75 s (elle s'enfonce dans le sol) ou à plus de 240 u du joueur ; ses
  géométries et matières sont libérées. Avant, les épaves n'étaient jamais retirées ni libérées, même à la partie suivante.
- Les sons d'écrasement et d'enfoncement ont leur propre bus audio. Ils sont coupés dans `mourir()`, `startRun()` et à
  l'entrée d'une salle.
- `vehEcrases` (défi Broyeur) compte une fois par victime.

Captures :
- `ecrasement_monster.png` : avant, roue sur le toit, après le passage, l'épave.
- `ecrasement_char.png` : avant, chenilles sur la voiture, après, l'épave.
- `enfoncement_bus.png` : avant, impact, après (l'épave poussée devant le bus), l'épave de près.

## Mesures (Chrome sans écran, rendu logiciel : ne compter que l'écart, pas les valeurs absolues)

| | Avant | Après |
|---|---|---|
| Monster Truck, objets dessinés (halos compris) | 30 | 43 |
| Ville avec le Monster Truck en vue 3D, appels de rendu par image (3 séries) | 1 308 / 1 359 / 1 350 | 1 259 / 1 287 / 1 312 |
| Temps d'image (mise à jour des véhicules, caméra, rendu ; 3 séries) | 27,8 / 28,3 / 27,1 ms | 24,8 / 25,5 / 22,8 ms |
| Image pendant un écrasement (le travail en plus) | — | 2,6 ms en moyenne |
| Pire image d'écrasement | — | 1,5 à 10 ms ; 34 ms au tout premier écrasement de la partie (code encore froid) |

Les écarts de la ville relèvent du bruit de mesure (la scène n'est pas identique d'une version à l'autre). Il n'y a qu'un
seul Monster Truck dans le monde : ses 13 objets de plus ne pèsent que quand il est en vue.

## Tests

- **Nouveaux** :
  - « Monster Truck V3 » : hitbox = modèle, roues plus grandes que la caisse, crampons dans la géométrie du pneu,
    amortisseurs au sol, fumée au démarrage et à l'accélération mais pas sans accélérer, pool fixe, roues à la vitesse
    réelle, rebond, fiche et harnais du cockpit, diagnostic du cockpit.
  - « Écrasement V2 » : listes des niveaux, le Monster Truck monte et tangue, le char à peine, sommets enfoncés, vitres,
    roues, épave noircie et rangée, enfoncement par le bus (tôle, projection, épave poussée, perte de vitesse et dégâts
    légers, jamais dessus), voiture contre voiture sans épave, plafond et durée de vie des épaves, sons coupés à la mort.
- **Adaptés** :
  - Les tests de l'écrasement cherchent désormais un couloir plat et dégagé : l'écraseur doit passer sur sa cible, et une
    plateforme à 8 u l'arrêtait.
  - « Bus touché à un bout » vérifie maintenant l'affaissement localisé (0,38 u sous les chenilles, 3,01 u de l'autre côté).
  - Le gabarit du Monster Truck est mesuré sur le modèle V3.
  - Le test « Véhicules V3 » n'exige plus les roues de l'ancien modèle pour une refonte déclarée (`refonte:true`).
- `valider.js` : vert.
- Suite complète `scenarios.js` (graine 20260731) : 818 vérifications, aucune sautée, aucune erreur JS. Une seule a échoué :
  « Véhicules retravaillés : le bulldozer ne pousse pas ». Lame baissée, le bulldozer enfonçait la citadine au lieu de la
  pousser. La poussée à la lame avait été demandée le 14 octobre : elle a désormais la priorité. Un véhicule devant la lame
  baissée est poussé, comme avant. L'enfoncement ne joue plus que sur les flancs ou lame levée. Après correction, les blocs
  « Véhicules retravaillés » (citadine poussée sur 38 u) et « Écrasement V2 » repassent au vert, et `valider.js` aussi.

## Choix tranchés seul

- **Encombrement 6,4 × 3,8 u** : c'est la vraie emprise, pneus et pare-chocs compris. Vitesse et PV inchangés.
- **Liste des lourds** (niveau 2) : les camions, engins et véhicules de plus de 7 u. Le bus du Dépôt de bus en est exclu,
  sinon il changerait les courses. Le Blindé « Bastion » y est, mais il ne subit pas l'enfoncement (blindé).
- **Seuil de l'enfoncement** : 8 u/s (29 km/h). En dessous, c'est le choc classique.
- **Bulldozer** : lame baissée, il pousse ce qui est devant la lame (comportement d'avant). Il n'enfonce que de côté ou
  lame levée.
- **Le Monster Truck ne grimpe pas au-delà de 1,75 u** : sur un bus ou des pompiers, la tôle cède d'abord jusqu'à cette
  hauteur, plus vite, puis il passe. Le niveau 3 s'applique, comme avant, à tous les véhicules : « aucune exception ».
- **Victimes du niveau 3** : tous les véhicules au sol, sauf l'autre écraseur, les aéronefs, les bateaux, les véhicules
  d'une salle.
- **Ralenti** : seulement si le joueur écrase, 0,22 s à 55 %.
- **Épaves** : 75 s de vie, 10 au plus, retirées à plus de 240 u.
- Au niveau 2, l'épave reste un obstacle poussé par les véhicules qui la heurtent. Au niveau 3, elle est aplatie et se
  franchit, comme avant.

## Ce qui reste perfectible

- Le relief de la victime est découpé en 8 tranches × 2 côtés : la roue suit ce profil, pas la géométrie exacte. Sur le toit
  d'une voiture de biais, la montée est un peu en escalier.
- Les vitres des anciens modèles qui sont des boîtes sombres opaques ne disparaissent pas ; seuls les éclats volent. Sur
  les modèles V3 et les voitures réalistes, le verre disparaît.
- L'épave est noircie d'une teinte uniforme : ni rouille, ni brûlure peinte.
- Les roues de la victime s'écartent mais ne se détachent pas. Les roues avant du Monster Truck ne braquent pas à l'écran.
- Au cockpit, la planche cache le capot : on domine la route et l'on voit le compresseur, mais pas le capot.
- Le tout premier écrasement de la partie coûte une image de 34 ms (code froid).
- Plus large, le Monster Truck accroche plus souvent le mobilier dans les rues étroites.
- En ville, un bus ou des pompiers de l'IA lancés dans une voiture de l'IA la mettent maintenant en épave. C'est rare, car le
  trafic évite les chocs, mais cela peut arriver pendant une poursuite.

## À tester sur iPhone

- Conduire le Monster Truck en ville et en tout-terrain : fluidité, fumée, rebonds.
- Écraser une file de voitures : à-coup au premier écrasement ? Sons coupés en mourant au volant ?
- Vue 1re personne du Monster Truck : lisibilité des trois cadrans en portrait, harnais en baissant les yeux.
- Laisser passer un bus ou des pompiers lancés contre une voiture.
- Garage : entrer avec le Monster Truck (plus grand), pièces tout-terrain.
