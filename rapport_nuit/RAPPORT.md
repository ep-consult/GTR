# Rapport de nuit — 9 octobre 2026

> Mis à jour en continu. Si ce fichier semble s'arrêter en plein milieu, c'est
> que la session a été interrompue : tout ce qui est écrit ici est à jour au
> moment de l'écriture.

## Résumé

*(complété en fin de nuit)*

## Branches

| Branche | Créée depuis | État |
|---|---|---|
| `nuit-audit-1` | `master` (6e6c6ab) | en cours |
| `nuit-mer` | `nuit-audit-1` | pas encore créée |
| `nuit-course` | `nuit-audit-1` | pas encore créée |

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

## Décisions prises seul

*(en cours)*

## À tester à la main sur iPhone demain

*(complété en fin de nuit)*
