# Bateaux V5 — les nouveaux bateaux des canaux et le jet-ski refait (Canaux V3, phase 3)

Demande : `rapport_nuit/PROMPT_CANAUX_V3.md`, phase 3 ; suivi du chantier : `rapport_nuit/CANAUX_V3.md`. Captures :
`rapport_nuit/captures/bateaux_v5/` (deux vues par modèle, `<clé>.png` ; le poste de pilotage à la 1re personne, `<clé>_cockpit.png`).

## La mécanique (inchangée depuis les V3/V4)

Chaque modèle est une fiche `VEH_V3[clé] = {geo, mats, inst, interieur, ouvert}` construite par `construireV3Spec` sur un générateur
privé, après l'ancien modèle (mêmes tirages). Coques par `formeBateauV4` + `coqueVedetteV3` (bandes de bordé, liseré de flottaison,
carène sous l'eau, pont, tableau arrière), jet-skis par `carrosserieV4`. Hélices animées à la distance parcourue (`helicesBateauV4`),
feux de navigation (rouge à bâbord, vert à tribord), sillage et éclaboussures de la mer V2, inclinaisons (nez qui se lève, gîte) : ceux
de tous les bateaux. Chaque fiche `VEHDEFS` a ses dimensions, `vmax`, `acc`, `man`, `hp`, `eau:true`, son **tirant d'air** (`hautNav`,
mesuré sur le modèle à flot : la structure rigide, sans les antennes fouet) et son **son moteur** (`moteur` : `jetski` aigu, `course`
rauque, `diesel` grave, `v8` marin — profils dans `MOTEURS`). Le poste à la 1re personne : `CK_HAB` (tableau de bord), `COCKPIT_DEFS`
(l'œil des bateaux où l'on est assis).

Tests : « Véhicules V3 » (vitre, plafond de maillages, taille, pilote visible, rien en 1re personne, cockpit), « Vedettes V3 » (coque
fermée vue du poste, un seul verre, barreur debout ou assis, hélices), « Cockpits », « Cockpits V2 », « Inclinaisons », « Canaux V3 :
ponts-levis » (tirants d'air remesurés), « Canaux V3 : bateaux pilotables » (chacun se pilote ; l'offshore, le plus rapide, déjauge).

## Les fiches

| Clé | Nom | Inspiré de | Taille (u) | vmax | Tirant d'air | Poste | Tableau | Son |
|---|---|---|---|---|---|---|---|---|
| `jetski` (refait) | Jet-ski « Sport » | Sea-Doo RXP-X | 2,6 × 1,1 | 37 | 1,09 | assis, penché | jetski | jetski |
| `jetskiBras` | Jet à bras « Kamikaze » | Kawasaki SX-R | 2,3 × 0,78 | 35 | 1,28 | debout | jetski | jetski |
| `jetskiTrio` | Jet trois places « Croisière » | Yamaha FX Cruiser | 3,5 × 1,25 | 32 | 1,20 | assis | jetski | jetski |
| `offshore` | Offshore « Tonnerre » | Cigarette 42 / Fountain | 9,5 × 2,6 | **52** | 1,85 | assis, baquet | offshore | course |
| `yachtMoteur` | Yacht « Riviera 43 » | Riviera 4600 / Princess F45 | 13 × 3,8 | 24 | 4,53 | debout, flybridge | yacht | diesel |
| `sportfish` | Sportfish « Marlin » | Viking 52 / Bertram | 10,5 × 3,3 | 26 | 7,13 | debout, flybridge | yacht | diesel |
| `runabout` | Runabout « Aquarama » | Riva Aquarama / Junior (années 60) | 5,2 × 2,0 | 30 | 1,56 | assis au volant | bois | v8 |
| `cruiserBois` | Cruiser « Capitaine » | Chris-Craft Constellation (années 50) | 8,2 × 2,8 | 22 | 2,26 | debout à la barre | bois | v8 |
| `voilier` | Voilier « Alizé » | sloop de 30 pieds (First, Sun Odyssey) | 9 × 2,7 | 14 | 11,36 | debout à la roue | nautique | diesel |

