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
- [x] Phase 2 — les ponts-levis (côté des gros bateaux) et les ponts en dur (côté des petits)
- [x] Phase 3 — tous les bateaux pilotables, de nouveaux modèles
- [x] Phase 4 — le chantier naval et le garage à voitures
- [x] Phase 5 — le lieu de fête central et les zones vides
- [x] Phase 6 — carte, ambiance, performances

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

## Phase 2 — les ponts-levis et le tirant d'air (fait)

### Décisions
- **Décision 9 — où sont les ponts-levis** : sur les rues z = 42 (entre la marina et le réseau) et z = 168 (entre la mer et le réseau),
  là où le trafic roule déjà. Le mur d'enceinte ne peut pas s'ouvrir (protection) : la rive orientale n'a que 5,3 u ; chaque pont
  aboutit à une **culée** sur la rive est, au plateau du pont, où le trafic fait demi-tour (comme à toutes les limites de la ville :
  le demi-tour du trafic est instantané) ; la promenade surélevée y monte par deux rampes (9 u), on passe d'un pont à l'autre par la rive
  est. Un véhicule long (bus) fait demi-tour avant, comme avant. Les bouts de rue coupés de la phase 1 sont rendus à la chaussée.
- **Décision 10 — le tirant d'air** (`HAUT_NAV`, noté dans `VEHDEFS.hautNav`) : mesuré sur le modèle à flot, la **structure rigide**
  (coque, pare-brise, arceau, rampe de gyrophares, radar, mât) — pas les antennes fouet, qui plient (sinon la Sirène mesurait 2,97 u et
  la vedette de police 4,00 u, toutes deux bloquées sous des ponts qu'elles passent en V2). Jet-ski 1,10 ; Espadon 1,51 ; Sirène 1,97 ;
  police 2,81 ; pêche 3,61 ; yacht 7,15 ; méga-yacht 11,46 ; cargo 23,23 (kayak 1,09, planche 0,28). Le test les remesure.
- **Les dégagements** (`degagementCanal`, mesurés au milieu du chenal comme sur un panneau de navigation) : ponts V2 et ponts-levis
  baissés 2,95 u (plateau 2,7, tablier 0,35, eau à −0,6), passerelles 2,88. Les ponts-levis reprennent le plateau et le dégagement des
  ponts V2 : les petits bateaux et la police passent dessous pont fermé ; le yacht, le bateau de pêche ne passent aucun tablier fixe.
- **Règle physique** : un bateau plus haut que le dégagement du tablier devant lui le heurte (`passeSousTablier`, dans le choc de
  `majVehiculePhys` et dans `bloqueParSolide`) ; déjà dessous (un pont qui redescendrait), il peut toujours en sortir.
- **Le graphe** connaît la hauteur de chaque arc (`canauxGrapheHauteurs` : le plus petit dégagement le long de l'arc, et le pont-levis
  qu'il franchit) ; `cheminCanal(…, hNav)` n'emprunte que les arcs assez hauts, ou un pont-levis (il s'ouvre). Trouvé en route :
  `cheminCanal` ne renvoyait jamais « aucun chemin » (le graphe était d'un seul tenant) — corrigé.

### Les ponts (`mkLevisV3`, `CANAUX.levis`)
- Rampe en dos d'âne côté ville (chaussée, murs de soutènement, garde-corps qui suivent), culée sous le pivot ouest, culée de la rive
  est (garde-corps ouverts sur la promenade), **deux volées** qui tournent autour de leur pivot sur le quai, **contrepoids** derrière
  chaque pivot (il descend dans la fosse), axe, **vérins** de chaque côté (fût fixé au quai, tige vers la volée, recalculés à chaque
  image), **barrières** à deux bras rayés rouge et blanc, **feux** rouges qui clignotent, **cabine de l'éclusier** (vitrée, allumée la
  nuit, enseigne PONT-LEVIS), **panneau du tirant d'air** « 2,9 m » sous chaque volée, côté chenal.
- **Cinématique** (`majLevisV3`, sur `dtJeu`) : ferme → alerte (2,2 s : feux, sonnerie) → barrières (1,7 s, puis solides) → montée
  (5 s jusqu'à 70° ; mesuré 5,0 s) → ouvert (tant qu'un bateau trop haut est dans la zone, plus 4 s) → descente (jamais avec un bateau
  dessous : il remonte) → barrières levées → fermé. **Jamais de levée** avec un véhicule, le joueur, un piéton ou un ennemi sur le
  tablier (les piétons pressent le pas vers le bout le plus proche) ; une volée ne monte pas tant qu'un véhicule y roule.
- **Déclenchement** (`levisDemande`) : un bateau plus haut que le dégagement, le joueur ou un yacht de l'IA, qui va vers le pont à moins
  de 80 u (un pont met ~9 s à s'ouvrir), ou qui attend au point d'attente.
- **Le trafic** : ligne d'arrêt devant chaque barrière (`levisArretTrafic` : la vitesse plafonnée pour s'y arrêter, la file se fait
  derrière par le suivi de file) ; une voiture déjà engagée passe (le pont attend que le tablier soit libre) ; la file qui attend un
  pont-levis n'est plus recyclée hors écran au bout de 8 s (`levisFile`) ; jamais de trafic né sur un pont-levis ni à moins de 30 u
  avant, ni de piéton né sur un tablier. La police est arrêtée par les barrières (solides) : une façon de semer.
- **Le joueur qui force la barrière** lancé (plus de 11 u/s) : le bras casse et vole (`levisForcer`), la volée qui monte est une rampe
  (`hauteurLevis`, lue par `solY`) : le décollage est celui de toutes les rampes, avec la vitesse de montée (mesuré : envol à θ 0,33) ;
  au-delà de 26°, une volée levée est un mur (`levisMurs`) ; levée, le milieu du pont n'est jamais une chaussée (l'eau).
- **Les yachts de l'IA** (`YIA`, `majYachtIA`) : un yacht « Impérial » naît au large hors de vue toutes les 2 à 4 minutes de jeu,
  remonte le grand canal sur le graphe en attendant chaque pont au point d'attente, fait escale 25 s au centre du bassin d'évitage,
  fait demi-tour au pas du côté qui le pose sur l'axe du canal, ressort tout droit et disparaît au large. Mesuré : aller-retour en
  135 s, les deux ponts ouverts et refermés deux fois, aucun choc. C'est un vrai véhicule (conduit `yachtIA`) : on peut le voler.
- **Minimap** : l'icône de chaque pont-levis, verte fermé, rouge sinon (`dessinerLevisCarte`). **Son** (`LEVIS_SON`) : sonnerie et
  moteur selon la distance, coupés à la mort, en salle et à chaque partie.

### Tests (phase 2)
- Nouveau bloc « Canaux V3 : ponts-levis » (lit `CANAUX.levis`, `CANAUX.ponts`, `CANAUX.passerelles`, `VEHDEFS.hautNav`, `PCANAL`,
  `YIA`) : tirants d'air remesurés sur chaque modèle ; dégagements (police oui, yacht non) ; graphe (le yacht atteint la marina par les
  ponts-levis, jamais le canal ouest ; la police, si) ; contre le pont fixe sud-est, le yacht s'arrête et la vedette passe ; un joueur
  attentif en yacht, au vrai joystick, de la mer à la marina : les deux ponts font leur cycle complet (montée 5,0 s, 70°), aucun choc,
  33 s ; un jet-ski passe sous le pont fermé sans l'ouvrir ; une voiture garée puis le joueur à pied sur le tablier empêchent la
  levée, partis, le pont se lève ; une voiture du trafic s'arrête à la ligne, passe une fois le pont refermé, fait demi-tour sur la
  culée (x 304,8) et revient ; barrière forcée et envol de la volée qui monte (θ 0,33) ; volée levée = mur, le milieu = l'eau ; un
  yacht de l'IA fait l'aller-retour (135 s) en ouvrant les deux ponts, sans choc ; icône verte / rouge sur la minimap ; moteur pendant
  la montée, coupé à la mort ; tout remis à zéro à la partie suivante.
- Les 22 blocs des canaux, du trafic (files, scintillement, bordures, circulation) et des vedettes (direction, V3) repassent. Le test
  V1 « Canaux de Los Reyes » comptait la chaussée d'un pont-levis comme une rue retirée (elle traverse l'ancienne route de bordure,
  retirée en phase 1) : il lit désormais `levisCanal`.
