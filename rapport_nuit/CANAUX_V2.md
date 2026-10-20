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

## Phases

- [x] Phase 1 — plan des lots et des doigts, canaux secondaires, allées, relevé du périmètre
- [ ] Phase 2 — générateur de villas, jardins côté eau, côté rue
- [ ] Phase 3 — pontons accessibles et bateaux des villas
- [ ] Phase 4 — les 4 ponts et les passerelles
- [ ] Phase 5 — vie, ambiance, nuit, sons
- [ ] Phase 6 — carte et performances
