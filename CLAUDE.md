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

**Relevé du 18 octobre — 34 459 lignes.**
Attention : `maj_carte` recale les numéros dans l'ordre des lignes de la table ;
un bandeau AJOUTÉ décale les libellés suivants — ajouter sa ligne à la main.

| Ligne | Section |
|---|---|
| 1–900 | `<head>`, CSS, HUD, écrans (menu, game over, panneaux) |
| 414–564 | **icônes SVG** : copie des 42 `<symbol>` de `icones/icones.svg` (générée, ne pas éditer) |
| 877–879 | **eruda** (console mobile de dev — à retirer avant diffusion) |
| 880 | chargement Three.js r128 depuis CDN |
| 885 | `<script id="gamejs">` + handler `window.onerror` → affichage dans `#errBox` |
| 901 | en-tête GTRoyal, début du code du jeu |
| 997 | AUDIO — WebAudio synthétisé, boîte de vitesses simulée |
| 1520 | ENTRÉES — joystick virtuel, boutons tactiles, clavier ZQSD/WASD |
| 1832 | MÉTA-PROGRESSION — `META`, défis, sauvegarde |
| 2827 | THREE.JS — rendu, scène, lumières |
| 3138 | VILLE DE LOS REYES — génération procédurale par quartiers |
| 6639 | **AÉROPORT VIVANT** — aérogare, trafic aérien, hangars (`AERO`) |
| 6838 | **PLANQUES EN PLEIN AIR** (`PLANQUES_DEF`) |
| 7065 | **BOUTIQUES DE STYLE** (`BOUTIQUES_DEF`, `VETEMENTS`, `BOUT`) |
| 7222 | **MANÈGES** — grand huit, grande roue (`MANEGES`) |
| 7293 | **TOITS VIVANTS** (`TOITS`, `mkToitsVivants`) |
| 7395 | **LOS REYES HILLS** — colline, lacets, villas, planque (`HILLS`, `ROUTES_HILLS`) |
| 8182 | **CHANTIER ET PLANQUES V2** — `ETAGES`, `mkChantierV2`, `mkPlanquesV2`, `mkBordsHills` |
| 8380 | **FORT REYES** — base militaire V2 (`BASE`, `reserverBase`, `mkBaseV2`, `majBaseV2`, parcours du combattant) |
| 8524 | **TIR À LA PREMIÈRE PERSONNE** (`FPS`, `fpsDemarrer`, `majFPS`) et **BALL-TRAP** du ranch (`BT`, `mkBallTrap`) |
| 8922 | **TERRAINS DE SPORT DES PARCS** (`SPORTS`, `mkSportsParcs`, `majSportsParcs`, match de foot) |
| 9062 | **ARÈNE DE DERBY** (`DERBY`, `mkArenaDerby`, `majDerby`, `majDerbyIA`, voitures et améliorations de derby) |
| 13512 | MODÈLES — humains, armes, véhicules, hélico, ramassables |
| 15685 | POOLS — balles, particules, textes flottants, traces de pneus |
| 16054 | ÉTAT GLOBAL + JOUEUR (`P`) |
| 16910 | VÉHICULES — physique arcade, trafic, dégâts |
| 19569 | PIÉTONS |
| 19752 | ENNEMIS — gangs, police, armée, motards, hélico, boss |
| 20324 | **RAYON TRACTEUR DE L'OVNI** |
| 20789 | NIVEAU DE RECHERCHE (étoiles) |
| 21068 | VAGUES + bonus de fin de vague |
| 21190 | MISSIONS COURTES |
| 21193 | BÂTIMENTS VISITABLES — intérieurs |
| 21263 | FOUILLE — mécanique générique |
| 21811 | PALAIS DE L'ARCADE — bornes, tickets, tableau des scores |
| 25696 | **AQUARIUM** V2 — « 1, 2, 3… GASTON ! » (helpers `carteSalle`, `ligneCarte`) |
| 26104 | **LAVERIE** V2 — l'essorage de la machine 7 |
| 26369 | **SERRE** V2 — la nuit de la floraison |
| 26661 | CINÉ-PALACE |
| 26905 | MÉTRO ABANDONNÉ |
| 26971 | **RADIO PIRATE** V2 — le tuner, le brouilleur |
| 27322 | **LE CHALUTIER** V2 « SAINTE-ODILE » |
| 28224 | SITE 51 |
| 28454 | LE DÉPÔT DE BUS — courses clandestines |
| 29900 | **MÉTIERS** — missions liées à un véhicule |
| 30190 | **GARAGES TUNING** — prix, nitro, salle partagée, menu d'atelier |
| 31197 | ÉCRANS / MENUS / BOUTIQUES |
| 31472 | CASINO — machines à sous, blackjack, vidéo-poker, roue |
| 32274 | DÉBUT / FIN DE PARTIE |
| 33707 | JOUR/NUIT, CAMÉRA, HUD, MINIMAP |
| 33944 | **VUE IMMERSIVE** — `VUE`, `vueCamera`, `basculerVue` (juste avant `majCamera`) |
| 34337 | BOUCLE PRINCIPALE |

### Ancres fines (hors bandeaux)

| Ligne | Repère |
|---|---|
| 923 | `ICONES_SVG` — interrupteur des icônes, `ico()`, `icoArme()`, `labelAction()` |
| 929 | `MER_V2` — interrupteur de la mer améliorée (false = mer d'avant à l'identique) |
| 936 | `DECOR_V2` — interrupteur du décor enrichi (voir « Décor V2 ») |
| 1840 | `GARAGES_TUNING` — les garages de la ville (déclarés avant `META`) |
| 1860 | `VEHPERSO_MAX` — taille de « Mes véhicules » (`META.vehPerso`) |
| 2114 | `fusionMeta()` — deep-merge de la sauvegarde, `DICOS_OUVERTS` juste avant |
| 2144 | `CURIOS` — tableau des curiosités |
| 2195 | `CURIOS_ACTIVES` |
| 2209 | déblocage de `batte2` (toutes curiosités actives réunies) |
| 2539 | `VEHDEFS` — véhicules, éligibilité garage (`tuningMeca`, `tuningCarro`) |
| 2687 | `PROFILS_VOITURE` — silhouettes des voitures réalistes, `ancragesProfil`, modèles de luxe ajoutés à `VEHDEFS` |
| 3170 | mer V2 : `houle()`/`houleY()`, shader (`merV2Materiau`), sillage, éclaboussures, `assietteHoule()` |
| 3479 | `finaliserMerge()` |
| 4060 | `mkLittoral()` — fondus sable/mer/désert, vagues sur le sable |
| 4115 | `mkHorsLesMurs()` — décor factice hors de l'enceinte |
| 4231 | `MOB_CAT` — catalogue du mobilier urbain, puis `mkMobilierUrbain()`, `majMobilier()`, `garerVelos()` |
| 4762 | `JETEE` — jetée de fête foraine : `ZONES_SANS_MOBILIER`, `mkJeteeForaine()`, `majJetee()` |
| 4893 | `SKATE` — skatepark : `mkSkatepark()`, `texMurSkate()` |
| 4542 | `SKX` — Reyes Skatepark XXL : `hauteurSkateXXL()`, `zoneVertSkate()`, `mkSkateXXL()`, `majSkateXXL()` |
| 5109 | `PORT` — port vivant : `mkPortVivant()`, `majPortVivant()` |
| 5208 | `BROOK` — Brooklyn : `texFresque()`, `mkBrooklyn()`, `majBrooklyn()` |
| 5424 | `CIEL` — dirigeable, avion à banderole, mouettes, feux d'artifice : `mkCiel()`, `majCiel()` |
| 5693 | `CRIQUE` — crique des plongeurs : `dansCrique()`, `mkCrique()`, `plongeonJoueur()` |
| 5909 | `NEON` — quartier néon : `BATIMENTS`, `reserverNeon()`, `mkNeonVivant()` |
| 5977 | `VILLA_PISC` — finitions de quartier : `mkQuartiersFinitions()` |
| 6057 | `MONT` — Mont Reyes, puis `CANYON` (canyons) et `RIDES` (courses) |
| 4515 | `SOLS` — dalles de sol enregistrées, puis `mkTransitionsSols()` (jonctions entre sols) |
| 10907 | `mkLacParc()` — lac du parc, passerelle, barques |
| 11036 | `mkLumieresQuartiers()` — Times Square, quartier chinois, Brooklyn |
| 11122 | `mkEnceinte()` — murs, enseigne, jetées de rochers |
| 11654 | `GALION` — galion échoué : `sansAleaVille()`, `coqueGalion()`, `mkGalion()`, `majGalion()` |
| 12686 | `mkPorteGarage()` — porte roulante des garages |
| 12756 | `placeLibrePorte()` |
| 12815 | helper `poser()` — placement des lieux |
| 12841 | `caseCentre(bx,bz)` |
| 12934 | `REPLIS` — filet de sécurité en spirale |
| 15553 | `makeVelo()` — vélo de ville et BMX |
| 13574 | `voitureV2()` — voiture réaliste : `geoVoiture` (géométries partagées par modèle), `janteVoiture` |
| 12602 | `ENSEIGNES` — portes mieux placées : `ameliorerPortes()`, `profondeurDevant()`, `orienterPorte()` |
| 16062 | `const P` — état du joueur |
| 16105 | `P.stamMax = 100 + 12*mus` |
| 17289 | `resoudreCollisionsVehicule()` — collisions entre véhicules (SAT sur les 4 axes) |
| 17946 | `majRemorquage()` — accroche/remorquage (dépanneuse et treuil du garage) |
| 18070 | `boutonsAPied()` — boutons du HUD remis « à pied » (sortie de véhicule ET début de partie) |
| 18991 | `TRAFIC_*` — réglages du trafic, `horsEcran()`, `obstacleSurVoie()` |
| 19122 | `majTrafic()` — suivi de file, priorité au carrefour, contournement, filet anti-blocage |
| 21199 | `IOFF = -9000` |
| 22888 | `INTDEFS` — définitions des **27 salles** |
| 23073 | `construireSalle(id)` |
| 20390 | `CHALUTIER_BANCS_PLAN` — chalutier V2 ; `chalutierMaj` (20761), `dessinerRadarChalutier` (21018) |
| 29909 | `METIERS_CIBLE` |
| 30208 | `TUNING_PRIX` — tous les prix du garage, groupés (pièces comprises), puis `TUNING_CASSE_TAUX` |
| 30296 | `PIECES_FAMILLES` — catalogues de pièces par famille |
| 30598 | `garageCasser()` — après `garageEnregistrer`, `garageAcheter`, `garageChoisirVehicule` |
| 30661 | `libererObjet()` — libère les géométries d'un objet retiré |
| 30677 | `appliquerCarrosserie()` — passe d'ancrage des pièces |
| 30801 | `construireGarageTuning()` — la salle partagée |
| 31171 | `majNitro()` |

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
- **Séparation proportionnelle** (18 octobre, signalé : « dans un bouchon, des
  véhicules se tapent l'un dans l'autre et scintillent ») : deux véhicules qui
  se chevauchent sont écartés de leur seul chevauchement (le plus léger bouge le
  plus, 0,6 u par image au plus). Le pas fixe de 0,25 u luttait contre le suivi
  de voie à chaque image : jusqu'à 970 inversions de déplacement en 90 s sur un
  point. **Devant Los Reyes Hills**, la file d'un demi-tour s'étale côté ville :
  vers la colline, `pousserHorsHills` ramenait tout le monde sur la même ligne
  (un tas immobile qui tremblait). Test « Trafic sans scintillement ».

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

## Vue immersive (13 octobre 2026) — `VUE`, `META.vue`, bouton `#btnVue`

Demandée : « jouer avec la vue du chalutier, et pouvoir permuter vers la vue
actuelle à côté du bouton pause ». En VILLE seulement (les salles gardent
leur caméra, le bouton y est masqué) :

- **À pied** : caméra inclinée vers l'horizon (`VUE.PIED`), derrière le
  joueur ; elle ne tourne jamais toute seule (combat lisible) — on l'oriente
  en glissant le doigt sur une zone libre (canvas : le HUD est en
  pointer-events:none), double-tap = derrière le joueur.
- **En véhicule** : poursuite automatique (`VUE.yaw` suit `v.ang+π`).
- **Le joystick suit l'écran** : `litEntrees` tourne le vecteur selon l'angle
  de la caméra AFFICHÉE (`vueAngleEcran()`, 0 dans les salles et en vue
  classique). Les véhicules visant « la direction du joystick », la
  poursuite donne naturellement « haut = tout droit, droite = tourner »
  (mesuré : aucun zigzag, `sim_conduite_vue`). Flèche GPS, indicateur de
  dégâts et direction du boss sont relatifs à la caméra (la minimap reste
  nord en haut).
- **Immeuble entre la caméra et le joueur** : la caméra se relève
  (`vueDegagement`, sur les vrais solides — les bâtiments sont fusionnés, on
  ne peut pas les rendre transparents un par un).
- **Ciel en dôme** en ville (`VUE.ciel`, shader `CHAL_CIEL_FS`, horizon = fond
  de scène), brouillard plus lointain (`×(1+VUE.k×1,1)`).
- `META.vue` ('immersive' par défaut, 'classique') est sauvegardé.
- **Tests** : `scenarios.js` démarre en vue CLASSIQUE à chaque chargement
  (`evaluateOnNewDocument`) — les anciens scénarios sont écrits pour la vue de
  dessus ; le bloc « Vue immersive » règle la vue lui-même.
- À surveiller sur iPhone : la fluidité (on voit beaucoup plus de ville) ;
  la colonne jaune d'un objectif est énorme quand on se tient dedans.