- Trouvés en route : le trafic et les piétons pouvaient naître sur un tablier (ouvert compris : une voiture née sur une volée levée
  bloquait la montée à 60°) ; la file d'attente d'un pont était recyclée hors écran au bout de 8 s ; `cheminCanal` sans « aucun chemin ».

### Performances (phase 2)
Mêmes points, plus « pont-levis nord » (280, 42) : classique 212 / 246 k au centre (0 % / 0 %), 149 / 197 k à la marina, 128 / 272 k
au grand canal, 132 / 227 k à l'embouchure, 204 / 221 k à la fête, 169 / 224 k au pont nord ; immersive 1 747 / 613 k au centre (+1 % /
0 %), 1 217 / 587 k au grand canal, 1 971 / 854 k à l'embouchure (+6 % / +8 %), 932 / 416 k au pont nord ; survol 2 440 / 1 011 k
(+3 % / +9 %) ; géométries 8 595, 167,7 Mo (+8,6 Mo) ; tick 1,6 à 2,2 ms. Les volées sont fusionnées par matériau (6 maillages chacune,
contre une vingtaine) et les lampes des feux en un maillage par pont : −88 appels au survol. **À juger sur iPhone.**

### Captures (phase 2)
`p2_levisN_ferme.png`, `p2_levisS_montee.png` (barrières baissées, vérins), `p2_levisN_ouvert_yacht.png` (le yacht « Impérial » sous
le pont ouvert), `p2_levis_cote.png`, `p2_levisN_nuit.png` (cabine de l'éclusier allumée).

## Phase 3 — tous les bateaux pilotables, de nouveaux modèles (fait)

Les fiches des nouveaux bateaux, leurs captures (deux vues et le poste à la 1re personne) et l'évaluation des anciens :
**`rapport_nuit/BATEAUX_V5.md`** (`captures/bateaux_v5/`).

### Les nouveaux modèles
- Huit nouveaux bateaux au niveau V3/V4 (fiches `VEH_V3` + `VEHDEFS`) : jet à bras « Kamikaze » (debout), jet trois places
  « Croisière », offshore « Tonnerre » (le plus rapide : vmax 52 ; il déjauge, sillage ×2, son `course` rauque), yacht « Riviera 43 »
  (flybridge), sportfish « Marlin » (tour à thon), runabout « Aquarama » (acajou verni), cruiser « Capitaine » (bois, hublots), voilier
  « Alizé » ; le jet-ski refait en « Sport ». Chacun : son tirant d'air (`HAUT_NAV`), son son (`MOTEURS.course`, `jetski`, `diesel`,
  `v8`), son tableau de bord (`CK_HAB` ; nouveau tableau `bois` : planche d'acajou, cadrans crème cerclés de chrome), son pilote
  (debout, assis — `ud.siege.assis` : la pose assise des cabriolets, plus celle des vedettes — ou à califourchon).
- Les jet-skis sont une famille (`VEHDEFS.jetski:true`) : pose, cockpit et gîte ne dépendent plus de la clé `jetski`.

### Décisions
- **Décision 11 — la promotion à la demande** : au loin, chaque bateau amarré est une instance tirée de son VRAI modèle (fusionnée à
  couleurs de sommets, par modèle et par livrée, un `InstancedMesh` chacune, qui berce) ; à moins de **12 u** du joueur, l'instance
  est remplacée à la même place, même modèle, même livrée, par un vrai véhicule ; **deux au plus** à la fois ; loin (28 u) et à son
  poste, il redevient une instance ; déplacé, il reste un véhicule tant qu'on est près, puis il est rendu à son poste hors de vue ;
  coulé, le poste reste vide jusqu'à la partie suivante. Mesuré d'abord à 26 u et 6 bateaux : +85 % d'appels de rendu à la marina (un
  bateau promu, c'est ~25 maillages) ; le bouton MONTER n'en sert qu'un.
- **Décision 12 — chacun peut sortir en mer** : les dix gros bateaux (2 yachts, 4 sportfish, 4 voiliers) amarrés côté ouest ne
  passaient aucun pont : à la même place, ils deviennent un cruiser en bois (poste de 8,2 u et plus) ou un open, le flanc toujours
  contre le flotteur ; les gros sont à la marina — ponton d'honneur, doigts (deux voiliers), et un **ponton visiteurs** au nord-est
  (deux sportfish, un yacht, un voilier), hors du chemin des yachts de l'IA vers le bassin d'évitage. L'offshore prend le poste d'une
  grande villa du canal est. 36 postes, chacun avec un chemin jusqu'à la mer pour son tirant d'air (test, `cheminCanal` avec `hNav`).
- **Les instances allégées** : les triangles de moins de 0,003 u² (vis, taquets, mains courantes fines) sont retirés de la géométrie
  d'instance (à 12 u et au-delà, invisibles) : la moitié du poids (185 k triangles pour les 36 bateaux, ~95 k après).

### Pièges trouvés
- Construire un modèle V3 pendant la génération remplit des caches partagés (`_MV3`, `_GEO_V3`, `_PEINT_V3`, `_MATC_V3`, `_TEX_V3`…) :
  un véhicule créé ensuite en jeu tirait moins de nombres (la partie se décalait). `mkBateauxInstances` rend ces caches tels qu'ils
  étaient ; relevé du périmètre (187 véhicules posés compris) sans écart, empreinte et tirage principal identiques.
- r128 écarte un `InstancedMesh` du champ sur la sphère de SA géométrie (centrée sur l'origine) : elle englobe désormais toutes ses
  instances, sinon les bateaux disparaissaient dès que l'origine du monde sortait du champ.
- `majSautMer` réservait les bonds de crête aux bateaux de moins de 9 u : le bateau de course (9,5 u) ne déjaugeait pas.
- `peindreMesh` repeint un modèle V3 sans mettre à jour sa couleur notée (`ud.coul`) : la promotion la note.

### Tests (phase 3)
- Nouveau bloc « Canaux V3 : bateaux pilotables » (lit `PROMO.postes`, `CANAUX.bateauxV2`, `VEHDEFS`, `PCANAL`) : chaque poste a un
  vrai modèle et un chemin jusqu'à la mer, aucun gros côté ouest ; promotion à la même place, même modèle, même livrée, instance
  masquée, deux au plus ; retour en instance de loin ; pris, emmené, lâché : rendu à son poste ; coulé : poste vide, rendu à la partie
  suivante ; les neuf modèles se pilotent (vitesses en 6 s : jet-skis 32 à 37, offshore 48, yachts 23 à 26, runabout 30, cruiser 22,
  voilier 13) ; l'offshore est le plus rapide et fait deux fois plus de bonds en mer qu'une vedette (4 contre 2 en 8 s).
- « Véhicules V3 », « Vedettes V3 » (accepte désormais un barreur assis : la coque fermée se mesure à hauteur de l'assise), « Bateaux »,
  « Cockpits » (88 véhicules), « Cockpits V2 », « Reflets au cockpit », « Inclinaisons », et les 20 blocs des canaux repassent. Trois
  tests V2 lisaient les bateaux comme des murs de décor ou ne connaissaient que les quais : un poste promu (un vrai véhicule tient la
  place) et un bateau amarré à un ponton de la marina sont désormais reconnus.

### Performances (phase 3, `perf_v3.js`)
Classique : centre 198 / 304 k (référence 213 / 245 k : −7 % / +24 %), marina 194 / 282 k, grand canal 143 / 348 k, embouchure 147 /
303 k, fête 253 / 315 k, pont nord 176 / 300 k. Immersive : centre 1 738 / 685 k (0 % / +11 %), marina 904 / 449 k, grand canal 1 211 /
659 k, embouchure 1 905 / 924 k (+2 % / +17 %), fête 1 707 / 667 k ; survol 2 536 / 1 120 k (+7 % / +20 %). Géométries 8 615, 169,6 Mo
(+10,5 Mo). Tick profilé : 0,9 à 1,5 ms à ces points (la promotion : moins de 0,03 ms) ; la première promotion d'un modèle le
construit (une pointe de quelques millisecondes, une fois par modèle et par partie). **Hors budget** : les appels de rendu au point
« marina » (194 contre 135 de référence, +44 %) — le point de référence était une barre de condos, c'est désormais une marina pleine
de bateaux ; et les triangles à certains points du grand canal (+42 %, dans le budget de +60 %). **À juger sur iPhone.**

## Phase 4 — le chantier naval « Marée Basse » et le garage du port (fait)

### Décisions
- **Décision 13 — où : sur le grand canal est, à la place du condo du sud** (x 270 → 288,5, z 177,5 → 246,5, entre la rue z = 168
  et le front de mer). La demande disait « l'atelier « Marée Basse » devient ce chantier » (pâté (11,8), au bord du canal est
  x 221 → 241) ; or ce canal a trois ponts fixes (2,88 u au plus bas) entre lui et la mer : un yacht, un sportfish (familles du
  chantier) n'y arrivent jamais. Le grand canal est le seul bord d'eau où **tous** les bateaux arrivent de la mer sans passer sous un
  pont fixe (de la mer directement, de la marina par le pont-levis sud). Le nom « Marée Basse », ses Dockside Boys et sa cale y
  partent ; l'ancien atelier (11,8) garde ses volumes et devient une « cale sèche » (la phase 5 le refait : c'est un des blocs sombres
  des captures B et D). Le condo du sud (`CONDOS_V2`) n'est plus construit.
- **Le GARAGE DU PORT est déplacé dans le bâtiment double** (porte `g_port` en (274,6 ; 176,3) : façade nord du garage, sur la rue
  z = 168 où le trafic roule, à l'ouest de la rampe du pont-levis sud ; salle partagée et `REPLIS` inchangés ; relevé : déplacement noté dans `canaux_deplacements.json`). Son ancien cube sombre
  du pâté (11,10) (capture A) n'est plus construit : le pâté, au cœur du quartier, est libre pour le lieu de fête de la phase 5.
- **Le bâtiment double** (`mkChantierNaval`, fin de `mkCanaux`, générateur privé) : au nord le garage (crème à bandeau bleu-vert, toit
  plat, enseigne sur le toit face à la caméra — au nord, la façade est cachée par le bâtiment), au sud le hangar à bateaux (bardage
  ondulé, pignons, toit à deux pans et lanterneaux) dont la **porte basculante** (12 u, de l'eau à 6,4 u) s'ouvre sur le grand canal ;
  au sud, le chantier à ciel ouvert : portique élévateur et son cruiser sur sangles, offshore et vedette sur leurs bers, cale de
  halage et runabout sur son chariot, atelier de peinture, mâts, chariot élévateur, bouées, hélices ; le ponton d'entrée au sud de la
  porte (avec son échelle), dans une **anse** taillée dans le quai (`anseChantier`, x 284,1 → 287,8, z 214,8 → 222,4) : posé dans le
  canal, il le ramenait à 10,8 u (deux yachts s'y croisent à 12 u). Sous le hangar, une **darse** (`darseChantier`, dans `CANAUX.eaux`, `couverte`) : de l'eau qu'on voit par
  la porte ouverte (le cruiser sur sangles au-dessus, le pont roulant, un plafond — vu d'en dessous, le toit à une face laissait voir
  le ciel), **jamais navigable** (`estEauNav`) ; le hangar est un solide : comme au garage, on « entre » par le bouton.
- **La porte s'ouvre** devant le bateau du joueur (moins de 18 u, `majChantierNaval`, 1,6 s, un claquement) et reste ouverte 5 s après
  sa sortie.
- **L'entrée** : en bateau, devant la porte (8 u) : « ⚓ ENTRER AU CHANTIER NAVAL » ; à pied ou en voiture sur le quai côté eau :
  « 🔒 CHANTIER NAVAL — on y entre en bateau ». La règle « trop chaud » est celle du garage (un tireur de gang à 6 u bloque, la
  police jamais : rentrer au chantier sème la police, les étoiles tombent dedans). Refusés avec un message : kayak et planche (pas de
  moteur), voilier (son mât), méga-yacht et porte-conteneurs (trop grands). La porte de la salle n'est pas dans `PORTES` (une de
  plus décalerait la ville) : `porteSalle('chantier')` la rend.
- **La salle** (`INTDEFS.chantier`, `construireChantierNavalSalle`) : la salle du garage pour les bateaux (`inter.tuning` et
  `inter.naval`) — la darse de la cale de halage à la porte basculante (dans le mur de la SORTIE), un runabout sur sangles sous son
  pont roulant, le bateau exposé sur un **ber tournant** (calages, béquilles ; il tourne seul ou au doigt), l'établi et ses étaux, les
  moteurs hors-bord suspendus à leur rail, les pots de vernis, cordages et bouées, la console d'atelier ; par la porte ouverte, le
  canal. Habillage V2 (béton, bardage, lambris de bois).
- **« Mes véhicules » est commun** (`META.vehPerso`, `VEHPERSO_MAX`) : le chantier n'en montre que les bateaux, le garage que ce qui
  roule (`ficheCompatible`) ; le garage de la villa ne sort jamais un bateau ; un bateau rangé ressort du chantier.
- **Mécanique** (`tuningMeca` sur les bateaux) : moteur (accélération), hélice (vitesse max), coque — glisse (maniabilité), blindage,
  nitro (sur l'eau, jamais dans une salle : `nitroAutorisee`). Mêmes effets que les voitures (`TUNING_EFFETS`), prix du chantier.
- **Style** (`tuningNaut:{famille, ancrages, sans}`, catalogues `PIECES_NAUT` : jetski, course, open, bois, yacht) — peinture de
  coque et néons sous la coque (ceux du garage ; la lueur se pose sur l'eau), et neuf catégories à clés **fixes** dans
  `slotGarageDefaut` (`livree`, `pont`, `toit`, `parebrise`, `sieges`, `sono`, `feux`, `nom`, `drapeau`) :
  livrée (bandes de course, flammes, damier de course), couleur du pont, toit (T-top, hardtop ; aileron ou arceau lumineux pour
  l'offshore ; bimini marine ou rayé pour les bois), pare-brise (fumé, miroir doré, bleu glacier), sièges, sono (enceintes, sono de
  soirée à LED), feux (LED sous-marines, projecteur, rampe LED de coque), **nom peint sur la coque** (sept noms : « Marée Haute »,
  « Rafale Bleue », « Los Reyes Kid », « Belle de Nuit », « L'Insoumise », « Señorita », « Coup de Soleil » ; lettres d'or sur les
  bois), pavillon (Los Reyes, pirate, damier). Livrée, nom et rampe LED sont des **décalcomanies tirées du bordé du vrai modèle**
  (`geoDecalCoque` : les triangles de flanc, en coordonnées de coque — elles épousent toutes les formes ; lues des deux côtés, le nom
  à l'endroit) ; pont, pare-brise et sièges, une **copie de la matière** propre au bateau ; le reste se pose aux ancrages mesurés
  (poste de pilotage, poupe, arceau ; `bord` : le haut de la coque quand la peinture monte sur la superstructure d'un yacht).
  Une famille n'a que ce qui a du sens (`sans` : le bateau de police et le cruiser ont déjà un toit, le jet à bras n'a ni bulle ni
  selle). Aperçu avant achat, une pièce se paie une fois, garde d'entrée propre à chaque achat, casse à 25 % : ceux du garage.
- **Prix** : `TUNING_PRIX.bateaux` (peinture 250 $, néons 600 $, nitro 1 400 $, paliers 600 à 3 400 $, pièces 150 à 1 800 $) — à
  calibrer en jouant.
- **La sortie** : à la barre, à flot devant la porte, dans l'axe du canal, cap au sud vers la mer (`chantierPlaceSortie` : les
  quatre coins dans l'eau navigable, aucun bateau dessous, sinon 4, 8… u plus loin) ; à pied, sur le quai à côté de la porte.
- Un bateau promu (phase 3) emmené au chantier quitte son poste : il reste vide jusqu'à la partie suivante (il est au joueur).

### Pièges trouvés
- `garageApresSortie` lisait l'orientation de la porte par `INT.rYaw||Math.PI` : une porte au nord a un `rYaw` nul, la voiture
  ressortait vers le bâtiment.
- Les aides de test du garage posaient le véhicule « 4 u au sud » de chaque porte : elles suivent désormais la normale de la porte.
- La porte du garage au milieu de la façade (x 278,5) : la voiture ressortait sur la rampe du pont-levis sud (son rectangle commence
  à x 278 : `pontCanal`), « pas au sec » pour « Canaux : rien de cassé ». Porte à x 274,6.
- Le ponton d'entrée posé dans le canal le rétrécissait à 10,8 u (« côté est » : deux yachts à 12 u) : il est dans une anse du quai.
- Le sol de la salle est le sol générique rétréci (la darse y est découpée) : le test d'habillage le reconnaît par `s.solMesh`.

### Tests (phase 4)
- Nouveau bloc « Canaux V3 : chantier naval » (lit `CANAUX.chantier`, `VEHDEFS.tuningNaut`, `PIECES_NAUT`, `TUNING_PRIX.bateaux`,
  `PORTES`) : le bâtiment double au bord de l'eau, la darse jamais navigable, le hangar solide, la porte du garage sur sa rue avec du
  trottoir ; pour chacun des 12 bateaux du chantier, ses ancrages sur son modèle (un sol sous la poupe et sous les pieds du toit) et
  chacune des 320 pièces de son catalogue posée ; la porte qui s'ouvre, le bouton ENTRER, « trop chaud », la police qui ne bloque
  pas ; le bateau sur le ber (la quille sur les calages) ; aperçu sans débit, achat, une pièce payée une fois ; le chantier ne liste
  pas une voiture ; sortie à flot (les quatre coins dans l'eau, hors des solides), pièces et hélice sur le bateau ressorti, la nitro
  sur l'eau ; refus à pied et en voiture côté eau ; un bateau refusé au garage, la voiture entre au garage du port et ressort sur la
  rue cap au nord, le garage ne liste pas le bateau ; casse à 25 %.
- Nouveau bloc « … les pièces d'un bateau survivent au rechargement » (sauvegarde, rechargement de la page, fiche relue).
- Les 76 tests des garages repassent (l'éligibilité : un bateau `tuningMeca` est refusé au garage, accepté au chantier).
- Repassés : « Canaux : rien de cassé » (le garage du port entré et quitté en voiture), « Canaux V2 : le plan », « … les villas »,
  « Canaux V3 : le côté est » (13,0 u au plus étroit), « … ponts-levis », « Vue immersive dans les salles » (35 salles, chantier
  compris), « Habillage V2 des salles » (21 salles, chantier compris).
- Empreinte du décor, portes, chalet et tirage principal identiques à la phase 3 (seul le nombre d'objets de la scène grandit : 5 431 →
  5 434) ; relevé du périmètre : aucun écart hors de ceux de `canaux_deplacements.json` (le garage du port, le phare).

### Performances (phase 4, `perf_v3.js`, phase 3 → phase 4, mêmes points ; machine chargée ce soir-là : seules les proportions
comptent, **à juger sur iPhone**)
| Point | Appels (classique) | Triangles (classique) | Appels (immersive) | Triangles (immersive) |
|---|---|---|---|---|
| chantier (292, 200), jour | 177 → 199 | 374 k → 391 k | 1 696 → 1 721 | 882 k → 921 k |
| chantier, nuit | 194 → 216 | 379 k → 394 k | 1 748 → 1 747 | 901 k → 903 k |
| grand canal (296, 120) | 143 → 144 | 348 k → 349 k | 1 233 → 1 229 | 670 k → 666 k |
| centre du quartier | 204 → 183 | 305 k → 304 k | 1 790 → 1 752 | 700 k → 708 k |
| survol du côté est | — | — | 2 461 → 2 491 | 1 076 k → 1 115 k |

Temps de tick inchangé (± 0,7 ms, le bruit de la machine) ; géométries : +1, +1,5 Mo (les pièces des bateaux du chantier,
construites à la première visite). La salle se construit à la première entrée.

### Captures (phase 4)
`captures/canaux_v3/p4_*` : le bâtiment vu d'ensemble, porte fermée et ouverte depuis le canal, la rue du garage, le chantier, la
salle (entrée, menu ouvert, intérieur), avant / après (`p4_avant_*`) ; `captures/canaux_v3/p4_bateaux/` : chaque bateau du chantier, toutes ses pièces posées.

## Phase 5 — le Lagon, les quais rendus à la promenade, plus un bloc sombre (fait)

### Décisions
- **Décision 14 — où : le pâté (11,10), au cœur du quartier.** Le cube sombre du garage du port (capture A) en est parti à la phase 4 ;
  le Lagon prend le pâté, la rue z = 126 devant lui (déjà sans trafic depuis la V1 : elle devient la terrasse du club, `z126M`) et le
  quai sud de la traverse (capture B), où l'on accoste. On y arrive à pied (entrée sous l'arche au sud, passages à l'ouest et à l'est),
  en voiture (la rue x = 168 et la rue z = 168 le bordent) et en bateau (ponton d'accostage sur la traverse, trois postes).
- **Le lieu** (`lagonDefinir` — des données, appelée par `canauxDefinir` —, `mkLagon` en fin de `mkCanaux`, générateur privé) :
  terrasse en platelage sur l'ancienne rue et le quai ; bar tiki (comptoir, tabourets, étagère de bouteilles lumineuses, lampions sous
  l'avant-toit) ; scène et cabine du DJ (enceintes, écran qui change de couleur au rythme) ; piste de danse à carreaux lumineux (trois
  matériaux qui tournent au tempo, éteints pendant la panique) ; plage de sable, transats, parasols, deux lits de plage à baldaquin ;
  grande piscine (18 × 11 u, de l'eau où l'on nage : `BASSINS`), son plongeoir de 4,2 u et la chaise du maître-nageur ; zone VIP de la
  Brigada (estrade, canapés, cordon, `VIP`) ; palmiers, haies basses ; arche d'entrée et son enseigne « LE LAGON » ; guirlandes entre
  six mâts (ampoules de verre teinté le jour, allumées la nuit, les fils en un seul appel de rendu) ; torches ; banquettes et tables
  basses face à l'eau, deux passerelles vers le ponton.
- **Décision 16 — la foule et les figurants.** La demande dit « des dizaines de figurants (`figurant()`) » ; un corps complet coûte 7
  maillages et une ombre (13 appels de rendu mesurés), des dizaines feraient exploser le budget. Donc : la **foule** (`lagonFouleConstruire`,
  `lagonFoulePoser`) — 49 personnes (18 danseurs, 6 au bar, 6 sur les transats, 6 dans la piscine, 8 debout qui discutent, 2 plongeurs
  qui montent l'échelle et sautent, 3 promeneurs en aller-retour sur le quai nord de la traverse et la terrasse) en **quatre
  `InstancedMesh`** (jambes, torse, tête, bras : quatre appels pour tout le monde), qui fuit à la panique, cachée au-delà de
  `LAGON_FOULE_LOD` (170 u) ; et **17 vrais figurants** (`figurant()`) pour ceux qu'on vise : barman, DJ, trois Dockside Boys au bar,
  deux de la Brigada au carré VIP et ses deux gardes, le maître-nageur, trois pêcheurs à la canne, deux marchands et deux clients au
  marché. Touchés, ils deviennent de vrais piétons (ou gangsters). Les 15 immobiles sont **dessinés en un seul maillage**
  (`lagonFigurantsFusion` : leurs propres maillages masqués, le groupe visible — on les touche, on les percute, ils paniquent comme
  avant ; converti, un figurant retrouve son corps et quitte le maillage fusionné, `majLagonFusion`) : au centre du Lagon, vue de
  dessus, 328 → 234 appels. Les caches partagés (`_matCache`, `VIS_CACHE`) sont rendus comme pour la vie des canaux.
- **Ce qu'on y fait, sans nouveau système** : **DANSER** (la danse du Club Néon : `danseDebut`, `danseTape`, `danseFin` ; la boucle
  est devenue une fonction partagée `majDanse`, le club garde la sienne et ses bagarres `majBagarreClub`) — un bon danseur est payé une
  fois par vague (`dansePrimeVague`) ; **COCKTAIL** au bar tiki (`boireCocktail` : l'ivresse `P.ivresse` du club) ; **PLONGER DU
  PLONGEOIR** (une vraie chute : `P.chute`, réception par `plongeonJoueur`, sans dégâts) ; **PLONGER DU PONTON** dans la traverse.
  Le bouton d'action passe par `lagonAction` (branche de `majAction`, à pied).
- **La panique** : un tir ou une explosion à moins de 40 u (`DANGER`), ou un véhicule lancé (plus de 8 u/s) dans le club : la foule
  fuit en s'écartant du danger, la piste s'éteint, la danse s'arrête, une clameur ; elle retombe en 10 s. Les figurants paniquent par leur
  propre système (`FIGURANTS`).
- **La zone VIP** : y entrer à pied → un avertissement (« Zone VIP de la Brigada : on ne passe pas »), et au-delà de 2,5 s les deux
  gardes du cordon (des figurants armés, `LAGON.gardesFig`) deviennent de vrais gangsters `chrome` hostiles (`convertirSoldat`) ; un
  coup de feu à moins de 26 u arme aussi les gardes, les Dockside Boys et la Brigada du carré (le mécanisme des soldats de la base) —
  jamais les seules étoiles du joueur (`sansAlarme`).
- **Les bateaux de l'IA** (`LGN`, `majLagonBateaux`, `majLagonBateau`, conduit `lagonIA`) : au plus deux à la fois, de vrais véhicules
  (on peut les voler), nés en mer hors de vue sur le graphe des vedettes (`PCANAL.mers`), qui remontent par le graphe (`cheminCanal`,
  `piloterVedette`), accostent à un poste libre, font escale 40 à 75 s, repartent et disparaissent en mer hors de vue. Modèles :
  vedette, runabout, jet trois places, Espadon, cruiser (`LGN_CLES` : tous ont un chemin depuis la mer pour leur tirant d'air).
- **Décision 15 — se croiser dans un canal.** Mesuré sur 5 minutes simulées (`sonde_5min`) : deux bateaux qui se croisaient de front
  à l'embouchure du canal ouest se poussaient jusqu'à l'explosion (l'Espadon, 150 PV), et la vedette de police en patrouille suivait
  les bateaux à 8 u et les percutait par l'arrière à chaque ralentissement (40 à 50 chocs en 5 min). Désormais : un bateau de l'IA
  ralentit derrière un bateau qui roule (`bateauDevant` : 16 u, cône de ±35°, jamais un bateau amarré) ; deux bateaux qui se
  croisent se rangent chacun sur leur droite, **seulement s'il reste de l'eau au-delà** (`piloterVedette` : l'écart latéral, qu'elle
  avait déjà pour la police, plaquait sinon le bateau contre le coin du quai à l'embouchure), et celui qui arrive au Lagon ralentit ;
  calé contre un quai plus de 2 s, un coup de marche arrière ; un choc de quai ne les abîme pas (un jet trois places, 80 PV, explosait
  au coin du canal ouest et de la traverse — la « limite connue » des virages à angle droit de la V1), ni un choc avec un autre
  véhicule de l'IA ou une patrouille (`resoudreCollisionsVehicule` : 130 à 160 PV perdus en 5 min, mesurés par une pile d'appels) ;
  les tirs et les chocs du joueur, eux, les abîment toujours. La **patrouille de police** garde ses distances derrière un bateau de
  l'IA (jamais derrière celui du joueur : la poursuite ne change pas) et se range de face. Après : 15 à 18 chocs légers en 5 min,
  aucun bateau détruit, aucun immobile plus de 1 s hors escale, 3 à 4 allers-retours complets.
- **La musique** (`LAGON_SON`) : une boucle house synthétisée à 124 battements (grosse caisse, charleston, claps, basse la-fa-do-sol,
  accords), qui monte avec la proximité (gain et passe-bas, de 140 u au bord de la piste) ; coupée en salle, à la mort, à chaque
  partie (`lagonArreter` dans `mourir` et `startRun`).
- **La nuit** : les guirlandes, les spots de la piscine, les néons s'allument (`C.nuitMeshes`) ; des feux d'artifice au-dessus de la
  traverse toutes les 1,6 à 3,4 s (les particules `spawnP` de la jetée).
- **Ni voiture ni kiosque dans le club** : `canauxNettoyerVehicules` retire une voiture garée au hasard dans le Lagon (`dansLagon`) ;
  le kiosque du port posé en V2 sur le quai sud de la traverse n'est plus construit là (le bar tiki y est).
- **L'enseigne de l'arche s'efface** quand elle passe entre la caméra et le joueur (vue qui suit) : en entrant, elle remplissait le
  bas de l'écran.

### Les zones vides
- **Les blocs sombres** : le garage du port (capture A) est parti à la phase 4 ; l'atelier « Marée Basse » (capture B, D : un « dock
  RUCHE 9 », pâté (11,8)) **porte une cachette de l'amphibie** parmi ses volumes : il n'en perd aucun solide, il est **habillé** en
  **marché aux poissons** (halle carrelée de blanc à bandeau bleu, toit à deux pans et verrière, vitrines allumées la nuit, rideau
  métallique ; les trois conteneurs deviennent des chambres froides à bâches rayées ; deux étals de poissons sur la glace, cagettes,
  marchands et clients ; enseigne « MARCHÉ AUX POISSONS » à la place de « CALE SÈCHE ») ; l'**aquarium** (le cube de verre sombre de la
  V1, `bat()`) est refait dans le style du quartier (`mkAquariumCanaux` : socle blanc, façade bleu lagon à bandes vitrées allumées la
  nuit, crête de vague, un requin sur le toit) — même emprise, même solide, même porte.
- **Le quai nord de la traverse** (captures B, D) : aire de jeux (toboggan, bac à sable), glacier, terrasses de café autour du kiosque,
  jardinières, palmiers, bancs face à l'eau, pêcheurs ; la **station de location** (kiosque « LOCATION · JET-SKI · KAYAK » et son ponton,
  un jet-ski, un jet trois places et un kayak : de vrais véhicules garés, pilotables, à chaque partie).
- **Tous les autres quais publics** (`mkPromenadeCanaux`, 5) : les deux rives des canaux ouest et est hors des villas, la rive est
  du grand canal, le quai sud de la traverse hors du Lagon — tous les 8 u, un banc face à l'eau et son lampadaire côté rue, ou une
  jardinière ; jamais sur un lot, une allée, une rue, un pont, un pont-levis, une passerelle, une marche, une échelle, un ponton, ni
  près d'une porte, d'un kiosque ou d'un palmier des quais : 42 ensembles. Les grandes surfaces d'asphalte qui restent autour de la
  passerelle d'acier (capture D) sont de vraies rues (x = 168 au nord, z = 84, le carrefour x = 168 / z = 126) : le trafic y roule.

### Pièges trouvés
- **Le tirage de la partie suivante** (relevé du périmètre : 21 véhicules garés ailleurs dans toute la ville). Trois causes, trouvées
  en comptant les tirages de `startRun` → toutes les salles → `startRun` (la séquence du relevé) contre la phase 4 : (1) deux gardes de
  la Brigada, de vrais ennemis dès le début de partie — tout ce qui parcourt les ennemis tire des nombres (d'où les figurants armés) ;
  (2) les modèles neufs de la station de location (jet trois places, kayak) restaient dans les caches partagés (`_GEO_V3`, `_MATC_V3`…)
  — ils sont rendus après la création ; (3) ce que la phase 5 tire sur le générateur PRIVÉ des canaux changeait la couleur des voitures
  de luxe de la Brigada, garées juste après, et cette couleur entre dans le cache partagé de `mat()` : la location et le Lagon passent
  désormais APRÈS la Brigada dans `canauxStartRunPrive`. Résultat : même nombre de tirages et même valeur suivante que la phase 4, relevé
  sans écart. **Tout ajout à `canauxStartRunPrive` va à la fin.**
- Les ampoules des guirlandes vues de jour (des boules sombres de 6 cm) faisaient, vues de dessus, une **poussière noire** sur la
  piscine et le sable : ampoules de verre teinté, et le fil dessiné (`LineSegments`).
- Le test « véhicule lancé » posait la voiture dans la piscine : elle s'y noyait et le joueur en sortait.
- `valider.js` cherchait chaque salle dans `PORTES` (sauf les planques) : le chantier naval de la phase 4 n'y est pas (une porte de
  plus décalerait la ville) — il lit désormais `porteSalle(id)` pour toute salle.
- Les trois bateaux de location étaient garés l'un derrière l'autre, la proue contre la poupe du suivant : aucun ne démarrait
  (« Canaux, nautique et ambiance ») ; ils sont côte à côte, la proue vers le milieu de la traverse.
- Le test des feux d'artifice comptait les particules ACTIVES : la réserve tourne en anneau, pleine elle ne grossit plus (89 → 92) ;
  il compte désormais les particules lancées.
- « Minimap V2 » a échoué une fois dans un lot (8 pixels rouges pour un seuil de 9 à l'angle du nord, un test qui attend en temps
  réel) ; il passe seul, dans l'ordre de la suite, trois fois de suite, et sur la phase 4 : sans lien avec la carte. À surveiller.
- « Canaux de Los Reyes » vérifiait qu'un plan d'eau est relié au reste en regardant son CENTRE : celui de l'anse du chantier naval
  (phase 4) tombe sur son ponton ; un seul point navigable de la forme atteint par le remplissage suffit désormais.

### Tests (phase 5)
- Nouveau bloc « Canaux V3 : le Lagon » (lit `CANAUX.lagon`, `LAGON`, `LGN`, `LAGON_SON`, `BASSINS`, `PCANAL`, `CANAUX.location`,
  `CANAUX.promenade`) : la rue retirée, la piscine (eau au bon niveau), le ponton (praticable, un mur pour un bateau), un chemin depuis
  la mer pour chaque modèle et chaque poste ; la foule (49, tous les rôles, les danseurs bougent), les figurants (tous des
  `figurant()`), deux gardes au cordon qui ne sont pas encore des ennemis et ne s'arment pas pour des étoiles ; danser (payé une fois par vague), boire, plonger du plongeoir et du ponton (sans dégâts) ; la panique
  (un coup de feu, un véhicule lancé) ; la zone VIP (les deux gardes deviennent des gangsters hostiles) ; un bateau de l'IA qui accoste, fait escale et repart ; la musique (de loin, sur
  la piste, coupée à la mort) ; les feux d'artifice la nuit ; la location ; le marché garde les volumes du dock ; les promeneurs
  marchent ; ni voiture ni kiosque dans le club ; l'aquarium garde son solide et sa porte ; les quais meublés, rien dans l'eau ; **cinq
  minutes simulées** de bateaux de l'IA : nés, escale, départ, jamais coincés, jamais détruits.

### Performances (phases 5 et 6, `perf_v3.js`, phase 4 → phases 5-6, mêmes points ; machine chargée : seules les proportions comptent, **à juger sur iPhone**)

| Point | Classique : appels / triangles | Immersive : appels / triangles |
|---|---|---|
| centre du quartier = le Lagon (189, 140) | 209 / 321 k → 234 / 326 k (+12 %) | 1 707 / 684 k → 1 759 / 725 k (+3 %) |
| fête de nuit (189, 105) | 195 / 297 k → 235 / 332 k (+21 %) | 1 715 / 681 k → 1 702 / 690 k (−1 %) |
| Lagon nord (189, 132) | 185 / 295 k → 230 / 314 k (+24 %) | 1 747 / 713 k → 1 730 / 694 k (−1 %) |
| quai ouest (160, 60) | 217 / 300 k → 217 / 312 k | 1 323 / 606 k → 1 300 / 594 k |
| marina NE, grand canal, embouchure est, chantier | ±3 % | ±2 % |
| survol du côté est | — | 2 487 / 1 155 k → 2 518 / 1 125 k (+1 %) |

Par rapport à la référence du budget (V2 finale) : centre 213 / 245 k → 234 / 326 k (+10 % d'appels, +33 % de triangles), fête de
nuit 228 / 236 k → 235 / 332 k (+3 %, +41 %) — **dans le budget** (+15 %, +60 %). En vue de dessus, au nord du Lagon, +24 % par rapport
à la phase 4 : le DJ et le barman (deux corps animés, 26 appels) et les gerbes de la nuit (une particule = un appel ; ramenées de 40 à
26 par gerbe). Géométries : +23, +1,5 Mo. Construction : `mkLagon` et `mkPromenadeCanaux` dans `mkCanaux` (`CANAUX.tLagon`,
`CANAUX.tPromenade`). **Trouvé en mesurant** : les figurants coûtaient 119 appels de rendu au centre du Lagon (d'où la fusion des
immobiles et les promeneurs dans la foule).

### Captures (phase 5)
`captures/canaux_v3/p5_*` : le Lagon vu d'en haut et de près, le carré VIP et ses gardes, en vue qui suit (jour, nuit, à l'entrée sous
l'arche), le quai nord de la traverse (promenade, location), le marché aux poissons, l'aquarium, la rive est.

## Phase 6 — la carte, les balises, les performances (fait)

- **Grande carte et minimap** : le grand canal, la marina et les nouvelles jonctions étaient déjà dans les contours de l'eau
  (`C.boucles`, phase 1) ; s'y ajoutent **tous les pontons** (marina, chantier, Lagon, location — seuls ceux des villas V2 étaient
  dessinés), **les ponts-levis** (la volée orange au-dessus de l'eau, les culées) et **leur état** sur la grande carte aussi
  (`dessinerLevisCarte` : vert fermé, rouge levé — la minimap l'avait depuis la phase 2). Badges (`listeCommerces`, minimap et grande
  carte) : le **chantier naval** (🚤, un bateau) et **le Lagon** (🎉).
- **Activités et balises** (`activitesCanauxV3`) : la **marina** (⛵) et la **location de jet-skis et de kayaks** (🛶) au filtre
  « Activités » de la grande carte ; balises 3D du **chantier naval**, du **Lagon** et de la **marina** (`balisesCanauxV3`). **Piège** :
  `mkBalises` lit `pointsActivites` PENDANT le décor — une balise de plus y aurait décalé ses tirages (`aD`) : ces activités n'entrent
  dans la liste qu'une fois les canaux construits (`CANAUX.balisesV3`, posé en fin de `mkCanaux`), et leurs balises sont posées là, sur
  le générateur privé des canaux. Le chantier et le Lagon ne sont pas répétés dans les activités de la carte (deux icônes au même
  endroit) : leur badge suffit.
- **Performances** : voir la phase 5 (mesures communes).
- Tests : « Carte et catalogue » (51 activités sur la carte et en balises), « Minimap », « Minimap V2 », « Vue immersive, retours »
  (84 balises) repassent.
- Captures : `captures/canaux_v3/p6_carte_est.png`, `p6_carte_quartier.png`, `p6_carte_lagon.png`, `p6_minimap_chantier.png`,
  `p6_minimap_lagon.png`.
