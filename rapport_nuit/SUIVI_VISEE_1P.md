# Visée à la 1re personne V2 — suivi arme par arme (18 octobre)

Demandé avec une planche avant/après : l'arme montée à hauteur d'œil, vue depuis l'arrière du viseur, l'organe de visée pile
au centre de l'écran ; des mains gantées détaillées ; un recul par arme ; plus aucun message au milieu de l'écran.
Non touchés : HUD, boutons, dégâts, chargeurs, temps de recharge, portée, prix.

Commun : [x] moteur de visée (œil par arme, `VISEURS_1P`, `poseVisee1P`) · [x] transition 0,2 s (`VISEE_T`, aller et retour)
· [x] zoom par arme (`zoomVersChamp`) · [x] réticule masqué en visée (sauf minigun) · [x] recul par arme (`rec`, `V.rk`)
· [x] gants noirs et manches texturées (`matsMains1P`) · [x] messages en haut à gauche en 1re personne (`body.a1P`)
· [x] arme rendue par-dessus la ville avec son éclairage (`ARME_SC`) · [x] stand de tir et ball-trap : même visée

## Mêlée
- [x] 1. Couteau — main droite en avant, pointe vers le centre ; main gauche en garde (poing gainé) ; estoc rapide inchangé
- [x] 2. Batte cloutée — deux mains en bas du manche, batte sur l'épaule droite (`pose:'batte'`) ; swing en arc inchangé
- [x] 3. Batte « Vertèbre » — même prise à deux mains ; massue abattue inchangée
- [x] 4. Sabre « Éclat » — levé en diagonale (`pose:'sabre'`, roulis −0,75) ; coup en diagonale inchangé

## Pistolets
- [x] 5. Pistolet « Louve » — mire à 3 points blancs (sur la culasse, elle recule au tir), ×1,1
- [x] 6. Pistolet silencieux — 3 points sur des organes surélevés, silencieux plus gros qui dépasse dans l'axe, ×1,1
- [x] 7. Revolver « Magnum » — cran arrière et lame à insert rouge (chien abaissé), ×1,1, gros relevé (×3 le pistolet), retour lent

## Fusils à pompe
- [x] 8. Pompe « Brisant » — bande ventilée surélevée, guidon perle en laiton au bout du canon, ligne de mire inclinée de l'œil
  au guidon (on voit le dessus du boîtier et la pompe), crosse masquée en visée (sous la joue), ×1,1, recul fort
- [x] 9. AA-12 « Ouragan » — viseur reflex ouvert sur la poignée de transport (point rouge), ×1,15

## Mitraillettes
- [x] 10. Uzi « Frénésie » — œilleton et guidon à oreilles, ×1,1, vibration forte au tir
- [x] 11. P.M. « Guêpe » — viseur holographique (cercle et point rouges dans la fenêtre), ×1,2

## Fusil
- [x] 12. Fusil « Tempête » — œilleton (anneau à oreilles) et guidon en tour, ×1,3 (l'ancien point rouge est retiré)

## Précision
- [x] 13. Sniper « Faucon » — lunette plein écran : vignette ronde, réticule fin gradué, point rouge ; ×4 ; respiration lente
- [x] 14. Arbalète « Silex » — œilleton et guidon à perle, arc de part et d'autre, ×1,5

## Armes lourdes
- [x] 15. Lance-flammes « Dragon » — anneau de visée sur support, guidon perle ; réservoir visible en bas ; ×1,1 ; vibration
- [x] 16. Bazooka « Comète » — lunette à croix fine sur le flanc droit, tube olive en bas à gauche, manche olive ; ×2
- [x] 17. Minigun « Tonnerre » — reste à la hanche (monte un peu), réticule gardé, ×1,1, canons qui tournent au tir, secousses

## Trouvées dans le code (absentes de la liste)
- [x] Poings — inchangés (rien au repos, le poing au coup) ; gants noirs comme les autres mains
- [x] Le Gadget rose (mêlée) — modèle 1re personne (matraque rose vernie, poignée noire, bague dorée), une main
- [x] Boule « Comète » (mêlée) — modèle 1re personne (boule bleue à trois trous) tenue en main
- [x] Le Désintégrateur (arme à feu du Site 51) — anneau lumineux et guidon, ×1,2
- [x] Lance à eau du camion de pompiers — arme de véhicule (tirée depuis la cabine, sans arme en main) : vérifiée, inchangée
