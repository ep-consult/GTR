# Rapport de nuit — 9 octobre 2026

> Mis à jour en continu. Si ce fichier semble s'arrêter en plein milieu, c'est
> que la session a été interrompue : tout ce qui est écrit ici est à jour au
> moment de l'écriture.

## Résumé

*(complété en fin de nuit)*

## Branches

| Branche | Créée depuis | État |
|---|---|---|
| `nuit-audit-1` | `master` (6e6c6ab) | en cours |
| `nuit-mer` | `nuit-audit-1` | pas encore créée |
| `nuit-course` | `nuit-audit-1` | pas encore créée |

## Phase 1 — Audit

### Méthode

Inventaire lu dans le jeu vivant (jamais recopié) : **27 salles** (`INTDEFS`),
**5 bornes d'arcade** (`BORNES_ARCADE`), **51 véhicules** (`VEHDEFS`).

Outil de balayage Puppeteer (390×844, Chrome sans blocage de l'audio). Pour
chaque salle, une page neuve, puis :

1. entrée par la vraie porte ;
2. balayage de **toutes les zones interactives** lues par
   `zonesInterieurActives()` — ce qui démarre les minijeux, ouvre les menus,
   lance les fouilles ;
3. pause en plein milieu, puis reprise ;
4. sortie en plein minijeu ;
5. cinq allers-retours ;
6. mort en plein minijeu ;
7. relance de partie ;
8. sauvegarde puis rechargement.

Les mesures sont réelles, sans supposition :

- **niveau sonore réel** (analyseur branché sur le gain maître, RMS) en
  ville avant, puis après la sortie et après la mort — un son qui continue se
  voit directement ;
- drapeaux d'ambiance `AUDIO.*On`, oscillateur moteur ;
- timers (`setInterval`/`setTimeout` instrumentés), écouteurs d'événements,
  géométries et textures Three.js, objets de scène, sur les 5 cycles ;
- erreurs console et exceptions ;
- éléments DOM restés visibles après la sortie ;
- débordements à 390 px (éléments hors écran, textes rognés) ;
- FPS dans la salle.

### Résultats

#### Bugs corrigés (branche `nuit-audit-1`)

| # | Symptôme | Cause | Correction | Commit |
|---|---|---|---|---|
| 1 | Mourir dans le camion de pompiers lance ouverte : le sifflement de la lance continue sur l'écran de mort, jusqu'à la partie suivante | `mourir()` coupait moteur et sirène, jamais la lance | `lanceSonStop()` dans `mourir()` + test | `5733718` |
| 2 | **Mourir au volant de l'OVNI empêche de relancer une partie** (plantage au lancement). Plus généralement, mourir au volant laisse les boutons du véhicule (MISSILE, HUILE, LANCE, FLASH...) dans la partie suivante | La remise à zéro des boutons n'était faite qu'en descendant du véhicule ; le FLASH de l'OVNI remplace le compteur `#grenN`, que `startRun()` lit | Remise à zéro factorisée dans `boutonsAPied()`, appelée aussi par `startRun()` + test sur les 51 véhicules | `b937286` |
| 3 | 12 libellés du bouton d'action et la consigne de la serre coupés par « … » en plein milieu à 390 px (« Machine 7 en maintenance — reviens à la… ») | `white-space:nowrap` + ellipse, libellés plus longs que 74 vw | Un libellé trop long passe sur deux lignes (mesuré au seul changement de libellé) + test sur tous les libellés lus dans le source. Captures avant/après : `captures/audit/libelle_serre_*.png` | `8524190` |
| 4 | Mourir au **métro** ou au **chalutier** : l'ambiance repart sur l'écran de mort et **suit le joueur en pleine ville dans la partie suivante** | La boucle continue `majInterieur` pendant la mort, qui relançait l'ambiance ; celle du port du chalutier n'était coupée que pendant une sortie en mer | Mise à jour d'ambiance gardée hors mort, arrêt du port dans `mourir()`, `startRun()` coupe toutes les ambiances + test sur toutes les salles | `2308aa1` |

#### Tableau salle par salle

*(complété ci-dessous en fin de phase)*

## Décisions prises seul

*(en cours)*

## À tester à la main sur iPhone demain

*(complété en fin de nuit)*
