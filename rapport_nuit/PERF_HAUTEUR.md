# Clignotements et lenteurs en hauteur, puis ajouts — suivi (branche `perf-hauteur`)

Brief : `rapport_nuit/PROMPT_PERF_HAUTEUR.md`. Captures du joueur : `rapport_nuit/captures/bug_hauteur/` (iPhone, soucoupe en vue 2D à
166–168 m au-dessus de l'aéroport et du désert). Un commit par étape. Toutes les mesures sont faites sans carte graphique (navigateur
de test, rendu logiciel) : seules les proportions avant / après comptent, **les vrais chiffres sont à relever sur l'iPhone**.

Ce que montrent les captures (zooms à 1/20 s d'intervalle) : des bandes qui changent de surface d'une image à l'autre partout où deux
sols se superposent (désert / sol de base, pelouse / tarmac, bord de l'aérogare) — le combat de profondeur (« z-fighting ») — et une
tache sombre qui change de forme en bas à gauche.

| # | Étape | État |
|---|---|---|
| 1 | Shaders, textures et géométries préparés au chargement | fait |
| 2 | Superposition des sols, plan proche | à faire |
| 3 | Grésillement des arbres vus de loin | à faire |
| 4 | Performances en altitude | à faire |
| 5 | Test : deux images à 170 m, aucun pixel des sols qui change | à faire |
| 6 | Tous les véhicules du jeu jouables | à faire |
| 7 | Une récompense pour le Titanic | à faire |
| 8 | Le couple à la proue | à faire |
| 9 | La page de statistiques | à faire |
| 10 | La vedette bloquée dans le canal en impasse | à faire |
| 11 | Suite complète et `valider.js` | à faire |

## 1. Shaders, textures et géométries préparés au chargement — fait

**Cause.** Le jeu ne préparait rien : aucun `renderer.compile`, aucun envoi de texture d'avance. Le menu ne rend pas la ville, donc
**aucun shader n'était compilé avant la première image de jeu** (0 programme au chargement). La 1re image en compilait 25 d'un coup ;
ensuite, à chaque zone survolée pour la première fois, la carte recevait les géométries (les bâtiments fusionnés pèsent lourd) et les
textures au milieu d'une image.

**Ce qui est fait** (`PREP`, `preparerRendu`, `preparerObjet`, `preparerSceneAPart`, `preparerNouveaux`, `prepTextures`, juste avant
la boucle principale) :
- **au chargement** (après la construction de la ville, avant que « Jouer » s'allume) : `renderer.compile` de toute la scène (objets
  cachés compris : 50 programmes), `initTexture` de toutes les textures, puis un rendu complet SANS élagage dont rien ne s'affiche
  (ciseaux d'un pixel) — les géométries partent à la carte ;
- **à la 1re partie**, une seconde fois (ce que `startRun` crée : véhicules, gens, sols refaits en 512 px) ; aux parties suivantes,
  les textures seulement ;
- **ce qui naît ensuite**, juste avant sa première image : chaque véhicule créé (trafic, véhicules du décor promus des canaux, exposés,
  garés…), chaque salle construite, la foule, les chaloupes et les fusées du Reyes Majestic, la course de supercross (décor et pilotes),
  le cockpit (sa scène à part), l'arme en main (ville, stand de tir, ball-trap). `preparerObjet` compile l'objet SEUL dans une scène de
  préparation qui a les mêmes lumières et le même brouillard que la ville (le shader en dépend) : un `compile` de toute la ville coûte
  ~0,5 s même quand tout est déjà prêt (18 463 objets) — impossible au milieu du jeu.
- Aucun tirage : les lumières de la scène de préparation naissent sur un générateur privé ; empreinte de la ville identique (décor
  931930327, portes, chalet, mobilier), tirage principal et séquence `startRun` → salles → `startRun` identiques.

**Mesures** (`scratchpad/ph/traversee.js` : soucoupe à 168 m, vue 2D, 18 points de la carte, 8 images chacun, temps de calcul + rendu
+ attente de la carte ; puis le même parcours une 2e fois) :

| | avant | après |
|---|---|---|
| 1re traversée, total | 51,7 s | 19,6 s |
| 1re traversée, pire image | 11,4 s (la 1re : 25 shaders) | 1,4 s (la 1re : constructions à la volée) |
| 2e traversée, total (déjà tout prêt) | 15,9 – 17,5 s | 17,2 s |
| préparation au chargement | 0 | 40,7 s dans le navigateur de test (compilation logicielle) |
| `startRun` de la 1re partie | 5,3 s | 12,1 s |

La 1re traversée coûte désormais presque autant que la 2e : les pics de « première fois » sont partis au chargement.
**Le prix** : un chargement plus long (sur iPhone, la compilation est bien plus rapide que dans le navigateur de test : à mesurer).
Les pics réguliers d'~0,6 s qui restent dans les deux traversées n'envoient rien à la carte et n'ont pas plus d'objets à dessiner que
les images voisines : c'est le moteur de rendu logiciel du navigateur de test (vérifié image par image, `ph/pics.js`).

**À vérifier sur iPhone** : la durée du chargement (écran « Chargement de Los Reyes… ») ; le premier survol de la ville en soucoupe ;
l'entrée dans une salle, la vue 1re personne, le cockpit (plus de saccade à la première fois).
