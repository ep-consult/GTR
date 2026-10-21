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
| 4 | 4.1 Tableau de chasse | ☑ |
| 4 | 4.2 Trophées au chalet | ☑ |
| 4 | 4.3 Défis de chasse et costume de pigeon | ☑ |
| 5 | 5.1 Villa planque restylée | ☑ |
| 5 | 5.2 Chantier : la grue remplacée par un monte-charge | ☑ |
| 6 | 6.1 Paquebot « Reyes Majestic » qui se brise | ☑ |
| 6 | 6.2 Vie au large | ☑ |
| 6 | 6.3 Kitesurf | ☑ |
| 6 | 6.4 Wakeboard amélioré | ☑ |
| 7 | 7.1 « Reyes Cliff Diving » | ☑ |
| 8 | 8.1 Karaoké en jeu de rythme | ☑ |
| 8 | 8.2 Défi du burger | ☑ |
| 8 | 8.3 « Jus de Plage » (découpe de fruits) | ☑ |
| 8 | 8.4 Manèges de la marina à la 1re personne | ☑ |
| 9 | 9.1 Akimbo à la 1re personne | ☑ |
| 10 | 10.1 Défi voltige et course d'avions | ☑ |

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

## Lot 4 — La chasse et les trophées (fait : 4.1 à 4.3, un seul commit)

Les trois points se tiennent (le mur du chalet montre le tableau, les défis lisent le tableau, le costume est le dernier palier d'un
défi) : un commit, un test.

### 4.1 — Le tableau de chasse

**Lecture retenue** : « les animaux abattus » = ceux que le joueur tue, de toutes les façons (balle, coup, véhicule lancé) — les seuls
que le jeu sache tuer : la faune de l'île, du mont, de l'alpage et de la forêt (`FAUNE_DEFS`), les pigeons et les mouettes
(`OIS_TYPES`), les rapaces du mont. Les chiens des rues n'y sont pas (ce n'est pas de la chasse : ils gardent leur message et leurs
−50 points) ; les requins, les marmottes et les dauphins ne meurent pas.

- `META.chasse` (17 clés fixes, une par espèce de `CHASSE_ESPECES`) ; compté là où la bête meurt (`chasseCompte` dans
  `toucherAnimal`, `oiseauTue`, `mvRapaceTue`) ; la première bête d'une espèce est annoncée.
- **L'écran** `#chasseScr` (`renderChasse`) : le total, le gibier et les bêtes paisibles ou protégées, l'avancement du costume de
  pigeon, puis chaque espèce par lieu (la ville et la plage, l'île, le mont, l'alpage, la forêt du chalet), son nombre et ce qu'elle
  vaut (gibier, bête paisible, espèce protégée). On l'ouvre depuis la **pause** (« Tableau de chasse ») et depuis le **mur des
  trophées du chalet**.

### 4.2 — Les trophées au chalet de montagne

**Lecture retenue** : le chalet est plein (cheminée, lit, râtelier, table…) et sa salle est vue de haut ; les trophées vont sur un
mur à eux, à l'est du chalet : **un abri de rondins** (mur du fond, deux joues, toit de neige qui s'efface quand on est dessous,
comme celui du chalet), tourné vers la caméra.

- Un écusson par espèce, dans l'ordre de `CHASSE_ESPECES` (deux rangées de bêtes à poil, une rangée d'oiseaux) ; la **tête montée**
  (ours gueule ouverte, cerf et ses bois, panthère aux yeux jaunes, sangliers et leurs défenses, bouquetin et ses cornes en arc,
  chamois, vache et sa cloche, chèvre, biche, renard, lapin) ou **l'oiseau naturalisé, ailes ouvertes, sur sa branche** (pigeon,
  mouette, aigle, vautour à collerette, faucon) **apparaît à la première bête abattue**, comme le mur des trophées de pêche du
  cabanon (`tropheeGeo`, couleurs de sommets, `tropheesPlaces`).
- Une **plaque de laiton** sous chaque écusson (le nom, « ×N ») ; une espèce pas encore chassée : une plaque de bois sombre « ? nom ».
  Une bête paisible ou protégée a sa plaque **cerclée de rouge et marquée « BRACONNÉ »** ; l'enseigne « TABLEAU DE CHASSE » au-dessus.
  Toutes les plaques sur une seule toile (une texture, redessinée à chaque entrée).
- Devant le mur, **la caméra vient de face, par-dessus l'épaule, et suit le joueur le long du mur** (`chaletTropheesCadrage`, le
  cadrage du lancer de hache) ; le bouton d'action « 🏆 TABLEAU DE CHASSE — N bêtes » ouvre l'écran.
- **Coût** (salle du chalet, machine sans carte graphique : seules les proportions comptent) : les têtes visibles sont fusionnées en
  un seul maillage, refait à chaque entrée ; **+8 appels de rendu** (180 → 188 à l'entrée, 157 → 165 dans le chalet, 149 → 157 au
  lancer de hache), +3 k triangles ; devant le mur, 68 appels (le cadrage regarde le mur). Construit sur un générateur privé
  (`avecAleaPrive`) : la salle tire ce qu'elle tirait.

### 4.3 — Les défis de chasse et le costume de pigeon

