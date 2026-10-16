# Rapport de nuit — 9 octobre 2026

> Mis à jour en continu. Si ce fichier semble s'arrêter en plein milieu, c'est
> que la session a été interrompue : tout ce qui est écrit ici est à jour au
> moment de l'écriture.
>
> **Ajout du 10 octobre** : le décor de Los Reyes (branche `decor-ville`),
> voir les deux dernières sections, « Décor de Los Reyes » et son 2e lot.

## Résumé

1. **3 branches**, toutes partant de `master`, rien de poussé ni fusionné :
   `nuit-audit-1` (audit), `nuit-mer` et `nuit-course`. Les deux dernières
   partent de l'audit et sont **indépendantes** l'une de l'autre.
2. **Audit** : les 27 salles, les 5 bornes, les 51 véhicules et les
   16 écrans ont été balayés par un vrai joueur simulé, avec mesure du **son
   réel** à la sortie et à la mort. **5 bugs corrigés**, chacun avec un test
   qui échoue sur l'ancienne version.
3. **Bug n° 1 de la nuit** : mourir au volant de l'**OVNI rendait impossible
   de relancer une partie** (plantage au démarrage). Corrigé.
4. Autres bugs corrigés : ambiances du métro et du chalutier qui suivaient le
   joueur en ville après la mort, lance à incendie qui sifflait sur l'écran de
   mort, 12 libellés du bouton d'action rognés, skins de Jax impossibles à
   toucher.
5. **Mer** : dégradé de profondeur, vagues, reflets (plus doux la nuit),
   ressac, écume autour des pontons, sillage en V, éclaboussures, houle
   partagée par les bateaux, les bouées et le nageur. Interrupteur `MER_V2`,
   **coût de rendu mesuré identique**.
6. **Course** : en course de référence, une partie **ne pouvait pas
   aboutir**. Trois IA bloquées (hors piste ou dans le décor), une friction
   qui dépendait du FPS, une grille qui faisait s'entrechoquer les voitures
   au départ.
7. Course, ajouts : vrai décompte 3-2-1-GO, HUD lisible qui ne cache plus la
   voiture, carte du circuit, chrono du tour et meilleur tour, écart,
   records personnels sauvegardés, écran de fin, chevrons au sol, ligne
   d'arrivée en travers, effet de vitesse.
8. Toutes les branches passent `valider.js` et `scenarios.js` (graine fixe
   et aléatoire), et une **sauvegarde d'avant la nuit se charge sans perte**
   sur chacune (voir « Fin de nuit »).
9. **Reste à faire** : fantôme du meilleur tour, évitement entre IA (contacts
   au départ des Quais), écume de ponton qui suit la forme réelle des coques.
10. **Les 3 points les plus importants** : le correctif OVNI/relance,
    les IA de course qui finissent enfin leurs courses, et la mer à vérifier
    **en vrai sur iPhone** (coût du shader par pixel).

## Branches

| Branche | Créée depuis | Commits | État |
|---|---|---|---|
| `nuit-audit-1` | `master` (6e6c6ab) | 5 correctifs + docs | **fonctionne** (tests au vert, voir « Fin de nuit ») |
| `nuit-mer` | `nuit-audit-1` | mer V2 + docs | **fonctionne** — à vérifier à l'œil sur iPhone |
| `nuit-course` | `nuit-audit-1` | 7 commits course + docs | **fonctionne** — à jouer sur iPhone |
| `decor-ville` (10 oct.) | `nuit-mer` | 11 commits décor + docs | **fonctionne** — à parcourir sur iPhone (coût de rendu) |

`nuit-mer` et `nuit-course` ne se connaissent pas. Si les deux sont
retenues, la fusion touchera `index.html` à des endroits différents (mer : section VILLE ;
course : section DÉPÔT DE BUS, HUD, `majCamera`), plus `scenarios.js` et
`CLAUDE.md`. Elle devrait se faire sans conflit de fond.

## Phase 1 — Audit

### Méthode

Inventaire lu dans le jeu vivant (jamais recopié) : **27 salles** (`INTDEFS`),
**5 bornes d'arcade** (`BORNES_ARCADE`), **51 véhicules** (`VEHDEFS`).

