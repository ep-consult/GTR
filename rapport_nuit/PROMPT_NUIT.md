# Nuit GTRoyal — réflexion stratégique puis revue technique

Tu as toute la nuit, un compte Max, et personne pour répondre à tes questions avant demain matin. La nuit a deux parties qui s'enchaînent : d'abord un document de réflexion sur ce que le jeu est et doit devenir (Partie 1, aucune modification de code), puis une revue technique globale (Partie 2) dont les priorités sont filtrées par ce document.

Avant tout : récupère la vraie date avec `date` et utilise-la pour tout ce que tu écris de daté (plusieurs libellés du CLAUDE.md portent des dates fausses, « 16, 17, 18 octobre » : ne pas reproduire, les signaler dans le rapport). Crée la branche `nuit-revue-globale` depuis la branche courante : tout le travail de la nuit va dessus, documents compris. Ne touche jamais à la branche de départ, ne fusionne rien : je fusionnerai moi-même demain.

---

# Partie 1 — Réflexion : design, boucle de jeu, rétention, modèle économique

Tu ne touches PAS au code dans cette partie : tu lis, tu analyses, tu écris un document. Aucune modification d'index.html, de scenarios.js ni de CLAUDE.md.

## Ce que tu lis d'abord
CLAUDE.md en entier (c'est l'inventaire réel du jeu), PLAYTEST.md, rapport_nuit/RAPPORT.md, RENOMMAGE.md, catalogue.html. Puis index.html par tranches ciblées via la carte du CLAUDE.md : META et la sauvegarde, DEFIS et DEFIS_THEMES, CURIOS, les vagues (lancerVague, majVagues), startRun et mourir, l'écran titre et le game over, INTDEFS, VEHDEFS, TENUES, les prix (TUNING_PRIX, CATALOGUE, PRIX_VILLA, DERBY_PRIX, les gains de chaque mini-jeu), PUB_X2, treveActivite. Tu dois pouvoir répondre précisément : qu'est-ce qu'un joueur fait dans ses 5 premières minutes, quelle est la boucle d'une partie, qu'est-ce qui persiste entre deux parties, qu'est-ce qui coûte de l'argent, qu'est-ce qui en rapporte et à quel rythme.

## Le document : `rapport_nuit/STRATEGIE.md`, en français, écrit pour être lu sur un téléphone au réveil
Chaque affirmation sur le jeu doit citer ce qu'elle lit (nom de fonction, constante, salle). Pas de marketing, pas de « jeu révolutionnaire » : tu écris pour le développeur solo qui va devoir choisir.

1. **Ce que le jeu est vraiment aujourd'hui** (2 pages max). Pas ce qu'il voudrait être. Genre réel, promesse implicite de l'écran titre, boucle de base telle que le code la définit, durée d'une partie type, ce qui pousse à relancer (défis à réclamer, curiosités, collection de véhicules, planques, tenues), ce qui ne pousse à rien. Inventaire des systèmes classés en trois colonnes : cœur du jeu / bon contenu périphérique / contenu orphelin (jouable une fois, sans lien avec le reste). Sois dur : un système qui existe « parce qu'il a été demandé un jour » n'est pas un système qui mérite d'exister.

2. **Le trou** : ce qui manque pour qu'un inconnu qui installe le jeu comprenne en 60 secondes ce qu'il doit faire, et ait une raison de rouvrir l'app le lendemain. Première session minute par minute telle qu'elle se passe aujourd'hui (tu l'as lue dans startRun et l'écran titre), puis les moments où il décroche probablement, et pourquoi.

