Chantier « Canaux V3 » : le côté est rendu à l'eau, des ponts-levis pour les gros bateaux, tous les bateaux pilotables, un chantier naval pour les personnaliser, une fête au cœur des résidences.

Lis d'abord :
- CLAUDE.md en entier ;
- la section « Canaux de Los Reyes » ;
- rapport_nuit/CANAUX.md et rapport_nuit/CANAUX_V2.md (ce qui a été fait, les décisions, le relevé du périmètre).

Toutes les règles de CLAUDE.md s'appliquent : édition ciblée, français partout, un seul fichier, aucun tirage de plus pendant la génération de la ville, dtJeu pour ce qui décide du jeu, tests qui lisent la source, rendus réels pour le visuel, clés fixes dans META.

Organisation :
- Vérifie avec git que les branches des passes précédentes sont fusionnées ; sinon, pars de la plus récente et note-le.
- Travaille sur une branche `canaux-v3` et commit après chaque étape qui marche.
- Suivi : rapport_nuit/CANAUX_V3.md (liste à cocher par phase, décisions, mesures, captures avant/après dans rapport_nuit/captures/canaux_v3/).
- À la fin : mets à jour CLAUDE.md (section des canaux, carte du fichier, ancres).
- Je ne serai pas là pour répondre : décide, note la décision dans le suivi et continue. Arrête-toi seulement devant une décision irréversible.

## LES CAPTURES DU PLAYTEST (iPhone)
Dans rapport_nuit/canaux_refs/v3/. Ouvre-les toutes avant de commencer, et note dans le suivi ce que tu vois sur chacune :
- **A_3D_pont_bois_bloc_sombre.png** : le pont en bois, les villas au loin. Au premier plan, un grand bloc gris foncé générique au bord du quai.
- **B_3D_rangee_villas_quai_vide.png** : la rangée de villas avec pontons et bateaux (réussie). Au premier plan, un grand quai vide en asphalte et en dalles, avec un kiosque isolé, et encore un bloc sombre.
- **C_3D_plage_et_mer.png** : la plage et la mer (référence de ce qui fonctionne).
- **D_3D_passerelle_arche_quai_vide.png** : la passerelle en arche, un pont en bois, un quai d'angle vide avec un kiosque, un bloc sombre.
- **E_2D_bord_est_desert_plage.png** : le bord est du quartier, vu de dessus. Le désert arrive en coupe franche contre la ville et contre la plage, et un grand immeuble blanc à piscine est collé au désert.
- **F_2D_nuit_bassin_est_recouvert.png** : de nuit, le bras est et son bassin rond sont à moitié recouverts par le sol du désert. L'eau passe SOUS le sable. Une bande de terre et des lampadaires sans rôle longent le quartier.
- **G_2D_nuit_canal_est_bande_verte.png** : le canal est, puis une bande de terre, puis une bande verte inutile, puis le mur.

## CE QUE JE DEMANDE
1. **Le côté est rendu à l'eau.** La partie droite du quartier, à moitié recouverte de désert et de mer, est étrange : ce doit être de l'eau. Prends sur la bande verte (et la bande de terre) entre le quartier et le désert, qui ne sert à rien, pour lui donner un vrai rôle.
2. **Des jonctions beaucoup plus travaillées** entre désert, sable de plage, ville et eau.
3. **Des entrées des bras de mer beaucoup plus travaillées.** On voit aujourd'hui un trait blanc de chaque côté de chaque embouchure.
4. **Remplir les zones vides.** Un chantier naval où l'on entre par la mer pour personnaliser son bateau, à côté d'un garage à voitures. Et de la vie au centre du quartier : un lieu de fête au milieu des résidences, en point central.
5. **Tous les bateaux de la zone résidentielle pilotables.** De nouveaux bateaux aussi réalistes que les voitures : jet-skis, un bateau de course ultra-rapide, des yachts, des bateaux en bois à l'ancienne. Refais les anciens si nécessaire.
6. **Tous les bateaux peuvent sortir en mer.**
   - Un côté du quartier accueille les GROS bateaux, avec des ponts-levis qui se lèvent quand un bateau arrive, et parfois quand on passe en voiture.
   - L'autre côté garde les ponts en dur actuels (même style), pour les petits bateaux.

