# Clignotements et lenteurs en hauteur, puis ajouts — suivi (branche `perf-hauteur`)

Brief : `rapport_nuit/PROMPT_PERF_HAUTEUR.md`. Captures du joueur : `rapport_nuit/captures/bug_hauteur/` (iPhone, soucoupe en vue 2D à
166–168 m au-dessus de l'aéroport et du désert). Un commit par étape. Toutes les mesures sont faites sans carte graphique (navigateur
de test, rendu logiciel) : seules les proportions avant / après comptent, **les vrais chiffres sont à relever sur l'iPhone**.

Ce que montrent les captures (zooms à 1/20 s d'intervalle) : des bandes qui changent de surface d'une image à l'autre partout où deux
sols se superposent (désert / sol de base, pelouse / tarmac, bord de l'aérogare) — le combat de profondeur (« z-fighting ») — et une
tache sombre qui change de forme en bas à gauche.

| # | Étape | État |
|---|---|---|
| 1 | Shaders, textures et géométries préparés au chargement | fait |
| 2 | Superposition des sols, plan proche | fait |
| 3 | Grésillement des arbres vus de loin | fait |
| 4 | Performances en altitude | fait |
| 5 | Test : deux images à 170 m, aucun pixel des sols qui change | à faire |
| 6 | Tous les véhicules du jeu jouables | à faire |
| 7 | Une récompense pour le Titanic | à faire |
| 8 | Le couple à la proue | à faire |
| 9 | La page de statistiques | à faire |
| 10 | La vedette bloquée dans le canal en impasse | à faire |
| 11 | Suite complète et `valider.js` | à faire |

## 1. Shaders, textures et géométries préparés au chargement — fait

**Cause.** Le jeu ne préparait rien : aucun `renderer.compile`, aucun envoi de texture d'avance. Le menu ne rend pas la ville, donc
**aucun shader n'était compilé avant la première image de jeu** (0 programme au chargement). La 1re image en compilait 25 d'un coup ;
ensuite, à chaque zone survolée pour la première fois, la carte recevait les géométries (les bâtiments fusionnés pèsent lourd) et les
textures au milieu d'une image.

**Ce qui est fait** (`PREP`, `preparerRendu`, `preparerObjet`, `preparerSceneAPart`, `preparerNouveaux`, `prepTextures`, juste avant
la boucle principale) :
- **au chargement** (après la construction de la ville, avant que « Jouer » s'allume) : `renderer.compile` de toute la scène (objets
  cachés compris : 50 programmes), `initTexture` de toutes les textures, puis un rendu complet SANS élagage dont rien ne s'affiche
  (ciseaux d'un pixel) — les géométries partent à la carte ;
- **à la 1re partie**, une seconde fois (ce que `startRun` crée : véhicules, gens, sols refaits en 512 px) ; aux parties suivantes,
  les textures seulement ;
- **ce qui naît ensuite**, juste avant sa première image : chaque véhicule créé (trafic, véhicules du décor promus des canaux, exposés,
  garés…), chaque salle construite, la foule, les chaloupes et les fusées du Reyes Majestic, la course de supercross (décor et pilotes),
  le cockpit (sa scène à part), l'arme en main (ville, stand de tir, ball-trap). `preparerObjet` compile l'objet SEUL dans une scène de
  préparation qui a les mêmes lumières et le même brouillard que la ville (le shader en dépend) : un `compile` de toute la ville coûte
  ~0,5 s même quand tout est déjà prêt (18 463 objets) — impossible au milieu du jeu.
- Aucun tirage : les lumières de la scène de préparation naissent sur un générateur privé ; empreinte de la ville identique (décor
  931930327, portes, chalet, mobilier), tirage principal et séquence `startRun` → salles → `startRun` identiques.

**Mesures** (`scratchpad/ph/traversee.js` : soucoupe à 168 m, vue 2D, 18 points de la carte, 8 images chacun, temps de calcul + rendu
+ attente de la carte ; puis le même parcours une 2e fois) :

| | avant | après |
|---|---|---|
| 1re traversée, total | 51,7 s | 19,6 s |
| 1re traversée, pire image | 11,4 s (la 1re : 25 shaders) | 1,4 s (la 1re : constructions à la volée) |
| 2e traversée, total (déjà tout prêt) | 15,9 – 17,5 s | 17,2 s |
| préparation au chargement | 0 | 40,7 s dans le navigateur de test (compilation logicielle) |
| `startRun` de la 1re partie | 5,3 s | 12,1 s |

La 1re traversée coûte désormais presque autant que la 2e : les pics de « première fois » sont partis au chargement.
**Le prix** : un chargement plus long (sur iPhone, la compilation est bien plus rapide que dans le navigateur de test : à mesurer).
Les pics réguliers d'~0,6 s qui restent dans les deux traversées n'envoient rien à la carte et n'ont pas plus d'objets à dessiner que
les images voisines : c'est le moteur de rendu logiciel du navigateur de test (vérifié image par image, `ph/pics.js`).

**À vérifier sur iPhone** : la durée du chargement (écran « Chargement de Los Reyes… ») ; le premier survol de la ville en soucoupe ;
l'entrée dans une salle, la vue 1re personne, le cockpit (plus de saccade à la première fois).

## 2. Superposition des sols et plan proche — fait

**Cause.** La précision de la profondeur se partage entre le plan proche et le plan lointain : l'écart qu'on peut départager à une
distance d vaut à peu près d² / (plan proche × 2²⁴). La caméra avait un plan proche fixe de 0,5 u. En vue 2D, la soucoupe à 168 m met la
caméra à ~300 u au-dessus du sol : l'écart départageable y vaut ~1 cm, et la vue de dessus regarde presque à la verticale (deux sols
écartés de 1 cm restent à 1 cm en profondeur ; en vue 3D, l'angle rasant les écarte bien plus). Or l'aéroport empile **cinq sols** —
sol de base (0), dalle du désert (0,011), pelouse (0,07), tarmac (0,12), piste (0,17) — et d'autres couples sont exactement à la même
hauteur (les dalles de la plage se chevauchent de 1 u). D'une image à l'autre, c'est l'autre surface qui passait devant.

**Le relevé** (`rapport_nuit/outils/releve_sols.js` : un rayon vertical tous les 4 u sur toute la carte, surfaces horizontales à moins
de 6 cm l'une de l'autre ; données complètes : `rapport_nuit/perf_hauteur_sols.json`) — **451 couples**, 222 entre sols opaques
(482 000 u²) et 229 avec un voile transparent (bandes de transition, fondus du littoral ; 42 000 u²) :

| écart | couples | surface (u²) |
|---|---|---|
| moins de 2 mm (pratiquement à la même hauteur) | 28 | 7 008 |
| 2 à 5 mm | 33 | 2 016 |
| 5 à 13 mm | 73 | 187 776 |
| 13 à 30 mm | 161 | 181 536 |
| 30 à 61 mm | 156 | 145 344 |

Les plus grands : dalle du désert de l'aéroport sur le sol de base (167 000 u², 1,1 cm), désert de l'ouest (0,02) sur le sol de base
(98 000 u²), pelouse de l'aéroport sur le désert (30 000 u², 5,9 cm), tarmac sur la pelouse (16 000 u², 5 cm), piste et voies de
circulation sur le tarmac ; à la même hauteur exacte : les dalles de la plage (une jointure de 1 u tous les 42 u), les pelouses des
villas de Los Reyes Hills sur le terrain, des surfaces d'un même maillage fusionné (rangées de villas des canaux : 0,26 / 0,273).

**Ce qui est fait :**
- **Le plan proche suit la hauteur** (`planProche`, `reglerPlanProche`, réglé à un seul endroit, à la fin de `majCamera`) : en vue 2D et
  3D, la moitié de la hauteur de la caméra au-dessus du plus haut décor (`PROCHE_DECOR_MAX` = 118 u : le sommet du mont et ses arbres),
  jamais plus de 22 % de la distance au joueur, entre 0,5 et 40 u. Au sol, rien ne change (0,5) ; la soucoupe à 168 m en 2D : 32 u
  (précision ×64) ; à 80 m : 22 u ; en vue 3D derrière la soucoupe à 168 m : 7,3 u. Dans les salles : 0,5.
- **1re personne, cockpit, chute 1P, stand de tir : 0,1** (`NEAR_1P`, au lieu de 0,05). Le cockpit et l'arme en main sont dessinés
  dans leur propre scène, profondeur effacée : ils gardent 0,05 le temps de leur rendu (`pousserPlanProche`, `NEAR_SCENES`) — rien du
  volant, des mains ou des organes de visée n'est coupé (tests « Vue à la 1re personne », « Cockpits », « Poings », « Avions au
  cockpit », « Reflets au cockpit », « Soucoupe 1P », pavillon du taxi : verts).
- **Un ordre fixe pour les sols superposés** (`rangerSols`, au chargement) : chaque sol plat opaque prend son rang dans l'empilement des
  sols qu'il recouvre (à hauteur égale, le dernier construit passe dessus), traduit en `polygonOffset` (`SOLS_DECALAGE` : −0,25 et −2
  par rang, 8 rangs au plus). 422 sols examinés, 82 rangés, 22 matériaux copiés (partagés par des sols de rangs différents, ou rendus
  par `mat()` — on ne modifie jamais ceux-là), sur un générateur privé ; 3 matériaux à shader ajouté partagés entre rangs prennent le
  rang le plus bas (un `clone` ne copie pas `onBeforeCompile`). Les voiles transparents posés au sol (bandes de transition, fondus) ne
  s'écrivent pas dans la profondeur : leur ordre de dessin, trié par distance à la caméra, s'inversait en vol entre deux voiles qui se
  recouvrent — ordre fixe désormais, du plus bas au plus haut (`renderOrder`). Coût : ~0,6 s au chargement dans le navigateur de test
  (surtout les boîtes de 5 681 géométries, calculées une fois).
- Pas de `logarithmicDepthBuffer` (tous les shaders maison seraient à revoir).

**Mesure** (`rapport_nuit/outils/combat_profondeur.js`) : le rendu logiciel du navigateur de test a une profondeur bien plus précise
que l'iPhone (il ne montre pas le clignotement). Le test divise donc le plan proche par K (la profondeur devient K fois moins précise,
et le décalage des `polygonOffset` grossit d'autant : l'imitation est fidèle), donne une couleur unique à chaque sol plat, et compte les
pixels où un autre sol gagne qu'au rendu de référence très précis — deux images de suite, la caméra déplacée d'une image de vol :

