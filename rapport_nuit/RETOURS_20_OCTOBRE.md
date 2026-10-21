# Retours de playtest du 20 octobre — suivi point par point

Branche `retours-20-octobre` (partie de `canaux-v3`, après la restitution des canaux V3). Une case par point, dans l'ordre des lots ;
pour chaque point : la lecture retenue quand il était ambigu (en tête), ce qui a été fait, les mesures, le test, les captures
(`rapport_nuit/captures/retours_20/`). Règles de toujours : ville et décor inchangés (empreinte du décor, portes, tirage principal),
clés de sauvegarde fixes (`fusionMeta`, `DICOS_OUVERTS`), mini-jeux jouables (pilote simulé aux vraies commandes) ET perdables, une prime
par vague au plus, sons coupés (`mourir`, `startRun`, sortie), bugs visuels validés en rendu réel, coût de rendu mesuré pour les ajouts
lourds. Aucune référence à un autre jeu ni à une marque.

| Lot | Point | État |
|---|---|---|
| 1 | 1.1 4x4 amphibie téléporté | ☑ |
| 1 | 1.2 Cockpit du long-courrier tout gris (et tous les aéronefs) | ☐ |
| 1 | 1.3 Monte-charge du Pic caché par un rocher | ☐ |
| 2 | 2.1 Un seul jeu d'icônes (minimap et grande carte) | ☐ |
| 2 | 2.2 Le joueur en flèche orientée | ☐ |
| 2 | 2.3 Toucher une icône : bulle et « Y aller » | ☐ |
| 2 | 2.4 Filtres revus, inventaire de tous les lieux | ☐ |
| 3 | 3.1 Refonte des défis (paliers, argent, skins, ×2 prêt) | ☐ |
| 3 | 3.2 Défis de cascade mesurés (cabrage, vrilles, loopings, tonneaux, vol sur le dos…) | ☐ |
| 3 | 3.3 Skins spéciaux liés aux exploits | ☐ |
| 4 | 4.1 Tableau de chasse | ☐ |
| 4 | 4.2 Trophées au chalet | ☐ |
| 4 | 4.3 Défis de chasse et costume de pigeon | ☐ |
| 5 | 5.1 Villa planque restylée | ☐ |
| 5 | 5.2 Chantier : la grue remplacée par un monte-charge | ☐ |
| 6 | 6.1 Paquebot « Reyes Majestic » qui se brise | ☐ |
| 6 | 6.2 Vie au large | ☐ |
| 6 | 6.3 Kitesurf | ☐ |
| 6 | 6.4 Wakeboard amélioré | ☐ |
| 7 | 7.1 « Reyes Cliff Diving » | ☐ |
| 8 | 8.1 Karaoké en jeu de rythme | ☐ |
| 8 | 8.2 Défi du burger | ☐ |
| 8 | 8.3 « Jus de Plage » (découpe de fruits) | ☐ |
| 8 | 8.4 Manèges de la marina à la 1re personne | ☐ |
| 9 | 9.1 Akimbo à la 1re personne | ☐ |
| 10 | 10.1 Défi voltige et course d'avions | ☐ |

---

## 1.1 — Le 4x4 amphibie téléporté (fait)

**Lecture retenue** : « téléporté en amont » = renvoyé vers la ville (le nord), d'un coup ; « il s'abîme » = les dégâts qui suivent.

- **Cause** (trouvée par un pilote au joystick réel) : la borne sud des véhicules terrestres dans `majVehiculePhys` (`HALF + 8`, la
  ligne de la plage) ignorait les îles. Un véhicule terrestre posé sur l'île aux trésors (z ≈ 400) — l'amphibie qui y remonte de la
  mer, qui en repart, mais aussi un 4x4 ou une moto cross qu'on y amène — était renvoyé à la première image sur z = 302, dans la mer
  devant la plage de la ville : 100 à 120 u en une image, puis des chocs (8 à 39 PV mesurés). Le filet de sécurité (`FILET`), le
  dégagement des murs, le relief de l'île et la flottaison n'y étaient pour rien.
- **Correction** : au large, une île ou un ponton est de la terre (`estEau` faux) — la borne ne retient plus que le véhicule qui VIENT
  de la plage (sa position en début d'image) ; l'amphibie n'y est jamais renvoyé ; une moto partie d'une île vers la mer s'y noie là
  où elle est. La plage de la ville reste une borne.
- **Test** « Retours du 20 octobre, 1.1 » (l'île lue dans `ILE2`) : amphibie, 4x4 et moto cross posés sur l'île y restent ; l'amphibie
  au joystick réel fait plage de l'île → mer → retour des trois côtés, puis la plage de la ville — 0,38 u par image au plus, aucun
  dégât ; la moto cross qui quitte l'île se noie sur place ; une berline qui fonce vers la mer depuis la plage reste bornée.
  L'ancienne version échoue sur chaque point (sauts de 100 à 118 u, 8 à 39 PV perdus).
- **Au passage** : le test « Bateaux échoués » échouait seul sur le jet à bras (V3) — plus court, il montait plus haut sur le sable et,
  en virant en marche arrière vers l'eau, accrochait un objet de plage à 3 u de son axe ; la plage du test se choisit désormais à 6 u
  de tout solide (2,5 avant). Dans le jeu, le joueur contourne l'objet.
- Empreinte du décor, portes, tirage principal et séquence `startRun` → salles → `startRun` (boucle coupée) identiques.

