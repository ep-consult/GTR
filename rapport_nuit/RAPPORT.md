# Rapport de nuit — 9 octobre 2026

> Mis à jour en continu. Si ce fichier semble s'arrêter en plein milieu, c'est
> que la session a été interrompue : tout ce qui est écrit ici est à jour au
> moment de l'écriture.

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
