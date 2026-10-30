import * as THREE from "three";
import { mat, glow, boxGeo, cylGeo, coneGeo, frustumGeo, octaGeo, part, pivot, anchor, finalize } from "./helpers";

function weaponBase() {
  const g = new THREE.Group();
  return {
    g,
    grey: mat("#8a919c", { roughness: 0.7 }),
    light: mat("#c8cdd2", { roughness: 0.65 }),
    dark: mat("#5a6068", { roughness: 0.8 }),
    darker: mat("#2a2e33", { roughness: 0.85 }),
    bore: mat("#101418", { roughness: 0.9 }),
    cyan: glow("#00c8ff", 1.4),
    orange: glow("#ff7a00", 1.3),
  };
}

/**
 * Pistol (sheet 04) — iter 5. Horizontal profile, muzzle +X (renders
 * muzzle-left from the front camera). Taller tapered slide, twin
 * barrels protruding ~0.12 (19% of total) from the FRONT (iter-4 barrels
 * sat at the rear block end and merged into the slide), recessed
 * orange ribs in a shallow top channel, CLOSED loop trigger guard
 * with curved trigger + orange dot, tapered angular grip panel + front
 * edge stripe, flared OCTAGONAL base with side slits + hex screw, and
 * an orange strip inset flush into the base UNDERSIDE (the iter-4
 * model-space base slit floated below-left of the raked grip — it is
 * now grip-local, on the underside only).
 */
