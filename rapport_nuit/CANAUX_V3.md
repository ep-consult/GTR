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

- [ ] Phase 1 — le côté est, les jonctions, les embouchures
- [ ] Phase 2 — les ponts-levis (côté des gros bateaux) et les ponts en dur (côté des petits)
- [ ] Phase 3 — tous les bateaux pilotables, de nouveaux modèles
- [ ] Phase 4 — le chantier naval et le garage à voitures
- [ ] Phase 5 — le lieu de fête central et les zones vides
- [ ] Phase 6 — carte, ambiance, performances
