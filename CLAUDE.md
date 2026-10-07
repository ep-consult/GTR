# ASPHALTE — contexte projet

Jeu d'action arcade urbain 3D, vue de dessus, **fichier HTML unique** (`index.html`).
Cible : navigateur mobile en portrait 9:16, iPhone en priorité (Safari + écran d'accueil).
Three.js **r128** chargé depuis CDN — ne pas monter de version, plusieurs API utilisées
ici ont changé après r128 (`Geometry`, `THREE.CapsuleGeometry` absent, etc.).

Ville fictive : **Solara City**. Gangs : les **Vipères** et les **Frelons**.

---

## Règles de travail

1. **Édition ciblée uniquement.** Le fichier fait **~19 600 lignes / 1,03 Mo**.
   Ne jamais le régénérer en entier, ni le relire en entier « pour voir » : localiser
   la section via la carte ci-dessous, lire la tranche concernée, modifier ce passage.
2. **Toujours valider avant de dire que c'est fini.** Voir « Validation » plus bas.
   Ne pas supposer qu'un code Three.js fonctionne : le vérifier.
3. **Commiter après chaque modif qui marche.** `git add -A && git commit -m "..."`.
4. **Français partout** : noms de variables, commentaires, textes du jeu, réponses.
5. **Pas de dépendance externe nouvelle.** Tout est synthétisé ou procédural :
   l'audio est en WebAudio pur, aucun fichier son ni texture externe.
6. **Un seul fichier.** Ne pas découper en modules sans demande explicite.
7. **Tenir cette carte à jour.** Toute modif qui déplace des centaines de lignes
   périme les numéros ci-dessous. Les régénérer et corriger ce fichier dans le
   même commit (commande au début de la section suivante).

---

## Carte du fichier

Les grandes sections sont délimitées par des bandeaux `/* ===== TITRE ===== */`.
Pour régénérer cette table :

```bash
grep -n "^/\* =\{10,\}" index.html | while IFS=: read ln _; do \
  echo "$ln | $(sed -n "$((ln+1))p" index.html | sed 's/^[ \t]*//')"; done
```

**Relevé au 7 octobre 2026 — 19 622 lignes.**

| Ligne | Section |
|---|---|
| 1–666 | `<head>`, CSS, HUD, écrans (menu, game over, panneaux) |
| 643–645 | **eruda** (console mobile de dev — à retirer avant diffusion) |
| 646 | chargement Three.js r128 depuis CDN |
| 653 | handler `window.onerror` → affichage dans `#errBox` |
| 667 | en-tête ASPHALTE, début du code du jeu |
| 708 | AUDIO — WebAudio synthétisé, boîte de vitesses simulée |
| 1229 | ENTRÉES — joystick virtuel, boutons tactiles, clavier ZQSD/WASD |
| 1536 | MÉTA-PROGRESSION — `META`, défis, sauvegarde |
| 2164 | THREE.JS — rendu, scène, lumières |
| 2441 | VILLE DE SOLARA — génération procédurale par quartiers |
| 4666 | MODÈLES — humains, armes, véhicules, hélico, ramassables |
| 5675 | POOLS — balles, particules, textes flottants, traces de pneus |
| 6033 | ÉTAT GLOBAL + JOUEUR (`P`) |
| 6747 | VÉHICULES — physique arcade, trafic, dégâts |
| 8756 | PIÉTONS |
| 8908 | ENNEMIS — gangs, police, armée, motards, hélico, boss |
| 9444 | **RAYON TRACTEUR DE L'OVNI** |
| 9840 | NIVEAU DE RECHERCHE (étoiles) |
| 10085 | VAGUES + bonus de fin de vague |
| 10204 | MISSIONS COURTES |
| 10207 | BÂTIMENTS VISITABLES — intérieurs |
| 10277 | FOUILLE — mécanique générique |
| 10858 | PALAIS DE L'ARCADE — bornes, tickets, tableau des scores |
| 14776 | CINÉ-PALACE |
| 14837 | MÉTRO ABANDONNÉ |
| 14903 | RADIO PIRATE SOLARA FM |
| 15008 | LE CHALUTIER « SAINTE-ODILE » |
| 15281 | SITE 51 |
| 15511 | LE DÉPÔT DE BUS — courses clandestines |
| 16520 | **MÉTIERS** — missions liées à un véhicule |
| 16751 | ÉCRANS / MENUS / BOUTIQUES |
| 17018 | CASINO — machines à sous, blackjack, vidéo-poker, roue |
| 17743 | DÉBUT / FIN DE PARTIE |
| 19127 | JOUR/NUIT, CAMÉRA, HUD, MINIMAP |
| 19504 | BOUCLE PRINCIPALE |

### Ancres fines (hors bandeaux)

| Ligne | Repère |
|---|---|
| 1719 | `CURIOS` — tableau des curiosités |
| 1770 | `CURIOS_ACTIVES` |
| 1784 | déblocage de `batte2` (toutes curiosités actives réunies) |
| 2591 | `finaliserMerge()` |
| 3989 | `placeLibrePorte()` |
| 4048 | helper `poser()` — placement des lieux |
| 4074 | `caseCentre(bx,bz)` |
| 4159 | `REPLIS` — filet de sécurité en spirale |
| 6041 | `const P` — état du joueur |
| 6079 | `P.stamMax = 100 + 12*mus` |
| 10213 | `IOFF = -9000` |
| 11935 | `INTDEFS` — définitions des **26 salles** |
| 12106 | `construireSalle(id)` |
| 16529 | `METIERS_CIBLE` |

---

## Conventions et pièges connus

### Portes et placement des lieux (~L3989–4200)
La grille de quartiers est **déterministe**. On vise donc une **case précise** via
le helper `caseCentre(bx,bz)`, **jamais un décalage relatif à un POI** — les offsets
relatifs provoquaient une dérive de quartier (un lieu censé être au port finissait
en résidentiel).

```js
const cLav = caseCentre(9,3);   // quartier commerçant
poser('laverie', cLav.x, cLav.z, 'LAVERIE 24H', 0x8ad2ff);
```

`placeLibrePorte()` trouve ensuite la façade dégagée la plus proche.
Un **filet de sécurité en spirale** (tableau `REPLIS`, ~L4159) garantit qu'aucun lieu
spécial ne reste inaccessible. Toute nouvelle salle doit être ajoutée à `REPLIS`.

### Intérieurs (~L10207)
Les salles sont construites **très loin de la ville** : `const IOFF = -9000` (~L10213).
Chaque salle occupe une tranche de 400 unités : `ox = IOFF + nbSalles*400`.
Rien de la ville ne doit être visible depuis un intérieur. `construireSalle(id)`
(~L12106) est paresseux — la salle n'est bâtie qu'à la première entrée, puis mise
en cache dans `INT.salles`.

### Zones interactives et SORTIE
Une zone interactive doit se tenir à **au moins 8 unités** du centre de la zone
SORTIE (rayon 3,00, et elle gagne toutes les chaînes `if / else if`). Bug déjà
rencontré : le bouton du défi Monstre chevauchait la SORTIE et était inatteignable.

### Merge de géométries
Le merge des bâtiments **doit** se terminer par `finaliserMerge()` (~L2591), sinon
tous les bâtiments sont invisibles. Bug déjà rencontré, ne pas le réintroduire.

### Ordre de déclaration
Bug déjà rencontré : `matsToitsPlats` utilisé avant sa définition → plantage au
lancement. Vérifier l'ordre des `const` au niveau module.

### Accès non gardés
Bug déjà rencontré : crash moto/hélico sur `e.h` non gardé. Toujours garder les
accès aux propriétés optionnelles des entités.

### Sons à la sortie
Les sons doivent être coupés dans **tous** les chemins de sortie, y compris
directement dans `mourir()`.

### Tests : ne jamais recopier une liste du jeu
Un test (`valider.js` ou `scenarios.js`) ne recopie jamais une liste du jeu
(salles, bornes, zones, curiosités...) dans son propre code. Il la **lit
depuis la source** (`INTDEFS`, `BORNES_ARCADE`, `zonesInterieurActives()`,
`CURIOS_ACTIVES`...). Ce motif a déjà provoqué trois angles morts silencieux :
une table de zones recopiée depuis `majAction`, une liste de salles dans un
test de réinitialisation, une liste de bornes dans le test du Jeton Doré.
Dans chaque cas le test continuait de passer au vert en ne vérifiant plus
rien dès que la liste réelle changeait.

**Un test de scénario maîtrise sa scène.** Il ne suppose jamais qu'une zone
est vide : il la vide. Bug déjà rencontré — le test du Broyeur échouait 3 fois
sur 100 parce qu'un véhicule de la ville traînait à portée du char et devenait
un 9e écrasement (`startRun()` gare des véhicules autour de `POIS.place`).
Motif en place dans `scenarios.js` : `viderVehiculesVille()` juste après
`startRun()`.

**Un test sauté doit être visible et compté dans le résumé.** Un test
silencieusement sauté par la graine est un angle mort qui passe au vert.
Dans `scenarios.js`, un saut passe par `saute(msg)`, jamais par `info()` :
il est listé nommément dans le résumé final.

### Bugs visuels
Un bug visuel se valide par un **rendu Three.js réel**, jamais par un test de
logique. Trop de régressions d'affichage passent au vert en logique pure.

### Performance mobile
- HUD : cache DOM via l'objet `HUDC`, jamais de `getElementById` par frame.
- Boucles explicites plutôt que `filter`/`some`/`map` dans le `tick` — pas
  d'allocation par frame.
- LOD d'animation pour les ennemis lointains.

---

## Rayon tracteur de l'OVNI (~L9444)

**Le faisceau translucide sous la coque (dans `makeVoiture`, ~L4959) est un simple
mesh d'habillage.** La capture réelle vit dans la section RAYON TRACTEUR — ne jamais
tester une collision contre ce cylindre, il ne décrit pas la zone de capture.

Tant que l'OVNI est piloté par le joueur **et** en vol, toute cible au sol dont le
centre entre dans le cône vertical est soulevée : montée progressive (jamais de
téléportation), rotation + oscillation pendant la montée, suspension stable qui
suit l'OVNI une fois en haut. Couper le rayon relâche tout : chute libre, dégâts
proportionnels à la hauteur, position de retombée toujours validée.

Chaque cible captée porte un flag **`captureOvni`** que *tout* le reste du jeu doit
respecter :

- IA coupée (`majPietons`, `majEnnemis`)
- plus de physique sol (`majVehicules`)
- invulnérable aux dégâts externes pendant le levage
  (`collisionBalle`, `majImpactPersonnages`, `exploserVehicule`) — ces systèmes
  testent une hauteur qui ignore l'altitude réelle d'une cible suspendue ; sans
  l'exemption, un tir ras du sol la traverserait « par en dessous » en la
  déclarant touchée à tort.

**Toute nouvelle entité au sol doit honorer `captureOvni`**, sinon elle continuera
de marcher dans le vide une fois soulevée.

---

## Métiers (~L16520)

Missions liées à un véhicule précis : Pompier (incendies), Taxi (courses + appel
rapide via `btnAppelTaxi`), Dépanneuse (remorquages), Ambulance (urgences),
Police (interpellations).

`METIERS_CIBLE` (= 10) réussites par métier débloquent un skin dédié
(`PERSOS.jax.skins`, gating dans `renderChars`).

Une mission **en cours** (`MET.x`) est simplement abandonnée en sortant du véhicule
ou à la mort. Seul le **compteur** (`META.metiers`, persistant) survit — exactement
comme `MISSION.cur`.

---

## Sauvegarde

Clé : `asphalte_save_v1`. Objet persisté : `META`.

- `sauveMeta()` — écrit, dans un `try/catch` silencieux
- `chargeMeta()` — lit avec **deep-merge prudent** : ne jamais écraser une
  structure `META` par un vieux JSON incomplet, toujours fusionner champ par champ.
  Ajouter un champ à `META` ne doit pas casser les sauvegardes existantes.
- `META.curios` — dictionnaire des curiosités obtenues
- `META.fouilles` — compteur de caches fouillées
- `META.metiers` — compteur de réussites par métier

---

## Curiosités (`CURIOS`, ~L1719)

**17 entrées, 16 actives** (`actif:true`). La seule inactive est *Les Plans du
Rhinocéros* (Bunker militaire), affichée en silhouette verrouillée dans le cabinet
de la planque.

Chacune se mérite **en comprenant le lieu, jamais par tirage au sort**. Les effets
sont petits, permanents et cumulables.

Actives : Chaussette Solitaire (laverie) · Boule Fissurée (voyance) · Disque de
Platine (karaoké) · Perle Noire (aquarium) · Boule « Comète » (bowling) · Micro
Vintage (Solara FM) · Haltère « Enclume » (sport) · Étoile de Solara (serre) ·
Ceinture de Champion (sandwichs) · Canard d'Or (musée) · Jeton Doré (arcade) ·
Bobine « ASPHALTE I » (ciné) · Plaque du Capitaine (Site 51) · Lampe de Mineur
(métro) · Boussole du Capitaine (chalutier) · Volant du Dépôt (dépôt de bus).

Réunir toutes les curiosités actives débloque `batte2` (~L1784).
Helpers : `aCurio(id)`, `nbCurios()`, `CURIOS_ACTIVES`.

---

## Règles de design des salles

Contraintes tirées de la passe de debug — à respecter pour toute nouvelle salle :

- **Pas de farming infini.** Toute activité rémunératrice a une limite par vague
  (le bowling est plafonné à 2 parties/vague après avoir été un exploit à argent).
- **Un minijeu doit être perdable.** Vérifier mathématiquement, pas à l'intuition
  (le système de nausée du Roi des Sandwichs était ingagnable-invulnérable au départ).
- **Réinitialiser l'état des minijeux au game over.** Un état de minijeu ne doit
  jamais survivre dans une nouvelle partie.
- **Récompense unique par validation.** La serre payait double quand un critère
  avait 4 plantes valides.
- **Un chemin de paiement porte SA PROPRE garde d'entrée.** Ne jamais compter
  sur l'exclusivité des appelants : elle disparaît au premier appelant ajouté.
  (Modèle : `if(!s.visiteEnCours) return;` en tête de `site51ConclureVisite`.)
- **Vérifier l'accessibilité des boutons.** Le bouton du défi Monstre chevauchait
  la zone de SORTIE et était inatteignable.
- **Cadences de tap réalistes.** Modéliser le rythme de tap humain avant de fixer
  un seuil (la barre de 150 kg exigeait un rythme impossible à tenir).

---

## Horloges : `dt` vs `dtJeu`

`boucle()` calcule deux horloges à partir du même temps réel écoulé :

- `dt` = temps réel × `ETAT.timeScale` — le spectacle : rendu, déplacement des
  entités, physique, particules, animations. Ralentit avec un effet de ralenti
  (chef de gang, curiosités qui jouent sur le combo...).
- `dtJeu` = temps réel, **jamais mis à l'échelle** — les compteurs que le
  joueur subit : chronos, jauges qui dérivent, minuteries.

**Le critère n'est pas « est-ce un compteur subi » mais « est-ce que ça se
joue contre quelque chose qui est déjà sur `dtJeu` ».** Un déplacement peut
sembler relever du spectacle (pas de jauge, pas de chrono explicite dessus)
et pourtant être exactement ce qui court contre un chrono — auquel cas il
doit partager l'horloge du chrono, pas celle du rendu.

Piège déjà rencontré : dans la salle du Chalutier, le bateau semblait pur
spectacle (juste une position virtuelle, jamais appliquée à un mesh) et avait
été laissé sur `dt`, alors que le chrono de sortie et la météo tournent sur
`dtJeu`. Un ralenti pendant une sortie ralentissait le bateau sans ralentir
le chrono : un retour qui aurait dû réussir pouvait échouer — une punition
arbitraire, pas un effet de ralenti cohérent. Corrigé en passant tout le
déplacement du bateau (cap, vitesse, position) sur `dtJeu`. Seul l'habillage
purement cosmétique sans effet sur l'issue (défilement de la texture d'eau,
animation des mouettes) reste sur `dt`.