export function buildPistol(): THREE.Group {
  const { g, grey, light, dark, darker, bore, orange } = weaponBase();
  // Taller tapered slide: frustum along X, height ~0.156 (~0.35x total)
  const slideGeo = frustumGeo(0.85, 1.0, 0.42);
  const slide = part(slideGeo, grey, { x: 0.14, y: 0.12, rz: Math.PI / 2, sx: 0.12, sz: 0.076, name: "slide" });
  g.add(slide);
  g.add(part(boxGeo(0.08, 0.05, 0.1), grey, { x: -0.05, y: 0.14, name: "rearBlock" })); // rear block overlapping the slide rear
  g.add(part(boxGeo(0.03, 0.03, 0.03), dark, { x: -0.06, y: 0.2, name: "rearSight" })); // stepped rear sight, seated on the slide top
  g.add(part(boxGeo(0.03, 0.03, 0.03), dark, { x: -0.02, y: 0.2 }));
  g.add(part(boxGeo(0.05, 0.04, 0.08), dark, { x: 0.32, y: 0.2, name: "frontSight" })); // front sight, seated on the slide top
  // Twin barrels protruding from the FRONT (+X): upper hollow bore,
  // lower fatter with a capped octagonal face. Protrusion 0.12 (~19%).
  g.add(part(cylGeo(0.038, 0.038, 0.12, 8), grey, { x: 0.41, y: 0.15, rz: Math.PI / 2, name: "barrelTop" }));
  g.add(part(cylGeo(0.043, 0.043, 0.02, 8), light, { x: 0.47, y: 0.15, rz: Math.PI / 2 })); // silver octagonal muzzle rim
  g.add(part(cylGeo(0.03, 0.03, 0.02, 8), bore, { x: 0.475, y: 0.15, rz: Math.PI / 2, name: "bore" })); // hollow bore disc
  g.add(part(cylGeo(0.055, 0.055, 0.1, 8), grey, { x: 0.41, y: 0.06, rz: Math.PI / 2, name: "barrelBottom" })); // fatter faceted lower barrel
  g.add(part(cylGeo(0.058, 0.058, 0.02, 6), dark, { x: 0.47, y: 0.06, rz: Math.PI / 2 })); // capped octagonal face
  // Shallow top channel + 11 short orange ribs recessed into it
  g.add(part(boxGeo(0.3, 0.008, 0.055), dark, { x: 0.13, y: 0.199 }));
  for (let i = 0; i < 11; i++) {
    g.add(part(boxGeo(0.025, 0.01, 0.05), orange, { x: 0.0 + i * 0.026, y: 0.202 }));
  }
  // Frame block below the slide (the guard verticals + grip meet it)
  g.add(part(boxGeo(0.16, 0.04, 0.09), light, { x: 0.05, y: 0.02 }));
  // Frame side panel (light) + honeycomb diamond insert + hex bolt + vents
  g.add(part(boxGeo(0.2, 0.08, 0.012), light, { x: 0.05, y: 0.05, z: -0.055 }));
  g.add(part(octaGeo(0.035, 0), dark, { x: 0.05, y: 0.05, z: -0.062, sx: 1, sy: 1, sz: 0.3 })); // honeycomb diamond panel
  g.add(part(cylGeo(0.012, 0.012, 0.014, 6), dark, { x: 0.12, y: 0.05, z: -0.062, rx: Math.PI / 2 })); // hex bolt BESIDE the diamond (not on top of it)
  for (let i = 0; i < 3; i++) {
    g.add(part(boxGeo(0.012, 0.05, 0.012), dark, { x: 0.12 + i * 0.02, y: 0.05, z: -0.058 }));
  }
  // Back view: rear orange square indicator
  g.add(part(boxGeo(0.04, 0.04, 0.012), orange, { x: -0.05, y: 0.14, z: 0.055 }));
  // Grip: raked ~68 deg from horizontal, tapered angular panel, front edge stripe
  const grip = pivot("grip", -0.02, 0.06, 0);
  grip.rotation.z = 0.22; // straighter (~78 deg from horizontal)
  grip.add(part(boxGeo(0.13, 0.26, 0.09), light, { y: -0.13 })); // wider grip top
  for (const side of [-1, 1]) {
    grip.add(part(boxGeo(0.012, 0.16, 0.05), dark, { x: side * 0.068, y: -0.13 })); // grip side panel (breaks the flat slab read)
  }
  grip.add(part(frustumGeo(0.8, 1.0, 0.18), orange, { y: -0.13, z: -0.05, sx: 0.05, sz: 0.0085 })); // tapered angular grip panel
  grip.add(part(boxGeo(0.012, 0.16, 0.012), orange, { x: 0.055, y: -0.13, z: 0 })); // front grip edge stripe
  grip.add(part(cylGeo(0.02, 0.02, 0.014, 6), dark, { x: 0, y: -0.2, z: -0.058 })); // lower honeycomb insert
  for (let i = 0; i < 3; i++) {
    grip.add(part(boxGeo(0.09, 0.012, 0.012), dark, { x: 0, y: -0.2 + i * 0.03, z: 0.05 })); // grip rear vents
  }
  grip.add(part(cylGeo(0.09, 0.11, 0.06, 8), dark, { y: -0.28, name: "magBase" })); // flared OCTAGONAL base
  for (const sz of [-0.03, 0, 0.03]) {
    grip.add(part(boxGeo(0.012, 0.04, 0.012), darker, { x: 0.1, y: -0.28, z: sz })); // base side slits
  }
  grip.add(part(octaGeo(0.015, 0), dark, { y: -0.28, z: -0.105 })); // base hex screw
  grip.add(part(boxGeo(0.08, 0.012, 0.06), orange, { y: -0.315, name: "baseStrip" })); // orange strip, base UNDERSIDE only
  g.add(grip);
  // CLOSED loop trigger guard (frame top + front/back verticals + bottom
  // bar) + curved trigger with an orange dot inside
  g.add(part(boxGeo(0.015, 0.08, 0.02), dark, { x: 0.125, y: -0.02 })); // guard front
  g.add(part(boxGeo(0.015, 0.08, 0.02), dark, { x: 0.03, y: -0.02 })); // guard back (meets grip)
  g.add(part(boxGeo(0.1, 0.015, 0.02), dark, { x: 0.0775, y: -0.06 })); // guard bottom
  g.add(part(boxGeo(0.015, 0.05, 0.02), orange, { x: 0.1, y: -0.03, name: "trigger" }));
  g.add(part(octaGeo(0.012, 0), orange, { x: 0.1, y: -0.02, z: -0.015 })); // trigger dot
  anchor(g, "gripSocket", -0.02, -0.05, 0);
  return finalize(g, [-0.05, 0.12, 0]);
}

/**
 * Minigun (sheet 05) — iter 5, VERTICAL. Wider/shorter barrel bundle
 * (ring 0.11, barrel r 0.040, length 0.46 = 0.43x total, cluster/body
 * 0.70), hollow #101418 bores, stepped collar rings at barrel bases,
 * FLUSH recessed hub glow with dark star spokes (no raised disc),
 * tapered faceted chest plate with 2 cyan slits + roller + U-tubes +
 * tilted lower plate with a cyan diamond, rebuilt back (faceted plate,
 * ringed cyan core, 4 stripes, 2 slits, vertical strip), wider loop
 * handle (0.35 = 0.80x body) ending flush at a chamfered octagonal
 * bottom bar, chamfered wedge side pods, hex collar-face bolts,
 * central top receiver block + horizontal latch. Muzzle +Y.
 */