## Retours de playtest, 2e série (14 octobre 2026)

- **Apparitions** (`apparitionCachee`, `facteurApparition`) : en vue
  immersive, trafic et ennemis apparaissent ×2,6 plus loin et seulement
  hors champ, derrière un bâtiment (solide plus haut que la ligne de visée)
  ou dans le brouillard. Mesuré sur 30 s : 66 apparitions, 0 visible,
  densité du trafic inchangée. Vue classique : inchangé.
- **Hauteur des véhicules** (`HAUTEUR_VEH`, `rehausserModele`, appelée par
  `makeVoiture`) : la caisse (au-dessus du haut des roues) est étirée
  sommet par sommet jusqu'à la hauteur réelle (bus 3,2, pompiers 3,1,
  ambulance 2,7, fourgon 2,3...) ; roues rondes, hiérarchie intacte. Les
  ancrages de tuning suivent (`ancragesReels`). Cosmétique.
- **Maisons et villas** (`hauteurMaison`, `mergeFacade`) : maison à étage
  (≥ 5,6 u), façade répétée (`uvFacade`), porte de 2,2 u. Tours de verre,
  Art déco, briques : `hauteurBatiment`. **Piège retrouvé** : le NOMBRE de
  pièces (bandeaux, escaliers de secours, lignes de tour de verre) doit
  rester calé sur la hauteur d'ORIGINE (`h0`) — chaque géométrie tire
  `Math.random` (uuid) et la ville se décalait (portes déplacées).
- **Piscines** : jamais d'ensemble des places garnies dessus
  (`surPiscine`), eau à 0,31 (une pelouse est à 0,28 : scintillement).
- **Stands de nourriture** (`STANDS`, `NOURRITURE_QUARTIER`,
  `acheterNourriture`) : chaque kiosque, food truck et chariot de glace
  vend la spécialité du quartier (hot-dog au centre, tacos au néon, beignets
  de crevettes au port...) qui rend des PV ; ensemble `stand` dans les
  quartiers qui n'en avaient pas. Ne soigne que blessé, coûte de l'argent,
  stand fermé `STAND_ATTENTE` s après une vente.
- **Armes** (`mkArmeModele(id)`) : un modèle par arme, canon vers -y depuis
  la main, dessus vers +z ; en main du joueur (`P.armeMeshes`, échelle
  inverse du muscle) et des ennemis.
- **Assiette des véhicules** : rotation `YXZ` partout (en `XYZ` le tangage
  tournait autour de l'axe du monde) ; tangage et dévers mesurés aux
  positions réelles des 4 roues, caisse relevée (`v.assietteDy`) pour
  qu'aucune roue ne s'enfonce. Monster truck : `franchissement` comme le 4x4.
- **Crique** (`geoFalaise`) : falaises en boîtes subdivisées, strates et
  bosses vers l'extérieur, ombres en couleurs de sommets ; corniches en
  rochers aplatis (`flatShading`).
- **Vélos au sommet du mont** (`garerRides`) : BMX, vélo, moto cross sur
  les replats près de `MONT.sommet`.
- **Basket** (`BASKET`, `mkBasket`, `majBasket(dt,dtJeu)`) : concours de
  tirs au court de Brooklyn, jauge de puissance, 5 postes ; prime une fois
  par vague (`primeMerUneFois('basket',…)`), passif = 0 point ;
  `treveActivite` le couvre ; remis à zéro dans `mourir`/`startRun`.
- **Wakeboard** : sillage en bandes d'écume texturées (plus de « traits »),
  vraie écume derrière le bateau (`sillageBateau(TOW.faux)`), caméra
  immersive derrière la planche (`TOW.cap`, `glisse` dans `vueCamera`).
- **Wingsuit** : voilure à bandes, traînées de bout d'aile ; record de
  distance (`META.wingRecord`, `finVolWingsuit`) ; 500 m débloquent la
  combinaison « Faucon » (`TENUES`, descente ×0,8).
- **Test de la serre rendu déterministe** : le pilote simulé tenait 2 à 5
  nuits sur 6 selon l'état de `Math.random` laissé par le temps réel ; les
  nuits sont tirées sur une graine propre posée APRÈS `startRun`.

## Style, boutiques et manèges (14 octobre 2026, 3e série)

- **Boutiques de style** (`BOUTIQUES_DEF`, `VETEMENTS`, `mkBoutiques`,
  `ouvrirBoutique`, `actionBoutique`) : chic (centre), surf shop (plage),
  street wear (néon), barbier (Brooklyn), tatoueur ; vitrines en plein air
  avec mannequins. Essayer ne coûte rien et ne reste pas (`BOUT.essai`) ;
  acheter (`META.garde`, dictionnaire OUVERT) porte la pièce ; on porte pièce
  par pièce (`META.style`, clés fixes : haut, bas, cheveux, coiffure,
  chapeau, lunettes, tatouage) **par-dessus la tenue** de la penderie
  (`coifCouleurs(style)`) : tenues dépareillées. `habillerTete` ajoute
  coiffure, chapeau, lunettes, tatouage (joueur, aperçu de la penderie,
  mannequins). Caméra de cabine de face, joueur immobile qui tourne.
- **Manèges** (`MANEGES`, `mkGrandHuit`, `majManeges`, `lancerManege`,
  `finManege`) : **grand huit** à l'ouest de la marina (courbe fermée
  Catmull-Rom, voie tubulaire, pylônes, gare ; montée à la chaîne puis
  vitesse par l'énergie, `huitVitesse`) : un tour payant, vue subjective au
  premier rang, cris, bonus de sensations ; **grande roue** de la jetée : un
  tour en nacelle, vue sur la ville. Pendant un tour : `majJoueur` n'est pas
  appelée, vagues en trêve (`treveActivite`), remis à zéro par `startRun`.
- **Toits vivants** (`TOITS`, `mkToitsVivants`, bandeau `TOITS VIVANTS`) :
  les toits plats des immeubles (solides `toit:true`, 9 à 32 u de côté,
  ≥ 10 u de haut) reçoivent, par rang (choix déterministe, aucun tirage) :
  piscine, bar en terrasse, terrain grillagé, jardin, hélipad (4 vrais
  hélicos garés par `startRun`, `TOITS.helis`), châteaux d'eau, panneaux
  solaires, **coffre à fouiller une fois par vague** (`coffreToitProche`,
  `fouillerCoffreToit` : argent, munitions ou grenades, jamais vide). Les
  tours > 26 u sans aménagement ont une flèche ou une pyramide. Décor
  fusionné (`fusionnerDecor`). Sur un toit (`P.y ≥ 4`), le bouton d'action
  ne propose jamais la porte de la rue en dessous.
- **Kayaks** (`coqueKayak`) : coque effilée, liston, hiloire, pagaie double
  animée — partagée par les pagayeurs et le kayak pilotable (avant : une
  boîte). Kayak de plage du mobilier : coque en ellipsoïde.
- **Motos** (`makeMotoV2`, via `vehiculeRestyle` : l'ancien modèle est construit
  puis le nouveau sur le générateur du décor, tirages inchangés) : routière
  (moto, Frelon), sportive carénée (motoS), cross à crampons (motocross,
  militaire), chopper (Fantôme). Pneu = cylindre d'axe y local (jantes du
  garage), pièces fusionnées par matériau (22 maillages au plus), géométries
  de jantes et de crampons en cache (`userData.partagee`). Assise du pilote
  lue sur le modèle (`ud.siege`, `entrerVehicule`). Échappement d'origine à
  part (`ud.echapOrigine`) : masqué quand le garage en pose un. Ancrages des
  pièces recalés sur les nouveaux modèles (testés : aucune pièce ne touche
  une roue).
- **Vie du Mont Reyes** : la même `FAUNE` que l'île, zone `'mont'`
  (`placerFauneMont`, `retirerFaune`, `montU`) : 5 bouquetins paisibles
  (`D.paisible` : ils fuient, les tuer coûte 50 de score et un message, rien
  à ramasser), 1 ours qui charge et mord ; percutés par le véhicule du joueur
  lancé ; figés au-delà de 160 u ; de retour à chaque vague. Décor
  (`VIE_MONT`, `mkVieMont`, `majVieMont`) : aigles qui tournent au-dessus du
  sommet, marmottes qui plongent dans leur terrier.
- **Badlands** (`mkCanyonsDesert`, `CANYON.est`, `CANYON.ouest`) : deux chaînes
  de mesas en zigzag de part et d'autre de la ligne des mesas, hauteurs de 20 à
  7 u (crêtes étroites et mesas larges), gaps de 12 à 16 u. Reliées à la ligne
  par des **tremplins latéraux** (`axe:'x'`, de `xa` à `xb`, posés jusqu'au
  bord RÉEL de la mesa, érosion comprise). Course `RIDE_DEFS.badlands` (six
  mesas est puis retour sur la dernière de la ligne) : robot 7,6 s en moto
  cross, 12,3 s en buggy, pour 20 s. Pas de cheminée de fée dans la zone.
  `CANYON.mesas` : la ligne reste aux indices 0 à 4 (lus par les courses et
  les tests).
- **Tenues des mini-jeux** (`TENUES`, `TENUE_EXPLOIT`, `exploitMiniJeu`,
  `META.exploits` — clés FIXES) : concours de basket → maillot « Ballers »
  (grenades ×1,35 de portée), tour de contrôle → gilet d'aiguilleur (avions
  et hélicos ×1,15), Supercross → « Pro Rider » (figures deux-roues ×1,3),
  Bowl Jam → skateur (bunny hop ×1,3 en hauteur), wakeboard → combinaison
  (nage ×1,3), Badlands → tenue « Badlands » (dégâts de chute ÷2). Débloquées
  par la VRAIE fin du mini-jeu (basketConclure, tourFinir, finirRide,
  finTow) ; capacité seulement tenue portée (`tenueK(id,k)`) ; écrite après
  « — » dans `condTxt` et affichée à la penderie.
- **Façades variées** (`mkFacadesVariees`, après les portes, générateur du
  décor) : sur la face SUD des immeubles (`BATIMENTS`, celle que voit la
  caméra), selon le quartier et le rang : murs-rideaux vitrés à meneaux et
  pilastres Art déco (centre), balcons, garde-corps, jardinières
  (résidentiel, plage), stores et climatiseurs (commerce, jamais devant une
  porte), échelles, conduites, bouches d'aération (industriel, port) ; rien
  au quartier néon. Purement visuel, à couleurs de sommets (`meshPieces`),
  fusionné par cellule de 120 u (le culling reste efficace). Budget testé :
  `FACADES_V` sommets. Une façade masquée par un immeuble collé devant est
  sautée.
- Tests : « Boutiques de style », « Manèges », « Toits vivants », « Motos »,
  « Vie du mont », « Badlands », « Tenues des mini-jeux », « Façades ».

### Performance : collisions entre véhicules (14 octobre 2026)

Mesuré : 120 véhicules en ville (garés compris : motos cross, vélos, avions,
hélicos...) = 14 400 paires par image dans `resoudreCollisionsVehicule`,
**88 ms par image** pour `majVehicules`. Désormais 11 ms :
- rejet immédiat par la distance des centres (`(long+larg)/2` majore la
  demi-diagonale : aucun contact réel écarté) ;
- phase large en tableaux typés (`COLL`, `collPreparer` au début de
  `majVehicules`, valable seulement pendant `majVehicules` et si la liste
  n'a pas changé, marge 4 u) : lire `x`, `z`, `def` sur ces objets aux
  formes très variées coûte cher (accès mégamorphes) ;
- sol des véhicules garés en cache tant qu'ils ne bougent pas (`solYGare`),
  jamais dans la cabine du monte-charge.
Tout nouveau parc de véhicules garés s'ajoute à ces 120 : mesurer.

### Mémoire : entités retirées (14 octobre 2026)

Une géométrie déjà affichée reste tenue par le moteur de rendu tant qu'on
n'appelle pas `dispose()`. Mesuré : 47 géométries et ~1,5 Mo de plus à
chaque partie (la faune de l'île, recréée par `placerFaune` — qui laissait
en plus les animaux vivants figés dans la scène) ; la suite de tests finissait
par faire planter le navigateur (« Target closed » à un endroit différent à
chaque fois). `libererEntite(o)` libère les géométries propres d'une entité
retirée (jamais celles marquées `userData.partagee` : corps humains, caches
de fuselages et d'ailes ; jamais le joueur ni les sprites) : appelée par
`nettoieMonde`, à la disparition d'un véhicule, d'un ennemi, d'un piéton,
et par `placerFaune`. Vérifié par « Aéroport, suite » (géométries stables
sur 3 parties). **Toute entité recréée à chaque partie passe par
`libererEntite` à son retrait.**

## Échelle des hélicos et du yacht, vie de l'aéroport (15 octobre 2026)

- **Hélicoptères à l'échelle** (signalé : « ramassés ») : `agrandirHelico`
  (appelée par `makeVoiture` pour tout `air:'helico'` sauf l'OVNI, et pour les
  hélicos ennemis) range le modèle dans un groupe agrandi `ECH_HELI` (×1,3 à
  ×1,6) et ramène le rotor à `ECH_ROTOR` × l'ancien diamètre (Écureuil :
  10,7 u, comme le vrai) ; les ombres-sprites restent hors du groupe. Cabines
  de 3,9 à 4,6 u. `ud.kHeli` : l'échelle (le treuil de l'aimant du Titan la
  lit). Encombrements `long`/`larg` mis à jour dans `VEHDEFS`.
