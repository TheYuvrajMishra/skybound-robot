import * as THREE from "three";
import { PALETTE as P } from "./palette";
import { mat, glow, boxGeo, cylGeo, coneGeo, icoGeo, octaGeo, sphGeo, frustumGeo, part, pivot, anchor, finalize } from "./helpers";

/** Triangulated cloth: grid with fold z-offsets + a pointed bottom. Non-indexed, so flatShading gives visible facets. */
function clothGeo(w: number, rectH: number, point: number): THREE.BufferGeometry {
  const t = 0.022;
  const cols = 4;
  const rows = 3; // fewer rows (tri budget: back white glow core restored)
  const hw = w / 2;
  const foldAmp = 0.012;
  const foldSign = [1, -1, 1, -1];
  // Vertex grid (front/back share the same fold pattern, offset by thickness)
  const vx: number[][] = [];
  const vy: number[][] = [];
  const vz: number[][] = [];
  for (let r = 0; r <= rows; r++) {
    vx[r] = [];
    vy[r] = [];
    vz[r] = [];
    for (let c = 0; c < cols; c++) {
      vx[r][c] = -hw + (c / (cols - 1)) * w;
      vy[r][c] = -(r / rows) * rectH;
      vz[r][c] = foldAmp * foldSign[c] * (0.5 + 0.5 * (r / rows));
    }
  }
  const pos: number[] = [];
  const tri = (a: [number, number, number], b: [number, number, number], c: [number, number, number]) => {
    pos.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
  };
  const quad = (a: [number, number, number], b: [number, number, number], c: [number, number, number], d: [number, number, number]) => {
    tri(a, b, c);
    tri(a, c, d);
  };
  for (const s of [1, -1]) {
    const zoff = (s * t) / 2;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols - 1; c++) {
        const a: [number, number, number] = [vx[r][c], vy[r][c], vz[r][c] + zoff];
        const b: [number, number, number] = [vx[r][c + 1], vy[r][c + 1], vz[r][c + 1] + zoff];
        const cc: [number, number, number] = [vx[r + 1][c + 1], vy[r + 1][c + 1], vz[r + 1][c + 1] + zoff];
        const d: [number, number, number] = [vx[r + 1][c], vy[r + 1][c], vz[r + 1][c] + zoff];
        if (s === 1) quad(a, b, cc, d);
        else quad(a, d, cc, b);
      }
    }
    // Point fan: bottom row to the central point vertex
    const tip: [number, number, number] = [0, -(rectH + point), zoff];
    for (let c = 0; c < cols - 1; c++) {
      const a: [number, number, number] = [vx[rows][c], vy[rows][c], vz[rows][c] + zoff];
      const b: [number, number, number] = [vx[rows][c + 1], vy[rows][c + 1], vz[rows][c + 1] + zoff];
      if (s === 1) tri(a, b, tip);
      else tri(a, tip, b);
    }
  }
  // Side edges around the perimeter (top, sides, point slopes)
  const edge = (a: [number, number, number], b: [number, number, number]) => {
    const af: [number, number, number] = [a[0], a[1], a[2] + t / 2];
    const bf: [number, number, number] = [b[0], b[1], b[2] + t / 2];
    const ab: [number, number, number] = [a[0], a[1], a[2] - t / 2];
    const bb: [number, number, number] = [b[0], b[1], b[2] - t / 2];
    quad(af, bf, bb, ab);
  };
  for (let c = 0; c < cols - 1; c++) {
    edge([vx[0][c], vy[0][c], vz[0][c]], [vx[0][c + 1], vy[0][c + 1], vz[0][c + 1]]);
  }
  for (let r = 0; r < rows; r++) {
    edge([vx[r][0], vy[r][0], vz[r][0]], [vx[r + 1][0], vy[r + 1][0], vz[r + 1][0]]);
    edge([vx[r][cols - 1], vy[r][cols - 1], vz[r][cols - 1]], [vx[r + 1][cols - 1], vy[r + 1][cols - 1], vz[r + 1][cols - 1]]);
  }
  edge([vx[rows][0], vy[rows][0], vz[rows][0]], [0, -(rectH + point), 0]);
  edge([vx[rows][cols - 1], vy[rows][cols - 1], vz[rows][cols - 1]], [0, -(rectH + point), 0]);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.computeVertexNormals();
  return geo;
}

/** Swept triangular fin prism: triangle in XY (base on the body, tip swept back), thickness in Z. */
function triFinGeo(radial: number, height: number, tipDrop: number, thick: number): THREE.BufferGeometry {
  const t = thick / 2;
  const A: [number, number] = [0, height / 2];
  const B: [number, number] = [0, -height / 2];
  const C: [number, number] = [radial, -height / 2 + tipDrop];
  const pos: number[] = [];
  const tri = (a: [number, number, number], b: [number, number, number], c: [number, number, number]) => {
    pos.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
  };
  const quad = (a: [number, number, number], b: [number, number, number], c: [number, number, number], d: [number, number, number]) => {
    tri(a, b, c);
    tri(a, c, d);
  };
  const Af: [number, number, number] = [A[0], A[1], t];
  const Bf: [number, number, number] = [B[0], B[1], t];
  const Cf: [number, number, number] = [C[0], C[1], t];
  const Ab: [number, number, number] = [A[0], A[1], -t];
  const Bb: [number, number, number] = [B[0], B[1], -t];
  const Cb: [number, number, number] = [C[0], C[1], -t];
  tri(Af, Bf, Cf);
  tri(Ab, Cb, Bb);
  quad(Af, Bf, Bb, Ab);
  quad(Bf, Cf, Cb, Bb);
  quad(Cf, Af, Ab, Cb);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.computeVertexNormals();
  return geo;
}

/**
 * Multiplier gate (sheet 08) — iter 5.
 * Pillar width KEPT (shaft ~0.19, total gate 1.43 = 1:7.5 per pylon —
 * the two confirmation reviewers bracketed it (one said too thick, one
 * said too thin); the sheet's own ratio supports the current width.
 * Taller panel (0.95 = 0.62x total height, 0.73x shaft) with a THIN pale
 * edge (strongest on the bottom), SINGLE wide trapezoidal flared base
 * (1.63x shaft, 0.13 tall) with a front panel + inset cyan dots, FLUSH
 * chamfered cap (no mushroom overhang), narrower front strip (0.06 =
 * 0.32x shaft) ending above the base, inner-face zigzag strips front
 * AND back, circuit traces with dot nodes near the panel's inner
 * edges, per-pylon hardware (top bracket + bolt plate, wedge bracket,
 * mid hinge disc), back panel DELETED, back base marks DELETED,
 * lower housing kept in mid-grey. NO text/icon/number.
 */
