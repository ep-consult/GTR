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
| 4 | Les sons propres | ☐ |
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

**Captures** () :  (la voiture de sport à pleine vitesse reste sur le
tablier du pont vénitien : 2,7 u au plus) et  (la même, en vol à 16 u au-dessus du canal) ; 
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
