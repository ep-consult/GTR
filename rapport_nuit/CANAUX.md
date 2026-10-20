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
   et déplacements de portes) s'exécute juste avant `mkBalises` (les balises suivent les portes déplacées), `mkCanaux` juste après
   (générateur privé : les nouvelles balises ne consomment rien). L'empreinte (`_aleaDecorS` après chaque bâtisseur, portes,
   chalet, places garnies) doit rester identique.
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

## Phases

- [ ] Phase 1 — squelette jouable
- [ ] Phase 2 — police maritime
- [ ] Phase 3 — bâti
- [ ] Phase 4 — nautique et ambiance
- [ ] Phase 5 — planque villa Miami
