Liste de retours de playtest du 22 octobre : 16 points à traiter un par un.

Lis d'abord CLAUDE.md en entier : toutes ses règles s'appliquent (édition ciblée, français partout, un seul fichier, audio en WebAudio pur sans fichier externe, aucun tirage de plus pendant la génération de la ville, dtJeu pour ce qui décide du jeu, clés fixes dans META, tests qui lisent la source, rendus réels pour le visuel).

Organisation :
- Branche `retours-22oct`. Un commit par point qui marche.
- Suivi : rapport_nuit/LISTE_22OCT.md. Une case par point, avec ce qui a été fait, la cause trouvée, le test, les captures avant/après (rapport_nuit/captures/liste_22oct/) et ce qui reste.
- Mets à jour CLAUDE.md (sections concernées, carte du fichier, ancres).
- Je ne serai pas là pour répondre : décide, note la décision et continue.
- Plusieurs éléments sont nommés comme je les vois en jeu (« Titanic », « disco en extérieur », « diving », « statue de la Liberté »…). Retrouve-les dans la source, CLAUDE.md et les rapports avant de toucher quoi que ce soit. Si l'un est introuvable, note-le et passe au suivant.
- Ordre de traitement conseillé : 1, 15, 3, 4, 2, puis le reste. Si le temps manque, mieux vaut des points finis et vérifiés que tous à moitié.

## 1. Cabrage des motos : un défi d'équilibre, plus un message « TROP CABRÉ »
Ce point n'a PAS été respecté dans le prompt précédent, je le redis clairement :
- Supprime le message « trop cabré » et toute bascule déclenchée par un seuil d'angle ou une minuterie (CABRAGE_MOTO, seuil de danger, grâce CROSS_CABRAGE_GRACE…).
- Le cabrage devient un **vrai jeu d'équilibre** : la roue avant reste en l'air tant que le joueur tient le point d'équilibre en dosant les gaz et le joystick. Trop de gaz : la moto monte et finit par passer sur le dos. Pas assez : la roue avant retombe.
- Le joueur doit pouvoir tenir longtemps sans reposer la roue. C'est difficile à contrôler, et c'est ça le défi.
- La chute n'arrive que par une erreur de pilotage : le point de bascule physique est dépassé.
- Affiche la durée du cabrage en cours et un record (META, clé fixe), avec des points selon la durée.
- Garde ce qui marchait : pivot sur la roue arrière, pilote qui se lève, vue cockpit.
- Test : un pilote simulé qui dose les gaz tient au moins 20 s. Un pilote qui garde les gaz à fond passe sur le dos. Un qui lâche repose la roue. Aucun message « trop cabré » dans la source.

## 2. Tous les véhicules du nouveau quartier sont jouables et conduisibles
- Chaque véhicule visible du quartier des canaux (voitures garées, voitures de luxe, bateaux, jet-skis, engins de la marina, du chantier, de la fête) est un vrai véhicule pilotable.
- Pour les performances, il peut naître à l'approche (promotion à la demande, comme les bateaux) sans changer d'aspect.
- Test : un relevé de tous les modèles de véhicules visibles du quartier. Chacun peut être pris (MONTER) et conduit sur 10 u.