export function buildGate(): THREE.Group {
  const g = new THREE.Group();
  const grey = mat(P.heroMid, { roughness: 0.7 });
  const light = mat(P.plinth, { roughness: 0.65 });
  const dark = mat(P.heroDark, { roughness: 0.8 });
  const cyan = glow(P.cyan, 1.5);
  const edge = glow(P.glassCyan, 1.0);
  for (const side of [-1, 1]) {
    const post = pivot(side < 0 ? "postL" : "postR", side * 0.62, 0, 0);
    // SINGLE wide trapezoidal flared base with front panel + inset dots
    post.add(part(frustumGeo(0.85, 1.15, 0.13), light, { y: 0.065, sx: 0.24, sz: 0.2 })); // widened base: bottom 0.39 = 1.9x shaft width
    post.add(part(boxGeo(0.2, 0.06, 0.015), light, { y: 0.065, z: -0.125 }));
    post.add(part(boxGeo(0.025, 0.025, 0.012), cyan, { x: -0.06, y: 0.065, z: -0.128 }));
    post.add(part(boxGeo(0.025, 0.025, 0.012), cyan, { x: 0.06, y: 0.065, z: -0.128 }));
    // Tapered shaft, height 1.30, starting at the plinth top (0.13)
    post.add(part(frustumGeo(0.85, 1.05, 1.3), grey, { y: 0.78, sx: 0.14, sz: 0.14, name: "post" }));
    // FLUSH chamfered cap (bottom width = shaft top width, no overhang)
    post.add(part(frustumGeo(0.8, 0.85, 0.1), light, { y: 1.48, sx: 0.14, sz: 0.14 }));
    // Inward brackets (top + bottom) meeting the panel edge + bolt plates
    for (const by of [1.3, 0.42]) {
      post.add(part(boxGeo(0.15, 0.06, 0.08), grey, { x: -side * 0.12, y: by }));
      post.add(part(boxGeo(0.06, 0.06, 0.02), dark, { x: -side * 0.19, y: by, z: -0.05 }));
    }
    post.add(part(octaGeo(0.04, 0), dark, { x: -side * 0.1, y: 0.85, name: "hinge" })); // mid-height hinge disc, inner edge
    // Narrow front glow strip with chevron ends, ending above the base
    post.add(part(boxGeo(0.06, 0.85, 0.02), cyan, { y: 0.9, z: -0.105 }));
    post.add(part(octaGeo(0.035, 0), cyan, { y: 1.36, z: -0.105, sx: 1, sy: 1.4, sz: 0.3 }));
    post.add(part(octaGeo(0.035, 0), cyan, { y: 0.44, z: -0.105, sx: 1, sy: 1.4, sz: 0.3 }));
    // Inner-face zigzag strips DELETED (both faces, iter 7): both
    // iter-10 reviewers agree they read as branch spikes / floating
    // diagonal slashes on the front strip, and the front strip +
    // chevron ends carry the glow detail alone.
    // Chunky lower housing in mid-grey (no dark back marks)
    post.add(part(boxGeo(0.24, 0.22, 0.06), grey, { y: 0.3, z: 0.12 }));
    g.add(post);
  }
  // Blank glass: 0.95 wide, 0.95 tall (0.38..1.33), thin pale edge
  const glass = part(boxGeo(0.95, 0.95, 0.03), mat(P.glassCyan, { transparent: true, opacity: 0.6, roughness: 0.3 }), { y: 0.855, name: "glass" });
  g.add(glass);
  g.add(part(boxGeo(0.98, 0.03, 0.035), edge, { y: 0.375 })); // bottom edge (strongest)
  g.add(part(boxGeo(0.98, 0.02, 0.035), edge, { y: 1.335 })); // top edge
  g.add(part(boxGeo(0.02, 0.98, 0.035), edge, { x: -0.48, y: 0.855 }));
  g.add(part(boxGeo(0.02, 0.98, 0.035), edge, { x: 0.48, y: 0.855 }));
  // Circuit traces with right-angle bends + dot nodes near inner edges
  for (const side of [-1, 1]) {
    g.add(part(boxGeo(0.012, 0.5, 0.008), cyan, { x: side * 0.4, y: 0.85, z: -0.02 }));
    g.add(part(boxGeo(0.06, 0.012, 0.008), cyan, { x: side * 0.4, y: 0.6, z: -0.02 }));
    g.add(part(octaGeo(0.012, 0), cyan, { x: side * 0.4, y: 0.6, z: -0.025 }));
  }
  anchor(g, "faceAnchor", 0, 0.855, -0.03);
  (g.userData as Record<string, unknown>).glass = glass;
  return finalize(g, [-0.62, 0.9, -0.12]);
}

/**
 * Upgrade boulder (sheet 09) — iter 5.
 * 8 black rim studs DELETED (reference has none — only a cracked rock
 * rim), flat black base wedge DELETED (rounded tapering rock bottom),
 * back cyan bars DELETED, bumps cut to 5 small embedded rocks, rock
 * lightened to mid-grey #7E838A, panel inset with a saturated #00E5FF
 * face at 1.53:1 (0.46 x 0.30), cracks rebuilt as thin branching
 * tapered chains FOLLOWING the rock surface (z computed from the
 * body ellipsoid, no hovering bars), thin dark non-glowing crack
 * lines on the upper front + back, 7 small pebbles touching the base
 * (3-4 with cyan veins). NO text/icon/number.
 */
