# GTRoyal — ce que le jeu est, et ce qu'il doit devenir

Écrit dans la nuit du 16 octobre 2026 (date réelle de `date` ; les libellés « 16, 17, 18 octobre » du CLAUDE.md sont en avance sur le calendrier et ne doivent pas servir de repère). Lecture seule : rien n'a été modifié dans le code pour écrire ceci. Chaque affirmation cite ce qu'elle lit dans `index.html`.

Pour lire vite : la section 1 dit ce qu'il y a, la 2 ce qui manque, la 3 propose trois jeux possibles, la 7 pose les dix questions. Le reste est le détail.

---

## 1. Ce que le jeu est vraiment aujourd'hui

**Le genre réel.** Un jeu de survie par vagues dans une ville ouverte, vue de dessus, au toucher. La promesse de l'écran titre est « LOS REYES — CHAOS URBAIN », et le premier message en jeu est `bigMsg('SURVIS, ENCAISSE, RECOMMENCE')` (`startRun`). Le but du jeu n'est écrit nulle part ailleurs que dans le pavé d'aide `#help` : « La boucle — survis aux vagues, farme les gangs, encaisse les dollars, améliore-toi ».

**La boucle d'une partie, telle que le code la définit.** `startRun` pose le joueur sur la place avec les poings, 3 grenades et l'argent de `META`. La première mission (`nouvelleMission`, type `rack`) envoie chercher la batte ; 18 s plus tard (`WAVES_REPOS`), `lancerVague` lance la vague 1 contre le gang du quartier (budget `55+24n`, 6 à 7 Vipers). Entre deux vagues, `finVague` paie `40+12n` dollars et `ouvrirBonus` fait choisir une carte parmi `BONUS_DEFS`. Un chef arrive toutes les cinq vagues (`WAVES.n%5===0`, `CHEFS_GANG`), un gang rival se mêle à la vague à partir de la quatrième. Tout autour, 28 salles (`INTDEFS`, pas 27 comme l'écrit la carte du CLAUDE.md : `boutique` s'est ajoutée), une trentaine d'activités de plein air (`pointsActivites`), des métiers, des courses. Entrer dans une salle ou lancer une activité **gèle les vagues** (`INT.actif` dans `majVagues`, `treveActivite`).

**Durée d'une partie type.** Non mesurée : il n'existe aucune télémétrie. D'après le code, une vague dure 1 à 3 minutes et les paliers du thème `vagues` (8, 12, 16, 20) disent qu'un bon joueur est attendu vers la vague 8, soit 15 à 25 minutes de combat pur — mais rien ne limite le temps passé hors des vagues.

**Ce qui persiste.** Tout `META` (`sauveMeta`, clé `asphalte_save_v1`) : l'argent, les armes ramassées (`ramasser` écrit `META.armes[id].poss=true`), le niveau, les améliorations `upg`, les défis, les curiosités, les véhicules, les planques, les tenues. `mourir` n'enlève **rien** à `META`. Deux commentaires du code (près de `META.argent` et dans `startRun`) affirment pourtant que l'argent et les armes sont « perdus au game over » : le code et son intention se contredisent, et c'est le point le plus important de ce document. La mort ne coûte que la partie en cours (munitions, grenades, bonus, recherche) ; l'écran `#death` ne dit ni ce qu'on garde ni ce qui vient ensuite.

**Ce qui pousse à relancer.** Les 77 défis (`DEFIS_SIMPLES` + paliers de `DEFIS_THEMES`), dont la récompense se réclame au menu (`META.defis.aReclamer`, pastilles) ; les 16 curiosités (`CURIOS`) et la Vertèbre qu'elles débloquent ensemble ; « Mes véhicules » (`VEHPERSO_MAX` = 6) ; les 6 planques et la villa (`PLANQUES_DEF`, `PRIX_VILLA` = 20 000) ; 27 tenues (`TENUES`), dont 10 d'exploit avec une capacité (`tenueK`). Ce sont des **collections**, toutes atteignables sans contrainte de temps : rien ne dépend du jour, de la série, ni d'un rendez-vous.

