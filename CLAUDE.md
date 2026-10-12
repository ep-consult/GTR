# GTRoyal — contexte projet

Jeu d'action arcade urbain 3D, vue de dessus, **fichier HTML unique** (`index.html`).
Cible : navigateur mobile en portrait 9:16, iPhone en priorité (Safari + écran d'accueil).
Three.js **r128** chargé depuis CDN — ne pas monter de version, plusieurs API utilisées
ici ont changé après r128 (`Geometry`, `THREE.CapsuleGeometry` absent, etc.).

Nom du jeu : **GTRoyal** — casse exacte et sacrée partout (« GTR » majuscules
collé à « oyal » minuscules, un seul mot ; toute autre casse ou graphie est
interdite, de même que toute référence à un autre jeu). Historique du renommage : `RENOMMAGE.md`.
Le logo de l'écran titre neutralise le `text-transform:uppercase` de `.titre`,
et garde une marge basse (`.2em`) pour la descendante du « y » — sans elle,
le « y » mordait sur « LOS REYES — CHAOS URBAIN » (vérifié par `scenarios.js`).

Ville fictive : **Los Reyes**. Gangs (noms AFFICHÉS → id interne inchangé,
couleurs inchangées) : **Sunset Vipers** (`viperes`, vert, quartier
industriel, premier rival, chef KAA), **Los Calaveras** (`frelons`, jaune et
noir, quartier néon, motards, chef EL DIABLO), **Dockside Boys** (`murenes`,
bleu-vert, port et plage, chef SILAS), **Krasnaya Brigada** (`chrome`, argent
et or, villas et centre, le gang riche, chef VOLKOV). Libellés dans
`NOMS_GANG` / `NOMS_GANG_DE` ; en réserve, non utilisés : Cedar Street
Familia, Jade Lotus.

**La clé de sauvegarde reste `asphalte_save_v1` VOLONTAIREMENT** (la changer
ferait perdre toutes les sauvegardes) ; les ids internes (`viperes`,
`frelons`, `murenes`, `chrome`, `vipere`…) ne sont jamais renommés.

---

## Règles de travail

1. **Édition ciblée uniquement.** Le fichier fait **~20 500 lignes / 1,08 Mo**.
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

**Relevé au 13 octobre 2026 (11e lot : chalutier, aquarium, laverie, serre, radio) — 27 160 lignes.**
Attention : `maj_carte` recale les numéros dans l'ordre des lignes de la table ;
un bandeau AJOUTÉ décale les libellés suivants — ajouter sa ligne à la main.

| Ligne | Section |
|---|---|
| 1–879 | `<head>`, CSS, HUD, écrans (menu, game over, panneaux) |
| 407–545 | **icônes SVG** : copie des 42 `<symbol>` de `icones/icones.svg` (générée, ne pas éditer) |
| 856–858 | **eruda** (console mobile de dev — à retirer avant diffusion) |
| 859 | chargement Three.js r128 depuis CDN |
| 864 | `<script id="gamejs">` + handler `window.onerror` → affichage dans `#errBox` |
| 880 | en-tête GTRoyal, début du code du jeu |
| 976 | AUDIO — WebAudio synthétisé, boîte de vitesses simulée |
| 1499 | ENTRÉES — joystick virtuel, boutons tactiles, clavier ZQSD/WASD |
| 1806 | MÉTA-PROGRESSION — `META`, défis, sauvegarde |
| 2554 | THREE.JS — rendu, scène, lumières |
| 2864 | VILLE DE LOS REYES — génération procédurale par quartiers |
| 8835 | MODÈLES — humains, armes, véhicules, hélico, ramassables |
| 10255 | POOLS — balles, particules, textes flottants, traces de pneus |
| 10615 | ÉTAT GLOBAL + JOUEUR (`P`) |
| 11439 | VÉHICULES — physique arcade, trafic, dégâts |
| 13908 | PIÉTONS |
| 14060 | ENNEMIS — gangs, police, armée, motards, hélico, boss |
| 14614 | **RAYON TRACTEUR DE L'OVNI** |
| 15010 | NIVEAU DE RECHERCHE (étoiles) |
| 15288 | VAGUES + bonus de fin de vague |
| 15410 | MISSIONS COURTES |
| 15413 | BÂTIMENTS VISITABLES — intérieurs |
| 15483 | FOUILLE — mécanique générique |
| 16047 | PALAIS DE L'ARCADE — bornes, tickets, tableau des scores |
| 20122 | **AQUARIUM** V2 — « 1, 2, 3… GASTON ! » (helpers `carteSalle`, `ligneCarte`) |
| 20325 | **LAVERIE** V2 — l'essorage de la machine 7 |
| 20460 | **SERRE** V2 — la nuit de la floraison |
| 20617 | CINÉ-PALACE |
| 20679 | MÉTRO ABANDONNÉ |
| 20745 | **RADIO PIRATE** V2 — le tuner, le brouilleur |
| 20985 | **LE CHALUTIER** V2 « SAINTE-ODILE » |
| 21702 | SITE 51 |
| 21932 | LE DÉPÔT DE BUS — courses clandestines |
| 22956 | **MÉTIERS** — missions liées à un véhicule |
| 23246 | **GARAGES TUNING** — prix, nitro, salle partagée, menu d'atelier |
| 24241 | ÉCRANS / MENUS / BOUTIQUES |
| 24509 | CASINO — machines à sous, blackjack, vidéo-poker, roue |
| 25306 | DÉBUT / FIN DE PARTIE |
| 26698 | JOUR/NUIT, CAMÉRA, HUD, MINIMAP |
| 27102 | BOUCLE PRINCIPALE |

### Ancres fines (hors bandeaux)

| Ligne | Repère |
|---|---|
| 902 | `ICONES_SVG` — interrupteur des icônes, `ico()`, `icoArme()`, `labelAction()` |
| 908 | `MER_V2` — interrupteur de la mer améliorée (false = mer d'avant à l'identique) |
| 915 | `DECOR_V2` — interrupteur du décor enrichi (voir « Décor V2 ») |
| 1814 | `GARAGES_TUNING` — les garages de la ville (déclarés avant `META`) |
| 1834 | `VEHPERSO_MAX` — taille de « Mes véhicules » (`META.vehPerso`) |
| 2064 | `fusionMeta()` — deep-merge de la sauvegarde, `DICOS_OUVERTS` juste avant |
| 2094 | `CURIOS` — tableau des curiosités |
| 2145 | `CURIOS_ACTIVES` |
| 2159 | déblocage de `batte2` (toutes curiosités actives réunies) |
| 2328 | `VEHDEFS` — véhicules, éligibilité garage (`tuningMeca`, `tuningCarro`) |
| 2896 | mer V2 : `houle()`/`houleY()`, shader (`merV2Materiau`), sillage, éclaboussures, `assietteHoule()` |
| 3204 | `finaliserMerge()` |
| 3750 | `mkLittoral()` — fondus sable/mer/désert, vagues sur le sable |
| 3805 | `mkHorsLesMurs()` — décor factice hors de l'enceinte |
| 3921 | `MOB_CAT` — catalogue du mobilier urbain, puis `mkMobilierUrbain()`, `majMobilier()`, `garerVelos()` |
| 4331 | `JETEE` — jetée de fête foraine : `ZONES_SANS_MOBILIER`, `mkJeteeForaine()`, `majJetee()` |
| 4462 | `SKATE` — skatepark : `mkSkatepark()`, `texMurSkate()` |
| 4542 | `SKX` — Reyes Skatepark XXL : `hauteurSkateXXL()`, `zoneVertSkate()`, `mkSkateXXL()`, `majSkateXXL()` |
| 4678 | `PORT` — port vivant : `mkPortVivant()`, `majPortVivant()` |
| 4777 | `BROOK` — Brooklyn : `texFresque()`, `mkBrooklyn()`, `majBrooklyn()` |
| 4898 | `CIEL` — dirigeable, avion à banderole, mouettes, feux d'artifice : `mkCiel()`, `majCiel()` |
| 5098 | `CRIQUE` — crique des plongeurs : `dansCrique()`, `mkCrique()`, `plongeonJoueur()` |
| 5274 | `NEON` — quartier néon : `BATIMENTS`, `reserverNeon()`, `mkNeonVivant()` |
| 5342 | `VILLA_PISC` — finitions de quartier : `mkQuartiersFinitions()` |
| 5419 | `MONT` — Mont Reyes, puis `CANYON` (canyons) et `RIDES` (courses) |
| 4084 | `SOLS` — dalles de sol enregistrées, puis `mkTransitionsSols()` (jonctions entre sols) |
| 6505 | `mkLacParc()` — lac du parc, passerelle, barques |
| 6634 | `mkLumieresQuartiers()` — Times Square, quartier chinois, Brooklyn |
| 6720 | `mkEnceinte()` — murs, enseigne, jetées de rochers |
| 7225 | `GALION` — galion échoué : `sansAleaVille()`, `coqueGalion()`, `mkGalion()`, `majGalion()` |
| 8036 | `mkPorteGarage()` — porte roulante des garages |
| 8106 | `placeLibrePorte()` |
| 8165 | helper `poser()` — placement des lieux |
| 8191 | `caseCentre(bx,bz)` |
| 8284 | `REPLIS` — filet de sécurité en spirale |
| 10146 | `makeVelo()` — vélo de ville et BMX |
| 7953 | `ENSEIGNES` — portes mieux placées : `ameliorerPortes()`, `profondeurDevant()`, `orienterPorte()` |
| 10623 | `const P` — état du joueur |
| 10661 | `P.stamMax = 100 + 12*mus` |
| 11747 | `resoudreCollisionsVehicule()` — collisions entre véhicules (SAT sur les 4 axes) |
| 12341 | `majRemorquage()` — accroche/remorquage (dépanneuse et treuil du garage) |
| 12465 | `boutonsAPied()` — boutons du HUD remis « à pied » (sortie de véhicule ET début de partie) |
| 13378 | `TRAFIC_*` — réglages du trafic, `horsEcran()`, `obstacleSurVoie()` |
| 13492 | `majTrafic()` — suivi de file, priorité au carrefour, contournement, filet anti-blocage |
| 15419 | `IOFF = -9000` |
| 17140 | `INTDEFS` — définitions des **27 salles** |
| 17320 | `construireSalle(id)` |
| 20390 | `CHALUTIER_BANCS_PLAN` — chalutier V2 ; `chalutierMaj` (20761), `dessinerRadarChalutier` (21018) |
| 22881 | `METIERS_CIBLE` |
| 23180 | `TUNING_PRIX` — tous les prix du garage, groupés (pièces comprises), puis `TUNING_CASSE_TAUX` |
| 23268 | `PIECES_FAMILLES` — catalogues de pièces par famille |
| 23569 | `garageCasser()` — après `garageEnregistrer`, `garageAcheter`, `garageChoisirVehicule` |
| 23623 | `libererObjet()` — libère les géométries d'un objet retiré |
| 23639 | `appliquerCarrosserie()` — passe d'ancrage des pièces |
| 23761 | `construireGarageTuning()` — la salle partagée |
| 24131 | `majNitro()` |

---

## Conventions et pièges connus

### Portes et placement des lieux (~L4049–4265)
La grille de quartiers est **déterministe**. On vise donc une **case précise** via
le helper `caseCentre(bx,bz)`, **jamais un décalage relatif à un POI** — les offsets
relatifs provoquaient une dérive de quartier (un lieu censé être au port finissait
en résidentiel).

```js
const cLav = caseCentre(9,3);   // quartier commerçant
poser('laverie', cLav.x, cLav.z, 'LAVERIE 24H', 0x8ad2ff);
```

`placeLibrePorte()` trouve ensuite la façade dégagée la plus proche.
Un **filet de sécurité en spirale** (tableau `REPLIS`, ~L4227) garantit qu'aucun lieu
spécial ne reste inaccessible. Toute nouvelle salle doit être ajoutée à `REPLIS`.
Une salle à **plusieurs portes** (les garages) y ajoute une entrée par porte, avec
un 4e élément (`garageId`) : la présence se vérifie alors porte par porte.

### Intérieurs (~L10300)
Les salles sont construites **très loin de la ville** : `const IOFF = -9000` (~L10306).
Chaque salle occupe une tranche de 400 unités : `ox = IOFF + nbSalles*400`.
Rien de la ville ne doit être visible depuis un intérieur. `construireSalle(id)`
(~L12208) est paresseux — la salle n'est bâtie qu'à la première entrée, puis mise
en cache dans `INT.salles`.

**Géométrie partagée.** Un lieu présent en plusieurs exemplaires en ville (les
garages) ne construit PAS N décors identiques sur N tranches : une seule entrée
`INTDEFS`, une seule tranche, et chaque porte porte un identifiant (`garageId`)
que la salle relit à l'entrée pour se reconfigurer (enseigne, accent, contenu).
Les champs internes d'une salle ne sont jamais des objets `{x,z}` sans rayon :
`zonesInterieurActives()` les prendrait pour une zone oubliée.

### Zones interactives et SORTIE
Une zone interactive doit se tenir à **au moins 8 unités** du centre de la zone
SORTIE (rayon 3,00, et elle gagne toutes les chaînes `if / else if`). Bug déjà
rencontré : le bouton du défi Monstre chevauchait la SORTIE et était inatteignable.

### Merge de géométries
Le merge des bâtiments **doit** se terminer par `finaliserMerge()` (~L2635), sinon
tous les bâtiments sont invisibles. Bug déjà rencontré, ne pas le réintroduire.

### Ordre de déclaration
Bug déjà rencontré : `matsToitsPlats` utilisé avant sa définition → plantage au
lancement. Vérifier l'ordre des `const` au niveau module.

### Accès non gardés
Bug déjà rencontré : crash moto/hélico sur `e.h` non gardé. Toujours garder les
accès aux propriétés optionnelles des entités.

### Sons à la sortie
Les sons doivent être coupés dans **tous** les chemins de sortie, y compris
directement dans `mourir()`. Piège (audit de nuit) : la boucle continue
`majInterieur` **pendant la mort** — une mise à jour d'ambiance du type
`if(!AUDIO.xxxOn) xxxStart()` relance alors le son que `mourir()` vient de
couper. Ces mises à jour sont gardées par `ETAT.mode!=='mort'`, et
`startRun()` coupe toutes les ambiances de salle par sécurité.

### Boutons réaffectés au volant
Au volant, ESQUIVE/GRENADE/SPRINT/FREIN changent de rôle (MISSILE, FLASH,
HUILE, TREUIL, LANCE...). Leur retour « à pied » passe par `boutonsAPied()`,
appelée par `sortirVehicule` **et** `startRun()` : mourir au volant ne passe
pas par `sortirVehicule` (bug : après l'OVNI, plus de `#grenN`, `startRun()`
plantait). Ne jamais lire `el('grenN')` sans être sûr qu'il existe.

### Bouton d'action
Un libellé trop long passe sur deux lignes (`labelAction`, classe
`deuxLignes`), jamais rogné par « … ». Vérifié par `scenarios.js` sur tous
les libellés statiques du source.

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

## Trafic (`majTrafic`, ~L8889)

Signalé en playtest : des files qui se rentraient dedans en permanence. Règles
en place, toutes vérifiées par simulation longue puis `scenarios.js` :

- **Suivi de file** : chaque véhicule cherche l'obstacle le plus proche dans
  SON couloir (recouvrement latéral réel, orientation comprise) et plafonne sa
  vitesse à `√(2·TRAFIC_DECEL·(écart − TRAFIC_ECART))` : arrêt garanti sans
  contact même si le meneur pile net. Jamais de sonde ponctuelle au contact
  (l'ancienne voyait le véhicule de devant à 0,6 u, le freinage en demandait
  5,6 : chocs à pleine vitesse, impulsions en chaîne).
- **Contournement** d'un obstacle immobile hors trafic (garé, abandonné par le
  joueur, épave) : décalage vers le centre de la chaussée juste assez pour
  passer, seulement si le passage est libre, tant qu'un obstacle occupe la voie
  à côté ou devant (`obstacleSurVoie`). Sans ça, la file restait figée pour
  toujours.
