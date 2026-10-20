Chantier « Les Canaux de Los Reyes » : quartier de canaux, police maritime, planque villa de Miami.

Lis d'abord CLAUDE.md en entier : toutes ses règles s'appliquent (édition ciblée, français partout, un seul fichier, dtJeu pour le jeu, caseCentre pour les lieux, 8 u minimum de la SORTIE, aucun tirage de plus pendant la génération de la ville, tests qui lisent la source, rendus réels pour le visuel).
L'image conceptuelle est rapport_nuit/canaux.png. Elle donne l'intention, pas des cotes : déduis les coordonnées du code, et n'y reproduis pas les amorces de rues incohérentes.
Ne te limite pas à un plan : implémente une version jouable, vérifie-la, livre-la. Je ne serai pas là pour répondre : prends les décisions raisonnables, note-les dans le suivi et continue. Arrête-toi seulement devant une décision irréversible.

## ORGANISATION
- Branche `canaux`. Commit après chaque étape qui marche.
- Suivi : rapport_nuit/CANAUX.md, avec une liste à cocher par phase, les décisions, les mesures, les captures (rapport_nuit/captures/canaux/) et ce qui reste.
- À la fin : une section « Canaux de Los Reyes » dans CLAUDE.md, sur le modèle de « Los Reyes Hills ». Mets aussi à jour la carte du fichier et les ancres.
- Ordre strict des phases, chacune vérifiée avant la suivante. Si le temps manque, livre les phases 1 et 2 complètes et vérifiées plutôt que tout à moitié.

