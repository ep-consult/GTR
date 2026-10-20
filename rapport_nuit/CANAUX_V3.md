# Canaux V3 — le côté est rendu à l'eau, des ponts-levis, tous les bateaux pilotables, un chantier naval, une fête (branche `canaux-v3`)

Demande : `rapport_nuit/PROMPT_CANAUX_V3.md` ; captures du playtest iPhone : `rapport_nuit/canaux_refs/v3/` ; chantiers précédents :
`rapport_nuit/CANAUX.md` (V1), `rapport_nuit/CANAUX_V2.md` (V2).

**Point de départ** : les branches des passes précédentes (`canaux`, `canaux-v2`, `siege-ejectable`, `pilotage-avions`…) ne sont pas
fusionnées dans `master` ; `canaux-v2` est la plus récente et les contient toutes : `canaux-v3` part d'elle (commit 4621066).

## Ce que je vois sur les captures du playtest

- **A — pont en bois, bloc sombre** (3D) : le pont en bois tropical (sud-est) et les villas du canal est au fond, réussis. Au premier
  plan, un grand cube gris foncé aux vitres noires au bord du quai : c'est le **bâtiment du garage du port** (`C.garage`, pâté
  (11,10), posé en V1 par `bat()` dans `mkCanaux` : une boîte `matFacade` et un toit plat gris), la clé à molette de sa balise
  au-dessus. Autour, de l'asphalte et des dalles nues.
- **B — rangée de villas, quai vide** (3D) : les villas du canal est, leurs pontons et leurs bateaux (réussi). Au premier plan, le
  quai nord de la traverse : de l'asphalte, des dalles, un kiosque vert isolé, et à droite le même bloc sombre (ici l'**atelier
  « Marée Basse »**, pâté (11,8) au nord de la traverse, ou le garage selon l'angle).
- **C — plage et mer** (3D) : la plage (sable, transats, nageurs, surfeurs) et la mer : la référence de ce qui fonctionne.
- **D — passerelle en arche, quai vide** (3D) : la passerelle d'acier bleu de la traverse, le pont en bois au fond, un grand quai
  d'angle vide (asphalte et dalles) avec un kiosque, le bloc sombre de l'atelier, un blindé garé : le cœur du quartier est vide.
- **E — bord est, désert, plage** (2D) : le condo du sud (blanc, piscine sur le toit, x 270 → 286) collé à un désert qui commence
  en ligne droite à x = 277 ; plus bas la plage, coupée net d'est en ouest par le sable du désert. Mesuré : c'est la **dalle du
  désert de l'aéroport** (`mkAeroport`, 320 × 570 u, bord ouest à x = 277, à 0,011) qui passe au-dessus de la route de bordure
  (x 288 → 300) et de ce qui est plus bas qu'elle.
