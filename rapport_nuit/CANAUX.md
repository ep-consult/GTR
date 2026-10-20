# Les Canaux de Los Reyes — suivi du chantier (branche `canaux`)

Demande : un quartier de canaux résidentiel inspiré des Venice Canals de Los Angeles à la place du port des Dockside Boys, une
police maritime qui sait y naviguer, et une 8e planque, la villa Miami. Image d'intention : `rapport_nuit/canaux.png`.
Ordre strict des phases, chacune vérifiée avant la suivante.

---

## Phase 0 — relevé avant toute modification

### 0.1 La zone (vérifiée dans le code)

- Grille : `CELL` = 42, `ROADW` = 13, `NB` = 14, `HALF` = 294, `INNER` = 29 (pâté de 31 u avec son trottoir). Les rues suivent les
  lignes de grille x, z = −294 + 42 k ; les pâtés sont au centre des cases. `caseCentre(bx,bz)` = (−294 + 42 bx + 21, −294 + 42 bz + 21).
- `quartier(bx,bz)` (`index.html`, fonction `quartier`) : `port` = bx 9–13 × bz 6–9 **et** bx 10–13 × bz 10–12 ; `neon` = bx 5–9 ×
  bz 10–12 (donc bx 9, bz 10–12 reste au néon, intact) ; `plage` = bz 13. Le relevé de la demande est exact.
- En coordonnées : le port couvre x 84 → 294 et z −42 → 252 (sauf le carré néon x 84 → 126, z 126 → 252). La plage : z 252 → 286
  (`MER` = `HALF` − 8 = 286 : la mer commence là). À l'est de x = 294 : la route de bordure, le mur d'enceinte (x ≈ 308) puis
  l'aéroport (aérogare, piste à x = `AERO.RX` = `HALF` + 100).
- Rues de la zone : nord-sud à x = 84 (bordure ouest du port), 126, 168, 210, 252, 294 (bordure est) ; est-ouest à z = −42
  (bordure nord), 0, 42, 84, 126, 168, 210, 252 (rue du front de mer, le long de la plage).

### 0.2 Tout ce qui vit dans la zone (lu dans la source)

Relevé machine complet : `rapport_nuit/canaux_avant.json` (script `rapport_nuit/outils/releve_canaux.js`, graine par défaut).
Lu dans le code :

| Élément | Où | Lecteurs / remarque |
|---|---|---|
| Porte **AQUARIUM** | `caseCentre(10,7)` (x 147, z 21), `poser('aquarium',…)` dans `placerPortes`, puis `ameliorerPortes` | dans le futur canal ouest (colonne bx 10) : à déplacer |
| Porte **GARAGE DU PORT** | `GARAGES_TUNING` `{id:'g_port',bx:10,bz:9}` (x 147, z 105), `mkPorteGarage` | même colonne : à déplacer ; l'entrée de `PORTES` ne garde que `halo` (le groupe = `halo.parent`, l'enseigne dans `ENSEIGNES`) |
| Porte du **chalutier** « SAINTE-ODILE » | plage bx 10 (`remplirBloc`, `qq==='plage'&&bx===10`) : ponton x 147 (z 280 → 312, `PONTONS` hw 2,6 hd 16), bateau décor à z 304, enseigne z 297, porte z 299 | dans l'axe du futur canal ouest : l'embouchure ne doit pas le couper |
| Porte du **Roi des Sandwichs** | `caseCentre(9,13)` (plage bx 9) | hors des embouchures, ne bouge pas |
| **POIS.port** = dock des Calaveras « RUCHE 9 » | case (11,8) : (189, 63) ; conteneurs, entrepôt, enseigne | `cacheV('baronne', +13, −11)` → (202, 52) ; `cacheV('amphibie', −14, +12)` → (175, 75) ; `mkRampe(POIS.port.x−22, …)` → tremplin à (167, 63) (sur la rue x = 168) ; missions « zone » (« le port des Dockside Boys ») ; `poserWaypoint` (« Port ») ; filtre de `mkPortVivant` ; `mkStationsVelo` (une station près du port) |
| Port vivant | `mkPortVivant` : 3 parcs à conteneurs dans les pâtés du port sans entrepôt ni lieu, portiques animés (`PORT.portiques`), mâts d'éclairage ; phare à (`HALF`+4, `MER`+18) ; porte-conteneurs au large | conteneurs et portiques : construits puis retirés ; le phare et le porte-conteneurs restent |
| Pâtés du port | `remplirBloc` (`qq==='port'`) : entrepôt (60 %), conteneur, caisse ; `ENTREPOTS` (cheminées de `mkQuartiersFinitions`), `BATIMENTS`, toits vivants (`TOITS`), façades variées (style « usine ») | retirés avec la zone |
| Mobilier, places garnies, stands | `MOB_QUARTIERS.port`, `mkPlacesGarnies`, `STANDS` (kiosques, food trucks), lampadaires, feux, plaques d'égout, passages piétons, terre-plein de l'avenue z = 0 à x = 147 | retirés avec la zone (mobilier fusionné par zones de 84 u : sommets repliés) |
| Territoire | `TERRITOIRES.murenes = ['port','plage']` (Dockside Boys) ; `gangDuQuartier(quartierAt(…))` | l'id `port` ne change pas |
| Plage devant la zone | cases bx 10–13 de la plage : maisons de plage sur pilotis, postes de surveillance, palmiers, parasols, îlots au large (aléatoires) | à retirer seulement sur le passage des embouchures |

