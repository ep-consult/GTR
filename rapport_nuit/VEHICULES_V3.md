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
- [x] Interceptor (`police`) — berline de patrouille à capot plat (la silhouette gardée), caisse profilée, habitacle vitré, portières blanches « POLICE », toit blanc à indicatif, rampe de gyrophares sur socle (feux animés par véhicule, `ud.bar`), pare-buffle à flashs, projecteur orientable, antennes, doubles phares ronds, jantes acier ; intérieur : cage, terminal embarqué, fusil, sièges, banquette ; conducteur visible ; 1re personne fermée (pavillon, combiné police). 29 maillages. Rendus : `captures/vehicules_v3/police_exterieur.png`, `captures/vehicules_v3/police_jeu.png`
- [x] Camion « Aigle » (`milit`) — camion militaire tout-terrain : capot long et étroit, calandre à barreaux, ailes plates, phares ronds grillagés, pare-chocs d'acier à crochets, treuil et numéro « AIGLE-07 », cabine à pare-brise en deux panneaux, étoiles sur les portières, marchepieds, plateau à ridelles sous bâche sur arceaux (ouverture arrière, bâche roulée, sangles), garde-boue, bavettes, châssis à longerons, réservoir, coffre, échappement vertical, roue de secours derrière la cabine, gros pneus à crampons sur jantes à boulons ; intérieur : planche métallique, gros volant, deux sièges, leviers, radio ; 1re personne militaire fermée. 28 maillages. Rendus : `captures/vehicules_v3/milit_exterieur.png`, `captures/vehicules_v3/milit_jeu.png`
- [x] Taxi (`taxi`) — berline jaune à capot plat (le gabarit de l'Interceptor, à ses propres cotes), damier sur les flancs, « LOS REYES CAB » sur les portières avant, lanterne TAXI éclairée, pare-chocs chromés, jantes acier chromées ; intérieur : séparation à cadre, taximètre rouge, sièges, banquette ; ancrages du garage mesurés sur la nouvelle caisse (`VEH_V3.taxi.ancrages`), pièces vérifiées en rendu (aileron, prise d'air, jupes). 27 maillages. Rendus : `captures/vehicules_v3/taxi_exterieur.png`, `captures/vehicules_v3/taxi_jeu.png`, `captures/vehicules_v3/pieces_taxi_van.png`
- [x] Blindé « Bastion » (`blinde`) — l'ancien n'avait pas de modèle à lui (la berline générique sous une bâche) : véhicule blindé à roues façon MRAP — coque en V entre les roues, caisse blindée large (pans coupés), capot incliné à ouïes, pare-brise blindé en deux panneaux et petites vitres de cabine, gros montants, portière latérale à charnières et hublots blindés, « BASTION » au pochoir, tourelleau et mitrailleuse sur affût à bouclier, trappe ouverte, lance-fumigènes, antennes fouet, phares en cage, calandre à fentes, pare-buffle, treuil, porte arrière à charnières, roue de secours, jerricans, gros pneus à crampons ; intérieur : planche, volant, deux sièges, écran tactique ; 1re personne fermée. 28 maillages. Rendus : `captures/vehicules_v3/blinde_exterieur.png`, `captures/vehicules_v3/blinde_jeu.png`
- [x] Camion DCA « Foudre » (`dca`) — porteur militaire à cabine avancée (grand vitrage, calandre à lames, marchepieds, rétroviseurs, feux de gabarit, « FOUDRE »), plateau à ridelles et garde-corps, bitube antiaérien sur tourelle (couronne, plateau tournant, flasques, bouclier, siège du tireur, chargeurs, viseur, cache-flammes) qui reste le groupe `ud.tourelle` visé par `majConduite` (vérifié : 1,57 rad attendu, 1,57 obtenu), radar de veille qui tourne sur la cabine (`ud.anim`), béquilles repliées, caisses de munitions, coffres, réservoir ; intérieur : grand volant presque à plat, deux sièges, écran radar ; 1re personne fermée. 33 maillages. Rendus : `captures/vehicules_v3/dca_exterieur.png`, `captures/vehicules_v3/dca_jeu.png`
- [x] Ambulance « Secours » (`ambulance`) — fourgon à cellule sanitaire : cabine à capot court (calandre chromée, sirène sur le bouclier, « AMBULANCE » inversé), grande cellule plus large et plus haute (passage de roue découpé au-dessus de l'axe), livrée blanche à bandes rouges, étoiles de vie, « AMBULANCE », porte latérale à hublot et marche, coffres côté conducteur, portes arrière vitrées à chevrons, mains courantes, projecteurs de zone, climatisation, rampe et feux d'angle rouges et blancs (deux maillages, deux matériaux par véhicule, `ud.bar` animé par `majBarAmbulance`) ; intérieur : planche, volant, deux sièges, cloison et écran ; 1re personne : œil reculé (`COCKPIT_DEFS.ambulance`), pavillon dans le champ. 34 maillages. Rendus : `captures/vehicules_v3/ambulance_exterieur.png`, `captures/vehicules_v3/ambulance_jeu.png`
- [x] Grue « Marteau » (`grue`) — grue mobile : porteur à cabine (calandre chromée, pare-chocs hachurés, gyrophare, rétroviseurs, marchepieds), châssis et ailes, stabilisateurs repliés aux quatre coins, tourelle (couronne, superstructure, grilles du moteur, contrepoids hachuré), cabine d'opérateur vitrée (siège, leviers), flèche télescopique en deux tronçons qui passe au-dessus de la cabine, raidisseurs, tête à poulie, vérin de relevage ; le boulet garde son contrat (`ud.ancrage` au même point, `ud.cable`, `ud.boulet` : vérifié, il balance de 3,2 u et le câble relie la tête au boulet), boulet à manille ; intérieur : planche à écran de charge, volant, deux sièges ; 1re personne : œil à la tête du conducteur (`COCKPIT_DEFS.grue`). 30 maillages. Rendus : `captures/vehicules_v3/grue_exterieur.png`, `captures/vehicules_v3/grue_jeu.png`
- [x] Dépanneuse « Grizzly » (`depanneuse`) — dépanneuse lourde : capot court, grosse calandre chromée, doubles phares, cheminées chromées, cabine, « GRIZZLY — DÉPANNAGE 24/24 », coffres latéraux au-dessus des roues, arceau, potence à deux flasques et raidisseurs, vérin, deux treuils, poulie, câble et crochet, bras de levage à fourches, panneau arrière hachuré, rampe ambre (`ud.gyroAmbre`, matériau par véhicule) ; en remorquage, l'élingue relie la potence au véhicule tracté et le crochet se range (cosmétique, `ud.anim` ; vérifié par le test V3) ; intérieur : planche, volant, banquette ; 1re personne : œil recalé (`COCKPIT_DEFS.depanneuse` 0,55 → 0,12). 28 maillages. Rendus : `captures/vehicules_v3/depanneuse_exterieur.png`, `captures/vehicules_v3/depanneuse_remorque.jpg`, `captures/vehicules_v3/depanneuse_jeu.png`
- [x] GT « Agent Gris » (`bond`) — coupé grand tourisme des années 60 : profil fastback (long capot, prise d'air, malle courte), pavillon, montants chromés et custodes, phares ronds cerclés de chrome, calandre en écusson à lames chromées, pare-chocs lames à butoirs, ouïes d'aile, rétroviseurs obus sur les ailes, joncs chromés, feux arrière ronds, deux échappements, plaques « AG 1964 », roues à rayons croisés et papillons ; gadgets visibles : canons sous les phares, trappe à huile ; intérieur : planche en bois et compteurs ronds, volant à jante bois, baquets de cuir fauve, petite banquette, console à bouton rouge ; 1re personne : œil à la tête du conducteur (`COCKPIT_DEFS.bond`). 23 maillages. Rendus : `captures/vehicules_v3/bond_exterieur.png`, `captures/vehicules_v3/bond_jeu.png`
- [x] 4x4 Amphibie « Loutre » (`amphibie`) — coque de bateau (étrave relevée, fond plat, tableau arrière) aux passages de roue découpés, caisse de 4x4 vitrée par-dessus (capot court, cabine longue, hayon), liston de flottaison en caoutchouc, anneau d'étrave et défense, hélice sous le tableau dans son tunnel (elle tourne en navigation, à la distance parcourue : `ud.anim`) et gouvernail, schnorchel, galerie de toit (roue de secours à plat, jerricans, pagaie), feux de navigation rouge (bâbord) et vert (tribord), feu de mât, échelle arrière, gros pneus à crampons ; sur l'eau, la coque s'enfonce à mi-hauteur (`ud.flottaison`, tirant d'eau cosmétique appliqué en douceur à l'entrée dans l'eau, à flot comme garé) ; intérieur : planche à compas de route, volant, quatre sièges ; 1re personne fermée. 30 maillages. Test « 4x4 amphibie » vert. Rendus : `captures/vehicules_v3/amphibie_exterieur.png`, `captures/vehicules_v3/amphibie_mer.jpg`, `captures/vehicules_v3/amphibie_jeu.png`

### 2. Refonte totale
- [ ] Quad « Scorpide » (`quad`)
- [ ] Buggy-canon « Sirocco » (`buggyCanon`)

### 3. Vedettes
- [ ] Vedette « Sirène » (`bateau`) et Vedette de police (`bateauP`) : matériaux, direction, passe complète

### 4. Méga-yacht
- [ ] Méga-yacht « Reyes Royale » (`grandyacht`) : vraie coque, plateforme de bain, montée à bord

### Fin
- [ ] Suite complète, performances, CLAUDE.md, récap