export function buildBoulder(): THREE.Group {
  const g = new THREE.Group();
  const rock = mat(P.boulderMid, { roughness: 0.9 });
  const shadow = mat(P.boulderShadow, { roughness: 0.9 });
  const hi = mat(P.boulderHi, { roughness: 0.85 });
  const cyan = glow(P.cyan, 1.6);
  // Body ellipsoid radii: main ico r 0.42 scaled (1.05, 0.92, 0.95)
  const RX = 0.441;
  const RY = 0.386;
  const RZ = 0.399;
  const CY = 0.44;
  const surfZ = (x: number, y: number) => {
    const q = 1 - (x / RX) ** 2 - ((y - CY) / RY) ** 2;
    return q > 0 ? -RZ * Math.sqrt(q) : -0.05;
  };
  g.add(part(icoGeo(0.42, 1), rock, { y: CY, sx: 1.05, sy: 0.92, sz: 0.95, name: "rock" }));
  // Small central bottom mound: hides the icosahedron's bottom point
  // vertex (read as a spike). NOT a full-width slab — the iter-5
  // full-width flat base wedge was explicitly deleted per reviewers,
  // and a wide slab reintroduced in iter 6 read as that same slab.
  g.add(part(icoGeo(0.16, 1), rock, { y: 0.06, sx: 1.2, sy: 0.5, sz: 1.0 }));
  // 4 small bumps, embedded ~50% (the old top-centre bump read as a
  // nub on top of the silhouette, so it is deleted)
  const bumps: [number, number, number, number][] = [
    [-0.28, 0.7, 0.05, 0.1], [-0.38, 0.42, 0.15, 0.09], [0.38, 0.4, 0.12, 0.09],
    [0.3, 0.65, -0.05, 0.08],
  ];
  bumps.forEach(([x, y, z, r], i) => g.add(part(icoGeo(r, 0), i % 2 ? hi : rock, { x, y, z, sy: 0.6 }))); // flattened (read as pads, not spikes)
  // INSET blank face panel: 0.44 x 0.26 (1.69:1, ~50% of body width),
  // saturated cyan, set slightly deeper so its edges do not float
  const face = part(boxGeo(0.44, 0.26, 0.03), cyan, { y: 0.47, z: -0.385, name: "facePanel" });
  g.add(face);
  // Broken rock rim: 5 LARGE flattened lumps at asymmetric positions,
  // barely proud of the surface (the old 8 small chunks at -0.08 read
  // as a uniform stud/bolt ring in front view)
  const rim: [number, number, number][] = [[-0.28, 0.58, 0.09], [-0.24, 0.4, 0.05], [0.28, 0.5, 0.08], [-0.18, 0.3, 0.05], [0.2, 0.62, 0.07]];
  rim.forEach(([x, y, r]) => g.add(part(icoGeo(r, 0), rock, { x, y, z: surfZ(x, y) - 0.01, sy: 0.6 })));
  // Broken-rock shards overlapping the panel corners (rock eating into
  // the panel edge, so the panel is not a perfect sharp rectangle)
  for (const [sx, sy] of [[-0.2, 0.58], [0.2, 0.58], [-0.2, 0.36], [0.2, 0.36]] as const) {
    g.add(part(boxGeo(0.1, 0.06, 0.01), rock, { x: sx, y: sy, z: -0.4, rz: sx * sy > 0 ? 0.3 : -0.3 }));
  }
  // Branching crack chains following the surface (no hovering bars);
  // centres start at the panel border so cracks emanate from the edge.
  // Built as connected polylines with shared joints — the old separate
  // boxes had gaps between segments and read as isolated dashes.
  const crackSeg = (x1: number, y1: number, x2: number, y2: number) => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy);
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;
    return part(boxGeo(0.016, len, 0.015), cyan, { x: mx, y: my, z: surfZ(mx, my) - 0.002, rz: Math.atan2(-dx, dy) });
  };
  g.add(crackSeg(0, 0.61, 0.02, 0.7));
  g.add(crackSeg(0.02, 0.7, -0.03, 0.78));
  g.add(crackSeg(0.02, 0.7, 0.08, 0.76));
  g.add(crackSeg(0.24, 0.6, 0.32, 0.66));
  g.add(crackSeg(0.32, 0.66, 0.38, 0.62));
  g.add(crackSeg(-0.24, 0.47, -0.32, 0.52));
  g.add(crackSeg(-0.32, 0.52, -0.38, 0.5));
  g.add(crackSeg(-0.23, 0.33, -0.3, 0.28));
  g.add(crackSeg(0, 0.33, 0.02, 0.24));
  g.add(crackSeg(0.02, 0.24, 0, 0.16));
  // Thin dark non-glowing crack lines, upper front + back
  g.add(part(boxGeo(0.012, 0.1, 0.012), shadow, { x: -0.15, y: 0.7, z: surfZ(-0.15, 0.7) - 0.002, rz: 0.4 }));
  g.add(part(boxGeo(0.012, 0.09, 0.012), shadow, { x: 0.18, y: 0.68, z: surfZ(0.18, 0.68) - 0.002, rz: -0.3 }));
  g.add(part(boxGeo(0.012, 0.1, 0.012), shadow, { x: 0.15, y: 0.55, z: -surfZ(0.15, 0.55) + 0.002, rz: 0.5 }));
  g.add(part(boxGeo(0.012, 0.09, 0.012), shadow, { x: -0.12, y: 0.35, z: -surfZ(-0.12, 0.35) + 0.002, rz: -0.4 }));
  // 6 pebbles TUCKED UNDER the base: each top overlaps the body's
  // lower silhouette at its x (the old row sat clear of the body with
  // a visible gap in front view)
  const pebbles: [number, number, number, boolean][] = [
    [-0.35, -0.2, 0.13, true], [-0.28, 0.15, 0.1, false], [-0.12, -0.3, 0.09, true],
    [0.1, 0.25, 0.08, false], [0.26, -0.15, 0.1, true], [0.35, 0.2, 0.13, false],
  ];
  pebbles.forEach(([x, z, r, vein], i) => {
    g.add(part(icoGeo(r, 0), i % 2 ? shadow : rock, { x, y: r * 0.7, z, name: `rubble${i}` }));
    if (vein) g.add(part(boxGeo(0.015, r, 0.01), cyan, { x, y: r * 0.7 + 0.02, z: z - r * 0.8, rz: 0.4 }));
  });
  anchor(g, "faceAnchor", 0, 0.46, -0.41);
  (g.userData as Record<string, unknown>).facePanel = face;
  return finalize(g, [0, 0.46, -0.42]);
}

/**
 * Road segment (sheet 10) — iter 5. EXACT length 10 along Z, width 2.0.
 * Deck assembly raised on a boxed underframe (total end height 0.78 =
 * 0.39x width), 2x8 faceted plates with diagonal seams + flattened
 * octahedron hex inserts + corner bolts + cyan seam dots, CONTINUOUS
 * worn lane stripes (full length, wear notches, same phase across
 * tiles), boxed end frames with ENCLOSED X-braces (nothing protrudes
 * beyond the ends), enlarged back dome + full-width flange + base
 * skirt, side assemblies moved out to x +/-1.20 (thick cylindrical
 * pipes with collars: gunmetal top, cyan middle, silver bottom),
 * side skirts, clamp blocks with cyan dots, vent-slatted clamp at the
 * close-up station, caps FLUSH at the tile ends (3 stacked front,
 * 1 large back). Post railing + top bars + deck-top V-struts DELETED
 * (the V-struts protruded beyond the ends and clashed at seams).
 * Deck lightened to #5A6470/#6B7683. Sheet front/back keep the
 * elevated runway framing (the sheet's own front/back panels are
 * elevated views, not end-on).
 */
