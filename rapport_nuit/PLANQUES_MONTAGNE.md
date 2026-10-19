# Chantier « Planques et Mont Reyes » (19 octobre)

Deux parties, dans l'ordre, un point à la fois : A) les intérieurs des planques, B) la refonte du Mont Reyes.
Chaque point est coché quand il est codé, testé (`node valider.js`, test de scénario, rendu réel) et commité.
Pour reprendre : lire ce fichier, puis la section « Intérieurs des planques » / « Mont Reyes V2 » de CLAUDE.md.

## Choix technique de la partie A : une SALLE par planque

Chaque planque a sa salle (`INTDEFS.caravane`, `INTDEFS.penthouse`…), construite à la première entrée dans sa tranche
de 400 u, avec ses ABORDS (la cour de la caravane, la terrasse du penthouse, le ponton du cabanon…). Pourquoi :
- **l'échelle** : une Airstream fait 2,4 m de large ; un intérieur praticable sur place obligerait à grossir tout le
  modèle de la ville (ou à jouer dans un couloir où la caméra ne voit rien) ; une salle peut être un peu plus grande
  dedans que dehors, comme toutes les salles du jeu ;
- **la sécurité** : ni vague, ni police, ni trafic dans une salle ; on s'y pose vraiment ;
- **l'ambiance** : lumière (`jourNuit`), brouillard, ciel et sons propres à chaque lieu, coupés à la sortie par les
  chemins déjà en place (`sortirInterieur`, `mourir`, `startRun`) ;
- **le coût** : rien n'est construit en ville (la ville ne bouge pas, aucun tirage), la salle est bâtie à la première
  visite ;
- **les outils** : zones (`marquerZone`, règle des 8 u), caméra immersive des salles, tests qui lisent `INTDEFS`.
Les portes des planques ne sont PAS dans `PORTES` (une porte de plus décalerait la ville, et toucherait balises,
carte, taxis) : on entre par la zone `pq.entree` de la planque possédée ; `porteSalle(id)` les donne aux tests.

## Partie A — intérieurs des planques

### Socle commun
- [x] Salles `INTDEFS.<planque>` (construction `construirePlanqueSalle`, enveloppe générique masquée, hors habillage V2)
- [x] Entrer par la porte de la planque possédée (ENTRER) ; achat devant inchangé ; ressortir devant la porte
- [x] Zones dedans : lit, coffre, spécificité, activité (+ extra) ; toutes à ≥ 8 u de la SORTIE
- [x] Lumière d'ambiance propre (`jourNuit`, `s.pqAmb`, `lampeNuit`), sons d'ambiance coupés par tous les chemins
- [x] Records des mini-jeux sauvegardés (`META.planquesJeux`, clés fixes) ; timers en `dtJeu`
- [x] Toits et auvents masqués quand le joueur est dessous (vue de dessus)
- [x] `porteSalle(id)` lu par les tests qui parcourent `INTDEFS`

### 1. Caravane du désert (atelier) — faite (19 octobre)
- [x] Déco : Airstream rétro (coque alu, hublots), banquette en skaï, kitchenette, radio CB, cartes routières punaisées,
      pièces de moteur, ventilateur, guirlande lumineuse, vue sur le désert (mesas, ciel du crépuscule)
- [x] Spécificité : l'établi (outils, cric) relié au véhicule garé devant — le vrai véhicule, réparation animée
- [x] Activité : TIR SUR CANETTES (muret, bouteilles, canette lancée, radio de Dusty à épargner), temps limité, score, record
- [x] Lit et coffre dedans
- [x] Ambiance : guirlande, lampe, feu de camp ; vent, grillons, radio CB, feu qui crépite
- [x] Test de scénario + captures (intérieur, cour, tir)

### 2. Penthouse de la Tour Los Reyes (saut BASE) — fait (19 octobre)
- [x] Déco : loft vitré sur trois côtés au-dessus d'une ville de lumières (rues, phares, tours, feux d'obstacle, néons),
      canapé d'angle, bar rétroéclairé, home cinéma qui passe un film, piano à queue, sculpture, tableaux, plantes, marbre
