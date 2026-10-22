# Liste de retours de playtest du 22 octobre — suivi

Branche `retours-22oct` (partie de `retours-20-octobre`, non fusionnée : la liste s'appuie sur ce qu'elle a construit). Brief :
`rapport_nuit/PROMPT_LISTE_22OCT.md`. Captures : `rapport_nuit/captures/liste_22oct/` (`avant_*` = la version d'avant la liste,
commit `c3f80b4`). Un commit par point qui marche.

Ordre suivi : 1, 17, 4, 3, 2, 5, puis le reste.

| # | Point | État |
|---|---|---|
| 1 | Cabrage des motos : un jeu d'équilibre, plus de « trop cabré » | ☑ |
| 2 | Tous les véhicules du quartier des canaux jouables | ☑ |
| 3 | Véhicules exposés (derby, REYES MOTORS) volables | ☑ |
| 4 | Les sons propres | ☑ |
| 5 | Cockpit du taxi : plus d'air sous le toit | ☑ |
| 6 | Les publics de décor fuient et se visent | ☑ |
| 7 | La statue de la Liberté plus grande | ☑ |
| 8 | Habits et tatouages réalistes | ☑ |
| 9 | Plus d'améliorations au chantier naval | ☑ |
| 10 | Le paquebot qui se brise, plus impressionnant | ☐ |
| 11 | Explosions, camion-citerne, pompes à essence | ☑ |
| 12 | Sortir ses véhicules depuis la villa | ☑ |
| 13 | Plongeons : l'entrée dans l'eau compte | ☑ |
| 14 | Le plongeon de falaise épique, l'eau en bas | ☑ |
| 15 | La tour de contrôle, un vrai jeu d'aiguilleur | ☐ |
| 16 | Course de supercross et sa tenue | ☐ |
| 17 | Les ponts : décoller en voiture, passer dessous en avion | ☑ |

## Décisions prises seul

- **Branche** : `retours-22oct` part de `retours-20-octobre` (et non de `main`) : les points de la liste portent sur ce que les deux
  chantiers précédents ont construit (canaux V3, paquebot, Cliff Diving, cabrage en équilibre…).

## 8 — Les habits et les tatouages, plus réalistes (fait)

**Avant** : une pièce = une couleur unie sur les boîtes du corps (la chemise hawaïenne : un orange uni) ; les tatouages, des petites
boîtes d'encre (une barre pour la larme, quatre bâtons pour le tribal, trois anneaux autour des bras).

**Fait** (`DESSINS_HABIT`, `texHabit`, `matsHabit`, `MANCHES_NUES` ; `DESSINS_TATOUAGE`, `tatouageDessine`) :
- **Un dessin par pièce**, peint face par face (devant, dos, côtés, dessus, manches ; jambes : devant, dos, côtés) sur une toile de
  128 px avec le grain du tissu : chemise blanche (col, boutonnière, poche), costumes (revers, chemise et cravate, pochette, boutons de
  manche ; fines rayures pour le trader), **chemise hawaïenne** (hibiscus et feuilles de palmier sur le fond, col ouvert, manches
  courtes), débardeur côtelé (bras nus, emmanchures), sweat à capuche (poche kangourou, cordons, capuche au dos), maillot de basket
  (« REYES 23 », le numéro au dos, bras nus), **jean** (sergé, délavé, coutures orange, poches, ourlet), jogging (bandes), chino
  (pli, poches), pantalon de costume (pli), shorts (la peau dessous ; boardshort à fleurs).
- **Chaque tenue** de la penderie (33, `MOTIFS_TENUES`) : carreaux du trappeur, chemise western du cow-boy (empiècement, pressions
  nacrées), camouflage et poches du treillis, cuir du « Badlands » (perfecto, fermeture en biais, lustre), blouson d'aviateur (col de
  fourrure), combinaisons de course (bandes, écussons « REYES », « NITRO »), maillot de motocross (73), gilet haute visibilité « ATC »,
  uniforme de gardien (écusson, épaulettes), capitaine (double rangée de boutons dorés, galons), paillettes de la tenue dorée,
  plumes du costume de pigeon, chevrons du « Faucon », néoprène, bleu de travail taché de cambouis, blouse du Site 51 (stylos)…
- **Tatouages** : de vrais dessins à l'encre sur une toile transparente, avec un léger fondu (larme, tribal sur la joue, étoiles
  nautiques sur la tempe, manchettes tribales) ; trois de plus chez Encre Noire — **rose** (avant-bras gauche), **dragon** (bras droit),
  **ancre et lettrage « LOS REYES »**. Sur la face : un plan posé devant la tête ; sur le bras : un manchon de l'avant-bras.
- **Partout** : le joueur (`construireJoueur` → `coifCouleurs`, qui passe le dessin de la tenue puis celui des pièces), la cabine
  d'essayage, l'aperçu de la penderie, les mannequins des vitrines et de la boutique.

**Ville inchangée** : `mat()` reste appelé comme avant dans `makeHumain` (ses tirages), textures et matériaux sous un générateur privé,
jamais un matériau de `mat()` modifié ; l'ancien dessin des tatouages est construit (ses tirages) puis masqué ; les tatouages ajoutés
(`tardif`) ne changent pas les mannequins de la boutique. Vérifié : empreinte du décor, portes, chalet, mobilier, tirage principal et
séquence `startRun` → salles → `startRun` identiques.

**Décision** : sur un corps fait de boîtes, le détail passe par la texture (pas de nouvelle géométrie) ; un short ou une manche courte
peignent la peau sur la toile (la couleur de peau entre dans la clé du cache).

**Test** « Liste du 22 octobre, point 8 » (pièces lues dans `VETEMENTS`, `TENUES`, `DESSINS_*`) : chaque haut, bas, tenue et tatouage a
son dessin ; porté par le joueur, chaque face a sa toile (des dizaines de couleurs : 72 sur le devant de la chemise hawaïenne) et
aucun matériau de `mat()` ; le débardeur et le maillot montrent les bras ; le short montre la peau ; chaque tatouage est un dessin à
l'encre et l'ancien aplat ne se voit plus ; la cabine (maillot essayé : le numéro au dos), la penderie (le treillis) et les mannequins
portent les dessins. « Boutiques de style » adapté (la couleur portée se lit dans `userData.coul`) ; « Tenues des mini-jeux »,
« Retours du 20 octobre, lot 3 », « Habillage V2 des salles » repassent.

**Captures** (rendus réels, avant : `avant_08_*.png`) : `08_habits_face.png`, `08_habits_dos.png`, `08_habits_bas.png`,
`08_tenues_1.png` à `08_tenues_3.png`, `08_tatouages_visage.png`, `08_tatouages_bras.png`.

**Reste** : sur iPhone, regarder la lisibilité à la distance de jeu (vue de dessus : le personnage est petit, les détails fins — boutons,
coutures — se fondent ; les motifs francs — fleurs, carreaux, numéros, camouflage — se lisent).
## 9 — Plus d'améliorations au chantier naval (fait)

**Avant** : au chantier « Marée Basse », la mécanique (moteur, hélice, coque, blindage, nitro) et neuf catégories de style — aucune
pièce de style n'agissait, et le jet-ski n'avait rien de propre.

**Fait** : quatre catégories nouvelles, dont trois qui **agissent** (clés fixes `trim`, `defenses`, `gerbe`, `arriere` dans `slotGarageDefaut` ; prix dans
`TUNING_PRIX.bateaux.pieces`) :