export function buildMinigun(): THREE.Group {
  const { g, grey, light, dark, bore, cyan } = weaponBase();
  // Barrel cluster: 6 barrels, ring 0.11, r 0.040, length 0.46.
  // 5-segment cylinders (not 4): 4 segments read as square posts in
  // ortho. The silver muzzle rim rings are deleted to pay for it
  // (tri-neutral: +4 tris x 6 barrels x 4 part types - 6 rims x 16).
  const barrels = pivot("barrels", 0, 0.28, 0);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const x = Math.cos(a) * 0.11;
    const z = Math.sin(a) * 0.11;
    barrels.add(part(cylGeo(0.04, 0.04, 0.46, 5), grey, { x, y: 0.1, z, name: "barrel" }));
    barrels.add(part(cylGeo(0.046, 0.046, 0.07, 5), light, { x, y: 0.3, z })); // stepped muzzle
    barrels.add(part(cylGeo(0.028, 0.028, 0.015, 5), bore, { x, y: 0.34, z, name: "bore" })); // hollow bore
    barrels.add(part(cylGeo(0.048, 0.048, 0.04, 5), dark, { x, y: -0.11, z })); // stepped collar ring at base
  }
  barrels.add(part(cylGeo(0.05, 0.05, 0.02, 6), cyan, { y: 0.33, name: "hub" })); // FLUSH recessed hub glow
  barrels.add(part(cylGeo(0.028, 0.028, 0.022, 8), light, { y: 0.345 })); // white-blue starburst core (replaces the dark X spokes)
  g.add(barrels);
  // Circular front plate + 6 hex bolts around the collar face
  g.add(part(cylGeo(0.17, 0.17, 0.06, 8), grey, { y: 0.2, name: "frontPlate" }));
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    g.add(part(boxGeo(0.02, 0.02, 0.02), dark, { x: Math.cos(a) * 0.14, y: 0.235, z: Math.sin(a) * 0.14 }));
  }
  // Tapered faceted chest plate widening toward the side pods
  g.add(part(frustumGeo(0.85, 1.0, 0.2), light, { y: 0.08, sx: 0.2, sz: 0.15, name: "receiver" }));
  for (const side of [-1, 1]) {
    g.add(part(boxGeo(0.012, 0.12, 0.015), cyan, { x: side * 0.05, y: 0.08, z: -0.11 })); // vertical cyan slit
    g.add(part(boxGeo(0.012, 0.1, 0.012), cyan, { x: side * 0.11, y: 0.08, z: -0.11 })); // U-tube vertical
    g.add(part(boxGeo(0.05, 0.012, 0.012), cyan, { x: side * 0.09, y: 0.03, z: -0.11 })); // U-tube horizontal
    g.add(part(frustumGeo(0.8, 1.0, 0.22), grey, { x: side * 0.17, y: 0.02, sx: 0.07, sz: 0.14, name: "sidePod" })); // chamfered wedge pod
    g.add(part(boxGeo(0.012, 0.14, 0.02), cyan, { x: side * 0.17, y: 0.02, z: -0.1 })); // pod front strip
    g.add(part(boxGeo(0.08, 0.14, 0.015), light, { x: side * 0.1, y: 0.08, z: -0.11, rz: side * -0.25 })); // cheek plate
  }
  g.add(part(cylGeo(0.02, 0.02, 0.03, 6), dark, { rx: Math.PI / 2, y: 0.08, z: -0.115 })); // central roller/trigger
  // Tilted faceted lower plate with a single cyan diamond inset
  g.add(part(frustumGeo(0.8, 1.0, 0.1), grey, { y: -0.06, sx: 0.14, sz: 0.1, rx: 0.2 }));
  g.add(part(octaGeo(0.03, 0), cyan, { y: -0.06, z: -0.075, sx: 1, sy: 1, sz: 0.3 }));
  // Upper receiver step + central top block + horizontal latch + cable
  g.add(part(boxGeo(0.28, 0.08, 0.22), grey, { y: 0.2 }));
  g.add(part(boxGeo(0.16, 0.06, 0.12), light, { y: 0.25 }));
  g.add(part(cylGeo(0.015, 0.015, 0.1, 6), dark, { y: 0.25, z: -0.05, rz: Math.PI / 2 }));
  for (let i = 0; i < 3; i++) {
    g.add(part(boxGeo(0.05, 0.03, 0.05), dark, { x: -0.05 + i * 0.05, y: 0.21 + Math.sin((i / 2) * Math.PI) * 0.02 })); // ribbed cable
  }
  // Grip block: cyan diamond front, ringed cyan core back
  g.add(part(boxGeo(0.24, 0.18, 0.2), light, { y: -0.1, name: "gripBlock" }));
  g.add(part(octaGeo(0.05, 0), cyan, { y: -0.1, z: -0.11, sx: 1, sy: 1, sz: 0.3, name: "diamondPanel" }));
  g.add(part(boxGeo(0.2, 0.16, 0.02), grey, { y: -0.1, z: 0.105 })); // back faceted plate
  g.add(part(cylGeo(0.075, 0.075, 0.012, 8), dark, { rx: Math.PI / 2, y: -0.1, z: 0.12 })); // core ring
  g.add(part(cylGeo(0.06, 0.06, 0.014, 8), cyan, { rx: Math.PI / 2, y: -0.1, z: 0.125, name: "backLens" })); // ringed cyan core
  for (const side of [-1, 1]) {
    for (const by of [-0.06, -0.14]) {
      g.add(part(boxGeo(0.012, 0.05, 0.015), cyan, { x: side * 0.17, y: by, z: 0.1 })); // back pod stripes
    }
  }
  for (const side of [-1, 1]) {
    g.add(part(boxGeo(0.012, 0.06, 0.015), cyan, { x: side * 0.05, y: -0.06, z: -0.075 })); // lower plate slits
  }
  g.add(part(boxGeo(0.02, 0.06, 0.015), cyan, { y: -0.19, z: 0.11 })); // vertical strip below the disc
  // Wide open loop handle ending flush at a chamfered octagonal bottom bar
  const loop = pivot("loopHandle", 0, -0.19, 0);
  loop.add(part(boxGeo(0.065, 0.22, 0.05), grey, { x: -0.15, y: -0.11 }));
  loop.add(part(boxGeo(0.065, 0.22, 0.05), grey, { x: 0.15, y: -0.11 }));
  loop.add(part(cylGeo(0.035, 0.035, 0.35, 8), grey, { y: -0.22, rz: Math.PI / 2 })); // chamfered octagonal bottom bar
  g.add(loop);
  anchor(g, "gripSocket", 0, -0.08, 0);
  // Close-up on the MUZZLE FACE (barrel tops at world y 0.28+0.35=0.63),
  // viewed from above-front via closeDir (see ModelCanvas).
  (g.userData as Record<string, unknown>).closeDir = [0.35, 1.0, -0.5];
  return finalize(g, [0, 0.63, 0]);
}

