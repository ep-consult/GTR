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

**Relevé au 10 octobre 2026 (décor V2, enseignes) — 23 684 lignes.**

| Ligne | Section |
|---|---|
| 1–865 | `<head>`, CSS, HUD, écrans (menu, game over, panneaux) |
| 398–536 | **icônes SVG** : copie des 42 `<symbol>` de `icones/icones.svg` (générée, ne pas éditer) |
| 842–844 | **eruda** (console mobile de dev — à retirer avant diffusion) |
| 845 | chargement Three.js r128 depuis CDN |
| 850 | `<script id="gamejs">` + handler `window.onerror` → affichage dans `#errBox` |
| 866 | en-tête GTRoyal, début du code du jeu |
| 962 | AUDIO — WebAudio synthétisé, boîte de vitesses simulée |
| 1483 | ENTRÉES — joystick virtuel, boutons tactiles, clavier ZQSD/WASD |
| 1790 | MÉTA-PROGRESSION — `META`, défis, sauvegarde |
| 2464 | THREE.JS — rendu, scène, lumières |
| 2774 | VILLE DE LOS REYES — génération procédurale par quartiers |
| 7240 | MODÈLES — humains, armes, véhicules, hélico, ramassables |
| 8326 | POOLS — balles, particules, textes flottants, traces de pneus |
| 8686 | ÉTAT GLOBAL + JOUEUR (`P`) |
| 9407 | VÉHICULES — physique arcade, trafic, dégâts |
| 11687 | PIÉTONS |
| 11839 | ENNEMIS — gangs, police, armée, motards, hélico, boss |
| 12375 | **RAYON TRACTEUR DE L'OVNI** |
| 12771 | NIVEAU DE RECHERCHE (étoiles) |
| 13016 | VAGUES + bonus de fin de vague |
| 13135 | MISSIONS COURTES |
| 13138 | BÂTIMENTS VISITABLES — intérieurs |
| 13208 | FOUILLE — mécanique générique |
| 13789 | PALAIS DE L'ARCADE — bornes, tickets, tableau des scores |
| 17724 | CINÉ-PALACE |
| 17786 | MÉTRO ABANDONNÉ |
| 17852 | RADIO PIRATE REYES FM |
| 17957 | LE CHALUTIER « SAINTE-ODILE » |
| 18231 | SITE 51 |
| 18461 | LE DÉPÔT DE BUS — courses clandestines |
| 19476 | **MÉTIERS** — missions liées à un véhicule |
| 19707 | **GARAGES TUNING** — prix, nitro, salle partagée, menu d'atelier |
| 20650 | ÉCRANS / MENUS / BOUTIQUES |
| 20917 | CASINO — machines à sous, blackjack, vidéo-poker, roue |
| 21689 | DÉBUT / FIN DE PARTIE |
| 23168 | JOUR/NUIT, CAMÉRA, HUD, MINIMAP |
| 23563 | BOUCLE PRINCIPALE |

### Ancres fines (hors bandeaux)

