import * as THREE from "three";
import { mat, glow, boxGeo, cylGeo, coneGeo, icoGeo, sphGeo, part, pivot, finalize } from "./helpers";

/**
 * Rock golem (sheet 03) — iter 5. Angular faceted plates, large head
 * raised clear of the torso, overhanging brow plates, faceted snout
 * rock (no box snout), large deep-set angled #FF3D00 almond eyes,
 * wide irregular lower-face jaw cluster, thin branching inset lava
 * networks (no straight bars), large rounded faceted rock feet,
 * angular boulder shoulders + blocky fists hanging to mid-thigh,
 * legs separated with a clear inner gap, single huge rounded faceted
 * boulder belly (no belt seam), smaller protruding back plate with a
 * continuous branching hexagonal crack ring. Rock lightened to the
 * mid blue-grey #55646F family.
 */
export function buildGolem(): THREE.Group {
  const g = new THREE.Group();
  const rock = mat("#55646f", { roughness: 0.9 });
  const rockLit = mat("#6b7d89", { roughness: 0.85 });
  const dark = mat("#2f3a44", { roughness: 0.9 });
  const lava = glow("#ff3d00", 1.4);
  const lavaOrange = glow("#ff5722", 1.3);
  const red = mat("#a63a35", { roughness: 0.7 });

  // Legs: separated (clear inner gap), thigh boulder + knee rock +
  // tapered faceted shin + large rounded faceted rock foot.
  // (No pelvis box: both iter-10 reviewers read it as an invented
  // flat hip plank spanning the thighs; the torso bottom already
  // overlaps the leg tops, so nothing floats without it.)
  for (const side of [-1, 1]) {
    const leg = pivot(side < 0 ? "legL" : "legR", side * 0.22, 0.38, 0);
    leg.add(part(icoGeo(0.16, 1), rock, { y: -0.04, sx: 1, sy: 1.0, sz: 1 })); // thigh boulder
    leg.add(part(icoGeo(0.08, 0), rockLit, { y: -0.14, sx: 1, sy: 0.8, sz: 1 })); // distinct knee rock
    leg.add(part(icoGeo(0.14, 1), rockLit, { y: -0.24, sx: 1, sy: 0.9, sz: 1 })); // tapered faceted shin
    leg.add(part(icoGeo(0.15, 1), rock, { y: -0.3, sx: 1.3, sy: 0.6, sz: 1.3, name: "foot" })); // large rounded rock foot (just kisses the ground)
    leg.add(part(icoGeo(0.05, 0), rockLit, { x: -0.05, y: -0.3, z: -0.18 })); // front toe rock
    leg.add(part(icoGeo(0.05, 0), rockLit, { x: 0.05, y: -0.3, z: -0.18 })); // front toe rock
    leg.add(part(boxGeo(0.016, 0.12, 0.015), lava, { y: -0.22, z: -0.14, rz: 0.3 })); // shin crack
    leg.add(part(boxGeo(0.014, 0.08, 0.015), lavaOrange, { y: -0.18, z: -0.13, rz: -0.5 })); // calf branch
    g.add(leg);
  }
  // Torso: single huge rounded faceted boulder belly (no belt seam)
  const torso = pivot("torso", 0, 0.44, 0);
  torso.add(part(icoGeo(0.33, 1), rock, { y: 0.26, sx: 1.05, sy: 1.0, sz: 0.95 }));
  torso.add(part(icoGeo(0.2, 1), rockLit, { x: -0.28, y: 0.3, sx: 1, sy: 0.9, sz: 0.8 })); // side boulder L
  torso.add(part(icoGeo(0.2, 1), rockLit, { x: 0.28, y: 0.3, sx: 1, sy: 0.9, sz: 0.8 })); // side boulder R
  torso.add(part(icoGeo(0.14, 1), rockLit, { x: -0.2, y: 0.48, sx: 1, sy: 0.9, sz: 0.8 })); // upper boulder L (segmentation)
  torso.add(part(icoGeo(0.14, 1), rockLit, { x: 0.2, y: 0.48, sx: 1, sy: 0.9, sz: 0.8 })); // upper boulder R (segmentation)
  // Thin branching lava network on the belly: ONE diagonal fissure
  // (upper-right to lower-left) with two side branches, built as
  // connected polylines with shared joints — the old separate boxes
  // had gaps between segments and read as isolated dashes / a V / X.
  // Crack z values follow the torso ellipsoid surface (centre local
  // (0, 0.26), radii 0.3465/0.33/0.3135) so segments sit ON the rock.
  const torsoSurfZ = (x: number, y: number) => {
    const q = 1 - (x / 0.3465) ** 2 - ((y - 0.26) / 0.33) ** 2;
    return q > 0 ? -0.3135 * Math.sqrt(q) : -0.05;
  };
  const crackSeg = (x1: number, y1: number, x2: number, y2: number, mtl: THREE.Material) => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy);
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;
    return part(boxGeo(0.016, len, 0.015), mtl, { x: mx, y: my, z: torsoSurfZ(mx, my) - 0.008, rz: Math.atan2(-dx, dy) });
  };
  torso.add(crackSeg(0.16, 0.44, 0.08, 0.34, lava));
  torso.add(crackSeg(0.08, 0.34, 0.0, 0.26, lava));
  torso.add(crackSeg(0.0, 0.26, -0.08, 0.16, lava));
  torso.add(crackSeg(-0.08, 0.16, -0.14, 0.08, lava));
  torso.add(crackSeg(0.0, 0.26, 0.1, 0.2, lavaOrange));
  torso.add(crackSeg(-0.08, 0.16, -0.16, 0.1, lavaOrange));
  // Surface pebbles on chest/belly/shoulders (z follows the ellipsoid)
  const pebbles: [number, number, number, number][] = [
    [-0.2, 0.45, -0.22, 0.06], [0.22, 0.42, -0.23, 0.055], [0, 0.05, -0.28, 0.06],
    [-0.26, 0.15, -0.17, 0.05], [0.26, 0.18, -0.17, 0.05], [-0.15, 0.5, -0.2, 0.05],
  ];
  pebbles.forEach(([x, y, z, r]) => torso.add(part(icoGeo(r, 0), rockLit, { x, y, z })));
  g.add(torso);

  // Back plate: smaller protruding faceted central plate + continuous
  // branching hexagonal crack ring + shoulder/leg branches
  // Plate front (0.34) sits proud of the torso rear surface (0.3135);
  // the ring sits on the torso surface around the plate (radius 0.19).
  const backPlate = part(cylGeo(0.14, 0.14, 0.04, 6), rockLit, { rx: Math.PI / 2, y: 0.7, z: 0.32, name: "backPlate" });
  g.add(backPlate);
  // Continuous hexagonal ring: each segment spans a full hexagon side
  // (side = radius 0.16) and is tangent to the ring, so ends meet.
  // z 0.28 (not 0.265): at radius 0.16 the torso rear surface is
  // 0.274-0.278, so the old z buried the ring.
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    g.add(part(boxGeo(0.016, 0.16, 0.015), lava, { x: Math.cos(a) * 0.16, y: 0.7 + Math.sin(a) * 0.16, z: 0.28, rz: a + Math.PI / 2 }));
  }
  for (const [x, y, rz, z] of [[-0.26, 0.85, 0.5, 0.16], [0.26, 0.85, -0.5, 0.16], [-0.28, 0.55, -0.4, 0.12], [0.28, 0.55, 0.4, 0.12]] as const) {
    g.add(part(boxGeo(0.014, 0.12, 0.015), lavaOrange, { x, y, z, rz }));
  }

  // Arms: angular boulder shoulder + upper arm + blocky forearm +
  // LARGE blocky fist with knuckle rocks, hanging to mid-thigh
  for (const side of [-1, 1]) {
    const arm = pivot(side < 0 ? "armL" : "armR", side * 0.44, 0.84, 0);
    arm.rotation.z = side * 0.25; // fists swing OUT of the torso silhouette
    arm.add(part(icoGeo(0.13, 1), rock, { y: -0.02, sx: 1.1, sy: 1.0, sz: 1.0 })); // angular shoulder mass (~0.55x head width)
    arm.add(part(boxGeo(0.03, 0.13, 0.015), lava, { y: -0.02, z: -0.135, rz: 0.4 })); // shoulder crack
    arm.add(part(icoGeo(0.12, 1), rockLit, { y: -0.2, sx: 1, sy: 1.0, sz: 1 })); // upper arm
    arm.add(part(icoGeo(0.14, 1), rock, { y: -0.36, sx: 1.2, sy: 1.0, sz: 1.0 })); // blocky forearm (wider than upper arm)
    arm.add(part(boxGeo(0.015, 0.09, 0.015), lavaOrange, { y: -0.34, z: -0.14, rz: -0.45 })); // forearm branch
    // Large blocky fist: main block + 5 knuckle rocks, hanging to mid-thigh
    const fist = pivot("fist", 0, -0.5, 0);
    fist.add(part(boxGeo(0.22, 0.2, 0.2), rock, { name: "fistBlock" }));
    const knuckles: [number, number, number, number][] = [
      [0.08, 0.02, -0.11, 0.055], [-0.08, 0.02, -0.11, 0.055], [0, 0.06, -0.11, 0.06],
      [0.05, -0.1, -0.08, 0.05], [-0.05, -0.1, -0.08, 0.05],
    ];
    for (const [x, y, z, r] of knuckles) fist.add(part(icoGeo(r, 0), rockLit, { x, y, z }));
    arm.add(fist);
    g.add(arm);
  }

  // Head: LARGE angular faceted head raised clear of the torso, brow
  // plates overhanging, faceted snout rock, large #FF3D00 eyes, wide
  // irregular lower-face jaw cluster (no neat grid, no forehead bar)
  const head = pivot("head", 0, 1.0, -0.1);
  head.add(part(icoGeo(0.21, 1), dark, { sx: 1.15, sy: 0.82, sz: 0.9 }));
  for (const side of [-1, 1]) {
    head.add(part(boxGeo(0.2, 0.09, 0.13), rock, { x: side * 0.09, y: 0.1, z: -0.18, rz: side * 0.3, name: "brow" })); // massive overhanging brow plate (inner end down)
    head.add(part(sphGeo(0.045, 8, 6), glow("#ff3d00", 1.6), { x: side * 0.08, y: -0.01, z: -0.18, sx: 1.25, sy: 0.6, sz: 0.3, rz: side * 0.4, name: "eye" }));
    head.add(part(coneGeo(0.045, 0.11, 4), red, { x: side * 0.2, y: 0.15, rz: side * -0.5 }));
  }
  head.add(part(icoGeo(0.06, 0), rockLit, { y: -0.02, z: -0.17, sx: 1, sy: 0.9, sz: 0.7, name: "snout" })); // single faceted snout rock, integrated (not protruding)
  // Wide irregular jaw cluster on the LOWER FACE (below the nose).
  // z values follow the head ellipsoid surface (radii 0.2415/0.172/0.189)
  // so every rock is embedded ~70% instead of floating off the face.
  // Rows enlarged and spread in size (upper 0.06, mid 0.05, chin 0.055)
  // so they read as three bulging rows, not one neat row.
  const jawRocks: [number, number, number, number][] = [
    [-0.12, -0.11, -0.146, 0.06], [-0.06, -0.11, -0.165, 0.05], [0, -0.11, -0.18, 0.06],
    [0.06, -0.11, -0.165, 0.05], [0.12, -0.11, -0.146, 0.06],
    [-0.09, -0.15, -0.088, 0.05], [-0.03, -0.15, -0.118, 0.05],
    [0.03, -0.15, -0.118, 0.05], [0.09, -0.15, -0.088, 0.05],
    [-0.05, -0.16, -0.085, 0.055], [0.05, -0.16, -0.085, 0.055],
  ];
  jawRocks.forEach(([x, y, z, r]) => head.add(part(icoGeo(r, 0), rockLit, { x, y, z })));
  head.add(part(boxGeo(0.016, 0.08, 0.015), lava, { x: 0.02, y: 0.02, z: -0.19, rz: 0.3 })); // short brow crack (no clipping bar)
  g.add(head);
  return finalize(g, [0, 1.0, -0.24]);
}
