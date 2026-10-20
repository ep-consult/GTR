# Canaux V2 — de vraies villas de Miami au bord de l'eau, des ponts tous différents (branche `canaux-v2`)

Demande : `rapport_nuit/PROMPT_CANAUX_V2.md` ; références : `rapport_nuit/canaux_refs/` ; suivi du chantier précédent :
`rapport_nuit/CANAUX.md`. Captures avant/après : `rapport_nuit/captures/canaux_v2/`.

## Ce que je retiens des photos

1. **Canal de Miami Beach** (`1_canal_miami_beach.png`) — un canal large et droit, eau calme bleu turquoise, reflets doux ; des
   yachts blancs à moteur amarrés le long des deux quais ; une rangée de palmiers royaux (troncs fins et droits, toupet haut) et de
   cocotiers penchés ; un muret de quai bas, des pieux de bois à tête sombre ; des haies basses, une villa à tuiles rouges ; **au
   fond, des tours de condos blanches** (10 à 20 étages) qui ferment la perspective, ciel bleu à cumulus.
   → En low-poly : l'eau des canaux plus claire que la mer, une file de palmiers sur les berges libres, des pieux à tête, des
   condos blancs en fond de perspective (au nord : la caméra classique regarde vers le nord), des bateaux blancs à quai.
2. **Villa blanche, ponton et cabane** (`2_villa_blanche_ponton_cabane.png`) — villa cubique blanche à deux niveaux, toit plat,
   balcon fermé de claustras de bois, escalier extérieur à rampe blanche, grandes baies ; mur de quai en moellons (pierre de corail,
   gris-beige) ; ponton de planches sur pieux ; **cabane de ponton blanche à claustras et toit en pyramide** ; cocotiers penchés,
   végétation dense, eau turquoise.
   → Style « Miami moderne blanc » : cubes empilés, balcon à claustras, escalier extérieur ; bord de l'eau « moellons » ; cabane de
   ponton (boîte blanche à lattes, toit pyramidal).
3. **Villas méditerranéennes et yacht** (`3_villas_mediterraneennes_yacht.png`) — crépi pêche, sable, rose ; toits de tuiles en
   croupe ; loggias à arcades ; balcons à balustres ; la pelouse jusqu'au mur de quai à couronnement blanc ; **un gros yacht de pêche
   sportive** (coque blanche, passerelle et tour de pêche) amarré parallèlement au quai, sur un ponton de bois.
   → Style « méditerranéen » : volumes crépis pastel, toit en croupe orange, arcades (piliers + linteau), balustres ; quai béton à
   couronnement blanc ; le yacht de pêche à tour pour les grands lots.
4. **Villa tropicale moderne** (`4_villa_tropicale_moderne.png`) — toits plats très débordants en dalles minces, **toits végétalisés**
   (plantes sur les toits), bardage de bois sombre, pierre, verre ; grands arbres, végétation qui déborde ; un bateau de bois au pied.
   → Style « tropical contemporain » : dalles de toit qui débordent, toit vert, bois sombre, poteaux fins, pilotis, massifs.
5. **Vue aérienne du lotissement** (`5_vue_aerienne_lotissement.png`, la référence du plan) — des **doigts de terre** entre des
   canaux parallèles ; dans chaque doigt une rue au milieu et des lots serrés des deux côtés ; chaque lot : la maison côté rue, la
   piscine (rectangle turquoise) et le jardin côté eau, un mur de quai, un ponton et un bateau blanc ; toits tous différents (gris,
   tuiles orange, blancs), maisons serrées, peu d'espace libre ; des bateaux qui passent avec un sillage blanc.
   → Le plan : lots étroits et profonds, maison contre l'allée, piscine et ponton côté eau, toits variés vus de dessus.

## Le constat (avant)

`avant_aerien_quartier.png`, `avant_aerien_photo5.png`, `avant_minimap.png` : des pâtés carrés coupés en deux lots de 31 × 15,5 u
tournés vers LEUR rue, séparés de l'eau par la rue des quais (x = 126, 168, 210, 252) et le quai ; trois immeubles gris ; des ponts
qui ne sont que la chaussée en dos d'âne (sauf l'orange). 16 villas (17 avec la villa Miami).

## Le plan V2 (phase 1)

Le quartier est une grille de pâtés de 31 u séparés par des rues de 13 u ; les canaux occupent les colonnes bx 10 et 12. Une villa
« les pieds dans l'eau » demande que le lot touche l'eau : **les rues des quais disparaissent dans le quartier**, et la terre entre
les canaux devient des doigts.

- **Le doigt central** (entre le canal ouest, x = 157, et le canal est, x = 221 : 64 u) : une allée au milieu (x 185 → 193), une
  rangée de lots de 28 u de profondeur de chaque côté, le jardin et le ponton sur le canal. Deux tronçons : au nord (z −35,5 → 35,5,
  de la rue nord à la rue du pont z = 42) et au sud (z 174,5 → 245,5, de la rue du pont z = 168 à la route du front de mer). Entre
  les deux, l'atelier « Marée Basse », la traverse et le garage du port restent tels quels, avec leurs rues.