export function buildRoad(): THREE.Group {
  const g = new THREE.Group();
  const deckA = mat("#5a6470", { roughness: 0.8 });
  const deckB = mat(P.roadDeck2, { roughness: 0.8 });
  const deckHi = mat(P.roadPlate, { roughness: 0.8 });
  const frame = mat(P.roadFrame, { roughness: 0.85 });
  const dark = mat(P.roadDark, { roughness: 0.85 });
  const line = mat(P.laneWorn, { roughness: 0.7 });
  const cyan = glow(P.railCyan, 1.4);
  const silver = mat(P.pipeSilver, { roughness: 0.4 });
  // Deck: 2 across x 8 along, each 0.98 x 0.5 x 1.23, y 0.28..0.78
  for (let i = 0; i < 8; i++) {
    const z = -4.375 + i * 1.25;
    for (const sx of [-1, 1]) {
      const m = i === 3 || i === 6 ? deckHi : i % 2 ? deckB : deckA;
      g.add(part(boxGeo(0.98, 0.5, 1.23), m, { x: sx * 0.5, y: 0.53, z, name: `plate${i}` }));
    }
  }
  for (let k = 1; k < 8; k++) {
    g.add(part(boxGeo(1.98, 0.012, 0.05), dark, { y: 0.785, z: -5 + k * 1.25 }));
  }
  g.add(part(boxGeo(0.05, 0.012, 9.98), dark, { y: 0.785 })); // longitudinal centre seam
  // Diagonal seams DELETED (iter 7): both iter-10 reviewers read the
  // flush diagonal seam boxes as thin rods floating across the deck.
  // Hex inserts on every other plate kept.
  for (let i = 0; i < 8; i += 2) {
    g.add(part(octaGeo(0.09, 0), dark, { x: 0, y: 0.785, z: -4.375 + i * 1.25, sx: 1, sy: 0.2, sz: 1 }));
  }
  // Corner bolts (2 joints) + cyan seam dots
  for (const jz of [-2.5, 2.5]) {
    for (const bx of [-0.88, -0.3, 0.3, 0.88]) {
      g.add(part(boxGeo(0.035, 0.012, 0.035), dark, { x: bx, y: 0.785, z: jz }));
    }
  }
  for (const [dx, dz] of [[-0.9, -1.25], [0.9, 0], [-0.9, 1.25], [0.9, 2.5], [-0.9, -3.75], [0.9, 3.75]] as const) {
    g.add(part(octaGeo(0.015, 0), cyan, { x: dx, y: 0.79, z: dz }));
  }
  // CONTINUOUS worn lane stripes (full length, same phase across tiles)
  for (const side of [-1, 1]) {
    g.add(part(boxGeo(0.16, 0.008, 9.98), line, { x: side * 0.62, y: 0.786, name: "laneLine" }));
  }
  for (const [wx, wz] of [[-0.62, -2.2], [0.62, 0.8], [-0.62, 2.9], [0.62, -3.9]] as const) {
    g.add(part(boxGeo(0.16, 0.012, 0.15), deckA, { x: wx, y: 0.788, z: wz })); // wear notches (poke above the stripe)
  }
  // Boxed end frames with ENCLOSED X-braces (faces exactly at +/-5.0)
  for (const e of [-1, 1]) {
    g.add(part(boxGeo(2.0, 0.08, 0.08), frame, { y: 0.74, z: e * 4.96 }));
    g.add(part(boxGeo(2.0, 0.08, 0.08), frame, { y: 0.04, z: e * 4.96 }));
    for (const sx of [-1, 1]) {
      g.add(part(boxGeo(0.08, 0.62, 0.08), frame, { x: sx * 0.96, y: 0.39, z: e * 4.96 }));
    }
    // X-braces ENCLOSED in the frame: inner span 1.84 x 0.62, so the
    // diagonal is 1.94 long at atan(1.84/0.62) = 1.245 rad. The old
    // 2.15-long bars at 0.37 rad stuck 0.6 above/below the frame and
    // read as antennae/V-sticks at both ends.
    for (const br of [-1.245, 1.245]) {
      g.add(part(boxGeo(0.06, 1.94, 0.02), dark, { y: 0.39, z: e * 4.96, rz: br }));
    }
  }
  // Boxed underframe + cross beams
  g.add(part(boxGeo(1.8, 0.28, 9.8), dark, { y: 0.14 }));
  for (const bz of [-2.5, 2.5]) {
    g.add(part(boxGeo(1.8, 0.1, 0.2), frame, { y: 0.14, z: bz }));
  }
  // Back-end (+Z) faceted dome + full-width flange + base skirt
  g.add(part(icoGeo(0.34, 0), silver, { y: 0.53, z: 5.06, sx: 1.0, sy: 0.85, sz: 0.5 }));
  g.add(part(boxGeo(2.0, 0.12, 0.1), frame, { y: 0.53, z: 4.95 }));
  g.add(part(boxGeo(2.0, 0.14, 0.12), frame, { y: 0.14, z: 4.94 }));
  // Side assemblies FLUSH against the deck edge (old x +/-1.20 left a
  // full-length light-grey gap between deck edge and skirt in front view)
  for (const side of [-1, 1]) {
    const x = side * 1.08;
    g.add(part(cylGeo(0.09, 0.09, 10.0, 5), dark, { x, y: 0.7, rx: Math.PI / 2 }));
    g.add(part(cylGeo(0.11, 0.11, 10.0, 5), cyan, { x, y: 0.55, rx: Math.PI / 2, name: "rail" }));
    g.add(part(cylGeo(0.06, 0.06, 10.0, 5), silver, { x, y: 0.4, rx: Math.PI / 2 }));
    for (const cz of [-3, 0, 3]) {
      g.add(part(cylGeo(0.13, 0.13, 0.12, 5), dark, { x, y: 0.55, z: cz, rx: Math.PI / 2 })); // collar ring
    }
    g.add(part(boxGeo(0.12, 0.3, 9.9), dark, { x: side * 1.02, y: 0.53 })); // side skirt (overlaps the deck edge)
    // Clamp blocks with cyan dots; +X side at z -3 is the vent clamp
    for (const cz of [-3, 0, 3]) {
      const vent = side === 1 && cz === -3;
      g.add(part(boxGeo(vent ? 0.14 : 0.1, vent ? 0.26 : 0.24, vent ? 0.5 : 0.4), dark, { x: side * 1.02, y: 0.53, z: cz }));
      if (vent) {
        for (const sy of [0.45, 0.53, 0.61]) {
          g.add(part(boxGeo(0.1, 0.03, 0.015), frame, { x: side * 1.02, y: sy, z: -3.26 })); // vent slats (-Z face)
        }
        g.add(part(octaGeo(0.02, 0), cyan, { x: side * 1.02, y: 0.53, z: -3.27 })); // vent dot, on the middle slat
      } else {
        g.add(part(octaGeo(0.02, 0), cyan, { x: side * 1.07, y: 0.53, z: cz }));
      }
    }
    // End caps FLUSH at the tile ends: 3 stacked front, 1 large back
    for (const cy of [0.7, 0.55, 0.4]) {
      g.add(part(cylGeo(0.1, 0.1, 0.03, 5), cyan, { x, y: cy, z: -4.985, rx: Math.PI / 2 }));
    }
    g.add(part(cylGeo(0.13, 0.13, 0.03, 5), cyan, { x, y: 0.55, z: 4.985, rx: Math.PI / 2 }));
  }
  (g.userData as Record<string, unknown>).length = 10;
  // Close-up from the front-side (not along the road): the old -Z
  // close camera looked down the road length, so the close panel was
  // mostly empty grey void with a grazing view of the side tube.
  (g.userData as Record<string, unknown>).closeDir = [1, 0.25, -0.5];
  return finalize(g, [1.35, 0.8, -3.0]);
}

/**
 * Side props (sheet 11) — iter 5. SINGLE banner-pole assembly:
 * faceted OCTAGONAL pole + crossbar in #83888E, crossbar extending
 * beyond the banner + protruding rounded end knob, triangulated
 * draped banner (0.60 wide = 0.29x total height, 1.30 long = 0.62x,
 * point 0.28 deep, tip at ~80% of pole height, no invented vertical
 * stripes) in brighter royal #2F62AD, thick-stroke diamond emblem
 * with a tapered spear blade + top spike + tapered tail (0.51 tall),
 * metal hook hangers with bolts, gathered top hem, enlarged faceted
 * dome finial (2.0x pole width) + chunky hex top collar + ring + short
 * cyan segment, single WIDE glow strip (0.06) with a white core
 * running continuously below the finial to the base plate and proud
 * of every collar, shaft + housing bolts, arm-clamp lever, 8-9 rocks
 * + 3 pebbles spread beside (not intersecting) the base plate in
 * #7A8087. Front view: pole screen-left, banner screen-right.
 */
