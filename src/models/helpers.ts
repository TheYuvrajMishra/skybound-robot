import * as THREE from "three";

const matCache = new Map<string, THREE.MeshStandardMaterial>();
const geoCache = new Map<string, THREE.BufferGeometry>();

export function mat(
  color: string,
  opts: { emissive?: string; emissiveIntensity?: number; roughness?: number; transparent?: boolean; opacity?: number } = {},
): THREE.MeshStandardMaterial {
  const key = JSON.stringify([color, opts]);
  let m = matCache.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({
      color,
      flatShading: true,
      roughness: opts.roughness ?? 0.75,
      metalness: 0.05,
      emissive: opts.emissive ?? "#000000",
      emissiveIntensity: opts.emissiveIntensity ?? 1,
      transparent: opts.transparent ?? false,
      opacity: opts.opacity ?? 1,
    });
    matCache.set(key, m);
  }
  return m;
}

export function glow(color: string, intensity = 2.2) {
  return mat(color, { emissive: color, emissiveIntensity: intensity, roughness: 0.4 });
}

function cached<T extends THREE.BufferGeometry>(key: string, make: () => T): T {
  let g = geoCache.get(key) as T | undefined;
  if (!g) {
    g = make();
    geoCache.set(key, g);
  }
  return g;
}

export const boxGeo = (w: number, h: number, d: number) => cached(`box:${w},${h},${d}`, () => new THREE.BoxGeometry(w, h, d));
export const cylGeo = (rt: number, rb: number, h: number, s = 8) => cached(`cyl:${rt},${rb},${h},${s}`, () => new THREE.CylinderGeometry(rt, rb, h, s));
export const coneGeo = (r: number, h: number, s = 8) => cached(`cone:${r},${h},${s}`, () => new THREE.ConeGeometry(r, h, s));
export const icoGeo = (r: number, d = 0) => cached(`ico:${r},${d}`, () => new THREE.IcosahedronGeometry(r, d));
export const octaGeo = (r: number, d = 0) => cached(`octa:${r},${d}`, () => new THREE.OctahedronGeometry(r, d));
export const sphGeo = (r: number, w = 8, h = 6) => cached(`sph:${r},${w},${h}`, () => new THREE.SphereGeometry(r, w, h));

/**
 * Tapered square-section frustum (chamfered box) along Y, radius 1.
 * Mesh scale sx = width/2, sz = depth/2 gives a box of that width/depth,
 * tapering from rb (bottom) to rt (top) in radius units.
 */
export const frustumGeo = (rt: number, rb: number, h: number) =>
  cached(`frustum:${rt},${rb},${h}`, () => {
    const geo = new THREE.CylinderGeometry(rt, rb, h, 4, 1);
    geo.rotateY(Math.PI / 4);
    return geo;
  });

export interface PartOpts {
  x?: number; y?: number; z?: number;
  rx?: number; ry?: number; rz?: number;
  sx?: number; sy?: number; sz?: number;
  name?: string;
}

export function part(geo: THREE.BufferGeometry, material: THREE.Material, o: PartOpts = {}): THREE.Mesh {
  const m = new THREE.Mesh(geo, material);
  m.position.set(o.x ?? 0, o.y ?? 0, o.z ?? 0);
  m.rotation.set(o.rx ?? 0, o.ry ?? 0, o.rz ?? 0);
  m.scale.set(o.sx ?? 1, o.sy ?? 1, o.sz ?? 1);
  if (o.name) m.name = o.name;
  return m;
}

export function pivot(name: string, x = 0, y = 0, z = 0): THREE.Group {
  const g = new THREE.Group();
  g.name = name;
  g.position.set(x, y, z);
  return g;
}

/** Attach a named empty Object3D (e.g. closeAnchor, faceAnchor, gripSocket, handSocket). */
export function anchor(group: THREE.Group, name: string, x: number, y: number, z: number): THREE.Object3D {
  const a = new THREE.Object3D();
  a.name = name;
  a.position.set(x, y, z);
  group.add(a);
  return a;
}

export function countTriangles(root: THREE.Object3D): number {
  let total = 0;
  root.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      const g = o.geometry;
      const idx = g.getIndex();
      total += idx ? idx.count / 3 : g.getAttribute("position").count / 3;
    }
  });
  return Math.round(total);
}

export function disposeGroup(root: THREE.Object3D) {
  // Geometries/materials are module-level cached and shared; do not dispose
  // them here (that would break other models). Only detach children.
  root.clear();
}

export function finalize(group: THREE.Group, close: [number, number, number]): THREE.Group {
  anchor(group, "closeAnchor", close[0], close[1], close[2]);
  group.userData.triangles = countTriangles(group);
  return group;
}
