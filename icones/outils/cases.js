// Zones (en pixels) où se trouve le GRAND pictogramme de chaque ID dans sa
// planche de référence — les miniatures 24/48/64 et les libellés en sont
// exclus. Sert uniquement à la comparaison visuelle (comparer.js) : les
// références restent des images raster, jamais intégrées aux icônes.
// [id, x0, y0, x1, y1]
module.exports = {
  '01-armes.png': [
    ['ico-arme-poings', 20, 30, 225, 215], ['ico-arme-couteau', 240, 40, 450, 215],
    ['ico-arme-batte', 460, 30, 665, 215], ['ico-arme-batte2', 680, 30, 885, 215],
    ['ico-arme-sabre', 895, 30, 1105, 215],
    ['ico-arme-bouleC', 20, 395, 225, 565], ['ico-arme-gadget', 240, 395, 450, 565],
    ['ico-arme-pistolet', 460, 395, 665, 565], ['ico-arme-silence', 680, 395, 885, 565],
    ['ico-arme-pompe', 895, 395, 1105, 565],
    ['ico-arme-uzi', 20, 735, 225, 895], ['ico-arme-pm', 240, 735, 450, 895],
    ['ico-arme-fusil', 460, 735, 665, 895], ['ico-arme-sniper', 680, 735, 885, 895],
    ['ico-arme-flamme', 895, 735, 1105, 895],
    ['ico-arme-roquette', 20, 1080, 225, 1225], ['ico-arme-desintegrateur', 240, 1080, 450, 1225],
  ],
  '02-hud.png': [
    ['ico-btn-sprint', 20, 75, 280, 312], ['ico-btn-dodge', 295, 75, 555, 312],
    ['ico-btn-switch', 570, 75, 835, 312], ['ico-btn-grenade', 850, 75, 1105, 312],
    ['ico-btn-brake', 20, 530, 280, 775], ['ico-btn-jump', 295, 530, 555, 775],
    ['ico-btn-jetpack', 570, 530, 835, 775], ['ico-btn-action', 850, 530, 1105, 775],
    ['ico-btn-pause', 20, 995, 280, 1205], ['ico-btn-taxi', 295, 995, 555, 1205],
    ['ico-btn-cible', 570, 995, 835, 1205], ['ico-btn-munitions', 850, 995, 1105, 1205],
  ],
  '03-capacites-carte.png': [
    ['ico-spec-adrenaline', 30, 140, 370, 400], ['ico-spec-nitro', 395, 140, 735, 400],
    ['ico-spec-onde', 760, 140, 1100, 440],
    ['ico-carte-ennemis', 25, 810, 280, 1080], ['ico-carte-vehicules', 300, 790, 550, 1080],
    ['ico-carte-commerces', 570, 810, 820, 1080], ['ico-carte-batiments', 845, 810, 1100, 1080],
  ],
  '04-garage.png': [
    ['ico-garage-porte', 25, 140, 370, 430], ['ico-garage-peinture', 395, 100, 735, 440],
    ['ico-garage-neon', 760, 190, 1100, 420],
    ['ico-garage-moteur', 25, 780, 370, 1090], ['ico-garage-vitesse', 395, 780, 735, 1090],
    ['ico-garage-tenue', 760, 780, 1100, 1090],
  ],
};
