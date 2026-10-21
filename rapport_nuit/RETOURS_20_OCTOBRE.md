# Retours de playtest du 20 octobre — suivi point par point

Branche `retours-20-octobre` (partie de `canaux-v3`, après la restitution des canaux V3). Une case par point, dans l'ordre des lots ;
pour chaque point : la lecture retenue quand il était ambigu (en tête), ce qui a été fait, les mesures, le test, les captures
(`rapport_nuit/captures/retours_20/`). Règles de toujours : ville et décor inchangés (empreinte du décor, portes, tirage principal),
clés de sauvegarde fixes (`fusionMeta`, `DICOS_OUVERTS`), mini-jeux jouables (pilote simulé aux vraies commandes) ET perdables, une prime
par vague au plus, sons coupés (`mourir`, `startRun`, sortie), bugs visuels validés en rendu réel, coût de rendu mesuré pour les ajouts
lourds. Aucune référence à un autre jeu ni à une marque.

| Lot | Point | État |
|---|---|---|
| 1 | 1.1 4x4 amphibie téléporté | ☑ |
| 1 | 1.2 Cockpit du long-courrier tout gris (et tous les aéronefs) | ☑ |
| 1 | 1.3 Monte-charge du Pic caché par un rocher | ☑ |
| 2 | 2.1 Un seul jeu d'icônes (minimap et grande carte) | ☑ |
| 2 | 2.2 Le joueur en flèche orientée | ☑ |
| 2 | 2.3 Toucher une icône : bulle et « Y aller » | ☑ |
| 2 | 2.4 Filtres revus, inventaire de tous les lieux | ☑ |
| 3 | 3.1 Refonte des défis (paliers, argent, skins, ×2 prêt) | ☑ |
| 3 | 3.2 Défis de cascade mesurés (cabrage, vrilles, loopings, tonneaux, vol sur le dos…) | ☑ |
| 3 | 3.3 Skins spéciaux liés aux exploits | ☑ |
| 4 | 4.1 Tableau de chasse | ☐ |
| 4 | 4.2 Trophées au chalet | ☐ |
| 4 | 4.3 Défis de chasse et costume de pigeon | ☐ |
| 5 | 5.1 Villa planque restylée | ☐ |
| 5 | 5.2 Chantier : la grue remplacée par un monte-charge | ☐ |
| 6 | 6.1 Paquebot « Reyes Majestic » qui se brise | ☐ |
| 6 | 6.2 Vie au large | ☐ |
| 6 | 6.3 Kitesurf | ☐ |
| 6 | 6.4 Wakeboard amélioré | ☐ |
| 7 | 7.1 « Reyes Cliff Diving » | ☐ |
| 8 | 8.1 Karaoké en jeu de rythme | ☐ |
| 8 | 8.2 Défi du burger | ☐ |
| 8 | 8.3 « Jus de Plage » (découpe de fruits) | ☐ |
| 8 | 8.4 Manèges de la marina à la 1re personne | ☐ |
| 9 | 9.1 Akimbo à la 1re personne | ☐ |
| 10 | 10.1 Défi voltige et course d'avions | ☐ |

---

## 1.1 — Le 4x4 amphibie téléporté (fait)

**Lecture retenue** : « téléporté en amont » = renvoyé vers la ville (le nord), d'un coup ; « il s'abîme » = les dégâts qui suivent.

- **Cause** (trouvée par un pilote au joystick réel) : la borne sud des véhicules terrestres dans `majVehiculePhys` (`HALF + 8`, la
  ligne de la plage) ignorait les îles. Un véhicule terrestre posé sur l'île aux trésors (z ≈ 400) — l'amphibie qui y remonte de la
  mer, qui en repart, mais aussi un 4x4 ou une moto cross qu'on y amène — était renvoyé à la première image sur z = 302, dans la mer
  devant la plage de la ville : 100 à 120 u en une image, puis des chocs (8 à 39 PV mesurés). Le filet de sécurité (`FILET`), le
  dégagement des murs, le relief de l'île et la flottaison n'y étaient pour rien.
