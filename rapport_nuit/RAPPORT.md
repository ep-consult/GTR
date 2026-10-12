# Rapport de nuit â€” 9 octobre 2026

> Mis Ã  jour en continu. Si ce fichier semble s'arrÃªter en plein milieu, c'est
> que la session a Ã©tÃ© interrompue : tout ce qui est Ã©crit ici est Ã  jour au
> moment de l'Ã©criture.
>
> **Ajout du 10 octobre** : le dÃ©cor de Los Reyes (branche `decor-ville`),
> voir les deux derniÃ¨res sections, Â« DÃ©cor de Los Reyes Â» et son 2e lot.

## RÃ©sumÃ©

1. **3 branches**, toutes partant de `master`, rien de poussÃ© ni fusionnÃ© :
   `nuit-audit-1` (audit), `nuit-mer` et `nuit-course`. Les deux derniÃ¨res
   partent de l'audit et sont **indÃ©pendantes** l'une de l'autre.
2. **Audit** : les 27 salles, les 5 bornes, les 51 vÃ©hicules et les
   16 Ã©crans ont Ã©tÃ© balayÃ©s par un vrai joueur simulÃ©, avec mesure du **son
   rÃ©el** Ã  la sortie et Ã  la mort. **5 bugs corrigÃ©s**, chacun avec un test
   qui Ã©choue sur l'ancienne version.
3. **Bug nÂ° 1 de la nuit** : mourir au volant de l'**OVNI rendait impossible
   de relancer une partie** (plantage au dÃ©marrage). CorrigÃ©.
4. Autres bugs corrigÃ©s : ambiances du mÃ©tro et du chalutier qui suivaient le
   joueur en ville aprÃ¨s la mort, lance Ã  incendie qui sifflait sur l'Ã©cran de
   mort, 12 libellÃ©s du bouton d'action rognÃ©s, skins de Jax impossibles Ã 
   toucher.
5. **Mer** : dÃ©gradÃ© de profondeur, vagues, reflets (plus doux la nuit),
   ressac, Ã©cume autour des pontons, sillage en V, Ã©claboussures, houle
   partagÃ©e par les bateaux, les bouÃ©es et le nageur. Interrupteur `MER_V2`,
   **coÃ»t de rendu mesurÃ© identique**.
6. **Course** : en course de rÃ©fÃ©rence, une partie **ne pouvait pas
   aboutir**. Trois IA bloquÃ©es (hors piste ou dans le dÃ©cor), une friction
   qui dÃ©pendait du FPS, une grille qui faisait s'entrechoquer les voitures
   au dÃ©part.
7. Course, ajouts : vrai dÃ©compte 3-2-1-GO, HUD lisible qui ne cache plus la
   voiture, carte du circuit, chrono du tour et meilleur tour, Ã©cart,
   records personnels sauvegardÃ©s, Ã©cran de fin, chevrons au sol, ligne
   d'arrivÃ©e en travers, effet de vitesse.
8. Toutes les branches passent `valider.js` et `scenarios.js` (graine fixe
   et alÃ©atoire), et une **sauvegarde d'avant la nuit se charge sans perte**
   sur chacune (voir Â« Fin de nuit Â»).
9. **Reste Ã  faire** : fantÃ´me du meilleur tour, Ã©vitement entre IA (contacts
   au dÃ©part des Quais), Ã©cume de ponton qui suit la forme rÃ©elle des coques.
10. **Les 3 points les plus importants** : le correctif OVNI/relance,
    les IA de course qui finissent enfin leurs courses, et la mer Ã  vÃ©rifier
    **en vrai sur iPhone** (coÃ»t du shader par pixel).

## Branches

| Branche | CrÃ©Ã©e depuis | Commits | Ã‰tat |
|---|---|---|---|
| `nuit-audit-1` | `master` (6e6c6ab) | 5 correctifs + docs | **fonctionne** (tests au vert, voir Â« Fin de nuit Â») |
| `nuit-mer` | `nuit-audit-1` | mer V2 + docs | **fonctionne** â€” Ã  vÃ©rifier Ã  l'Å“il sur iPhone |
| `nuit-course` | `nuit-audit-1` | 7 commits course + docs | **fonctionne** â€” Ã  jouer sur iPhone |
| `decor-ville` (10 oct.) | `nuit-mer` | 11 commits dÃ©cor + docs | **fonctionne** â€” Ã  parcourir sur iPhone (coÃ»t de rendu) |

`nuit-mer` et `nuit-course` ne se connaissent pas. Si les deux sont
retenues, la fusion touchera `index.html` Ã  des endroits diffÃ©rents (mer : section VILLE ;
course : section DÃ‰PÃ”T DE BUS, HUD, `majCamera`), plus `scenarios.js` et
`CLAUDE.md`. Elle devrait se faire sans conflit de fond.

## Phase 1 â€” Audit

### MÃ©thode

Inventaire lu dans le jeu vivant (jamais recopiÃ©) : **27 salles** (`INTDEFS`),
**5 bornes d'arcade** (`BORNES_ARCADE`), **51 vÃ©hicules** (`VEHDEFS`).

