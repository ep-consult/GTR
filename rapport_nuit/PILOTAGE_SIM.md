# Pilotage simulé des avions — rapport (19-20 octobre 2026, branche `pilotage-avions`)

Demande : passer d'un pilotage arcade avec figures scriptées (boucle / vrille au bouton maintenu) à un vrai pilotage physique
au joystick et au levier de gaz. Interrupteur `PILOTAGE_SIM` (vrai par défaut) ; à `false`, le pilotage d'avant revient tel quel.

---

## 1. Constat de départ (étape 0)

Écrit avant de toucher au code, comme demandé (sans attendre de réponse).

**Les avions** (`VEHDEFS`, `air:'avion'`) : 7 appareils — Colibri (`avion`, avion léger), Pélican (`tourisme`), Albatros (`jetprive`,
jet d'affaires), long-courrier Reyes Air (`ligne`), cargo Baleine (`fret`), Épervier (`chasseur`, armé : missiles, bombes), Colibri
Rouge (`voltige`). Tous passent par `majVol(v, dt)`, la même fonction que les hélicos et l'OVNI (branches séparées).

**L'orientation stockée** : aucune orientation 3D. L'état d'un avion est un cap `v.ang` (lacet, croît vers la gauche), une altitude
`v.alt`, une vitesse horizontale le long du cap `v.v`, une vitesse verticale `v.va`, plus deux angles purement visuels : l'assiette
`v.tang` et l'inclinaison `v.bank`. Le modèle est posé par angles d'Euler (`rotation.set(-tang, ang, -bank)` en ordre `YXZ`). La
trajectoire ne dépend jamais de l'assiette ni de l'inclinaison : l'avion avance horizontalement selon `v.ang` et monte selon `v.va`
(consigne MONTER / DESCENDRE en vue 2D, assiette × vitesse au manche). Le vol sur le dos, une boucle ou un tonneau ne pouvaient donc
pas exister par le pilotage.

**Deux pilotages** :
- vue 2D (`virageAvion`, « Virage des avions ») : le joystick donne une DIRECTION, l'inclinaison est déduite de l'écart de cap ;
  MONTER / DESCENDRE règlent la vitesse verticale (`AVION_VA_*`, appui bref `appuiVolCran`) ;
- vue 3D et 1re personne (`volManche`, « Pilotage au manche ») : x = inclinaison proportionnelle (ramenée à plat au relâcher),
  y = assiette, la manette des gaz (`MANETTE`) ; virage = g·tan φ / v.

**Les figures scriptées** : `majLooping` (MONTER tenu en vue 2D, ou manche tiré à fond `loop` s au manche) joue une boucle
précalculée (anneau `loopRingEl`, `v.loopEnCours`) ; `majVrille` (joystick sur le côté tenu) et les tonneaux du manche
(`figuresManche`, `v.tonneau`, `v.tonFin`) font tourner le modèle sur un script, sans effet sur la trajectoire.

**Caméra** : vue 2D de dessus (y compris en vol), poursuite immersive qui prend la moitié du roulis (`AVION_CAM_ROULIS` 0,5,
jamais pendant un tonneau), cockpit en 1re personne (contre-roulis réglable `META.horizonCk`).

**Sol et collisions** : décollage dès 27 u/s en tirant ; arrondi automatique sous 10 u ; posé si `va` > −4,5 et `v` < 32 ; crash
sur l'eau, contre un solide (`solidAt`) ou le relief (`solY`) → `crashAerien` ; grâce au décollage `DECOL_GRACE`. Toutes les
minuteries du vol tournaient sur `dt` (le ralenti les ralentissait).

**Limites** : position bornée d'un coup aux limites du ciel (`LIMITE_OUEST_MER−20` … `LIMITE_EST+20`, `LIMITE_SUD_MER`).

**Conséquence** : il fallait un modèle à part (orientation quaternion, vitesse vectorielle, forces), branché dans `majVol` pour
l'avion du joueur seulement, l'ancien gardé intact derrière l'interrupteur.

---

## 2. Ce qui a été fait

- **Moteur de vol** (juste avant `majVol`) : `avionSim`, `profilVol`, `axesVol`, `volAttitude`, `volSimInit`, `volSim` (pas de
  1/60 s), `volPas` (une image : commandes, stabilité, compensateur, décrochage, vrille, forces, limites, sol, obstacles), `majVolSim`
  (manette, sol, décollage, posé). Orientation : quaternion `v.q`, rotations dans les axes LOCAUX, renormalisé à chaque pas.
  Vitesse : vecteur `v.vel`. Le reste du jeu continue de lire `v.ang`, `v.tang`, `v.bank`, `v.alt`, `v.v`, `v.va` (déduits du
  quaternion par `volAttitude`) : missiles, cockpit, minimap, son du moteur, rampe du C-130, tout suit sans changement.
- **Joystick** : zone morte 0,08 et courbe expo 0,55 ; x = vitesse de roulis, y = vitesse de tangage (tiré vers le bas = cabrer) ;
  **inversion de l'axe Y** dans les Paramètres (« Tangage inversé (avions) », `META.inverserY`, dans `asphalte_save_v1`).
- **Virage coordonné automatique** (pas de palonnier) : lacet = g·sin φ·cos θ / v.
- **Forces** : poussée de la manette, traînée ∝ v² (plus celle de l'incidence), portance ∝ v² × incidence (plafonnée par profil),
  gravité ; la vitesse suit le nez avec une légère inertie, dérapage faible. **Décrochage** sous Vmin : gouvernes moins efficaces,
  portance qui chute, nez qui tombe ; **vrille** pour la voltige seule (décrochée + manche sur le côté ; manche au neutre pour sortir).
- **Collisions** : sol, eau, bâtiments → crash par `crashAerien` ; posé seulement doux, à plat, pas trop vite.
- **Figures scriptées supprimées** (avec `PILOTAGE_SIM`) : la boucle et le tonneau viennent du pilotage ; un tour complet est
  seulement compté (« 🔁 LOOPING ! », « 🌀 TONNEAU ! », statistique `loopings`).
- **Profils** par avion (section 3), pas de mode Assisté/Pro.
- **HUD de vol** (à droite, sous Vue et Pause) : horizon artificiel avec échelle d'assiette, vitesse (rouge près du décrochage),
  altitude et hauteur sol, jauge des gaz, alertes DÉCROCHAGE / VRILLE / SOL ! REMONTE qui clignotent ; **alarmes sonores**
  (décrochage 470 Hz, sol 880 Hz). Au cockpit, l'alerte seule (le tableau de bord a ses instruments). Les messages passent à gauche.
- **Caméra** : en l'air, la vue de dessus bascule seule en poursuite qui suit l'avion dans SON repère (roulis, boucle, dos) ; en
  vue 1re personne, le cockpit ; au sol ou à la sortie, la vue choisie revient.
- **Horloges** : toute la physique et les minuteries du vol sur `dtJeu` (dt / timeScale, borné à 0,05 s) — un ralenti ne ralentit
  pas l'avion (mesuré : 37,7 u en 1 s dans les deux cas).
- **Sorties** : alarme et HUD coupés dans `sortirVehicule`, `sauterEnParachute`, `crashAerien`, `mourir`, `startRun`,
  `entrerInterieur`.
- **Limites du ciel** : au-delà des anciennes bornes, l'avion fait demi-tour seul (message « Limite de la zone »), borne dure
  240 u plus loin — il n'est plus arrêté net.
- **Non touchés** : hélicoptères, jetpack, OVNI Zeta-9, avions du décor et de l'IA (tour de piste, long-courrier de l'aéroport,
  avion à banderole), empreinte de la ville (vérifiée identique).

---

## 3. Les profils (`PROFILS_VOL`)

Unités : u/s (1 u ≈ 1 m, vitesses ramenées à l'échelle de la ville — l'ordre entre les avions est celui des vrais), rad/s, s.

| Avion (modèle réel) | rollRate | pitchRate | Vmin | Vmax | poussée | inertie | stabilité | vrille | gMax | vRot | particularités |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Colibri (Cessna 172) | 1,6 | 1,0 | 18 | 40 | 13 | 0,30 | 0,75 | non | 3,8 | 24 | décrochage doux |
| Pélican (Piper Cub) | 1,4 | 0,9 | 15 | 34 | 11 | 0,32 | 0,85 | non | 3,8 | 20 | décrochage doux |
| Albatros (Learjet 75) | 1,2 | 0,62 | 25 | 62 | 17 | 0,45 | 0,7 | non | 3,0 | 30 | décrochage doux |
| Reyes Air (A320) | 0,45 | 0,26 | 26 | 52 | 9 | 0,9 | 0,9 | non | 1,6 | 31 | butées 30° d'assiette, 66° d'inclinaison ; protection d'incidence |
| Baleine (C-130) | 0,5 | 0,28 | 22 | 40 | 8 | 0,85 | 0,9 | non | 1,8 | 27 | butées 35° / 60° |
| Épervier (F-16) | 3,4 | 1,5 | 22 | 56 | 30 | 0,14 | 0,3 | non | 9 | 28 | commandes électriques : pas de vrille |
| Colibri Rouge (Extra 300) | 4,6 | 2,3 | 17 | 44 | 24 | 0,09 | 0 | oui | 9 | 22 | garde son attitude, décrochage franc |

- **Stabilité** : manche lâché, retour vers l'horizontale (roulis et trajectoire) ; le rappel s'efface dès que le manche est tenu,
  il ne bloque jamais une attitude voulue. Voltige 0 : elle reste où on la laisse, sur le dos compris.
- **Gros porteurs** : lents à répondre (inertie 0,85–0,9 s), butées d'assiette et d'inclinaison ANTICIPÉES (attitude + vitesse ×
  inertie : la première version les dépassait de 15 à 20°), rappel au-delà ; ils ne peuvent ni boucler ni faire de tonneau.

Réglages communs : g = 24 u/s² (`VOL_G`, celui du jeu), incidence de décrochage 0,28 rad (×1,15 pour un décrochage doux), traînée
d'incidence 1,2, amortissement du dérapage 4 /s, girouette 1, zone morte 0,08, expo 0,55, posé : descente < 4,5 u/s, inclinaison
< 0,35 rad, vitesse < 1,9 × Vmin ; plafond 300 u.

---

## 4. Mesures

**Banc hors navigateur** (`node rapport_nuit/outils/banc_vol.js`, `majVol` à 60 images/s) :

| Essai | Résultat |
|---|---|
| Boucle, manche tiré à fond, plein gaz à Vmax (départ 80 u) | voltige 80 → 81,5 u en 4,0 s ; Épervier 80 → 78,1 u en 5,5 s |
| Même boucle, avions légers | Colibri et Pélican font le tour mais décrochent en haut et finissent 43 à 55 u plus bas (comme les vrais) |
| Même boucle, Albatros | monte à 226 u, décroche sur le dos, ne finit pas depuis 80 u (il faut de la hauteur) |
| Gros porteurs tirés 20 s | Reyes Air : assiette 32° au plus (butée 30°), jamais sur le dos ; Baleine : 37° (butée 35°) |
| Boucle trop lente (1,25 × Vmin, gaz coupés) | décrochage détecté : voltige 0,30 s, Épervier 0,47 s, Colibri 0,92 s |
| Tonneau, manche à fond sur le côté | voltige 1,4 s, Épervier 1,9 s, Colibri 4,1 s, Pélican 4,5 s, Albatros 5,2 s ; lâché en anticipant l'inertie : à plat (±1°) |
| Voltige lâchée sur le dos, 10 s | toujours à 180°, altitude 120 → 125, aucune valeur invalide, écart de norme du quaternion 2·10⁻¹⁶ |
| Lâché à 45° | Pélican 1,4 s, Colibri 1,6 s, Albatros 1,7 s, Baleine 2,7 s, Reyes Air 2,9–3,0 s, Épervier 5,1 s ; voltige : garde 45° |
| Palier plein gaz, manche lâché, 15 s | 95 % de Vmax environ, légère montée (le compensateur tient la trajectoire) |
| Axe Y | tiré 1 s : +48° ; inversé : −49° |
| Vrille (gaz coupés, manche tiré, puis sur le côté 3 s, puis neutre) | voltige : en vrille dès que le manche part sur le côté, 1,5 tour en 3 s, sortie 0,8 s après le neutre ; redressée (manche tiré, plein gaz) en 2,2 s : environ 140 u perdus en tout depuis 200 u. Colibri, Pélican, Épervier : jamais de vrille |

**Dans la vraie boucle** (test « Pilotage simulé des avions » de `scenarios.js`) : voir section 5.

---

## 5. Tests

Nouveaux blocs de `scenarios.js` (avions lus dans `VEHDEFS`, profils dans `PROFILS_VOL`, familles déduites des profils : agiles
= `gMax ≥ 6`, gros porteurs = `assietteMax`, stables = `stabilite ≥ 0,5`, libres = `stabilite 0`) :

- **« Pilotage simulé des avions »** — profils complets ; boucle complète des agiles, retour à ±15 % de l'altitude (Épervier
  90 → 80 u, voltige 90 → 85 u), passage sur le dos, quaternion normé ; boucle trop lente → décrochage, alerte DÉCROCHAGE au HUD
  et alarme ; tonneau complet de chaque avion qui peut rouler → ailes à plat (±12°) ; voltige 10 s sur le dos (attitude gardée,
  aucune valeur invalide, quaternion normé, le modèle suit le quaternion) ; stables lâchés à 45° → à plat en moins de 4 s, voltige
  qui garde 45° ; gros porteurs tirés à fond 20 s → ni boucle ni dos, poussés sur le côté → pas de tonneau ; plus aucune figure
  scriptée (MONTER et joystick tenus) ; vrille selon le profil (la voltige seule part en vrille, alerte VRILLE, sortie au neutre
  en moins de 1,5 s, redressée depuis 230 u ; aucun autre avion ne vrille) ; ralenti ×0,25 sans effet sur le vol ; axe Y inversé ; caméra de poursuite derrière et
  au-dessus de l'avion depuis la vue de dessus, HUD affiché, caméra qui suit le roulis sur le dos, vue de dessus au sol ; piqué
  au sol → crash, alerte SOL et alarme pendant le piqué, alarme et HUD coupés après ; `mourir`, `sortirVehicule`,
  `sauterEnParachute` en plein décrochage → alarme et HUD coupés ; un immeuble en travers → crash ; **atterrissage de chacun des 7
  avions** sur la vraie piste par un pilote simulé à la manette et au joystick réels (vitesse d'approche 1,3 × Vmin aux gaz, taux de
  descente au manche, arrondi sous 3 u) : posés à −0,8 à −2,0 u/s, arrêtés au FREIN de la manette en 0,5 s, la vue de dessus revient ;
  décollage de la vraie piste (manette à fond, tirer à vRot).