| Catégorie | Bateaux | Variantes et effet |
|---|---|---|
| FLAPS DE TRIM (`PN_TRIM`) | open, course, bois, yachts | flaps (vitesse +6 %), trim hydraulique à vérins (vitesse +9 %, reprise +12 %) — 900 / 1 600 $ |
| SPONSONS (`PN_SPONSONS`) | jet-skis | sponsons de virage (virage +12 %), sponsons + plaque de course (virage +12 %, vitesse +6 %) |
| DÉFENSES DE COQUE (`PN_DEFENSES`) | tous | pare-battages (chocs de quai −45 %), boudin de coque (−65 %) — 450 / 800 $ |
| GERBE ARRIÈRE (`PN_GERBE`) | jet-skis, offshore | tuyère (gerbe d'eau derrière, au-delà de 10 u/s), tuyère haute à LED (grande gerbe, vitesse +3 %) — 600 / 1 000 $ |
| ARRIÈRE (`PN_ARRIERE`, style seul) | open, course, bois, yachts | échelle de bain, porte-kayak (400 / 650 $) ; le **toboggan** du pont supérieur à la mer sur les yachts (1 500 $) |

Une variante porte ses effets (`eff` : multiplicateurs de vitesse, reprise, virage ; `quai` ; `gerbe`), lus par `appliquerTuning`
(`varianteNaut`) sur la copie propre de la définition — `VEHDEFS` jamais modifié. Le choc de quai lit `v.quaiK` ; la gerbe :
`majGerbeNaut` (cosmétique, sur `dt`). Le menu dit ce que fait chaque pièce (« Trim hydraulique (vitesse +9 %, reprise +12 %) »).
Aperçu gratuit, payée une fois, reposée gratuitement : le mécanisme des autres pièces.

**Décision** : pas de nouveau palier mécanique (moteur, hélice… ont déjà trois paliers) — des pièces qui agissent, que l'on voit sur le
ber, plutôt qu'un chiffre de plus ; des effets modestes (au plus +9 % de vitesse) pour ne pas déséquilibrer les courses en mer.

**Test** « Liste du 22 octobre, point 9 » (catégories lues dans `PIECES_NAUT`) : chaque bateau du chantier a au moins deux pièces qui
agissent (28 en tout), clés fixes et prix ; au chantier en jet-ski, l'aperçu ne débite rien, le menu montre les catégories et leurs
effets, chaque achat au prix, le trim payé une fois ; ressorti, la vitesse et le virage attendus, les défenses et la gerbe posées, une
gerbe derrière le jet-ski lancé et aucune à l'arrêt ; un choc de quai fait 6 PV au lieu de 18 avec le boudin ; un offshore sans pièces
ne change pas ; les pièces survivent au rechargement. « Canaux V3 : chantier naval » (chaque variante se pose sur chaque modèle :
397 pièces) et « … survivent au rechargement » repassent.

**Captures** (sur le ber, menu ouvert) : `09_yacht_toboggan.png` (le Riviera 43 : toboggan, boudin, trim), `09_open_kayak.png` (la
vedette : porte-kayak, pare-battages, trim), `09_jetski_arriere.png` (sponsons, boudin, tuyère), `09_vedette.png` et `09_jetski.png`
vus de l'avant ; avant : `avant_09_*.png`.
## 6 — Les publics de décor fuient et se visent (fait)

**Relevé** (« la disco en extérieur, le diving… ») — les publics du décor et leur état avant :

| Public | Fait de | Avant |
|---|---|---|
| Le Lagon (la « disco en extérieur » : la piste du DJ, le bar, la plage) | 49 personnes instanciées (quatre `InstancedMesh`) + 17 figurants | les 49 : panique au tir, **jamais visées** |
| Tribune de l'arène de derby | 175 personnes instanciées | **jamais visées** |
| Public de Reyes Cliff Diving | 28 personnes dans UNE géométrie fusionnée | **jamais visées** |
| Public du Skatepark XXL | 28 vrais corps (`makeHumain`) | **ni visés ni percutés** (pas des figurants) |
| Danseurs de la fête du DJ des toits, supporters du stade, aéroport, colline, mont, canaux | figurants | déjà visables (inchangé) |

**Fait** (`FOULES` : `foulesMembres`, `fouleCacher`, `fouleVersPieton`, `fouleFuite`, `toucherFoule`, `foulesStartRun`) : une balle du
joueur sur un spectateur d'une foule instanciée ou fusionnée — il disparaît de la foule (instance à l'échelle nulle, ou sommets
repliés dans la géométrie fusionnée : la plage de chacun est notée à la construction, aucun tirage), un vrai piéton prend sa place et
tombe, touché ; ses voisins (4 au plus, dans 6 u) deviennent de vrais piétons qui fuient ; au Lagon, la panique de la foule se
déclenche aussi ; une explosion du joueur près d'une foule fait fuir les plus proches. Le public du Skatepark XXL devient des
figurants (`figurant()` ; son animation saute un figurant converti) : visé ou percuté, il devient un vrai piéton, comme ceux de
l'aéroport. Tout revient à la partie suivante.

**Décision** : on ne convertit pas toute une foule d'un coup (175 corps à la tribune : trop lourd sur iPhone) — le touché et ses
voisins seulement ; les autres restent du décor (au Lagon, ils paniquent).

