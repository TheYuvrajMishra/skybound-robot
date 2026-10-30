import * as THREE from "three";
import { PALETTE as P } from "./palette";
import { mat, glow, boxGeo, cylGeo, coneGeo, octaGeo, sphGeo, icoGeo, part, pivot, finalize } from "./helpers";

/**
 * Crawler imp (sheet 02) — iter 5. Faceted taller dome, 6 legs (3 per
 * side — the sheet's front/back panels each show 3 legs per side; the
 * "8 legs" claim from one confirmation reviewer double-counts overlap),
 * diagonal femurs + ringed knees + near-vertical tibias + flat toed
 * feet with forward claws, large slanted #FF6A00 eyes under thick
 * protruding brow slabs, wide jagged jaw with fangs + orange glow,
 * large round concentric cheek discs, protruding rear abdomen with
 * spine plates + short wide low orange slit, wide-based faceted red
 * horns. Faces -Z.
 */
export function buildCrawler(): THREE.Group {
  const g = new THREE.Group();
  const rock = mat(P.crawlerBody, { roughness: 0.85 });
  const rockLit = mat(P.crawlerLight, { roughness: 0.85 });
  const dark = mat(P.rockDark, { roughness: 0.9 });
  const orange = glow("#ff6a00", 1.5);
  const red = mat("#c1272d", { roughness: 0.7 });

  const body = pivot("body", 0, 0.34, 0);
  // Faceted taller dome: icosahedron, ~1.1:1 width:height, irregular facets
  body.add(part(icoGeo(0.28, 1), rock, { sx: 1.05, sy: 0.95, sz: 1.0 }));
  body.add(part(sphGeo(0.21, 8, 6), rockLit, { y: -0.02, z: -0.18, sx: 1.0, sy: 0.72, sz: 0.75, name: "head" })); // head mass, pushed forward so it reads as a distinct head
  // Rear abdomen: protrudes visibly (rear extent 0.41 vs dome rear 0.29)
  body.add(part(sphGeo(0.22, 10, 8), rock, { y: -0.02, z: 0.22, sx: 1.35, sy: 0.8, sz: 0.85, name: "abdomen" }));
  // Spine plates sit ON the abdomen's rear ellipsoid surface (computed per
  // plate); the old vertical row at y 0.18 was mostly hidden inside the dome.
  const spine: Array<[number, number]> = [
    [-0.1, 0.392], [-0.04, 0.41], [0.02, 0.405], [0.08, 0.379], [0.14, 0.303],
  ];
  for (const [y, z] of spine) {
    body.add(part(octaGeo(0.035, 0), dark, { y, z, sx: 1, sy: 0.5, sz: 1.6 }));
  }
  body.add(part(boxGeo(0.1, 0.03, 0.015), orange, { y: -0.12, z: 0.38 })); // short wide low rear slit
  body.add(part(coneGeo(0.05, 0.1, 4), dark, { y: -0.2, z: 0.28, rx: Math.PI })); // pointed lower edge
  // 17 large faceted shard spikes: crown + sides + tiered side spikes.
  // Bases sink into the dome (position radius 0.22 < dome radius 0.28).
  const spikeDirs: [number, number, number, number][] = [
    // dx, dy, dz, len
    [0, 1, 0, 0.28], [0.5, 0.85, 0.3, 0.25], [-0.5, 0.85, 0.3, 0.25],
    [0.5, 0.85, -0.3, 0.25], [-0.5, 0.85, -0.3, 0.25],
    [0.85, 0.5, 0.2, 0.24], [-0.85, 0.5, 0.2, 0.24], [0.85, 0.5, -0.2, 0.24], [-0.85, 0.5, -0.2, 0.24],
    [0.25, 0.9, 0.7, 0.23], [-0.25, 0.9, 0.7, 0.23], [0, 0.7, -0.7, 0.23],
    [0.95, 0.25, 0.35, 0.22], [-0.95, 0.25, 0.35, 0.22], [0.95, 0.25, -0.35, 0.22], [-0.95, 0.25, -0.35, 0.22],
    [0, 0.95, -0.35, 0.24],
  ];
  for (const [dx, dy, dz, len] of spikeDirs) {
    const l = Math.hypot(dx, dy, dz);
    const s = part(coneGeo(0.07, len, 4), dark, { x: (dx / l) * 0.22, y: (dy / l) * 0.22, z: (dz / l) * 0.22 });
    s.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(dx / l, dy / l, dz / l));
    body.add(s);
  }
  // Horns: wider base, faceted, ~0.33x head height, clear of the eyes
  for (const side of [-1, 1]) {
    body.add(part(coneGeo(0.075, 0.24, 4), red, { x: side * 0.14, y: 0.16, z: -0.16, rx: -0.35, rz: side * -0.3 }));
    // Thick angled protruding brow slab + large slanted eye beneath it.
    // z values straddle the dome/head surface so nothing floats.
    body.add(part(boxGeo(0.18, 0.07, 0.07), rock, { x: side * 0.1, y: 0.1, z: -0.28, rz: side * 0.5 }));
    body.add(part(sphGeo(0.085, 7, 5), orange, { x: side * 0.1, y: 0.02, z: -0.31, sx: 1.1, sy: 0.55, sz: 0.3, rz: side * 0.28, name: "eye" }));
    // Large round concentric cheek disc with bolts + orange slit below
    body.add(part(cylGeo(0.06, 0.06, 0.02, 10), rockLit, { x: side * 0.21, y: -0.03, z: -0.2, rx: Math.PI / 2 }));
    body.add(part(octaGeo(0.015, 0), dark, { x: side * 0.21, y: -0.03, z: -0.21 }));
    body.add(part(octaGeo(0.012, 0), dark, { x: side * 0.17, y: 0.01, z: -0.21 }));
    body.add(part(boxGeo(0.05, 0.015, 0.012), orange, { x: side * 0.2, y: -0.09, z: -0.19 })); // cheek orange slit
  }
  body.add(part(octaGeo(0.04, 0), dark, { y: 0.14, z: -0.26, sx: 1, sy: 1.3, sz: 0.4 })); // central black diamond forehead gem
  // Wide jagged lower jaw with irregular fangs + wide jagged orange glow
  body.add(part(boxGeo(0.2, 0.06, 0.04), dark, { y: -0.14, z: -0.26, name: "jaw" }));
  const fangX = [-0.08, -0.05, -0.02, 0.02, 0.05, 0.08];
  fangX.forEach((fx, i) => {
    body.add(part(coneGeo(0.018, 0.05 + (i % 3) * 0.015, 4), dark, { x: fx, y: -0.18, z: -0.26, rx: Math.PI }));
  });
  // Upper fangs (pointing up from the jaw line, embedded in the head mass)
  for (const side of [-1, 1]) {
    body.add(part(coneGeo(0.018, 0.05, 4), dark, { x: side * 0.07, y: -0.07, z: -0.33 }));
  }
  body.add(part(boxGeo(0.18, 0.03, 0.015), orange, { y: -0.11, z: -0.27, name: "mouthGlow" }));
  g.add(body);

  // Six legs: shallower femur angles so knees sit visibly above the
  // ground and tibias read as real vertical segments (the old steep
  // angles put knees almost at ground level, leaving stub tibias that
  // read as diagonal stilts).
  const legSpec: { z: number; reach: number; angle: number }[] = [
    { z: -0.2, reach: 0.38, angle: 0.45 },
    { z: 0.0, reach: 0.42, angle: 0.25 },
    { z: 0.2, reach: 0.38, angle: 0.38 },
  ];
  let idx = 0;
  for (const side of [-1, 1]) {
    for (const spec of legSpec) {
      const leg = pivot(`leg${idx}`, side * 0.24, 0.32, spec.z);
      const cos = Math.cos(spec.angle);
      const sin = Math.sin(spec.angle);
      const kneeX = side * spec.reach * cos;
      const kneeY = -spec.reach * sin;
      const kneeWorldY = 0.32 + kneeY;
      leg.add(part(boxGeo(spec.reach, 0.045, 0.045), dark, { x: (kneeX / 2), y: kneeY / 2, rz: -side * spec.angle })); // diagonal femur (thinner)
      leg.add(part(cylGeo(0.035, 0.035, 0.05, 6), rockLit, { x: kneeX, y: kneeY, rx: Math.PI / 2 })); // knee ring
      leg.add(part(boxGeo(0.045, kneeWorldY, 0.045), dark, { x: kneeX, y: kneeY - kneeWorldY / 2 + 0.02 })); // near-vertical tibia
      leg.add(part(cylGeo(0.032, 0.032, 0.04, 6), rockLit, { x: kneeX, y: -0.29, rx: Math.PI / 2 })); // ankle ring
      leg.add(part(boxGeo(0.08, 0.03, 0.06), rock, { x: kneeX, y: -0.3 })); // flat foot
      leg.add(part(coneGeo(0.015, 0.05, 4), dark, { x: kneeX, y: -0.3, z: -0.06, rx: -1.2 })); // front claw
      leg.add(part(coneGeo(0.015, 0.05, 4), dark, { x: kneeX + side * 0.03, y: -0.3, z: -0.05, rx: -1.2, ry: 0.5 })); // front claw 2
      g.add(leg);
      idx++;
    }
  }
  (g.userData as Record<string, unknown>).legs = g.children.filter((c) => c.name.startsWith("leg"));
  return finalize(g, [0, 0.34, -0.36]);
}
