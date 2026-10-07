# Passe de playtest iPhone — grille par salle

Objectif : tester **toutes les salles existantes** sur iPhone (Safari, écran
d'accueil) avant publication. On inventorie, on ne corrige rien dans cette passe.

Les lignes de la grille suivent `INTDEFS` (index.html) : **26 salles**,
dans l'ordre de la source. Pour vérifier que la grille n'a pas dérivé :

```bash
node -e "const fs=require('fs');const h=fs.readFileSync('index.html','utf8');const d=h.indexOf('const INTDEFS={');const src=Object.keys(new Function('return '+h.slice(d+14,h.indexOf('\\n};',d)+2))());const doc=[...new Set([...fs.readFileSync('PLAYTEST.md','utf8').matchAll(/^\\| \`([a-z0-9]+)\`/gm)].map(m=>m[1]))];const a=src.filter(i=>!doc.includes(i)),b=doc.filter(i=>!src.includes(i));console.log(a.length||b.length?'DÉRIVE — absentes de la grille : '+a+' | en trop : '+b:'OK — '+src.length+' salles, grille alignée sur INTDEFS')"
```

## Légende

Colonne **a)** : les six risques de « Règles de design des salles » (CLAUDE.md),
**seulement ceux qui s'appliquent d'après le code** — Farming infini, minijeu
non Perdable, état qui survit au Game over, Double paiement, bouton près de la
SORTIE, Cadence de tap.

- ⚠ s'applique, et ni le code ni un script ne le garantit
- ✓ s'applique, garde-fou présent dans le code
- — ne s'applique pas

**SORTIE** : distances mesurées du centre de chaque zone au centre de la SORTIE
(rayon 3), sur les zones réelles de `zonesInterieurActives()`, graine
20260731. La règle demande au moins 8 u. « Chevauche » = distance < rayon de la
zone + 3 : la SORTIE gagne la chaîne `if / else if`, et une partie de la zone
ne répond jamais.

## Socle commun (colonne b, pour toutes les salles)

- `valider.js` : porte posée dans `PORTES`, salle construite puis quittée sans exception.
- `scenarios.js`, « Balayage des salles » : boutons du HUD visibles, aucune zone
  **entièrement** masquée par une autre, aucune zone coincée dans le décor.
  Ce balayage **ne vérifie pas la règle des 8 u autour de la SORTIE** : seuls le
  Ciné, le Métro, la Radio, le Chalutier et le Dépôt ont un test « espacements ».
- `scenarios.js`, « Mort pendant un défi » : remise à zéro au game over des
  champs génériques (`alarme`, `bw*`, `karaOn`, `sw*`, `spEtat`, `sr*`,
  `cycleOn`, `casse*`).

## À faire dans chaque salle sur l'appareil (colonne c, en plus)

Entrer et sortir · abandonner en plein minijeu · mourir pendant un défi ·
fermer l'app puis la relancer (rechargement après sauvegarde) · surveiller la
console eruda.

## Grille