**Lecture retenue** : « défis de chasse » = le gibier seulement : pigeons, mouettes, sangliers (île et forêt), et le nombre
d'espèces de gibier au tableau ; l'ours et le jaguar comptent déjà dans le défi « Chasseur / Dompteur de fauves ». « Voleter » =
le bouton ESQUIVE, costume porté (aucun bouton de plus).

- Quatre thèmes (`DEFIS_THEMES`) : **Terreur des pigeons** (10, 40, 100 — le **costume de pigeon** au dernier palier),
  **Terreur des mouettes** (5, 20, 50), **Maître d'équipage** (sangliers : 5, 15, 40), **Grand veneur** (3 puis 6 espèces de gibier
  au tableau). De l'argent à chaque palier, le ×2 comme les autres.
- **Le costume** (`TENUES.pigeon`, `TENUE_ACC.pigeon`, un vrai modèle) : capuche grise à bec et à yeux orange, jabot irisé vert et
  violet, ailes grises aux bras (deux barres sombres, rémiges noires), queue en éventail.
- **Voleter** (`PIGEON`, `pigeonPeut`, `pigeonBattement`, `pigeonPlane`) : au sol, ESQUIVE = **un bond plané** (il vaut une
  esquive : 0,35 s d'invulnérabilité ; 14 d'endurance) ; en l'air, **jusqu'à trois battements d'ailes**, de plus en plus faibles,
  **jamais à plus de 3,6 u au-dessus du sol d'où l'on a sauté** ; toute chute est **ralentie** (4,2 u/s au plus : on se pose sans
  un bobo, même d'un toit) ; on plane à l'allure de la marche, en pilotant au joystick. Les bras battent (vite après un battement).
  **Jamais un vrai vol** : on ne regagne jamais de hauteur au-delà du plafond, un battement coûte de l'endurance, et rien en salle,
  en véhicule, à la nage, sous voile, en wingsuit ni au jetpack. En 1re personne, le bond garde la vue à pied.

### Comment la chasse et le karma cohabitent

Le karma des bêtes paisibles (bouquetin, chamois, vache, chèvre, cerf, biche, renard, lapin) et des espèces protégées (aigle,
vautour, faucon) est **gardé tel quel** : chaque bête coûte toujours 50 points et son message (« BAD KARMA », « ESPÈCE PROTÉGÉE »…).
Le tableau de chasse les **compte quand même** (on sait ce qu'on a fait) et le mur du chalet les **expose sous une plaque rouge
« BRACONNÉ »** — c'est la honte, pas un trophée. **Aucun défi ne les compte** et aucun ne rapporte d'argent : seul le gibier (pigeons,
mouettes, sangliers, jaguar, ours) fait avancer les défis. Le test le vérifie sur tous les thèmes de `DEFIS_THEMES` : avec 60 bêtes
paisibles ou protégées de chaque espèce au tableau, aucun défi n'avance.

### Test, mesures, captures

« Retours du 20 octobre, lot 4 » : chaque espèce qui peut mourir (lue dans `FAUNE_DEFS`, `OIS_TYPES`, les rapaces de `MONT_VIE`) a
sa place au tableau, sa clé de sauvegarde et son écusson ; un sanglier tué **au poing** (`attaquer`) entre au tableau et rapporte
ses points ; un cerf entre au tableau et coûte 50 points comme avant ; pigeon, mouette, vautour (un oiseau mort compté une fois) ;
l'écran depuis la pause (chaque espèce, le total, le retour) ; aucun défi n'avance sur une bête paisible, quatre thèmes de chasse ;
100 pigeons : les trois paliers payés et le costume ; le costume posé sur le corps (ailes aux bras) ; voleter au vrai bouton ESQUIVE
sur une rue plate : 6 bonds en 10 s, 3,21 u au plus haut (plafond 3,6), 3 battements au plus, 1,7 s en l'air au plus, aucun dégât ;
une chute de 30 u : 0 PV en costume (4,2 u/s au plus), 52 PV sans ; sans costume, ESQUIVE reste une esquive ; en salle et à la nage,
pas de vol ; en 1re personne, le bond garde la vue à pied ; au chalet : les têtes des espèces au tableau (un seul maillage), chaque
tête dans le mur, au-dessus de sa plaque, sans en toucher une autre ; les plaques (laiton, bois, rouge) lues sur la toile ; la zone
ouvre l'écran ; le cadrage de face, qui s'en va loin du mur ; une vache abattue apparaît à l'entrée suivante. Anciens tests
repassés : défis, planques, chalet, tenues des mini-jeux, défis de la 3e série, wingsuit, vue 1re personne, robustesse, animaux, tir
à la tête, chute 1P, faune en pente, vie du mont, origine du monde, lot 3. Empreinte du décor, portes et tirages identiques.

Captures : `captures/retours_20/4_mur_trophees.png` (quelques espèces au tableau, plaques vides et « BRACONNÉ »),
`4_mur_trophees_toutes_especes.png`, `4_costume_pigeon.png` (de face, de dos, ailes ouvertes), `4_ecran_tableau_de_chasse.png`.

## Lot 5 — Planques et constructions (fait : 5.1 et 5.2, un seul commit)

### 5.1 — La villa planque restylée

**Lecture retenue** : la villa est « le manoir du sommet » de Los Reyes Hills ; « au niveau des autres planques V2 » = un vrai lieu
(un dehors, une lumière, des sons, un ciel en dôme), comme la caravane ou le chalet. Tout ce qu'elle offrait reste à sa place et
marche pareil : lit, coffre, garage (et SUIVANT), cabinet de curiosités, tableau de la ville, mur de trophées, penderie, piscine,
plongeoir et concours de plongeon — on change le lieu autour d'eux, pas eux.

- **La maison** (`villaV2Construire`) : une villa moderne en U, enduit blanc et pierre, ouverte au sud sur la piscine. L'aile nord
  est le grand salon en double hauteur (façade de verre sur le patio, cuisine à îlot et ses suspensions, grande table, le tableau
  de la ville, le garage au bout, sa porte sur l'allée) ; les ailes est et ouest (lit, coffre, mur de trophées / penderie,
  cabinet) ont des baies vitrées et des portes-fenêtres ouvertes (le vantail glissé de côté). Toits plats à sous-face de teck,
  gravier et lanterneaux, **masqués quand on est dessous** (comme le chalet).
- **Le dehors** : le patio de travertin autour du bassin (oliviers en pot, lanternes), le salon d'extérieur sous pergola à la place
  du salon d'intérieur (mêmes solides : canapé, banquette, mur de pierre et son écran) ; au sud, le jardin jusqu'au portail grand
  ouvert — pelouse tondue, allée de dalles bordée de lavande, oliviers, palmiers, haies, une table sous une treille fleurie, un foyer
  et ses fauteuils, des bougainvilliers sur les murs ; à l'ouest, l'allée des voitures en gravier bordée de cyprès, du garage au
  portail ; au nord, derrière la maison, une terrasse de travertin (transats, parasols, une longue-vue) et sa **balustrade de verre
  au bord du plateau**.
- **La vue** : le plateau finit par des murs de soutènement de pierre ; en dessous, **le flanc de la colline** (herbe sèche dorée,
  maquis) descend jusqu'à **la ville, 44 u plus bas** (`PQ_VILLE_JOUR_FS` : toits clairs, tuiles, piscines, parcs, rues, qui se
  fondent dans la brume), **la mer et sa plage à l'est**, des tours au loin, les **collines dorées** de Los Reyes Hills, le
  **panneau LOS REYES** sur une crête, le soleil de l'après-midi (`pqCiel`). Rien au-delà de 185 u (les sommets des reliefs
  lointains sont bornés).