## PHASE 0 — RELEVÉ AVANT TOUTE MODIFICATION (à écrire dans CANAUX.md)
1. **La zone.** Le quartier « générique bleu-gris » est très probablement le quartier `port` de quartier() (couleur de carte #4c6270) : bx 9–13 × bz 6–9, plus bx 10–13 × bz 10–12. Les blocs violets au sud-ouest sont le quartier `neon` (bx 9, bz 10–12) : ils restent intacts. La plage commence à bz 13, l'aéroport et ses terrains sont à l'est. Vérifie ce relevé dans le code et sur une capture de la grande carte.
2. **Tout ce qui vit dans la zone**, lu dans la source et jamais recopié :
   - les lieux et leurs portes : Aquarium caseCentre(10,7), GARAGE DU PORT (10,9) dans GARAGES_TUNING, porte du chalutier (bx 10, sur le quai à MER+13), POIS.port et ses caches (Baronne, rampe de l'amphibie), le dock des Calaveras s'il y est ;
   - le port vivant (mkPortVivant) ;
   - les stands, le mobilier, les places garnies, VILLA_PISC, les entrepôts ;
   - le territoire des Dockside Boys (murenes) et tout ce qui lit quartier()==='port'.
3. **Les mécanismes à réutiliser** : estEau (au nord de MER, seuls le lac, la crique et les bassins sont de l'eau), PONTONS, PLATS, dansRectPlat, niveauEau, solRect/SOLS, viderZone, reserverHills/deplacerPorte (le précédent exact : un quartier refait sans décaler la ville), mkLacParc, la jetée foraine (praticable en voiture au-dessus de l'eau), noyerVehicule/majNoyade, rivePlusProche, pointApparition, spawnRingEau, CHASSE_EAU, bateauP, creerTrafic/majTrafic, les voitures garées au hasard, pointRoutePolice, construireMinimapStatique, dessinerHillsCarte, la grande roue qui s'efface quand elle cache le joueur, PLANQUES_DEF/PQ_INT/construirePlanqueSalle (les 7 planques).
4. **Le point dur, expliqué avant de coder** : une même case doit être une chaussée pour les voitures et les piétons, et de l'eau navigable dessous pour les bateaux. Attention : un rectangle de PONTONS rend sa case NON-eau pour estEau, donc un pont posé comme la jetée bloquerait les bateaux. Décris comment chaque système (bateaux, voitures, piétons, ennemis, nageurs, balles, solY, marchable, solidAt) verra le pont, les quais et l'eau.
5. **Les dimensions**, mesurées sur la physique réelle (bateauP : 6,8 × 2,5 u, maniabilité 2,0) :
   - largeur utile des canaux principaux pour que deux vedettes se croisent ;
   - largeur des bras latéraux ;
   - diamètre des bassins de fin de bras pour qu'une vedette y fasse demi-tour ;
   - tirant d'air sous les ponts.

## DÉCISIONS DÉJÀ PRISES
- Le quartier reste le port des Dockside Boys, devenu port de plaisance à canaux. L'id interne `port` et les ids de gang ne changent pas.
- **Aucun lieu n'est supprimé.**
  - Une porte dont la case reste une parcelle sèche ne bouge pas.
  - Sinon, elle est déplacée vers la parcelle sèche la plus proche du quartier, avec deplacerPorte, et reste dans REPLIS.
  - Le GARAGE DU PORT garde un accès en voiture.
  - Le chalutier garde sa porte sur le quai, hors des embouchures.
  - Les caches de POIS.port sont recalées sur la terre ferme.
- Les conteneurs et le portique du port vivant sont construits puis retirés (mêmes tirages). Le phare et le porte-conteneurs au large restent.
- **Déterminisme**, comme Los Reyes Hills : la ville est générée comme avant, la zone est réservée au tout début du décor, et le quartier est bâti à la fin du décor sur un générateur privé (avecAleaPrive/sansAleaVille). L'empreinte des portes, du décor, du chalet et du mobilier hors zone doit rester identique : vérifie-la.

## LE QUARTIER
Un quartier résidentiel de canaux inspiré des Venice Canals de Los Angeles : une enclave californienne aisée, pas Venise.

### Plan
Schéma indicatif, nord en haut. Une case = une macrocase de conception, pas une case moteur ; les routes latérales sont hors grille.

          A B C D E
      1   = = = = =
      2   ~ ~ B ~ B
      3   = # = # =
      4   B ~ P ~ ~
      5   B ~ ~ ~ B
      6   = # = # =
      7   B ~ B ~ B
    Plage S ~ S ~ S
    Mer   M M M M M

~ eau navigable · = route · # pont véhicule avec eau dessous · B parcelle bâtie · P atelier nautique « Marée Basse » · S plage · M mer.

Les éléments à créer :
- Deux canaux principaux nord-sud.
- Deux embouchures indépendantes qui traversent la plage et rejoignent la vraie mer navigable.
- Une traverse aquatique entre les deux canaux.
- Deux petits bras latéraux, plus étroits, qui finissent dans des bassins élargis avant les routes périphériques, sans passer sous elles.
- Deux rues transversales avec quatre ponts fixes. Le pont sud-ouest a un tablier orange qui évoque un futur pont-levis, sans mécanisme.
- Les routes de bordure gardées et raccordées.

Adapte au découpage réel en privilégiant la continuité des déplacements.

### Eau
- Une fonction unique (par exemple dansCanal(x,z)) branchée dans estEau. C'est elle que la future refonte de la mer réutilisera.
- Eau légère, raccord visuel avec la mer : ni reflets en temps réel ni simulation.
- Houle très atténuée dans les canaux.
- Quais maçonnés visibles, eau un peu sous le niveau des rues.
- Des marches ou échelles régulières pour ressortir de l'eau. rivePlusProche doit les trouver.
- Aucun sol invisible ni solide oublié aux anciennes rues ou aux embouchures. Toute nouvelle dalle passe par solRect.

### Bâti
- Surtout des villas basses de 1 à 2 niveaux : volumes simples, façades claires, bois, jardins, terrasses, clôtures basses.
- Quelques petites piscines, des palmiers espacés, des pontons privés, des accès en voiture cohérents.
- Quelques modèles de villas réutilisables et variés.
- Deux ou trois petits immeubles de 2 à 3 niveaux près des bordures nord et est. Jamais de tour, jamais de façade qui masque une voie d'eau.
- Des espaces ouverts : on voit les intersections, les ponts et l'entrée des bras.
- Géométries partagées ou fusionnées, peu de matériaux neufs, jamais un matériau de mat() modifié, ombres coûteuses limitées.

### Nautique et ambiance
- Bateaux de plaisance et petits bateaux de luxe amarrés hors du passage utile. Pas de grand yacht.
- Deux ou trois jet-skis pilotables (VEHDEFS.jetski existe) aux pontons privés.
- Un embarcadère public identifiable, avec au moins une vedette pilotable accessible depuis la route.
- Au moins deux points de débarquement distincts.
- Décor et véhicules pilotables nettement distincts. Réutilise les modèles V3/V4.
- L'atelier « Marée Basse » : emplacement sec, accessible par une rue et par un quai, sans porte vers un intérieur inexistant. Les Dockside Boys y traînent (figurants, via figurant()).
- Quelques villas évoquent la Krasnaya Brigada (gardes, voitures de luxe), comme dans la colline.
- Aucun nouveau système de territoire, de guerre de gangs ni de mission.

## POLICE MARITIME
Aujourd'hui, spawnRingEau et joueurEnMer exigent z > MER. Dans un canal, le jeu envoie donc des agents à pied et des voitures, et la vedette de CHASSE_EAU fonce en ligne droite : les canaux seraient une échappatoire gratuite. À faire :
1. Le joueur sur l'eau ou à la nage dans un canal compte comme en mer pour la recherche.
2. **Graphe de navigation des canaux** : nœuds sur l'axe des canaux, de la traverse, des bras, des bassins et des embouchures, reliés à la mer. Construit une fois depuis la même définition que dansCanal.
3. **Vedettes bateauP** (en réutilisant leur conduite) :
   - elles entrent par une embouchure ou apparaissent hors de vue au bout d'un canal ;
   - elles suivent le graphe jusqu'au joueur, puis l'approchent directement quand elles le voient ;
   - elles ralentissent sous les ponts et font demi-tour dans les bassins ;
   - jamais coincées : à l'arrêt trop longtemps et hors écran, elles sont recyclées, comme le filet du trafic ;
   - deux au plus dans les canaux ;
   - tirs selon les règles de la police existante.
4. **Interception à terre.** Quand le joueur navigue dans les canaux avec des étoiles, les renforts terrestres vont vers les quais et les ponts proches de lui, jamais dans l'eau. Un agent sur un pont peut tirer sur le bateau.
5. **À 4 étoiles et plus**, une vedette se poste à une embouchure, en travers sans la boucher entièrement : on peut forcer le passage en la percutant.
6. **Patrouille.** Au plus une vedette de patrouille circule parfois sans étoile et sert de témoin (temoinPolice), comme les patrouilles de « Police en ville ».
7. Rien ne change en haute mer, hors réutilisation. La recherche ne disparaît jamais quand le joueur entre dans l'eau.

## PLANQUE « VILLA MIAMI » (8e planque)
Une nouvelle planque dans le quartier des canaux, ambiance Miami années 80 revisitée. Elle suit EXACTEMENT le modèle des 7 planques existantes : PLANQUES_DEF, clé fixe dans META.planques, INTDEFS avec planque:'miami', PQ_INT.miami, construirePlanqueSalle, zones s.pqLit, s.pqCoffre, s.pqSpec, s.pqJeu, porte hors de PORTES (pq.porte, pq.entree), PQ_SONS, lumière s.pqAmb, record dans META.planquesJeux (nouvelle clé fixe), tenue débloquée dans TENUES, balise, badge H sur la carte. Le personnage : un ancien trafiquant reconverti dans le yachting, qui raconte qui vit là par la déco.

### En ville
- Une villa blanche cubique sur une parcelle au bord d'un canal principal, près d'une intersection d'eau, avec son ponton privé et sa propre rampe d'accès en voiture.
- Enseigne « À VENDRE » tant qu'elle n'est pas achetée.
- Prix à proposer, sous PRIX_VILLA (la villa reste la planque la plus chère).

### Son bateau et son jet-ski
- Une fois achetée, à chaque partie (planquesStartRun), sont amarrés au ponton privé :
  - un offshore « cigarette » à livrée Miami (rose et turquoise) — réutilise l'offshore existant (`espadon`) avec une livrée propre ;
  - un jet-ski à la même livrée.
- Une nouvelle clé de VEHDEFS seulement si c'est indispensable, et alors avec son CK_HAB, son cockpit et des tests V3/V4 à jour.
- Les deux sont pilotables et ne bloquent jamais le canal.

### L'intérieur (salle de planque, avec ses abords)
- Une villa ouverte sur l'eau au coucher du soleil : terrazzo, néons rose et turquoise, baie vitrée sur le canal, piscine à débordement, palmiers, transats.
- Bar en arc, salon blanc en contrebas, platines, aquarium mural, voiture de collection dans un garage vitré.
- Ciel en dôme, canal et villas d'en face en décor (rien au-delà de 185 u : les salles voisines).
- Lit dans une chambre avec vue. Le coffre est derrière un panneau qui coulisse.

### Spécificité (une fois par vague, via planqueSpec)
- Une salle de surveillance : les écrans des caméras du quartier.
- Elle montre pendant 60 s les vedettes et les agents de police sur la minimap.

### Activité à rejouer, avec record
- Golf sur le ponton de la terrasse : on drive vers des greens flottants dans le canal, à plusieurs distances.
- Jauge de puissance, puis direction au joystick, vent affiché ; la balle tombe à l'eau avec une gerbe ; le score dépend de la distance au trou.
- Dix balles. Record dans META.planquesJeux, prime une fois par vague au-delà d'un objectif.
- Jouable et perdable, prouvé par un pilote simulé.

### Lumière, sons, tests
- Ambiance : coucher de soleil, synthés rétro qui respirent plus fort dedans, clapot.
- Ambiance coupée par sortirInterieur, mourir et startRun.
- Test « Planques, 8 : la villa Miami » sur le modèle des tests des autres planques : achat, entrée, lit, coffre, surveillance, golf (pilote, passif), bateau et jet-ski amarrés et pilotables, sortie, mort.

## CONTRAINTES DE FONCTIONNEMENT
- **Trafic et voitures.**
  - Aucune voiture, ni du trafic, ni de la police, ni garée, ne suit ou ne vise une ancienne rue devenue canal.
  - Les rues coupées sont lues par creerTrafic, majTrafic, les voitures garées au hasard, pointRoutePolice, les destinations des métiers (taxi) et l'usure de chaussée (ameliorerTexturesSol). Rappel : dans la colline, les voitures garées visaient les anciennes rues.
- **Apparitions.** Aucune dans l'eau pour les véhicules terrestres, les piétons, les ennemis ou les sorties de salle. Aucune porte ni objectif de mission dans l'eau.
- **Voiture à l'eau.** noyerVehicule gère déjà le cas. Vérifie que le joueur peut toujours remonter sur un quai.
- **Visibilité.**
  - Sous un pont, le joueur voit son bateau : tablier qui s'efface localement, comme la grande roue (matériaux propres).
  - Lisible en portrait 9:16, en vue classique, immersive et 1re personne.
- **Carte.** Minimap et grande carte refont canaux, ponts, quais et rues tels qu'ils sont dans le monde, avec balises et nom de quartier.
- **Hors périmètre** : taxi bateau, courses ou missions, pont-levis animé, système immobilier, refonte de la mer.

## PHASES
1. **Squelette jouable** : réservation de la zone, déplacement des lieux, eau, embouchures, traverse, bras, 4 ponts, quais et marches, collisions, trafic, apparitions, minimap et grande carte.
2. **Police maritime.**
3. **Bâti** : villas, immeubles, piscines, végétation, pontons.
4. **Nautique et ambiance** : bateaux amarrés, embarcadère, vedette et jet-skis pilotables, atelier Marée Basse, Dockside Boys, Brigada.
5. **Planque villa Miami.**

## VÉRIFICATIONS
Ajoute à scenarios.js un bloc « Canaux de Los Reyes » : listes lues dans la source, scène maîtrisée, sauts visibles, pilotes simulés au joystick réel (controleDir).
1. Une vedette entre depuis la mer par chacune des deux embouchures.
2. Navigation d'un canal à l'autre par la traverse.
3. Entrée, demi-tour et sortie dans chaque bras.
4. Passage sous chacun des 4 ponts, dans les deux sens.
5. Une voiture traverse chacun des 4 ponts.
6. Embarquement et débarquement à au moins deux points.
7. 500 apparitions tirées (véhicules, piétons, ennemis) : aucune dans l'eau. Aucune porte ni objectif dans l'eau.
8. Trafic simulé 90 s : aucun véhicule dans un canal, aucun bloqué au bord d'une rue coupée.
9. Police :
   - joueur à 3 étoiles immobile dans un bras : une vedette l'atteint en moins de 30 s ;
   - aucune vedette coincée plus de 5 s à l'écran ;
   - agents sur les quais et les ponts, jamais dans l'eau ;
   - à 4 étoiles, une embouchure gardée et forçable ;
   - la recherche ne tombe pas en entrant dans l'eau.
10. Voiture lancée dans un canal : noyade, le joueur remonte sur un quai.
11. Sauvegarde dont la position est dans l'ancien port : pas de réapparition dans l'eau.
12. Empreinte de la ville identique (portes, décor, chalet, mobilier hors zone).
13. Test de la planque Miami.
14. node valider.js puis la suite complète de scenarios.js : aucune régression, en particulier sur l'aquarium, le chalutier, le garage, la mer, la police, le trafic et les planques.
15. Captures Puppeteer réelles en 390×844 : vue d'ensemble, une embouchure, la traverse, un bateau sous un pont (tablier effacé), un bassin, la poursuite d'une vedette, la minimap, la villa Miami dehors et dedans. Une de nuit.
16. Performance mesurée avant/après au centre du quartier (temps d'image, appels de rendu, triangles).

Les performances réelles et le ressenti se vérifieront sur iPhone : ne les déclare pas validés. Si une vérification ne peut pas être faite, dis-le explicitement.

## RESTITUTION (fin de CANAUX.md)
- Changements réalisés et fichiers modifiés.
- Décisions prises seul.
- Lieux déplacés (avant / après).
- Vérifications réussies, échouées ou impossibles.
- Mesures de performance.
- Bateaux et jet-skis pilotables ou décoratifs.
- Limites restantes, et ce que je dois tester en priorité sur l'iPhone.