| Salle | a) Risques qui s'appliquent | b) Déjà couvert par les scripts | c) Seulement sur l'appareil |
|---|---|---|---|
| `superette` 🏪 Supérette 24/7 | ⚠ **SORTIE** : caisse à 3,50 u (r 3,46) — chevauche la SORTIE.<br>⚠ **Game over** : `caisse.pris` n'est jamais remis à `false` (salle en cache dans `INT.salles`) — caisse vide jusqu'au rechargement de la page.<br>— Farming : étal = achats ; caisse = une fois.<br>— Perdable : pas de minijeu (braquage instantané).<br>✓ Récompense unique : `caisse.pris` posé avant le gain. | Socle seul. | Atteindre « BRAQUER LA CAISSE » sans tomber sur SORTIR.<br>Braquer → mourir → nouvelle partie : la caisse est-elle encore éteinte ? (voulu ou non : à trancher) | 
| `club` 🎧 Club Néon | — Aucun des six. Bar = 40 $ dépensés, à 13,4 u de la SORTIE.<br>— Perdable : pas de minijeu.<br>— Récompense unique : rien à valider. | Socle seul. | « BOIRE UN VERRE » atteignable ; rien d'autre. | 
| `banque` 🏦 Banque de Solara | ⚠ **Game over** : `coffre.pris` jamais réinitialisé (même motif que la caisse).<br>✓ `alarme` remise à `false` par `startRun()`.<br>— Perdable : pas de minijeu (coffre instantané, puis alarme).<br>✓ Récompense unique : `coffre.pris` posé avant le gain. | Reset de `alarme` (« Mort pendant un défi »). | Forcer le coffre : les renforts apparaissent **sur la SORTIE** — peut-on encore sortir ?<br>Après game over : le coffre est-il re-forçable ? | 
| `poste` 🚔 Commissariat | ⚠ **Game over** : `casier.pris` et `preuves.pris` jamais réinitialisés — les 400–750 $ des preuves ne reviennent qu'au rechargement.<br>✓ `alarme` remise à `false`.<br>— Perdable : pas de minijeu (pillage instantané, puis alarme).<br>✓ Récompense unique : `casier.pris`, `preuves.pris` posés avant le gain. | Reset de `alarme`. | Piller les preuves → alarme → la SORTIE reste-t-elle praticable sous les renforts ?<br>Après game over : casier et preuves à nouveau disponibles ? | 
| `tour` 🛗 Tour Solara | — Aucun. Ascenseur à 8,5 u de la SORTIE (marge 0,5 u au-dessus du seuil).<br>— Perdable : pas de minijeu.<br>— Récompense unique : rien à valider. | Socle + test Jetpack « l'ascenseur dépose fiablement sur le toit ». | Atteindre l'ascenseur sans frôler SORTIR ; arrivée sur le toit lisible en plein écran. | 
| `pharma` 💊 Pharmacie | — Aucun (achats, 9,6 u).<br>— Perdable : pas de minijeu.<br>— Récompense unique : rien à valider (achats). | Socle seul. | Défilement des articles lisible ; achat refusé à PV max. | 
| `armurerie` 🔫 Armurerie du Port | — Aucun (boutique, 11,6 u).<br>— Perdable : pas de minijeu.<br>— Récompense unique : rien à valider (achats). | Socle seul. | Ouvrir la boutique depuis la salle et revenir en jeu (écran sous les safe-areas). | 
| `conces` 🚗 Concessionnaire | ⚠ **SORTIE** : comptoir de vente à 4,40 u (r 3,87) — chevauche.<br>— Farming : achat seul.<br>— Perdable : pas de minijeu.<br>— Récompense unique : rien à valider (achat). | Test « podiums synchronisés avec le comptoir ». | Atteindre la VENTE sans SORTIR ; achat → véhicule livré devant la porte. | 
| `planque` 🏡 Villa planque | ✓ Farming : le lit saute à la vague suivante, une seule fois par repos (repasse par une vague active).<br>— SORTIE : 15,5 u.<br>— Perdable : pas de minijeu.<br>✓ Récompense unique : `META.revenus` remis à 0 au paiement. | Socle (9 zones, aucune masquée). | DORMIR → CONFIRMER → vague lancée ; re-dormir refusé avant la fin de la vague.<br>Cabinet, tableau, trophées, penderie : ouverture et retour. | 
| `casino` 🎰 Casino Solara | ⚠ **SORTIE** : table de poker à 6,32 u (r 4) — chevauche.<br>✓ Farming : roue plafonnée à 1 tour/vague (2 avec la Chaussette) ; jeux à avantage maison — **espérance jamais vérifiée** par un script.<br>✓ Game over : `roueN`/`roueVague` remis à zéro (non testé).<br>✓ Perdable : jeux de hasard à avantage maison ; la roue est gratuite (22 % « Rien »), il n'y a rien à y perdre.<br>✓ Récompense unique : `e.fini` / `phase='fini'` posés avant `gagner()`, boutons redessinés ; roue : `roueLot` vidé avant le lot. À confirmer au double-tap. | Socle seul — **aucun test casino**. | Atteindre le POKER.<br>~20 mains de chaque jeu : la perte moyenne est-elle réelle ?<br>Roue : 2 tours avec la Chaussette, refus ensuite. Écrans de jeu en 9:16. | 
| `laverie` 🧺 Laverie « Bulle Bleue » | ⚠ **Farming** : machine 7 = 50 $ → 420–760 $ toutes les 42 s, **aucune limite par vague**.<br>⚠ **SORTIE** : machine 7 à 5,69 u (r 3,32) — chevauche ; une cache à 6,51 u.<br>✓ Game over : `cycleOn`, `sacPret`, machines du fond remis à zéro.<br>— Perdable : pas un minijeu, mais le cycle n'échoue jamais : gain garanti (voir Farming).<br>✓ Récompense unique : `sacPret=false` avant le gain ; `m.pris` pour les machines du fond ; Chaussette via `aCurio`. | Reset de `cycleOn`. | Lancer 3 cycles d'affilée dans une même vague → confirmer l'absence de plafond.<br>Atteindre la machine 7 depuis l'entrée. Machines du fond → alarme des Vipères. | 
| `voyance` 🔮 Chez Madame Zohra | ⚠ **SORTIE** : Zohra à 4,50 u (r 3,46) et une cache à 4,61 u — chevauchent.<br>— Farming : 150 $ pour au mieux 10–40 $.<br>— Perdable : pas de minijeu (prédiction tirée au sort, coûte toujours plus qu'elle ne rapporte).<br>✓ Récompense unique : Boule via `aCurio`. | Socle seul. | Atteindre Zohra sans SORTIR ; la Boule n'est donnée qu'une fois. | 
| `karaoke` 🎤 Karaoké « Micro Cassé » | ⚠ **Farming** : 60 $ → 160–320 $ (600–900 $ en sans-faute), **aucune limite par vague** (aucun champ `*Vague` pour cette salle).<br>⚠ **SORTIE** : bar à **1,90 u** (r 3,46) et cache à 3,64 u (r 2,80) — chevauchements forts.<br>✓ Game over : `karaOn` remis à `false`.<br>✓ Perdable : hors de \|pos\| < 0,36 = fausse note, 60 $ perdus + 5 PV.<br>✓ Récompense unique : `karaOn=false` avant le gain. | « Karaoké : sans-faute » et reset de `karaOn`. **La défaite et la répétition ne sont pas testées.** | Enchaîner 5 sessions dans une même vague → confirmer le farming.<br>Atteindre le bar.<br>Lisibilité du curseur au doigt (fenêtre parfaite \|pos\| < 0,14). | 
| `aquarium` 🐙 Aquarium « Bleu Profond » | ⚠ **SORTIE** : cache à 4,04 u (r 2,70), bassin à 5,80 u (r 3,61) — chevauchent.<br>✓ Farming : 1 Gaston/vague.<br>✓ Game over : `gastonVague` remis à −1 (non testé).<br>⚠ **Perdable** : la chasse ne se perd pas — sonder les 6 bassins est gratuit, gain garanti de 180–380 $/vague après la Perle.<br>✓ Récompense unique : `gastonTrouve` par vague. | Socle seul. | Atteindre le bassin le plus proche de l'entrée ; re-sonder après avoir trouvé Gaston → refus.<br>Arbitrage de design : un gain garanti est-il acceptable ? | 
| `bowling` 🎳 Bowling « Le Strike Doré » | ✓ Farming : 2 parties/vague.<br>✓ Game over : `bwEtat`, `bwParties`.<br>— SORTIE : jeu à 7,81 u (r 4), cache à 7,28 u — sous 8 u mais sans chevauchement.<br>✓ Perdable : erreur ≥ 0,75 → 0–1 quille ; il faut ≥ 5 quilles sur 3 lancers pour rentrer dans les 80 $.<br>✓ Récompense unique : `bwEtat=null` en fin de partie ; gros lot parfait une seule fois (`aCurio`). | « Tentative de farming (bowling) », « partie complète (3 strikes) », reset `bw*`. | Timing des deux curseurs au doigt (ligne puis force, vitesse 1,6 + 0,3 par lancer). | 
| `sport` 🏋️ Salle de sport « Fer & Sueur » | ⚠ **Cadence** : force de 12 à 100 contre une chute continue ; minimum tenu **3,3 / 4,4 / 5,0 appuis/s** (barres 1/2/3), la dernière **pendant 13 s**.<br>✓ Game over : `spEtat`.<br>— Farming : aucun gain d'argent (sac = endurance).<br>— SORTIE : cache à 7,88 u.<br>✓ Perdable : chrono 9/10/13 s, −4 PV, 40 $ perdus.<br>— Récompense unique : aucun gain d'argent ; palier via `Math.max`. | « Soulevé réussi puis raté » — appels directs, **sans cadence humaine**. Reset `spEtat`. | Tenir 5 appuis/s pendant 13 s au pouce, puis à deux doigts alternés : le 2e doigt est-il compté (`pointerdown` multi-touch) ? | 
| `serre` 🌿 Serre du jardin botanique | ⚠ **SORTIE** : pot central de l'étagère du fond à **0,60 u** (r 3) — quasi recouvert ; 2 pots à 5,38 u chevauchent.<br>✓ Game over : `srVague`, `srFini`.<br>⚠ **Perdable** : impossible de perdre — les erreurs réduisent le gain (140–240 $ au lieu de 340–520 $) sans l'annuler.<br>✓ Récompense unique : garde-fou `srFini` (bug historique) — **non testé**. | Reset `srVague`/`srFini`. **Aucun test de paiement.** | Cueillir le pot central de l'étagère du fond.<br>3 bonnes plantes, puis tenter une 4e valide → aucun 2e paiement. | 
| `sandwich` 🥪 Le Roi des Sandwichs | ⚠ **SORTIE** : table du défi (5,09 u, r 2,83) et soda (5,09 u, r 2,65) chevauchent **encore** — zone du bug historique.<br>✓ 1 défi/vague.<br>✓ Game over : `swEtat`.<br>✓ Perdable : +11–16 + n par bouchée, −5/s, soda −32 ; 6 bouchées sans soda ≈ 102 → perdu ; chrono 32 s.<br>✓ Récompense unique : `swEtat=null` en tête de `finMonstre`. | « Abandon en plein minijeu », reset `swEtat`/`swVague`. **Ni victoire ni défaite testées.** | Allers-retours table ↔ soda en plein défi sans déclencher SORTIR.<br>Gagner une fois, perdre une fois. | 
| `musee` 🏛️ Musée Mémoire de Solara | ⚠ **Farming** : tronc à dons = 10–40 $ **par appui**, sans limite ni délai, et `META.fouilles++` à chaque appui.<br>✓ Casse : 1/vague, reset complet.<br>— SORTIE : cartel à 4,24 u (r 4) chevauche (lecture seule).<br>✓ Perdable : alarme (cône de vue, bruit) ou fin des 90 s.<br>✓ Récompense unique : vitrine inscrite dans `META.museeArtefacts`, `forcerCible` vidé ; Canard via `aCurio`. | Tests dédiés : rondes déterministes, casse réussi/raté, seuils de bruit, lisibilité, chrono sur `dtJeu`, reset `casse*`. **Rien sur le tronc.** | Taper le tronc 20 fois → confirmer.<br>FORCER une vitrine (maintien 1,5 s) sans que le pouce glisse (`pointerleave` annule le maintien). | 
| `arcade` 🕹️ Palais de l'Arcade | — Farming : rien de monétaire (tickets → lots sans argent ; jeton = 10 $).<br>✓ Game over : jetons, tickets, partie en cours.<br>— SORTIE : 14,3 u.<br>Cadence : selon les bornes (croix directionnelle).<br>✓ Perdable : 1 jeton (10 $) engagé par partie, tickets au score — une mauvaise partie ne rend rien.<br>✓ Récompense unique : `ARCADE.jeu=null` avant de verser les tickets. | Bornes une à une, QUITTER, reset au game over, Jeton Doré (lu depuis `BORNES_ARCADE`), modal, croix, horloge. | Jouabilité réelle de chaque borne au doigt (croix, glissement de la Démolition).<br>Modal en 9:16 sous les safe-areas. | 
| `cine` 🎬 Ciné-Palace | ✓ 2 séances/vague, abandon compris.<br>✓ Game over : séance annulée + compteur (dans le code — hors du test générique).<br>— SORTIE : 8,43 u.<br>Pas de cadence, mais 4 postes simultanés = déplacements.<br>✓ Perdable : satisfaction à 0 = fiasco.<br>✓ Récompense unique, mais **seulement grâce aux appelants** (branches exclusives, `cineArreterSeance` efface l'état) : `cineTerminerSeance` n'a pas de garde à l'entrée. | Tests dédiés : espacements, séance, limite, fin, ralenti de la Bobine, fouilles, horloge. | Une séance parfaite est-elle faisable au doigt (distances entre postes) ?<br>Mort en pleine séance → le son se coupe. | 
| `metro` 🚇 Métro abandonné | ✓ Caches et piles par vague.<br>✓ Game over.<br>— SORTIE : 10,15 u.<br>✓ Perdable : la Bête emporte tout le butin porté.<br>✓ Récompense unique : `butin=0` après l'encaissement. | Tests dédiés : niveaux, batterie, piles, Bête, butin, Lampe, réinitialisations (vague, mort, game over), horloges. | Lisibilité dans le noir sur l'écran iPhone (halo de la lampe, luminosité auto). | 
| `radio` 📻 Radio pirate Solara FM | ✓ 2 émissions/vague.<br>✓ Game over.<br>— SORTIE : 9,0 u. Porte absente sans la curiosité `platine`.<br>✓ Perdable : segment raté sous 70 % ; triangulation à 100 % = police.<br>✓ Récompense unique : un paiement par `segmentIdx` ; bonus versé après `radioArreterEmission`. | Tests dédiés : verrou, glissement du doigt, segments, limite, police, réinitialisations, fouilles, horloges. | Précision du glissement au pouce sur la vraie dalle ; appel d'auditeur lisible. | 
| `chalutier` 🚢 Chalutier « Sainte-Odile » | ✓ 2 sorties/vague.<br>✓ Game over.<br>— SORTIE : 11 u, inerte en mer.<br>✓ Cadence : combat de canne gagnable par alternance simple.<br>✓ Perdable : chrono de 180 s → remorqué, moitié de la cale perdue ; tempête.<br>✓ Récompense unique, mais **seulement grâce aux appelants** (2 appelants, branches exclusives sous `sortieEnCours`) : `chalutierVendre` n'a pas de garde à l'entrée. | Tests dédiés : pilotage, canne, filet, billot, cale, météo, chrono 180 s, limite, reset, horloges `dtJeu`. | Maintien de la canne sans que le pouce glisse (`pointerleave`).<br>Découpe au doigt sur le billot ; lisibilité de la météo. | 
| `site51` ? Grille d’aération | ✓ 1 visite/vague.<br>✓ Reset (mort, vague).<br>— SORTIE : 23 u.<br>✓ Perdable : enfermé sans issue → neutralisé après 20 s, butin perdu.<br>✓ Récompense unique : garde `visiteEnCours` ; objets acquis une fois dans `META.site51Objets`. | Tests dédiés : déblocage, structure, confinement, enfermement, hangar, créature, Désintégrateur, minuteur `dtJeu`. | Lecture d'une salle de 190 u de long à l'écran ; cônes des tourelles visibles. | 
| `depot` 🏁 Dépôt de bus | ✓ 3 courses/vague.<br>✓ Game over (`startRun` nettoie).<br>— SORTIE : 63 u.<br>✓ Perdable : 2e place = demi-gain, au-delà rien (IA plafonnée, vérifiée par simulation).<br>✓ Récompense unique : garde `c0.termine`. | Tests dédiés : chemin joueur, IA plafonnée, pilote robotique, victoire/défaite, abandon, mort, horloges. | Pilotage au joystick réel (Le Toit, chutes) ; fluidité avec 4 véhicules sur iPhone. | 

## Constats à arbitrer (relevés dans le code, rien de corrigé)

1. **Farming illimité**, contraire à la règle « limite par vague » : machine 7 de
   la Laverie, Karaoké, tronc à dons du Musée. Le tronc incrémente aussi
   `META.fouilles` (sauvegardé), qui ouvre le **Site 51 à 25** et valide le défi
   « Fouineur » (450 $) **à 40** : 25 appuis sur le tronc ouvrent la salle cachée.
2. **Braquages jamais réinitialisés** : caisse (Supérette), coffre (Banque),
   casiers et preuves (Commissariat). Les salles restent en cache dans
   `INT.salles`, donc un braquage reste fait après un game over, jusqu'au
   rechargement de la page. Voulu ou non ?
3. **Zones qui chevauchent la SORTIE** dans 10 salles (12 sous la règle des 8 u :
   + Bowling et Salle de sport, sous 8 u sans chevauchement), dont 3 critiques :
   pot de la Serre (0,60 u), bar du Karaoké (1,90 u), défi et soda du Roi des
   Sandwichs (5,09 u — zone du bug historique, toujours en chevauchement).
4. **Minijeux sans défaite** : chasse à Gaston (Aquarium) et Serre. La machine 7
   de la Laverie n'est pas un minijeu mais ne peut pas échouer non plus.
5. **Récompense unique** : aucun double paiement trouvé, sur tous les chemins
   de paiement des 26 salles. Deux paiements ne tiennent que grâce à leurs
   appelants, sans garde à l'entrée : `cineTerminerSeance` (Ciné) et
   `chalutierVendre` (Chalutier, 2 appelants). Ils sont fragiles si un appelant
   s'ajoute.
6. **Horloges** (hors des six risques) : les minijeux les plus anciens font
   avancer leurs chronos sur `dt`, pas sur `dtJeu` (Sport `spT`, Sandwich
   `swT`, curseurs du Karaoké et du Bowling, cycle de la Laverie). C'est
   contraire à la règle « Horloges » de CLAUDE.md. Sans effet tant qu'aucun
   ralenti ne joue en intérieur.

## Par où commencer

**Karaoké** (`karaoke`). Avec la Serre, c'est la salle qui cumule le plus de
risques non couverts par les scripts : deux règles violées, plus un garde-fou
jamais testé. Le Karaoké passe devant à cause de la gravité : son farming
illimité casse l'économie du jeu, alors que les problèmes de la Serre ne
touchent qu'une plante et un montant. Ordre conseillé ensuite : Serre, Laverie,
Roi des Sandwichs, Aquarium, Musée (tronc), Salle de sport (cadence), puis le reste.