| Ligne | Repère |
|---|---|
| 888 | `ICONES_SVG` — interrupteur des icônes, `ico()`, `icoArme()`, `labelAction()` |
| 894 | `MER_V2` — interrupteur de la mer améliorée (false = mer d'avant à l'identique) |
| 901 | `DECOR_V2` — interrupteur du décor enrichi (voir « Décor V2 ») |
| 1798 | `GARAGES_TUNING` — les garages de la ville (déclarés avant `META`) |
| 1818 | `VEHPERSO_MAX` — taille de « Mes véhicules » (`META.vehPerso`) |
| 1980 | `fusionMeta()` — deep-merge de la sauvegarde, `DICOS_OUVERTS` juste avant |
| 2010 | `CURIOS` — tableau des curiosités |
| 2061 | `CURIOS_ACTIVES` |
| 2075 | déblocage de `batte2` (toutes curiosités actives réunies) |
| 2244 | `VEHDEFS` — véhicules, éligibilité garage (`tuningMeca`, `tuningCarro`) |
| 2794 | mer V2 : `houle()`/`houleY()`, shader (`merV2Materiau`), sillage, éclaboussures, `assietteHoule()` |
| 3098 | `finaliserMerge()` |
| 3643 | `mkLittoral()` — fondus sable/mer/désert, vagues sur le sable |
| 3698 | `mkHorsLesMurs()` — décor factice hors de l'enceinte |
| 3814 | `MOB_CAT` — catalogue du mobilier urbain, puis `mkMobilierUrbain()`, `majMobilier()`, `garerVelos()` |
| 4224 | `JETEE` — jetée de fête foraine : `ZONES_SANS_MOBILIER`, `mkJeteeForaine()`, `majJetee()` |
| 4355 | `SKATE` — skatepark : `mkSkatepark()`, `texMurSkate()` |
| 4431 | `PORT` — port vivant : `mkPortVivant()`, `majPortVivant()` |
| 4537 | `BROOK` — Brooklyn : `texFresque()`, `mkBrooklyn()`, `majBrooklyn()` |
| 4658 | `CIEL` — dirigeable, avion à banderole, mouettes, feux d'artifice : `mkCiel()`, `majCiel()` |
| 4727 | `CRIQUE` — crique des plongeurs : `dansCrique()`, `mkCrique()`, `plongeonJoueur()` |
| 4903 | `NEON` — quartier néon : `BATIMENTS`, `reserverNeon()`, `mkNeonVivant()` |
| 4966 | `VILLA_PISC` — finitions de quartier : `mkQuartiersFinitions()` |
| 3977 | `SOLS` — dalles de sol enregistrées, puis `mkTransitionsSols()` (jonctions entre sols) |
| 5086 | `mkLacParc()` — lac du parc, passerelle, barques |
| 5215 | `mkLumieresQuartiers()` — Times Square, quartier chinois, Brooklyn |
| 5301 | `mkEnceinte()` — murs, enseigne, jetées de rochers |
| 5742 | `GALION` — galion échoué : `sansAleaVille()`, `coqueGalion()`, `mkGalion()`, `majGalion()` |
| 6469 | `mkPorteGarage()` — porte roulante des garages |
| 6537 | `placeLibrePorte()` |
| 6596 | helper `poser()` — placement des lieux |
| 6622 | `caseCentre(bx,bz)` |
| 6715 | `REPLIS` — filet de sécurité en spirale |
| 8217 | `makeVelo()` — vélo de ville et BMX |
| 8694 | `const P` — état du joueur |
| 8732 | `P.stamMax = 100 + 12*mus` |
| 9712 | `resoudreCollisionsVehicule()` — collisions entre véhicules (SAT sur les 4 axes) |
| 10218 | `majRemorquage()` — accroche/remorquage (dépanneuse et treuil du garage) |
| 10326 | `boutonsAPied()` — boutons du HUD remis « à pied » (sortie de véhicule ET début de partie) |
| 11168 | `TRAFIC_*` — réglages du trafic, `horsEcran()`, `obstacleSurVoie()` |
| 11281 | `majTrafic()` — suivi de file, priorité au carrefour, contournement, filet anti-blocage |
| 13144 | `IOFF = -9000` |
| 14866 | `INTDEFS` — définitions des **27 salles** |
| 15046 | `construireSalle(id)` |
| 19485 | `METIERS_CIBLE` |
| 19725 | `TUNING_PRIX` — tous les prix du garage, groupés (pièces comprises), puis `TUNING_CASSE_TAUX` |
| 19807 | `PIECES_FAMILLES` — catalogues de pièces par famille |
| 20107 | `garageCasser()` — après `garageEnregistrer`, `garageAcheter`, `garageChoisirVehicule` |
| 20160 | `libererObjet()` — libère les géométries d'un objet retiré |
| 20176 | `appliquerCarrosserie()` — passe d'ancrage des pièces |
| 20256 | `construireGarageTuning()` — la salle partagée |
| 20624 | `majNitro()` |

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
- **Lac du parc** (`mkLacParc`, case bx=5, bz=0) : vraie eau pour `estEau`
  (on y nage, les voitures s'arrêtent au bord), passerelle praticable
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
(métro) · Boussole du Capitaine (chalutier) · Volant du Dépôt (dépôt de bus).

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
