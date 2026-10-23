Réponses à tes questions :
- Vue : 2D (vue de dessus classique), en vol avec la soucoupe, à environ 166–168 m d'altitude (indiqué sous DESCENDRE).
- Quand : surtout EN HAUTEUR, et en continu pendant le vol, pas seulement au lancement. Plus je monte, plus ça clignote et plus ça rame.
- Vidéo : tu ne peux pas la lire, j'ai mis des images extraites dans rapport_nuit/captures/bug_hauteur/ :
  - planche_0-4s.png et planche_4-8s.png : toute la vidéo, 2 images par seconde ;
  - zoom_1.00s.png et zoom_1.05s.png : deux images à 1/20 s d'intervalle, même endroit ;
  - image_1.0s / image_1.05s / image_3.0s / image_3.05s : écran entier.

Ce qu'on y voit (compare les deux zooms) :
- Des bandes horizontales qui clignotent partout où deux sols se superposent : sable du désert contre le sol gris-bleu à droite, pelouse contre tarmac près de la piste en haut, bord de l'aérogare. D'une image à l'autre, c'est l'autre surface qui passe devant. Ta piste n°2 (précision de profondeur) est confirmée, et ça empire avec la hauteur de la caméra.
- Des arbres ou bosquets vus de haut (la tache sombre en bas à gauche) qui changent de forme et grésillent d'une image à l'autre : feuillage découpé ou détail qui scintille de loin.
- En plus, ça rame à cette altitude : on voit une grande partie de la carte d'un coup.

Vas-y sur une branche `perf-hauteur`, un commit par étape, dans cet ordre. Suivi : rapport_nuit/PERF_HAUTEUR.md. Toutes les règles de CLAUDE.md s'appliquent (aucun tirage de plus pendant la génération de la ville, clés fixes dans META, tests qui lisent la source, rendus réels pour le visuel).

## PARTIE A — CLIGNOTEMENTS ET LENTEURS

1. **Shaders préparés pendant le chargement** : renderer.compile sur la ville, les scènes du cockpit et de l'arme avant la première image, et juste avant les gros éléments construits à la volée (vrais véhicules des canaux, Titanic, course de supercross…). Mesure la première traversée de la carte avant/après (pics de temps d'image).
2. **Superposition des sols** :
   - fais la liste des sols qui se chevauchent (couples, hauteurs, surface) ;
   - corrige à la source : écarte-les, découpe le sol du dessous là où un autre le recouvre, ou donne un ordre de priorité fixe (polygonOffset) ;
   - plan proche de la caméra ajusté selon la distance de la caméra au sol en vue 2D et 3D (plus on est haut, plus il recule), et 0,1 au lieu de 0,05 en 1re personne et au cockpit si l'arme et les mains restent propres.
   Évite logarithmicDepthBuffer, sauf si tu vérifies TOUS les shaders maison (mer, sols, onBeforeCompile, ShaderMaterial) : ils casseraient.