| vue, hauteur (K = 16) | avant | après |
|---|---|---|
| 2D, soucoupe à 168 m au-dessus de l'aéroport et du désert | 137 000 pixels sur 329 000 (42 %) | 0 |
| 2D, 80 m | 73 000 – 74 000 | 0 |
| 2D, 20 m | 1 700 – 1 900 | 0 |
| 3D, 168 m | 1 200 – 30 000 | 0 |
| 3D, 20 m | 0 – 1 | 0 |
| 2D, 168 m, K = 1 (précision du rendu de test) | 183 – 194 | 0 |

Captures (rendu réel, profondeur ÷16) : `captures/bug_hauteur/sols_168m_precision16_avant.png` (les bandes des captures du joueur sur
tout le désert et le tarmac) et `…_apres.png` ; en couleurs de sols, erreurs en rouge : `sols_168m_erreurs_avant.png` / `…_apres.png`.
Vérifié en vue 3D au ras du tarmac : les roues des avions et les pieds des passants restent devant le sol (`polygonOffset` modeste).
Tirages et empreinte de la ville identiques.

**À vérifier sur iPhone** : la soucoupe à 170 m au-dessus de l'aéroport, du désert et de la plage (plus aucune bande) ; la 1re personne
(arme, mains, organes de visée près de l'œil) et le cockpit ; un objet qui passerait tout près de la caméra en vol haut (un autre
appareil à moins de ~30 u de la caméra serait coupé — jamais le sien).