## 3. Les véhicules exposés (derby, concessionnaire) : volables pour de vrai
Aujourd'hui, au stand du derby et chez REYES MOTORS, les véhicules sont exposés mais indestructibles et pas volables. C'est étrange.
- Tous deviennent de vrais véhicules : on peut monter dedans, les abîmer, les voler.
- Expose-en moins si c'est nécessaire pour les performances.
- Ne casse pas l'économie : voler une voiture exposée déclenche une alarme et des étoiles de recherche (au moins 3 pour les ultimes).
- Une voiture volée ne peut pas entrer dans « Mes véhicules » ni au garage tant qu'elle n'a pas été achetée (message clair au garage).
- Le podium vide reste vide jusqu'à la partie suivante.
- Mêmes règles pour les voitures de derby exposées (elles restent non garables, comme aujourd'hui).
- Test : vol, alarme, étoiles, refus au garage, podium vide puis rempli à la partie suivante. Les achats normaux marchent toujours.

## 4. Les sons : propres, adaptés, plus jamais stridents
Les tirs, les chocs entre voitures et d'autres sons sont stridents et mal faits.
- Fais un audit de tous les sons synthétisés (SFX, AUDIO, moteurs, armes, chocs, explosions, interface) dans le suivi : liste, défaut entendu, correction.
- Refais-les proprement, toujours en WebAudio pur :
  - enveloppes d'attaque et de relâchement soignées, sans clic ;
  - filtres qui coupent les aigus agressifs, du corps dans les graves ;
  - un son propre à chaque arme (pistolet sec, fusil à pompe grave, mitrailleuse en rafale, sniper qui claque avec un écho) ;
  - des chocs de véhicules selon la violence (tôle, verre, pare-chocs) ;
  - de légères variations de hauteur pour éviter la répétition.
- Un compresseur et un limiteur sur la sortie générale. Des niveaux harmonisés entre toutes les familles de sons. Une atténuation avec la distance. Un plafond de voix simultanées.
- Test :
  - rendu hors ligne (OfflineAudioContext) de chaque son ;
  - aucun écrêtage ;
  - énergie au-dessus de 6 kHz sous un seuil défini dans le suivi ;
  - niveau de crête par famille dans une fourchette ;
  - aucun son coupé net (pas de clic).
  Le ressenti final se fera sur iPhone.

## 5. Le cockpit du taxi : plus d'air sous le toit
En vue cockpit, le taxi est ramassé : le toit est très bas et on voit très peu la route.
- Relève le pavillon de la caisse V3 du taxi (gabarit berlineClassiqueV3, donc la police aussi si elle a le même défaut), puis recale l'œil (CK_GARDE_TOIT, ckToit, cockpitDims).
- But : le pavillon occupe au plus environ 20 % du haut de l'écran en portrait, et la route se voit au moins autant que dans les autres berlines.
- La silhouette extérieure du taxi doit rester celle d'une berline.
- Test : comparaison mesurée sur le rendu (part de l'écran occupée par le toit et par la route) entre taxi, police et deux autres berlines. Captures avant/après.

## 6. Les publics de décor fuient et se visent
- Au disco en extérieur, au diving et partout où il y a un public de décor : un tir, une explosion ou un véhicule lancé les font fuir, et on peut leur tirer dessus.
- Ils passent par figurant() / convertirFigurant comme ceux de l'aéroport et de la colline. Fais un relevé de tous les publics de décor qui n'y passent pas encore, et corrige-les tous.
- Test : pour chaque public, un tir à proximité les fait fuir, et une balle en touche un (il devient un vrai piéton et tombe).

## 7. La statue de la Liberté, plus grande
- Agrandis-la nettement : proposition ×2, à ajuster pour qu'elle domine son environnement sans cacher le joueur en vue de dessus.
- Son solide, son socle et sa base suivent. Elle ne déborde ni sur une route ni sur un passage.
- Construite sans décaler les tirages de la ville.

## 8. Les habits et les tatouages, plus réalistes
- La chemise hawaïenne n'est qu'une couleur unie. Elle doit avoir un vrai motif : fleurs d'hibiscus, feuilles de palmier, sur un fond coloré (texture canvas procédurale, en cache).
- Passe en revue TOUS les habits (BOUTIQUES_DEF, VETEMENTS, TENUES) et donne à chacun le détail qui le rend reconnaissable : jean (coutures, délavé), chemise à carreaux, maillots numérotés, logos, rayures, camouflage, cuir.
- Les tatouages ne sont plus des aplats : de vrais dessins (tribal, rose, dragon, lettrage, ancre), à l'encre sombre, posés sur la peau avec un léger fondu.
- Partout : joueur, aperçu en cabine, mannequins, penderie.
- Captures avant/après de chaque pièce.

## 9. Plus d'améliorations au chantier naval
- Augmente nettement le catalogue du tuning des bateaux, par famille de bateau. Par exemple :
  - mécanique : moteur, hélice, coque, nitro, blindage, réservoir ;
  - style : livrées, pont en teck, T-top, arceau radar, hardtop, flybridge, pare-brise, sièges, sono, néons sous-marins, projecteurs, feux, plateforme de bain, échelle, toboggan pour les yachts, porte-kayak, flamme de proue, nom sur la coque, drapeaux ;
  - jet-skis : selle, guidon, carénage, livrée, gerbe colorée.
- Mêmes règles que le garage : aperçu avant achat, payé une fois, prix dans TUNING_PRIX, clés fixes déclarées dans vehPersoMetaDefaut. Ajoute un test de rechargement.

## 10. Le Titanic qui se brise : beaucoup plus impressionnant
- Plus de gens qui tombent :
  - des dizaines de passagers qui glissent sur le pont qui s'incline, s'accrochent, sautent, tombent à l'eau et nagent ;
  - des chaloupes qui descendent ;
  - des fusées de détresse ;
  - les lumières qui clignotent puis s'éteignent.
- La cassure : le navire se brise en deux, la poupe se dresse à la verticale avant de couler, avec des débris, de la vapeur, de la fumée, des éclaboussures et le son (craquements, cris lointains).
- Garde le coût sous contrôle : passagers en instances ou en LOD, réserves fixes de particules.
- Captures de la séquence.

## 11. Les explosions, le camion-citerne, la pompe à essence
- Explosions plus impressionnantes :
  - boule de feu en plusieurs couches, flash de lumière bref, onde de choc au sol ;
  - débris et étincelles, colonne de fumée noire qui monte et dure ;
  - trace brûlée au sol, secousse de caméra selon la distance ;
  - son grave avec écho.
  Réserves fixes, aucune allocation en jeu, mesure du coût.
- **Le camion-citerne** (tous ceux du jeu, trafic compris) doit exploser à coup sûr quand il est détruit : explosion géante, souffle, flammes au sol qui durent. Trouve pourquoi il n'explose pas aujourd'hui.
- **Les pompes à essence** :
  - ajoute ou complète des stations-service en ville, avec des pompes qui explosent quand on leur tire dessus ou qu'on les percute fort ;
  - réaction en chaîne entre pompes voisines et véhicules proches ;
  - elles reviennent à la partie suivante.
  Construites sans décaler les tirages de la ville.

## 12. Sortir et choisir ses véhicules depuis la planque principale
- À la planque principale (la villa), un garage où l'on choisit n'importe quel véhicule de « Mes véhicules » (et les hélicos du manoir) dans une liste lisible : nom, aperçu, améliorations. On le sort devant la villa.
- Ça marche même si le véhicule est resté en ville (il est rapatrié, comme au garage tuning) et pour un véhicule rangé.
- Test : sortir chaque type de véhicule de la collection, puis en ressortir un autre.

## 13. Les plongeons : l'entrée dans l'eau compte
- Pour tous les plongeons (crique, diving, concours de la villa, plongeoirs, chute dans l'eau d'une hauteur) : entrer dans l'eau à la verticale, par les pieds ou par les mains, est propre.
- Entrer à plat est un GROS PLAT :
  - grosse gerbe, claquement, message « GROS PLAT ! » ;
  - perte du bonus, dégâts selon la hauteur ;
  - jamais mortel sous la hauteur où l'eau protège aujourd'hui.
- Le joueur contrôle son corps pendant la chute : se grouper, s'ouvrir, se tendre tête ou pieds en avant.
- Test : un pilote simulé qui se tend entre propre, un passif tombe à plat.

## 14. Le diving : un saut de falaise épique, une baignade en bas, l'accès en bateau
- **Le saut de falaise :**
  - léger ralenti au départ, caméra qui accompagne la chute ;
  - vent, foule qui crie, gerbe énorme ;
  - hauteur annoncée, record.
- **L'eau en bas** (la plage du diving) :
  - c'est une vraie eau, la même que la mer, où l'on nage, où l'on se baigne et d'où l'on ressort par la plage ;
  - aucune différence de couleur ni de niveau avec la mer ;
  - elle est reliée à la mer et accessible en bateau (estEau, navigation, rien qui bloque).
- Test : nager de la mer au pied de la falaise, y arriver en bateau, plonger et ressortir.

## 15. La tour de contrôle : un vrai jeu d'aiguilleur
Le mini-jeu TOUR doit devenir plus réaliste tout en restant jouable au doigt sur iPhone :
- vent affiché et choix du sens de piste ;
- arrivées sur un circuit d'approche (vent arrière, base, finale) ;
- attentes en hippodrome ;
- départs à autoriser (roulage, alignement, décollage) ;
- piste occupée : on ne peut pas faire atterrir et décoller en même temps ;
- séparation minimale, remise des gaz, carburant, urgences.
Messages radio courts. Perdable et gagnable, prouvé par un pilote simulé (gagne en jouant bien, perd passif ou en traînant).

## 16. Une course de supercross, avec la tenue
- Sur la piste de SUPERCROSS existante, une vraie course :
  - départ à la grille qui tombe, 5 pilotes IA (réutilise les motards) ;
  - 3 tours, positions en direct, chrono ;
  - les IA franchissent les sauts, les whoops et les virages relevés.
- Gagner donne une **tenue de supercross** complète et visible : maillot et pantalon colorés à numéro, bottes, gants, casque cross à visière, lunettes. Si la tenue « Pro Rider » existe déjà, rends-la à ce niveau, sinon crée-la (TENUES, clé fixe dans META.exploits).
- Prime une fois par vague. Course perdable, prouvée par un pilote simulé.

## VÉRIFICATIONS GÉNÉRALES
- Chaque point a son test dans scenarios.js (listes lues dans la source).
- Pour chaque point visuel, des captures Puppeteer réelles en 390×844, avant/après.
- À la fin : node valider.js, puis la suite complète de scenarios.js, sans régression.
- Empreinte de la ville identique (portes, décor, mobilier) sauf ajout volontaire noté.
- Mesure de performance avant/après sur les points 2, 3, 10 et 11.
- Si un point n'a pas pu être traité ou vérifié, dis-le explicitement.

## RESTITUTION (fin de LISTE_22OCT.md)
- Point par point : fait, partiel ou non fait, la cause trouvée, ce que je dois tester en priorité sur l'iPhone.
- Les décisions prises seul.