3. **Le grésillement des arbres** vus de loin : trouve la cause (texture sans mipmap, alphaTest, instances trop petites à l'écran) et corrige.
4. **Performances en altitude** :
   - au-delà d'une hauteur à définir, masque le petit décor (mobilier, figurants, petits objets, particules lointaines) ;
   - resserre le brouillard selon l'altitude ;
   - mesure le temps d'image, les appels de rendu et les triangles à 20, 80 et 170 m, avant/après ;
   - si ça ne suffit pas, propose un plafond d'altitude de la caméra en 2D.
5. **Test** : rendu réel à 170 m au-dessus de l'aéroport et du désert, deux images d'affilée, aucune différence de pixels sur les sols immobiles (comme sur mes zooms). Captures avant/après dans rapport_nuit/captures/bug_hauteur/.

## PARTIE B — AJOUTS

6. **Tous les véhicules du jeu jouables.**
   - Relève dans la source TOUS les véhicules visibles du jeu qui ne peuvent pas être pris aujourd'hui : décor, exposition, figurants motorisés, véhicules de piste, du chantier, de la base, du camp, des courses, des canaux, du derby, du concessionnaire. Ne recopie aucune liste.
   - Chacun devient pilotable : un vrai véhicule, ou une promotion à la demande à l'approche pour les performances, sans changer d'aspect.
   - Exceptions permises, chacune notée avec sa raison dans le suivi : ce qui vole sur une trajectoire scriptée hors de portée (dirigeable, avion à banderole en vol…), les ruines et épaves de décor. Une exception doit avoir une vraie raison, pas « c'est plus simple ».
   - Garde les règles déjà décidées : un véhicule exposé et volé déclenche une alarme et des étoiles, et ne peut pas entrer dans « Mes véhicules » sans avoir été acheté.
   - Test : le relevé, puis pour chaque véhicule non exclu, MONTER et 10 u de conduite. Mesure de performance avant/après.

7. **Une récompense pour le Titanic.**
   - Retrouve ce que le joueur fait aujourd'hui au Titanic, et donne-lui un vrai but : par exemple sauver des naufragés pendant le naufrage (les repêcher en bateau ou les ramener à la nage vers une chaloupe), avec un compteur et un chrono.
   - Récompense : prime une fois par vague selon le nombre de sauvés, un record (META, clé fixe), un trophée exposé à la planque, et une tenue « smoking 1912 » débloquée la première fois (TENUES, clé fixe dans META.exploits).
   - Perdable et gagnable, prouvé par un pilote simulé (gagne en jouant bien, échoue s'il est passif).

8. **Le couple à la proue du Titanic.**
   - Un couple de passagers anonymes (inventés, aucun nom de film ni d'acteur) sur la pointe de la proue : la femme debout face au large, les bras grands ouverts ; l'homme derrière elle, qui la tient par la taille.
   - Le vent dans les cheveux et la robe, posés avant le naufrage, bien visibles en vue 3D quand on passe près de la proue.
   - Pendant le naufrage, ils s'agrippent puis tombent comme les autres passagers.
   - Figurants (figurant()) : ils réagissent aux tirs comme tout le public de décor.
   - Capture dans le suivi.

9. **La page de statistiques, plus complète et plus visuelle.**
   - Refais l'écran des statistiques avec TOUS les chiffres importants, lus dans META et les tables du jeu, jamais recopiés.
   - Rubriques :
     - partie et carrière : temps de jeu, vagues, meilleur score, argent gagné et dépensé ;
     - combat : ennemis, chefs de gang, tirs, précision, headshots ;
     - conduite : distance, véhicules volés, écrasés, sauts, records de saut et de cabrage ;
     - mer et air : distance en bateau, ponts passés dessous, loopings ;
     - mini-jeux et records : arcade, planques, sports, derby, courses, Titanic ;
     - collection : curiosités, tenues, véhicules, planques, défis.
   - Visuel :
     - cartes par rubrique avec icônes (sprite existant) ;
     - gros chiffres ;
     - barres et anneaux de progression pour les collections ;
     - petits graphiques en barres pour les records et la répartition des véhicules ;
     - médailles sur les records battus.
   - Lisible en portrait 9:16, sans débordement, défilement fluide. Respecte les règles de z-index de CLAUDE.md.
   - Une stat absente d'une vieille sauvegarde s'affiche à 0, jamais « undefined » ni NaN.
   - Test : l'écran s'ouvre depuis le menu et depuis la pause. Aucun « undefined » ni « NaN » dans le texte avec une sauvegarde vide et avec une sauvegarde pleine. Capture.

## PARTIE C — RESTES DE TA LISTE

10. Corrige le blocage de la vedette de police dans le canal secondaire en impasse (même si le défaut est antérieur), avec un test qui passe 3 fois sur 3.
11. Relance la suite complète de scenarios.js après ta correction du test Reyes Air Race et toutes les étapes ci-dessus. Donne-moi le résultat. Puis node valider.js, sans régression.

Note tout dans rapport_nuit/PERF_HAUTEUR.md : étape par étape, cause trouvée, mesures avant/après, tests, ce que je dois vérifier en priorité sur l'iPhone. Si une étape n'a pas pu être faite ou vérifiée, dis-le explicitement.