Les petits (jet-skis, offshore, runabout, cruiser) passent sous tous les ponts (2,88 u au plus bas) ; le yacht, le sportfish et le
voilier, non : ils ne sont amarrés que côté est (le grand canal, la marina) et passent les ponts-levis.

### 1. Jet-ski « Sport » (`jetski`, refait)
L'ancien V4 (un Sea-Doo GTX de balade) devient un jet de sport : **sponsons de course** aux flancs arrière, **numéro 07** sur les flancs
du capot (rond blanc cerclé de noir), **bandes de course** sur le pont ; coque à redans, capot bombé et ses ouïes, pare-brise fumé,
guidon à rétroviseurs, selle à dosseret, plateforme et poignée, buse. Pilote assis, penché sur le guidon. Couleurs : jaune, cyan.

### 2. Jet à bras « Kamikaze » (`jetskiBras`)
Le jet de compétition qu'on pilote **debout** : coque étroite à redans, **bras de direction articulé** à l'étrave qui monte vers le
pilote, guidon et protège-mains, plateau arrière à tapis antidérapant et ses rebords, capot avant bombé ; pas de selle. Livrée vert
acide sur coque noire, ou orange. Le pilote debout sur le plateau (la pose debout des vedettes ; au cockpit, l'œil 1,5 u au-dessus).

### 3. Jet trois places « Croisière » (`jetskiTrio`)
Le grand jet de balade : longue coque à bourrelets, grand capot et ses rétroviseurs, pare-brise fumé, **selle étagée à trois places** et
son dosseret, repose-pieds, **plateforme de bain et son échelle**, poignées de remontée ; livrée bicolore bleu marine ou rouge sur blanc.

### 4. Offshore « Tonnerre » (`offshore`) — le plus rapide de tous les bateaux
Une cigarette de course : très longue coque en **V profond**, étrave effilée, pont avant immense et ses **prises d'air**, cockpit bas à
**deux baquets** et banquette arrière sous un **pare-brise enveloppant**, **arceau de course**, capot moteur à écopes, **deux gros
hors-bord de course** et leurs hélices de surface ; livrée de course : grandes flèches jaunes et blanches le long du flanc, bandes sur le
pont, **numéro 77**. Coque rouge, bleue ou orange. On y est **assis**, au baquet de tribord. **Il déjauge** (`dejauge` : en mer, il saute
de crête en crête deux fois plus souvent et plus haut qu'une vedette — mesuré : 4 bonds en 8 s contre 2) et laisse un **sillage
énorme** (`sillage` : ×2) ; son moteur `course`, rauque. Amarré devant une grande villa du canal est.

### 5. Yacht « Riviera 43 » (`yachtMoteur`)
Un yacht à moteur moyen : étrave haute, **salon aux flancs vitrés** d'un seul tenant et pare-brise incliné, **flybridge** (poste de
pilotage, banquettes en U, bain de soleil, petit arceau radar), vitres de coque, bain de soleil sur le pont avant et main courante,
cockpit arrière et sa table en teck, **plateforme de bain** en teck et ses marches. Livrée blanche à filet bleu nuit. Le pilote debout
au flybridge. Amarré au ponton d'honneur de la marina et au ponton visiteurs.

### 6. Sportfish « Marlin » (`sportfish`)
Le yacht de pêche sportive de la référence (`rapport_nuit/canaux_refs/3_villas_mediterraneennes_yacht.png`) : étrave haute et évasée,
cabine blanche à l'avant et ses vitres, flybridge (plancher, pavois, poste, banquettes), **tour à thon** (quatre montants, ceinture, la
vigie et son petit poste de pilotage en haut), **tangons** de chaque côté, grand cockpit arrière et sa **chaise de combat**,
porte-cannes, coffres, porte de tableau. Coque blanche ou bleu marine. Amarré au ponton visiteurs de la marina.

