"use client";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { getEntry } from "@/models/registry";
import { countTriangles } from "@/models/helpers";

export type ViewKind = "front" | "back" | "close" | "iso" | "tiled" | "sheet";

function CameraRig({ view, groupRef, modelId }: { view: ViewKind; groupRef: React.RefObject<THREE.Group | null>; modelId: string }) {
  const { camera, size } = useThree();
  const frames = useRef(0);
  useFrame(() => {
    const g = groupRef.current;
    if (!g) return;
    const box = new THREE.Box3().setFromObject(g);
    const center = box.getCenter(new THREE.Vector3());
    const sz = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(sz.x, sz.y, sz.z, 0.5);
    const dist = maxDim * 2.0;
    let pos: THREE.Vector3;
    // Road is 10 units long: end-on ortho framing collapses it to a strip.
    // Use an elevated runway view instead (front = looking down the road).
    // Ortho fit must satisfy BOTH axes: fitH is the full box height, and
    // the full box width is fitH * aspect. The old rule (fitH = maxDim)
    // cropped wide models in the portrait sheet front/back panels
    // (aspect 0.44): e.g. the gate pylons and the outer projectiles.
    // Per-axis fit: fitH = max(vertExtent, horizExtent / aspect) * margin.
    const aspect = size.width / size.height;
    if (modelId === "road" && (view === "front" || view === "back")) {
      const s = view === "front" ? -1 : 1;
      pos = new THREE.Vector3(center.x, center.y + 3.2, center.z + s * 5.5);
      camera.position.copy(pos);
      camera.lookAt(new THREE.Vector3(center.x, center.y, center.z - s * 1.5));
      if (camera instanceof THREE.OrthographicCamera) {
        // Projected vertical extent of the 10-unit road at ~24.5 deg
        // elevation is ~5.24; the width term keeps the side pipes inside
        // the portrait sheet panels.
        const fit = Math.max(5.24, sz.x / aspect) * 1.05;
        camera.left = (-fit * aspect) / 2;
        camera.right = (fit * aspect) / 2;
        camera.top = fit / 2;
        camera.bottom = -fit / 2;
        camera.near = 0.01;
        camera.far = 100;
        camera.updateProjectionMatrix();
      }
      frames.current += 1;
      if (frames.current >= 2) (window as unknown as { __MODEL_READY__?: boolean }).__MODEL_READY__ = true;
      return;
    }
    if (view === "front") pos = new THREE.Vector3(center.x, center.y, center.z - dist);
    else if (view === "back") pos = new THREE.Vector3(center.x, center.y, center.z + dist);
    else if (view === "iso") pos = new THREE.Vector3(center.x + dist * 0.7, center.y + dist * 0.55, center.z - dist * 0.7);
    else if (view === "tiled") pos = new THREE.Vector3(center.x, center.y + dist * 0.55, center.z - dist * 1.1);
    else {
      // close: perspective, framed on closeAnchor. The distance must also
      // fit the model width (wide groups like projectiles were cropped
      // in the sheet close panel): dist >= (halfWidth) / (tan(fov/2)*aspect).
      const anchor = g.getObjectByName("closeAnchor");
      const target = anchor ? anchor.getWorldPosition(new THREE.Vector3()) : center;
      const tanHalf = Math.tan((40 * Math.PI) / 360);
      const widthDist = (sz.x / 2 / (tanHalf * aspect)) * 1.1;
      const d = Math.max(Math.min(maxDim, 2.5) * 0.85, widthDist);
      // closeDir (set in a builder's userData) lets a model request a
      // non-default close camera direction, e.g. the minigun muzzle
      // face, which points +Y and is edge-on from the default -Z camera.
      let closeDir: THREE.Vector3 | null = null;
      g.traverse((o) => {
        const cd = (o.userData as Record<string, unknown>).closeDir as number[] | undefined;
        if (cd) closeDir = new THREE.Vector3(cd[0], cd[1], cd[2]).normalize();
      });
      pos = closeDir
        ? new THREE.Vector3(target.x, target.y, target.z).addScaledVector(closeDir, d)
        : new THREE.Vector3(target.x, target.y + 0.05, target.z - d);
      camera.position.copy(pos);
      camera.lookAt(target);
      if (camera instanceof THREE.OrthographicCamera) {
        // close view needs perspective; handled by caller using perspective camera
      }
      frames.current += 1;
      if (frames.current >= 2) (window as unknown as { __MODEL_READY__?: boolean }).__MODEL_READY__ = true;
      return;
    }
    camera.position.copy(pos);
    camera.lookAt(center);
    if (camera instanceof THREE.OrthographicCamera) {
      let fit: number;
      if (view === "front" || view === "back") {
        fit = Math.max(sz.y, sz.x / aspect) * 1.1;
      } else {
        // iso / tiled: diagonal projection mixes X and Z extents.
        const horiz = (sz.x + sz.z) * 0.7;
        const vert = sz.y + (sz.x + sz.z) * 0.28;
        fit = Math.max(vert, horiz / aspect) * 1.1;
      }
      camera.left = (-fit * aspect) / 2;
      camera.right = (fit * aspect) / 2;
      camera.top = fit / 2;
      camera.bottom = -fit / 2;
      camera.near = 0.01;
      camera.far = dist * 10;
      camera.updateProjectionMatrix();
    }
    frames.current += 1;
    if (frames.current >= 2) (window as unknown as { __MODEL_READY__?: boolean }).__MODEL_READY__ = true;
  });
  return null;
}

