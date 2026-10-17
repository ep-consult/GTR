# Cockpits V2 — suivi véhicule par véhicule (18 octobre)

Demandé : « amélioration globale des cockpits et des intérieurs de véhicules, un par un, sans en oublier ». Liste lue dans `VEHDEFS` (outil `rapport_nuit/outils/cap_cockpits_v2.js`, captures dans `rapport_nuit/captures/cockpits_v2/`). Chaque case cochée = intérieur refait, capturé et vérifié en rendu réel (devant, tête à gauche, tête à droite).

## Transversal

- [x] Conducteur à gauche (voitures, camions, bus, avions) — le trafic roule à droite ; jeep et cabriolet (siège et volant extérieurs) et silhouettes des conducteurs aussi
- [x] Messages en 1re personne au volant : en haut à gauche, sous les jauges, dans la bande du pavillon (body.ck1P)
- [x] Textes flottants (+250 $…) nés sur le véhicule : dans la pile, sur une ligne qui se remplace (ckTexte1P)
- [x] Moto : rétroviseurs sur tige depuis les leviers, tête au bout du guidon ; compteur rond chromé dans la tête de fourche (sportive : écran sous la bulle ; chopper : compteur chromé ; cross : plaque et écran de rallye, sans rétroviseurs)
- [ ] Mains et bras au volant
- [ ] Performances (appels de rendu fusionnés)
- [ ] Test « Cockpits V2 »

## Voitures

