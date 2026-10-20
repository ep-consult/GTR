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