- **La bande est** (entre le canal est, x = 241, et la route de bordure x = 294 : 46,5 u) :
  - au milieu (z 76 → 161,5, entre le bras est et la rue du pont z = 168), **un canal secondaire en impasse** le long de la route de
    bordure (x 275,5 → 287,5), branché sur le bassin du bras est, fini par un bassin de demi-tour : la bande devient un vrai doigt
    (deux rangées de lots de 14 u, une allée en impasse au milieu, une placette sur l'eau au bout, face au bras) ;
  - au nord et au sud, une rangée de lots de 21 u sur le canal est, une allée, et **les résidences de condos** derrière, en bordure
    est, jamais sur l'eau (elles ferment la perspective comme les tours de la photo 1).
- **La bande ouest** (entre la rue x = 84 et le canal ouest, au nord du pont z = 42) : **un canal secondaire en impasse** le long de la
  rue x = 84, branché sur le bassin du bras ouest : un doigt de deux rangées (le canal secondaire d'un côté, le canal ouest de
  l'autre), une allée en impasse finie par une placette au bord du bras.
- **La villa Miami** reprend toute la case (9,9) jusqu'au canal ouest (la rue du quai x = 126 y disparaît) : le plus grand lot, face
  à l'entrée de la traverse.
- **Rues retirées** (déclarées comme les autres : ni trafic, ni voiture garée, ni police) : x = 168 et x = 210 au nord et au sud du
  doigt central, x = 252 sauf au droit des ponts, x = 126 au nord du pont z = 42 et devant la villa Miami, les bouts de rue en
  impasse z = 0, 84, 126, 210 dans les colonnes bx 9, 11 et 13 où ils traversent les doigts. **Gardées** : tout ce qui porte un lieu
  ou un véhicule du relevé — x = 126 entre z = 42 et 84 (l'aquarium, la moto), z = 84 et z = 126 de la colonne bx 9 (la voiture
  musclée), les quais de la traverse et les rues de l'atelier et du garage du port, les deux rues des ponts, la rue nord, la route
  de bordure, le front de mer.
- **L'embarcadère public** quitte le canal ouest (il y aurait pris la place de deux villas) pour le quai nord de la traverse :
  une placette le long de l'eau, au bout de la rue z = 84 de l'atelier.

Nombre de lots : 10 (doigt central nord) + 10 (doigt central sud) + 5 + 14 + 5 (bande est) + 6 (bande ouest) + la villa Miami
= **51 villas**, contre 16 (+ Miami) avant : trois fois plus. Des résidences de condos en bordure est.

## Budget de performance (fixé avant de construire)

Mesuré comme pour la V1 (`perf_canaux.js` : navigateur sans carte graphique, 390 × 844, au centre du quartier en vue classique et
immersive, et en survol) : **appels de rendu ≤ +15 %** de la V1, **triangles ≤ +60 %** de la V1, **tick ≤ +1 ms**, **mémoire
des géométries ≤ +25 Mo**. Si le budget casse : moins de détail au loin, jamais moins de villas proches.

Référence V1 (mesurée sur la branche au départ) :

| Point | tick | rendu | appels | triangles |
|---|---|---|---|---|
| classique · rue x = 168 | 4,53 ms | 17,9 ms | 181 | 216 k |
| classique · rue x = 126 | 3,87 ms | 11,9 ms | 214 | 241 k |
| classique · centre (189, 140) | 3,28 ms | 9,7 ms | 152 | 215 k |
| immersive · rue x = 168 | 3,97 ms | 18,5 ms | 1 545 | 564 k |
| immersive · rue x = 126 | 3,93 ms | 15,7 ms | 1 117 | 515 k |
| immersive · centre | 2,76 ms | 13,6 ms | 1 642 | 555 k |
| survol du quartier | — | 28,0 ms | 1 994 | 708 k |

Géométries de la scène : 8 532, 151,0 Mo. Budget : appels ≤ 208 / 246 / 175 (classique), ≤ 1 777 / 1 285 / 1 888 (immersive),
≤ 2 293 (survol) ; triangles ≤ 346 k / 386 k / 344 k, ≤ 902 k / 824 k / 888 k, ≤ 1 133 k ; géométries ≤ 176 Mo.

## Décisions

1. **Les rues des quais disparaissent** dans le quartier (sauf où un lieu, une porte ou un véhicule du relevé en dépend) : c'est
   la seule façon de mettre chaque villa au bord de l'eau ; les villas donnent sur une allée ou sur une rue gardée.
2. **Deux canaux secondaires en impasse** (ouest et est), branchés sur les bassins des bras existants : ils ne croisent aucune rue
   (pas de nouveau pont routier) et font de chaque bande un doigt à deux rangées.
3. **L'embarcadère public** passe sur le quai nord de la traverse.
4. **Condos en bordure est** (derrière la rangée de villas du canal est), pas au nord : au nord, entre les têtes de canal, ils
   auraient pris des lots au bord de l'eau.

## Phase 1 — le plan (fait)

Code : `canauxDefinir` (rues retirées V2, canaux secondaires `secO`/`basSecO` et `secE`/`basSecE`, bandes de terre `bande*`, allées
`CANAUX.allees`), `CANAUX_ILOTS`, `canauxLotsV2`, `hacheLot`, `lotCanaux`, `dansAlleeCanaux` (juste avant `hauteurPont`) ; `solCanaux`
(une allée est au niveau de la rue) ; `mkCanaux` (les allées percent les dalles) ; `canauxGraphe` (les deux impasses) ; l'embarcadère
sur la traverse (`canauxNautiqueDefinir`) ; la Brigada sur ses grands lots (`canauxStartRunPrive`) ; `surChaussee` (un lot n'est pas
une chaussée). Les lots ont une maison provisoire (`villaProvisoireV2`) en attendant le générateur.

- [x] **51 villas** (50 lots + la villa Miami) contre 17 : trois fois plus. Dix rangées (`CANAUX_ILOTS`) : doigt central nord et
  sud (2 × 2 rangées de 28 u de profondeur, 5 lots chacune, un grand lot de 17,5 u en pointe), bande est (une rangée de 5 au nord et
  au sud, deux rangées de 7 dans le doigt du canal secondaire), bande ouest (deux rangées de 3). Lots de 12 à 17,5 u de large, la
  largeur tirée d'un hachage de la position (`hacheLot`, jamais `Math.random`). Chaque lot touche l'eau ET une allée ou une rue.
- [x] **Deux canaux secondaires en impasse** (12 u de large, bassins de demi-tour de 8 u), branchés sur les bassins des bras, intégrés
  à `dansCanal` (CANAUX.eaux) et au graphe des vedettes (6 nœuds de plus, tous dans l'eau, arêtes vérifiées tous les mètres).
- [x] **16 segments de rue retirés de plus** (28 en tout), déclarés comme les autres (ni trafic, ni voiture garée, ni police) ;
  8 allées et placettes au niveau de la rue, sans trafic (deux impasses finissent sur une placette au bord d'un bras).
- [x] Les marches devant un lot disparaissent (10 restent, sur les quais publics) : chaque ponton aura son échelle (phase 3).
- [x] L'embarcadère public est sur le quai nord de la traverse (`p1_aerien_photo5.png`).

### Mesures (phase 1)

- Relevé du périmètre : **aucun écart** ; empreinte du décor et tirage principal après le chargement : identiques.
- Police maritime dans les impasses (test « Canaux V2, canaux secondaires ») : 3 étoiles, le joueur au fond de l'impasse — une
  vedette l'y rejoint en 9,5 s (ouest) et 12,3 s (est), fait demi-tour au bout et ressort derrière lui ; coincée 1,2 s au plus.
- Tous les tests des canaux repassent (8 blocs) : réseau principal, rien de cassé (lieux, véhicules posés, 27 courses de taxi),
  police maritime, plan V2, impasses, nautique (embarcadère déplacé), joystick, villa Miami.

Captures : `p1_aerien_quartier.png`, `p1_aerien_photo5.png` (maisons provisoires).

## Phase 2 — le générateur de villas (fait)

Code (bandeau « LE BÂTI DES CANAUX », juste après `constructeurCanaux`) : `VILLA_V2_STYLES`, `VILLA_V2_PALETTES`, `aleaLot`,
`villasV2Plan` (style, palette, étages, miroir, modules de chaque lot), `VILLA_V2_MAISON` (une maison par style), `villaV2` (le lot
entier), `CONDOS_V2` / `condoV2`, `mkVillasV2`, `majNuitCanaux` ; `palmierV2` (palmier royal et cocotier) ; le constructeur gagne
`cone`, `tri`, `tronc`, `palme`. Les modèles V1 (`VILLA_CANAUX`, `villaCanaux`, `immeubleCanaux`, `pontonsCanaux`) sont retirés.

- [x] **Un générateur déterministe** : tout ce qu'une villa tire vient de sa graine (`hacheLot` de sa position → `aleaLot`, un
  générateur congruentiel), jamais `Math.random` ; le générateur de la ville et celui du décor ne voient rien (empreinte identique).
- [x] **Cinq styles** (10 villas chacun), chacun avec ses modules et **trois palettes** :
  - *moderne blanc* (photos 1 et 2) : cubes empilés, étage en porte-à-faux sur poteaux, baie vitrée sur le jardin, brise-soleil de
    lames de bois, garde-corps de verre du toit-terrasse, balcon à claustras, escalier extérieur, pont de teck sur le toit ;
  - *méditerranéen* (photo 3) : crépi pastel, tuiles en croupe, loggia à arcades sur le jardin, balcon à balustres, volets, auvent de
    tuiles sur la porte, tour d'angle (toujours sur un grand lot) ;
  - *tropical contemporain* : socle de pierre, dalles de toit qui débordent sur poteaux fins, bardage de bois sombre, grand vitrage,
    toit végétalisé, végétation qui déborde sur l'allée ;
  - *Art déco* : angles arrondis, bandeaux horizontaux, fenêtres à visières, hublot, fronton en gradins, néon discret la nuit ;
  - *bungalow des années 50* : plain-pied, toit bas à deux pans, mur de claustras de parpaings, jardinière fleurie.
- [x] **1 à 3 niveaux** (bungalow : 1 ; tropical : 2 au plus ; un grand lot : 2 ou 3), **en miroir** (allée de garage d'un côté ou de
  l'autre). Deux voisines **jamais du même style** (une permutation des cinq styles par rangée), donc jamais de la même palette ;
  16 silhouettes en tout, au moins quatre sur six voisines (test).
- [x] **Côté eau** : pelouse, terrasse au pied de la maison, piscine (rectangle, en L, à débordement face au canal, à plage
  immergée ; sur un lot étroit, un couloir de nage le long de l'allée de garage), transats, parasol, cuisine d'été, foyer (il
  rougeoie la nuit), hamac, massifs de bougainvilliers, rocaille, palmiers royaux et cocotiers penchés vers l'eau, couronnement du
  mur de quai (béton blanc ou moellons). 53 piscines (`BASSINS` : on y nage).
- [x] **Côté allée** : muret à piliers devant la maison, allée pavée, la voiture garée au fond de l'allée de garage (le portail
  reste dégagé ; voiture de luxe sur les grands lots ; une voiture du décor est un obstacle), boîte aux lettres, palmier
  d'alignement. Haies mitoyennes solides (on ne passe pas d'un jardin à l'autre) ; le passage à pied de l'allée au quai reste libre.
- [x] **La Brigada** : sa limousine et son SUV sur l'allée de garage des deux grands lots de la pointe nord (`l.parking`), deux
  gardes devant la porte (`l.portail`).
- [x] **Trois condos** de 6 à 8 niveaux en bordure est, derrière les villas (balcons filants, verre teinté, piscine et ascenseur
  sur le toit, marquise, palmiers) ; aucun canal juste derrière eux (test).
- [x] **La nuit** : les fenêtres allumées (une sur deux environ), les néons Art déco et les foyers dans une seconde géométrie par
  rangée (`_MAT_FEN_CANAUX`, opacité qui suit la nuit) ; l'eau des piscines s'éclaire un peu.
- [x] Les palmiers (ceux des villas, des quais et du jardin de la villa Miami) sont redessinés : vraies palmes arquées
  (lanières à deux faces), tronc à cinq pans, courbe et annelé pour le cocotier, gaine verte du palmier royal ; même coût qu'avant.

Décisions :

5. **La voiture garée au fond de l'allée de garage** (4,2 u de l'allée) : l'entrée reste libre, une voiture du joueur peut s'y
   engager (test au joystick sur les allées de garage vides).
6. **Un bassin de demi-tour qui entame un lot** (bout des deux canaux secondaires) : la villa entière recule d'autant
   (`l.entaille`), la bande entamée reste un quai dallé. Sans ça, la pelouse recouvrait l'eau du bassin et deux haies y plongeaient.
7. **Les voitures garées au hasard (startRun) décident comme avant le quartier** : une place candidate dans le quartier ne
   regarde ni les volumes ni les canaux (la rue d'origine), puis `canauxNettoyerVehicules` retire un véhicule mal placé — désormais
   aussi sur la pelouse d'un lot. Trouvé par le relevé : les nouveaux volumes changeaient le nombre de tirages, 13 véhicules
   garés ailleurs dans la ville (plage, désert, centre) avaient disparu.

### Mesures (phase 2)

- Relevé du périmètre : **aucun écart** (après la décision 7) ; empreinte du décor et tirage principal : identiques.
- Construction des villas : `CANAUX.tVillas` ; géométrie : une par rangée (jour) et une par rangée (nuit).
- Performance, phase 1 contre phase 2, **dans les mêmes conditions** (la machine était plus chargée que lors des mesures de
  référence : les temps de tick sont ×3 sur les deux versions, seules les proportions comptent) :

| Point | Phase 1 : appels / triangles | Phase 2 : appels / triangles |
|---|---|---|
| classique, rue x = 168 | 177 / 174 k | 181 / 179 k |
| classique, centre | 178 / 184 k | 180 / 199 k |
| immersive, rue x = 168 | 1 568 / 547 k | 1 544 / 563 k |
| immersive, centre | 1 680 / 568 k | 1 646 / 572 k |
| survol du quartier | 1 964 / 680 k | 1 935 / 748 k |
| géométries de la scène | 146,6 Mo | 155,3 Mo |

  Par rapport à la V1 (budget) : survol 708 k → 748 k triangles (+6 %), appels en baisse, 151 → 155 Mo : dans le budget.
- Tests : « Canaux V2 : les villas » (nouveau) ; le plan, les impasses, le nautique (Brigada), le réseau, rien de cassé, la police,
  le joystick et la villa Miami repassent.

Captures : `p2_aerien_quartier.png`, `p2_aerien_doigt_nord.png`, `p2_aerien_est.png`, `p2_villas_canalE.png`,
`p2_villas_canalO.png`, `p2_villas_allee.png`, `p2_villas_secE.png`, `p2_palmiers_proche.png`, `p2_bassin_secE.png`,
`p2_bassin_secO.png`, `p2_nuit_villas.png`, `p2_nuit_aerien.png`.

Observation (non corrigée, déjà là en V1) : la route de bordure est (x ≈ 288–300) est recouverte par le fondu de sable du désert de
l'aéroport : vue de dessus, la berge est du canal secondaire est paraît une plage.

## Phase 3 — pontons accessibles et bateaux des villas (fait)

Code : `BATEAUX_V2`, `pontonsV2` (des données, appelée par `canauxDefinir` après le nautique), `hauteurPonton`, `eauNavProche`,
`echelleProche` (juste après `dansAlleeCanaux`) ; `coqueDecorV2`, `bateauDecorV2`, `matBateauxCanaux`, `mkPontonsV2` (juste avant
`mkBatiCanaux`) ; `rivePlusProche` (marches OU échelle) ; `canauxStartRunPrive` (les pilotables) ; `majVehiculePhys` (un bateau
glisse le long d'un ponton, sort d'un ponton où il serait entré) ; `sortirVehicule` (le point de débarquement) ; le constructeur
gagne un `vers` pour `tri`.

- [x] **46 pontons privés** (les 4 lots qu'un bassin de demi-tour entame n'en ont pas : leur quai donne sur le bassin), un par
  lot, sur son mur de quai : 31 flottants le long du quai, 4 en L, 11 en T (passerelle de 1 u qui descend du quai au flotteur —
  `hauteurPonton`). Platelage de bois ou de composite et ses joints, pieux à chapeau blanc, taquets, bornes basses allumées la nuit,
  échelle ; sur les grands lots et quelques T, une cabane à claustra (photo 2) ; quelques petits bateaux hissés sur un élévateur.
- [x] **Accessibles pour de vrai** : chaque flotteur est relié au quai (testé du flotteur au quai : ni eau ni marche de plus de
  0,6) ; le quai d'un lot (1,4 u le long de l'eau, les haies s'arrêtent avant) mène au passage à pied, puis à l'allée. Un pilote
  simulé accoste au joystick à trois pontons tirés au hasard, débarque, et rejoint l'allée À PIED au joystick.
- [x] **Une échelle à chaque ponton** (`CANAUX.echelles`) : sur le bord extérieur, ou au bout du flotteur le plus loin du bateau
  amarré (sinon le bateau la cache au nageur). `rivePlusProche` prend la plus proche des marches et des échelles. Un nageur sort de
  l'eau devant un lot de chaque rangée et devant chaque lot à bateau pilotable (17/17, 6,7 s au plus) ; devant chacun des 50 lots,
  une échelle ou des marches à portée et dégagées.
- [x] **Le chenal** : mesuré à chaque mètre de chaque canal à rives de lots (eau navigable autour de l'axe) — 10,8 u au moins dans
  le canal ouest, 10,5 dans le canal est, 9,5 et 6,5 dans les impasses (exigé : 10,5 à deux rives, 6,5 dans une impasse). Le placement
  le garantit : la rive d'en face garde toujours la place d'un ponton à quai ; sinon le bateau rapetisse, puis le ponton redevient
  « à quai ». À hauteur d'un carrefour, un ponton à quai et rien d'amarré (décision 10).
- [x] **26 pontons sur 46 ont un bateau (57 %)** : 21 du décor — 2 yachts à moteur (les grands lots), 4 sportfishing à tour de
  pêche, 2 day-cruisers, 4 voiliers (mât de 12 u, feu de tête de mât la nuit), 2 opens à T-top, 2 petits, 5 quais à jet-skis — et
  5 pilotables. Jamais de gros bateau dans une impasse. Les bateaux du décor : une coque lissée section par section (bordé, liseré,
  carène, pont, tableau arrière) et leur superstructure, quelques centaines de triangles chacun, tous dans UNE géométrie qui berce
  (`_MAT_BATEAUX_CANAUX` : chaque sommet connaît le centre de son bateau et sa phase) ; un mur pour un bateau (`CANAUX.amarres`).
- [x] **Pilotables** (`CANAUX.pilotables`, créés à chaque partie) : une vedette « Sirène » dans chaque canal principal et trois
  jet-skis (canal ouest, canal est, impasse est) — emplacements dans « Restitution ». Un pilote simulé fait l'aller-retour de la
  vedette la plus proche d'un bassin dans chaque canal (graphe des vedettes, demi-tour dans le bassin, retour à son ponton).

Décisions :

8. **Le bateau amarré le long du flotteur, côté chenal** (le brief dit « le long du ponton, côté quai » pour qu'il ne mange pas le
   chenal) : avec des pontons flottants le long du quai, il n'y a pas de place côté quai ; c'est la largeur du chenal qui est
   garantie et vérifiée (10,5 u), mesurée bateaux compris.
9. **Les lots entamés par un bassin n'ont pas de ponton** (4) : leur quai est celui du bassin, où l'on ne peut pas amarrer sans
   gêner le demi-tour des vedettes.
10. **Aux carrefours** (à 6 u d'une traverse ou d'un bras qui débouche, sur les deux rives) : un ponton à quai et rien d'amarré.
    Trouvé par la suite : une vedette qui tournait large de la traverse vers le canal est se coinçait entre le quai et le flotteur
    d'un ponton en T. La V1 n'y posait aucun ponton ; la V2 garde un ponton par villa, sans bateau.
11. **Plus jamais coincé contre un ponton** : l'eau entre le quai et le flotteur d'un ponton en L ou en T est un mur pour un bateau
    (de l'eau pour un nageur) ; un bateau dont le centre s'est retrouvé dans un ponton ou un bateau amarré glisse vers l'eau libre
    la plus proche (`eauNavProche`) ; contre un ponton ou un bateau amarré, il glisse le long au lieu de s'arrêter net. **Les murs
    de quai gardent le rebond et les dégâts de la V1** (limite connue de la V1 : « à jouer sur iPhone avant d'amortir quoi que ce
    soit »).
12. **Le débarquement** sur un ponton se fait du côté du flotteur opposé au bateau : posé dans la « boîte » du jet-ski amarré, le
    joueur ne pouvait plus faire un pas.

## Phase 4 — des ponts tous différents, des passerelles (fait)

Code (juste avant `mkPontCanal`) : `STYLES_PONTS`, `peindreRoutePont`, `bandePont`, `archePont`, `lanternePont`, `decoPontV2` ;
`passerellesV2` (des données, dans `canauxDefinir`), `passerelleCanal`, `hauteurPasserelle`, `mkPasserelleV2`. `mkPontCanal` lit le
style ; `solCanaux`, `estEau`, les apparitions, `canauxNettoyerVehicules`, `majCanaux` (le tablier qui s'efface) et la carte
connaissent les passerelles.

- [x] **Six ponts, six styles** (le décor de chacun est dans le groupe de son tablier : il s'efface avec lui) :
  - *pont-levis* (sud-ouest, l'orange, gardé et toujours fixe) : tablier d'acier orange à deux volées (la jointure au milieu),
    portique et contrepoids, cabine de l'éclusier sur le quai (un vrai volume), barrières levées rayées rouge et blanc, feux ;
  - *vénitien* (nord-ouest) : arche de béton blanc sous le tablier (tympans), balustres et main courante, lanternes aux deux
    bouts et à la clé ;
  - *promenade Art déco* (nord-est) : larges trottoirs roses, garde-corps menthe à bandeaux roses et hublots, jardinières à
    palmiers aux quatre coins, lampadaires rétro à globes ;
  - *bois tropical* (sud-est) : platelage de planches, pieux sous le tablier, garde-corps de bois, cordage, torches tiki ;
  - *pont de la plage* (front de mer, sud-ouest) : rives blanches, garde-corps d'acier bleu, pavillons, lanternes ;
  - *pont de pierre* (front de mer, sud-est) : pavés, deux arches de pierre et l'avant-bec du pilier, lanternes de fer.
- [x] **Trois passerelles piétonnes** (`CANAUX.passerelles`, en dos d'âne, 3,6 u de large, tirant d'air 3,2 u au milieu) :
  arche blanche sur le bras ouest (de la placette du doigt ouest au quai nord), bois sur pieux sur le bras est (de la placette du
  canal secondaire est au quai nord), acier léger à treillis bleu sur la traverse (de la rue de l'atelier à celle du garage).
  Praticables à pied et à vélo (pente 0,25 à 0,34), l'eau navigable dessous ; **trois bornes à chaque bout** (1,5 u d'écart : une
  voiture ne passe pas, un vélo ou une moto si) et des jardinières le long des rampes à terre (on n'y monte pas par le côté).

Décisions :

13. **Six ponts, pas quatre.** Le brief parle des « 4 ponts routiers » ; le quartier en a six (les quatre des canaux et les deux du
    front de mer). Les quatre styles demandés vont aux ponts des canaux (le levis orange reste au sud-ouest) ; les deux du front de
    mer reçoivent deux styles de plus (plage, pierre) : six ponts, six silhouettes.
14. **Le profil validé est gardé pour tous** (`hauteurPont` : dos d'âne, plateau de 5 u, 2,7 u). Le « tablier plat » de la
    promenade Art déco aurait demandé des rampes plus raides (une voiture décollait) ou un tirant d'air plus bas ; elle se
    distingue par ses trottoirs, son garde-corps et ses palmiers.
15. **Aucun piéton ne naît sur une passerelle** (ni sur un ponton ni sur une marche) : le test des 500 apparitions comptait
    « dans l'eau » un piéton né sur le tablier d'une passerelle, au-dessus d'un bras.

## Phase 5 — la vie, la nuit, les sons (fait)

Code (bloc juste avant les pontons construits) : `CVIE`, `chienCanaux`, `canauxVieConstruire` (à la 1re partie, sur le générateur
privé de `canauxStartRun`), `canauxLumieresNuit`, `canauxVieStartRun`, `majCanauxVie` (dans `majCanaux`), `CANAUX_SON`,
`canauxSonStart` / `canauxSonStop` / `majCanauxSon` (dans la boucle, après `majMontSon`) ; `villaV2` note la place d'un bronzeur et
d'un cuisinier (`l.vie`).

- [x] **Figurants** (tous par `figurant()` : touchés, ils paniquent et deviennent des piétons ; ils reviennent à la partie
  suivante) : 4 bronzeurs allongés sur un transat, 3 barbecues aux cuisines d'été, 3 laveurs de bateau sur le ponton (brosse), 3
  pêcheurs au bout d'un ponton (canne), 2 enfants qui sautent du ponton et remontent, 1 joggeur qui fait des allers-retours sur le
  pont de la promenade, 3 promeneurs de chien dans les allées. Posés à leur place dès leur création, cachés loin du quartier
  (130 u), animés seulement de près (90 u).
- [x] **Deux bateaux qui circulent** : un open sur la traverse, un jet-ski et son pilote dans le canal est ; aller-retour, demi-tour
  au bout, **ils s'arrêtent devant le joueur** (11 u, à pied, à la nage ou à bord). Décor : ils ne sont pas des véhicules.
- [x] **L'eau** : un turquoise plus clair que la mer (0x8fd2e2 → 0xa2ece6) ; les ombres des pontons et des bateaux sur l'eau (un
  maillage translucide) ; les bateaux du décor bercent dans le shader (phase 3).
- [x] **La nuit** : fenêtres chaudes, néons et foyers (phase 2), bornes des pontons, lanternes des ponts et passerelles, feu de
  tête de mât, cabines des yachts ; **flaques de lumière** sous les bornes et les lanternes (un seul maillage additif) ; les
  piscines s'éclairent ; une **fête** dans une villa moderne (guirlande de couleurs, `CANAUX.fete`).
- [x] **Les sons** : clapot contre les quais (plus fort au bord de l'eau), un hors-bord au loin, les drisses des voiliers qui
  tintent (à moins de 28 u d'un voilier), la fête la nuit (basse et accords étouffés). Hasard des sons sur un générateur propre ;
  coupés en salle, à la mort (`mourir`) et à chaque partie (`startRun`).

Décision :

16. **Les caches partagés rendus tels quels** : les figurants sont construits avec le corps du jeu (`makeHumain`), qui met ses
    couleurs dans le cache de `mat()` et ses visages dans `VIS_CACHE`. Une salle construite ensuite y trouvait un matériau déjà
    fait, créait un objet Three.js de moins et tirait un uuid de moins : le relevé a vu 21 véhicules garés ailleurs dans la ville
    changer de place (la divergence apparaissait à la première visite du bowling). `canauxVieConstruire` note les clés des deux
    caches et retire à la fin celles qu'il a ajoutées.

## Phase 6 — la carte, ce qui recouvrait l'eau, les performances (fait)

- [x] **La carte comme la vue aérienne** (`dessinerCanauxCarte`, faite au fil des phases 2 à 4) : les jardins lot par lot, les toits
  à la couleur de leur style (les toits plats des villas modernes en gris béton), l'ombre des maisons, les piscines, les condos et
  leur piscine sur le toit, les pontons, les bateaux amarrés et pilotables, les passerelles, chaque pont à la couleur de son style
  (le levis orange, le bois, la pierre). Captures : `final_minimap.png`, `final_grande_carte.png` (avant : `avant_v1_minimap.png`,
  `avant_v1_grande_carte.png`, `avant_minimap.png`).
- [x] **Rien ne recouvre l'eau** (trouvé en regardant ta capture iPhone de nuit `canaux_refs/v3/F_2D_nuit_bassin_est_recouvert.png`,
  et visible sur ma propre capture `p2_bassin_secE.png`, que j'avais à tort attribuée à la seule route de bordure) : la dalle du
  désert de l'aéroport (`mkAeroport`, une boîte de 320 × 570 u dont le bord ouest est à x = 277, 10 u sous le bord est de la ville,
  à 0,011) passait AU-DESSUS de l'eau (−0,6) du bassin du bras est (déjà en V1) et du canal secondaire est (V2). Le lancer de rayon
  d'un premier sondage ne la voyait pas (`Raycaster` sans `scene.updateMatrixWorld(true)` : les matrices ne sont calculées qu'au
  rendu). `percerDesertCanaux` (dans `mkCanaux`, sur son générateur privé) refait le dessus de la dalle percé aux contours de
  l'eau, comme le plan d'asphalte de la ville (mêmes coordonnées de texture ; ses faces de côté, à 1 cm du sol, ne se voient pas).
  Test « Canaux V2 : rien ne recouvre l'eau » : 5 369 points d'eau du quartier balayés par un rayon vertical sur la scène réelle —
  **362 points recouverts avant, aucun après**. Captures `fix_desert_secE.png`, `fix_desert_basE.png`, `fix_desert_est_nuit.png`.
  Ce qui reste de ton brief V3 (les routes de bordure sous le sable, les jonctions désert / ville / plage, la bande verte, les
  traits blancs des embouchures) n'est PAS traité ici : c'est le chantier V3, je n'y ai pas touché.
- [x] **Captures finales** (390 × 844, mêmes cadrages sur la V1 — `avant_v1_*` — et sur la V2 — `final_*`) : vue aérienne façon
  photo 5 (`*_aerien_photo5.png`), le canal ouest vu depuis l'eau façon photo 1 (`*_canal_photo1.png`), une villa moderne blanche,
  sa piscine et son ponton façon photo 2 (`*_villa_photo2.png`, `final_villa_photo2b.png`), une villa méditerranéenne façon photo 3
  (`*_medit_photo3.png`, `final_medit_photo3b.png`), la nuit (`*_nuit_aerien.png`, `final_nuit_fete.png`), les figurants
  (`final_vie_peche.png`, `final_vie_laveur.png`, `final_vie_bbq.png` : le pêcheur au bout de son ponton, le laveur de bateau, le
  barbecue de la cuisine d'été, un bronzeur au bord de la piscine).

- [x] **Un test qui ne maîtrisait pas sa scène** (trouvé par la suite complète : « bateaux pilotables » passait seul et échouait dans
  la suite) : le pilote simulé partageait les canaux avec les vedettes de patrouille de la police maritime, qui tournent sans
  étoile ; selon l'état laissé par les tests précédents, l'une croisait sa route (126 de dégâts) — ou le décoinçait. Le test
  retire désormais, à chaque pas, tout véhicule conduit par l'IA. L'échec est alors devenu déterministe, et il était réel : au
  demi-tour du bassin du bras est, la vedette posait son nez contre le mur courbe et le pilote reculait tout droit de 0,5 u pour
  repartir dans le même mur. Le pilote recule désormais en braquant (la poupe part à l'opposé de la route) et fait son demi-tour
  sur un vrai cercle de 12 points ; rejoué sur quatre graines : 2/2 allers-retours à chaque fois. Le mur du bassin est celui de la
  V1 : un joueur qui s'y plante recule en braquant, comme le pilote. Rejouée, la suite échouait encore au même point : la
  curiosité « Volant du Dépôt », gagnée par un test précédent, donne +15 % d'accélération à TOUT véhicule du joueur, bateaux
  compris ; la vedette arrive trop vite dans le bassin et se plante (reproduit seul : sans elle 2/2, avec elle 1/2, même point).
  Le test neutralise la curiosité le temps de son pilote et la rend ensuite (le motif du test d'armes qui rend un pistolet nu) ;
  rejoué seul avec la curiosité posée : 2/2, et elle est rendue. **Limite à jouer sur iPhone** : avec le Volant, une vedette
  lancée trop vite dans un bassin peut se planter contre son mur courbe et ne s'en dégage qu'en reculant longtemps.

### Mesures (phase 6)

Même outil et mêmes points que la référence (`perf_canaux.js` : navigateur sans carte graphique, 390 × 844, vraie boucle ; les
temps ne valent que comme proportions : deux passes de la MÊME version ont donné 18 puis 117 ms de rendu en survol — la machine
était chargée par moments). Appels de rendu et triangles, eux, sont stables d'une passe à l'autre.

| Point | V1 : appels / triangles | V2 : appels / triangles | Budget (appels / triangles) |
|---|---|---|---|
| classique · rue x = 168 | 181 / 216 k | 185 / 209 k | 208 / 346 k |
| classique · rue x = 126 | 217 / 241 k | 168 / 201 k | 246 / 386 k |
| classique · centre (189, 140) | 152 / 215 k | **184** / 228 k | **175** / 344 k |
| immersive · rue x = 168 | 1 557 / 564 k | 1 686 / 614 k | 1 777 / 902 k |
| immersive · rue x = 126 | 1 095 / 493 k | 1 158 / 518 k | 1 285 / 824 k |
| immersive · centre | 1 673 / 579 k | 1 766 / 627 k | 1 888 / 888 k |
| survol du quartier | 2 081 / 749 k | 2 233 / 798 k | 2 293 / 1 133 k |
| géométries de la scène | 152,0 Mo | 160,1 Mo | 176 Mo |

- Tick (ms, deux passes, V1 → V2) : classique 4,34 → 5,00 et 4,43 → 3,85 (x = 168), 3,48 → 3,94 et 3,45 → 3,40 (x = 126),
  3,37 → 3,04 et 3,21 → 2,66 (centre) ; immersive 3,65 → 3,59, 4,24 → 3,66, 3,48 → 2,97 (1re passe). Dans le bruit, sous +1 ms.
  Une valeur de la 2e passe (immersive · centre, 9,0 ms, avec 40 ms de rendu au même moment) est un pic de charge de la machine.
- **Un dépassement, gardé tel quel (décision 18)** : en vue classique au centre (189, 140), 184 appels pour un budget de 175. Le
  détail, mesuré : sans aucun véhicule, le décor du centre coûte 163 appels contre 156 en V1 (+4,5 %) ; le reste est **la vedette
  de l'embarcadère** (25 appels), que la décision 3 a mise sur le quai nord de la traverse, dans le champ de ce point de mesure.
- Triangles : +4 à +9 % selon le point (budget +60 %) ; mémoire des géométries : +8 Mo (budget +25 Mo).

Décisions :

17. **La dalle du désert est percée, pas déplacée** : la rétrécir à sa création aurait changé l'entrée `SOLS` du désert, donc les
    bandes de transition entre sols (et leurs tirages) : la ville aurait bougé. Percer son dessus à la fin du décor, sur le
    générateur privé des canaux, ne change rien ailleurs (empreinte et relevé identiques).
18. **Le budget d'appels du centre en vue classique est dépassé de 9, et je ne l'ai pas maquillé** : déplacer la vedette de
    l'embarcadère pour la sortir du champ de mesure ne gagnerait rien en jeu (elle coûte la même chose ailleurs). Ce point est à
    regarder sur iPhone (priorité 1 ci-dessous).

## Phases

- [x] Phase 1 — plan des lots et des doigts, canaux secondaires, allées, relevé du périmètre
- [x] Phase 2 — générateur de villas, jardins côté eau, côté rue
- [x] Phase 3 — pontons accessibles et bateaux des villas
- [x] Phase 4 — les ponts et les passerelles
- [x] Phase 5 — vie, ambiance, nuit, sons
- [x] Phase 6 — carte et performances

## Restitution

### Ce qui a changé, et où

- `index.html` (branche `canaux-v2` : un commit par phase — les phases 3 à 5 ensemble — et deux correctifs) — tout dans la section **LES CANAUX DE LOS REYES** et
  ses voisines : le plan (`canauxDefinir`, `CANAUX_ILOTS`, `canauxLotsV2`, allées, deux canaux secondaires, rues retirées) ; le
  générateur de villas (`VILLA_V2_*`, `aleaLot`, `villasV2Plan`, `villaV2`, `palmierV2`, `CONDOS_V2`, `condoV2`, `mkVillasV2`, la
  nuit `majNuitCanaux`) ; les pontons et bateaux (`BATEAUX_V2`, `pontonsV2`, `mkPontonsV2`, `bateauDecorV2`, `matBateauxCanaux`,
  `hauteurPonton`, `echelleProche`, `eauNavProche`) ; les ponts et passerelles (`STYLES_PONTS`, `decoPontV2`, `passerellesV2`,
  `mkPasserelleV2`) ; la vie (`CVIE`, `canauxVieConstruire`, `majCanauxVie`, `CANAUX_SON`) ; la carte (`dessinerCanauxCarte`) ; la
  dalle du désert (`percerDesertCanaux`, `mkAeroport.desert`). Hors section, des retouches ciblées : `startRun` (voitures garées au
  hasard), `majVehiculePhys` (un bateau sort d'un ponton où il serait entré, glisse le long d'un ponton), `sortirVehicule` (le
  débarquement sur un ponton), `rivePlusProche` (les échelles), l'apparition des piétons (ni ponton ni passerelle),
  `canauxNettoyerVehicules`.
- `scenarios.js` : sept blocs « Canaux V2 » (le plan, canaux secondaires, rien ne recouvre l'eau, les villas, pontons et bateaux —
  avec « sortir à la nage » et « bateaux pilotables » —, les ponts, les passerelles, la vie) ; des tests V1 du quartier ajustés
  à la V2 sans rien perdre (le profil d'une passerelle au-dessus d'une allée, le mur de quai cherché là où il n'y a pas de ponton,
  la distance d'une amarre de ponton).
- `CLAUDE.md` : la section « Canaux de Los Reyes » (sous-section « Canaux V2 »), la carte du fichier et ses ancres.
- `rapport_nuit/CANAUX_V2.md` (ce suivi) et `rapport_nuit/captures/canaux_v2/` (avant, phases, finales).

### Les villas : styles et modules

Cinq styles, dix villas chacun, trois palettes chacun, 1 à 3 niveaux, en miroir, deux voisines jamais du même style (16 silhouettes
différentes relevées par le test) : **moderne blanc** (cubes, toits plats débordants, bandeaux de bois, grandes baies, garde-corps
de verre), **méditerranéen** (crépi pêche, sable ou rose, tuiles, arcades, balcons, volets), **tropical contemporain** (bois sombre,
pierre, toit plat vert ou blanc très débordant), **Art déco** (pastel, bandeaux blancs, hublots, enseigne néon la nuit), **bungalow
des années 50** (un niveau, toit à faible pente, brique et bardage). Côté eau : pelouse, terrasse, piscine (rectangle, en L, à
débordement, à plage immergée, couloir de nage), transats, parasol, cuisine d'été, foyer, hamac, palmiers (royal ou cocotier),
bougainvilliers, couronnement du quai. Côté allée : muret à piliers, allée pavée, voiture au fond de l'allée de garage (libre jusqu'à
elle : une voiture du joueur y entre), boîte aux lettres. Trois condos de 6 à 8 niveaux en bordure est. 53 piscines.

### Les comptes, et où

- **51 villas** (V1 : 17) — 50 lots + la villa Miami. Rangées : doigt central nord, rive ouest (`midNO`, 5) et est (`midNE`, 5) ;
  doigt central sud (`midSO`, `midSE`, 5 + 5) ; bande est nord (`estN`, 5) et sud (`estS`, 5) ; le doigt du canal secondaire est
  (`estMO` sur le canal est, `estME` sur l'impasse, 7 + 7) ; le doigt du canal secondaire ouest (`ouestE` sur le canal ouest,
  `ouestO` sur l'impasse, 3 + 3). Quatre grands lots en pointe des doigts : `midNO-0` et `midNE-0` (la Brigada, au nord),
  `midSO-4` et `midSE-4` (au sud, un yacht à moteur chacun).
- **46 pontons privés** (31 à quai, 4 en L, 11 en T), une échelle chacun ; les quatre lots entamés par un bassin de demi-tour n'en
  ont pas (`estME-5`, `estME-6`, `ouestO-1`, `ouestO-2`). Le ponton de la villa Miami (V1) est inchangé.
- **26 bateaux amarrés aux pontons (57 %)** : 21 du décor — 2 yachts à moteur (`midSO-4`, `midSE-4`), 4 sportfishing (dont
  `midNO-4`, `midNE-0`), 2 day-cruisers (dont `estN-3`), 4 voiliers (dont `midNE-1`, `midNE-4`, `midSE-3`), 2 opens (dont
  `midSE-2`), 2 petits bateaux, 5 quais à jet-skis (dont `estME-2`) — et **5 pilotables** : une vedette « Sirène » au ponton de
  `ouestE-0` (canal ouest) et une à celui d'`estMO-6` (canal est), trois jet-skis à ceux de `midNO-3` (canal ouest), `midSE-0` (canal
  est) et `estME-3` (canal secondaire est). Deux bateaux du décor circulent (un open sur la traverse, un jet-ski dans le canal est).
  Le nautique de la V1 (embarcadère, atelier « Marée Basse », Brigada, vedette et jet-skis de l'embarcadère) est gardé.

### Les ponts et les passerelles

| Pont | Où | Style |
|---|---|---|
| nord-ouest | canal ouest, rue z = 42 | vénitien (arche blanche, balustres, lanternes) |
| nord-est | canal est, rue z = 42 | promenade Art déco (trottoirs roses, garde-corps menthe, palmiers en jardinières, globes) — le joggeur |
| sud-ouest | canal ouest, rue z = 168 | pont-levis orange (gardé, fixe ; cabine de l'éclusier, contrepoids, barrières) |
| sud-est | canal est, rue z = 168 | bois tropical (platelage, pieux, cordage, torches tiki) |
| plage ouest | embouchure ouest, front de mer | pont de la plage (rives blanches, garde-corps bleu, pavillons) |
| plage est | embouchure est, front de mer | pont de pierre (pavés, deux arches, avant-bec) |

Passerelles (à pied et à vélo, voitures arrêtées par trois bornes à chaque bout, eau navigable dessous, sur la carte) : **arche
blanche** sur le bras ouest, **bois sur pieux** sur le bras est, **acier à treillis bleu** sur la traverse.

### Les canaux secondaires, et pourquoi

Deux impasses de 12 u, chacune finie par un bassin de demi-tour de 8 u : **ouest** (x 90,5 → 102,5, du bassin du bras ouest au
bassin (99, 26)) et **est** (x 275,5 → 287,5, du bassin du bras est au bassin (279,5, 150)). Sans elles, les bandes de terre à
l'ouest du canal ouest et à l'est du canal est n'avaient qu'une rive : une seule rangée de villas « les pieds dans l'eau », l'autre
rangée sur une rue. Avec elles, chaque bande devient un doigt à deux rangées, comme sur la photo 5. Elles ne croisent aucune rue
(aucun nouveau pont routier), sont dans `dansCanal` et dans le graphe des vedettes (une vedette de police y entre, fait demi-tour au
bout et ressort), et n'accueillent jamais un gros bateau.

### Les décisions prises seul

1 à 4 (plan), 5 à 7 (villas), 8 à 12 (pontons et bateaux), 13 à 15 (ponts et passerelles), 16 (les caches partagés), 17 et 18
(le désert, le budget) : chacune est écrite, avec sa raison, dans la phase où elle a été prise, plus haut.

### Les vérifications

1. **Le plan** : 51 villas, chacune les pieds dans l'eau et sur une allée ou une rue ; rien dans l'eau ni sur la chaussée.
2. **Les villas** : cinq styles, voisines différentes, silhouettes, jardin côté eau, façade côté allée, allée de garage praticable.
3. **Les pontons** : tous reliés au quai, chenal mesuré (10,8 / 10,5 / 9,5 / 6,5 u), trois accostages au joystick sur trois
   pontons tirés au hasard puis l'allée rejointe à pied, 17 nageurs sortis par une échelle ou des marches, devant chacun des 50
   lots une sortie à portée.
4. **Les bateaux pilotables** : un aller-retour au joystick par canal principal (au bassin et retour).
5. **Les ponts** : 12 traversées en voiture sans saut, 12 passages de bateau dessous ; **les passerelles** : à pied, à vélo, voiture
   refusée, jet-ski dessous (6/6 chacun).
6. **La vie** : figurants par sorte, bateaux qui circulent et s'arrêtent devant le joueur, son démarré au bord de l'eau et coupé à la
   mort, fête la nuit.
7. **Rien ne recouvre l'eau** : 5 369 points d'eau balayés, aucun recouvert (362 avant le correctif).
8. **Les tests des canaux V1, de la police maritime, de la villa Miami et du joystick réel** repassent (vedettes et jet-skis au
   vrai joystick, 500 piétons nés dans le quartier).
9. **Relevé du périmètre** (`releve_canaux.js`, comparé à `canaux_avant.json`) : **aucun écart** après chaque phase ; les retraits
   justifiés (kiosques du port) sont ceux de la V1. **Empreinte du décor** (931930327, portes, chalet) et **tirage principal**
   identiques.
10. **`valider.js`** : toutes les vérifications passent.
11. **La suite complète** `scenarios.js` (graine 20260731) : **841 vérifications sur 842, aucune sautée, aucune erreur JS** ; la
    seule en échec, « bateaux pilotables », est expliquée et corrigée plus haut (phase 6), puis repassée seule dans la condition
    exacte de la suite (curiosité posée) et sur quatre graines. **La suite complète n'a pas été relancée une troisième fois** après
    ce dernier correctif (il ne touche que ce test ; une passe dure environ une heure).
12. **Captures** réelles 390 × 844 aux mêmes cadrages que la V1 (paires `avant_v1_*` / `final_*`).

**Non vérifié, et qui ne peut l'être ici** : les performances réelles et le ressenti sur iPhone (mesures sans carte graphique, les
temps ne valent que comme proportions) ; l'équilibre des sons (clapot, hors-bord, drisses, fête) — joués, coupés et testés, jamais
écoutés ; le scintillement éventuel propre à un GPU d'iPhone (les surfaces proches : eau du canal, ombres des pontons à −0,55,
dalles) ; le confort de l'accostage au doigt.

### À regarder en priorité sur l'iPhone

1. **La fluidité au-dessus du quartier**, en vue immersive et en survol (+6 à +7 % d'appels, +7 à +9 % de triangles par rapport
   à la V1), et au **centre en vue classique** (184 appels contre 152 : la vedette de l'embarcadère y est dans le champ).
2. **Les bateaux du décor qui bercent** (un seul maillage, une onde par sommet dans le shader) et l'eau turquoise : propres, ou
   tremblotants ?
3. **Accoster au doigt** à un ponton privé, débarquer, rejoindre l'allée à pied ; **sortir à la nage** par une échelle.
4. **Une vedette lancée dans un bassin de demi-tour** (surtout avec le Volant du Dépôt, +15 % d'accélération) : se plante-t-elle
   contre le mur courbe, et s'en dégage-t-on facilement en reculant en braquant ?
5. **Les virages des canaux** au jet-ski : les murs de quai gardent le rebond et les dégâts de la V1 (au joystick simulé, la vedette
   frôle le quai 7 fois sur le grand tour, 53 PV ; le jet-ski 2 fois, 20 PV) — à amortir seulement si c'est pénible en vrai.
6. **La nuit** : fenêtres, néons Art déco, flaques de lumière, la fête (guirlande et musique), les feux de tête de mât.
7. **Les figurants** : ils apparaissent à 130 u et ne s'animent qu'à 90 u ; vérifier qu'aucun ne « pope » dans le champ.
8. **Le bord est** : l'eau du canal secondaire est et du bassin du bras est n'est plus sous le sable ; les jonctions du désert, de
   la route de bordure et de la plage restent celles d'avant (ton brief V3).