export function buildSideProps(): THREE.Group {
  const g = new THREE.Group();
  const grey = mat("#83888e", { roughness: 0.7 });
  const dark = mat(P.heroDark, { roughness: 0.8 });
  const cyan = glow(P.poleGlow, 1.5);
  const whiteCore = glow("#ffffff", 0.8);
  const banner = mat("#3570be", { roughness: 0.85 }); // lightened royal (the old #2F62AD rendered near-navy under the lighting)
  const bannerDark = mat("#1d4a8a", { roughness: 0.85 });
  const emblem = glow(P.emblemCyan, 1.2);
  const rockMat = mat("#7a8087", { roughness: 0.9 });

  const assembly = pivot("bannerPole", 0, 0, 0);
  const px = 0.35; // pole x (front view: +X reads screen-left)
  // Octagonal pole + finial + chunky top collar + ring + cyan segment
  assembly.add(part(cylGeo(0.085, 0.09, 1.8, 6), grey, { x: px, y: 0.96, name: "pole" })); // thicker shaft (0.17-0.18 = ~28% of banner width)
  assembly.add(part(sphGeo(0.15, 6, 4), grey, { x: px, y: 1.93, sx: 1, sy: 1.1, sz: 1 })); // ROUNDED faceted dome finial, taller (not a squat octahedron)
  assembly.add(part(cylGeo(0.09, 0.09, 0.08, 6), cyan, { x: px, y: 1.82 })); // short cyan segment
  assembly.add(part(cylGeo(0.16, 0.16, 0.14, 6), grey, { x: px, y: 1.72 })); // chunky hex top collar (wider than the shaft)
  assembly.add(part(cylGeo(0.13, 0.13, 0.05, 6), dark, { x: px, y: 1.6 })); // ring below collar
  assembly.add(part(boxGeo(0.44, 0.06, 0.44), dark, { x: px, y: 0.03 })); // wider square base plate
  // Mid double clamp + lower housing + bolts + shaft bolts
  assembly.add(part(boxGeo(0.2, 0.06, 0.2), grey, { x: px, y: 1.02 }));
  assembly.add(part(boxGeo(0.2, 0.06, 0.2), grey, { x: px, y: 0.94 }));
  assembly.add(part(boxGeo(0.22, 0.3, 0.22), grey, { x: px, y: 0.32 }));
  for (const [bx, by] of [[-0.06, 0.25], [0.06, 0.25], [-0.06, 0.39], [0.06, 0.39]] as const) {
    assembly.add(part(octaGeo(0.015, 0), dark, { x: px + bx, y: by, z: -0.115 })); // housing bolts
  }
  for (const by of [1.3, 1.45]) {
    assembly.add(part(octaGeo(0.015, 0), dark, { x: px, y: by, z: -0.065 })); // upper shaft bolts
  }
  // Glow strip SEGMENTED at the collars (top collar 1.65..1.79, mid
  // clamps 0.91..1.05, housing 0.17..0.47): one continuous strip read as
  // unbroken and blobbed at the top in iter 9
  for (const fz of [-0.135, 0.135]) {
    for (const [cy, ch] of [[1.32, 0.6], [0.69, 0.44], [0.085, 0.17]] as const) {
      assembly.add(part(boxGeo(0.06, ch, 0.015), cyan, { x: px, y: cy, z: fz }));
      // White core on BOTH faces (the front-only core read as a
      // front/back inconsistency in iter 10; paid for by the segment
      // and cloth trims below)
      assembly.add(part(boxGeo(0.025, ch, 0.008), whiteCore, { x: px, y: cy, z: fz + (fz < 0 ? -0.007 : 0.007) }));
    }
  }
  // Octagonal crossbar extending beyond the banner + FLAT end cap +
  // junction cap + lever (the old octahedron knob read as a spike tip)
  assembly.add(part(cylGeo(0.08, 0.08, 0.95, 6), grey, { x: -0.1, y: 1.78, rz: Math.PI / 2, name: "crossbar" })); // thicker crossbar
  assembly.add(part(boxGeo(0.05, 0.12, 0.12), grey, { x: -0.6, y: 1.78 })); // flat capped end
  assembly.add(part(boxGeo(0.05, 0.1, 0.1), dark, { x: 0.35, y: 1.78 })); // pole-junction cap
  assembly.add(part(boxGeo(0.04, 0.06, 0.04), dark, { x: 0.35, y: 1.86 })); // arm-clamp lever
  // Metal hook hangers with bolts under the crossbar
  for (const bx of [-0.42, 0.12]) {
    assembly.add(part(boxGeo(0.05, 0.1, 0.05), dark, { x: bx, y: 1.72 }));
    assembly.add(part(octaGeo(0.015, 0), dark, { x: bx, y: 1.7, z: -0.03 }));
  }
  // Triangulated draped banner: 0.60 wide, 1.02 + 0.28 point = 1.30 long
  const bannerMesh = new THREE.Mesh(clothGeo(0.6, 1.02, 0.28), banner);
  bannerMesh.position.set(-0.15, 1.72, 0);
  bannerMesh.name = "bannerCloth";
  assembly.add(bannerMesh);
  assembly.add(part(boxGeo(0.6, 0.05, 0.04), bannerDark, { x: -0.15, y: 1.7 })); // gathered top hem
  // Thick-stroke diamond emblem + tapered spear blade + top spike + tapered tail, both faces.
  // Edge rotations are the geometrically correct diamond (TL -, TR +, BL +, BR -);
  // the previous signs formed a bowtie/X whose corners merely suggested a diamond.
  // Emblem slimmed to ~0.36 tall (28% of banner length) with thinner
  // outline strokes; the old 0.51 emblem read oversized and thick
  for (const fz of [-0.024, 0.024]) {
    for (const [ex, ey, rz] of [[-0.045, 0.055, -0.675], [0.045, 0.055, 0.675], [-0.045, -0.055, 0.675], [0.045, -0.055, -0.675]] as const) {
      assembly.add(part(boxGeo(0.028, 0.15, 0.012), emblem, { x: -0.15 + ex, y: 1.07 + ey, z: fz, rz }));
    }
    assembly.add(part(octaGeo(0.07, 0), emblem, { x: -0.15, y: 1.07, z: fz, sx: 0.5, sy: 1.6, sz: 0.3 })); // tapered spear blade
    assembly.add(part(octaGeo(0.025, 0), emblem, { x: -0.15, y: 1.22, z: fz, sx: 0.6, sy: 1.5, sz: 0.3 })); // top spike (attached)
    assembly.add(part(frustumGeo(0.6, 1.0, 0.1), emblem, { x: -0.15, y: 0.9, z: fz, sx: 0.03, sz: 0.008 })); // tapered tail
  }
  g.add(assembly);
  // 8 rocks spread beside (not intersecting) the base plate (2 smallest
  // trimmed for the 800-tri cap, after the back white core restore)
  const rocks: [number, number, number][] = [
    [0.02, 0.22, 0.14], [0.68, 0.18, 0.12], [0.72, -0.12, 0.09],
    [0.1, -0.26, 0.1], [-0.05, 0.3, 0.08], [0.6, 0.32, 0.07],
    [0.78, 0.05, 0.06], [0.85, -0.2, 0.08],
  ];
  rocks.forEach(([x, z, r]) => g.add(part(octaGeo(r, 0), rockMat, { x, y: r * 0.7, z, sy: 0.7 }))); // flattened (rounded, not spiky pyramids)
  return finalize(g, [0.1, 1.6, -0.1]);
}

