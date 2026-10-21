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
| 17 | Les ponts : décoller en voiture, passer dessous en avion | ☐ |

## Décisions prises seul

- **Branche** : `retours-22oct` part de `retours-20-octobre` (et non de `main`) : les points de la liste portent sur ce que les deux
  chantiers précédents ont construit (canaux V3, paquebot, Cliff Diving, cabrage en équilibre…).

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
