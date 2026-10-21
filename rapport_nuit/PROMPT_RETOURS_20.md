# Retours de playtest du 20 octobre — grande liste

Lis CLAUDE.md en entier avant de commencer, et respecte ses règles : édition ciblée, validation avec valider.js et scenarios.js, un commit après chaque modif qui marche, tout en français, aucune dépendance externe, un seul fichier, la carte du fichier tenue à jour.
Nom du jeu : GTRoyal. Aucune référence à un autre jeu ni à une marque : « Fruit Ninja », « Guitar Hero », « Red Bull » et « Titanic » ne doivent jamais apparaître dans le jeu (noms originaux ci-dessous).
Suivi point par point dans rapport_nuit/RETOURS_20_OCTOBRE.md : une case par point, ce qui a été fait, les mesures, les captures (rapport_nuit/captures/retours_20/).
Travaille dans l'ordre des lots, sur une branche `retours-20-octobre`. Commit à chaque point validé.
Si un point est ambigu, prends la lecture la plus raisonnable, écris-la en tête du point dans le suivi et continue. Ne t'arrête que pour une décision irréversible.
Règles de toujours : ville et décor inchangés (empreinte du décor, portes et tirage principal identiques ; tout nouveau décor sur un générateur privé ou en fin de décor) ; clés de sauvegarde fixes, `fusionMeta` et `DICOS_OUVERTS` respectés ; tout mini-jeu jouable (pilote simulé aux vraies commandes) ET perdable (passif = échec) ; une prime par vague au plus ; sons coupés dans `mourir`, `startRun` et à la sortie ; un bug visuel se valide par un rendu Three.js réel ; coût de rendu mesuré avant/après pour tout ajout lourd (cible iPhone).

---

## LOT 1 — Bugs (priorité absolue)

1.1 **4x4 amphibie téléporté** : sur l'eau, quand je reviens vers l'île, le véhicule est d'un coup téléporté en amont et il s'abîme. Trouve la cause : le filet de sécurité (`FILET`, `majFilet`), `degagerDesMurs`, `bloqueParSolide`, le relief de l'île (`hauteurIleTresor`), le passage eau → terre de `surEauVeh`, ou `v.flottaison` / `v.flotK`. Corrige-la. Test : un pilote au joystick réel fait plage → mer → retour sur l'île (et sur une plage de la ville), sans saut de position de plus de 1 u par image et sans dégâts.

1.2 **Cockpit du long-courrier tout gris** : on voit les commandes, mais pas de pare-brise, comme si l'écran était gris. Vérifie l'œil (`cockpitDims`, `COCKPIT_DEFS.ligne`), la verrière V4 (`ckEstVitre`, `cockpitVitrer`), et qu'aucune pièce du modèle ou de `ckAvion2` ne bouche la vue. Fais pareil pour TOUS les avions et hélicos (cargo, jet, C-130…). Test : diagnostic du cockpit + capture en rendu réel. La route ou le ciel doivent être visibles au centre de l'écran pour chaque aéronef de `VEHDEFS`.

1.3 **Ascenseur de la falaise (monte-charge du Pic du Vertige, `PIC.cage`)** : il est caché par un rocher. Refais-le : cabine vitrée, structure lisible, rien devant lui vu de la caméra (vue 2D et 3D). Retire ou déplace le rocher fautif sans décaler les tirages.

## LOT 2 — Minimap et grande carte ergonomiques

2.1 **Un seul jeu d'icônes cohérent** pour tous les lieux, identique sur la minimap ET la grande carte (pastille ronde, pictogramme SVG du sprite `icones/`, couleur par catégorie). Toutes les armureries ont le même logo, toutes les planques ou villas À VENDRE le même logo (et un autre une fois achetées), pareil pour les garages, boutiques, salles, activités, stands… Liste lue aux sources (`listeCommerces`, `pointsActivites`, `PLANQUES_DEF`, `PORTES`, `INTDEFS`), jamais recopiée.
2.2 **Le point du joueur devient une flèche orientée** dans la direction où il regarde (ou celle du véhicule), cohérente avec la rotation du radar.
2.3 **Touche sur une icône** (grande carte, et minimap si c'est faisable sans gêner l'ouverture de la carte) : l'élément est sélectionné, une bulle donne son nom, ce que c'est, son prix ou son état (possédé, verrouillé), sa distance, avec un bouton « Y aller » qui pose la destination.
2.4 **Filtres revus** : chaque catégorie a son filtre, et rien ne manque. Exemple signalé : le rooftop n'apparaît pas, impossible de le trouver. Fais l'inventaire de tous les lieux et activités du jeu (toits vivants et leurs surprises, penthouse, canaux, villa Miami, mont…) et vérifie que chacun a une icône et un filtre. Test : tout lieu de `PORTES`, `INTDEFS`, `PLANQUES_DEF` et `pointsActivites()` a une icône sur la carte.

## LOT 3 — Défis, récompenses et skins (la colonne vertébrale)