/**
 * Rocket launcher (sheet 06) — iter 5, VERTICAL.
 * BUG FIX: the iter-4 side arms were built but never added to the group
 * (missing g.add(arm)), so both confirmation reviewers correctly
 * reported them absent. Arms are now present, longer, with larger
 * rounded end pads + cyan bands, spanning ~2.3x body width.
 * Broad flat fins (span ~1.5x body width) fully below the cyan ring,
 * shorter faceted cone (0.13x total) with a large front hex port + 3
 * distinct hex ports proud of the surface, near-white wider mid-body
 * (1.9x upper-barrel width) with pale silver side panels, flush
 * L-shaped grip + open trigger guard + trigger + mounting housing,
 * flared octagonal muzzle cap (1.45x top-barrel width) + second upper
 * cyan strip, full glow system (upper strips, back upper strips,
 * flanking lower strips, arm-pad bands, segmented ring), back rebuilt
 * (long central spine, 3-bar vent panel, 2 columns of 6 cyan slats),
 * front A-panel + lower vent columns + stepped collar rings + bolt
 * studs. Close-up reframed on the WARHEAD. Warhead -Y.
 */
export function buildRocketLauncher(): THREE.Group {
  const { g, grey, light, dark, cyan, orange } = weaponBase();
  const white = mat("#d9dee3", { roughness: 0.65 });
  const silver = mat("#c8cdd3", { roughness: 0.65 });
  const coneMat = mat("#d94a1e", { roughness: 0.7 });
  const collarMat = mat("#7a2e1a", { roughness: 0.8 });
  // Stepped barrel along Y: rear (top) narrower, mid bulged, lower narrower
  g.add(part(cylGeo(0.09, 0.09, 0.3, 10), grey, { y: 0.42 })); // rear barrel
  g.add(part(cylGeo(0.11, 0.11, 0.08, 10), light, { y: 0.58 })); // rear cap (wider)
  g.add(part(cylGeo(0.13, 0.13, 0.06, 8), light, { y: 0.63 })); // flared octagonal muzzle cap (1.45x top barrel)
  g.add(part(cylGeo(0.07, 0.07, 0.06, 8), grey, { y: 0.68 })); // narrow neck at rear end
  g.add(part(cylGeo(0.175, 0.175, 0.03, 10), dark, { y: 0.35 })); // stepped collar ring, rear/mid junction
  g.add(part(cylGeo(0.17, 0.17, 0.42, 12), white, { y: 0.14 })); // wide near-white mid-body (1.9x upper barrel)
  g.add(part(cylGeo(0.14, 0.14, 0.03, 10), dark, { y: -0.07 })); // stepped collar ring, mid/lower junction
  g.add(part(cylGeo(0.1, 0.1, 0.3, 10), grey, { y: -0.22 })); // lower barrel
  for (const side of [-1, 1]) {
    g.add(part(boxGeo(0.02, 0.3, 0.2), silver, { x: side * 0.17, y: 0.14 })); // pale silver side panel
  }
  // Cyan ring at warhead base + long front strip + flanking lower strips
  g.add(part(cylGeo(0.115, 0.115, 0.03, 10), cyan, { y: -0.36, name: "warheadRing" }));
  g.add(part(boxGeo(0.03, 0.34, 0.015), cyan, { y: 0.05, z: -0.175 })); // long front strip
  for (const side of [-1, 1]) {
    g.add(part(boxGeo(0.02, 0.2, 0.012), cyan, { x: side * 0.07, y: 0.05, z: -0.17 })); // flanking lower strip
    g.add(part(boxGeo(0.02, 0.12, 0.012), cyan, { x: side * 0.05, y: 0.42, z: 0.1 })); // back upper strip
  }
  g.add(part(boxGeo(0.03, 0.2, 0.015), cyan, { y: 0.42, z: -0.1 })); // rear strip
  g.add(part(boxGeo(0.015, 0.2, 0.03), cyan, { x: 0.098, y: 0.42 })); // second upper-barrel strip (side)
  // Front A-panel + lower front vent columns
  g.add(part(boxGeo(0.08, 0.1, 0.015), grey, { y: 0.22, z: -0.175 }));
  g.add(part(boxGeo(0.03, 0.06, 0.015), cyan, { y: 0.22, z: -0.185 }));
  for (const side of [-1, 1]) {
    for (let j = 0; j < 3; j++) {
      g.add(part(boxGeo(0.02, 0.012, 0.012), cyan, { x: side * 0.05, y: -0.15 - j * 0.03, z: -0.108 })); // lower front vents
    }
  }
  // Long vertical cyan strips on the lower barrel front (z values follow
  // the 0.10-radius barrel surface so nothing floats)
  g.add(part(boxGeo(0.025, 0.26, 0.012), cyan, { y: -0.22, z: -0.102 }));
  g.add(part(boxGeo(0.025, 0.26, 0.012), cyan, { x: -0.06, y: -0.22, z: -0.086 }));
  g.add(part(boxGeo(0.025, 0.26, 0.012), cyan, { x: 0.06, y: -0.22, z: -0.086 }));
  // Side arms (upper third) with end pods + cyan bands + dot lights.
  // NOTE: iter-4 built these but never added them to the group.
  for (const side of [-1, 1]) {
    const arm = pivot(side < 0 ? "armL" : "armR", side * 0.13, 0.28, 0);
    arm.add(part(boxGeo(0.14, 0.05, 0.05), grey, { x: side * 0.07 })); // horizontal arm
    arm.add(part(boxGeo(0.05, 0.14, 0.05), grey, { x: side * 0.15, y: -0.05, rz: side * -0.4 })); // angled arm
    arm.add(part(boxGeo(0.09, 0.14, 0.11), light, { x: side * 0.135, y: -0.1, name: "sidePod" })); // rounded end pad
    arm.add(part(boxGeo(0.095, 0.02, 0.02), cyan, { x: side * 0.135, y: -0.08, z: -0.06 })); // pad band
    arm.add(part(boxGeo(0.015, 0.015, 0.015), cyan, { x: side * 0.11, y: -0.02, z: -0.04 })); // arm dot
    g.add(arm);
  }
  // Flush L-shaped grip + open trigger guard + trigger + mounting housing
  g.add(part(boxGeo(0.08, 0.1, 0.12), dark, { x: -0.13, y: -0.1, name: "gripHousing" })); // mounting housing (flush, no gap)
  g.add(part(boxGeo(0.05, 0.14, 0.06), dark, { x: -0.16, y: -0.2 })); // L-grip
  g.add(part(boxGeo(0.015, 0.08, 0.02), dark, { x: -0.09, y: -0.16 })); // guard front
  g.add(part(boxGeo(0.015, 0.08, 0.02), dark, { x: -0.17, y: -0.16 })); // guard back (meets grip)
  g.add(part(boxGeo(0.1, 0.015, 0.02), dark, { x: -0.13, y: -0.2 })); // guard bottom
  g.add(part(boxGeo(0.015, 0.05, 0.02), orange, { x: -0.12, y: -0.17, name: "trigger" }));
  // Warhead: longer faceted cone (0.24, r 0.16) + SMALL fins — the old
  // 0.20-tall diagonal fins were as tall as the 0.17 cone and occluded
  // it, so the warhead read as two flat orange slabs with a slot.
  const warhead = pivot("warhead", 0, -0.4, 0);
  warhead.add(part(cylGeo(0.12, 0.12, 0.05, 10), collarMat, { y: 0.02 })); // dark red-brown collar base
  const cone = part(coneGeo(0.16, 0.24, 10), coneMat, { y: -0.12 }); // longer, wider cone (base 0.0, tip -0.24)
  cone.rotation.x = Math.PI;
  warhead.add(cone); // cone pointing -Y
  // Small diagonal stabiliser fins at the cone base (front- and
  // back-diagonal), instead of one axial fin per side.
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i / 4) * Math.PI * 2;
    warhead.add(part(boxGeo(0.02, 0.12, 0.12), coneMat, { x: Math.cos(a) * 0.13, y: -0.05, z: Math.sin(a) * 0.13, ry: -a })); // small diagonal fin
  }
  warhead.add(part(octaGeo(0.045, 0), glow("#ff7a1a", 1.4), { y: -0.08, z: -0.095 })); // large front hex port
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.5;
    warhead.add(part(octaGeo(0.028, 0), glow("#ff7a1a", 1.4), { x: Math.cos(a) * 0.1, y: -0.08, z: Math.sin(a) * 0.1 })); // hex ports (radius follows the fatter cone)
  }
  g.add(warhead);
  // Back: long central spine + 3-bar vent panel + 2 columns of 6 slats
  g.add(part(boxGeo(0.04, 0.55, 0.02), dark, { y: 0.1, z: 0.178, name: "backSpine" }));
  g.add(part(boxGeo(0.16, 0.14, 0.015), grey, { y: 0.14, z: 0.175, name: "backPanel" }));
  for (let i = 0; i < 3; i++) {
    g.add(part(boxGeo(0.12, 0.015, 0.012), cyan, { y: 0.09 + i * 0.05, z: 0.185 }));
  }
  for (const side of [-1, 1]) {
    for (let j = 0; j < 6; j++) {
      g.add(part(boxGeo(0.03, 0.012, 0.012), cyan, { x: side * 0.06, y: -0.1 - j * 0.03, z: 0.108 })); // lower slat columns
    }
  }
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    g.add(part(octaGeo(0.012, 0), dark, { x: Math.cos(a) * 0.115, y: -0.36, z: Math.sin(a) * 0.115 })); // warhead collar bolts
  }
  anchor(g, "gripSocket", -0.16, -0.18, 0);
  return finalize(g, [0, -0.5, -0.12]);
}