3. **Trois directions**, pas une. Chacune cohérente avec Los Reyes, les quatre gangs (Sunset Vipers, Los Calaveras, Dockside Boys, Krasnaya Brigada et leurs chefs), les curiosités, les planques et la villa, et réutilisant au maximum l'existant. Pour chacune : la promesse en une phrase, le but du jeu (qu'est-ce que « finir » veut dire, ou pourquoi il n'y a pas de fin), le fil d'histoire minimal (qui est le joueur, pourquoi il est là, qui lui en veut, comment les 27 salles et les activités s'y rattachent ou pas), la boucle courte (une partie), la boucle longue (une semaine), ce que la direction impose de COUPER ou de mettre en retrait, ce qu'elle impose d'AJOUTER (le moins possible), et un ordre de grandeur de travail en jours de développement avec l'outillage actuel. Au moins une des trois directions doit n'ajouter presque rien et surtout réorganiser et couper.

4. **Rétention, concrètement** : pour la direction que tu recommandes, les mécaniques de retour (objectifs quotidiens, progression visible, séries, événements de vague, collection, récits par gang) en te limitant à ce qui se construit sur META tel qu'il existe, avec les champs à ajouter et la compatibilité des sauvegardes (DICOS_OUVERTS). Dis aussi ce qu'il faut MESURER pour savoir si ça marche : une liste d'événements analytics (10 à 15 maximum, nom, moment, propriétés), parce qu'aujourd'hui rien n'est mesuré et aucune décision de rétention ne pourra être prise sans ça.

5. **Argent**, honnêtement. Les options compatibles avec un jeu HTML mono-fichier publié via Capacitor : premium payant une fois, gratuit avec pubs récompensées (PUB_X2 est déjà une coquille), achats cosmétiques (tenues, peintures, véhicules — tout existe déjà en jeu contre de l'argent fictif), abonnement. Pour chaque : ce que ça demande techniquement (SDK natif, compte Apple/Google, règles des stores, âge et contenu — c'est un jeu où l'on renverse des piétons et braque des banques : regarde ce que ça implique pour la classification d'âge et la publicité), ce que ça change au design (une économie prévue pour un joueur qui paie en argent réel se calibre autrement), des fourchettes de revenus réalistes pour un jeu solo sans budget marketing, sourcées par ta connaissance du marché et clairement marquées comme estimations. Termine par une recommandation et ses conditions d'échec.

6. **Ce qu'il faut couper**, liste nominative, avec pour chaque élément la raison et ce qu'on perd. Un développeur solo ne maintient pas 27 salles et 40 véhicules jusqu'à la publication : dis lesquels garder.

7. **Les 10 questions auxquelles seul le développeur peut répondre**, formulées pour qu'on puisse y répondre par une phrase chacune, dans l'ordre où elles débloquent le reste. C'est la fin du document.

8. **Impact sur la nuit technique à venir** : d'après ta recommandation, qu'est-ce qu'il ne faut PAS durcir ni optimiser parce que ça risque d'être coupé, et qu'est-ce qui devient prioritaire. Deux listes nominatives (salles, activités, systèmes) : « risque d'être coupé » et « prioritaire ».

## Méthode
Travaille avec des sous-agents en parallèle pour la lecture (un sur l'économie et META, un sur les salles et activités, un sur la première session et l'écran titre, un sur le marché et les stores), mais le document final est écrit d'une seule voix, relu, sans redite. Pas de diagramme ASCII, pas de listes à rallonge là où trois phrases suffisent. Si deux parties du code se contredisent sur l'intention du jeu, dis-le, c'est précisément ce qu'on cherche.

Quand `rapport_nuit/STRATEGIE.md` est écrit, relu et committé, passe à la Partie 2 sans attendre.

---

# Enchaînement : ce que la Partie 1 impose à la Partie 2

1. La section 8 de STRATEGIE.md devient le filtre de la Partie 2. Tout ce qui y est marqué « risque d'être coupé » reçoit UNIQUEMENT les correctifs de la catégorie « quoi qu'il arrive » : plantage, exception dans le tick, NaN, état qui survit au game over ou au rechargement, compatibilité des sauvegardes, fuite mémoire, coût de chargement, coût par image. Il ne reçoit pas de polissage (règle des 8 u, pilote simulé manquant, HUD de la salle, textes). Ce polissage sauté est listé dans le rapport, section « Polissage différé en attente de décision », avec l'estimation de travail, pour que je puisse le lancer d'un mot si je garde la salle.
2. Ce que la section 8 marque comme prioritaire remonte en tête du plan de la Partie 2, à égalité avec les plantages.
3. Le filtre vient d'un document que tu as écrit seul cette nuit : il te sert à ordonner le travail, pas à supprimer quoi que ce soit. Aucune salle, aucun véhicule, aucune activité n'est retirée du code cette nuit, même si STRATEGIE.md le recommande. Les coupes, c'est moi demain.
4. Si la Partie 1 t'a pris plus de la moitié de ce que tu estimes être la nuit, réduis la Partie 2 aux phases 0, 1-A, 1-B, 1-C, 2 (catégorie « quoi qu'il arrive » seulement) et 3. Un rapport complet sur moins de choses vaut mieux qu'un rapport tronqué sur tout.