- **Yacht privé** « Impérial » (signalé : « tout ratatiné ») : 22 × 6 u,
  franc-bord de 2 u, salon au pare-brise incliné (profils extrudés), flybridge
  à hardtop, arceau radar, bains de soleil, plage arrière ; pièces fusionnées
  par matériau ; pilote debout sur le flybridge (`ud.siege`, lu par
  `entrerVehicule`).
- **Vie de l'aéroport, suite** (`AERO_VIE`, `mkAeroVie` en DERNIER dans le
  décor, `majAeroVie`, `aeroVieStartRun`) : véhicules de piste qui circulent
  (vrais véhicules, `conduit:'piste'`, `majVehPiste` : boucles `boucleRect`
  / `pointBoucle`, arrêt et klaxon devant un piéton ou un véhicule, volables)
  — train de bagages, citerne, bus de piste, voiture FOLLOW ME
  (`habillerFollowMe`) ; placeurs qui guident aux bâtons l'avion arrivant à
  leur porte ; bagagistes au tapis chargeur ; mécaniciens ; avion de tourisme
  en tour de piste et Écureuil autour de la tour (décor) ; rampe d'approche en
  chenillard la nuit ; voyageurs et file de taxis à la dépose-minute ;
  carillon et annonce dans le hall. Personnel et voyageurs : LOD de la foule.
- **PNJ à l'eau** (signalé : « des PNJ qui marchent dans l'eau vers le sable ») :
  un ennemi qui ne nage pas, jeté ou projeté à l'eau, et un passant à l'eau
  NAGENT (`poseNage` : allongés, crawl, ordre d'Euler 'YXZ' le temps de la
  nage, `finNage` le remet à terre et avant toute chute) jusqu'à la rive la
  plus proche (`rivePlusProche`, 16 directions ; avant : debout, toujours vers
  le nord, même dans un bassin) ; les nageurs (`def.nage`) aussi nagent au
  lieu de marcher. Les gardes ne repassent plus par l'eau.
- **Test de la serre** : la serre tire sur SON générateur pendant le pilote
  (`serreMaj` enveloppée) ; ce que `majJoueur` consomme selon l'état laissé
  par d'autres tests changeait les besoins (2 à 8 nuits sur 10 selon la suite).
- Tests : « Échelle des hélicos et du yacht, vie de l'aéroport », « PNJ à l'eau ».

## Los Reyes Hills (15 octobre 2026) — `HILLS`, bandeau `LOS REYES HILLS`

Demandé : « un vrai quartier résidentiel, de vraies villas différentes, de
vraies piscines utilisables, des routes qui tournent et qui montent, comme
Beverly Hills ». Remplace l'ancien quartier des villas (cases bx 0..4,
bz 6..9). Réponses du joueur : remplacer le quartier ; la planque devient le
manoir du sommet (l'existante, améliorée) ; course de descente.

- **Ville inchangée ailleurs** : la ville est générée comme avant (MÊMES
  tirages), puis `reserverHills` (TOUT DÉBUT du décor, aucun tirage) retire
  l'ancien quartier (maillages entièrement dans la zone, solides, `SOLS`,
  trottoirs, lampadaires, feux, `VILLA_PISC`, bâtiments pas encore fusionnés,
  enseignes, stands…), calcule la colline et déplace trois lieux
  (`deplacerPorte`, `p.hills` : `ameliorerPortes` ne les touche plus) :
  concession REYES MOTORS et garage à l'entrée, planque au sommet.
  `mkLosReyesHills` est le DERNIER groupe du décor (ses tirages ne décalent
  rien). Contrôle des portes inchangé.
- **Relief** : grille `HILLS.h` (pas 1 u), lue par `solY` (`RELIEFS`) ET par
  le maillage. `hillsBase` monte vers le nord-ouest (30 u). Routes
  (`ROUTES_HILLS` : Reyes Hills Drive en lacets de l'entrée au sommet, Sunset
  Crest retirée le 16 octobre) échantillonnées tous les 2 u (`echantillonnerRoute`),
  hauteur MONOTONE le long du Drive, pente ≤ `HILLS.pente` (0,2). La
  chaussée gagne toujours sur le talus d'une parcelle, puis elle est
  **lissée** sur ses seules cases (dans une épingle, l'échantillon le plus
  proche sautait d'une branche à l'autre : marche = paroi pour la moto).
  `HILLS.route` (masque) : `surChaussee` dans la colline (portes, mobilier).
- **Villas** (`definirParcellesHills`, `mkVillaHills`, demandé : « différencie
  les villas, pas toutes les mêmes : provençale, californienne, etc. ») :
  parcelles plates le long des lacets des DEUX côtés (`p.f` = 1 amont, −1
  aval, la villa entière en miroir). Tailles `VILLA_TAILLES` (la grande
  s'étire en LARGEUR : entre deux lacets de 32 u, 17 u de profondeur ne
  tenaient jamais) ; cycle de tailles voulues, la taille voulue attend sa
  place si elle tient un peu plus loin. **Quinze styles** (`VILLA_STYLES`,
  tirés de 4 en 4 : jamais deux pareils) : chacun a sa maison
  (`VILLA_MAISON[style](c)`, repère de la parcelle, +z = la rue), ses
  couleurs en deux variantes, sa piscine (rectangle, ronde — `piscineRonde`,
  `BASSINS{r}` —, couloir de nage), sa clôture, son dallage et son jardin
  (`VILLA_DEF`, éléments `VILLA_JARDIN`). Toits par `geoToit` (croupe,
  pignon, pignonZ ; géométrie non indexée avec uv nuls pour
  `fusionnerDecor`). Maison au fond, piscine devant.
- **Murs de soutènement** (`murSoutenement`, `rubanMur`) : talus des
  parcelles de 2 u ; là où la parcelle est taillée dans la pente ou posée
  en terrasse, un ruban de pierre texturée (`matMurPierre`) suit le terrain
  (échantillonné tous les 1 u : les boîtes en escalier étaient laides), en
  deux gradins plantés au-delà de 4 u ; jamais côté rue. Règle de place :
  jamais à moins de 2,5 u d'un trottoir plus haut ou plus bas, mur borné
  par la distance.
- **Piscines en hauteur** : `piscineHills` pousse dans `BASSINS` un niveau
  `y` ; `niveauEau(x,z)` remplace le 0 de la mer pour la nage (joueur,
  piétons, ennemis) et la noyade des véhicules (`v.noyeBase`, ils coulent
  depuis le niveau de la piscine).
- **Trafic** : `creerTrafic` n'y crée rien ; `majTrafic` fait demi-tour au
  bord (`pousserHorsHills`, aussi après le recul de file : sinon oscillation).
- **Vie** (`VIE_HILLS`, `hillsStartRun` dans `aeroStartRun`, `majVieHills`) :
  3 voitures de sport sur la boucle du Drive (`conduit:'piste'`,
  `boucleRoute`), voitures de luxe dans 2 allées sur 3, deux gardes de la
  Brigada devant la plus grande villa, joggeurs sur le trottoir, jardiniers,
  arroseurs, piscines éclairées la nuit. Carte : `dessinerHillsCarte`.
- **Vie, suite** (demandé : « des gens qui se baladent, des décors de
  résidence, un panneau LOS REYES comme Hollywood, des voitures de luxe ») :
  `mkPanneauLosReyes` (lettres blanches sur échafaudage, couchées vers la
  caméra, dans la bande libre entre les deux lacets du haut MESURÉE sur les
  routes ; éclairées la nuit, `VIE_HILLS.lettres`), `mkResidenceHills`
  (guérite et barrière à l'entrée, massifs au cœur des épingles trouvées
  sur la route), `mkHabitantsHills` / `majHabitantsHills` (promeneurs
  accompagnés — couples, chiens `chienDeco`, poussettes, courses — toujours
  côté trottoir ; bronzeurs, baigneurs, barbecues, lavage de voiture, placés
  par `p.lay`, la disposition notée par `mkVillaHills`) ; boîtes aux lettres.
  Voitures de luxe : `HILLS_LUXE_ROULE` (cinq dans les lacets),
  `HILLS_LUXE_GARE` (allées).