- [x] Spécificité : le plongeoir au bout de la terrasse — le vrai saut BASE du vrai toit
- [x] Activité : LONGUE-VUE sur la vraie ville depuis le toit (zoom ×1 à ×14 ; coffres, surprises, lieux jamais vus,
      voitures rares, chefs de gang repérés → marqués sur la carte jusqu'à la vague suivante ; jamais à travers un immeuble)
- [x] Lit, coffre (derrière le tableau qui pivote) ; ambiance (ville, vent, lounge, cheminée) ; test + captures

### 3. Cabanon de plage (punch) — fait (19 octobre)
- [x] Déco : plage au couchant, cabanon de bois flotté, hamac, planches de surf, coquillages, filets et flotteurs, bar
      tiki, lampions, feu de plage, ponton, reggae doux au poste
- [x] Spécificité : le bar à punch, trois doses à verser jusqu'à leur ligne (bien dosé : +45 PV et 75 s de vitesse)
- [x] Activité : PÊCHE au bout du ponton (touche, ferrer, tension, coups de tête ; sept prises ; vendre ou exposer au mur
      des trophées)
- [x] Lit (hamac), coffre de marin ; ambiance ; test + captures

### 4. Chalet retranché (armurerie) — fait (19 octobre)
- [x] Déco : rondins, cheminée qui crépite, peau d'ours, bois de cerf, conserves, carte du mont annotée, lampe à pétrole,
      fenêtres sur les sapins et la vallée ; dehors la neige qui tombe, le tas de bois, le drapeau, le bonhomme de neige
- [x] Spécificité : le râtelier s'ouvre sur les armes possédées (vrais modèles), munitions pleines et grenades
- [x] Activité : LANCER DE HACHE (dix haches, mire qui tangue, rotation à doser, « tchok » du bois, record, prime)
- [x] Lit, malle ; ambiance (vent, feu, corbeau) ; test + captures

### 5. Voilier « Belle Échappée » (disparaître) — fait (19 octobre)
- [x] Déco : mouillage turquoise, voilier à quai, carré en bois verni, couchette, table à cartes et instruments, cordages,
      hublots sur la mer, la lampe qui se balance (sa lumière tangue), le monde qui bouge avec la houle
- [x] Spécificité : à la barre, LEVER L'ANCRE — le guindeau remonte l'ancre, le voilier évite, la police perd ta trace
- [x] Activité : TABLE À CARTES — une carte par vague, taillée dans la vraie carte (plage, épave du galion, crique), la zone
      sur la minimap, CREUSER dans la vraie ville
- [x] Couchette, coffre ; ambiance (clapot, drisses, mouettes) ; test + captures

### 6. Taudis de la zone (grenades) — fait (19 octobre)
- [x] Déco : friche sous la bruine, cabane de tôles, canapé défoncé, bidons, matelas sur palettes, tags, télé cathodique qui
      grésille (ZAPPER), ampoule nue qui se balance et clignote, fût en feu, le chat errant
- [x] Spécificité : l'établi bricolé (tuyaux, mèches, bocaux, étau) : 3 grenades artisanales
- [x] Activité : SAC DE FRAPPE en rythme (deux boutons, tempo qui monte), bonus de force (+35 % de dégâts) si bon score
- [x] Matelas, cachette ; ambiance (pluie, télé, feu, gouttes) ; test + captures

### 7. Villa planque — faite (19 octobre)
- [x] Vérifié : rien de cassé (lit, coffre, garage, cabinet, trophées, tableau, penderie, piscine), la plus chère (20 000 $)
- [x] Activité ajoutée : le CONCOURS DE PLONGEON (élan, saltos, entrée à la verticale, trois juges, record, prime)

### Fin de la partie A
- [x] Aucun meuble copié d'une planque à l'autre ; sons coupés par tous les chemins ; zones à ≥ 8 u ; records en META
- [ ] CLAUDE.md (section, carte) ; suite complète

## Partie B — refonte du Mont Reyes

### Choix techniques de la partie B (avant de coder)
- **Règle des tirages** : `mkMontReyes` et `mkVieMont` sont dans le PREMIER groupe du décor ; leurs boucles décident sur la
  hauteur (`hauteurMont`) puis tirent `aD` / `aleaDecor` : changer la hauteur pendant ce groupe changerait le nombre de tirages
  et déplacerait tout le mobilier. Donc le relief de détail est une **couche** (`MONT.detail`) coupée pendant ce groupe et
  allumée par `mkMontReyesV2`, en tête du second groupe, sur un **générateur privé** (aucun tirage du décor) : ce qui suit
  (le chalet de `mkPlanquesV2`, le camp…) voit déjà le nouveau relief. L'ancienne forêt est construite puis retirée.
- **Le sol** : un nouveau maillage plus fin, `MeshLambertMaterial` dont la couleur est remplacée par un mélange de textures
  procédurales (canevas) selon l'altitude et la pente (`onBeforeCompile`, comme la mer V2 : lumière, brouillard, jour et nuit
  conservés) ; strates de la roche projetées sur la verticale ; bruit à deux échelles contre la répétition.