---

# Partie 2 — Revue technique globale

## Cadre

- Toutes les règles de CLAUDE.md s'appliquent. Un commit par correctif qui passe la validation, message en français qui dit le bug et la cause.
- Aucune question ne recevra de réponse : décide seul, note chaque décision dans la section « Décisions prises seul » du rapport, et quand une décision ne peut pas être prise sans moi (design, prix, suppression d'une feature, changement de comportement visible), prépare le travail, ne l'applique pas, et liste-la dans « À trancher ».
- Pas de contenu neuf. Pas une salle, pas un véhicule, pas une activité. Cette partie sert à ce que ce qui existe soit solide, rapide, lisible et prouvé jouable. Si tu as une idée de feature, elle va dans le rapport, pas dans le code.
- Interdits absolus (déjà dans CLAUDE.md, répétés parce que c'est la nuit) : changer la clé `asphalte_save_v1`, renommer un id interne, ajouter une dépendance, découper index.html en modules, monter Three.js, régénérer le fichier en entier, modifier un matériau rendu par `mat()`, créer un objet Three.js avant `placerPortes` hors `sansAleaVille`, retirer eruda.
- Utilise des sous-agents en parallèle pour les phases d'audit (un par axe), mais une seule main écrit dans index.html à la fois : les correctifs se font en série, chacun validé avant le suivant.

## Phase 0 — État des lieux (avant de toucher au code)

1. `node valider.js` puis `node scenarios.js` (graine par défaut), puis `SEED=random node scenarios.js` trois fois. Note tout : échecs, tests SAUTÉS, durées, warnings, mémoire. C'est la référence de la nuit : rien ne doit être pire à la fin.
2. Régénère la carte du fichier (commande dans CLAUDE.md, section « Carte du fichier ») et compare avec la table du CLAUDE.md. Corrige la table et les ancres fines qui ont dérivé. Commit.
3. Mesure et note : temps de construction de la ville en headless (le rapport du 17 parle de ~25 s, jamais mesuré sur iPhone), nombre de draw calls, de géométries, de triangles au premier rendu en vue classique ET en vue immersive, coût moyen de `boucle()` par image sur 60 s simulées en 3 points de la ville (centre, Los Reyes Hills, large), coût par sous-système (`majVehicules`, `majTrafic`, `majEnnemis`, `majPietons`, `majMobilier`, `majCascades`, `majAeroVie`, `majVieHills`, le rendu). Taille de index.html. Mémoire après 3 parties successives (`libererEntite` : vérifier qu'il n'y a plus de fuite).

## Phase 1 — Audit global par axes (sous-agents en parallèle, lecture seule, chacun rend une liste priorisée : gravité × fréquence × facilité)

A. Conventions du CLAUDE.md, vérifiées systématiquement sur tout le fichier, pas à l'échantillon :
   - tout timer / chrono / jauge que le joueur subit sur `dtJeu`, tout cosmétique sur `dt` ; chercher les déplacements qui courent contre un chrono et sont restés sur `dt` (le piège du chalutier)
   - vitesses en unités par seconde, jamais par image
   - accès non gardés sur des propriétés optionnelles d'entités (`e.h`, `v.def.x`, `el('…')` sans existence garantie)
   - sons coupés dans tous les chemins de sortie, dont `mourir()` et `startRun()`, et aucune relance d'ambiance pendant `ETAT.mode==='mort'`
   - chaque chemin de paiement avec sa propre garde d'entrée ; aucune récompense double ; aucun farming infini (une limite par vague partout)
   - état des mini-jeux remis à zéro au game over ET au rechargement (comparer ce que `startRun`/`mourir` remettent à zéro avec les champs réellement posés dans chaque salle : PLAYTEST.md liste déjà `caisse.pris`, `coffre.pris`, `casier.pris`, `preuves.pris` jamais réinitialisés — trancher et appliquer la même règle partout)
   - tout dictionnaire META à clés de contenu dans `DICOS_OUVERTS` ; tout nouveau champ META fusionné proprement par `fusionMeta` ; test de compatibilité avec une sauvegarde ancienne (sans les champs récents) et une sauvegarde corrompue (JSON tronqué) : rien ne doit planter, rien ne doit être perdu
   - toute salle dans `REPLIS` ; règle des 8 unités : regarder la dette `DETTE_REGLE_8U` (26 zones dans 12 salles) et résorber ce qui se résorbe sans déplacer une zone visible de façon absurde
   - toute entité au sol honore `captureOvni` ; toute entité recréée à chaque partie passe par `libererEntite`
   - aucune fonction déclarée deux fois (le test l'interdit déjà : vérifier qu'il couvre bien tout le `<script>`), aucun `const` module utilisé avant déclaration
   - `fusionnerDecor` et `userData.garder` / `userData.partagee` cohérents
B. Robustesse runtime : exceptions possibles dans `boucle()` (une seule exception dans le tick gèle le jeu sur iPhone), NaN propagés (le piège de l'hélico : moteur NaN → exception → appareil détruit), divisions par zéro, `try/catch` qui avalent des erreurs silencieusement, timers `setTimeout` qui survivent à `startRun`, écouteurs ajoutés plusieurs fois.
C. Performance mobile : allocations par image dans le tick (`filter/map/some`, objets littéraux, closures, `new THREE.Vector3`), `getElementById` par image hors `HUDC`, textures canvas redessinées trop souvent, shaders coûteux par pixel d'eau (mer V2 : « une dizaine de sinus par pixel, à surveiller »), objets jamais cullés, lumières réelles en trop, `InstancedMesh` sans sphère englobante, parcs de véhicules garés qui gonflent `majVehicules` (208 véhicules), coût du chargement (les ~25 s). Cible : un iPhone récent en portrait doit tenir 60 i/s en ville en vue immersive, et le chargement doit baisser nettement sans toucher au rendu final.
D. HUD et tactile en portrait 9:16 : boutons qui se chevauchent, libellés sur plus de deux lignes, éléments sous les safe-areas, panneaux de mini-jeux qui cachent l'action 3D (vérifier en rendu réel pour chaque salle à panneau), lisibilité des toasts, pastille des défis, radar, bouton 3D/2D. Tout ce qui s'est ajouté en octobre (rangée sous les étoiles, notifications à +206 px) : vérifier qu'il n'y a plus de recouvrement, à 1 170×2 532 et à 1 179×2 556.
E. Jouabilité prouvée : chaque mini-jeu et chaque activité (27 salles, courses `RIDE_DEFS`, métiers, derby, ball-trap, stand, tour de contrôle, basket, foot, wakeboard, parachute, wingsuit, saut du Vertige, BIG JUMP, parcours du combattant, manèges, Gaston, laverie, serre, radio, ciné, chalutier, bornes d'arcade) doit avoir un pilote simulé qui gagne ET un passif/maladroit qui perd. Lister ceux qui n'ont pas les deux ; vérifier que les gains ne permettent pas de farmer ; vérifier qu'abandon en plein jeu, mort pendant, sortie de salle, rechargement remettent tout d'équerre.
F. Cohérence éditoriale : « GTRoyal » avec la casse exacte partout (textes, enseignes, textures canvas, toasts), « Los Reyes » partout, aucune trace d'ancien nom hors clé de save et ids internes, noms de gangs affichés via `NOMS_GANG`, français partout, fautes dans les textes affichés au joueur.

Fusionne les six listes en un plan unique priorisé, en appliquant le filtre de l'Enchaînement (section 8 de STRATEGIE.md). Écris-le dans le rapport AVANT de corriger (section « Plan de la nuit »), avec ce que tu feras, ce que tu ne feras pas et pourquoi.

## Phase 2 — Correctifs, du plus grave au plus cosmétique

Pour chaque point retenu :
1. Localiser via la carte, lire la tranche, corriger ce passage seulement.
2. Écrire ou étendre un test dans `scenarios.js` ou `valider.js` qui échouait avant et passe après — toujours en lisant les listes depuis la source, jamais en les recopiant ; un test maîtrise sa scène ; un saut passe par `saute(msg)`.
3. Bug visuel = rendu Three.js réel + capture dans `rapport_nuit/captures/nuit-revue-globale/`, avant/après.
4. `node valider.js && node scenarios.js` verts → commit. Un rouge que tu ne comprends pas en 20 minutes : `git checkout` du fichier, note dans le rapport, passe au suivant.
5. Mettre à jour CLAUDE.md dans le même commit si la modif déplace des lignes, ajoute un piège, ou change une règle. Les pièges trouvés cette nuit vont dans « Conventions et pièges connus », formulés comme les existants (le bug, la cause, la règle).

Ordre : plantages et NaN → état qui survit au game over / rechargement → farming et paiements doubles → perf (chargement d'abord, puis tick) → HUD portrait → zones et règle des 8 u → pilotes manquants → cohérence des textes. Les priorités de la section 8 de STRATEGIE.md s'insèrent en tête, à égalité avec les plantages.

Sur la perf : chaque optimisation est mesurée avant/après avec le protocole de la phase 0, les chiffres vont dans le rapport, et rien ne change à l'écran (comparer les captures). Si une optimisation change le rendu, elle n'est pas appliquée, elle est proposée.

## Phase 3 — Fin de nuit

1. Suite complète : graine par défaut + `SEED=random` cinq fois. Tout vert, aucun SAUTÉ nouveau. Si un test est instable, le rendre déterministe (graine propre posée après `startRun`, pas fixe au temps réel) : c'est un correctif comme un autre.
2. Relancer les mesures de la phase 0, tableau avant/après dans le rapport.
3. Vérifier `node icones/outils/integrer.js` si tu as touché aux icônes, et que `catalogue.html` s'ouvre toujours (il lit index.html et CLAUDE.md).
4. Rapport dans `rapport_nuit/RAPPORT.md`, nouvelle section « Nuit de revue globale — <vraie date> », même format que les nuits précédentes : Résumé en 10 lignes lisibles sur un téléphone au réveil ; Mesures avant/après ; Correctifs (un par ligne : symptôme, cause, fix, test) ; Décisions prises seul ; À trancher ; Polissage différé en attente de décision ; Abandonné et pourquoi ; À tester à la main sur iPhone demain (classé par ordre de valeur, avec le geste exact à faire) ; Idées non faites.
5. `git log --oneline` de la branche en fin de rapport. Ne fusionne rien.

Rappel final : la nuit est réussie si demain matin j'ai, dans l'ordre, un document qui me dit ce que mon jeu est et me pose dix questions ; puis un jeu qui fait exactement la même chose qu'hier soir, mais ne plante plus, charge plus vite, tient 60 i/s, ne perd aucune sauvegarde ; et si chaque chose que je dois décider m'attend dans une liste courte au lieu d'avoir été décidée à ma place.
