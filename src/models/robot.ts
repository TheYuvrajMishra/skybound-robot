import * as THREE from "three";
import { PALETTE as P } from "./palette";
import { mat, glow, boxGeo, cylGeo, sphGeo, frustumGeo, part, pivot, anchor, finalize } from "./helpers";

/**
 * Protagonist robot (sheet 01) — iter 5, true chibi re-proportioning.
 * Height 1.0, origin at feet, faces -Z.
 * - Legs 0.35 tall (hip pivots y 0.35), torso 0.35..0.63 (~0.30 tall),
 *   shoulders y 0.58, head pivot 0.70 with dome centre 0.80 (top 1.00).
 * - Helmet width 0.42 = 1.20x torso width 0.35; helmet visible above the
 *   torso top = 0.37 of total height.
 * - Tapered/inset oval visor in a grey frame with a bright centre;
 *   forward-facing round ear discs (#4A90D9) with full cyan glow rims.
 * - Faceted chest plate with a FULL circular core (no chin overlap),
 *   side vent slits, lower bolts, faceted hip plate + waist ring.
 * - Segmented limbs (elbow spheres, round knee caps, bulbous faceted
 *   shins, faceted dome feet with dark sole lines, no shin-foot gap).
 * - Domed shoulder pads pushed forward/outward past the torso silhouette.
 * - Blaster rebuilt as ONE faceted cylinder (#3A7BD5, rear cap, cyan
 *   barrel section, muzzle ring) gripped in the right hand at waist
 *   height with a dark grip, no gap.
 * - Back: full circular cyan disc in a circular plate + back panel
 *   outline + lower vent (back diamond bolts / neck bars / belt bar
 *   deleted per the confirmation round — the sheet's back panel shows
 *   the disc + outline, not the bolts).
 */