- **Priorité au carrefour**, au point de conflit des deux trajectoires : celui
  qui est dans le croisement passe, sinon le premier arrivé ; un véhicule arrêté
  avant la ligne laisse passer. **Jamais** « ignorer » un véhicule physiquement
  devant soi pour départager (un taxi finissait dans un bus arrêté).
- **Ne pas bloquer le carrefour** : derrière une FILE de trafic à l'arrêt, on
  ne s'engage que s'il reste la place de l'autre côté (sinon blocages en boucle
  autour d'un pâté). Jamais derrière un véhicule garé : on le contourne.
- **Filet anti-blocage** : un véhicule de trafic arrêté depuis
  `TRAFIC_PATIENCE` s est recyclé, **seulement hors écran** (`horsEcran`, vraie
  projection caméra). Ne se déclenche pas en simulation sur 10 graines : c'est
  un dernier recours, pas la règle.
- `resoudreCollisionsVehicule` teste la séparation sur les **4 axes** (ceux des
  deux véhicules) : sur les 2 seuls axes de v, un véhicule de biais déclenchait
  de faux chocs à plusieurs unités de distance.

Outil de mesure (non versionné, à refaire au besoin) : `majVehicules` réel
pendant 90 s simulées en 3 points de la ville, `requestAnimationFrame` coupé
pour un tirage déterministe, en comptant chocs (`dentT`), dégâts et véhicules
arrêtés plus de 10 s. Avant : 359 chocs, 16 véhicules figés (jusqu'à 77 s).
Après : 0 choc, 0 figé, sur 10 graines.

---

## Mer V2 (nuit du 9 octobre 2026) — interrupteur `MER_V2`

- **Shader injecté** (`onBeforeCompile`) dans le matériau **Lambert d'origine**
  de la mer : brouillard et éclairage jour/nuit conservés. Dégradé de
  profondeur (distance au rivage `uMer`), vagues, reflets pilotés par
  `soleil.intensity` (plus doux la nuit), ressac, écume des 8 pontons et
  4 îles les plus proches (uniformes en nombre fixe, recalculés toutes les
  0,5 s). Pas de déformation de sommets (invisible de dessus).
- **Houle partagée** : `houle(x,z,t)` existe en JS **et** en GLSL, identique —
  bateaux (pilotés et garés), bouées et nageur suivent les vagues qu'on voit
  (`assietteHoule`, `houleY`). Toute modification de l'une se reporte sur
  l'autre.
- **Sillage / éclaboussures** : pool fixe `SILLAGES` (48 quads, jamais
  d'allocation en jeu), `sillageBateau`, `eclaboussure(x,z,force)`.
- Tout est cosmétique : horloge `dt` (spectacle), jamais `dtJeu`.
- Coût de rendu mesuré identique (~2 ms, 3 vues) ; sur iPhone, le shader
  ajoute une dizaine de sinus par pixel d'eau : à surveiller.

---

## Décor V2 (10 octobre 2026) — interrupteur `DECOR_V2`

`const DECOR_V2=false;` remet le décor d'avant, vélos garés compris (les
correctifs de bordure restent : ce sont des bugs, pas du décor). Tirages du
décor sur un générateur **à part** (`aleaDecor()`, `aD()`, `choixD()`, graine
917) : ajouter un objet ne décale jamais les tirages de la ville (`Math.random`).

- **Bordures** (`mkEnceinte`) : le mur EST la limite — véhicules jusqu'à
  `-HALF-12`, piétons jusqu'au mur, en mer jamais à l'ouest de
  `LIMITE_OUEST_MER` (jetées de rochers aux deux bouts). Texture du mur
  répétée par côté. `texEnseigne` mesure le texte et réduit la police :
  aucune enseigne rognée (testé sur le libellé le plus long).
- **Littoral** (`mkLittoral`) : fondus sable/mer et sable/désert de l'aéroport
  (dégradés en `destination-in`, pas de `getImageData` : le canvas simulé de
  `valider.js` ne le supporte pas) ; vagues qui montent sur le sable (shader,
  clé `'littoralVagues'`, uniformes de `MER_U`).
- **Hors les murs** (`mkHorsLesMurs`) : décor factice inaccessible (champs,
  forêt, collines, ville lointaine, autoroute nord animée), fusionné **par
  tronçon de 120 u et par côté** (une fusion par côté coûtait +19 %).
- **Mobilier urbain** (`mkMobilierUrbain`, catalogue `MOB_CAT`, choix par
  quartier `MOB_QUARTIERS`) : géométrie à couleurs de sommets, fusionnée en
  7×7 zones (`MOB_MAT`, couche lumineuse `MOB_MAT_LUM`), posé SUR le trottoir
  (`MOB_Y_TROTTOIR`). Jamais à moins de 5,5 u d'une porte, **14 u d'une porte
  de garage** (sortie en voiture), 6 u d'un POI. Les petits objets
  (`casse:true`) se renversent au passage d'un véhicule lancé (`majMobilier` :
  sommets repliés à y = -2) et sont réparés à chaque partie
  (`reparerMobilier`, dans `startRun`).
- **Transitions entre sols** (`mkTransitionsSols`, signalé en playtest : « ça
  passe de l'asphalte à l'herbe au sable sans transition ») : chaque dalle de
  sol est enregistrée à sa pose (`solRect` → `SOLS`), le jeu retrouve seul
  toutes les frontières visibles (`mkIndexSols`, le sol le plus haut gagne)
  et le matériau le plus meuble (`SOL_MEUBLE`) déborde sur l'autre : bande
  continue au fondu ondulé (`texBandes`), taches et fissures (`texTransitions`),
  touffes. Trois pièges vus en rendu réel : textures de canvas transparentes
  = liseré noir au filtrage (→ détail opaque + `alphaMap`) ; bande vue de dos
  en double face = noire (→ ordre des sommets selon le sens) ; Lambert
  éclaire par sommet = petits quads orange vif près des lampes la nuit (→
  `MeshBasicMaterial` teinté chaque image comme le sol plat,
  `majEclairageSols`). **Toute nouvelle dalle de sol passe par `solRect`.**
- **Galion échoué** (`mkGalion`, `majGalion`, remplace `mkEpavePirate` quand
  `DECOR_V2`) : 26 u sur la plage vide à l'est, poupe dans l'eau, coque par
  couples (`coqueGalion`) avec une vraie brèche côté plage menant au coffre
  (butin posé par `startRun`, durée infinie : un butin dure 26 s par défaut),
  voiles et pavillon ondulant par shader (`matOndulant`). Bordée de 6 canons
  en cascade, boulets en cloche (`typ:'boulet'`, `impactBoulet` : gerbe en
  mer, explosion à terre) ; **1 tir sur 5 vise le joueur** à moins de
  `GAL_PORTEE_JOUEUR`, les autres partent au large (demandé).