- **« Axe Y inversé »** — le réglage des Paramètres (vrai interrupteur), sauvegardé, toujours actif après rechargement de la page.
- **Anciens tests** (« Avions au cockpit », « Appui bref en vol », « Inclinaisons », « Virage des avions », « Pilotage au manche »,
  « Poussée des avions », « Aéroport vivant ») : ils vérifient le pilotage d'avant, qui reste accessible ; ils posent
  `PILOTAGE_SIM=false` le temps de leur bloc. Tous verts. Même chose pour la partie « atterrissage » de « Retours du 16 octobre » :
  l'arrondi automatique (FREIN tenu, manche lâché) appartient au pilotage d'avant ; c'était le seul échec de la première suite
  complète (825 vérifications vertes, 1 en échec).
- `valider.js` : vert. Empreinte de la ville : identique à HEAD.

Résultat de la suite complète : voir section 7.

Captures (rendu réel, `rapport_nuit/captures/pilotage_sim/`) : `voltige_poursuite.png` (vol normal, caméra de poursuite, HUD),
`voltige_dos.png` (vol sur le dos : la caméra et l'horizon artificiel suivent), `voltige_decrochage.png` (gaz coupés, manche tiré :
alerte DÉCROCHAGE), `voltige_cockpit.png` (1re personne), `voltige_hud.png` (le HUD seul) ; mêmes vues pour le long-courrier
(`ligne_*` : sa « vue sur le dos » montre qu'il s'arrête à sa butée d'inclinaison).

---

## 6. Choix et limites

- **Seul l'avion du joueur** passe au pilotage simulé ; les avions de l'IA et du décor gardent leur vol scripté (ils ne sont pas
  pilotés au joystick).
- **Vitesses à l'échelle de la ville** : un Cessna à 230 km/h traverserait la ville en quelques secondes ; les vitesses sont
  comprimées (Colibri 144 km/h au plus), l'ordre entre les avions est respecté.
- **L'Épervier** a une stabilité de 0,3 (commandes électriques : il revient doucement, en 5 s, mais garde toute attitude tenue) et
  pas de vrille. Sa boucle perd environ 10 % d'altitude dans la vraie boucle (moins de 3 % au banc).
- **L'Albatros** n'a pas de butées : il peut boucler, mais pas depuis 80 u (il lui faut de la hauteur).
- **Pas de palonnier** : le virage est toujours coordonné ; pas de vent ni de turbulence.
- **Joystick rond** : manche tiré à fond ET sur le côté donne x = 0,71 (0,48 après la courbe) ; le seuil d'entrée en vrille est 0,4
  (à 0,5, trouvé par le test dans la vraie boucle, la vrille ne prenait qu'avec le manche purement de côté).
- **Descendre pour se poser** : manche lâché, un avion stable tient son palier (c'est la stabilité demandée) ; il faut pousser un
  peu et réduire les gaz. Plus d'arrondi automatique : à vérifier sur iPhone que le posé reste à la portée d'un pouce.
- **Limites du ciel** : demi-tour automatique (plus d'arrêt net contre un mur invisible) ; à surveiller sur iPhone que ce virage
  imposé ne surprenne pas.
- Le pilotage d'avant reste dans le fichier (`PILOTAGE_SIM=false`) et testé.

---

## 7. Suite complète

(à compléter : résultat de `node scenarios.js`)

---

## 8. À vérifier sur iPhone, avion par avion

Général (tous les avions) :
- [ ] Au pouce : la zone morte et la courbe expo permettent des petites corrections sans à-coup ; à fond, la réponse est franche.
- [ ] Tiré vers le bas = cabrer ; Paramètres → « Tangage inversé (avions) » inverse, et le réglage survit à la fermeture du jeu.
- [ ] La manette des gaz (en bas, sous la grenade, à la place d'ACCÉLÉRER ; zone FREIN sous le 0) se prend bien d'un doigt pendant que l'autre pilote.
- [ ] Au décollage, la vue de dessus bascule en poursuite sans saut désagréable ; au posé, elle revient.
- [ ] La caméra de poursuite qui suit le roulis et la boucle ne donne pas la nausée ; l'avion reste au-dessus des boutons.
- [ ] Le HUD (à droite) est lisible et ne cache rien d'important ; les messages passent bien à gauche.
- [ ] Les alarmes (décrochage, sol) s'entendent et se coupent à la mort, au parachute, en descendant, au crash.
- [ ] La limite de la zone : le demi-tour automatique est compréhensible (message « Limite de la zone »).
- [ ] Fluidité : aucune chute d'images en vol (au plus 3 pas de physique par image).

- [ ] **Colibri** : décollage de la piste (manette à fond, tirer vers 86 km/h) ; virage incliné puis lâché → revient à plat ; boucle
  tirée à fond → il décroche en haut (normal pour un avion léger) ; posé doux, à plat.
- [ ] **Pélican** : décollage court et lent, très stable, décrochage doux (il s'enfonce sans partir).
- [ ] **Albatros** : rapide, plus lent à répondre ; virage serré qui coûte de la vitesse ; boucle possible avec de la hauteur.
- [ ] **Reyes Air** : lourd et lent à répondre ; s'arrête à 30° d'assiette et 66° d'inclinaison sans les dépasser ; tirer ne le
  fait pas décrocher (la protection rend la main) ; posé long sur la piste.
- [ ] **Baleine** : comme le long-courrier, butées 35° / 60° ; la rampe arrière se ferme en roulant.
- [ ] **Épervier** : boucle propre à pleine vitesse, tonneaux rapides, retour à plat lent quand on lâche ; missiles et bombes
  partent toujours bien ; HUD et cockpit (viseur tête haute) cohérents.
- [ ] **Colibri Rouge** : très nerveux ; vol sur le dos sans toucher au manche ; tonneaux en 1,4 s ; vrille : gaz coupés, manche
  tiré jusqu'au décrochage puis sur le côté → « VRILLE ! » ; manche au neutre → il en sort ; décrochage franc.