- [x] `citadine` — Citadine — cadran `moderne` : Deux cadrans à aiguilles, fond noir, chiffres blancs, aiguilles orange, petit écran central (rapport, compteur, essence) ; garnissage `moderne`
- [x] `muscle` — Muscle "Rafale" — cadran `muscle` : Années 70 : compte-tours et compteur à fond noir cerclés de chrome, rangée de trois manomètres (huile, eau, volts) ; garnissage `muscle`
- [x] `van` — Fourgon — cadran `utilitaire` : Un grand compteur, jauges d’essence et de température, totaliseur à cristaux liquides ; garnissage `utilitaire`
- [x] `police` — Interceptor — cadran `police` : Cadrans à fond bleu nuit, voyants de gyrophares, terminal embarqué et radio de police ; garnissage `police`
- [x] `gangcar` — Berline Viper — cadran `neon` : Cadrans au néon vert des Vipers, manomètre de turbo ; garnissage `tuner`
- [x] `sport` — Supercar "Éclipse" — cadran `sport` : Sport : fond noir, aiguille rouge, compte-tours central, vitesse en chiffres, diodes de passage ; garnissage `sport`
- [x] `taxi` — Taxi — cadran `taxi` : Cadrans classiques et taximètre à diodes rouges posé sur la planche ; garnissage `taxi`
- [x] `pickup` — Pickup — cadran `raptor` : Pick-up : compteur numérique orange (vitesse, rapport, 4×4, tangage, dévers), grand écran central ; garnissage `raptor`
- [x] `buggy` — Buggy des dunes — cadran `rallyeLCD` : Rallye : écran à cristaux liquides, compte-tours en barres ; garnissage `buggy`
- [x] `berline` — Berline — cadran `elegant` : Cadrans cerclés de chrome, fond anthracite, aiguilles rouges fines, écran central ; garnissage `chic`
- [x] `jeepMil` — Jeep militaire "Guépard" — cadran `militaire` : Militaire : cadrans à fond noir sur planche kaki, inscriptions au pochoir ; garnissage `militaire`
- [x] `mirage` — Supercar "Mirage" — cadran `numerique` : Numérique futuriste cyan : arcs lumineux, vitesse et rapport en grands chiffres ; garnissage `mirage`
- [x] `buggyCanon` — Buggy-canon "Sirocco" — cadran `canon` : Buggy-canon : écran de visée et état du canon ; garnissage `buggy`
- [x] `scarabee` — Buggy "Scarabée" — cadran `vw` : Un seul grand compteur rond, à l’ancienne ; garnissage `scarabee`
- [x] `amphibie` — 4x4 Amphibie "Loutre" — cadran `amphibie` : Tout-terrain amphibie : cadrans, compas et profondeur ; garnissage `tt`
- [x] `bond` — GT "Agent Gris" — cadran `chrome` : Vintage britannique : cadrans crème cerclés de chrome, chiffres à empattements ; garnissage `gt`
- [x] `baronne` — Ancienne "Baronne" — cadran `baronne` : Vintage art déco : cadrans ivoire, aiguilles noires, chrome ; garnissage `vintage`
- [x] `jeep` — 4x4 "Coyote" — cadran `tt` : Tout-terrain : deux cadrans et l’inclinomètre (tangage, dévers) ; garnissage `tt`
- [x] `monstertruck` — Monster Truck — cadran `monster` : Monster truck : énorme compte-tours, interrupteurs à clapet ; garnissage `monster`
- [x] `depotCitadine` — La Citadine — cadran `moderne` : Deux cadrans à aiguilles, fond noir, chiffres blancs, aiguilles orange, petit écran central (rapport, compteur, essence) ; garnissage `moderne`
- [x] `depotPickup` — Le Pick-up — cadran `raptor` : Pick-up : compteur numérique orange (vitesse, rapport, 4×4, tangage, dévers), grand écran central ; garnissage `raptor`
- [x] `depotBolide` — Le Bolide — cadran `sport` : Sport : fond noir, aiguille rouge, compte-tours central, vitesse en chiffres, diodes de passage ; garnissage `sport`
- [x] `limousine` — Limousine "Majesté" — cadran `luxe` : Luxe : cadrans blancs cerclés de chrome, horloge analogique au centre, bois ; garnissage `chic`
- [x] `suvLuxe` — SUV de luxe "Sierra" — cadran `luxeNum` : Luxe numérique : deux grands écrans côte à côte ; garnissage `luxe`
- [x] `cabriolet` — Cabriolet "Azur" — cadran `retro` : Rétro italien : cadrans crème, aiguilles noires, planche à la couleur de la caisse ; garnissage `cabriolet`
- [x] `charger` — Muscle "Taureau" — cadran `rallye` : Muscle « rallye » : chiffres orange, quatre cadrans, voyant de passage ; garnissage `muscle`
- [x] `hyper` — Hypercar "Zénith" — cadran `hyper` : Écran plein, arcs violet et cyan, puissance et batterie ; garnissage `hyper`
- [x] `bolide` — Bellatti "Bolide" — cadran `bolide` : Grand compteur central à aiguille jusqu’à 500 km/h, cerclage aluminium, deux petits écrans ; garnissage `bolide`
- [x] `enzo` — Ferroni "Enzo" — cadran `enzo` : Compte-tours jaune au centre, vitesse numérique, diodes de passage sur le volant ; garnissage `enzo`
- [x] `derbyBreak` — Break « Corbillard » — cadran `derby` : Derby : planche dépouillée, manomètres rapportés au verre fêlé, interrupteurs ; garnissage `derby`
- [x] `derbyCompacte` — Citadine « Savonnette » — cadran `derby` : Derby : planche dépouillée, manomètres rapportés au verre fêlé, interrupteurs ; garnissage `derby`
- [x] `derbyPickup` — Pick-up « Bétaillère » — cadran `derby` : Derby : planche dépouillée, manomètres rapportés au verre fêlé, interrupteurs ; garnissage `derby`

## Camions, bus, engins