## 3. Le grésillement « des arbres » — fait

**Cause trouvée.** La tache sombre en bas à gauche des captures (x 364, z 189, au bord du désert de l'aéroport) n'est pas un bosquet :
c'est **le cratère de la soucoupe écrasée** (`mkCraterOvni`, `POIS.crash` : la soucoupe garée, un anneau de roches, deux disques
calcinés à 0,03 et 0,04 u). Les deux disques reposent sur la dalle du désert (0,011) et le sol de base (0) : quatre surfaces à 4 cm
près, qui changeaient de place d'une image à l'autre exactement comme les bandes — d'où une forme qui change (le disque clair, le
disque foncé, le sable par endroits). Corrigé par l'étape 2 (rangés : base 0, désert 1, disque 2, disque 3 ; 0 pixel faux à cet
endroit, profondeur ÷16, deux images de suite).

Les vrais arbres (sapins, pins, feuillus, palmiers de la ville) sont des maillages opaques sans texture découpée : vus de 168 m, ils
ne font que quelques pixels et leurs bords crénèlent (le rendu est sans anticrénelage, choix de performance) — rien ne change de
forme. Toutes les textures ont leurs mipmaps (WebGL2). **Les seuls feuillages découpés** (`alphaTest`) sont les touffes d'herbe et
les fleurs du Mont Reyes : 1 100 touffes croisées de 0,9 u, qui, vues de haut, tombent sous le pixel — le test d'opacité les fait
apparaître et disparaître d'une image à l'autre. Elles n'étaient masquées que selon la distance HORIZONTALE au mont (170 u) :
au-dessus du mont, en vol, elles restaient affichées.