- **Lumière et son** : un après-midi doré (`s.pqAmb`, la lampe suit l'intérieur), une brise, des oiseaux dans le jardin, le carillon
  de la terrasse (`PQ_SONS.villa`), coupés à la sortie, à la mort et à chaque partie (la villa a désormais un `s.pq`).
- **Tirages** : l'ancienne villa est construite comme avant (ses tirages, ses meubles, ses solides) ; l'enveloppe générique,
  l'ancien dallage, le salon d'intérieur, les plantes et les plafonniers sont **masqués** ; le neuf est sur un générateur privé.
  La ville, le décor et le tirage principal sont identiques. Seule différence : une partie qui passe par la villa tire ensuite
  autrement (2 262 tirages de moins à la visite) — l'habillage générique ne pose plus de lambris ni de cadres sur des murs
  génériques, désormais masqués. C'est la villa qui a changé, pas la ville.
- **Coût** (salle de la villa, machine sans carte graphique : seules les proportions comptent) : **moins d'appels de rendu** —
  285 → 188 à l'entrée, 283 → 201 au patio, 212 → 174 dans le grand salon, 209 → 143 au nord (l'ancien dallage était fait de 190
  dalles séparées) ; +30 à 47 k triangles (ciel, flanc de colline, ville, collines). À juger sur iPhone.

### 5.2 — Le chantier : la grue remplacée par un monte-charge

**Lecture retenue** : « du même type que celui de la falaise » = cabine vitrée à montants jaunes, bandeau de sécurité face caméra,
mât à pied rayé jaune et noir et feu rouge en tête, rien devant lui vu de la caméra (1.3). « Qui dessert les étages » = on s'arrête
à chaque niveau (`ETAGES`), une passerelle mène de la porte de la cabine à la dalle.

- **La grue à tour supprimée sans rien décaler** : elle est construite comme avant (ses tirages) puis **réduite à un point avant la
  fusion** du décor (ses pièces passent dans la fusion, invisibles) ; son solide est retiré. De même la lisse sud de l'échafaudage,
  refaite en deux morceaux autour de la passerelle. Empreinte du décor, portes, chalet, mobilier et tirage principal identiques.
- **Le monte-charge** (`mkMonteChargeChantier`, `MCH`) au sud-est de la Los Reyes Tower, face à la caméra, entre deux montants de
  l'échafaudage (la passerelle évite les poteaux de l'immeuble) : un mât à treillis amarré à l'immeuble à chaque niveau, une cabine
  vitrée dont la porte (au nord) se ferme pendant le trajet, une passerelle à garde-corps à chaque niveau. L'enseigne du chantier,
  plus courte, est décalée à l'ouest.
- **Il se joue** : dans la cabine, le bouton d'action monte d'un niveau (« 🛗 MONTER — niveau 3 / 6 »), et du dernier redescend au
  sol d'un coup ; sur une passerelle, on l'appelle (« 🛗 APPELER LE MONTE-CHARGE »). Le plancher de la cabine est un plancher
  d'`ETAGES` qui bouge avec elle ; le joueur est porté (porte fermée). **Portes palières** : on n'entre dans le puits qu'au niveau de
  la cabine (sinon on reste sur la passerelle) ; en hauteur on ne sort de la cabine que par sa porte ; au sol, la cabine en haut, on
  ne passe pas dessous ; on ne tombe pas des passerelles. Remis au sol à chaque partie.