/**
 * Targeting rifle (sheet 07) — iter 5, VERTICAL.
 * Narrower 9:1 body, longer slender mid-grey scope (0.36 long, ~0.60x
 * body width) with 3 ring collars, wrap-around mount rings + arms,
 * faceted octagonal cyan objective lens, tapered eyepiece, top knob,
 * longer cage muzzle (0.18 of total, 5 long slim prongs around a
 * recessed cyan core on a narrower tapered shroud), ON-AXIS thumbhole
 * stock with zero gap (open loop frame, angled pistol grip, wide
 * flared buttstock 1.6x body width with a flat light base plate, 4
 * stock vents), open rectangular trigger guard + trigger aligned with
 * the grip, thin recessed twin side strips identical front/back,
 * stepped side panels + vent slots + bolt heads + shoulder facets +
 * hexagonal sensor + triple-bar indicator. Back octagon disc,
 * vertical rear strip, and black stock rectangles deleted. Muzzle +Y.
 */
export function buildTargetingRifle(): THREE.Group {
  const { g, grey, light, dark, cyan } = weaponBase();
  // Narrow tapered receiver: total length ~1.14, body width ~0.13 (~9:1)
  g.add(part(frustumGeo(0.85, 1.0, 0.55), grey, { y: 0.12, sx: 0.075, sz: 0.055, name: "receiver" }));
  g.add(part(boxGeo(0.11, 0.1, 0.09), light, { y: 0.42 })); // upper shroud step
  g.add(part(boxGeo(0.1, 0.06, 0.08), grey, { y: 0.36 })); // receiver step
  // Stepped side panels / vent slots / bolt heads
  g.add(part(boxGeo(0.016, 0.3, 0.07), light, { x: -0.052, y: 0.1, name: "sidePanel" }));
  g.add(part(boxGeo(0.016, 0.3, 0.07), light, { x: 0.052, y: 0.1 }));
  for (let i = 0; i < 3; i++) {
    g.add(part(boxGeo(0.014, 0.05, 0.012), dark, { x: -0.072, y: 0.0 + i * 0.09, z: -0.02 }));
    g.add(part(boxGeo(0.014, 0.05, 0.012), dark, { x: 0.072, y: 0.0 + i * 0.09, z: -0.02 }));
  }
  g.add(part(cylGeo(0.015, 0.015, 0.014, 6), dark, { x: -0.05, y: -0.12, z: -0.045, rx: Math.PI / 2 }));
  g.add(part(cylGeo(0.015, 0.015, 0.014, 6), dark, { x: 0.05, y: -0.12, z: -0.045, rx: Math.PI / 2 }));
  // Thin recessed longitudinal cyan side strips (both sides, identical
  // front and back) + scope ring + indicators + lower vertical cell
  for (const side of [-1, 1]) {
    g.add(part(boxGeo(0.014, 0.5, 0.02), cyan, { x: side * 0.066, y: 0.12, z: 0 }));
  }
  g.add(part(boxGeo(0.012, 0.012, 0.008), cyan, { x: -0.04, y: 0.24, z: -0.045 })); // triple-bar indicator
  g.add(part(boxGeo(0.012, 0.012, 0.008), cyan, { x: -0.04, y: 0.26, z: -0.045 }));
  g.add(part(boxGeo(0.012, 0.012, 0.008), cyan, { x: -0.04, y: 0.28, z: -0.045 }));
  g.add(part(boxGeo(0.02, 0.08, 0.012), cyan, { y: -0.1, z: -0.045 })); // lower-receiver vertical cell
  g.add(part(cylGeo(0.025, 0.025, 0.015, 6), dark, { y: 0.3, z: -0.045, rx: Math.PI / 2 })); // hexagonal sensor
  for (const side of [-1, 1]) {
    g.add(part(boxGeo(0.03, 0.08, 0.02), grey, { x: side * 0.06, y: 0.38, z: -0.03, rz: side * -0.4 })); // shoulder facet
  }
  g.add(part(boxGeo(0.14, 0.03, 0.11), cyan, { y: 0.3 })); // scope ring / collar
  // Longer cage muzzle: narrower tapered shroud + 5 long slim prongs
  g.add(part(cylGeo(0.05, 0.06, 0.18, 8), grey, { y: 0.52, name: "muzzle" })); // ~0.75x body width
  g.add(part(cylGeo(0.035, 0.035, 0.03, 8), cyan, { y: 0.6 })); // recessed saturated core
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    g.add(part(boxGeo(0.02, 0.16, 0.02), dark, { x: Math.cos(a) * 0.05, y: 0.62, z: Math.sin(a) * 0.05 }));
  }
  for (const side of [-1, 1]) {
    g.add(part(boxGeo(0.012, 0.08, 0.012), cyan, { x: side * 0.06, y: 0.52, z: 0 })); // shroud side insert
  }
  // Longer slender mid-grey scope with wrap-around mounts
  const scope = pivot("scope", -0.15, 0.22, -0.02);
  scope.add(part(cylGeo(0.038, 0.042, 0.36, 10), dark, { name: "scopeBody" }));
  scope.add(part(cylGeo(0.042, 0.035, 0.05, 10), grey, { y: 0.2 })); // objective bell
  scope.add(part(cylGeo(0.038, 0.038, 0.02, 8), cyan, { y: 0.225, name: "scopeLens" })); // faceted octagonal lens
  scope.add(part(cylGeo(0.028, 0.034, 0.04, 8), dark, { y: -0.2 })); // tapered eyepiece
  scope.add(part(boxGeo(0.035, 0.035, 0.035), grey, { y: 0.02 })); // top knob / turret
  // NOTE: the iter-6 front lens face disc on the scope front is
  // DELETED — the scope axis is +Y (parallel to the barrel), so its
  // lens faces up the barrel axis (the top lens at y 0.225), and a
  // front-facing disc read as a lens facing the camera. Both iter-10
  // reviewers flagged it.
  scope.add(part(boxGeo(0.03, 0.03, 0.03), grey, { x: 0.05, y: 0.0 })); // side knob
  for (const my of [0.08, -0.08]) {
    scope.add(part(cylGeo(0.048, 0.048, 0.025, 10), grey, { y: my })); // wrap-around mount ring
    scope.add(part(boxGeo(0.1, 0.02, 0.03), grey, { x: 0.075, y: my })); // mounting arm to receiver
  }
  scope.add(part(boxGeo(0.08, 0.02, 0.03), grey, { x: 0.06, y: 0.12 })); // top rail segment
  scope.add(part(cylGeo(0.055, 0.055, 0.015, 8), cyan, { y: 0.05 })); // thin scope ring
  g.add(scope);
  // Open rectangular trigger guard + trigger + separate pistol grip
  g.add(part(boxGeo(0.09, 0.015, 0.02), dark, { x: 0.02, y: -0.23 }));
  g.add(part(boxGeo(0.015, 0.12, 0.02), dark, { x: 0.06, y: -0.17 }));
  g.add(part(boxGeo(0.015, 0.12, 0.02), dark, { x: -0.02, y: -0.17 }));
  g.add(part(boxGeo(0.015, 0.05, 0.02), cyan, { x: 0.03, y: -0.19, name: "trigger" }));
  const grip = pivot("grip", -0.03, -0.2, 0);
  grip.rotation.z = 0.3;
  grip.add(part(boxGeo(0.07, 0.14, 0.07), dark, { y: -0.07 }));
  g.add(grip);
  // ON-AXIS thumbhole stock, zero gap to the receiver: a REAL frame
  // (top block + bottom block + 2 side posts) with a genuine
  // through-hole, not a solid frustum with loop bars painted on its
  // front face (the old build read as a solid trapezoid).
  const stock = pivot("stock", 0, -0.15, 0);
  stock.add(part(boxGeo(0.16, 0.07, 0.085), light, { y: -0.035 })); // top block (meets receiver)
  for (const side of [-1, 1]) {
    stock.add(part(boxGeo(0.03, 0.13, 0.085), light, { x: side * 0.065, y: -0.135 })); // side post
  }
  stock.add(part(boxGeo(0.16, 0.08, 0.085), light, { y: -0.24 })); // bottom block
  stock.add(part(boxGeo(0.21, 0.03, 0.09), light, { y: -0.28, name: "buttPlate" })); // wide flared buttstock, flat light base plate
  for (let i = 0; i < 2; i++) {
    stock.add(part(boxGeo(0.1, 0.012, 0.012), dark, { y: -0.22 - i * 0.04, z: -0.042 })); // lower stock vents
  }
  g.add(stock);
  // Back-view specifics: side levers only (octagon disc + rear strip deleted)
  g.add(part(boxGeo(0.08, 0.02, 0.02), dark, { x: -0.08, y: 0.0, z: 0.05, rz: 0.4 })); // side lever L
  g.add(part(boxGeo(0.08, 0.02, 0.02), dark, { x: 0.08, y: -0.05, z: 0.05, rz: -0.4 })); // side lever R
  anchor(g, "gripSocket", 0.02, -0.18, 0);
  return finalize(g, [0, 0.35, 0]);
}