export function ModelCanvas({ id, view, holding }: { id: string; view: ViewKind; holding?: string }) {
  const entry = getEntry(id);
  const groupRef = useRef<THREE.Group | null>(null);
  const group = useMemo(() => {
    if (!entry) return null;
    const root = new THREE.Group();
    const buildOne = (offsetZ: number) => {
      const m = entry.builder();
      m.position.z = offsetZ;
      return m;
    };
    if (view === "tiled") {
      // Road: exact 10-unit tiles end to end; others: tile by bounding depth.
      const probe = entry.builder();
      const depth = new THREE.Box3().setFromObject(probe).getSize(new THREE.Vector3()).z || 1;
      const step = id === "road" ? 10 : depth;
      root.add(buildOne(-step), buildOne(0), buildOne(step));
    } else {
      const m = entry.builder();
      if (holding && id === "robot") {
        const weapon = getEntry(holding);
        if (weapon) {
          const w = weapon.builder();
          // Pistol barrel is +X -> rotate to face -Z. Vertical weapons
          // (minigun/rocket/rifle, muzzle +Y, warhead -Y for rocket) tilt
          // forward so the muzzle points -Z.
          if (holding === "pistol") w.rotation.y = Math.PI / 2;
          else w.rotation.x = -Math.PI / 2;
          const socket = m.getObjectByName("handSocket");
          if (socket) socket.add(w);
          else m.add(w);
        }
      }
      root.add(m);
    }
    root.userData.triangles = countTriangles(root);
    return root;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, view, holding]);

  if (!entry || !group) return <div>Unknown model: {id}</div>;
  const isClose = view === "close";
  return (
    <Canvas
      flat
      orthographic={!isClose}
      camera={isClose ? { position: [0, 0.5, -2], fov: 40, near: 0.01, far: 100 } : { position: [0, 0.5, -3], near: 0.01, far: 100 }}
      gl={{ antialias: true, preserveDrawingBuffer: true }}
      style={{ background: "#d9d9d9", width: "100%", height: "100%" }}
    >
      <color attach="background" args={["#d9d9d9"]} />
      <hemisphereLight args={["#ffffff", "#8899aa", 1.1]} />
      <directionalLight position={[4, 6, -4]} intensity={2.0} />
      <directionalLight position={[-4, 3, 4]} intensity={0.9} />
      <primitive object={group} ref={groupRef} />
      <CameraRig view={view} groupRef={groupRef} modelId={id} />
    </Canvas>
  );
}