export function buildRobot(): THREE.Group {
  const g = new THREE.Group();
  const white = mat(P.heroWhite, { roughness: 0.6 });
  const light = mat(P.heroLight, { roughness: 0.65 });
  const mid = mat(P.heroMid, { roughness: 0.7 });
  const dark = mat(P.heroDark, { roughness: 0.75 });
  const blue = mat(P.earBlue, { roughness: 0.55 });
  const blasterBlue = mat(P.blasterBlue, { roughness: 0.55 });
  const cyan = glow(P.cyan, 1.4);
  const cyanDeep = glow(P.cyanDeep, 1.2);
  const cyanPale = glow(P.cyanPale, 1.0);

  // ---- Legs: hip pivots y 0.35, feet swing outward, no shin-foot gap ----
  for (const side of [-1, 1]) {
    const leg = pivot(side < 0 ? "legL" : "legR", side * 0.14, 0.35, 0);
    leg.rotation.z = side * 0.18; // knees angled outward (feet swing out)
    leg.add(part(frustumGeo(1.0, 0.85, 0.16), light, { y: -0.05, sx: 0.095, sz: 0.095 })); // tapered thigh (top overlaps hip plate)
    leg.add(part(sphGeo(0.07, 8, 6), light, { y: -0.16 })); // round knee cap, light so it reads against the mid shin
    leg.add(part(frustumGeo(0.85, 1.0, 0.12), mid, { y: -0.24, sx: 0.085, sz: 0.085 })); // bulbous faceted shin
    leg.add(part(boxGeo(0.15, 0.07, 0.22), white, { y: -0.315, z: -0.03, name: "foot" })); // foot (bottom at 0)
    leg.add(part(sphGeo(0.075, 8, 6), white, { y: -0.29, z: -0.03, sx: 1, sy: 0.6, sz: 1.2 })); // faceted dome foot top
    leg.add(part(boxGeo(0.152, 0.015, 0.222), dark, { y: -0.345, z: -0.03 })); // dark sole line
    g.add(leg);
  }
  // Hips: faceted hip plate + waist ring (no flat dark waist bar)
  g.add(part(frustumGeo(0.9, 1.05, 0.08), light, { y: 0.39, sx: 0.18, sz: 0.14 })); // hip plate, narrower than the chest bottom (no waist shelf)
  g.add(part(boxGeo(0.26, 0.04, 0.2), mid, { y: 0.36 })); // waist ring (straddles the chest bottom)

  // ---- Torso: pivot at waist 0.35, chest 0.35..0.63, width 0.35 ----
  const torso = pivot("torso", 0, 0.35, 0);
  torso.add(part(frustumGeo(1.0, 0.8, 0.28), white, { y: 0.14, sx: 0.247, sz: 0.156 })); // faceted chest plate (0.35 wide)
  torso.add(part(boxGeo(0.02, 0.14, 0.015), mid, { x: -0.16, y: 0.14, z: -0.06, rz: 0.25 })); // chest side facet L
  torso.add(part(boxGeo(0.02, 0.14, 0.015), mid, { x: 0.16, y: 0.14, z: -0.06, rz: -0.25 })); // chest side facet R
  torso.add(part(cylGeo(0.11, 0.11, 0.02, 10), light, { rx: Math.PI / 2, y: 0.15, z: -0.125, name: "coreRing" })); // octagonal chest-plate ring
  torso.add(part(cylGeo(0.085, 0.085, 0.04, 10), cyan, { rx: Math.PI / 2, y: 0.15, z: -0.12, name: "core" })); // FULL circular core
  for (const side of [-1, 1]) {
    torso.add(part(boxGeo(0.015, 0.08, 0.015), dark, { x: side * 0.15, y: 0.15, z: -0.115 })); // chest side vent slit
    torso.add(part(boxGeo(0.04, 0.04, 0.015), mid, { x: side * 0.12, y: 0.05, z: -0.115 })); // lower bolt plate
  }
  // Back: circular plate + FULL circular cyan disc + panel outline + lower vent
  torso.add(part(boxGeo(0.26, 0.24, 0.01), light, { y: 0.15, z: 0.115 })); // back panel outline plate
  torso.add(part(cylGeo(0.11, 0.11, 0.02, 10), mid, { rx: Math.PI / 2, y: 0.15, z: 0.125 })); // circular plate
  torso.add(part(cylGeo(0.085, 0.085, 0.03, 10), cyanDeep, { rx: Math.PI / 2, y: 0.15, z: 0.13, name: "backCore" })); // full back disc
  torso.add(part(boxGeo(0.22, 0.02, 0.015), dark, { y: 0.03, z: 0.12 })); // lower vent
  g.add(torso);

  // ---- Arms: shoulder pivots y 0.58, pads forward/outward ----
  for (const side of [-1, 1]) {
    const arm = pivot(side < 0 ? "armL" : "armR", side * 0.2, 0.58, 0);
    arm.rotation.z = side * 0.3; // arms angled outward
    arm.add(part(sphGeo(0.1, 8, 6), white, { x: side * 0.02, y: 0.02, z: -0.03, sx: 1, sy: 0.9, sz: 0.9 })); // domed shoulder pad
    arm.add(part(boxGeo(0.1, 0.14, 0.1), light, { y: -0.1 })); // upper arm
    arm.add(part(sphGeo(0.055, 8, 6), mid, { y: -0.18 })); // elbow sphere
    const forearm = pivot("forearm", 0, -0.18, 0);
    forearm.rotation.z = side * -0.35; // elbow bends inward (bent-arm stance)
    forearm.add(part(boxGeo(0.09, 0.13, 0.09), mid, { y: -0.08 })); // forearm
    forearm.add(part(frustumGeo(0.75, 1.0, 0.09), white, { y: -0.17, sx: 0.065, sz: 0.07, name: "hand" })); // tapered fist
    if (side < 0) {
      for (let f = 0; f < 3; f++) {
        forearm.add(part(boxGeo(0.02, 0.04, 0.02), white, { x: -0.03 + f * 0.03, y: -0.23 })); // fingered left hand
      }
    }
    arm.add(forearm);
    g.add(arm);
  }

  // ---- Head: pivot 0.70, dome centre 0.80, top 1.00 ----
  const head = pivot("head", 0, 0.7, 0);
  head.add(part(cylGeo(0.09, 0.09, 0.04, 10), light, { y: 0.0 })); // neck/collar ring
  head.add(part(sphGeo(0.22, 10, 8), white, { y: 0.09, sx: 1.0, sy: 0.95, sz: 0.95 })); // dome helmet (top ~1.00)
  // Inset OVAL visor: grey rim oval + cyan oval + pale centre (the old
  // rectangular frame/centre read as a flat slab; ovals follow the dome)
  head.add(part(cylGeo(0.16, 0.16, 0.015, 10), light, { y: 0.09, z: -0.18, rx: Math.PI / 2, sx: 1.25, sz: 0.52 }));
  head.add(part(cylGeo(0.145, 0.145, 0.02, 10), cyanDeep, { y: 0.09, z: -0.19, rx: Math.PI / 2, sx: 1.15, sz: 0.52, name: "visor" }));
  head.add(part(cylGeo(0.06, 0.06, 0.012, 10), cyanPale, { y: 0.09, z: -0.2, rx: Math.PI / 2, sx: 1.2, sz: 0.5 }));
  for (const side of [-1, 1]) {
    // Blue ear disc with a THIN cyan torus rim only (the old full cyan
    // discs in front of the blue disc hid the blue entirely)
    head.add(part(cylGeo(0.065, 0.065, 0.03, 8), blue, { x: side * 0.2, y: 0.09, rx: Math.PI / 2, name: "earDisc" }));
    for (const rz of [-0.018, 0.018]) {
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.068, 0.005, 4, 10), cyan);
      rim.position.set(side * 0.2, 0.09, rz);
      head.add(rim);
    }
    head.add(part(boxGeo(0.07, 0.05, 0.015), light, { x: side * 0.08, y: 0.02, z: 0.19 })); // head back bolt plate
  }
  head.add(part(boxGeo(0.06, 0.015, 0.015), dark, { y: 0.02, z: 0.19 })); // single small back vent
  g.add(head);

  // ---- Hand blaster: ONE faceted cylinder, gripped in the right hand ----
  // Right hand world pos ~ (0.30, 0.255); blaster body at waist height.
  const blaster = pivot("blaster", 0.27, 0.25, -0.04); // moved onto the bent right fist (was 0.31, floating beside it)
  blaster.add(part(boxGeo(0.1, 0.09, 0.26), blasterBlue, { z: 0.02, name: "blasterBody" })); // chunky faceted body, longer (reads in front view)
  blaster.add(part(cylGeo(0.04, 0.045, 0.12, 8), blasterBlue, { rx: Math.PI / 2, z: -0.16 })); // barrel cylinder
  blaster.add(part(cylGeo(0.05, 0.05, 0.03, 8), dark, { rx: Math.PI / 2, z: 0.16 })); // rear cap
  blaster.add(part(cylGeo(0.042, 0.042, 0.02, 8), cyan, { rx: Math.PI / 2, z: -0.23, name: "muzzle" })); // glowing cyan tip ring
  blaster.add(part(boxGeo(0.05, 0.09, 0.05), dark, { y: -0.07 })); // dark grip (hand wraps it, no gap)
  g.add(blaster);
  anchor(g, "handSocket", 0.27, 0.25, -0.04);

  return finalize(g, [0, 0.86, -0.22]);
}