**Ce qui est fait** : les petites choses du mont (herbe, fleurs, cailloux) ne s'affichent plus quand la caméra est à plus de
`MONT_PETITS_HAUT` (70 u) au-dessus du relief sous elle (`majMontV2`). Au sol, à pied ou en véhicule, rien ne change (la caméra
de la vue 2D est à ~42 u au-dessus du joueur). Tests du Mont Reyes V2 (relief et sols, la vie) verts.

**Non fait, à décider** : l'anticrénelage (`antialias:true` à la création du rendu) adoucirait les bords de tous les petits objets
vus de haut ; sur les puces Apple il est peu coûteux, mais il touche tout le jeu et ne se change qu'au chargement — à essayer sur
l'iPhone avant de le proposer.

**À vérifier sur iPhone** : survoler le cratère de la soucoupe (bord du désert, au sud de l'aéroport) et le Mont Reyes à 170 m.

## 4. Performances en altitude — fait

**Mesure de départ** (`rapport_nuit/outils/cout_altitude.js` : soucoupe en vue 2D, 40 images par point, calcul, rendu avec attente
de la carte, appels de rendu, triangles) : au-dessus du centre-ville, 370 appels à 20 m, 1 395 à 80 m, **2 031 à 170 m** (809 000
triangles). Sur les ~1 600 objets dans le champ à 170 m, 1 170 font moins de 8 pixels à l'écran et 630 moins d'un pixel : surtout des
pièces de véhicules et de personnages. Deux causes en plus :
- la version lointaine du trafic (`majLodV4`, un seul objet par véhicule) se décidait sur la distance **horizontale** au joueur : sous la
  soucoupe, les voitures restaient détaillées (25 à 30 pièces chacune) alors que la caméra était à 300 u ;
- le plan lointain de la caméra restait à 900 u quel que soit le brouillard (150 à 320 u en ville) : **tout ce qui est caché par le
  brouillard était quand même dessiné** — vrai aussi au sol en vue 3D.

**Ce qui est fait** :
- **Le plan lointain suit le brouillard** (×1,03, entre 120 et 900 u ; `reglerPlanProche`) — rien n'est visible au-delà ; le dôme du
  ciel de la vue 3D (700 u, sans brouillard) est réduit d'autant (son dégradé ne dépend que de la direction : identique à l'œil).