- **La végétation et les rochers** : `InstancedMesh` (un appel de rendu par matière), étagés par altitude.
- **Ce qui doit rester exact** : le sentier (taillé, ±5 u), la montée sèche, les paliers d'épingle, les tremplins, le sommet ;
  la couche de détail y est nulle.

### 1. Textures et rendu du terrain
- [ ] Textures procédurales (canvas) selon l'altitude et la pente : prairie, maquis et terre, roche à strates, éboulis, neige
- [ ] Transitions douces, détail de près sans motif répétitif
- [ ] Relief de détail : crêtes, ravines, petites falaises, corniches, gros rochers solides, éboulis au pied des parois

### 2. Décor et points d'intérêt
- [ ] Végétation par étage (feuillus, sapins et pins, arbustes rabougris, rien au sommet), herbes, fleurs, buissons
- [ ] Neige et névés au sommet ; brume accrochée au sommet et dans les creux
- [ ] Lieux : croix ou cairn au sommet, table d'orientation, belvédère et bancs, refuge, lac d'altitude, cascade, grotte,
      pont de singe, aire de parapente, panneaux de randonnée (ce qui n'existe pas déjà)
- [ ] Ambiance sonore : vent qui forcit avec l'altitude, cloches, rapaces, cascade

### 3. Montée réaliste
- [ ] À pied : marche et sprint ralentis selon la pente, essoufflement (endurance) en montée, descente contrôlée
- [ ] En véhicule : perte de vitesse en côte selon la puissance et le type, patinage sur terre et éboulis, poussière,
      pneus de route moins bons hors sentier
- [ ] Mouvements du terrain irréguliers (jamais à fréquence fixe), agréables

### 4. Plus jamais bloqué, plus jamais à travers le sol
- [ ] Corriger les enfoncements / passages à travers / blocages (creux, bords de falaise, rochers, jonctions sentier,
      couloir de la montée sèche, terrasse du chalet) — joueur, véhicules, PNJ
- [ ] Filet de sécurité : sous le sol ou coincé plus de 2 s → replacé au point sûr le plus proche
- [ ] Parcours de toute la montagne par un pilote simulé (à pied, moto, 4x4, voiture)

### 5. La vie sur la montagne
- [ ] Animaux : chamois, troupeau (chèvres ou vaches à cloches), sangliers en forêt, rapaces ; brouter, fuir, se
      regrouper ; visables, tête et corps
- [ ] Personnes : randonneurs, VTTistes, grimpeurs, campeurs, gardien du refuge, photographe, parapentistes (figurants)
- [ ] Motards cross gardés

### 6. Ne rien casser
- [ ] Sentier, MONTÉE SÈCHE, SUPERCROSS, PIC DU VERTIGE, courses RIDES faisables, temps de référence revérifiés
- [ ] Chalet sur pilotis, véhicules garés, faune de la forêt ; règle des tirages ; tout recalé si les hauteurs changent

### 7. Performances iPhone
- [ ] InstancedMesh (végétation, rochers, animaux), LOD / masquage au loin, textures raisonnables
- [ ] Coût mesuré avant / après

### Fin de la partie B
- [ ] Tests (sol, courses, vitesses de montée) ; rendus de près, de loin, au sommet ; CLAUDE.md ; suite complète

## Récap final
- [ ] Planque par planque, montagne, fichiers modifiés, à tester sur iPhone en priorité
