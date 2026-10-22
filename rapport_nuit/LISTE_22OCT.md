# Liste de retours de playtest du 22 octobre — suivi

Branche `retours-22oct` (partie de `retours-20-octobre`, non fusionnée : la liste s'appuie sur ce qu'elle a construit). Brief :
`rapport_nuit/PROMPT_LISTE_22OCT.md`. Captures : `rapport_nuit/captures/liste_22oct/` (`avant_*` = la version d'avant la liste,
commit `c3f80b4`). Un commit par point qui marche.

Ordre suivi : 1, 17, 4, 3, 2, 5, puis le reste.

| # | Point | État |
|---|---|---|
| 1 | Cabrage des motos : un jeu d'équilibre, plus de « trop cabré » | ☑ |
| 2 | Tous les véhicules du quartier des canaux jouables | ☐ |
| 3 | Véhicules exposés (derby, REYES MOTORS) volables | ☐ |
| 4 | Les sons propres | ☑ |
| 5 | Cockpit du taxi : plus d'air sous le toit | ☐ |
| 6 | Les publics de décor fuient et se visent | ☐ |
| 7 | La statue de la Liberté plus grande | ☐ |
| 8 | Habits et tatouages réalistes | ☐ |
| 9 | Plus d'améliorations au chantier naval | ☐ |
| 10 | Le paquebot qui se brise, plus impressionnant | ☐ |
| 11 | Explosions, camion-citerne, pompes à essence | ☐ |
| 12 | Sortir ses véhicules depuis la villa | ☐ |
| 13 | Plongeons : l'entrée dans l'eau compte | ☐ |
| 14 | Le plongeon de falaise épique, l'eau en bas | ☐ |
| 15 | La tour de contrôle, un vrai jeu d'aiguilleur | ☐ |
| 16 | Course de supercross et sa tenue | ☐ |
| 17 | Les ponts : décoller en voiture, passer dessous en avion | ☑ |

## Décisions prises seul

- **Branche** : `retours-22oct` part de `retours-20-octobre` (et non de `main`) : les points de la liste portent sur ce que les deux
  chantiers précédents ont construit (canaux V3, paquebot, Cliff Diving, cabrage en équilibre…).

## 4 — Les sons, propres (fait)