/**
 * Sky props (sheet 12) — iter 5. STACKED on one vertical axis.
 * Shaft widened to 0.37-0.39 (0.85x housing) as a faceted tapered
 * column with a tapered (not flared) foot, crown 0.44 wide x 0.32
 * tall + step + faceted pyramid cap (cap:crown 0.81:1), LARGE crown
 * windows (2 front + ribbed strip + notches + side panels + rivets,
 * grey back panel + ribbed strip), front 4 strips (2 wide outer, 2
 * narrow inner) + side strips, back tapered blade (1.32 = 0.73x shaft)
 * + 2 narrow side strips, 4 ladder rungs on the shaft, 2 side hook
 * arms per crown side, ELONGATED crystal (octahedron sy 1.8, 1.8:1)
 * seated with its lower point through a thin torus ring (r 0.24),
 * 4 two-segment zig-zag claws + hook tips that contact cap AND ring
 * without clipping the crystal, platform deck thickened to 0.30
 * (0.13x width) with 7 posts per long edge + end rails + cyan top
 * rails + angled trapezoid under-trusses + centre beam + broad cyan
 * under-panels, rock mound recoloured to pale #9AB0BE (12 boulders,
 * 0.36:1 mound, pointed side spikes removed). Close-up reframed on
 * the crystal (the old anchor cropped it).
 */
export function buildSkyProps(): THREE.Group {
  const g = new THREE.Group();
  const body = mat(P.spireBlue, { roughness: 0.75 });
  const hi = mat(P.spireHi, { roughness: 0.7 });
  const dark = mat(P.heroDark, { roughness: 0.8 });
  const cyan = glow(P.cyan, 1.5);
  const cloudMat = mat(P.cloudBlue, { roughness: 0.9 });
  const cloudShade = mat(P.cloudShade, { roughness: 0.9 });
  const cloudLight = mat(P.cloudLight, { roughness: 0.9 });

  // ---- Rock mound (base, y 0..~0.86) ----
  const cloud = pivot("cloud", 0, 0, 0);
  const puffs: [number, number, number, number, number][] = [
    [-0.95, 0.18, 0, 0.22, 0], [-0.55, 0.26, 0.05, 0.3, 1], [-0.15, 0.32, -0.05, 0.36, 1],
    [0.3, 0.3, 0.05, 0.32, 1], [0.7, 0.24, -0.05, 0.28, 0], [1.02, 0.16, 0, 0.2, 0],
    [-0.35, 0.45, -0.1, 0.24, 0], [0.1, 0.48, 0.08, 0.26, 1], [0.55, 0.4, -0.12, 0.2, 0],
    [-0.7, 0.38, 0.12, 0.18, 0], [0.9, 0.32, 0.1, 0.16, 0], [0, 0.68, 0, 0.24, 0],
  ];
  puffs.forEach(([x, y, z, r, d], i) => cloud.add(part(icoGeo(r, d), i % 3 === 0 ? cloudShade : i % 3 === 1 ? cloudMat : cloudLight, { x, y, z, sx: 1.2, sy: 0.75, sz: 1 })));
  g.add(cloud);

  // ---- Floating platform (y ~0.95..1.25 deck, posts to 1.41) ----
  const plat = pivot("platform", 0, 1.35, 0); // raised: platform underside clears the cloud top by ~0.34
  plat.add(part(boxGeo(2.3, 0.24, 0.7), body, { name: "deck" })); // deck 0.24 thick (0.10x width)
  plat.add(part(boxGeo(0.5, 0.08, 0.3), dark, { y: -0.35, name: "beam" })); // centre beam
  plat.add(part(boxGeo(0.24, 0.16, 0.5), body, { x: -1.05, y: -0.2 })); // end blocks (touch the deck underside)
  plat.add(part(boxGeo(0.24, 0.16, 0.5), body, { x: 1.05, y: -0.2 }));
  for (const sx of [-1, 1]) {
    plat.add(part(boxGeo(0.08, 0.92, 0.08), dark, { x: sx * 0.45, y: -0.215, rz: sx * -1.35 })); // angled under-truss: endpoints touch deck underside AND centre beam
  }
  for (let i = 0; i < 7; i++) {
    const px = -1.05 + i * 0.35;
    plat.add(part(boxGeo(0.04, 0.16, 0.04), dark, { x: px, y: 0.2, z: -0.32 }));
    plat.add(part(boxGeo(0.04, 0.16, 0.04), dark, { x: px, y: 0.2, z: 0.32 }));
  }
  plat.add(part(boxGeo(2.2, 0.03, 0.03), cyan, { y: 0.28, z: -0.32 })); // cyan top rails
  plat.add(part(boxGeo(2.2, 0.03, 0.03), cyan, { y: 0.28, z: 0.32 }));
  plat.add(part(boxGeo(0.03, 0.03, 0.64), dark, { x: -1.1, y: 0.28 })); // end railings
  plat.add(part(boxGeo(0.03, 0.03, 0.64), dark, { x: 1.1, y: 0.28 }));
  plat.add(part(boxGeo(0.6, 0.02, 0.4), cyan, { x: -0.7, y: -0.13 })); // broad cyan under-panels
  plat.add(part(boxGeo(0.6, 0.02, 0.4), cyan, { x: 0.7, y: -0.13 }));
  g.add(plat);

  // ---- Spire tower (y 1.55..~4.9) ----
  const spire = pivot("spire", 0, 1.9, 0); // raised: spire foot clears the platform top by ~0.40
  spire.add(part(frustumGeo(1.2, 0.85, 0.2), body, { y: 0.1, sx: 0.24, sz: 0.24 })); // tapered foot (narrower at bottom)
  spire.add(part(frustumGeo(0.95, 1.05, 1.8), body, { y: 1.08, sx: 0.3, sz: 0.24, name: "tower" })); // wider faceted tapered shaft
  spire.add(part(boxGeo(0.44, 0.32, 0.44), hi, { y: 2.14 })); // crown block
  spire.add(part(boxGeo(0.4, 0.06, 0.4), hi, { y: 2.32 })); // crown step
  spire.add(part(frustumGeo(0.45, 1.0, 0.3), body, { y: 2.47, sx: 0.38, sz: 0.38 })); // wider/taller faceted pyramid cap (base 1.23x crown)
  // Crown windows: 2 large front + ribbed strip + notches + side panels + rivets
  for (const side of [-1, 1]) {
    spire.add(part(boxGeo(0.12, 0.18, 0.02), cyan, { x: side * 0.1, y: 2.14, z: -0.24 }));
    spire.add(part(boxGeo(0.02, 0.14, 0.14), cyan, { x: side * 0.235, y: 2.14 })); // side panel
    spire.add(part(boxGeo(0.04, 0.2, 0.04), dark, { x: side * 0.235, y: 2.1, z: -0.12, rz: side * -0.5 })); // side hook arm
    spire.add(part(boxGeo(0.04, 0.2, 0.04), dark, { x: side * 0.235, y: 2.1, z: 0.12, rz: side * -0.5 })); // side hook arm 2
  }
  spire.add(part(boxGeo(0.03, 0.28, 0.02), cyan, { y: 2.14, z: -0.24 })); // central ribbed strip
  for (const ry of [2.08, 2.2]) {
    spire.add(part(boxGeo(0.05, 0.02, 0.022), cyan, { y: ry, z: -0.24 })); // rib notches
  }
  for (const side of [-1, 1]) {
    spire.add(part(octaGeo(0.015, 0), dark, { x: side * 0.15, y: 2.3, z: -0.23 })); // rivets
  }
  spire.add(part(boxGeo(0.3, 0.2, 0.03), mat(P.backPanelGrey, { roughness: 0.8 }), { y: 2.14, z: 0.24 })); // grey back panel
  spire.add(part(boxGeo(0.03, 0.2, 0.02), cyan, { y: 2.14, z: 0.26 })); // back ribbed strip
  spire.add(part(boxGeo(0.05, 0.02, 0.022), cyan, { y: 2.14, z: 0.26 })); // back rib notch
  // Front strips: 2 wide outer + 2 narrow inner + side strips; ladder rungs; collar strips.
  // z/x values sit PROUD of the shaft surface (half-depth ~0.17):
  // the old side strips at x +/-0.19 were INSIDE the shaft (half-width
  // 0.212) and invisible, and the front strips at z -0.16 were flush.
  for (const side of [-1, 1]) {
    spire.add(part(boxGeo(0.05, 1.5, 0.02), cyan, { x: side * 0.12, y: 1.08, z: -0.175 }));
    spire.add(part(boxGeo(0.03, 1.5, 0.02), cyan, { x: side * 0.05, y: 1.08, z: -0.175 }));
    spire.add(part(boxGeo(0.02, 1.5, 0.02), cyan, { x: side * 0.215, y: 1.08 }));
  }
  for (let i = 0; i < 4; i++) {
    spire.add(part(boxGeo(0.12, 0.03, 0.02), dark, { y: 0.55 + i * 0.18, z: -0.17 })); // ladder rungs
  }
  spire.add(part(boxGeo(0.3, 0.03, 0.02), hi, { y: 1.95, z: -0.175 })); // collar strip
  spire.add(part(boxGeo(0.3, 0.03, 0.02), hi, { y: 0.35, z: -0.175 }));
  // Back: wide tapered blade (1.32 = 0.73x shaft) + 2 narrow side strips
  spire.add(part(coneGeo(0.06, 0.22, 4), cyan, { y: 1.56, z: 0.175 }));
  spire.add(part(boxGeo(0.12, 0.8, 0.02), cyan, { y: 1.05, z: 0.175 }));
  spire.add(part(boxGeo(0.08, 0.3, 0.02), cyan, { y: 0.5, z: 0.175 }));
  for (const side of [-1, 1]) {
    spire.add(part(boxGeo(0.03, 1.0, 0.02), cyan, { x: side * 0.1, y: 1.05, z: 0.175 }));
  }
  // Thin torus ring + 4 two-segment zig-zag claws + hook tips (contact cap AND ring, clear the crystal).
  // Ring enlarged (r 0.29, tube 0.04): the old ring's inner edge sat
  // exactly on the crystal equator (0.24) and blended into it.
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.29, 0.04, 4, 8), cyan);
  ring.position.set(0, 2.86, 0);
  ring.rotation.x = Math.PI / 2;
  spire.add(ring);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const claw = pivot(`claw${i}`, Math.cos(a) * 0.157, 2.56, Math.sin(a) * 0.157);
    claw.rotation.y = -a; // local +X = radial-out
    claw.add(part(boxGeo(0.04, 0.36, 0.04), dark, { x: 0.088, y: 0.15, rz: -0.4 })); // seg1: cap to ring
    claw.add(part(boxGeo(0.04, 0.14, 0.04), dark, { x: 0.154, y: 0.37, rz: 0.25 })); // seg2: over the ring
    claw.add(part(boxGeo(0.04, 0.06, 0.04), dark, { x: 0.154, y: 0.46, rz: 0.9 })); // hook tip (clears the crystal surface)
    spire.add(claw);
  }
  spire.add(part(octaGeo(0.24, 0), cyan, { y: 2.95, sy: 1.8, name: "spireCrystal" })); // larger elongated crystal, 1.8:1
  g.add(spire);
  return finalize(g, [0, 4.85, -0.3]); // closeAnchor follows the raised crystal (spire pivot 1.9 + crystal 2.95)
}