Pour toute nouvelle salle avec un déplacement (bateau, plateforme, projectile
du joueur...) : si ce déplacement détermine si un chrono est battu ou non, il
va sur `dtJeu`, même sans jauge dédiée.

Le Site 51 et le Dépôt de Bus sont **intégralement sur `dtJeu`** — s'en inspirer
comme modèle de référence pour toute salle chronométrée.

Rappel transversal : **toutes les vitesses sont en unités par seconde**, jamais
en pixels par frame.

---

## Joueur (`P`, ~L6041)

`P.stamMax` est la source de vérité pour l'endurance — **jamais 100 en dur**.
`P.stamMax = 100 + 12*mus` (~L6079) où `mus` est le palier de muscle.

`appliqueMuscle(h)` met à l'échelle le torse (×1,57 au palier 3), les bras (×1,88),
les jambes (×1,36), le corps entier (×1,11), et rétrécit légèrement la tête.

---

## Validation

Avant de livrer une modif, valider avec la **vraie** librairie Three.js, pas en
supposant. Three.js r128 est installé via npm dans le projet.

```bash
node valider.js          # runtime simulé : charge le jeu, détecte les erreurs
node scenarios.js        # Puppeteer headless : scénarios de jeu réels
```

Les deux scripts sont **seedés par défaut** (mulberry32, graine `20260731`,
affichée en tête de run et rappelée dans le résumé en cas d'échec) :

```bash
SEED=12345 node scenarios.js    # rejoue un tirage précis
SEED=random node scenarios.js   # tirage libre — attrape les bugs dépendants du tirage
```

La graine fixe la ville (construite avant la 1re frame) ; les tirages faits
ensuite par `boucle()` dépendent du temps réel écoulé, d'où la règle « un test
maîtrise sa scène ». Avec la graine par défaut, toutes les vérifications qui
dépendent de la ville tournent. Deux tirages de butin (sommes rares de la
Radio et du Ciné) dépendent du temps réel et peuvent apparaître en SAUTÉ :
c'est connu. Tout autre saut listé dans le résumé est un angle mort, pas un
succès.

Scénarios à couvrir pour toute modif de salle : tentative de farming, abandon en
plein minijeu, mort pendant un défi, balayage de tous les boutons cliquables
(non-régression), rechargement après sauvegarde.

**Les scripts ne remplacent pas le test sur appareil.** Chaque salle testée sur
iPhone réel a révélé des bugs qu'aucun script n'avait vus. Le playtest manuel
reste obligatoire avant publication.

---

## Développement en cours

- Serveur local : `npx live-server --host=0.0.0.0 --port=8080` dans le dossier du projet
- Test sur iPhone : Safari → adresse `192.168.x.x:8080` → Partager → Sur l'écran
  d'accueil (plein écran, safe-areas réelles)
- Console mobile : `eruda` injecté dans le `<head>` (L643–645) **en phase de dev
  seulement**, à retirer avant toute version diffusée
- Packaging natif iOS : nécessitera un Mac + Xcode (Capacitor / WKWebView).
  Non bloquant : Safari en écran d'accueil utilise déjà WebKit, donc le rendu et
  les perfs observés sont représentatifs.

### Chantiers ouverts

1. **Passe de playtest systématique** sur toutes les salles existantes — priorité
   affirmée sur l'ajout de contenu neuf.
2. **Relais de logs iPhone** : hooker `console.error`, `window.onerror` et
   `unhandledrejection` et les POSTer vers un petit serveur Node local, pour lire
   les erreurs du device en direct dans le terminal. Architecture validée,
   **décision en suspens** : toujours actif, ou derrière un flag debug ?
   (Il existe déjà un handler `window.onerror` minimal → `#errBox`, L653.)
3. Publication mobile via wrapper Capacitor ou Cordova.
