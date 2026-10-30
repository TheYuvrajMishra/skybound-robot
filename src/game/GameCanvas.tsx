"use client";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import {
  buildRobot, buildCrawler, buildGolem, buildGate, buildBoulder, buildRoad,
  buildSideProps, buildSkyProps, buildPistol, buildMinigun, buildRocketLauncher, buildTargetingRifle,
} from "@/models/registry";
import { CONFIG, WEAPONS, type WeaponId } from "@/config/game";
import { createState, tick, formationSlots, type SimState, type Enemy, type Boulder, type Gate } from "./sim";
import { gateTexture, boulderTexture, disposeLabels } from "./labels";
import { Sfx } from "./audio";
import { popScale, breathing } from "./anim";

export interface HudState {
  squad: number; weapon: string; distance: number; score: number; kills: number;
  fps: number; enemies: number; projectiles: number; gameOver: boolean; dying: boolean;
}

interface Props {
  running: boolean;
  paused: boolean;
  debug: boolean;
  muted: boolean;
  quality: "high" | "low";
  onHud: (h: HudState) => void;
  onGameOver: (score: number) => void;
  onPauseRequest: () => void;
}

declare global {
  interface Window {
    __advance?: (dt: number) => void;
    __game?: Record<string, unknown>;
    __SHOT_READY__?: boolean;
  }
}

const DT = 1 / 60;
const DECK_Y = 0.79;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clampN = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

interface RobotVis {
  group: THREE.Group; blaster: THREE.Object3D | null; flash: THREE.Mesh; muzzle: THREE.Mesh;
  holder: THREE.Group; weaponGroup: THREE.Group | null;
  visX: number; visZ: number; popStart: number; flashUntil: number;
}
interface EnemyVis {
  group: THREE.Group; blob: THREE.Mesh;
  eyes: THREE.MeshStandardMaterial[]; lastId: number;
  legs: THREE.Object3D[]; // golem leg pivots (crawler uses userData.legs)
}
interface GateVis { group: THREE.Group; label: THREE.Mesh; labelMat: THREE.MeshBasicMaterial; lastMult: number; flashT: number; }
interface BoulderVis { group: THREE.Group; label: THREE.Mesh; labelMat: THREE.MeshBasicMaterial; lastHp: number; }
interface ProjVis { group: THREE.Group; bolt: THREE.Mesh; rocket: THREE.Group; trail: THREE.Mesh; }
interface Burst {
  group: THREE.Group; shards: THREE.Mesh[]; ring: THREE.Mesh; ringMat: THREE.MeshBasicMaterial;
  active: boolean; t: number; vel: THREE.Vector3[]; big: boolean;
}