**Ce qui ne pousse à rien.** Le niveau (`gainXp`, `xpRequis`) n'est jamais affiché en jeu et ne débloque plus rien après le niveau 8. Les revenus des planques tombent **par vague** (`lancerVague` alimente `META.revenus`), pas avec le temps : rouvrir l'app demain ne rapporte rien. Les quatre chefs nommés (KAA, EL DIABLO, SILAS, VOLKOV) ne sont que des ennemis plus résistants ; aucune salle, à part la laverie (`HOSTILITE.viperes`, `alarmePool`), ne connaît un gang.

**Inventaire en trois colonnes.** Classé d'après ce que chaque système apporte à la boucle et à l'économie, pas d'après le travail qu'il a coûté.

*Cœur du jeu* : les vagues et la police (`lancerVague`, `WANTED`) ; l'armurerie, les armes et l'établi (`MODS_ARMES`) ; la concession, les garages et « Mes véhicules » (`CATALOGUE`, `META.vehPerso`) ; la villa et les planques (hub, revenus, penderie) ; les défis.

*Bon contenu périphérique* — un pilote simulé gagne, un passif perd, une limite par vague, une récompense permanente : chalutier, aquarium, laverie, serre, radio, ciné, arcade, Dépôt ; derby, ball-trap, parcours de Fort Reyes, Supercross, Badlands, le centre sportif ; les métiers taxi, ambulance, pompier (`payerMetier`, paliers 3/6/10).

