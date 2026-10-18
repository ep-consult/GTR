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
- [ ] Salles `INTDEFS.<planque>` (construction `construirePlanqueSalle`, enveloppe générique masquée, hors habillage V2)
- [ ] Entrer par la porte de la planque possédée (ENTRER) ; achat devant inchangé ; ressortir devant la porte
- [ ] Zones dedans : lit, coffre, spécificité, activité (+ extra) ; toutes à ≥ 8 u de la SORTIE
- [ ] Lumière d'ambiance propre (`jourNuit`, `s.pqAmb`, `lampeNuit`), sons d'ambiance coupés par tous les chemins
- [ ] Records des mini-jeux sauvegardés (`META.planquesJeux`, clés fixes) ; timers en `dtJeu`
- [ ] Toits et auvents masqués quand le joueur est dessous (vue de dessus)
- [ ] `porteSalle(id)` lu par les tests qui parcourent `INTDEFS`

### 1. Caravane du désert (atelier)
- [ ] Déco : Airstream rétro (coque alu, hublots), banquette en skaï, kitchenette, radio CB, cartes routières punaisées,
      pièces de moteur, ventilateur, guirlande lumineuse, vue sur le désert (mesas, ciel du crépuscule)
- [ ] Spécificité : l'établi (outils, cric) relié au véhicule garé devant — le vrai véhicule, réparation animée
- [ ] Activité : TIR SUR CANETTES (muret, bouteilles, canette lancée, radio de Joe à épargner), temps limité, score, record
- [ ] Lit et coffre dedans
- [ ] Ambiance : guirlande, lampe, feu de camp ; vent, grillons, radio CB, feu qui crépite
- [ ] Test de scénario + captures (intérieur, cour, tir)

### 2. Penthouse de la Tour Los Reyes (saut BASE)
- [ ] Déco : loft, grande baie vitrée sur la ville la nuit, canapé d'angle, bar éclairé, home cinéma, œuvres d'art,
      plantes, sol marbre
- [ ] Spécificité : accès direct au plongeoir depuis la terrasse
- [ ] Activité : LONGUE-VUE sur la ville (zoom, repérer curiosités / coffres / cibles → marqués sur la carte)
- [ ] Lit, coffre ; ambiance (néons, ville, musique douce) ; test + captures

### 3. Cabanon de plage (punch)
- [ ] Déco : bois flotté, hamac, planches de surf, coquillages, filets, bar tiki, lampions, reggae doux
- [ ] Spécificité : le bar à punch, préparation interactive (dosage / timing ; réussi = bonus meilleur)
- [ ] Activité : PÊCHE au bout du ponton (timing, raretés, prise revendue ou exposée)
- [ ] Lit, coffre ; ambiance ; test + captures

### 4. Chalet retranché (armurerie)
- [ ] Déco : rondins, cheminée qui crépite, peaux et trophées, râtelier, conserves, carte du mont annotée, lampe à
      pétrole, fenêtres sur les sapins et la vallée
- [ ] Spécificité : le râtelier ouvert comme une vraie armurerie (munitions pleines, grenades)
- [ ] Activité : LANCER DE HACHE sur une cible en bois devant le chalet (score, record, son de bois)
- [ ] Lit, coffre ; ambiance ; test + captures

### 5. Voilier « Belle Échappée » (disparaître)
- [ ] Déco : carré en bois verni, couchette, table à cartes, instruments, cordages, hublots sur la mer, lumière qui tangue
- [ ] Spécificité : la barre et le guindeau pour lever l'ancre
- [ ] Activité : TABLE À CARTES, chasse au trésor (une carte par vague, trésor caché plage / épave / crique)
- [ ] Lit, coffre ; ambiance ; test + captures

### 6. Taudis de la zone (grenades)
- [ ] Déco : canapé défoncé, bidons, matelas au sol, graffitis, télé cathodique qui grésille, ampoule nue, tôles, chat
- [ ] Spécificité : l'établi bricolé (tuyaux, mèches, bocaux) pour les grenades
- [ ] Activité : SAC DE FRAPPE (rythme, score, bonus de force temporaire)
- [ ] Lit, coffre ; ambiance ; test + captures

### 7. Villa planque
- [ ] Vérifier : rien de cassé, la plus belle et la plus chère ; ajouter une activité si elle n'en a pas

### Fin de la partie A
- [ ] Aucun meuble copié d'une planque à l'autre ; sons coupés par tous les chemins ; zones à ≥ 8 u ; records en META
- [ ] CLAUDE.md (section, carte) ; suite complète

## Partie B — refonte du Mont Reyes

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