- **Piège : Three.js tire `Math.random` pour l'uuid de CHAQUE objet,
  matériau, géométrie, texture.** Tout décor construit avant `placerPortes`
  décale la ville (portes déplacées). Le construire dans
  `sansAleaVille(()=>...)` (générateur du décor) ; pour remplacer un ancien
  objet sans rien décaler, le construire puis le retirer (cas de l'ancienne
  épave).
- **Jetée de fête foraine** (`mkJeteeForaine(-205)`, `majJetee`) : plage
  ouest, praticable à pied et en voiture (`PLATS` + `PONTONS` + rampe), grande
  roue (nacelles toujours droites, ampoules en chenillard la nuit) qui
  **s'efface quand elle cache le joueur** (matériaux propres, jamais ceux du
  cache `mat()`), manège, stands, guirlandes. `ZONES_SANS_MOBILIER` : le
  mobilier de plage n'y pousse jamais.
- **Skatepark** (`mkSkatepark(4,1)`, pâté de parc voisin du lac) : dalle
  (`PLATS`), deux tremplins face à face au-dessus d'un vide de 10 u (on
  s'envole vraiment, BMX ou voiture), funbox, quarter-pipe, rails, murs
  tagués, projecteurs. Les arbres et allées du parc sont construits comme
  avant (aucun décalage de la ville) puis retirés de l'emprise ; tout le
  pâté est dans `ZONES_SANS_MOBILIER` (haies et bancs muraient l'accès).
- **Port vivant** (`mkPortVivant`, `majPortVivant`) : parcs à conteneurs
  dans les pâtés du port SANS entrepôt ni lieu (détectés par les solides et
  les POIS, jamais une liste), portique qui roule en portant un conteneur ;
  phare sur un îlot praticable (`ILES`/`PLATS`) au bout de la plage, faisceau
  la nuit ; porte-conteneurs au mouillage.
- **Brooklyn** (`mkBrooklyn`, `majBrooklyn`) : fresques sur une façade sud
  sur deux des immeubles en brique (`BRIQUES`, notés à leur construction),
  cordes à linge entre maisons voisines (`MAISONS`, notées sans changer
  l'ordre des tirages), bornes à incendie ouvertes (jet près du joueur
  seulement), courts de basket grillagés dans le parc (6,0) — jamais le
  parc (4,0), qui est `POIS.parc` (musicien, cache de la batte 2).
- **Ciel** (`mkCiel`, `majCiel`) : la caméra regarde vers le nord depuis le
  sud, **rien de ce qui vole au large n'est jamais vu**. Dirigeable (grande
  boucle au-dessus de la ville, translucide au-dessus du joueur), avion à
  banderole le long de la plage, mouettes, feux d'artifice la nuit près de la
  jetée **dans le champ** (portrait : ±9 u de large à 10–16 u de haut).