- **Correction** : au large, une île ou un ponton est de la terre (`estEau` faux) — la borne ne retient plus que le véhicule qui VIENT
  de la plage (sa position en début d'image) ; l'amphibie n'y est jamais renvoyé ; une moto partie d'une île vers la mer s'y noie là
  où elle est. La plage de la ville reste une borne.
- **Test** « Retours du 20 octobre, 1.1 » (l'île lue dans `ILE2`) : amphibie, 4x4 et moto cross posés sur l'île y restent ; l'amphibie
  au joystick réel fait plage de l'île → mer → retour des trois côtés, puis la plage de la ville — 0,38 u par image au plus, aucun
  dégât ; la moto cross qui quitte l'île se noie sur place ; une berline qui fonce vers la mer depuis la plage reste bornée.
  L'ancienne version échoue sur chaque point (sauts de 100 à 118 u, 8 à 39 PV perdus).
- **Au passage** : le test « Bateaux échoués » échouait seul sur le jet à bras (V3) — plus court, il montait plus haut sur le sable et,
  en virant en marche arrière vers l'eau, accrochait un objet de plage à 3 u de son axe ; la plage du test se choisit désormais à 6 u
  de tout solide (2,5 avant). Dans le jeu, le joueur contourne l'objet.
- Empreinte du décor, portes, tirage principal et séquence `startRun` → salles → `startRun` (boucle coupée) identiques.

## 1.2 — Le cockpit du long-courrier tout gris, et tous les aéronefs (fait)

**Lecture retenue** : « tout gris, comme si l'écran était gris » = la vue par le pare-brise bouchée par un aplat gris ; vérifié pour
chaque aéronef en vol ET là où le joueur le trouve garé.

- **Cause** (rendu réel, vraie boucle, vue 1re personne) : en vol, le cockpit du long-courrier voit le ciel et la ville. Mais là où on
  le prend — garé à sa porte de l'aérogare, devenu un vrai véhicule —, son nez entrait dans la cabine de la passerelle (le poste de
  stationnement était calé pour que le nez touche la passerelle : centre à 14,2 u du bout, la moitié de ses 28 u) : du cockpit, un mur
  gris (`#5a626c`) à 1,8 u, rien d'autre. L'œil (`cockpitDims`), la verrière V4 et `ckAvion2` n'y étaient pour rien (diagnostic du
  cockpit valide).