### 0.3 Mécanismes à réutiliser

- **Eau** : `estEau(x,z)` — au nord de `MER`, seuls le lac (`surLac`, sauf sa passerelle), la crique (`dansCrique`) et les bassins
  (`dansBassin`) sont de l'eau ; au sud, la mer sauf `PONTONS` et `ILES`. `niveauEau(x,z)` (bassins en hauteur : sinon 0) sert à la
  nage (`P.nage = P.y < niveauEau + 0,5 && estEau`) et à la noyade (`noyerVehicule` : `v.noyeBase`). `houleY`/`assietteHoule` font
  flotter les bateaux (`mesh.position.y = 0,15 + houle`).
- **Sol** : `solY(x,z)` part de **0** (jamais en dessous) et prend le max des trottoirs (0,22), `PLATS`, `COLLINES`, `RELIEFS`,
  `RAMPES` ; `solPied` y ajoute les toits. `marchable` (dans `majJoueur`) : aucune limite de marche hors des reliefs.
- **Plateformes** : `PLATS` (rectangle orienté `ang`, `dansRectPlat`) ; `PONTONS` (rendent leur emprise NON-eau).
- **Sols** : `solRect` → `SOLS` (transitions), `TROTTOIRS`.
- **Réserver un quartier** : `reserverHills` / `viderZone` (retrait de ce qui tient ENTIÈREMENT dans un rectangle : objets, `MERGE`,
  solides, `PLATS`, `RAMPES`, lampes, `BATIMENTS`, enseignes, stands, `ZONES_SANS_MOBILIER`), `deplacerPorte` (+ `orienterPorte`).