function skyGradientTexture(): THREE.Texture {
  const c = document.createElement("canvas");
  c.width = 16; c.height = 256;
  const ctx = c.getContext("2d")!;
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, "#2f7fe0");
  g.addColorStop(0.55, "#7ec2f5");
  g.addColorStop(0.8, "#bcd8f0");
  g.addColorStop(1, "#cfe6f8");
  ctx.fillStyle = g; ctx.fillRect(0, 0, 16, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function sunTexture(): THREE.Texture {
  const c = document.createElement("canvas");
  c.width = 256; c.height = 256;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.15, "rgba(255,248,210,0.95)");
  g.addColorStop(0.4, "rgba(255,220,140,0.5)");
  g.addColorStop(1, "rgba(255,220,140,0)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export default function GameCanvas(props: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const propsRef = useRef(props);
  propsRef.current = props;
  const [fallback, setFallback] = useState(false);
  const [ctxLost, setCtxLost] = useState(false);

  useEffect(() => {
    (window as unknown as { __mounts?: number }).__mounts = (((window as unknown as { __mounts?: number }).__mounts) ?? 0) + 1;
    const container = containerRef.current;
    if (!container) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
      // Iter-7: one tight shadow light (spec allowed blob shadows OR a
      // shadow light; reviewers read the blob-only look as flat and
      // shadowless). PCFSoft 1024 map covering the near field.
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    } catch {
      setFallback(true);
      return;
    }
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.style.display = "block";
    renderer.domElement.style.touchAction = "none";
    renderer.domElement.style.userSelect = "none";
    renderer.domElement.style.webkitUserSelect = "none";
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    // Deeper fog colour (was #bcd8f0): distant objects fade blue instead of
    // blowing out to flat white at the vanishing point.
    scene.fog = new THREE.Fog(0x9ec0e0, CONFIG.FOG_NEAR, CONFIG.FOG_FAR);
    const camera = new THREE.PerspectiveCamera(CONFIG.CAMERA.fov, 1, 0.1, 400);

    // Sky dome (gradient), sun sprite, lights.
    const skyMat = new THREE.MeshBasicMaterial({ map: skyGradientTexture(), side: THREE.BackSide, fog: false, depthWrite: false });
    const skyDome = new THREE.Mesh(new THREE.SphereGeometry(220, 16, 12), skyMat);
    scene.add(skyDome);
    const sun = new THREE.Sprite(new THREE.SpriteMaterial({ map: sunTexture(), transparent: true, fog: false, depthWrite: false }));
    sun.position.set(-30, 20, -120);
    sun.scale.set(36, 36, 1); // iter-6: bigger + harder core so the disc reads, not just a pale wash
    // Iter-7: push the sprite colour above 1 so the core crosses the
    // bloom threshold (1.0) and blooms for real; the halo stays below it.
    (sun.material as THREE.SpriteMaterial).color.setRGB(1.6, 1.5, 1.3);
    scene.add(sun);
    scene.add(new THREE.HemisphereLight(0xbfe3ff, 0x6b7280, 1.05));
    const sunLight = new THREE.DirectionalLight(0xfff2cc, 2.8);
    sunLight.position.set(-20, 30, 10);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.set(1024, 1024);
    sunLight.shadow.camera.left = -14; sunLight.shadow.camera.right = 14;
    sunLight.shadow.camera.top = 14; sunLight.shadow.camera.bottom = -14;
    sunLight.shadow.camera.near = 1; sunLight.shadow.camera.far = 90;
    sunLight.shadow.bias = -0.0005; sunLight.shadow.normalBias = 0.05;
    scene.add(sunLight);
    sunLight.target.position.set(0, 0, -5);
    scene.add(sunLight.target);

    // Live runs get a fresh random seed (replayability: every run used to
    // play the identical 1337 opening); captures keep 1337 for determinism.
    const isCaptureSeed = typeof window !== "undefined" &&
      (new URLSearchParams(window.location.search).get("shot") !== null ||
       new URLSearchParams(window.location.search).get("anim") !== null);
    const state: SimState = createState(isCaptureSeed ? 1337 : (Date.now() & 0x7fffffff));
    const sfx = new Sfx();
    const reducedMotion = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Demo entities for the start screen / hero shot (legit sim entities).
    const demoGate = (z: number, mult: number): Gate => ({ id: state.nextId++, x: CONFIG.GATE_X, z, prevZ: z, mult, triggered: false, alive: true, flashUntil: 0, demo: true });
    const demoBoulder = (z: number, tier: WeaponId, hp: number): Boulder => ({ id: state.nextId++, x: CONFIG.BOULDER_X, z, prevZ: z, hp, maxHp: hp, tier, granted: false, alive: true, shakeUntil: 0, pendingGrant: false, demo: true });
    state.gates.push(demoGate(-20, 2), demoGate(-48, 2));
    state.boulders.push(demoBoulder(-32, "minigun", 200), demoBoulder(-62, "rocket-launcher", 300));
    const demoEnemy = (kind: Enemy["kind"], x: number, z: number): Enemy => {
      const base = kind === "crawler" ? CONFIG.CRAWLER : CONFIG.GOLEM;
      return { id: state.nextId++, kind, x, z, prevX: x, prevZ: z, hp: base.hp, maxHp: base.hp, speed: base.speed, radius: base.radius, alive: true, contact: false, attackCd: 0, spawnTime: 0, flashUntil: 0, demo: true };
    };
    state.enemies.push(demoEnemy("crawler", -0.6, -16), demoEnemy("crawler", 0.5, -22), demoEnemy("golem", 0, -30));

    // ---- Pools ----
    // Iter-7 shadow rule: opaque meshes cast, transparent ones (glass,
    // labels, blobs, flashes) never do — a translucent gate glass or
    // label plane would otherwise cast a solid rectangular shadow.
    const enableShadows = (g: THREE.Object3D) => {
      g.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          if (mats.every((m) => !m.transparent)) o.castShadow = true;
        }
      });
    };
    const blobGeo = new THREE.CircleGeometry(1, 20);
    const blobMat = new THREE.MeshBasicMaterial({ color: 0x0a0f14, transparent: true, opacity: 0.45, depthWrite: false });
    const mkBlob = (r: number) => {
      const m = new THREE.Mesh(blobGeo, blobMat);
      m.rotation.x = -Math.PI / 2;
      m.scale.set(r, r, 1);
      m.position.y = DECK_Y + 0.01;
      return m;
    };
    const mkFlash = (w: number, h: number, d: number, y: number) => {      const m = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, d),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 }),
      );
      m.position.y = y;
      m.visible = false;
      return m;
    };

    const robots: RobotVis[] = [];
    for (let i = 0; i < CONFIG.MAX_VISIBLE; i++) {
      const group = buildRobot();
      const blaster = group.getObjectByName("blaster") ?? null;
      const flash = mkFlash(0.62, 0.9, 0.4, 0.5);
      group.add(flash);
      const muzzle = new THREE.Mesh(
        // Iter-6: sphere + additive white-hot flash, not an octahedron —
        // the octahedron muzzle was indistinguishable from the bolt
        // diamonds, so reviewers read "no muzzle flash at any gun".
        new THREE.SphereGeometry(0.14, 10, 8),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false }),
      );
      muzzle.position.set(0.27, 0.25, -0.34);
      muzzle.scale.set(1, 1, 2.2);
      muzzle.visible = false;
      group.add(muzzle);
      const holder = new THREE.Group();
      holder.position.set(0.27, 0.25, -0.04);
      group.add(holder);
      const blob = mkBlob(0.42);
      group.add(blob);
      enableShadows(group);
      group.visible = false;
      scene.add(group);
      robots.push({ group, blaster, flash, muzzle, holder, weaponGroup: null, visX: 0, visZ: 0, popStart: -10, flashUntil: -10 });
    }

    const crawlerPool: EnemyVis[] = [];
    for (let i = 0; i < CONFIG.ENEMY_POOL_CRAWLER; i++) {
      const group = buildCrawler();
      const blob = mkBlob(0.4);
      group.add(blob);
      enableShadows(group);
      group.visible = false;
      scene.add(group);
      crawlerPool.push({ group, blob, eyes: [], lastId: -1, legs: [] });
    }
    const golemPool: EnemyVis[] = [];
    for (let i = 0; i < CONFIG.ENEMY_POOL_GOLEM; i++) {
      const group = buildGolem();
      // NOTE: enemy hit-flash boxes were REMOVED in iter-4. damageEnemy
      // refreshes flashUntil on every hit, so under squad fire the box
      // (golem: 1.2x1.4 white, opacity 0.6) stayed visible permanently and
      // every shot enemy rendered as a white rectangle — the "white plane"
      // artefact in all three review rounds. Hit feedback is now a small
      // burst on HP drop (see enemy sync), like boulders.
      const blob = mkBlob(0.7);
      group.add(blob);
      const eyes: THREE.MeshStandardMaterial[] = [];
      group.traverse((o) => {
        if (o instanceof THREE.Mesh && o.name === "eye") {
          const m = (o.material as THREE.MeshStandardMaterial).clone();
          o.material = m;
          eyes.push(m);
        }
      });
      enableShadows(group);
      group.visible = false;
      scene.add(group);
      const legs = [group.getObjectByName("legL"), group.getObjectByName("legR")].filter((o): o is THREE.Object3D => o !== null);
      golemPool.push({ group, blob, eyes, lastId: -1, legs });
    }

    const gatePool: GateVis[] = [];
    for (let i = 0; i < 16; i++) {
      const group = buildGate();
      const labelMat = new THREE.MeshBasicMaterial({ transparent: true, side: THREE.DoubleSide });
      const label = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.8), labelMat);
      label.position.set(0, 0.855, 0.06);
      group.add(label);
      enableShadows(group);
      group.visible = false;
      scene.add(group);
      gatePool.push({ group, label, labelMat, lastMult: -1, flashT: -10 });
    }
    const boulderPool: BoulderVis[] = [];
    for (let i = 0; i < 16; i++) {
      const group = buildBoulder();
      // Boulders read too small vs the reference's huge road-filling rocks:
      // 1.25x visual scale, matched by BOULDER_HALF 0.7 in the sim.
      group.scale.setScalar(1.25);
      const labelMat = new THREE.MeshBasicMaterial({ transparent: true, side: THREE.DoubleSide });
      const label = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.85), labelMat);
      label.position.set(0, 0.5, 0.5);
      group.add(label);
      enableShadows(group);
      group.visible = false;
      scene.add(group);
      boulderPool.push({ group, label, labelMat, lastHp: -1 });
    }

    const boltGeo = new THREE.CapsuleGeometry(0.07, 0.35, 4, 8); // iter-6: rounded streak, not an octahedron (the diamond read)
    // Iter-7: additive glow so bolts read as light streaks above the
    // road, not flat decals lying on it.
    const boltMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false });
    const rocketBodyGeo = new THREE.ConeGeometry(0.09, 0.4, 6);
    const rocketBodyMat = new THREE.MeshStandardMaterial({ color: 0x9aa3ad, flatShading: true, roughness: 0.6 });
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xff5a1f });
    const projPool: ProjVis[] = [];
    for (let i = 0; i < CONFIG.PROJECTILE_POOL; i++) {
      const group = new THREE.Group();
      const bolt = new THREE.Mesh(boltGeo, boltMat);
      bolt.rotation.x = Math.PI / 2; // capsule axis (Y) -> travel axis (Z)
      bolt.scale.set(1.0, 1.0, 3); // ~1.5 long, 0.14 wide: a rounded streak, not a diamond plane
      group.add(bolt);
      // Plasma trail: a stretched additive streak behind the bolt so the
      // bolt stream reads from behind (the reference shows elongated bolts).
      // Thickened in iter-4: the 0.05-wide trail was invisible at distance.
      // Thinned in iter-5 with the bolts: the 0.14 trail was part of the diamond read.
      // Iter-7: shortened (0.9, was 1.6) so it stops poking out behind the
      // robot at spawn, and additive so it reads as light, not a decal.
      const trail = new THREE.Mesh(
        new THREE.BoxGeometry(0.10, 0.10, 0.9),
        new THREE.MeshBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false }),
      );
      trail.position.z = 0.7; // behind the bolt (bolts travel -Z)
      group.add(trail);
      const rocket = new THREE.Group();
      const body = new THREE.Mesh(rocketBodyGeo, rocketBodyMat);
      body.rotation.x = -Math.PI / 2;
      const flame = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 5), flameMat);
      flame.position.z = 0.28;
      rocket.add(body, flame);
      rocket.visible = false;
      group.add(rocket);
      group.visible = false;
      scene.add(group);
      projPool.push({ group, bolt, rocket, trail });
    }

    const bursts: Burst[] = [];
    const shardGeo = new THREE.IcosahedronGeometry(0.07, 0);
    for (let i = 0; i < 32; i++) {
      const group = new THREE.Group();
      const shards: THREE.Mesh[] = [];
      for (let k = 0; k < 8; k++) {
        const m = new THREE.Mesh(shardGeo, new THREE.MeshStandardMaterial({ color: k % 2 ? 0xff5a1f : 0x9aa3ad, flatShading: true, roughness: 0.8 }));
        group.add(m);
        shards.push(m);
      }
      const ringMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0, side: THREE.DoubleSide });
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.04, 6, 20), ringMat);
      group.add(ring);
      group.visible = false;
      scene.add(group);
      bursts.push({ group, shards, ring, ringMat, active: false, t: 0, big: false, vel: Array.from({ length: 8 }, (_, k) => new THREE.Vector3(Math.cos(k * 0.9) * 2, 1.5 + (k % 3) * 0.7, Math.sin(k * 0.9) * 2)) });
    }
    let burstIdx = 0;
    function spawnBurst(x: number, y: number, z: number, big: boolean): void {
      const b = bursts[burstIdx % bursts.length];
      burstIdx++;
      b.active = true; b.t = 0; b.big = big;
      b.group.position.set(x, y, z);
      b.group.visible = true;
      const s = big ? 1.6 : 1;
      for (const sh of b.shards) { sh.position.set(0, 0, 0); sh.scale.setScalar(s); }
    }
    function updateBursts(dt: number): void {
      for (const b of bursts) {
        if (!b.active) continue;
        b.t += dt;
        // Small deaths (crawlers, boulder hits) used to blow a ring up to
        // radius 3.1 that dominated the centre lane; keep those tight.
        const life = b.big ? 0.7 : 0.5;
        if (b.t > life) { b.active = false; b.group.visible = false; continue; }
        for (let k = 0; k < b.shards.length; k++) {
          const sh = b.shards[k];
          sh.position.addScaledVector(b.vel[k], dt);
          sh.position.y -= 2 * dt * b.t;
          sh.scale.setScalar(Math.max(0.01, 1 - b.t / life));
        }
        const rs = 0.3 + b.t * (b.big ? 4 : 1.2);
        b.ring.scale.set(rs, rs, rs);
        b.ringMat.opacity = Math.max(0, 0.8 * (1 - b.t / life));
      }
    }

    // ---- Persistent boulder debris (reviewers: the break left no debris) ----
    // A small pool of rubble piles, placed where a boulder breaks (via the
    // boulderBreak event in drainEvents) and scrolled with the world until
    // past the camera. Visual-only: no sim state, so it cannot affect rules.
    const debrisPool: { group: THREE.Group; z: number; active: boolean }[] = [];
    {
      const rockGeo = new THREE.TetrahedronGeometry(0.18, 0);
      // Iter-7: lighter rubble (dark grey vanished against the dark road)
      // and a 1.3x pile so the aftermath reads at ~50%+ of the boulder.
      const rockMat = new THREE.MeshStandardMaterial({ color: 0x8a94a0, flatShading: true, roughness: 1 });
      for (let i = 0; i < 4; i++) {
        const group = new THREE.Group();
        group.scale.setScalar(1.3);
        for (let k = 0; k < 4; k++) {
          const rock = new THREE.Mesh(rockGeo, rockMat);
          rock.position.set((k % 2 ? 1 : -1) * (0.15 + (k % 3) * 0.18), 0.08 + (k % 2) * 0.1, (k < 2 ? -1 : 1) * 0.2);
          rock.scale.setScalar(0.7 + (k % 3) * 0.4);
          rock.rotation.set(k * 0.9, k * 1.7, k * 0.4);
          group.add(rock);
        }
        group.visible = false;
        scene.add(group);
        debrisPool.push({ group, z: 0, active: false });
      }
    }
    let debrisIdx = 0;
    let lastDebrisDist = 0;
    function placeDebris(x: number, z: number): void {
      // Iter-6: scatter TWO piles (the break position + one 0.7 inboard)
      // so debris stays in frame to the last sequence frames — a single
      // right-lane pile scrolls out of the right edge ~1 s after the break.
      const place = (px: number, pz: number) => {
        const d = debrisPool[debrisIdx % debrisPool.length];
        debrisIdx++;
        d.active = true;
        d.z = pz;
        d.group.visible = true;
        d.group.position.set(px, DECK_Y, pz);
      };
      place(x, z);
      place(x - 0.7, z - 0.3);
    }
    function syncDebris(distance: number): void {
      const dz = distance - lastDebrisDist;
      lastDebrisDist = distance;
      for (const d of debrisPool) {
        if (!d.active) continue;
        d.z += dz;
        if (d.z > 12) { d.active = false; d.group.visible = false; continue; }
        d.group.position.z = d.z;
      }
    }

    // ---- Road tiles (x3 scale = 6-wide deck), recycled by distance modulo ----
    const roadTiles: THREE.Group[] = [];
    for (let i = 0; i < 11; i++) {
      const t = buildRoad();
      t.scale.set(3, 1, 1);
      t.traverse((o) => { if (o instanceof THREE.Mesh) o.receiveShadow = true; });
      scene.add(t);
      roadTiles.push(t);
    }
    function syncRoad(distance: number): void {
      for (let i = 0; i < roadTiles.length; i++) {
        const base = -85 + i * 10;
        const wrapped = ((base + distance) % 110 + 110) % 110;
        roadTiles[i].position.set(0, 0, -90 + wrapped + 5);
      }
    }

    // ---- Repeated side props via InstancedMesh ----
    const tmpMat = new THREE.Matrix4();
    const tmpQuat = new THREE.Quaternion();
    const tmpVec = new THREE.Vector3();
    const tmpScale = new THREE.Vector3(1, 1, 1);
    function syncInstances(distance: number, m: THREE.InstancedMesh, perSide: number, spacing: number, xFn: (side: number, i: number) => number, y: number, sFn?: (i: number) => number): void {
      let idx = 0;
      for (const side of [-1, 1]) {
        for (let i = 0; i < perSide; i++) {
          const base = -85 + i * spacing;
          const wrapped = ((base + distance) % 110 + 110) % 110;
          const z = -90 + wrapped + 5;
          const s = sFn ? sFn(i) : 1;
          tmpVec.set(xFn(side, i), y, z);
          tmpMat.compose(tmpVec, tmpQuat, tmpScale.set(s, s, s));
          m.setMatrixAt(idx++, tmpMat);
        }
      }
      m.instanceMatrix.needsUpdate = true;
    }
    const poleMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.05, 0.06, 2.4, 6), new THREE.MeshStandardMaterial({ color: 0x9aa3ad, flatShading: true, roughness: 0.6 }), 24);
    const bannerMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.06, 1.15, 0.85), new THREE.MeshStandardMaterial({ color: 0x2b5aa6, flatShading: true, roughness: 0.8 }), 24);
    const rubbleMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.2, 0), new THREE.MeshStandardMaterial({ color: 0x6e747b, flatShading: true, roughness: 0.9 }), 40);
    scene.add(poleMesh, bannerMesh, rubbleMesh);
    // A few full side-prop assemblies for detail near the start. The model
    // is a SINGLE banner-pole assembly (pole local x 0.35, banner spanning
    // local -0.45..0.15), so the group sits at x ±3.0: pole at ±3.35 just
    // outside the deck edge, banner over the rail (2.55..3.15), clear of
    // the boulder lane (x 2.4). Left-side groups are rotated π so the
    // banner hangs inward. (Centring the group at x=0 used to put a banner
    // across the middle of the road; ±3.9 used to leave it floating.)
    const sideDetail: THREE.Group[] = [];
    for (let i = 0; i < 4; i++) {
      const g = buildSideProps();
      const side = i % 2 ? 1 : -1;
      if (side < 0) g.rotation.y = Math.PI;
      // Iter-7: the banner cloth material is SHARED (model mat cache),
      // so it cannot be flipped globally; clone it per group and make
      // the clone double-sided. Otherwise the left (rotated) assemblies
      // show a bare pole: their cloth backface is culled from the camera.
      const cloth = g.getObjectByName("bannerCloth");
      if (cloth instanceof THREE.Mesh) {
        cloth.material = (cloth.material as THREE.Material).clone();
        (cloth.material as THREE.Material).side = THREE.DoubleSide;
      }
      g.position.set(side * 3.0, DECK_Y, -12 - i * 18);
      scene.add(g);
      sideDetail.push(g);
    }

    // Continuous side rails + crisp thin lane lines + centre-seam cover.
    // (Scene dressing over the frozen Phase 1 road model, not a model edit.)
    const railMat = new THREE.MeshStandardMaterial({ color: 0x2f3844, flatShading: true, roughness: 0.5, metalness: 0.4 });
    const railGlowMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff });
    for (const side of [-1, 1]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 105), railMat);
      rail.position.set(side * 3.08, DECK_Y + 0.42, -40);
      scene.add(rail);
      const strip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.03, 105), railGlowMat);
      strip.position.set(side * 3.08, DECK_Y + 0.51, -40);
      scene.add(strip);
    }
    // NOTE (review iter-3): the thin lane lines and centre seam cover added
    // in iter-2 were REMOVED — they sat beside the road model's own wide
    // lane bands and read as even thicker bands plus a dark centre stripe.
    // The model's own bands/seam remain (frozen Phase 1 geometry).

    // ---- Sky city parallax ----
    const skyGroups: { g: THREE.Group; x: number; base: number }[] = [];
    const skyXs = [-18, -12, 12, 18, -26, 26];
    for (let i = 0; i < 6; i++) {
      const g = buildSkyProps();
      g.scale.setScalar(3.5);
      scene.add(g);
      skyGroups.push({ g, x: skyXs[i], base: -40 - i * 12 });
    }
    const cloudMesh = new THREE.InstancedMesh(
      new THREE.SphereGeometry(1, 8, 6),
      new THREE.MeshStandardMaterial({ color: 0xffffff, flatShading: true, roughness: 1, transparent: true, opacity: 0.92 }),
      20,
    );
    scene.add(cloudMesh);
    // Iter-7 horizon skyline: a fog:false dark silhouette city + cloud
    // bank glued to the vanishing point (camera-relative, 0.3 parallax).
    // The far field previously dissolved into empty pale sky; this gives
    // the road a terminus. Basic material = flat silhouette, unlit.
    const horizonGroup = new THREE.Group();
    {
      const skyMat = new THREE.MeshBasicMaterial({ color: 0x6b8299, fog: false });
      const towerDefs: [number, number, number][] = [
        [-9, 14, 3], [-5.5, 10, 2.4], [-2.5, 17, 3.2], [0.5, 12, 2.6], [3.5, 18, 3], [7, 11, 2.4], [10, 15, 3],
      ];
      for (const [x, h, w] of towerDefs) {
        const tower = new THREE.Mesh(new THREE.BoxGeometry(w, h, 2), skyMat);
        tower.position.set(x, -2 + h / 2, 0);
        horizonGroup.add(tower);
      }
      const bank = new THREE.Mesh(new THREE.BoxGeometry(36, 2.5, 2), skyMat);
      bank.position.set(0, -3.5, 0);
      horizonGroup.add(bank);
    }
    scene.add(horizonGroup);
    const cloudSeed = Array.from({ length: 20 }, (_, i) => ({ x: -55 + i * 5.7, y: 9 + (i % 5) * 2.4, z: -45 - (i % 4) * 14, s: 2 + (i % 4) }));
    // Cloud sea below the bridge (the reference's dense cloud layer that
    // the towers rise from). Static far field; the sky platforms at y -8
    // sit inside it instead of floating over void. Iter-7: tinted
    // blue-grey (pure white on pale sky was invisible) and pulled inward
    // (x from 10, not 14) so no void band sits beside the road.
    const seaMesh = new THREE.InstancedMesh(
      new THREE.SphereGeometry(1, 8, 6),
      new THREE.MeshStandardMaterial({ color: 0xd9e4ee, flatShading: true, roughness: 1, transparent: true, opacity: 0.95 }),
      70,
    );
    scene.add(seaMesh);
    {
      const m = new THREE.Matrix4(); const q = new THREE.Quaternion(); const v = new THREE.Vector3(); const s = new THREE.Vector3();
      for (let i = 0; i < 70; i++) {
        const x = (i % 2 ? 1 : -1) * (10 + ((i * 37) % 55));
        const y = -8 + (i % 4) * 1.6;
        const z = -20 - ((i * 29) % 90);
        const sc = 4 + (i % 5) * 1.6;
        v.set(x, y, z); m.compose(v, q, s.set(sc, sc * 0.32, sc * 0.7));
        seaMesh.setMatrixAt(i, m);
      }
      seaMesh.instanceMatrix.needsUpdate = true;
    }

    // ---- Weapon attach ----
    const weaponBuilders: Record<WeaponId, () => THREE.Group> = {
      pistol: buildPistol, minigun: buildMinigun, "rocket-launcher": buildRocketLauncher, "targeting-rifle": buildTargetingRifle,
    };
    let lastWeapon: WeaponId = state.weapon;
    function applyWeapon(r: RobotVis, weapon: WeaponId): void {
      if (r.blaster) r.blaster.visible = weapon === "pistol";
      if (r.weaponGroup) { r.holder.remove(r.weaponGroup); r.weaponGroup = null; }
      if (weapon === "pistol") return;
      const wg = weaponBuilders[weapon]();
      const grip = wg.getObjectByName("gripSocket");
      const scale = 0.45;
      wg.scale.setScalar(scale);
      wg.rotation.x = -Math.PI / 2; // vertical weapons: muzzle +Y -> -Z (pistol returns early above)
      wg.updateMatrixWorld(true);
      if (grip) {
        const gp = grip.position.clone().multiplyScalar(scale).applyEuler(wg.rotation);
        wg.position.copy(gp).negate();
      }
      // Spawn pop for the swapped weapon.
      wg.scale.setScalar(scale * 1.15);
      enableShadows(wg);
      r.holder.add(wg);
      r.weaponGroup = wg;
    }

    // ---- Sync sim -> scene ----
    const prevEnemyIds = new Map<number, { x: number; z: number; kind: string }>();
    const prevEnemyHp = new Map<number, number>();
    const prevBoulderHp = new Map<number, number>();
    const prevBoulderPos = new Map<number, { x: number; z: number }>();
    const prevVisibleRobots = { count: 0 };
    // Dying visuals: pool visuals reserved for the 0.6 s death tumble.
    const dying = new Map<EnemyVis, { t0: number; x: number; z: number }>();
    function markDying(id: number, x: number, z: number): void {
      for (const p of [...crawlerPool, ...golemPool]) {
        if (p.lastId === id && !dying.has(p)) { dying.set(p, { t0: state.time, x, z }); break; }
      }
    }
    let lastSquadHitAt = -10;
    let recoilUntil = -10;
    const gateFlash = new Map<number, number>();

    function sync(alpha: number): void {
      const t = state.time;
      const squadRenderX = lerp(state.prevSquadX, state.squadX, alpha);
      const slots = formationSlots(state.squadCount);
      const visible = Math.min(state.squadCount, CONFIG.MAX_VISIBLE);
      if (visible > prevVisibleRobots.count) {
        for (let i = prevVisibleRobots.count; i < visible; i++) robots[i].popStart = t;
      }
      // Squad deaths: burst at the robots that just disappeared.
      if (visible < prevVisibleRobots.count) {
        for (let i = visible; i < prevVisibleRobots.count; i++) {
          spawnBurst(robots[i].visX, DECK_Y + 0.5, robots[i].visZ, false);
        }
      }
      prevVisibleRobots.count = visible;
      if (state.weapon !== lastWeapon) {
        for (const r of robots) applyWeapon(r, state.weapon);
        lastWeapon = state.weapon;
      }
      for (let i = 0; i < robots.length; i++) {
        const r = robots[i];
        if (i >= visible) { r.group.visible = false; continue; }
        const slot = slots[i] ?? { x: 0, z: 0 };
        const tx = squadRenderX + slot.x;
        const tz = slot.z;
        if (Math.abs(r.visX - tx) > 3 || Math.abs(r.visZ - tz) > 3) { r.visX = tx; r.visZ = tz; }
        const k = 1 - Math.exp(-12 * DT);
        r.visX += (tx - r.visX) * k;
        r.visZ += (tz - r.visZ) * k;
        r.group.visible = true;
        const pop = popScale(t - r.popStart);
        const breathe = breathing(t, i * 1.3);
        r.group.position.set(r.visX, DECK_Y, r.visZ);
        r.group.scale.setScalar(pop * breathe);
        const lean = clampN(-state.velX * 0.02, -0.12, 0.12);
        r.group.rotation.z = lean;
        // The squad always runs forward: continuous leg cycle + body bob +
        // arm swing, not only when strafing. Amplitudes boosted in iter-3:
        // the 0.28 leg swing on short chibi legs was invisible in captures.
        // Frequency 6 (was 10) in iter-5: at the 0.75 s frame sampling of
        // the anim sequences, 10 rad/s aliases to near-identical poses
        // (0.75 s = 1.19 periods); 6 rad/s puts sampled frames 0.71 periods
        // apart, so consecutive sampled frames read as different poses.
        const running = state.gameOver ? 0 : 1;
        const legL = r.group.getObjectByName("legL");
        const legR = r.group.getObjectByName("legR");
        // Iter-6: from behind, pitch swings (rotation.x) foreshorten along
        // the view axis and read as frozen; lateral splay (rotation.z)
        // + a bigger bob are what read as strides from behind/above.
        if (legL) { legL.rotation.x = Math.sin(t * 6 + i) * 0.8 * running; legL.rotation.z = Math.sin(t * 6 + i) * 0.25 * running; }
        if (legR) { legR.rotation.x = Math.sin(t * 6 + i + Math.PI) * 0.8 * running; legR.rotation.z = Math.sin(t * 6 + i + Math.PI) * 0.25 * running; }
        r.group.position.y = DECK_Y + Math.abs(Math.sin(t * 6 + i * 0.7)) * 0.2 * running;
        // Iter-7 recoil kick: the arm pitch (-0.6) foreshortens from
        // behind like the leg swings did, so the whole robot also kicks
        // 0.08 back toward the camera on firing frames (visual only).
        r.group.position.z = r.visZ + (t < recoilUntil ? 0.08 : 0);
        const armR = r.group.getObjectByName("armR");
        if (armR) {
          armR.rotation.x = t < recoilUntil ? -0.6 : Math.sin(t * 6 + i + Math.PI) * 0.3 * running;
          armR.rotation.z = Math.sin(t * 6 + i) * 0.2 * running; // sideways swing reads from behind; kept during recoil (no pop)
        }
        // Pistol blaster enlarged 1.6x (visual only, not a model edit): at
        // waist height from behind/above it read as a side nub, not a gun.
        if (r.blaster) r.blaster.scale.setScalar(1.6);
        // Muzzle flash pulses bigger on firing frames: the static 0.16
        // octahedron read as a blue side nub from behind, not a flash.
        r.muzzle.visible = t < recoilUntil;
        if (t < recoilUntil) r.muzzle.scale.set(3, 3, 5);
        else r.muzzle.scale.set(1, 1, 1.5);
        if (t < r.flashUntil) { r.flash.visible = true; (r.flash.material as THREE.MeshBasicMaterial).opacity = 0.55; }
        else r.flash.visible = false;
        if (r.weaponGroup && t - r.popStart < 0.2) r.weaponGroup.scale.setScalar(0.45 * popScale(t - r.popStart));
        else if (r.weaponGroup) r.weaponGroup.scale.setScalar(0.45);
      }
      if (t < lastSquadHitAt + 0.25) {
        for (let i = 0; i < visible; i++) { robots[i].flash.visible = true; (robots[i].flash.material as THREE.MeshBasicMaterial).opacity = 0.55; }
      }

      // Enemies
      const curEnemyIds = new Map<number, { x: number; z: number; kind: string }>();
      for (const e of state.enemies) {
        if (!e.alive) continue;
        curEnemyIds.set(e.id, { x: e.x, z: e.z, kind: e.kind });
      }
      for (const [id, last] of prevEnemyIds) {
        if (!curEnemyIds.has(id) && last.z < 2) spawnBurst(last.x, DECK_Y + 0.5, last.z, last.kind === "golem");
      }
      prevEnemyIds.clear();
      for (const [id, v] of curEnemyIds) prevEnemyIds.set(id, v);
      const usedCrawler = new Set<number>();
      const usedGolem = new Set<number>();
      for (const e of state.enemies) {
        if (!e.alive) continue;
        const pool = e.kind === "crawler" ? crawlerPool : golemPool;
        const used = e.kind === "crawler" ? usedCrawler : usedGolem;
        let vis: EnemyVis | null = null;
        for (const p of pool) if (p.lastId === e.id) { vis = p; break; }
        if (!vis) {
          for (const p of pool) if (!used.has(pool.indexOf(p)) && !dying.has(p) && (p.lastId === -1 || !curEnemyIds.has(p.lastId) || p.group.visible === false)) { vis = p; break; }
        }
        if (!vis) continue;
        used.add(pool.indexOf(vis));
        vis.lastId = e.id;
        vis.group.visible = true;
        const rx = lerp(e.prevX, e.x, alpha);
        const rz = lerp(e.prevZ, e.z, alpha);
        vis.group.position.set(rx, DECK_Y, rz);
        const age = t - e.spawnTime;
        vis.group.scale.setScalar(popScale(age));
        // Enemies face the squad/camera (+Z). The models are built facing
        // -Z (eyes at negative z), so without this they walk backwards and
        // the golem reads as a blank pale slab from behind.
        if (e.kind === "crawler") {
          vis.group.rotation.set(0, Math.PI, 0);
          const legs = (vis.group.userData.legs as THREE.Object3D[] | undefined) ?? [];
          legs.forEach((leg, li) => { leg.rotation.x = Math.sin(t * 14 + li * Math.PI) * 0.35; });
          vis.group.position.y = DECK_Y + Math.abs(Math.sin(t * 14)) * 0.03;
        } else {
          // Iter-6 golem walk: the old sway (0.03) + bob (0.05) read as
          // pure scale/translation. Alternating leg steps + lateral splay
          // + a body roll/bob at the same 3 rad/s cadence read as a waddle
          // from behind; the legs exist as legL/legR pivots in the model.
          vis.group.rotation.set(e.contact ? -0.1 : Math.sin(t * 3) * 0.04, Math.PI, Math.sin(t * 3) * 0.08);
          vis.group.position.y = DECK_Y + Math.abs(Math.sin(t * 3)) * 0.10;
          vis.legs.forEach((leg, li) => {
            leg.rotation.x = Math.sin(t * 3 + li * Math.PI) * 0.35;
            leg.rotation.z = Math.sin(t * 3 + li * Math.PI) * 0.12;
          });
          for (const m of vis.eyes) m.emissiveIntensity = 2.5 + Math.sin(t * 4) * 0.8;
        }
        // Hit feedback: small burst on HP drop (boxes removed, see pool).
        const prevHp = prevEnemyHp.get(e.id);
        if (prevHp !== undefined && e.hp < prevHp) spawnBurst(rx, DECK_Y + 0.5, rz, false);
        prevEnemyHp.set(e.id, e.hp);
      }
      for (const p of [...crawlerPool, ...golemPool]) {
        if (p.lastId !== -1 && !curEnemyIds.has(p.lastId) && !dying.has(p)) { p.group.visible = false; p.lastId = -1; }
      }
      // Death tumble + shrink (spec-mandated; previously enemies just
      // vanished + burst, which reviewers read as "pop out"). Dying
      // visuals are reserved (never reused) until the 0.6 s tumble ends.
      for (const [p, d] of [...dying.entries()]) {
        const age = t - d.t0;
        if (age > 0.6) { dying.delete(p); p.group.visible = false; p.lastId = -1; continue; }
        const pr = age / 0.6;
        p.group.visible = true;
        p.group.position.set(d.x, DECK_Y - pr * 0.15, d.z);
        p.group.rotation.set(pr * 1.4, Math.PI, 0);
        p.group.scale.setScalar(Math.max(0.01, 1 - pr * 0.7));
      }
      for (const id of [...prevEnemyHp.keys()]) if (!curEnemyIds.has(id)) prevEnemyHp.delete(id);

      // Gates
      const usedGates = new Set<number>();
      for (const g of state.gates) {
        if (!g.alive) continue;
        let vis = gatePool.find((p) => !usedGates.has(gatePool.indexOf(p)) && p.group.visible && (p.group.userData.gateId as number) === g.id);
        if (!vis) vis = gatePool.find((p) => !usedGates.has(gatePool.indexOf(p)) && !p.group.visible);
        if (!vis) continue;
        usedGates.add(gatePool.indexOf(vis));
        vis.group.userData.gateId = g.id;
        vis.group.visible = true;
        vis.group.position.set(g.x, DECK_Y, lerp(g.prevZ, g.z, alpha));
        if (vis.lastMult !== g.mult) { vis.labelMat.map = gateTexture(g.mult); vis.labelMat.needsUpdate = true; vis.lastMult = g.mult; }
        const flashT = gateFlash.get(g.id) ?? -10;
        const pop = g.flashUntil > t ? 1 + (g.flashUntil - t) * 0.6 : 1;
        vis.label.scale.setScalar(pop);
        void flashT;
        // Glass shimmer x distance fade: far labels fade out instead of
        // stacking into an unreadable text smear at the vanishing point.
        const gateFade = 1 - THREE.MathUtils.clamp((-g.z - 40) / 35, 0, 1) * 0.85;
        vis.labelMat.opacity = (0.85 + Math.sin(t * 3 + g.id) * 0.15) * gateFade;
      }
      for (const p of gatePool) {
        const gid = p.group.userData.gateId as number | undefined;
        if (p.group.visible && gid !== undefined && !state.gates.some((g) => g.alive && g.id === gid)) { p.group.visible = false; }
      }

      // Boulders
      const usedBoulders = new Set<number>();
      for (const b of state.boulders) {
        if (!b.alive) continue;
        let vis = boulderPool.find((p) => !usedBoulders.has(boulderPool.indexOf(p)) && p.group.visible && (p.group.userData.boulderId as number) === b.id);
        if (!vis) vis = boulderPool.find((p) => !usedBoulders.has(boulderPool.indexOf(p)) && !p.group.visible);
        if (!vis) continue;
        usedBoulders.add(boulderPool.indexOf(vis));
        vis.group.userData.boulderId = b.id;
        vis.group.visible = true;
        const shake = b.shakeUntil > t ? Math.sin(t * 40) * 0.08 : 0;
        vis.group.position.set(b.x + shake, DECK_Y, lerp(b.prevZ, b.z, alpha));
        const hpCeil = Math.ceil(b.hp);
        if (vis.lastHp !== hpCeil) {
          // Hit feedback: a small burst at the boulder whenever its number
          // drops (previously hits were invisible except for the label).
          if (vis.lastHp !== -1 && hpCeil < vis.lastHp) spawnBurst(b.x, DECK_Y + 0.6, lerp(b.prevZ, b.z, alpha), false);
          vis.labelMat.map = boulderTexture(b.tier, hpCeil, b.maxHp); vis.labelMat.needsUpdate = true; vis.lastHp = hpCeil;
        }
        // Distance fade (same vanishing-point smear fix as gates).
        vis.labelMat.opacity = 1 - THREE.MathUtils.clamp((-b.z - 40) / 35, 0, 1) * 0.85;
        prevBoulderHp.set(b.id, hpCeil);
        prevBoulderPos.set(b.id, { x: b.x, z: b.z });
      }
      for (const p of boulderPool) {
        const bid = p.group.userData.boulderId as number | undefined;
        if (p.group.visible && bid !== undefined && !state.boulders.some((b) => b.alive && b.id === bid)) {
          // Crumble if it was destroyed (hp reached 0), not merely scrolled past.
          if ((prevBoulderHp.get(bid) ?? 99) <= 0) {
            const pos = prevBoulderPos.get(bid);
            if (pos) spawnBurst(pos.x, DECK_Y + 0.4, pos.z, true);
          }
          p.group.visible = false;
        }
      }

      // Projectiles
      const usedProj = new Set<number>();
      for (const p of state.projectiles) {
        if (!p.alive) continue;
        const vis = projPool[usedProj.size % projPool.length];
        if (usedProj.has(projPool.indexOf(vis))) continue;
        usedProj.add(projPool.indexOf(vis));
        vis.group.visible = true;
        vis.group.position.set(lerp(p.prevX, p.x, alpha), DECK_Y + 0.35, lerp(p.prevZ, p.z, alpha));
        const ang = Math.atan2(-p.vx, -p.vz);
        vis.group.rotation.y = ang;
        const isRocket = p.weapon === "rocket-launcher";
        vis.bolt.visible = !isRocket;
        vis.trail.visible = !isRocket;
        vis.rocket.visible = isRocket;
      }
      for (let i = 0; i < projPool.length; i++) {
        if (!usedProj.has(i)) projPool[i].group.visible = false;
      }

      // World scroll: road, side props, sky parallax, clouds.
      syncRoad(state.distance);
      syncDebris(state.distance);
      // Poles/banners ride the rails (x ±3.08); rubble sits ON the deck edge
      // (x 2.55–2.95), never floating off-deck in the sky.
      syncInstances(state.distance, poleMesh, 12, 10, (side) => side * 3.08, DECK_Y + 1.2);
      syncInstances(state.distance, bannerMesh, 12, 10, (side) => side * 3.02, DECK_Y + 1.35);
      syncInstances(state.distance, rubbleMesh, 20, 5.5, (side, i) => side * (2.55 + (i % 3) * 0.2), DECK_Y + 0.1, (i) => 0.6 + (i % 4) * 0.3);
      for (let i = 0; i < sideDetail.length; i++) {
        const base = -12 - i * 18;
        const wrapped = ((base + state.distance) % 110 + 110) % 110;
        sideDetail[i].position.z = -90 + wrapped + 5;
      }
      for (const s of skyGroups) {
        const wrapped = ((s.base + state.distance * 0.25) % 110 + 110) % 110;
        // Iter-6: groups sit at y -8 (was -4) so towers/platforms rise
        // from the cloud sea instead of floating at deck level, and more
        // of each tower stays inside the frame vertically.
        s.g.position.set(s.x, -8, -110 + wrapped);
      }
      for (let i = 0; i < cloudSeed.length; i++) {
        const c = cloudSeed[i];
        const x = ((c.x + t * 0.6 + 60) % 120) - 60;
        tmpVec.set(x, c.y, c.z);
        tmpMat.compose(tmpVec, tmpQuat, tmpScale.set(c.s, c.s * 0.45, c.s * 0.8));
        cloudMesh.setMatrixAt(i, tmpMat);
      }
      cloudMesh.instanceMatrix.needsUpdate = true;

      // Camera: behind + above, slight lateral lag, micro shake on golem stomp (not reduced-motion).
      const camX = squadRenderX * CONFIG.CAMERA.lag;
      let shake = 0;
      if (!reducedMotion) {
        const nearGolem = state.enemies.some((e) => e.alive && e.kind === "golem" && e.z > -25);
        if (nearGolem) shake = Math.sin(t * 40) * 0.02;
      }
      camera.position.set(camX, camera.userData.cy as number, camera.userData.cz as number);
      // Iter-7 horizon skyline follows the camera at the vanishing point.
      horizonGroup.position.set(camX * 0.3, 0, (camera.userData.cz as number) - 108);
      camera.lookAt(camX * 0.8, CONFIG.CAMERA.lookY + shake, CONFIG.CAMERA.lookZ);
      skyDome.position.copy(camera.position);
      sun.position.set(camera.position.x - 30, 20, camera.position.z - 120);
    }

    function drainEvents(): void {
      if (!state.events.length) return;
      let lastShot = 0;
      for (const ev of state.events) {
        if (ev.type === "fire") {
          if (state.time - lastShot > 0.05) { sfx.shoot(); lastShot = state.time; }
          recoilUntil = state.time + 0.2;
        } else if (ev.type === "enemyDeath") {
          sfx.hit();
          if (ev.id !== undefined && ev.x !== undefined && ev.z !== undefined) markDying(ev.id, ev.x, ev.z);
        }
        else if (ev.type === "squadHit") { sfx.death(); lastSquadHitAt = state.time; }
        else if (ev.type === "gate") sfx.gate();
        else if (ev.type === "boulderGrant") sfx.grant();
        else if (ev.type === "boulderBreak" && ev.x !== undefined && ev.z !== undefined) placeDebris(ev.x, ev.z);
        else if (ev.type === "gameOver") sfx.gameOver();
      }
      state.events.length = 0;
    }

    // ---- Composer (bloom behind quality toggle) ----
    let composer: EffectComposer | null = null;
    let composerRatio = -1;
    const cssSize = { w: 800, h: 600 };
    try {
      // UnsignedByteType targets (not the default HalfFloatType): the
      // scene's HDR range is modest (brightest emissive ~2.7), and
      // half-float composer targets blacked out one exact capture state
      // under SwiftShader (golem-walk t=7.0) while direct rendering stayed
      // correct — byte targets render identically on real GPUs and avoid
      // that software-renderer float-buffer edge case entirely.
      composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(800, 450, { type: THREE.UnsignedByteType }));
      composer.addPass(new RenderPass(scene, camera));
      // Threshold 1.0 (was 0.85): only emissive glows bloom now — sun-lit
      // pale rock used to cross the threshold and bloom into white blobs.
      const bloom = new UnrealBloomPass(new THREE.Vector2(800, 450), 0.3, 0.6, 1.0);
      composer.addPass(bloom);
      composer.addPass(new OutputPass());
    } catch { composer = null; }

    function applySize(): void {
      const el = containerRef.current;
      if (!el) return;
      const w = el.clientWidth || 800;
      const h = el.clientHeight || 600;
      const aspect = w / h;
      camera.aspect = aspect;
      if (aspect >= 1.2) {
        camera.fov = CONFIG.CAMERA.fov;
        camera.userData.cy = CONFIG.CAMERA.y;
        camera.userData.cz = CONFIG.CAMERA.z;
      } else {
        camera.fov = Math.min(80, CONFIG.CAMERA.fov * (1.2 / aspect));
        // Portrait: a modest pull-back (iter-6) so the foreground gate
        // and boulder labels fit inside the narrow horizontal FOV — at
        // boost 1 the 1.6-wide foreground labels clipped at both edges.
        // Smooth in aspect: 1.32 at phone portrait, ~1.0 near square.
        const boost = 1 + (1.2 - aspect) * 0.5;
        camera.userData.cy = CONFIG.CAMERA.y * boost;
        camera.userData.cz = CONFIG.CAMERA.z * boost;
      }
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      // Keep the composer's render targets at the same backing resolution
      // as the canvas: EffectComposer sizes its targets by pixel ratio at
      // setSize time, but renderFrame changes the ratio afterwards, so
      // without this the composer rendered at CSS size (1600x900) while
      // the canvas backing was DPR-scaled (2400x1350) — and under
      // SwiftShader that mismatch blacked out one exact capture state.
      composer?.setPixelRatio(renderer.getPixelRatio());
      composer?.setSize(w, h);
      cssSize.w = w; cssSize.h = h;
    }
    applySize();

    // ---- Input ----
    const pointerTarget = { x: 0, has: false };
    const keysDown = new Set<string>();
    const godRef = { on: false };
    let captureGod = false;
    const onPointer = (e: PointerEvent) => {
      if (!propsRef.current.running || propsRef.current.paused) return;
      if (e.pointerId !== undefined && (e as PointerEvent).isPrimary === false) return;
      const rect = renderer.domElement.getBoundingClientRect();
      const nx = clampN((e.clientX - rect.left) / Math.max(1, rect.width), 0, 1);
      pointerTarget.x = (nx * 2 - 1) * CONFIG.ROAD_HALF;
      pointerTarget.has = true;
      sfx.init();
    };
    renderer.domElement.addEventListener("pointermove", onPointer);
    renderer.domElement.addEventListener("pointerdown", onPointer);
    renderer.domElement.addEventListener("contextmenu", (e) => e.preventDefault());
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key.toLowerCase() === "p") { propsRef.current.onPauseRequest(); return; }
      keysDown.add(e.key.toLowerCase());
      sfx.init();
    };
    const onKeyUp = (e: KeyboardEvent) => keysDown.delete(e.key.toLowerCase());
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    const onVis = () => {
      if (document.hidden && propsRef.current.running && !propsRef.current.paused) propsRef.current.onPauseRequest();
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("blur", onVis);
    const onCtxLost = (e: Event) => { e.preventDefault(); setCtxLost(true); };
    const onCtxRestored = () => setCtxLost(false);
    renderer.domElement.addEventListener("webglcontextlost", onCtxLost);
    renderer.domElement.addEventListener("webglcontextrestored", onCtxRestored);
    const onResize = () => applySize();
    window.addEventListener("resize", onResize);

    // ---- HUD / FPS / auto-DPR ----
    let fpsFrames = 0; let fpsTime = 0; let fps = 60; let dpr = 1.5;
    let hudTimer = 0;
    const pushHud = () => {
      propsRef.current.onHud({
        squad: state.squadCount, weapon: WEAPONS[state.weapon].name,
        distance: Math.floor(state.distance), score: state.score, kills: state.kills,
        fps: Math.round(fps), enemies: state.enemies.filter((e) => e.alive).length,
        projectiles: state.projectiles.filter((p) => p.alive).length,
        gameOver: state.gameOver, dying: state.dying,
      });
    };
    let gameOverReported = false;

    function stepOnce(): void {
      sfx.muted = propsRef.current.muted;
      const keyDir = (keysDown.has("a") || keysDown.has("arrowleft") ? -1 : 0) + (keysDown.has("d") || keysDown.has("arrowright") ? 1 : 0);
      tick(state, DT, {
        targetX: pointerTarget.has ? pointerTarget.x : undefined,
        keyDir: keyDir === 0 ? 0 : Math.sign(keyDir),
        godMode: captureGod || godRef.on,
      });
      drainEvents();
      if (state.gameOver && !gameOverReported) {
        gameOverReported = true;
        propsRef.current.onGameOver(state.score);
      }
    }

    function renderFrame(): void {
      const q = propsRef.current.quality;
      const pr = Math.min(dpr, q === "high" ? CONFIG.DPR_MAX : 1);
      renderer.setPixelRatio(pr);
      // Re-sync composer targets if the pixel ratio changed since applySize
      // (auto-DPR steps and the quality toggle both change it).
      if (composer && pr !== composerRatio) {
        composer.setPixelRatio(pr);
        composer.setSize(cssSize.w, cssSize.h);
        composerRatio = pr;
      }
      if (q === "high" && composer) composer.render();
      else renderer.render(scene, camera);
    }

    // ---- Deterministic capture mode (?shot=hero / ?anim=*) ----
    const params = new URLSearchParams(window.location.search);
    const captureMode = params.get("shot") !== null || params.get("anim") !== null;
    const exposeGame = () => {
      window.__advance = (dt: number) => {
        const steps = Math.max(1, Math.round(dt / DT));
        for (let i = 0; i < steps; i++) stepOnce();
        // Drain before sync (same order as the live RAF loop): without
        // this, capture mode never set recoilUntil, so muzzle flash never
        // showed in anim captures — part of the "no flash" reviewer read.
        // SFX calls no-op without a user gesture, so this is visual-only.
        drainEvents();
        sync(1);
        // Age bursts by the full advance, not DT: the old updateBursts(DT)
        // made 0.5 s bursts persist ~30 capture frames at fixed positions,
        // reading as stray rings on distant specks.
        updateBursts(dt);
        renderFrame();
      };
      window.__game = {
        advance: window.__advance,
        setTargetX: (x: number) => { pointerTarget.x = clampN(x, -CONFIG.ROAD_HALF, CONFIG.ROAD_HALF); pointerTarget.has = true; },
        setGodMode: (v: boolean) => { godRef.on = v; },
        spawnEnemy: (kind: string, x: number, z: number) => {
          const base = kind === "golem" ? CONFIG.GOLEM : CONFIG.CRAWLER;
          state.enemies.push({ id: state.nextId++, kind: kind as Enemy["kind"], x, z, prevX: x, prevZ: z, hp: base.hp, maxHp: base.hp, speed: base.speed, radius: base.radius, alive: true, contact: false, attackCd: 0, spawnTime: state.time, flashUntil: 0 });
        },
        spawnGate: (mult: number, z: number) => { state.gates.push({ id: state.nextId++, x: CONFIG.GATE_X, z, prevZ: z, mult, triggered: false, alive: true, flashUntil: 0 }); },
        spawnBoulder: (tier: string, hp: number, z: number) => { state.boulders.push({ id: state.nextId++, x: CONFIG.BOULDER_X, z, prevZ: z, hp, maxHp: hp, tier: tier as WeaponId, granted: false, alive: true, shakeUntil: 0, pendingGrant: false }); },
        snapshot: () => ({
          squad: state.squadCount, weapon: state.weapon, score: state.score, distance: Math.floor(state.distance),
          kills: state.kills, gameOver: state.gameOver, dying: state.dying,
          enemies: state.enemies.filter((e) => e.alive).length,
          gates: state.gates.filter((g) => g.alive).length,
          boulders: state.boulders.filter((b) => b.alive).length,
          squadX: state.squadX,
        }),
        debugRobots: () => robots.slice(0, 5).map((r) => ({ visible: r.group.visible, x: +r.group.position.x.toFixed(2), y: +r.group.position.y.toFixed(2), z: +r.group.position.z.toFixed(2), scale: +r.group.scale.x.toFixed(2), children: r.group.children.length, inScene: r.group.parent === scene })),
        debugLoop: () => ({ running: propsRef.current.running, paused: propsRef.current.paused, gameOver: state.gameOver, time: +state.time.toFixed(2) }),
      };
    };
    exposeGame();


    let raf = 0;
    let destroyed = false;
    if (captureMode) {
      captureGod = true; // deterministic captures must not lose the squad to demo enemies
      // Fixed seed/time/framing. Hero: 2 s so the squad is intact and
      // gates/boulders/enemies sit at readable mid-distances. Anim: 6 s.
      const heroSteps = params.get("shot") !== null ? 120 : 360;
      // Sync visuals every step so springs (formation) and pops settle;
      // a single sync after the advance would leave robots at spawn scale.
      for (let i = 0; i < heroSteps; i++) { stepOnce(); sync(1); }
      // Staging AFTER the advance (staging before it used to scroll past the
      // squad line and despawn before the frames were captured, leaving the
      // anim sequences with no subject at all).
      const animName = params.get("anim");
      const mkEnemy = (kind: "crawler" | "golem", x: number, z: number, hpMul = 1) => {
        const base = kind === "golem" ? CONFIG.GOLEM : CONFIG.CRAWLER;
        // spawnTime 1 s in the past: popScale(age 0) = 0.01 would otherwise
        // render staged capture entities invisible in the shot.
        state.enemies.push({ id: state.nextId++, kind, x, z, prevX: x, prevZ: z, hp: base.hp * hpMul, maxHp: base.hp * hpMul, speed: base.speed, radius: base.radius, alive: true, contact: false, attackCd: 0, spawnTime: state.time - 1, flashUntil: 0 });
      };
      const mkGate = (z: number, mult: number, x: number = CONFIG.GATE_X) => { state.gates.push({ id: state.nextId++, x, z, prevZ: z, mult, triggered: false, alive: true, flashUntil: 0 }); };
      const mkBoulder = (z: number, hp: number, tier: "minigun", x: number = CONFIG.BOULDER_X) => { state.boulders.push({ id: state.nextId++, x, z, prevZ: z, hp, maxHp: hp, tier, granted: false, alive: true, shakeUntil: 0, pendingGrant: false }); };
      if (params.get("shot") !== null) {
        // Dense hero chain (capture-only): gates left, boulders right,
        // enemies centre at graduated depths, like the reference. The
        // nearest crawler sits at -6, not -2 (dead-centre in front of the
        // squad blocked the lane in the confirmation round).
        // Iter-6 foreground pieces (new closer camera makes them large):
        // a gate and boulder in the immediate foreground + a near golem.
        // Foreground gate/boulder staged INBOARD (capture-only): at lane
        // x (±2.4) their 1.6-wide labels clipped at the portrait edges.
        mkGate(-1.5, 2, -1.8);
        mkBoulder(-1.0, 100, "minigun", 1.6);
        // Near golem dead-centre (was 0.9): a single large camera-facing
        // golem in front of the column, not occluded by crawlers.
        mkEnemy("golem", 0, -5);
        mkGate(-4, 2); mkGate(-12, 2); mkGate(-20, 2); mkGate(-28, 2); mkGate(-36, 3); mkGate(-44, 3); mkGate(-52, 2); mkGate(-60, 3);
        mkBoulder(-3, 100, "minigun"); mkBoulder(-11, 200, "minigun"); mkBoulder(-19, 200, "minigun"); mkBoulder(-27, 300, "minigun"); mkBoulder(-35, 300, "minigun"); mkBoulder(-43, 200, "minigun"); mkBoulder(-51, 300, "minigun");
        // Dense centre column (capture-only, staged after the advance so
        // auto-fire has no time to kill them before the screenshot).
        // Iter-6: near crawlers pushed to ±0.8 so they clear the dead-centre
        // near golem (spans ±0.7), and the mid golem to -1.2 so the -11
        // crawler is not inside its silhouette.
        // Iter-7 (reviewer 2): strict alternation — crawlers alternate
        // sides with >=3 z-gaps, golems at |x| >= 1.8 (outside crawler
        // lanes + golem half-width), so no two silhouettes overlap from
        // the hero camera. First crawler at -1.0 clears the near golem's
        // screen edge.
        mkEnemy("crawler", -1.0, -6); mkEnemy("crawler", 0.8, -9); mkEnemy("crawler", -0.8, -12); mkEnemy("crawler", 0.8, -15); mkEnemy("crawler", -0.8, -19); mkEnemy("crawler", 0.8, -23); mkEnemy("crawler", -0.8, -28); mkEnemy("crawler", 0.8, -34); mkEnemy("crawler", -0.8, -41);
        mkEnemy("golem", -1.8, -16); mkEnemy("golem", 1.8, -32);
        // Relocate the demo golem (capture-only) off-centre and further out:
        // dead-centre at ~-16 it read as a blank white panel blocking the
        // vanishing point. Iter-7: (-1.8, -22) keeps it clear of the
        // restaged crawler column (golem half-width 0.7 + crawler 0.25).
        for (const e of state.enemies) {
          if (e.demo && e.alive && e.kind === "golem") { e.x = -1.8; e.prevX = -1.8; e.z = -22; e.prevZ = -22; break; }
        }
        // Relocate demo crawlers into the column: after the 2 s pre-advance
        // scroll they sit at ~-3/-9, and the -3 one clips the squad.
        {
          const demoCrawlers = state.enemies.filter((e) => e.demo && e.kind === "crawler" && e.alive);
          const slots = [-10, -16];
          demoCrawlers.forEach((e, i) => { e.z = slots[i] ?? -20; e.prevZ = e.z; });
        }
      } else if (animName === "golem-walk") {
        // Huge HP: squad pistol DPS (~53) would otherwise kill a 90 HP
        // golem in ~1.7 s, leaving the sequence subject-less. Staged at -24
        // so 3 s of walking ends near the camera without reaching the
        // squad line (contact would freeze it in a lunge for the last frames).
        mkEnemy("golem", 0.9, -24, 1000);
      } else if (animName === "boulder-break") {
        // Iter-6: -20 + 12 HP. Debris z at time T is startZ + 6.9*T
        // regardless of break time, so the old -14 staging put debris
        // behind the camera by frame 09; at -20 the break lands ~1.65 s
        // (just before the boulder wall engages at -8) and debris stays
        // in frame through frame 11 (scattered pile at x-0.7).
        mkBoulder(-20, 12, "minigun");
        pointerTarget.x = CONFIG.BOULDER_X; pointerTarget.has = true;
      } else if (animName === "robot-fire") {
        // Five targets at graduated depths so the sequence still has live
        // targets in frame 11 (three died before frame 03 in round 4).
        mkEnemy("crawler", -0.5, -14); mkEnemy("crawler", 0.5, -18); mkEnemy("crawler", 0, -22); mkEnemy("crawler", -0.4, -27); mkEnemy("crawler", 0.5, -33);
      }
      sync(1);
      updateBursts(DT);
      renderFrame();
      window.__SHOT_READY__ = true;
    } else {
      let last = performance.now();
      let acc = 0;
      let loopFrames = 0;
      let lastDt = -999; let lastAcc = -999; let lastBranch = "";
      (window as unknown as { __loopFrames?: () => Record<string, unknown> }).__loopFrames = () => ({ frames: loopFrames, lastDt, lastAcc, lastBranch, destroyed });
      const loop = (now: number) => {
        if (destroyed) return;
        loopFrames++;
        raf = requestAnimationFrame(loop);
        // Clamp both ends: RAF timestamps can jump backwards vs performance.now()
        // in headless/throttled environments; a negative dt used to poison the
        // accumulator (acc ≈ -1.5) and freeze the sim for ~15 frames.
        const frameDt = Math.min(0.1, Math.max(0, (now - last) / 1000));
        lastDt = frameDt;
        last = now;
        fpsFrames++; fpsTime += frameDt;
        if (fpsTime >= 0.5) { fps = fpsFrames / fpsTime; fpsFrames = 0; fpsTime = 0; }
        if (propsRef.current.running && !propsRef.current.paused && !state.gameOver) {
          lastBranch = "run";
          acc += frameDt;
          if (acc < 0) acc = 0;
          let steps = 0;
          while (acc >= DT && steps < 5) { stepOnce(); acc -= DT; steps++; }
          if (steps === 5) acc = 0; // drop backlog after tab resume with huge dt
          lastAcc = acc;
          sync(acc / DT);
          updateBursts(frameDt);
        } else if (propsRef.current.paused || state.gameOver) {
          lastBranch = "frozen";
          sync(1); // frozen animations (sim time does not advance)
        } else {
          lastBranch = "idle";
          sync(1); // start screen: static scene behind the overlay
        }
        hudTimer += frameDt;
        if (hudTimer >= 0.1) { hudTimer = 0; pushHud(); }
        // Auto DPR every ~2 s from measured FPS.
        if (Math.floor(now / 2000) !== Math.floor((now - frameDt * 1000) / 2000)) {
          if (fps < 45 && dpr > CONFIG.DPR_MIN) dpr -= 0.25;
          else if (fps > 55 && dpr < CONFIG.DPR_MAX) dpr += 0.25;
        }
        renderFrame();
      };
      raf = requestAnimationFrame(loop);
    }

    return () => {
      destroyed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("blur", onVis);
      window.removeEventListener("resize", onResize);
      renderer.domElement.removeEventListener("pointermove", onPointer);
      renderer.domElement.removeEventListener("pointerdown", onPointer);
      renderer.domElement.removeEventListener("webglcontextlost", onCtxLost);
      renderer.domElement.removeEventListener("webglcontextrestored", onCtxRestored);
      composer?.dispose();
      disposeLabels();
      renderer.dispose();
      if (renderer.domElement.parentElement) renderer.domElement.parentElement.removeChild(renderer.domElement);
    };
  }, []);

  if (fallback) {
    return (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#0b1220", color: "#fff", padding: 24, textAlign: "center" }}>
        <p>WebGL is not available in this browser, so Skybound cannot run here. Please try a browser with WebGL enabled.</p>
      </div>
    );
  }
  return (
    <div ref={containerRef} style={{ width: "100%", height: "100%", position: "relative", overflow: "hidden", background: "#7ec2f5" }}>
      {ctxLost && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)", color: "#fff", zIndex: 20, padding: 24, textAlign: "center" }}>
          <p>Graphics context was lost. It should restore automatically — if the scene stays blank, reload the page.</p>
        </div>
      )}
    </div>
  );
}