### Test, mesures, captures

« Retours du 20 octobre, lot 5 » : la villa a un dehors à elle (ciel en dôme, ville en contrebas), rien au-delà de 185 u, l'ancienne
enveloppe masquée (le tapis de la SORTIE reste), **les dix zones de la villa existent, à plus de 8 u de la SORTIE, et on les atteint
à pied depuis la SORTIE** (parcours en largeur sur les vrais solides, au rayon réel de chaque zone) ; chaque toit s'efface quand on
est dessous ; la lumière et l'ambiance, coupée à la sortie ; le chantier : plus un triangle de la grue au-dessus de l'immeuble, son
solide retiré ; le monte-charge au vrai bouton : les six niveaux desservis, et à chacun on sort par la passerelle jusqu'à la dalle et
on revient, puis la redescente ; l'appel depuis le niveau 3 ; la porte palière (pousser vers le puits vide : on reste sur la
passerelle), les garde-corps, la cabine qu'on ne quitte pas en marche, le puits au sol ; startRun remet la cabine au sol. Anciens
tests repassés : « Planques, 7 » (le concours de plongeon), portes, vue immersive dans les salles, hélicoptères (le Titan au
chantier), figurants, retours du 18 octobre (garage de la villa), 1.3, origine du monde, retours du 16 octobre (l'immeuble en
construction), habillage V2 des salles (qui ne demande plus de texture à une enveloppe générique masquée).

Captures : `captures/retours_20/5_avant_villa.png`, `5_villa_entree.png`, `5_villa_patio.png`, `5_villa_vue_nord.png`,
`5_villa_grand_salon.png`, `5_monte_charge_chantier.png`, `5_monte_charge_niveau3.png`.


## Suite complète après le lot 5 (388 blocs) — trois échecs, corrigés

- **« Textes : défis homonymes »** : le thème du musée (lot 3) reprenait « Monte-en-l'air », déjà le premier palier des toits.
  Il devient « Rat de musée ».
- **« Retours du 20 octobre, 1.3 »** (seulement dans la suite) : le rayon de la caméra vers la cabine du monte-charge touchait
  l'accessoire de la tenue que portait encore le joueur (depuis le lot 3, une tenue a un vrai modèle, et un test plus ancien en
  laisse une sur le joueur). Le test cherche du décor devant la cabine : le joueur et sa tenue en sont exclus.
- **« Arène de derby : le pilote ne gagne jamais »** (0 sur 8 dans la suite, 3 sur 8 seul) : le match est à pas fixe et sur sa
  graine, mais ce que les tests précédents laissent (tenue, personnage, records des cascades du lot 3, caches de matériaux)
  change les tirages faits pendant le match. Le test fixe désormais tenue, personnage et records avant la mise en place ; il
  reste dépendant des caches partagés, et le pilote gagne un match sur quatre en moyenne (zéro sur huit arrive une fois sur dix
  par construction) : il joue huit matchs de plus quand les huit premiers sont perdus. Aucun changement du jeu.


## Lot 6 — Mer et large (fait : 6.1 à 6.4, un seul commit)

Module `LE LARGE V3` (juste avant les courses du mont), construit tout à la fin du décor (`mkMerV3`, générateur privé, matériaux
propres) : empreinte du décor, portes, chalet, mobilier et tirage principal identiques ; sonde des salles identique.

**Lectures retenues.** 6.1 « monter à bord, explorer, une mission ou un défi » : le paquebot est ÉCHOUÉ sur un récif (il ne coule
qu'à la fin du compte à rebours, sinon on n'aurait jamais le temps d'y monter) ; la mission est un sauvetage (mener les passagers
aux canots), le butin le coffre du commissaire, et la plongée sur l'épave vient après. « Rejouable une fois par vague » : il est
de nouveau là, intact, à la vague suivante. 6.2 : quatre rencontres qu'on ne trouve qu'au large (bouteilles, tortues, contrebandiers,
poissons volants), chacune avec son défi. 6.3 : un kiosque sur la plage plutôt qu'un véhicule, comme le wakeboard. 6.4 :
« considérablement » = de nouvelles figures et une vraie série (double-up, 540, GRAB, RALEY), un sillage plus large, un record.

- **6.1 Le « Reyes Majestic »** (`PAQ`, `mkPaquebot`, `majPaquebot`) : un paquebot de 92 u échoué au large (`paqSite`), deux moitiés
  qui pivotent sur la quille (la cassure), coque, ponts, superstructures à fenêtres, cheminées, canots. On monte par l'échelle de
  coupée (à la nage, ou depuis un bateau : MONTER À BORD) ; le compte à rebours part (`PAQ_DUREE` 100 s) : huit passagers à mener
  aux deux postes d'embarquement (« SUIVEZ-MOI ! », ils marchent **dans les pas du joueur** — `PAQ.trace` : en ligne droite, ils
  restaient coincés contre une superstructure, 4 sur 8 dans le premier essai du test), 40 $ chacun et une prime quand tous sont
  saufs ; le coffre du commissaire (3 s sans bouger, 520 $, une fois par vague). À zéro, il se brise en deux : les moitiés se
  relèvent en V jusqu'à 66° et sombrent, ceux qui sont encore à bord sont jetés à la mer (jamais tués), les passagers oubliés
  finissent dans des radeaux. L'épave : des bulles, PLONGER (380 $, une fois par vague). **Caméra de bord** (`paqCameraPont`) : le
  pont promenade fait 1,3 u entre le bastingage et la superstructure, sous les canots — la caméra habituelle passait au-dessus des
  superstructures et le joueur disparaissait, de dessus comme en vue immersive ; sur une promenade, elle se place au-dessus de la
  mer, de son côté. **En bateau**, la chaîne du bouton d'action s'arrêtait sur SORTIR : les actions de la mer y sont désormais
  proposées (monter à bord, saisir une cargaison).