- **Lac du parc** (`mkLacParc`) : eau en plein ville, passerelle en dos d'âne (`PLATS`), barques et canards.
- **Jetée foraine** : praticable en voiture au-dessus de l'eau (`PLATS` + `PONTONS` + rampe) — ce qui la rend NON-eau.
- **Noyade** : `noyerVehicule` / `majNoyade` (le joueur sort à la nage) ; `rivePlusProche` (16 directions : le premier point non-eau).
- **Apparitions** : `pointApparition` (jamais l'eau), `spawnRing`, `spawnRingEau` (vedettes, `z > MER+4`), `CHASSE_EAU`
  (`majChasseursEau`), `joueurEnMer` (`P.z > MER+6`) dans `majWanted`.
- **Trafic** : `creerTrafic` / `majTrafic` — **le trafic ne tourne jamais** : chaque véhicule roule tout droit sur sa voie
  (`v.axe`, `v.lane`) et fait demi-tour aux limites, devant la base et devant Los Reyes Hills (`pousserHorsHills`).
  `pointRoutePolice` (chaussée à 35–55 u), voitures garées au hasard, `destinationTaxi` (devant les portes), usure de chaussée
  (`ameliorerTexturesSol`, sur la grille).
- **Carte** : `construireMinimapStatique`, `dessinerHillsCarte`. **Effacement** : la grande roue (matériaux propres).
- **Planques** : `PLANQUES_DEF`, `PQ_INT`, `construirePlanqueSalle` (7 planques).

Vérification visuelle : `rapport_nuit/captures/canaux/avant_carte_statique.png` (fond de carte recadré sur x 70 → 310,
z −60 → 320 : cinq colonnes bleu-gris bx 9–13, le néon violet en bas à gauche, la plage, le ponton du chalutier à x 147, celui du
voilier à x 190, le phare) et `avant_grande_carte.png`.

**Relevé machine** (`canaux_avant.json`, 33 portes, 44 POIS, 3 garages, 33 sorties de salle, 178 véhicules posés, 79 stands,
6 planques, 46 activités, 8 courses, 4 stations vélo) — ce qui est dans la zone :
- portes : chalutier (147, 299), **aquarium (147, 65,95)** — `placeLibrePorte` l'a poussée de (10,7) à la case (10,8) —, Roi des
  Sandwichs (109,7, 273,1), **GARAGE DU PORT (147, 149,55)** — case (10,10) ; sorties correspondantes 3 u devant ;
- POIS : `port` (189, 63) ; `phare` (298, 304, sur son îlot : inaccessible à pied dès l'origine) ;
- véhicules posés : Baronne (202, 52), 4x4 amphibie (173,1, 81,4) — sur la rue z = 84 —, une moto (121,4, 54,6) — sur la rue x = 126 ;
- stands : 35 kiosques, food trucks et chariots du mobilier dans les pâtés et sur les trottoirs du port ; 3 sur la plage ;
- planques : **cabanon de plage (138, 274)** (cabane, auvent, piliers : x 133 → 147, z 270 → 279) et **voilier (194, 300)** (ponton
  x 190, z 285 → 306) ;
- sur la plage, dans le passage d'une embouchure droite : le ponton du chalutier (x 144,4 → 149,6, z 280 → 312, piles en maillages
  séparés), une maison de plage sur pilotis (227, 266) et ses piliers, palmiers et parasols.

### 0.4 Le point dur : une même case, chaussée dessus et eau navigable dessous

Ce que voit chaque système, et pourquoi :

| Système | Sur un pont | Dans un canal | Sur un quai |
|---|---|---|---|
| `estEau(x,z)` | **faux** (comme un ponton ou la passerelle du lac) : rien ne s'y noie, rien n'y nage, rien n'y apparaît | vrai (`dansCanal`) | faux |
| bateaux (`estEauNav`) | **vrai** : la coque passe dessous | vrai | faux (mur) |
| `solY(x,z)` | le tablier (profil en dos d'âne, liste `CANAUX.ponts`, PAS un relief : ni gravité ni paroi de relief) | le **fond** du canal (−2,4 : `solY` ne partait jamais sous 0) | 0,22 (trottoir) |
| `niveauEau(x,z)` | — | `CANAUX.niveau` (−0,6 ; il remonte vers 0 dans l'embouchure) | — |
| voitures, trafic, police | roulent sur le tablier | tombent et se noient (`noyerVehicule`, fond à −2,4) | — |
| piétons, ennemis | marchent dessus | nagent ; `rivePlusProche` vise les **marches** | — |
| joueur à la nage | **mur** (on ne passe pas sous un pont à la nage : simplification) | nage (`P.nage` : `P.y` au fond, sous le niveau) | **mur** sauf aux marches (règle ajoutée à `marchable` : depuis l'eau, une marche de plus de 0,6 u se refuse) |
| balles | une balle sous le tablier meurt contre lui (sol des balles = `solY`) | volent | — |
| `solidAt` | rien : le tablier n'est pas un solide (un solide est un mur pour une voiture) | rien | parapets et bittes d'amarrage seulement |
| apparitions (`pointApparition`) | refusées (on ne fait pas naître sur un pont) | refusées (eau) | permises |

Pourquoi pas un `PONTONS` : il rend sa case non-eau pour TOUT le jeu, bateaux compris (la jetée foraine les arrête) ; ici seuls
les bateaux gardent l'eau sous le tablier (`estEauNav`, utilisée par les tests d'eau des bateaux dans `majVehiculePhys`,
`eauDevant` et `surEauVeh`). Pourquoi pas un `RELIEFS` : un relief déclenche la physique de montagne (gravité, parois, sauts).

Eau sous le niveau des rues : le grand plan d'asphalte (`sol`, un seul maillage sous toute la ville) est remplacé par le même plan
**percé** aux canaux (même matériau, mêmes coordonnées de texture), sinon il couvrirait l'eau abaissée.

### 0.5 Dimensions mesurées sur la physique réelle

Banc `rapport_nuit/outils/banc_vol.js` (runtime de `valider.js`, `majVehiculePhys` à 60 images/s) :

| Bateau | Taille | Virage plein gaz (diamètre de la trajectoire) | Demi-tour depuis l'arrêt (gaz 0,35) | Hauteur au-dessus de l'eau |
|---|---|---|---|---|
| vedette de police `bateauP` | 6,8 × 2,5 (2,58 réels) | 37,5 u à 33 u/s | 3,1 s dans 16,4 × 12,1 u | 3,97 (antenne fine) ; rampe 2,79 ; arceau 2,84 |
| vedette `bateau` | 6,5 × 2,4 | 36,1 u à 27 u/s | 3,8 s dans 16,7 × 12,2 u | 2,95 (antenne) ; console 1,95 |
| offshore `espadon` | 6,2 × 2,2 | 39,8 u à 42 u/s | 2,6 s dans 14,5 × 11,1 u | 1,57 |
| jet-ski | 2,6 × 1,1 | 26,3 u à 37 u/s | 1,9 s dans 10,7 × 6,8 u | 1,27 |

Retenu :
- **Canaux principaux : 20 u d'eau** (deux vedettes de 2,6 u se croisent avec 3 u d'écart et 3 u de chaque bord même avec des
  bateaux amarrés le long d'un quai : passage utile ≥ 14 u). Un pâté fait 31 u : 5,5 u de quai de chaque côté.
- **Bras latéraux : 12 u** (une vedette à la fois, croisement serré possible).
- **Bassins de fin de bras : 22 u de diamètre** (demi-tour au ralenti : 16,4 × 12,1 u mesurés, plus la marge). À pleine vitesse,
  aucun demi-tour n'est possible sous 37 u : on ralentit, comme la police (phase 2).
- **Embouchures : 14 u** (l'ouest, décalée vers l'est pour passer à côté du ponton du chalutier).
- **Tirant d'air : 3,0 u au centre des ponts** (au-dessus de la rampe et de l'arceau de la vedette de police ; seule son antenne
  fine, à 3,97, peut frôler le tablier, qui s'efface quand un bateau passe dessous). Eau à −0,6, tablier culminant vers 2,7 sur un
  plateau central, rampes de pente ≤ 0,35 (le vélo monte jusqu'à 0,45).


---

## Décisions

1. **Déterminisme : construit puis retiré, en fin de décor.** Réserver la zone au début du décor (comme la colline) changerait ce
   que voient les bâtisseurs suivants (port vivant, mobilier, toits, façades : ils testent les solides) et donc leurs tirages : le
   mobilier hors zone bougerait. La ville ET tout le décor sont construits comme avant ; `reserverCanaux` (aucun tirage : retraits
   et déplacements de portes) s'exécute APRÈS `mkBalises` et `montActiver` (réservée avant les balises, elle retirait des activités
   du quartier — un coffre de toit — et `mkBalises` tirait moins : la trace du décor changeait) ; les balises des deux portes
   déplacées suivent leur porte, celles posées sur ce qui est retiré disparaissent. `mkCanaux` vient en dernier, sur un générateur
   privé. **Les bâtiments pas encore fusionnés (`MERGE`) sont repliés en un point, jamais retirés** : une clé vidée, c'est un
   maillage de moins créé par `finaliserMerge`, donc des tirages en moins pour toute la partie (les voitures garées au hasard, hors
   du quartier, changeaient de place). L'empreinte (`_aleaDecorS` après chaque bâtisseur, portes, chalet, places garnies) ET le
   tirage principal après le chargement sont identiques à ceux d'avant.
2. **Plan** (A–E de l'image → bx 9–13) : canal ouest = colonne bx 10 (eau x 137 → 157), canal est = bx 12 (x 221 → 241), du bord
   de la route nord (z −36) à la plage ; quais de 5,5 u ; les rues x = 126, 168, 210, 252 deviennent les rues des quais.
   **Rues transversales à ponts : z = 42 et z = 168** (quatre ponts) ; le pont sud-ouest (z = 168, canal ouest) a le tablier orange.
   La rue du front de mer (z = 252) est une **route de bordure gardée** : deux ponts de plus, sur les embouchures (six en tout).
   **Traverse** : case (11,9), eau z 96 → 114, entre les deux canaux. **Bras ouest** : case (9,6), axe z = −21, bassin centré
   (103, −21) ; **bras est** : case (13,8), axe z = 63, bassin centré (275, 63). Les segments de rue traversés par l'eau sont
   retirés **d'un carrefour à l'autre** (jamais d'amorce) : z = 0, 84, 126, 210 au droit des deux canaux ; x = 126 entre z = −42 et
   0 (bras ouest) ; x = 252 entre z = 42 et 84 (bras est) ; x = 168 et x = 210 entre z = 84 et 126 (traverse). Les segments z = 84
   et z = 126 de la colonne bx 11 restent : ce sont les quais de la traverse.
3. **Embouchures** : ouest x 152 → 166 (décalée vers l'est sous le pont du front de mer : elle passe à 2,4 u du ponton du
   chalutier et loin du cabanon : **ni le chalutier ni le cabanon ne bougent**) ; est x 221 → 241 (une maison de plage décorative
   et ses piliers sont retirés de son passage). Le niveau de l'eau remonte de −0,6 à 0 entre la route et la mer.
4. **Lieux déplacés** (les seuls) : **aquarium** (147 ; 65,95) → pâté (9,8), façade est, sur le quai du canal ouest ; **GARAGE DU
   PORT** (147 ; 149,55) → pâté (11,10), façade ouest, sur le quai (accès en voiture par la rue x = 168 et le pont z = 168).
   `POIS.port` (189, 63) ne bouge pas : la case (11,8) devient l'atelier « Marée Basse » (le dock « RUCHE 9 » en était le décor) ;
   la Baronne, le 4x4 amphibie (sur la rue z = 84, quai nord de la traverse), la moto (rue x = 126) et le tremplin restent.
5. **Stands du port** : les 35 kiosques et food trucks du mobilier du port sont retirés avec lui (phase 1) ; le quartier rebâti a
   les siens (phase 3). Noté dans `canaux_deplacements.json`.
6. **Nageurs et ponts** : on ne passe pas sous un pont à la nage (le tablier est un mur depuis l'eau, comme les quais) ; on sort de
   l'eau par les marches. Les bateaux, eux, passent.

7. **Trafic** : il ne tourne jamais ; devant une rue retirée il fait demi-tour AVANT le carrefour qui la précède (au milieu du
   carrefour, la file bloquait la rue croisée : 15 véhicules figés en 90 s au premier essai), et il n'apparaît plus à moins de 60 u
   d'une rue retirée (entre deux canaux, une voiture ferait la navette). Le trafic du quartier est donc un peu moins dense.
8. **Marches** : 16 escaliers de cinq marches, parallèles au quai, de −0,42 à 0,22 (`CANAUX.marches`) : 3 par quai des canaux,
   2 dans la traverse, 1 par bassin. Rien n'y apparaît (`pointApparition`, piétons).
9. **Sortie du garage en voiture** (`garageApresSortie`) : le véhicule est posé dans l'axe de la porte (avant : toujours 3 u au sud ;
   les portes des garages existants regardent toutes au sud, rien ne change pour eux) — le garage du port regarde vers l'ouest.
10. **« Sauvegarde dans l'ancien port »** : le jeu ne sauvegarde aucune position (on repart toujours de la grande place). Vérifié à
    la place : planques du quartier (cabanon, voilier) achetées et sauvegardées, relues, nouvelle partie — rien de posé dans l'eau.
11. **Véhicules posés devenus impossibles** (`canauxNettoyerVehicules`, fin de `startRun`) : retirés APRÈS leur création, jamais
    avant (les tirages de la partie restent ceux d'avant) — dans l'eau d'un canal (sauf un bateau), sur une rue retirée ou un
    tablier (une voiture), dans un bâtiment du quartier. Avec la graine par défaut : aucun.
12. **Le convoi militaire** (événement) naissait parfois sur une rue retirée et partait tout droit dans l'eau : il n'apparaît pas
    ce coup-là.

## Phase 1 — squelette jouable (fait)

Bandeau `LES CANAUX DE LOS REYES` (`index.html`, avant `AÉROPORT VIVANT`) ; la géométrie de l'eau (`CANAUX`, `formeSdf`,
`dansCanal`, `pontCanal`, `marcheCanal`, `dansCoupe`, `routeCanalInterdite`, `estEauNav`, `niveauCanal`, `niveauFlot`) juste avant
`estEau`.

- [x] Réservation de la zone (`reserverCanaux`, aucun tirage) : 111 objets retirés, 39 521 triangles de maillages fusionnés
  repliés (mobilier, façades, toits, conteneurs), bâtiments non fusionnés repliés, solides, trottoirs, plateformes, rampes,
  lampadaires, feux, stands, enseignes, portiques du port vivant et leurs feux, balises orphelines.
- [x] Lieux déplacés : **aquarium** (147 ; 65,95) → (116,1 ; 63), façade est du pâté (9,8), sortie (119 ; 63) ; **garage du port**
  (147 ; 149,55) → (176,35 ; 147), façade ouest du pâté (11,10), sortie (174,95 ; 147), on en ressort au volant sur la rue x = 168.
  Un bâtiment neuf pour chacun (matériaux propres). Aucun autre lieu ne bouge.
- [x] Eau : une seule nappe, ~15 000 u² (deux canaux de 20 u, traverse de 18 u, bras de 12 u, bassins de 22 u, embouchures) ;
  niveau −0,6 sous les quais, qui remonte à 0 jusqu'à la mer ; fond à −2,4 ; houle ×0,2 ; plan d'asphalte de la ville percé aux
  canaux (même matériau). Le coin intérieur de l'embouchure ouest est arrondi (les bateaux s'y échouaient en sortant).
- [x] Six ponts (tablier en dos d'âne de 31 u, plateau à 2,7 u, tirant d'air 3,3 u ; le sud-ouest orange) ; le tablier s'efface
  quand le bateau ou le nageur du joueur passe dessous (matériaux propres).
- [x] Quais maçonnés (mur de pierre du fond à la margelle, margelle claire), dallage des quais et des pâtés libérés (0,22), 16
  escaliers ; la plage refaite autour des embouchures, la pellicule des vagues coupée, les pointillés des rues coupés à l'eau.
- [x] Collisions : à la nage, quais et tabliers sont des murs (on sort par les marches) ; les bateaux passent sous les ponts
  (`estEauNav`) ; voitures, police, trafic : sur les tabliers, noyés dans l'eau ; les nageurs (`rivePlusProche`) visent les marches.
- [x] Trafic, apparitions, police à terre, voitures garées, convoi : jamais sur une rue retirée, un pont ou une marche.
- [x] Carte : canaux, quais, ponts (l'orange), marches, aquarium et garage sur la minimap et la grande carte ; quartier nommé
  « LES CANAUX ».

### Mesures (phase 1)

- **Empreinte** : trace du décor (`_aleaDecorS` après chaque bâtisseur, dont `mkBalises`), portes, chalet, places garnies :
  identiques à avant ; seul le nombre d'objets de la scène baisse (5 449 → 5 370). Tirage principal après le chargement : identique.
- **Relevé de protection du périmètre** (`releve_canaux.js --comparer canaux_avant.json`) : **aucun écart** ; seuls les
  déplacements notés dans `canaux_deplacements.json` (aquarium, garage du port, 23 kiosques et food trucks retirés) ; 178 véhicules
  posés identiques (hors zone : positions exactes).
- **Bateaux** (pilote simulé à poursuite pure, `majVehiculePhys` réel) : vedette de police, vedette, jet-ski, offshore — circuit est
  (embouchure ouest, canal ouest, traverse, canal est, bras est et demi-tour dans le bassin, embouchure est) en 46 à 54 s, circuit
  ouest (bras ouest et son bassin) en 52 à 60 s, tronçon nord du canal est en 30 à 33 s : **sous les six ponts dans les deux sens**,
  0 à 1 frôlement à 7 u/s, aucun échouage.
- **Voitures sur les six ponts** (citadine, moto, bus, deux sens) : tablier à 2,7 u, tangage ≤ 0,35 rad, jamais noyées.
- **Voiture lancée dans un canal** : noyée, le joueur nage jusqu'aux marches et remonte sur le quai en 6 s ; un quai sans marche
  ne s'escalade pas depuis l'eau.
- **Trafic, 90 s au calme depuis trois trottoirs du quartier** : 0 véhicule dans l'eau, 0 sur une rue retirée, 0 noyé ; arrêts de
  plus de 10 s : 7 et 15 (graines 20260731 et 777) contre 10 et 6 sur HEAD dans la même scène — du même ordre ; ~35 % de
  véhicules vus en moins dans le quartier (demi-tours avant les rues retirées).
- **500 apparitions** (`spawnRing`) et 300 points de la police (`pointRoutePolice`) depuis le quartier : toutes sur la terre ferme.
- **Construction** : `reserverCanaux` ~0,4 s, `mkCanaux` ~0,35 à 0,45 s sur ce PC (contours 1,9 s au premier jet : grille calculée
  forme par forme, boucle sans fermeture) ; chargement complet : 26,4–27,5 s contre 25,8–26,7 s sur HEAD (navigateur sans carte
  graphique : ~+0,6 s). **À mesurer sur iPhone.**
- **Suite complète** : 828 vertes ; un échec attendu (« Port vivant » exigeait des parcs à conteneurs, retirés par la demande),
  test adapté, vert. `valider.js` : vert.

Captures (390 × 844) : `p1_carte_statique.png`, `p1_grande_carte.png`, `p1_traverse.png`, `p1_embouchure.png`,
`p1_bassin_est.png`, `p1_pont_so.png` (le tablier orange effacé au-dessus du nageur), `p1_pont_imm.png`, `p1_quai_imm.png`.

## Phase 2 — police maritime (fait)

Code : fin du bandeau `LES CANAUX DE LOS REYES` (`PCANAL`, `canauxGraphe`, `projGraphe`, `cheminCanal`, `joueurDansCanaux`,
`pointEntreeCanal`, `creerVedetteCanal`, `piloterVedette`, `majVedetteCanal`, `majPoliceCanaux`).

- [x] Le joueur sur l'eau ou à la nage dans un canal compte comme en mer (`joueurDansCanaux`) : les vedettes de la mer
  (`majChasseursEau`) ne s'y lancent plus en ligne droite ; une vedette de police déjà là suit le joueur par le graphe.
- [x] **Graphe de navigation** (`canauxGraphe`, tiré des formes de `CANAUX`) : 25 nœuds — l'axe de chaque canal (tête, bras, ponts,
  traverse), les bras jusqu'au centre des bassins, la traverse, l'embouchure ouest en trois points, les deux embouchures reliées par
  la mer (z = MER + 32). Chemin le plus court (`cheminCanal`, Dijkstra), refait deux fois par seconde.
- [x] **Vedettes `bateauP`** (conduit `police`, `v.vedetteCanal` : gyrophares, sirène, détournables, comptées comme la police) :
  elles naissent hors de vue à un nœud du graphe à 70–220 u par l'eau (en mer : elles entrent par l'embouchure) ; deux au plus ;
  poursuite pure le long du chemin (le pilote validé en phase 1) ; vitesse réglée sur le virage à venir, ≤ 11 u/s sous un pont,
  ≤ 12 u/s dans les bras et les bassins ; bloquées : marche arrière ; coincées 4 s hors de l'écran : recyclées. Elles tirent selon
  les règles de la police (`tirer`, cadence 1,4 s, portée 30 u, ligne de vue). **Jamais d'agents débarqués d'une vedette.**
- [x] Tout près du joueur : elle colle à sa vitesse sans le pousser ; s'il fonce sur elle, elle serre un quai et le laisse passer
  (sinon elle bouchait le canal et y fondait sous les chocs).
- [x] **À terre** : les renforts de la recherche (agents, voitures) naissent sur la terre ferme près du joueur et viennent jusqu'aux
  quais et aux ponts ; une voiture de police ne débarque jamais ses agents dans l'eau (derrière elle) ; un agent n'est plus jamais
  poussé du quai dans l'eau par une coque qui le frôle (`degageDeVehicule`) ; un agent projeté à l'eau nage jusqu'aux marches
  (avant : un agent de patrouille « passif » restait planté dans l'eau, bug d'origine révélé par les canaux).
- [x] **4 étoiles** : une des deux vedettes se poste en travers de l'embouchure la plus proche du joueur (par l'eau), sans la boucher
  (embouchure est : 20 u, la vedette 6,8 u) ; on la pousse en la percutant.
- [x] **Patrouille** : sans étoile, près du quartier, au plus une vedette de patrouille (`patrouilleCanal`) fait la ronde de mer en
  mer par les deux canaux et la traverse ; témoin (`temoinPolice`) : un délit sous ses yeux, elle prend la poursuite.
- [x] **La recherche ne tombe pas** tant qu'une vedette des canaux est à 90 u (`copProche`). En haute mer : rien ne change.

### Mesures (phase 2) — test « Police maritime des canaux », vraie boucle, plusieurs graines

- 3 étoiles, le joueur arrêté au fond du bassin est : une vedette au contact en **15,7 s** ; 2 vedettes au plus ; étoiles intactes.
- Poursuite de 60 s d'un canal à l'autre : une vedette à moins de 15 u ; aucune vedette coincée plus de **1,3 s** à l'écran ;
  aucun agent entré dans l'eau en marchant (0 à 4 projetés par une coque, ressortis à la nage).
- 4 étoiles : barrage en travers en **11 s** ; forcé, en mer en 24 à 35 s (pilote en ligne droite, sans finesse).
- Patrouille : une seule ; témoin d'un délit, elle poursuit (1 étoile).
- Haute mer : aucune vedette des canaux en poursuite.
- Suite complète : **829 vertes**, aucun échec (un saut connu : la somme rare du Ciné-Palace). Relevé de périmètre : aucun écart.

## Phase 3 — bâti (fait)

Code : `VILLA_CANAUX`, `VILLA_CANAUX_TEINTES`, `constructeurCanaux`, `palmierCanaux`, `villaCanaux`, `immeubleCanaux`,
`pontonsCanaux`, `mkBatiCanaux` (bandeau des canaux) ; les lots dans `canauxDefinir` (`CANAUX.lots`).

- [x] Chaque pâté sec du quartier (12 ; l'atelier du port, (11,8), reste pour la phase 4) est vidé comme en phase 1 (construit puis
  retiré, sans tirage) et rebâti : **18 villas** sur des lots de 31 × 15,5 u tournés vers leur rue, **3 petits immeubles** (2 et
  3 niveaux) aux pâtés (11,6), (13,6) au nord et (13,10) à l'est.
- [x] **Quatre modèles de villas** (`VILLA_CANAUX`) en trois teintes chacun et en miroir, choisis par le rang du lot (aucun tirage) :
  le cube blanc (deux volumes décalés, baies, claire-voie de bois, terrasse sur le toit), le bungalow de bois (bardage, toit à deux
  pans, véranda), le duplex (rez enduit, étage en bois en porte-à-faux, balcon), la maison de plage pastel (toit à quatre pans,
  volets, terrasse à garde-corps). Chaque lot : pelouse, haies mitoyennes, clôture basse, portail et entrée de voiture ouverts, allée,
  terrasse et transats, boîte aux lettres, un ou deux palmiers ; **13 piscines** où l'on nage (`BASSINS`).
- [x] Hauteur maximale 9,8 u (trois niveaux), jamais de tour ; les maisons sont derrière la rue des quais : aucune façade ne masque
  une voie d'eau (vérifié aussi en vue immersive).
- [x] **Pontons privés** (`CANAUX.pontons`) : planchers flottants de 2,4 u le long des quais, en face des lots ; praticables (on y
  monte depuis l'eau), un mur pour les bateaux ; jamais devant une marche, sous un pont, ni à hauteur d'un bras ou de la traverse
  (les bateaux y tournent : un ponton en face faisait tomber une étoile en poursuite).
- [x] **Six kiosques à beignets de crevettes** sur les quais (`STANDS`, spécialité `port` du quartier) remplacent les kiosques du
  mobilier retirés.
- [x] Géométries : UNE géométrie à couleurs de sommets par pâté (le matériau du mobilier, `MOB_MAT` ; toits par `geoToit`), un seul
  matériau neuf (l'eau des piscines) ; 45 000 sommets pour tout le bâti.
- [x] Carte : jardins, maisons, immeubles et piscines.

## Phase 4 — nautique et ambiance (fait)

Code : `canauxNautiqueDefinir`, `mkNautiqueCanaux`, `amarreCanal`, `enseigneCanaux`, `dockersCanaux`, `canauxStartRun`
(`canauxStartRunPrive`), le débarquement dans `sortirVehicule`.

- [x] **Six bateaux du décor bâchés** (vedettes et offshores, modèles V3/V4 aplatis en couleurs de sommets : aucun appel de rendu
  de plus — par matériau, ils en coûtaient 48), le long des pontons privés et de murs de quai nus, jamais à plus de 5 u du quai ;
  un mur pour la navigation (`estEauNav` : `amarreCanal`), de l'eau pour un nageur. **La bâche les distingue des pilotables.**
- [x] **Trois jet-skis pilotables** (deux pontons privés, le ponton de l'atelier) et **la vedette de l'embarcadère public**, posés à
  chaque partie par `canauxStartRun`, sur un générateur privé (la partie suivante tire comme avant).
- [x] **L'embarcadère public** (canal ouest, quai est, z 222–236) : un ponton de 3 × 14 u, kiosque à billets, bittes, lampadaires,
  l'enseigne « EMBARCADÈRE » ; on y arrive à pied depuis la rue x = 168.
- [x] **Débarquer** : à la descente d'un bateau dans un canal, on monte sur le ponton le plus proche (9 u), sinon sur les marches
  (6 u), sinon on plonge — embarcadère, atelier, quatre pontons privés et seize escaliers.
- [x] **L'atelier « Marée Basse »** (POIS.port, pâté (11,8)) : les volumes du dock RUCHE 9 restent (la cour du 4x4 amphibie se
  cherche au hasard parmi eux : un solide de plus changerait le tirage de toute la partie) ; il est habillé autour — l'enseigne
  « MARÉE BASSE » à la place de « RUCHE 9 », un bateau sur son ber sous un portique jaune, l'établi, trois moteurs hors-bord, des
  bouées — et a son ponton sur le quai d'en face (« MARÉE BASSE — CALE »), accessible par la rue x = 210. Sec, sans porte.
- [x] **Les Dockside Boys** : quatre figurants (`figurant`, type `mur_batte` ou `mur_pompe` : touchés, ils deviennent de vrais
  Dockers) à l'atelier et sur son quai, créés à la première partie (au chargement, ils remplissaient le cache des corps humains
  avant le premier ennemi de la partie : un tirage de moins pour tout ce qui suivait).
- [x] **La Krasnaya Brigada** : deux villas « cube », une voiture de luxe dans l'allée (SUV, limousine), deux gardes au portail.

### Mesures (phases 3 et 4)

- Relevé de protection du périmètre : **aucun écart** (185 véhicules posés : les 178 d'avant, identiques, et les nouveaux du
  quartier ; 53 stands). Empreinte du décor identique (après deux corrections : les enseignes et les bateaux du décor tiraient sur le
  générateur du décor — enseigne propre aux canaux, modèle V3/V4 direct).
- Tests : « Canaux, le bâti » (18 villas des quatre modèles, 3 immeubles, 13 piscines, 6 pontons, 6 kiosques, 45 144 sommets ;
  aucun volume dans l'eau ni sur la chaussée, aucune allée bouchée, un jet-ski bute sur un ponton) ; « Canaux, nautique et
  ambiance » (bâchés près du quai, pilotables qui démarrent, embarcadère depuis la rue, débarquement à l'embarcadère, à l'atelier et
  aux marches, Dockers figurants, enseigne remplacée, 4 gardes et 2 voitures de la Brigada).
- Suite complète : **832 vertes, aucun échec, aucun saut**. Deux tests rendus maîtres de leur scène au passage : « Tir à la tête »
  (un ennemi de la partie tirait aussi sur la cible) et le bus des ponts (une moto garée au hasard sur la rue d'un pont).
- Construction : bâti ~10 ms, nautique ~18 ms ; `mkCanaux` en tout ~70 ms sur ce PC.

Captures : `p3_carte_statique.png` (jardins, maisons, piscines), `p3_villas_o.png`, `p3_quartier_imm.png`, `p3_immeuble.png`,
`p4_embarcadere.png`, `p4_atelier.png`, `p4_canal_imm.png` (le tablier orange effacé au-dessus de la caméra).

## Phases

- [x] Phase 1 — squelette jouable
- [x] Phase 2 — police maritime
- [x] Phase 3 — bâti
- [x] Phase 4 — nautique et ambiance
- [ ] Phase 5 — planque villa Miami