- **En altitude, le brouillard se resserre et commence au sol** : vue plongeante (rayon du haut de l'écran à plus de 14° sous
  l'horizon), il commence à 80 % de la hauteur de la caméra et s'arrête au sol vu en haut de l'écran (+5 %) ; à 170 m, il s'arrêtait à
  524 u et commence désormais à 243 u au lieu de 60 — le sol sous la soucoupe n'est plus voilé (il l'était à plus de 50 %).
- **Au-delà de 150 u de caméra au-dessus du sol** (`ALT_DECOR`, hystérésis à 135 ; ~65 m d'altitude en vue 2D) : les véhicules passent
  en version lointaine (`majLodV4` compte la hauteur de la caméra au-delà de 60 u), et **le temps du seul rendu** (`rendreImage`,
  `altDecorMasquer` / `altDecorRendre` : rien ne change pour le jeu, les collisions ni les autres systèmes) on masque les petits objets
  fixes du décor (rayon < 1,2 u, relevés une fois), les figurants, et les petites pièces des véhicules sans version lointaine (roues,
  rétroviseurs, phares : la caisse reste ; jamais celui du joueur). Pas les piétons, ennemis, ramassables, balises (le jeu en a besoin
  vu de haut : le rayon de la soucoupe, les tirs), ni le mobilier fusionné (ses zones portent aussi les fontaines et les statues).
- Les particules lointaines : rien de plus (elles sont peu nombreuses, et le plan lointain coupe déjà celles du brouillard).

**Mesures** (rendu logiciel : les temps sont bruités, les appels de rendu et les triangles sont fiables) :

| point, altitude | appels avant → après | triangles avant → après | calcul (ms) avant → après |
|---|---|---|---|
| centre, 20 m | 370 → 370 | 334 000 → 334 000 | 24,6 → 25,5 |
| centre, 80 m | 1 395 → 485 | 579 000 → 417 000 | 24,9 → 27,3 |
| centre, 170 m | **2 031 → 817** | 809 000 → 597 000 | 32,1 → 31,3 |
| aéroport, 80 m | 367 → 219 | 340 000 → 326 000 | 13,4 → 15,2 |
| aéroport, 170 m | 1 151 → 519 | 715 000 → 632 000 | 13,2 → 14,0 |
| canaux, 80 m | 770 → 444 | 599 000 → 557 000 | 19,5 → 19,7 |
| canaux, 170 m | 1 519 → 763 | 869 000 → 765 000 | 19,3 → 18,3 |
| mont, 80 m | 746 → 229 | 329 000 → 283 000 | 18,3 → 19,7 |
| mont, 170 m | 1 309 → 428 | 428 000 → 326 000 | 16,4 → 18,6 |
| vue 3D au sol, dans l'axe d'une avenue | **1 967 → 624** | 566 000 → 344 000 | rendu 1 154 → 141 ms |

Au sol en vue 2D, rien ne change (mêmes appels). En vue 3D au sol, l'image est identique à l'œil (capture comparée) et coûte trois
fois moins d'appels. Le calcul (`tick`) ne bouge pas (le masquage coûte ~0,1 ms). Captures à 170 m au-dessus du centre :
`captures/bug_hauteur/centre_170m_avant.png` / `…_apres.png` (moins voilé, mêmes repères).

**Plafond de la caméra en 2D : proposé, pas fait.** La caméra de la vue 2D monte de 1,5 u par mètre d'altitude (52 + 0,75 × alt, puis
le point visé suit aussi). Un plafond (par exemple 180 u au-dessus du sol, atteint vers 85 m d'altitude) réduirait encore la surface
vue d'environ 40 % à 170 m, mais la soucoupe paraîtrait plus grosse et le sol plus proche qu'il ne l'est : à décider après l'essai sur
iPhone des mesures ci-dessus.

**À vérifier sur iPhone** : la fluidité à 170 m au-dessus du centre et des canaux ; le passage des 65 m environ (les petits objets et les
figurants disparaissent d'un coup : est-ce visible ?) ; la vue 3D en ville (même image, plus fluide).