## PROTECTIONS (inchangées, bloquantes)
- **Le relevé du périmètre** (rapport_nuit/outils/releve_canaux.js) est relancé après chaque phase et comparé à la référence. Aucun lieu, porte, véhicule posé, destination ou point d'apparition ne disparaît, ne tombe à l'eau ni ne devient inaccessible. Ajoute à la liste ce qui borde le côté est :
  - le mur d'enceinte et la bordure est (mkEnceinte, mkBordureEst, LIMITE_EST) ;
  - l'aérogare et sa dépose-minute ;
  - l'arène de derby ;
  - le Skatepark XXL ;
  - la crique et la plage ;
  - le galion.
  Rien de tout ça ne bouge, sauf décision notée et justifiée.
- **Déterminisme** : tout est construit sur le générateur privé, en fin de décor, avec la même empreinte de la ville hors zone.
- **Le réseau d'eau** : toute modification passe par dansCanal ET le graphe de navigation, et repasse tous les tests des canaux et de la police maritime.

## PHASE 1 — LE CÔTÉ EST, LES JONCTIONS, LES EMBOUCHURES

### 1a. Rien ne recouvre l'eau
- Trouve ce qui passe par-dessus l'eau du bras est et du bassin (capture F) : dalle de désert, décor du désert fusionné, sol du littoral, transition de sol, ordre de SOLS.
- Corrige à la source : le motif existant, c'est le décor du désert replié sous le sol comme au Skatepark XXL et au derby, et les dalles posées par solRect.
- Test : un balayage de points sur toute l'eau du quartier, en lancer de rayon sur le rendu réel. Aucun point d'eau ne touche autre chose que l'eau ou un pont.

### 1b. Le grand canal est (le côté des gros bateaux)
Prends sur la bande verte et la bande de terre de l'est pour en faire de l'eau, sans toucher le mur, l'aéroport ni le derby :
- **Un grand canal est**, large, qui longe tout le quartier. Il a sa propre embouchure large vers la mer, avec deux jetées d'enrochements, et rejoint le réseau des canaux. C'est l'entrée des gros bateaux.
- **Une marina des yachts**, un bassin large au nord-est : pontons flottants à doigts, catway, bornes eau et électricité, capitainerie, station-carburant nautique, grue de levage et aire de carénage.
- **La rive est du canal** fait la transition vers le désert :
  - un quai d'un côté ;
  - de l'autre, une berge d'enrochements et une promenade surélevée ;
  - puis des dunes plantées (oyats, ganivelles, cactus, rochers) qui montent doucement vers le désert.
  Fini la coupe franche.

Mesure les largeurs sur la physique réelle : deux gros yachts doivent s'y croiser, un yacht doit faire demi-tour dans la marina.

### 1c. Les jonctions de sols
Retravaille toutes les jonctions visibles autour du quartier (captures E, F, G) :
- **désert / ville** : bordure, talus de sable, végétation de dune ;
- **désert / plage** : cordon dunaire, laisses de mer ;
- **plage / quai** : escaliers, rampe ;
- **plage / eau d'un canal** : berge de sable en pente douce ou enrochements ;
- **ville / promenade** : rien de nu, rien de coupé net.

Réutilise mkTransitionsSols et SOLS (le matériau le plus meuble déborde, fondu ondulé), et ajoute ce qui manque pour le sable et l'eau douce. Capture chaque jonction avant/après.

### 1d. Les embouchures (les deux d'origine et la nouvelle)
- Trouve l'origine des traits blancs de chaque côté, sur un rendu réel : écume du littoral (mkLittoral) qui coupe l'embouchure en ligne droite, couronnement de quai, bande de transition, z-fighting. Corrige la cause, pas le symptôme.
- Chaque embouchure devient un vrai chenal :
  - deux musoirs (têtes de jetée arrondies en enrochements, feu vert à tribord et rouge à bâbord, allumés la nuit) ;
  - des bouées de chenal ;
  - le sable qui descend dans l'eau en pente ;
  - l'écume du rivage qui suit le nouveau contour et s'interrompt proprement au chenal ;
  - un léger courant visuel.
  Aucune ligne blanche artificielle.

