# Véhicules V4 — tous les véhicules au niveau V3

Branche `vehicules-v4` (partie de `monster-truck-ecrasement`, qui contient les véhicules V3 et le Monster Truck).
Référence de qualité minimum : `rapport_nuit/VEHICULES_V3.md` et le Monster Truck V3.
**Si la conversation est résumée, reprendre à partir de ce fichier** (cases cochées = fait, commité, vérifié en rendu).

## Avant de commencer

- Suite complète `scenarios.js` relancée après le correctif du bulldozer : voir « Mesures et tests » plus bas.
- La branche `monster-truck-ecrasement` contient bien les commits « Véhicules V3 » (`nuit-revue-globale` en est un ancêtre) :
  `vehicules-v4` créée depuis elle. Rien n'est fusionné.

## Ce qui change pour tous (infrastructure V4, `index.html`, bandeau `VÉHICULES V4`)

- **Carrosserie lissée** (`loftV4`, `carrosserieV4`) : des sections le long du véhicule (bas, haut, demi-largeur, rentrée des flancs,
  épaule, bombé) reliées en une surface lisse — flancs galbés, nez et poupe arrondis en plan, passages de roue en arc. Les pièces
  épousent la surface (`S.bande`, `S.pose`, `poserV4`). Le V3 extrudait un profil de côté : des flancs plats, « une boîte biseautée ».
- **Verrière** (`verriereV4`, `montantsV4`) : un seul verre teinté transparent qui part de l'épaule et rentre vers le toit, pavillon et
  montants peints posés dessus.
- **Intérieur** (`interieurV4`) et conducteur (`conducteurV4`), comme le V3 ; intérieur propre à chaque modèle (planche, volant,
  sièges, écran, cadrans).
- **Niveau de détail du trafic** (`lod:true`, `lodPoserV4`, `majLodV4`) : au-delà de `LOD_LOIN` (62 u) du joueur, les pièces de
  détail, les roues, l'intérieur et le conducteur s'effacent derrière UN maillage fusionné à couleurs de sommets (peinture et verre
  restent ceux du modèle) ; retour en deçà de `LOD_PROCHE` (54 u). Le véhicule du joueur, un véhicule touché, déformé ou en épave
  reste détaillé (`lodFixerV4`). Le maillage lointain est sur le calque 1 : la caméra le voit, aucun rayon du jeu ne le touche.

## Inventaire (lu dans le code : `VEHDEFS`, `makeHeli`, `mkAvionBanderole`)