/**
 * Projectiles & VFX (sheet 13) — iter 5.
 * Cyan rocket: wider body (2.57:1), shorter faceted ogive nose (35%),
 * 2 wide swept TRIANGULAR side fins (0.57x body width, flush, swept
 * back) + protruding central front fin, stepped #0B4F7A nozzle ring,
 * single tapered faceted flame (0.70x body length, 0.57x width) with
 * a white inner core + glow halo disc, side spark diamonds DELETED.
 * Grey rocket: wider body (2.4:1), blunt faceted dome nose (31%),
 * wide triangular fins + central fin, ONE continuous tapering
 * faceted flame (3 frustums, #FFB347 base -> #FF7A00 -> #FF4400).
 * Fireball: irregular faceted core + 20 volumetric jagged spikes
 * (0.45x diameter, all directions) + orange flame tongue + 6 close
 * embers; yellow cone + floating yellow diamonds DELETED.
 * Starburst: 8 long solid faceted blades (4 cyan left, 4 orange-red
 * right), SOLID glowing cyan-white core, 15 varied debris chunks
 * clustered close (not a uniform ring). Back panels added to both
 * rockets for front/back differentiation. Close-up reframed on the
 * whole group (the sheet's left panel shows all 4 items).
 */
export function buildProjectiles(): THREE.Group {
  const g = new THREE.Group();
  const cyan = mat("#00b7e8", { roughness: 0.5 });
  const cyanLight = mat("#29c6f0", { roughness: 0.5 });
  const cyanGlow = glow(P.cyan, 1.6);
  const grey = mat(P.heroMid, { roughness: 0.7 });
  const dark = mat(P.heroDark, { roughness: 0.8 });
  const nozzle = mat(P.nozzleBlue, { roughness: 0.6 });
  const fire = glow(P.fireball, 1.7);
  const fireDeep = glow(P.fireDeep, 1.6);
  const ember = glow(P.ember, 1.5);
  const trail = glow(P.trailOrange, 1.5);
  const flameBase = glow("#ffb347", 1.5);
  const coreWhite = glow(P.burstWhite, 1.8);
  const debrisMat = mat(P.debris, { roughness: 0.9 });
  const bladeCyan = glow("#00bfe8", 1.6);

  // Cyan rocket (up, +Y): body 0.05..0.39, nose 0.39..0.63 (38%).
  // Body widened to 0.25 (2.5:1) — the old 0.22 body read squat and
  // straight-sided; nose/nozzle/fins resized to match.
  const r1 = pivot("rocketCyan", -1.5, 0, 0);
  r1.add(part(cylGeo(0.12, 0.125, 0.17, 8), cyan, { y: 0.135 }));
  r1.add(part(cylGeo(0.125, 0.12, 0.17, 8), cyanLight, { y: 0.305 }));
  // Single smooth ogive nose (hemisphere, faceted) instead of the
  // stepped frustum stack that read as a stepped cone
  r1.add(part(sphGeo(0.125, 8, 4), cyan, { y: 0.39, sy: 1.9 }));
  r1.add(part(cylGeo(0.125, 0.125, 0.05, 8), nozzle, { y: 0.025 })); // stepped nozzle ring
  r1.add(part(cylGeo(0.09, 0.09, 0.03, 8), dark, { y: 0.02 }));
  const finGeo = triFinGeo(0.12, 0.22, 0.06, 0.02);
  const finL = new THREE.Mesh(finGeo, cyan);
  finL.position.set(0.115, 0.2, 0);
  r1.add(finL);
  const finR = new THREE.Mesh(finGeo, cyan);
  finR.position.set(-0.115, 0.2, 0);
  finR.rotation.y = Math.PI;
  r1.add(finR);
  const finC = new THREE.Mesh(finGeo, cyan);
  finC.position.set(0, 0.2, -0.115);
  finC.rotation.y = Math.PI / 2;
  r1.add(finC);
  // Tapered faceted flame: wide flat top AT the nozzle (the old pointed
  // octahedron narrowed to a point where it met the nozzle and read as
  // a detached diamond with a gap). The old white inner core was fully
  // inside the opaque flame and never visible, so it is deleted.
  r1.add(part(frustumGeo(1.0, 0.35, 0.32), cyanGlow, { y: -0.16, sx: 0.09, sz: 0.09 }));
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    r1.add(part(octaGeo(0.015, 0), cyanGlow, { x: Math.cos(a) * 0.13, y: -0.05, z: Math.sin(a) * 0.13 })); // sparkle dots around the nozzle
  }
  // Back panel DELETED (iter 7): both iter-10 reviewers agree it is
  // absent from the sheet's back view.
  g.add(r1);

  // Fireball: irregular faceted core + 20 volumetric spikes + tongue + close embers
  const fb = pivot("fireball", -0.5, 0.35, 0);
  fb.add(part(icoGeo(0.2, 1), fire, { sx: 1.1, sy: 1.0, sz: 0.95 }));
  fb.add(part(icoGeo(0.11, 0), glow("#ffdd55", 1.7), { sx: 1, sy: 1.1, sz: 1 }));
  for (let i = 0; i < 16; i++) {
    const yy = 1 - ((i + 0.5) * 2) / 16;
    const rr = Math.sqrt(1 - yy * yy);
    const th = i * 2.39996;
    const dx = rr * Math.cos(th);
    const dz = rr * Math.sin(th);
    // Varied spike lengths/radii (the old uniform 0.26 spikes read as
    // a neat ring of identical teeth)
    const s = part(coneGeo(0.05 + (i % 3) * 0.01, 0.2 + (i % 4) * 0.04, 4), i % 3 === 0 ? fireDeep : fire, { x: dx * 0.18, y: yy * 0.18, z: dz * 0.18 }); // larger shards
    s.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(dx, yy, dz));
    fb.add(s);
  }
  fb.add(part(coneGeo(0.07, 0.18, 4), ember, { y: -0.28, rx: Math.PI })); // orange flame tongue
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3;
    fb.add(part(octaGeo(0.025, 0), i % 2 ? trail : ember, { x: Math.cos(a) * 0.26, y: Math.sin(a) * 0.26, z: 0.05 }));
  }
  g.add(fb);

  // Starburst: 8 long solid faceted blades, solid core, close debris
  const burst = pivot("burst", 0.5, 0.35, 0);
  // 12 thick faceted blades: 6 cyan on the left, 6 orange-red on the right
  const bladeAngles = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];
  for (const deg of bladeAngles) {
    const a = (deg * Math.PI) / 180;
    const m = deg >= 90 && deg <= 270 ? bladeCyan : trail; // cyan left half, orange-red right half
    burst.add(part(frustumGeo(0.25, 1.0, 0.45), m, { x: Math.cos(a) * 0.15, y: Math.sin(a) * 0.15, sx: 0.07, sz: 0.015, rz: a - Math.PI / 2 }));
  }
  burst.add(part(icoGeo(0.05, 0), coreWhite, {})); // smaller white core, ringed by chunks (the old 0.09 white disc read as a hole)
  for (let i = 0; i < 6; i++) { // 6 chunk octahedra around the core (glow + debris mix)
    const a = (i / 6) * Math.PI * 2;
    const r = 0.03 + (i % 2) * 0.01;
    burst.add(part(octaGeo(r, 0), i % 2 ? debrisMat : coreWhite, { x: Math.cos(a) * 0.1, y: Math.sin(a) * 0.1 }));
  }
  for (let i = 0; i < 6; i++) { // 6 debris (trimmed from 12 to pay for the 12 blades under the 400-tri cap)
    const a = i * 2.39996;
    const rad = 0.25 + (i % 4) * 0.05;
    const r = 0.03 + (i % 3) * 0.015;
    burst.add(part(icoGeo(r, 0), debrisMat, { x: Math.cos(a) * rad, y: Math.sin(a) * rad + (i % 3 - 1) * 0.08, z: (i % 2 ? 0.06 : -0.06) }));
  }
  g.add(burst);

  // Grey rocket (up, +Y): blunt dome nose, wide fins, continuous flame.
  // Body widened to 0.25 like the cyan rocket.
  const r2 = pivot("rocketGrey", 1.5, 0, 0);
  r2.add(part(cylGeo(0.12, 0.125, 0.17, 8), grey, { y: 0.135 }));
  r2.add(part(cylGeo(0.125, 0.12, 0.17, 8), grey, { y: 0.305 }));
  r2.add(part(sphGeo(0.125, 8, 4), grey, { y: 0.39, sy: 1.7 })); // pointed ogive nose (hemisphere, faceted)
  r2.add(part(cylGeo(0.125, 0.125, 0.04, 8), dark, { y: 0.025 })); // nozzle ring
  const gfinL = new THREE.Mesh(finGeo, grey);
  gfinL.position.set(0.115, 0.2, 0);
  r2.add(gfinL);
  const gfinR = new THREE.Mesh(finGeo, grey);
  gfinR.position.set(-0.115, 0.2, 0);
  gfinR.rotation.y = Math.PI;
  r2.add(gfinR);
  const gfinC = new THREE.Mesh(finGeo, grey);
  gfinC.position.set(0, 0.2, -0.115);
  gfinC.rotation.y = Math.PI / 2;
  r2.add(gfinC);
  // Chunk exhaust: 8 decreasing faceted polyhedra with a glowing core,
  // instead of 3 flat stacked blocks. Alternating x offsets + rotations
  // so the stack reads as irregular chunks, not a beaded chain.
  for (let i = 0; i < 8; i++) {
    const r = 0.06 - i * 0.005;
    const m = i < 2 ? flameBase : i < 5 ? ember : trail;
    r2.add(part(octaGeo(r, 0), m, { x: i % 2 ? 0.02 : -0.02, y: -0.06 - i * 0.06, sx: 1, sy: 1.4, sz: 1, ry: i * 0.7 }));
  }
  // Back panel DELETED (iter 7): same reason as the cyan rocket.
  g.add(r2);
  return finalize(g, [0, 0.45, 0]);
}