- **6.2 La vie au large** (`LARGE3`, `largeNouvelleVague` : une graine par vague) : douze bouteilles à la mer (ramassées en passant
  dessus, un message dedans), des tortues prises dans des filets (LIBÉRER), la vedette des contrebandiers qui file sur sa boucle
  (la toucher en bateau l'arraisonne, SAISIR la cargaison : 350 $), des poissons volants le long d'un bateau rapide.
- **6.3 Le kitesurf** (`KITE`, kiosque sur la plage) : l'aile en vol au bout de ses lignes, le vent de mer (`KITE_VENT`) ; on tire des
  bords, SPRINT = saut (plus haut avec de la vitesse), en l'air ESQUIVE, GRENADE, SPRINT = figures ; une figure pas finie à la
  réception = chute. 60 s, objectif 4 000, prime une fois par vague, record `META.defis.kite`, défi « Kitesurf » et combinaison au
  dernier palier (sauts 15 % plus hauts).
- **6.4 Le wakeboard** : double-up (toutes les 14 s le bateau vire : 3,5 s de vague doublée, un saut avec figure ×1,2), 540 (un tour
  et demi), GRAB (SPRINT tenu en l'air), RALEY (sauté lancé de travers, seulement avec une figure), série qui multiplie, gerbe d'écume dans les virages, sillage plus large, record
  `META.defis.wake`, défi « Wakeboard ».
- **Défis** : Majestic, épaves, bouteilles, tortues, contrebande, kitesurf, wakeboard (compteurs `META.defis` à clés fixes).

**Mesures** (machine sans carte graphique : proportions seulement). Le paquebot dans le champ, même vue avec et sans lui : +40
appels de rendu et +2 k triangles à 70 u (1 029 contre 989), +55 et +5 k à 160 u (2 435 contre 2 380). Plage, kiosque du kite : +8
appels. Pendant la cassure, la vue embrasse la ville derrière le navire : c'est elle qui coûte.

**Pilotes simulés** (test « Retours du 20 octobre, lot 6 ») : les huit passagers menés en 78 s sur 100, en marchant sur le pont
(chemin par les portes) ; kite : rider simulé ~13 900 points (16 sauts), passif 0, figures trop tardives = chutes ; wakeboard :
~64 000 points avec la série, ~4 100 sans figures (objectif hors de portée).

Captures : `captures/retours_20/6_majestic_mer.png`, `6_majestic_pont.png`, `6_majestic_cassure.png`, `6_majestic_cassure2.png`,
`6_majestic_epave.png`, `6_kite.png`, `6_wake.png`.


## Lot 7 — Reyes Cliff Diving (fait)

**Lecture retenue.** « Sur les falaises » : la crique des plongeurs, qui a déjà trois falaises de 17, 10 et 5 u au-dessus d'une baie
d'eau de mer ; les plateformes demandées (10 à 27 m) sont la planche du bras ouest (10 u), une plateforme de béton sur la falaise nord
(17 u) et une tour de compétition plantée sur la falaise (27 u). « Le même système de saut que le concours de la villa » : l'élan,
MAINTENIR pour tourner groupé, relâcher pour entrer tête la première, trois juges (`PLG_*` repris).

- **La compétition** (`CLIFF`, `mkCliffDiving` en fin de décor sur un générateur privé, `cliffAction`, `cliffDemarrer`, `majCliff`) :
  on s'inscrit au pied de la tour, en haut de la falaise nord (`CLIFF.inscr`), trois plongeons de plus en plus hauts. SAUTER en haut de l'élan (la jauge),
  MAINTENIR : on tourne groupé, relâcher : on s'ouvre et on entre ; difficulté = nombre de demi-tours (jusqu'à trois saltos et demi
  depuis 27 u), exécution = verticale à l'entrée, coefficient de hauteur (`kh` = 1 + h / 27). Un plongeur qui ne saute pas finit par
  tomber de la plateforme (0 point).
- **Le spectacle** : la tour à escalier, bannière « REYES CLIFF DIVING », fanions, le public sur les bras de la crique (un maillage),
  trois bateaux de juges qui lèvent leurs cartons après chaque plongeon, une **caméra de retransmission** depuis la mer, de profil
  (`cameraCliff`), le panneau des notes (`#clfPan` : notes des trois juges × difficulté × hauteur).
- Record `META.defis.falaise`, prime une fois par vague au-delà de `CLIFF_OBJECTIF` (300), défi « Plongeur de falaise » (150, 300,
  450) et la tenue de plongeur de falaise au dernier palier (bonnet, lunettes, lycra : les plongeons dans l'eau de toute la ville
  rapportent 50 % de points en plus). Joueur tenu pendant la compétition (`majJoueur` n'est pas appelée), trêve des vagues, arrêtée par
  `mourir` et `startRun`.
- **Pilotes simulés** (test « Retours du 20 octobre, lot 7 », aux vrais boutons) : plongeur ~470 points (100 / 125 / 243) ;
  maladroit qui tourne sans s'arrêter ~54 ; passif 0. Les cartons, la caméra depuis la mer, la fin dans l'eau, la prime unique et la
  tenue sont vérifiés.

Captures : `captures/retours_20/7_site.png`, `7_vol.png`, `7_notes_hud.png`.


## Lot 8 — Mini-jeux (fait : 8.1 à 8.4, un seul commit)

**Lectures retenues.** 8.1 « un jeu de rythme à pistes, avec un nom original » : la salle du karaoké garde son nom (Micro
Cassé) et le jeu s'appelle « la scène » ; quatre pistes de couleur, des notes qui tombent, trois chansons ORIGINALES (paroles
écrites pour le jeu, aucune référence à un jeu existant). 8.2 « contre un PNJ, en rythme, avec nausée et boost » : un duel contre
Gérard « la Mâchoire », l'habitué de la sandwicherie (le Monstre d'avant était un compteur de taps contre une jauge). 8.3 : le
stand « Jus de Plage » de Lani, sur le sable entre la gare du grand huit et l'eau ; le geste (trancher au doigt des fruits jetés en
l'air) est décrit par la demande, le nom et les règles sont propres au jeu. 8.4 « les manèges de la marina » : le grand huit et la
grande roue (qui existaient, sans vue intérieure) et un troisième, construit pour l'occasion : **le Tourbillon**, des chaises
volantes ; chacun a sa vue à la 1re personne, et le bouton de vue bascule pendant le tour entre l'intérieur et une vue extérieure.