## PHASE 2 — LES PONTS-LEVIS (côté des gros bateaux) ET LES PONTS EN DUR (côté des petits)

### La règle de navigation
- Chaque bateau a un **tirant d'air** (hauteur au-dessus de l'eau, mesurée sur son modèle et notée dans VEHDEFS, par exemple `hautNav`).
- Chaque pont fixe a un **dégagement** mesuré.
- Un bateau plus haut que le dégagement heurte le tablier (solide pour lui). Un plus petit passe dessous.
- Le graphe de navigation connaît, pour chaque arc, la hauteur maximale autorisée. Les ponts-levis ouverts la lèvent.

### Le côté des petits bateaux (ouest)
- Les ponts en dur actuels sont gardés, dans le même style (pont vénitien, promenade Art déco, pont en bois, passerelles).
- Seuls les petits bateaux y circulent : jet-skis, open, bateau de course, runabouts en bois, vedettes de police.
- Les gros bateaux n'y sont jamais amarrés.

### Le côté des gros bateaux (est)
Un ou deux ponts-levis à bascule, à deux volées, sur le grand canal est entre la mer, la marina et le réseau. Cinématique sur dtJeu :
1. Feux qui clignotent et sonnerie.
2. Barrières qui se baissent (solides).
3. Tablier qui monte (environ 70°, en 4 à 6 s).
4. Il reste ouvert tant qu'un bateau est dans la zone du pont, plus une marge.
5. Il redescend, et les barrières se relèvent.

Mécanisme visible : contrepoids, vérins ou crémaillère, cabine de l'éclusier allumée. Son du moteur.

**Déclenchement :**
- un bateau plus haut que le dégagement, joueur ou IA, qui approche du pont par le graphe et va vers lui ;
- une ou deux unités de yachts IA font régulièrement l'aller-retour mer ↔ marina (toutes les 2 à 4 minutes de jeu), sur le graphe, et l'ouvrent : c'est le « parfois quand on passe en voiture ».
Ne jamais commencer à lever si un véhicule ou un piéton est sur le tablier.

**Voitures et piétons :**
- le trafic, la police et les piétons s'arrêtent à la ligne d'arrêt devant la barrière : obstacle connu de majTrafic et de obstacleSurVoie, et file d'attente propre ;
- une poursuite de police se bloque aussi : c'est une façon de semer (voulu) ;
- **le joueur qui force la barrière** à pleine vitesse pendant la montée : le tablier devient un tremplin. Saut réel avec la vitesse de montée, réception sur l'autre volée ou sur la rive, sinon dans le canal (noyade existante). Un clin d'œil de film, jamais un blocage ni une traversée du tablier ;
- tablier levé, il n'est jamais une chaussée : aucune voiture ne roule dans le vide sans sauter.

**Bateaux :**
- tablier baissé, un gros bateau le heurte ; un petit passe dessous ;
- le bateau du joueur ne reste jamais coincé sous un tablier qui descend : on ne descend pas tant que la zone n'est pas libre.

**Police maritime :** les vedettes passent sous les ponts baissés. Les gros bateaux IA attendent l'ouverture au point d'attente du graphe.

**Carte :** sur la minimap, l'icône de chaque pont-levis montre son état (rouge ouvert, vert fermé).

## PHASE 3 — TOUS LES BATEAUX PILOTABLES, DE NOUVEAUX MODÈLES

### Tous pilotables, sans exploser les performances
Aujourd'hui, la plupart des bateaux des villas sont du décor. Ils deviennent tous pilotables par **promotion à la demande** :
- au loin, un bateau amarré reste une instance légère (partagée et fusionnée, solide pour les bateaux) ;
- quand le joueur s'en approche (portée à régler, par exemple 25 u, ou la portée du bouton MONTER), il est remplacé, à la même place et avec le même modèle, la même livrée et la même assiette, par un vrai véhicule ;
- loin et intact, il redevient une instance ;
- s'il a été déplacé, il reste un vrai véhicule tant qu'il est près, puis il est rendu à son poste ou retiré proprement (libererEntite) ;
- plafond de bateaux promus à la fois.

