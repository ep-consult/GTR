# Renommage ASPHALTE → GTRoyal (ville : Los Reyes)

**Statut : appliqué** (phases 2 et 3 faites, voir la section 6). Point de
sauvegarde avant renommage : commit `4d3f960` « avant renommage GTRoyal » + tag git
`avant-renommage-GTRoyal`.

Périmètre recherché : `index.html`, `valider.js`, `scenarios.js`, `CLAUDE.md`,
`PLAYTEST.md`, `package.json`, `icones/` (docs, page d'aperçu, outils).
Recherche insensible à la casse et aux accents. Il n'existe **ni manifest, ni
`apple-mobile-web-app-title`, ni `application-name`, ni meta description**.
Aujourd'hui, l'iPhone affiche sous l'icône le début du `<title>`.

## 1. Gangs : le jeu en a 4, pas 6

| Id interne (inchangé) | Nom actuel | Couleur actuelle | Rôle dans le jeu | → Nouveau nom | Pourquoi |
|---|---|---|---|---|---|
| `viperes` | les Vipères | vert `#2fae4f` | Quartier industriel. Gang des 2 premières vagues (le premier rival), QG avec une voiture et la cache du fusil à pompe, chef **KAA** | **Sunset Vipers** | Même animal, même vert ; le premier rival, celui du quartier industriel. |
| `frelons` | les Frelons | jaune et noir `#e6a41f` | Quartier néon, motards (`fre_moto`), chef **DAX → EL DIABLO** | **Los Calaveras** | Imposé par ton exemple (« les Frelons » → « les Calaveras ») ; le jaune et noir convient à une tête de mort mexicaine. |
| `murenes` | les Murènes | bleu-vert `#1f6a7a` | Port et plage, nageurs, bateaux armés pendant leurs vagues, chef **SILAS** | **Dockside Boys** | Le port et les quais, c'est exactement leur territoire. |
| `chrome` | le Syndicat Chrome | argent et or `#d8dce4` / `#d8b02a` | Villas et centre-ville. Élite (PM, fusils, esquive), seulement à partir de la vague 3, chef **CÉSAR → VOLKOV** | **Krasnaya Brigada** | **Le gang riche** : un syndicat du crime installé dans les villas et le centre, où se trouvent le casino et la banque. |

**En réserve, non utilisés : Cedar Street Familia et Jade Lotus.** Le jeu n'a ni
gang allié ni « famille » du héros, ni triade. Les couleurs du code restent
toutes inchangées.

**Libellés affichés (appliqués)**, avec les articles et accords demandés :

| Affiché aujourd'hui | → Nouveau texte |
|---|---|
| Vipère / Vipère armée | Viper / Viper armé |
| KAA — CHEF DES VIPÈRES | KAA — CHEF DES VIPERS |
| Frelon / Frelon motard | Calavera / Calavera motard |
| DAX — CHEF DES FRELONS | EL DIABLO — CHEF DES CALAVERAS |
| Murène / Murène armée / Murène nageuse | Docker / Docker armé / Docker nageur |
| SILAS — CHEF DES MURÈNES | SILAS — CHEF DES DOCKSIDE BOYS |
| Sbire du Chrome / Garde du Chrome | Sbire de la Brigada / Garde de la Brigada |
| CÉSAR — TÊTE DU SYNDICAT | VOLKOV — TÊTE DE LA BRIGADA |
| `NOMS_GANG` : les Vipères, les Frelons, les Murènes, le Syndicat Chrome | les Vipers, les Calaveras, les Dockside Boys, la Brigada |
| Bandeau de vague : « VAGUE 3 — LES VIPÈRES » | « VAGUE 3 — LES VIPERS » (le texte est mis en majuscules par le JS, comme aujourd'hui) |
| Radio, appel d'auditeur : « Ouais salut, c'est les Vipères. Les Frelons sentent mauvais. » | « Ouais salut, c'est les Vipers. Les Calaveras sentent mauvais. » |
| Musée, cartel GRAFFITI : « Un frelon jaune et noir, tagué par-dessus le serpent. Les Frelons ont eu le dernier mot. » | « Une tête de mort jaune et noire, taguée par-dessus le serpent. Les Calaveras ont eu le dernier mot. » |

## 2. Titre, ville, lieux

| Où | Actuel | → Nouveau |
|---|---|---|
| `<title>` | ASPHALTE — chaos urbain arcade | GTRoyal — chaos urbain arcade |
| Écran titre (logo) | ASPHALTE | **GTRoyal**. La classe `.titre` impose `text-transform:uppercase` : je le neutralise **sur ce seul logo**. Même police, même taille (52 px), mêmes ombres et inclinaison. |
| Écran titre (sous-titre) | SOLARA CITY — CHAOS URBAIN | LOS REYES — CHAOS URBAIN |
| Titre de la grande carte | Solara City | Los Reyes |
| Radio (station 1 et salle) | SOLARA FM · Radio pirate Solara FM · enseigne SOLARA FM | REYES FM · Radio pirate Reyes FM · enseigne REYES FM |
| Musée | Musée Mémoire de Solara · enseigne MUSÉE DE SOLARA | Musée Mémoire de Los Reyes · enseigne MUSÉE DE LOS REYES |
| Tour | Tour Solara · enseigne TOUR SOLARA · défi « ascenseur de la Tour Solara » · appel radio « toit de la Tour Solara » | Tour Los Reyes (partout) |
| Banque / Casino | Banque de Solara · Casino Solara | Banque de Los Reyes · Casino Los Reyes |
| Concessionnaire | SOLARA MOTORS (enseignes en ville et en salle) | REYES MOTORS |
| Métro | MÉTRO — STATION SOLARA · STATION SOLARA · « Chaque station du plan s'appelle SOLARA. » | MÉTRO — STATION LOS REYES · STATION LOS REYES · « … s'appelle LOS REYES. » |
| Aéro-club | AÉRO-CLUB DE SOLARA (et « — VOLTIGE ») | AÉRO-CLUB DE LOS REYES |
| Dépôt de bus (panneau) | … PROPRIÉTÉ DE LA VILLE DE SOLARA … | … DE LA VILLE DE LOS REYES … |
| Enseigne en ville, bus, graffiti | SOLARA (enseigne, flanc de bus, tag) | LOS REYES (enseigne et bus) · REYES (tag, trop court pour le nom complet) |
| Événement nocturne | SOLARA NIGHTS | REYES NIGHTS |
| Curiosités | L'Étoile de Solara · « Les nuits de Solara sont moins noires » | L'Étoile de Los Reyes · « Les nuits de Los Reyes… » |
| Musée (salle) | PAVÉ N°1 « …fondation de Solara… » · MÉTÉORITE DE SOLARA | « …fondation de Los Reyes… » · MÉTÉORITE DE LOS REYES |
| Chalutier | Thon de Solara | Thon de Los Reyes |
| Tableau de la salle (texture) | SOLARA CITY | LOS REYES |
| Notifications | « La pluie s'abat sur Solara » · « Un convoi militaire traverse Solara » | « … sur Los Reyes » · « … traverse Los Reyes » |
| Menu des défis | Défis de Solara | Défis de Los Reyes |

Le Palais de l'Arcade, le Ciné-Palace, le Site 51, le Chalutier, le Dépôt de
bus, le Métro (nom de la salle) et les autres salles ne sont pas touchés, sauf
pour les phrases citées ci-dessus.

## 3. Occurrences trouvées

**Textes affichés dans le jeu (`index.html`)**

| Terme | Affichés | Autres (identifiants, commentaires, clé de save) |
|---|---|---|
| Asphalte | 5 : titre, logo, et 3 fois le film « ASPHALTE I » (nom de curiosité, tenue, cartel) | `asphalte_save_v1` (**gardée**), `texAsphalte` (texture de la chaussée, le matériau), 3 commentaires |
| Solara | 48 | 12 commentaires et identifiants |
| Vipère / Vipers | 6, dont la borne « VIPÈRE » (cas 2) | ~30 identifiants (`viperes`, `vipere`, `qgViperes`…) |
| Frelon | 9, dont « Moto "Frelon" » (cas 3) | ~25 identifiants |
| Murène | 5 | ~14 identifiants |
| Chrome / Syndicat (le gang) | 4 | « Chrome » des jantes et marchepieds chromés = matériau, **pas touché** |
| KAA · DAX · SILAS · CÉSAR | 4 noms de chefs, plus le tag « KAA » | — |
| Titre d'un autre jeu, ou « GTRoyal » mal écrit (autre casse, espace) | **0** | — |

**Autres fichiers**
- `CLAUDE.md` : 4 Asphalte, 5 Solara, 2 noms de gangs.
- `PLAYTEST.md` : 5 Solara.
- `valider.js` : 1 commentaire d'en-tête et la clé de save, gardée.
- `scenarios.js` : environ 14 libellés « Solara FM », 1 « Solara City », 2 « ASPHALTE I » en commentaire, et des libellés « Frelons » dans le test de la borne VIPÈRE.
- `package.json` : 2.
- `icones/` : 6 (titres « ASPHALTE — icônes » et titres des deux documents).

**Ce que les tests vérifient.** Aucun test ne compare un nom de gang ou de ville
affiché. Les tests de la borne et du chalutier passent par les ids internes
(`vipere`, `thon`) ; seuls leurs libellés de console changeront.

**Tenues et sauvegarde.** Aucune tenue ne porte un nom de gang. Les gangs, les
curiosités, les salles, les tenues et les scores d'arcade sont tous rangés dans
la sauvegarde par **id interne**, pas par nom : renommer les libellés ne touche
pas aux sauvegardes.

## 4. Cas ambigus : à trancher

1. **Le film « ASPHALTE I »** (curiosité « La Bobine », tenue de projectionniste, cartel du Ciné-Palace). C'est un film dans le jeu qui porte le nom du jeu. Proposition : **« GTRoyal I »**, car aucune trace d'Asphalte ne doit rester.
2. **La borne d'arcade « VIPÈRE »** est un jeu du serpent, où le serpent mange des « frelons ». Seul le nom « VIPÈRE » est affiché. Proposition : **la garder**, car c'est l'animal et pas le gang. Alternative : « SERPENT ».
3. **La moto « Frelon »** est un modèle de véhicule (jaune), sans lien affiché avec le gang. Proposition : **la garder**. Alternative : Moto « Calavera ».
4. **Les noms des chefs.** KAA convient aux Vipers, et SILAS aux Dockside Boys. DAX sonne peu latino pour Los Calaveras, et CÉSAR peu russe pour la Brigada. Proposition par défaut : **garder les 4 noms**. Alternatives si tu veux : DAX → **EL DIABLO**, CÉSAR → **VOLKOV**.
5. **Le singulier des Dockside Boys.** « Dockside Boy armé » est un peu long dans la bulle de nom des ennemis. Alternative : **« Docker / Docker armé / Docker nageur »**.
6. **« le port des Frelons »** (une destination de mission taxi). Le port est le territoire des Murènes, donc des futurs Dockside Boys. Proposition : **« le port des Dockside Boys »** plutôt que « … des Calaveras ».
7. **Un défaut français existant.** Le jeu affiche aujourd'hui « Le chef de **les** Vipères entre en scène » (2 toasts). Je propose de le corriger en même temps, avec une forme « des Vipers / des Calaveras / des Dockside Boys / de la Brigada ». Ça ajoute un petit tableau de libellés, sans renommer aucun identifiant.
8. **Sunset Vipers, « riche et frimeur ».** Dans le jeu, c'est le gang Chrome qui tient les villas et l'argent, alors que les Vipères tiennent l'industriel. J'ai gardé Vipères → Vipers pour l'animal et le vert. Si tu préfères Chrome → Sunset Vipers, il faudrait alors un autre nom pour les Vipères, par exemple Krasnaya Brigada ou Jade Lotus.
9. **Nom de l'icône iPhone.** Aucune meta ne fixe ce nom aujourd'hui. Je propose d'**ajouter** `<meta name="apple-mobile-web-app-title" content="GTRoyal">` et `<meta name="application-name" content="GTRoyal">`, pour que l'écran d'accueil affiche exactement « GTRoyal ».
10. **`package.json`, champ `"name": "asphalte"`.** npm impose un nom tout en minuscules, donc « GTRoyal » y est impossible et « gtroyal » violerait ta règle de casse. Ce nom n'est jamais affiché. Proposition : **le garder** et ne changer que `"description"` en « Outils de validation pour GTRoyal ». Il restera alors listé comme exception, avec la clé de save.
11. **Commentaires du code.** L'en-tête cite « ASPHALTE » et « ville de Solara, gangs des Vipères et des Frelons ». Ils sont invisibles, mais je propose de les mettre à jour. Le mot « asphalte » au sens de la chaussée (`texAsphalte`, « fond d'asphalte uni ») reste tel quel.
12. **L'historique git** (messages de commit, tags `avant-icones-svg`…) contient « ASPHALTE » et ne peut pas être réécrit. C'est normal.

## 5. Garanties pour la phase 2

- La clé `asphalte_save_v1` reste telle quelle. Aucun identifiant ni nom de variable n'est renommé, et toutes les couleurs restent.
- Pour le titre, seul le texte change, plus la neutralisation de la mise en majuscules sur le logo uniquement. Je vérifierai que « GTRoyal » tient dans la largeur en 390 × 844.
- Les tests liront les noms depuis le code vivant (`NOMS_GANG`, `ETYPES`, `INTDEFS`), jamais recopiés en dur.

## 6. Décisions validées et application

**Décisions validées** : chefs KAA et SILAS conservés, DAX → **EL DIABLO**,
CÉSAR → **VOLKOV** ; singulier des Dockside Boys = **Docker** ; Sunset Vipers =
premier rival du quartier industriel, la Krasnaya Brigada est le gang riche ;
Cedar Street Familia et Jade Lotus gardés en réserve ; film « GTRoyal I » ;
borne VIPÈRE, sa peluche et la Moto « Frelon » conservées ; « le port des
Dockside Boys » ; « Le chef des Vipers » (forme `NOMS_GANG_DE`) ; metas
`apple-mobile-web-app-title` et `application-name` = GTRoyal ; `package.json` :
description seule.

**Textes affichés que le premier inventaire avait manqués** (recherche mal
faite sur les formes accentuées), trouvés et corrigés en phase 2 :
- l'aide « Comment jouer » (« Vipères en zone industrielle, Frelons au quartier néon… ») ;
- le skin de personnage « Vipère » → « Viper » et la voiture « Berline Vipère » → « Berline Viper » ;
- le toast « Contrebande des Murènes » → « Contrebande des Dockside Boys » ;
- le cartel « Les Vipères sont passées par là » → « Les Vipers sont passés par là » ;
- l'alarme « Les Vipères lavaient leur argent ici ! » → « Les Vipers… ».

Deux accords ont aussi été corrigés au passage : « la Brigada débarque » au
singulier (« le Syndicat Chrome débarquent » avant), et l'initiale du gang en
majuscule en début de toast.

**Bilan des remplacements**
- `index.html` : 105 lignes modifiées (textes affichés et commentaires), plus 2 métas ajoutées et 1 règle CSS pour le logo.
- `scenarios.js` : 22 libellés.
- `CLAUDE.md` : 9.
- `PLAYTEST.md` : 5.
- Autres : 1 dans `valider.js`, 1 dans `package.json`, 4 dans `icones/`.

## 7. Vérifications de la phase 3

- **Recherche finale** : aucun ancien nom affiché ; restent seulement la clé `asphalte_save_v1`, les ids internes, `texAsphalte` (texture de route), la borne VIPÈRE, la Peluche Vipère et la Moto « Frelon » (décisions validées). Aucune forme interdite du nom, nulle part.
- **Tests** : `valider.js` OK ; `scenarios.js` 5/5 plus une graine aléatoire. Un nouveau bloc de test balaie environ 930 textes du jeu vivant, vérifie la casse et le logo, et contrôle que le « y » ne touche pas le sous-titre.
- **Captures réelles 390×844** dans `captures_renommage/` : écran titre, HUD (« VAGUE 1 — LES VIPERS » et « EL DIABLO — CHEF DES CALAVERAS »), porte et intérieur de Reyes FM, porte et intérieur du Musée Mémoire de Los Reyes.
- **Logo** : il tient dans la largeur (77 à 313 px sur 390) à 52 px, taille inchangée. Le « y » — une descendante que l'ancien titre en capitales n'avait pas — mordait de 8 px sur « LOS REYES — CHAOS URBAIN ». Une marge basse de `.2em` sur le logo laisse 2,4 px d'écart.
- **Compatibilité de sauvegarde** : une partie est faite avec l'ancienne version (tag `avant-renommage-GTRoyal`) — argent, niveau, persos, 15 curiosités, tenues, armes, améliorations, défis, skins, métiers, « Mes véhicules », lieux vus, records d'arcade. Relue par la nouvelle version sur la même origine, elle ne montre **aucun écart, champ par champ**, et la sauvegarde réécrite est identique octet pour octet.
- **Réputations de gang** : rien de ce qui concerne les gangs n'est persisté dans `META` (hostilité et vagues sont d'état de partie). Le renommage ne peut donc rien y perdre.
- **Bug préexistant trouvé par ce test, corrigé** : `fusionMeta` vidait à chaque rechargement `lieuxVus` (tableau de la ville de la planque), `tenuesPoss` et `stats.arcadePersoBest`, absents de `DICOS_OUVERTS`. L'ancienne version les écrivait correctement mais ne les relisait pas : les sauvegardes existantes les retrouvent donc dès la nouvelle version. Un test de rechargement a été ajouté dans `scenarios.js`.