3.1 **Refonte des défis** pour donner envie : chaque activité du jeu doit avoir des défis à paliers (thèmes `DEFIS_THEMES`), avec de l'argent à la clé, et souvent un skin au palier final. La structure de la récompense ×2 par pub (`PUB_X2`) doit être prête partout (bouton masqué tant que `disponible()` est faux).
3.2 **Défis de cascade mesurés** (record + paliers) :
   - cabrage moto : le cabrage peut tenir beaucoup plus longtemps (revoir `CABRAGE_MOTO` et la bascule pour qu'un bon joueur tienne 20 s ou plus), chrono affiché pendant le cabrage, record ;
   - nombre de vrilles, de loopings et de tonneaux en avion (en un vol et au total) ;
   - temps de vol sur le dos (chrono affiché, record) ;
   - le même esprit partout où ça a du sens (wheelie vélo, saut le plus long, etc.).
3.3 **Skins spéciaux stylés** liés aux exploits (`TENUES`, `TENUE_EXPLOIT`) : maillot de plongeon de falaise, combinaison de plongeur, tenue de supercross, tenue de pilote de voltige, costume de pigeon, etc. Chaque skin a un vrai modèle visible et un petit bonus. Penderie et catalogue à jour.

## LOT 4 — Chasse et trophées

4.1 **Tableau de chasse** (`META`, clés fixes) : nombre d'animaux abattus par espèce (pigeons, mouettes, rapaces, faune du mont, de l'île, de la forêt…), visible dans un écran dédié.
4.2 **Trophées au chalet de montagne** (`PQ_INT.chalet`) : les animaux chassés y sont exposés (têtes, empaillés, plaques) et apparaissent au fil de la chasse, comme le mur des trophées de pêche.
4.3 **Défis de chasse** à paliers avec de l'argent ; au palier final des pigeons, le **costume de pigeon**, qui permet de planer ou voleter légèrement (petits bonds planés, chute ralentie, jamais un vrai vol libre). Garde la logique de karma existante pour les animaux paisibles, et explique dans le suivi comment les deux cohabitent.

## LOT 5 — Planques et constructions

5.1 **Villa planque (7e) restylée** : un vrai extérieur (jardin, terrasse, piscine, végétation) et une vue sur les alentours (collines, ville au loin, ciel), au niveau des autres planques V2 (`PQ_INT`, dôme `pqCiel`, rien au-delà de 185 u). Le concours de plongeon est conservé et marche toujours (test « Planques, 7 » vert).
5.2 **Immeuble en construction** (`mkChantierV2`) : supprimer l'ancienne grue et ajouter un monte-charge du même type que celui de la falaise refaite (1.3), qui dessert les étages (`ETAGES`). Tirages inchangés (construire puis retirer si besoin).

## LOT 6 — Mer et large (il n'y a rien à faire au large)

6.1 **Paquebot qui se brise** (nom original, par exemple « Reyes Majestic ») : un grand paquebot naufragé au large, qui se casse en deux et sombre de façon spectaculaire, avec de l'interaction : monter à bord, explorer, une mission ou un défi (sauvetage, butin, plongée sur l'épave). Rejouable une fois par vague. Coût de rendu mesuré.
6.2 **Vie au large** : du contenu au-delà de `VIE_MER` et `MERV` (activités, rencontres, petites missions, faune, bateaux), pour qu'on ait une raison d'y aller.
6.3 **Kitesurf** (nouveau) : aile visible, vent, sauts, figures, défi et skin.
6.4 **Wakeboard amélioré considérablement** : sensations, figures, sillage, caméra, défis.

## LOT 7 — Plongeon de falaise

7.1 **Compétition de plongeon de falaise** (nom original, par exemple « Reyes Cliff Diving ») sur les falaises (crique des plongeurs et/ou d'autres falaises), avec le même système de saut que le concours de la villa (`PLG_*` : élan, rotations, entrée verticale, notes des juges), en plus spectaculaire : plateformes de 10 à 27 m, public, bateaux juges. Points, record, prime une fois par vague, skin au palier final.

## LOT 8 — Mini-jeux revus et nouveaux

8.1 **Karaoké** : plus long et plus difficile, façon jeu de rythme à pistes (notes qui descendent, plusieurs pistes, tenues, combo, niveaux de difficulté). Nom original, aucune référence.
8.2 **Défi du burger** (le « roi des sandwichs ») : un énorme burger visible qu'on mange couche par couche, et une vraie compétition interactive contre un adversaire PNJ (rythme, nausée, coup de boost).
8.3 **Découpe de fruits** (nom original, par exemple « Jus de Plage ») : un mini-jeu où l'on tranche au doigt des fruits lancés en l'air (évite les pièges), et les fruits coupés font ton jus (stand sur la plage, bonus de PV ou de vitesse selon le jus).
8.4 **Manèges de la marina** (grande roue, tourniquet, et grand huit s'il ne l'a pas déjà) : chacun avec une vue à la 1re personne.

## LOT 9 — Armes

9.1 **Akimbo en vue 1re personne** : pour chaque arme qui autorise l'akimbo (`MODS_ARMES`), deux armes visibles à l'écran, une dans chaque main, avec tir alterné, recul, rechargement et visée cohérents (`fpsMontage`, `VISEURS_1P`, `RECHARGE_ARME`).

## LOT 10 — Course aérienne

10.1 **Défi voltige** et **course d'avions à passages dangereux** : un parcours d'anneaux dans les endroits les plus difficiles de la carte (sous les ponts des canaux, le long des falaises, dans les canyons, au ras du sol, entre les tours), en pilotage simulé (`PILOTAGE_SIM`). Chrono, pénalités, record, paliers, skin de pilote. Prouvé faisable par un pilote simulé, raté par un pilote passif.

---

## Pour chaque point
- Un test dans scenarios.js qui lit les listes à la source (jamais recopiées).
- Des captures en rendu réel pour tout ce qui est visuel.
- CLAUDE.md mis à jour (une section par nouveauté, la carte du fichier régénérée).
- Le coût de rendu mesuré pour les ajouts lourds (paquebot, chalet, villa, carte).

À la fin : le rapport dans le suivi, ce qui reste à jouer sur iPhone, et les points que tu as interprétés.