- **Crique des plongeurs** (`mkCrique`, demandée en cours de route) : à
  l'est du phare, baie d'eau de mer (`dansCrique` dans `estEau`) entre trois
  falaises de grès praticables (17, 10 et 5 u : solides `toit:true` + `PLATS`,
  on marche dessus et on tombe des bords), un plongeoir chacune, trois
  rampes d'accès, des marches pour ressortir de l'eau. **Atterrir dans l'eau
  ne blesse jamais** (`plongeonJoueur`) : salto pendant la chute, gerbe,
  bonus de score selon la hauteur (6 s entre deux bonus).
  **Accès** (`reliefCrique`, retour de playtest : « gros carrés pas beaux ») :
  collines escarpées décrites par une fonction de hauteur (`RELIEFS`, lue par
  `solY` ET par le maillage : ce qu'on voit est ce sur quoi on marche),
  sentier en lacets, rochers, cactus, marches taillées. Une colline déborde
  de 0,5 u sur le plateau qu'elle rejoint : bornes strictes des deux côtés =
  fente de hauteur 0 à la jonction (trouvée par le test de continuité).
- **Quartier néon** (`reserverNeon` avant le mobilier, `mkNeonVivant` après) :
  panneaux animés sur les toits (un `mkBatiment` sur deux du quartier, notés
  dans `BATIMENTS`), tapis rouge, file d'attente et videur devant le CLUB
  NÉON (porte toujours libre), projecteurs qui balaient le ciel la nuit.
- **Finitions de quartier** (`mkQuartiersFinitions`) : piscines des villas
  (`VILLA_PISC`) décorées et éclairées la nuit, cheminées qui fument sur les
  entrepôts (`ENTREPOTS`), barbelés et deux miradors à projecteurs à la base ;
  marché de rue du commerce dans le mobilier (`etal`, `cagettes` cassables).
- **Enseignes** (`texEnseigneV2`, signalé : « illisibles, très mauvaise
  qualité ») : l'ancienne texture était un canevas CARRÉ de 256 px étiré sur
  un panneau 2,4 fois plus large (texte écrasé + halo de 26 px). Désormais :
  canevas aux proportions du panneau (`ratio`, 2,4 par défaut), cadre, lettres
  cernées, halo léger, cache par texte (à chaque réutilisation, on consomme
  les 4 tirages de l'uuid d'une texture neuve : la ville ne bouge pas). En
  ville, `mkEnseigne` penche le panneau vers la caméra ; dans les salles
  (x < -4000) il reste droit (penché, il cachait l'action).
- **Portes** (`ameliorerPortes`, après `placerPortes`, signalé : « certaines
  donnent sur la route ») : chaque porte regarde vers l'extérieur de SA façade
  (`p.nx`,`p.nz` ; avant : toujours le sud) ; moins de 3 u de trottoir devant
  → elle passe sur la façade du même bâtiment qui en a le plus (jamais la face
  nord, cachée par le bâtiment) ; porte sans bâtiment → devanture. La sortie
  de salle suit l'orientation (`INT.rx/rz`). Enseignes : celle du lieu passe
  au-dessus de la porte, devant le store banne qui la coupait ; sur un flanc
  est/ouest elle devient une enseigne drapeau tournée vers la caméra ; les
  enseignes de boutique tirées au hasard sur la façade d'un lieu sont retirées
  (`ENSEIGNES`, `lieu`). Garages, chalutier, Site 51 et plage : non déplacés.
- **Jamais bloqué contre un mur** (`marchable`) : déjà collé à un solide (on
  atterrit dans sa marge de 0,5 u en tombant d'un toit ou d'une falaise), on
  peut toujours s'en éloigner ou le longer. Bug signalé : coincé au pied d'une
  falaise de la crique, partie à quitter.
- **Portes, cas limites** (trouvés avec `SEED=random`) : une porte toujours
  collée à la bordure tente aussi les bouts des flancs ; la sortie de salle se
  pose à `profondeurDevant − 0,6` (entre 1,4 et 3 u), jamais sur la chaussée.
- **Avion à banderole** (`AVION`, `trajetAvion`) et kiosque « TON MESSAGE DANS
  LE CIEL » (`acheterBanderole`, 250 $, `META.banderole`, saisie jeu en pause
  `ETAT.mode='banderole'`). Trajet jamais dans la grande roue.
- **Véhicules restylés** (`makeBateauV2`, `coqueBateau`, `buggyV2`,
  `bulldozerV2`) : la coque d'origine avait l'étrave vers -z, **les bateaux
  naviguaient à reculons**. `makeVoiture` construit l'ancien modèle (mêmes
  tirages : des bateaux sont créés pendant la génération de la ville) puis le
  nouveau sur le générateur du décor.
- **Piège : rien de Three.js au chargement du script** (`new Material` en
  `const` de module) : un tirage de plus avant la ville décale toutes les
  portes. Matériaux créés à la première utilisation (`_MAT_COQUE`, `_matStrates`).
- **Mont Reyes** (`MONT`, `hauteurMontBase` + sentier taillé dans
  `hauteurMont`, `mkMontReyes`) et **bordure est** ouverte jusqu'à
  `LIMITE_EST` (paroi `mkBordureEst`) ; **canyons** (`CANYON`, `hauteurCanyon`,
  `mkCanyonsDesert`, parois `matStrates`) à la place des dunes. Terrains de
  saut (`dansReliefLibre`) : envol seulement sur un vrai bord, réception ratée
  au-delà de ~20 u. **Courses** `RIDES` / `RIDE_DEFS` (dtJeu, prime une fois
  par vague, remises à zéro dans `mourir` et `startRun`), véhicules garés au
  pied (`garerRides`).
- **Pentes** (`PENTE_G`, `PENTE_MAX_VEH`, `PENTE_MAX_PIED`, signalé : « on
  monte à fond, même à pied, aucune sensation de montée ; au canyon on se
  rapproche et d'un coup on est en haut ») : dans un relief
  (`dansReliefLibre`), la gravité freine à la montée et pousse à la descente
  (×0,45 sur le sentier damé, `MONT.presDuSentier`) ; un sol plus raide que
  `PENTE_MAX_VEH` devant le véhicule est une **paroi** : on glisse le long,
  sans casse (jamais exemptée près du sentier, où l'on manœuvre dans les
  épingles) ; à pied, `marchable` refuse un pas plus raide que
  `PENTE_MAX_PIED` et la marche ralentit en montée. Au pas, en relief, on
  braque serré (`facVir`) : demi-tour possible sur les paliers d'épingle
  (plats sur 5 u). Calotte du sommet adoucie (au-dessus de 62 u) : le dernier
  lacet passait à 1,45 de pente. Portes de la course du mont à hauteur du
  lacet (`minH`) : passer en dessous ne compte pas. Vérifié par un pilote
  simulé au **joystick réel** (`controleDir`) : mont fini en 29 à 46 s
  (moto, cross, quad, buggy, BMX, vélo) pour 60 s.
- **Véhicule terrestre à l'eau** (demandé : « sans exploser, mais plus
  utilisable, et le joueur sort ») : `noyerVehicule` (centre dans l'eau,
  amerrissage d'un saut, véhicule lâché qui roule) puis `majNoyade` : le
  joueur sort à la nage (`sortirVehicule`, hors de la physique), le véhicule
  coule en 9 s puis disparaît (`v.mort`). Aucun dégât (avant : 80 à
  l'amerrissage, une moto explosait). Police, trafic et autres IA s'y noient
  aussi (demandé ensuite, `VEH_IA_NOYABLES`).
- **Bateau échoué** (demandé : « il doit s'avancer sur le sable, on sort,
  mais pas un impact brutal ») : le sable (`versPlage` : sol bas, sans
  solide, hors ponton) n'est plus un mur pour le bateau du joueur ou un
  bateau lâché. Coque sur le sable (`echoue`) : poussée ×0,25, freinage
  progressif (5 + v u/s²), 7 à 24 u de glissade selon le bateau, aucun
  dégât ; arrêté, le joueur descend (`echoueArret`, une fois par échouage,
  hors de la physique). En rembarquant : au pas (2,2 u/s), seulement vers
  l'eau (`eauDevant`), jamais à travers la plage. Pose `poseEchoue`. Les
  bateaux de l'IA et le porte-conteneurs rebondissent comme avant. Un véhicule `v.noye` n'a plus ni physique, ni collision, ni MONTER.
- **Zone extrême** (demandée : « 4x4 de franchissement, motos cross, montée
  de colline, stunt, base jump hyper haut ») :
  - **4x4 « Coyote »** (`VEHDEFS.jeep`, `jeepCarrosserie`, châssis haut sur
    amortisseurs) : `franchissement` = la pente le freine deux fois moins et
    sa limite de paroi est ×1,5. Garés au pied du mont et à la montée sèche
    (`garerRides`), motos cross au départ de chaque défi.
  - **MONTÉE SÈCHE** (`MONT.couloir`, taillé dans `hauteurMont`, piste de
    terre, jalons, arche) : couloir droit de la face sud qui finit en mur
    (profil `0,3u + 0,7u³`, pente 0,25 → 2), palier au sommet, **départ
    arrêté au pied** (avec 34 u d'élan, tout montait d'un trait : signalé
    « avec une moto de ville j'ai tout monté d'un seul coup »). Sur le
    couloir : vraie gravité (26 × sinus de la pente, celle des sauts) et
    terre meuble (poussée ×0,68 en tout-terrain, ×0,4 en pneus de route,
    `toutTerrain`). Course `RIDE_DEFS.colline` (6,5 s) : moto cross, quad,
    4x4 passent (4,2 à 4,8 s) ; motos de route, buggy, BMX calent.
  - **SUPERCROSS** (`STUNT`, relief `hauteurStunt`, au pied ouest du mont,
    demandé « pas dans l'herbe, en terre, mode supercross ») : boucle de terre
    (`coordPiste`/`pointPiste` : abscisse et écart latéral), droite est = 4
    grosses tables, virages relevés avec blocs de corde, droite ouest =
    whoops, double, step-up, rollers. Ruban maillé sur la même fonction,
    posé 0,14 au-dessus du sol (la pelouse de l'aérodrome le cachait).
    Défi `RIDE_DEFS.stunt` « DÉFI SUPERCROSS » : 2 600 points de figures
    (`rideFigure` à chaque réception : temps de vol, réception propre ;
    cabrage) en 45 s. Au bord d'une table, le
    décollage prend la vitesse de montée de la rampe (`pvLevre`,
    `presTremplinStunt`) : ailleurs, l'image du bord donnait vy = 2 (sauts
    plats) — non modifié hors du parc. Le parc entier (`dansParcStunt`) est
    un terrain de saut (réceptions tolérantes).
  - **PIC DU VERTIGE** (`PIC`, `hauteurPic`, `mkPicVertige`) : butte de 90 u
    à parois verticales (contour `picR`/`picU`), face sud vers la caméra.
    Monte-charge (`PIC.cage`, son plancher fait partie du relief : un joueur
    au sol ne peut jamais passer dessous quand la cabine est en haut, la règle
    des pentes l'arrête ; pendant le trajet le joueur est tenu dans la
    cabine, `majPic`). Plongeoir dans le relief, bouton SAUT BASE
    (`sauterBase`) ; le parachute existant fait le saut BASE. Cible au pied :
    score et prime une fois par vague ; sans voile, mortel.
- **Sommet du Pic, suite** : tremplin dans le vide (`PIC.tremplin`, dans
  `hauteurPic`, décollage `presTremplinPic`), motos cross, BMX et vélo garés
  au sommet (`garerRides`). En plein vol, **SAUTER DU VÉHICULE**
  (`ejecterEnVol`) : on tombe avec l'élan, voile disponible ; rester au
  volant d'une chute de ~30 u (vy < -40) est mortel. Un véhicule lâché en
  l'air continue sa trajectoire (`majVehicules`, branche `conduit===null`).
  Caméra : au-dessus de 20 u, elle suit vraiment la hauteur (signalé : « vue
  très zoomée en haut »).
- **Ciel ouvert** : aéronefs et jetpack bornés à `LIMITE_OUEST_MER-20` …
  `LIMITE_EST+20` et jusqu'à `MER+150` (avant : HALF+170, l'aéroport). Le
  relief est solide pour eux (`solY` > altitude : crash, ou arrêt pour un
  hélico lent).
- **Mer vivante** (`MERV`, `mkMerVivante`, `majMerVivante`, `actionMer`,
  demandé : « dynamiser la mer, donner envie de découvrir ») :
  - **Île aux trésors** (`ILE_TRESOR`) : camp de pirates, rocher-crâne, croix
    → CREUSER (220 $). **Paillote** sur l'île du canard : cocktail qui soigne.
  - **Plongée** (`MERV.spots`) : des bulles trahissent une épave ; à la nage,
    PLONGER remonte un coffre.
  - **Tremplins flottants** (`MERV.rampes`, `majSautMer`) : les petits bateaux
    s'envolent (`v.hMer`, `v.vyMer` : saut sur l'eau, distinct des roues).
  - **Rallye des bouées** (`RIDE_DEFS.bouees`, `eau:true` : `rideEligible(v,id)`
    n'accepte que les bateaux, jamais le porte-conteneurs).
  - **Remorquage** (`TOW`, `TOW_DEFS`, `majTow` après `majJoueur`, comme le
    monte-charge) : bateau-tracteur décor sur une boucle au large, kiosques
    au bout des deux pontons de la marina. **Wakeboard** : le joystick choisit
    où aller à l'écran (projeté sur l'axe latéral du bateau), franchir la
    vague du sillage vite fait décoller, ESQUIVE en l'air = 360 (pas fini à
    la réception = chute). **Parachute ascensionnel** : monte à 32 u, LÂCHER
    LA CORDE → la voile existante, radeau-cible (`MERV.radeau`).
  - **Faune** : banc de dauphins qui accompagne un bateau rapide au large,
    baleine qui souffle au large, **requins** dans les eaux profondes de l'est
    (bouées jaunes, panneau) : ils mordent un nageur, jamais un bateau.
  - Une prime par vague et par activité (`primeMerUneFois`, `MERV.primes`,
    remis à zéro par `resetMer` dans `startRun`).
- **Reliefs, 2e passe** (signalé : « encore trop simple à gravir, même en vélo et
  en jeep, l'effet est bizarre ») : vraie gravité partout en relief
  (`PENTE_G_VRAIE` = 26 × sinus, ×0,45 sur le sentier, ×0,7 sur ses abords à
  8 u pour qu'on puisse toujours y remonter) ; adhérence des flancs
  (`adherenceRelief` : route 0,55, tout-terrain 0,72, vélo 0,45) ; parois :
  vélos bloqués sur les flancs (×0,55), 4x4 ×1,35. Le 4x4 a une **vitesse
  réduite** dans le raide (il grimpe au pas, sans caler) : seul véhicule à
  monter le flanc (9 s au lieu de 3,7). La caisse suit la pente (tangage).
- **Sable** (`estSable`, `traceSable`, `TRACES_SABLE`) : traces de pneus qui
  s'estompent (plage, désert), et les véhicules non tout-terrain y glissent
  nettement plus (grip ×0,26 au lieu de ×0,4).
- **Ligne des mesas variée** : départ large, crête étroite, long gap, mesa
  large, longue crête qu'on suit, très long gap final (`m.bruit` : bords
  presque droits des crêtes ; tremplin plus raide avant un grand gap).
- **Mer, 2e passe** : wakeboard complet (sillage en V visible, `towEntrees`
  lit OLLIE/BACKFLIP/360 AVANT `majJoueur` — sinon GRENADE lançait une
  grenade — ; figure pas finie à la réception = chute ; objectif 9 000,
  impossible sans figures) ; planche aux bouts arrondis ; **crawl** (SPRINT à
  la nage : ×1,7, endurance ×5) ; petits bonds de crête en crête au large
  (`v.distVague`, jamais près d'un tremplin flottant). **Île aux trésors v2**
  (`ILE2`, relief `hauteurIleTresor`, contour `ileU`, `ILES[i].dans` lu par
  `estEau`) : montagne de 16 u, jungle, 6 trous (`creuserTrou`, un seul
  trésor tiré à chaque vague, ailleurs or, bouteille ou indice de direction),
  **faune** (`FAUNE`, sangliers et jaguar : chargent, mordent, se tuent au tir
  — `collisionBalle`, `viseAuto` — et au corps à corps ; reviennent à chaque
  vague, `placerFaune`).
- **Wingsuit** (`PIC.wingsuit`, portant au sommet du Pic ; `P.wingsuit` gardée
  jusqu'au game over) : en chute libre, bouton WINGSUIT (`deployerWingsuit`,
  `P.wing`) : plané à 24 u/s, descente 5,5 u/s, le joystick fait virer ;
  VOILE pour se poser (posé en wingsuit sans voile : 70 de dégâts).
- **Métiers v2** (taxi, ambulance, pompiers ; signalé : « trop mal faits, ils
  doivent être intéressants et débloquer des choses ») : PNJ visibles
  (`pnjMetier`, `nettoyerPnjMetier`), paie à chaque mission (`payerMetier` :
  série ×1,5 au plus ; pleine pour `METIER_PLEIN_PAR_VAGUE` = 3 missions par
  métier et par vague, puis 20 %), paliers (`PALIERS_METIER`, lus sur
  `META.metiers`, aucun champ de sauvegarde nouveau). Taxi : caractère du
  client (pressé, fragile, fêtard, VIP), destination nommée, chrono,
  satisfaction → pourboire. Ambulance : défibrillateur (`chocDefibrillateur`,
  bouton CHOC au volant : au maximum du pouls ×3, trop tôt = pénalité), puis
  clinique (porte de la pharmacie) contre le pouls. Pompiers : plusieurs
  foyers qui S'ÉTENDENT, habitants coincés, chrono ; la lance agit sur tous
  les foyers. Ces trois métiers continuent après le palier 10.
- **Cohérence des ennemis** : `spawnRing` / `pointApparition` (terre ferme,
  hors écran, ville et désert, jamais l'eau ni un relief ; à défaut, vers la
  ville), `spawnRingEau` (vedettes de police en mer). La garnison des bases
  (`e.garde`) ne compte pas dans les renforts. Boss : colonne de lumière,
  couronne, direction et distance dans la barre (`majBossHUD`).
- **Grand yacht** (`mkGrandYachtV2`, même famille que `makeBateauV2`) et
  **porte-conteneurs pilotable** (`VEHDEFS.cargo`, 62 u, créé par `startRun`
  au large de la plage, monter à bord jusqu'à `0,55 × long`, caméra qui
  recule selon `long`). En mer, bateaux et nage jusqu'à `LIMITE_EST_MER`
  (au large de la crique).
- **Cache `mat()` séparé pour le décor** (`_matCacheDecor`, sous
  `sansAleaVille`) : une couleur de décor neuve créée dans le cache de la
  ville décalait les tirages (portes déplacées). `peindreMesh` connaît les deux.
- **Carte** : cadre élargi à l'est (`mmOX`, `mmSpan`, toujours passer par
  `mmX`/`mmZ`/`carteVersMonde`) ; `dessinerEstCarte` échantillonne montagne,
  canyons, crique et désert sur les mêmes fonctions de hauteur que le
  terrain. Boutons + / − de la grande carte en bas à droite (sur la mer :
  en haut, ils cachaient le mont). Plus de clôture entre l'aérodrome et le
  mont (`clot(..., retirer)` : construite puis retirée, mêmes tirages).
- **Lac du parc** (`mkLacParc`, case bx=5, bz=0) : vraie eau pour `estEau`
  (on y nage ; tout véhicule terrestre qui y entre s'y noie), passerelle praticable
  (5 `PLATS` en dos d'âne), barques et canards = décor.
- **Lumières de quartier** (`mkLumieresQuartiers`) : écrans animés et néons
  qui clignotent (néon → « Times Square »), portiques et lanternes
  (`CHINATOWN`), guirlandes d'ampoules et escaliers de secours (résidentiel
  en brique → « Brooklyn »), flaques de lumière sous les lampadaires la nuit
  (fusionnées par carré de 200 u, matériau partagé, dans `lampes`).
- **Vélos** (`velo`, `bmx` dans `VEHDEFS`, modèle `makeVelo`, cadre fusionné
  par matériau) : `garerVelos()` en gare au plus `VELOS_GARES` aux arceaux
  (`MOB.arceaux`) à chaque partie ; aucun moteur (`profilMoteur` → null) ;
  **BUNNY HOP** sur ESQUIVE (front montant, un saut par appui, physique de
  saut partagée `v.enAir/v.vy`, `v.hop` : jamais de points de cascade). Garage :
  **style seulement** — `tuningCarro` sans `tuningMeca` (famille `velo` :
  porte-bagages, garde-boue `surRoues`, panier/plaque, jantes, fanion ;
  peinture, néons). `ficheMeca()` garde nitro et paliers (menu ET achats).
- Boucle : `majHorsLesMurs`, `majMobilier`, `majLac`, `majLumieres` (sur `dt`,
  tout est cosmétique sauf le renversement, qui freine un peu le véhicule).
- Tests : `scenarios.js` (« Bordures », « Mobilier urbain », « Lac du parc »,
  « Vélos »).

---

## 11e lot (12-13 octobre 2026) — grand chantier « salles et mini-jeux »

Audit des 27 salles au rapport (`rapport_nuit/RAPPORT.md`, « Audit des salles »),
puis refonte en profondeur de la pire à la meilleure, une salle par commit.

### Chalutier « Sainte-Odile » V2 (bandeau `LE CHALUTIER`, construction `id==='chalutier'`)

- **Repère mer** : le pont est la salle (fixe) ; la mer, la côte, le port, le
  phare, les bouées de zone, les récifs et les bancs vivent dans `s.merDedans`
  (port en 0,0, le large vers z<0), dans `s.merMonde` qui tourne
  (`rotation.y = π − cap`) : la proue reste en haut de l'écran
  (`chalutierPlacerMonde`, `chalutierVersSalle`). La mer est un
  `ShaderMaterial` (`CHAL_MER_VS/FS`) dont le motif est calculé en coordonnées
  de mer (uniforme `uBoat`) : elle glisse avec le bateau, fond dans le ciel au bord
  (`uCiel`), s'assombrit à la tempête (`uTempete`). Les salles ne sont jamais
  masquées (400 u d'écart) : rien de la mer ne dépasse ~150 u du bateau.
- **Enveloppe générique masquée** (murs, corniches, plinthes, sol en damier :
  meshes reconnus à leur hauteur) ; ses SOLIDES restent et servent de pavois ;
  l'étrave qui s'affine est fermée par des solides (`demiLarg`).
- **Pilotage** (dtJeu) : à la barre d'office en mer, joystick = barre
  (◀ ▶ virer, il faut de l'erre ; ▲ gaz ; ▼ freiner puis marche arrière lente).
  Récifs : rebond sans casse. Côte : `CHALUTIER_COTE_Z`.
- **Un seul bouton d'action en mer** (`chalutierAction`) : « fonce vers un banc »,
  « ralentis », PÊCHER ICI, JETER / REMONTER LE FILET, FERRE, MOULINE.
  **Boutons de combat masqués** pendant la sortie (`cacherBoutonsCombat` au
  largage, `afficherBoutonsCombat` dans `chalutierArreterSortie`).
- **Bancs** (`CHALUTIER_BANCS_PLAN`, tirés à chaque sortie par
  `chalutierPreparerBancs`, habillages réutilisés `s.bancsVis`, jamais
  d'allocation en mer) : canne (stock 3), sardines (filet), le Vieux Roi
  (un, dans la Fosse). Radar dessiné à la place de la minimap
  (`dessinerRadarChalutier`, appelé en tête de `majMinimap`).
- **Pêche** : panneau illustré `chalPecheWrap` (canvas, `dessinerPecheChalutier`),
  en bas d'écran, qui se tient au doigt (`s.moulinetDoigt`) comme le bouton
  d'action. **Coups de tête** (`CHALUTIER_RUSH`, `s.rush`) : mouliner pendant un
  rush tend la ligne en plus et recule la prise ; lâcher ne coûte rien. Le
  Vieux Roi (`CHALUTIER_POISSONS.roi`, `legende:true`) saute deux fois
  (`chalutierSautRoi`, ralenti), est arrimé contre la tempête
  (`chalutierPerdreMoitieCale` le saute) ; le ramener au port donne la
  **Boussole** (nouvelle condition, `CURIOS` mis à jour).
- **Filet** : ne se remplit qu'en traversant un banc de sardines au moteur
  (`CHALUTIER_FILET_HORS_BANC` hors banc) ; jauge dans le panneau d'infos (il
  traîne hors du cadre).
- **Fin** : bilan de la criée (`chalBilanWrap`, `chalutierPreparerBilan`), total
  qui défile. Billot et « rejeter la dernière prise » **supprimés** (trop de
  systèmes à lire).
- **Reset** : `chalutierEtatInitial` est LA liste de l'état d'une sortie
  (départ ET arrêt). Panneaux : `chalutierWrap`, `chalPecheWrap`,
  `chalIntroWrap`, `chalBilanWrap` (dans `JAUGES`).
- **Équilibrage vérifié par pilote simulé** (`scenarios.js`, « pilote simulé ») :
  joystick et bouton d'action réels, réaction 0,35 s, lâche pendant les rushs :
  4/4 sorties ramènent le Vieux Roi + 4 à 7 prises en 140-160 s
  (1 300-1 800 $) ; sans rien faire : remorqué, 0 $.

### Aquarium V2 — « 1, 2, 3… GASTON ! » (bandeau `AQUARIUM « BLEU PROFOND »`)

- **« Un, deux, trois, soleil »** avec Gaston perché au bord d'un bassin
  (`s.perchoirs`, champs `gx/gz` et `ax/az` : jamais `x/z`, ce ne sont pas des
  zones) : 😌 dos tourné → ❗ frisson (le signal, `AQUA_ALERTE`) → 👀 regard.
  Bouger plus vite que `AQUA_VIT_MAX` sous son regard (après `AQUA_GRACE`) =
  jet d'encre (`aquaEncreEl`), il saute sur un autre bassin. Le toucher
  (`AQUA_TOUCHE`, jamais quand il regarde) `AQUA_MANCHES` = 5 fois,
  fenêtres de plus en plus courtes, fausses alertes (`AQUA_FEINTE`). Échec :
  3 encres ou 75 s. Tout sur dtJeu. **À chaque atterrissage, il se retourne
  aussitôt** (`AQUA_REGARD_ARRIVEE`, grâce `AQUA_GRACE_ARRIVEE`) : sans ça, un
  joueur qui fonçait sans jamais s'arrêter gagnait quand les perchoirs tirés
  étaient proches (trouvé par `scenarios.js`, tirage libre).
- Lancée auprès du **gardien** (`s.gardien`, seule zone d'action). Pendant la
  partie, le bouton d'action s'efface et les boutons de combat sont masqués :
  tout se joue au joystick. Indicateur du regard `aquaWrap` (en haut, écrit au
  changement), carte d'intro `aquaIntroWrap` (helper `carteSalle`).
- Une chasse réussie par vague ; Perle Noire la première fois, sinon 180-380 $.
  Reset : `aquariumArreter` (sortie, mort, game over).
- Décor : eau translucide à texture propre (`texEauAq`), poissons qui tournent
  dans les bassins, bulles, grand bassin mural (requin), Gaston agrandi avec
  halo au sol (violet / jaune / rouge selon l'état). Panneaux BASSIN n et
  tunnel supprimés.
- Pilote simulé (`scenarios.js`, chemin BFS sur les vrais solides, réaction
  0,3 s) : 4/4 en 27-33 s ; qui fonce sans s'arrêter perd.

### Laverie V2 — l'essorage (bandeau `LAVERIE « BULLE BLEUE » — L'ESSORAGE`)

- La machine 7 lave l'argent des Vipers. Pendant le cycle (`LAV_DUREE` = 36 s,
  `s.cycleOn` = la partie, `s.cycleT` = temps restant), une aiguille
  d'équilibre (`s.lavAig` ∈ [-1,1], vitesse `s.lavVit` — **jamais `s.lavN`, qui
  est le compteur de lavages par vague**) dérive sous des poussées
  aléatoires croissantes (`LAV_DERIVE`, `LAV_DERIVE_ESSORAGE` les 10 dernières
  secondes) ; ◀ ▶ au joystick la ramène (`LAV_CONTRE`). Au-delà de `LAV_ROUGE`,
  la machine cogne (`laverieCoup`) ; `LAV_COUPS_MAX` = 3 coups réveillent le
  guetteur (`s.guetteur`, PNJ affalé) : alarme des Vipers, rien gagné.
- Gain selon le temps passé dans le vert (`LAV_GAIN`, + `LAV_BONUS_PARFAIT`
  sans coup et ≥ 85 %), stocké dans `s.lavGain`, encaissé au sac (garde
  d'entrée propre). 2 lavages par vague (inchangé).
- Le joueur est tenu devant la machine ; panneau `lavPanWrap` (canvas :
  hublot qui tourne, jauge en demi-cercle, visage du guetteur), intro
  `lavIntroWrap`, boutons de combat masqués. Machine 7 = groupe `s.mach7`
  (tremble, penche, saute ; son solide reste fixe), tambour `s.tambour7`.
  Reset : `laverieArreter` (fin, sortie, mort, game over).
- Mesuré (`sim`) : contrôle proportionnel 0,2 s → 95-99 % ; « pouce » tout ou
  rien 0,25 s → 75-80 % sans coup ; 0,35 s → 50 %, 1-2 coups, parfois raté ;
  rien → toujours raté.

### Serre V2 — la nuit de la floraison (bandeau `SERRE TROPICALE — LA NUIT DE LA FLORAISON`)

- 60 s (`SERRE_DUREE`, dtJeu) : des besoins apparaissent sur les 12 pots
  (`serreNouveauBesoin`, `p.besoin = {type 'eau'|'puceron', t, tMax}`, rythme
  `SERRE_INTERVALLE`, délai `SERRE_DELAI`) ; icône sprite au-dessus du pot
  (deux textures partagées `texBesoin`, couleur = urgence). Un seul outil en
  main (`s.srOutil`) : arrosoir (`SERRE_DOSES`, rempli au bassin,
  `s.bassinPos.bx/bz`) ou pulvérisateur (table, `s.tableOutils.tx/tz` —
  champs non `x/z` exprès). Pucerons non traités à `SERRE_CONTAGION` de leur
  délai : gagnent le pot voisin. Besoin expiré : la plante fane (matériau de
  fleur PROPRE à chaque pot). `SERRE_FANEES_MAX` = 4 : nuit perdue.
- Fin : `SERRE_GAIN_SOIN` par soin + `SERRE_BONUS_PARFAIT` sans perte ;
  sans perte, l'Étoile éclot au-dessus du bassin (`s.etoile`, curiosité
  `fleur`). Une nuit par vague (`srFini`/`srVague`). Lancée au tableau du
  jardinier (`s.panneau`) ; bouton d'action contextuel (`serreAction`) ;
  boutons de combat masqués. Reset `serreArreter`. Ancienne consigne du jour
  (`CRITERES_SERRE`, `critereSerre`) supprimée.
- Zone des pots de l'étagère du fond côté salle (`z−1,4`) : le pot du milieu
  tombait à 0,6 u de la SORTIE (on quittait la salle en voulant l'arroser).
  Arches de la verrière est-ouest (tournées de 90°, vues par la tranche, elles
  traçaient un trait blanc à l'écran).
- Pilote glouton (le plus urgent d'abord, bon outil, chemin BFS à la marge
  réelle du joueur 0,65) : ~7 nuits tenues sur 8, parfois parfaites ; passif :
  perdue.

### Radio pirate V2 — le tuner et le brouilleur (bandeau `RADIO PIRATE REYES FM — L'ÉMISSION`)

- Même cœur qu'avant (aiguille au doigt dans `#radioZone`, porteuse qui dérive,
  3 segments de `RADIO_SEG_DUREE`, 70 % pour réussir, triangulation, gains et
  curiosité inchangés : les anciens tests passent tels quels). Nouveau :
  segments nommés (`RADIO_SEGMENTS[i].nom`) ; **brouilleur** de la police
  (`brouilleur:true`, `RADIO_BROUILLEUR`, `s.brouCentre`) : s'y poser
  triangule à `RADIO_BROUILLEUR.triang` %/s ; **auditeurs** (`s.auditeurs`,
  `s.auditeursMax`, `RADIO_AUDITEURS`), annoncés à la fin.
- Interface : tuner dessiné (`radioWrap` = canvas, `dessinerTuner`) au-dessus de
  la zone du doigt, appel d'auditeur affiché dans le tuner pendant la pause
  (`s.appelTexte`), carte d'intro `radioIntroWrap`, piste « ◀ GLISSE LE DOIGT ▶ »
  dans `#radioZone`, bouton d'action masqué pendant l'émission, boutons de
  combat masqués (rendus par `radioArreterEmission` si une émission tournait).
- Décor qui vit avec le signal (`radioMaj`) : diodes de la console
  (`s.leds`), enceintes (`s.hautParleurs`), gyrophares aux fenêtres au-delà de
  70 % de triangulation (`s.gyros`).
- Test « Radio V2 » : auditeurs, brouilleur (×1,7 sur la triangulation), pilote
  au doigt avec 0,25 s de retard (3 segments), passif localisé.

## 10e lot (12 octobre 2026) — kiosque de la banderole, figures sur deux roues

- **Kiosque « Ton message dans le ciel »** (`mkKiosqueBanderole`) : sa place
  fixe tombait dans une maison de plage **sur pilotis** (`base` : `solidAt`
  sans `yRef` l'ignore à hauteur du sol). Recherche de la place libre la plus
  proche (`solidAt(...,undefined,3.5)`), jamais dans l'axe de la jetée.
  **Piège à retenir** : pour savoir si un objet tient sous un solide en
  surplomb, passer un `yRef` à la hauteur de l'objet.
- **Figures sur deux roues** (`majFiguresDeuxRoues`, `FIG2R`, appelée en fin
  de `majConduite` pour `def.cross` et `def.velo`) : boutons À PART (demandé :
  « le 360 ne doit pas être collé avec le bunny hop ») — SPRINT = 360 (inutilisé
  au volant d'un véhicule terrestre), GRENADE = BACKFLIP, ESQUIVE reste
  BUNNY HOP / CABRER ; appuis lus à chaque image (un appui au sol ne part
  jamais au décollage) ; combinables ; le véhicule entier tourne (ordre `YXZ`,
  salto autour du centre : `position.y` compensée). Réception : figure pas
  finie = chute (`sortirVehicule(true)` + 15 de dégâts), finie = points ×combo,
  ajoutés au DÉFI SUPERCROSS (`RIDES.actif.pts`). À vélo, une figure demandée
  dans les `FIG2R.fenetreHop` (0,3 s) d'un BUNNY HOP relève `v.vy` juste assez
  pour la finir (demandé : « un bunny hop doit permettre un 360 ou un backflip
  en appuyant juste après ») ; plus tard, c'est la chute.
- **Vélo qui cabre** (demandé : « il peut cabrer ? ») : sans bouton de plus,
  comme un vrai BMX — appui BREF d'ESQUIVE (< `VELO_TAP`) = bunny hop au
  RELÂCHER ; maintenu = cabré (`v.wheelieA`, pivot sur la roue arrière,
  `VELO_CABRE_MAX`). Bouton « HOP / CABRER ».
- **Reyes Skatepark XXL** (bloc `REYES SKATEPARK XXL`, `SKX`, `mkSkateXXL`,
  appelée avant `mkRides`) : demandé « agrandis-le, un gros bowl, épique » ; le
  pâté du parc (26 u) ne pouvait pas grandir, il est construit dans le désert
  au sud du Pic (x 452–504, z 170–240 ; à l'est, la falaise de 17 u de la
  crique). UNE fonction de hauteur (`hauteurSkateXXL`, dans `RELIEFS`) :
  plate-forme à `SKX.D` avec rampes de pourtour, bowl double, half-pipe,
  quarter géant (`qg`, dessus plat jusqu'au bord — sinon on s'envolait hors du
  parc), pyramide, escalier ; transitions en quart de cercle `quartSkate`.
  Physique : `zoneVertSkate` exempte des parois (testé aussi sur la position du
  véhicule, au coping le point avant voit déjà la plate-forme), gravité ×`SKX.g`
  sur les pentes du parc, réceptions tolérantes ; **air vertical**
  (`majSkateXXL`, appelée après la physique dans `majConduite`) : au coping
  (raideur récente `v.skMonte` + plat devant), envol à la verticale,
  demi-tour, vitesse horizontale bridée en l'air (`v.vertAir`). **Pièges** : un
  solide au dos du quarter était heurté au coping à pleine vitesse (retiré) ; le
  décor du désert est un maillage FUSIONNÉ — ses sommets dans la parcelle sont
  repliés sous le sol. Défi `RIDE_DEFS.bowl` (REYES BOWL JAM, 10 000 pts en
  60 s : impossible sans figures). Badge 🛹 sur la carte.
- **Trêve pendant une activité** (`treveActivite()` : `RIDES.actif`,
  `TOW.actif`, `metierEnCours()` ; demandé : « quand le défi est lancé, il faut se
  calmer avec les vagues, idem sur d'autres jeux ») : `majVagues` et
  `majEvenements` gelés (libellé « VAGUES EN PAUSE », écrit une fois,
  `WAVES.enTreve`), les ennemis non policiers deviennent passifs (patrouille),
  les motards de gang s'arrêtent. La police continue si l'on est recherché.
- **Vélo indestructible** : `abimerVehicule` et `exploserVehicule` ignorent
  `def.velo` (comme la planche de surf). Il peut toujours se noyer.
- **Tir par la vitre** (`tirAuVolant`, demandé : « tirer de la voiture ou de
  la moto avec pistolet ou mitraillette légère ») : `vehiculeTireur(v)` =
  voiture ou moto terrestre sans arme propre (jamais vélo, aéronef, bateau,
  char, jeep, DCA, grue, pompiers) ; `armeVolant()` prend l'arme en main si
  elle est dans `ARMES_VOLANT` (uzi, pm, silence, pistolet), sinon la
  meilleure chargée. L'arme est notée sur le véhicule (`v.armeVolant`). Mêmes
  chargeurs, recharge (`rechargerVolant`, `P.rechArme`) et chaleur qu'à pied,
  visée auto tout autour, dispersion `TIR_VOLANT` (vitesse, moto). Bouton
  `#btnFire.volTir` à la place du jetpack (libre au volant ; FREIN garde la
  sienne), retiré par `boutonsAPied`. Jamais dans une salle.
- Tests : « Kiosque de la banderole », « Figures deux roues », « Vélos »
  (appui bref / maintenu), « Skatepark XXL », « Trêve / vélo », « Tir par la
  vitre » (à 60 i/s : à 1/30 s une balle saute par-dessus une cible).

## 9e lot (12 octobre 2026) — amphibie, mur de l'aéroport, salles vivantes

- **4x4 amphibie** : `eau` (= `surEauVeh`) est calculé AVANT le déplacement de
  l'image ; le contrôle de noyade et la réception d'un saut exemptent
  `d.amphibie`, et sur l'eau la terre devant lui n'est pas un mur (il ressort
  sur ses roues, sauf solide). Un véhicule terrestre ordinaire se noie toujours.
- **Mur de l'aéroport** : gardé (il guide les véhicules vers le portail), mais
  `marchable` laisse passer tout joueur en l'air AU-DESSUS d'un solide (chute
  libre, voile, wingsuit, jetpack). Entrée matérialisée : pylônes balisés,
  enseigne au pied du pylône nord (hors de la route : rien entre la caméra et
  le joueur — une arche au-dessus de la route masquait le joueur, essayée puis
  retirée), marquage AÉROPORT sur le tarmac (`sansAleaVille`).
- **Club Néon V2** (bandeau `CLUB NÉON V2`) : `P.ivresse` (0 → 100,
  `IVRESSE`), remise à 0 dans `startRun` ; `majIvresse(dtJeu)` dans la boucle
  (puce HUD `buffIvresse`). Pompette : ×1,2 au corps à corps, caméra qui tangue
  (`majCamera`) ; ivre : `deriveIvresse()` tourne le vecteur de marche, le tir
  s'égare ; 100 : `malaiseEthylique` (sortie, -25 % PV, jusqu'à 60 $, fondu
  `#fonduNoir`). Danse (`DANSE`, `danseDebut`/`danseTape`/`danseFin`, sur
  `dtJeu`) : un appui par temps dans la fenêtre, sinon faute ; note nette ≥
  `DANSE.reussite` → pourboire une fois par vague (`dansePrimeVague`).
  Bagarre : ennemi `fetard` (faction `fetards`, hors de toute logique de gang),
  `e.interieur='club'`, un à la fois. Arme à feu sortie dans le club :
  `videurExpulse`. `danse` et `bagarreur` sont dans `CHAMPS_DECOR_SALLE`.
- **Vie des salles** (bandeau `VIE DES SALLES`, table `VIE_SALLES`) :
  `peuplerSalle` à la fin de `construireSalle`, `majVieSalle` dans
  `majInterieur`. Figurants (`s.figurants`, dans `CHAMPS_DECOR_SALLE`) : trajets
  en ligne droite vérifiés par `solidAt` (`pointLibreSalle`), pas de côté quand
  le joueur les frôle, panique (`s.paniqueT`) sur `P.frappeT` ou un tir.
  Cosmétique, aucune collision. Ajouter une salle = une ligne dans `VIE_SALLES`.
- Tests : « 4x4 amphibie », « Mur de l'aéroport », « Club Néon », « Vie des salles ».

## 8e lot (12 octobre 2026) — retours de playtest

- **Hélico** : effet de sol (`HELI_SOL`, `HELI_POSE_V`) — DESCENDRE tenu pose
  l'hélico en douceur (avant : -13 u/s au contact, crash à chaque posé) ; jamais
  posé sur l'eau (`HELI_EAU_ALT`, au ras des vagues). **Piège trouvé** : un
  aéronef créé avec `alt` déjà réglé n'avait pas de `va` → régime moteur NaN →
  `setTargetAtTime` lève une exception → le `try/catch` de `majConduite` fait
  sauter en parachute et DÉTRUIT l'appareil (« l'hélico du yacht explose
  toujours »). `majVol` assainit `v.v`/`v.va`, `moteurUpdate` refuse tout NaN
  (sinon il reste collé dans `AUDIO.engRatio`). Les tests sans `audioInit()` ne
  voient pas ce genre de bug : le test de l'hélico du yacht l'appelle.
- **Grand yacht navigable** (`VEHDEFS.grandyacht`, `GYACHT`, `majGrandYacht`) :
  l'ancien décor amarré (modèle `mkGrandYachtV2`, construit puis non affiché pour
  les tirages) est un véhicule créé par `startRun`. Son pont (`GYACHT.plat`) et
  son ponton sont des **rectangles orientés** (`ang`, `dansRectPlat`, lus par
  `solY` et `estEau`) qui suivent la coque, praticables seulement sans personne
  à la barre (sinon la coque buterait sur son propre ponton) ; au mouillage
  (`v.v=0`) dès qu'on lâche la barre. `entrerVehicule` / `sortirVehicule`
  appellent `majGrandYacht` au bon moment. L'hélico posé sur l'héliport
  (arrière, 6,4 u) est emporté (`h.porteur`) ; aéronefs et `navire` ne
  s'entrechoquent jamais. `grosNavire(d)` (cargo, grand yacht) : ni échouage,
  ni rallye, ni tremplins flottants.
- **Sauter d'un bateau** (`plongeonHorsBateau`) : plongeon à demi-largeur +
  `PLONGEON_MARGE` du côté libre (puis l'autre, puis l'arrière) ; un bateau
  lâché retombe à l'eau et s'arrête vite (×3).
- **Trafic** : `TRAFIC_ESSAIS` (6 essais/s, ×2 sous la moitié du plafond). À
  2,2 essais/s la ville plafonnait à ~19 voitures pour 36 permises.
- **Police** : `WANTED_GAIN` (0,6) sur toute chaleur de délit ; les événements
  scénarisés des salles (radio, musée, banque, alarmes) et la zone militaire
  passent `addHeat(v,false,true)` (brut, étoiles franches inchangées) ;
  `WANTED_DECROISSANCE`, `WANTED_CAP_AGENTS`, `WANTED_RENFORT`, `WANTED_HELI_CD`.
- **Pentes physiquement possibles** (`penteMaxVeh` : vélo 0,45, route 0,7,
  tout-terrain 0,85, cross et 4x4 1,0 = `PENTE_MAX_VEH`, 45° ; à pied
  `PENTE_MAX_PIED` 1,25) ; `paroiDevant` teste aussi la **vraie pente du
  terrain** dès qu'on monte (de biais, la pente apparente baissait). Plus
  d'exemption pour la montée sèche ; sentier exempté, parc stunt à
  `PENTE_PARC_STUNT`. Montée sèche : profil `couloirH` (0,5u + 0,5u²), mur final
  `COULOIR_PENTE_MAX` 0,95 ; le flanc moyen (0,85) étant trop raide pour
  qu'un tel profil le rejoigne, le palier d'arrivée est une encoche taillée dans
  le flanc. Seule la moto cross passe. Rampe d'accès des mesas :
  `rampeReguliere` (0,62).
- **Mont Reyes agrandi** : H 72 → 98 (sommet 89), rx 78 → 100 (vers l'ouest :
  au sud le canyon, au nord et à l'est les limites). Calotte à 86 % de H,
  lacets `13·H/72`, course du mont 90 s. Couloir défini relativement à `MONT`.
- Tests : « Garage / Monster Truck », « Hélico du yacht », « Grand yacht »,
  « Sauter d'un bateau », « Circulation », « Police », « Pentes réalistes »,
  « Défis ».

## Défis (`DEFIS`, `DEFIS_THEMES`)

- `DEFIS = DEFIS_SIMPLES + paliers des thèmes` (`themeDefi`). Un thème est une
  suite finie de paliers croissants ; seul le premier palier non récupéré est
  proposé (`defiPropose`). Les premiers paliers gardent les ids des anciens
  défis (`sang`, `net`, `chauffard`, `collec`/`explor`...) : aucune sauvegarde
  ne perd rien.
- **Rien n'est payé automatiquement** : `checkDefis` passe un défi accompli
  dans `META.defis.aReclamer` (toast, pastilles `majPastilleDefis` : HUD près
  de la pause, menu, pause) ; `recupererDefi(id,mult)` paie (garde d'entrée
  propre, `faits` = récupéré). Un test qui veut « accompli » lit
  `faits[id] || aReclamer[id]`.
- **Bouton « ×2 avec une pub »** : structure seulement, `PUB_X2.disponible()`
  (faux : bouton masqué) et `PUB_X2.montrer(fin)` ; `recupererDefi` n'accepte
  que ×1 ou ×2.
- Compteurs des nouveaux thèmes dans `META.defis` : `courses`, `baseCible`,
  `tresors`, `tuning`, `mer` (+ `META.metiers` pour les métiers).

## Rayon tracteur de l'OVNI (~L9537)

**Le faisceau translucide sous la coque (dans `makeVoiture`, ~L5033) est un simple
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

## Métiers (~L16638)

Missions liées à un véhicule précis : Pompier (incendies), Taxi (courses + appel
rapide via `btnAppelTaxi`), Dépanneuse (remorquages), Ambulance (urgences),
Police (interpellations).

`METIERS_CIBLE` (= 10) réussites par métier débloquent un skin dédié
(`PERSOS.jax.skins`, gating dans `renderChars`).

Une mission **en cours** (`MET.x`) est simplement abandonnée en sortant du véhicule
ou à la mort. Seul le **compteur** (`META.metiers`, persistant) survit — exactement
comme `MISSION.cur`.

---

## Garages tuning (~L16869)

Trois garages (`GARAGES_TUNING`, ~L1567), un par quartier, placés par `caseCentre`
et tous dans `REPLIS`. **Une seule salle partagée** (`INTDEFS.tuning`), voir
« Géométrie partagée ». Seule salle où l'on entre **en véhicule** :

- **Les améliorations appartiennent au VÉHICULE, jamais au garage** (« Mes
  véhicules », `META.vehPerso`, `VEHPERSO_MAX` = 6 fiches). Tout garage accepte
  tout véhicule éligible — plus de « place déjà prise » (l'ancien modèle, une
  place par garage jamais libérée, bloquait le joueur : signalé en playtest).
- Au volant, près de la porte : « ENTRER AU GARAGE ». Le véhicule de la ville est
  retiré (`garageRetirerVehicule`). Dans la salle, seul un **modèle d'exposition**
  tourne sur le plateau — hors de `vehicules`, aucune physique, aucun trafic.
  Un véhicule hors collection y est exposé avec une **fiche temporaire**
  (`s.visiteur`, hors META) : il n'entre dans la collection qu'à son **premier
  achat** (`garageAcheter`, refusé AVANT débit si la collection est pleine) ou
  par « GARDER CE VÉHICULE » (gratuit, `garageEnregistrer`). Sorti sans lui, il
  est abandonné — le menu le dit.
- Menu « MES VÉHICULES » : on choisit le véhicule avec lequel on sort, **depuis
  n'importe quel garage**. Un véhicule de la collection resté en ville est
  **rapatrié** (retiré de la ville, `garageChoisirVehicule`).
- **Casse** (`garageCasser`, garde d'entrée propre) : en deux appuis, véhicule de
  la collection exposé (jamais un véhicule en ville), rembourse
  `TUNING_CASSE_TAUX` (25 %) de `investi` — le total réellement dépensé sur ce
  véhicule, tenu à jour par `garageAcheter`.
- À la sortie, un véhicule neuf est créé devant la porte et reçoit ses
  améliorations (`appliquerTuning`) : `v.def` devient une **copie propre** au
  véhicule, `VEHDEFS` n'est jamais modifié. Peinture : matériau propre au
  véhicule (`mat()` est partagé par couleur — le modifier repeindrait la ville).
- Un véhicule de la collection est « en ville » tant qu'une instance vivante
  porte son `persoId`, sinon il est rangé (après game over, rechargement, ou
  destruction) et se sort de n'importe quel garage.
- À pied : on entre dès que la collection n'est pas vide.
- On entre **en pleine poursuite** : la police ne bloque jamais l'entrée, rentrer
  au garage EST la façon de la semer (demandé explicitement). Seul bloque
  (« trop chaud », `ennemiHostileProche`) un **tireur de gang** armé d'une arme
  à feu, qui vise le joueur lui-même, à moins de `GARAGE_FEU_DIST` = 6 u et en
  ligne de vue. Ne bloquent pas : batte, gangster occupé par un rival, en fuite,
  passif. (1re version : tout gangster non passif à 6 u — or un gangster de
  patrouille cesse d'être passif dès qu'on passe à ~15 u : un passant devant la
  porte bloquait l'entrée, signalé en playtest.)
- Recherche : porte roulante fermée, puis les étoiles tombent une à une (`dtJeu`).
- **Nitro** : bouton ESQUIVE au volant, décidée par `majNitro(dtJeu)` AVANT la
  physique. **Verrouillée dans toute salle, donc pendant les courses du Dépôt**
  (le plafond de vitesse des IA y est garanti par simulation).
- **Blindage** : 4e palier, multiplie les dégâts reçus (`v.blindage`, appliqué
  dans `abimerVehicule`). Propre au véhicule — jamais le drapeau `def.blinde` du
  char (×0,12 et masse ×2,2, qui rendrait une voiture quasi indestructible).
- **Néons** : lueur tamisée, deux plans additifs texturés par `texGlow` (halo +
  cœur), aucune vraie lumière.
- Tous les prix sont groupés dans `TUNING_PRIX` (en tête de section), à calibrer
  en jouant. Chaque achat a sa propre garde d'entrée.
- **Éligibilité déclarée dans `VEHDEFS`**, jamais une liste dans le code :
  `tuningMeca:true` = tout ce qui roule et se conduit, **char compris** (décision :
  son blindage d'origine ×0,12 se cumule au blindage acheté) ; tout le reste est
  refusé à la porte avec un message selon le cas (bateau, aéronef, Dépôt).
  `tuningCarro:{famille, ancrages}` = voitures et motos civiles, et les vélos
  (qui n'ont QUE `tuningCarro` : style seulement, voir « Décor V2 »).

### Pièces de carrosserie (phase 3)

**Règle : les pièces se greffent par une passe d'ancrage, JAMAIS dans
`makeVoiture`.** `appliquerCarrosserie(groupe, key, pieces)` retire et libère la
passe précédente, puis greffe les pièces choisies :
- sur `ud.corps` (elles suivent la suspension), aux **ancrages déclarés** dans
  `VEHDEFS.tuningCarro.ancrages` — `avant` (bord avant, hauteur du capot),
  `arriere` (bord arrière, hauteur du coffre), `toit` (point le plus haut),
  `basCaisse` (demi-largeur, bas du châssis). Valeurs **mesurées** sur les
  vrais modèles (boîtes des seules pièces larges de la caisse : une antenne ou
  un fanion faussaient la hauteur), puis vérifiées en rendu réel ;
- les **jantes sur les roues réelles** (`ud.roues`, axe = y local du cylindre) :
  jamais d'ancrage déclaré pour les roues, ce serait recopier `makeVoiture`.

Appelée **uniquement** pour le véhicule du joueur sorti du garage et pour le modèle
d'exposition — jamais pour le trafic.

Catalogues par **famille** (`PIECES_FAMILLES`), 3 variantes par catégorie dont
« d'origine ». Clés de catégorie fixes (`aileron`, `parechocs`, `jupes`, `capot`,
`jantes`, `echappement`) ; le libellé change selon la famille, et une famille n'a
que les catégories qui ont du sens :

| Famille | Véhicules | Catégories |
|---|---|---|
| compacte | citadine, berline, taxi, gangcar, baronne | les 6 |
| sportive | muscle, sport, mirage | les 6, plus agressives |
| utilitaire | van, pickup | galerie de toit, pare-chocs (pare-buffle, treuil), marchepieds, jantes, échappement |
| toutterrain | buggy, scarabee, quad, monstertruck | rampe de phares, pare-buffle, jantes, échappement |
| deuxroues | moto, motoR, motocross, motoS, fantome | carénage, saute-vent, jantes, échappement |
| velo | velo, bmx | porte-bagages, garde-boue, avant (panier / plaque), jantes, fanion — sans nitro ni paliers |

- **Aperçu avant achat** — pièces, **peinture et néons** (demandé : « du style, à
  confirmer avant de payer ») : 1er appui = essai sur le plateau, rien débité
  (`s.apercu`, `s.apercuCoul`, `s.apercuNeon`) ; 2e appui (ou le bouton ACHETER)
  = achat. Fermer le menu annule tout essai non acheté (`annulerApercus`).
- **Variante réservée** : `seul:['pickup']` dans le catalogue = proposée à ces
  véhicules seulement (`varianteDispo`, vérifié aussi dans `choisirPiece` et
  `appliquerCarrosserie`). Ex. : « Cheminée + prise d'air » du pickup, 4e prix
  de `TUNING_PRIX.pieces.echappement`.
- **Treuil** (`treuil:true`, famille utilitaire) : la seule pièce qui n'est pas
  que cosmétique. Posé, il donne au véhicule l'accroche/remorquage de la
  dépanneuse (`v.treuil`, `majRemorquage`), sur le bouton GRENADE (ESQUIVE y est
  déjà la nitro), avec un câble visible. Décroché dans `sortirVehicule`.
- **Une pièce se paie une fois** (`piecesPossedees`, bits) ; reposer une pièce
  possédée ou l'origine est gratuit. `choisirPiece` porte sa garde d'entrée.
- **Purement cosmétiques**, sauf le treuil : aucun effet sur la physique (piste
  proposée, non retenue : un pare-buffle réduisant les chocs frontaux).
- **Menu** : barre de défilement native masquée (Safari iOS ignore son style),
  remplacée par un rail dessiné et des fondus haut/bas (`majRailGarage`).
- **Aucune fuite** : `libererObjet()` libère les géométries de tout ce qui est
  retiré (véhicule rangé, modèle d'exposition, passe de pièces précédente), sans
  jamais toucher au joueur attaché à une moto (`P.h.g`, géométries humaines
  partagées), aux sprites (géométrie partagée) ni au cache `mat()`.
- **Cadrage de la présentation** proportionné au véhicule exposé, mesuré sur ses
  seuls meshes (le sprite d'ombre gonflait la hauteur). Caméra **fixe** pendant le
  menu : le véhicule tourne seul, ou **au doigt** (glisser sur la zone 3D,
  `GAR_DRAG`) — la rotation automatique se suspend `GARAGE_ROT_PAUSE` s après un geste.
- **Jupes et marchepieds** calés entre les passages de roue mesurés sur les roues
  réelles (`ctx` passé aux fabricants) — à longueur fixe, ils mangeaient sur les
  roues (signalé en playtest). Testé sur toutes les familles.

---

## Sauvegarde

Clé : `asphalte_save_v1` (ancien nom du jeu, **gardée volontairement** : la
renommer ferait perdre les sauvegardes). Objet persisté : `META`.

- `sauveMeta()` — écrit, dans un `try/catch` silencieux
- `chargeMeta()` — lit avec **deep-merge prudent** : ne jamais écraser une
  structure `META` par un vieux JSON incomplet, toujours fusionner champ par champ.
  Ajouter un champ à `META` ne doit pas casser les sauvegardes existantes.
- **Dictionnaires ouverts** (`DICOS_OUVERTS`, juste avant `fusionMeta`) :
  `fusionMeta` ne reprend que les clés déjà déclarées dans `META`. Un
  dictionnaire dont les clés sont des ids de contenu ajoutés en jouant (déclaré
  `{}` ou presque vide) DOIT figurer dans `DICOS_OUVERTS`, sinon il est vidé à
  chaque rechargement. Bug déjà rencontré (trouvé au test de compatibilité du
  renommage) : `lieuxVus`, `tenuesPoss`, `stats.arcadePersoBest` repartaient à
  zéro. Vérifié par `scenarios.js` au rechargement de la Radio.
- `META.curios` — dictionnaire des curiosités obtenues
- `META.fouilles` — compteur de caches fouillées
- `META.metiers` — compteur de réussites par métier
- `META.defis.aReclamer` — défis accomplis, récompense pas encore récupérée (dans `DICOS_OUVERTS`)
- `META.vehPerso` — « Mes véhicules » : `VEHPERSO_MAX` fiches à clés **fixes**
  `v0`…`v5` (un tableau serait recopié tel quel par `fusionMeta`, sans compléter
  ses champs). `fusionMeta` ne reprend que les clés **déjà présentes** dans
  `META` : chaque fiche y est donc déclarée d'avance (`vehPersoMetaDefaut()`),
  avec des champs de type fixe (`cle:''`, `coul:-1`, `investi:0`...). Un `{}`
  vide perdrait tout au rechargement. `pieces` et `piecesPossedees` y sont des
  objets à clés fixes.
- `META.garages` — **ancien modèle** (un emplacement par garage), resté déclaré
  pour être relu, puis migré au chargement par `migrerGaragesVersVehPerso()` :
  chaque véhicule garé devient une fiche de la collection (son `investi` est
  reconstitué depuis les achats visibles), l'emplacement est vidé (jamais deux
  migrations). Vérifié par `scenarios.js` : sauvegarde sans le champ,
  emplacement incomplet, antérieure à la phase 3, deux garages occupés,
  collection incomplète.

---

## Curiosités (`CURIOS`, ~L1764)

**17 entrées, 16 actives** (`actif:true`). La seule inactive est *Les Plans du
Rhinocéros* (Bunker militaire), affichée en silhouette verrouillée dans le cabinet
de la planque.

Chacune se mérite **en comprenant le lieu, jamais par tirage au sort**. Les effets
sont petits, permanents et cumulables.

Actives : Chaussette Solitaire (laverie) · Boule Fissurée (voyance) · Disque de
Platine (karaoké) · Perle Noire (aquarium) · Boule « Comète » (bowling) · Micro
Vintage (Reyes FM) · Haltère « Enclume » (sport) · Étoile de Los Reyes (serre) ·
Ceinture de Champion (sandwichs) · Canard d'Or (musée) · Jeton Doré (arcade) ·
Bobine « GTRoyal I » (ciné) · Plaque du Capitaine (Site 51) · Lampe de Mineur
(métro) · Boussole du Capitaine (chalutier : ramener le Vieux Roi) · Volant du Dépôt (dépôt de bus).

Réunir toutes les curiosités actives débloque `batte2` (~L1829).
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
- **Grille de refonte (11e lot, demandée).** Une salle refaite a : une entrée en
  scène courte (carte à icônes, jamais un pavé dans un toast) ; des consignes
  visuelles ; UNE action contextuelle à la fois ; un retour immédiat à chaque
  action (son, vibration, particules, chiffre qui s'anime) ; un moment fort ;
  une victoire célébrée (bilan qui défile) et une défaite qui donne envie de
  réessayer ; un décor propre où **un poste se reconnaît à son objet, jamais à
  un panneau-étiquette**. Les boutons de combat sont masqués quand ils n'ont
  pas de sens (`cacherBoutonsCombat`). Rien d'important sous un panneau :
  vérifier en rendu réel que le panneau du mini-jeu ne cache pas l'action 3D.
- **Jouable, prouvé par un pilote simulé** (joystick et bouton d'action réels,
  temps de réaction humain), et **perdable** (un joueur passif ou maladroit
  échoue) — modèle : « pilote simulé » du chalutier dans `scenarios.js`.

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

## Joueur (`P`, ~L6115)

`P.stamMax` est la source de vérité pour l'endurance — **jamais 100 en dur**.
`P.stamMax = 100 + 12*mus` (~L6153) où `mus` est le palier de muscle.

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
- Console mobile : `eruda` injecté dans le `<head>` (L666–668) **en phase de dev
  seulement**, à retirer avant toute version diffusée
- Packaging natif iOS : nécessitera un Mac + Xcode (Capacitor / WKWebView).
  Non bloquant : Safari en écran d'accueil utilise déjà WebKit, donc le rendu et
  les perfs observés sont représentatifs.

### Minimap et grande carte (zoom au pincement)

Pincer la minimap du HUD zoome/dézoome (`MINI.zoom`, ×1 = toute la ville à
×`MINI_ZOOM_MAX` = 4), vue centrée sur le joueur et bornée aux bords (même
principe que `mapVue()`) ; points et badges gardent leur taille. Un simple
toucher ouvre la grande carte **au relâcher** (pour ne pas confondre avec un
pincement), au zoom de la minimap. Sur la grande carte, le pincement s'ajoute
aux boutons + / − et ne pose jamais de destination ; le toucher simple la
pose toujours. Testé par `scenarios.js` (gestes à deux doigts simulés).

### Icônes vectorielles (`icones/`)

42 pictogrammes SVG dessinés à la main d'après `icones/references/*.png`
(références raster uniquement — jamais intégrées ni vectorisées
automatiquement). `icones/icones.svg` est **produit** : la source est
`icones/outils/dessins.js` ; `node construire.js` régénère sprite + aperçu,
`node recette.js ../rapport` rejoue la recette. Détails et usage :
`icones/README-integration.md`.

**Intégrées au jeu** (mono-fichier) : les `<symbol>` sont recopiés en tête
de `<body>` par `node icones/outils/integrer.js` (à relancer après chaque
`construire.js` ; `scenarios.js` échoue si la copie diffère du sprite).
Tout passe par `ico(id, emojiDeSecours)` / `icoArme(id)` (~L877) : HUD
(tir = arme équipée, esquive, sprint, arme, grenade, saut, jetpack, frein,
pause, tir des canards), capacité spéciale du perso, nitro, armurerie,
caisse de munitions, filtres de la carte, appel taxi, menu du garage, et
l'icône « action » devant les libellés du bouton d'action sans pictogramme
(`labelAction`, réécrit seulement au changement de libellé). Restent en
emoji : gadgets de véhicules, textes flottants et toasts.
**Retour en arrière** : `const ICONES_SVG=false;` remet tous les emojis
d'origine (chaque appel garde son emoji de secours) ; point git
`avant-icones-svg`.

### Chantiers ouverts

1. **Passe de playtest systématique** sur toutes les salles existantes — priorité
   affirmée sur l'ajout de contenu neuf.
2. **Relais de logs iPhone** : hooker `console.error`, `window.onerror` et
   `unhandledrejection` et les POSTer vers un petit serveur Node local, pour lire
   les erreurs du device en direct dans le terminal. Architecture validée,
   **décision en suspens** : toujours actif, ou derrière un flag debug ?
   (Il existe déjà un handler `window.onerror` minimal → `#errBox`, L674.)
3. Publication mobile via wrapper Capacitor ou Cordova.