- **8.1 La scène du karaoké** (`KARA`, `KARA_CHANSONS`, `karaPartition`, `karaAppui`, `karaMaj`, `karaFin`, `karaDessiner`) : « Néon sur
  Los Reyes » (facile, 92 bpm), « Cœur de Chrome » (moyen, 112 bpm), « Vipère Fièvre » (difficile, 138 bpm, ouverte par un score sur
  la deuxième). La partition est tirée de la graine de la chanson (`karaPartition` : noires, croches, notes tenues, accords sur deux
  pistes) et calée sur le tempo ; fenêtres de 50 / 95 / 140 ms (PARFAIT, BIEN, JUSTE), combo et multiplicateur, notes tenues
  (relâcher trop tôt = LÂCHÉ). La **jauge de la salle** monte avec les bonnes notes et fond avec les ratés et les fausses notes : vide,
  le chanteur est hué et sort de scène (rien de gagné). Notes S / A / B / C à la précision, gain selon la note, record par chanson
  (`META.karaokeRec`, clés fixes), Disque de Platine pour un S sur l'une des deux dernières. Toujours deux chansons par vague
  (`KARAOKE_SESSIONS_MAX`), 60 $ le micro. Voix et accompagnement synthétisés (`karaSonStart`, `karaVoix` : la note jouée chante, la
  fausse note grince). Le joueur est tenu sur scène, caméra cadrée sur la scène et l'écran des paroles (`s.cadrage`), quatre gros
  boutons en bas.
- **8.2 Le duel du Monstre** (`BURGER_COUCHES`, `burgerDemarrer`, `burgerMaj`, `burgerMordre`, `burgerBoire`, `burgerBoost`,
  `finMonstre`) : deux Monstres de douze couches (pain, steaks, cheddar, bacon, salade…) qui fondent couche par couche à l'écran. On
  MORD en rythme (un curseur va et vient : dans le vert, la bouchée compte et la série monte ; hors du vert, elle compte à moitié et
  la nausée monte plus) ; chaque couche a son poids en nausée ; BOIRE fait redescendre la nausée mais coûte 1,4 s ; la SAUCE DU ROI
  (une fois) double le rythme 3,5 s puis donne +15 de nausée. Gérard mord à son rythme (un peu plus vif à chaque Monstre gagné),
  boit quand il tangue, prend sa sauce au milieu, et peut craquer. Nausée à 100 = perdu (−8 PV), Gérard qui finit avant = perdu,
  50 s écoulées = perdu. Un Monstre par vague (inchangé), 40 $, gain et Ceinture de Champion comme avant.