- **Pièges trouvés** : le lacet du sommet débordait du bord nord (au-delà,
  la rue de la ville 30 u plus bas : `solY` = 0) ; les véhicules de la
  descente étaient garés SUR la chaussée (les voitures des lacets s'y
  arrêtaient pour toujours : garés sur l'esplanade du manoir) ; les voitures
  garées au hasard en ville visaient les anciennes rues de la grille sous la
  colline (exclue). Testé : aucun véhicule garé sur la chaussée de la colline.
- **REYES HILLS DOWNHILL** (`RIDE_DEFS.downhill`, `route:true` : tout
  véhicule terrestre) : du sommet à l'entrée, 45 s ; voiture de sport et
  moto garées au départ (`garerRides`). Pilote simulé : ~33 s.
- Tests : « Los Reyes Hills », « Villas de Los Reyes Hills », « Los Reyes
  Hills : descente chronométrée, vie du quartier ». « Finitions de
  quartier » compte les piscines des villas de la colline.

## Voitures réalistes et modèles de luxe (15 octobre 2026) — `PROFILS_VOITURE`, `voitureV2`

Demandé : « créer d'autres types de voitures et affiner les existantes avec un
rendu plus réaliste ». Citadine, berline, taxi, police, berline Viper, Rafale,
Éclipse, Mirage, Baronne, et quatre nouveaux modèles : limousine « Majesté »,
SUV « Sierra », cabriolet « Azur », hypercar « Zénith » (`VEHDEFS`, ajoutés
par `Object.assign` juste après ; vendus chez REYES MOTORS (`CATALOGUE`), dans
le trafic (`poolT` : SUV et cabriolet), dans Los Reyes Hills).

- **Silhouette profilée** (`PROFILS_VOITURE` : nez, capot, ceinture, malle,
  cul, toit, pied de pare-brise, pavillon, lunette, essieux, roues ; fractions
  de la longueur) extrudée en largeur, arêtes arrondies (biseau 0,07 : tout
  ce qui se pose sur les faces avant / arrière sort de `av+0,07` / `ar−0,07`,
  sinon c'est enfoui) ; passages de roue découpés dans le profil ; la ligne
  du dessus passe au-dessus des ailes (`aile`) : jamais de profil qui se
  recoupe (roues plus petites et essieux reculés sur les sportives).
- Habitacle vitré à part (verre teinté brillant, Phong), pavillon et
  montants peints (B selon `portes`), optiques, calandre, boucliers, bas de
  caisse, joints de portes, poignées, rétroviseurs, plaques, échappements,
  coques de passages de roue ; signatures : écope et bandes (Rafale), prises
  d'air, becquet, aileron (Zénith), chromes (Baronne, limousine, SUV), barres
  de toit, enseigne TAXI, rampe et portières blanches de police (`ud.bar`),
  cabriolet ouvert (sièges de cuir, volant, pare-brise à cadre).
- **Géométries construites UNE fois par modèle** (`geoVoiture`, `_GEO_VOIT`,
  fusionnées par matériau, `userData.partagee` : jamais libérées) ; jantes
  (`janteVoiture` : cinq branches, multibranches, chromées, acier, flancs
  blancs) enfants du pneu (`ud.roues`, axe y local). Peinture = `mat(coul)`
  (`peindreMesh` la retrouve). Construit par `vehiculeRestyle` (ancien modèle
  d'abord, puis le nouveau sur le générateur du décor : tirages inchangés).
- **Ancrages des pièces du garage** calculés sur le profil (`ancragesProfil`,
  appliqués à `VEHDEFS[k].tuningCarro.ancrages` au chargement) : plus jamais
  de valeurs recopiées à la main.

## Retours de playtest du 16 octobre — véhicules et conduite

- **Taxi, police et Rafale** gardent leur ANCIEN modèle (signalé : « le capot
  du taxi et de la police était mieux avant », « remettre la muscle comme
  avant ») : retirés de `PROFILS_VOITURE`. Profils `carre` (capot plat, nez
  haut, biseau 0,04 : berline, citadine, Viper, limousine, SUV), nouvelle
  **Charger** (`charger`, « Taureau »), **pick-up façon Raptor** (`pickup`
  dans les profils : `benne` = plateau ouvert et hayon découpés dans le
  profil, `ailes` = élargisseurs noirs, `raptor` = calandre noire, feux
  orange, sabot).
- **Raretés** : luxe et 4x4 « Coyote » rares mais trouvables (4 % du trafic,
  12 % des voitures garées au hasard en ville, une seule hypercar garée dans
  la colline) ; Charger et 4x4 en vente.
- Voitures garées dans les allées : près du portail (`zGareVilla`), jamais
  dans la maison. **Conducteur visible** en cabriolet (`ud.siege.assis`).
- **Personnages** ×0,9 (`ECH_HUMAIN`, dans `makeHumain` et `appliqueMuscle`).
- **Avion** : arrondi automatique sous 10 u (FREIN arrivait au sol à
  −11 u/s, crash au-delà de −4,5) ; au sol, joystick lâché = frein.
- **Pentes** : tout le skatepark XXL échappe aux parois (le vélo butait sur
  les rampes de pourtour) ; chaussée de la colline (`surRouteHills`) :
  adhérence pleine, gravité ×0,45, jamais une paroi. Sunset Crest retirée
  (48 % de pente).
- **Caméra de poursuite** : un second doigt la tourne (`VUE.offVeh`), elle
  revient derrière au relâcher ; elle suit le MOUVEMENT (drift visible) ;
  `vueAngleEcran` retranche les deux décalages : la conduite ne change pas.
- Test : « Retours du 16 octobre ».

## Retours du 16 octobre — chantier, Titan, planques, bords de la colline

Bandeau `CHANTIER ET PLANQUES V2` (juste avant `CASCADES ET VOLCAN`).
- **ETAGES** : planchers superposés RÉSERVÉS AU JOUEUR (dalles et rampes,
  `etageSous(x,z,yMax)`, lu par `majJoueur` : le plus haut plancher qu'on
  atteint d'un pas de 0,7 u) : on marche dessus, on passe dessous, on tombe
  au bord. Véhicules et PNJ ne les voient pas.
- **Chantier** (pâté 11,2) : vidé au début du décor (`reserverChantier` →
  `viderZone`, construit puis retiré : la ville ne bouge pas), rebâti à la
  FIN du décor (`mkChantierV2`) : immeuble « Los Reyes Tower » de 6 niveaux
  (rampes en ciseaux dans la travée ouest, poteaux solides, murs commencés,
  coffrages, ferraillage au dernier niveau), échafaudage et filet, grue à
  tour, aire de l'hélico-grue au sud-est (`CHANTIER.heli`, lue par
  `mkHeliGrue`), base de vie, matériaux, palissade. Les étages au-dessus du
  joueur s'effacent quand il est dedans (`majChantierV2` — **pas
  `majChantier`, qui est le jeu de l'arcade** : une fonction déclarée plus
  loin écrase la première, sans erreur).
- **Titan** restylé façon Skycrane (poutre ouverte dessous, cockpit en bulbe,
  poste de l'opérateur, turbines, train haut) ; **aimant** (`AIMANT_R` 9) :
  il descend jusqu'à la charge depuis n'importe quelle hauteur ; accrochée
  bas, elle ne décolle que quand on monte (avant : viser à 7 u ET tenir
  7–8 u de hauteur).
- **Planques** : l'ancien modèle de la caravane et du chalet est construit
  comme avant puis retiré (`pq.vieux`, solides notés par `_SOL_TRACE` dans
  `addSolid`, `retirerSolide`), le nouveau posé à la fin (`mkPlanquesV2`,
  `deplacerPlanque` recale balise et zones). Caravane Airstream en plein
  désert (emprise de 15 u libre : avant, seul le centre était testé et elle
  finissait dans une mesa) ; chalet en rondins près du sommet du Mont Reyes,
  sur une terrasse à pilotis (`PLATS`), cheminée qui fume, sapins.
- **Bords de Los Reyes Hills** (`mkBordsHills`) : mur de soutènement en
  pierre appareillée, contreforts, chaperon, garde-corps, lierre, arbustes.
- Test : « Retours du 16 octobre, monde ».

## Figurants interactifs (16 octobre 2026) — `FIGURANTS`, `majFigurants`

Demandé : « les PNJ de l'aéroport et du résidentiel : je dois pouvoir les
tamponner ou leur tirer dessus, ce qui créera de la panique ; idem dans les
salles ».
- Tout figurant de décor de la ville est déclaré (`figurant(h, lies)` :
  aéroport, Los Reyes Hills, chantier). Touché (balle : `toucherFigurant`,
  appelé en tête de `collisionBalle` ; véhicule lancé ; coup), il devient un
  VRAI piéton (`convertirFigurant` → `pietons`, même corps) et tombe
  (`tuerPieton`) ; un danger proche (`DANGER` : tir, explosion, un des leurs
  touché) le fait fuir. Le couple fuit ensemble (`lies`).
- Les systèmes du décor ignorent un figurant converti
  (`h.g.userData.converti`, `figConverti`) : **tout nouveau figurant de décor
  passe par `figurant()` et son système teste `figConverti`**.
- À chaque partie (`restaurerFigurants`, en tête de `hillsStartRun`), les
  figurants devenus piétons reviennent au décor à leur place d'origine
  (relevée à la 1re partie) — sinon l'aéroport et la colline se vidaient.
- Chute : `ent.solRag` = sol du corps (0 en ville ; sur la colline, à
  l'aérogare, le corps ne passe plus dessous).
- Salles (`VIE_SALLES`) : touché par une balle ou un coup, le figurant tombe
  (`salleFigurantTombe`, `s.mortsFig`), reste sonné 7 s puis se relève ; les
  autres se mettent à couvert.
- Test : « Figurants interactifs ».

## Retours du 17 octobre — tir en relief, faune, conducteurs

- **Tir en relief** (signalé : « sur les collines et la montagne, ni moi ni
  les ennemis ne pouvons tirer ») : toutes les hauteurs de tir et de touche
  se comptent depuis le SOL de chacun (`solY`) : départ des tirs ennemis,
  visée (`hCibleJoueur`, `hCible`), collisions de `collisionBalle` (ennemis,
  piétons, véhicules, caisses, joueur au volant), sol et plafond des balles
  dans `majPools` (avant : y < 0,05 ou > 40 → sur le mont, les balles du
  joueur mouraient au départ), souffle des explosions.
- **Faune du mont posée dès sa création** : figée au loin (LOD), elle
  restait à (0,0), en plein centre-ville (« un ours qui ne bouge pas »).
- **Conducteurs visibles** (`majChauffeur`, dans `majVehicules`) : véhicule
  ouvert (`ud.siege.assis` : cabriolet, 4x4, jeep militaire) conduit par un
  PNJ = passager assis ; voiture `voitureV2` = silhouette derrière un vitrage
  teinté légèrement transparent. Le joueur est assis visible dans le 4x4.
- **Jeep militaire** : carrosserie du 4x4 (`jeep:true`), 4,4 × 2,1 u, affût
  de mitrailleuse sur le toit (`ud.tourelle`).
- **Chantier** : chaque engin à sa place (Titan nez à l'ouest, bulldozer
  devant le sable, camion-grue entre le conteneur et les bungalows, pick-up
  dans la rue). Caméra immersive plus lointaine en soucoupe.
- Test : « Retours du 17 octobre (1) ».

## Retours du 17 octobre (2) — Los Reyes Hills : big jump, héliport, terrain

- **Terrain** (signalé : « trop vert, trop uniforme ») : collines de Californie
  en couleurs de sommets (herbe sèche dorée, taches de maquis, terre nue sur
  les pentes, affleurements ; `bruitDecor`, bruit de valeur sans tirage), le
  gazon vert seulement autour des parcelles, texture de détail (brins). Le
  terrain a désormais des uv : **`userData.garder`**, sinon `fusionnerDecor`
  l'avale et perd ses couleurs (rendu noir).
- **Accotements** (signalé : « la démarcation avec la route est trop
  uniforme ») : deux bandes de gravier PAR CÔTÉ, du bord du trottoir vers
  l'extérieur, chaque sommet sur le terrain (un ruban unique, large, ne
  suivait pas les talus et recouvrait la chaussée), bord déchiqueté
  (`alphaMap` + `alphaTest`), ombre de bordure ; cailloux, touffes, agaves
  (placement par hachage, sans tirage).
- **BIG JUMP** (`SAUTS_HILLS`, demandé : « sauter jusqu'en bas ») : un
  tremplin au bord de la falaise nord, dans l'axe de la rue x = -210, 30 u
  plus bas. Piste d'élan à chevrons depuis le lacet du dessous (elle croise
  le lacet du sommet, dont la chaussée n'est pas touchée), lèvre sculptée
  dans `HILLS.h` au-delà du trottoir (`sculpterSautsHills`, après le
  lissage), jamais une paroi (`presTremplinHills` dans la règle des pentes),
  décollage à la vitesse de montée de la lèvre ; réception de cascade
  (`v.sautHills`, `finSautHills`) : jamais mortelle, sans casse, distance,
  points, record `META.stats.bigJump`, prime une fois par vague au-delà de
  `SAUT_HILLS_PRIME` m. Pylônes, bannière sur la falaise, distances le long
  de la rue, cible peinte. **Un seul tremplin** : à x = -168 la lèvre
  tombait sur la chaussée, et deux pistes coupaient les lettres LOS REYES
  (décalées à l'est de la piste). Matériaux des rubans vus de dessus :
  `DoubleSide` (sinon le sens du tracé les cache).
- **Héliport du manoir** (`HELIPORT`, parcelle `heliManoir` à l'ouest du
  manoir, même hauteur) : dalle noire au « H » d'or couronné, balisage
  (clignote la nuit), manche à air, salon ; console (`heliportAction`,
  panneau `ouvrirHeliport`) : `HELIS_MANOIR` — Libellule offerte avec la
  villa (`META.planque`), Écureuil, Titan, Riviera, Vautour à acheter une
  fois (`META.helisManoir`, clés fixes) ; l'hélico choisi
  (`META.heliManoir`) est posé à chaque partie (`poserHeliManoir`, dans
  `startRun`) et dès qu'on en change (l'ancien est retiré, d'où qu'il soit).
- Test : « Retours du 17 octobre (2) ».

## Retours du 17 octobre (3) — le ciel, les boutiques, le ball-trap

- **Le ciel se percute** (`CIEL_CIBLES`, `cibleCiel`, `majCielCibles`,
  demandé : « le dirigeable passe à travers les montagnes ; on peut taper
  dedans et se crasher, et le crasher aussi ; idem les avions ; ils reviennent
  à la prochaine vague ») : dirigeable, avion à banderole, avion de tourisme
  et Écureuil de l'aéroport. Ellipsoïde dans le repère de l'objet
  (`dansCibleCiel`, suit cap et échelle) ; balles et roquettes du joueur
  (`toucherCiel`, jamais sous 4 u) ; un appareil du joueur qui en percute un
  s'écrase (`crashAerien`) et l'abat ; abattu : chute en vrille (le dirigeable
  pique du nez), explosion au sol (`explosionArme`), disparu jusqu'à la vague
  suivante (`cielRetablir`, dans `lancerVague` et `startRun`). Les mises à
  jour d'origine ne pilotent plus un appareil abattu. Le dirigeable suit
  `profilDirigeable` (relief et toits sous sa boucle, +9 u, monte AVANT
  l'obstacle) : avant, à 19 u, il traversait Los Reyes Hills et les tours.
- **Boutiques en salle** (`INTDEFS.boutique`, demandé : « dehors, les PNJ nous
  tirent dessus ») : UNE salle pour les cinq boutiques, comme les garages
  (`porte.boutiqueId`, `boutiqueSurEntree`) : enseigne, murs, tapis, cintres
  et pliés aux couleurs des pièces, mannequins habillés
  (`mannequinBoutique`), variantes (fauteuils du barbier, table du
  tatoueur, planches du surf shop). Porte devant chaque vitrine
  (`sortieD` : on ressort juste devant elle, jamais sur la chaussée) ;
  cabine à miroir au fond (`cabineBoutique`, `ouvrirBoutiqueSalle`), caméra
  de face comme avant. **Piège** : en remplaçant le début d'une branche de
  `construireSalle`, remettre l'en-tête de la suivante (la concession s'est
  retrouvée dans la boutique).
- **Tir à la première personne** (`FPS`, bandeau `TIR À LA PREMIÈRE
  PERSONNE`) : moteur partagé (ball-trap, bientôt le stand de tir de
  l'armurerie). `FPS.actif` = la partie ; `majCamera` → `fpsCamera` (œil,
  arme en main en bas à droite, recul) ; `majJoueur` n'est pas appelée ;
  visée au joystick (vitesse) ou au doigt (glisser), TIR seul visible ; un
  tir = rayon depuis la mire avec dispersion (degrés, /2), plombs, cadence,
  chargeur, rechargement de `armeStats`. Tout sur `dtJeu`. `fpsArreter` dans
  `mourir` et `startRun` ; trêve des vagues. Plan proche de la caméra à
  0,05 pendant la partie (0,5 sinon). **En portrait, le champ horizontal
  est étroit** (~31° à fov 62) : cibles près de l'axe, `fov` 80.
- **Ball-trap du ranch « Coyote Loco »** (`BT`, `mkBallTrap`) : dans la
  bande plate entre le tarmac et les mesas (le reste du désert au sud est en
  relief), tourné vers le sud (les mesas en fond). Papy Earl lance plateaux,
  poulets, nains, pastèques, flamants, télés, WC, plateau d'or — et la
  colombe de Mamie (−300). 60 s, combo ×8, `BT_OBJECTIF` 3 500 (pilote
  simulé : ~7 000 ; passif : 0) : prime une fois par vague et tenue de
  cow-boy (`exploitMiniJeu('balltrap')`, fusils à pompe −20 % de dispersion).
- **Armurerie V2** (`INTDEFS.armurerie` 40 × 30, demandé : « se balader,
  choisir et acheter armes et protections, les tester, les personnaliser
  — or, double pistolet/uzi, balles explosives — les voir se personnaliser
  comme une voiture, retourner l'arme ») : mur des armes à feu rangées par
  familles (panneau centré sur chaque famille), vitrine des armes blanches,
  gilets sur mannequins (`inter.gilets`, achat direct `actionShop('gilet')`),
  comptoir, établi à plateau tournant. Le mur nord devient une vitre (son
  solide reste) : au-delà, le hall du **stand de tir** (34 u, plafond,
  butte, distances) ; `ouvrirStandTir` (choix de n'importe quelle arme à
  feu, possédée ou non, gratuit) → `lancerStandTir` (moteur `FPS`,
  silhouettes `mkSilhouette` entre 8 et 30 m, mobiles ou non, civils −200 ;
  rien à gagner). **Établi** : `ATELIER.apercu` (ESSAYER → la pièce apparaît,
  rien n'est payé ; une seule finition `FINITIONS_ARME` ; `double` montre la
  jumelle ; oublié à la fermeture), `habillerArme(g,id,Lforce)` ; l'arme se
  retourne au doigt (`ATELIER.ang`/`tilt`, rotation automatique 3 s après le
  geste) ; le doigt ne fait alors plus tourner la vue de la salle. Les
  enseignes ÉTABLI et MUNITIONS étaient posées en coordonnées de salle sur le
  `mkEnseigne` global : elles flottaient en ville (`ens` local désormais).
- **Piège : le décor aussi a ses tirages.** Un objet Three.js créé dans le
  PREMIER groupe du décor (avant `mkMobilierUrbain`) tire 4 nombres pour son
  uuid sur le générateur du décor : tout le mobilier et les places garnies
  bougent (une statue est venue se poser à 9 u du départ : « Tir par la
  vitre » ne touchait plus sa cible). Les halos des portes de boutique sont
  donc posés en fin de décor (`mkHalosBoutiques`).
- **Piège retrouvé** : un `//` ajouté dans une ligne qui continue avale la
  suite (`fermerAtelierArme` ; les lanceurs du ball-trap avaient disparu
  sans erreur). Écouteurs du canevas : APRÈS la création de `renderer`.
- **Captures (outil)** : une page ouverte pour composer les images passe au
  premier plan et la page du jeu ne rend plus (`bringToFront` avant de
  reprendre) ; rendu et `toDataURL` dans la MÊME évaluation.
- Tests : « Le ciel se percute », « Ball-trap du ranch », « Armurerie V2 »,
  « Boutiques de style » (entrée par la porte, cabine en salle).

## Terrains de sport des parcs (17 octobre) — `SPORTS`

Demandé : « un terrain de foot et d'autres terrains de sport pour faire vivre
l'endroit de verdure ». Deux pâtés du parc libres (aucun POI, porte, stand),
vidés au début du décor (`reserverSports`, `ZONES_SANS_MOBILIER`) et rebâtis
à la fin (`mkSportsParcs`) :
- **Stade du parc** (6,1) : pelouse en bandes, lignes, cages à filets,
  corners, bancs, tribune et supporters (ils sautent au but), projecteurs la
  nuit, tableau d'affichage (canvas). **Match à cinq contre cinq**
  (`SPORTS.foot`, `majSportsParcs`, sur `dt`, LOD 150 u) : vrai ballon
  (gravité, rebonds, frottement, bords qui renvoient), le plus proche de
  chaque équipe va au ballon, les autres tiennent leur poste (fractions du
  demi-terrain), le gardien suit sur sa ligne ; frappe vers le but adverse.
  Le joueur frappe le ballon en courant dedans (`footFrappeJoueur`, à pied ou
  en véhicule) ; son but = prime une fois par vague (`primeMerUneFois('foot')`).
  Joueurs et supporters sont des figurants : visé, un joueur fuit et le match
  s'arrête ; `footDemarrer` (dans `startRun`) le relance.
- **Complexe sportif** (5,1) : court de tennis grillagé (échange scripté),
  deux tables de ping-pong, street workout (tractions, pompes).
- Test : « Terrains de sport des parcs ».

## Surprises sur les toits, carte, catalogue (17 octobre)

- **Surprises sur les toits** (`SURPRISES`, `mkSurprisesToits` en fin de
  décor, `majToitsSurprises` après `majJoueur`) sur les toits nus (types 8
  et 9 de `mkToitsVivants`, sans flèche, hors quartier néon et ses grands
  panneaux) : **tyroliennes** (entre deux toits au décor discret — jardin,
  panneaux solaires, coffre ou nu —, le second de même hauteur ou plus bas,
  14 à 60 u, les pieds du passager jamais à moins de 0,3 u de ce qu'il
  survole ; tenu sur le câble comme dans le monte-charge, joystick gelé).
  **Les toits sont notés par `mkToitsVivants`** (`TOITS.nus`, `TOITS.cands`,
  `s.tyToit`) : recalculée en fin de décor, la liste avait d'autres solides
  et les types se décalaient (un trampoline entre deux châteaux d'eau) ; **trampolines** (`trampolineSous` : à
  l'atterrissage sur la toile, `majJoueur` renvoie au lieu de blesser ;
  `P.trampoT` 2 s de grâce sur les dégâts de chute en quittant la toile ;
  on se dirige en l'air comme en chute), **pigeonniers**, **murs à taguer**
  (canvas, tags `TAGS`), **fête du DJ** (danseurs figurants, faisceaux) :
  une fois par vague chacun.
- **Carte** : fond en haute résolution (`MM_RES` = 5, 960 px ; avant 384,
  flou au zoom), emprises des immeubles éclaircies selon la hauteur, eau
  échantillonnée (lac, bassins), stade et tennis, pâtés de Fort Reyes.
  **`pointsActivites()`** : la liste unique des activités en plein air (lue
  aux sources) — balises 3D (`mkBalises`, désormais en FIN de décor : avant,
  la colline, la base, le ball-trap, les sports n'avaient pas de balise) et
  filtre « 🎢 Activités » de la grande carte (`MAPUI.filtres.activites`).
- **Catalogue vivant** (`catalogue.html`, à ouvrir par le serveur local —
  `ouvrir-catalogue.bat` le lance et ouvre la page ; un double-clic sur le
  fichier ne marche pas) :
  charge `index.html` dans un cadre caché, arrête sa boucle, lit les tables
  du jeu (par `eval` dans le cadre : les `const` ne sont pas sur `window`)
  et photographie avec les fonctions du jeu (`makeVoiture`, `mkArmeModele`,
  `makeHumain`, `mkAnimal`, `construireSalle`, vues de la vraie colline pour
  les villas) ; le journal des améliorations est lu dans CLAUDE.md. Rien n'y
  est recopié : une nouveauté du jeu y apparaît au rechargement (seuls les
  descriptifs des salles, `DESCRIPTIFS`, sont écrits à la main).
- Tests : « Surprises sur les toits ». « Figurants interactifs » stabilisé
  (`P.frappeT` hérité d'un autre test refaisait tomber le figurant).

## Retours du 18 octobre — arme au choix, concession, skate, armureries, derby

- **Choix de l'arme avant un tir à la première personne** (`ouvrirChoixArme`,
  panneau commun au stand de tir et au ball-trap, `STAND.opts`) : au ranch,
  le fusil à pompe de Papy Earl est prêté, toute arme à feu possédée peut
  servir (`btArmes`), et les armes plus difficiles comptent plus
  (`btMult` : coup par coup ×2, précises ×1,4 à ×1,6, rafale ×1,2 →
  `cfg.mult` dans `fpsToucher`). Le bouton TIR montre l'icône de l'arme du
  mini-jeu (`fpsDemarrer`) et son chargeur, puis celle de l'arme en main
  (`fpsArreter` → `majArmeJoueur`).
- **Concession REYES MOTORS** (`mkConcessionHills`, `CONCESSION`,
  `majConcession`) : un vrai showroom (signalé : « un immeuble, c'est
  étrange ») — bas, vitré sur toute la façade, montants alu, auvent sur
  colonnes, deux voitures sur podiums tournants dedans, esplanade
  d'exposition, totem, fanions. Même emprise (la porte ne bouge pas).
  **L'enseigne d'un lieu (celle de sa porte) n'est jamais masquée** : le
  test « Portes » le vérifie (`ENSEIGNES`, `lieu`).
- **Skate** (`VEHDEFS.skate` : `velo:true, skate:true`, `makeSkate`) : un
  vélo sans moteur ni dégâts ; debout de profil, jambes écartées, bras
  ouverts ; pied arrière qui pousse ; ESQUIVE = OLLIE (appui bref) / MANUAL
  (maintenu), en l'air SPRINT = 360 SHOVE-IT, GRENADE = KICKFLIP, les deux =
  TRE FLIP (`FIG2R.spin/flip.skate`). **Seule la planche tourne**
  (`ud.planche`, ordre 'YZX') : le skateur reste debout. Engins garés aux
  deux skateparks à chaque partie (`garerSkateparks` en tête de
  `garerRides`, `v.auSkatepark`) : skates, BMX, vélo.
  **Piège** : une fonction de modèle appelée par `makeVoitureBase` doit
  finir par `g.userData=ud` — sans ça, `ud.planche` et `ud.corps`
  manquaient et la figure faisait basculer tout le véhicule.
- **Armureries de la carte** (`porteArmurerieProche`, signalé : « aux
  armureries de la minimap, j'ouvre l'ancienne page en liste, je ne trouve
  pas l'entrée ») : devant chacun des deux marqueurs « A », le bouton
  d'action fait ENTRER dans la salle V2 (avant : l'ancienne page, qui passait
  avant la porte de la salle, à 1,5 u). L'armurerie sud n'a pas de porte
  dans `PORTES` (une de plus décalerait la ville) : une porte calculée devant
  sa façade (`_porteArmSud`), même salle, on ressort là où on est entré ;
  balise au-dessus. Nom unique : « Armurerie ». La liste reste au comptoir
  de la salle (munitions, grenades). Test « Armureries de la carte » (lit
  les marqueurs dans `listeCommerces`).
- **Arène de derby** (bandeau `ARÈNE DE DERBY`, `DERBY`, demandé : « l'arène
  de derby, et des voitures de derby avec des améliorations derby ») : dans
  le désert du sud-est, entre le Skatepark XXL et la bordure est, au-dessus
  de la plage (terrain libre relevé par une carte d'occupation). Le décor
  du désert fusionné y est replié sous le sol (comme au Skatepark XXL).
  - Arène (`mkArenaDerby`, avant `mkBalises`) : terre battue (pas du sable :
    `estSable` l'exclut), murs de pneus solides aux coins coupés (solides en
    escalier), portail à deux battants (`DERBY.porte`, solide `actif` fermé
    pendant le match), tribunes au nord et public instancié
    (`InstancedMesh`, sphère englobante posée à la main pour le culling ;
    il saute aux chocs et aux épaves), cabine du speaker, tableau
    d'affichage (canvas : chrono, numéros, PV), mâts d'éclairage la nuit,
    banderoles, stand au sud-ouest (garage, voitures exposées avec les
    améliorations achetées, `derbyMajExpo`), balise 💥.
  - **Voitures** (`derbyBreak`, `derbyCompacte`, `derbyPickup` : carrosseries
    de `voitureV2` par leur `profil`, habillées par `habillerDerby`) :
    numéros sur portières et toit, pare-chocs bélier, tôles rivetées,
    grilles, cage, échappements, compresseur, flancs blancs, rouille et boue
    (tirés du numéro, sans hasard), fanion. Ni garage
    (`messageNonGarable`), ni tir par la vitre (`vehiculeTireur`).
  - **Améliorations** (`META.derby` : clés fixes `voiture`, `poss`, `niv`,
    `victoires`, `kos` ; prix `DERBY_PRIX`) communes à toutes les voitures de
    derby : bélier (coups de face +35 %/niveau), blindage (−13 %/niveau,
    `v.blindage`), moteur, pneus. `appliquerDerby` : copie propre de la
    définition, `VEHDEFS` jamais modifié.
  - **Match** (`derbyLancer` au stand, `majDerby`, chrono `DERBY_DUREE` sur
    `dtJeu`) : cinq IA (`conduit:'derby'`, `majDerbyIA` dans
    `majVehicules`) visent la voiture la plus proche (au plus 1 sur le
    joueur au niveau 0, 3 au niveau 3), anticipent, **reculent après chaque
    impact pour reprendre de l'élan** (un choc ne fait de dégâts qu'au-delà
    de 7 u/s cumulés : pousser au contact n'abîme personne), coup de cul si
    la cible est derrière. `derbyCoeffs` : de face, le bélier frappe plus et
    l'avant protège (×0,6) ; sur le flanc ×1,3 ; la paire du choc
    (`DERBY._paire`) crédite les dégâts infligés (`v.dbInflige`). À 0 PV :
    **épave** (`derbyKO`) — jamais de feu ni d'explosion (`abimerVehicule`,
    `exploserVehicule`), elle fume et reste un obstacle. Dernier qui roule =
    victoire ; au temps, le plus de dégâts infligés (un passif perd
    toujours). Les IA ménagent le joueur au niveau 0 (`forceIA` ×0,6, ×1 au
    niveau 3) ; le niveau monte toutes les 2 victoires. Compte à rebours :
    le joystick est figé (`derbyEntrees`, avant `majJoueur`). Descendre de
    sa voiture = abandon. Prime une fois par vague
    (`primeMerUneFois('derby')`), combinaison « Casse-cou »
    (`exploitMiniJeu('derby')` : dégâts reçus au volant −15 %), défis (thème
    `derby`). Trêve des vagues ; `derbyArreter` dans `mourir` et `startRun`.
  - Simulé (`DERBY_DEGATS` 0,7) : pilote au joystick réel, réaction 0,3 s,
    tactique de charge → gagne environ 2 matchs sur 5 au niveau 0 ; passif
    → toujours perdu.
- **Test « Aéroport, suite »** : chaque partie mesurée rejoue le même tirage
  (le compte des géométries variait de ±50 avec le trafic et les voitures
  garées près du départ, sans aucune fuite).
- Tests : « Skate », « Armureries de la carte », « Arène de derby » ;
  « Tenues des mini-jeux » et « Tir par la vitre » suivent le derby.

## Armes, mains et cibles du stand (18 octobre, 2e demande)

Demandé : « retravaille les cibles au stand de tir et la qualité des armes et
du visuel avec le bras qui tient les armes ».
- **Armes V2** (`construireArmeV2`, `mkArmeModeleV2`, `ARMES_V2`, juste avant
  `mkArmeModele` qui leur délègue les armes à feu) : treize armes modelées en
  pièces — profils latéraux extrudés à arêtes adoucies (`pr` : carcasse,
  culasse, poignée inclinée et quadrillée, crosse, chargeur courbe, pontet
  évidé), tubes, tambours, anneaux, rails Picatinny, organes de visée,
  lunettes, détente — fusionnées par matériau et mises en cache UNE fois par
  arme (`_GEO_ARMES`, `userData.partagee`). Matériaux Phong partagés
  (`matsArme` : acier, bronzé, polymère, chrome, bois veiné, olive, sable…),
  créés à la première utilisation. **Repère inchangé** (canon vers −y, dessus
  +z, axe du canon vers z ≈ 0,09) : `habillerArme` (silencieux, laser,
  finitions) et les mains des personnages n'ont pas bougé. La culasse des
  pistolets est une pièce à part (`userData.culasse`). Le couteau, la batte,
  le sabre et le désintégrateur gardent leur ancien modèle.
- **Piège r128** : `BufferGeometry.applyQuaternion` n'existe pas encore ;
  passer par `applyMatrix4(makeRotationFromQuaternion(q))`.
- **L'arme en main en vue FPS** (`fpsMontage`, `fpsBras`, `FPS_POSES`,
  `ANCRES_ARME`) : R suit la caméra, W est la main qui tient la poignée
  (pivot du recul), H porte le modèle tourné vers l'avant de la vue. Deux bras
  jusqu'aux mains posées sur les ancres (poignée ; garde-main, seconde
  poignée ou poignée de transport ; au pistolet la main gauche enveloppe la
  droite) : gants coyote (ils ressortent sur une arme noire), poignets nus,
  manches à la couleur du haut porté (`coifCouleurs`). Portrait : champ
  horizontal étroit (~31°), l'arme est petite, en bas à droite, tournée vers
  le centre (on voit son flanc). Animations (`fpsCamera`) : balancement,
  retard sur le regard, recul pivoté à la poignée, culasse qui recule,
  rechargement (l'arme plonge et pivote), flamme de bouche ; douilles éjectées
  (`fpsEjecter`, réserve fixe de six, `majDouilles`). Tout est libéré à la fin
  (`libererEntite` : jamais les géométries partagées). `FPS.modele` n'existe
  plus : c'est `FPS.montage`.
- **Cibles du stand V2** (`mkCibleStand`, `standCible`, `zoneCarton`,
  `zonePlaque`, `ciblesRes`) : carton de tir à zones imprimées (tête ×2,
  centre ×1,5, corps ×1, bord ×0,6), civil bleu « NE PAS TIRER » (−200),
  plaque d'acier qui sonne (`fpsTing`) et bascule ; sur pieds ou sur un
  chariot qui roule sur un rail au sol (9 et 14 m). Elles se lèvent (pivot au
  pied), se couchent en fin de vie ; touchées, elles tombent en arrière avec
  l'impact visible. **La touche se calcule au point d'impact sur le plan de la
  cible** (`c.forme(u, v)`, dans `fpsTirer`), u, v depuis le centre du torse :
  viser `c.x, c.y` touche toujours (les tests le font). Cibles agrandies
  (`CIBLE_ECH` 1,25) et plus proches (5 à 16 m) : lisibles en portrait. Hall
  (`standTirDecorV2`, à la 1re séance) : rails, merlons, rampes lumineuses
  sous les chicanes du plafond.
- Vérifié en rendu réel (galerie des armes, les douze armes en main, un tir et
  la chute de la cible, le ball-trap, la vue à la 3e personne) ; tests
  « Armes », « Tenues », « Ball-trap », « Armurerie V2 » inchangés et verts.

## Le Dépôt V2 (18 octobre, 3e demande) — `construireDepotV2`

Demandé : « refonte globale du dépôt de bus, ce n'est pas clair ; des terrains
cohérents, aussi sur les bordures, et sur la sélection des véhicules ; le
pick-up n'est pas un pick-up ; des éléments de partout sans cohérence ».
Logique de course **inchangée** (tracés, IA, plafond, raccourci, chute,
passerelle, places, contenants : mêmes positions) ; la branche `depot` de
`construireSalle` n'appelle plus que `construireDepotV2` (fonctions juste
avant `depotVerifierVague`).
- **Un lieu qui se lit** : la cour (enrobé, muret de brique et SORTIE au sud,
  hangar des bus à l'est avec cinq bus garés, atelier de la casse à l'ouest),
  La Casse à l'ouest (terre, épaves empilées, murs de pneus, compacteur), Les
  Quais à l'est (béton, bassin et chenal d'eau, conteneurs, entrepôts, cargo),
  et au nord le plateau s'arrête (mur de soutènement, garde-corps) : Le Toit
  est l'immeuble voisin en anneau, relié par une passerelle, la ville 45 u
  plus bas. Routes et panneaux relient la cour aux départs (portiques).
- **Ce qu'on voit est ce qui compte** : pistes, bacs à gravier, vibreurs,
  murs de pneus et glissières sont maillés sur le MÊME polygone que
  `depotDistancePiste` (`depotBande`, `depotParoi`, `depotParcourir` :
  décalages à onglets ; une normale de segment = (−dz, dx)/l). Le toit
  s'arrête exactement à `largeur/2 + 7` (la limite de chute), la brèche sous
  la passerelle a le rayon 7 de `depotVerifierChute` ; les glissières des
  Quais s'ouvrent là où passe le raccourci. Projecteurs toujours hors piste.
- **Sélection** : places numérotées (1), fiche de chaque véhicule derrière
  lui (canvas : vitesse, accélération, maniabilité, résistance, verrou), le
  choisi sous un projecteur (`depotSpot`) ; le TABLEAU DES COURSES (2) est un
  écran géant (`depotEcran`) et **un seul appui ouvre le panneau**
  (`ouvrirDepotPanneau`, `DEPOT_PANNEAU`) : véhicule + course + LANCER
  (`depotLancerCourse`). L'ancien cycle « voir / armer 1,5 s / relancer »
  est supprimé (`circuitIdx`, `circuitArme` restent déclarés, inutilisés).
  Le panneau se ferme en s'éloignant, au lancement, à la sortie, à la mort et
  dans `startRun`. Mise à jour 2 fois par seconde, seulement si l'état change
  (`depotMajDecor`, appelée par `majInterieur`).
- **Vrais modèles** (`VEHDEFS.depotX.modele`, lu en tête de `makeVoiture`) :
  citadine, pick-up à benne (profil Raptor), supercar, bus de ville, à la
  couleur du Dépôt ; les IA sont repeintes (bleu, vert, violet) pour qu'on ne
  les confonde pas avec le joueur. Physique inchangée (`v.def` = la fiche du
  Dépôt).
- **Salles voisines à 400 u** : rien au-dessus du sol au-delà de |x| = 352
  sur le plateau (murs d'enceinte de 9 u qui cachent les voisines) ; la ville
  en contrebas et les tours au loin sont au nord (z < −200), là où aucune
  salle n'existe. Décor fusionné par matériau (`fusionnerDans(g, i0)` :
  `fusionnerDecor` limité à un groupe) ; modèles statiques aplatis
  (`aplatirModele`) pour rejoindre la fusion.
- Éclairage : nuit bleutée (`DEPOT_CIEL`), soleil 0,52, ciel 0,7, brouillard
  70–320.
- Test : « Le Dépôt V2 » (206 sondages au sol par lancer de rayon le long des
  tracés : piste dedans, gravier dehors, toit jusqu'à la limite de chute, vide
  au-delà ; passerelle intacte puis effondrée ; panneau, projecteur, bus
  verrouillé ; vrais modèles ; rien chez les voisines). Le chemin joueur passe
  désormais par le panneau.

## Fort Reyes, la base militaire V2 (17 octobre) — `BASE`, bandeau `FORT REYES`

Demandé : « un héliport avec l'hélicoptère dessus (il était à cheval sur une
voiture), les véhicules à des endroits précis, une entrée plus majestueuse,
plus de vie, un défi qui débloque une tenue militaire ».
- **Quatre pâtés refaits** (`reserverBase` au DÉBUT du décor → `viderZone`,
  `mkBaseV2` à la FIN) : place d'armes (12,1 : mâts et drapeaux qui
  flottent, char-monument sur socle, section qui marche au pas, soldats aux
  pompes), parc des véhicules (11,1 : places marquées `BASE.places`, filet de
  camouflage), héliport (13,0 : « H », balisage qui clignote la nuit, manche
  à air, citerne, radar — `POIS.radar` —, mécaniciens ; `BASE.heli` lu par
  `startRun` pour le Vautour), parcours du combattant (13,1). Entrée
  monumentale : piliers à étoile d'or, fronton « FORT REYES — BASE
  MILITAIRE », six mâts, guérite, barrière, sacs de sable, sentinelles.
- **Les dalles sont posées AU-DESSUS du pavage du pâté** (trottoir à 0,22 :
  sous lui, tout disparaissait, le « H » compris).
- **`fusionnerDecor` saute `userData.garder`** : ce qui s'anime (drapeaux,
  balisage, anneaux du parcours) ne doit pas être fusionné.
- **Accès** (`baseAutorisee`) : S'ENGAGER à la guérite (`baseAction`) =
  visite libre pour la partie (`BASE.laissez`), ou le treillis porté ; pas
  d'alarme d'intrusion (`majWanted`), gardes passifs. Tirer ou frapper dans
  la base révoque l'accès (`BASE.revoque`, `addHeat(3)`) ; à l'alarme, les
  soldats du décor (figurants `ennemi:'soldat'`) deviennent de vrais soldats
  (`convertirSoldat`).
- **Parcours du combattant** (`lancerDefiBase`, `majDefiBase` sur `dtJeu`,
  `BASE_DEFI_T` = 25 s) : slalom, pneus, mur (plateforme), filet, 7 portes
  (anneau de la suivante seul visible) dont la 7e derrière le muret du pas
  de tir, 4 cibles à abattre (`toucherCibleBase`, testée sur le trajet de la
  balle du dernier 1/30 s : à 60 u/s une balle saute 2 u d'une image à
  l'autre). Réussi : prime une fois par vague (`primeMerUneFois('base')`),
  treillis « Fort Reyes » (`exploitMiniJeu('base')`, `TENUE_EXPLOIT.base`).
  Trêve des vagues pendant le défi ; `mourir` le termine ; `resetBase` dans
  `startRun`.
- Test : « Fort Reyes » (places sans chevauchement, Vautour seul sur
  l'héliport, intrusion / engagement / tir, pilote au joystick 10,8 s sur
  25, passif = raté).

## Cascades et volcan (15 octobre 2026)

Demandé : « de la cascade à des endroits, avec de la déco, et de la lave sur
l'île au pirate avec de la fumée ». Bloc `CASCADES ET VOLCAN` (avant
`mkFacadesVariees`), décor sur le générateur du décor, animé sur `dt`
(horloge `CASC_U`, `majCascades` dans la boucle).

- **Cascades** (`mkCascade`, `mkCascades`) : grande cascade de la face sud du
  Pic du Vertige (côté ouest : le tremplin, le plongeoir et le monte-charge
  sont à l'est), cascade de la falaise nord de la crique dans la baie.
  Ruisseau sur le dessus (`ruban`), rideau qui s'arque en tombant
  (`matChute`), écume, brume (`mkPanache` : réserve fixe de sprites, jamais
  d'allocation en jeu), rochers mouillés, mousses, fougères, fleurs,
  arc-en-ciel le jour. Au pied du Pic, un **bassin = vraie eau**
  (`BASSINS`, `dansBassin` dans `estEau`) : on y nage, on y plonge sans se
  blesser ; un véhicule terrestre s'y noie comme au lac.
- **Volcan de l'île aux trésors** (`ILE2.lave`, `calculerCoulee`,
  `mkVolcanIle`, `majVolcan`) : cratère taillé dans `hauteurIleTresor`, lac de
  lave, coulée jusqu'à la mer (direction tirée parmi les orientations vers
  la caméra, la plus loin des trous, du camp et du crâne ; rien de la jungle
  n'y pousse), berges de basalte, vapeur à l'arrivée en mer, panache de
  fumée, braises, lueur (sprite : aucune `PointLight` de plus). Lave
  (`matLave`, `polygonOffset` : le relief est maillé plus grossièrement) :
  elle brûle à pied (`dansLave`) et abîme un véhicule terrestre ; les
  animaux ne s'y placent ni n'y entrent.
- Test : « Cascades et volcan ».

## Armes et armurerie (14 octobre 2026, 3e série)

- **Nouvelles armes** : AA-12 (pompe automatique), revolver Magnum,
  arbalète (discrète), minigun (`lourd` : −18 % de vitesse en main) ;
  modèles dans `mkArmeModele`, clés déclarées dans `META.armes`.
- **Modifications** (`MODS_ARMES`, `acheterMod`, `META.modsArmes` —
  dictionnaire OUVERT, dans `DICOS_OUVERTS`, valeurs « a,b,c ») : balles
  explosives (`impactSpecial` : 40 % des dégâts autour, jamais le joueur),
  incendiaires (`e.feuT` : brûle 3 s et panique), chargeur (+50 %),
  silencieux (presque plus de recherche), laser (dispersion ×0,4), **akimbo**
  (pistolet, silencieux, revolver, Uzi : cadence ×1,8, chargeur ×2, une
  arme dans chaque main, `P.armeMeshesG`), choc électrique (armes blanches),
  finitions or/camo (une seule). `armeStats` lit les modifications ; la
  munition spéciale voyage avec la balle (`TIR_MOD` → `b.mod`). Visuels :
  `habillerArme` (silencieux, laser, chargeur, bague, finition) ;
  `rebatirArmeJoueur` après un achat. **Rien de Three.js au chargement**
  (`_MAT_OR`, `_texCamo` paresseux).
- **Armurerie** : les armes à feu en vente exposées en 3D sur les râteliers
  (`inter.murArmes`, zones ≥ 8 u de la sortie) : acheter, prendre en main ;
  armes blanches dans la vitrine ; **établi** (`inter.etabliArmes`,
  `ATELIER`, `ouvrirAtelierArme`) : l'arme équipée tourne en grand, caméra
  penchée (`cadrageSalle`), panneau des modifications, ◀ ▶ pour changer
  d'arme ; on ne marche pas tant qu'il est ouvert.
- **Gilets** (`GILETS`, au comptoir) : tactique (100) et lourd (150, −8 %
  de vitesse) ; `P.bouclierMax` pour la jauge ; gilet visible sur le torse
  (`P.giletMesh`) tant qu'il protège ; remis à zéro par `startRun`.
- **Lance-flammes** : jet dense (cœur clair, flamme qui s'élargit, fumée) ;
  enflamme ennemis (`e.feuT`) et piétons (`p.feuT` : ils courent, puis
  tombent ou s'éteignent).
- Test : « Armes ».
- **Course en mer** (`rideFleche`, `rivalesDemarrer`, `majRivales`,
  `rivalesFin`) : flèche GPS 3D au-dessus du véhicule vers la porte suivante
  (toutes les courses à portes, distance dans le bandeau) ; au rallye des
  bouées, trois rivales du même modèle (décor scripté, pilote à leur
  couleur, rattrapage doux, jamais de collision), classement en direct,
  prime ×1,5 si tu finis premier ; retirées à l'arrivée, à la mort et par
  `startRun`. Test : « Course en mer ».
- **Hélicos ennemis restylés** (`makeHeli(type)`) : police « Rapace »
  (fuselage galbé, livrée POLICE, projecteur qui balaie la nuit) ; armée
  « Vautour » (`ETYPES.heliArmee`, à 6 étoiles) ; version pilotable
  `VEHDEFS.vautour` (`armes:true` : roquettes et bombes comme le chasseur),
  garée à la base militaire à chaque partie.

## Retours de playtest, 3e série — correctifs (14 octobre 2026)

- **Véhicule = mur pour les ennemis** (`libreEntite`, et `degageDeVehicule`
  à chaque image dans `majEnnemis`) : tous leurs déplacements testent les
  véhicules, pas seulement les bâtiments (ils « entraient » dans le char).
- **Bateaux** : braquage minimal même au ralenti (`facVir` sur l'eau) ; un
  petit bateau (long < 12) à flot, avec de l'eau devant la proue, vire en
  avançant au lieu de reculer (`controleDir`) ; échoué ou face à la terre,
  il recule ; les grands navires manœuvrent toujours en arrière.
- **En bateau** (`collisionsSurf` appelée depuis `majVehiculePhys`, rayon
  selon la largeur) : surfeurs fauchés, nageurs ennemis percutés et
  projetés, kayaks chavirés, planches poussées. **Kayak** pilotable
  (`VEHDEFS.kayak`, `pagaie:true`, sans moteur) : « PRENDRE LE KAYAK » à la
  nage. **Un nageur ne tire jamais** (`!e.dansEau`).
- **Chutes** (`lancerRagdoll`, `majRagdoll`, `ragdollLevage`) : pose tirée
  au sort selon la violence (côté, dos, ventre, vrille), jambes jointes,
  bras qui battent en vol puis le long du corps, petit rebond ; le corps
  est soulevé selon son inclinaison et son axe : **jamais sous le sol** ;
  un mort garde sa pose (`poseMort`). Projection plus forte en véhicule,
  depuis le véhicule (`tuerPieton(..., srcX, srcZ)`).
- **Piétons** : apparaissent à 42–68 u (× `facteurApparition`), hors de vue
  (`apparitionCachee`).
- **Cyclistes** (`mkVelo` : vrai modèle de vélo, cycliste qui pédale) :
  renversés par un véhicule lancé (`renverserCycliste`), le vélo reste à
  terre et se prend. **Chiens** percutés (`percuterAnimal`) : projetés,
  message négatif drôle (`MSG_ANIMAL`), −50 points.
- **Dauphins** (`mkDauphinMesh`) : vrai modèle ; le bond apparaît à 35–70 u
  en eau libre ; le banc qui accompagne un bateau rapide arrive de loin et
  repart en plongeant (`MERV.banc`), plus d'apparition d'un coup.
- **Fourgon** (`mkFourgon`) : modèle dédié (un volume haut), ancrages de
  tuning remesurés ; retiré de `HAUTEUR_VEH`. **Char** massif (7,8 × 3,7 u,
  chenilles à galets, jupes, glacis, tourelle à masque, long canon) ;
  l'obus part de la bouche. **Bulldozer** : lame baissée d'office, un
  véhicule devant la lame est emmené à sa vitesse.
- **Dégradations** (`degatsVisuels`, `reparerVisuels`, appelées par
  `abimerVehicule` et les réparations) : voitures et camions, trois étapes
  cosmétiques (≤ 75 % : pare-brise fendu, rayures ; ≤ 50 % : tôles
  enfoncées, pare-chocs qui pend, débris ; ≤ 30 % : capot soulevé, panneau
  arraché, caisse de travers), groupe `ud.degats` enfant de la caisse.
- **Méga-yacht** : superstructure sur quatre niveaux (le pont praticable
  reste à 1,31) ; son hélico (`VEHDEFS.vip`, « Riviera ») reste accroché à
  l'hélipad tant qu'il est posé (avant : décroché à plus de 3 u).
- **Wakeboard** : de profil sur la planche (fixée sous les pieds, elle
  suit les figures), pieds sur les fixations, penché contre la corde,
  carving, compression à la réception ; le saut au sillage dépend de la
  vitesse latérale (en l'air l'élan est conservé : plus haut et plus loin) ;
  un OLLIE dans la demi-seconde avant la vague : saut ×1,4 (« POP »), +25 %
  de points.
- **Tests rendus robustes** (état laissé par d'autres tests) : serre (perso,
  muscle, tenue fixés), faune de l'île (arme fixée), bateaux échoués
  (relance de 5 s), hélico du yacht lu dans `GYACHT.heli`. Tests :
  « Retours 3e série », « Véhicules retravaillés ».

## Aéroport vivant et hélicoptères (14 octobre 2026, 3e série)

- **Aérogare** (`AERO`, `mkAeroportVivant`, `majAeroportVivant`,
  `aeroStartRun`) au nord-ouest du tarmac, **derrière l'enceinte est**
  (x = HALF+14) : la dépose-minute passe entre le mur et la façade (taxi et
  bus garés à chaque partie). Façade de verre (entrées à l'ouest, portes
  d'embarquement à l'est), verrière (on voit l'intérieur de dessus),
  comptoirs, sûreté, salle d'embarquement, café (stand `q:'aeroport'`),
  tapis à bagages qui tournent, tableaux départs/arrivées redessinés depuis
  le trafic réel (`aeroTableaux`). Foule sur itinéraires (départ : dehors →
  comptoir → sûreté → porte ; arrivée : l'inverse), figée et masquée au-delà
  de `AERO_LOD`. Décor statique **fusionné par matériau** (`fusionnerDecor`).
- **Trafic aérien** : deux portes (`AERO.portes`, passerelles). Un
  long-courrier de décor (`AERO.dec`) arrive du sud par la mer, se pose,
  roule, vire et se gare à une porte libre où il devient un **vrai
  véhicule** (`VEHDEFS.ligne`, pilotable). Après `AERO_ESCALE` s, s'il est
  toujours là et que le joueur n'est pas à bord, il est repoussé et décolle
  vers le sud. **Une seule piste** (`AERO.piste`) : réservée jusqu'à la
  disparition d'un départ (sinon il croisait l'arrivée suivante en vol).
  Un avion qui roule bouscule le joueur à pied. Spectacle sur `dt`.
- **Nouveaux avions** (`mkAvionV2`, `def.modeleAvion`) : « Pélican »
  (tourisme, aile haute) et « Albatros » (jet privé) dans les hangars de
  l'aéroclub et de l'aviation d'affaires (`hangarAvion`), long-courrier
  « Reyes Air » (28 u). Le voltige est dans **son petit hangar**, immobile
  (`POIS.aerodrome.ang` ; il ne tourne plus sur lui-même). Le Colibri
  quitte la piste (`POIS.piste` sur l'aire).
- **Aéroport, suite** : 3e hangar **FRET** au sud de la tour de contrôle
  avec le cargo « Baleine » (`VEHDEFS.fret`, bimoteur : `ud.rotor2` suit
  `ud.rotor`). **Véhicules de piste** pilotables (`AERO.piste4`, garés au
  sud de l'aérogare, modèles `mkVehPiste`, `def.modeleAero`) : tracteur de
  repoussage, camion-citerne (`def.citerne` : explose en grand, souffle à
  12 u), passerelle à escalier, tracteur à bagages et son chariot ; tous
  `tuningMeca`. **Tour de contrôle** (`TOUR`, `lancerTour`, `majTour` sur
  `dtJeu`, poste radar `AERO.tour` à 15 u au sud de la tour — au pied, la
  cabine haute le cachait vu d'en haut) : écran radar plein écran, toucher
  un avion l'autorise à atterrir, une seule piste (`TOUR_ATTERR` s),
  carburant par avion (urgences en rouge) ; à sec = crash = perdu, temps
  écoulé = perdu ; `TOUR_OBJ` posés = prime une fois par vague. Vérifié :
  gagné en 49 s sur 80 en jouant bien, perdu sans rien faire (30 s) ou en
  traînant. Trêve des vagues, joueur immobile, remis à zéro par `startRun`.
- **Caméra immersive sous un toit** (aérogare, hangars) : elle reste sous le
  plafond (`VUE.kToit`, toit = solide à `base`).
- **Hélicoptères** (`mkHelicoV2`, `def.modeleHelico`) : « Écureuil » sur
  l'hélipad de la Tour Los Reyes, hélico-grue « Titan » au chantier
  (`mkHeliGrue`, `POIS.heliGrue`).
- **Aimant du Titan** (`majAimant`, appelée par `majRayonOvni`) : GRENADE
  accroche le véhicule au sol le plus proche sous la poutre
  (`aimantCandidat`, assez bas sous l'aimant), il pend `AIMANT_GAP` u plus
  bas et se balance ; rappuyer le lâche. **Réutilise le rayon de l'OVNI** :
  `captureOvni`, `v.cibles`, chute et dégâts (`rayonMajCible`) ; les
  nettoyages du rayon (`rayonNettoyerTout`, sortie, explosion) couvrent
  `def.aimant`. Caméra immersive qui recule quand l'aimant porte une charge
  (`VUE.kCharge`).
- **Planques en plein air** (`PLANQUES_DEF`, `mkPlanques`, `planqueProche`,
  `planqueAction`, `planqueSpec`, `planquesStartRun`) : caravane du désert,
  penthouse sur le toit de la Tour Los Reyes (ascenseur pour redescendre,
  `PLANQUES.ascTour`), cabanon de plage, chalet retranché au Mont Reyes,
  voilier amarré à un ponton neuf, taudis de la zone industrielle. Achat sur
  place (`META.planques`, **clés fixes**), tenue débloquée (`TENUES`,
  `cond` sur `META.planques`). Possédée : repos (une fois par vague,
  `PLANQUES.usage`, remis à zéro par `startRun`), coffre (`META.revenus`
  partagé avec la villa, alimenté à chaque vague par `lancerVague`),
  spécificité une fois par vague (atelier, plongeoir BASE, punch,
  armurerie, disparaître, grenades), véhicule garé à chaque partie.
  Enseignes « À VENDRE » masquées une fois achetées ; badges `H` sur la
  carte (`listeCommerces`), balises.
- Tests : « Aéroport vivant », « Hélicoptères », « Planques ». Le test « le bus est le
  plus long véhicule terrestre » exclut désormais les aéronefs.

## Vue immersive partout (14 octobre 2026, 3e série)

- **Dans les salles** (`salleImmersive`, `VUE.SALLE`) : toutes les salles
  sauf le chalutier (sa caméra de poursuite) et le menu du garage. Caméra
  plus proche et plus plongeante, **bornée aux murs** de la salle (elle monte
  de ce qu'elle perd en recul) ; brouillard resserré (jamais les autres
  salles, 400 u plus loin) ; pas de dôme de ciel. Entrée : on regarde le
  fond de la salle ; sortie : dos à la porte (`INT.rYaw`). Le bouton 3D/2D
  reste affiché en salle. `vueAngleEcran()` renvoie toujours `VUE.yawRendu`
  (0 en vue classique).
- **Plafond masqué** (`vueSalleHaut`, `vueMasquerHaut`, `vueRendreHaut`) :
  ce qui pend au-dessus des têtes (bas du mesh > `VUE_HAUT_Y`) et les
  enseignes de la salle (dans `ENSEIGNES`, ajoutées à la scène), quand ils
  sont dans le couloir caméra → joueur, sont masqués **par calque**
  (`layers.disable(0)`), jamais par `.visible` que le jeu pilote ; tout est
  rendu à la sortie de la salle ou de la vue immersive.
- **Véhicules** : caméra plus basse et plus proche (`VUE.VEH`), champ qui
  s'ouvre avec la vitesse (+16°), traits de vitesse au-delà de 18 u/s.
- **Avion à banderole** : plus lent (`AVION.v` 12,5), plus haut en vue
  immersive, banderole qui pend verticale face à la caméra.
- **Lunette du sniper** (`lunetteSniper`, `LUNETTE`, `majLunetteUI`) : après
  0,35 s de visée, la caméra passe derrière l'épaule, champ serré selon la
  distance ; ◀ ▶ pivotent la visée, ▲ ▼ règlent la distance, on ne marche
  plus ; le laser s'efface ; au relâcher, tir et la vue garde l'axe du tir.
- **Serre** (`serrePotAvantSortie`) : le pot du milieu de l'étagère est à
  3,4 u de la SORTIE ; en pleine nuit, un pot en besoin plus proche que la
  sortie passe avant elle (sinon soigner ce pot faisait quitter la serre —
  trouvé par le pilote simulé). Le pilote lit le bouton avant d'appuyer.
- Tests : « Vue immersive dans les salles » (toutes les salles de
  `INTDEFS`, 3 points × 4 orientations), « Lunette du sniper ».

## Retours de la vue immersive (14 octobre 2026)

- **Tremplins** (`retirerRampesAbsurdes`, fin de la pose des tremplins) : un
  tremplin de la ville dont la réception (30 u devant la lèvre) tombe sur un
  bâtiment est retiré ; les 4 « planches sur cales » des rues (`.retirer`)
  aussi. Construits PUIS retirés (tirages). `mkRampe` renvoie la rampe et
  note ses meshes. Testé : aucun tremplin face à un bâtiment (`s.toit`).
- **Cadrage** : `VUE.PIED`/`VUE.VEH` — le joueur vers le milieu de l'écran,
  au-dessus des boutons (signalé : « les boutons sont sur le joueur »).
- **Bouton de vue** : pastille « 🎥 3D / 2D » contrastée (`#btnVueTxt`).
- **Le large** : `LIMITE_SUD_MER` (= MER+430, avant MER+150) pour la nage,
  les bateaux, les appareils et `pointApparition` ; plan de mer agrandi.
- **Vie au large** (`mkLarge`, `majLarge`, `VIE_MER` — **pas** `mkVieMarine`,
  qui existe déjà : bouées et mouettes du rivage) : récifs SOLIDES avec
  écume et cormorans, voiliers au mouillage (solides), bancs de poissons
  qui dérivent (poissons qui sautent, mouettes qui piquent, gerbe quand un
  bateau les traverse), tortues. Jamais sur un parcours (rallye, remorquage),
  une île, un spot de plongée, un tremplin flottant, un cargo.
- **Balises** (`mkBalises`, `majBalises`, `BALISES`) : une icône flottante
  (sprite, `depthTest` coupé : vue à travers les immeubles) au-dessus de
  chaque salle (`PORTES` + `INTDEFS.ico`), de chaque course (`rideDepart`
  pour `RIDE_DEFS`), du wakeboard, du parachute ascensionnel, de la wingsuit,
  du saut BASE, du monte-charge, de la banderole, de la paillote, de l'île
  au trésor, du skatepark, du jetpack — sources lues, jamais recopiées.
  Fondue au loin (`BALISE_PORTEE`), presque transparente dessus, masquée en
  salle. **Enseignes lisibles de dos** (`mkEnseigne` : face arrière enfant
  du panneau, en ville).
- Test : « Vue immersive, retours ».

## Échelle de la ville et places garnies (13 octobre 2026)

Playtest en vue immersive : « le personnage paraît énorme à côté des
bâtiments », « remplir ces carrés vides, le monde paraît vide ».

- **Mesures** (1 u ≈ 1 m) : personnage 1,8 u, voiture 4,5 u, rue 13 u —
  cohérents. Le défaut venait des façades : 7 étages dessinés quelle que
  soit la hauteur (≈ 1,4 u par étage sur un immeuble de 10 u).
- **`hauteurBatiment(h)`** (dans `mkBatiment`) : ×`ECHELLE_BAT` (1,8), jamais
  plus de +8 u, jamais au-delà de `BAT_H_MAX` (38 u : la vue classique, ~44 u
  au-dessus du joueur, ne traverse pas une tour) — les gratte-ciel déjà plus
  hauts (jusqu'à 66 u) restent tels quels. **Les tirages restent calés sur h
  d'origine** (seuils h>14, h>7, h>34) : la ville ne bouge pas (portes
  vérifiées identiques). Hélipad, jetpack et ascenseur suivent le vrai sommet.
- **`uvFacade`** : la texture des façades se RÉPÈTE (`RepeatWrapping` dans
  `matFacade`) — un étage = une travée = `ETAGE_U` (3 u) sur tous les
  immeubles, fenêtres allumées la nuit comprises.
- **Places garnies** (`mkPlacesGarnies`, dans `mkMobilierUrbain`) : ensembles
  cohérents (`PLACES_ENSEMBLES` : fontaine, statue, square, kiosque, marché,
  terrasses, aire de jeux, food trucks, pique-nique, stocks) choisis par
  quartier (`PLACES_QUARTIERS`), jusqu'à 3 par pâté au cœur des pâtés ;
  chaque objet passe la règle `libre` du mobilier (portes, garages,
  objectifs) ; un ensemble n'est posé que si son objet principal et ≥ 70 %
  des autres tiennent. Nouveaux objets dans `MOB_CAT` (fontaine, statue,
  toboggan, balançoire, bac à sable, pelouses, food truck, caisses, tables).
  Tirages sur `aleaDecor`. Relevé : `PLACES_STATS` (329 ensembles).
- La caméra immersive se relève aussi devant la couronne des arbres
  (`vueDegagement`, rayon 1,2).
- Vitesse de marche **inchangée** (10 u/s : équilibre ennemis, police,
  chronos) — à revoir seulement si l'impression persiste en jeu.
- Test : « Échelle des immeubles et places garnies ».

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
- **V3 visuelle (13 octobre, playtest : « on dirait le jeu d'avant, peu
  immersif »)** — la logique n'a pas changé, tout est dans le rendu :
  - **Caméra de poursuite** (`chalutierCamera`, appelée par `majCamera` APRÈS
    la vue normale, fondue par `s.camMerK`) : derrière la poupe, tournée vers
    l'horizon, à quai (suit le joueur, `s.camQuaiK`) comme en mer ; à la pêche
    elle pivote vers tribord (`s.camPecheK` : ligne, bouchon, saut du Roi).
    À l'entrée (fondu `ETAT.intT`), directement la bonne vue.
  - **Ciel en dôme** (`CHAL_CIEL_FS`, rayon 190, enfant de `s.merMonde` : le
    soleil tourne avec le cap ; il cache aussi les salles voisines) ; couleurs
    `chalutierCouleursCiel` lissées sur `uTempete`, éclairs `s.eclair`.
    Côte à l'horizon dans la direction du port (`s.coteLoin`).
  - **Mer** (`CHAL_MER_VS/FS`, plan 96×96) : houle nulle sous la coque, reflet
    du ciel (Fresnel, `uCam` = caméra dans le repère mer), chemin de soleil,
    écume ; **sillage de Kelvin et vague d'étrave calculés DANS l'eau**
    (repère du bateau `uCap`, intensité `uVit`) — pas de particules à la
    poupe (elles filaient vers la caméra en gros carrés blancs).
  - **Franc-bord** : la mer est descendue de `CHAL_DY` (niveau `CHAL_NIVEAU`) ;
    tout ce qui touche l'eau en coordonnées de salle (bouchon, gerbes, filet)
    se pose sur `CHAL_NIVEAU`. Roulis/tangage = la mer bouge (`merMonde`,
    ordre `XZY`). Coque à bandes, portique arrière, tangons, pavillon.
  - **Espadon** (`chalutierModeleEspadon`) : tour, couleurs de sommets,
    rostre, voile, queue en croissant ; saute AU BOUT DE LA LIGNE
    (`s.ligneFinX/Z`), ronds dans l'eau (`s.ronds`, pool), gerbes.
  - Récifs en amas de rochers (bruit sur la POSITION des sommets : géométrie
    non indexée, sinon fentes), ressac qui respire ; bancs : mouettes qui
    piquent, eau qui bout ; voile du Roi qui fend l'eau.
  - Tapis et enseigne SORTIE masqués en mer (`tapisSortie`, `enseigneSortie`
    notés par la salle générique).
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
- **V3 visuelle (13 octobre, playtest : « peu immersif »)** : galerie
  d'observation posée AU FOND DE LA MER (`aquariumDecorV3`) — enveloppe
  générique masquée (solides gardés), vitres basses, fond marin à
  `AQ_FOND_Y` (sable, caustiques `AQ_GLSL_CAUST`, rochers, coraux, algues qui
  ondulent `AQ_ALGUE_VS`, rayons), bancs de poissons, requin et raie manta
  qui tournent autour (`aquariumMajDecorV3`). Gaston V3 (`aquaModeleGaston`) :
  huit bras articulés qui ondulent, couleur selon l'humeur (violet / jaune /
  rouge). Éclairage `AQ_BLEU`, brouillard au-delà de la caméra.

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
- **V3 visuelle** (`laverieDecorV3`) : laverie de nuit sous la pluie — rue
  mouillée où les néons se reflètent (`LAV_RUE_FS`), carrelage lustré
  (`LAV_SOL_FS`), vitrine, enseigne néon « BULLE BLEUE » (`texNeon`),
  immeubles, voiture des Vipers, tubes fluorescents ; hublots chromés où le
  linge tourne ; plus d'étiquettes (un poste se reconnaît à son objet).
  Pendant le cycle, **`cadrageSalle`** (générique, réutilisable) rapproche la
  caméra de la machine 7 ; le joueur la tient par le flanc (le hublot reste
  visible). **Bug V2 corrigé** : `mach7Saut` indéfini avant le 1er coup →
  y = NaN → la machine 7 disparaissait pendant tout le cycle (testé).

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
- **V3 visuelle** (`serreDecorV3`) : serre victorienne de nuit dans le jardin
  botanique — pelouse et allées (`SER_JARDIN_FS`), haies, arbres, lanternes,
  lucioles ; tomettes moussues où passent les ombres des feuilles
  (`SER_SOL_FS`), grandes feuilles tropicales en rosette (`texFeuilleSerre`),
  bassin vivant (`SER_EAU_FS`, carpes koï, nénuphars), vitres à montants de
  fer forgé, chevalet du jardinier (étiquettes retirées). **Ordre des const**
  : le bruit GLSL partagé `CHAL_GLSL_BRUIT` est déclaré dans la section
  AQUARIUM, AVANT la serre et le chalutier (sinon plantage au chargement).

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
- **V3 visuelle** (`radioDecorV3`) : studio pirate sur un toit, la nuit —
  toit goudronné et flaques (`RAD_TOIT_FS`), parapet, antenne à feux rouges,
  parabole, enseigne néon « REYES FM 107.7 », toits voisins, la ville en
  contrebas (`RAD_VILLE_FS` : rues, fenêtres, voitures). La police se montre
  avec la triangulation : hélicoptère au projecteur orienté (`radHeli`,
  > 45 %), gyrophares (> 70 %). Studio : mousse acoustique, tapis, platine
  qui tourne, ON AIR en néon (`texNeon`). Étiquettes retirées ; pendant
  l'émission, `cadrageSalle` sur la console.

### Ciné-Palace V2 — la séance du siècle (section `CINÉ-PALACE`, bloc `Ciné-Palace V2 … l'écran`)

- Même course entre les 4 postes (`CINE_POSTES`, réparation d'un appui), mais
  **on voit le film** : `dessinerEcranCine` (canvas `cineWrap`, tout en haut de
  l'écran — au milieu il cachait les postes du fond) dessine « GTRoyal I » et
  le dégrade selon les pannes : BOBINE = image figée qui saute, MISE AU POINT
  = image dédoublée, SON = sous-titres décalés, LAMPE = image sombre qui
  clignote ; bandeau rouge des pannes, public qui hue / jette du pop-corn /
  applaudit, tableau de bord (chrono, satisfaction, 4 postes). Fin : l'écran
  reste 3 s (`s.cineFin`, `s.cineFinT`). Intro `cineIntroWrap`, boutons de
  combat masqués. Faisceau du projecteur qui baisse avec la lampe.
- **Perdable** : `CINE_FUITE` (%/s par poste resté en panne) — avant, ne rien
  faire finissait « réussi » à 40 % (4 pannes × 15). **Bug corrigé** : en
  séance, la zone du projecteur (4 u) masquait le poste MISE AU POINT voisin
  (le bouton disait « séance en cours ») ; elle s'efface pendant la séance.
- Test « Ciné V2 » : écran, intro, ovation, pilote projectionniste (tient la
  séance), passif = fiasco ; les 31 anciens tests passent.
- **V3 visuelle** (`cineDecorV3`) : la cabine donne sur la SALLE (mur nord
  masqué, solide gardé, vitre) — gradins, public (`cineTetes` : bouge, se
  lève à l'ovation, s'agite en panne), rideaux, grand écran dont la texture
  est le canvas du panneau (`cineTexFilm`, mise à jour à 15 i/s, cadrée sur
  l'image), faisceau jusqu'à l'écran (`faisceauV3`). Postes reconnaissables à
  leur objet (bobines, banc d'optique, ampli à vu-mètres, lanterne) ;
  affiches éclairées à la place des cartels flottants (`cineAffiche`) ;
  moquette art déco, machine à pop-corn, marquise à ampoules dehors.

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
- **3e série** (14 octobre) : `coffresToits`, `avionsPoses` (tour de
  contrôle), `manege`, `styleAchats`, `fauves` (jamais un bouquetin),
  `aimant` ; thèmes dérivés sans compteur : `planques` (planques achetées),
  `exploits` (tenues de mini-jeux), `armurier` (modifications d'armes).
  Chaque compteur avance dans la fonction de l'action elle-même. Test
  « Défis de la 3e série ».

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

46 pictogrammes SVG dessinés à la main (dont AA-12, revolver, arbalète et minigun, ajoutés le 14 octobre sans planche de référence) d'après `icones/references/*.png`
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