**Audit** (avant ; mesures par rendu hors ligne, protocole du test, tableau plus bas) :
- **Clics** : chaque son partait à plein niveau dès le premier échantillon (`setValueAtTime(vol, t)`) — 65 à 100 % de la crête dans la
  1re milliseconde sur les 44 sons — et finissait par une coupure (`stop` 20 ms après une rampe qui n'atteignait pas zéro).
- **Stridence** : carrés et dents de scie nus (`beep` avait `'square'` par défaut : interface, tirs, rechargements), souffles passés
  au filtre passe-HAUT (lame, swing, manœuvres de rechargement, roquette) : jusqu'à 130 % de l'énergie au-dessus de 6 kHz (le
  passe-haut résonnant y ajoutait même de l'énergie) ; désintégrateur 67 %, choc léger 85 %.
- **Pas de son par arme** : l'Uzi, l'AA-12, le revolver, l'arbalète et le minigun empruntaient le son d'une autre arme (9 sons pour
  14 armes à feu).
- **Chocs** : un seul bruit plus ou moins fort ; un frôlement « claquait » comme un accident (choc 0,1 : crête 0,17, 85 % d'aigus).
- **Niveaux** : rien sur la sortie — le désintégrateur de l'OVNI écrêtait (crête 1,23), une explosion (0,39) était à peine plus forte
  qu'un fusil à pompe (0,40) ; tout était à plein volume quelle que soit la distance (un tir d'ennemi à 140 u comme à 5 u).
- **Toujours le même son** : aucune variation entre deux tirs ; couches enchaînées par `setTimeout` (qui tombent à côté sous charge) ;
  bruit blanc tiré sur `Math.random` à l'initialisation de l'audio.
- **Aucune limite de voix** : une rafale de minigun empilait des centaines de sources.

**Fait** (bandeau AUDIO, `busAudio`, `SON`, `beep`, `bruit`, `echoSon`, `SFX`) :
- **Bus** (`busAudio`, aussi construit par le test sur un `OfflineAudioContext`) : master → compresseur (`SON_BUS` : −20 dB, 3,5:1,
  attaque 4 ms) → limiteur (−3 dB, 20:1) → sortie ; les effets passent par un plateau qui retire 5 dB au-dessus de 5 kHz ; un bus
  d'écho (retard de 0,23 s filtré à 1,6 kHz, deux ou trois retours) pour le sniper, le revolver, la pompe, les explosions.
- **Enveloppes** : montée de 4 à 6 ms, décroissance exponentielle, puis retour à zéro en 12 ms avant l'arrêt. Le carré et la dent de
  scie passent par un passe-bas (5 × la fréquence, 700 à 4 200 Hz) ; un souffle filtré en passe-bande ou passe-haut est plafonné à 6 kHz.
- **Variations** : ± 3,5 % de hauteur par voix, ± 4 % de vitesse et un départ au hasard dans le bruit, tirés sur un générateur PRIVÉ
  (`sonAlea`) ; le bruit blanc lui-même est un xorshift (aucun `Math.random` dans l'audio).
- **Temps audio** : les couches d'un son partent décalées en temps audio (`sonApres`), plus jamais par `setTimeout`.
- **Distance** (`sonA`) : plein volume à 14 u, puis (1 − d)² jusqu'au silence à 150 u — tirs des ennemis et explosions.
- **Voix** : `SON_VOIX_MAX` = 32 sources en même temps (les sons d'interface passent toujours).
- **Catalogue refait en couches** (attaque, corps, poids, queue) : un son pour chacune des 14 armes à feu (pistolet sec, revolver
  lourd à queue, silencieux en « pff », arbalète, P.M., Uzi plus aigu, minigun grave et court, fusil, pompe grave, AA-12, sniper et son
  écho, roquette, lance-flammes, désintégrateur) ; mêlée ; manœuvres ; interface en triangles et sinus. **Chocs selon la violence** :
  la tôle (bruit grave qui s'ouvre avec la violence), sa résonance au-delà de 0,2, le pare-chocs (un coup sourd) au-delà de 0,45, le
  verre qui éclate au-delà de 0,75.

**Décision** : les crêtes « après » sont mesurées à la sortie du compresseur, qui a un gain de rattrapage — elles sont plus hautes que
les « avant » (mesurées sans bus, il n'y en avait pas) ; ce qui compte est leur hiérarchie, désormais : explosion (0,74) > armes (0,12 à
0,70) > mêlée (0,14 à 0,55) > interface (0,05 à 0,36), et rien n'écrête. **Piège trouvé** : dans un rendu hors ligne, le compresseur
de WebAudio part FERMÉ à t = 0 (il atténue tout, même sous son seuil, pendant ~0,3 s) — le test joue chaque son 0,3 s après le début ;
en jeu, le bus tourne en continu.

**Test** « Liste du 22 octobre, point 4 » : chaque son du catalogue (lu dans `SFX`, plus `SFX.choc` à quatre violences) rendu hors
ligne à travers les vrais bus ; aucun écrêtage, énergie au-dessus de 6 kHz sous 12 %, crête dans la fourchette de sa famille, moins de
45 % de la crête dans la 1re milliseconde (les anciens sons : 65 à 100 %), fin qui retombe à zéro ; un tir à 10 u à plein volume, à
100 u à ×0,14, muet à 160 u ; 80 rafales de P.M. tiennent sous 32 voix ; deux tirs de pistolet différents ; aucun `Math.random` dans
le catalogue. La version d'avant y échoue (clics sur tous les sons, aigus de la lame, du swing, des manœuvres et de la roquette,
pas de bus ni d'atténuation).

**Reste / à écouter sur iPhone** : le niveau général (le compresseur remonte les sons faibles : la musique et les ambiances des
salles passent par le même bus), la queue d'écho du sniper et des explosions, la sirène (désormais un triangle filtré). Les sons
continus (moteur, ambiances des salles et des planques, rayon de l'OVNI) n'ont pas été refaits : ils n'avaient ni clic ni stridence
mesurés (ce sont des nappes filtrées).

**Mesures** (crête après le bus, part de l'énergie au-dessus de 6 kHz, part de la crête atteinte dans la 1re milliseconde) :

| Son | Famille | Crête avant → après | Énergie > 6 kHz avant → après | 1re ms (part de la crête) avant → après |
|---|---|---|---|---|
| coup | melee | 0,159 → 0,539 | 0 % → 0 % | 65 % → 10 % |
| batte | melee | 0,201 → 0,549 | 0 % → 0 % | 65 % → 13 % |
| lame | melee | 0,332 → 0,29 | 91 % → 6 % | 99 % → 12 % |
| swing | melee | 0,158 → 0,14 | 130 % → 8 % | 82 % → 29 % |
| pistolet | armes | 0,249 → 0,702 | 1 % → 1 % | 84 % → 21 % |
| revolver | armes | (nouveau) → 0,673 | — → 0 % | — → 22 % |
| silence | armes | 0,055 → 0,166 | 0 % → 0 % | 75 % → 11 % |
| arbalete | armes | (nouveau) → 0,282 | — → 0 % | — → 14 % |
| pm | armes | 0,129 → 0,536 | 2 % → 1 % | 91 % → 13 % |
| uzi | armes | (nouveau) → 0,439 | — → 2 % | — → 27 % |
| minigun | armes | (nouveau) → 0,471 | — → 0 % | — → 14 % |
| fusil | armes | 0,242 → 0,648 | 1 % → 0 % | 76 % → 10 % |
| pompe | armes | 0,4 → 0,686 | 0 % → 0 % | 40 % → 18 % |
| aa12 | armes | (nouveau) → 0,643 | — → 0 % | — → 19 % |
| sniper | armes | 0,302 → 0,657 | 1 % → 0 % | 100 % → 18 % |
| roquette | armes | 0,679 → 0,517 | 86 % → 1 % | 88 % → 5 % |
| flamme | armes | 0,042 → 0,122 | 0 % → 0 % | 98 % → 25 % |
| desintegrateur | armes | 0,408 → 0,463 | 67 % → 1 % | 100 % → 13 % |
| desintOvni | explosions | 1,228 → 0,843 | 54 % → 0 % | 52 % → 14 % |
| recharge | divers | 0,088 → 0,283 | 6 % → 3 % | 99 % → 22 % |
| rechSort | divers | 0,289 → 0,25 | 105 % → 9 % | 98 % → 19 % |
| rechInsere | divers | 0,175 → 0,395 | 2 % → 0 % | 83 % → 28 % |
| rechCulasse | divers | 0,374 → 0,441 | 81 % → 2 % | 100 % → 11 % |
| rechDouilles | divers | 0,045 → 0,097 | 0 % → 0 % | 100 % → 11 % |
| vide | divers | 0,088 → 0,253 | 2 % → 1 % | 100 % → 10 % |
| ramasse | interface | 0,117 → 0,297 | 8 % → 0 % | 100 % → 10 % |
| headshot | interface | 0,13 → 0,286 | 9 % → 0 % | 100 % → 10 % |
| cash | interface | 0,104 → 0,267 | 11 % → 0 % | 98 % → 10 % |
| soin | interface | 0,15 → 0,374 | 0 % → 0 % | 100 % → 11 % |
| degat | divers | 0,074 → 0,372 | 0 % → 0 % | 66 % → 4 % |
| mort | divers | 0,219 → 0,475 | 4 % → 0 % | 52 % → 17 % |
| etoile | interface | 0,161 → 0,361 | 8 % → 0 % | 99 % → 10 % |
| vague | divers | 0,177 → 0,358 | 4 % → 0 % | 40 % → 14 % |
| niveau | interface | 0,154 → 0,377 | 7 % → 0 % | 95 % → 10 % |
| achat | interface | 0,133 → 0,34 | 8 % → 0 % | 100 % → 10 % |
| refus | interface | 0,146 → 0,369 | 1 % → 0 % | 100 % → 10 % |
| klaxon | divers | 0,178 → 0,42 | 4 % → 0 % | 56 % → 20 % |
| spec | divers | 0,246 → 0,452 | 2 % → 0 % | 26 % → 15 % |
| ui | interface | 0,073 → 0,182 | 4 % → 0 % | 100 % → 10 % |
| explo | explosions | 0,394 → 0,739 | 0 % → 0 % | 33 % → 18 % |
| choc0.1 | chocs | 0,166 → 0,111 | 85 % → 0 % | 100 % → 9 % |
| choc0.5 | chocs | 0,416 → 0,578 | 14 % → 0 % | 96 % → 18 % |
| choc0.9 | chocs | 0,645 → 0,602 | 12 % → 1 % | 99 % → 10 % |
| choc1.4 | chocs | 0,791 → 0,658 | 14 % → 1 % | 100 % → 15 % |

## 17 — Les ponts : on décolle quand on passe vite, on passe dessous en avion (fait)

**Retrouvé** : les ponts routiers des canaux (`CANAUX.ponts` : nordOuest vénitien, nordEst Art déco, sudOuest orange,
sudEst tropical, plageOuest plage, plageEst pierre), tous orientés en x sur les rues z = 42, 168 et 252. Dans la ville, aucun autre
pont routier ne s'y prête (passerelles piétonnes, ponts-levis à part : ils gardent leur tremplin quand on force la barrière).

**Cause** : le tablier avait un plateau de 10 u et la voiture ne quittait jamais la chaussée (sa hauteur était posée sur le profil à
chaque image) ; un aéronef voyait le DESSUS du tablier comme sol, même en dessous — il « se posait » ou s'écrasait sous le pont
contre un volume qu'on ne voit pas ; et sur l'eau des canaux il voyait le fond (−2,4) au lieu de la surface.

**Fait** :
- **L'envol est physique** (`envolPont`) : le profil du tablier (`hauteurPont`, un smoothstep) a une pente et une courbure exactes
  (`pentePont`, `courburePont`). Tant que la courbure demandée h''·vx² reste au-dessus de −26 (la gravité du saut), la caisse suit ;
  au-delà, elle décolle avec la vitesse verticale de la chaussée — puis la physique de saut existante (v.enAir, v.vy, assiette en vol).
  Au pas : rien (vitesse critique 10 à 13 u/s selon le pont, `vcritPont`). Un seul piège trouvé : au pas fixe, la voiture « se
  reposait » une image après l'envol (la chaussée monte encore) ; elle ne se pose plus en montant.
- **Trois grandes arches à l'ouest** (`ARCHES_PONTS`) : nordOuest 5 u, sudOuest 5,2 u, plageOuest 6,5 u (avant 2,7) ; derrière elles,
  la route est longue et sans eau. L'arche du pont vénitien suit la hauteur. Le pont de pierre (plageEst) garde 2,7 u (la vedette de
  police passe dessous) mais ses rampes s'allongent : la voiture de sport retombe avant l'embouchure du grand canal.
- **Réception** : jamais mortelle ni cassante sous ~34 u de chute (`v.sautPont`), distance, points (×1,5 réception propre), record
  par pont `META.sautsPonts` (clés fixes = les identifiants des ponts), « 96 m — PONT VÉNITIEN ».
- **Le trafic et l'IA** plafonnent leur vitesse à 75 % de la vitesse critique, dix mètres avant le tablier (`plafondPontIA`) : ils
  passent le dos d'âne sans décoller (le trafic ne décolle de toute façon jamais : il ne passe pas par la physique du saut).
- **Sous les ponts, en vol** : la collision suit ce qu'on voit. Le sol d'un aéronef sous un tablier est l'eau ou le quai
  (`solAero`, `poseYAero`, `estEauAero`), la surface de l'eau des canaux (plus le fond) ; sont solides : le tablier (et son
  garde-corps), les tympans des arches (pont vénitien, pont de pierre), les pieux du pont tropical (`pointDansPont`), testés sur 26
  points d'appui de l'appareil (bouts d'aile, nez, queue, dérive, train, rotor : `pointsAero`, pris sur le vrai modèle). Pilotage
  simulé, pilotage d'avant et hélicoptère. Le plancher de l'hélicoptère au-dessus de l'eau suit le niveau des canaux.
- **« SOUS LE PONT ! »** : la première fois par pont, +1 500 points et 400 $ (`META.sousPonts`, clés fixes, ponts-levis compris) ;
  ensuite +250. Thème de défis `sousPonts` (1, 2, 3 ponts différents).

**Mesures** (gabarits relevés sur les modèles, train sorti) : voltige 6,2 × 2,4 u, Colibri 10,2 × 2,8, Pélican 11,1 × 2,8, chasseur
7,1 × 3,3, Libellule 2,2 × 4,4, Écureuil 9,5 × 5 ; eau des canaux 19 u de large ; dégagement sous tablier : 2,95 u avant (aucun avion
ne passait), désormais 5,25 (vénitien, arche de 5 u à la clé), 5,45 (orange) et 6,75 (plage). Passables : nordOuest (avions légers),
sudOuest (légers et chasseur), plageOuest (légers, chasseur, hélicoptères). Impassables, et c'est ce qu'on voit : le pont tropical
(ses pieux), le pont de pierre (son pilier et ses deux petites arches), le pont Art déco (2,95 u).

**Test** « Liste du 22 octobre, point 17 » (ponts lus dans `CANAUX.ponts`) : sur les six ponts, dans les deux sens, une voiture de
sport, une moto et un 4x4 au vrai joystick décollent (sport : 1,1 à 2,7 s de vol, 48 à 123 m), se reposent sur la voie, sans dégâts ;
au pas, aucun envol ; une voiture du trafic, même en fuite (DANGER), passe sous 85 % de la vitesse critique sans décoller ; la voltige
passe sous les trois arches, le chasseur sous l'orange et la plage (pilotage simulé, le pilote de la Reyes Air Race), « SOUS LE PONT ! »
compté ; trop haut, la voltige heurte le tablier ; la Libellule passe sous la grande arche de la plage.

**Anciens tests adaptés** (ce point remplace la règle « légère bosse, jamais un saut ») : « Canaux de Los Reyes » accepte, pour
une voiture qui a décollé, un passage au-dessus du tablier ; « Canaux V2 : ponts et passerelles » compte les sauts lancés au lieu de
les refuser (au pas, aucun envol : c'est le test du point 17 qui le vérifie).

**Captures** (`rapport_nuit/captures/liste_22oct/`) : `avant_17_saut_pont.png` (la voiture de sport à pleine vitesse reste sur le
tablier du pont vénitien : 2,7 u au plus) et `17_saut_pont.png` (la même, en vol à 16 u au-dessus du canal) ; `17_avion_sous_pont.png`
(la voltige sous l'arche du pont de la plage, vue depuis le canal).

**Coût** (machine sans carte graphique, 240 images, même graine ; avant → après) : centre-ville tick 25,4 → 23,6 ms, rendu 86 → 92 ms
(bruit de mesure, aucun appel de plus) ; pont nordOuest tick 17,3 → 18,1 ms, appels 801 → 848 (+6 % : les arches et tympans) ;
voiture lancée sur le pont tick 18,7 → 18,2 ms, appels 880 → 923.

**Reste / à savoir** : la rue du front de mer (z = 252) finit, à l'est, dans l'embouchure du grand canal (x 284, sans pont, avant cette
liste déjà) : une voiture qui atterrit lancée après le pont de pierre doit freiner. Les ultimes (Bolide 62 u/s) volent plus loin que
la route sèche derrière les ponts de l'est. **À essayer sur iPhone** : le saut des grandes arches (jusqu'à 27 u de haut) et le passage
en avion à la main, au ras de l'eau (une fenêtre de 1,5 à 3 u selon l'appareil).

## 1 — Le cabrage des motos : un jeu d'équilibre (fait)

**Cause** : le cabrage (3.2 du 20 octobre) avait gardé, par-dessus son point d'équilibre, l'ancien seuil de danger
(`CABRAGE_MOTO.danger`) et son délai de grâce (`CROSS_CABRAGE_GRACE`, 0,8 s) avec le message « Trop cabré ! » puis la bascule
forcée : passé l'angle, la moto basculait à heure fixe quoi qu'on fasse.

**Fait** : tout cela est supprimé (constantes, minuterie, messages, et jusqu'aux commentaires de la source). `majCabrageMoto` intègre
une vraie dynamique de rotation autour de la roue arrière — l'angle et sa vitesse —, sur le temps réel :

  a'' = gaz·u − moteur·(1 − u) − frein·FREIN + g·sin(a − ab) − amort·a' + bosses (+ un coup de gaz sous 0,25 rad)

- **Le gaz** u : CABRER tenu, dosé par l'appui du joystick (0,7 au neutre, 1 poussé à fond). Lâché, le frein moteur repose la roue ;
  FREIN (le frein arrière) la repose vite — c'est le geste de rattrapage.
- **L'équilibre** `ab` est instable, comme une vraie moto : sous lui la gravité repose la roue, au-delà elle tire la moto vers
  l'arrière. On le tient en dosant (des appuis courts, au rythme des bosses de la route).
- **La chute** n'arrive que par la dynamique : la moto passe le point de bascule physique (`dos`, ~77°) — « Sur le dos ! ». Gaz tenu
  à fond : sur le dos en 0,8 à 1 s ; trop peu : la roue retombe.
- **Réglé hors navigateur** (banc `simcabre`) : un pilote qui réagit en 0,15 à 0,25 s tient indéfiniment au neutre ; gaz à fond,
  joystick poussé, c'est nettement plus vif (à 0,2 s de réaction, une trentaine de secondes).
- **Chrono, points, record** : « 🏍️ CABRAGE 7,2 s · 595 pts · record … » pendant le cabrage (déplacé à 44 % de la hauteur : à
  202 px, il passait sous la pile des notifications) ; à la fin, les points (`CABRAGE_PTS` : 40·t + 6·t²) et le record
  `META.acro.cabrage` (clé fixe existante).
- Gardé : la moto entière pivote sur sa roue arrière, le pilote se lève, l'œil et le regard du cockpit montent.

**Test** « Liste du 22 octobre, point 1 » (chaque moto de `VEHDEFS`) : un doseur à 0,15 s de réaction tient 25 s, chrono et points
à l'écran, ~4 600 points ; gaz à fond : sur le dos en 0,8 à 1 s ; lâché : la roue retombe sans chute ; sans appui : rien ; le frein
repose l'avant plus vite que le frein moteur ; aucun « trop cabré », délai ni seuil dans la source. Tests adaptés : « Moto cross :
cabrage », « Cabrage des motos » (la roue se lève par la dynamique : on la regarde après 0,75 s), « Retours du 20 octobre, lot 3 »
(son pilote dose sur l'angle et sa vitesse). **Piège** : un test qui tient la position de la moto doit faire avancer `v.odo`, sinon
les bosses de la route deviennent une poussée constante.

Captures : `avant_01_cabrage.png` (« Tu bascules en arrière — trop cabré trop longtemps »), `01_cabrage.png` (le chrono et les
points pendant un cabrage de 7 s).

**À essayer sur iPhone** : la difficulté réelle au doigt (des appuis courts sur CABRER) ; si c'est trop dur, augmenter `amort`.