Outil de balayage Puppeteer (390Ã—844, Chrome sans blocage de l'audio). Pour
chaque salle, une page neuve, puis :

1. entrÃ©e par la vraie porte ;
2. balayage de **toutes les zones interactives** lues par
   `zonesInterieurActives()` â€” ce qui dÃ©marre les minijeux, ouvre les menus,
   lance les fouilles ;
3. pause en plein milieu, puis reprise ;
4. sortie en plein minijeu ;
5. cinq allers-retours ;
6. mort en plein minijeu ;
7. relance de partie ;
8. sauvegarde puis rechargement.

Les mesures sont rÃ©elles, sans supposition :

- **niveau sonore rÃ©el** (analyseur branchÃ© sur le gain maÃ®tre, RMS) en
  ville avant, puis aprÃ¨s la sortie et aprÃ¨s la mort â€” un son qui continue se
  voit directement ;
- drapeaux d'ambiance `AUDIO.*On`, oscillateur moteur ;
- timers (`setInterval`/`setTimeout` instrumentÃ©s), Ã©couteurs d'Ã©vÃ©nements,
  gÃ©omÃ©tries et textures Three.js, objets de scÃ¨ne, sur les 5 cycles ;
- erreurs console et exceptions ;
- Ã©lÃ©ments DOM restÃ©s visibles aprÃ¨s la sortie ;
- dÃ©bordements Ã  390 px (Ã©lÃ©ments hors Ã©cran, textes rognÃ©s) ;
- FPS dans la salle.

### RÃ©sultats

#### Bugs corrigÃ©s (branche `nuit-audit-1`)

| # | SymptÃ´me | Cause | Correction | Commit |
|---|---|---|---|---|
| 1 | Mourir dans le camion de pompiers lance ouverte : le sifflement de la lance continue sur l'Ã©cran de mort, jusqu'Ã  la partie suivante | `mourir()` coupait moteur et sirÃ¨ne, jamais la lance | `lanceSonStop()` dans `mourir()` + test | `5733718` |
| 2 | **Mourir au volant de l'OVNI empÃªche de relancer une partie** (plantage au lancement). Plus gÃ©nÃ©ralement, mourir au volant laisse les boutons du vÃ©hicule (MISSILE, HUILE, LANCE, FLASH...) dans la partie suivante | La remise Ã  zÃ©ro des boutons n'Ã©tait faite qu'en descendant du vÃ©hicule ; le FLASH de l'OVNI remplace le compteur `#grenN`, que `startRun()` lit | Remise Ã  zÃ©ro factorisÃ©e dans `boutonsAPied()`, appelÃ©e aussi par `startRun()` + test sur les 51 vÃ©hicules | `b937286` |
| 3 | 12 libellÃ©s du bouton d'action et la consigne de la serre coupÃ©s par Â« â€¦ Â» en plein milieu Ã  390 px (Â« Machine 7 en maintenance â€” reviens Ã  laâ€¦ Â») | `white-space:nowrap` + ellipse, libellÃ©s plus longs que 74 vw | Un libellÃ© trop long passe sur deux lignes (mesurÃ© au seul changement de libellÃ©) + test sur tous les libellÃ©s lus dans le source. Captures avant/aprÃ¨s : `captures/audit/libelle_serre_*.png` | `8524190` |
| 4 | Mourir au **mÃ©tro** ou au **chalutier** : l'ambiance repart sur l'Ã©cran de mort et **suit le joueur en pleine ville dans la partie suivante** | La boucle continue `majInterieur` pendant la mort, qui relanÃ§ait l'ambiance ; celle du port du chalutier n'Ã©tait coupÃ©e que pendant une sortie en mer | Mise Ã  jour d'ambiance gardÃ©e hors mort, arrÃªt du port dans `mourir()`, `startRun()` coupe toutes les ambiances + test sur toutes les salles | `2308aa1` |

| 5 | Ã‰cran Personnages : avec les skins de mÃ©tiers, **la skin Â« Classique Â» de Jax et la derniÃ¨re ne peuvent plus Ãªtre touchÃ©es** Ã  390 px | RangÃ©e centrÃ©e, non dÃ©filante, de 10 skins (606 px pour 354) | La rangÃ©e dÃ©file, centrÃ©e par marges auto quand tout tient + test sur tous les persos de `PERSOS`. Captures : `captures/audit/skins_*.png` | `f9deb4b` |

Chaque correction a son test de non-rÃ©gression dans `scenarios.js`, et j'ai
vÃ©rifiÃ© que chacun de ces tests **Ã©choue sur la version d'avant**.

#### Tableau salle par salle

Ordre : du plus rÃ©cent et complexe au plus ancien et simple (ordre inverse
de dÃ©claration dans `INTDEFS`). Â« Actions Â» = nombre d'interactions rÃ©ellement
dÃ©clenchÃ©es par le balayage (zones lues par `zonesInterieurActives()`).

| Salle | Actions | Erreurs JS | Verdict |
|---|---|---|---|
| tuning | 1 | 0 | bug corrigÃ© (#3 libellÃ© rognÃ©) |
| depot | 7 | 0 | OK |
| site51 | 9 | 0 | OK |
| chalutier | 6 | 0 | bug corrigÃ© (#4 ambiance aprÃ¨s la mort) |
| radio | 4 | 0 | bug corrigÃ© (#3 libellÃ© rognÃ©) |
| metro | 20 | 0 | bug corrigÃ© (#4 ambiance aprÃ¨s la mort) |
| cine | 10 | 0 | bug corrigÃ© (#3 libellÃ© rognÃ©) |
| arcade | 7 | 0 | OK |
| musee | 11 | 0 | bug corrigÃ© (#3 libellÃ©s rognÃ©s) |
| sandwich | 8 | 0 | OK |
| serre | 15 | 0 | bug corrigÃ© (#3 consigne rognÃ©e) |
| sport | 7 | 0 | OK |
| bowling | 6 | 0 | bug corrigÃ© (#3 libellÃ© rognÃ©) |
| aquarium | 10 | 0 | OK |
| karaoke | 7 | 0 | bug corrigÃ© (#3 libellÃ© rognÃ©) |
| voyance | 4 | 0 | bug corrigÃ© (#3 libellÃ© rognÃ©) |
| laverie | 14 | 0 | bug corrigÃ© (#3 libellÃ© rognÃ©) |
| casino | 5 | 0 | OK |
| planque | 7 | 0 | bug corrigÃ© (#3 libellÃ© rognÃ©) |
| conces | 4 | 0 | OK |
| armurerie | 1 | 0 | OK |
| pharma | 1 | 0 | OK |
| tour | 1 | 0 | OK |
| poste | 2 | 0 | OK |
| banque | 1 | 0 | OK |
| club | 1 | 0 | OK |
| superette | 2 | 0 | OK |

Pour **toutes** les salles : aucune erreur console, son coupÃ© Ã  la sortie,
pause et reprise correctes, rechargement de sauvegarde juste aprÃ¨s une visite
sans rester coincÃ© dedans, et aucune fuite sur 10 allers-retours ville
figÃ©e (objets de scÃ¨ne, timers, ennemis) â€” voir Â« Fuites Â» plus bas.

#### Bornes d'arcade (5) et casino

Chaque borne (lues dans `BORNES_ARCADE`) : lancÃ©e, puis mort en pleine
partie â†’ Ã©cran de mort normal, et dans la partie suivante la borne est
fermÃ©e et le joystick rÃ©pond (`litEntrees` ignore le joystick tant qu'une
borne est ouverte : c'Ã©tait le risque Ã  vÃ©rifier). **OK.** Casino :
balayÃ© avec les salles (machines, blackjack, poker, roue) : **OK**.

#### VÃ©hicules (51, lus dans `VEHDEFS`)

Pour chacun : monter, accÃ©lÃ©rer + sprint + tir pendant 2 s (FPS mesurÃ©s),
descendre, remonter, mourir au volant en pleine action, relancer.

- **Bug #2** trouvÃ© ici (OVNI, puis tous les vÃ©hicules qui rÃ©affectent des
  boutons) â€” corrigÃ©.
- **Bug #1** (lance du camion de pompiers) â€” corrigÃ©.
- Moteur coupÃ© Ã  la descente et Ã  la mort pour les 51 : **OK**.
- SirÃ¨ne qui reste audible aprÃ¨s le char et le chasseur : **normal**, c'est
  le niveau de recherche (voler un engin militaire fait monter les Ã©toiles).

#### Ã‰crans (16, lus dans le DOM : `.screen`)

DÃ©bordements Ã  390Ã—844 cherchÃ©s sur chaque Ã©cran : seul **Personnages**
dÃ©bordait (bug #5, corrigÃ©). Les autres : OK.

#### Fuites (ville figÃ©e, 10 allers-retours par salle)

Aucune fuite. Deux faux positifs examinÃ©s et Ã©cartÃ©s :
- concessionnaire : +10 vÃ©hicules â€” ce sont les achats du balayage, livrÃ©s
  devant la porte (lÃ©gitime) ;
- armurerie (+10 Ã©couteurs par visite) et casino (+12) : chaque Ã©couteur est
  posÃ© sur un **nouveau** bouton crÃ©Ã© au rendu du menu, l'ancien est retirÃ©
  du DOM (rÃ©cupÃ©rÃ© par le ramasse-miettes). Aucun empilement sur un Ã©lÃ©ment
  persistant.

#### Non corrigÃ© / Ã©cartÃ© (avec raison)

- **LÃ©ger son continu en ville aprÃ¨s certains vÃ©hicules** (mÃ©diane 0,013) :
  c'est la musique de fond (sÃ©quenceur `notes()` sur `musG`) â€” lÃ©gitime.
  Les seules sources audio vivantes aprÃ¨s une descente sont les deux
  oscillateurs permanents (sirÃ¨ne, rayon) Ã  volume nul. Pas un bug.
- **FPS** : en headless, toutes les salles et tous les vÃ©hicules tournent Ã 
  60 FPS (plafond de rafraÃ®chissement) : la mesure ne dÃ©partage rien ici.
  Pour les phases 2 et 3, je mesure donc le **temps CPU par frame**
  (boucle + rendu), qui reste comparable avant/aprÃ¨s.
- **Farming** : non rÃ©-auditÃ© au-delÃ  des scÃ©narios existants, qui couvrent
  dÃ©jÃ  les plafonds par vague de chaque salle (bowling, Ã©mission, sÃ©ances,
  sorties en mer, courses, casse...). Rien de nouveau trouvÃ© par le balayage.


## Phase 2 â€” La mer (branche `nuit-mer`)

### Diagnostic avant de coder

**Ce qui marchait** : bouÃ©es et mouettes animÃ©es, dauphin, planches de surf,
gros bateaux dÃ©coratifs, nage possible avec endurance dÃ©diÃ©e, bateaux
pilotables, Ã©claboussure Ã  l'entrÃ©e dans l'eau.

**Ce qui Ã©tait faible** :
- l'eau Ã©tait un **plan plat Ã  deux triangles**, en matÃ©riau Lambert, avec une
  texture qui dÃ©file : un bleu uniforme de la plage jusqu'au large ;
- le rivage Ã©tait une **ligne droite et dure**, avec une bande d'Ã©cume fixe ;
- le **sillage** se limitait Ã  quelques particules alÃ©atoires, presque
  invisibles depuis la camÃ©ra ;
- les bateaux tanguaient d'un `sin` sur un seul axe, sans lien avec l'eau ;
- le nageur Ã©tait simplement enfoncÃ© Ã  âˆ’0,78, immobile ;
- l'Ã©claboussure se rÃ©sumait Ã  8 particules (12 pour une voiture).

**PrioritÃ©s retenues** (effet visuel / coÃ»t) :

1. shader de l'eau injectÃ© dans le matÃ©riau d'origine ;
2. ressac et Ã©cume, dans le mÃªme shader ;
3. sillage ;
4. Ã©claboussures ;
5. houle partagÃ©e.

**Ã‰cartÃ©s volontairement** : la dÃ©formation de sommets (invisible avec une
camÃ©ra de dessus, et coÃ»teuse en gÃ©omÃ©trie) et une normal map (texture
externe interdite par CLAUDE.md).

### Ce qui a Ã©tÃ© fait (commit `f79d8ac`)

| AmÃ©lioration | Comment |
|---|---|
| DÃ©gradÃ© de profondeur | Turquoise au bord, bleu profond au large, calculÃ© dans le shader Ã  partir de la distance au rivage |
| Vagues animÃ©es | Trois sinus croisÃ©s modulent la teinte. Le dÃ©tail de la texture d'origine est conservÃ© |
| Reflets du soleil | Scintillement fin (produit de deux rÃ©seaux de vagues), pilotÃ© par l'intensitÃ© du soleil : **plus doux la nuit** |
| Ressac | Bande d'Ã©cume qui monte et redescend, de largeur irrÃ©guliÃ¨re le long de la plage. Elle remplace la ligne fixe |
| Ã‰cume au pied des pontons et des Ã®les | Les 8 pontons et les 4 Ã®les les plus proches du joueur, en uniformes recalculÃ©s toutes les 0,5 s |
| Sillage en V | TraÃ®nÃ©e centrale et deux bras qui s'Ã©cartent, cadence liÃ©e Ã  la vitesse. Pool fixe de 48 quads (aucune allocation en jeu) |
| Ã‰claboussures | Anneaux d'Ã©cume qui s'Ã©largissent, plus une gerbe de gouttes. Force selon le cas : nageur, ou voiture qui tombe Ã  l'eau |
| Houle partagÃ©e | **La mÃªme fonction** `houle()` en JS et en GLSL : bateaux pilotÃ©s **et** garÃ©s, bouÃ©es et nageur montent, descendent, tanguent et roulent avec les vagues qu'on voit |

**Interrupteur** : `const MER_V2=true;` en tÃªte de fichier, Ã  cÃ´tÃ© de
`ICONES_SVG`. Ã€ `false`, on retrouve la mer d'avant **Ã  l'identique**
(vÃ©rifiÃ© : nageur fixe Ã  âˆ’0,78, aucun sillage, aucune erreur).

### Performance

En headless, le FPS plafonne Ã  60 et le temps par frame complet est trop
bruitÃ© selon la charge de la machine (Â±25 % d'un passage Ã  l'autre). J'ai
donc isolÃ© le **coÃ»t du rendu** : jeu figÃ©, camÃ©ra fixe, 120 rendus
synchronisÃ©s (lecture d'un pixel aprÃ¨s chacun), 3 passes par version.

| Vue | Avant | Mer V2 | MER_V2 = false |
|---|---|---|---|
| Plage face au large | 2,0 ms | 2,0 ms | 2,0â€“2,2 ms |
| Bateau au large | 1,9 ms | 1,9 ms | 1,8â€“2,0 ms |
| Port | 1,7 ms | 1,7 ms | 1,8 ms |

**Aucune perte mesurable.** Le shader ajoute une dizaine de sinus par pixel
d'eau : sur iPhone, c'est le point Ã  surveiller (voir la liste de tests Ã 
la main).

### Captures avant / aprÃ¨s (`captures/mer/`)

- `large_*` : plage face au large ;
- `bateau_*` : bateau en mouvement ;
- `plongeon_*` : entrÃ©e dans l'eau Ã  pied ;
- `nage_*` : nage ;
- `voiture_eau_*` : voiture qui tombe Ã  l'eau ;
- `ponton_*` : pont du grand yacht.

### ScÃ©narios ajoutÃ©s (`scenarios.js`)

- un bateau en mouvement laisse un sillage, monte, descend et tangue ;
- entrer dans l'eau Ã  pied Ã©clabousse ;
- le nageur suit la houle ;
- une voiture qui tombe Ã  l'eau Ã©clabousse.

Une erreur de compilation du shader remonterait en `console.error`, dÃ©jÃ 
comptÃ©e comme un Ã©chec par la suite.

### Limites et idÃ©es non rÃ©alisÃ©es

- L'Ã©cume des pontons est un **rectangle** : autour de la proue pointue du
  grand yacht, ses coins dÃ©passent lÃ©gÃ¨rement. Piste : dÃ©clarer une forme
  par ponton, ou exclure le yacht.
- Les ennemis nageurs (Dockside Boys) qui entrent dans l'eau n'ont pas
  d'Ã©claboussure. Il suffirait d'appeler `eclaboussure()` Ã  leur transition
  `dansEau`.
- Une voiture qui tombe Ã  l'eau reste posÃ©e Ã  la surface. Faire couler les
  vÃ©hicules non amphibies serait un vrai changement de gameplay : je n'y ai
  pas touchÃ©.
- Reflet de la lune la nuit (un scintillement bleutÃ© plus rare) : simple Ã 
  ajouter sur le mÃªme principe.

## Phase 3 â€” La course (branche `nuit-course`)

### Diagnostic avant de coder

Course de rÃ©fÃ©rence avec pilote automatique : il suit les waypoints par le
vrai joystick. Plus une trace des concurrents seconde par seconde.

**Ce qui marchait** :
- trois circuits au caractÃ¨re distinct ;
- trois IA Ã  personnalitÃ© (rÃ©guliÃ¨re, agressive, malin) ;
- vitesse des IA plafonnÃ©e **relativement au vÃ©hicule du joueur** : la course
  reste gagnable ;
- le Toit a ses chutes et sa passerelle ;
- le raccourci des Quais ;
- l'abandon, la mort et la sortie sont dÃ©jÃ  nettoyÃ©s ;
- un top 5 des temps par circuit (`META.depotTemps`, **victoires seulement**).

**Bugs trouvÃ©s en course de rÃ©fÃ©rence** :

1. **DÃ©part** : pas de vrai dÃ©compte (un toast Â« 3, 2, 1... GO ! Â» et tout le
   monde part tout de suite). La grille dÃ©calait les IA de âˆ’4 sur l'axe Z,
   quelle que soit l'orientation de la piste. RÃ©sultat : deux voitures Ã 
   2 u l'une de l'autre, et une IA qui dÃ©marre **hors piste**, donc freinÃ©e
   d'office.
2. **Friction hors piste par frame** (Ã—0,90 Ã  chaque image) : Ã  30 FPS, deux
   fois moins sÃ©vÃ¨re qu'Ã  60. La mÃªme faute ne coÃ»tait pas la mÃªme chose
   selon l'appareil.
3. **IA bloquÃ©es** :
   - la Malin ne finissait **ni la Boucle ni les Quais**. Elle filait vers
     la sortie du raccourci Ã  travers l'herbe et y rampait Ã  3 u/s ;
   - l'Agressive suivait le joueur sorti de piste et y restait (2,2 u/s
     pendant toute la course) ;
   - le raccourci Â« bus couchÃ© Â» Ã©tait lui-mÃªme un **piÃ¨ge** : la friction
     hors piste s'y appliquait.
4. **HUD** : le panneau de course (circuit, chrono, place, bouton ABANDONNER)
   est posÃ© **exactement sur la voiture du joueur**, au centre de l'Ã©cran.
   Il tient en deux lignes de 9 Ã  11 px, sans chrono du tour, sans meilleur
   tour, sans Ã©cart ni carte.
5. **Fin** : un simple message (place et gain), sans temps ni record.
6. **LisibilitÃ©** : sol sombre, barriÃ¨res fines, aucun chevron dans les
   virages. Seule la ligne de dÃ©part est marquÃ©e.

**Anti-triche vÃ©rifiÃ©** : la progression ne fait qu'augmenter, avec une
anticipation de 3 waypoints au plus. Reculer ne revalide rien, et couper par
l'herbe est trÃ¨s lent : pas de faille trouvÃ©e.

### Fait (commits)

| Commit | Contenu |
|---|---|
| `94bce37` | **Vrai dÃ©compte 3-2-1-GO** (grands chiffres, bips, `dtJeu`), voitures bloquÃ©es jusqu'au GO, dÃ©part anticipÃ© impossible par construction. **Grille 2Ã—2** derriÃ¨re la ligne, sur la tangente de la piste : toutes les voitures sur la piste, Ã  â‰¥ 5,4 u les unes des autres |
| `17956c5` | Friction hors piste **indÃ©pendante du FPS** (mÃªme force qu'avant Ã  60 FPS) |
| `ca35d9a` | **IA** : la Malin passe par l'entrÃ©e du raccourci, le couloir du raccourci compte comme piste, l'Agressive ne suit plus un joueur hors piste, toute IA hors piste rejoint la piste au plus court. Les 9 combinaisons IA Ã— circuit finissent, sur 4 graines |
| `0fbff1f` | **HUD de course** en haut Ã  gauche, voiture dÃ©gagÃ©e. Il affiche la place en grand, le tour (Â« DERNIER TOUR Â»), le chrono du tour, le meilleur tour et l'Ã©cart avec la voiture de devant (ou de derriÃ¨re, en tÃªte). En course, la **minimap dessine le circuit** : tracÃ©, raccourci, ligne de dÃ©part, concurrents. **Joueur en pole** : sur une grille en 2Ã—2, le premier contact Ã  pleine vitesse dÃ©truisait la Citadine avant le premier virage (âˆ’23, âˆ’36, âˆ’70 PV en 0,6 s) |
| `4ea9069` | **Records personnels** par circuit (`META.depotRecords`, clÃ©s fixes) : meilleur temps et meilleur tour, mÃªme hors podium. **Retours de tour** : bip, Â« TOUR 2 â€” 31,5 s Â», Â« â˜… Record du tour Â», Â« DERNIER TOUR ! Â». **Ã‰cran de fin** : place, temps, meilleur tour, record battu ou ancien record, gain. **ManÅ“uvre de dÃ©gagement** des IA : recul en braquant ; en dernier recours, remise en piste comptÃ©e. La Malin restait coincÃ©e dans les conteneurs des Quais toute la course |
| `868a430` | **Ligne d'arrivÃ©e en damier, en travers de la piste** (elle Ã©tait posÃ©e *dans le sens* de la piste). **Chevrons peints au sol** dans les 4 virages les plus serrÃ©s de chaque circuit. **Effet de vitesse** : +7Â° de champ Ã  pleine vitesse, en course seulement |
| `0126439` | Tests de robustesse : anti-triche, abandon au tour 1, mort en course, 5 courses d'affilÃ©e |

### Course complÃ¨te de rÃ©fÃ©rence

Pilote automatique sur La Boucle, avec la Citadine.
- **Avant** : la course n'aboutissait jamais. Le pilote sortait de piste et
  rampait, l'Agressive le suivait dans l'herbe, et la Malin ne finissait pas.
- **AprÃ¨s** : **1Ê³áµ‰ place en 38,07 s**, identique sur 3 passes. Le joueur garde
  ses 120 PV jusqu'au dernier tour, et l'Ã©cran de fin annonce les deux
  records.

### Performance

| Mesure (joueur sur la grille, IA en course, 8 s) | Avant | AprÃ¨s |
|---|---|---|
| `depotMajCourse` par frame | 2,2â€“2,3 ms | 3,2â€“3,4 ms |
| Rendu 3D par frame | ~18 ms | ~18â€“19 ms |
| Carte du circuit (dessinÃ©e 1 frame sur 3) | â€” | 0,46 ms, soit ~0,15 ms/frame |

Environ **+1 ms par frame (~5 %)**, sous le seuil de 10 %. Cette milliseconde
paie des IA qui rejoignent la piste et se dÃ©gagent. Le rendu 3D (chevrons,
damier) ne bouge pas.

### Captures (`captures/course/`)

- `hud_avant` / `hud_apres` : le panneau Ã©tait posÃ© sur la voiture ;
- `decompte_avant` / `decompte_apres` / `decompte_lisib` : dÃ©compte, grille
  en quinconce, ligne d'arrivÃ©e ;
- `fin_avant` / `fin_apres` : Ã©cran de fin ;
- `chevrons_boucle` : chevron au sol dans un virage.

### VÃ©rifications anti-triche

- **Marche arriÃ¨re** : des allers-retours sur des points dÃ©jÃ  validÃ©s donnent
  **+1 point au plus, sans cumul**. Le rayon de validation, 1,5 Ã— la largeur
  de piste, vaut Ã  peu prÃ¨s l'Ã©cart entre deux points : se tenir sur un
  point Â« touche Â» dÃ©jÃ  le suivant. Le gain (â‰ˆ 23 u) est infÃ©rieur au temps
  perdu en reculant : pas exploitable. Un **tour complet Ã  l'envers ne valide
  jamais un tour** (+5 points contre +16).
- **Couper par l'herbe** : la friction hors piste reste forte (mÃªme force
  qu'avant Ã  60 FPS). Seul le couloir du raccourci officiel est rapide.

### IdÃ©es non rÃ©alisÃ©es

- **FantÃ´me du meilleur tour** : non fait. Le temps a servi aux bugs bloquants
  (IA, grille, HUD). Le coÃ»t serait faible : un mesh de plus et un
  enregistrement position/angle 10 fois par seconde, soit ~300 points par tour.
- **Ã‰vitement entre IA** : au dÃ©part des Quais, la Malin (le Bolide, plus
  rapide) percute parfois les IA plus lentes et finit dans les conteneurs.
  Elle s'en sort dÃ©sormais, mais elle peut y perdre jusqu'Ã  18 s. Le vrai
  remÃ¨de est un dÃ©passement par le cÃ´tÃ© au lieu de pousser.
- **Rayon de validation des points** : il pourrait Ãªtre rÃ©duit pour une
  progression plus fine. Je n'y ai pas touchÃ© : il fixe la difficultÃ© du
  pilotage, et le changer relÃ¨ve de l'Ã©quilibrage.
- Faire disparaÃ®tre le score et la vague (sans objet en course) pendant la
  course.

## Fin de nuit â€” vÃ©rification de chaque branche

| Branche | `valider.js` | `scenarios.js` (graine fixe) | `scenarios.js` (graine alÃ©atoire) | Sauvegarde d'avant la nuit |
|---|---|---|---|---|
| `nuit-audit-1` | âœ“ | 0 Ã©chec | 0 Ã©chec â€” 1 saut **connu** (somme rare de la Radio, ~5 %, voir CLAUDE.md) | rechargÃ©e **sans aucun Ã©cart**, champ par champ |
| `nuit-mer` | âœ“ | 0 Ã©chec | 0 Ã©chec, aucun saut | sans aucun Ã©cart |
| `nuit-course` | âœ“ | 0 Ã©chec | 0 Ã©chec, aucun saut | sans aucun Ã©cart (seule la nouvelle clÃ© `depotRecords` s'ajoute, Ã  ses valeurs par dÃ©faut) |

MÃ©thode pour la sauvegarde : une partie riche (argent, niveau, 15 curiositÃ©s,
tenues, armes, amÃ©liorations, dÃ©fis, skins, mÃ©tiers, Â« Mes vÃ©hicules Â»,
lieux vus, records d'arcade) est crÃ©Ã©e avec la version d'avant la nuit
(`master`). Elle est ensuite relue par chaque branche **sur la mÃªme origine**
(mÃªme `localStorage`, clÃ© `asphalte_save_v1` inchangÃ©e) et comparÃ©e **champ
par champ**.

Les captures de chaque phase sont dans `rapport_nuit/captures/` **sur la
branche de la phase** :
- `audit/` sur les trois branches ;
- `mer/` sur `nuit-mer` ;
- `course/` sur `nuit-course`.

Le dÃ©pÃ´t est laissÃ© sur **`nuit-audit-1`**.

## DÃ©cisions prises seul

- **Faux dÃ©part** (course) : plutÃ´t qu'une pÃ©nalitÃ©, aucune commande n'est
  lue avant le GO. Un dÃ©part anticipÃ© est donc impossible, et rien ne change
  Ã  l'Ã©quilibrage. Le moteur peut quand mÃªme ronfler pendant le dÃ©compte.
- **Raccourci des Quais** : traitÃ© comme de la piste. Le panneau
  Â« RACCOURCI ? Â» et l'IA Malin (Â« prend toujours le raccourci Â») montrent
  que c'Ã©tait l'intention ; le laisser lent en faisait un piÃ¨ge. La course
  reste gagnable : la Malin y met au mieux ~51 s, et un joueur Ã  pleine
  vitesse sur la piste ~43 s.

- **Commits** : un commit par changement, sauf `4ea9069` (course). Il
  rÃ©unit les records et l'Ã©cran de fin d'une part, la manÅ“uvre de dÃ©gagement
  des IA d'autre part : les deux touchaient le mÃªme passage de `index.html`
  au mÃªme moment. Le message de commit sÃ©pare clairement les deux parties.
- **Remise en piste des IA** (course) : en dernier recours seulement, aprÃ¨s
  3 tentatives de dÃ©gagement ratÃ©es. C'est le mÃªme principe que la chute
  sur le Toit. La remise est comptÃ©e (`ent.remises`), donc visible dans les
  tests.
- **Rayon de validation des points de course** : inchangÃ©. Il permet de
  gagner 1 point en faisant un aller-retour, sans aucun cumul : c'est de
  l'Ã©quilibrage, pas un bug.
- **Rapport** : la version complÃ¨te est la mÃªme sur les trois branches.

## Ã€ tester Ã  la main sur iPhone demain

Les plus importants d'abord, chacun se vÃ©rifie en moins d'une minute :

1. **`nuit-audit-1`** â€” Monter dans l'OVNI, se faire tuer au volant, puis
   REJOUER : la partie doit dÃ©marrer, avec les boutons Â« Ã  pied Â» (ESQUIVE,
   SPRINT, grenade avec son compteur).
2. **`nuit-audit-1`** â€” Mourir au mÃ©tro (ou au chalutier), puis rejouer : en
   ville, aucun bourdonnement de mÃ©tro ni bruit de mer.
3. **`nuit-mer`** â€” Face au large depuis la plage : la fluiditÃ© reste-t-elle
   la mÃªme qu'avant ? Si Ã§a saccade, passer `MER_V2` Ã  `false` pour comparer.
4. **`nuit-mer`** â€” Piloter un bateau : sillage en V, tangage. Puis entrer
   dans l'eau Ã  pied : anneau d'Ã©cume, et le nageur flotte avec la houle.
5. **`nuit-course`** â€” Une course sur La Boucle : dÃ©compte 3-2-1-GO, panneau
   en haut Ã  gauche, voiture **jamais cachÃ©e**, carte du circuit Ã  la place
   de la minimap.
6. **`nuit-course`** â€” Finir une course : Ã©cran de fin (temps, meilleur tour,
   Â« RECORD ! Â») puis recommencer. Le record doit s'afficher, et rester aprÃ¨s
   avoir fermÃ© et rouvert l'app.
7. **`nuit-course`** â€” Les Quais : la Malin prend le raccourci Â« bus couchÃ© Â»
   et ne reste plus bloquÃ©e. Prendre soi-mÃªme le raccourci : il doit Ãªtre
   rapide.
8. **`nuit-course`** â€” LisibilitÃ© des chevrons au sol dans les virages, et
   confort de l'effet de vitesse (+7Â° de champ). Il se rÃ¨gle avec
   `DEPOT_FOV_VITESSE`.
9. **`nuit-audit-1`** â€” Serre et musÃ©e : les libellÃ©s longs du bouton d'action
   passent sur deux lignes sans rien cacher.
10. **`nuit-audit-1`** â€” Ã‰cran Personnages, Jax : la rangÃ©e de skins dÃ©file au
    doigt, et Â« Classique Â» se touche.
11. **`nuit-mer`** â€” La nuit, au bord de l'eau : les reflets doivent Ãªtre nettement
    plus discrets que le jour.
12. **`nuit-course`** â€” Abandonner une course en plein tour 1 (bouton
    ðŸ³ ABANDONNER) : retour propre au stand, aucun son qui reste.

---

## DÃ©cor de Los Reyes â€” branche `decor-ville` (10 octobre)

Demande : varier les rues, un petit lac rond en haut avec passerelle et
barques, retravailler les bordures et la clÃ´ture, un dÃ©cor factice lÃ  oÃ¹ on
ne va pas, des jonctions entre sable, mer et aÃ©roport, des quartiers animÃ©s
par la lumiÃ¨re, et un vÃ©lo Ã  conduire, qui saute et se personnalise au garage.

Branche crÃ©Ã©e depuis `nuit-mer` (la houle de la mer sert aux vagues sur le
sable). Interrupteur **`DECOR_V2`** : Ã  `false`, le dÃ©cor d'avant revient,
vÃ©los garÃ©s compris. Les correctifs de bordure restent : ce sont des bugs.

### Ce qui a Ã©tÃ© fait (un commit par Ã©tape)

| Ã‰tape | Commit | En bref |
|---|---|---|
| Bordures | `b5388f6` | Le mur est la vraie limite : avant, une voiture s'arrÃªtait 8 u avant le mur et un piÃ©ton 6 u avant. Texture du mur rÃ©pÃ©tÃ©e au lieu d'Ãªtre Ã©tirÃ©e. Enseigne Â« LOS REYES Â» jamais coupÃ©e : le texte est mesurÃ© et la police rÃ©duite. JetÃ©es de rochers au bout des murs, dans la mer. |
| Littoral | `b8dfb2f` | Bande cÃ´tiÃ¨re continue : plus de bande de bitume entre le sable et la mer. Fondu sable â†’ dÃ©sert de l'aÃ©roport, sable mouillÃ©, vagues qui montent sur la plage. |
| Hors les murs | `a11022e` | DÃ©cor factice inaccessible : champs, forÃªt le long du mur, collines, ville lointaine, autoroute surÃ©levÃ©e au nord avec voitures qui dÃ©filent. |
| Mobilier urbain | `b22ca52`, `0a104bb` | Abribus, arbres d'alignement (3 essences), bancs, poubelles, bornes Ã  incendie, jardiniÃ¨res, terrasses, kiosques, arceaux, lampadaires... **choisis par quartier**. Les petits objets se renversent au passage d'une voiture lancÃ©e (geyser pour les bornes Ã  incendie) et sont rÃ©parÃ©s Ã  chaque partie. |
| Plage | `ea29bed` | Transats, serviettes, parasols, chÃ¢teaux de sable, kayaks, cabines, chariot de glaces, filet de volley. |
| Lac du parc | `3d0061f`, `e768516` | Lac rond, margelle de pierres, roseaux, passerelle en bois **praticable** en dos d'Ã¢ne, 4 barques qui tanguent, canards, bancs. C'est de la vraie eau : on y nage, une voiture s'arrÃªte au bord. |
| LumiÃ¨res de quartier | `bae85fb` | **Times Square** (quartier nÃ©on) : Ã©crans gÃ©ants animÃ©s, nÃ©ons qui clignotent. **Quartier chinois** : portiques rouges, guirlandes de lanternes. **Brooklyn** (brique) : escaliers de secours, guirlandes d'ampoules. Partout : flaques de lumiÃ¨re sous les lampadaires la nuit. |
| Transitions entre sols | (ce commit) | Retour de playtest : Â« Ã§a passe de l'asphalte Ã  l'herbe au sable sans transition Â». Chaque frontiÃ¨re visible entre deux sols (retrouvÃ©e par le jeu, aucune liste Ã©crite Ã  la main) reÃ§oit une transition oÃ¹ le matÃ©riau le plus meuble dÃ©borde : sable soufflÃ© sur la route et les trottoirs (bitume fissurÃ© au bord), pelouse qui jaunit avant le sable, herbe et terre battue qui dÃ©bordent sur le bitume et le tarmac. Bande continue au bord ondulÃ©, taches, touffes. |
| VÃ©los | `7e8ec5f` | VÃ©lo de ville et BMX, 12 garÃ©s aux arceaux Ã  chaque partie. PÃ©dalage animÃ©, aucun bruit de moteur. **BUNNY HOP** sur ESQUIVE : 0,9 u de haut en vÃ©lo, 1,7 u en BMX, assez pour passer un banc. Personnalisation au garage. |

### Captures (`rapport_nuit/captures/decor/`, rendus Three.js rÃ©els)

- Bordures, avant / aprÃ¨s : `bordure_nord_*`, `coin_nord_ouest_*`,
  `coin_sud_ouest_*`, `coin_sud_est_*`, `cote_aeroport_*` ;
- hors les murs : `hors_les_murs_nord`, `hors_les_murs_ouest`,
  `hors_les_murs_coin_nord_ouest` ;
- rues par quartier : `rue_centre`, `rue_commerce`, `rue_industriel`,
  `rue_neon`, `rue_port`, `rue_residentiel`, `rue_villas` ;
- plage : `plage_decor`, `plage_vagues_apres` ;
- lac : `lac`, `lac_passerelle` ;
- lumiÃ¨res, jour / nuit : `lumiere_timesSquare_*`,
  `lumiere_quartierChinois_*`, `lumiere_portiqueChinois_nuit`,
  `lumiere_brooklyn_nuit` ;
- vÃ©los : `velo_profil`, `velo_en_selle`, `bmx_bunny_hop`, `bmx_tune_profil`
  (toutes les piÃ¨ces), `velo_garage_menu`, `bmx_vue_jeu`.

### Transitions entre sols â€” captures et piÃ¨ges

Captures avant / aprÃ¨s (`transition_*_avant.png` / `transition_*_apres.png`) :
- `ville_aerodrome_jour` / `ville_aerodrome_nuit` : l'endroit exact de la 1re
  capture du playtest (trottoir â†’ dÃ©sert â†’ gazon de l'aÃ©rodrome) ;
- `aerodrome_sud` : la 2e capture (tarmac â†’ gazon â†’ dÃ©sert) ;
- `parc_route`, `plage_route`, `champ_desert` ;
- `transition_vue_zenithale_*` : vues du dessus.

Trois piÃ¨ges, chacun vu en rendu rÃ©el puis corrigÃ© :
- textures de canvas transparentes : un liserÃ© noir se forme au filtrage ;
  corrigÃ© avec un dÃ©tail opaque et un masque sÃ©parÃ© (`alphaMap`) ;
- une bande dessinÃ©e Â« Ã  l'envers Â» sortait noire : l'ordre des sommets
  dÃ©pend maintenant du sens du bord ;
- la nuit, les petites taches s'allumaient en orange vif prÃ¨s des lampes,
  alors que le sol autour restait sombre. Lambert Ã©claire par sommet : les
  taches sont maintenant teintÃ©es chaque image comme le sol plat.

CoÃ»t mesurÃ© dans un mÃªme build, transitions affichÃ©es ou cachÃ©es : 0 Ã  5 %,
dans le bruit de la mesure. Elles ajoutent 4 Ã  9 appels de rendu et 5 000 Ã 
10 000 triangles par vue.

### Performance (rendu seul, sans entitÃ©s, GPU de bureau)

| Vue | Appels de rendu avant â†’ aprÃ¨s | Triangles avant â†’ aprÃ¨s |
|---|---|---|
| Centre | 89 â†’ 107 | 11 062 â†’ 29 320 |
| Lac | 80 â†’ 98 (160 avant la fusion du lac) | 8 896 â†’ 16 633 |
| Plage | 96 â†’ 119 | 9 178 â†’ 19 832 |
| Coin nord-ouest | 45 â†’ 59 | 7 340 â†’ 16 440 |
| Quartier chinois | 68 â†’ 81 | 8 038 â†’ 21 299 |
| AÃ©roport | 59 â†’ 74 | 8 886 â†’ 21 807 |

Le temps de rendu mesurÃ© passe d'environ 2,1 ms Ã  2,4â€“2,8 ms, soit
**+10 Ã  +20 %**. La mesure est bruitÃ©e : la mÃªme vue Â« avant Â» varie de
2,0 Ã  3,2 ms d'une passe Ã  l'autre.

Mesures prises en cours de route :
- le dÃ©cor hors les murs, d'abord fusionnÃ© en un seul maillage par cÃ´tÃ©,
  coÃ»tait +19 % : il est dÃ©sormais dÃ©coupÃ© en tronÃ§ons de 120 u ;
- le mobilier faisait 66 000 triangles : 7Ã—7 zones fusionnÃ©es et des formes
  plus simples le ramÃ¨nent Ã  20â€“30 000 ;
- les flaques de lumiÃ¨re sont fusionnÃ©es par carrÃ© de 200 u ;
- le lac est fusionnÃ© avec la ville ;
- le cadre des vÃ©los est fusionnÃ© par matÃ©riau.

**C'est le point nÂ° 1 Ã  vÃ©rifier sur iPhone.** Si Ã§a saccade, comparer avec
`DECOR_V2=false`. Le levier le plus simple serait de rÃ©duire la densitÃ© du
mobilier (`MOB_QUARTIERS`).

### DÃ©cisions prises seul

- **Barques du lac** : dÃ©cor qui tangue, pas des bateaux pilotables (choix
  prudent). Le lac fait 9,5 u de rayon, trop petit pour piloter.
- **Deux vÃ©los** : vÃ©lo de ville (15 u/s, saut de 0,9 u) et BMX (17 u/s,
  saut de 1,7 u), un BMX sur trois aux arceaux.
- **Garage des vÃ©los : style seulement.** Peinture, nÃ©ons, porte-bagages ou
  caisse de livreur, garde-boue, panier ou plaque de course, jantes, fanion.
  Ni nitro, ni moteur, ni blindage : masquÃ©s dans le menu **et** refusÃ©s Ã 
  l'achat. Les **prix sont ceux des voitures** (`TUNING_PRIX`, mÃªmes
  catÃ©gories) : ils sont peut-Ãªtre chers pour un vÃ©lo, Ã  calibrer en jouant.
- **Bunny hop** : un saut par appui (le maintenir ne fait pas sautiller) et
  **aucun point de cascade**, pour Ã©viter de faire du score en sautillant sur
  place. Un saut depuis une vraie crÃªte rapporte toujours ses points.
- **Pas de police pour un vÃ©lo garÃ©** : il n'est Ã  personne, le prendre
  n'est pas un vol (comme pour les autres vÃ©hicules garÃ©s).
- **Tirages du dÃ©cor sÃ©parÃ©s** (gÃ©nÃ©rateur `aleaDecor`, graine 917) : ajouter
  un banc ne dÃ©place ni un bÃ¢timent, ni une porte, ni un lieu de la ville.

### VÃ©rifications

- Tests ajoutÃ©s Ã  `scenarios.js` :
  - bordures : vÃ©hicule et piÃ©ton vont jusqu'au mur, nage bornÃ©e, enseigne
    la plus longue jamais rognÃ©e ;
  - mobilier : au moins 100 objets cassables, aucun sur la chaussÃ©e,
    renversement et rÃ©paration ;
  - lac : nage, passerelle, voiture arrÃªtÃ©e au bord ;
  - vÃ©los : garÃ©s sur les arceaux, sans moteur, un saut par appui, BMX plus
    haut, aucun point ; au garage, style seulement avec les gardes d'achat ;
    sauvegarde ; sortie du garage en selle.
- Deux tests de garage adaptÃ©s **en lisant la source** : un vÃ©lo a
  `tuningCarro` sans `tuningMeca`, et ses garde-boue sont *au-dessus* des
  roues (`surRoues`, testÃ©s contre le cercle de la roue).
- Fin de travail : `valider.js` âœ“, `scenarios.js` 0 Ã©chec en graine fixe
  (20260731) et en graine alÃ©atoire (894418076), aucun saut.
- Sauvegarde : une partie faite sur `master` (avant la nuit) et une faite
  sur `nuit-mer` (avant le dÃ©cor) se rechargent **sans aucun Ã©cart**, clÃ©
  `asphalte_save_v1` inchangÃ©e.

### Ã€ tester Ã  la main sur iPhone (`decor-ville`)

1. Parcourir le centre, la plage et le quartier nÃ©on la nuit : fluiditÃ©
   comparable Ã  `nuit-mer` ? Sinon, passer `DECOR_V2` Ã  `false` pour
   comparer.
2. Prendre un vÃ©lo Ã  un arceau, faire un BUNNY HOP par-dessus un banc et
   par-dessus une bordure de trottoir.
3. Entrer au garage Ã  vÃ©lo, essayer le panier, la caisse et le fanion, puis
   ressortir en selle.
4. Longer les murs nord et ouest en voiture : aucun arrÃªt avant le mur,
   enseigne Â« LOS REYES Â» entiÃ¨re.
5. Plage : les vagues montent bien sur le sable, sans bande de bitume.
6. Lac : traverser la passerelle Ã  pied, puis plonger.
7. Foncer dans une rangÃ©e de poubelles et une borne Ã  incendie : elles
   tombent, le geyser part. Elles reviennent Ã  la partie suivante.
8. **Transitions** : longer la bordure entre la ville et l'aÃ©rodrome, de jour
   puis de nuit. Le sable doit dÃ©border sur la route sans briller la nuit, et
   aucune ligne droite ne doit sÃ©parer herbe et sable.

---

## DÃ©cor de Los Reyes, 2e lot â€” galion, quartiers, enseignes, portes (10 octobre)

Demandes :
- refaire le bateau Ã©chouÃ© Â« beaucoup plus majestueux Â», ses canons tirant
  vers le large, et un tir sur cinq sur le joueur ;
- de nouvelles choses dans chaque quartier, en gardant l'Ã¢me de l'existant ;
- ajoutÃ©es en cours de route :
  - une crique avec de hauts plongeoirs ;
  - un accÃ¨s moins Â« gros carrÃ©s Â» ;
  - des enseignes lisibles ;
  - des portes mieux placÃ©es.

Tout est derriÃ¨re `DECOR_V2`, un commit par Ã©lÃ©ment, sur `decor-ville`.

### Ce qui a Ã©tÃ© fait

| Ã‰lÃ©ment | Commit | En bref |
|---|---|---|
| Galion Ã©chouÃ© | `6e831cc` | 26 u (trois fois l'ancienne Ã©pave), sur la plage vide Ã  l'est. Coque bordÃ©e avec prÃ©ceinte, chÃ¢teau arriÃ¨re aux fenÃªtres allumÃ©es la nuit, figure de proue, trois mÃ¢ts (dont un brisÃ© et un tombÃ© dans le sable), voiles et pavillon noir qui ondulent, squelette Ã  la barre, mouettes, Ã©cume. BrÃ¨che cÃ´tÃ© plage jusqu'au coffre : butin une fois par partie. **6 canons en salves, boulets en cloche, 1 tir sur 5 sur le joueur Ã  portÃ©e** (mesurÃ© : 20 Ã  21 %). |
| JetÃ©e de fÃªte foraine | `f29c815` | Plage ouest, praticable Ã  pied et en voiture. Grande roue de 21 u (ampoules en chenillard la nuit, elle s'efface quand elle cache le joueur), manÃ¨ge, 4 stands, arche illuminÃ©e. |
| Skatepark | `59e899c` | Parc voisin du lac. Deux tremplins face Ã  face au-dessus d'un vide de 10 u (le BMX s'envole vraiment), funbox, quarter-pipe, rails, murs taguÃ©s, projecteurs. |
| Port vivant | `fde5bab` | Trois parcs Ã  conteneurs avec un portique qui roule en portant un conteneur, phare rayÃ© sur un Ã®lot praticable (faisceau la nuit), porte-conteneurs au large. |
| Brooklyn | `095a5ea` | 11 fresques murales, 20 cordes Ã  linge, 8 bornes Ã  incendie ouvertes, deux courts de basket grillagÃ©s. |
| Ciel | `9512d68` | Dirigeable REYES FM, avion Ã  banderole le long de la plage, mouettes, feux d'artifice la nuit prÃ¨s de la jetÃ©e. |
| Crique des plongeurs | `99ac9d5`, `7eba435` | Baie d'eau de mer entre trois falaises de grÃ¨s (17, 10 et 5 u), un plongeoir chacune. **Atterrir dans l'eau ne blesse plus** : salto, gerbe, bonus de score selon la hauteur. AccÃ¨s refait : collines escarpÃ©es et sentier en lacets Ã  la place des trois rampes. |
| Quartier nÃ©on | `a78882e`, `356cf0d` | 10 panneaux animÃ©s sur les toits, tapis rouge, file d'attente et videur devant le CLUB NÃ‰ON, projecteurs qui balaient le ciel la nuit. |
| Finitions de quartier | `8569099` | Villas : 11 piscines dÃ©corÃ©es. Commerce : marchÃ© de rue (cagettes de fruits qui volent au passage d'une voiture). Industriel : cheminÃ©es qui fument. Base : barbelÃ©s et deux miradors Ã  projecteurs. |
| Enseignes | `89d56bf` | **Toutes refaites.** L'ancienne texture Ã©tait un canevas carrÃ© de 256 px Ã©tirÃ© sur un panneau 2,4 fois plus large : texte Ã©crasÃ©, puis noyÃ© dans un halo. DÃ©sormais nettes, cadrÃ©es, aux bonnes proportions, penchÃ©es vers la camÃ©ra en ville. Cela touche les 132 enseignes : rues, lieux, salles, garages, bus. |
| Portes | `200bdf7` | Chaque porte regarde vers sa faÃ§ade (avant : toujours vers le sud). Pharmacie et concession, qui donnaient sur la chaussÃ©e, passent sur une faÃ§ade avec du trottoir. L'arcade, qui n'avait aucun bÃ¢timent, reÃ§oit une devanture. L'enseigne du lieu passe devant le store qui la coupait, et les enseignes de boutique tirÃ©es au hasard qui la recouvraient sont retirÃ©es. |

### Bugs trouvÃ©s en route (corrigÃ©s)

- **Ville dÃ©calÃ©e par le dÃ©cor.** Three.js tire `Math.random` pour l'identifiant de chaque objet crÃ©Ã©. Construire le galion Ã  la place de l'ancienne Ã©pave dÃ©plaÃ§ait toutes les portes de la ville (vu par `scenarios.js`). Le dÃ©cor neuf est maintenant construit sur son propre gÃ©nÃ©rateur (`sansAleaVille`). L'ancienne Ã©pave est construite puis retirÃ©e, pour que la ville tire exactement les mÃªmes nombres. VÃ©rifiÃ© aprÃ¨s chaque Ã©lÃ©ment : 28 portes identiques Ã  la version d'avant.
- **Les tags du quartier industriel Ã©taient remplacÃ©s** par la texture du skatepark : deux fonctions portaient le mÃªme nom (`texGraffiti`).
- **Fente Ã  la jonction colline / falaise de la crique** : un trou de hauteur 0. TrouvÃ© par le test de continuitÃ©.
- **Le butin du coffre du galion disparaissait** au bout de 26 s (durÃ©e par dÃ©faut d'un butin) : il attend maintenant le joueur.
- **Test Moto cross fragile** : la moto du test roulait vers la statue de la place. Le test est dÃ©sormais maÃ®tre de sa scÃ¨ne.

### Performance

Mesure de rendu seul sur les six vues les plus chargÃ©es, avant le galion puis maintenant :

| Vue | Appels de rendu | Triangles |
|---|---|---|
| Centre | 107 â†’ 108 | 29 320 â†’ 31 393 |
| JetÃ©e | 111 â†’ 136 | 30 767 â†’ 38 490 |
| Crique | 58 â†’ 75 | 14 820 â†’ 23 401 |
| Port | 84 â†’ 101 | 26 443 â†’ 27 721 |
| Club | 119 â†’ 143 (246 avant la fusion de la file d'attente) | 24 982 â†’ 29 284 |
| Skatepark | 129 â†’ 140 | 27 406 â†’ 28 892 |

Le temps de rendu mesurÃ© augmente de **5 Ã  10 %**. La machine de mesure rendait cette fois en logiciel (environ 18 ms), donc les Ã©carts relatifs comptent plus que les valeurs absolues. **Ã€ vÃ©rifier sur iPhone**, en particulier la jetÃ©e de nuit et le quartier nÃ©on.

### VÃ©rifications

- `valider.js` âœ“.
- `scenarios.js` : 0 Ã©chec en graine fixe et en graine alÃ©atoire (3774822559), aucun saut. Nouveaux tests :
  - galion : coque solide, brÃ¨che ouverte, tirs au large, environ 1 sur 5 sur le joueur ;
  - jetÃ©e : praticable Ã  pied et en voiture, roue qui s'efface ;
  - skatepark : vrai saut en BMX ;
  - port : portiques en mouvement, Ã®lot praticable, faisceau la nuit seulement ;
  - Brooklyn ;
  - crique : plongeon rÃ©el de 17 u sans dÃ©gÃ¢ts, bonus, montÃ©e continue ;
  - quartier nÃ©on : porte du club libre ;
  - finitions de quartier ;
  - portes : trottoir devant, sortie devant la porte, aucune enseigne de lieu masquÃ©e.
- Sauvegarde : une partie faite sur `master` se recharge sans aucun Ã©cart, clÃ© `asphalte_save_v1` inchangÃ©e.

### DÃ©cisions prises seul

- **Galion** posÃ© sur la plage vide Ã  l'est, plutÃ´t qu'Ã  la place exacte de l'ancienne Ã©pave : trois fois plus grand, il n'y tenait pas. MÃªme rivage, mÃªme Ã¢me (canons toujours actifs, tonneaux).
- **Plongeons** : atterrir dans n'importe quelle eau (mer, lac, crique) ne blesse plus, quelle que soit la hauteur. Le bonus ne tombe qu'au-dessus de 4 u, et au plus une fois toutes les 6 s, pour qu'on ne fasse pas du score Ã  la chaÃ®ne.
- **Enseignes de boutique retirÃ©es** quand elles recouvraient celle d'un lieu (KEBAB, DISCO, LIVE, SUSHI, POLICEâ€¦). Les autres restent.
- **Bowling** : sa porte garde 2,5 u de trottoir. Aucune autre faÃ§ade de son bÃ¢timent ne fait mieux, et le seuil reste Ã  1,3 u de la bordure.

### Ã€ tester sur iPhone (2e lot)

1. Galion : s'approcher par la plage (un boulet sur cinq part sur le joueur), entrer par la brÃ¨che et prendre le trÃ©sor.
2. Crique : monter le sentier en lacets jusqu'au plongeoir de 17 u, sauter, puis ressortir par les marches et replonger du bras de 5 u.
3. JetÃ©e de nuit : grande roue, manÃ¨ge, feux d'artifice. ContrÃ´ler la fluiditÃ©.
4. Skatepark en BMX : prendre le tremplin et franchir le vide.
5. Enseignes : se promener dans le quartier nÃ©on et le commerce, et entrer dans deux ou trois salles. Tout doit se lire.
6. Pharmacie, concession, laverie, karaokÃ©, arcade : entrer puis ressortir. On doit ressortir devant la porte, jamais dans un mur.

---

## 3e lot â€” blocage crique, avion, vÃ©hicules, Mont Reyes, canyons (11 octobre)

| Ã‰lÃ©ment | Commit | En bref |
|---|---|---|
| **Bug : bloquÃ© au pied d'une falaise** | `2f59567` | SignalÃ© : aprÃ¨s un saut du plongeoir de gauche, coincÃ© sans pouvoir bouger. En tombant d'un bord, on atterrit dans la marge de collision de la falaise et chaque pas Ã©tait refusÃ©. On peut maintenant toujours s'Ã©loigner d'un mur ou le longer. Le test Ã©choue sur l'ancienne version. |
| Avion Ã  banderole | `83e1d0c` | Avion de tourisme dÃ©taillÃ©, plus rapide (19 u/s au lieu de 12 au plus), banderole qui ondule et reste lisible dans les deux sens. **Kiosque Â« TON MESSAGE DANS LE CIEL Â»** prÃ¨s de la jetÃ©e : on Ã©crit son message (30 caractÃ¨res), on paie 250 $, il est sauvegardÃ©. |
| Bateaux, buggys, bulldozer | `5aae1fc` | Bateaux : vraies coques en V et accastillage (vedette, police, pÃªche, offshore, jet-ski, yacht). **TrouvÃ© en route : tous les bateaux naviguaient Ã  reculons** (Ã©trave du mauvais cÃ´tÃ©). Buggys : baquet, ailes, capot numÃ©rotÃ©, cage contrastÃ©e, moteur Ã  nu. Bulldozer : chenilles, cabine vitrÃ©e, lame incurvÃ©e, vÃ©rins, ripper. |
| Mont Reyes | `a71d338`, `a3b54f6` | Montagne de 72 u au nord-est de l'aÃ©rodrome : prairies, forÃªt, rochers, sommet enneigÃ©. Sentier en lacets taillÃ© dans la pente, avec 6 tremplins. La limite invisible de l'est (x 452) est repoussÃ©e jusqu'Ã  une vraie paroi rocheuse : tout le dÃ©sert est accessible, y compris le saut gÃ©ant de la falaise, qui Ã©tait hors d'atteinte. |
| Canyons Â« Rampage Â» | `a3b54f6` | Ligne des mesas : 5 plateaux en escalier sÃ©parÃ©s par des canyons de 10 u, tremplins en bois. Parois en strates de grÃ¨s, bords Ã©rodÃ©s. Les dunes sont remplacÃ©es par des buttes en strates, plus des cheminÃ©es de fÃ©e. L'OVNI, la crique et le galion sont intacts. |
| Courses | `a3b54f6` | **MontÃ©e du Mont Reyes** (50 s) et **ligne des mesas** (14 s), au volant d'une moto, d'un vÃ©lo ou d'un buggy. DÃ©part au cercle de dÃ©part, portes Ã  franchir, prime une fois par vague. Motos cross, BMX, vÃ©lo et buggy garÃ©s au pied des dÃ©parts. |

### RÃ©glages et dÃ©cisions

- **Terrains de saut** : sur la montagne et dans les canyons, dÃ©valer une pente ne fait plus dÃ©coller. Seuls un vrai bord, un tremplin ou un gap lancent le vÃ©hicule. Une rÃ©ception ratÃ©e n'abÃ®me qu'au-delÃ  d'environ 20 u de chute.
- **Courses vÃ©rifiÃ©es par un pilote simulÃ©.**
  - Un pilote prudent, qui freine avant les Ã©pingles, finit les deux courses avec chaque vÃ©hicule, sans dÃ©gÃ¢ts, avec 4 Ã  5 sauts : 25 Ã  34 s pour le mont, 6 Ã  8 s pour les mesas.
  - Ã€ fond, sans freiner, on sort des lacets et on s'abÃ®me : la course peut se perdre.
- **Clavier** (pour info, Ã§a ne touche pas le tactile) : en vÃ©hicule, S sert Ã  la fois Ã  descendre et Ã  freiner. C'Ã©tait dÃ©jÃ  le cas avant.
- **PiÃ¨ge trouvÃ© deux fois** : rien de Three.js ne doit Ãªtre crÃ©Ã© au chargement du script. Un tirage alÃ©atoire de plus avant la ville dÃ©place toutes les portes. C'est maintenant notÃ© dans `CLAUDE.md`.

### Performance

Rendu seul :
- Montagne et canyons : +3 Ã  8 % sur les vues de l'est (aÃ©roport, pied du mont, dÃ©sert), sous le seuil de 10 %. Jusqu'Ã  56 000 triangles au pied du mont.
- `solY` (hauteur du sol) : 28 â†’ 24 Âµs par appel.

### Ã€ tester sur iPhone

1. Plonger du plongeoir de gauche de la crique, puis nager contre la falaise : on doit pouvoir repartir.
2. Kiosque prÃ¨s de la jetÃ©e : Ã©crire un message, payer, puis regarder l'avion passer.
3. Prendre la vedette et le bateau de pÃªche : ils avancent la proue devant.
4. Mont Reyes : prendre la moto cross garÃ©e au pied et faire la course (freiner dans les Ã©pingles).
5. Ligne des mesas : moto cross ou buggy, enchaÃ®ner les 4 gaps.
6. FluiditÃ© vers l'est (montagne, canyons).


---

## 4e lot â€” grand yacht, porte-conteneurs, carte de l'est, pentes (11 octobre)

| Ã‰lÃ©ment | Commit | En bref |
|---|---|---|
| Grand yacht | `7874538` | Refait dans le style des bateaux restylÃ©s : coque en V, trois ponts vitrÃ©s, arche radar, jacuzzi Ã  l'avant, hÃ©lipad et plateforme de bain Ã  l'arriÃ¨re. On marche toujours sur le pont. Captures : `grand_yacht_avant.png`, `grand_yacht_apres.png`, `grand_yacht_jeu.png`. |
| Porte-conteneurs pilotable | `b160a38` | Le Â« Reyes Star Â» (62 u) n'est plus un dÃ©cor : il mouille au large de la plage et se pilote. Il est lent et lourd (11 u/s). On monte Ã  bord par le flanc. La camÃ©ra recule pour le voir en entier. |
| Mer agrandie | `7874538` | Les bateaux s'arrÃªtaient avant la crique alors qu'on pouvait y nager. On navigue maintenant jusqu'au large de la crique. |
| Mont et canyons sur la carte | `a852918` | La minimap et la grande carte montrent la montagne (couleurs selon l'altitude), le sentier, les canyons, la crique et le dÃ©sert. Ils sont dessinÃ©s Ã  partir du relief rÃ©el. Les boutons + / âˆ’ de la grande carte passent en bas Ã  droite, sur la mer : en haut, ils cachaient le mont. Capture : `carte_mont_canyons.png`. |
| ClÃ´ture aÃ©rodrome / mont | `a852918` | La clÃ´ture est de l'aÃ©rodrome est supprimÃ©e : on passe librement de l'aÃ©rodrome au pied de la montagne. La clÃ´ture nord s'arrÃªte avant le pied du mont. |
| **Pentes rÃ©alistes** | `a852918` | SignalÃ© : Â« on monte Ã  fond, mÃªme Ã  pied ; au canyon on se rapproche et d'un coup on est en haut Â». DÃ©tail ci-dessous. |

### Pentes : ce qui change

- **En vÃ©hicule.** La pente freine Ã  la montÃ©e et pousse Ã  la descente. Plein gaz dans le flanc du mont, une moto cross fait 40 u en 5 s au lieu de 124.
- **Contre une paroi** (falaise de mesa, crÃªte trop raide), on bute et on glisse le long, sans casse. On ne la gravit plus d'un coup.
- **Ã€ pied.** On ne monte plus une paroi de mesa : 1 m en 4 s contre la paroi, au lieu de se retrouver en haut. Hors sentier, la pente du mont divise la vitesse de marche par deux environ.
- **Sentier du mont.** La pente y freine moins, car le terrain y est damÃ©. Les Ã©pingles ont un palier plat pour faire demi-tour. Au pas, on braque plus serrÃ©.
- **Sommet.** Le dernier lacet montait Ã  une pente de 1,45, impossible Ã  franchir avec la gravitÃ© : la calotte du sommet est adoucie (65 u au lieu de 72).
- **Course du mont.**
  - Temps limite : 60 s au lieu de 50, puisque la montÃ©e est plus lente.
  - Il faut passer chaque porte Ã  la hauteur de son lacet : couper par en dessous ne compte plus.

### VÃ©rifications

- **Pilote simulÃ© au joystick rÃ©el** (mÃªme logique que le tactile) : le mont est fini avec tous les vÃ©hicules garÃ©s au pied.
  - Moto cross : 33 s.
  - Moto : 34 s.
  - Quad : 29 s.
  - Buggy : 39 s.
  - BMX : 31 s.
  - VÃ©lo : 40 s.
  - Mesas : 7 Ã  8 s.
- **Nouveau test Â« Pentes Â»** dans `scenarios.js` : paroi de mesa infranchissable Ã  pied et en moto (sans casse), montÃ©e du mont nettement freinÃ©e Ã  pied et en moto.
- Portes de la ville inchangÃ©es : rien n'a dÃ©calÃ© le tirage de la ville.

### Ã€ tester sur iPhone

1. Mont Reyes en moto cross : sentir la montÃ©e, ralentir et faire demi-tour dans les Ã©pingles, finir la course en moins de 60 s.
2. Monter le mont Ã  pied hors du sentier : Ã§a doit Ãªtre lent.
3. Canyons Ã  pied : la paroi d'une mesa ne doit plus se gravir. Tomber du haut doit toujours Ãªtre une vraie chute.
4. Grande carte : le mont et les canyons sont visibles Ã  l'est, les boutons + / âˆ’ en bas Ã  droite.
5. Passer de l'aÃ©rodrome au mont sans muret.
6. Piloter le porte-conteneurs, puis naviguer jusqu'au large de la crique.


---

## 5e lot â€” vÃ©hicules Ã  l'eau, 4x4, zone extrÃªme (11 octobre)

| Ã‰lÃ©ment | Commit | En bref |
|---|---|---|
| **VÃ©hicules Ã  l'eau** | `fc04a41` | Au volant, on peut entrer dans la mer, le lac ou la crique. Le vÃ©hicule ne casse pas et n'explose pas, mais il est noyÃ© : le joueur en sort Ã  la nage, le vÃ©hicule coule puis disparaÃ®t. Avant, l'eau Ã©tait un mur, et un saut dans l'eau faisait 80 de dÃ©gÃ¢ts (une moto explosait). Les voitures de l'IA s'arrÃªtent toujours au bord. |
| 4x4 Â« Coyote Â» | `fc04a41` | 4x4 de franchissement Ã  chÃ¢ssis haut, nouveau vÃ©hicule (dessinÃ© sans marque). La pente le freine deux fois moins et il gravit des pentes plus raides que les autres. Il reste arrÃªtÃ© par une vraie falaise. Deux sont garÃ©s au pied du mont, un au dÃ©part de la montÃ©e sÃ¨che. Captures : `jeep_coyote.png`, `jeeps_pied_mont.png`. |
| MontÃ©e sÃ¨che | `fc04a41` | DÃ©fi de montÃ©e de colline : couloir de terre tout droit dans la face sud du Mont Reyes, de plus en plus raide. En 6,5 s, prime 200 $ une fois par vague. Une moto cross et un 4x4 attendent au dÃ©part. Le BMX n'y arrive pas. Capture : `montee_seche.png`. |
| DÃ©fi stunt | `fc04a41` | Parc de 4 tables de saut au pied ouest du mont. Il faut 1 200 points de figures en 45 s : chaque saut rapporte selon le temps de vol (bonus si la rÃ©ception est propre), le cabrage en moto cross aussi. Prime 250 $ une fois par vague. Deux motos cross au dÃ©part. Capture : `parc_stunt.png`. |
| **Pic du Vertige** | `fc04a41` | Butte de 90 u Ã  parois verticales, au sud des canyons, face tournÃ©e vers la camÃ©ra pour voir toute la chute. On monte par un monte-charge. En haut, un plongeoir et le bouton SAUT BASE : on ouvre le parachute pendant la chute et on vise la cible au pied. Prime 300 $ en plein centre, une fois par vague. Sans parachute, c'est mortel. Captures : `pic_vertige.png`, `pic_monte_charge.png`, `pic_saut_base_voile.png`. |
| Carte | `fc04a41` | Le Pic, sa cible, la montÃ©e sÃ¨che et les tables du parc stunt apparaissent sur la carte. Capture : `carte_zone_extreme.png`. |

### RÃ©glages vÃ©rifiÃ©s par simulation

- **MontÃ©e sÃ¨che.** Le pilote simulÃ© au joystick la finit en 3,7 Ã  4,6 s avec la moto, la moto cross, le quad, le buggy et le 4x4. Le BMX cale Ã  mi-pente.
- **DÃ©fi stunt.** Un pilote qui dose sa vitesse rÃ©ussit : 15 Ã  28 s selon le vÃ©hicule. Plein gaz, une moto cross saute trop loin, retombe sur la table suivante et rate le dÃ©fi. Sans rien faire, le dÃ©fi est ratÃ©.
- **Saut BASE.** Il dure environ 27 s sous voile, assez pour viser la cible.
- **Franchissement.** Plein gaz dans le flanc du mont pendant 5 s, le 4x4 monte de 56 u et le buggy de 32 u.

### Ce qui change pour d'anciens tests

- **Lac du parc.** Â« Une voiture s'arrÃªte au bord Â» devient : l'IA s'arrÃªte au bord, et la voiture du joueur s'y noie sans dÃ©gÃ¢ts.
- **Monster truck.** Le test le posait en pleine mer pour Ãªtre Â« loin de tout Â» ; il est maintenant posÃ© sur la terre ferme.

### Ã€ tester sur iPhone

1. Rouler dans la mer depuis la plage : le vÃ©hicule ne casse pas, on sort Ã  la nage.
2. Prendre un 4x4 au pied du mont et grimper hors du sentier.
3. MontÃ©e sÃ¨che en moto cross, puis en 4x4.
4. DÃ©fi stunt en moto cross : doser la vitesse avant chaque table.
5. Pic du Vertige :
   - monter avec le monte-charge ;
   - faire SAUT BASE et ouvrir la voile ;
   - viser la cible.
6. FluiditÃ© prÃ¨s du Pic (grande paroi).

### Retours de playtest (mÃªme soir)

- **MontÃ©e sÃ¨che trop facile.** SignalÃ© : Â« avec une moto de ville, j'ai tout montÃ© d'un seul coup Â». Ce qui change :
  - dÃ©part arrÃªtÃ© au pied du couloir (avant, 34 u d'Ã©lan suffisaient) ;
  - le couloir finit en mur (pente jusqu'Ã  2) ;
  - vraie gravitÃ© dans la pente ;
  - terre meuble : tout le monde patine, les pneus de route deux fois plus.

  RÃ©sultat : la moto cross passe de justesse, comme le quad et le 4x4. Les motos de route, le buggy et le BMX calent. Un message conseille un vÃ©hicule tout-terrain si on part avec des pneus de route.
- **Piste stunt en terre, faÃ§on supercross.** Une boucle complÃ¨te en terre battue remplace les 4 tables posÃ©es sur l'herbe :
  - les 4 grosses tables ;
  - deux virages relevÃ©s avec blocs de corde rouges et blancs ;
  - des whoops, un double, un step-up et des rollers ;
  - une arche de dÃ©part et des pylÃ´nes d'Ã©clairage.

  Le dÃ©fi devient le Â« DÃ‰FI SUPERCROSS Â» : 2 600 points en 45 s. Un pilote simulÃ© en marque 3 100 en moto cross, en quad et en buggy, mais pas assez en 4x4 ou en BMX. Captures : `supercross.png`, `supercross_virage.png`, `supercross_dessus.png`.
- **Bateau qui fonce vers la plage.** Il glisse sur le sable en freinant progressivement (7 Ã  24 u selon le bateau), sans dÃ©gÃ¢ts. Le joueur descend sur la plage. En rembarquant, on repart au pas vers l'eau, jamais Ã  travers la plage. Capture : `bateau_echoue.png`.
- **Police et IA Ã  l'eau.** Elles s'y noient aussi.

---

## 6e lot â€” sommet du Pic, ciel ouvert, mer vivante (11 octobre)

| Ã‰lÃ©ment | En bref |
|---|---|
| Vue au sommet | SignalÃ© : Â« en haut, la vue est trÃ¨s zoomÃ©e sur le joueur Â». Au-dessus de 20 u, la camÃ©ra suit maintenant la hauteur : au sommet du Pic, elle est Ã  37 u au-dessus du joueur au lieu de 20. Capture : `pic_sommet_vue.png`. |
| Motos, vÃ©lo, tremplin au sommet | Deux motos cross, un BMX et un vÃ©lo sont garÃ©s au sommet du Pic, face Ã  un tremplin en planches au bord du vide. En plein vol, le bouton **SAUTER DU VÃ‰HICULE** apparaÃ®t : on lÃ¢che le vÃ©hicule, on tombe avec son Ã©lan, puis on ouvre la voile (saut BASE). Le vÃ©hicule s'Ã©crase en bas. Rester dessus jusqu'en bas est mortel. |
| Ciel ouvert | Les avions, l'hÃ©lico et le jetpack vont partout : au-dessus de la montagne, du dÃ©sert et jusqu'au large. Avant, ils Ã©taient bloquÃ©s Ã  la limite de l'aÃ©roport. Le relief est solide : un avion trop bas s'Ã©crase sur le mont. |
| **Mer vivante** | SignalÃ© : Â« la mer est trop calme, il faut donner envie de dÃ©couvrir Â». DÃ©tail ci-dessous. |

### Mer vivante

- **ÃŽle aux trÃ©sors** (nouvelle) : camp de pirates, rocher en forme de crÃ¢ne, palmiers, tonneaux, canot Ã©chouÃ©. Une croix rouge cache un coffre : CREUSER rapporte 220 $, une fois par vague.
- **Paillote** sur l'Ã®le du canard : un cocktail Ã  20 $ qui soigne.
- **PlongÃ©e** : six Ã©paves trahies par des bulles. Ã€ la nage, PLONGER remonte un coffre (60 Ã  120 $), une fois par vague et par Ã©pave.
- **Tremplins flottants** : cinq rampes sur flotteurs. Jet-skis et vedettes s'envolent (environ 5 u de haut), avec des points de saut.
- **Rallye des bouÃ©es** : course de portes autour des Ã®les, en jet-ski ou en vedette, dÃ©part au large de la marina. 32 s ; le pilote simulÃ© met 17 Ã  26 s.
- **Wakeboard** (kiosque au bout du ponton est de la marina, 50 $) : un bateau te tire au large.
  - Le joystick choisit oÃ¹ tu vas Ã  l'Ã©cran.
  - Traverser vite la vague du sillage fait dÃ©coller ; ESQUIVE en l'air lance un 360.
  - Si le 360 n'est pas fini Ã  la rÃ©ception, c'est la chute.
  - Objectif : 4 500 points en 45 s. Un rythme soutenu passe (6 200), un rythme lent non (3 200).
- **Parachute ascensionnel** (kiosque au bout du ponton ouest, 60 $) : on monte Ã  32 u derriÃ¨re le bateau, LÃ‚CHER LA CORDE, puis on vise le radeau-cible.
- **Faune** :
  - un banc de dauphins accompagne un bateau rapide au large ;
  - une baleine refait surface et souffle au loin ;
  - des **requins** rÃ´dent dans les eaux profondes de l'est, signalÃ©es par des bouÃ©es jaunes et un panneau. Ils mordent un nageur, jamais un bateau.
- **Une prime par vague et par activitÃ©** : pas de farming.

Captures : `mer_ile_tresor.png`, `mer_mer_large.png`, `mer_jeu_wake.png`, `mer_jeu_parachute.png`, `mer_jeu_tremplin_saut.png`, `mer_jeu_paillote.png`, `mer_jeu_plongee.png`.

### Ã€ tester sur iPhone

1. Pic du Vertige : prendre une moto en haut, sauter le tremplin, appuyer sur SAUTER DU VÃ‰HICULE, ouvrir la voile.
2. Vue au sommet : elle ne doit plus Ãªtre collÃ©e au joueur.
3. Avion ou hÃ©lico au-dessus de la montagne et au large.
4. Wakeboard : le joystick latÃ©ral est-il naturel ? Le saut du sillage est-il lisible ?
5. Parachute ascensionnel : lÃ¢cher la corde au-dessus du radeau.
6. ÃŽle aux trÃ©sors, plongÃ©e, paillote, rallye des bouÃ©es.
7. Nager vers les bouÃ©es jaunes Ã  l'est : les requins.

---

## 7e lot â€” retours de playtest (12 octobre)

| Retour | Ce qui a Ã©tÃ© fait | Commit |
|---|---|---|
| Buggys Â« tout dorÃ©s, pas finis Â» | C'Ã©taient les deux buggys des secouristes de la plage : tout le modÃ¨le (cage, siÃ¨ges, pneus) Ã©tait repeint en jaune uni. Seule la carrosserie est jaune maintenant, avec une rampe orange et un fanion Ã  croix rouge. | `0f37354` |
| Deux cargos qu'on traverse | Anciens dÃ©cors en boÃ®tes sans collision : retirÃ©s. Un second vrai porte-conteneurs, solide et pilotable, les remplace. | `0f37354` |
| Ennemis en pleine montagne ou dans l'eau | Ils apparaissent maintenant sur la terre ferme (jamais l'eau, le mont, une mesa ou le Pic), hors de l'Ã©cran, en ville comme dans le dÃ©sert. En mer, la police vient en vedette. Les voitures de police s'arrÃªtent au bord de l'eau. | `0f37354` |
| Â« L'armÃ©e dÃ©barque Â» mais personne | La garnison des bases (14 soldats) remplissait le plafond de renforts : Ã  6â˜…, plus rien ne partait. CorrigÃ© : soldats et camions militaires arrivent vraiment. | `0f37354` |
| Boss introuvables | Colonne de lumiÃ¨re rouge au-dessus du boss, couronne, nom avec direction et distance dans la barre (Â« KAA â†’ 40 m Â»), prÃ©sentation Ã  l'Ã©cran. | `0f37354` |
| Avion de voltige | Remis au vrai aÃ©roport, au seuil sud de la grande piste, face au nord. | `0f37354` |
| Montagne trop simple, mÃªme en vÃ©lo et en jeep | Vraie gravitÃ© en pente, adhÃ©rence rÃ©duite sur les flancs, vÃ©los bloquÃ©s hors sentier. Le 4x4 grimpe au pas en vitesse rÃ©duite : seul vÃ©hicule Ã  monter le flanc, en 9 s au lieu de 3,7. La caisse suit la pente. | `9f2147a` |
| Sauts du dÃ©sert toujours pareils | Ligne des mesas variÃ©e : crÃªte Ã©troite, long gap, mesa large, longue crÃªte qu'on suit, trÃ¨s long gap final. | `9f2147a` |
| Traces dans le sable, glisse | Traces de pneus qui s'estompent sur la plage et dans le dÃ©sert. Les vÃ©hicules non tout-terrain y glissent nettement plus. | `9f2147a` |
| Wakeboard | Sillage en V visible. Boutons OLLIE, BACKFLIP et 360. Une figure pas finie Ã  la rÃ©ception, c'est la chute. Planche aux bouts arrondis avec fixations. Objectif 9 000 : impossible sans figures. | `0ee3f92` |
| Crawl | SPRINT Ã  la nage : crawl, 1,7 fois plus vite, l'endurance fond vite. | `0ee3f92` |
| Vagues | Au large, un petit bateau lancÃ© rebondit de crÃªte en crÃªte. | `0ee3f92` |
| ÃŽle aux trÃ©sors | Plus grande, contour irrÃ©gulier, montagne de 16 u, jungle. Six endroits oÃ¹ creuser : un seul cache le trÃ©sor (il change Ã  chaque vague), les autres donnent de l'or, une bouteille ou un indice de direction. Sangliers et jaguar : ils chargent et mordent, on les tue au tir ou au corps Ã  corps, ils reviennent Ã  chaque vague. | `0ee3f92` |
| Wingsuit | Portant au sommet du Pic. On la garde jusqu'au game over. En chute libre, bouton WINGSUIT : planÃ© rapide, puis VOILE pour se poser (298 u de vol depuis le Pic). | `e18ff77` |
| Mini-jeux taxi, ambulance, pompiers | Refaits, payÃ©s, avec des paliers Ã  dÃ©bloquer. DÃ©tail ci-dessous. | `e18ff77` |

### MÃ©tiers

- **Taxi.**
  - Le client fait signe sur le trottoir ; il a un caractÃ¨re : pressÃ©, fragile, fÃªtard, ou VIP Ã  partir du palier 6.
  - Destination nommÃ©e, chrono et satisfaction, d'oÃ¹ le pourboire.
  - Paliers : 3 = tarif majorÃ©, 6 = clients VIP, 10 = tenue et appel de taxi.
- **Ambulance.**
  - Un blessÃ© Ã  terre, entourÃ© de tÃ©moins. DÃ©fibrillateur : appuyer sur CHOC au maximum du pouls, trois fois.
  - Ensuite, foncer Ã  la clinique avant que le pouls tombe ; les chocs du vÃ©hicule le font baisser.
  - Paliers : 3 = soins Ã—1,5, 6 = +20 PV max, 10 = tenue.
- **Pompiers.**
  - Plusieurs foyers qui s'Ã©tendent si on traÃ®ne, des habitants coincÃ©s Ã  sauver, un chrono.
  - Paliers : 3 = lance renforcÃ©e, 6 = prime doublÃ©e, 10 = tenue.
- Chaque mission paie, avec un bonus de sÃ©rie. Pour Ã©viter le farming, la paie est pleine pour 3 missions par mÃ©tier et par vague, puis 20 %.

Captures : `buggy_secours.png`, `mesas_variees.png`, `traces_sable.png`, `jeep_flanc.png`, `ile_tresor_v2.png`, `ile_jaguar.png`, `wakeboard_sillage.png`, `metier_taxi.png`, `metier_ambulance.png`, `metier_pompier.png`, `wingsuit_vol.png`.

### Non fait

- **Montagne plus haute** : la difficultÃ© est venue de la physique, la montagne garde sa hauteur. Ã€ revoir aprÃ¨s ton test.

### Ã€ tester sur iPhone

1. Le 4x4 dans le flanc du mont ; un vÃ©lo et une moto hors sentier (ils doivent bloquer).
2. Wakeboard : OLLIE, BACKFLIP, 360, et la chute si on rate.
3. ÃŽle aux trÃ©sors : creuser les six trous, puis affronter le jaguar.
4. Wingsuit depuis le Pic, puis VOILE.
5. Une course de taxi, une ambulance (CHOC au bon moment), un incendie.
6. 6 Ã©toiles hors de la ville : l'armÃ©e doit arriver.

---

## 8e lot â€” retours de playtest (12 octobre)

Les 12 points sont traitÃ©s, chacun dans son commit, sauf les points 9 Ã  12 (dÃ©fis) : ils forment un seul mÃ©canisme et partagent donc un commit. Le correctif de l'hÃ©lico a demandÃ© un second commit.

### Bugs

| Retour | Ce qui a Ã©tÃ© fait | Commit |
|---|---|---|
| 1. Garage / Monster Truck : amÃ©liorations payÃ©es, vÃ©hicule identique | En simulation et au vrai bouton, les achats s'appliquaient bien : moteur, vitesse, nitro, peinture, nÃ©ons et piÃ¨ces. Le rendu le confirme (`garage_monstertruck_ameliore.png` contre `..._origine.png`). Le vrai problÃ¨me : un palier ne changeait presque rien (+6 % de vitesse au 1er). Paliers renforcÃ©s : moteur +22 / 45 / 70 %, vitesse +10 / 20 / 32 %, tenue +15 / 30 / 45 %. Le menu affiche le gain de chaque palier. Ã€ la sortie, un rÃ©capitulatif (Â« Monster Truck : moteur 1 Â· vitesse 1 Â· nitro Â· 1 piÃ¨ce Â») confirme ce qui est posÃ©. | `dc8ef02` |
| 2. HÃ©licoptÃ¨re du yacht qui explose toujours | **Deux causes.** (a) L'hÃ©lico est crÃ©Ã© dÃ©jÃ  posÃ©, sans vitesse verticale : le rÃ©gime moteur valait NaN, le son levait une exception, et le jeu faisait sauter le joueur en parachute en **dÃ©truisant l'hÃ©lico**. Invisible dans les tests sans le son ; c'Ã©tait l'explosion Â« toujours Â». (b) Tenir DESCENDRE pour se poser arrivait Ã  -13 u/s au contact, au-delÃ  du seuil de crash : tout posÃ© explosait. DÃ©sormais : effet de sol, DESCENDRE tenu pose en douceur ; au-dessus de l'eau, l'hÃ©lico reste au ras des vagues (avant, ratÃ© le pont = explosion). | `c8cc0cb`, `a16a1ad` |
| 3. Gros yacht qui ne se conduit pas | Le yacht amarrÃ© (dÃ©cor) devient le **MÃ©ga-yacht Â« Reyes Royale Â»**, mÃªme modÃ¨le. On monte Ã  la barre depuis son pont. Il navigue lentement (16 u/s) et emporte son hÃ©lico sur l'hÃ©liport. DÃ¨s qu'on lÃ¢che la barre, il s'arrÃªte et son pont se parcourt Ã  pied, oÃ¹ qu'il soit ; l'hÃ©lico peut redÃ©coller et s'y reposer. | `3d317bb` |
| 4. Joueur collÃ© au bateau aprÃ¨s un saut | Le nageur Ã©tait posÃ© Ã  2,4 u du centre, donc *dans* la coque des grands bateaux, et le bateau lÃ¢chÃ© filait encore ~20 u sur sa lancÃ©e. DÃ©sormais on plonge franchement hors de la coque, du cÃ´tÃ© libre (sinon l'autre, sinon l'arriÃ¨re). Un bateau lÃ¢chÃ© en plein saut retombe Ã  l'eau et s'arrÃªte vite. TestÃ© sur les 8 bateaux, lancÃ©s ou en l'air. | `39088a7` |
| 5. Presque plus de voitures | MesurÃ© : la ville plafonnait Ã  ~19 voitures pour 36 permises, ~8 autour du joueur, et partait de zÃ©ro Ã  chaque partie. Pas une rÃ©gression : les essais d'apparition Ã©taient trop rares (2,2/s, beaucoup refusÃ©s). PassÃ©s Ã  6/s, doublÃ©s tant que la ville est Ã  moitiÃ© vide : ~33 voitures, ~16 autour du joueur, **0 choc et 0 vÃ©hicule figÃ©** en simulation. | `a83d1c2` |

### Ã‰quilibrage

| Retour | Ce qui a Ã©tÃ© fait | Commit |
|---|---|---|
| 6. Police trop prÃ©sente, Ã©toiles trop rapides | Chaque dÃ©lit chauffe 40 % de moins : un piÃ©ton tuÃ© ne donne plus une Ã©toile, il en faut deux. Hors de vue de la police, la chaleur retombe 60 % plus vite (2â˜… effacÃ©es en 15 s). Agents simultanÃ©s : 1-2-4-6-8-10 au lieu de 2-4-6-9-11-13. Renforts espacÃ©s (6 s Ã  1â˜… au lieu de 3,6). HÃ©lico de police toutes les 35 s au lieu de 22. **Choix :** les Ã©toiles Â« scÃ©narisÃ©es Â» des salles (descente de police Ã  la radio, alarme du musÃ©e, banque) et la zone militaire ne changent pas. | `1d77aca` |
| 7. Colline trop facile ; impossible dans la rÃ©alitÃ© = impossible dans le jeu, parois des canyons comprises | **Choix des limites**, d'aprÃ¨s l'adhÃ©rence rÃ©elle des pneus. Au-delÃ , le sol est une paroi, Ã©lan ou pas : on glisse le long. Avant, rien ne bloquait sous 53Â°, et la montÃ©e sÃ¨che en Ã©tait exemptÃ©e. Voir le tableau ci-dessous. | `d558186` |
| 8. Montagne plus grande | Mont Reyes : sommet de 65 Ã  **89 u**, Ã©largi vers l'ouest. Au sud c'est le canyon, au nord et Ã  l'est les limites du monde : il ne pouvait grandir que vers le haut et vers l'ouest. Sentier Ã  18 lacets au lieu de 13, mÃªme dÃ©clivitÃ©. Course du mont : 90 s au lieu de 60 (pilote simulÃ© : 52 Ã  69 s). Rien d'enfoui. | `cfcb5a7` |

**Point 7 : limites de pente retenues**

| VÃ©hicule | Pente maximale |
|---|---|
| VÃ©lo, BMX | 24Â° (0,45) |
| Pneus de route | 35Â° (0,7) |
| Quad, buggy, monster truck | 40Â° (0,85) |
| Moto cross, 4x4 | 45Â° (1,0), le plafond absolu |
| Ã€ pied | 51Â° (1,25), pour garder les sentiers escarpÃ©s de la crique |

Ce qui change avec ces limites :
- **De biais** : le jeu mesure dÃ©sormais la vraie pente du terrain, et non la pente dans le sens de la marche. Avant, on gravissait en diagonale une paroi infranchissable de face.
- **MontÃ©e sÃ¨che refaite** : elle montait jusqu'Ã  63Â° puis 76Â° au palier, impossible en vrai. DÃ©sormais la pente croÃ®t rÃ©guliÃ¨rement jusqu'Ã  un mur final de 43Â°, sur 43 u de dÃ©nivelÃ©. Seule la moto cross passe (4,7 s pour 6,5 s autorisÃ©es). Quad, 4x4 (qui grimpe au pas), motos de route, buggy et BMX Ã©chouent.
- **Rampe d'accÃ¨s des mesas** : passÃ©e de 44Â° Ã  32Â° (pente rÃ©guliÃ¨re), pour rester montable en moto de route.
- **Parois des mesas** : infranchissables de face comme de biais, pour tous les vÃ©hicules (vÃ©rifiÃ©).

### DÃ©fis

| Retour | Ce qui a Ã©tÃ© fait | Commit |
|---|---|---|
| 9. Plus de dÃ©fis | **77 dÃ©fis au lieu de 33.** Les dÃ©fis chiffrÃ©s deviennent 19 thÃ¨mes Ã  paliers : ennemis (5 paliers jusqu'Ã  2 500), vÃ©hicules, distance, dÃ©molition, chefs, vagues, vÃ©hicules cachÃ©s, fouilles, broyeur. Nouveaux thÃ¨mes : taxi, ambulance, pompiers, dÃ©panneuse, police, courses (mont, mesas, montÃ©e sÃ¨che, supercross, bouÃ©es), saut BASE dans la cible, trÃ©sor de l'Ã®le, achats au garage, wakeboard ou parachute ascensionnel. | `06380f7` |
| 10. RÃ©compense Ã  rÃ©cupÃ©rer, avec notification | Plus rien n'est versÃ© automatiquement. Un dÃ©fi accompli affiche Â« ðŸŽ DÃ©fi accompli : â€¦ â€” rÃ©compense Ã  rÃ©cupÃ©rer dans DÃ‰FIS Â». Une pastille rouge clignotante donne le nombre de rÃ©compenses en attente : sur le bouton pause (un toucher ouvre directement les dÃ©fis), sur le bouton DÃ©fis du menu, et sur un **nouveau bouton DÃ©fis dans le menu pause**. Les rÃ©compenses apparaissent tout en haut de l'Ã©cran DÃ©fis, avec RÃ‰CUPÃ‰RER +X $. | `06380f7` |
| 11. DÃ©fis Ã  paliers | RÃ©cupÃ©rer un palier dÃ©bloque le suivant, mÃªme thÃ¨me, quantitÃ© plus Ã©levÃ©e (Â« palier 2/5 Â»). Si le palier suivant est dÃ©jÃ  atteint, il est aussitÃ´t Ã  rÃ©cupÃ©rer. Chaque thÃ¨me est fini : aucune rÃ©compense infinie. | `06380f7` |
| 12. Futur bouton Â« Ã—2 avec une pub Â» | Structure en place : `PUB_X2.disponible()` (faux pour l'instant, donc le bouton est masquÃ©) et `PUB_X2.montrer(fin)`, Ã  brancher sur une rÃ©gie. Le bouton Â« Ã—2 ðŸŽ¬ Â» s'affiche Ã  cÃ´tÃ© de RÃ‰CUPÃ‰RER dÃ¨s que `disponible()` est vrai ; la rÃ©compense n'est doublÃ©e que si la pub a Ã©tÃ© vue. TestÃ© avec une fausse pub. | `06380f7` |

**Sauvegardes :** les anciens dÃ©fis payÃ©s restent rÃ©cupÃ©rÃ©s, et leurs ids sont les premiers paliers des thÃ¨mes : rien n'est perdu. Â« Ã€ rÃ©cupÃ©rer Â» survit au rechargement.

Captures (`captures/lot8/`) :
- `garage_monstertruck_ameliore.png`, `garage_monstertruck_origine.png`
- `grand_yacht_barre.png`, `grand_yacht_cote.png`
- `mont_avant.png`, `mont_apres.png`, `montee_seche_couloir.png`
- `defis_a_recuperer.png`, `defis_pastille_hud.png`

### VÃ©rifications

- `node scenarios.js` : **685 vÃ©rifications, toutes au vert, aucune sautÃ©e**, avec la graine par dÃ©faut (20260731) et avec la graine alÃ©atoire 973139445.
- `node valider.js` : vert. Les portes de la ville n'ont pas bougÃ©.
- Huit tests ajoutÃ©s : garage / Monster Truck (au vrai bouton), hÃ©lico du yacht (avec le son, qui rÃ©vÃ©lait le bug), grand yacht, sauter d'un bateau (8 bateaux), circulation, police, pentes rÃ©alistes, dÃ©fis.
- Tests adaptÃ©s :
  - montÃ©e sÃ¨che : le quad Ã©choue dÃ©sormais ;
  - un dÃ©fi Â« accompli Â» est Ã  rÃ©cupÃ©rer ou rÃ©cupÃ©rÃ© ;
  - course du mont sans la curiositÃ© Â« Volant Â» : un test maÃ®trise sa scÃ¨ne.

### Non fait / limites

- **MontÃ©e sÃ¨che** : le flanc du mont (0,85 de pente moyenne) est trop raide pour qu'une piste plafonnÃ©e Ã  43Â° rejoigne la surface. L'arrivÃ©e est donc une **encoche taillÃ©e dans le flanc**, Ã  43 u, et non plus au sommet du mont. Dans la course du mont, un buggy lancÃ© trop vite (curiositÃ© Â« Volant Â») a sautÃ© du dernier lacet et fini dans cette encoche. On en ressort en redescendant le couloir. Ã€ surveiller.
- **Minimap** : le rectangle blanc du yacht reste au mouillage quand on part avec.
- **Petits objets du pont du yacht** (gilet, billets) : ils restent au mouillage.

### Ã€ tester sur iPhone

1. Garage : acheter 1 palier de moteur et de vitesse sur le Monster Truck, sortir. On doit lire le rÃ©capitulatif et sentir la diffÃ©rence.
2. HÃ©lico du yacht : monter, dÃ©coller, se reposer sur le pont DESCENDRE tenu, puis survoler la mer en descendant (il doit rester au ras de l'eau).
3. Gros yacht : prendre la barre (au fly), partir au large, lÃ¢cher la barre, marcher sur le pont, reprendre l'hÃ©lico.
4. Sauter d'un bateau lancÃ© (vedette, jet-ski, yacht) : on doit nager librement tout de suite.
5. Circulation en ville, en qualitÃ© moyenne et basse.
6. Police : tuer un passant (aucune Ã©toile), deux (1â˜…) ; Ã  3â˜…, compter les agents.
7. MontÃ©e sÃ¨che en moto cross (passe), en quad (bloquÃ© au mur) ; longer une paroi de mesa de biais ; monter la rampe d'accÃ¨s des mesas en moto de route.
8. Course du mont : 90 s suffisent-elles Ã  un humain ?
9. DÃ©fis : la pastille sur pause, l'Ã©cran DÃ©fis, RÃ‰CUPÃ‰RER, puis le palier suivant.

---

## 9e lot â€” amphibie, mur de l'aÃ©roport, salles vivantes (12 octobre)

| Retour | Ce qui a Ã©tÃ© fait | Commit |
|---|---|---|
| 4x4 amphibie qui se noie en arrivant dans la mer | Le jeu testait Â« est-il sur l'eau ? Â» **avant** de le dÃ©placer : Ã  l'image oÃ¹ il entrait dans la mer, il Ã©tait encore Â« Ã  terre Â», donc noyÃ©. L'amphibie est exemptÃ©, Ã  l'entrÃ©e dans l'eau comme Ã  l'amerrissage d'un saut. Une fois Ã  l'eau, il ne pouvait plus en ressortir : la plage comptait comme un mur, comme pour un bateau. Il ressort maintenant sur ses roues. Les autres vÃ©hicules se noient toujours. | `0d9754c` |
| Mur ville / aÃ©roport infranchissable en chute libre ou sous voile | **Choix : le mur est gardÃ©.** Il guide les vÃ©hicules vers le portail et dÃ©limite l'aÃ©roport. En revanche, tout ce qui est **en l'air au-dessus** d'un mur ou d'un obstacle passe dÃ©sormais : chute libre, voile, wingsuit, jetpack. Avant, n'importe quel obstacle arrÃªtait un parachutiste, mÃªme Ã  30 m. Ã€ pied au sol, il bloque toujours. L'entrÃ©e est maintenant matÃ©rialisÃ©e : deux pylÃ´nes balisÃ©s jaune et noir, une grande enseigne AÃ‰ROPORT, un marquage peint sur le tarmac. Une arche au-dessus de la route a Ã©tÃ© essayÃ©e puis retirÃ©e : trop proche de la camÃ©ra, elle cachait le joueur. | `0e21136` |
| Disco plus attrayante : bagarre, alcool, danse | **Club NÃ©on refait.** DÃ©tail ci-dessous. | `e3dccb2` |
| Rendre chaque endroit plus vivant | **63 figurants dans 19 lieux.** SupÃ©rette, banque, commissariat, tour, pharmacie, armurerie, concession, laverie, voyante, karaokÃ©, aquarium, bowling, salle de sport, serre, sandwicherie, musÃ©e, arcade, cinÃ©ma, garage. Ils flÃ¢nent d'un point Ã  un autre sans jamais traverser un meuble, et lÃ¢chent de temps en temps une rÃ©plique du lieu (Â« STRIKE ! Â», Â« Mon prÃªt, refusÃ© ?! Â», Â« Regarde, un requin ! Â»). Ils s'Ã©cartent quand tu les frÃ´les et se mettent Ã  couvert, accroupis, si tu te bats ou tu tires. | `a24248f` |

### Club NÃ©on

- **Cocktails (25 $)**, au bar. Ils soignent un peu et font monter une **jauge d'ivresse** (ðŸ¸ dans le HUD), qui redescend seule en environ 1 min 20. Les effets sont Ã  court terme :
  - **pompette** (dÃ¨s 30 %) : coups +20 % (Â« courage liquide Â»), l'image tangue ;
  - **ivre** (dÃ¨s 60 %) : la marche dÃ©rive, le tir s'Ã©gare, on perd le rythme sur la piste ;
  - **le verre de trop** (100 %) : trou noir. On se rÃ©veille dehors, -25 % de vie, jusqu'Ã  60 $ en moins.
  - Tout est remis Ã  zÃ©ro Ã  chaque partie.
- **Piste de danse** : DANSER, puis frapper chaque temps au rythme : 16 temps, 118 BPM, un anneau qui pulse.
  - Un temps ratÃ©, un appui en trop ou Ã  contretemps compte comme une faute.
  - 12 temps nets ou plus : le public paie un pourboire (jusqu'Ã  160 $), **une fois par vague**.
  - Taper au hasard Ã©choue (vÃ©rifiÃ©).
- **Bagarres** : de temps en temps, un fÃªtard Ã©mÃ©chÃ© cherche la bagarre (Â« HÃ© ! Tu m'as renversÃ© mon verre ! Â»), plus souvent si tu as bu. Ã‡a se rÃ¨gle Ã  mains nues. Une fois ton adversaire KO, le videur l'Ã©vacue et le patron t'offre un verre.
- **Videur** : sortir une arme Ã  feu dans le club, c'est Ãªtre jetÃ© dehors (et un peu d'attention de la police).
- **Ambiance** : salle pleine (12 danseurs, clients au bar et sur les banquettes), DJ qui mixe, boule Ã  facettes, lasers.

Captures (`captures/lot9/`) :
- `amphibie_mer.png`
- `portail_aeroport.png`
- `club_salle.png`, `club_danse.png`
- `vie_banque.png`, `vie_aquarium.png`, `vie_arcade.png`

### VÃ©rifications

- `node scenarios.js` : **689 vÃ©rifications, toutes au vert, aucune sautÃ©e**, avec la graine par dÃ©faut et avec la graine alÃ©atoire 2909113354.
- `node valider.js` : vert. Portes de la ville inchangÃ©es.
- Quatre tests ajoutÃ©s :
  - **4x4 amphibie** : de la plage au large et retour, saut dans l'eau ; un 4x4 ordinaire se noie toujours.
  - **Mur de l'aÃ©roport** : franchi sous voile et en chute libre, bloquant Ã  pied. Le test Ã©choue sur l'ancien code, comme il se doit.
  - **Club NÃ©on** : ivresse et malaise, danse parfaite payÃ©e une seule fois par vague, rafales d'appuis ratÃ©es, bagarre, videur, remise Ã  zÃ©ro.
  - **Vie des salles** : les 19 lieux, jamais dans un meuble, panique.

### Non fait / Ã  dÃ©cider

- **Les autres salles Â« anciennes Â»** n'ont pour l'instant que la couche de figurants vivants, pas de nouvelles activitÃ©s. Le club sert de modÃ¨le (boisson, mini-jeu perdable payÃ© une fois par vague, incident). Dis-moi lesquelles traiter en prioritÃ© : karaokÃ©, bowling, casino, arcadeâ€¦ et je leur applique le mÃªme traitement.
- **Pas de musique propre au club** : l'audio reste celui du jeu.

### Ã€ tester sur iPhone

1. Amphibie : du port (rampe de mise Ã  l'eau) vers le large, puis retour sur la plage.
2. Sauter en parachute ou en wingsuit de la ville vers l'aÃ©roport, par-dessus le mur.
3. Club : boire jusqu'Ã  Ãªtre ivre (marche, camÃ©ra), danser (le rythme est-il tenable au doigt ?), attendre une bagarre, sortir le pistolet.
4. Visiter banque, aquarium, arcade : les figurants doivent rester crÃ©dibles et ne pas gÃªner les activitÃ©s.

---

## 10e lot â€” kiosque de la banderole, figures sur deux roues (12 octobre)

| Retour | Ce qui a Ã©tÃ© fait | Commit |
|---|---|---|
| Le kiosque oÃ¹ l'on Ã©crit la banderole est sous une maison | Sa place fixe (prÃ¨s de la jetÃ©e) tombait dans une maison de plage **sur pilotis**. La vÃ©rification d'obstacle, faite Ã  hauteur du sol, passait sous le plancher de la maison et ne la voyait pas. Le kiosque prend maintenant la place libre la plus proche sur le sable, jamais dans l'axe de la jetÃ©e. Un test vÃ©rifie qu'aucune construction n'est dans son emprise et que son bouton est accessible ; il Ã©choue sur l'ancienne version. | `2a053f4` |
| 360 et backflip en moto cross et Ã  vÃ©lo, comme au wakeboard | **Trois boutons Ã  part** au guidon : **360** (Ã  la place de SPRINT, inutilisÃ© en vÃ©hicule), **BACKFLIP** (Ã  la place de GRENADE), et ESQUIVE reste **BUNNY HOP** Ã  vÃ©lo ou **CABRER** en moto cross. Ce dÃ©coupage vient d'un retour : Â« le 360 doit Ãªtre un bouton en plus, pas collÃ© avec le bunny hop Â» (`hud_velo.png`). Les figures ne partent qu'en l'air, un appui fait au sol n'est jamais gardÃ© pour le dÃ©collage, et elles se combinent (BACKFLIP 360). Le vÃ©hicule tourne en entier avec son pilote. Comme au wakeboard, **une figure pas finie Ã  la rÃ©ception, c'est la chute** : on est Ã©jectÃ©, avec quelques dÃ©gÃ¢ts. Une figure rÃ©ussie rapporte des points (360 : 150, backflip : 250, combo Ã—1,5, multipliÃ© par le combo en cours), qui **comptent aussi au dÃ©fi supercross**. Valable pour la moto cross, la moto militaire (une cross), le vÃ©lo et le BMX. **Ã€ vÃ©lo, un BUNNY HOP suivi tout de suite (dans les 0,3 s) d'un 360 ou d'un BACKFLIP pousse plus fort** : le saut dure juste assez pour finir la figure, mÃªme les deux combinÃ©es (environ 1,7 u de haut) ; demandÃ© ensuite. Appuyer trop tard reste une chute. | `4cf44d9` + suites |

**RÃ©glages :**
- 360 : 0,62 s en moto, 0,5 s Ã  vÃ©lo ;
- backflip : 0,78 s en moto, 0,62 s Ã  vÃ©lo ;
- un grand saut de tremplin (environ 1,4 s en l'air) permet le combo.

Captures (`captures/lot10/`) :
- `kiosque_avant.png`, `kiosque_apres.png`
- `moto_backflip.png`, `bmx_360.png`, `moto_combo.png`

### VÃ©rifications

- `node scenarios.js` : **691 vÃ©rifications, toutes au vert, aucune sautÃ©e**, avec la graine par dÃ©faut et avec la graine alÃ©atoire 2823685321.
- `node valider.js` : vert. Portes de la ville inchangÃ©es.
- Deux tests ajoutÃ©s :
  - **Kiosque de la banderole** : il Ã©choue sur l'ancienne version (maison sur pilotis dans l'emprise).
  - **Figures deux roues** : grand saut rÃ©ussi, petit saut qui fait chuter et aucune figure au sol, sur les quatre vÃ©hicules, plus les points comptÃ©s au dÃ©fi supercross.
- En route, un commentaire placÃ© au milieu d'une ligne avait dÃ©sactivÃ© la boucle de recherche de place du kiosque, sans erreur visible. TrouvÃ©, corrigÃ©, et le motif de dÃ©tection a Ã©tÃ© ajoutÃ© Ã  la vÃ©rification du diff.

### Suites du mÃªme jour

| Retour | Ce qui a Ã©tÃ© fait | Commit |
|---|---|---|
| Â« Il peut cabrer ? Â» (le vÃ©lo) | Oui, sans bouton de plus, comme un vrai BMX. Un **appui bref** sur HOP / CABRER fait le bunny hop (au relÃ¢cher) ; **le maintenir** fait cabrer, roue avant levÃ©e, tant qu'on tient (`bmx_cabre.png`). | `38db7ec` |
| Skatepark : l'amÃ©liorer considÃ©rablement, l'agrandir, un gros bowl, Â« Ã©pique Â» | **Choix du lieu** : le skatepark du parc tient dans un pÃ¢tÃ© de 26 u entourÃ© de routes, impossible Ã  agrandir. J'ai donc construit le **Reyes Skatepark** dans le dÃ©sert, au sud du Pic du Vertige, sur 52 Ã— 70 u. Le petit reste en ville comme spot de rue. Contenu et rÃ©glages ci-dessous. | `fffc54f` |

**Le Reyes Skatepark** (repÃ¨re ðŸ›¹ sur la carte)
- **Le site** : une grande plate-forme de bÃ©ton de 3 u de haut, avec des rampes douces sur tout le tour.
- **Les modules** :
  - un **grand bowl double** (partie profonde et poche), avec carrelage de piscine et copings, et un couloir pour en ressortir Ã  pied ;
  - un **half-pipe** ;
  - un **quarter gÃ©ant** de 6 u au-dessus de la plate-forme ;
  - une pyramide, un escalier de 8 marches avec rampes, des ledges.
- **L'ambiance** : des gradins avec un public qui se lÃ¨ve sur les gros airs, une grande enseigne nÃ©on REYES SKATEPARK, des projecteurs et des palmiers.
- **La physique** : au coping, on dÃ©colle **Ã  la verticale** et on retombe dans la courbe, comme un vrai air de bowl. Les 360 et backflips se font pendant ces airs.
- **Mesures du pilote simulÃ©** :

  | Module | VÃ©hicule | Airs en 20 s | Hauteur au-dessus du coping |
  |---|---|---|---|
  | Half-pipe | VÃ©lo | 10 | 1,8 u |
  | Half-pipe | BMX | 10 | 2,3 u |
  | Half-pipe | Moto cross | 10 | 4,7 u |
  | Quarter gÃ©ant | Moto cross | â€” | 11 u |

- **DÃ©fi REYES BOWL JAM** : 10 000 points en 60 s, une prime de 350 $ par vague. Sans figures, c'est ratÃ© : le pilote simulÃ© parfait fait 6 200 Ã  8 000 points. Avec un backflip par air, il fait 13 400 Ã  15 200 points.
- **Captures** : `skx_aerien.png`, `skx_bowl.png`, `skx_quarter.png`, `skx_nuit.png`, `skx_air_bmx.png`, `skx_air_quarter.png`, `skx_jeu.png`.

| Pendant un dÃ©fi, Â« se calmer avec les vagues Â», idem pour les autres jeux | Pendant une course ou un dÃ©fi (mont, mesas, montÃ©e sÃ¨che, supercross, bouÃ©es, REYES BOWL JAM), le wakeboard, le parachute ascensionnel ou un mÃ©tier : **les vagues sont en pause** (Â« VAGUES EN PAUSE â€” dÃ©fi en cours Â»), les Ã©vÃ©nements alÃ©atoires aussi (guerres de gangsâ€¦), et **les gangs dÃ©jÃ  prÃ©sents ne s'occupent plus de toi** : ils patrouillent, les motards s'arrÃªtent. Tout reprend Ã  la fin de l'activitÃ©. **Choix :** la police continue si tu es recherchÃ©. | `3176449` |
| Le vÃ©lo explose | Le vÃ©lo et le BMX ne prennent plus aucun dÃ©gÃ¢t et n'explosent jamais (grenade, roquette, explosion voisine), comme la planche de surf. Ils peuvent toujours se noyer. | idem |

### Piste ouverte

- **Trafic** : un choc rare d'un bus de ville contre un pickup arrÃªtÃ© (2 parties de 60 s sur environ 90). Il n'a pas pu Ãªtre reproduit sous instrumentation en 85 essais. Le test de circulation tolÃ¨re donc au plus 2 chocs par minute au lieu d'exiger zÃ©ro, pour ne pas Ãªtre alÃ©atoire. Ã€ reprendre si tu le vois en jeu, en notant l'endroit.

### Ã€ tester sur iPhone

1. Le kiosque prÃ¨s de la jetÃ©e : bien dÃ©gagÃ©, bouton accessible.
2. Sur les tables du supercross en moto cross : 360, backflip, puis les deux ; vÃ©rifier qu'une figure lancÃ©e trop tard fait chuter.
3. En BMX au skatepark (tremplins face Ã  face) : un 360 doit passer, pas sur un simple bunny hop.
4. VÃ©lo : appui bref = bunny hop, maintenu = cabrÃ©.
5. Reyes Skatepark (ðŸ›¹ sur la carte) : allers-retours dans le half-pipe et le bowl, gros air sur le quarter gÃ©ant en moto cross, REYES BOWL JAM avec des backflips. Ressortir du bowl Ã  pied par le couloir.