Outil de balayage Puppeteer (390×844, Chrome sans blocage de l'audio). Pour
chaque salle, une page neuve, puis :

1. entrée par la vraie porte ;
2. balayage de **toutes les zones interactives** lues par
   `zonesInterieurActives()` — ce qui démarre les minijeux, ouvre les menus,
   lance les fouilles ;
3. pause en plein milieu, puis reprise ;
4. sortie en plein minijeu ;
5. cinq allers-retours ;
6. mort en plein minijeu ;
7. relance de partie ;
8. sauvegarde puis rechargement.

Les mesures sont réelles, sans supposition :

- **niveau sonore réel** (analyseur branché sur le gain maître, RMS) en
  ville avant, puis après la sortie et après la mort — un son qui continue se
  voit directement ;
- drapeaux d'ambiance `AUDIO.*On`, oscillateur moteur ;
- timers (`setInterval`/`setTimeout` instrumentés), écouteurs d'événements,
  géométries et textures Three.js, objets de scène, sur les 5 cycles ;
- erreurs console et exceptions ;
- éléments DOM restés visibles après la sortie ;
- débordements à 390 px (éléments hors écran, textes rognés) ;
- FPS dans la salle.

### Résultats

#### Bugs corrigés (branche `nuit-audit-1`)

| # | Symptôme | Cause | Correction | Commit |
|---|---|---|---|---|
| 1 | Mourir dans le camion de pompiers lance ouverte : le sifflement de la lance continue sur l'écran de mort, jusqu'à la partie suivante | `mourir()` coupait moteur et sirène, jamais la lance | `lanceSonStop()` dans `mourir()` + test | `5733718` |
| 2 | **Mourir au volant de l'OVNI empêche de relancer une partie** (plantage au lancement). Plus généralement, mourir au volant laisse les boutons du véhicule (MISSILE, HUILE, LANCE, FLASH...) dans la partie suivante | La remise à zéro des boutons n'était faite qu'en descendant du véhicule ; le FLASH de l'OVNI remplace le compteur `#grenN`, que `startRun()` lit | Remise à zéro factorisée dans `boutonsAPied()`, appelée aussi par `startRun()` + test sur les 51 véhicules | `b937286` |
| 3 | 12 libellés du bouton d'action et la consigne de la serre coupés par « … » en plein milieu à 390 px (« Machine 7 en maintenance — reviens à la… ») | `white-space:nowrap` + ellipse, libellés plus longs que 74 vw | Un libellé trop long passe sur deux lignes (mesuré au seul changement de libellé) + test sur tous les libellés lus dans le source. Captures avant/après : `captures/audit/libelle_serre_*.png` | `8524190` |
| 4 | Mourir au **métro** ou au **chalutier** : l'ambiance repart sur l'écran de mort et **suit le joueur en pleine ville dans la partie suivante** | La boucle continue `majInterieur` pendant la mort, qui relançait l'ambiance ; celle du port du chalutier n'était coupée que pendant une sortie en mer | Mise à jour d'ambiance gardée hors mort, arrêt du port dans `mourir()`, `startRun()` coupe toutes les ambiances + test sur toutes les salles | `2308aa1` |

| 5 | Écran Personnages : avec les skins de métiers, **la skin « Classique » de Jax et la dernière ne peuvent plus être touchées** à 390 px | Rangée centrée, non défilante, de 10 skins (606 px pour 354) | La rangée défile, centrée par marges auto quand tout tient + test sur tous les persos de `PERSOS`. Captures : `captures/audit/skins_*.png` | `f9deb4b` |

Chaque correction a son test de non-régression dans `scenarios.js`, et j'ai
vérifié que chacun de ces tests **échoue sur la version d'avant**.

#### Tableau salle par salle

Ordre : du plus récent et complexe au plus ancien et simple (ordre inverse
de déclaration dans `INTDEFS`). « Actions » = nombre d'interactions réellement
déclenchées par le balayage (zones lues par `zonesInterieurActives()`).

| Salle | Actions | Erreurs JS | Verdict |
|---|---|---|---|
| tuning | 1 | 0 | bug corrigé (#3 libellé rogné) |
| depot | 7 | 0 | OK |
| site51 | 9 | 0 | OK |
| chalutier | 6 | 0 | bug corrigé (#4 ambiance après la mort) |
| radio | 4 | 0 | bug corrigé (#3 libellé rogné) |
| metro | 20 | 0 | bug corrigé (#4 ambiance après la mort) |
| cine | 10 | 0 | bug corrigé (#3 libellé rogné) |
| arcade | 7 | 0 | OK |
| musee | 11 | 0 | bug corrigé (#3 libellés rognés) |
| sandwich | 8 | 0 | OK |
| serre | 15 | 0 | bug corrigé (#3 consigne rognée) |
| sport | 7 | 0 | OK |
| bowling | 6 | 0 | bug corrigé (#3 libellé rogné) |
| aquarium | 10 | 0 | OK |
| karaoke | 7 | 0 | bug corrigé (#3 libellé rogné) |
| voyance | 4 | 0 | bug corrigé (#3 libellé rogné) |
| laverie | 14 | 0 | bug corrigé (#3 libellé rogné) |
| casino | 5 | 0 | OK |
| planque | 7 | 0 | bug corrigé (#3 libellé rogné) |
| conces | 4 | 0 | OK |
| armurerie | 1 | 0 | OK |
| pharma | 1 | 0 | OK |
| tour | 1 | 0 | OK |
| poste | 2 | 0 | OK |
| banque | 1 | 0 | OK |
| club | 1 | 0 | OK |
| superette | 2 | 0 | OK |

Pour **toutes** les salles : aucune erreur console, son coupé à la sortie,
pause et reprise correctes, rechargement de sauvegarde juste après une visite
sans rester coincé dedans, et aucune fuite sur 10 allers-retours ville
figée (objets de scène, timers, ennemis) — voir « Fuites » plus bas.

#### Bornes d'arcade (5) et casino

Chaque borne (lues dans `BORNES_ARCADE`) : lancée, puis mort en pleine
partie → écran de mort normal, et dans la partie suivante la borne est
fermée et le joystick répond (`litEntrees` ignore le joystick tant qu'une
borne est ouverte : c'était le risque à vérifier). **OK.** Casino :
balayé avec les salles (machines, blackjack, poker, roue) : **OK**.

#### Véhicules (51, lus dans `VEHDEFS`)

Pour chacun : monter, accélérer + sprint + tir pendant 2 s (FPS mesurés),
descendre, remonter, mourir au volant en pleine action, relancer.

- **Bug #2** trouvé ici (OVNI, puis tous les véhicules qui réaffectent des
  boutons) — corrigé.
- **Bug #1** (lance du camion de pompiers) — corrigé.
- Moteur coupé à la descente et à la mort pour les 51 : **OK**.
- Sirène qui reste audible après le char et le chasseur : **normal**, c'est
  le niveau de recherche (voler un engin militaire fait monter les étoiles).

#### Écrans (16, lus dans le DOM : `.screen`)

Débordements à 390×844 cherchés sur chaque écran : seul **Personnages**
débordait (bug #5, corrigé). Les autres : OK.

#### Fuites (ville figée, 10 allers-retours par salle)

Aucune fuite. Deux faux positifs examinés et écartés :
- concessionnaire : +10 véhicules — ce sont les achats du balayage, livrés
  devant la porte (légitime) ;
- armurerie (+10 écouteurs par visite) et casino (+12) : chaque écouteur est
  posé sur un **nouveau** bouton créé au rendu du menu, l'ancien est retiré
  du DOM (récupéré par le ramasse-miettes). Aucun empilement sur un élément
  persistant.

#### Non corrigé / écarté (avec raison)

- **Léger son continu en ville après certains véhicules** (médiane 0,013) :
  c'est la musique de fond (séquenceur `notes()` sur `musG`) — légitime.
  Les seules sources audio vivantes après une descente sont les deux
  oscillateurs permanents (sirène, rayon) à volume nul. Pas un bug.
- **FPS** : en headless, toutes les salles et tous les véhicules tournent à
  60 FPS (plafond de rafraîchissement) : la mesure ne départage rien ici.
  Pour les phases 2 et 3, je mesure donc le **temps CPU par frame**
  (boucle + rendu), qui reste comparable avant/après.
- **Farming** : non ré-audité au-delà des scénarios existants, qui couvrent
  déjà les plafonds par vague de chaque salle (bowling, émission, séances,
  sorties en mer, courses, casse...). Rien de nouveau trouvé par le balayage.


## Phase 2 — La mer (branche `nuit-mer`)

### Diagnostic avant de coder

**Ce qui marchait** : bouées et mouettes animées, dauphin, planches de surf,
gros bateaux décoratifs, nage possible avec endurance dédiée, bateaux
pilotables, éclaboussure à l'entrée dans l'eau.

**Ce qui était faible** :
- l'eau était un **plan plat à deux triangles**, en matériau Lambert, avec une
  texture qui défile : un bleu uniforme de la plage jusqu'au large ;
- le rivage était une **ligne droite et dure**, avec une bande d'écume fixe ;
- le **sillage** se limitait à quelques particules aléatoires, presque
  invisibles depuis la caméra ;
- les bateaux tanguaient d'un `sin` sur un seul axe, sans lien avec l'eau ;
- le nageur était simplement enfoncé à −0,78, immobile ;
- l'éclaboussure se résumait à 8 particules (12 pour une voiture).

**Priorités retenues** (effet visuel / coût) :

1. shader de l'eau injecté dans le matériau d'origine ;
2. ressac et écume, dans le même shader ;
3. sillage ;
4. éclaboussures ;
5. houle partagée.

**Écartés volontairement** : la déformation de sommets (invisible avec une
caméra de dessus, et coûteuse en géométrie) et une normal map (texture
externe interdite par CLAUDE.md).

### Ce qui a été fait (commit `f79d8ac`)

| Amélioration | Comment |
|---|---|
| Dégradé de profondeur | Turquoise au bord, bleu profond au large, calculé dans le shader à partir de la distance au rivage |
| Vagues animées | Trois sinus croisés modulent la teinte. Le détail de la texture d'origine est conservé |
| Reflets du soleil | Scintillement fin (produit de deux réseaux de vagues), piloté par l'intensité du soleil : **plus doux la nuit** |
| Ressac | Bande d'écume qui monte et redescend, de largeur irrégulière le long de la plage. Elle remplace la ligne fixe |
| Écume au pied des pontons et des îles | Les 8 pontons et les 4 îles les plus proches du joueur, en uniformes recalculés toutes les 0,5 s |
| Sillage en V | Traînée centrale et deux bras qui s'écartent, cadence liée à la vitesse. Pool fixe de 48 quads (aucune allocation en jeu) |
| Éclaboussures | Anneaux d'écume qui s'élargissent, plus une gerbe de gouttes. Force selon le cas : nageur, ou voiture qui tombe à l'eau |
| Houle partagée | **La même fonction** `houle()` en JS et en GLSL : bateaux pilotés **et** garés, bouées et nageur montent, descendent, tanguent et roulent avec les vagues qu'on voit |

**Interrupteur** : `const MER_V2=true;` en tête de fichier, à côté de
`ICONES_SVG`. À `false`, on retrouve la mer d'avant **à l'identique**
(vérifié : nageur fixe à −0,78, aucun sillage, aucune erreur).

### Performance

En headless, le FPS plafonne à 60 et le temps par frame complet est trop
bruité selon la charge de la machine (±25 % d'un passage à l'autre). J'ai
donc isolé le **coût du rendu** : jeu figé, caméra fixe, 120 rendus
synchronisés (lecture d'un pixel après chacun), 3 passes par version.

| Vue | Avant | Mer V2 | MER_V2 = false |
|---|---|---|---|
| Plage face au large | 2,0 ms | 2,0 ms | 2,0–2,2 ms |
| Bateau au large | 1,9 ms | 1,9 ms | 1,8–2,0 ms |
| Port | 1,7 ms | 1,7 ms | 1,8 ms |

**Aucune perte mesurable.** Le shader ajoute une dizaine de sinus par pixel
d'eau : sur iPhone, c'est le point à surveiller (voir la liste de tests à
la main).

### Captures avant / après (`captures/mer/`)

- `large_*` : plage face au large ;
- `bateau_*` : bateau en mouvement ;
- `plongeon_*` : entrée dans l'eau à pied ;
- `nage_*` : nage ;
- `voiture_eau_*` : voiture qui tombe à l'eau ;
- `ponton_*` : pont du grand yacht.

### Scénarios ajoutés (`scenarios.js`)

- un bateau en mouvement laisse un sillage, monte, descend et tangue ;
- entrer dans l'eau à pied éclabousse ;
- le nageur suit la houle ;
- une voiture qui tombe à l'eau éclabousse.

Une erreur de compilation du shader remonterait en `console.error`, déjà
comptée comme un échec par la suite.

### Limites et idées non réalisées

- L'écume des pontons est un **rectangle** : autour de la proue pointue du
  grand yacht, ses coins dépassent légèrement. Piste : déclarer une forme
  par ponton, ou exclure le yacht.
- Les ennemis nageurs (Dockside Boys) qui entrent dans l'eau n'ont pas
  d'éclaboussure. Il suffirait d'appeler `eclaboussure()` à leur transition
  `dansEau`.
- Une voiture qui tombe à l'eau reste posée à la surface. Faire couler les
  véhicules non amphibies serait un vrai changement de gameplay : je n'y ai
  pas touché.
- Reflet de la lune la nuit (un scintillement bleuté plus rare) : simple à
  ajouter sur le même principe.

## Phase 3 — La course (branche `nuit-course`)

### Diagnostic avant de coder

Course de référence avec pilote automatique : il suit les waypoints par le
vrai joystick. Plus une trace des concurrents seconde par seconde.

**Ce qui marchait** :
- trois circuits au caractère distinct ;
- trois IA à personnalité (régulière, agressive, malin) ;
- vitesse des IA plafonnée **relativement au véhicule du joueur** : la course
  reste gagnable ;
- le Toit a ses chutes et sa passerelle ;
- le raccourci des Quais ;
- l'abandon, la mort et la sortie sont déjà nettoyés ;
- un top 5 des temps par circuit (`META.depotTemps`, **victoires seulement**).

**Bugs trouvés en course de référence** :

1. **Départ** : pas de vrai décompte (un toast « 3, 2, 1... GO ! » et tout le
   monde part tout de suite). La grille décalait les IA de −4 sur l'axe Z,
   quelle que soit l'orientation de la piste. Résultat : deux voitures à
   2 u l'une de l'autre, et une IA qui démarre **hors piste**, donc freinée
   d'office.
2. **Friction hors piste par frame** (×0,90 à chaque image) : à 30 FPS, deux
   fois moins sévère qu'à 60. La même faute ne coûtait pas la même chose
   selon l'appareil.
3. **IA bloquées** :
   - la Malin ne finissait **ni la Boucle ni les Quais**. Elle filait vers
     la sortie du raccourci à travers l'herbe et y rampait à 3 u/s ;
   - l'Agressive suivait le joueur sorti de piste et y restait (2,2 u/s
     pendant toute la course) ;
   - le raccourci « bus couché » était lui-même un **piège** : la friction
     hors piste s'y appliquait.
4. **HUD** : le panneau de course (circuit, chrono, place, bouton ABANDONNER)
   est posé **exactement sur la voiture du joueur**, au centre de l'écran.
   Il tient en deux lignes de 9 à 11 px, sans chrono du tour, sans meilleur
   tour, sans écart ni carte.
5. **Fin** : un simple message (place et gain), sans temps ni record.
6. **Lisibilité** : sol sombre, barrières fines, aucun chevron dans les
   virages. Seule la ligne de départ est marquée.

**Anti-triche vérifié** : la progression ne fait qu'augmenter, avec une
anticipation de 3 waypoints au plus. Reculer ne revalide rien, et couper par
l'herbe est très lent : pas de faille trouvée.

### Fait (commits)

| Commit | Contenu |
|---|---|
| `94bce37` | **Vrai décompte 3-2-1-GO** (grands chiffres, bips, `dtJeu`), voitures bloquées jusqu'au GO, départ anticipé impossible par construction. **Grille 2×2** derrière la ligne, sur la tangente de la piste : toutes les voitures sur la piste, à ≥ 5,4 u les unes des autres |
| `17956c5` | Friction hors piste **indépendante du FPS** (même force qu'avant à 60 FPS) |
| `ca35d9a` | **IA** : la Malin passe par l'entrée du raccourci, le couloir du raccourci compte comme piste, l'Agressive ne suit plus un joueur hors piste, toute IA hors piste rejoint la piste au plus court. Les 9 combinaisons IA × circuit finissent, sur 4 graines |
| `0fbff1f` | **HUD de course** en haut à gauche, voiture dégagée. Il affiche la place en grand, le tour (« DERNIER TOUR »), le chrono du tour, le meilleur tour et l'écart avec la voiture de devant (ou de derrière, en tête). En course, la **minimap dessine le circuit** : tracé, raccourci, ligne de départ, concurrents. **Joueur en pole** : sur une grille en 2×2, le premier contact à pleine vitesse détruisait la Citadine avant le premier virage (−23, −36, −70 PV en 0,6 s) |
| `4ea9069` | **Records personnels** par circuit (`META.depotRecords`, clés fixes) : meilleur temps et meilleur tour, même hors podium. **Retours de tour** : bip, « TOUR 2 — 31,5 s », « ★ Record du tour », « DERNIER TOUR ! ». **Écran de fin** : place, temps, meilleur tour, record battu ou ancien record, gain. **Manœuvre de dégagement** des IA : recul en braquant ; en dernier recours, remise en piste comptée. La Malin restait coincée dans les conteneurs des Quais toute la course |
| `868a430` | **Ligne d'arrivée en damier, en travers de la piste** (elle était posée *dans le sens* de la piste). **Chevrons peints au sol** dans les 4 virages les plus serrés de chaque circuit. **Effet de vitesse** : +7° de champ à pleine vitesse, en course seulement |
| `0126439` | Tests de robustesse : anti-triche, abandon au tour 1, mort en course, 5 courses d'affilée |

### Course complète de référence

Pilote automatique sur La Boucle, avec la Citadine.
- **Avant** : la course n'aboutissait jamais. Le pilote sortait de piste et
  rampait, l'Agressive le suivait dans l'herbe, et la Malin ne finissait pas.
- **Après** : **1ʳᵉ place en 38,07 s**, identique sur 3 passes. Le joueur garde
  ses 120 PV jusqu'au dernier tour, et l'écran de fin annonce les deux
  records.

### Performance

| Mesure (joueur sur la grille, IA en course, 8 s) | Avant | Après |
|---|---|---|
| `depotMajCourse` par frame | 2,2–2,3 ms | 3,2–3,4 ms |
| Rendu 3D par frame | ~18 ms | ~18–19 ms |
| Carte du circuit (dessinée 1 frame sur 3) | — | 0,46 ms, soit ~0,15 ms/frame |

Environ **+1 ms par frame (~5 %)**, sous le seuil de 10 %. Cette milliseconde
paie des IA qui rejoignent la piste et se dégagent. Le rendu 3D (chevrons,
damier) ne bouge pas.

### Captures (`captures/course/`)

- `hud_avant` / `hud_apres` : le panneau était posé sur la voiture ;
- `decompte_avant` / `decompte_apres` / `decompte_lisib` : décompte, grille
  en quinconce, ligne d'arrivée ;
- `fin_avant` / `fin_apres` : écran de fin ;
- `chevrons_boucle` : chevron au sol dans un virage.

### Vérifications anti-triche

- **Marche arrière** : des allers-retours sur des points déjà validés donnent
  **+1 point au plus, sans cumul**. Le rayon de validation, 1,5 × la largeur
  de piste, vaut à peu près l'écart entre deux points : se tenir sur un
  point « touche » déjà le suivant. Le gain (≈ 23 u) est inférieur au temps
  perdu en reculant : pas exploitable. Un **tour complet à l'envers ne valide
  jamais un tour** (+5 points contre +16).
- **Couper par l'herbe** : la friction hors piste reste forte (même force
  qu'avant à 60 FPS). Seul le couloir du raccourci officiel est rapide.

### Idées non réalisées

- **Fantôme du meilleur tour** : non fait. Le temps a servi aux bugs bloquants
  (IA, grille, HUD). Le coût serait faible : un mesh de plus et un
  enregistrement position/angle 10 fois par seconde, soit ~300 points par tour.
- **Évitement entre IA** : au départ des Quais, la Malin (le Bolide, plus
  rapide) percute parfois les IA plus lentes et finit dans les conteneurs.
  Elle s'en sort désormais, mais elle peut y perdre jusqu'à 18 s. Le vrai
  remède est un dépassement par le côté au lieu de pousser.
- **Rayon de validation des points** : il pourrait être réduit pour une
  progression plus fine. Je n'y ai pas touché : il fixe la difficulté du
  pilotage, et le changer relève de l'équilibrage.
- Faire disparaître le score et la vague (sans objet en course) pendant la
  course.

## Fin de nuit — vérification de chaque branche

| Branche | `valider.js` | `scenarios.js` (graine fixe) | `scenarios.js` (graine aléatoire) | Sauvegarde d'avant la nuit |
|---|---|---|---|---|
| `nuit-audit-1` | ✓ | 0 échec | 0 échec — 1 saut **connu** (somme rare de la Radio, ~5 %, voir CLAUDE.md) | rechargée **sans aucun écart**, champ par champ |
| `nuit-mer` | ✓ | 0 échec | 0 échec, aucun saut | sans aucun écart |
| `nuit-course` | ✓ | 0 échec | 0 échec, aucun saut | sans aucun écart (seule la nouvelle clé `depotRecords` s'ajoute, à ses valeurs par défaut) |

Méthode pour la sauvegarde : une partie riche (argent, niveau, 15 curiosités,
tenues, armes, améliorations, défis, skins, métiers, « Mes véhicules »,
lieux vus, records d'arcade) est créée avec la version d'avant la nuit
(`master`). Elle est ensuite relue par chaque branche **sur la même origine**
(même `localStorage`, clé `asphalte_save_v1` inchangée) et comparée **champ
par champ**.

Les captures de chaque phase sont dans `rapport_nuit/captures/` **sur la
branche de la phase** :
- `audit/` sur les trois branches ;
- `mer/` sur `nuit-mer` ;
- `course/` sur `nuit-course`.

Le dépôt est laissé sur **`nuit-audit-1`**.

## Décisions prises seul

- **Faux départ** (course) : plutôt qu'une pénalité, aucune commande n'est
  lue avant le GO. Un départ anticipé est donc impossible, et rien ne change
  à l'équilibrage. Le moteur peut quand même ronfler pendant le décompte.
- **Raccourci des Quais** : traité comme de la piste. Le panneau
  « RACCOURCI ? » et l'IA Malin (« prend toujours le raccourci ») montrent
  que c'était l'intention ; le laisser lent en faisait un piège. La course
  reste gagnable : la Malin y met au mieux ~51 s, et un joueur à pleine
  vitesse sur la piste ~43 s.

- **Commits** : un commit par changement, sauf `4ea9069` (course). Il
  réunit les records et l'écran de fin d'une part, la manœuvre de dégagement
  des IA d'autre part : les deux touchaient le même passage de `index.html`
  au même moment. Le message de commit sépare clairement les deux parties.
- **Remise en piste des IA** (course) : en dernier recours seulement, après
  3 tentatives de dégagement ratées. C'est le même principe que la chute
  sur le Toit. La remise est comptée (`ent.remises`), donc visible dans les
  tests.
- **Rayon de validation des points de course** : inchangé. Il permet de
  gagner 1 point en faisant un aller-retour, sans aucun cumul : c'est de
  l'équilibrage, pas un bug.
- **Rapport** : la version complète est la même sur les trois branches.

## À tester à la main sur iPhone demain

Les plus importants d'abord, chacun se vérifie en moins d'une minute :

1. **`nuit-audit-1`** — Monter dans l'OVNI, se faire tuer au volant, puis
   REJOUER : la partie doit démarrer, avec les boutons « à pied » (ESQUIVE,
   SPRINT, grenade avec son compteur).
2. **`nuit-audit-1`** — Mourir au métro (ou au chalutier), puis rejouer : en
   ville, aucun bourdonnement de métro ni bruit de mer.
3. **`nuit-mer`** — Face au large depuis la plage : la fluidité reste-t-elle
   la même qu'avant ? Si ça saccade, passer `MER_V2` à `false` pour comparer.
4. **`nuit-mer`** — Piloter un bateau : sillage en V, tangage. Puis entrer
   dans l'eau à pied : anneau d'écume, et le nageur flotte avec la houle.
5. **`nuit-course`** — Une course sur La Boucle : décompte 3-2-1-GO, panneau
   en haut à gauche, voiture **jamais cachée**, carte du circuit à la place
   de la minimap.
6. **`nuit-course`** — Finir une course : écran de fin (temps, meilleur tour,
   « RECORD ! ») puis recommencer. Le record doit s'afficher, et rester après
   avoir fermé et rouvert l'app.
7. **`nuit-course`** — Les Quais : la Malin prend le raccourci « bus couché »
   et ne reste plus bloquée. Prendre soi-même le raccourci : il doit être
   rapide.
8. **`nuit-course`** — Lisibilité des chevrons au sol dans les virages, et
   confort de l'effet de vitesse (+7° de champ). Il se règle avec
   `DEPOT_FOV_VITESSE`.
9. **`nuit-audit-1`** — Serre et musée : les libellés longs du bouton d'action
   passent sur deux lignes sans rien cacher.
10. **`nuit-audit-1`** — Écran Personnages, Jax : la rangée de skins défile au
    doigt, et « Classique » se touche.
11. **`nuit-mer`** — La nuit, au bord de l'eau : les reflets doivent être nettement
    plus discrets que le jour.
12. **`nuit-course`** — Abandonner une course en plein tour 1 (bouton
    🏳 ABANDONNER) : retour propre au stand, aucun son qui reste.

---

## Décor de Los Reyes — branche `decor-ville` (10 octobre)

Demande : varier les rues, un petit lac rond en haut avec passerelle et
barques, retravailler les bordures et la clôture, un décor factice là où on
ne va pas, des jonctions entre sable, mer et aéroport, des quartiers animés
par la lumière, et un vélo à conduire, qui saute et se personnalise au garage.

Branche créée depuis `nuit-mer` (la houle de la mer sert aux vagues sur le
sable). Interrupteur **`DECOR_V2`** : à `false`, le décor d'avant revient,
vélos garés compris. Les correctifs de bordure restent : ce sont des bugs.

### Ce qui a été fait (un commit par étape)

| Étape | Commit | En bref |
|---|---|---|
| Bordures | `b5388f6` | Le mur est la vraie limite : avant, une voiture s'arrêtait 8 u avant le mur et un piéton 6 u avant. Texture du mur répétée au lieu d'être étirée. Enseigne « LOS REYES » jamais coupée : le texte est mesuré et la police réduite. Jetées de rochers au bout des murs, dans la mer. |
| Littoral | `b8dfb2f` | Bande côtière continue : plus de bande de bitume entre le sable et la mer. Fondu sable → désert de l'aéroport, sable mouillé, vagues qui montent sur la plage. |
| Hors les murs | `a11022e` | Décor factice inaccessible : champs, forêt le long du mur, collines, ville lointaine, autoroute surélevée au nord avec voitures qui défilent. |
| Mobilier urbain | `b22ca52`, `0a104bb` | Abribus, arbres d'alignement (3 essences), bancs, poubelles, bornes à incendie, jardinières, terrasses, kiosques, arceaux, lampadaires... **choisis par quartier**. Les petits objets se renversent au passage d'une voiture lancée (geyser pour les bornes à incendie) et sont réparés à chaque partie. |
| Plage | `ea29bed` | Transats, serviettes, parasols, châteaux de sable, kayaks, cabines, chariot de glaces, filet de volley. |
| Lac du parc | `3d0061f`, `e768516` | Lac rond, margelle de pierres, roseaux, passerelle en bois **praticable** en dos d'âne, 4 barques qui tanguent, canards, bancs. C'est de la vraie eau : on y nage, une voiture s'arrête au bord. |
| Lumières de quartier | `bae85fb` | **Times Square** (quartier néon) : écrans géants animés, néons qui clignotent. **Quartier chinois** : portiques rouges, guirlandes de lanternes. **Brooklyn** (brique) : escaliers de secours, guirlandes d'ampoules. Partout : flaques de lumière sous les lampadaires la nuit. |
| Transitions entre sols | (ce commit) | Retour de playtest : « ça passe de l'asphalte à l'herbe au sable sans transition ». Chaque frontière visible entre deux sols (retrouvée par le jeu, aucune liste écrite à la main) reçoit une transition où le matériau le plus meuble déborde : sable soufflé sur la route et les trottoirs (bitume fissuré au bord), pelouse qui jaunit avant le sable, herbe et terre battue qui débordent sur le bitume et le tarmac. Bande continue au bord ondulé, taches, touffes. |
| Vélos | `7e8ec5f` | Vélo de ville et BMX, 12 garés aux arceaux à chaque partie. Pédalage animé, aucun bruit de moteur. **BUNNY HOP** sur ESQUIVE : 0,9 u de haut en vélo, 1,7 u en BMX, assez pour passer un banc. Personnalisation au garage. |

### Captures (`rapport_nuit/captures/decor/`, rendus Three.js réels)

- Bordures, avant / après : `bordure_nord_*`, `coin_nord_ouest_*`,
  `coin_sud_ouest_*`, `coin_sud_est_*`, `cote_aeroport_*` ;
- hors les murs : `hors_les_murs_nord`, `hors_les_murs_ouest`,
  `hors_les_murs_coin_nord_ouest` ;
- rues par quartier : `rue_centre`, `rue_commerce`, `rue_industriel`,
  `rue_neon`, `rue_port`, `rue_residentiel`, `rue_villas` ;
- plage : `plage_decor`, `plage_vagues_apres` ;
- lac : `lac`, `lac_passerelle` ;
- lumières, jour / nuit : `lumiere_timesSquare_*`,
  `lumiere_quartierChinois_*`, `lumiere_portiqueChinois_nuit`,
  `lumiere_brooklyn_nuit` ;
- vélos : `velo_profil`, `velo_en_selle`, `bmx_bunny_hop`, `bmx_tune_profil`
  (toutes les pièces), `velo_garage_menu`, `bmx_vue_jeu`.

### Transitions entre sols — captures et pièges

Captures avant / après (`transition_*_avant.png` / `transition_*_apres.png`) :
- `ville_aerodrome_jour` / `ville_aerodrome_nuit` : l'endroit exact de la 1re
  capture du playtest (trottoir → désert → gazon de l'aérodrome) ;
- `aerodrome_sud` : la 2e capture (tarmac → gazon → désert) ;
- `parc_route`, `plage_route`, `champ_desert` ;
- `transition_vue_zenithale_*` : vues du dessus.

Trois pièges, chacun vu en rendu réel puis corrigé :
- textures de canvas transparentes : un liseré noir se forme au filtrage ;
  corrigé avec un détail opaque et un masque séparé (`alphaMap`) ;
- une bande dessinée « à l'envers » sortait noire : l'ordre des sommets
  dépend maintenant du sens du bord ;
- la nuit, les petites taches s'allumaient en orange vif près des lampes,
  alors que le sol autour restait sombre. Lambert éclaire par sommet : les
  taches sont maintenant teintées chaque image comme le sol plat.

Coût mesuré dans un même build, transitions affichées ou cachées : 0 à 5 %,
dans le bruit de la mesure. Elles ajoutent 4 à 9 appels de rendu et 5 000 à
10 000 triangles par vue.

### Performance (rendu seul, sans entités, GPU de bureau)

| Vue | Appels de rendu avant → après | Triangles avant → après |
|---|---|---|
| Centre | 89 → 107 | 11 062 → 29 320 |
| Lac | 80 → 98 (160 avant la fusion du lac) | 8 896 → 16 633 |
| Plage | 96 → 119 | 9 178 → 19 832 |
| Coin nord-ouest | 45 → 59 | 7 340 → 16 440 |
| Quartier chinois | 68 → 81 | 8 038 → 21 299 |
| Aéroport | 59 → 74 | 8 886 → 21 807 |

Le temps de rendu mesuré passe d'environ 2,1 ms à 2,4–2,8 ms, soit
**+10 à +20 %**. La mesure est bruitée : la même vue « avant » varie de
2,0 à 3,2 ms d'une passe à l'autre.

Mesures prises en cours de route :
- le décor hors les murs, d'abord fusionné en un seul maillage par côté,
  coûtait +19 % : il est désormais découpé en tronçons de 120 u ;
- le mobilier faisait 66 000 triangles : 7×7 zones fusionnées et des formes
  plus simples le ramènent à 20–30 000 ;
- les flaques de lumière sont fusionnées par carré de 200 u ;
- le lac est fusionné avec la ville ;
- le cadre des vélos est fusionné par matériau.

**C'est le point n° 1 à vérifier sur iPhone.** Si ça saccade, comparer avec
`DECOR_V2=false`. Le levier le plus simple serait de réduire la densité du
mobilier (`MOB_QUARTIERS`).

### Décisions prises seul

- **Barques du lac** : décor qui tangue, pas des bateaux pilotables (choix
  prudent). Le lac fait 9,5 u de rayon, trop petit pour piloter.
- **Deux vélos** : vélo de ville (15 u/s, saut de 0,9 u) et BMX (17 u/s,
  saut de 1,7 u), un BMX sur trois aux arceaux.
- **Garage des vélos : style seulement.** Peinture, néons, porte-bagages ou
  caisse de livreur, garde-boue, panier ou plaque de course, jantes, fanion.
  Ni nitro, ni moteur, ni blindage : masqués dans le menu **et** refusés à
  l'achat. Les **prix sont ceux des voitures** (`TUNING_PRIX`, mêmes
  catégories) : ils sont peut-être chers pour un vélo, à calibrer en jouant.
- **Bunny hop** : un saut par appui (le maintenir ne fait pas sautiller) et
  **aucun point de cascade**, pour éviter de faire du score en sautillant sur
  place. Un saut depuis une vraie crête rapporte toujours ses points.
- **Pas de police pour un vélo garé** : il n'est à personne, le prendre
  n'est pas un vol (comme pour les autres véhicules garés).
- **Tirages du décor séparés** (générateur `aleaDecor`, graine 917) : ajouter
  un banc ne déplace ni un bâtiment, ni une porte, ni un lieu de la ville.

### Vérifications

- Tests ajoutés à `scenarios.js` :
  - bordures : véhicule et piéton vont jusqu'au mur, nage bornée, enseigne
    la plus longue jamais rognée ;
  - mobilier : au moins 100 objets cassables, aucun sur la chaussée,
    renversement et réparation ;
  - lac : nage, passerelle, voiture arrêtée au bord ;
  - vélos : garés sur les arceaux, sans moteur, un saut par appui, BMX plus
    haut, aucun point ; au garage, style seulement avec les gardes d'achat ;
    sauvegarde ; sortie du garage en selle.
- Deux tests de garage adaptés **en lisant la source** : un vélo a
  `tuningCarro` sans `tuningMeca`, et ses garde-boue sont *au-dessus* des
  roues (`surRoues`, testés contre le cercle de la roue).
- Fin de travail : `valider.js` ✓, `scenarios.js` 0 échec en graine fixe
  (20260731) et en graine aléatoire (894418076), aucun saut.
- Sauvegarde : une partie faite sur `master` (avant la nuit) et une faite
  sur `nuit-mer` (avant le décor) se rechargent **sans aucun écart**, clé
  `asphalte_save_v1` inchangée.

### À tester à la main sur iPhone (`decor-ville`)

1. Parcourir le centre, la plage et le quartier néon la nuit : fluidité
   comparable à `nuit-mer` ? Sinon, passer `DECOR_V2` à `false` pour
   comparer.
2. Prendre un vélo à un arceau, faire un BUNNY HOP par-dessus un banc et
   par-dessus une bordure de trottoir.
3. Entrer au garage à vélo, essayer le panier, la caisse et le fanion, puis
   ressortir en selle.
4. Longer les murs nord et ouest en voiture : aucun arrêt avant le mur,
   enseigne « LOS REYES » entière.
5. Plage : les vagues montent bien sur le sable, sans bande de bitume.
6. Lac : traverser la passerelle à pied, puis plonger.
7. Foncer dans une rangée de poubelles et une borne à incendie : elles
   tombent, le geyser part. Elles reviennent à la partie suivante.
8. **Transitions** : longer la bordure entre la ville et l'aérodrome, de jour
   puis de nuit. Le sable doit déborder sur la route sans briller la nuit, et
   aucune ligne droite ne doit séparer herbe et sable.

---

## Décor de Los Reyes, 2e lot — galion, quartiers, enseignes, portes (10 octobre)

Demandes :
- refaire le bateau échoué « beaucoup plus majestueux », ses canons tirant
  vers le large, et un tir sur cinq sur le joueur ;
- de nouvelles choses dans chaque quartier, en gardant l'âme de l'existant ;
- ajoutées en cours de route :
  - une crique avec de hauts plongeoirs ;
  - un accès moins « gros carrés » ;
  - des enseignes lisibles ;
  - des portes mieux placées.

Tout est derrière `DECOR_V2`, un commit par élément, sur `decor-ville`.

### Ce qui a été fait

| Élément | Commit | En bref |
|---|---|---|
| Galion échoué | `6e831cc` | 26 u (trois fois l'ancienne épave), sur la plage vide à l'est. Coque bordée avec préceinte, château arrière aux fenêtres allumées la nuit, figure de proue, trois mâts (dont un brisé et un tombé dans le sable), voiles et pavillon noir qui ondulent, squelette à la barre, mouettes, écume. Brèche côté plage jusqu'au coffre : butin une fois par partie. **6 canons en salves, boulets en cloche, 1 tir sur 5 sur le joueur à portée** (mesuré : 20 à 21 %). |
| Jetée de fête foraine | `f29c815` | Plage ouest, praticable à pied et en voiture. Grande roue de 21 u (ampoules en chenillard la nuit, elle s'efface quand elle cache le joueur), manège, 4 stands, arche illuminée. |
| Skatepark | `59e899c` | Parc voisin du lac. Deux tremplins face à face au-dessus d'un vide de 10 u (le BMX s'envole vraiment), funbox, quarter-pipe, rails, murs tagués, projecteurs. |
| Port vivant | `fde5bab` | Trois parcs à conteneurs avec un portique qui roule en portant un conteneur, phare rayé sur un îlot praticable (faisceau la nuit), porte-conteneurs au large. |
| Brooklyn | `095a5ea` | 11 fresques murales, 20 cordes à linge, 8 bornes à incendie ouvertes, deux courts de basket grillagés. |
| Ciel | `9512d68` | Dirigeable REYES FM, avion à banderole le long de la plage, mouettes, feux d'artifice la nuit près de la jetée. |
| Crique des plongeurs | `99ac9d5`, `7eba435` | Baie d'eau de mer entre trois falaises de grès (17, 10 et 5 u), un plongeoir chacune. **Atterrir dans l'eau ne blesse plus** : salto, gerbe, bonus de score selon la hauteur. Accès refait : collines escarpées et sentier en lacets à la place des trois rampes. |
| Quartier néon | `a78882e`, `356cf0d` | 10 panneaux animés sur les toits, tapis rouge, file d'attente et videur devant le CLUB NÉON, projecteurs qui balaient le ciel la nuit. |
| Finitions de quartier | `8569099` | Villas : 11 piscines décorées. Commerce : marché de rue (cagettes de fruits qui volent au passage d'une voiture). Industriel : cheminées qui fument. Base : barbelés et deux miradors à projecteurs. |
| Enseignes | `89d56bf` | **Toutes refaites.** L'ancienne texture était un canevas carré de 256 px étiré sur un panneau 2,4 fois plus large : texte écrasé, puis noyé dans un halo. Désormais nettes, cadrées, aux bonnes proportions, penchées vers la caméra en ville. Cela touche les 132 enseignes : rues, lieux, salles, garages, bus. |
| Portes | `200bdf7` | Chaque porte regarde vers sa façade (avant : toujours vers le sud). Pharmacie et concession, qui donnaient sur la chaussée, passent sur une façade avec du trottoir. L'arcade, qui n'avait aucun bâtiment, reçoit une devanture. L'enseigne du lieu passe devant le store qui la coupait, et les enseignes de boutique tirées au hasard qui la recouvraient sont retirées. |

### Bugs trouvés en route (corrigés)

- **Ville décalée par le décor.** Three.js tire `Math.random` pour l'identifiant de chaque objet créé. Construire le galion à la place de l'ancienne épave déplaçait toutes les portes de la ville (vu par `scenarios.js`). Le décor neuf est maintenant construit sur son propre générateur (`sansAleaVille`). L'ancienne épave est construite puis retirée, pour que la ville tire exactement les mêmes nombres. Vérifié après chaque élément : 28 portes identiques à la version d'avant.
- **Les tags du quartier industriel étaient remplacés** par la texture du skatepark : deux fonctions portaient le même nom (`texGraffiti`).
- **Fente à la jonction colline / falaise de la crique** : un trou de hauteur 0. Trouvé par le test de continuité.
- **Le butin du coffre du galion disparaissait** au bout de 26 s (durée par défaut d'un butin) : il attend maintenant le joueur.
- **Test Moto cross fragile** : la moto du test roulait vers la statue de la place. Le test est désormais maître de sa scène.

### Performance

Mesure de rendu seul sur les six vues les plus chargées, avant le galion puis maintenant :

| Vue | Appels de rendu | Triangles |
|---|---|---|
| Centre | 107 → 108 | 29 320 → 31 393 |
| Jetée | 111 → 136 | 30 767 → 38 490 |
| Crique | 58 → 75 | 14 820 → 23 401 |
| Port | 84 → 101 | 26 443 → 27 721 |
| Club | 119 → 143 (246 avant la fusion de la file d'attente) | 24 982 → 29 284 |
| Skatepark | 129 → 140 | 27 406 → 28 892 |

Le temps de rendu mesuré augmente de **5 à 10 %**. La machine de mesure rendait cette fois en logiciel (environ 18 ms), donc les écarts relatifs comptent plus que les valeurs absolues. **À vérifier sur iPhone**, en particulier la jetée de nuit et le quartier néon.

### Vérifications

- `valider.js` ✓.
- `scenarios.js` : 0 échec en graine fixe et en graine aléatoire (3774822559), aucun saut. Nouveaux tests :
  - galion : coque solide, brèche ouverte, tirs au large, environ 1 sur 5 sur le joueur ;
  - jetée : praticable à pied et en voiture, roue qui s'efface ;
  - skatepark : vrai saut en BMX ;
  - port : portiques en mouvement, îlot praticable, faisceau la nuit seulement ;
  - Brooklyn ;
  - crique : plongeon réel de 17 u sans dégâts, bonus, montée continue ;
  - quartier néon : porte du club libre ;
  - finitions de quartier ;
  - portes : trottoir devant, sortie devant la porte, aucune enseigne de lieu masquée.
- Sauvegarde : une partie faite sur `master` se recharge sans aucun écart, clé `asphalte_save_v1` inchangée.

### Décisions prises seul

- **Galion** posé sur la plage vide à l'est, plutôt qu'à la place exacte de l'ancienne épave : trois fois plus grand, il n'y tenait pas. Même rivage, même âme (canons toujours actifs, tonneaux).
- **Plongeons** : atterrir dans n'importe quelle eau (mer, lac, crique) ne blesse plus, quelle que soit la hauteur. Le bonus ne tombe qu'au-dessus de 4 u, et au plus une fois toutes les 6 s, pour qu'on ne fasse pas du score à la chaîne.
- **Enseignes de boutique retirées** quand elles recouvraient celle d'un lieu (KEBAB, DISCO, LIVE, SUSHI, POLICE…). Les autres restent.
- **Bowling** : sa porte garde 2,5 u de trottoir. Aucune autre façade de son bâtiment ne fait mieux, et le seuil reste à 1,3 u de la bordure.

### À tester sur iPhone (2e lot)

1. Galion : s'approcher par la plage (un boulet sur cinq part sur le joueur), entrer par la brèche et prendre le trésor.
2. Crique : monter le sentier en lacets jusqu'au plongeoir de 17 u, sauter, puis ressortir par les marches et replonger du bras de 5 u.
3. Jetée de nuit : grande roue, manège, feux d'artifice. Contrôler la fluidité.
4. Skatepark en BMX : prendre le tremplin et franchir le vide.
5. Enseignes : se promener dans le quartier néon et le commerce, et entrer dans deux ou trois salles. Tout doit se lire.
6. Pharmacie, concession, laverie, karaoké, arcade : entrer puis ressortir. On doit ressortir devant la porte, jamais dans un mur.

---

## 3e lot — blocage crique, avion, véhicules, Mont Reyes, canyons (11 octobre)

| Élément | Commit | En bref |
|---|---|---|
| **Bug : bloqué au pied d'une falaise** | `2f59567` | Signalé : après un saut du plongeoir de gauche, coincé sans pouvoir bouger. En tombant d'un bord, on atterrit dans la marge de collision de la falaise et chaque pas était refusé. On peut maintenant toujours s'éloigner d'un mur ou le longer. Le test échoue sur l'ancienne version. |
| Avion à banderole | `83e1d0c` | Avion de tourisme détaillé, plus rapide (19 u/s au lieu de 12 au plus), banderole qui ondule et reste lisible dans les deux sens. **Kiosque « TON MESSAGE DANS LE CIEL »** près de la jetée : on écrit son message (30 caractères), on paie 250 $, il est sauvegardé. |
| Bateaux, buggys, bulldozer | `5aae1fc` | Bateaux : vraies coques en V et accastillage (vedette, police, pêche, offshore, jet-ski, yacht). **Trouvé en route : tous les bateaux naviguaient à reculons** (étrave du mauvais côté). Buggys : baquet, ailes, capot numéroté, cage contrastée, moteur à nu. Bulldozer : chenilles, cabine vitrée, lame incurvée, vérins, ripper. |
| Mont Reyes | `a71d338`, `a3b54f6` | Montagne de 72 u au nord-est de l'aérodrome : prairies, forêt, rochers, sommet enneigé. Sentier en lacets taillé dans la pente, avec 6 tremplins. La limite invisible de l'est (x 452) est repoussée jusqu'à une vraie paroi rocheuse : tout le désert est accessible, y compris le saut géant de la falaise, qui était hors d'atteinte. |
| Canyons « Rampage » | `a3b54f6` | Ligne des mesas : 5 plateaux en escalier séparés par des canyons de 10 u, tremplins en bois. Parois en strates de grès, bords érodés. Les dunes sont remplacées par des buttes en strates, plus des cheminées de fée. L'OVNI, la crique et le galion sont intacts. |
| Courses | `a3b54f6` | **Montée du Mont Reyes** (50 s) et **ligne des mesas** (14 s), au volant d'une moto, d'un vélo ou d'un buggy. Départ au cercle de départ, portes à franchir, prime une fois par vague. Motos cross, BMX, vélo et buggy garés au pied des départs. |

### Réglages et décisions

- **Terrains de saut** : sur la montagne et dans les canyons, dévaler une pente ne fait plus décoller. Seuls un vrai bord, un tremplin ou un gap lancent le véhicule. Une réception ratée n'abîme qu'au-delà d'environ 20 u de chute.
- **Courses vérifiées par un pilote simulé.**
  - Un pilote prudent, qui freine avant les épingles, finit les deux courses avec chaque véhicule, sans dégâts, avec 4 à 5 sauts : 25 à 34 s pour le mont, 6 à 8 s pour les mesas.
  - À fond, sans freiner, on sort des lacets et on s'abîme : la course peut se perdre.
- **Clavier** (pour info, ça ne touche pas le tactile) : en véhicule, S sert à la fois à descendre et à freiner. C'était déjà le cas avant.
- **Piège trouvé deux fois** : rien de Three.js ne doit être créé au chargement du script. Un tirage aléatoire de plus avant la ville déplace toutes les portes. C'est maintenant noté dans `CLAUDE.md`.

### Performance

Rendu seul :
- Montagne et canyons : +3 à 8 % sur les vues de l'est (aéroport, pied du mont, désert), sous le seuil de 10 %. Jusqu'à 56 000 triangles au pied du mont.
- `solY` (hauteur du sol) : 28 → 24 µs par appel.

### À tester sur iPhone

1. Plonger du plongeoir de gauche de la crique, puis nager contre la falaise : on doit pouvoir repartir.
2. Kiosque près de la jetée : écrire un message, payer, puis regarder l'avion passer.
3. Prendre la vedette et le bateau de pêche : ils avancent la proue devant.
4. Mont Reyes : prendre la moto cross garée au pied et faire la course (freiner dans les épingles).
5. Ligne des mesas : moto cross ou buggy, enchaîner les 4 gaps.
6. Fluidité vers l'est (montagne, canyons).


---

## 4e lot — grand yacht, porte-conteneurs, carte de l'est, pentes (11 octobre)

| Élément | Commit | En bref |
|---|---|---|
| Grand yacht | `7874538` | Refait dans le style des bateaux restylés : coque en V, trois ponts vitrés, arche radar, jacuzzi à l'avant, hélipad et plateforme de bain à l'arrière. On marche toujours sur le pont. Captures : `grand_yacht_avant.png`, `grand_yacht_apres.png`, `grand_yacht_jeu.png`. |
| Porte-conteneurs pilotable | `b160a38` | Le « Reyes Star » (62 u) n'est plus un décor : il mouille au large de la plage et se pilote. Il est lent et lourd (11 u/s). On monte à bord par le flanc. La caméra recule pour le voir en entier. |
| Mer agrandie | `7874538` | Les bateaux s'arrêtaient avant la crique alors qu'on pouvait y nager. On navigue maintenant jusqu'au large de la crique. |
| Mont et canyons sur la carte | `a852918` | La minimap et la grande carte montrent la montagne (couleurs selon l'altitude), le sentier, les canyons, la crique et le désert. Ils sont dessinés à partir du relief réel. Les boutons + / − de la grande carte passent en bas à droite, sur la mer : en haut, ils cachaient le mont. Capture : `carte_mont_canyons.png`. |
| Clôture aérodrome / mont | `a852918` | La clôture est de l'aérodrome est supprimée : on passe librement de l'aérodrome au pied de la montagne. La clôture nord s'arrête avant le pied du mont. |
| **Pentes réalistes** | `a852918` | Signalé : « on monte à fond, même à pied ; au canyon on se rapproche et d'un coup on est en haut ». Détail ci-dessous. |

### Pentes : ce qui change

- **En véhicule.** La pente freine à la montée et pousse à la descente. Plein gaz dans le flanc du mont, une moto cross fait 40 u en 5 s au lieu de 124.
- **Contre une paroi** (falaise de mesa, crête trop raide), on bute et on glisse le long, sans casse. On ne la gravit plus d'un coup.
- **À pied.** On ne monte plus une paroi de mesa : 1 m en 4 s contre la paroi, au lieu de se retrouver en haut. Hors sentier, la pente du mont divise la vitesse de marche par deux environ.
- **Sentier du mont.** La pente y freine moins, car le terrain y est damé. Les épingles ont un palier plat pour faire demi-tour. Au pas, on braque plus serré.
- **Sommet.** Le dernier lacet montait à une pente de 1,45, impossible à franchir avec la gravité : la calotte du sommet est adoucie (65 u au lieu de 72).
- **Course du mont.**
  - Temps limite : 60 s au lieu de 50, puisque la montée est plus lente.
  - Il faut passer chaque porte à la hauteur de son lacet : couper par en dessous ne compte plus.

### Vérifications

- **Pilote simulé au joystick réel** (même logique que le tactile) : le mont est fini avec tous les véhicules garés au pied.
  - Moto cross : 33 s.
  - Moto : 34 s.
  - Quad : 29 s.
  - Buggy : 39 s.
  - BMX : 31 s.
  - Vélo : 40 s.
  - Mesas : 7 à 8 s.
- **Nouveau test « Pentes »** dans `scenarios.js` : paroi de mesa infranchissable à pied et en moto (sans casse), montée du mont nettement freinée à pied et en moto.
- Portes de la ville inchangées : rien n'a décalé le tirage de la ville.

### À tester sur iPhone

1. Mont Reyes en moto cross : sentir la montée, ralentir et faire demi-tour dans les épingles, finir la course en moins de 60 s.
2. Monter le mont à pied hors du sentier : ça doit être lent.
3. Canyons à pied : la paroi d'une mesa ne doit plus se gravir. Tomber du haut doit toujours être une vraie chute.
4. Grande carte : le mont et les canyons sont visibles à l'est, les boutons + / − en bas à droite.
5. Passer de l'aérodrome au mont sans muret.
6. Piloter le porte-conteneurs, puis naviguer jusqu'au large de la crique.


---

## 5e lot — véhicules à l'eau, 4x4, zone extrême (11 octobre)

| Élément | Commit | En bref |
|---|---|---|
| **Véhicules à l'eau** | `fc04a41` | Au volant, on peut entrer dans la mer, le lac ou la crique. Le véhicule ne casse pas et n'explose pas, mais il est noyé : le joueur en sort à la nage, le véhicule coule puis disparaît. Avant, l'eau était un mur, et un saut dans l'eau faisait 80 de dégâts (une moto explosait). Les voitures de l'IA s'arrêtent toujours au bord. |
| 4x4 « Coyote » | `fc04a41` | 4x4 de franchissement à châssis haut, nouveau véhicule (dessiné sans marque). La pente le freine deux fois moins et il gravit des pentes plus raides que les autres. Il reste arrêté par une vraie falaise. Deux sont garés au pied du mont, un au départ de la montée sèche. Captures : `jeep_coyote.png`, `jeeps_pied_mont.png`. |
| Montée sèche | `fc04a41` | Défi de montée de colline : couloir de terre tout droit dans la face sud du Mont Reyes, de plus en plus raide. En 6,5 s, prime 200 $ une fois par vague. Une moto cross et un 4x4 attendent au départ. Le BMX n'y arrive pas. Capture : `montee_seche.png`. |
| Défi stunt | `fc04a41` | Parc de 4 tables de saut au pied ouest du mont. Il faut 1 200 points de figures en 45 s : chaque saut rapporte selon le temps de vol (bonus si la réception est propre), le cabrage en moto cross aussi. Prime 250 $ une fois par vague. Deux motos cross au départ. Capture : `parc_stunt.png`. |
| **Pic du Vertige** | `fc04a41` | Butte de 90 u à parois verticales, au sud des canyons, face tournée vers la caméra pour voir toute la chute. On monte par un monte-charge. En haut, un plongeoir et le bouton SAUT BASE : on ouvre le parachute pendant la chute et on vise la cible au pied. Prime 300 $ en plein centre, une fois par vague. Sans parachute, c'est mortel. Captures : `pic_vertige.png`, `pic_monte_charge.png`, `pic_saut_base_voile.png`. |
| Carte | `fc04a41` | Le Pic, sa cible, la montée sèche et les tables du parc stunt apparaissent sur la carte. Capture : `carte_zone_extreme.png`. |

### Réglages vérifiés par simulation

- **Montée sèche.** Le pilote simulé au joystick la finit en 3,7 à 4,6 s avec la moto, la moto cross, le quad, le buggy et le 4x4. Le BMX cale à mi-pente.
- **Défi stunt.** Un pilote qui dose sa vitesse réussit : 15 à 28 s selon le véhicule. Plein gaz, une moto cross saute trop loin, retombe sur la table suivante et rate le défi. Sans rien faire, le défi est raté.
- **Saut BASE.** Il dure environ 27 s sous voile, assez pour viser la cible.
- **Franchissement.** Plein gaz dans le flanc du mont pendant 5 s, le 4x4 monte de 56 u et le buggy de 32 u.

### Ce qui change pour d'anciens tests

- **Lac du parc.** « Une voiture s'arrête au bord » devient : l'IA s'arrête au bord, et la voiture du joueur s'y noie sans dégâts.
- **Monster truck.** Le test le posait en pleine mer pour être « loin de tout » ; il est maintenant posé sur la terre ferme.

### À tester sur iPhone

1. Rouler dans la mer depuis la plage : le véhicule ne casse pas, on sort à la nage.
2. Prendre un 4x4 au pied du mont et grimper hors du sentier.
3. Montée sèche en moto cross, puis en 4x4.
4. Défi stunt en moto cross : doser la vitesse avant chaque table.
5. Pic du Vertige :
   - monter avec le monte-charge ;
   - faire SAUT BASE et ouvrir la voile ;
   - viser la cible.
6. Fluidité près du Pic (grande paroi).

### Retours de playtest (même soir)

- **Montée sèche trop facile.** Signalé : « avec une moto de ville, j'ai tout monté d'un seul coup ». Ce qui change :
  - départ arrêté au pied du couloir (avant, 34 u d'élan suffisaient) ;
  - le couloir finit en mur (pente jusqu'à 2) ;
  - vraie gravité dans la pente ;
  - terre meuble : tout le monde patine, les pneus de route deux fois plus.

  Résultat : la moto cross passe de justesse, comme le quad et le 4x4. Les motos de route, le buggy et le BMX calent. Un message conseille un véhicule tout-terrain si on part avec des pneus de route.
- **Piste stunt en terre, façon supercross.** Une boucle complète en terre battue remplace les 4 tables posées sur l'herbe :
  - les 4 grosses tables ;
  - deux virages relevés avec blocs de corde rouges et blancs ;
  - des whoops, un double, un step-up et des rollers ;
  - une arche de départ et des pylônes d'éclairage.

  Le défi devient le « DÉFI SUPERCROSS » : 2 600 points en 45 s. Un pilote simulé en marque 3 100 en moto cross, en quad et en buggy, mais pas assez en 4x4 ou en BMX. Captures : `supercross.png`, `supercross_virage.png`, `supercross_dessus.png`.
- **Bateau qui fonce vers la plage.** Il glisse sur le sable en freinant progressivement (7 à 24 u selon le bateau), sans dégâts. Le joueur descend sur la plage. En rembarquant, on repart au pas vers l'eau, jamais à travers la plage. Capture : `bateau_echoue.png`.
- **Police et IA à l'eau.** Elles s'y noient aussi.

---

## 6e lot — sommet du Pic, ciel ouvert, mer vivante (11 octobre)

| Élément | En bref |
|---|---|
| Vue au sommet | Signalé : « en haut, la vue est très zoomée sur le joueur ». Au-dessus de 20 u, la caméra suit maintenant la hauteur : au sommet du Pic, elle est à 37 u au-dessus du joueur au lieu de 20. Capture : `pic_sommet_vue.png`. |
| Motos, vélo, tremplin au sommet | Deux motos cross, un BMX et un vélo sont garés au sommet du Pic, face à un tremplin en planches au bord du vide. En plein vol, le bouton **SAUTER DU VÉHICULE** apparaît : on lâche le véhicule, on tombe avec son élan, puis on ouvre la voile (saut BASE). Le véhicule s'écrase en bas. Rester dessus jusqu'en bas est mortel. |
| Ciel ouvert | Les avions, l'hélico et le jetpack vont partout : au-dessus de la montagne, du désert et jusqu'au large. Avant, ils étaient bloqués à la limite de l'aéroport. Le relief est solide : un avion trop bas s'écrase sur le mont. |
| **Mer vivante** | Signalé : « la mer est trop calme, il faut donner envie de découvrir ». Détail ci-dessous. |

### Mer vivante

- **Île aux trésors** (nouvelle) : camp de pirates, rocher en forme de crâne, palmiers, tonneaux, canot échoué. Une croix rouge cache un coffre : CREUSER rapporte 220 $, une fois par vague.
- **Paillote** sur l'île du canard : un cocktail à 20 $ qui soigne.
- **Plongée** : six épaves trahies par des bulles. À la nage, PLONGER remonte un coffre (60 à 120 $), une fois par vague et par épave.
- **Tremplins flottants** : cinq rampes sur flotteurs. Jet-skis et vedettes s'envolent (environ 5 u de haut), avec des points de saut.
- **Rallye des bouées** : course de portes autour des îles, en jet-ski ou en vedette, départ au large de la marina. 32 s ; le pilote simulé met 17 à 26 s.
- **Wakeboard** (kiosque au bout du ponton est de la marina, 50 $) : un bateau te tire au large.
  - Le joystick choisit où tu vas à l'écran.
  - Traverser vite la vague du sillage fait décoller ; ESQUIVE en l'air lance un 360.
  - Si le 360 n'est pas fini à la réception, c'est la chute.
  - Objectif : 4 500 points en 45 s. Un rythme soutenu passe (6 200), un rythme lent non (3 200).
- **Parachute ascensionnel** (kiosque au bout du ponton ouest, 60 $) : on monte à 32 u derrière le bateau, LÂCHER LA CORDE, puis on vise le radeau-cible.
- **Faune** :
  - un banc de dauphins accompagne un bateau rapide au large ;
  - une baleine refait surface et souffle au loin ;
  - des **requins** rôdent dans les eaux profondes de l'est, signalées par des bouées jaunes et un panneau. Ils mordent un nageur, jamais un bateau.
- **Une prime par vague et par activité** : pas de farming.

Captures : `mer_ile_tresor.png`, `mer_mer_large.png`, `mer_jeu_wake.png`, `mer_jeu_parachute.png`, `mer_jeu_tremplin_saut.png`, `mer_jeu_paillote.png`, `mer_jeu_plongee.png`.

### À tester sur iPhone

1. Pic du Vertige : prendre une moto en haut, sauter le tremplin, appuyer sur SAUTER DU VÉHICULE, ouvrir la voile.
2. Vue au sommet : elle ne doit plus être collée au joueur.
3. Avion ou hélico au-dessus de la montagne et au large.
4. Wakeboard : le joystick latéral est-il naturel ? Le saut du sillage est-il lisible ?
5. Parachute ascensionnel : lâcher la corde au-dessus du radeau.
6. Île aux trésors, plongée, paillote, rallye des bouées.
7. Nager vers les bouées jaunes à l'est : les requins.

---

## 7e lot — retours de playtest (12 octobre)

| Retour | Ce qui a été fait | Commit |
|---|---|---|
| Buggys « tout dorés, pas finis » | C'étaient les deux buggys des secouristes de la plage : tout le modèle (cage, sièges, pneus) était repeint en jaune uni. Seule la carrosserie est jaune maintenant, avec une rampe orange et un fanion à croix rouge. | `0f37354` |
| Deux cargos qu'on traverse | Anciens décors en boîtes sans collision : retirés. Un second vrai porte-conteneurs, solide et pilotable, les remplace. | `0f37354` |
| Ennemis en pleine montagne ou dans l'eau | Ils apparaissent maintenant sur la terre ferme (jamais l'eau, le mont, une mesa ou le Pic), hors de l'écran, en ville comme dans le désert. En mer, la police vient en vedette. Les voitures de police s'arrêtent au bord de l'eau. | `0f37354` |
| « L'armée débarque » mais personne | La garnison des bases (14 soldats) remplissait le plafond de renforts : à 6★, plus rien ne partait. Corrigé : soldats et camions militaires arrivent vraiment. | `0f37354` |
| Boss introuvables | Colonne de lumière rouge au-dessus du boss, couronne, nom avec direction et distance dans la barre (« KAA → 40 m »), présentation à l'écran. | `0f37354` |
| Avion de voltige | Remis au vrai aéroport, au seuil sud de la grande piste, face au nord. | `0f37354` |
| Montagne trop simple, même en vélo et en jeep | Vraie gravité en pente, adhérence réduite sur les flancs, vélos bloqués hors sentier. Le 4x4 grimpe au pas en vitesse réduite : seul véhicule à monter le flanc, en 9 s au lieu de 3,7. La caisse suit la pente. | `9f2147a` |
| Sauts du désert toujours pareils | Ligne des mesas variée : crête étroite, long gap, mesa large, longue crête qu'on suit, très long gap final. | `9f2147a` |
| Traces dans le sable, glisse | Traces de pneus qui s'estompent sur la plage et dans le désert. Les véhicules non tout-terrain y glissent nettement plus. | `9f2147a` |
| Wakeboard | Sillage en V visible. Boutons OLLIE, BACKFLIP et 360. Une figure pas finie à la réception, c'est la chute. Planche aux bouts arrondis avec fixations. Objectif 9 000 : impossible sans figures. | `0ee3f92` |
| Crawl | SPRINT à la nage : crawl, 1,7 fois plus vite, l'endurance fond vite. | `0ee3f92` |
| Vagues | Au large, un petit bateau lancé rebondit de crête en crête. | `0ee3f92` |
| Île aux trésors | Plus grande, contour irrégulier, montagne de 16 u, jungle. Six endroits où creuser : un seul cache le trésor (il change à chaque vague), les autres donnent de l'or, une bouteille ou un indice de direction. Sangliers et jaguar : ils chargent et mordent, on les tue au tir ou au corps à corps, ils reviennent à chaque vague. | `0ee3f92` |
| Wingsuit | Portant au sommet du Pic. On la garde jusqu'au game over. En chute libre, bouton WINGSUIT : plané rapide, puis VOILE pour se poser (298 u de vol depuis le Pic). | `e18ff77` |
| Mini-jeux taxi, ambulance, pompiers | Refaits, payés, avec des paliers à débloquer. Détail ci-dessous. | `e18ff77` |

### Métiers

- **Taxi.**
  - Le client fait signe sur le trottoir ; il a un caractère : pressé, fragile, fêtard, ou VIP à partir du palier 6.
  - Destination nommée, chrono et satisfaction, d'où le pourboire.
  - Paliers : 3 = tarif majoré, 6 = clients VIP, 10 = tenue et appel de taxi.
- **Ambulance.**
  - Un blessé à terre, entouré de témoins. Défibrillateur : appuyer sur CHOC au maximum du pouls, trois fois.
  - Ensuite, foncer à la clinique avant que le pouls tombe ; les chocs du véhicule le font baisser.
  - Paliers : 3 = soins ×1,5, 6 = +20 PV max, 10 = tenue.
- **Pompiers.**
  - Plusieurs foyers qui s'étendent si on traîne, des habitants coincés à sauver, un chrono.
  - Paliers : 3 = lance renforcée, 6 = prime doublée, 10 = tenue.
- Chaque mission paie, avec un bonus de série. Pour éviter le farming, la paie est pleine pour 3 missions par métier et par vague, puis 20 %.

Captures : `buggy_secours.png`, `mesas_variees.png`, `traces_sable.png`, `jeep_flanc.png`, `ile_tresor_v2.png`, `ile_jaguar.png`, `wakeboard_sillage.png`, `metier_taxi.png`, `metier_ambulance.png`, `metier_pompier.png`, `wingsuit_vol.png`.

### Non fait

- **Montagne plus haute** : la difficulté est venue de la physique, la montagne garde sa hauteur. À revoir après ton test.

### À tester sur iPhone

1. Le 4x4 dans le flanc du mont ; un vélo et une moto hors sentier (ils doivent bloquer).
2. Wakeboard : OLLIE, BACKFLIP, 360, et la chute si on rate.
3. Île aux trésors : creuser les six trous, puis affronter le jaguar.
4. Wingsuit depuis le Pic, puis VOILE.
5. Une course de taxi, une ambulance (CHOC au bon moment), un incendie.
6. 6 étoiles hors de la ville : l'armée doit arriver.

---

## 8e lot — retours de playtest (12 octobre)

Les 12 points sont traités, chacun dans son commit, sauf les points 9 à 12 (défis) : ils forment un seul mécanisme et partagent donc un commit. Le correctif de l'hélico a demandé un second commit.

### Bugs

| Retour | Ce qui a été fait | Commit |
|---|---|---|
| 1. Garage / Monster Truck : améliorations payées, véhicule identique | En simulation et au vrai bouton, les achats s'appliquaient bien : moteur, vitesse, nitro, peinture, néons et pièces. Le rendu le confirme (`garage_monstertruck_ameliore.png` contre `..._origine.png`). Le vrai problème : un palier ne changeait presque rien (+6 % de vitesse au 1er). Paliers renforcés : moteur +22 / 45 / 70 %, vitesse +10 / 20 / 32 %, tenue +15 / 30 / 45 %. Le menu affiche le gain de chaque palier. À la sortie, un récapitulatif (« Monster Truck : moteur 1 · vitesse 1 · nitro · 1 pièce ») confirme ce qui est posé. | `dc8ef02` |
| 2. Hélicoptère du yacht qui explose toujours | **Deux causes.** (a) L'hélico est créé déjà posé, sans vitesse verticale : le régime moteur valait NaN, le son levait une exception, et le jeu faisait sauter le joueur en parachute en **détruisant l'hélico**. Invisible dans les tests sans le son ; c'était l'explosion « toujours ». (b) Tenir DESCENDRE pour se poser arrivait à -13 u/s au contact, au-delà du seuil de crash : tout posé explosait. Désormais : effet de sol, DESCENDRE tenu pose en douceur ; au-dessus de l'eau, l'hélico reste au ras des vagues (avant, raté le pont = explosion). | `c8cc0cb`, `a16a1ad` |
| 3. Gros yacht qui ne se conduit pas | Le yacht amarré (décor) devient le **Méga-yacht « Reyes Royale »**, même modèle. On monte à la barre depuis son pont. Il navigue lentement (16 u/s) et emporte son hélico sur l'héliport. Dès qu'on lâche la barre, il s'arrête et son pont se parcourt à pied, où qu'il soit ; l'hélico peut redécoller et s'y reposer. | `3d317bb` |
| 4. Joueur collé au bateau après un saut | Le nageur était posé à 2,4 u du centre, donc *dans* la coque des grands bateaux, et le bateau lâché filait encore ~20 u sur sa lancée. Désormais on plonge franchement hors de la coque, du côté libre (sinon l'autre, sinon l'arrière). Un bateau lâché en plein saut retombe à l'eau et s'arrête vite. Testé sur les 8 bateaux, lancés ou en l'air. | `39088a7` |
| 5. Presque plus de voitures | Mesuré : la ville plafonnait à ~19 voitures pour 36 permises, ~8 autour du joueur, et partait de zéro à chaque partie. Pas une régression : les essais d'apparition étaient trop rares (2,2/s, beaucoup refusés). Passés à 6/s, doublés tant que la ville est à moitié vide : ~33 voitures, ~16 autour du joueur, **0 choc et 0 véhicule figé** en simulation. | `a83d1c2` |

### Équilibrage

| Retour | Ce qui a été fait | Commit |
|---|---|---|
| 6. Police trop présente, étoiles trop rapides | Chaque délit chauffe 40 % de moins : un piéton tué ne donne plus une étoile, il en faut deux. Hors de vue de la police, la chaleur retombe 60 % plus vite (2★ effacées en 15 s). Agents simultanés : 1-2-4-6-8-10 au lieu de 2-4-6-9-11-13. Renforts espacés (6 s à 1★ au lieu de 3,6). Hélico de police toutes les 35 s au lieu de 22. **Choix :** les étoiles « scénarisées » des salles (descente de police à la radio, alarme du musée, banque) et la zone militaire ne changent pas. | `1d77aca` |
| 7. Colline trop facile ; impossible dans la réalité = impossible dans le jeu, parois des canyons comprises | **Choix des limites**, d'après l'adhérence réelle des pneus. Au-delà, le sol est une paroi, élan ou pas : on glisse le long. Avant, rien ne bloquait sous 53°, et la montée sèche en était exemptée. Voir le tableau ci-dessous. | `d558186` |
| 8. Montagne plus grande | Mont Reyes : sommet de 65 à **89 u**, élargi vers l'ouest. Au sud c'est le canyon, au nord et à l'est les limites du monde : il ne pouvait grandir que vers le haut et vers l'ouest. Sentier à 18 lacets au lieu de 13, même déclivité. Course du mont : 90 s au lieu de 60 (pilote simulé : 52 à 69 s). Rien d'enfoui. | `cfcb5a7` |

**Point 7 : limites de pente retenues**

| Véhicule | Pente maximale |
|---|---|
| Vélo, BMX | 24° (0,45) |
| Pneus de route | 35° (0,7) |
| Quad, buggy, monster truck | 40° (0,85) |
| Moto cross, 4x4 | 45° (1,0), le plafond absolu |
| À pied | 51° (1,25), pour garder les sentiers escarpés de la crique |

Ce qui change avec ces limites :
- **De biais** : le jeu mesure désormais la vraie pente du terrain, et non la pente dans le sens de la marche. Avant, on gravissait en diagonale une paroi infranchissable de face.
- **Montée sèche refaite** : elle montait jusqu'à 63° puis 76° au palier, impossible en vrai. Désormais la pente croît régulièrement jusqu'à un mur final de 43°, sur 43 u de dénivelé. Seule la moto cross passe (4,7 s pour 6,5 s autorisées). Quad, 4x4 (qui grimpe au pas), motos de route, buggy et BMX échouent.
- **Rampe d'accès des mesas** : passée de 44° à 32° (pente régulière), pour rester montable en moto de route.
- **Parois des mesas** : infranchissables de face comme de biais, pour tous les véhicules (vérifié).

### Défis

| Retour | Ce qui a été fait | Commit |
|---|---|---|
| 9. Plus de défis | **77 défis au lieu de 33.** Les défis chiffrés deviennent 19 thèmes à paliers : ennemis (5 paliers jusqu'à 2 500), véhicules, distance, démolition, chefs, vagues, véhicules cachés, fouilles, broyeur. Nouveaux thèmes : taxi, ambulance, pompiers, dépanneuse, police, courses (mont, mesas, montée sèche, supercross, bouées), saut BASE dans la cible, trésor de l'île, achats au garage, wakeboard ou parachute ascensionnel. | `06380f7` |
| 10. Récompense à récupérer, avec notification | Plus rien n'est versé automatiquement. Un défi accompli affiche « 🎁 Défi accompli : … — récompense à récupérer dans DÉFIS ». Une pastille rouge clignotante donne le nombre de récompenses en attente : sur le bouton pause (un toucher ouvre directement les défis), sur le bouton Défis du menu, et sur un **nouveau bouton Défis dans le menu pause**. Les récompenses apparaissent tout en haut de l'écran Défis, avec RÉCUPÉRER +X $. | `06380f7` |
| 11. Défis à paliers | Récupérer un palier débloque le suivant, même thème, quantité plus élevée (« palier 2/5 »). Si le palier suivant est déjà atteint, il est aussitôt à récupérer. Chaque thème est fini : aucune récompense infinie. | `06380f7` |
| 12. Futur bouton « ×2 avec une pub » | Structure en place : `PUB_X2.disponible()` (faux pour l'instant, donc le bouton est masqué) et `PUB_X2.montrer(fin)`, à brancher sur une régie. Le bouton « ×2 🎬 » s'affiche à côté de RÉCUPÉRER dès que `disponible()` est vrai ; la récompense n'est doublée que si la pub a été vue. Testé avec une fausse pub. | `06380f7` |

**Sauvegardes :** les anciens défis payés restent récupérés, et leurs ids sont les premiers paliers des thèmes : rien n'est perdu. « À récupérer » survit au rechargement.

Captures (`captures/lot8/`) :
- `garage_monstertruck_ameliore.png`, `garage_monstertruck_origine.png`
- `grand_yacht_barre.png`, `grand_yacht_cote.png`
- `mont_avant.png`, `mont_apres.png`, `montee_seche_couloir.png`
- `defis_a_recuperer.png`, `defis_pastille_hud.png`

### Vérifications

- `node scenarios.js` : **685 vérifications, toutes au vert, aucune sautée**, avec la graine par défaut (20260731) et avec la graine aléatoire 973139445.
- `node valider.js` : vert. Les portes de la ville n'ont pas bougé.
- Huit tests ajoutés : garage / Monster Truck (au vrai bouton), hélico du yacht (avec le son, qui révélait le bug), grand yacht, sauter d'un bateau (8 bateaux), circulation, police, pentes réalistes, défis.
- Tests adaptés :
  - montée sèche : le quad échoue désormais ;
  - un défi « accompli » est à récupérer ou récupéré ;
  - course du mont sans la curiosité « Volant » : un test maîtrise sa scène.

### Non fait / limites

- **Montée sèche** : le flanc du mont (0,85 de pente moyenne) est trop raide pour qu'une piste plafonnée à 43° rejoigne la surface. L'arrivée est donc une **encoche taillée dans le flanc**, à 43 u, et non plus au sommet du mont. Dans la course du mont, un buggy lancé trop vite (curiosité « Volant ») a sauté du dernier lacet et fini dans cette encoche. On en ressort en redescendant le couloir. À surveiller.
- **Minimap** : le rectangle blanc du yacht reste au mouillage quand on part avec.
- **Petits objets du pont du yacht** (gilet, billets) : ils restent au mouillage.

### À tester sur iPhone

1. Garage : acheter 1 palier de moteur et de vitesse sur le Monster Truck, sortir. On doit lire le récapitulatif et sentir la différence.
2. Hélico du yacht : monter, décoller, se reposer sur le pont DESCENDRE tenu, puis survoler la mer en descendant (il doit rester au ras de l'eau).
3. Gros yacht : prendre la barre (au fly), partir au large, lâcher la barre, marcher sur le pont, reprendre l'hélico.
4. Sauter d'un bateau lancé (vedette, jet-ski, yacht) : on doit nager librement tout de suite.
5. Circulation en ville, en qualité moyenne et basse.
6. Police : tuer un passant (aucune étoile), deux (1★) ; à 3★, compter les agents.
7. Montée sèche en moto cross (passe), en quad (bloqué au mur) ; longer une paroi de mesa de biais ; monter la rampe d'accès des mesas en moto de route.
8. Course du mont : 90 s suffisent-elles à un humain ?
9. Défis : la pastille sur pause, l'écran Défis, RÉCUPÉRER, puis le palier suivant.

---

## 9e lot — amphibie, mur de l'aéroport, salles vivantes (12 octobre)

| Retour | Ce qui a été fait | Commit |
|---|---|---|
| 4x4 amphibie qui se noie en arrivant dans la mer | Le jeu testait « est-il sur l'eau ? » **avant** de le déplacer : à l'image où il entrait dans la mer, il était encore « à terre », donc noyé. L'amphibie est exempté, à l'entrée dans l'eau comme à l'amerrissage d'un saut. Une fois à l'eau, il ne pouvait plus en ressortir : la plage comptait comme un mur, comme pour un bateau. Il ressort maintenant sur ses roues. Les autres véhicules se noient toujours. | `0d9754c` |
| Mur ville / aéroport infranchissable en chute libre ou sous voile | **Choix : le mur est gardé.** Il guide les véhicules vers le portail et délimite l'aéroport. En revanche, tout ce qui est **en l'air au-dessus** d'un mur ou d'un obstacle passe désormais : chute libre, voile, wingsuit, jetpack. Avant, n'importe quel obstacle arrêtait un parachutiste, même à 30 m. À pied au sol, il bloque toujours. L'entrée est maintenant matérialisée : deux pylônes balisés jaune et noir, une grande enseigne AÉROPORT, un marquage peint sur le tarmac. Une arche au-dessus de la route a été essayée puis retirée : trop proche de la caméra, elle cachait le joueur. | `0e21136` |
| Disco plus attrayante : bagarre, alcool, danse | **Club Néon refait.** Détail ci-dessous. | `e3dccb2` |
| Rendre chaque endroit plus vivant | **63 figurants dans 19 lieux.** Supérette, banque, commissariat, tour, pharmacie, armurerie, concession, laverie, voyante, karaoké, aquarium, bowling, salle de sport, serre, sandwicherie, musée, arcade, cinéma, garage. Ils flânent d'un point à un autre sans jamais traverser un meuble, et lâchent de temps en temps une réplique du lieu (« STRIKE ! », « Mon prêt, refusé ?! », « Regarde, un requin ! »). Ils s'écartent quand tu les frôles et se mettent à couvert, accroupis, si tu te bats ou tu tires. | `a24248f` |

### Club Néon

- **Cocktails (25 $)**, au bar. Ils soignent un peu et font monter une **jauge d'ivresse** (🍸 dans le HUD), qui redescend seule en environ 1 min 20. Les effets sont à court terme :
  - **pompette** (dès 30 %) : coups +20 % (« courage liquide »), l'image tangue ;
  - **ivre** (dès 60 %) : la marche dérive, le tir s'égare, on perd le rythme sur la piste ;
  - **le verre de trop** (100 %) : trou noir. On se réveille dehors, -25 % de vie, jusqu'à 60 $ en moins.
  - Tout est remis à zéro à chaque partie.
- **Piste de danse** : DANSER, puis frapper chaque temps au rythme : 16 temps, 118 BPM, un anneau qui pulse.
  - Un temps raté, un appui en trop ou à contretemps compte comme une faute.
  - 12 temps nets ou plus : le public paie un pourboire (jusqu'à 160 $), **une fois par vague**.
  - Taper au hasard échoue (vérifié).
- **Bagarres** : de temps en temps, un fêtard éméché cherche la bagarre (« Hé ! Tu m'as renversé mon verre ! »), plus souvent si tu as bu. Ça se règle à mains nues. Une fois ton adversaire KO, le videur l'évacue et le patron t'offre un verre.
- **Videur** : sortir une arme à feu dans le club, c'est être jeté dehors (et un peu d'attention de la police).
- **Ambiance** : salle pleine (12 danseurs, clients au bar et sur les banquettes), DJ qui mixe, boule à facettes, lasers.

Captures (`captures/lot9/`) :
- `amphibie_mer.png`
- `portail_aeroport.png`
- `club_salle.png`, `club_danse.png`
- `vie_banque.png`, `vie_aquarium.png`, `vie_arcade.png`

### Vérifications

- `node scenarios.js` : **689 vérifications, toutes au vert, aucune sautée**, avec la graine par défaut et avec la graine aléatoire 2909113354.
- `node valider.js` : vert. Portes de la ville inchangées.
- Quatre tests ajoutés :
  - **4x4 amphibie** : de la plage au large et retour, saut dans l'eau ; un 4x4 ordinaire se noie toujours.
  - **Mur de l'aéroport** : franchi sous voile et en chute libre, bloquant à pied. Le test échoue sur l'ancien code, comme il se doit.
  - **Club Néon** : ivresse et malaise, danse parfaite payée une seule fois par vague, rafales d'appuis ratées, bagarre, videur, remise à zéro.
  - **Vie des salles** : les 19 lieux, jamais dans un meuble, panique.

### Non fait / à décider

- **Les autres salles « anciennes »** n'ont pour l'instant que la couche de figurants vivants, pas de nouvelles activités. Le club sert de modèle (boisson, mini-jeu perdable payé une fois par vague, incident). Dis-moi lesquelles traiter en priorité : karaoké, bowling, casino, arcade… et je leur applique le même traitement.
- **Pas de musique propre au club** : l'audio reste celui du jeu.

### À tester sur iPhone

1. Amphibie : du port (rampe de mise à l'eau) vers le large, puis retour sur la plage.
2. Sauter en parachute ou en wingsuit de la ville vers l'aéroport, par-dessus le mur.
3. Club : boire jusqu'à être ivre (marche, caméra), danser (le rythme est-il tenable au doigt ?), attendre une bagarre, sortir le pistolet.
4. Visiter banque, aquarium, arcade : les figurants doivent rester crédibles et ne pas gêner les activités.

---

## 10e lot — kiosque de la banderole, figures sur deux roues (12 octobre)

| Retour | Ce qui a été fait | Commit |
|---|---|---|
| Le kiosque où l'on écrit la banderole est sous une maison | Sa place fixe (près de la jetée) tombait dans une maison de plage **sur pilotis**. La vérification d'obstacle, faite à hauteur du sol, passait sous le plancher de la maison et ne la voyait pas. Le kiosque prend maintenant la place libre la plus proche sur le sable, jamais dans l'axe de la jetée. Un test vérifie qu'aucune construction n'est dans son emprise et que son bouton est accessible ; il échoue sur l'ancienne version. | `2a053f4` |
| 360 et backflip en moto cross et à vélo, comme au wakeboard | **Trois boutons à part** au guidon : **360** (à la place de SPRINT, inutilisé en véhicule), **BACKFLIP** (à la place de GRENADE), et ESQUIVE reste **BUNNY HOP** à vélo ou **CABRER** en moto cross. Ce découpage vient d'un retour : « le 360 doit être un bouton en plus, pas collé avec le bunny hop » (`hud_velo.png`). Les figures ne partent qu'en l'air, un appui fait au sol n'est jamais gardé pour le décollage, et elles se combinent (BACKFLIP 360). Le véhicule tourne en entier avec son pilote. Comme au wakeboard, **une figure pas finie à la réception, c'est la chute** : on est éjecté, avec quelques dégâts. Une figure réussie rapporte des points (360 : 150, backflip : 250, combo ×1,5, multiplié par le combo en cours), qui **comptent aussi au défi supercross**. Valable pour la moto cross, la moto militaire (une cross), le vélo et le BMX. **À vélo, un BUNNY HOP suivi tout de suite (dans les 0,3 s) d'un 360 ou d'un BACKFLIP pousse plus fort** : le saut dure juste assez pour finir la figure, même les deux combinées (environ 1,7 u de haut) ; demandé ensuite. Appuyer trop tard reste une chute. | `4cf44d9` + suites |

**Réglages :**
- 360 : 0,62 s en moto, 0,5 s à vélo ;
- backflip : 0,78 s en moto, 0,62 s à vélo ;
- un grand saut de tremplin (environ 1,4 s en l'air) permet le combo.

Captures (`captures/lot10/`) :
- `kiosque_avant.png`, `kiosque_apres.png`
- `moto_backflip.png`, `bmx_360.png`, `moto_combo.png`

### Vérifications

- `node scenarios.js` : **691 vérifications, toutes au vert, aucune sautée**, avec la graine par défaut et avec la graine aléatoire 2823685321.
- `node valider.js` : vert. Portes de la ville inchangées.
- Deux tests ajoutés :
  - **Kiosque de la banderole** : il échoue sur l'ancienne version (maison sur pilotis dans l'emprise).
  - **Figures deux roues** : grand saut réussi, petit saut qui fait chuter et aucune figure au sol, sur les quatre véhicules, plus les points comptés au défi supercross.
- En route, un commentaire placé au milieu d'une ligne avait désactivé la boucle de recherche de place du kiosque, sans erreur visible. Trouvé, corrigé, et le motif de détection a été ajouté à la vérification du diff.

### Suites du même jour

| Retour | Ce qui a été fait | Commit |
|---|---|---|
| « Il peut cabrer ? » (le vélo) | Oui, sans bouton de plus, comme un vrai BMX. Un **appui bref** sur HOP / CABRER fait le bunny hop (au relâcher) ; **le maintenir** fait cabrer, roue avant levée, tant qu'on tient (`bmx_cabre.png`). | `38db7ec` |
| Skatepark : l'améliorer considérablement, l'agrandir, un gros bowl, « épique » | **Choix du lieu** : le skatepark du parc tient dans un pâté de 26 u entouré de routes, impossible à agrandir. J'ai donc construit le **Reyes Skatepark** dans le désert, au sud du Pic du Vertige, sur 52 × 70 u. Le petit reste en ville comme spot de rue. Contenu et réglages ci-dessous. | `fffc54f` |

**Le Reyes Skatepark** (repère 🛹 sur la carte)
- **Le site** : une grande plate-forme de béton de 3 u de haut, avec des rampes douces sur tout le tour.
- **Les modules** :
  - un **grand bowl double** (partie profonde et poche), avec carrelage de piscine et copings, et un couloir pour en ressortir à pied ;
  - un **half-pipe** ;
  - un **quarter géant** de 6 u au-dessus de la plate-forme ;
  - une pyramide, un escalier de 8 marches avec rampes, des ledges.
- **L'ambiance** : des gradins avec un public qui se lève sur les gros airs, une grande enseigne néon REYES SKATEPARK, des projecteurs et des palmiers.
- **La physique** : au coping, on décolle **à la verticale** et on retombe dans la courbe, comme un vrai air de bowl. Les 360 et backflips se font pendant ces airs.
- **Mesures du pilote simulé** :

  | Module | Véhicule | Airs en 20 s | Hauteur au-dessus du coping |
  |---|---|---|---|
  | Half-pipe | Vélo | 10 | 1,8 u |
  | Half-pipe | BMX | 10 | 2,3 u |
  | Half-pipe | Moto cross | 10 | 4,7 u |
  | Quarter géant | Moto cross | — | 11 u |

- **Défi REYES BOWL JAM** : 10 000 points en 60 s, une prime de 350 $ par vague. Sans figures, c'est raté : le pilote simulé parfait fait 6 200 à 8 000 points. Avec un backflip par air, il fait 13 400 à 15 200 points.
- **Captures** : `skx_aerien.png`, `skx_bowl.png`, `skx_quarter.png`, `skx_nuit.png`, `skx_air_bmx.png`, `skx_air_quarter.png`, `skx_jeu.png`.

| Pendant un défi, « se calmer avec les vagues », idem pour les autres jeux | Pendant une course ou un défi (mont, mesas, montée sèche, supercross, bouées, REYES BOWL JAM), le wakeboard, le parachute ascensionnel ou un métier : **les vagues sont en pause** (« VAGUES EN PAUSE — défi en cours »), les événements aléatoires aussi (guerres de gangs…), et **les gangs déjà présents ne s'occupent plus de toi** : ils patrouillent, les motards s'arrêtent. Tout reprend à la fin de l'activité. **Choix :** la police continue si tu es recherché. | `3176449` |
| Le vélo explose | Le vélo et le BMX ne prennent plus aucun dégât et n'explosent jamais (grenade, roquette, explosion voisine), comme la planche de surf. Ils peuvent toujours se noyer. | `3176449` |
| Tirer depuis une voiture ou une moto, au pistolet ou à la mitraillette légère | **Tir par la vitre** : au volant d'une voiture ou d'une moto, un bouton TIR apparaît (au-dessus de SPÉCIAL, à la place du jetpack, jamais sous FREIN ni SORTIR). Visée automatique tout autour du véhicule ; mêmes chargeurs, recharge et étoiles qu'à pied ; un peu plus dispersé en roulant vite et à moto. **Arme** : celle en main si c'est le pistolet, le silencieux, la Guêpe ou l'Uzi, sinon la meilleure des quatre qui a des munitions ; aucune, pas de bouton. **Choix** : jamais à vélo (ses boutons font les figures), ni dans un véhicule déjà armé, un aéronef ou un bateau. Captures `tir_voiture.png`, `tir_moto.png`. | `7bbdec9` |

### Piste ouverte

- **Trafic** : un choc rare d'un bus de ville contre un pickup arrêté (2 parties de 60 s sur environ 90). Il n'a pas pu être reproduit sous instrumentation en 85 essais. Le test de circulation tolère donc au plus 2 chocs par minute au lieu d'exiger zéro, pour ne pas être aléatoire. À reprendre si tu le vois en jeu, en notant l'endroit.

### À tester sur iPhone

1. Le kiosque près de la jetée : bien dégagé, bouton accessible.
2. Sur les tables du supercross en moto cross : 360, backflip, puis les deux ; vérifier qu'une figure lancée trop tard fait chuter.
3. En BMX au skatepark (tremplins face à face) : un 360 doit passer, pas sur un simple bunny hop.
4. Vélo : appui bref = bunny hop, maintenu = cabré.
5. Reyes Skatepark (🛹 sur la carte) : allers-retours dans le half-pipe et le bowl, gros air sur le quarter géant en moto cross, REYES BOWL JAM avec des backflips. Ressortir du bowl à pied par le couloir.
6. Tir par la vitre : en voiture puis à moto, maintenir TIR près d'un gangster ; le bouton ne doit gêner ni FREIN ni SORTIR.

---

## 11e lot — grand chantier « salles et mini-jeux » (12-13 octobre)

Demande : chaque salle et chaque mini-jeu doit être épique, compris en quelques secondes, engageant, donner envie de découvrir la suite, sans bug. On commence par un audit complet, puis on refait en profondeur, de la pire salle à la meilleure (le chalutier en premier).

### Audit des salles

**Méthode.** Pour chacune des 27 salles (`INTDEFS`), j'ai :
- lu sa construction (`construireSalle`), ses interactions (`majAction`) et sa logique (`majInterieur` et sa section) ;
- fait une capture réelle, en vue de jeu et en vue d'ensemble (planches `planche_vue_*.png`) ;
- noté de 1 à 5 : **F**onctionne, **C**ompréhensible, **E**ngageant, é**P**ique, **S**tyle et décor, **R**écompense.

**Constat général.** Toutes les salles fonctionnent : la passe de debug précédente a laissé peu de bugs. Le défaut commun est ailleurs :
- **Des boîtes.** Les salles sont des boîtes à sol en damier, aux murs gris identiques.
- **Des étiquettes.** Les postes sont signalés par de grands panneaux-étiquettes (« BARRE », « CANNE », « TREUIL ») au lieu d'objets reconnaissables.
- **Du texte.** Les consignes passent par des toasts de plusieurs lignes, et l'action se réduit souvent à « appuyer sur le bouton d'action à côté d'un panneau ».
- **Un seul tour.** Peu de mini-jeux ont une montée en difficulté, un moment fort ou une victoire vraiment célébrée.

| Salle | F | C | E | P | S | R | Total | Problèmes principaux |
|---|---|---|---|---|---|---|---|---|
| Chalutier « Sainte-Odile » | 3 | 1 | 2 | 1 | 1 | 3 | **11** | Le bateau est un rectangle à damier figé sur une eau plate : on ne voit jamais qu'on navigue (cap et zone ne sont que du texte et une petite flèche). Sept systèmes (barre, canne, filet, billot, cale, rejet, météo) à découvrir en lisant des toasts, en marchant d'un panneau à l'autre. La pêche à la canne consiste à maintenir le bouton d'action en surveillant une barre de 14 px : aucune ligne, aucun poisson visible. |
| Aquarium « Bleu Profond » | 5 | 3 | 1 | 2 | 3 | 3 | **17** | Le jeu est un tirage : sonder des bassins au hasard. L'indice (« pas loin » à un écart de 1 ou 3) est incompréhensible. Aucune tension, aucune adresse. Gaston n'apparaît qu'à la fin. |
| Voyance (Madame Zohra) | 5 | 4 | 1 | 2 | 3 | 2 | **17** | Payer, lire un toast : aucune mécanique. Prédictions tirées au hasard, souvent inutiles. |
| Laverie « Bulle Bleue » | 4 | 3 | 1 | 2 | 2 | 4 | **16** | Le « mini-jeu » consiste à attendre 42 s devant une machine, puis à encaisser 420 à 760 $ sans rien faire. Les machines du fond déclenchent une alarme sans prévenir. La salle est blanche et vide. |
| Supérette / Pharmacie | 4 | 3 | 1 | 1 | 2 | 2 | **13** | Boutiques sans menu : chaque appui achète l'article affiché puis passe au suivant, on ne choisit pas. Le braquage de la caisse est instantané, sans aucune tension. (Ce sont des boutiques plus que des mini-jeux.) |
| Serre tropicale | 4 | 2 | 2 | 2 | 3 | 4 | **17** | La consigne (« les trois qui poussent à l'ombre ») repose sur des attributs peu lisibles à l'écran. Une erreur coûte cher sans qu'on comprenne pourquoi. Un trait vertical blanc traverse la vue d'ensemble. |
| Radio pirate Reyes FM | 4 | 3 | 3 | 2 | 3 | 3 | **18** | Bonne idée (aiguille dans une porteuse qui dérive, triangulation de la police), mais une jauge abstraite et un studio sans vie. La victoire n'est qu'un toast. |
| Ciné-Palace | 4 | 3 | 3 | 2 | 3 | 4 | **19** | La surcharge est bien pensée, mais les quatre « réparations » sont un simple appui. On ne voit ni le film ni la salle qui s'impatiente. Les postes sont des panneaux. |
| Karaoké « Micro Cassé » | 5 | 4 | 2 | 3 | 3 | 4 | **21** | Trois arrêts de curseur, sans musique ni paroles. Trop court pour créer un moment fort. |
| Commissariat | 4 | 4 | 2 | 2 | 2 | 4 | **18** | Deux pillages instantanés, puis une alarme. Décor de bureau gris. |
| Concessionnaire | 4 | 3 | 1 | 2 | 3 | 3 | **16** | On fait défiler les modèles un appui à la fois, sans fiche. C'est un magasin. |
| Tour Los Reyes | 5 | 5 | 1 | 2 | 2 | 3 | **18** | Un ascenseur. Hall vide. |
| Armurerie | 5 | 4 | 1 | 1 | 2 | 3 | **16** | Ouvre le menu de la boutique. Salle vide. |
| Bowling « Strike Doré » | 5 | 4 | 2 | 3 | 3 | 4 | **21** | Deux curseurs pour trois lancers. La boule et les quilles sont peu animées. |
| Salle de sport « Fer & Sueur » | 5 | 5 | 2 | 3 | 3 | 4 | **22** | On martèle un bouton, ce qui est clair et a un vrai effet (muscle permanent), mais une fois les 3 paliers atteints, il n'y a plus rien à faire. |
| Le Roi des Sandwichs | 5 | 4 | 3 | 3 | 3 | 4 | **22** | Bonne tension (nausée contre bouchées), mais on fait des allers-retours entre deux zones. Un seul défi par vague. |
| Banque | 4 | 4 | 3 | 3 | 3 | 4 | **21** | Le coffre se force instantanément, sans mini-jeu. Le reste est une fusillade classique. |
| Casino | 4 | 4 | 3 | 3 | 3 | 3 | **20** | Les jeux eux-mêmes sont corrects, mais tout se passe dans des menus plein écran. La salle ne réagit pas aux gains. |
| Club Néon | 4 | 4 | 3 | 3 | 4 | 3 | **21** | Refait au 9e lot (danse, cocktails, bagarres). La danse reste minimaliste. |
| Musée (casse) | 4 | 3 | 4 | 3 | 3 | 4 | **21** | Vraie mécanique de furtivité, mais l'explication est un toast de cinq lignes. Les cônes de vue sont peu lisibles. |
| Métro abandonné | 4 | 3 | 4 | 3 | 3 | 4 | **21** | Bonne tension (batterie, la Bête). Les panneaux sont illisibles dans le noir et la Bête est invisible. |
| Dépôt de bus | 4 | 3 | 4 | 3 | 2 | 4 | **20** | De vraies courses. Le choix du véhicule puis du circuit demande deux postes et des appuis à confirmer. Le décor autour des pistes est vide. |
| Site 51 | 4 | 2 | 4 | 3 | 2 | 5 | **20** | Casse de planification riche, mais les règles des sas se comprennent mal. Long couloir sombre, panneaux minuscules. |
| Palais de l'Arcade | 4 | 4 | 4 | 3 | 4 | 3 | **22** | Cinq vrais jeux (serpent, blocs, casse-briques, labyrinthe, tir). Les lots ont peu d'intérêt. |
| Garage tuning | 4 | 4 | 3 | 3 | 3 | 4 | **21** | Refait aux lots précédents. Menu dense. |
| Villa planque | 5 | 4 | 2 | 2 | 3 | 4 | **20** | Lieu de repos (lit, coffre, trophées, penderie). Pas un mini-jeu. |

**Mini-jeux hors salles**, pour mémoire. Ils sont récents et ont déjà été repris aux lots 6 à 10 : courses et défis (mont, mesas, montée sèche, supercross, bouées, REYES BOWL JAM), wakeboard, parachute ascensionnel, métiers, plongée, île au trésor. Ils sont plus jeunes et mieux notés (19 à 23). Je ne les reprends pas dans ce chantier.

**Ordre de refonte retenu** (de la pire à la meilleure, en ne gardant que les vrais mini-jeux) :
1. Chalutier
2. Aquarium
3. Laverie
4. Serre
5. Radio
6. Ciné-Palace
7. Voyance
8. Karaoké

Viendraient ensuite : bowling, banque (mini-jeu du coffre), commissariat, puis les boutiques (supérette, pharmacie, concessionnaire, avec un vrai menu).

**Choix** : les boutiques (supérette, pharmacie, armurerie, concessionnaire, tour) passent après les mini-jeux. Elles ont le score le plus bas, mais la demande vise d'abord les mini-jeux, et leur refonte serait surtout un menu.

### Refonte 1 — Chalutier « Sainte-Odile » (commit `42ae176`)

**Concept retravaillé.**
- **Promesse** : prendre la mer trois minutes, traquer les bancs qu'on voit à l'eau, ramener la cale avant la tempête — et peut-être le Vieux Roi.
- **Mécanique centrale** : piloter réellement le bateau, s'arrêter sur un banc, gagner le combat à la canne en lâchant quand le poisson tire.
- **Moment fort** : le Vieux Roi, espadon légendaire de la Fosse, saute deux fois hors de l'eau au ralenti pendant un combat de 30 s.

**Avant / après** : `chalutier_avant.png` (un rectangle à damier sur une eau plate, des panneaux BARRE / CANNE / TREUIL) contre `chalutier_planche.png`.

**Ce qui a changé** :
- **Un vrai bateau** :
  - coque rouge à étrave arrondie, pont en lames de bois, pavois blancs et lisse en bois ;
  - timonerie avec vitres, radar qui tourne, cheminée qui fume, feux de navigation rouge et vert ;
  - mât et étais, cale bâchée, treuil du chalut, panneaux de chalut, pare-battages, bouées couronnes ;
  - « SAINTE-ODILE · LOS REYES » peint sur le tableau arrière.
  
  Les murs gris de la salle ont disparu ; ils restent invisibles et retiennent le joueur à bord.
- **On voit enfin qu'on navigue** :
  - la mer est un vrai plan d'eau animé (vagues, écume, reflets, plus sombre au large et dans la tempête) ;
  - elle tourne et glisse autour du bateau, proue toujours en haut de l'écran, avec un sillage et l'écume de proue ;
  - au départ, le port, la jetée, le phare et la côte de Los Reyes s'éloignent derrière ;
  - au large, on croise les bouées des zones (jaunes, puis rouges pour la Fosse) et des récifs à contourner.
- **Le radar remplace la minimap** pendant la sortie :
  - les bancs : 🐟 à la canne, ✨ sardines au filet, 👑 le Vieux Roi ;
  - le port ⚓, les récifs, les cercles des zones, le nom de la zone ;
  - un bord rouge qui clignote dans la tempête.
- **Des bancs visibles à l'eau** : une ombre qui ondule, des poissons qui tournent et sautent, des mouettes qui piquent ; pour le Roi, un aileron et un reflet doré.
- **Une seule action à la fois** : le joueur est d'office à la barre et le joystick pilote (◀ ▶ virer, ▲ gaz, ▼ freiner). Le bouton d'action propose toujours la bonne chose : « Fonce vers un banc du radar », « Ralentis pour pêcher », 🎣 PÊCHER ICI, 🕸️ JETER / REMONTER LE FILET. Les boutons de combat (poing, grenade, esquive…) sont masqués en mer.
- **La pêche illustrée**, dans un panneau en bas d'écran qui se tient au doigt :
  - on voit le bouchon flotter, puis plonger : « FERRE ! », il suffit de toucher ;
  - au combat, on voit le poisson se débattre et remonter, avec une jauge MOU / zone verte / CASSE ;
  - maintenir = mouliner (cliquetis), lâcher = laisser filer.
  - **Nouveauté** : le poisson donne des **coups de tête** (« ⚠ IL TIRE — LÂCHE ! », il se débat dans le panneau). Mouliner à ce moment-là tend la ligne et le fait reculer. Cela donne un rythme à lire au lieu d'une simple jauge.
  - **Retours** : la ligne et le bouchon sont visibles à l'eau, avec des éclaboussures. La prise saute sur le pont et gigote, puis s'affiche en grand avec son prix et son poids. Les caisses s'empilent sur le pont au fil de la cale.
- **Le filet** se jette près d'un banc de sardines et ne se remplit qu'en le traversant au moteur : c'est un petit jeu de pilotage. Une jauge dans le panneau d'infos vire au rouge quand le filet risque de se déchirer.
- **La tempête se voit et se sent** :
  - ciel noir, éclairs, pluie, paquets de mer sur le pont ;
  - roulis de la caméra, cap qui dérive ;
  - une lame qui balaie le pont et emporte la moitié de la cale au bout de 30 s.
- **Entrée en scène** : corne de brume, « LARGUEZ LES AMARRES », carte à icônes de 4 s (« ◀ ▶ virer · ▲ gaz · ▼ freiner », « fonce vers un banc du radar », « rentre au ⚓ avant la tempête », « le Vieux Roi rôde dans la Fosse… »). Elle s'efface dès qu'on pêche.
- **Fin célébrée** : « VENTE À LA CRIÉE », prises regroupées (« Bar ×3 … 270 $ »), total qui défile, plus belle prise. Une sortie ratée (remorqué) montre une cale vide.
- **Panneau d'infos compact** : chrono en grand (rouge sous 30 s), ciel (jauge vert / jaune / rouge), cale (poids, valeur), bouton ⚓ ABANDONNER plus grand qu'avant.

**Choix faits** :
- **Supprimés** : le billot (découpe au doigt) et le bouton « rejeter la dernière prise ». Ils ajoutaient deux systèmes à lire pour un gain faible ; quand la cale est pleine, le bouton dit simplement de rentrer.
- **Curiosité** : la Boussole du Capitaine s'obtient désormais en **ramenant le Vieux Roi au port**. L'ancienne condition (« cale pleine depuis la Fosse, sans rien rejeter ») était invisible pour le joueur. Le texte d'indice est mis à jour.
- **Valeur du Vieux Roi** : 800 $, pour éviter une rente : 2 sorties par vague, comme avant.
- **Coffre du capitaine** : la cabine (devenue timonerie) a laissé place à une malle sur le gaillard avant. La fouille reste la même.

**Vérifications** :
- `valider.js` est vert et les portes sont inchangées.
- 60 vérifications chalutier dans `scenarios.js`. Les anciens tests utiles sont gardés (chrono, météo, cale, 2 sorties par vague, zone de SORTIE inerte, abandon, remises à zéro, fouilles, horloges) ; les nouveaux couvrent :
  - le pilotage et la mer qui tourne ;
  - les bancs dans leur zone et hors des récifs ;
  - le bouton contextuel ;
  - le doigt sur le panneau ;
  - les coups de tête ;
  - les sauts du Roi et le Roi arrimé contre la tempête ;
  - le filet dans le banc ;
  - le bilan ;
  - les boutons de combat masqués puis rendus.
- **Pilote simulé**, au joystick et au bouton d'action seulement (réaction 0,35 s, lâche pendant les rushs) : 4 sorties sur 4 ramènent le Vieux Roi et 4 à 7 autres prises en 144-153 s (1 290 à 1 550 $). Une sortie sans rien faire finit remorquée à 180 s avec 0 $.
- **Perdable** : tenir le moulinet en continu casse la ligne, relâcher libère le poisson, et le pilote a raté un Roi au premier essai.
- **Rendus réels** : `chalutier_quai`, `largage`, `en_mer`, `sur_banc`, `attente`, `morsure`, `combat`, `rush`, `prise`, `saut_roi`, `filet`, `tempete`, `bilan` (captures `lot11/`).

**À tester sur iPhone** :
1. **Pilotage** : la barre au joystick se prend-elle en main en quelques secondes ? Trouver un banc au radar et s'y arrêter.
2. **Pêche** : toucher le panneau pour ferrer, maintenir pour mouliner, lâcher pendant « IL TIRE ». Le panneau est-il assez grand ? Le doigt glisse-t-il hors du panneau sans couper le moulinet ?
3. **Le Vieux Roi** : ses deux sauts sont-ils bien visibles (au flanc droit du bateau) ?
4. **Lisibilité** : radar, panneau d'infos et bouton ⚓ ABANDONNER sur un vrai écran, encoche comprise.
5. **Performance** : le shader de la mer, la pluie et le sillage sur iPhone (le shader ajoute quelques sinus par pixel d'eau).

**Reste à améliorer** :
- une vraie corne de brume synthétisée (aujourd'hui un bip grave) ;
- des cris de mouettes ;
- une musique de criée au bilan ;
- un 2e poisson légendaire ;
- d'autres bateaux de pêche au large.

### Refonte 2 — Aquarium « Bleu Profond » (commit `ced6efe`)

**Concept retravaillé.**
- **Promesse** : rattraper Gaston, le poulpe évadé, sans jamais qu'il te voie bouger.
- **Mécanique centrale** : « un, deux, trois, soleil ». Il a le dos tourné, tu avances ; il frissonne, tu t'arrêtes ; il regarde, tu ne bouges plus.
- **Moment fort** : les dernières manches, très courtes, pleines de fausses alertes, avec un jet d'encre en plein écran à la moindre erreur.

**Avant** (`aquarium_avant.png`) : sonder six bassins au hasard, avec un indice obscur (« pas loin » à un écart de 1 ou 3). Aucune adresse, aucune tension.

**Ce qui a changé** :
- **Le jeu** :
  - le gardien, à l'est, lance la partie : « 🐙 GASTON S'EST ÉVADÉ ! — L'ATTRAPER » ;
  - Gaston est perché sur le bord d'un bassin. Quand il a le dos tourné, il chantonne (♪), et on s'approche au joystick ;
  - il frissonne (❗), c'est le signal ; il se retourne (👀) : qui bouge prend un jet d'encre (écran taché), et Gaston saute sur un autre bassin ;
  - il faut le toucher **5 fois**. Chaque manche raccourcit ses siestes et ajoute des fausses alertes (il frissonne puis se rendort) ;
  - **échec** : 3 jets d'encre ou 75 s, et Gaston s'enfuit. On peut retenter tout de suite auprès du gardien : seule la victoire paie.
- **Lisible en un coup d'œil** : un grand indicateur en haut de l'écran (😌 BOUGE ! en vert, ❗ ATTENTION… en jaune, 👀 STOP ! en rouge), avec les manches (🐙 2/5), les encres (🖤🤍🤍) et le chrono. Gaston, agrandi, porte un halo au sol de la même couleur. Pendant la partie, le bouton d'action et les boutons de combat disparaissent : tout se joue au joystick.
- **Retours** :
  - au regard : un grondement ; à l'alerte : deux notes ;
  - à l'erreur : jet d'encre (particules noires vers le joueur, taches à l'écran, vibration) ;
  - à chaque touche : gerbe violette, « ✋ TOUCHÉ ! 3/5 », Gaston qui proteste (« Hé ! ») et saute en tournoyant vers un autre bassin.
- **Victoire** : « 🐙 GASTON EST ATTRAPÉ ! », Gaston dans les bras du joueur au-dessus de sa tête, confettis. La Perle Noire la première fois, sinon 180 à 380 $ du gardien, **une fois par vague**.
- **Décor** :
  - eau des bassins translucide qui ondule, avec des poissons de couleur qui tournent dedans et des bulles ;
  - un grand bassin mural au nord où passent des poissons et un requin ;
  - le gardien avec son seau et son épuisette ;
  - les panneaux « BASSIN n » et « TUNNEL DE VERRE » sont supprimés.

**Vérifications** :
- `valider.js` est vert et les portes sont inchangées. La zone `bassins#5` sort de la « dette des 8 u » (elle n'existe plus).
- **Test « Aquarium »** dans `scenarios.js`, qui couvre :
  - le gardien qui lance la partie, l'indicateur, les boutons masqués ;
  - le cycle du regard ;
  - aucune encre si l'on reste immobile, encre et fuite si l'on bouge ;
  - aucune prise quand il regarde, une manche de dos ;
  - l'échec à 3 encres (rien gagné, on peut retenter) et le chrono ;
  - une seule victoire par vague ;
  - les remises à zéro (sortie, mort, game over).
- **Pilote simulé** : chemin calculé sur les vrais solides de la salle, joystick réel, réaction 0,3 s. Il gagne 4 parties sur 4 en 27-33 s. Un joueur qui fonce sans s'arrêter perd.
- **Rendus réels** : `aquarium_salle`, `intro`, `dos`, `alerte`, `regarde`, `encre`, `victoire`.

**À tester sur iPhone** :
1. Le signal ❗ laisse-t-il assez de temps pour lâcher le joystick ? La tolérance est de 0,22 s après le regard, plus la durée du frisson (0,75 s, puis 0,42 s à la 5e manche).
2. Le joystick qui « dérape » au lâcher (une petite vitesse résiduelle) ne doit pas déclencher d'encre ; le seuil est à 0,9 u/s.
3. L'indicateur en haut ne gêne-t-il pas le score ou les messages ?

**Correctif après coup** (trouvé par la suite en tirage libre) : un joueur qui fonçait sans jamais s'arrêter pouvait gagner quand les bassins tirés étaient proches. Désormais Gaston **se retourne dès qu'il atterrit** sur un nouveau bassin, comme au vrai « 1, 2, 3, soleil » : on a 0,4 s pour s'arrêter, et celui qui court prend l'encre à chaque manche. Le test lance trois de ces joueurs, qui perdent tous. Dans le même commit, les bancs du chalutier sont tirés un peu plus au large (jamais contre la côte).

**Reste à améliorer** : Gaston qui change de bassin en douce quand on approche par le côté (une variante pour la 5e manche) ; des visiteurs qui crient « là ! » quand il saute.

### Refonte 3 — Laverie « Bulle Bleue » (commit `5439ffc`)

**Concept retravaillé.**
- **Promesse** : la machine 7 lave l'argent des Vipers. Bourrée de billets, elle se déséquilibre : tiens-la, sans réveiller leur guetteur.
- **Mécanique centrale** : une aiguille d'équilibre qui dérive, de plus en plus fort ; on la ramène au centre avec le joystick (◀ ▶).
- **Moment fort** : l'essorage des 10 dernières secondes, où tout s'emballe (le tambour tourne à fond, les poussées sont plus fortes et plus fréquentes).

**Avant** (`laverie_avant.png`) : payer 50 $, attendre 42 s sans rien faire, encaisser 420 à 760 $.

**Ce qui a changé** :
- **Un vrai mini-jeu de 36 s** :
  - le joueur est tenu devant la machine et la retient au joystick ;
  - dans le rouge, la machine **cogne** (« 💥 BOUM ! 1/3 ») ;
  - le guetteur des Vipers, affalé sur sa chaise au fond (💤), s'agite à chaque coup (« …hein ? », « Qu'est-ce que… ») ;
  - au 3e coup, il se réveille (« HÉ ! ») : alarme des Vipers, cycle perdu, 50 $ perdus.
- **Le gain dépend de la stabilité** : de 250 à 750 $ selon le temps passé dans le vert, plus 150 $ pour une **lessive parfaite** (aucun coup, au moins 85 % de vert).
  Le sac affiche sa valeur : « 💰 RÉCUPÉRER LE SAC — 667 $ ». Toujours 2 lavages par vague, et la Chaussette Solitaire reste dans le filtre après la première lessive.
- **Lisible** :
  - carte d'intro (« ◀▶ garde l'aiguille dans le vert », « dans le rouge, la machine cogne », « 3 coups et le guetteur se réveille », « plus c'est stable, plus ça paie ») ;
  - panneau en bas d'écran : le hublot où l'on voit les billets et la mousse tourner, la jauge en demi-cercle (rouge / vert / rouge), le temps restant, et le visage du guetteur (😴 → 😪 → 😠) avec ses 3 pastilles ;
  - boutons de combat masqués.
- **Retours** :
  - la machine tremble, penche du côté de l'aiguille et saute à chaque coup (secousse, vibration, bang grave) ;
  - mousse, battement du tambour qui accélère à l'essorage, « 🌀 ESSORAGE ! » ;
  - fin : « ✨ LESSIVE PARFAITE » ou « 🧺 CYCLE TERMINÉ » avec la stabilité en % et la valeur du sac, gerbe de billets.
- **Abandon** : quitter la salle en plein cycle l'abandonne (le linge reste aux Vipers). Avant, on pouvait sortir et revenir.

**Équilibrage mesuré** (pilote simulé, 5 cycles par profil) :

| Profil de joueur | Résultat |
|---|---|
| Contrôle fin au joystick (réaction 0,2 s) | 95-99 % de vert, aucun coup, environ 880 $ (parfait) |
| « Pouce » tout ou rien (réaction 0,25 s) | 75-80 %, aucun coup, environ 640 $ |
| « Pouce » lent (réaction 0,35 s) | environ 50 %, 1 ou 2 coups, environ 500 $ ; une fois raté |
| Ne rien faire | toujours raté (3 coups) |

**Vérifications** :
- `valider.js` est vert et les portes sont inchangées.
- **Test « Laverie »**, qui couvre :
  - le lancement, le joueur tenu à la machine ;
  - le joystick qui pousse l'aiguille ;
  - le coup dans le rouge ;
  - 3 coups = guetteur réveillé, alarme, rien gagné, boutons rendus ;
  - le pilote simulé, qui encaisse la valeur affichée ;
  - le joueur passif, qui perd ;
  - le plafond de 2 lavages par vague ;
  - les remises à zéro (sortie, mort, game over).
- Le test existant des plafonds par vague passe désormais par la vraie remise à zéro de la machine.

**À tester sur iPhone** :
1. La jauge se lit-elle d'un coup d'œil sous le pouce gauche ?
2. Le joystick analogique permet-il de doser, et pas seulement de taper à gauche ou à droite ?
3. Le gain moyen (500 à 750 $) semble-t-il juste ?

**Reste à améliorer** :
- le guetteur qui se lève et vient voir ;
- un son de tambour plus riche ;
- la machine qui se déplace vraiment de quelques centimètres sur le carrelage à chaque coup.

### Refonte 4 — Serre tropicale (commit `b311259`)

**Concept retravaillé.**
- **Promesse** : une nuit pour tenir la serre en vie, et voir fleurir l'Étoile de Los Reyes.
- **Mécanique centrale** : courir d'un pot à l'autre avec le bon outil. Les plantes réclament de l'eau (💧) ou un traitement contre les pucerons (🐛), chacune avec son compte à rebours. On ne porte qu'un outil à la fois : l'arrosoir de 4 doses, qui se remplit au bassin, ou le pulvérisateur, posé sur la table. Il faut donc choisir son trajet.
- **Moment fort** : la fin de la nuit sans une perte, quand l'Étoile éclot au-dessus du bassin.

**Avant** (`serre_avant.png`) : cueillir 3 plantes « à l'ombre », « près du bassin » ou « en hauteur » selon une consigne dont les critères ne se voyaient pas. Un trait blanc barrait l'écran.

**Ce qui a changé** :
- **60 secondes de nuit** lancées au tableau du jardinier :
  - les besoins arrivent de plus en plus vite, environ 19 sur la nuit ;
  - les pucerons oubliés gagnent le pot voisin (« 🐛 contagion ! ») ;
  - une plante oubliée **fane** (fleur brune, « FANÉE »), et 4 fanées font perdre la nuit.
- **Une seule action à la fois** : le bouton dit toujours quoi faire ici (« 💧 ARROSER », « 🐛 PULVÉRISER », « 💧 Arrosoir vide — remplis-le au bassin », « 🐛 Il faut le pulvérisateur (sur la table) », « 🧴 PRENDRE LE PULVÉRISATEUR », « 💧 PRENDRE L'ARROSOIR »). L'arrosoir se remplit tout seul au bord du bassin. Les boutons de combat sont masqués.
- **Lisible** :
  - au-dessus de chaque pot en demande, une grande icône (💧 ou 🐛) blanche, puis jaune, puis rouge et battante quand il reste moins de 3 s ;
  - des pucerons visibles sur la fleur ;
  - en haut, l'outil en main (💧💧💧◌ ou 🧴 PULVÉ), les plantes vivantes (🌱 11/12) et le chrono ;
  - une carte d'intro à quatre lignes.
- **Retours** : gouttes ou brume selon l'outil, la fleur qui gonfle quand on la soigne, « 💧 +1 », « 🐛 traité ».
- **Fin** :
  - sans perte : « 🌺 L'ÉTOILE DE LOS REYES FLEURIT ! », une grande fleur dorée qui s'ouvre et tourne au-dessus du bassin dans une pluie de lumière, la curiosité la première fois, 25 $ par soin et 200 $ de bonus ;
  - avec des pertes : « 🌿 LE JOUR SE LÈVE », 25 $ par soin, et un rappel que sans perte l'Étoile aurait fleuri ;
  - nuit perdue : rien.
  
  Une nuit par vague.
- **Décor** :
  - l'arrosoir posé sur la margelle et le pulvérisateur sur la table ;
  - le jardinier près de son tableau « LA NUIT DE LA FLORAISON » ;
  - deux feuilles à chaque tige.

**Choix faits** :
- La consigne du jour (ombre, bassin, hauteur) est supprimée.
- La curiosité s'obtient désormais par une nuit **sans perte**. Avant, c'était « trois bonnes plantes sans erreur ».
- **Deux bugs corrigés en route** :
  - le pot du milieu de l'étagère avait sa zone à 0,6 u de la SORTIE : on quittait la salle en voulant l'arroser. Sa zone est maintenant devant l'étagère, côté salle ;
  - le trait blanc vertical venait des arches de la verrière, tournées de 90° et vues par la tranche.

**Équilibrage mesuré** : un pilote « glouton » (le besoin le plus urgent d'abord, il va chercher le bon outil, chemin calculé sur les vrais obstacles) tient environ 7 nuits sur 8, dont des nuits parfaites, pour 325 à 675 $. Un joueur passif perd la serre.

**Vérifications** :
- `valider.js` est vert et les portes sont inchangées.
- **Test « Serre »**, qui couvre :
  - le lancement ;
  - arroser avec l'arrosoir, la dose consommée ;
  - les pucerons, impossibles sans le pulvérisateur, puis le pulvérisateur pris à la table et l'arrosoir repris au bassin ;
  - la contagion et la fanaison ;
  - la fin parfaite (gain exact, Étoile visible) ;
  - une nuit par vague ;
  - le pilote glouton (au moins 3 nuits sur 6) et le joueur passif ;
  - les remises à zéro (sortie, mort, game over).
- **Rendus réels** : `serre_salle`, `intro`, `besoins`, `etoile`.

**À tester sur iPhone** :
1. Les icônes de besoin se voient-elles bien de loin, et l'icône rouge urgente attire-t-elle l'œil ?
2. Le rythme : 60 s semblent-elles trop courtes, ou trop chargées ?
3. Prendre et changer d'outil se fait-il naturellement ?

**Reste à améliorer** :
- les arroseurs automatiques qu'on pourrait débloquer ;
- une musique de nuit ;
- des lucioles.

Note : dans une des suites complètes, le pilote glouton a eu deux nuits à 3 et 6 soins seulement (4 nuits tenues sur 6), ce qui ressemble plus à un pilote coincé dans un coin qu'à de la difficulté. Le test exige 3 nuits sur 6 et reste vert ; à regarder si un joueur se coince en vrai entre l'étagère et la cabane.

### Refonte 5 — Radio pirate Reyes FM (commit `7c52338`)

**Concept retravaillé.**
- **Promesse** : tenir l'antenne pirate de Los Reyes pendant que la police triangule le signal.
- **Mécanique centrale** : le doigt pilote l'aiguille d'un vrai tuner ; rester sur la bosse verte du signal fait monter les auditeurs et baisser la triangulation. À partir du 2e segment, un **brouilleur rouge** de la police rôde sur la bande, et s'y poser fait localiser le studio presque deux fois plus vite.
- **Moment fort** : « LE DIRECT », un signal étroit qui saute à mi-parcours, avec le brouilleur et les gyrophares de police qui clignotent derrière les vitres.

**Avant** (`radio_avant.png`) : une barre de 14 px avec une zone verte, un texte de 8 px et une jauge de triangulation. Aucune identité, et une victoire réduite à un toast.

**Ce qui a changé** :
- **Un tuner illustré** au-dessus de la zone du doigt :
  - coffret en bois, cadran crème gradué de 87 à 108, bosse verte du signal, bosse rouge du brouilleur qui clignote, aiguille rouge avec sa fréquence ;
  - le compteur d'**auditeurs** (👂 12 840) ;
  - une petite **carte de goniométrie** où trois lignes de police se resserrent sur le studio quand la triangulation monte (bleues, puis rouges au-delà de 70 %).
- **Trois segments nommés** : « LA MATINALE », « LE BROUILLEUR », « LE DIRECT », annoncés en grand. Le saut du signal est annoncé : « ⚡ LE SIGNAL SAUTE ! ».
- **Les appels d'auditeurs** s'affichent en grand dans le tuner pendant la pause (« 📞 ALLÔ, REYES FM ? »), au lieu d'un toast.
- **Lisible** : une carte d'intro, une piste « ◀ GLISSE LE DOIGT ▶ » en bas de l'écran (on ne savait pas où glisser), le bouton d'action et les boutons de combat masqués pendant l'émission.
- **Le studio vit** : les diodes de la console dansent avec le signal, les enceintes pulsent, et des gyrophares rouge et bleu clignotent aux fenêtres quand la police approche.
- **Fin** : « 📻 FIN D'ÉMISSION — 29 873 AUDITEURS », confettis. Les gains sont **inchangés** (120 $ par segment tenu, +150 $ les trois), tout comme le Micro Vintage (émission parfaite).

**Vérifications** :
- `valider.js` est vert et les portes sont inchangées.
- Les **37 anciens tests de la radio passent tels quels** : verrouillage, espacements, gains, appels, curiosité, plafond par vague, police, remises à zéro, horloges.
- **Nouveau test « Radio V2 »**, qui couvre :
  - les auditeurs ;
  - le brouilleur (triangulation ×1,7) ;
  - l'interface, et les boutons masqués puis rendus ;
  - le pilote au doigt avec 0,25 s de retard (3 segments tenus, environ 30 000 auditeurs) ;
  - le joueur passif, localisé par la police.
- **Rendus réels** : `radio_studio`, `intro`, `matinale`, `direct_brouilleur`, `appel`.

**À tester sur iPhone** :
1. Le doigt glissé dans la moitié basse pilote-t-il l'aiguille avec précision ? La piste est-elle assez visible ?
2. Le brouilleur se distingue-t-il bien du signal (rouge contre vert) ?
3. Le tuner reste-t-il lisible en plein écran ?

**Reste à améliorer** : un vrai jingle de radio synthétisé au début et à la fin, et répondre aux auditeurs (deux réponses au choix pendant la pause).

### Refonte 6 — Ciné-Palace (commit `3fbaf43`)

**Concept retravaillé.**
- **Promesse** : être le projectionniste de « GTRoyal I » le soir de la première, et ne jamais laisser la salle huer.
- **Mécanique centrale** : la même course entre les quatre postes (bobine, mise au point, son, lampe), mais **on voit enfin le film**. Chaque panne le dégrade d'une façon reconnaissable, et le public réagit.
- **Moment fort** : les 30 dernières secondes, quand les pannes s'enchaînent et que la salle commence à se vider.

**Avant** (`cine_avant.png`) : quatre petites jauges abstraites, des postes signalés par des panneaux, une réparation d'un appui. On ne voyait jamais le film. Et surtout, **ne rien faire « réussissait »** : 4 pannes × 15 % laissaient 40 % de satisfaction et 200 $.

**Ce qui a changé** :
- **L'écran de la salle**, en incrustation tout en haut :
  - le film (une poursuite de nuit dans Los Reyes, sous-titrée) ;
  - **bobine** en panne : l'image se fige et saute ;
  - **mise au point** : l'image se dédouble ;
  - **son** : les sous-titres se décalent et ne correspondent plus ;
  - **lampe** : l'image s'assombrit puis clignote ;
  - un bandeau rouge nomme les pannes en cours (« 🎞️ FILM ARRÊTÉ · 🔍 FLOU »).
- **Le public**, en bas de l'écran : il chahute, crie « BOUH ! » et « REMBOURSEZ ! », lance du pop-corn ; à la fin d'une bonne séance, il se lève : « 👏 BRAVO ! » et confettis.
- **Tableau de bord** sur l'écran : chrono, satisfaction (😀 😐 😡) et les quatre postes avec leur jauge (rouge clignotant en panne).
- **Perdable** : tant qu'un poste reste en panne, des spectateurs partent (−2,5 % de satisfaction par seconde et par poste). Un projectionniste passif fait désormais un **fiasco**.
- **Bug corrigé** : en séance, la zone du projecteur (4 u) masquait le poste « mise au point » voisin. Le bouton y disait « séance en cours » au lieu de RÉPARER, ce que le pilote simulé a mis au jour. Elle s'efface pendant la séance.
- **Entrée et sortie** : « 🎬 LES LUMIÈRES S'ÉTEIGNENT », carte d'intro (« l'écran te montre ce qui lâche », la légende des 4 pannes). L'écran reste 3 s à la fin, sur l'ovation ou le pop-corn. Le faisceau du projecteur baisse avec la lampe, et les boutons de combat sont masqués.

**Vérifications** :
- `valider.js` est vert et les portes sont inchangées.
- Les **31 anciens tests** du ciné passent tels quels.
- **Nouveau test « Ciné V2 »**, qui couvre :
  - l'écran, l'intro, l'ovation de 3 s et les boutons rendus ;
  - un pilote projectionniste (va réparer le poste le plus abîmé, chemin calculé), qui tient la séance ;
  - le joueur passif, qui fait un fiasco.
- **Rendus réels** : `cine_film`, `bobine`, `flou`, `son`, `lampe`, `ovation`.

**À tester sur iPhone** :
1. L'écran en haut est-il assez grand pour reconnaître les quatre pannes d'un coup d'œil ?
2. Le flou (image dédoublée) se voit-il bien à cette taille ?
3. Courir entre les postes reste-t-il lisible malgré l'écran ?

**Reste à améliorer** :
- de vraies réparations gestuelles par poste (rembobiner en maintenant, mise au point par un curseur à arrêter) ;
- une bande-son du film qui se décale vraiment avec le son.

### Où en est le chantier

**Six salles refaites en profondeur**, chacune dans son commit :

| # | Salle | Note avant | Ce qui la porte désormais |
|---|---|---|---|
| 1 | Chalutier | 11 | piloter un vrai bateau, pêche illustrée, le Vieux Roi |
| 2 | Aquarium | 17 | « 1, 2, 3, soleil » avec Gaston |
| 3 | Laverie | 16 | l'essorage : une aiguille à tenir au joystick |
| 4 | Serre | 17 | la nuit de la floraison : soins, outils, contagion |
| 5 | Radio | 18 | un vrai tuner, le brouilleur, les auditeurs |
| 6 | Ciné-Palace | 19 | voir le film se dégrader, le public qui réagit |

**Ce qui a été appliqué partout** (règle notée dans `CLAUDE.md`, « Grille de refonte ») :
- une carte d'intro à icônes ;
- une seule action contextuelle à la fois ;
- des boutons de combat masqués quand ils n'ont pas de sens ;
- un retour à chaque action ;
- une fin célébrée ;
- un décor où l'objet remplace le panneau-étiquette ;
- et surtout un **pilote simulé** pour chaque salle, qui prouve qu'elle se gagne avec un temps de réaction humain et qu'elle se perd en jouant mal ou en ne faisant rien.

Ces pilotes ont trouvé des défauts réels :
- un pot de la serre posé dans la SORTIE ;
- le projecteur du ciné qui masquait un poste ;
- un ciné qu'on « réussissait » sans rien faire ;
- un Gaston qu'on attrapait en fonçant sans jamais s'arrêter.

**Ordre des salles restantes** (de la plus faible à la meilleure, en ne gardant que les vrais mini-jeux), avec la piste envisagée pour chacune :
1. **Voyance (Madame Zohra)** : en faire un vrai jeu de cartes (tirer et retourner des cartes de tarot avec un enjeu, prédiction vérifiable dans la vague).
2. **Karaoké** : une vraie chanson avec des notes qui défilent (rythme), le public qui chante, une jauge d'ambiance.
3. **Bowling** : une boule qu'on lance au doigt (glisser pour l'effet), des quilles physiques qui tombent vraiment.
4. **Banque** : un mini-jeu de perçage du coffre (cadran à tourner) pendant que les vigiles approchent.
5. **Commissariat** : une infiltration courte vers la salle des preuves.
6. **Boutiques** (supérette, pharmacie, concessionnaire) : de vrais menus à choisir au lieu d'articles qui défilent un appui à la fois.
7. **Ensuite**, des retouches plutôt que des refontes :
   - musée (lisibilité des cônes de vue) ;
   - métro (la Bête visible, panneaux lisibles dans le noir) ;
   - Site 51 (expliquer les sas) ;
   - dépôt (choix du véhicule et du circuit en un seul écran) ;
   - arcade (des lots plus désirables).

**Points d'attention pour le playtest sur iPhone** : rassemblés dans les rubriques « À tester sur iPhone » de chaque refonte ci-dessus. En priorité :
- le dosage du joystick à la laverie ;
- le doigt sur le panneau de pêche du chalutier et sur la piste de la radio ;
- la lisibilité de l'écran du ciné en haut de l'écran.

---

## Chalutier V3 — la refonte visuelle (13 octobre, retour de playtest)

**Retour** : « on dirait le jeu d'avant, pas de nouveau style visuel, mal fait et peu immersif ; je ne vois rien qui défile, pas d'espadon ».
**Constat (capture en navigation réelle)** : il avait raison. La V2 avait changé la logique, pas le regard : caméra de dessus, le pont en bois remplissait 80 % de l'écran, la mer n'était qu'un fond bleu pointillé immobile à l'œil, le récif un caillou gris, l'espadon un ovoïde.

**Ce qui change** (logique et équilibrage inchangés) :
- caméra de poursuite derrière la poupe, tournée vers l'horizon — à quai comme en mer ; à la pêche, elle pivote vers la ligne ;
- ciel en dôme (dégradé, soleil qui tourne avec le cap, nuages qui dérivent, tempête sombre avec éclairs), côte de Los Reyes à l'horizon dans la direction du port ;
- mer en houle qui reflète le ciel et le soleil, écume, **sillage en V et vague d'étrave dessinés dans l'eau** selon la vitesse ;
- coque visible au-dessus de l'eau (bandes de flottaison), portique arrière, tangons, pavillon ; roulis et tangage ;
- **vrai espadon** (rostre, voile dorsale, queue en croissant) qui jaillit au bout de la ligne, gerbes et ronds dans l'eau ; sa voile fend l'eau dans la Fosse ;
- récifs en amas de rochers avec ressac, mouettes qui piquent sur les bancs, eau qui bout.

Captures : `captures/lot11/chalutier_v3_*.png` (`_avant` = la V2 telle que vue en jeu).

**Tests** : `valider.js` et `scenarios.js` verts (graine 20260731). En tirage libre (graine 1385855054), un échec « Portes : arcade 1.5 » — **déjà présent avant ce changement** (rejoué sur le commit précédent : même échec), à traiter à part.

**À tester sur iPhone** : fluidité (la mer fait une dizaine de sinus et deux bruits par pixel, le ciel un fbm à 4 octaves) ; lisibilité du joueur à la barre (plus petit à l'écran) ; la vue à quai pour marcher sur le pont.

**Les autres salles refaites** (aquarium, laverie, serre, radio, ciné) ont le même défaut de fond : nouvelle logique, même regard. Elles méritent la même passe visuelle, une par une.

## Aquarium V3 et Laverie V3 — la même passe visuelle (13 octobre)

**Aquarium** : la boîte grise dans le noir devient une galerie d'observation au fond de la mer — fond de sable traversé de reflets de lumière, rochers, coraux, algues qui ondulent, bancs de poissons, requin et raie manta autour de la galerie ; Gaston est un vrai poulpe à huit bras qui change de couleur (violet au repos, jaune au frisson, rouge quand il regarde). Captures : `captures/lot11/aquarium_v3_*.png`.

**Laverie** : laverie de nuit sous la pluie — rue mouillée où l'enseigne néon se reflète, carrelage noir et blanc lustré, hublots chromés où le linge tourne, voiture des Vipers devant la vitrine ; les étiquettes (LAVAGE, MACHINE 7...) sont retirées. Pendant l'essorage, la caméra se rapproche de la machine 7 (gyrophare, afficheur « 7 »). **Bug trouvé en rendu réel** : la machine 7 disparaissait pendant tout le cycle (hauteur NaN avant le premier coup) — corrigé et testé. Captures : `captures/lot11/laverie_v3_*.png`.

**Fiabilité des tests** : le test du chalutier pouvait échouer quand un banc de sardines était tiré trop près d'un banc à la canne (le jeu gardait la dernière position tirée après 40 essais : il garde maintenant la plus dégagée, et le test isole son banc). Le pilote de la serre perd parfois plus de 3 nuits sur 6 selon le tirage (vu une fois sur trois passages) : à surveiller.

## Serre V3 — la passe visuelle (13 octobre)

La boîte verte dans le noir devient une serre victorienne la nuit, au milieu du jardin botanique éclairé par la lune : pelouse, allées de gravier, haies, arbres, lanternes, lucioles ; dedans, des tomettes moussues où passent les ombres des feuilles, de grandes feuilles tropicales qui ondulent, un bassin avec des carpes koï et des nénuphars en fleur. Les étiquettes (LA NUIT DE LA FLORAISON, JARDINIER) sont retirées : le tableau est un chevalet. Captures : `captures/lot11/serre_v3_*.png`.

## Radio V3 — la passe visuelle (13 octobre)

Le studio devient une station pirate sur un toit, la nuit : antenne aux feux rouges, parabole, grande enseigne néon « REYES FM 107.7 », toits voisins et, en contrebas, la ville éclairée où roulent les voitures. Plus la police triangule, plus elle se montre : un hélicoptère tourne au-dessus du toit, son projecteur se rapproche de la console. Dedans : mousse acoustique, tapis, platine qui tourne, ON AIR en néon ; la caméra se rapproche de la console pendant l'émission. Étiquettes (CONSOLE, RACK, MICRO VINTAGE) retirées. Captures : `captures/lot11/radio_v3_*.png`.

## Ciné-Palace V3 — la passe visuelle (13 octobre)

La cabine de projection donne enfin sur la salle : derrière la vitre, des gradins de fauteuils rouges, le public qui bouge, se lève à l'ovation et s'agite à chaque panne, des rideaux et le grand écran qui passe le même film que le panneau (avec les mêmes pannes). Le faisceau du projecteur traverse la salle jusqu'à l'écran. Chaque poste se reconnaît à son objet (bobines qui tournent, banc d'optique, ampli à vu-mètres, lanterne qui clignote en panne) ; le hall a une moquette art déco, des affiches éclairées et une machine à pop-corn ; dehors, la marquise « CINÉ-PALACE » et ses ampoules. Étiquettes retirées. Captures : `captures/lot11/cine_v3_*.png`.

**Bilan de la passe visuelle** : les six salles refaites (chalutier, aquarium, laverie, serre, radio, ciné) ont maintenant un décor qui raconte le lieu, sans étiquettes, et chacune sort enfin du « vide noir » autour de la salle. Suites `valider.js` et `scenarios.js` vertes après chaque salle (graine 20260731). À tester sur iPhone : la fluidité (shaders de mer, de sol et de ciel), surtout au chalutier et à l'aquarium.

## Vue immersive et bascule de vue (13 octobre)

**Demande** : jouer en ville avec la vue du chalutier, et pouvoir revenir à la vue d'origine depuis un bouton à côté de la pause.

**Choix (validés avec le joueur avant de commencer)** :
- à pied, caméra inclinée vers l'horizon, qu'on oriente au doigt (glisser sur une zone libre, double-tap pour la remettre derrière soi) — elle ne tourne jamais seule, pour garder un combat lisible ;
- en véhicule, poursuite automatique derrière le véhicule ;
- bouton 🎥 à gauche de la pause : vue immersive ↔ vue classique (choix sauvegardé) ;
- le joystick suit l'écran (haut = là où regarde la caméra) ; en poursuite, ça donne « haut = tout droit, droite = tourner », sans zigzag (mesuré sur berline et moto) ;
- un immeuble qui cacherait le joueur fait relever la caméra ; ciel en dôme en ville ; on voit beaucoup plus loin.

Les salles gardent leur propre caméra. Captures : `captures/lot11/vue_*.png`.

**À tester sur iPhone** : la fluidité en ville (beaucoup plus de décor à l'écran), le geste de rotation au doigt, la sensation de conduite en poursuite. Défaut connu : la colonne jaune d'un objectif devient énorme quand on se tient dedans.

## Échelle de la ville et places garnies (13 octobre)

**Retour** : en vue immersive, le personnage paraît énorme à côté des bâtiments, et les grandes dalles vides rendent le monde vide et petit.
**Diagnostic** : personnage (1,8 u), voitures et rues étaient à la bonne échelle ; les immeubles étaient trop bas pour les façades qu'ils dessinaient (7 étages de ~1,4 u chacun).
**Fait** :
- étages de 3 u sur tous les immeubles (la texture se répète au lieu de s'étirer) et immeubles ×1,8 en hauteur, plafonnés à 38 u (les gratte-ciel existants restent tels quels) — la ville ne bouge pas, les portes sont identiques ;
- 329 ensembles posés au cœur des pâtés, selon le quartier : places à fontaine ou à statue, squares, kiosques, marchés, terrasses, aires de jeux, food trucks, pique-niques, stocks au port et dans la zone industrielle ; rien devant une porte, un garage ou un objectif.
**Non fait, volontairement** : la vitesse de marche (elle règle l'équilibre de tout le jeu) — à revoir après un essai sur iPhone si l'impression d'une ville trop petite persiste.
Captures : `captures/lot11/echelle_*.png`.

## Retours de la vue immersive (14 octobre)

- **Tremplins absurdes** : 4 tremplins retirés (les planches posées au milieu des rues, face aux immeubles) ; un garde-fou retire tout tremplin de la ville qui lance contre un bâtiment.
- **Boutons sur le joueur** : la caméra immersive cadre le joueur plus haut, au milieu de l'écran, au-dessus des boutons.
- **Bouton de vue** : pastille « 🎥 3D / 2D » bien visible à côté de la pause.
- **Le large** : on va presque trois fois plus loin en mer (430 u au lieu de 150) ; on y croise des récifs (solides : il faut les éviter), des voiliers au mouillage, des bancs de poissons qui sautent et que les mouettes piquent (ils jaillissent quand on les traverse en bateau), des tortues.
- **Balises** : chaque salle et chaque activité (courses, wakeboard, parachute, wingsuit, saut BASE, banderole, paillote, île au trésor, skatepark, jetpack) a une icône flottante visible de loin dans les deux vues, même derrière un immeuble ; les enseignes se lisent aussi de dos.

## Retours de playtest, 2e série (14 octobre)

- **Stands de nourriture** : chaque kiosque, food truck et chariot vend la spécialité de son quartier (hot-dog, tacos, beignets de crevettes…), qui rend des PV ; seulement blessé, payant, stand fermé un moment après une vente (pas de farming).
- **Armes** : un vrai modèle par arme (pistolet, silencieux, Uzi, PM, pompe, fusil d'assaut, sniper à lunette, lance-flammes, bazooka, désintégrateur, battes, couteau, sabre), en main du joueur et des ennemis.
- **Hauteur des véhicules** : bus, pompiers, ambulance, fourgon, camions et char à leur hauteur réelle ; les roues ne s'enfoncent plus et suivent la pente (assiette mesurée sur les 4 roues) ; le monster truck gravit la colline comme le 4x4.
- **Piscines** : plus de verdure posée dessus ni de scintillement. **Maisons et villas** à l'échelle du joueur.
- **Crique** : falaises abruptes et irrégulières (strates, bosses, corniches rocheuses) au lieu de grands blocs carrés.
- **Sommet du mont** : vélos, BMX et moto cross garés pour la descente.
- **Basket** jouable au court de Brooklyn : concours de tirs (jauge de puissance, 5 postes), prime une fois par vague.
- **Wakeboard** : sillage en écume (plus de traits), vue immersive derrière la planche.
- **Wingsuit** : nouvelle voilure, record de distance, combinaison « Faucon » à 500 m (plané plus long).
- **Apparitions en vue immersive** : véhicules et ennemis apparaissent loin et hors de vue.

Captures : `captures/lot11/wakeboard_ecume.png`, `basket_tir.png`, `sommet_velos.png`, `crique_falaises.png`, `vehicules_hauteurs.png`, `villa_proportions.png`.

## Vue immersive partout (14 octobre, 3e série)

- **Toutes les salles** passent en vue immersive (sauf le chalutier, qui a déjà sa caméra de poursuite vers le large) : caméra plus proche, qui reste entre les murs ; luminaires et enseignes qui passeraient entre la caméra et le joueur s'effacent. Le bouton 3D/2D reste disponible en salle.
- **Sensation de vitesse** en véhicule : caméra plus basse, champ qui s'ouvre avec la vitesse, traits de vitesse.
- **Avion à banderole** : plus lent, plus haut, banderole verticale lisible en vue immersive.
- **Sniper** : vraie lunette avec zoom (le laser reste en vue normale) — on maintient TIR, le joystick vise et règle la distance, on relâche pour tirer.
- **Bug corrigé (serre)** : soigner le pot du milieu en pleine nuit pouvait faire quitter la serre (sa zone touchait la SORTIE).

Captures : `captures/lot11/salles_immersives_1.png`, `salles_immersives_2.png`, `vitesse_vehicule.png`, `banderole_immersive.png`, `lunette_sniper.png`.

## 3e série de demandes (14 octobre) — premier lot

**Fait :**
- **Aéroport vivant** : aérogare de verre derrière l'enceinte (dépose-minute avec taxi et bus, comptoirs, sûreté, salle d'embarquement, café, tapis à bagages, tableaux des départs/arrivées), foule ; des long-courriers atterrissent depuis la mer, se garent aux passerelles et deviennent pilotables (on peut voler le gros avion), puis repartent ; hangars de l'aéroclub (« Pélican ») et de l'aviation d'affaires (jet « Albatros ») ; le voltige dans un petit hangar, immobile.
- **Hélicoptères** : « Écureuil » sur le toit de la Tour Los Reyes ; **hélico-grue « Titan »** au chantier avec un **aimant** qui accroche, transporte et lâche les véhicules ; **hélico VIP** du méga-yacht, qui reste posé quand le yacht navigue.
- **Six planques** à acheter, chacune avec sa spécificité et sa tenue : caravane du désert (atelier), penthouse de la tour (plongeoir BASE), cabanon de plage (punch), chalet retranché du mont (armurerie), voilier amarré (la police perd ta trace), taudis industriel (grenades).
- **Correctifs** : les ennemis ne rentrent plus dans les véhicules (le char est un mur) ; les vedettes virent (demi-tour en avançant) ; en bateau on percute surfeurs, kayaks (qu'on peut emprunter), nageurs ; un nageur ne tire plus ; les PNJ tombent de façons variées sans traverser le sol, projetés plus fort par les véhicules ; piétons qui apparaissent loin ; cyclistes sur de vrais vélos, renversables ; chiens percutables avec un message drôle ; dauphins modélisés qui arrivent et repartent.
- **Véhicules** : vrai fourgon, char massif, bulldozer qui pousse vraiment, méga-yacht majestueux.
- **Wakeboard** : posture de profil, pieds sur la planche, saut selon l'élan, OLLIE avant la vague = gros saut.
- **Vue immersive en salles**, sensation de vitesse, banderole, lunette du sniper (lot précédent).

Captures : `captures/lot11/aeroport_*.png`, `helico_*.png`, `planques.png`, `fourgon_char.png`, `megayacht_vip.png`, `cycliste_dauphin.png`, `wakeboard_saut.png`.

## 3e série — lot 2 (14 octobre)

- **Armes** : AA-12 (pompe automatique), revolver Magnum, arbalète, minigun ; **armurerie** avec les armes exposées en 3D au mur (on les achète en s'approchant) et un **établi** où l'arme équipée tourne en grand : balles explosives, balles incendiaires, chargeur, silencieux, visée laser, **akimbo** (double pistolet / double Uzi), choc électrique, finitions or et camo ; **gilets pare-balles** tactique et lourd, visibles sur le joueur ; le **lance-flammes** projette un vrai jet et enflamme (les gens courent en brûlant).
- **Course en mer** : flèche GPS vers la porte suivante, trois embarcations rivales du même type, classement en direct, prime majorée si tu gagnes.
- **Hélicoptères** : police restylée (livrée, projecteur), hélico de combat de l'armée à 6 étoiles, et sa version pilotable armée à la base militaire.
- **Dégradations** des véhicules en trois étapes avant l'explosion (pare-brise fendu, tôles enfoncées, capot soulevé…).
- 4 nouveaux pictogrammes d'armes.

Captures : `captures/lot11/armurerie_*.png`, `course_mer_rivales.png`, `helicos_police_armee.png`, `degradations.png`, `icones_armes.png`.

## 3e série — lot 3 (14 octobre)

- **Boutiques de style** : chic (centre), surf shop (plage), street wear (néon), barbier (Brooklyn), tatoueur ; essayage gratuit en cabine, achat pièce par pièce, tenues dépareillées par-dessus la tenue de la penderie.
- **Manèges** : grand huit à l'ouest de la marina (vue subjective au premier rang, montée à la chaîne, chute), tour de grande roue sur la jetée.
- **Toits vivants** : 94 toits aménagés (piscines, bars en terrasse, terrains grillagés, jardins, hélipads avec 4 vrais hélicos, châteaux d'eau, panneaux solaires, flèches et pyramides sur les plus hautes tours) et 10 coffres à fouiller une fois par vague (jamais vides). Sur un toit, le bouton ne propose plus la porte de la rue en dessous.
- **Aéroport, suite** : 3e hangar (fret) avec un cargo bimoteur pilotable ; 4 véhicules de piste pilotables (tracteur de repoussage, camion-citerne qui explose en grand, passerelle à escalier, tracteur à bagages) ; **jeu de la tour de contrôle** (radar plein écran : autoriser les atterrissages un par un, carburant, urgences ; prime une fois par vague).
- **Kayaks** : vraie coque effilée et pagaie double animée (fini la boîte).
- **Performance** : la résolution des collisions entre véhicules coûtait 88 ms par image avec ~120 véhicules (garés compris) ; 11 ms désormais.
- **Mémoire** : la faune de l'île laissait 47 géométries et ~1,5 Mo à chaque partie (et des animaux figés dans la scène) ; les entités retirées libèrent maintenant leurs géométries. La suite de tests complète va de nouveau au bout.

Captures : `captures/lot11/boutique_*.png`, `grand_huit_*.png`, `toit_*.png`, `aeroport_vehicules_piste.png`, `tour_de_controle.png`, `kayaks.png`.

## 3e série — lot 4 (14 octobre)

- **Motos réalistes** : routière, sportive carénée, cross à crampons, chopper « Fantôme » ; le pilote est assis sur la selle de chaque modèle ; au garage, l'échappement posé remplace celui d'origine, et toutes les pièces ont été recalées sur les nouveaux modèles.
- **Vie du Mont Reyes** : bouquetins qui broutent et détalent (les percuter ou les abattre coûte du karma), un ours qui charge et mord, aigles qui tournent au-dessus du sommet, marmottes qui plongent dans leur terrier.

Captures : `captures/lot11/motos.png`, `motos_pilote.png`, `motos_tuning.png`, `mont_faune.png`.

## 3e série — lot 5 (14 octobre)

- **Badlands** : deux chaînes de mesas en zigzag, de 7 à 20 u de haut, de part et d'autre de la ligne des mesas, reliées par des tremplins latéraux ; nouvelle course « BADLANDS — LIGNE EST » (finie par le pilote simulé en 7,6 s en moto cross, 12,3 s en buggy, pour 20 s).
- **Tenues des mini-jeux, avec capacités** : maillot « Ballers » (basket : grenades 35 % plus loin), gilet d'aiguilleur (tour de contrôle : avions et hélicos 15 % plus rapides), « Pro Rider » (supercross : figures +30 %), skateur (Bowl Jam : bunny hop plus haut), combinaison de wakeboard (nage +30 %), tenue « Badlands » (dégâts de chute ÷2).
- **Neuf nouveaux thèmes de défis** sur les nouveautés : coffres des toits, avions posés, manèges, boutiques, planques, fauves, aimant du Titan, tenues de mini-jeux, modifications d'armes.
- **Façades variées** : murs-rideaux et Art déco au centre, balcons et jardinières en résidentiel, stores et climatiseurs au commerce, échelles et conduites en zone industrielle.

Captures : `captures/lot11/badlands.png`, `facades.png` (avant : `facades_avant.png`).

## Cascades et volcan (15 octobre)

- **Grande cascade du Pic du Vertige** : ruisseau sur le plateau, chute de 89 u qui s'arque en tombant, écume, brume, arc-en-ciel le jour, rochers et fougères ; au pied, un **bassin où l'on nage et où l'on peut plonger** sans se blesser.
- **Cascade de la crique** : de la falaise de 17 u dans la baie.
- **Volcan de l'île aux trésors** : cratère et lac de lave, coulée jusqu'à la mer (vapeur à l'arrivée), panache de fumée, braises. La lave brûle à pied et abîme les véhicules ; les animaux l'évitent ; elle passe loin des trous à creuser et du camp.

Captures : `captures/lot11/cascades.png`, `volcan.png`.

## Échelle, aéroport, PNJ à l'eau (15 octobre)

- **Hélicoptères à l'échelle** : cabines agrandies (3,9 à 4,6 u de haut : un personnage tient debout dessous), rotor ramené à un diamètre réaliste (Écureuil : 10,7 u) ; vaut aussi pour les hélicos de police et de l'armée.
- **Yacht privé « Impérial »** refait : 22 m, coque haute, salon au pare-brise incliné, flybridge avec hardtop et arceau radar, bains de soleil, plage arrière ; on pilote debout sur le flybridge.
- **Aéroport encore plus vivant** : train de bagages, camion-citerne, bus de piste et voiture FOLLOW ME qui circulent (ils s'arrêtent devant toi, klaxonnent, se volent) ; placeurs qui guident l'avion qui arrive ; bagagistes au tapis chargeur ; mécaniciens ; avion de tourisme en tour de piste ; Écureuil autour de la tour ; rampe d'approche en chenillard la nuit ; file de taxis, voyageurs avec leurs valises, annonces dans le hall.
- **PNJ à l'eau** : un ennemi ou un passant jeté à l'eau nage maintenant (allongé, crawl) jusqu'à la rive la plus proche — avant, il marchait debout dans l'eau, toujours vers le nord.
- **Test de la serre** fiabilisé (il dépendait de l'état laissé par les autres tests).

Captures : `captures/lot11/echelle_helicos_yacht.png`, `yacht_prive.png`, `aeroport_vie.png`, `pnj_nage.png`.

## Los Reyes Hills (15 octobre)

Le quartier des villas, tout droit sur la grille, est remplacé par une colline à la Beverly Hills.

- **Reyes Hills Drive** : route en lacets qui monte de l'entrée (arche « LOS REYES HILLS », concession REYES MOTORS et garage déplacés là) jusqu'au sommet, à 30 u, en cinq épingles larges ; pente douce (20 % au plus), trottoirs, palmiers, réverbères, plaques de rue. **Sunset Crest** la rejoint depuis l'est. Elle se monte au joystick en voiture de ville (38 s) comme à moto (34 s).
- **15 villas différentes** des deux côtés des lacets : trois tailles (petite, moyenne, grande), quatre styles (moderne à toit-terrasse, méditerranéenne à tuiles et balcon, contemporaine sombre aux grandes baies, hacienda en L), haies, allée, portail, palmiers.
- **De vraies piscines, en hauteur** : on y nage, on y plonge depuis le toit sans se blesser, une voiture qui y roule s'y noie. Éclairées la nuit.
- **La planque devient le manoir du sommet** (l'existante, reprise) : piscine à débordement côté vue, terrasse en teck, transats, garage à trois portes.
- **REYES HILLS DOWNHILL** : descente chronométrée du sommet à l'entrée (45 s), voiture de sport et moto garées au départ ; ~33 s en pilotant proprement.
- **Le quartier vit** : voitures de sport qui montent et descendent les lacets, voitures de luxe dans les allées, gardes de la Krasnaya Brigada devant la plus grande villa, joggeurs, jardiniers qui tondent, arroseurs automatiques.
- Le trafic de la ville n'entre pas dans la colline (demi-tour au bord) ; le reste de la ville ne bouge pas (portes vérifiées identiques).

Captures : `captures/lot11/hills_vue_ensemble.png`, `hills_villas.png`.

## Los Reyes Hills, suite : villas différentes, vie du quartier, voitures réalistes (15 octobre)

- **Quinze styles de villas, jamais deux pareilles** : californienne des années 50 (toit papillon, bardage, piscine ronde), provençale (pierre, volets colorés, pergola, oliviers, cyprès, lavande), toscane (tour), Hamptons (bardeaux, lucarnes, clôture blanche), pueblo, Hollywood Regency, japonaise, Tudor, néo-classique (colonnes, fronton), brutaliste, hacienda, craftsman, moderne, balinaise, contemporaine. Piscines rectangulaires, rondes ou couloirs de nage. Trois grandes villas, trois moyennes, six petites.
- **Terrasses** : murs de soutènement en pierre qui suivent la pente, en gradins plantés quand ils sont hauts.
- **La vie** : panneau « LOS REYES » façon Hollywood au sommet (éclairé la nuit), guérite et barrière de résidence, massifs fleuris dans les épingles ; promeneurs (couples, chiens, poussettes, retour des courses), bronzeurs, baigneurs, barbecues entre amis, lavage de voiture ; cinq voitures de luxe dans les lacets.
- **Voitures réalistes** : silhouettes profilées (capot, pare-brise, pavillon, malle, passages de roue), vitrage teinté, optiques, calandres, jantes, rétroviseurs, plaques, échappements — citadine, berline, taxi, police, berline Viper, Rafale, Éclipse, Mirage, Baronne. **Quatre nouveaux modèles** : limousine « Majesté », SUV « Sierra », cabriolet « Azur », hypercar « Zénith », en vente chez REYES MOTORS.
- **Corrigés en route** : le lacet du sommet débordait au-dessus de la rue de la ville ; les véhicules de la descente et des voitures garées au hasard bloquaient la route de la colline.

Captures : `captures/lot11/villas_styles.png`, `hills_vie.png`, `voitures_avant.png`, `voitures_arriere.png`, `voitures_en_ville.png`.

## Retours de playtest du 16 octobre

- **Véhicules** : taxi, police et Rafale rendus à leur ancien modèle ; berlines au capot plat ; nouvelle Charger « Taureau » ; pick-up façon Raptor (benne, élargisseurs, feux orange) ; 4x4 et voitures de luxe rares mais trouvables ; conducteur visible en cabriolet ; personnages un peu plus petits ; voitures garées près du portail des villas.
- **Conduite** : l'avion se pose en tenant FREIN (arrondi automatique) et s'arrête joystick lâché ; le vélo monte les rampes du skatepark ; routes de la colline sans paroi (Sunset Crest, trop raide, retirée) ; caméra de poursuite orientable au second doigt, qui revient derrière et laisse voir le drift.
- **Monde** : chantier rebâti — immeuble « Los Reyes Tower » en construction, praticable à pied par des rampes jusqu'au 6e niveau, échafaudage, grue, aire dédiée à l'hélico-grue Titan (restylé façon Skycrane, aimant enfin utilisable) ; caravane Airstream en plein désert ; chalet d'altitude dans les sapins au sommet du Mont Reyes ; bords de la colline en vrai mur de soutènement.
- **PNJ** : les figurants de l'aéroport, de la colline et du chantier se renversent, se tirent, et la panique se propage ; dans les salles, un figurant touché tombe puis se relève.

Captures : `captures/lot11/voitures_16oct.png`, `chantier_planques.png`.

## Retours de playtest du 17 octobre

- **Tir en relief** : sur la colline et la montagne, toutes les hauteurs de tir et de touche partent du sol de chacun — on touche et on est touché.
- **Conducteurs visibles** (PNJ au volant, joueur dans le 4x4 et le cabriolet), jeep militaire à l'échelle avec affût, ours qui ne reste plus figé en ville, caméra plus lointaine en soucoupe, engins du chantier chacun à sa place (Titan hors de la grue, bulldozer hors des panneaux).
- **Fort Reyes** : entrée monumentale, place d'armes vivante (drapeaux, section au pas, pompes), parc des véhicules à places marquées, héliport avec le Vautour posé dessus ; s'engager à la guérite = visite libre ; tirer dans la base = alerte et les soldats prennent les armes ; **parcours du combattant** (7 portes, 4 cibles, 25 s) qui débloque le treillis.
- **Los Reyes Hills** : **BIG JUMP** au bord de la falaise (piste d'élan, lèvre, réception de cascade dans la rue 30 u plus bas, record et prime) ; **héliport privé du manoir** (choix et achat de l'hélico) ; collines dorées de Californie au lieu du tapis vert, accotements de gravier au bord irrégulier.
- **Le ciel se percute** : dirigeable qui survole le relief et les tours ; dirigeable et avions de décor percutables (on s'écrase avec), abattables, de retour à la vague suivante.
- **Boutiques de style en intérieur** : une vraie boutique par enseigne (portants, mannequins, cabine à miroir ; fauteuils du barbier, table du tatoueur), à l'abri des tirs.
- **Tir à la première personne** : **ball-trap du ranch « Coyote Loco »** dans le désert (plateaux, poulets en caoutchouc, nains de jardin, pastèques, télés, WC… jamais la colombe de Mamie) qui débloque une tenue de cow-boy ; **stand de tir** de l'armurerie pour essayer n'importe quelle arme gratuitement.
- **Armurerie V2** : salle agrandie où l'on se promène, armes rangées par familles, gilets sur mannequins, établi à plateau tournant — aperçu des modifications avant achat (or, camouflage, arme jumelle en akimbo…), l'arme se retourne au doigt.
- **Parcs** : stade du parc (match à cinq contre cinq qui se joue tout seul, on peut taper dans le ballon et marquer), complexe sportif (tennis, ping-pong, street workout).
- **Surprises sur les toits** : tyrolienne entre deux toits, trampolines, pigeonniers, murs à taguer, fêtes de DJ.
- **Carte** : fond détaillé (immeubles, eau, stade, base) en haute résolution, filtre « Activités » avec toutes les activités en plein air (et leurs balises).
- **Mont Reyes** moins vert (herbe sèche, maquis, pinèdes, roche, neige).
- **Catalogue vivant** (`catalogue.html`, par le serveur local) : véhicules, armes, modifications, tuning, tenues, boutiques, villas, PNJ, animaux, salles, activités, curiosités — lu en direct dans le jeu, vignettes faites avec les fonctions du jeu, journal des améliorations tiré de CLAUDE.md.
- **Corrigés en route** : un halo de porte créé trop tôt décalait tout le mobilier (une statue venait se poser devant une cible) ; un commentaire `//` avalait la fin d'une ligne (les lanceurs du ball-trap avaient disparu) ; la recherche du terrain du ball-trap coûtait 1,4 s au chargement.
- **Point d'attention** : la ville et son décor mettent ~25 s à se construire en headless sur ce PC (déjà avant ce lot) ; à mesurer sur iPhone.

Captures : `captures/lot11/base_17oct.png`, `hills_17oct.png`, `boutiques_balltrap.png`, `fps_cabine.png`, `armurerie_v2.png`, `stand_tir.png`, `sports.png`, `carte_17oct.png`, `catalogue_*.png`, `toits_mont.png`.

## Retours du 18 octobre

- **Armureries** : les deux marqueurs « A » de la carte font entrer dans la vraie salle (avant : l'ancienne page en liste, qui passait devant la porte) ; l'armurerie sud mène à la même salle et l'on ressort devant elle ; un seul nom, « Armurerie ».
- **Ball-trap** : on choisit son arme au départ (le fusil de Papy Earl est prêté ; une arme plus difficile rapporte plus de points) ; le bouton TIR montre l'arme du mini-jeu et son chargeur.
- **Concession REYES MOTORS** : un vrai showroom vitré (voitures sur podiums tournants, esplanade d'exposition, totem, fanions) à la place de l'immeuble de bureaux.
- **Skate** : nouveau véhicule ; ollie et manual, kickflip, 360 shove-it, tre flip — seule la planche tourne, le skateur reste debout. Skates, BMX et vélos garés aux deux skateparks à chaque partie.
- **Arène de derby** (désert du sud-est, au-dessus de la plage) : murs de pneus, portail, tribunes et public, tableau d'affichage, éclairage de nuit, stand. Trois voitures de derby (break, citadine, pick-up) habillées selon quatre améliorations achetées au stand (bélier, blindage, moteur, pneus). Cinq IA qui chargent, reculent et rechargent ; les voitures finissent en épaves, jamais en explosion. Le dernier qui roule gagne ; au temps, le plus de dégâts infligés. Prime une fois par vague, combinaison « Casse-cou », défis. Simulé : un pilote au joystick gagne environ 2 matchs sur 5 au premier niveau, un joueur passif perd toujours.
- **Trafic** : plus de voitures qui tremblent et s'encastrent dans les bouchons (la séparation des véhicules qui se chevauchent est maintenant proportionnelle au chevauchement ; mesuré : 968 inversions de mouvement en 90 s sur un point avant, 33 après) ; plus de tas de voitures immobiles au bord de Los Reyes Hills.
- **Catalogue** : `ouvrir-catalogue.bat` lance le serveur local et ouvre la page (un double-clic sur `catalogue.html` ne marche pas).
- **Corrigés en route** : le modèle du skate ne gardait pas ses données (la figure faisait basculer tout le véhicule) ; un commentaire `//` avalait le chrono du tableau d'affichage ; le test des géométries de l'aéroport dépendait du tirage (il rejoue maintenant le même tirage à chaque partie) ; le robot du test du Dépôt de bus restait coincé contre le bus en travers de La Boucle (obstacle voulu) : il recule et contourne désormais, comme un joueur.

Captures : `captures/lot11/skate_18oct.png`, `derby_arene.png`, `derby_jeu_concession.png`, `derby_menu.png`.

## Armes, mains et cibles du stand (18 octobre)

- **Armes** : treize armes à feu remodelées en pièces (culasse striée, pontet évidé, poignée quadrillée, rails, lunettes, chargeurs courbes, crosses en bois veiné), en métal, polymère et bois ; même repère qu'avant (les modifications de l'établi se posent toujours au bon endroit), visibles aussi en main en ville.
- **En vue à la première personne** (stand de tir, ball-trap) : deux bras gantés tiennent l'arme (pistolet à deux mains, main gauche sous le garde-main des fusils), manches à la couleur de la tenue ; recul, culasse qui recule, flamme de bouche, douilles éjectées, l'arme qui plonge au rechargement.
- **Cibles du stand** : vrais cartons de tir à zones (tête ×2, centre ×1,5, corps, bord), civils « NE PAS TIRER », plaques d'acier qui sonnent ; elles se lèvent, tombent quand on les touche (impact visible), certaines roulent sur un rail ; plus grandes et plus proches ; hall mieux éclairé.

Captures : `captures/lot11/armes_v2_galerie.png`, `armes_v2_en_main.png`, `stand_tir_v2.png`.



## Nuit de revue globale — 16 octobre 2026

> Branche `nuit-revue-globale` (depuis `decor-ville`, commit `60680a2`). Rien n'est
> fusionné. Date réelle lue par `date` : **vendredi 16 octobre 2026** — les libellés
> « 16, 17, 18 octobre » du CLAUDE.md et des sections précédentes de ce rapport sont
> en avance sur le calendrier (ils ont été écrits les 15 et 16 octobre au plus tard) ;
> ils sont laissés tels quels, mais ne servent pas de repère.
> Partie 1 : `rapport_nuit/STRATEGIE.md` (commit `e7fe29a`). Partie 2 : ci-dessous,
> mis à jour en continu.

### Résumé

(à écrire en fin de nuit)

### Mesures avant / après

Protocole (`scratchpad/phase0.js`, Chrome headless sur ce PC, sans GPU — les temps de
RENDU ne sont pas représentatifs d'un iPhone, les temps de LOGIQUE le sont à un
facteur près) : ville construite, partie lancée, 60 s simulées à 30 i/s en trois
points (centre : `POIS.place` ; colline : centre de `HILLS` ; large : `MER+60`),
coût de la logique par image (`majEnnemis`, `majPietons`, `majFigurants`,
`majVehicules`, `majDebris`, `majMobilier`, `majCascades`, `majAeroVie`,
`majVieHills`, `majMerV2`), rendu une image sur deux, puis trois parties
successives pour la mémoire.

| Mesure | Avant (60680a2) | Après |
|---|---|---|
| `index.html` | 2 663 Ko | |
| De la navigation au premier `evaluate` (ville construite), headless | ~30 s (`performance.now()` = 30,5 s ; 37,7 s avec le lancement du navigateur) | |
| Premier rendu, centre, vue classique | 119 draw calls, 56 886 triangles, 118 géométries, 36 textures | |
| Premier rendu, centre, vue immersive | 689 draw calls, 82 116 triangles, 363 géométries, 62 textures | |
| Logique par image, centre (208 véhicules, 22 piétons) | **48,7 ms** — `majPietons` 32,1, `majVehicules` 15,6, `majTrafic` 9,7 (compté dans `majVehicules`) | |
| Logique par image, colline (181 véhicules) | 31,4 ms — `majPietons` 24,8, `majVehicules` 5,7 | |
| Logique par image, large (180 véhicules) | 10,7 ms — `majPietons` 5,5, `majVehicules` 4,8 | |
| Rendu par image (headless, non représentatif) | 55 / 60 / 85 ms | |
| Mémoire après 3 parties | géométries 1 784 → 1 781 → 1 859 ; textures 153 → 156 → 159 ; tas JS 398 → 171 → 208 Mo | |

Première lecture : **`majPietons` coûte 25 à 32 ms par image en ville pour 22
piétons**. Micro-mesure (`scratchpad/dbg_pietons.js`) : `vehiculeBloquant` 0,35 ms
par appel et `degageDeVehicule` 0,36 ms (il appelle le premier) — chaque piéton en
fait trois par image, soit ~1 ms par piéton : la fonction parcourt les 180 à 208
véhicules avec deux sinus/cosinus et six lectures de `o.def.*` (accès mégamorphes)
par véhicule, sans rejet par la distance. `solY` : 0,07 ms par appel. Tout le
reste des helpers du piéton est négligeable (`estEau` 0,003 ms, `solidAt`
0,004 ms). Le rendu immersif fait 5,8 fois plus de draw calls que la vue classique.

Suite de référence : `node valider.js` vert ; `node scenarios.js` (graine 20260731)
**757 vérifications vertes, aucune sautée** (`suite_lot7b.log`, avant la création de
la branche) ; `SEED=random` ×3 : en cours (résultats plus bas).

### Carte du fichier

Régénérée au commit `60680a2` (lot 7) : 47 bandeaux, 54 ancres fines recalées,
« Relevé du 18 octobre — 35 778 lignes » (libellé daté comme les autres : à lire
« relevé du 16 octobre au matin »). Rien à corriger de plus cette nuit.

### Plan de la nuit

Six audits en lecture seule (A conventions, B robustesse, C performance, D HUD,
E jouabilité, F textes ; rapports bruts dans le scratchpad de la session), fusionnés
et filtrés par la section 8 de STRATEGIE.md. Ordre d'exécution : plantages et NaN →
état qui survit → farming et paiements → performance (chargement puis tick) → HUD
portrait → zones et règle des 8 u → pilotes manquants → textes.

**Ce que je fais (dans cet ordre)**

1. Plantages (B, A) : `el('grenN')` sans garde dans `ramasser` et dans la carte
   « Poche à grenades » (au volant d'un deux-roues, exception et écran de bonus
   figé) ; filet `try` autour du tick avec rendu garanti et compteur d'erreurs ;
   `#errBox` créé à la volée par `window.onerror` (il n'existe pas) ; `sauveMeta`
   qui retente 60 fois par seconde en cas d'échec ; copie de secours d'une
   sauvegarde illisible ; `fusionMeta` et `null` (dans les deux sens : `stats:null`
   plante `startRun`, `garage:null` empêche la migration de l'ancien achat) ;
   création du `WebGLRenderer` et perte de contexte ; reprise de l'audio iOS sur
   `pointerup` / `visibilitychange` ; garde NaN de `SFX.choc`.
2. État qui survit (A, E) : braquages (`caisse`, `coffre`, `casier`, `preuves`)
   remis à zéro à chaque partie — la règle « réinitialiser l'état des mini-jeux
   au game over » tranche ce que PLAYTEST.md laissait ouvert ; `s.litArme`
   (CONFIRMER en pleine vague lançait `lancerVague`) ; `MET2.vague` ; `SURPRISES`
   `s.vague` ; `BT.partie` ; `mourir` arrête le sport, le sandwich, le karaoké, le
   bowling et le casse du musée (une pièce était volée et inscrite dans `META`
   deux secondes après la mort) ; `setTimeout` de `mourir` annulé par `startRun`
   (il tombait au milieu du test suivant) ; véhicules du stand du Dépôt après un
   game over (à confirmer).
3. Boucle et paiements (A, E, économie) : la mission `purge` ne comptait que deux
   gangs sur quatre ; garde d'entrée propre dans les douze fonctions de paiement
   qui n'en ont pas ; `cashRun` crédité partout ; `FOUILLE.t` et les renforts
   d'alarme sur `dtJeu` ; chrono du remorquage sur `dtJeu`.
4. Performance (C, Phase 0), mesurée avant/après, image identique : rejet par la
   distance dans `vehiculeBloquant` (23 ms par image au centre) ; sprites à
   opacité 0 masqués (phares, lampadaires) ; DOM par image via `hudT/hudW/hudD`
   (`majVagues`, `majMissions`, `pointerVersCible`, jauges) ; bug du `else` de
   `shWrap` ; filet « qualité auto » réécrit par `jourNuit` ; `pow(x,2.0)` → `x*x`
   dans le shader des sols (NaN possible sous Metal) ; branches sur les facteurs
   nuls du shader de la mer ; véhicules garés retirés de la scène au-delà du
   brouillard (vue classique : le brouillard est opaque) ; chargement :
   `renderer.compile`, minimap statique différée, `calculerHills` à clé entière,
   `fusionnerDecor` en une passe, écran « Chargement… » avec JOUER inactif avant la
   fin — sans changer l'ordre des `mk*`.
5. HUD portrait (D) : `.screen` au-dessus des panneaux (pause et mort couverts par
   l'établi, la boutique, le derby…) ; QUITTER et la croix masqués par l'écran des
   bornes ; `#viseeZone` qui bloque QUITTER aux canards ; jauges VÉHICULE et
   CARBURANT sous GRENADE ; `#btnAction` sur DÉCOLLER et sur le tir au volant ;
   lunette du sniper qui noircit le HUD ; cartes de bonus validées au `pointerdown`
   sans délai ; `#missionTxt` sous la minimap ; pastille des défis sur le coin de
   Pause.
6. Pilotes manquants, cœur seulement (E) : missions courtes (aucun test), métiers
   taxi / ambulance / pompier au joystick si le temps le permet.
7. Textes (F), ce que le joueur lit en premier : aide `#help` (sniper « à la
   marina », unité de vitesse, « farme », conflit de la touche A, G et F absents),
   toast de l'avion de voltige (faux), toasts de niveau générés depuis `ARMES`,
   défis « 4 curiosités », « / 7 », « quartier résidentiel », bunker « bientôt »,
   deux « Propriétaire », libellés de quartier du tableau de la ville, indice de
   la serre, anglicismes, « ... » → « … », message de chargement du moteur 3D.
8. Tests rendus déterministes (E) : pilotes sans graine (aquarium, laverie,
   radio, ciné, chalutier) ; test sauté sans `saute()` (taxi fragile) ; REPLIS
   construit depuis `INTDEFS`.

**Ce que je ne fais pas, et pourquoi**

- Rien n'est retiré, aucun contenu neuf (règle de la nuit).
- Salles et activités « risque d'être coupé » (STRATEGIE §8 : supérette, banque,
  commissariat, voyance, casino, club, karaoké, bowling, sandwich, sport, métro,
  pharmacie, tour, musée, Site 51 ; tour de contrôle, manèges, surprises, métiers
  dépanneuse et police, mission `course`, stand de tir ; OVNI, véhicules de piste)
  : correctifs « quoi qu'il arrive » seulement. Leur polissage (horloges `dt` des
  anciens mini-jeux, pilotes du casino, du sandwich, du musée, règle des 8 u,
  panneaux au milieu de l'écran) est listé plus bas, avec l'estimation.
- Décisions de design laissées au matin (« À trancher ») : le farming
  « Abandonner → Rejouer » (tous les plafonds par vague repartent à zéro et
  l'argent ne se perd jamais — les tests actuels FIGENT ce comportement) ; le
  plafond des missions courtes ; l'aquarium gratuit en cas de défaite ; la
  conversion des 72 noms à guillemets droits (un `split('"')` en dépend) ;
  l'argent perdu à la mort que les commentaires promettent.
- Optimisations qui changent l'ordre des tirages ou le rendu (double
  construction de `makeVoiture`, fusion indexée, `MERV.feu` en sprite, ciel en
  dôme réordonné) : proposées, mesurées si possible, non appliquées sans capture
  identique.

### Correctifs

(un par ligne : symptôme, cause, fix, test)

### Décisions prises seul

### À trancher

### Polissage différé en attente de décision

### Abandonné et pourquoi

### À tester à la main sur iPhone demain

### Idées non faites

### `git log --oneline` de la branche

