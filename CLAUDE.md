# ASPHALTE — contexte projet

Jeu d'action arcade urbain 3D, vue de dessus, **fichier HTML unique** (`index.html`).
Cible : navigateur mobile en portrait 9:16, iPhone en priorité (Safari + écran d'accueil).
Three.js **r128** chargé depuis CDN — ne pas monter de version, plusieurs API utilisées
ici ont changé après r128 (`Geometry`, `THREE.CapsuleGeometry` absent, etc.).

Ville fictive : **Solara City**. Gangs : les **Vipères** et les **Frelons**.

---

## Règles de travail

1. **Édition ciblée uniquement.** Le fichier fait ~9 400 lignes / 470 Ko.
   Ne jamais le régénérer en entier. Localiser la section, modifier le passage concerné.
2. **Toujours valider avant de dire que c'est fini.** Voir « Validation » plus bas.
   Ne pas supposer qu'un code Three.js fonctionne : le vérifier.
3. **Commiter après chaque modif qui marche.** `git add -A && git commit -m "..."`.
4. **Français partout** : noms de variables, commentaires, textes du jeu, réponses.
5. **Pas de dépendance externe nouvelle.** Tout est synthétisé ou procédural :
   l'audio est en WebAudio pur, aucun fichier son ni texture externe.
6. **Un seul fichier.** Ne pas découper en modules sans demande explicite.

---

## Carte du fichier

Les grandes sections sont délimitées par des bandeaux `/* ===== TITRE ===== */`.
Pour se repérer : `grep -n "^/\* =\{10,\}" index.html`

| Ligne ~ | Section |
|---|---|
| 1–445 | `<head>`, CSS, HUD, écrans (menu, game over, panneaux) |
| 446 | chargement Three.js r128 |
| 504 | AUDIO — WebAudio synthétisé, boîte de vitesses simulée |
| 741 | ENTRÉES — joystick virtuel, boutons tactiles, clavier ZQSD/WASD |
| 810 | MÉTA-PROGRESSION — `META`, défis, sauvegarde |
| 903 | CURIOSITÉS — tableau `CURIOS` |
| 1160 | THREE.JS — rendu, scène, lumières |
| 1411 | VILLE DE SOLARA — génération procédurale par quartiers |
| 2600 | placement des PORTES (voir « Portes » ci-dessous) |
| 2936 | MODÈLES — humains, armes, véhicules, hélico, ramassables |
| 3339 | POOLS — balles, particules, textes flottants, traces de pneus |
| 3636 | ÉTAT GLOBAL + JOUEUR (`P`) |
| 4110 | VÉHICULES — physique arcade, trafic, dégâts |
| 4777 | PIÉTONS |
| 4904 | ENNEMIS — gangs, police, armée, motards, hélico, boss |
| 5371 | NIVEAU DE RECHERCHE (étoiles) |
| 5605 | VAGUES + bonus de fin de vague |
| 5696 | MISSIONS COURTES |
| 5699 | BÂTIMENTS VISITABLES — intérieurs |
| 5768 | FOUILLE — mécanique générique |
| ~6300 | définitions des 18 salles (`INTDEFS`) |
| 7657 | ÉCRANS / MENUS / BOUTIQUES |
| 7871 | CASINO — machines à sous, blackjack, vidéo-poker, roue |
| 8326 | DÉBUT / FIN DE PARTIE |
| 9090 | JOUR/NUIT, CAMÉRA, HUD, MINIMAP |
| 9240 | BOUCLE PRINCIPALE |

---

## Conventions et pièges connus

### Portes et placement des lieux (~L2600)
La grille de quartiers est **déterministe**. On vise donc une **case précise** via
le helper `caseCentre(bx,bz)`, **jamais un décalage relatif à un POI** — les offsets
relatifs provoquaient une dérive de quartier (un lieu censé être au port finissait
en résidentiel).

```js
const cLav = caseCentre(9,3);   // quartier commerçant
poser('laverie', cLav.x, cLav.z, 'LAVERIE 24H', 0x8ad2ff);
```

`placeLibrePorte()` trouve ensuite la façade dégagée la plus proche.
Un **filet de sécurité en spirale** (tableau `REPLIS`) garantit qu'aucun lieu
spécial ne reste inaccessible. Toute nouvelle salle doit être ajoutée à `REPLIS`.

### Intérieurs (~L5699)
Les salles sont construites **très loin de la ville** : `const IOFF = -9000`.
Chaque salle occupe une tranche de 400 unités : `ox = IOFF + nbSalles*400`.
Rien de la ville ne doit être visible depuis un intérieur. `construireSalle(id)`
est paresseux — la salle n'est bâtie qu'à la première entrée, puis mise en cache
dans `INT.salles`.

### Merge de géométries
Le merge des bâtiments **doit** se terminer par `finaliserMerge()`, sinon tous les
bâtiments sont invisibles. Bug déjà rencontré, ne pas le réintroduire.

### Ordre de déclaration
Bug déjà rencontré : `matsToitsPlats` utilisé avant sa définition → plantage au
lancement. Vérifier l'ordre des `const` au niveau module.

### Accès non gardés
Bug déjà rencontré : crash moto/hélico sur `e.h` non gardé. Toujours garder les
accès aux propriétés optionnelles des entités.

### Performance mobile
- HUD : cache DOM via l'objet `HUDC`, jamais de `getElementById` par frame.
- Boucles explicites plutôt que `filter`/`some`/`map` dans le `tick` — pas
  d'allocation par frame.
- LOD d'animation pour les ennemis lointains.

---

## Sauvegarde

Clé : `asphalte_save_v1`. Objet persisté : `META`.

- `sauveMeta()` — écrit, dans un `try/catch` silencieux
- `chargeMeta()` — lit avec **deep-merge prudent** : ne jamais écraser une
  structure `META` par un vieux JSON incomplet, toujours fusionner champ par champ.
  Ajouter un champ à `META` ne doit pas casser les sauvegardes existantes.
- `META.curios` — dictionnaire des curiosités obtenues
- `META.fouilles` — compteur de caches fouillées

---

## Curiosités (`CURIOS`, ~L903)

14 entrées, **9 actives** (`actif:true`), les autres affichées en silhouettes
verrouillées dans le cabinet de la planque. Chacune se mérite **en comprenant le
lieu, jamais par tirage au sort**. Les effets sont petits, permanents et cumulables.

Actives : Chaussette (laverie) · Boule Fissurée (voyance) · Disque de Platine
(karaoké) · Perle Noire (aquarium) · Boule Comète (bowling) · Haltère Enclume
(sport) · Étoile de Solara (serre) · Ceinture de Champion (sandwichs).

Réunir toutes les curiosités actives débloque `batte2`.
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
- **Vérifier l'accessibilité des boutons.** Le bouton du défi Monstre chevauchait
  la zone de SORTIE et était inatteignable.
- **Cadences de tap réalistes.** Modéliser le rythme de tap humain avant de fixer
  un seuil (la barre de 150 kg exigeait un rythme impossible à tenir).

---

## Joueur (`P`, ~L3644)

`P.stamMax` est la source de vérité pour l'endurance — **jamais 100 en dur**.
`P.stamMax = 100 + 12*mus` où `mus` est le palier de muscle.

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

Scénarios à couvrir pour toute modif de salle : tentative de farming, abandon en
plein minijeu, mort pendant un défi, balayage de tous les boutons cliquables
(non-régression), rechargement après sauvegarde.

---

## Développement en cours

- Serveur local : `npx live-server` dans le dossier du projet
- Test sur iPhone : Safari → adresse `192.168.x.x:8080` → Partager → Sur l'écran
  d'accueil (plein écran, safe-areas réelles)
- Console mobile : `eruda` injecté dans le `<head>` **en phase de dev seulement**,
  à retirer avant toute version diffusée
- Packaging natif iOS : nécessitera un Mac + Xcode (Capacitor / WKWebView).
  Non bloquant : Safari en écran d'accueil utilise déjà WebKit, donc le rendu et
  les perfs observés sont représentatifs.