Mesure dans resoudreCollisionsVehicule et majVehicules (règle de CLAUDE.md : tout parc garé s'ajoute aux 120). Aucune apparition visible : c'est le même bateau.

### Chaque bateau peut sortir en mer
- Au placement, chaque bateau amarré est vérifié sur le graphe avec SON tirant d'air : il existe un chemin jusqu'à la mer (ponts-levis compris).
- Les gros bateaux ne sont amarrés que côté est et à la marina. Ceux qui ne passent pas sont déplacés.
- Test sur tous les bateaux posés.

### Les nouveaux bateaux
Au niveau des voitures V4 : coque lissée (formeBateauV4, coqueVedetteV3, loftV4), vraies proportions, intérieur, pilote à sa place (debout, assis ou à califourchon), hélices animées, feux de navigation, sillage et éclaboussures, cockpit de 1re personne (CK_HAB, COCKPIT_DEFS, cadrans propres), inclinaisons (nez qui se lève, gîte), son moteur propre.

Chacun a une fiche VEHDEFS complète (dimensions, vmax, acc, maniabilité, PV, eau:true, hautNav) et entre dans les tests « Véhicules V3/V4 », « Vedettes V3 » et « Cockpits V2 ». Une fiche par modèle dans rapport_nuit/BATEAUX_V5.md (modèle réel dont il s'inspire, signature, livrée), avec captures avant/après et cockpit.

1. **Jet-skis** (2 ou 3 modèles) : à selle (sport), à bras debout, trois places de balade. Coque, guidon, cale-pieds, gerbe arrière. Pilote à califourchon, casque ou lunettes. Refais celui d'aujourd'hui à ce niveau.
2. **Bateau de course ultra-rapide** (offshore « cigarette » ou catamaran de course) :
   - le plus rapide de tous les bateaux ;
   - coque en V profond ou catamaran, double moteur, hélices de surface, arceau, sièges baquets, livrée de course numérotée ;
   - il déjauge (le nez se lève, la coque saute de crête en crête en mer) ;
   - sillage énorme, son rauque.
   Bas sur l'eau : il passe sous les ponts en dur.
3. **Yachts pilotables** :
   - un yacht à moteur moyen (flybridge, plateforme de bain, salon vitré) ;
   - un yacht de pêche sportive à tour (référence : rapport_nuit/canaux_refs/3_villas_mediterraneennes_yacht.png).
   Gros tirant d'air : côté est seulement. Le méga-yacht « Reyes Royale » existant reste en mer.
4. **Bateaux en bois à l'ancienne** :
   - un runabout vernis des années 60 (acajou, filets clairs, pare-brise chromé, sièges cuir, drapeau à la poupe) ;
   - un canot à cabine en bois (cruiser classique, hublots, bastingage chromé).
   Petits : côté ouest possible.
5. **Les anciens bateaux** (bateau, bateauP, yacht « Impérial », espadon, peche, kayak, et les autres de VEHDEFS de type bateau) : évalue chacun face à ce niveau dans le suivi, et refais ceux qui sont en dessous (même mécanique V3/V4, physique et stats inchangées sauf raison notée).

Répartis-les dans le quartier :
- **côté est et marina** : yachts, gros bateaux ;
- **pontons des villas de l'ouest** : jet-skis, runabouts, open ;
- **le bateau de course** : au moins un, à un endroit qui donne envie (devant la plus belle villa, ou au chantier naval).

## PHASE 4 — LE CHANTIER NAVAL ET LE GARAGE À VOITURES
Remplace un bloc sombre générique (captures A, B, D) par un bâtiment double, au bord de l'eau côté est ou près de la marina : **l'atelier « Marée Basse »** devient ce chantier.
- **Côté rue : un garage à voitures.** Le GARAGE DU PORT existant (id g_port, GARAGES_TUNING) y est déplacé avec deplacerPorte si c'est cohérent, en gardant son accès en voiture, sa salle partagée et REPLIS. Sinon, garde-le où il est et note pourquoi.
- **Côté eau : le chantier naval**, avec un hangar à bateaux à porte basculante sur l'eau, où l'on entre EN BATEAU par la mer (comme on entre au garage en voiture : « ENTRER AU CHANTIER », bouton au ponton d'entrée).
  - **Salle** (INTDEFS, sur le modèle de la salle tuning) : hangar à flot, cale de halage, bateau sur ber ou sur sangles de levage, établis, moteurs suspendus, pots de vernis. Un modèle d'exposition qui tourne, ou que l'on tourne au doigt.
  - **Personnalisation**, sur le modèle exact du garage :
    - « Mes véhicules » (META.vehPerso, VEHPERSO_MAX), les améliorations appartenant au bateau ;
    - aperçu avant achat, une pièce se paie une fois, garde d'entrée propre à chaque achat, casse à 25 % ;
    - éligibilité déclarée dans VEHDEFS (tuningMeca pour les bateaux, nouveau `tuningNaut:{famille, ancrages}`) ;
    - familles : jetski, course, open, bois, yacht.
  - **Mécanique** : moteur, hélice, coque (glisse), blindage, nitro (hors des salles, comme les voitures).
  - **Style** : peinture de coque, livrée (bandes, flammes, damier de course), couleur du pont, T-top, arceau ou hardtop, pare-brise, sièges, sono, néons sous la coque, feux, nom peint sur la coque (choisi dans une liste), drapeau.
  - Prix groupés dans TUNING_PRIX (section bateaux).
  - **Persistance** : toute nouvelle catégorie de pièce a sa clé FIXE déclarée dans vehPersoMetaDefaut (sinon fusionMeta la perd au rechargement). Ajoute un test de rechargement.
  - **Sortie** : le bateau ressort à flot devant la porte, sur l'eau, jamais dans un solide. Entrée possible en pleine poursuite, comme au garage (même règle « trop chaud »).

## PHASE 5 — LE LIEU DE FÊTE CENTRAL ET LES ZONES VIDES

### La fête, au point central des résidences
Au centre du quartier, accessible à pied, en voiture et en bateau :
- un beach club ou pool party (nom à trouver, par exemple « Le Lagon ») ;
- grande piscine et plage de sable, bar tiki, scène et cabine de DJ, piste de danse, transats et lits de plage ;
- guirlandes et lampions, pontons d'accostage où les fêtards arrivent en bateau (bateaux IA qui accostent et repartent, sur le graphe) ;
- des dizaines de figurants (figurant()) qui dansent, boivent, plongent, se baignent ;
- la musique s'entend en approchant et monte avec la proximité ;
- la nuit : jeux de lumière, feux d'artifice de temps en temps (réutilise ceux de la jetée) ;
- la Brigada a une zone VIP gardée, les Dockside Boys traînent au bar.

Interactions, en réutilisant l'existant sans nouveau système :
- danser (DANSE du Club Néon, pourboire une fois par vague) ;
- boire au bar (P.ivresse) ;
- plonger du ponton ;
- un tir ou un véhicule lancé déclenche la panique (figurants).

### Les zones vides
Plus aucun quai nu, plus aucun bloc sombre générique dans le quartier.
- Pour chaque grand bloc sombre, identifie ce qu'il est (lieu, porte, rien) :
  - s'il porte un lieu ou une porte : refais son extérieur dans le style du quartier sans bouger la porte ;
  - sinon : remplace-le.
- Les quais vides (captures B, D) deviennent une vraie promenade :
  - lampadaires, bancs, palmiers en bacs ;
  - terrasses de café et glacier, food trucks ;
  - station de location de jet-skis et de kayaks (des véhicules pilotables garés, pas un nouveau système) ;
  - pêcheurs, marché aux poissons, aire de jeux ;
  - figurants qui se promènent.
- Les kiosques isolés sont intégrés à ces ensembles.

## PHASE 6 — CARTE, AMBIANCE, PERFORMANCES
- **Minimap et grande carte** : grand canal est, marina, ponts-levis et leur état, chantier naval (icône bateau), lieu de fête, nouvelles jonctions.
- **Balises** : chantier naval, fête, marina.
- **Performances iPhone** : budget fixé au départ, puis mesure avant/après au centre du quartier, à la marina, à la fête de nuit et en survol (temps d'image, appels de rendu, triangles, nombre de véhicules réels). Si le budget casse, réduis le détail lointain et le plafond de bateaux promus, pas la densité proche.

**Ordre strict des phases**, chacune vérifiée avant la suivante. Si le temps manque, livre complètes et vérifiées les phases 1 à 3 plutôt que tout à moitié.

## VÉRIFICATIONS (bloc « Canaux V3 » dans scenarios.js, listes lues dans la source, pilotes au joystick réel)
1. **Eau** : balayage du rendu réel, aucun sol par-dessus l'eau. Aucune ligne blanche aux embouchures (capture et mesure de pixels de part et d'autre de chaque chenal).
2. **Jonctions** : capture de chaque jonction avant/après dans le suivi.
3. **Grand canal est** : un yacht entre depuis la mer, passe le ou les ponts-levis, fait demi-tour dans la marina et ressort.
4. **Ponts-levis** :
   - ouverture à l'approche d'un gros bateau, fermeture une fois la zone libre ;
   - jamais de levée avec un véhicule sur le tablier ;
   - le trafic et la police attendent à la barrière, sans blocage durable (simulation de 120 s) ;
   - les yachts IA les ouvrent périodiquement ;
   - le joueur qui force la barrière saute, sans jamais traverser le tablier ;
   - un petit bateau passe dessous tablier baissé, un gros le heurte.
5. **Ponts en dur** : le dégagement est respecté (un gros bateau est bloqué, un petit passe).
6. **Tous les bateaux posés** :
   - promus à l'approche, sans saut de position ;
   - pilotables ;
   - rendus en instance au loin ;
   - chacun a un chemin jusqu'à la mer avec son tirant d'air ;
   - nombre de véhicules réels plafonné.
7. **Nouveaux bateaux** : passent « Véhicules V3/V4 », « Vedettes V3 » et « Cockpits V2 ». Le bateau de course est le plus rapide (mesuré) et déjauge. Captures avant/après de chaque modèle et de chaque ancien refait.
8. **Chantier naval** :
   - entrée en bateau, aperçu, achat, une pièce payée une fois, casse ;
   - sortie à flot ;
   - rechargement de la sauvegarde avec des pièces de bateau (rien de perdu) ;
   - refus à pied et en voiture côté eau ;
   - le garage à voitures fonctionne toujours en voiture.
9. **Fête** : figurants, musique, danse, panique ; bateaux IA qui accostent et repartent sans jamais rester coincés.
10. **Rien de cassé** : relevé du périmètre identique hors zone, avec les ajouts de l'est. Tous les anciens tests des canaux, de la police maritime, des planques, du garage, du derby, du skatepark XXL et de l'aéroport repassent. Puis valider.js et la suite complète de scenarios.js, sans régression.
11. **Empreinte de la ville** identique hors zone.
12. **Captures Puppeteer réelles** en 390×844, aux mêmes cadrages que les captures du playtest (A à G) pour comparer avant/après, plus : un pont-levis levé avec un yacht dessous, le saut de la barrière, le chantier naval dedans, la fête de nuit, le bateau de course lancé.
13. **Performances** avant/après, budget respecté.

Les performances réelles et le ressenti se jugeront sur iPhone : ne les déclare pas validés. Si une vérification n'a pas pu être faite, dis-le explicitement.

## RESTITUTION (fin de CANAUX_V3.md)
- Ce qui a changé et les fichiers modifiés.
- La nouvelle carte du côté est.
- Les ponts-levis : où, quand ils s'ouvrent.
- La liste de tous les bateaux (nouveaux, refaits, pilotables, où ils sont).
- Les pièces du chantier naval et leurs prix.
- Les décisions prises seul.
- Ce qui a été déplacé (avant/après).
- Les mesures.
- Ce que je dois regarder en priorité sur l'iPhone.
