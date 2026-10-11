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