**Test** « Liste du 22 octobre, point 6 » (foules lues dans `foulesMembres`) : pour le Lagon, la tribune et le public de Cliff
Diving, une balle touche un spectateur, un piéton touché le remplace, 3 ou 4 voisins fuient (et s'éloignent), le spectateur quitte la
géométrie fusionnée, tout revient à la partie suivante ; le public du Skatepark XXL est figurant et réagit à une balle ; une grenade
près de la tribune fait fuir 6 spectateurs.

**Capture** : `06_tribune.png` (la tribune du derby, une seconde après une balle : les places vidées).

## 11 — Explosions, camion-citerne, pompes à essence (fait)

**Constat** :
- Une explosion : des particules et un anneau ; la même secousse d'écran (13) qu'elle soit à 3 u ou à 300 u.
- Le camion-citerne (200 PV) : une grenade ou une roquette lui ôtait 95 PV — il n'explosait pas ; en feu (sous 32 %), il brûlait 6 à 9 s ;
  et une voiture qui sautait à côté ne lui faisait rien (l'explosion d'un véhicule n'abîmait AUCUN véhicule voisin).
- **Aucune station-service n'existe dans le jeu** : le seul carburant était deux pompes « CARBURANT » de décor sur le quai de la marina.

**Fait** :
- **Explosions** (`EXPL`, `explCreer`, `explFx`, `majExplo`, `viderExplo` ; `explosionFx(x, z, y, k)`) : par-dessus les particules d'avant,
  un éclair (sprite additif), une boule de feu qui gonfle, monte et s'assombrit, des débris qui retombent et rebondissent au sol, une
  colonne de fumée plus haute, une trace de brûlé qui s'efface en 25 s ; une taille `k` (citerne 2,2, pompe 1,35). Réserves fixes
  (4 éclairs, 6 boules, 36 débris, 8 brûlés) créées à la première explosion sur un générateur privé : aucune allocation, aucun tirage.
  **Secousse selon la distance** (pleine à côté, ~6 % à 70 u et au-delà).
- **Le souffle d'un véhicule qui saute** abîme désormais les véhicules à 6 u (60 PV) — et allume les pompes à 6 u.
- **La citerne à coup sûr** : sous 60 % de ses PV, ou au premier coup de 60 ou plus (souffle), elle prend feu (sifflement) et saute
  en 1,5 à 2,5 s ; sa boule de feu est géante, elle touche les véhicules à 12 u et fait sauter les pompes à 14 u.
- **Les pompes** (`POMPES`, `mkStationsEssence`, `pompesMarina`, `toucherPompe`, `pompeAllumer`, `pompeExploser`, `pompesSouffle`,
  `majPompes`, `pompesStartRun`) : une station « REYES FUEL » construite à l'entrée de l'aéroport (terrain libre et plat à l'est du mur,
  relevé par un balayage ; dalle, auvent à néons, quatre pompes sur leurs îlots, boutique, totem tourné vers la route ; en fin de décor,
  générateur privé) ; les deux pompes de la marina deviennent explosives (une carcasse calcinée les recouvre). Une pompe prend feu
  sous les balles (24 PV), au souffle d'une explosion ou d'un véhicule qui saute à côté, puis saute 0,45 s plus tard et allume ses
  voisines dans 9 u : la **réaction en chaîne** ; elle abîme les véhicules (90 PV dans 8 u), les gens, le joueur proche ; brûlée, elle
  fume. **Tout revient à la partie suivante.**

**Empreinte** : tirages identiques (ville, décor, partie suivante) ; un enfant de scène de plus (la station).

**Test** « Liste du 22 octobre, point 11 » : une explosion montre éclair, boule de feu, débris (retombés au sol) et brûlé ; la
secousse vaut 12,3 à 4 u, 0,8 à 200 u ; la citerne saute sous une grenade (2,3 s), sous les balles (1,8 s), au souffle d'une voiture
qui saute à 4 u (2,0 s), et touche une voiture à 9 u ; trois balles sur une pompe de la station : les quatre sautent en chaîne en
1,1 s, la voiture garée devant est touchée, carcasses en place ; les pompes de la marina sautent ; tout revient à la partie suivante.

**Coût** (machine sans carte graphique, tick + rendu, moyenne de 60 images après l'explosion d'une citerne au centre ; avant → après) :
base 101 → 104 ms, après l'explosion 64 → 60 ms — aucune différence au-delà du bruit de mesure (les réserves sont fixes, une boule
de feu est un maillage de 80 triangles). **À juger sur iPhone** : l'éclair additif plein écran de près.

**Captures** : `avant_11_citerne.png` / `11_citerne.png` (0,25 s après l'explosion d'une citerne).

## 14 — Le plongeon de falaise épique, la vraie mer en bas (fait)

**Trouvé** : le « diving » est Reyes Cliff Diving (lot 7 du 20 octobre), à la crique des plongeurs. L'eau au pied des falaises était un
plan à part (turquoise, son propre shader, 2 cm plus haut), posé au bout de la mer : une autre couleur, et une ligne d'écume du
rivage en travers de l'entrée de la baie (la mer y dessinait son ressac, z = 286).

**Fait** :
- **La vraie mer** (`criqueVraieMer`, en fin de décor sur le générateur privé de `mkMerV3`) : l'ancien plan est caché ; à sa place, le
  shader de la mer lui-même (une copie de son matériau, `CRIQUE.merMat`, où la distance au rivage est prise en valeur absolue : en deçà
  de la ligne de rivage, le shader croyait être sur la plage — de l'écume partout, une eau presque blanche). Couleur continue au raccord
  (le plan déborde de 0,6 u sur la mer : pas de liseré), même niveau, la baie s'assombrit vers le fond comme la mer vers le large ;
  l'entrée de la baie prend le 6e emplacement de `LITTORAL_COUPES` (pas de ressac en travers), les canaux en gardent cinq (ils en
  utilisent trois). Une vedette venue du large entre dans la baie (mesuré : jusqu'à z = 272 ; la baie va de 266 à 286).
- **Le plongeon épique** (`CLIFF_RALENTI*`, `cliffVent`, `cameraCliff`) : **ralenti** (×0,32) les 0,45 premières secondes du vol et
  sous 3,2 u — de la tour de 27 m, le vol dure 3,75 s (2,35 s en chute libre) ; la rotation suit le même temps, rien ne change pour la
  note ; **caméra** en trois plans — derrière le plongeur au décollage (le vide sous lui, champ ouvert), la retransmission depuis la mer
  pendant la chute (le champ se resserre à mesure qu'il descend), au ras de l'eau pour l'entrée ; **vent** (bruit filtré qui forcit et
  monte en fréquence avec la vitesse, coupé à l'entrée et à l'arrêt) ; la **foule** retient son souffle au décollage et ovationne plus
  longtemps de haut ; **gerbe** à l'échelle de la hauteur ; **hauteur et vitesse** à l'écran pendant la chute (« ▼ 12 m · 54 km/h ·
  RALENTI ») ; **record par plongeon** (`META.defis.falaiseSaut`, clé fixe ; « RECORD ! » sous les notes).

**Empreinte** : tirages identiques ; un enfant de scène de plus (le plan de mer de la baie).

**Test** « Liste du 22 octobre, point 14 » : la baie (lancer de rayon depuis le ciel) montre le shader de la mer, au niveau de la mer,
l'ancienne eau cachée ; une vedette entre dans la baie au joystick ; un plongeon de la tour par un pilote qui anticipe (il lâche quand
l'angle plus la lente rotation qui reste le mènent à la verticale) : vol plus long que la chute libre, les trois plans de caméra, vent
qui forcit puis se tait, hauteur et vitesse affichées, entrée propre (Salto et demi, 142,5 points), ovation, record noté. Le lot 7
(pilote, maladroit, passif) et la crique repassent.

**Captures** : `avant_14_baie.png` / `14_baie.png` (la baie vue de dessus), `14_depart_tour.png` (le plan derrière le plongeur),
`14_entree_ras.png` (au ras de l'eau, ralenti).

## 13 — Plongeons : l'entrée dans l'eau compte (fait)

**Avant** : en chute au-dessus de l'eau, le corps tournait tout seul (un salto automatique à 6,5 rad/s) et toute entrée dans l'eau
rapportait le même bonus selon la hauteur, jamais un dégât (`plongeonJoueur`).

**Fait** (`plongeeActive`, `plongeeCorps`, `plongeeVerticalite`, `PLG_LIBRE_*`, `PLONGEON_PROTEGE`, `plongeonJoueur`) — pour les plongeons
libres en ville (crique, mer, bassins, toits au bord de l'eau) ; les concours de la villa et de Reyes Cliff Diving gardent leur système :
- **On tient son corps** : au-dessus de l'eau, en chute de plus de 5 u, ESQUIVE tenu groupe le corps et le fait tourner (7 rad/s),
  lâché il se tend et la rotation s'arrête en une fraction de seconde. Sans rien toucher, on entre droit, pieds en premier. ESQUIVE ne
  fait plus d'esquive pendant cette chute. Une aide s'affiche au premier plongeon de la partie.
- **L'entrée** : l'angle du corps dit la verticalité. Droit (pieds ou tête la première) = plongeon propre, peu d'éclaboussures,
  points × 1,5 tête la première et × (1 + 0,5 par demi-tour) ; à moitié = « BOF… », la moitié des points ; **à plat = GROS PLAT** —
  une grosse gerbe, un claquement (bruit filtré et coup sourd), « 💥 GROS PLAT ! », « AÏE ! », secousse, vibration, aucun point, des
  dégâts ((hauteur − 4) × 2,4, entre 6 et 60), **jamais mortels sous 30 u** (`PLONGEON_PROTEGE` : on garde au moins 1 PV) ; au-dessus,
  ils peuvent l'être.

**Test** « Liste du 22 octobre, point 13 » (vraie boucle, vrai bouton ESQUIVE, sauts de 12, 20 et 40 u au-dessus de la mer) : le
plongeur qui tient ESQUIVE et lâche avant la tête en bas entre tête la première, points, aucun dégât (12 u : +324, 20 u : +540,
40 u : +1 080) ; le passif entre droit (+144, +240, +480) ; le maladroit qui lâche à plat fait un GROS PLAT (−19, −38, −60 PV, aucun
point) ; à 1 PV sous 30 u, il survit ; ESQUIVE ne déclenche pas d'esquive en l'air. « Crique des plongeurs » (17 u, pas dans le vide)
repasse.

**Captures** : `avant_13_gros_plat.png` (le même saut avant : salto automatique, bonus) / `13_gros_plat.png` (gerbe, message).

**À essayer sur iPhone** : le dosage (tenir ESQUIVE environ 0,3 s pour un demi-tour sur un saut de 17 u).

## 12 — Sortir ses véhicules depuis la villa (fait)

**Avant** : le garage de la villa ne sortait que les véhicules RANGÉS (pas ceux restés en ville), un par un, en faisant défiler au
tapis SUIVANT ; le bouton ne disait que « SORTIR CITADINE (1/2) » ; ni les bateaux ni les hélicos du manoir n'y apparaissaient.

**Fait** (`GVILLA`, `ouvrirGarageVilla`, `lignesGarageVilla`, `renderGarageVilla`, `actionGarageVilla`, `majGarageVilla`, juste avant
l'éligibilité du garage) : la zone GARAGE (« 🚗 MES VÉHICULES — SORTIR … ») ouvre un panneau dans le style de l'héliport, une ligne
par véhicule de « Mes véhicules » (lue dans `META.vehPerso`) : son nom, son état — rangé, **en ville (ramené à la sortie)**, bateau
(« se sort au chantier naval Marée Basse », grisé : la villa est sur la colline), au volant —, sa vitesse et ce qu'on y a investi, et
SORTIR ; puis les hélicos du manoir possédés (`HELIS_MANOIR`) : « POSER SUR L'HÉLIPORT » (comme la console de l'héliport, `poserHeliManoir`).
Un véhicule resté en ville est retiré de la ville (`garageRetirerVehicule`, ses PV gardés) et livré devant la villa avec sa fiche :
jamais deux exemplaires. Le tapis SUIVANT reste (il change le véhicule proposé par le bouton). Le panneau se ferme en s'éloignant, en
sortant, à la mort et à chaque partie ; `actionGarageVilla` porte sa propre garde (dans la villa, panneau ouvert, ligne encore valable).

**Test** « Liste du 22 octobre, point 12 » : quatre fiches (rangée, en ville, bateau, rangée avec investissement) et les hélicos
possédés → autant de lignes affichées ; le bateau refuse de sortir ; la voiture en ville est ramenée (une seule instance, devant la
porte) ; une berline rangée sort avec sa fiche ; l'Écureuil se pose sur l'héliport ; le panneau se ferme loin du garage. Le test du
lot 1 du 18 octobre passe désormais par la liste.

**Captures** : `avant_12_garage_villa.png` (le bouton seul) / `12_garage_villa.png` (la liste).

## 7 — La statue de la Liberté, deux fois plus grande (fait)

**Trouvée** : la « statue de la Liberté » vue en jeu est la statue de bronze des places garnies (`MOB_CAT.statue` : socle de pierre,
figure de bronze au bras levé qui tient un flambeau doré), posée par `mkPlacesGarnies` dans les ensembles « statue » (centre, place,
quartier néon) : 11 exemplaires avec la graine par défaut.

**Fait** : `MOB_CAT.statue.ech = 2`. Les pièces sont posées à l'échelle (`mobPiecesEch` : dimensions et positions × 2) — une pièce de
mobilier ne tire aucun nombre, la géométrie fusionnée de la zone garde le même nombre de sommets. Le **solide** (le socle) garde sa
taille pendant la génération (les placements qui suivent dans le mobilier et le décor lisent `solidAt` : le grossir là changerait
leurs décisions) et grandit une seule fois, au premier `startRun` (`statuesAgrandir`, liste `STATUES`) : emprise 1,6 → 3,2 u, hauteur
3,8 → 7,6 u ; une statue repliée par les canaux est sautée. La statue fait 8,6 u de haut (4,3 avant). Les jardinières et les bancs de
l'ensemble (à 3,1 et 3,8 u du centre) restent dégagés du socle (1,75 u de demi-côté).

**Vérifié** : empreinte des tirages identique (décor, portes, chalet, mobilier) ; aucun socle agrandi sur la chaussée, dans l'eau ni
sur un autre solide (test) ; une partie suivante ne le regrandit pas.

**Test** « Liste du 22 octobre, point 7 » (statues lues dans `STATUES`) : hauteur de la géométrie ≥ 1,9 × l'original, solide ×2 après
le premier `startRun`, ni chaussée, ni eau, ni chevauchement, pas de second agrandissement.

**Captures** : `avant_07_statue.png` / `07_statue.png` (même place, même point de vue, vue immersive).

## 5 — Le cockpit du taxi : plus d'air sous le toit (fait)

**Cause** : le gabarit des berlines V3 (`berlineClassiqueV3` : taxi et Interceptor) avait un toit bas (1,36 et 1,38 u au-dessus du
sol) et un pavillon épais qui descendait 8 cm sous son bord : l'œil, gardé 20 cm sous le toit mesuré (`CK_GARDE_TOIT`, réglage du 19
octobre), voyait le dessous du pavillon couvrir 29 % du haut de l'écran (mesuré).

**Fait** : le toit des deux berlines est relevé (taxi 1,36 → 1,51, Interceptor 1,38 → 1,50 : une vraie berline de patrouille de
l'époque fait ~1,45 m) ; le pavillon est aminci (son bord bas ne descend plus que jusqu'au haut des vitres, `o.toit − 0,045`). Ce qui
est posé sur le toit suit `o.toit` (lanterne TAXI, rampe de gyrophares) ; l'ancrage « toit » des pièces du garage du taxi (écrit en
dur, `VEH_V3.taxi.ancrages`) est relevé d'autant. `cockpitDims`, `ckToit` et `CK_GARDE_TOIT` sont inchangés : la règle reste juste,
c'était le modèle qui était trop bas — et les autres voitures ne bougent pas.

**Mesure** (test, vraie boucle, vue 1re personne, un rayon par ligne de l'écran sur l'axe, contre le modèle et le cockpit, vitres et
ombres-sprites exclues) — part du haut de l'écran couverte par le pavillon : taxi 29 % → **19 %**, Interceptor 29 % → **19 %** ;
pour comparaison, berline 22 %, Baronne 26 % (inchangées).

**Test** « Liste du 22 octobre, point 5 » : taxi et Interceptor ≤ 20 %, un pavillon existe toujours (≥ 3 %), diagnostic du cockpit
valide ; « Cockpits », « Cockpits V2 », « Véhicules V3 », « Véhicules V4 : niveau de détail » et les pièces du garage repassent.

**Captures** : `avant_05_cockpit_taxi.png` / `05_cockpit_taxi.png`, `avant_05_cockpit_police.png` / `05_cockpit_police.png`.

**À regarder sur iPhone** : la silhouette extérieure du taxi et de la police (toit un peu plus haut).

## 2 — Tous les véhicules du quartier des canaux se prennent (fait)

**Relevé** (lu aux sources, refait par le test à chaque passage) — ce qu'on voit rouler ou flotter dans le quartier :

| Quoi | Combien | Avant | Désormais |
|---|---|---|---|
| Voitures au fond des allées des villas (`voitureDecorV2`) | 41 | quelques boîtes dans la géométrie de la rangée, un solide | **promues** à l'approche (VDEC) |
| Voitures de luxe des deux villas de la Brigada | 2 | vrais véhicules | inchangé |
| Bateaux amarrés aux pontons des villas et à la marina | 36 postes | instances de leur vrai modèle, promus à 12 u (PROMO, V3) | inchangé |
| Bateaux pilotables des pontons, jet-skis, vedette de l'embarcadère, location | — | vrais véhicules | inchangé |
| Bateau bâché de la V1 (`C.amarres` sans `v2`) | 1 | modèle aplati dans le maillage du nautique | **promu** à l'approche |
| Bateaux du décor qui circulent (`CVIE.bateaux` : un open, un jet-ski) | 2 | maillages animés | **promus** à l'approche (là où ils sont) |
| Bateaux de l'IA (Lagon, yachts, police maritime) | — | vrais véhicules (on les aborde) | inchangé |
| Bateau en carénage sur son ber, bateau dans les sangles du travel-lift | 2 | décor | **restent du décor** (décision ci-dessous) |

**Fait** (module `VDEC`, juste avant `promoStartRun`) : le registre `VDEC.liste` (refait à chaque partie par `vdecPreparer`, depuis
`l.voitDecor`, `C.amarres[].dec`, `CVIE.bateaux`) ; à 8 u du joueur (à pied, à la nage ou au volant), le plus proche devient un vrai
véhicule à sa place, trois au plus en même temps (`majVDec`, quatre fois par seconde) : la voiture d'allée prend un vrai modèle
(citadine, berline, pick-up, cabriolet ; Baronne, SUV de luxe ou cabriolet pour un grand lot, tiré par la position) à SA couleur, ses
sommets dans la rangée sont repliés sous le sol et son solide retiré ; le bateau bâché devient son modèle (et son mur d'amarre
s'ouvre) ; un bateau qui circule s'arrête là où il est (le pilote du jet-ski disparaît dans une gerbe d'eau : il a plongé). Laissé à son poste et loin (30 u), il
redevient du décor ; emmené ailleurs, il reste un vrai véhicule et son poste est vide jusqu'à la partie suivante (`vdecStartRun`,
appelé par `canauxStartRun`, sans aucun tirage) ; un bateau qui circulait reprend sa route d'où on l'a laissé s'il est resté sur son
trajet. Pendant la génération, rien n'est créé : les données sont notées (la plage de sommets, le solide), mêmes tirages ; le bateau
du travel-lift est passé dans son propre maillage (un enfant de scène de plus, l'empreinte des tirages est identique).

**Décision** : les deux bateaux du chantier de la marina (en carénage sur son ber, et dans les sangles du travel-lift) restent du
décor — ils sont en réparation, hors de l'eau ; la cale du travel-lift ne communique avec la marina que par une fente d'un mètre en
diagonale (mesuré : aucun bateau ne peut en sortir), un vrai bateau posé dedans serait prisonnier. Ils sont notés `horsEau` et le
test vérifie qu'ils le restent.

**Test** « Liste du 22 octobre, point 2 » : chaque appel des constructeurs du décor (compté pendant la génération : 41 voitures, 3
bateaux par `bateauDecorV2`) est couvert ; chaque bateau amarré a son poste PROMO ; les 44 entrées de VDEC se promeuvent à
l'approche (la voiture : sommets repliés, solide retiré) et redeviennent du décor de loin ; une voiture d'allée, le bateau bâché et un
bateau qui circule : le bouton d'action les propose, on MONTE, 10 u au joystick ; emmenés, ils restent et leur poste reste vide ; la
voiture est de retour dans son allée à la partie suivante.

**Reste / à essayer sur iPhone** : la promotion se fait à 8 u — on voit la voiture d'allée « devenir » un vrai modèle (plus détaillé)
quand on s'approche ; si c'est gênant, rapprocher `VDEC_R`.

## 3 — Les véhicules exposés se volent (fait)

**Cause** : chez REYES MOTORS (`mkConcessionHills`) et au stand du derby (`mkArenaDerby`), les voitures exposées étaient des modèles de
décor (`makeVoiture` posé dans la scène, un solide en boîte dessous) : ni dans `vehicules`, ni conduites, ni abîmées. Le showroom
était un seul solide plein : on ne pouvait pas entrer jusqu'aux deux voitures des podiums tournants (les ultimes, depuis le 18 octobre).

**Fait** (module `EXPO`, juste après `majConcession`) :
- **Le décor devient de vrais véhicules** : à la 1re partie, `expoConvertir` relève les places (deux podiums tournants dans le showroom,
  quatre sur l'esplanade, les trois voitures du stand du derby), retire les modèles et leurs solides, pose un podium rond (`PLATS`).
  À chaque partie, `expoStartRun` (fin de `startRun`, sur un générateur privé : la partie suivante tire comme avant, vérifié) crée un
  vrai véhicule par place (`creerVehicule`, sans conducteur) ; celles du derby gardent leur habillage (`habillerDerby`). Les deux du
  showroom tournent sur leur podium tant que personne n'y touche (`majExpo`).
- **Le showroom s'ouvre** : son solide plein est remplacé par ses trois murs, son toit (un solide à base : on roule dessous) et sa
  **vitrine** (`EXPO.vitreSol`), qu'un véhicule lancé (6 u/s ou plus, la vitesse de l'image d'avant : le choc l'a déjà annulée) ou un
  coup de poing brise (`expoBriserVitre` : la vitre disparaît, éclats, bruit de verre). Réparée à chaque partie.
- **Monter = voler** (`expoVol`, appelé par `entrerVehicule`) : alarme (sirène deux tons pendant 12 s, atténuée avec la distance),
  étoiles — **3 au moins pour un ultime** (`EXPO_ETOILES_ULTIME`), 2 sinon (`EXPO_ETOILES`) —, message « 🚨 ALARME ». Le véhicule
  volé (`v.voleExpo`) se conduit, s'abîme, explose comme tout autre.
- **Garage** : `vehiculeGarable` refuse une voiture volée avec un message clair (« Voiture volée chez REYES MOTORS : achète-la au
  showroom pour la garer ») ; une voiture de derby reste non garable (« Voiture de derby volée : elle ne se gare pas »). Ni « Mes
  véhicules », ni garage tuning. L'achat au comptoir (`CATALOGUE`) livre toujours une voiture neuve, comme avant.
- **Podium vide jusqu'à la partie suivante** : une place volée n'est pas regarnie ; `expoStartRun` retire ce qui reste et remet tout.
- `derbyMajExpo` (les améliorations achetées sur les voitures exposées) porte désormais sur les vrais véhicules.

**Décisions** : une voiture exposée n'est volable qu'en montant dedans (pas de « vol à distance ») ; l'alarme ne monte jamais la
recherche si on en a déjà plus ; la vitrine se brise aussi au coup de poing (on n'est pas obligé d'arriver en voiture).

**Test** « Liste du 22 octobre, point 3 » (places lues dans `EXPO`) : chaque véhicule exposé est dans `vehicules`, sans conducteur ;
une voiture de l'esplanade, un ultime (après avoir brisé la vitrine avec une voiture lancée) et une voiture du derby : on monte,
étoiles (2, 3, 2), on roule 10 u au joystick, elle s'abîme, le garage la refuse avec son message ; le podium volé reste vide puis se
remplit à la partie suivante, la vitrine est réparée ; le catalogue est intact.

**Reste / à essayer sur iPhone** : entrer dans le showroom en voiture par la vitrine (elle se brise au premier choc franc).

**Captures** : `avant_03_showroom.png` (le showroom fermé, les voitures de décor) et `03_showroom.png` (vitrine brisée par une voiture lancée, les voitures de l'esplanade sur leurs podiums ronds).

## 4 — Les sons, propres (fait)

**Audit** (avant ; mesures par rendu hors ligne, protocole du test, tableau plus bas) :
- **Clics** : chaque son partait à plein niveau dès le premier échantillon (`setValueAtTime(vol, t)`) — 65 à 100 % de la crête dans la
  1re milliseconde sur les 44 sons — et finissait par une coupure (`stop` 20 ms après une rampe qui n'atteignait pas zéro).
- **Stridence** : carrés et dents de scie nus (`beep` avait `'square'` par défaut : interface, tirs, rechargements), souffles passés
  au filtre passe-HAUT (lame, swing, manœuvres de rechargement, roquette) : jusqu'à 130 % de l'énergie au-dessus de 6 kHz (le
  passe-haut résonnant y ajoutait même de l'énergie) ; désintégrateur 67 %, choc léger 85 %.
- **Pas de son par arme** : l'Uzi, l'AA-12, le revolver, l'arbalète et le minigun empruntaient le son d'une autre arme (9 sons pour
  14 armes à feu).
- **Chocs** : un seul bruit plus ou moins fort ; un frôlement « claquait » comme un accident (choc 0,1 : crête 0,17, 85 % d'aigus).
- **Niveaux** : rien sur la sortie — le désintégrateur de l'OVNI écrêtait (crête 1,23), une explosion (0,39) était à peine plus forte
  qu'un fusil à pompe (0,40) ; tout était à plein volume quelle que soit la distance (un tir d'ennemi à 140 u comme à 5 u).
- **Toujours le même son** : aucune variation entre deux tirs ; couches enchaînées par `setTimeout` (qui tombent à côté sous charge) ;
  bruit blanc tiré sur `Math.random` à l'initialisation de l'audio.
- **Aucune limite de voix** : une rafale de minigun empilait des centaines de sources.

**Fait** (bandeau AUDIO, `busAudio`, `SON`, `beep`, `bruit`, `echoSon`, `SFX`) :
- **Bus** (`busAudio`, aussi construit par le test sur un `OfflineAudioContext`) : master → compresseur (`SON_BUS` : −20 dB, 3,5:1,
  attaque 4 ms) → limiteur (−3 dB, 20:1) → sortie ; les effets passent par un plateau qui retire 5 dB au-dessus de 5 kHz ; un bus
  d'écho (retard de 0,23 s filtré à 1,6 kHz, deux ou trois retours) pour le sniper, le revolver, la pompe, les explosions.
- **Enveloppes** : montée de 4 à 6 ms, décroissance exponentielle, puis retour à zéro en 12 ms avant l'arrêt. Le carré et la dent de
  scie passent par un passe-bas (5 × la fréquence, 700 à 4 200 Hz) ; un souffle filtré en passe-bande ou passe-haut est plafonné à 6 kHz.
- **Variations** : ± 3,5 % de hauteur par voix, ± 4 % de vitesse et un départ au hasard dans le bruit, tirés sur un générateur PRIVÉ
  (`sonAlea`) ; le bruit blanc lui-même est un xorshift (aucun `Math.random` dans l'audio).
- **Temps audio** : les couches d'un son partent décalées en temps audio (`sonApres`), plus jamais par `setTimeout`.
- **Distance** (`sonA`) : plein volume à 14 u, puis (1 − d)² jusqu'au silence à 150 u — tirs des ennemis et explosions.
- **Voix** : `SON_VOIX_MAX` = 32 sources en même temps (les sons d'interface passent toujours).
- **Catalogue refait en couches** (attaque, corps, poids, queue) : un son pour chacune des 14 armes à feu (pistolet sec, revolver
  lourd à queue, silencieux en « pff », arbalète, P.M., Uzi plus aigu, minigun grave et court, fusil, pompe grave, AA-12, sniper et son
  écho, roquette, lance-flammes, désintégrateur) ; mêlée ; manœuvres ; interface en triangles et sinus. **Chocs selon la violence** :
  la tôle (bruit grave qui s'ouvre avec la violence), sa résonance au-delà de 0,2, le pare-chocs (un coup sourd) au-delà de 0,45, le
  verre qui éclate au-delà de 0,75.

**Décision** : les crêtes « après » sont mesurées à la sortie du compresseur, qui a un gain de rattrapage — elles sont plus hautes que
les « avant » (mesurées sans bus, il n'y en avait pas) ; ce qui compte est leur hiérarchie, désormais : explosion (0,74) > armes (0,12 à
0,70) > mêlée (0,14 à 0,55) > interface (0,05 à 0,36), et rien n'écrête. **Piège trouvé** : dans un rendu hors ligne, le compresseur
de WebAudio part FERMÉ à t = 0 (il atténue tout, même sous son seuil, pendant ~0,3 s) — le test joue chaque son 0,3 s après le début ;
en jeu, le bus tourne en continu.

**Test** « Liste du 22 octobre, point 4 » : chaque son du catalogue (lu dans `SFX`, plus `SFX.choc` à quatre violences) rendu hors
ligne à travers les vrais bus ; aucun écrêtage, énergie au-dessus de 6 kHz sous 12 %, crête dans la fourchette de sa famille, moins de
45 % de la crête dans la 1re milliseconde (les anciens sons : 65 à 100 %), fin qui retombe à zéro ; un tir à 10 u à plein volume, à
100 u à ×0,14, muet à 160 u ; 80 rafales de P.M. tiennent sous 32 voix ; deux tirs de pistolet différents ; aucun `Math.random` dans
le catalogue. La version d'avant y échoue (clics sur tous les sons, aigus de la lame, du swing, des manœuvres et de la roquette,
pas de bus ni d'atténuation).

**Reste / à écouter sur iPhone** : le niveau général (le compresseur remonte les sons faibles : la musique et les ambiances des
salles passent par le même bus), la queue d'écho du sniper et des explosions, la sirène (désormais un triangle filtré). Les sons
continus (moteur, ambiances des salles et des planques, rayon de l'OVNI) n'ont pas été refaits : ils n'avaient ni clic ni stridence
mesurés (ce sont des nappes filtrées).

**Mesures** (crête après le bus, part de l'énergie au-dessus de 6 kHz, part de la crête atteinte dans la 1re milliseconde) :

| Son | Famille | Crête avant → après | Énergie > 6 kHz avant → après | 1re ms (part de la crête) avant → après |
|---|---|---|---|---|
| coup | melee | 0,159 → 0,539 | 0 % → 0 % | 65 % → 10 % |
| batte | melee | 0,201 → 0,549 | 0 % → 0 % | 65 % → 13 % |
| lame | melee | 0,332 → 0,29 | 91 % → 6 % | 99 % → 12 % |
| swing | melee | 0,158 → 0,14 | 130 % → 8 % | 82 % → 29 % |
| pistolet | armes | 0,249 → 0,702 | 1 % → 1 % | 84 % → 21 % |
| revolver | armes | (nouveau) → 0,673 | — → 0 % | — → 22 % |
| silence | armes | 0,055 → 0,166 | 0 % → 0 % | 75 % → 11 % |
| arbalete | armes | (nouveau) → 0,282 | — → 0 % | — → 14 % |
| pm | armes | 0,129 → 0,536 | 2 % → 1 % | 91 % → 13 % |
| uzi | armes | (nouveau) → 0,439 | — → 2 % | — → 27 % |
| minigun | armes | (nouveau) → 0,471 | — → 0 % | — → 14 % |
| fusil | armes | 0,242 → 0,648 | 1 % → 0 % | 76 % → 10 % |
| pompe | armes | 0,4 → 0,686 | 0 % → 0 % | 40 % → 18 % |
| aa12 | armes | (nouveau) → 0,643 | — → 0 % | — → 19 % |
| sniper | armes | 0,302 → 0,657 | 1 % → 0 % | 100 % → 18 % |
| roquette | armes | 0,679 → 0,517 | 86 % → 1 % | 88 % → 5 % |
| flamme | armes | 0,042 → 0,122 | 0 % → 0 % | 98 % → 25 % |
| desintegrateur | armes | 0,408 → 0,463 | 67 % → 1 % | 100 % → 13 % |
| desintOvni | explosions | 1,228 → 0,843 | 54 % → 0 % | 52 % → 14 % |
| recharge | divers | 0,088 → 0,283 | 6 % → 3 % | 99 % → 22 % |
| rechSort | divers | 0,289 → 0,25 | 105 % → 9 % | 98 % → 19 % |
| rechInsere | divers | 0,175 → 0,395 | 2 % → 0 % | 83 % → 28 % |
| rechCulasse | divers | 0,374 → 0,441 | 81 % → 2 % | 100 % → 11 % |
| rechDouilles | divers | 0,045 → 0,097 | 0 % → 0 % | 100 % → 11 % |
| vide | divers | 0,088 → 0,253 | 2 % → 1 % | 100 % → 10 % |
| ramasse | interface | 0,117 → 0,297 | 8 % → 0 % | 100 % → 10 % |
| headshot | interface | 0,13 → 0,286 | 9 % → 0 % | 100 % → 10 % |
| cash | interface | 0,104 → 0,267 | 11 % → 0 % | 98 % → 10 % |
| soin | interface | 0,15 → 0,374 | 0 % → 0 % | 100 % → 11 % |
| degat | divers | 0,074 → 0,372 | 0 % → 0 % | 66 % → 4 % |
| mort | divers | 0,219 → 0,475 | 4 % → 0 % | 52 % → 17 % |
| etoile | interface | 0,161 → 0,361 | 8 % → 0 % | 99 % → 10 % |
| vague | divers | 0,177 → 0,358 | 4 % → 0 % | 40 % → 14 % |
| niveau | interface | 0,154 → 0,377 | 7 % → 0 % | 95 % → 10 % |
| achat | interface | 0,133 → 0,34 | 8 % → 0 % | 100 % → 10 % |
| refus | interface | 0,146 → 0,369 | 1 % → 0 % | 100 % → 10 % |
| klaxon | divers | 0,178 → 0,42 | 4 % → 0 % | 56 % → 20 % |
| spec | divers | 0,246 → 0,452 | 2 % → 0 % | 26 % → 15 % |
| ui | interface | 0,073 → 0,182 | 4 % → 0 % | 100 % → 10 % |
| explo | explosions | 0,394 → 0,739 | 0 % → 0 % | 33 % → 18 % |
| choc0.1 | chocs | 0,166 → 0,111 | 85 % → 0 % | 100 % → 9 % |
| choc0.5 | chocs | 0,416 → 0,578 | 14 % → 0 % | 96 % → 18 % |
| choc0.9 | chocs | 0,645 → 0,602 | 12 % → 1 % | 99 % → 10 % |
| choc1.4 | chocs | 0,791 → 0,658 | 14 % → 1 % | 100 % → 15 % |

## 17 — Les ponts : on décolle quand on passe vite, on passe dessous en avion (fait)

**Retrouvé** : les ponts routiers des canaux (`CANAUX.ponts` : nordOuest vénitien, nordEst Art déco, sudOuest orange,
sudEst tropical, plageOuest plage, plageEst pierre), tous orientés en x sur les rues z = 42, 168 et 252. Dans la ville, aucun autre
pont routier ne s'y prête (passerelles piétonnes, ponts-levis à part : ils gardent leur tremplin quand on force la barrière).

**Cause** : le tablier avait un plateau de 10 u et la voiture ne quittait jamais la chaussée (sa hauteur était posée sur le profil à
chaque image) ; un aéronef voyait le DESSUS du tablier comme sol, même en dessous — il « se posait » ou s'écrasait sous le pont
contre un volume qu'on ne voit pas ; et sur l'eau des canaux il voyait le fond (−2,4) au lieu de la surface.

**Fait** :
- **L'envol est physique** (`envolPont`) : le profil du tablier (`hauteurPont`, un smoothstep) a une pente et une courbure exactes
  (`pentePont`, `courburePont`). Tant que la courbure demandée h''·vx² reste au-dessus de −26 (la gravité du saut), la caisse suit ;
  au-delà, elle décolle avec la vitesse verticale de la chaussée — puis la physique de saut existante (v.enAir, v.vy, assiette en vol).
  Au pas : rien (vitesse critique 10 à 13 u/s selon le pont, `vcritPont`). Un seul piège trouvé : au pas fixe, la voiture « se
  reposait » une image après l'envol (la chaussée monte encore) ; elle ne se pose plus en montant.
- **Trois grandes arches à l'ouest** (`ARCHES_PONTS`) : nordOuest 5 u, sudOuest 5,2 u, plageOuest 6,5 u (avant 2,7) ; derrière elles,
  la route est longue et sans eau. L'arche du pont vénitien suit la hauteur. Le pont de pierre (plageEst) garde 2,7 u (la vedette de
  police passe dessous) mais ses rampes s'allongent : la voiture de sport retombe avant l'embouchure du grand canal.
- **Réception** : jamais mortelle ni cassante sous ~34 u de chute (`v.sautPont`), distance, points (×1,5 réception propre), record
  par pont `META.sautsPonts` (clés fixes = les identifiants des ponts), « 96 m — PONT VÉNITIEN ».
- **Le trafic et l'IA** plafonnent leur vitesse à 75 % de la vitesse critique, dix mètres avant le tablier (`plafondPontIA`) : ils
  passent le dos d'âne sans décoller (le trafic ne décolle de toute façon jamais : il ne passe pas par la physique du saut).
- **Sous les ponts, en vol** : la collision suit ce qu'on voit. Le sol d'un aéronef sous un tablier est l'eau ou le quai
  (`solAero`, `poseYAero`, `estEauAero`), la surface de l'eau des canaux (plus le fond) ; sont solides : le tablier (et son
  garde-corps), les tympans des arches (pont vénitien, pont de pierre), les pieux du pont tropical (`pointDansPont`), testés sur 26
  points d'appui de l'appareil (bouts d'aile, nez, queue, dérive, train, rotor : `pointsAero`, pris sur le vrai modèle). Pilotage
  simulé, pilotage d'avant et hélicoptère. Le plancher de l'hélicoptère au-dessus de l'eau suit le niveau des canaux.
- **« SOUS LE PONT ! »** : la première fois par pont, +1 500 points et 400 $ (`META.sousPonts`, clés fixes, ponts-levis compris) ;
  ensuite +250. Thème de défis `sousPonts` (1, 2, 3 ponts différents).

**Mesures** (gabarits relevés sur les modèles, train sorti) : voltige 6,2 × 2,4 u, Colibri 10,2 × 2,8, Pélican 11,1 × 2,8, chasseur
7,1 × 3,3, Libellule 2,2 × 4,4, Écureuil 9,5 × 5 ; eau des canaux 19 u de large ; dégagement sous tablier : 2,95 u avant (aucun avion
ne passait), désormais 5,25 (vénitien, arche de 5 u à la clé), 5,45 (orange) et 6,75 (plage). Passables : nordOuest (avions légers),
sudOuest (légers et chasseur), plageOuest (légers, chasseur, hélicoptères). Impassables, et c'est ce qu'on voit : le pont tropical
(ses pieux), le pont de pierre (son pilier et ses deux petites arches), le pont Art déco (2,95 u).

**Test** « Liste du 22 octobre, point 17 » (ponts lus dans `CANAUX.ponts`) : sur les six ponts, dans les deux sens, une voiture de
sport, une moto et un 4x4 au vrai joystick décollent (sport : 1,1 à 2,7 s de vol, 48 à 123 m), se reposent sur la voie, sans dégâts ;
au pas, aucun envol ; une voiture du trafic, même en fuite (DANGER), passe sous 85 % de la vitesse critique sans décoller ; la voltige
passe sous les trois arches, le chasseur sous l'orange et la plage (pilotage simulé, le pilote de la Reyes Air Race), « SOUS LE PONT ! »
compté ; trop haut, la voltige heurte le tablier ; la Libellule passe sous la grande arche de la plage.

**Anciens tests adaptés** (ce point remplace la règle « légère bosse, jamais un saut ») : « Canaux de Los Reyes » accepte, pour
une voiture qui a décollé, un passage au-dessus du tablier ; « Canaux V2 : ponts et passerelles » compte les sauts lancés au lieu de
les refuser (au pas, aucun envol : c'est le test du point 17 qui le vérifie).

**Captures** (`rapport_nuit/captures/liste_22oct/`) : `avant_17_saut_pont.png` (la voiture de sport à pleine vitesse reste sur le
tablier du pont vénitien : 2,7 u au plus) et `17_saut_pont.png` (la même, en vol à 16 u au-dessus du canal) ; `17_avion_sous_pont.png`
(la voltige sous l'arche du pont de la plage, vue depuis le canal).

**Coût** (machine sans carte graphique, 240 images, même graine ; avant → après) : centre-ville tick 25,4 → 23,6 ms, rendu 86 → 92 ms
(bruit de mesure, aucun appel de plus) ; pont nordOuest tick 17,3 → 18,1 ms, appels 801 → 848 (+6 % : les arches et tympans) ;
voiture lancée sur le pont tick 18,7 → 18,2 ms, appels 880 → 923.

**Reste / à savoir** : la rue du front de mer (z = 252) finit, à l'est, dans l'embouchure du grand canal (x 284, sans pont, avant cette
liste déjà) : une voiture qui atterrit lancée après le pont de pierre doit freiner. Les ultimes (Bolide 62 u/s) volent plus loin que
la route sèche derrière les ponts de l'est. **À essayer sur iPhone** : le saut des grandes arches (jusqu'à 27 u de haut) et le passage
en avion à la main, au ras de l'eau (une fenêtre de 1,5 à 3 u selon l'appareil).

## 1 — Le cabrage des motos : un jeu d'équilibre (fait)

**Cause** : le cabrage (3.2 du 20 octobre) avait gardé, par-dessus son point d'équilibre, l'ancien seuil de danger
(`CABRAGE_MOTO.danger`) et son délai de grâce (`CROSS_CABRAGE_GRACE`, 0,8 s) avec le message « Trop cabré ! » puis la bascule
forcée : passé l'angle, la moto basculait à heure fixe quoi qu'on fasse.

**Fait** : tout cela est supprimé (constantes, minuterie, messages, et jusqu'aux commentaires de la source). `majCabrageMoto` intègre
une vraie dynamique de rotation autour de la roue arrière — l'angle et sa vitesse —, sur le temps réel :

  a'' = gaz·u − moteur·(1 − u) − frein·FREIN + g·sin(a − ab) − amort·a' + bosses (+ un coup de gaz sous 0,25 rad)

- **Le gaz** u : CABRER tenu, dosé par l'appui du joystick (0,7 au neutre, 1 poussé à fond). Lâché, le frein moteur repose la roue ;
  FREIN (le frein arrière) la repose vite — c'est le geste de rattrapage.
- **L'équilibre** `ab` est instable, comme une vraie moto : sous lui la gravité repose la roue, au-delà elle tire la moto vers
  l'arrière. On le tient en dosant (des appuis courts, au rythme des bosses de la route).
- **La chute** n'arrive que par la dynamique : la moto passe le point de bascule physique (`dos`, ~77°) — « Sur le dos ! ». Gaz tenu
  à fond : sur le dos en 0,8 à 1 s ; trop peu : la roue retombe.
- **Réglé hors navigateur** (banc `simcabre`) : un pilote qui réagit en 0,15 à 0,25 s tient indéfiniment au neutre ; gaz à fond,
  joystick poussé, c'est nettement plus vif (à 0,2 s de réaction, une trentaine de secondes).
- **Chrono, points, record** : « 🏍️ CABRAGE 7,2 s · 595 pts · record … » pendant le cabrage (déplacé à 44 % de la hauteur : à
  202 px, il passait sous la pile des notifications) ; à la fin, les points (`CABRAGE_PTS` : 40·t + 6·t²) et le record
  `META.acro.cabrage` (clé fixe existante).
- Gardé : la moto entière pivote sur sa roue arrière, le pilote se lève, l'œil et le regard du cockpit montent.

**Test** « Liste du 22 octobre, point 1 » (chaque moto de `VEHDEFS`) : un doseur à 0,15 s de réaction tient 25 s, chrono et points
à l'écran, ~4 600 points ; gaz à fond : sur le dos en 0,8 à 1 s ; lâché : la roue retombe sans chute ; sans appui : rien ; le frein
repose l'avant plus vite que le frein moteur ; aucun « trop cabré », délai ni seuil dans la source. Tests adaptés : « Moto cross :
cabrage », « Cabrage des motos » (la roue se lève par la dynamique : on la regarde après 0,75 s), « Retours du 20 octobre, lot 3 »
(son pilote dose sur l'angle et sa vitesse). **Piège** : un test qui tient la position de la moto doit faire avancer `v.odo`, sinon
les bosses de la route deviennent une poussée constante.

Captures : `avant_01_cabrage.png` (« Tu bascules en arrière — trop cabré trop longtemps »), `01_cabrage.png` (le chrono et les
points pendant un cabrage de 7 s).

**À essayer sur iPhone** : la difficulté réelle au doigt (des appuis courts sur CABRER) ; si c'est trop dur, augmenter `amort`.