- [x] `milit` — Camion "Aigle" — cadran `militaire` : Militaire : cadrans à fond noir sur planche kaki, inscriptions au pochoir ; garnissage `militaire`
- [x] `blinde` — Blindé "Bastion" — cadran `blinde` : Blindé : écrans verts à balayage, épiscope ; garnissage `militaire`
- [x] `dca` — Camion DCA "Foudre" — cadran `dca` : DCA : radar de veille et cadrans militaires ; garnissage `militaire`
- [x] `bulldozer` — Bulldozer "Titan" — cadran `engin` : Engin : écran robuste, deux leviers ; garnissage `engin`
- [x] `grue` — Grue "Marteau" — cadran `grue` : Grue : écran de charge, cadrans ; garnissage `engin`
- [x] `ambulance` — Ambulance "Secours" — cadran `ambulance` : Ambulance : cadrans et panneau des sirènes ; garnissage `ambulance`
- [x] `depanneuse` — Dépanneuse "Grizzly" — cadran `camion` : Camion : grands cadrans, manomètres d’air ; garnissage `camion`
- [x] `tracteurPiste` — Tracteur de piste "Mule" — cadran `piste` : Engin de piste : écran simple, interrupteur du gyrophare ; garnissage `piste`
- [x] `citerne` — Camion-citerne "Kérosène" — cadran `piste` : Engin de piste : écran simple, interrupteur du gyrophare ; garnissage `piste`
- [x] `escalier` — Passerelle mobile "Échelle" — cadran `piste` : Engin de piste : écran simple, interrupteur du gyrophare ; garnissage `piste`
- [x] `bagagiste` — Tracteur à bagages "Valise" — cadran `piste` : Engin de piste : écran simple, interrupteur du gyrophare ; garnissage `piste`
- [x] `busville` — Bus de ville — cadran `bus` : Bus : combiné numérique, boutons des portes, billetterie ; garnissage `bus`
- [x] `pompiers` — Camion de pompiers — cadran `pompiers` : Pompiers : grands cadrans, panneau rouge des sirènes et de la pompe ; garnissage `pompiers`
- [x] `depotBus` — Le Bus — cadran `bus` : Bus : combiné numérique, boutons des portes, billetterie ; garnissage `bus`

## Char

- [ ] `char` — Char "Rhinocéros"

## Motos et quad

- [x] `moto` — Moto — cadran `motoRond` : Moto : compteur rond à aiguille cerclé de chrome et petit écran, rétroviseurs au bout du guidon
- [x] `motoR` — Moto "Frelon" — cadran `motoRond` : Moto : compteur rond à aiguille cerclé de chrome et petit écran, rétroviseurs au bout du guidon
- [x] `motocross` — Moto cross — cadran `enduro` : Cross : écran de rallye sur la plaque, guidon à mousse
- [x] `motoS` — Moto sportive — cadran `tft` : Moto sportive : écran couleur (régime en arc, vitesse, rapport), rétroviseurs au bout du guidon
- [x] `fantome` — Moto "Fantôme" — cadran `chopper` : Chopper : compteur chromé sur le réservoir, guidon chromé
- [x] `quad` — Quad "Scorpide" — cadran `quad` : Quad : petit écran sur le guidon
- [x] `motoMil` — Moto cross militaire — cadran `enduro` : Cross : écran de rallye sur la plaque, guidon à mousse

## Vélos

- [x] `velo` — Vélo de ville — cadran `compteurVelo` : Vélo : petit compteur à cristaux liquides sur la potence
- [x] `bmx` — BMX — cadran `aucun` : Rien à lire : la machine seule

## Jet-ski

- [x] `jetski` — Jet-ski — cadran `jetski` : Jet-ski : écran cyan (vitesse, cap)

## Planches (debout)

- [ ] `skate` — Skateboard
- [ ] `surf` — Planche de surf

## Kayak

- [ ] `kayak` — Kayak

## Bateaux

- [ ] `yacht` — Yacht "Impérial"
- [ ] `bateau` — Vedette "Sirène"
- [ ] `bateauP` — Vedette de police
- [ ] `peche` — Bateau de pêche
- [ ] `espadon` — Vedette "Espadon"

## Navires (passerelle)

- [ ] `grandyacht` — Méga-yacht "Reyes Royale"
- [ ] `cargo` — Porte-conteneurs "Reyes Star"

## Avions

- [ ] `avion` — Avion "Colibri"
- [ ] `chasseur` — Chasseur "Épervier"
- [ ] `tourisme` — Avion de tourisme "Pélican"
- [ ] `jetprive` — Jet privé "Albatros"
- [ ] `ligne` — Long-courrier "Reyes Air"
- [ ] `fret` — Cargo "Baleine"
- [ ] `voltige` — Voltige "Colibri Rouge"

## Hélicoptères

- [ ] `vautour` — Hélico de combat "Vautour"
- [ ] `vip` — Hélico VIP "Riviera"
- [ ] `ecureuil` — Hélico "Écureuil"
- [ ] `titan` — Hélico-grue "Titan"
- [ ] `helico` — Hélico "Libellule"

## Soucoupe

- [ ] `ovni` — OVNI "Zeta-9"
