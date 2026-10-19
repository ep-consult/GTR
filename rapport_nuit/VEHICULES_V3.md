# Rattrapage visuel des anciens véhicules (V3) — suivi

Demandé le 19 octobre : « plusieurs véhicules anciens ont un style dépassé par rapport aux nouveaux ; traite-les un par
un, dans l'ordre, sans en oublier aucun, et coche chacun ». Référence de qualité : les véhicules les plus récents
(`voitureV2` : SUV « Sierra », Berline, Muscle « Taureau » ; cockpits V2).

Règle : ni la physique, ni les stats, ni les prix, ni les commandes ne changent (sauf la direction de la vedette).
Chaque véhicule est validé par de vrais rendus (extérieur, vitres, conducteur visible, vue 1re personne).

## Comparaison avant de commencer : Fourgon (ancien) contre SUV « Sierra » (récent)

Rendus : `captures/vehicules_v3/avant_van_contre_suv.png` (extérieur), `captures/vehicules_v3/avant_cockpits_van_suv.jpg` (1re personne).

| | Fourgon (ancien) | SUV « Sierra » (récent) |
|---|---|---|
| Volumes | boîtes empilées, arêtes vives, capot = un pavé | profil extrudé, arêtes arrondies (biseau), capot bombé |
| Passages de roue | aucun : la roue sort sous une boîte | découpés dans la caisse, coques sombres |
| Vitres | noires et OPAQUES (verre Phong plein) | teintées et transparentes (78 %) |
| Conducteur | invisible (cabine vide, vitres opaques) | silhouette visible derrière le vitrage (PNJ seulement) |
| Intérieur vu du dehors | rien | rien (seule la silhouette) |
| Roues | cylindre noir + disque gris plat | pneu, jante à branches ou multibranches, enjoliveur |
| Optiques | pavés jaunes / rouges plats | phares en biais avec leur logement, feux en deux parties |
| Détails | aucun rétroviseur lisible, ni poignée, ni joint de porte | rétroviseurs peints, poignées chromées, joints de portes, bas de caisse, barres de toit, plaques, échappements |
| Peinture | Lambert plat | Lambert, chromes et verre Phong brillants |
| 1re personne | planche et portière, PAS de pavillon ni de pare-soleil, montants clairs | pavillon, pare-soleil, rétroviseur intérieur, garnissage |
| Construction | pièce par pièce, ~40 maillages | géométries fusionnées par matière, partagées par modèle (~10 maillages) |

Le niveau visé (V3) reprend tout ce qui fait le récent, et va un cran plus loin là où le récent est encore pauvre :
**un vrai intérieur vu à travers les vitres** (sièges, appuie-tête, planche, volant) et **le conducteur visible, le
joueur compris** (le récent ne montre que les PNJ).

## TODO

### 1. Réactualisation globale
- [x] Fourgon (`van`) — profil unique (capot, cabine vitrée en encoche, caisse haute à nervures), porte coulissante, portes arrière vitrées, feux verticaux, calandre, pare-chocs, baguettes, rétroviseurs, antibrouillards, jantes ; intérieur (planche, volant, siège, banquette, cloison) ; conducteur visible (PNJ et joueur) ; 1re personne : œil à la tête du conducteur, pavillon et pare-soleil dans le champ. 26 maillages (≈ 40 avant). Rendus : `captures/vehicules_v3/van_exterieur.png`, `captures/vehicules_v3/van_jeu.png`
- [ ] Interceptor (`police`)
- [ ] Camion « Aigle » (`milit`)
- [ ] Taxi (`taxi`)
- [ ] Blindé « Bastion » (`blinde`)
- [ ] Camion DCA « Foudre » (`dca`)
- [ ] Ambulance « Secours » (`ambulance`)
- [ ] Grue « Marteau » (`grue`)
- [ ] Dépanneuse « Grizzly » (`depanneuse`)
- [ ] GT « Agent Gris » (`bond`)
- [ ] 4x4 Amphibie « Loutre » (`amphibie`)

### 2. Refonte totale
- [ ] Quad « Scorpide » (`quad`)
- [ ] Buggy-canon « Sirocco » (`buggyCanon`)

### 3. Vedettes
- [ ] Vedette « Sirène » (`bateau`) et Vedette de police (`bateauP`) : matériaux, direction, passe complète

### 4. Méga-yacht
- [ ] Méga-yacht « Reyes Royale » (`grandyacht`) : vraie coque, plateforme de bain, montée à bord

### Fin
- [ ] Suite complète, performances, CLAUDE.md, récap