- **F — nuit, bassin est recouvert** (2D) : la même dalle passait au-dessus de l'eau du canal secondaire est et de son bassin (eau
  à −0,6) ; à droite, la route de bordure sous le sable, ses lampadaires « sans rôle ». **Corrigé à la fin de la V2** (0a83908,
  `percerDesertCanaux`, test « rien ne recouvre l'eau » : 362 points recouverts avant, aucun après) : les captures du playtest
  sont antérieures à ce correctif.
- **G — nuit, canal est, bande verte** (2D) : le canal secondaire est (sous le sable à l'époque), puis la route de bordure couverte
  par la **pelouse de l'aéroport** (`gaz`, 190 × 380 u, x 287 → 477, z −260 → 120, à 0,07), puis le tarmac de l'aéroport (x 299 →
  308), puis le mur (x = 308). Le trafic de la route de bordure roule sur cette pelouse.

Relevés complémentaires (plans vus du ciel, `captures/canaux_v3/avant_est_nord.png`, `avant_est_sud.png`, `avant_quartier.png`) : le
**mur d'enceinte est** est à x = 308 (1,4 u d'épaisseur, face intérieure à 307,3), en deux segments : z −308 → −70 et z −14 → 283
(entre les deux, le portail de l'aéroport sur la rue z = −42) ; au bout sud, une jetée de rochers (visuelle). La bande entre le
quartier (dalles jusqu'à x = 288,5) et le mur fait **19 u** ; au-delà du mur : l'aéroport (nord), le désert, le cratère, les mesas
(sud). Le trafic ne naît jamais sur la route de bordure est ni sur le front de mer (`creerTrafic`, `LIMS`) : il roule sur les rues
z = 42 et z = 168 jusqu'à x = 288 (`LIME`), où il fait demi-tour.

## Le tracé (décisions de la phase 1, prises avant de construire)

1. **Le grand canal est prend la bande** (la pelouse et le sable sur la route de bordure) : eau de x 288,5 à 302 (13,5 u), du sud de
   la marina à la mer, sans toucher au mur. Au milieu (z 60 → 158), il **absorbe le canal secondaire est** (x 275,5 → 287,5) :
   27 u d'eau d'un seul tenant, devant les villas de la rangée `estME`. Le canal secondaire est cesse d'être une impasse (décision V2 n° 2
   révisée pour l'est ; le canal secondaire ouest ne change pas).
2. **La route de bordure est disparaît** dans le quartier (de la marina à la mer) : sous l'eau ou sous la rive est. Personne n'y
   naissait ; ses lampadaires et son trafic de passage partent avec elle.
3. **La rive est** (x 302 → 307,3, contre le mur) : une berge d'enrochements au bord de l'eau, une corniche-promenade surélevée,
   des dunes plantées (oyats, ganivelles, cactus, rochers) qui montent contre le mur ; au sud du bout du mur (z > 283), elles
   s'étalent sur la plage vers le désert (là où il n'y a plus de mur).
4. **La marina** au nord-est, à la place des **deux condos du nord** (V2, x 270 → 286) : un bassin de x 270 à 302, z −24 → 28,
   pontons flottants à doigts et catways, bornes eau et électricité ; sur la bande nord (z −36,5 → −24) la capitainerie, la
   station-carburant (au quai), la grue de levage et l'aire de carénage. Le condo du sud reste : il donne désormais sur l'eau.
5. **L'embouchure du grand canal** : x 288,5 → 302 à travers la plage jusqu'à la mer, entre deux musoirs d'enrochements ; le bout
   est de la route du front de mer (x 288,5 → 300) devient de l'eau (aucun trafic n'y roulait).
6. **Les ponts-levis** (phase 2) : là où le trafic roule vraiment, sur les rues z = 42 (entre la marina et le réseau) et z = 168
   (entre la mer et le réseau) ; leur culée est sur la rive est, d'où des rampes descendent vers la corniche (on peut passer d'un
   pont à l'autre par la rive est). En phase 1, ces deux rues s'arrêtent au quai.

## Budget de performance (fixé avant de construire)

Mesuré sur la V2 finale (`perf_v3.js` : sans carte graphique, 390 × 844, vraie boucle ; seules les proportions comptent) :

| Point | Classique : appels / triangles | Immersive : appels / triangles |
|---|---|---|
| centre (189, 140) | 213 / 245 k | 1 732 / 616 k |
| marina NE (286, 4) | 135 / 175 k | 166 / 220 k |
| grand canal (296, 120) | 137 / 244 k | 1 153 / 539 k |
| embouchure est (295, 262) | 128 / 189 k | 1 861 / 793 k |
| fête de nuit (189, 105) | 228 / 236 k | 1 682 / 575 k |
| survol du côté est | 2 377 / 932 k | |

Géométries de la scène : 8 527, 159,1 Mo ; ~190 véhicules en jeu. **Budget** : appels ≤ +15 %, triangles ≤ +60 %, tick ≤ +1 ms,
géométries ≤ +25 Mo, véhicules réels ≤ +15 (plafond des bateaux promus compris). Si le budget casse : moins de détail au loin, et le
plafond des bateaux promus, jamais la densité proche.

## Protections

- Relevé du périmètre : `releve_canaux.js` a désormais une liste `bordEst` (comparée à l'identique, signature) : les deux segments
  du mur d'enceinte est, la bordure est (`mkBordureEst`) et les limites (`LIMITE_EST`, `LIMITE_EST_MER`, `LIMITE_SUD_MER`, `MER`),
  l'aérogare et la dépose-minute, l'arène de derby et son portail, le Skatepark XXL, la crique, le galion, et 126 points de plage
  hors du quartier (sable, eau, hauteur du sol). Référence V3 : `rapport_nuit/canaux_v3_avant.json` (prise sur la V2 finale, sans
  écart avec la référence V1 `canaux_avant.json`).
- Empreinte du décor (931930327, portes, chalet), tirage principal : identiques à chaque phase.

## Phases

- [x] Phase 1 — le côté est, les jonctions, les embouchures
- [ ] Phase 2 — les ponts-levis (côté des gros bateaux) et les ponts en dur (côté des petits)
- [ ] Phase 3 — tous les bateaux pilotables, de nouveaux modèles
- [ ] Phase 4 — le chantier naval et le garage à voitures
- [ ] Phase 5 — le lieu de fête central et les zones vides
- [ ] Phase 6 — carte, ambiance, performances

## Phase 1 — le côté est, les jonctions, les embouchures (fait)

### 1a. Rien ne recouvre l'eau
- [x] Cause trouvée sur le rendu réel (captures E, F, G) : la dalle du désert de l'aéroport (x ≥ 277, à 0,011), sa pelouse (x ≥ 287,
  à 0,07), son tarmac (x ≥ 298, à 0,12) et la plaque de fondu du littoral (`mkLittoral.jonctionEst`) passaient au-dessus de la route
  de bordure, des trottoirs et de l'eau. Corrigé à la source : `percerSolCanaux` refait le dessus de chacune percé à l'eau ET à tout
  l'intérieur de l'enceinte (du mur nord, `C.grand.zNord`, au bout du mur, `zMurFin`, jusqu'à la face intérieure du mur) ; les
  bandes de transition de l'ancien bord du désert (`TRANS.meshes`, notées à leur pose sans tirage) sont repliées sous le sol dans la
  même bande. Plus de désert ni de pelouse sur la route de bordure, du mur nord à la mer (`p1_bord_nord.png`).
- [x] Test : le balayage V2 (lancer de rayon sur toute l'eau du quartier) passe avec l'eau V3 (7 432 points, contre ~5 000) ; le bloc V3
  balaie à part le grand canal et la marina (2 562 points) et la route de bordure (135 points, aucun sol de l'aéroport).

### 1b. Le grand canal est
- [x] **Le canal** (`grandE`, x 288,5 → 302, 13,5 u ; `grandEM`, x 275,5 → 302 de z 60 à 158, qui absorbe le canal secondaire est) :
  de la marina à la mer, sans toucher le mur (face intérieure à 307,3), l'aéroport ni le derby (relevé du périmètre sans écart).
  Deux yachts « Impérial » (6 u de large) s'y croisent : 13 u au plus étroit, mesuré par `estEauNav` à 0,25 u près.
- [x] **La marina** (`marinaV3Plan`, `C.marina`) : x 270 → 302, z −24 → 34. Épi le long du quai ouest et trois catways (doigts)
  vers l'est dans la moitié nord, cinq bateaux le long des doigts (de chaque côté), le ponton d'honneur et son yacht à moteur le
  long du quai nord, bornes eau et électricité, échelles. **Décision 8** : la moitié sud est un **bassin d'évitage** libre
  (`C.marina.evitage`, disque libre de 15,75 u de rayon mesuré) — avec cinq doigts sur toute la longueur, le yacht « Impérial »
  (22 u) ne faisait pas demi-tour (bassin libre de 23 u de large, disque de 11,5 u : il finissait contre l'épi ou la rive). Mesuré
  au vrai joystick, au pas, braquage à fond : demi-tour en 8,2 s de chaque côté, sans toucher un quai. Sur la bande nord : la
  capitainerie, la station-carburant au bout du ponton d'honneur, la grue de levage (portique) et l'aire de carénage.
- [x] **La rive est** (x 302 → 307,3) : berge d'enrochements au bord de l'eau (blocs de roche `rocCanaux`), promenade surélevée
  (platelage à 0,85, garde-corps, lampadaires, bancs, rampes aux bouts, borne : les voitures restent en bas), dunes plantées
  (bourrelets de sable, oyats, ganivelles, cactus, rochers) qui montent contre le mur. En face, le quai de la ville.
- [x] **Graphe** : la marina, le grand canal et sa sortie en mer sont dans le graphe des vedettes (`PCANAL.grand`), relié au réseau
  par le bassin du bras est ; un chemin marina → mer (314 u) et canal ouest → marina (254 u), toujours sur l'eau.

### 1c. Les jonctions
- [x] **désert / ville** : plus de désert dans l'enceinte (1a) ; le bord est de la ville finit au mur, côté ville de l'asphalte et des
  trottoirs, côté rive est des dunes plantées qui montent contre le mur.
- [x] **désert / plage** (au-delà du bout du mur) : la colline de la crique fait le cordon ; une **laisse de mer** (algues, bois flotté,
  coquillages) court sur la ligne des hautes eaux de la plage du quartier jusqu'à la crique (`p1_plage_est_3d.png`).
- [x] **plage / quai** : la promenade de la rive est descend sur la plage par une rampe ; les quais des embouchures ne descendent plus
  sur le sable (voir 1d).
- [x] **plage / eau d'un canal** : berge de sable en pente (`CANAUX.berges`, posée à la place du mur de quai sur toute la longueur où
  le canal traverse la plage), sable sous l'eau le long des berges du chenal (shader de la mer).
- [x] **ville / promenade** : la promenade rejoint la bande nord de la marina et la plage par des rampes.

### 1d. Les embouchures
- [x] **Origine des traits blancs** (sur le rendu réel, sonde par lancer de rayon `p1_trait_blanc_embouchure_*.png`) : la margelle
  des quais (pierre claire 0xc9c2b0, à 0,26, qui déborde de 0,3 sur l'eau) longeait le canal **sur la plage**. `quaisDepuisBoucles`
  décidait la nature d'un côté de contour sur son seul milieu : le côté du canal est, d'un seul tenant du bras à la mer, avait son
  milieu en ville, et toute sa longueur recevait un mur de quai et sa margelle, plage comprise. Cause corrigée : chaque côté est
  découpé en tronçons de 2 u, chacun prend la nature de SON bord (plage → berge de sable en pente, pont, dalle). Ensuite, au bord
  nord du plan de la mer (z = MER), l'écume du ressac (`MER_GLSL_ECUME`, distance au rivage nulle) traçait une ligne blanche droite
  en travers de chaque chenal, et l'eau du canal s'arrêtait net sur la mer.
- [x] **Un vrai chenal** : l'écume de la mer s'interrompt dans chaque chenal (`uCoupes` = `LITTORAL_COUPES`, fondu de 0,5 à 6 u ; les
  rouleaux reprennent au-delà des musoirs) et longe ses berges de sable ; la **langue de mer** (`mkLangueMer` : la mer elle-même, son
  matériau, avance dans le chenal par-dessus l'eau du canal et s'y efface sur 16 u) : du canal à la mer, plus de bord
  (`p1_embouchure_E.png`, `p1_embouchure_grand.png`). Deux **musoirs** par embouchure (enrochements, tête arrondie, tourelle, feu rouge
  à l'ouest — bâbord en entrant —, vert à l'est, allumés la nuit, solides), **bouées de chenal** qui bercent, **courant** (traînées qui
  filent vers la mer).
- [x] **Décision 7 — le phare déplacé** : son îlot (x 291 → 305, z 297 → 311) barrait l'embouchure du grand canal ; il glisse de 20 u
  vers l'est d'un bloc (`deplacerPhareV3` dans `reserverCanaux` : rochers, tour, galerie, lanterne, maison du gardien, faisceau, halo,
  `ILES`, `PLATS`, deux solides ; aucun tirage). Noté dans `canaux_deplacements.json` ; le relevé ne voit que lui.

### Protections (phase 1)
- Relevé du périmètre : aucun écart avec `canaux_v3_avant.json` (hors le phare, noté) ni avec `canaux_avant.json` (bord est compris :
  mur, aérogare, derby, skatepark, crique, galion, 126 points de plage).
- Empreinte du décor 931930327, portes « −17.64,−181.00 −63.00,151.01 », chalet, tirage principal : identiques.

### Performances (phase 1, `perf_v3.js`, mêmes points que la référence ; sans carte graphique : seules les proportions comptent)

| Point | Classique : appels / triangles | Immersive : appels / triangles |
|---|---|---|
| centre (189, 140) | 214 / 268 k (+0 % / +9 %) | 1 749 / 661 k (+1 % / +7 %) |
| marina NE (286, 4) | 152 / 221 k (+13 % / +26 %) | 870 / 397 k (voir plus bas) |
| grand canal (296, 120) | 128 / 277 k (−7 % / +14 %) | 1 168 / 586 k (+1 % / +9 %) |
| embouchure est (295, 262) | 133 / 240 k (+4 % / +27 %) | 1 831 / 864 k (−2 % / +9 %) |
| fête de nuit (189, 105) | 206 / 243 k (−10 % / +3 %) | 1 703 / 593 k (+1 % / +3 %) |
| survol du côté est | 2 373 / 986 k (0 % / +6 %) | |

Géométries : 8 554, 166,9 Mo (+7,8 Mo) ; véhicules ~190 (inchangé) ; tick 1,5 à 2,0 ms. Le point « marina NE » en vue immersive
n'est pas comparable : en V2, le joueur y était collé à la façade du condo nord (166 appels) ; il voit désormais le bassin, la rive est
et l'aéroport au-delà du mur (870 appels, la moitié des autres points). **Trouvé en mesurant** : le décor du côté est (enrochements,
dunes, musoirs, marina, laisse de mer) était UN maillage de 1,2 km, dessiné dès qu'un bout entrait dans le champ (+76 k triangles au
centre du quartier) : il est découpé en zones de 60 u (`zonesTriangles`). **Performances réelles : à juger sur iPhone.**

### Tests (phase 1)
- Nouveau bloc « Canaux V3 : le côté est » (lit `CANAUX.grand`, `CANAUX.eaux`, `CANAUX.marina`, `CANAUX.musoirs`, `PCANAL`,
  `LITTORAL_COUPES`, `ILES`) : grand canal navigable et assez large, rive est sèche, chemins du graphe sur l'eau, demi-tour du yacht au
  vrai joystick, balayage de l'eau par lancer de rayon, route de bordure sans sol de l'aéroport, embouchures (margelle, langue de
  mer, écume, musoirs, chenal libre jusqu'au large), nageur sorti sur la berge.
- Les 14 blocs des canaux V1 et V2 (et « Port vivant », « Planques, 8 ») repassent. Deux tests V2 lisaient les bateaux amarrés comme
  orientés nord-sud et le quai comme est-ouest : ceux de la marina sont amarrés est-ouest, et le yacht du ponton d'honneur le long du
  quai nord — les deux tests tiennent compte de l'orientation (ils lisent `B.ang` et, à la marina, les quatre quais).
- **Vu une fois, non reproduit** : « Police maritime des canaux, poursuite : la recherche est tombée à 2 » dans la série des 15 blocs ;
  le bloc repasse seul, derrière les blocs qui le précèdent dans la suite, et sur quatre graines (six exécutions). À surveiller dans
  la suite complète (le graphe a désormais des nœuds dans le grand canal, à plus de 90 u du canal ouest).