Mesuré par un script qui construit chaque modèle du code d'AVANT la V4 (`makeVoiture` pour chaque clé de `VEHDEFS`, `makeHeli` pour les
deux hélicos ennemis, `mkAvionBanderole` pour l'avion à banderole du décor) — rien n'est recopié de mémoire. « Objets dessinés » :
maillages et sprites visibles du modèle. « Vitres » : transparentes (on voit dedans), opaques (boîte sombre en guise de verre),
aucune. Les avions et hélicos du décor (avion de tourisme du tour de piste, Écureuil de la tour, long-courriers de l'aérogare, Vautour
du camp) sont construits par `makeVoiture` : ils suivront leur modèle. Comparé à la liste des avions et hélicos de la demande : tous y
sont ; s'ajoutent l'avion à banderole du décor (Piper Super Cub) et les deux hélicos ennemis (le « Rapace » de la police et le « Vautour »
de l'armée, qui est aussi le modèle du Vautour pilotable).

| Clé | Nom | Famille | Objets dessinés | Vitres | Conducteur visible | Intérieur | Classement |
|---|---|---|---|---|---|---|---|
| `citadine` | Citadine | car | 16 | transparentes | buste PNJ seulement | non | à remettre à niveau — groupe 1 trafic civil |
| `muscle` | Muscle "Rafale" | car | 27 | opaques (1) | non | non | à remettre à niveau — groupe 1 trafic civil |
| `van` | Fourgon | car | 27 | transparentes | oui (V3) | oui | déjà V3 |
| `police` | Interceptor | car | 30 | transparentes | oui (V3) | oui | déjà V3 |
| `gangcar` | Berline Viper | car | 16 | transparentes | buste PNJ seulement | non | à remettre à niveau — groupe 3 voitures pilotables |
| `milit` | Camion "Aigle" | car | 29 | transparentes | oui (V3) | oui | déjà V3 |
| `moto` | Moto | moto | 23 | aucune | oui, en selle | non | à remettre à niveau — groupe 4 deux-roues |
| `motoR` | Moto "Frelon" | moto | 23 | aucune | oui, en selle | non | à remettre à niveau — groupe 4 deux-roues |
| `velo` | Vélo de ville | moto | 17 | aucune | oui, en selle | non | à remettre à niveau — groupe 4 deux-roues |
| `bmx` | BMX | moto | 17 | aucune | oui, en selle | non | à remettre à niveau — groupe 4 deux-roues |
| `skate` | Skateboard | moto | 11 | aucune | oui, en selle | non | à remettre à niveau — groupe 4 deux-roues |
| `motocross` | Moto cross | moto | 23 | aucune | oui, en selle | non | à remettre à niveau — groupe 4 deux-roues |
| `sport` | Supercar "Éclipse" | car | 16 | transparentes | buste PNJ seulement | non | à remettre à niveau — groupe 1 trafic civil |
| `taxi` | Taxi | car | 28 | transparentes | oui (V3) | oui | déjà V3 |
| `pickup` | Pickup | car | 17 | transparentes | buste PNJ seulement | non | à remettre à niveau — groupe 1 trafic civil |
| `buggy` | Buggy des dunes | car | 63 | aucune | non | non | à remettre à niveau — groupe 3 voitures pilotables |
| `yacht` | Yacht "Impérial" | bateau | 14 | opaques (1) | oui, debout | non | à remettre à niveau — groupe 7 bateaux et engins de plage |
| `bateau` | Vedette "Sirène" | bateau | 25 | transparentes | oui (V3) | oui | déjà V3 |
| `surf` | Planche de surf | bateau | 5 | aucune | non | non | à remettre à niveau — groupe 7 bateaux et engins de plage |
| `kayak` | Kayak | bateau | 8 | aucune | non | non | à remettre à niveau — groupe 7 bateaux et engins de plage |
| `jetski` | Jet-ski | bateau | 9 | opaques (1) | oui, debout | non | à remettre à niveau — groupe 7 bateaux et engins de plage |
| `berline` | Berline | car | 16 | transparentes | buste PNJ seulement | non | à remettre à niveau — groupe 1 trafic civil |
| `motoS` | Moto sportive | moto | 22 | aucune | oui, en selle | non | à remettre à niveau — groupe 4 deux-roues |
| `bateauP` | Vedette de police | bateau | 32 | transparentes | oui (V3) | oui | déjà V3 |
| `peche` | Bateau de pêche | bateau | 29 | opaques (1) | oui, debout | non | à remettre à niveau — groupe 7 bateaux et engins de plage |
| `fantome` | Moto "Fantôme" | moto | 24 | aucune | oui, en selle | non | à remettre à niveau — groupe 4 deux-roues |
| `blinde` | Blindé "Bastion" | car | 29 | transparentes | oui (V3) | oui | déjà V3 |
| `jeepMil` | Jeep militaire "Guépard" | car | 85 | opaques (1) | oui, assis | non | à remettre à niveau — groupe 3 voitures pilotables |
| `dca` | Camion DCA "Foudre" | car | 34 | transparentes | oui (V3) | oui | déjà V3 |
| `grandyacht` | Méga-yacht "Reyes Royale" | bateau | 30 | transparentes | oui (V3) | oui | déjà V3 |
| `cargo` | Porte-conteneurs "Reyes Star" | bateau | 3 | aucune | oui, debout | non | à remettre à niveau — groupe 7 bateaux et engins de plage |
| `espadon` | Vedette "Espadon" | bateau | 18 | opaques (2) | oui, debout | non | à remettre à niveau — groupe 7 bateaux et engins de plage |
| `mirage` | Supercar "Mirage" | car | 16 | transparentes | buste PNJ seulement | non | à remettre à niveau — groupe 3 voitures pilotables |
| `ovni` | OVNI "Zeta-9" | air-helico | 16 | transparentes | non | non | à ne pas toucher (demandé : la soucoupe « Zeta-9 » est très bien, on la laisse) |
| `quad` | Quad "Scorpide" | car | 22 | aucune | oui (V3) | oui | déjà V3 |
| `motoMil` | Moto cross militaire | moto | 23 | aucune | oui, en selle | non | à remettre à niveau — groupe 4 deux-roues |
| `buggyCanon` | Buggy-canon "Sirocco" | car | 26 | aucune | oui (V3) | oui | déjà V3 |
| `bulldozer` | Bulldozer "Titan" | car | 92 | opaques (1) | non | non | à remettre à niveau — groupe 3 voitures pilotables |
| `grue` | Grue "Marteau" | car | 31 | transparentes | oui (V3) | oui | déjà V3 |
| `ambulance` | Ambulance "Secours" | car | 35 | transparentes | oui (V3) | oui | déjà V3 |
| `depanneuse` | Dépanneuse "Grizzly" | car | 28 | transparentes | oui (V3) | oui | déjà V3 |
| `scarabee` | Buggy "Scarabée" | car | 62 | aucune | non | non | à remettre à niveau — groupe 3 voitures pilotables |
| `amphibie` | 4x4 Amphibie "Loutre" | car | 31 | transparentes | oui (V3) | oui | déjà V3 |
| `bond` | GT "Agent Gris" | car | 24 | transparentes | oui (V3) | oui | déjà V3 |
| `baronne` | Ancienne "Baronne" | car | 20 | transparentes | buste PNJ seulement | non | à remettre à niveau — groupe 3 voitures pilotables |
| `avion` | Avion "Colibri" | air-avion | 16 | aucune | non | non | à remettre à niveau — groupe 6 avions |
| `char` | Char "Rhinocéros" | car | 61 | aucune | non | non | à remettre à niveau — groupe 3 voitures pilotables |
| `chasseur` | Chasseur "Épervier" | air-avion | 20 | aucune | non | non | à remettre à niveau — groupe 6 avions |
| `tourisme` | Avion de tourisme "Pélican" | air-avion | 24 | opaques (2) | non | non | à remettre à niveau — groupe 6 avions |
| `jetprive` | Jet privé "Albatros" | air-avion | 34 | opaques (12) | non | non | à remettre à niveau — groupe 6 avions |
| `ligne` | Long-courrier "Reyes Air" | air-avion | 33 | opaques (1) | non | non | à remettre à niveau — groupe 6 avions |
| `fret` | Cargo "Baleine" | air-avion | 36 | opaques (1) | non | non | à remettre à niveau — groupe 6 avions |
| `tracteurPiste` | Tracteur de piste "Mule" | car | 18 | opaques (1) | non | non | à remettre à niveau — groupe 3 voitures pilotables |
| `citerne` | Camion-citerne "Kérosène" | car | 27 | opaques (3) | non | non | à remettre à niveau — groupe 3 voitures pilotables |
| `escalier` | Passerelle mobile "Échelle" | car | 35 | opaques (1) | non | non | à remettre à niveau — groupe 3 voitures pilotables |
| `bagagiste` | Tracteur à bagages "Valise" | car | 36 | aucune | non | non | à remettre à niveau — groupe 3 voitures pilotables |
| `voltige` | Voltige "Colibri Rouge" | air-avion | 19 | aucune | non | non | à remettre à niveau — groupe 6 avions |
| `vautour` | Hélico de combat "Vautour" | air-helico | 28 | transparentes | non | non | à remettre à niveau — groupe 5 hélicoptères |
| `vip` | Hélico VIP "Riviera" | air-helico | 27 | opaques (2) | non | non | à remettre à niveau — groupe 5 hélicoptères |
| `ecureuil` | Hélico "Écureuil" | air-helico | 26 | transparentes | non | non | à remettre à niveau — groupe 5 hélicoptères |
| `titan` | Hélico-grue "Titan" | air-helico | 42 | opaques (2) | non | non | à remettre à niveau — groupe 5 hélicoptères |
| `helico` | Hélico "Libellule" | air-helico | 23 | aucune | non | non | à remettre à niveau — groupe 5 hélicoptères |
| `busville` | Bus de ville | car | 28 | opaques (3) | non | non | à remettre à niveau — groupe 1 trafic civil |
| `pompiers` | Camion de pompiers | car | 35 | opaques (1) | non | non | à remettre à niveau — groupe 2 police et urgences |
| `jeep` | 4x4 "Coyote" | car | 79 | opaques (1) | oui, assis | non | à remettre à niveau — groupe 1 trafic civil |
| `monstertruck` | Monster Truck | car | 41 | transparentes | oui (V3) | oui | déjà V3 |
| `depotCitadine` | La Citadine | car | 16 | transparentes | non | non | suit `citadine` (même modèle, à la couleur du Dépôt) |
| `depotPickup` | Le Pick-up | car | 17 | transparentes | non | non | suit `pickup` (même modèle, à la couleur du Dépôt) |
| `depotBolide` | Le Bolide | car | 16 | transparentes | non | non | suit `sport` (même modèle, à la couleur du Dépôt) |
| `depotBus` | Le Bus | car | 28 | opaques (3) | non | non | suit `busville` (même modèle, à la couleur du Dépôt) |
| `limousine` | Limousine "Majesté" | car | 16 | transparentes | buste PNJ seulement | non | à remettre à niveau — groupe 1 trafic civil |
| `suvLuxe` | SUV de luxe "Sierra" | car | 16 | transparentes | buste PNJ seulement | non | à remettre à niveau — groupe 1 trafic civil |
| `cabriolet` | Cabriolet "Azur" | car | 17 | transparentes | oui si ouvert | non | à remettre à niveau — groupe 1 trafic civil |
| `charger` | Muscle "Taureau" | car | 16 | transparentes | buste PNJ seulement | non | à remettre à niveau — groupe 1 trafic civil |
| `hyper` | Hypercar "Zénith" | car | 16 | transparentes | buste PNJ seulement | non | à remettre à niveau — groupe 3 voitures pilotables |
| `bolide` | Bellatti "Bolide" | car | 17 | transparentes | buste PNJ seulement | non | à remettre à niveau — groupe 1 trafic civil |
| `enzo` | Ferroni "Enzo" | car | 15 | transparentes | buste PNJ seulement | non | à remettre à niveau — groupe 1 trafic civil |
| `derbyBreak` | Break « Corbillard » | car | 16 | transparentes | buste PNJ seulement | non | à remettre à niveau — groupe 3 voitures pilotables |
| `derbyCompacte` | Citadine « Savonnette » | car | 16 | transparentes | buste PNJ seulement | non | à remettre à niveau — groupe 3 voitures pilotables |
| `derbyPickup` | Pick-up « Bétaillère » | car | 17 | transparentes | buste PNJ seulement | non | à remettre à niveau — groupe 3 voitures pilotables |
| `heliEnnemi_police` | heliEnnemi_police | air-helico | 27 | transparentes | non | non | à remettre à niveau — groupe 5 hélicoptères |
| `heliEnnemi_armee` | heliEnnemi_armee | air-helico | 28 | transparentes | non | non | à remettre à niveau — groupe 5 hélicoptères |
| `avionBanderole` | avionBanderole | air-avion (décor) | 5 | aucune | non | non | à remettre à niveau — groupe 6 avions |

Classement : **déjà V3** (17) ; **à ne pas toucher** : la soucoupe ; **suivent leur modèle** : les quatre véhicules du Dépôt ; **à remettre
à niveau** : tout le reste (63 modèles, dont les deux hélicos ennemis et l'avion à banderole). Les bateaux et engins de plage ne sont pas
dans l'ordre demandé : ils passent en dernier (groupe 7).

## TODO — ordre de traitement

### 1. Trafic civil
- [x] Citadine (`citadine`) → Mini Cooper — 30 objets de près (16 avant), 4 de loin ; captures `captures/vehicules_v4/citadine_*.png`
- [x] Berline (`berline`) → Tesla Model 3 — toit de verre teinté, phares fins, jantes aéro, intérieur blanc et grand écran ; captures `berline_*`
- [x] Muscle « Rafale » (`muscle`) → Ford Mustang Fastback 1967 — calandre profonde, écopes, bandes Le Mans, feux à trois barres ; captures `muscle_*`
- [x] Pickup (`pickup`) → Ford F-150 Raptor — benne ouverte, calandre noire et trois feux orange, élargisseurs, feux de gabarit ; captures `trafic_lot1_*`
- [x] SUV de luxe « Sierra » (`suvLuxe`) → Cadillac Escalade — calandre chromée à maillage, diodes verticales, feux sur les montants, barres de toit ; `trafic_lot1_*`
- [x] Cabriolet « Azur » (`cabriolet`) → Mercedes-Benz SL (R230) — doubles phares ovales, barre chromée, arceaux, cuir clair ; `trafic_lot1_*`
- [x] Supercar « Éclipse » (`sport`) → Porsche 911 (992) — phares ronds sur les ailes, capot creux, bandeau arrière, grille moteur et aileron ; `trafic_lot1_*`
- [x] Muscle « Taureau » (`charger`) → Dodge Charger R/T 1969 — calandre pleine largeur partagée, arcs-boutants, bande « bumblebee », deux longs feux ; `trafic_lot1_*`
- [x] 4x4 « Coyote » (`jeep`) → Jeep Wrangler (JL) — ouvert, sept fentes, ailes noires détachées, arceau, roue de secours ; conducteur assis visible ; `trafic_lot2_*`
- [x] Limousine « Majesté » (`limousine`) → Lincoln Town Car limousine — calandre à barres, joncs chromés, section des passagers teintée, banquettes en L et bar ; `trafic_lot2_*`
- [x] Bus de ville (`busville`) → New Flyer Xcelsior (bus urbain de Los Angeles) — girouette à diodes, portes vitrées, support à vélos, carénages de toit, sièges et barres ; essieux gardés à ±3,36 (règle des roues) ; `trafic_lot2_*`
- [x] Bellatti « Bolide » (`bolide`) → Bugatti Chiron — fer à cheval cerclé de chrome, courbe en C autour de l'entrée d'air, arête dorsale, bandeau de feux, quatre sorties ; aileron actif gardé (`ud.volet`, masqué de loin) ; `ultimes_*`
- [x] Ferroni « Enzo » (`enzo`) → Ferrari Enzo — nez de F1 entre deux entrées d'air, phares étirés sur les ailes, prises latérales, V12 rouge sous le capot vitré, quatre feux ronds ; `ultimes_*`
- [x] déjà V3 : Taxi, Interceptor, Fourgon (niveau de détail ajouté : ils roulent dans le trafic)

### 2. Police et urgences
- [x] Camion de pompiers (`pompiers`) → Pierce Arrow XT (autopompe des pompiers de Los Angeles) — cabine avancée à toit blanc, croix de Malte dorée, coffres à volets roulants, lit de tuyaux, échelle, chevrons ; rampe (`ud.gyro`) et canon (`ud.lance`) gardés ; `pompiers_*`
- [x] déjà V3 : Interceptor, Ambulance, Vedette de police ; la moto de police (`motoS`) est au groupe 4, l'hélico « Rapace » au groupe 5

### 3. Voitures pilotables restantes
- [x] Berline Viper (`gangcar`) → Chevrolet Impala 1964 lowrider — calandre à barres et quatre phares, trois feux ronds, jantes à rayons et flancs blancs, roue « continental », filets dorés ; `pilotables_lot1_*`
- [x] Supercar « Mirage » (`mirage`) → Lamborghini Huracán — coin taillé, phares et feux en « Y », prises triangulaires, ouïes hexagonales, grille hexagonale, quatre sorties ; `pilotables_lot2_*`
- [x] Hypercar « Zénith » (`hyper`) → McLaren P1 — verrière en goutte, phares en virgule, prise de toit, poupe en grille sous un feu en « C », sortie centrale, aileron ; `pilotables_lot2_*`
- [x] Ancienne « Baronne » (`baronne`) → Cadillac Eldorado 1959 — ailerons et feux-obus, toit vinyle, calandre « bijou », pare-chocs à obus, larges flancs blancs ; `pilotables_lot1_*`
- [x] Buggy des dunes (`buggy`) → Meyers Manx — baignoire en fibre, ailes en arches, flat-four à nu, arceau, numéro 23 ; ouvert, conducteur assis ; `pilotables_lot1_*`
- [x] Buggy « Scarabée » (`scarabee`) → Volkswagen Coccinelle « Baja Bug » cabriolet — ailes rondes raccourcies, phares dressés, feux sur les ailes, arceau et rampe, moteur à nu, numéro 7 ; `pilotables_lot1_*`
- [x] Jeep militaire « Guépard » (`jeepMil`) → AM General Humvee **M998 ouvert** (et non M1151 : le cockpit est déclaré ouvert) — calandre à fentes, sans portes, tunnel central, bâche, arceau et tourelle (`ud.tourelle`) ; `pilotables_lot3_*`
- [x] Char « Rhinocéros » (`char`) → M1A2 Abrams — tourelle plate à facettes, canon à manchon et évacuateur, viseurs du tireur et du chef, coupole, fumigènes, panier, jupes et sept galets ; `ud.tourelle` gardée ; `pilotables_lot3_*`
- [x] Bulldozer « Titan » (`bulldozer`) → Caterpillar D6 — chenilles en triangle à barbotin surélevé, cabine de sécurité, cheminée et préfiltre, lame sur bras et vérins (`ud.pelle` gardé), défonceuse, « CAT D6 » ; `pilotables_lot3_*`
- [ ] Tracteur de piste « Mule » (`tracteurPiste`) → tracteur de repoussage d'avion (Goldhofer AST)
- [ ] Camion-citerne « Kérosène » (`citerne`) → avitailleur sur porteur Kenworth
- [ ] Passerelle mobile « Échelle » (`escalier`) → camion-escalier d'aéroport
- [ ] Tracteur à bagages « Valise » (`bagagiste`) → TUG MA-50 et ses chariots
- [ ] Break « Corbillard » (`derbyBreak`) → Chevrolet Caprice Estate 1977 (le break des derbys)
- [ ] Citadine « Savonnette » (`derbyCompacte`) → AMC Pacer
- [ ] Pick-up « Bétaillère » (`derbyPickup`) → Chevrolet C10 1979

### 4. Deux-roues
- [ ] Moto (`moto`) → Triumph Bonneville T120
- [ ] Moto « Frelon » (`motoR`) → Honda CB600F Hornet
- [ ] Moto sportive (`motoS`, aussi la moto de police) → Yamaha YZF-R1
- [ ] Moto cross (`motocross`) → KTM 450 SX-F
- [ ] Moto cross militaire (`motoMil`) → Kawasaki KLR650 M1030 (moto militaire)
- [ ] Moto « Fantôme » (`fantome`) → Harley-Davidson Fat Boy
- [ ] Vélo de ville (`velo`) → Electra Townie (vélo de plage californien)
- [ ] BMX (`bmx`) → BMX de street (Mongoose Legion)
- [ ] Skateboard (`skate`) → planche de street

### 5. Hélicoptères
- [ ] Hélico « Libellule » (`helico`) → Robinson R44
- [ ] Hélico « Écureuil » (`ecureuil`) → Airbus AS350 Écureuil
- [ ] Hélico VIP « Riviera » (`vip`) → AgustaWestland AW109
- [ ] Hélico de combat « Vautour » (`vautour`, et la version armée ennemie `makeHeli('armee')`) → Boeing AH-64 Apache
- [ ] Hélico « Rapace » de la police (`makeHeli('police')`) → Airbus EC135
- [ ] Hélico-grue « Titan » (`titan`) → Sikorsky S-64 Skycrane (vérifier la finition)

### 6. Avions
- [ ] Avion « Colibri » (`avion`) → Cessna 172
- [ ] Avion de tourisme « Pélican » (`tourisme`) → Cirrus SR22
- [ ] Voltige « Colibri Rouge » (`voltige`) → Extra 300
- [ ] Chasseur « Épervier » (`chasseur`) → General Dynamics F-16
- [ ] Jet privé « Albatros » (`jetprive`) → Learjet 75
- [ ] Long-courrier « Reyes Air » (`ligne`) → Airbus A320
- [ ] Cargo « Baleine » (`fret`) → Lockheed C-130 Hercules
- [ ] Avion à banderole du décor (`mkAvionBanderole`) → Piper PA-18 Super Cub

### 7. Bateaux et engins de plage (pas dans l'ordre demandé : en dernier)
- [ ] Yacht « Impérial » (`yacht`) → Sunseeker Predator 74
- [ ] Bateau de pêche (`peche`) → caseyeur côtier à timonerie (type Downeast)
- [ ] Jet-ski (`jetski`) → Sea-Doo GTX
- [ ] Vedette « Espadon » (`espadon`) → Cigarette Top Gun (offshore)
- [ ] Porte-conteneurs « Reyes Star » (`cargo`) → porte-conteneurs classe Triple-E
- [ ] Kayak (`kayak`) → kayak de mer « sit-on-top »
- [ ] Planche de surf (`surf`) → shortboard

### À ne pas toucher
- Soucoupe « Zeta-9 » (`ovni`), les 17 véhicules V3 et le Monster Truck.

## Fiches

### Citadine (`citadine`) → Mini Cooper (F56)
- **Silhouette** : courte (4,1 m de caisse) et haute, roues aux quatre coins, porte-à-faux très courts, capot court et bombé qui
  plonge vers la calandre, pare-brise assez droit, toit plat « flottant », hayon presque vertical.
- **Signature** : phares ronds posés sur le capot, cerclés de chrome avec une couronne de diodes ; grande calandre hexagonale à
  contour chromé et nid d'abeille ; toit de couleur contrastée (blanc, noir sur une caisse blanche) sur des montants noirs laqués ;
  rétroviseurs à la couleur du toit ; élargisseurs d'aile noirs et bas de caisse noir ; feux arrière verticaux ; répétiteur chromé
  derrière la roue avant ; prise d'air sur le capot.
- **Livrée** : les teintes du jeu (`VEHDEFS.citadine.cols` : gris clair, rouge, bleu, vert, jaune), toit contrasté.
- **Intérieur** : le grand cadran rond au milieu de la planche (chromé), interrupteurs à bascule, sièges sport, volant trois branches.

### Berline (`berline`) → Tesla Model 3
- **Silhouette** : berline fastback lisse et basse, nez plongeant sans calandre, pare-brise très incliné qui se prolonge en toit de
  verre jusqu'au coffre court.
- **Signature** : face avant lisse (aucune grille, une fente basse) ; phares fins étirés ; toit entièrement vitré teinté ; poignées
  affleurantes ; jantes aéro ; feux arrière fins en L qui entrent dans le coffre ; petit becquet.
- **Livrée** : gris graphite, bordeaux, bleu nuit, gris.
- **Intérieur** : planche horizontale minimaliste (une bande de bois), grand écran central flottant, aucun compteur derrière le volant,
  volant à deux branches, sièges blancs.

### Muscle « Rafale » (`muscle`) → Ford Mustang Fastback 1967
(La Rafale avait été gardée « comme avant » le 16 octobre : écope et bandes. La V4 garde cet esprit — c'est l'identité de la Rafale.)
- **Silhouette** : long capot, porte-à-faux arrière court, toit fastback qui tombe jusqu'au bout du coffre, hanches marquées.
- **Signature** : calandre profonde avec phares ronds aux coins ; écopes latérales devant les roues arrière ; écope de capot ;
  bandes Le Mans sur toute la longueur ; feux arrière à trois barres verticales ; pare-chocs chromés fins.
- **Livrée** : rouge, bleu nuit, violet, bandes blanches.
- **Intérieur** : deux grands cadrans ronds, volant à jante bois et trois branches, baquets en vinyle.

### Pickup (`pickup`) → Ford F-150 Raptor (2e génération)
- **Silhouette** : gros pick-up haut perché, capot très haut et plat, cabine double, benne ouverte, garde au sol de tout-terrain.
- **Signature** : énorme calandre noire avec quatre feux orange au-dessus ; élargisseurs d'aile noirs ; pare-chocs acier avec sabot ;
  marchepieds ; feux arrière verticaux ; benne ouverte et hayon ; pneus à crampons.
- **Livrée** : brique, bleu acier, olive ; détails noirs mats.
- **Intérieur** : planche massive à deux étages surpiquée d'orange, écran vertical, gros volant.

### SUV de luxe « Sierra » (`suvLuxe`) → Cadillac Escalade (5e génération)
- **Silhouette** : grand volume rectangulaire, capot haut et plat, pavillon long et horizontal, hayon vertical.
- **Signature** : énorme calandre chromée à maillage ; phares en colonnes verticales de diodes à l'avant et feux en longues colonnes
  verticales sur les montants arrière ; chrome des barres de toit et des contours de vitres ; marchepieds ; grandes jantes chromées.
- **Livrée** : noir, blanc nacré, gris, vert anglais.
- **Intérieur** : grand écran incurvé, cuir, boiserie, console haute.

### Cabriolet « Azur » (`cabriolet`) → Mercedes-Benz SL (R230)
- **Silhouette** : roadster deux places, long capot, habitacle reculé, coffre court, ouvert.
- **Signature** : doubles phares ovales ; calandre à barre horizontale chromée et écusson rond ; ouïes d'aile ; arceaux chromés
  derrière les sièges ; pare-brise à cadre chromé ; feux arrière en triangle.
- **Livrée** : blanc, rouge, bleu, jaune.
- **Intérieur** : cuir clair, deux cadrans sous casquette, volant sport.

### Supercar « Éclipse » (`sport`) → Porsche 911 (992)
- **Silhouette** : coupé 2+2, capot plongeant entre deux ailes saillantes, toit en goutte, moteur à l'arrière, hanches larges.
- **Signature** : phares ronds verticaux sur les ailes ; bandeau de feux pleine largeur à l'arrière ; grille moteur à lamelles et
  aileron ; entrées d'air basses à l'avant ; rétroviseurs sur les portières ; double sortie d'échappement.
- **Livrée** : orange, cyan, vert acide, blanc.
- **Intérieur** : cinq cadrans ronds (compte-tours au centre), volant trois branches.

### Muscle « Taureau » (`charger`) → Dodge Charger R/T 1969
- **Silhouette** : grand coupé, long capot plat, flancs en « bouteille de Coca », lunette encastrée entre les montants arrière.
- **Signature** : calandre noire pleine largeur aux phares cachés ; double bande « bumblebee » autour du coffre ; feux arrière en
  deux longs rectangles ; bouchon d'essence chromé sur l'aile ; montants arrière en arc-boutant.
- **Livrée** : noir, rouge, jaune, vert, blanc.
- **Intérieur** : baquets, levier « pistolet », compte-tours.

### 4x4 « Coyote » (`jeep`) → Jeep Wrangler (JL) deux portes
- **Silhouette** : petit tout-terrain carré, capot plat, pare-brise vertical, ailes séparées, ouvert (sans portes ni toit).
- **Signature** : calandre à sept fentes verticales entre deux phares ronds ; ailes noires détachées ; charnières apparentes ;
  arceau ; roue de secours sur le hayon ; pare-chocs acier et crochets rouges.
- **Livrée** : olive, sable, rouge, ivoire.
- **Intérieur** : planche verticale, poignée passager, sièges tissu.

### Limousine « Majesté » (`limousine`) → Lincoln Town Car limousine
- **Silhouette** : berline à trois volumes très allongée (7,2 m), section centrale à vitres teintées.
- **Signature** : calandre chromée à barres verticales ; phares rectangulaires ; montants chromés ; longues vitres teintées ;
  jantes chromées ; feux arrière en bandeau.
- **Livrée** : noir, blanc.
- **Intérieur** : banquettes en L, bar éclairé, diodes bleues au plafond.

### Bus de ville (`busville`) → New Flyer Xcelsior (bus urbain de Los Angeles)
- **Silhouette** : bus à plancher bas de 10,5 m, faces avant et arrière arrondies, grandes baies, toit à carénages.
- **Signature** : pare-brise bombé, girouette à diodes orange (« 7 LOS REYES ») ; porte avant double vitrée et porte centrale ;
  support à vélos à l'avant ; carénage de climatisation sur le toit ; livrée blanche et orange.
- **Intérieur** : sièges en plastique, barres jaunes, poste de conduite.

### Bellatti « Bolide » (`bolide`) → Bugatti Chiron
- **Silhouette** : hypercar à moteur central, large (2 m) et basse (1,2 m), verrière en goutte, hanches arrière massives.
- **Signature** : calandre en fer à cheval cerclée de chrome (écusson rouge) ; phares à quatre diodes en ligne ; courbe en C chromée
  sur le flanc autour de la grande entrée d'air ; arête dorsale du pare-brise à la poupe ; bandeau de feux pleine largeur ; diffuseur
  et quatre sorties au milieu ; aileron actif (le contrat `ud.volet` de `majVolet` est gardé : levé à 40 u/s, cabré au freinage).
- **Livrée** : bleu nuit, noir, argent, bordeaux (couleurs du jeu inchangées).
- **Intérieur** : cuir cognac (comme le cockpit V2 existant), la lame de lumière de la console.
- Fait seul : la verrière basse demandait que la planche se cale moins haut sous le pare-brise (`margePb` de `interieurV4`, sinon
  les sièges partaient derrière le toit) ; caissons des passages de roue réduits (ils perçaient le capot bas).

### Ferroni « Enzo » (`enzo`) → Ferrari Enzo
- **Silhouette** : hypercar à moteur central, ailes avant plus hautes que le capot creusé, verrière en goutte.
- **Signature** : nez de Formule 1 entre deux grandes entrées d'air ; phares étirés sur le haut des ailes ; grandes prises latérales
  derrière les portes papillon ; capot moteur vitré sur le V12 aux culasses rouges ; poupe noire à quatre feux ronds et grille ;
  deux sorties au milieu ; diffuseur ; becquet intégré ; écusson jaune.
- **Livrée** : rouge, jaune, noir.
- **Intérieur** : monocoque de carbone, baquets rouges (comme le cockpit V2).

### Camion de pompiers (`pompiers`) → Pierce Arrow XT (autopompe des pompiers de Los Angeles)
- **Silhouette** : cabine avancée à quatre portes, haute, grand pare-brise presque droit ; module de pompe, puis le corps à coffres.
- **Signature** : toit de cabine blanc et rampe de feux (bleue : choix du jeu, la police a déjà le rouge et bleu) ; calandre chromée à
  lames, pare-chocs allongé avec son tuyau enroulé et la sirène mécanique ; croix de Malte dorée « LOS REYES FIRE DEPT. » sur les portes ;
  panneau de pompe à manomètres et poignées de couleur ; volets roulants en alu ; lit de tuyaux jaunes et rouges ; échelle sur le toit ;
  chevrons rouges et jaunes à l'arrière ; canon sur le module de pompe.
- **Livrée** : rouge, toit blanc, bande blanche et filet doré.
- **Intérieur** : planche, capot moteur entre les sièges, sièges de l'équipage dos à dos et leurs bouteilles d'air jaunes.
- Contrats gardés : `ud.lance` (le canon orienté par `majLanceEau`, la buse au même point local), `ud.gyro` (deux feux à matériau propre,
  `majGyrophares`). Rétroviseurs « west coast » rapprochés de la cabine : la largeur reste dans les ±12 % du test.

### Berline Viper (`gangcar`) → Chevrolet Impala 1964 en lowrider (la voiture des Sunset Vipers)
- **Silhouette** : coupé hardtop très long et plat, arête de caisse franche, toit « formel » sans montant central, caisse au ras du sol.
- **Signature** : calandre pleine largeur à barres chromées et quatre phares ronds ; trois feux ronds de chaque côté dans leur jonc ;
  jantes à rayons chromées et flancs blancs fins (`flancBlancV4`, commun aux anciennes) ; roue de secours « continental » derrière le
  pare-chocs ; filets dorés sur le capot et la malle ; joncs chromés.
- **Livrée** : vert des Vipers. **Intérieur** : banquettes capitonnées crème, petit volant chaîne.

### Ancienne « Baronne » (`baronne`) → Cadillac Eldorado Seville 1959
- **Silhouette** : paquebot de 5,4 m, capot plat interminable, pare-brise panoramique, toit vinyle à larges montants.
- **Signature** : les plus grands ailerons de l'histoire et leurs feux-obus jumeaux ; ailes avant en visière sur quatre phares ;
  calandre « bijou » pleine largeur ; pare-chocs massifs à obus ; long jonc de flanc, panneau brossé de bas d'aile ; enjoliveurs
  chromés et larges flancs blancs. **Livrée** : bordeaux (couleur du jeu). **Intérieur** : banquettes de cuir crème, volant fin à cerclage.

### Buggy des dunes (`buggy`) → Meyers Manx
- **Silhouette** : baignoire en fibre sur un châssis de Coccinelle raccourci, ailes en arches au-dessus de grandes roues.
- **Signature** : deux phares ronds en saillie sur le nez ; petit pare-brise (abaissé : son cadre barrait la vue du cockpit) ; arceau ;
  flat-four à nu derrière (filtre chromé, sorties « stinger ») ; amortisseurs orange ; numéro de course sur le capot.
- Ouvert (`ud.siege`) : le conducteur est assis et visible ; l'arceau, les sièges, la planche s'effacent en 1re personne.

### Buggy « Scarabée » (`scarabee`) → Volkswagen Coccinelle « Baja Bug » cabriolet
- **Silhouette** : la caisse ronde de la Coccinelle, surélevée, ailes rondes raccourcies sur des pneus à crampons.
- **Signature** : phares dressés au bout des ailes avant, feux ronds sur les ailes arrière ; pare-brise droit ; capote repliée ; arceau
  et rampe de phares ; capot court ; moteur à nu ; pare-chocs tubulaires ; numéro 7 sur les portes.
- Fait seul : cabriolet, pour garder le cockpit existant (déclaré ouvert, avec cage). La rampe de phares s'efface en 1re personne.

### Supercar « Mirage » (`mirage`) → Lamborghini Huracán
- **Silhouette** : coin taillé au couteau (profil à arêtes franches), nez très bas, cabine avancée.
- **Signature** : phares à diodes en « Y » ; grandes prises triangulaires derrière les portes et l'arête qui les borde ; capot moteur à
  ouïes ; poupe en grille hexagonale, feux en « Y », quatre sorties par paires, diffuseur. **Livrée** : jaune (Giallo).
- **Intérieur** : carbone, baquets noirs, surpiqûres turquoise (comme le cockpit V2).

### Hypercar « Zénith » (`hyper`) → McLaren P1
- **Silhouette** : verrière en goutte qui file jusqu'au capot moteur ajouré, peau tendue sur la mécanique.
- **Signature** : phares en virgule ; prise d'air sur le toit ; énormes prises latérales ; poupe ouverte en grille noire sous un fin
  feu en « C » ; sortie d'échappement centrale ; aileron au ras de la poupe ; jantes noires. **Livrée** : blanc, noir, orange, violet.
- **Intérieur** : carbone, accents violets.
- Fait seul : l'œil du cockpit de la Coccinelle Baja (`COCKPIT_DEFS.scarabee`, relevé à la main pour l'ancien modèle) ramené à la hauteur
  des yeux d'un pilote assis (0,1 au lieu de 0,25) : la nouvelle caisse, rampe masquée en 1re personne, est plus basse que l'ancien œil.

### Jeep militaire « Guépard » (`jeepMil`) → AM General Humvee M998, version ouverte
- **Silhouette** : très large et bas, capot plat et long, sans portes, plateau bâché à l'arrière.
- **Signature** : calandre plate à fentes verticales et phares ronds dans ses coins ; pare-brise en deux glaces ; énorme tunnel central
  entre les sièges ; arceau et anneau de tourelle, mitrailleuse et son bouclier en trois plaques (`ud.tourelle`) ; étoile blanche sur le
  capot ; jerricans ; pneus à crampons, jantes militaires.
- Fait seul : le M1151 blindé et fermé était prévu, mais le cockpit de ce véhicule est ouvert (`CK_HAB.jeepMil`, `def.jeep`) : un Humvee
  ouvert reste cohérent, et le soldat assis au volant se voit (`ud.siege`).

### Char « Rhinocéros » (`char`) → M1A2 Abrams
- **Silhouette** : caisse longue et basse au glacis incliné, tourelle très large et plate à facettes (contour extrudé).
- **Signature** : canon de 120 lisse à manchon thermique et évacuateur ; viseur du tireur à droite, viseur panoramique du chef (CITV) à
  gauche ; coupole du chef et sa mitrailleuse, mitrailleuse du chargeur ; lance-pots fumigènes ; panier de tourelle chargé ; antennes ;
  jupes blindées sur sept galets doubles, barbotin denté ; grille d'échappement de la turbine.
- Contrats gardés : `ud.tourelle` (le canon tire depuis `def.long`, l'écrasement lit `def`) ; le pilote, tête sortie de son écoutille
  (`ud.conducteur`), disparaît en 1re personne (l'œil reste dans l'écoutille du chef).

### Bulldozer « Titan » (`bulldozer`) → Caterpillar D6
- **Silhouette** : chenilles en triangle au barbotin surélevé (« high drive »), capot moteur bas devant la cabine de sécurité vitrée.
- **Signature** : calandre perforée sous sa protection ; cheminée et préfiltre ; « CAT D6 » ; réservoir arrière ; défonceuse à une dent ;
  lame bombée sur ses bras et ses vérins ; phares de travail, gyrophare.
- Contrat gardé : `ud.pelle` (0,5 baissée, −0,15 levée) — la lame est dessinée baissée puis tournée de −0,5 autour du pivot. Les quatre
  « roues » du jeu sont les poulies avant et arrière, visibles par les flancs ouverts de la chenille. Défonceuse raccourcie et capot
  abaissé : la longueur reste dans les ±12 % et l'œil du cockpit passe au-dessus du capot.

## Mesures et tests

### Règle des roues
Le test « Véhicules V3 » (qui lit aussi les fiches V4) exige que chaque roue reste à moins de 0,25 u de celle de l'ancien modèle :
l'assiette des véhicules lit leur position. Les empattements V4 sont donc calés sur les anciens (relevé : `scratchpad/roues_old.txt`) ;
seule une refonte déclarée (`refonte:true`, comme le Monster Truck) y échappe.

### Avant de commencer
- Suite complète `scenarios.js` sur `monster-truck-ecrasement` + le correctif du bulldozer : **817 vérifications passées, 1 en échec**
  (« Intervention de la police : plus d'agent pour la balle perdue », qui passait au tour précédent : pendant les 30 s de fusillade
  simulée, le gang pouvait abattre tous les agents d'intervention). Le test maîtrise désormais sa scène (un agent est débarqué si tous
  sont tombés) ; rejoué seul sur deux graines et en forçant le cas « tous abattus » : vert. Commit `d431139`.
- Performance de référence (code d'avant la V4, `scratchpad/perf_v4.js`, même graine, vue immersive à pied au centre-ville après 40 s
  de trafic : 34 voitures de trafic, 17 à moins de 80 u ; rendu logiciel sans carte graphique, seules les proportions comptent) :
  rue à trafic dense **≈ 257 appels de rendu**, 51–55 ms par image ; trois hélicos ennemis à l'écran **≈ 317–347 appels**.
