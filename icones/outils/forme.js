// Boîte à outils géométrique pour DESSINER à la main les icônes dans le
// repère 24×24 : chaque fonction rend un sous-chemin SVG (commandes absolues).
// Remplissage « nonzero » : les pièces pleines tournent dans un sens, les
// évidements dans l'autre (trou = true) — un évidement posé sur une seule
// épaisseur de plein reste transparent, sans couleur de fond.
const R = (v) => { const r = Math.round(v * 100) / 100; return Object.is(r, -0) ? 0 : r; };
const pt = (p) => R(p[0]) + ' ' + R(p[1]);

// aire signée (repère écran, y vers le bas) : > 0 = sens horaire
function aire(pts) { let a = 0; for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; a += p[0] * q[1] - q[0] * p[1]; } return a / 2; }
function orienter(pts, trou) { const s = aire(pts) > 0; return (s === !trou) ? pts : pts.slice().reverse(); }

// polygone à coins vifs
function poly(pts, trou = false) {
  const p = orienter(pts, trou);
  return 'M' + pt(p[0]) + p.slice(1).map((q) => 'L' + pt(q)).join('') + 'Z';
}
// contour adouci : chaque sommet est un point de contrôle (courbe passant
// par les milieux des côtés) ; un sommet [x, y, 1] reste un coin vif.
function lisse(pts, trou = false) {
  const p = orienter(pts, trou), n = p.length, mil = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  let d = '', debut = null;
  for (let i = 0; i < n; i++) {
    const a = p[(i - 1 + n) % n], b = p[i], c = p[(i + 1) % n];
    const m0 = a[2] ? a : mil(a, b), m1 = b[2] ? b : mil(b, c);
    if (debut === null) { debut = m0; d = 'M' + pt(m0); }
    if (b[2]) d += 'L' + pt(b);
    else d += 'Q' + pt(b) + ' ' + pt(m1);
  }
  return d + 'Z';
}
// cercle (deux demi-arcs) ; trou = sens anti-horaire
function cercle(cx, cy, r, trou = false) {
  const s = trou ? 0 : 1;
  return 'M' + pt([cx - r, cy]) + 'A' + R(r) + ' ' + R(r) + ' 0 1 ' + s + ' ' + pt([cx + r, cy]) + 'A' + R(r) + ' ' + R(r) + ' 0 1 ' + s + ' ' + pt([cx - r, cy]) + 'Z';
}
// ellipse alignée sur les axes
function ellipse(cx, cy, rx, ry, trou = false) {
  const s = trou ? 0 : 1;
  return 'M' + pt([cx - rx, cy]) + 'A' + R(rx) + ' ' + R(ry) + ' 0 1 ' + s + ' ' + pt([cx + rx, cy]) + 'A' + R(rx) + ' ' + R(ry) + ' 0 1 ' + s + ' ' + pt([cx - rx, cy]) + 'Z';
}
const rad = (a) => a * Math.PI / 180;
const tourne = (p, a, cx, cy) => { const c = Math.cos(rad(a)), s = Math.sin(rad(a)), x = p[0] - cx, y = p[1] - cy; return [cx + x * c - y * s, cy + x * s + y * c]; };
// boîte de centre (cx, cy), largeur w, hauteur h, tournée de a degrés,
// coins arrondis de rayon r (arcs de cercle : invariants par rotation)
function boite(cx, cy, w, h, a = 0, r = 0, trou = false) {
  r = Math.min(r, w / 2, h / 2);
  const x0 = cx - w / 2, y0 = cy - h / 2, x1 = cx + w / 2, y1 = cy + h / 2, T = (p) => tourne(p, a, cx, cy);
  if (r <= 0) return poly([[x0, y0], [x1, y0], [x1, y1], [x0, y1]].map(T), trou);
  // contour horaire : haut, droite, bas, gauche
  let segs = [[[x0 + r, y0], [x1 - r, y0]], [[x1, y0 + r], [x1, y1 - r]], [[x1 - r, y1], [x0 + r, y1]], [[x0, y1 - r], [x0, y0 + r]]];
  const ar = (p) => 'A' + R(r) + ' ' + R(r) + ' 0 0 ' + (trou ? 0 : 1) + ' ' + pt(T(p));
  if (trou) { // même contour parcouru à l'envers
    segs = segs.reverse().map((s) => s.slice().reverse());
  }
  let d = 'M' + pt(T(segs[0][0]));
  for (let i = 0; i < 4; i++) { d += 'L' + pt(T(segs[i][1])); d += ar(segs[(i + 1) % 4][0]); }
  return d + 'Z';
}
// segment épais à bouts ronds (capsule) de (x1,y1) à (x2,y2), épaisseur e
function capsule(x1, y1, x2, y2, e, trou = false) {
  const L = Math.hypot(x2 - x1, y2 - y1), a = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
  return boite((x1 + x2) / 2, (y1 + y2) / 2, L + e, e, a, e / 2, trou);
}
// segment épais à bouts carrés
function barre(x1, y1, x2, y2, e, trou = false) {
  const L = Math.hypot(x2 - x1, y2 - y1), a = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
  return boite((x1 + x2) / 2, (y1 + y2) / 2, L, e, a, 0, trou);
}
// trait effilé (vitesse) : épaisseur e1 au départ, e2 à l'arrivée
function effile(x1, y1, x2, y2, e1, e2 = 0) {
  const L = Math.hypot(x2 - x1, y2 - y1), nx = -(y2 - y1) / L, ny = (x2 - x1) / L;
  const p = [[x1 + nx * e1 / 2, y1 + ny * e1 / 2], [x2 + nx * e2 / 2, y2 + ny * e2 / 2], [x2 - nx * e2 / 2, y2 - ny * e2 / 2], [x1 - nx * e1 / 2, y1 - ny * e1 / 2]];
  return poly(e2 > 0 ? p : [p[0], p[1], p[3]]);
}
// arc épais : couronne de rayons r1 < r2 entre les angles a0 → a1 (degrés,
// 0 = vers la droite, sens horaire à l'écran), bouts droits ou ronds
function arcEpais(cx, cy, r1, r2, a0, a1, rond = false, trou = false) {
  const P = (r, a) => [cx + r * Math.cos(rad(a)), cy + r * Math.sin(rad(a))];
  const grand = Math.abs(a1 - a0) > 180 ? 1 : 0, e = (r2 - r1) / 2;
  let d;
  if (!trou) {
    d = 'M' + pt(P(r2, a0)) + 'A' + R(r2) + ' ' + R(r2) + ' 0 ' + grand + ' 1 ' + pt(P(r2, a1));
    d += rond ? 'A' + R(e) + ' ' + R(e) + ' 0 0 1 ' + pt(P(r1, a1)) : 'L' + pt(P(r1, a1));
    d += 'A' + R(r1) + ' ' + R(r1) + ' 0 ' + grand + ' 0 ' + pt(P(r1, a0));
    d += rond ? 'A' + R(e) + ' ' + R(e) + ' 0 0 1 ' + pt(P(r2, a0)) : '';
  } else {
    d = 'M' + pt(P(r1, a0)) + 'A' + R(r1) + ' ' + R(r1) + ' 0 ' + grand + ' 1 ' + pt(P(r1, a1));
    d += rond ? 'A' + R(e) + ' ' + R(e) + ' 0 0 0 ' + pt(P(r2, a1)) : 'L' + pt(P(r2, a1));
    d += 'A' + R(r2) + ' ' + R(r2) + ' 0 ' + grand + ' 0 ' + pt(P(r2, a0));
    d += rond ? 'A' + R(e) + ' ' + R(e) + ' 0 0 0 ' + pt(P(r1, a0)) : '';
  }
  return d + 'Z';
}
// croissant (ondes, reflets) : arc dont l'épaisseur s'annule aux deux bouts
function croissant(cx, cy, r, a0, a1, e) {
  const P = (rr, a) => [cx + rr * Math.cos(rad(a)), cy + rr * Math.sin(rad(a))];
  const am = (a0 + a1) / 2, A = P(r, a0), B = P(r, a1), M = P(r + e, am);
  // arc extérieur passant par M (cercle par trois points), retour par l'arc de rayon r
  const ext = cercle3(A, M, B), grand = Math.abs(a1 - a0) > 180 ? 1 : 0;
  return 'M' + pt(A) + 'A' + R(ext) + ' ' + R(ext) + ' 0 ' + grand + ' 1 ' + pt(B) + 'A' + R(r) + ' ' + R(r) + ' 0 ' + grand + ' 0 ' + pt(A) + 'Z';
}
function cercle3(a, b, c) {
  const d = 2 * (a[0] * (b[1] - c[1]) + b[0] * (c[1] - a[1]) + c[0] * (a[1] - b[1]));
  const ux = ((a[0] ** 2 + a[1] ** 2) * (b[1] - c[1]) + (b[0] ** 2 + b[1] ** 2) * (c[1] - a[1]) + (c[0] ** 2 + c[1] ** 2) * (a[1] - b[1])) / d;
  const uy = ((a[0] ** 2 + a[1] ** 2) * (c[0] - b[0]) + (b[0] ** 2 + b[1] ** 2) * (a[0] - c[0]) + (c[0] ** 2 + c[1] ** 2) * (b[0] - a[0])) / d;
  return Math.hypot(a[0] - ux, a[1] - uy);
}
// contour adouci → liste de points (chaque arrondi en 4 segments), pour
// pouvoir le découper ensuite en bandes
function aplatir(pts) {
  const n = pts.length, mil = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], out = [];
  for (let i = 0; i < n; i++) {
    const a = pts[(i - 1 + n) % n], b = pts[i], c = pts[(i + 1) % n];
    if (b[2]) { out.push([b[0], b[1]]); continue; }
    const m0 = a[2] ? a : mil(a, b), m1 = c[2] ? c : mil(b, c);
    for (let k = 0; k < 4; k++) { const t = k / 4, u = 1 - t; out.push([u * u * m0[0] + 2 * u * t * b[0] + t * t * m1[0], u * u * m0[1] + 2 * u * t * b[1] + t * t * m1[1]]); }
  }
  return out.map((p) => [p[0], p[1], 1]);
}
// garde la partie du polygone où nx·x + ny·y ≥ c (Sutherland–Hodgman)
function demiPlan(pts, nx, ny, c) {
  const out = [], f = (p) => nx * p[0] + ny * p[1] - c;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i], q = pts[(i + 1) % pts.length], fp = f(p), fq = f(q);
    if (fp >= 0) out.push(p);
    if ((fp >= 0) !== (fq >= 0)) { const t = fp / (fp - fq); out.push([p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1]), 1]); }
  }
  return out;
}
// coupe un contour (points vifs) en bandes séparées par des fentes de
// largeur e, centrées sur les droites d'angle a (degrés) passant par les
// points donnés — bagues de manche, lattes, quadrillage
function bandes(pts, a, centres, e) {
  const nx = Math.cos(rad(a + 90)), ny = Math.sin(rad(a + 90));
  const cs = centres.map((p) => nx * p[0] + ny * p[1]).sort((u, v) => u - v);
  const morceaux = []; let bornes = [-1e9, ...cs.flatMap((c) => [c - e / 2, c + e / 2]), 1e9];
  for (let i = 0; i < bornes.length; i += 2) {
    let m = demiPlan(pts, nx, ny, bornes[i]); m = demiPlan(m, -nx, -ny, -bornes[i + 1]);
    if (m.length >= 3 && Math.abs(aire(m)) > 0.05) morceaux.push(m);
  }
  return morceaux;
}
// ligne brisée épaissie en UN polygone (joints en onglet) : fentes, cordes,
// traits — un seul contour, donc jamais de recouvrement d'évidements
function epais(pts, e, trou = false) {
  const n = pts.length, g = [], d = [];
  for (let i = 0; i < n; i++) {
    const p = pts[i], a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
    let nx = 0, ny = 0;
    const seg = (u, v) => { const L = Math.hypot(v[0] - u[0], v[1] - u[1]) || 1; return [-(v[1] - u[1]) / L, (v[0] - u[0]) / L]; };
    const n1 = i > 0 ? seg(a, p) : seg(p, b), n2 = i < n - 1 ? seg(p, b) : seg(a, p);
    nx = n1[0] + n2[0]; ny = n1[1] + n2[1]; const L = Math.hypot(nx, ny) || 1; nx /= L; ny /= L;
    const k = Math.min(3, 1 / Math.max(0.3, nx * n1[0] + ny * n1[1])) * e / 2;
    g.push([p[0] + nx * k, p[1] + ny * k]); d.push([p[0] - nx * k, p[1] - ny * k]);
  }
  return poly(g.concat(d.reverse()), trou);
}
// transformation de points (pour poser une même forme ailleurs, sans transform SVG)
const deplace = (pts, dx, dy) => pts.map((p) => [p[0] + dx, p[1] + dy, p[2]]);
const pivote = (pts, a, cx, cy) => pts.map((p) => [...tourne(p, a, cx, cy), p[2]]);
const miroir = (pts, ax) => pts.map((p) => [2 * ax - p[0], p[1], p[2]]);

module.exports = { poly, lisse, cercle, ellipse, boite, capsule, barre, effile, arcEpais, croissant, deplace, pivote, miroir, tourne, aplatir, demiPlan, bandes, aire, epais };