*Contenu orphelin* — jouable une fois ou sans lien avec le reste : supérette, banque, commissariat (butin **une fois par session**, `caisse.pris`, `coffre.pris`, `casier.pris`, `preuves.pris` jamais remis à zéro) ; voyance (une curiosité au troisième passage) ; surprises des toits (des points, rien d'autre) ; manèges (spectacle) ; tour de contrôle (un jeu de gestion plein écran dans un jeu d'action) ; stand de tir (rien à gagner) ; métiers dépanneuse et police (jamais payés, arrêtés à 10) ; casino (sans limite, espérance négative, et un problème de classification d'âge, voir §5) ; musée et Site 51 (contenu fini pour toujours une fois pris) ; salle de sport (vide après trois barres).

**Ce que le code dit de lui-même.** Quatre systèmes de course font la même chose (Dépôt, `RIDE_DEFS`, mission `course`, chrono du taxi). Trois stands de tir. Cinq arbres de déblocage parallèles sans pont (curiosités, tenues d'exploit, skins de métier, tenues de planque, défis). Deux systèmes d'amélioration de véhicules (`META.vehPerso`, `META.derby`). Le commentaire de `TENUES` dit « purement décoratif » alors que onze tenues ont une capacité. Le jeu a grandi par lots de demandes, et chaque lot a ajouté un système au lieu d'en nourrir un.

---

## 2. Le trou

**Un inconnu qui installe le jeu ne sait pas ce qu'il doit faire, et rien ne lui donne une raison de revenir demain.**

Sa première session, telle que le code la déroule :

- Avant de jouer : `construireVille()` tourne de façon synchrone à la fin du script, ~25 s en headless sur ce PC, jamais mesuré sur iPhone, sans écran de chargement. La console de développement `eruda` est visible. Le gestionnaire `window.onerror` écrit dans `#errBox`, qui n'existe pas dans le HTML : une erreur au premier lancement est muette.
- 0:00 — « SURVIS, ENCAISSE, RECOMMENCE », vue immersive par défaut (`META.vue:'immersive'`) jamais expliquée, radar qui tourne avec la caméra, barres de vie et d'endurance sans étiquette.
- 0:01 — toast de l'avion de voltige (faux : il est « dans son petit hangar », `deplacerVoltige`, pas « au bout de la grande piste »), puis la mission de la batte. `#notifStack` ne garde que **deux** notifications (`pousseNotif`) : à 0:04, « Batte récupérée » et « Mission accomplie » ont chassé les deux premiers messages. Le seul indice d'objectif de la session a disparu avant d'être lu.
- 0:18 — vague 1, six ou sept Vipers dont des `vip_pistol` à rafales, contre un joueur à la batte, sans régénération. Chaque mort de gang a 28 % de chances d'appeler un renfort (`tuerEnnemi`).
- 1:00 à 1:30 — fin de vague, `ouvrirBonus` ouvre trois cartes qui réagissent à `pointerdown` sans délai, pendant que le pouce martèle encore le tir.
- 2:30 — premiers défis accomplis (« Voltige », « Chauffard »), signalés par un toast et une pastille, à réclamer dans un menu que rien n'invite à ouvrir pendant la partie.
- vers 5:00 — vague 3 ou 4 ; le premier chef n'arrive qu'à la vague 5. La mission `purge` ne compte que les Vipers et les Calaveras (`MISSION.cur.type==='purge'`) : pendant une vague des Dockside Boys, « Neutralise N membres de gangs » n'avance pas. C'est un bug, et il tombe dans les cinq premières minutes.

Les décrochages probables, dans l'ordre : le chargement figé ; la vue qu'on ne comprend pas ; l'objectif qu'on n'a pas lu ; la première vague trop dure aux poings ; la mort qui ne dit pas ce qu'on garde (l'argent, les armes) et n'affiche ni les défis à réclamer ni le prochain déblocage. Et surtout : rien n'est daté. Pas d'objectif du jour, pas de série, pas d'événement. Un joueur qui a aimé sa première session n'a aucune raison **programmée** de rouvrir l'app.

Le jeu a 28 salles et 30 activités, et aucune ne lui est présentée. Il les découvre par les balises (`mkBalises`) et le filtre « Activités » de la carte — s'il ouvre la carte, ce que seule l'aide indique.

---

## 3. Trois directions

Les trois respectent Los Reyes, les quatre gangs et leurs chefs, les curiosités, les planques et la villa. Les estimations de travail sont données avec l'outillage actuel (fichier unique, `scenarios.js`, pilotes simulés) et en jours de développement d'une seule personne.

### A. « Reprendre Los Reyes » — réorganiser et couper (recommandée)

*Promesse* : quatre gangs tiennent la ville ; tu la reprends quartier par quartier, et tout ce que la ville contient sert à ça.

*Finir* veut dire : les quatre chefs tombés, les quatre quartiers repris. Il y a une fin, et après elle le jeu continue comme aujourd'hui (vagues libres, records), avec les quartiers repris qui rapportent.

*Le fil d'histoire minimal* : le joueur revient à Los Reyes après la chute de sa famille (Cedar Street Familia, nom déjà en réserve dans le CLAUDE.md, jamais utilisé) ; les quatre gangs se sont partagé la ville. Chaque chef a un quartier, un visage (déjà dans le jeu), une phrase d'intro avant sa vague et une phrase à sa chute. Les salles se rattachent par le quartier : la laverie blanchit pour les Vipers (c'est déjà dans le code), le club et le casino sont aux Calaveras, le chalutier et le port aux Dockside Boys, la villa et la concession à la Brigada. Les activités du quartier ne « racontent » rien de plus : elles donnent de l'influence sur ce quartier.

*La boucle courte (une partie)* : survivre aux vagues du quartier où l'on est. Chaque vague gagnée, chaque activité réussie dans ce quartier ajoute de l'influence ; le chef arrive quand l'influence atteint le seuil, plus la vague 5 arbitraire. Le tuer reprend le quartier. Mourir fait perdre une partie de l'influence de la partie en cours, pas les quartiers repris : la mort coûte enfin quelque chose de lisible.

*La boucle longue (une semaine)* : un objectif du jour tiré parmi les défis existants, les revenus de planque convertis en revenus au temps réel (une fois par jour, à l'ouverture), et la campagne des quatre quartiers qui se finit en une à deux semaines pour un joueur régulier.

*Ce qu'elle impose de couper ou de mettre en retrait* : tout ce qui n'a pas de quartier ni d'influence à donner — la tour de contrôle, les manèges, les surprises des toits, la voyance, les métiers dépanneuse et police, trois des quatre systèmes de course (garder `RIDE_DEFS`), les braquages à usage unique tant qu'ils ne sont pas remis à zéro, le casino tel quel (voir §5). Rien n'est supprimé du code cette nuit ; c'est la liste de ce qu'on arrête d'entretenir.

*Ce qu'elle impose d'ajouter* (le moins possible) : un état de territoire dans `META` (quatre clés fixes), un compteur d'influence par partie dans `ETAT`, l'affichage du quartier et de son influence dans le HUD (la minimap sait déjà colorer les quartiers), quatre fois deux phrases de chef, un objectif du jour, et un écran de mort qui dit ce qu'on garde. Aucune salle, aucun véhicule, aucune activité nouvelle.

*Ordre de grandeur* : 8 à 12 jours, dont 3 pour l'écran titre, le chargement et l'écran de mort, 3 pour le territoire et l'influence, 2 pour l'objectif du jour et les revenus au temps, le reste en textes et tests.

### B. « L'arcade pure » — un roguelite de vagues

*Promesse* : dix minutes, une ville, des vagues de plus en plus dures, un score.

*Finir* n'existe pas : c'est un jeu à records, par vague et par score. La partie est le seul objet.

*Le fil* : aucun, assumé. Les chefs sont des boss de paliers (vagues 5, 10, 15, 20), chacun avec son quartier et ses sbires ; c'est déjà `lancerVague`.

*Boucle courte* : une partie de 10 à 20 minutes, les cartes de `BONUS_DEFS` comme construction de la partie (il en faudrait trente au lieu de douze), l'argent **perdu à la mort** comme le code le prétend déjà, dépensé en partie dans les salles qui restent.

*Boucle longue* : la progression permanente (`upg`, armes, personnages) et les défis ; un classement local par personnage ; un « contrat du jour » qui fixe la graine de la ville pour que tous les joueurs jouent la même ville le même jour (la ville est déjà déterministe par graine).

*Couper* : la plupart des salles — garder six : armurerie, concession, garage, villa, arcade, laverie — et la quasi-totalité des activités de plein air sauf les courses `RIDE_DEFS` et le derby. C'est la direction qui coupe le plus : 22 salles et une vingtaine d'activités deviennent du décor.

*Ajouter* : vingt cartes de bonus, un classement local, la graine du jour, l'argent perdu à la mort (une ligne, mais toute l'économie à recalibrer : les prix de `CATALOGUE`, `TUNING_PRIX`, `PRIX_VILLA` supposent un argent qui s'accumule).

*Ordre de grandeur* : 6 à 9 jours, mais le recalibrage de l'économie est un risque de plusieurs semaines si on se trompe.

### C. « Le bac à sable » — tout garder et donner un récit

*Promesse* : un GTA de poche où tout est possible, avec une histoire à suivre.

*Finir* : la dernière mission du dernier chapitre.

*Le fil* : quatre chapitres, un par gang, cinq missions scriptées chacun (rencontrer, voler, livrer, défendre, affronter le chef), qui envoient dans les salles et les activités existantes comme étapes de mission (« gagne le derby pour que Silas te reçoive »). Les 28 salles et les 30 activités trouvent toutes une place dans une mission.

*Boucles* : courte, la mission suivante ; longue, le chapitre. Les vagues deviennent secondaires (le monde « vit » entre deux missions).

*Couper* : rien.

*Ajouter* : un système de missions scriptées avec PNJ, dialogues, étapes, échec et reprise ; vingt missions écrites et testées par un pilote chacune ; une sauvegarde du chapitre ; les dialogues. Rien de tout cela n'existe (`nouvelleMission` tire des missions génériques, sans personnage ni enchaînement).

*Ordre de grandeur* : 25 à 40 jours, avec les règles de validation actuelles. C'est la direction la plus cohérente avec ce que le monde propose déjà, et la seule qu'un développeur seul ne tiendra pas jusqu'à une publication proche.

### Pourquoi A

B jette ce que les derniers dix jours ont construit ; C demande ce qui n'existe pas encore (un système de missions) et la plus grosse part du travail. A prend la contradiction du code — un jeu d'arcade qui s'est doté d'un monde — et la résout en donnant au monde une raison d'exister dans la boucle d'arcade : l'influence sur le quartier. Elle ne crée presque rien, elle relie.

---

## 4. Rétention, concrètement (direction A)

Tout ce qui suit se construit sur `META` tel qu'il existe, avec `fusionMeta` tel qu'il existe : un nouveau champ à **clés fixes** est fusionné sans rien casser ; un dictionnaire à clés de contenu doit entrer dans `DICOS_OUVERTS`, sinon il est vidé au rechargement (bug déjà vécu trois fois, CLAUDE.md).

**Territoire.** `META.territoires = {viperes:0, frelons:0, murenes:0, chrome:0}` (clés fixes = les ids internes, jamais renommés) : 0 tenu par le gang, 1 repris. Lu par `lancerVague` (un quartier repris ne lance plus que des vagues « libres » et rapporte), par la minimap (teinte du quartier), par l'écran titre (« 1 quartier sur 4 »). Influence de la partie en cours dans `ETAT.influence` (pas dans `META` : perdue à la mort).

**Objectif du jour.** `META.quotidien = {jour:'', id:'', fait:false}` : à l'ouverture, si `jour` n'est pas la date du jour, tirer un défi parmi `DEFIS` non récupérés, avec une prime fixe. Rien d'autre à construire : les compteurs existent (`checkDefis`).

**Série.** `META.serie = {jour:'', n:0}` : incrémentée à la première partie du jour si la veille a été jouée, remise à 0 sinon ; affichée sur l'écran titre. Pas de récompense croissante : la série n'est qu'une information, elle ne doit pas punir.

**Revenus au temps réel.** `META.planqueT` (horodatage de la dernière collecte) : à l'ouverture, les revenus des planques possédées sont calculés sur les heures écoulées, plafonnés à 24 h, et versés dans `META.revenus` existant. C'est la seule mécanique qui récompense le retour du lendemain. `lancerVague` cesse d'alimenter `META.revenus`.

**Événements de vague par gang.** `majEvenements` tire déjà des événements ; il suffit de pondérer par le gang du quartier et de nommer le gang dans le texte (« Les Dockside Boys déchargent au port »). Aucun champ.

**Récits par gang.** Deux phrases par chef, affichées par `bigMsg` à l'arrivée du chef et à sa chute ; une troisième à la reprise du quartier. Textes dans une constante, rien dans `META`.

**Compatibilité.** Les quatre champs ci-dessus sont des objets à clés fixes : `fusionMeta` les complète pour une sauvegarde ancienne. À tester comme les garages : une sauvegarde sans ces champs, une sauvegarde tronquée.

**Ce qu'il faut mesurer avant toute décision de rétention.** Aujourd'hui rien n'est mesuré. Quinze événements, tous accrochés à des fonctions existantes :

1. `session_debut` — ouverture, retour au premier plan ; `version`, `plateforme`, `premiere`, `jours_depuis_install`.
2. `session_fin` — passage en arrière-plan ; `duree_s`, `parties`.
3. `partie_debut` — `startRun` ; `perso`, `vue`, `n_partie`.
4. `partie_fin` — `mourir` ; `vague`, `duree_s`, `cause`, `argent_gagne`, `score`.
5. `vague_atteinte` — `lancerVague` ; `vague`, `gang`, `t_depuis_debut`.
6. `salle_entree` — entrée dans une salle ; `salle`, `premiere_fois`.
7. `activite_lancee` / `activite_fin` — `lancerDefiBase`, `derbyLancer`, `fpsDemarrer`, `sportjDemarrer`, mini-jeux de salle ; `activite`, `reussie`, `score`, `duree_s`.
8. `prime_recue` — `primeMerUneFois` ; `cle`, `montant`.
9. `achat_fictif` — `garageAcheter`, `actionBoutique`, `actionShop`, `planqueAction` ; `categorie`, `item`, `prix`, `solde_avant`.
10. `defi_reclame` — `recupererDefi` ; `id`, `mult`.
11. `quotidien_fait` — l'objectif du jour ; `id`, `serie`.
12. `territoire_repris` — à la chute du chef ; `gang`, `vague`, `n_partie`.
13. `tenue_debloquee` — `exploitMiniJeu` ; `tenue`.
14. `vue_basculee` — `basculerVue` ; `vers`.
15. `erreur_js` — `window.onerror` ; `message`, `ligne`, `version`.

Les rétentions J1, J7, J30 se calculent côté serveur à partir de `session_debut`. Outil : un POST maison (`navigator.sendBeacon`, file dans `localStorage` hors ligne) suffit et ne déclare aucun SDK ; PostHog (SDK web, hébergement UE, gratuit à ce volume) si l'on veut des entonnoirs sans rien écrire. Pas d'identifiant publicitaire : un UUID local, et donc pas de fenêtre ATT.

Ce que les chiffres doivent dire après 90 jours : J1 sous 20 % ou J7 sous 3 %, et c'est l'accueil qui est en cause, pas le contenu ; `partie_fin.vague` dit où les joueurs meurent et si la vague 1 à la batte est le mur qu'on soupçonne ; `salle_entree` dit quelles salles personne n'ouvre.

---

## 5. Argent, honnêtement

Chiffres : **[S]** sourcé, **[E]** estimation. Détail et liens dans la lecture « marché et stores » de la nuit ; ici l'essentiel.

**La classification d'âge décide avant le modèle.** Apple (barème de 2025 : 4+, 9+, 13+, 16+, 18+) note au descripteur le plus sévère : jeu d'argent simulé **fréquent** → 18+ ; alcool fréquent → 18+ [S]. Un casino complet (machines, blackjack, poker, roue) et un club où l'on s'enivre jusqu'au malaise (`IVRESSE`, `malaiseEthylique`) tombent très probablement dans « fréquent » : **18+ quasi certain tel quel** [E]. PEGI classe 18 tout jeu qui simule un casino, même fictif [S]. Un 18+ exclut les 13-17 ans, bloque l'app sous Temps d'écran, et Apple ne met pratiquement jamais en avant un jeu 18+ [E]. Rendre le casino et l'ivresse occasionnels (garder la roue, retirer blackjack et poker, l'ivresse sans malaise) viserait 13+ chez Apple ; PEGI restera 18 tant qu'un casino existe. Un interrupteur `CASINO_ACTIF` est dans l'esprit du code (`MER_V2`, `DECOR_V2`).

**Les quatre modèles.**

*Premium payant une fois.* Capacitor, fiche store, captures : 1 à 2 jours [E]. Rien à changer au design. Le payant pèse moins de 1 % du revenu mobile [S] et il faut une vidéo convaincante, mais c'est le seul modèle qui monétise chaque installation sans SDK.

*Gratuit avec pubs récompensées.* `PUB_X2` est une coquille vide (`disponible()` renvoie faux). Il faut AdMob via un plugin Capacitor, le consentement UMP obligatoire en Europe, la fenêtre ATT sur iOS (opt-in 15-25 % dans les jeux [S]), le Privacy Manifest : 4 à 7 jours [E]. La pub doit rester un choix (×2, continuer), jamais un interstitiel : une pub coupe le rendu WebGL. L'économie actuelle, généreuse, laisse peu de besoin à vendre.

*Achats cosmétiques.* Plugin d'achats (StoreKit 2 / Billing), bouton « Restaurer », droits écrits dans `META` : 5 à 10 jours [E]. Le problème est de design : tout ce qui est cosmétique s'achète déjà en argent fictif (`VETEMENTS`, `TUNING_PRIX`, `CATALOGUE`). Vendre en argent réel oblige à **dégrader** l'économie fictive. Jamais de jeton de casino en argent réel (règle Apple 5.3.3).

*Abonnement.* Il faut du contenu récurrent qu'une personne seule ne tiendra pas. À écarter.

**Fourchettes, première année, sans marketing** [E, à partir des médianes du marché : 1,3 % des jeux sortis en 2025 ont passé 500 000 installations ; rétention médiane J1 22 %, J7 4 % [S]]. Hypothèse d'organique : 2 000 / 10 000 / 60 000 installations.

- Premium à 3,99 € : 500 / 2 700 / 17 000 €.
- Pubs récompensées (eCPM mixte 6 $) : 100 / 500 / 5 800 €.
- Cosmétiques (0,5 à 3 % de payeurs, panier 4 €) : 35 / 500 / 9 000 €.

À ce volume, tous les modèles rapportent entre quelques centaines et quelques milliers d'euros ; la différence se fait sur le coût d'intégration et le risque de refus.

**Recommandation.** Premium à 3,99 € (2,99 € au lancement), sans pub ni achat en V1 ; casino et ivresse rendus occasionnels ou coupés par interrupteur pour viser 13+ sur Apple ; analytics maison ou PostHog dès la V1. `PUB_X2` reste disponible pour une V2 gratuite si les chiffres le justifient.

**Conditions d'échec** : moins de 300 ventes en trois mois (le premium ne se découvre pas seul : basculer en gratuit avec ×2 et un pack cosmétique, en gardant les acheteurs par un droit dans `META`) ; J1 < 20 % ou J7 < 3 % (problème d'accueil, aucun modèle ne le sauvera) ; 18+ confirmé malgré l'allègement (décider si le casino vaut les mises en avant perdues) ; un pic de `erreur_js` sur un modèle d'iPhone (la WebView plante : priorité absolue).

---

## 6. Ce qu'il faut couper

Une personne seule ne maintient pas 28 salles et 80 définitions de véhicules jusqu'à la publication. Liste nominative, avec ce qu'on perd. « Couper » veut dire : ne plus entretenir, retirer de la carte et des balises, garder le code derrière un interrupteur tant qu'il ne coûte rien.

**Salles à garder (12)** : armurerie, concession, garage (`tuning`), villa (`planque`), boutique, laverie, aquarium, serre, radio, ciné, arcade, chalutier, Dépôt. Elles ont un pilote, une limite, une curiosité ou une tenue, et un quartier.

**Salles à couper (16)** :
- *supérette, banque, commissariat* — braquages à usage unique, jamais remis à zéro, aucun test ; on perd trois « lieux de GTA » attendus, qu'une seule salle de braquage remise à zéro par vague remplacerait mieux plus tard ;
- *voyance* — une curiosité au troisième passage ; on perd la Boule (à redonner par la laverie ou le musée) ;
- *casino* — pour la classification d'âge ; on perd la Chaussette-roue et le défi `jackpot` (garder la roue seule, hors casino, si on y tient) ;
- *karaoké, bowling, sandwich* — anciens, tests scriptés seulement, zones qui chevauchent la SORTIE (`DETTE_REGLE_8U`) ; on perd trois curiosités (Platine ouvre la radio : la donner ailleurs) ;
- *salle de sport* — vide après trois barres ; `META.muscle` peut passer aux améliorations `upg` ;
- *musée, Site 51* — contenu fini pour toujours ; ce sont les deux salles les plus écrites du jeu, et c'est ce qu'on perd : les garder « en l'état, sans entretien » est défendable ;
- *métro* — tests scriptés, obscurité qui divise ; on perd la Lampe ;
- *club* — avec le casino, pour l'âge ; on perd la danse et les fêtards ;
- *pharmacie, tour* — passages sans jeu (la tour reste nécessaire comme accès au toit : la garder comme ascenseur, sans salle).

**Activités à couper** : tour de contrôle, manèges, surprises des toits, métiers dépanneuse et police, mission courte `course` et chrono du taxi comme systèmes de course (garder `RIDE_DEFS`), stand de tir de l'armurerie comme activité (garder l'essai d'une arme). Sauts (Pic, Big Jump, Vertige), île au trésor, plongée, wakeboard, parachute : à garder sans entretien, ils ne coûtent rien et font la ville.

**Véhicules.** `VEHDEFS` a 80 entrées, 26 achetables. Garder les 26 achetables, les véhicules de service et de métier (taxi, ambulance, pompiers, bus), six motos, quatre bateaux, deux avions, trois hélicos. Arrêter d'entretenir les doublons de l'aéroport (quatre véhicules de piste), l'OVNI et le rayon tracteur (un système entier pour un véhicule caché), les quatre véhicules du Dépôt si le Dépôt part un jour. On perd des trouvailles ; on gagne dix pour cent de `majVehicules`.

**Ce qu'il ne faut pas couper même si c'est tentant** : la vue à la première personne (elle vient d'être payée et c'est la seule réponse au « personnage énorme » du playtest), Los Reyes Hills, Fort Reyes, l'aéroport (ils font le monde), les défis (c'est le seul système de rétention qui marche).

---

## 7. Les dix questions

Dans l'ordre où elles débloquent le reste. Une phrase chacune suffit.

1. Le jeu a-t-il une fin (les quatre quartiers repris) ou est-ce un jeu à records sans fin ?
2. La mort doit-elle coûter quelque chose de permanent (l'argent, comme le code le prétend), ou seulement la partie en cours (comme le code le fait) ?
3. Qui est le joueur à Los Reyes — un revenant de la Cedar Street Familia, un inconnu, personne ?
4. Payant une fois, ou gratuit avec pubs récompensées ?
5. Le casino et l'ivresse valent-ils un 18+ et l'absence de mise en avant, ou passent-ils en « occasionnel » ?
6. Parmi les seize salles à couper, lesquelles refuses-tu de perdre, et pourquoi (ce « pourquoi » dit ce que le jeu est pour toi) ?
7. Les salles doivent-elles appartenir à un gang (la laverie aux Vipers, le port aux Dockside Boys), ou rester neutres ?
8. Un objectif du jour et des revenus au temps réel : acceptables, ou le jeu doit-il rester jouable sans jamais regarder l'horloge ?
9. Quelle est la date de publication visée, et combien de jours par semaine y consacres-tu ?
10. Es-tu prêt à mesurer (quinze événements, un UUID local) avant de décider quoi que ce soit sur la rétention ?

---

## 8. Impact sur la nuit technique

La Partie 2 ne retire rien. Ce qui suit ordonne le travail.

**Risque d'être coupé** — correctifs « quoi qu'il arrive » seulement (plantage, exception, NaN, état qui survit, sauvegarde, fuite, coût) ; le polissage est différé et listé dans le rapport :
- salles : supérette, banque, commissariat, voyance, casino, club, karaoké, bowling, sandwich, sport, métro, pharmacie, tour, musée, Site 51 ;
- activités : tour de contrôle, manèges, surprises des toits, métiers dépanneuse et police, mission courte `course`, stand de tir ;
- systèmes : OVNI et rayon tracteur, véhicules de piste de l'aéroport, chrono du taxi.

**Prioritaire** — en tête du plan, à égalité avec les plantages :
- la première session : le chargement (`construireVille` synchrone, ~25 s à mesurer), `#errBox` qui n'existe pas, `eruda` à ne pas oublier, les deux notifications qui chassent l'objectif ;
- la boucle de combat : `lancerVague`, `majVagues`, `WANTED`, la mission `purge` qui ignore deux gangs, les cartes de bonus à `pointerdown` ;
- l'économie et la sauvegarde : `META`, `fusionMeta` (le `typeof null` qui empêche de relire `META.garage`), `DICOS_OUVERTS`, les compteurs de `stats` affichés à zéro, le farming par la « vague 0 » (tout se remet à zéro à chaque partie et rien n'oblige à lancer la vague 1) et les missions courtes sans plafond ;
- ce qui reste : armurerie, concession, garages et « Mes véhicules », villa et planques, défis, laverie, aquarium, serre, radio, ciné, arcade, chalutier, Dépôt, boutique ; derby, ball-trap, Fort Reyes, Supercross, Badlands, centre sportif, courses `RIDE_DEFS`, métiers taxi, ambulance, pompier ;
- la vue à la première personne et la vue immersive (la fluidité en ville, jamais mesurée sur l'appareil).

Et une consigne pour demain, hors de la nuit : la première chose à faire après avoir répondu aux dix questions est de **mesurer** — construire la ville sur l'iPhone, lire le temps, et poser les quinze événements. Tout ce document est écrit sans un seul chiffre venu d'un joueur.