- **8.3 Jus de Plage** (`JUS`, `JUS_FRUITS`, `JUS_PIEGES`, `mkJusDePlage` en fin de décor sur un générateur privé, `jusDemarrer`,
  `jusTrancher`, `jusMaj`, `jusConclure`) : 45 s, trois vies ; les fruits jaillissent du bas de l'écran, un glisser du doigt les
  tranche (plusieurs d'un geste = combo) ; un oursin ou une méduse tranchés coûtent une vie et gâchent le jus ; un fruit retombé
  aussi. Le verre se remplit par couleur : « Jus Soleil » (mangue, ananas, coco : des PV), « Coup de fouet » (pastèque, fraise,
  citron vert : de la vitesse), « Cocktail de Lani » à moitié-moitié ; la pitaya dorée compte triple. Un jus (le bonus) par vague,
  record `META.defis.jus`, prime une fois par vague au-delà de 60 fruits, défi « Jus de Plage ». Le mobilier qui mordait sur le stand
  est replié pièce par pièce (`replierMobilierDans`).
- **8.4 Les manèges à la 1re personne** (`MANEGES_DEFS`, `cameraManege`, `mkTourniquet`, `majTourniquet`) : grand huit (l'œil au
  premier rang, dans le repère du wagon : on bascule dans les loopings et les dévers, champ qui s'ouvre avec la vitesse), grande roue
  (dans la nacelle, la ville qui monte), le Tourbillon (douze chaises sur des chaînes, l'angle d'équilibre calculé à la vitesse de
  rotation — jusqu'à 45° —, la couronne qui penche, les ampoules ; on regarde dans le sens de la marche). Le doigt fait
  regarder autour, le regard revient seul. Le bouton de vue passe à l'extérieur et revient. Défi des manèges : le Tourbillon compte.

**Pilotes simulés** (tests « Retours du 20 octobre, lot 8.1 » à « 8.4 », aux vrais boutons) : chanteur à ±45 ms : S, 100 %,
« Cœur de Chrome » ; passif et maladroit (±170 ms, une note sur dix oubliée, fausses notes) : hués. Mangeur en rythme : gagne (Gérard
à 2 couches de la fin) ; passif : Gérard gagne ; glouton qui mord sans boire : nausée à 100. Trancheur : 86 fruits, Cocktail de Lani ;
passif : trois fruits par terre en 7,4 s ; maladroit (coups au hasard) : 5 fruits. Les trois manèges : la caméra à la tête du
passager pendant tout le tour (1,5 u au plus, au premier rang du grand huit), la vue extérieure à 6 à 26 u, la chaise du Tourbillon à
45°.

**Mesures** (machine sans carte graphique : proportions seulement). Au Tourbillon : 274 appels de rendu en vue immersive (257 avant
le lot), 237 en vue de dessus (202) ; au stand de Lani : 279 (258) et 220 (166) — la vue de dessus du stand voit aussi le Tourbillon.
Pièces fixes fusionnées par matériau (`fusionnerEnfants`) ; une chaise et ses chaînes = deux appels.

Captures : `captures/retours_20/8_karaoke.png`, `8_burger.png`, `8_jus.png`, `8_jus_stand.png`, `8_huit1p.png`, `8_roue1p.png`,
`8_tour1p.png`, `8_tour_ext.png`.


## Lot 9 — Akimbo à la 1re personne (fait)

**Lecture retenue.** « Chaque arme qui autorise l'akimbo » = celles que la pièce « double » de l'établi accepte
(`MODS_ARMES.double.pour` : pistolet, pistolet silencieux, revolver, Uzi, P.M.), lue à la source. La mécanique du tir akimbo
existait (cadence ×1,8, chargeur ×2, une main puis l'autre en 3e personne) ; c'est la 1re personne qui n'en montrait qu'une. « Visée
cohérente » : avec une arme dans chaque main, on ne met pas l'œil dans un organe de visée — VISER rapproche les deux armes du
centre, bouches à hauteur du regard, et resserre la mire de hanche (dispersion −35 % au lieu de −65 % pour une seule arme).

- **Deux armes à l'écran** (`akimboMontage` : la droite tient la sienne sans main de soutien — `fpsMontage(…, seul)` —, la jumelle
  est le même montage en miroir, `G.R.scale.x = −1`) ; reconstruit quand on pose ou retire la pièce (`V.akimboCle`).
- **Tir alterné** : la gauche puis la droite (le `P.akimboG` d'`attaquer`) ; chaque arme a SA flamme (`akimboFlash`), SA douille
  (`fpsEjecter`), SA culasse et SON recul (`V.rk` / `V.rkG`, `V.recul` / `V.reculG`).
- **Visée** (`akimboPose`) : à la hanche chacune de son côté, en visant elles remontent vers le centre ; la mire reste.
- **Rechargement** : les deux armes jouent leur manœuvre (`animRecharge` : le chargeur tombe, le neuf claque), la gauche un temps
  après la droite.
- **Stand de tir, ball-trap, tir sur canettes** (le moteur `FPS`) : les deux armes aussi, les coups alternent (`FPS.akG`).

**Test** « Retours du 20 octobre, lot 9 » (les cinq armes lues dans `MODS_ARMES.double.pour`) : deux armes projetées de part et
d'autre de l'écran par la vraie caméra (pistolet ±0,53 de demi-largeur, P.M. ±0,73), aucune main de soutien, tir GDGDGDGD avec un
recul à gauche, visée qui les rapproche (pistolet ±0,33) sans ôter la mire, rechargement des deux, plus de jumelle sans la pièce,
stand de tir. Les blocs « Vue à la 1re personne », « Visée V2 », « Rechargements », « Optiques », « Poings », « Armes », « Armurerie
V2 », « Ball-trap », « Caravane » repassent.

Captures : `captures/retours_20/9_akimbo_hanche.png` (la gauche tire), `9_akimbo_hanche_hud.png`, `9_akimbo_visee.png`,
`9_akimbo_recharge.png`, `9_akimbo_uzi.png`.


## Lot 10 — La Reyes Air Race (fait)

**Lectures retenues.** « Sous les ponts des canaux » : aucun pont des canaux ne laisse passer un avion (tirant d'air de 3,3 u au plus,
et le crash du pilotage simulé compte le tablier comme le sol) ; la course passe donc **au ras de l'eau du grand canal, entre les volées
des deux ponts-levis**, que la course lève presque à la verticale (86° au lieu de 70° : le couloir entre les volées passe de ±1,9 à
±3,6 u). « Le long des falaises » : la face ouest du Pic du Vertige (90 u à pic). « Dans les canyons » : le canyon des mesas, au
défilé de 10 u entre deux mesas (la porte des mesas). « Au ras du sol » : le grand large et le grand canal à 6 u. « Entre les tours » :
l'avenue x = −84, entre les quatre paires de tours du centre. « Défi voltige » : chaque looping ou tonneau compté par le pilotage
simulé pendant la course retire 2 s (3 figures au plus). « Paliers » : bronze, argent, or (défi « airRace », tenue à l'or).

- **Le parcours** (`AIR_DEPART`, `AIR_ANNEAUX`, `mkAirRace` en fin de décor sur un générateur privé) : départ au col du Mont Reyes (on
  le traverse vers le sud), puis vingt anneaux — la porte des mesas, le défilé et la sortie du canyon, la face ouest du Pic, un grand
  arc au ras de l'eau au large (rayon ~90 u, il met dans l'axe du canal), l'embouchure, les ponts-levis sud et nord, la marina, le long
  du canal, les toits, l'arc au-delà du mur nord, l'avenue et deux passages entre les tours, l'arrivée au pied de la colline. Le tracé
  a été relevé sur le vrai relief et les vrais solides (une carte des hauteurs telle que la voit le crash), puis **volé** par un pilote
  simulé jusqu'à ce que chaque virage soit faisable : l'avion de voltige vire sur ~55 u à pleine vitesse, ~30 u à 32 u/s — les virages
  serrés se prennent en ralentissant. Le cap de chaque anneau est celui qui vient de l'anneau d'avant (calculé).
- **La course** (`majAirRace`, `airTraverse`) : un avion en pilotage simulé (`avionSim`) qui traverse le départ lance le chrono ; seuls
  l'anneau à passer et le suivant sont visibles (balise au-dessus du premier). Dans le cercle : validé ; à côté (à moins de
  `AIR_MARGE` = 30 u du bord) : manqué, +4 s ; l'anneau évité et le suivant traversé : manqué aussi. Abandon : descendre de l'avion,
  le crash (mortel : `mortCrashAerien`), la mort, 45 s sans un anneau. Temps final = chrono + pénalités − bonus de voltige ; médailles
  `AIR_MEDAILLES` (85 / 72 / 62 s), record `META.defis.airT` (le meilleur temps) et `META.defis.airMed`, prime une fois par vague dès
  le bronze (×1,5 l'argent, ×2 l'or), défi à paliers « Pilote de course aérienne », « Médaillé d'argent du ciel », « Roi du ciel de Los
  Reyes », et la combinaison de la Reyes Air Race à l'or (casque blanc, écharpe à damier : un anneau manqué ne coûte que 2 s). Trêve
  des vagues pendant la course.
- **Le bandeau** (`airUI`) : en haut, entre les jauges et la minimap — chrono, pénalités, bonus, anneau, distance, au-dessus ou
  au-dessous ; le lieu de l'anneau. (Une 1re version sous la rangée Vue / Pause cachait la flèche d'objectif.)
- **Les ponts-levis** (`levisThetaMax`, `LEVIS_THETA_COURSE`) : `levisDemande` les demande pendant toute la course (alerte, barrières,
  montée : ~10 s, l'avion y arrive vers 28 s), `majLevisV3` les monte à 86° ; ils redescendent après, comme pour un bateau.

**Pilotes simulés** (test « Retours du 20 octobre, lot 10 », joystick `INPUT.jx` / `INPUT.jy` et manette `MANETTE`, parcours lu dans
le jeu) : le pilote suit la ligne d'un anneau à l'autre, anticipe les virages (il prend la ligne suivante à l'approche d'un anneau où
elle tourne), ralentit selon le virage, ne pousse jamais fort sur le manche en virage incliné (une poussée en virage fait tourner à
l'envers) : **58,0 s, aucun anneau manqué, l'or** ; ponts-levis à 86° quand il passe. Pilote passif (manche lâché après le départ) :
aucun anneau, il finit dans le Pic. Sondes hors test : le Colibri (~59 s + deux anneaux manqués, l'argent) et l'avion de tourisme
(~64 s + un anneau manqué) bouclent aussi — l'avion de voltige est l'avion de la course. Une 2e course la même vague ne paie pas ;
pénalité +4 s (2 s avec la combinaison), bonus de voltige plafonné à 6 s ; abandon en descendant, à la mort ; `startRun` remet tout à
zéro.

**Mesures** (machine sans carte graphique : proportions seulement) : au col, l'anneau de départ, sa bannière et ses mâts : +5 appels
de rendu en vue immersive (1 245 contre 1 240), +1 en vue de dessus ; au canal : 0. Pendant la course, deux anneaux de plus (deux
appels chacun : les douze quartiers fusionnés).

Captures : `captures/retours_20/10_depart.png` (le départ au col), `10_porte.png` (la porte des mesas), `10_large.png`,
`10_levis.png` et `10_levis_hud.png` (au ras de l'eau du grand canal, entre les volées levées), `10_tours.png` (le virage vers
l'avenue des tours).