- **Correction** : la passerelle s'abouche à la porte avant GAUCHE de l'avion, comme une vraie (le tube longe le flanc, la cabine
  contre la porte, environ 5 u derrière le nez ; pilier et solides suivent ; le numéro de la porte passe de l'autre côté). Les mêmes
  objets dans le même ordre : aucun tirage de plus (empreinte du décor, portes, tirage principal et séquence identiques). Du cockpit, la
  façade de verre de l'aérogare à 10,4 u, la passerelle à gauche.
- **Tous les aéronefs** : en vol (les 13 de `VEHDEFS`) et garés par `startRun` (13 postes : hangars, hélipads, héliport, base, porte
  de l'aérogare) — diagnostic du cockpit valide, rien du décor à moins de 6 u au centre de l'écran (le plus près : la soucoupe, 7,9 u).
- **Test** « Retours du 20 octobre, 1.2 » (les aéronefs lus dans `VEHDEFS` et dans les véhicules garés) ; l'ancienne version échoue
  (« ligne garé : le décor à 1,8 u devant le cockpit »).
- Captures : `captures/retours_20/1_2_avant_cockpit_long_courrier_porte.png`, `1_2_apres_cockpit_long_courrier_porte.png`,
  `1_2_avant_passerelle_dans_le_nez.png`, `1_2_apres_passerelle_flanc_gauche.png`.

## 1.3 — Le monte-charge du Pic du Vertige caché par un rocher (fait)

**Lecture retenue** : « caché par un rocher » = la cabine invisible de la caméra du jeu au pied de la falaise ; on vérifie en vue 2D et
3D, au pied et de plus loin.

- **Cause** (lancer de rayon de la caméra du jeu à la cabine) : deux choses devant elle, côté caméra — la tour du monte-charge était
  posée DEVANT la cabine (`zT = c.z + c.hd + 0,4`), ses croisillons en travers ; et les éboulis du pied du Pic (les blocs orangés)
  tombaient juste devant elle.
- **Le monte-charge V2** (`mkCageV2`, en fin de décor sur un générateur privé) : un mât de deux poteaux sur les CÔTÉS de la cabine,
  pieds rayés jaune et noir, feux rouges en tête, traverses et croix DERRIÈRE la cabine, contre la falaise ; une cabine vitrée sur
  les quatre faces (porte vitrée à deux battants), montants jaunes, plancher, toit et plafonnier, bandeau de sécurité au ras du
  plancher, mains courantes, patins sur les poteaux ; la tête et la poulie d'avant restent. Pièces fusionnées par matériau.
- **Sans décaler les tirages** : les éboulis devant la cabine sont tirés comme avant mais pas posés (même nombre de tirages, un seul
  maillage fusionné) ; les poteaux et traverses d'avant ne sont plus dans les pièces fusionnées (aucun tirage) ; croisillons, ancienne
  cabine et câble sont construits comme avant puis retirés. Empreinte du décor (dont la trace de `mkPicVertige`), portes, tirage
  principal et séquence identiques. Le plancher reste celui du relief (`hauteurPic`) : la règle et la montée ne changent pas.
- **Coût** (caméra au pied du monte-charge) : +3 appels de rendu, +1 k triangles (vue de dessus 90 → 93, immersive 593 → 596).
- **Test** « Retours du 20 octobre, 1.3 » : vue de dessus et vue immersive, au pied et plus loin, rien d'autre que le monte-charge
  entre la caméra et la cabine (trois hauteurs) ; vitrée sur les quatre faces ; elle monte toujours le joueur au sommet (10 s).
  L'ancienne version échoue (la tour et les éboulis devant, aucune vitre).
- **Outil** : le harnais de mes sondes démarre désormais en vue de dessus, comme `scenarios.js` (en vue immersive, « Sommet du Pic »
  et « Bateaux échoués » échouaient seuls : la caméra et le joystick suivent la vue).
- Captures : `captures/retours_20/1_3_avant_monte_charge_2d.png`, `1_3_avant_monte_charge_3d.png`, `1_3_apres_monte_charge_2d.png`,
  `1_3_apres_monte_charge_3d.png`, `1_3_apres_monte_charge_pied.png`, `1_3_apres_monte_charge_mi_hauteur.png`.

## Lot 2 — La minimap et la grande carte (fait : 2.1 à 2.4, un seul commit)

Les quatre points partagent un seul module (`LIEUX DE LA CARTE`, après `dessinerBadge`) et un seul test : ils sont livrés ensemble.

### 2.1 — Un seul jeu d'icônes

**Lecture retenue** : « même logo » = même pictogramme ET même couleur pour toute une catégorie, sur les deux cartes ; seize
catégories (armureries, police, garages, boutiques, restauration, salles, planques à vendre, planques achetées, activités, courses,
ports, aviation, vélos, toits, nature, découvertes). Les stands de nourriture sont une catégorie à part entière mais ne s'affichent
qu'à partir du zoom ×2 (grande carte) ou d'un pincement ×1,5 (minimap) : au zoom ×1, une cinquantaine de pastilles en plus
couvraient le centre-ville.

- **Pictogrammes** : quinze nouveaux pictogrammes dessinés à la main dans `icones/outils/dessins.js` (planche « 05 — Lieux de la
  carte », `ico-lieu-*` : écusson de police, clé plate, sac, burger, porte entrouverte, étiquette de prix, maison, étoile, drapeau à
  damier, ancre, avion, vélo, château d'eau sur un toit, montagne, jumelles) ; l'armurerie garde le pistolet. Silhouettes pleines,
  peu d'évidements : lisibles à 16 px (vérifié à 16, 24 et 48 px, rendu hors navigateur puis dans le jeu).
- **Pastille** (`pastilleImg`) : un disque de la couleur de la catégorie, cerné de sombre, ombre portée sans flou, pictogramme blanc
  (sombre sur une couleur claire) ; dessinée UNE fois par catégorie et par taille dans un petit canevas, puis posée par `drawImage` —
  plus d'ombre floue ni de texte mesuré à chaque image sur la minimap. Sans le sprite (`ICONES_SVG=false`), l'emoji de secours.
- **Les lieux** (`lieuxCarte`, `CATS_LIEUX`) : lus aux sources — portes des salles (`PORTES` + `INTDEFS`), la 2e armurerie, le
  commissariat, le garage de réparation, le chantier naval, les planques (`PLANQUES.liste`, la villa par sa porte), les fast-foods,
  la marina, l'aéro-club, l'aéroport, le Lagon, toutes les activités (`pointsActivites`, chacune déclare sa catégorie et son nom ;
  les balises de l'aéroport aussi), la grande roue, les deux skateparks, la crique, Fort Reyes et son héliport, le galion, les stands
  (`STANDS`), toutes les surprises des toits (`SURPRISES`) et leurs hélipads (`TOITS.helis`), les lieux du Mont Reyes
  (`MONT2.sites`), le lac du parc, l'île au Canard, les stations REYES BIKE (`STATIONS_VELO`). La liste est faite une fois, après la
  construction (`LIEUX.pret`) ; l'état (planque achetée…) est lu au dessin (`catLieu`). Les découvertes du moment (repérées à la
  longue-vue, la carte au trésor, le Monster Truck trouvé) s'ajoutent à chaque dessin (`lieuxDuMoment`, aucune allocation).
- Une même chose vue par deux sources (l'armurerie par son POI et par sa porte) n'a qu'une pastille.
- Aucune ville ni aucun décor touchés : `pointsActivites` et les balises reçoivent des champs (`cat`, `nom`), aucun objet.

### 2.2 — Le joueur en flèche orientée

**Lecture retenue** : la flèche de la grande carte = celle du radar, orientée par la même formule. L'ancienne grande carte tournait un
triangle de `P.ang` : il pointait à l'OPPOSÉ dès que le joueur allait vers le nord ou le sud (miroir haut-bas).
- Flèche blanche à cœur cyan, halo, `atan2(sin P.ang, −cos P.ang)` (la carte est nord en haut ; le radar ajoute l'angle de la caméra).

### 2.3 — Toucher une icône

**Lecture retenue** : sur la minimap, un toucher ouvre déjà la grande carte ; toucher une PASTILLE de la minimap l'ouvre centrée sur
elle (zoom ×2 au moins), sa bulle ouverte — le toucher ailleurs ouvre la carte comme avant, rien n'est gêné.
- **Bulle** (`ouvrirBulle`, `#carteBulle`) : pastille, nom, catégorie, ce que c'est, l'état (« À vendre : 9 000 $ », « À toi — … »,
  la prime d'une course et si elle est déjà gagnée cette vague, « Mes véhicules : 2 / 6 » au garage, le prix d'un stand, l'aéro-club
  « jamais piloté »…), la distance, **Y ALLER** : pose la destination (le GPS s'y branche), ferme la carte et rend la main.
- Toucher ailleurs ferme la bulle sans rien poser ; le toucher suivant pose une destination comme avant (aimantée sur les lieux).
- Chaque pastille dessinée est une zone qu'on touche (`zonesTouche`, tableaux réutilisés : aucune allocation par image).

### 2.4 — Les filtres et l'inventaire

- Un filtre par catégorie (les deux catégories de planques sous un même bouton), plus Ennemis, Véhicules et **Tout** ; chaque bouton
  porte la pastille de sa catégorie (les boutons sont la légende : l'ancienne légende « A Armureries · P Police… » est retirée). Les
  filtres valent pour la grande carte ET la minimap.
- Le toit oublié : toutes les surprises des toits (tyroliennes, trampolines, pigeonniers, murs à taguer, fêtes du DJ) et les hélipads.
- La grande carte est dessinée à la définition de l'écran (`CARTE_K`) : 336 px étirés sur un écran Retina, elle était floue.

### Mesures

Mêmes scènes avant / après (boucle coupée, machine sans carte graphique : seules les proportions comptent ; **à juger sur iPhone**) :

| Mesure | Avant | Après |
|---|---|---|
| minimap, à la grande place | 1,13 ms | 0,34 ms |
| minimap pincée (×2,5), à la place | 0,22 ms | 0,24 ms |
| minimap, dans les canaux | 0,35 ms | 0,29 ms |
| minimap, au Mont Reyes | 0,22 ms | 0,33 ms |
| grande carte, zoom ×1 | 4,6 ms | 2,0 ms |
| grande carte, zoom ×2,6 | 2,2 ms | 1,1 ms |

La minimap est redessinée une image sur deux : l'ancienne dessinait ses badges avec une ombre floue et un texte mesuré à chaque
fois ; les pastilles sont désormais des images en cache. Plus de lieux (160, dont 48 stands visibles seulement de près), moins de
temps. Déterminisme : empreinte du décor, portes et chalet identiques ; tirage principal après le chargement et séquence
`startRun` → toutes les salles → `startRun` identiques (boucle coupée).

### Test

« Retours du 20 octobre, lot 2 » : chaque catégorie a son symbole et son pictogramme ; chaque porte de salle, chaque salle d'`INTDEFS`,
chaque planque de `PLANQUES_DEF`, chaque activité de `pointsActivites()`, chaque surprise et hélipad des toits, chaque stand, chaque
station de vélos et les lieux du mont ont leur pastille de la bonne catégorie ; chaque lieu est dessiné ET touchable sur la grande
carte et sur la minimap ; une catégorie = une seule image sur chaque carte ; à vendre puis achetée, la pastille change ; la flèche pointe
où va le joueur sur les deux cartes (cinq caps, lus sur les pixels) ; la bulle (nom, catégorie, état, distance, « Y aller ») par de
vrais événements de pointeur ; toucher ailleurs ; la minimap ouvre la bulle ; chaque filtre retire ses pastilles des deux cartes,
« Tout » les remet. Les anciens tests de la carte suivent (gestes de la minimap sans pastilles, filtre « activite », armureries lues
dans les lieux).

Captures : `captures/retours_20/2_avant_minimap.png`, `2_apres_minimap.png`, `2_avant_minimap_zoom.png`, `2_apres_minimap_zoom.png`,
`2_avant_carte.png`, `2_apres_carte.png`, `2_avant_carte_zoom.png`, `2_apres_carte_zoom_bulle.png`, `2_icones_lieux.png` (les quinze
pictogrammes à 120, 48, 24 et 16 px).

## Lot 3 — Défis, récompenses et skins (fait : 3.1 à 3.3, un seul commit)

Les trois points se tiennent (un défi de cascade a besoin de la mesure, son dernier palier offre une tenue) : un commit, un test.

### 3.1 — Des défis à paliers pour chaque activité

**Lecture retenue** : « chaque activité » = chaque activité qui laisse une trace mesurable (un record ou un compteur déjà tenu par le
jeu) ; les nouveaux thèmes lisent ces valeurs (`META.acro`, `META.planquesJeux`, `META.stats`, `META.strikes`…) sans ajouter de
compteur caché. « Souvent un skin » = deux tenues neuves offertes au dernier palier (cabrage, vol sur le dos) ; les autres skins
arrivent avec leurs lots (chasse : costume de pigeon ; mer : kitesurf ; plongeon de falaise ; course aérienne). « Le ×2 prêt
partout » = chaque récompense de défi, anciennes comme nouvelles, passe par `recupererDefi` et son bouton ×2 (`PUB_X2`, masqué tant
que `disponible()` est faux).

- 29 thèmes de plus (58 en tout, 166 défis) : cabrage, manual, loopings, tonneaux, vrilles, vol sur le dos, meeting (figures en un
  vol), saut le plus long, wingsuit, tir sur canettes, pêche, lancer de hache, sac de frappe, plongeon de la villa, golf, longue-vue,
  cartes au trésor de Lou, bowling, karaoké, aquarium, laverie, serre, ciné, métro, musée, chalutier, Roi des Sandwichs, Madame Zohra,
  bornes d'arcade. Chaque palier paie ; `themeDefi` porte `tenue` au dernier, `recupererDefi` l'offre (`tenueDefiFinal`), l'écran des
  défis l'annonce (« — et la tenue … »).

### 3.2 — Les cascades mesurées

- **Le cabrage a un point d'équilibre** (`EQUILIBRE_CABRAGE`, `equilibreCabrage`) : sous lui, le gaz tenu lève l'avant et le lâcher
  le repose ; au-dessus, la moto part seule vers l'arrière et le gaz n'ajoute presque plus rien — on le tient en dosant l'appui, au
  rythme des bosses (`bruitRoute`). Réglé hors navigateur puis vérifié dans le jeu : un pilote qui réagit en 0,12 s tient 24 s sur
  chacune des six motos (40 s hors navigateur), en 0,2 s de 4 à 25 s, en 0,3 s l'avant retombe ; tenu en continu, la bascule en
  ~1,3 s (inchangé : « Moto cross » et « Cabrage des motos » repassent) ; sans appui, rien.
- **Le manual** (vélo, BMX, skate) : le même équilibre ; en plein manual, un appui bref dose l'équilibre au lieu de déclencher un
  bunny hop ; au-delà de la butée, la roue avant se repose (aucune chute). Pilote 0,12 s : 14 s.
- **Chrono à l'écran** (`#acroTxt`, sous la flèche du GPS) dès 1 s : « 🏍️ CABRAGE 6,9 s · record … », « 🚲 MANUAL … »,
  « 🙃 SUR LE DOS … » ; records `META.acro` (clés fixes) ; une bascule ne compte pas.
- **Les figures d'un vol** (`acroFigure`) : loopings, tonneaux, vrilles comptés dans le vol (`v.figVol`, remis à zéro posé) et au
  total ; record de chaque figure en un vol et de toutes les figures en un vol ; « 🔁 LOOPING ! ×2 ». Pilotage simulé et pilotage
  d'avant (looping, vrille, tonneaux continus du manche). Les tours de vrille du pilotage simulé sont comptés au cap (`v.cumVr`).
- **Le vol sur le dos** (pilotage simulé, `acroDos` : le dessus de l'avion vers le bas, à plus de 5 u du sol) : chrono, record.
- **Le saut le plus long en véhicule** (`acroSaut` : de l'appel à la réception, à plat).

### 3.3 — Des tenues à vrai modèle

**Lecture retenue** : « un vrai modèle » = des pièces posées sur le corps du modèle humain (casques, masques, plastrons,
chapeaux…), pas un nouveau corps ; elles suivent l'échelle, le muscle et les animations ; un chapeau acheté en boutique passe
par-dessus (il gagne).

- `TENUE_ACC`, `habillerTenue` (joueur, aperçu de la penderie, photos du catalogue ; générateur privé) : combinaison de plongée
  (masque, tuba, bouteille, palmes — **bonus nouveau** : les requins ne t'attaquent plus), Pro Rider (casque cross, plastron, bottes),
  **combinaison du cascadeur** (nouvelle : casque blanc à bande, étoiles, ceinture, bottes — cabrage plus stable, K ×0,8), **pilote de
  voltige** (nouvelle : casque de cuir, lunettes relevées, écharpe — roulis et tangage des avions +12 %), cow-boy (chapeau), Fort Reyes
  (casque), Casse-cou (casque du derby), aiguilleur (casque antibruit), athlète et Ballers (bandeaux), skateur (casquette à l'envers),
  Badlands (bandana et lunettes de moto). 12 tenues à vrai modèle ; la penderie et le catalogue (lus dans `TENUES`) sont à jour.

### Test, mesures, captures

« Retours du 20 octobre, lot 3 » : thèmes (paliers croissants, argent, tenues connues), ×2 sur chaque récompense quand une pub est
prête et payé double, tenue offerte au dernier palier ; cabrage tenu ≥ 20 s par un pilote à 0,12 s sur CHAQUE moto de `VEHDEFS` et
chrono à l'écran, bascule si tenu en continu, rien sans appui ; manual ≥ 12 s ; loopings et tonneaux comptés dans le vol et au total ;
8 s sur le dos chronométrées ; vrille comptée ; chaque tenue de `TENUE_ACC` posée sur le corps, bonus écrit. Anciens tests repassés :
cabrage, vélos, figures deux roues, skate, défis (deux blocs), tenues des mini-jeux, planques, pilotage simulé, mort pendant un défi,
trêve. Aucun coût de rendu en jeu (quelques boîtes sur le joueur) ; empreinte du décor, portes et tirages identiques.

Captures : `captures/retours_20/3_tenues_vrai_modele.png` (les 12 tenues), `3_chrono_cabrage.png`, `3_ecran_defis.png`.