### 7. Runabout « Aquarama » (`runabout`)
Le runabout vernis des années 60 : **coque en acajou verni** (brillant, reflets), pont avant en acajou et ses **filets d'érable clair**,
carène blanche, **pare-brise chromé** enveloppant, **sièges en cuir crème** (deux banquettes), planche en acajou et **volant en bois**,
taquets chromés, capot moteur à ouïes chromées, **mât de pavillon** à la poupe. On y est assis au volant. Le tableau `bois` (créé pour
lui et le cruiser) : planche d'acajou, cadrans crème cerclés de chrome, aiguilles rouges, chiffres à empattement. Amarré côté ouest.

### 8. Cruiser « Capitaine » (`cruiserBois`)
Le canot à cabine en bois des années 50 : coque en acajou, **rouf à toit blanc et ses hublots ronds cerclés de chrome**, pare-brise à
montants chromés, **bastingage chromé** sur le pont avant, cockpit ouvert à l'arrière avec la **barre à roue** en bois sur son pupitre et
la banquette rouge, capot moteur, mât de pavillon. Le capitaine debout à la barre. Le plus courant des postes côté ouest : il remplace,
à la même place, les gros bateaux qui ne pouvaient pas sortir en mer.

### 9. Voilier « Alizé » (`voilier`)
Un sloop de croisière : coque blanche à liseré, pont en teck, **rouf et ses hublots**, **capote vitrée** de la descente, **quille et
safran**, **mât de 11 m**, bôme et **grand-voile ferlée sous son taud bleu**, **génois enroulé** sur l'étai, haubans, pataras, **cockpit
creusé** (hiloires, bancs en teck), **barre à roue** et son compas, balcons et filières ; moteur auxiliaire (son `diesel`). Le barreur
debout à la roue, dans le cockpit. Amarré à la marina (doigts et ponton visiteurs).

## Les anciens bateaux, évalués face à ce niveau

| Clé | Modèle | Verdict |
|---|---|---|
| `bateau` | Vedette « Sirène » (V3) | au niveau (coque lissée section par section, console, pare-brise enveloppant, barreur debout) — gardée |
| `bateauP` | Vedette de police (V3) | au niveau (livrée, rampe de gyrophares, T-top) — gardée |
| `yacht` | Yacht « Impérial » (V4, Sunseeker Manhattan 68) | au niveau — gardé |
| `espadon` | Vedette « Espadon » (V4) | au niveau — gardée |
| `peche` | Bateau de pêche (V4, lobster boat) | au niveau — gardé |
| `kayak` | Kayak (V4, sit-on-top) | au niveau — gardé |
| `surf` | Planche de surf (V4) | au niveau — gardée |
| `grandyacht` | Méga-yacht « Reyes Royale » (V3) | au niveau ; il reste en mer (demandé) |
| `cargo` | Porte-conteneurs (V4) | au niveau — gardé |
| `jetski` | Jet-ski (V4, GTX de balade) | **refait** en jet de sport (ci-dessus) |

Physique et statistiques inchangées pour tous les anciens (le jet-ski garde vmax 37, acc 20, man 3,2, 60 PV).

## Où ils sont amarrés (`bateauxV3Plan`)

Les postes des villas et de la marina (`CANAUX.bateauxV2`) reçoivent chacun un vrai modèle (`BATEAU_VEH` : day-cruiser → cruiser en
bois, open → vedette « Sirène », petit → runabout, yacht à moteur → Riviera 43, sportfish → Marlin, voilier → Alizé ; deux jet-skis par
quai à jet-skis, tirés parmi les trois modèles). Les dix gros bateaux qui étaient amarrés côté ouest (2 yachts, 4 sportfish, 4
voiliers) ne pouvaient pas sortir en mer : à la même place, ils deviennent un cruiser en bois (poste de 8,2 u et plus) ou un open ; les
gros sont à la marina (ponton d'honneur, doigts, et un **ponton visiteurs** au nord-est, hors du chemin des yachts de l'IA). L'offshore
prend le poste d'une grande villa du canal est. Répartition : 12 cruisers, 3 vedettes, 3 runabouts, 10 jet-skis (2 Sport, 3 trois
places, 5 à bras), 3 voiliers, 2 sportfish, 2 yachts, 1 offshore — 36 postes, chacun avec un chemin jusqu'à la mer pour son tirant
d'air (test).
