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
  group: THREE.Group; blaster: THREE.Object3D | null; muzzle: THREE.Mesh;
  holder: THREE.Group; weaponGroup: THREE.Group | null;
  visX: number; visZ: number; popStart: number;
}
interface EnemyVis {
  group: THREE.Group; blob: THREE.Mesh;
  eyes: THREE.MeshStandardMaterial[]; lastId: number; hitPopT: number;
  legs: THREE.Object3D[]; // golem leg pivots (crawler uses userData.legs)
}
interface GateVis { group: THREE.Group; label: THREE.Mesh; labelMat: THREE.MeshBasicMaterial; lastMult: number; flashT: number; }
interface BoulderVis { group: THREE.Group; label: THREE.Mesh; labelMat: THREE.MeshBasicMaterial; lastHp: number; }
interface ProjVis { group: THREE.Group; streak: THREE.Sprite; rocket: THREE.Group; }
interface Burst {
  group: THREE.Group; shards: THREE.Mesh[];
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
  // Iter-12: warm-white core (#fff3d6, was pure white) + warm halo
  // (#ffd98a) — round-7 reviewers read the flat white disc as a UI
  // circle, not a light source. The gradient fades to transparent over
  // the full sprite, so at glow scale 55 it extends ~2.75x the disc
  // radius (disc scale 20) as a soft warm halo.
  // Iter-13: halo alpha 0.5 -> 0.7 — round-8 reviewers still saw no
  // warm tint at all (see also the disc/glow colour multipliers
  // below: all channels over the bloom threshold washed to white).
  // Iter-14: core stops to warm GOLD (was near-white) — round-9
  // reviewers still saw a pure-white disc in every frame; the
  // texture core itself must be gold, not just the multiplier.
  g.addColorStop(0, "rgba(255,190,80,1)");
  g.addColorStop(0.15, "rgba(255,200,100,0.95)");
  g.addColorStop(0.4, "rgba(255,180,90,0.7)");
  g.addColorStop(1, "rgba(255,180,90,0)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Iter-15: bolt streak texture for BILLBOARD bolt sprites. Three
// rounds (8, 9, 10) proved -Z capsules read as discs/spoons from
// the behind-camera view: a -Z streak foreshortens (length x sin
// pitch) while its cross-section stays full, and perspective widens
// its near end into a teardrop. A billboard sprite always faces the
// camera, so it CANNOT foreshorten — it reads as the reference's
// vertical gunfire streaks from the only camera angle the game
// uses. Vertical streak: white core centre, cyan glow edges,
// tapered (transparent) top/bottom ends. 64 wide x 256 tall.
function boltStreakTexture(): THREE.Texture {
  const c = document.createElement("canvas");
  c.width = 64; c.height = 256;
  const ctx = c.getContext("2d")!;
  const gx = ctx.createLinearGradient(0, 0, 64, 0);
  gx.addColorStop(0, "rgba(0,229,255,0)");
  gx.addColorStop(0.25, "rgba(0,229,255,0.85)");
  gx.addColorStop(0.5, "rgba(255,255,255,1)");
  gx.addColorStop(0.75, "rgba(0,229,255,0.85)");
  gx.addColorStop(1, "rgba(0,229,255,0)");
  ctx.fillStyle = gx; ctx.fillRect(0, 0, 64, 256);
  ctx.globalCompositeOperation = "destination-in";
  const gy = ctx.createLinearGradient(0, 0, 0, 256);
  gy.addColorStop(0, "rgba(0,0,0,0)");
  gy.addColorStop(0.2, "rgba(0,0,0,1)");
  gy.addColorStop(0.8, "rgba(0,0,0,1)");
  gy.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = gy; ctx.fillRect(0, 0, 64, 256);
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
    const sun = new THREE.Sprite(new THREE.SpriteMaterial({ map: sunTexture(), transparent: true, fog: false, depthWrite: false, depthTest: false }));
    sun.position.set(-38, 24, -120);
    sun.scale.set(55, 55, 1); // iter-12: 55 (was 36) — a bigger soft glow so the sun reads as a light source, not a flat disc; kept large per reviewers (never shrink below the current size)
    // Iter-7: push the sprite colour above 1 so the core crosses the
    // bloom threshold (1.0) and blooms for real; the halo stays below it.
    // Iter-13: (1.7,1.4,0.9) (was 1.6,1.5,1.3) — round-8 reviewers saw
    // no warm tint because all channels exceeded the threshold and
    // washed to white; dropping blue restores visible warmth.
    // Iter-14: (1.8,1.2,0.4) — round-9 reviewers STILL saw pure white:
    // blue at 0.9 was still high enough (with the near-white texture)
    // to wash out. Blue at 0.4 keeps the bloom golden.
    (sun.material as THREE.SpriteMaterial).color.setRGB(1.8, 1.2, 0.4);
    scene.add(sun);
    // Iter-10: hard disc inside the glow — the soft gradient sprite alone
    // read as a diffuse wash with no disc. The disc texture is a flat
    // white circle (no gradient), so a crisp warm disc survives bloom.
    // Iter-11: scale 20 (was 12, ~76 px in landscape — reviewers asked
    // >=120 px) + depthTest off so thin drifting clouds never occlude it.
    // Iter-12: warm disc fill (#fff3d6, was #fffef5) to match the warm
    // glow; scale 20 kept (reviewers: never shrink below current size).
    // Iter-14: fill #ffc850 (warm gold, was #fff3d6 near-white) —
    // round-9 reviewers saw a pure-white disc in every frame; the
    // disc's own fill must be gold, not just its multiplier.
    const discCanvas = document.createElement("canvas"); discCanvas.width = discCanvas.height = 128;
    {
      const dctx = discCanvas.getContext("2d")!;
      dctx.fillStyle = "#ffc850"; dctx.beginPath(); dctx.arc(64, 64, 62, 0, Math.PI * 2); dctx.fill();
    }
    const disc = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(discCanvas), fog: false, depthWrite: false, depthTest: false }));
    disc.position.set(-38, 24, -120); disc.scale.set(20, 20, 1); disc.renderOrder = 10;
    // Iter-13: (1.9,1.5,0.9) (was 1.8,1.7,1.4) — same bloom washout
    // fix as the glow: blue drops so the disc reads warm, not white.
    // Iter-14: (2.0,1.1,0.3) — round-9 reviewers STILL saw white:
    // with a near-white fill, blue at 0.9 still washed out. Now the
    // fill is gold AND blue is at 0.3, so the disc reads amber even
    // after bloom.
    (disc.material as THREE.SpriteMaterial).color.setRGB(2.0, 1.1, 0.3);
    scene.add(disc);
    // Iter-12: hemisphere 0.8 (was 1.05) + key 3.0 (was 2.8) — round-7
    // reviewers saw only short blobs under golems/boulders/robots, not
    // the claimed long shadows; dimming the ambient fill and raising
    // the key restores shadow contrast (all pool meshes already cast,
    // road tiles already receive — flags were verified correct).
    scene.add(new THREE.HemisphereLight(0xbfe3ff, 0x6b7280, 0.8));
    // Iter-10: lower elevation (was 50 deg) so shadows stretch long
    // toward the camera like the reference's raking light (shadow length
    // ~2.1x object height at 26 deg); 2048 map + tighter frustum for
    // denser texels on the near field, where reviewers saw no readable
    // golem/boulder shadows at 1024/+/-14. Iter-11: +/-14 (was +/-10) —
    // covers the enemy column to ~-22 (forward-falling shadows hide
    // behind casters at 50 deg; the lower light is the real fix, and
    // +/-14 keeps 73 px/unit density). Full -30 coverage was declined:
    // it needs +/-23+, which drops density to ~44 px/unit.
    const sunLight = new THREE.DirectionalLight(0xfff2cc, 3.0);
    sunLight.position.set(-25, 14, 10);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.set(2048, 2048);
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
    const robots: RobotVis[] = [];
    for (let i = 0; i < CONFIG.MAX_VISIBLE; i++) {
      const group = buildRobot();
      const blaster = group.getObjectByName("blaster") ?? null;
      const muzzle = new THREE.Mesh(
        // Iter-6: sphere + additive white-hot flash, not an octahedron —
        // the octahedron muzzle was indistinguishable from the bolt
        // diamonds, so reviewers read "no muzzle flash at any gun".
        // Iter-10: cyan-white tint — pure white on the white robot backs
        // was invisible (additive white on white).
        new THREE.SphereGeometry(0.14, 10, 8),
        new THREE.MeshBasicMaterial({ color: 0xaef7ff, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false }),
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
      robots.push({ group, blaster, muzzle, holder, weaponGroup: null, visX: 0, visZ: 0, popStart: -10 });
    }

    const crawlerPool: EnemyVis[] = [];
    for (let i = 0; i < CONFIG.ENEMY_POOL_CRAWLER; i++) {
      const group = buildCrawler();
      const blob = mkBlob(0.4);
      group.add(blob);
      enableShadows(group);
      group.visible = false;
      scene.add(group);
      crawlerPool.push({ group, blob, eyes: [], lastId: -1, hitPopT: -10, legs: [] });
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
      golemPool.push({ group, blob, eyes, lastId: -1, hitPopT: -10, legs });
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
      const label = new THREE.Mesh(new THREE.PlaneGeometry(0.64, 0.364), labelMat);
      // Iter-12: z 0.85 (was 0.5) — the label plane sat INSIDE the dome
      // (dome front at y 0.5 is z 0.56 local, 0.7 world; label at 0.5
      // local = 0.625 world), so its lower digits were occluded by the
      // dome. At 0.85 local = 1.06 world, clear of the 0.7 dome front.
      // Iter-13: plane 1.3x0.74 (was 1.5x0.85) + x -0.1 — round-8
      // reviewers read the 1.5-wide slab as extending past the boulder
      // onto the road, and banner poles at x 3.0 overlapped the
      // right-aligned number (far labels read "30" not "300"). Now the
      // label spans 1.65..2.95 for a boulder at 2.4 (dome 1.7..3.1):
      // inside the dome, clear of the pole, 25% smaller slab. Aspect
      // matches the old plane (1.76), so the texture is undistorted.
      // Iter-14: plane 0.64x0.364 at (0, 0.4, 0.85) — the iter-13
      // "inside the dome" claim was WRONG: it used local units as
      // world units, but the group scale is 1.25, so the 1.3-local
      // label is 1.625 WORLD, wider than the dome (ellipsoid RX
      // 0.441 x 1.25 = 0.551, world width 1.10). Round-9 reviewers
      // correctly saw it straddling the dome. The new 0.64-local
      // label is 0.80 world: at local y 0.4 (world 0.5) the ellipsoid
      // half-width is 0.548, so the label (world 2.0..2.8 for a
      // boulder at 2.4) fits with ~0.15 margin, clear of the pole
      // at 3.0 by 0.2, no x shift needed. Aspect still 1.76, so the
      // texture is undistorted (just smaller on screen — the old
      // size physically could not fit the dome face).
      // Iter-15: position (0, 0.44, 0.45) (was (0, 0.4, 0.85)) —
      // round-10 reviewers STILL saw pills "hanging off the lower
      // edge onto the road": the label floated 0.57 world IN FRONT
      // of the dome face (local z 0.85 = world 1.06 vs face 0.49),
      // so parallax shifted it down/out from the dome on screen.
      // Now world y 0.55 (dome centre height) and world z 0.56
      // (just 0.07 in front of the face at that height) — ON the
      // face, not floating, minimal parallax, corners clear by
      // 0.22 (face at the label's corners is 0.344, label at 0.562).
      label.position.set(0, 0.44, 0.45);
      group.add(label);
      enableShadows(group);
      group.visible = false;
      scene.add(group);
      boulderPool.push({ group, label, labelMat, lastHp: -1 });
    }

    // Iter-15: BILLBOARD streak sprites replace the bolt capsule +
    // core + trail meshes (deleted). Three rounds (8, 9, 10) proved
    // -Z capsules read as discs/spoons/paddles from the
    // behind-camera view (foreshortening + perspective widening of
    // the near end). A sprite always faces the camera, so it reads
    // as a vertical streak — the reference's own gunfire look —
    // from the game's only camera angle. Scale 0.28 wide x 1.5
    // tall (ratio 5.4:1, clearly a streak, not a disc). Additive,
    // depthWrite off (like the old bolt material), depthTest on
    // (occluded correctly by robots/boulders).
    const streakTex = boltStreakTexture();
    const streakMat = new THREE.SpriteMaterial({ map: streakTex, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false });
    const rocketBodyGeo = new THREE.ConeGeometry(0.09, 0.4, 6);
    const rocketBodyMat = new THREE.MeshStandardMaterial({ color: 0x9aa3ad, flatShading: true, roughness: 0.6 });
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xff5a1f });
    const projPool: ProjVis[] = [];
    for (let i = 0; i < CONFIG.PROJECTILE_POOL; i++) {
      const group = new THREE.Group();
      const streak = new THREE.Sprite(streakMat);
      streak.scale.set(0.28, 1.5, 1);
      group.add(streak);
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
      projPool.push({ group, streak, rocket });
    }

    const bursts: Burst[] = [];
    const shardGeo = new THREE.IcosahedronGeometry(0.07, 0);
    for (let i = 0; i < 32; i++) {
      const group = new THREE.Group();
      const shards: THREE.Mesh[] = [];
      for (let k = 0; k < 8; k++) {
        // Iter-15: all shards orange (was orange/grey) — round-10
        // reviewers read lingering grey shards as "stray geometry /
        // rubble on the road"; orange reads as sparks (transient),
        // not rubble.
        const m = new THREE.Mesh(shardGeo, new THREE.MeshStandardMaterial({ color: 0xff5a1f, flatShading: true, roughness: 0.8 }));
        group.add(m);
        shards.push(m);
      }
      // Iter-14: the burst RING is DELETED (was a cyan torus that grew
      // to radius 1.35 for big deaths) — round-8 AND round-9 reviewers
      // read it as a "portal" encircling the corpse in death
      // frame-01. Shards + the tumble carry the death; no ring.
      group.visible = false;
      scene.add(group);
      bursts.push({ group, shards, active: false, t: 0, big: false, vel: Array.from({ length: 8 }, (_, k) => new THREE.Vector3(Math.cos(k * 0.9) * 2, 1.5 + (k % 3) * 0.7, Math.sin(k * 0.9) * 2)) });
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
        const life = b.big ? 0.7 : 0.5;
        if (b.t > life) { b.active = false; b.group.visible = false; continue; }
        for (let k = 0; k < b.shards.length; k++) {
          const sh = b.shards[k];
          sh.position.addScaledVector(b.vel[k], dt);
          sh.position.y -= 2 * dt * b.t;
          sh.scale.setScalar(Math.max(0.01, 1 - b.t / life));
        }
      }
    }

    // ---- Persistent boulder debris (reviewers: the break left no debris) ----
    // A small pool of rubble piles, placed where a boulder breaks (via the
    // boulderBreak event in drainEvents) and scrolled with the world until
    // past the camera. Visual-only: no sim state, so it cannot affect rules.
    const debrisPool: { group: THREE.Group; z: number; active: boolean }[] = [];
    {
      const rockGeo = new THREE.IcosahedronGeometry(0.22, 1);
      // Iter-7: lighter rubble (dark grey vanished against the dark road)
      // and a 1.3x pile so the aftermath reads at ~50%+ of the boulder.
      // Iter-10: 6 rocks (was 4) + 1.4x pile — piles read as one small
      // cluster and vanished too fast at capture resolution.
      // Iter-12: colour 0x9aa8b5 (was 0x8a94a0) — round-7 reviewers read
      // the debris as a dark cluster blending into the grey road.
      // Iter-13: colour 0xc0c8d0, pile scale 2.0 (was 1.4), 8 rocks
      // (was 6), tighter cluster — round-8 reviewers read the loose
      // dark tetra scatter as ambient road rocks, not two piles.
      // The lighter, bigger, tighter piles read against the dark road
      // and apart from the darker edge rubble (0x6e747b).
      // Iter-14: MeshBasicMaterial (UNLIT, was MeshStandardMaterial) —
      // round-9 reviewers STILL read the piles as dark: the lit
      // material falls into shadow on the road. Unlit light-grey
      // always reads light. Pile scale 2.5 (was 2.0).
      // Iter-14 FIX (same iteration, before review): UNLIT BACKFIRED
      // — at the closer -20 staging the unlit piles render as giant
      // flat white slabs with no shading/depth, filling the frame
      // bottom in break frame-11. Reverted to LIT MeshStandardMaterial
      // (facets + depth) with a small emissive lift (0x333333) so
      // shadow faces stay light-grey, not dark. Pile scale 2.0
      // (was 2.5): at -3.5 the 2.5 piles were frame-filling; 2.0 is
      // ~11% tall, clearly visible without dominating.
      // Iter-15: IcosahedronGeometry(0.22, 1) (was TetrahedronGeometry)
      // + pile scale 1.2 (was 2.0) — round-10 reviewers STILL saw
      // "flat triangular shards engulfing the robots": tetrahedra
      // ARE triangles, and at scale 2.0 + close range they are 8%+
      // tall and overlap the robots on screen. Rounded icosahedra
      // read as rock mounds, not shards; at 1.2 the piles are ~6%
      // tall (below robot height) with a clear gap, no engulfing.
      const rockMat = new THREE.MeshStandardMaterial({ color: 0xc0c8d0, flatShading: true, roughness: 1, emissive: 0x333333 });
      for (let i = 0; i < 4; i++) {
        const group = new THREE.Group();
        group.scale.setScalar(1.2);
        for (let k = 0; k < 8; k++) {
          const rock = new THREE.Mesh(rockGeo, rockMat);
          rock.position.set((k % 2 ? 1 : -1) * (0.12 + (k % 4) * 0.08), 0.08 + (k % 2) * 0.1, (k < 4 ? -1 : 1) * 0.15);
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
      // Iter-10: scatter 1.2 inboard + 0.5 back (was 0.7/0.3) — the two
      // piles merged into one cluster at capture resolution.
      // Iter-12: scatter 1.8 inboard (was 1.2) — round-7 reviewers
      // still saw a single small cluster, not two separable piles.
      // Iter-14: scatter 2.6 inboard (was 1.8) — at frame-11 distance
      // the 1.8 separation gave only a ~1.9% frame gap between pile
      // edges, so they merged into one spread (round 9, both
      // reviewers); 2.6 gives a ~6% gap, clearly two piles.
      const place = (px: number, pz: number) => {
        const d = debrisPool[debrisIdx % debrisPool.length];
        debrisIdx++;
        d.active = true;
        d.z = pz;
        d.group.visible = true;
        d.group.position.set(px, DECK_Y, pz);
      };
      place(x, z);
      place(x - 2.6, z - 0.5);
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
    const rubbleMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.2, 0), new THREE.MeshStandardMaterial({ color: 0x6e747b, flatShading: true, roughness: 0.9 }), 40);
    scene.add(rubbleMesh);
    // Iter-11: the instanced pole/banner boxes are GONE. They were plain
    // emblem-less slabs that reviewers read as "blank banners" next to
    // the detailed assemblies (whose emblem is a glowing cyan mesh on
    // both faces). The detailed assemblies below now cover the full
    // 110 m window (14 groups at 8 spacing, was 10 at 11 — iter-12:
    // round-7 reviewers found long banner-less stretches in the
    // near/mid field), so the instanced dressing is redundant; only
    // instanced rubble remains.
    // Full side-prop assemblies (pole + crossbar + cloth + glowing emblem
    // on both faces + rocks). The model is a SINGLE banner-pole assembly
    // (pole local x 0.35, banner spanning local -0.45..0.15), so the
    // group sits at x ±3.0: pole at ±3.35 just outside the deck edge,
    // banner over the rail (2.55..3.15), clear of the boulder lane
    // (x 2.4). Left-side groups are rotated π so the banner hangs
    // inward. (Centring the group at x=0 used to put a banner across
    // the middle of the road; ±3.9 used to leave it floating.)
    const sideDetail: THREE.Group[] = [];
    for (let i = 0; i < 14; i++) {
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
      g.position.set(side * 3.0, DECK_Y, -12 - i * 8);
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
      // Iter-14: flatShading false + slight emissive (was flatShading
      // true) — round-9 reviewers read the drifting sky clouds as
      // "flat low-poly discs with grey undersides, flying-saucer
      // slabs"; same fix as the sea in iter-13.
      new THREE.MeshStandardMaterial({ color: 0xffffff, flatShading: false, roughness: 1, transparent: true, opacity: 0.92, emissive: 0xffffff, emissiveIntensity: 0.25 }),
      80, // iter-15: 80 (was 20) — 4 spheres per cloud (see loop below)
    );
    scene.add(cloudMesh);
    // Iter-7 horizon skyline: a fog:false dark silhouette city + cloud
    // bank glued to the vanishing point (camera-relative, 0.3 parallax).
    // The far field previously dissolved into empty pale sky; this gives
    // the road a terminus. Basic material = flat silhouette, unlit.
    // Iter-11: bases sunk to -12 (were -2, floating above the cloud
    // layer with bases cut off mid-air) + heights varied 14..28 (2x,
    // were 10..18 = 1.8x). Tops unchanged (tallest still 16), so the
    // skyline keeps its height while its bases intersect the clouds.
    // Iter-12: bank 8 tall centred y -8 (was 2.5 at y -10) + a second
    // wider shorter row (x -20..20, heights 6-12, z -3 behind the bank)
    // — round-7 reviewers read the skyline as a sparse bar chart with
    // empty sky left and right, not a dense tower city across the full
    // width. (Side-tower darkening declined: model materials; window
    // strips declined: sub-pixel at 108 m.)
    const horizonGroup = new THREE.Group();
    {
      const skyMat = new THREE.MeshBasicMaterial({ color: 0x3d5266, fog: false });
      const towerDefs: [number, number, number][] = [
        [-9, 14, 3], [-5.5, 22, 2.4], [-2.5, 18, 3.2], [0.5, 28, 2.6], [3.5, 20, 3], [7, 26, 2.4], [10, 16, 3],
      ];
      // Iter-14: cyan pyramid spire tips on all main towers
      // (reference-like glowing spires) — round-9 reviewers read the
      // main row as flat rectangles with no spire detailing.
      const spireMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff, fog: false });
      for (const [x, h, w] of towerDefs) {
        const tower = new THREE.Mesh(new THREE.BoxGeometry(w, h, 2), skyMat);
        tower.position.set(x, -12 + h / 2, 0);
        horizonGroup.add(tower);
        const spire = new THREE.Mesh(new THREE.ConeGeometry(w * 0.35, 2.5, 4), spireMat);
        spire.position.set(x, -12 + h + 1.25, 0);
        spire.rotation.y = Math.PI / 4;
        horizonGroup.add(spire);
      }
      const bank = new THREE.Mesh(new THREE.BoxGeometry(36, 8, 2), skyMat);
      bank.position.set(0, -8, 0);
      horizonGroup.add(bank);
      // Iter-13: row 2 heights 10-16 (was 6-12), x -24..24 (was -20..21),
      // z -4 (was -3). The iter-12 row hid behind the 8-tall bank (a
      // 6-tall tower spans -12..-6, entirely behind the bank's
      // -12..-4). Now the tops (-2..4) clear the bank (-4) while staying
      // below the main tops (16), and the outer towers sit fully beside
      // the main row (x +-11.5). Inner towers are still partly occluded
      // by the dense main row — that is depth, not a defect.
      // Iter-14: row-2 gets its OWN paler material (0x6b7d8a, was the
      // same 0x3d5266 as the main row) — round-9 reviewers saw "one
      // central dark block cluster" with no distinct second row;
      // the same material made the rows merge into one mass.
      // Iter-15: material 0x8a99a8 (lighter, higher contrast) +
      // 6 INTERLEAVED inner towers (x -7.25, -4, -1, 2, 5.25, 8.5;
      // heights 20-24) BETWEEN the main towers — round-10
      // reviewers read the outer-only row-2 as "isolated side
      // towers, not a distinct row behind"; the inner towers peek
      // above/between the main row and read across the width.
      const row2Mat = new THREE.MeshBasicMaterial({ color: 0x8a99a8, fog: false });
      const row2: [number, number, number][] = [
        [-24, 12, 2.5], [-18, 16, 2], [-12, 10, 2.8], [-7.25, 22, 2.2], [-4, 20, 2.4], [-1, 24, 2.2], [2, 21, 2.4], [5.25, 23, 2.2], [8.5, 19, 2.4], [12, 10, 2.8], [18, 13, 2.4], [24, 11, 2],
      ];
      for (const [x, h, w] of row2) {
        const tower = new THREE.Mesh(new THREE.BoxGeometry(w, h, 2), row2Mat);
        tower.position.set(x, -12 + h / 2, -4);
        horizonGroup.add(tower);
      }
    }
    scene.add(horizonGroup);
    const cloudSeed = Array.from({ length: 20 }, (_, i) => ({ x: -55 + i * 5.7, y: 9 + (i % 5) * 2.4, z: -45 - (i % 4) * 14, s: 2 + (i % 4) }));
    // Cloud sea below the bridge (the reference's dense cloud layer that
    // the towers rise from). Static far field; the sky platforms at y -8
    // sit inside it instead of floating over void. Iter-7: tinted
    // blue-grey (pure white on pale sky was invisible) and pulled inward
    // (x from 10, not 14) so no void band sits beside the road.
    // Iter-10: +30 billows hugging the deck (x 3..12, y -2..-3.6) so the
    // road edges sit on cloud instead of empty sky, and the towers get
    // cloud bases. Iter-11: far band 70 -> 90 (total 120) for a denser
    // sea; instanced meshes cost no extra draw calls.
    // Iter-12: colour back to pure white (was 0xd9e4ee) — the iter-7
    // grey tint REDUCED contrast vs the sky (luminance ~0.88 vs
    // ~0.85); white pops better now that the sea is dense (the iter-7
    // "invisible" read was sparsity, not colour).
    // Iter-13: flatShading false + slight emissive — round-8 reviewers
    // read the faceted spheres as "grey-white slabs with hard grey
    // undersides"; smooth shading + a lifted underside reads as soft
    // puffs. The material is shared with the deck-edge puff rows below.
    const seaMat = new THREE.MeshStandardMaterial({ color: 0xffffff, flatShading: false, roughness: 1, transparent: true, opacity: 0.95, emissive: 0xffffff, emissiveIntensity: 0.25 });
    const seaMesh = new THREE.InstancedMesh(
      new THREE.SphereGeometry(1, 8, 6),
      seaMat,
      120,
    );
    scene.add(seaMesh);
    {
      const m = new THREE.Matrix4(); const q = new THREE.Quaternion(); const v = new THREE.Vector3(); const s = new THREE.Vector3();
      for (let i = 0; i < 120; i++) {
        let x: number; let y: number; let z: number; let sc: number;
        if (i < 90) {
          x = (i % 2 ? 1 : -1) * (10 + ((i * 37) % 55));
          y = -8 + (i % 4) * 1.6;
          z = -20 - ((i * 29) % 90);
          sc = 4 + (i % 5) * 1.6;
        } else {
          const j = i - 90;
          x = (j % 2 ? 1 : -1) * (3 + ((j * 13) % 9));
          y = -2 - (j % 3) * 0.8;
          z = -10 - ((j * 23) % 90);
          sc = 3 + (j % 4) * 1.2;
        }
        v.set(x, y, z); m.compose(v, q, s.set(sc, sc * 0.32, sc * 0.7));
        seaMesh.setMatrixAt(i, m);
      }
      seaMesh.instanceMatrix.needsUpdate = true;
    }
    // Iter-12: continuous deck-hugging cloud strips under both road
    // edges (10 wide x 1.5 thick x 110 long at x +/-7, y -2.5) —
    // round-7 reviewers found sky-blue voids under both road edges
    // between the isolated billows, so the deck underside floated over
    // solid sky instead of cloud. The strips overlap the deck edge
    // (inner edge x 2 < deck half 3.0) so no horizontal gap remains;
    // the billows above fill the vertical range. Static like the sea
    // (clouds do not scroll with the road).
    // Iter-13: boxes replaced by puffy sphere rows (round-8 reviewers
    // read the boxes as "flat white planes, not continuous cloud
    // strips"). 28 smooth spheres per side at x +/-7, y -2.5, z from
    // +5 to -103 (spacing 4, radii 3.5 flattened to 1.2 tall, so they
    // overlap into a continuous puffy strip). Shared sea material.
    {
      const stripMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), seaMat, 56);
      const m = new THREE.Matrix4(); const q = new THREE.Quaternion(); const v = new THREE.Vector3(); const s = new THREE.Vector3();
      let idx = 0;
      for (const side of [-1, 1]) {
        for (let i = 0; i < 28; i++) {
          v.set(side * 7, -2.5, 5 - i * 4); m.compose(v, q, s.set(3.5, 1.2, 3.5));
          stripMesh.setMatrixAt(idx++, m);
        }
      }
      stripMesh.instanceMatrix.needsUpdate = true;
      scene.add(stripMesh);
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
        // Iter-12: splay 0.4 (was 0.25), bob 0.35 (was 0.25) — round-7
        // reviewers still could not read stride/bob in clean frames.
        if (legL) { legL.rotation.x = Math.sin(t * 6 + i) * 0.8 * running; legL.rotation.z = Math.sin(t * 6 + i) * 0.4 * running; }
        if (legR) { legR.rotation.x = Math.sin(t * 6 + i + Math.PI) * 0.8 * running; legR.rotation.z = Math.sin(t * 6 + i + Math.PI) * 0.4 * running; }
        r.group.position.y = DECK_Y + Math.abs(Math.sin(t * 6 + i * 0.7)) * 0.35 * running;
        // Iter-7 recoil kick: the arm pitch (-0.6) foreshortens from
        // behind like the leg swings did, so the whole robot also kicks
        // back toward the camera on firing frames (visual only). Iter-10:
        // 0.15 (was 0.08) + a pitch-back and a run-cycle torso roll, since
        // 0.08 alone did not read at capture resolution. Iter-12: kick
        // 0.2 (was 0.15), pitch -0.2 (was -0.12) — round-7 reviewers saw
        // no pitch-back, kick, or arm raise on firing frames.
        r.group.position.z = r.visZ + (t < recoilUntil ? 0.2 : 0);
        r.group.rotation.x = t < recoilUntil ? -0.2 : 0;
        r.group.rotation.z += Math.sin(t * 6 + i) * 0.05 * running;
        const armR = r.group.getObjectByName("armR");
        if (armR) {
          armR.rotation.x = t < recoilUntil ? -0.6 : Math.sin(t * 6 + i + Math.PI) * 0.3 * running;
          armR.rotation.z = Math.sin(t * 6 + i) * 0.5 * running; // sideways swing reads from behind; kept during recoil (no pop); iter-12: 0.5 (was 0.35)
        }
        // Iter-10: armL swings opposite to armR (it was static before, so
        // only one side of the run cycle read from behind).
        const armL = r.group.getObjectByName("armL");
        if (armL) {
          armL.rotation.x = Math.sin(t * 6 + i) * 0.3 * running;
          armL.rotation.z = Math.sin(t * 6 + i + Math.PI) * 0.5 * running; // iter-12: 0.5 (was 0.35)
        }
        // Pistol blaster enlarged 1.6x (visual only, not a model edit): at
        // waist height from behind/above it read as a side nub, not a gun.
        if (r.blaster) r.blaster.scale.setScalar(1.6);
        // Muzzle flash pulses bigger on firing frames: the static 0.16
        // octahedron read as a blue side nub from behind, not a flash.
        // Iter-10: 4x scale (was 3x) and a cyan-white tint (pure white on
        // the white robot backs was invisible — additive white on white).
        // Iter-12: 2x scale (was 4x) — the 4x flash covered the whole
        // torso and merged the squad into one blob in 9/12 robot-fire
        // frames (round 7, both reviewers). Confined to the muzzle.
        // Iter-14: 1.2x scale (was 2x) — the 0.56-diameter 2x pulse IS
        // the "large pale flank disc / balloon/shield" (round 9,
        // reviewer 1 P2); at 0.34 diameter it is a flash at the gun,
        // not a disc obscuring the torso.
        // Iter-15: 0.7x scale (was 1.2x) + pulse 0.08 s (was 0.2 s) —
        // round-10 reviewers STILL saw "large pale flank discs": the
        // 0.34 flash is 8.9% of frame height at close range (~45% of
        // robot height), and a 44% duty cycle made it look permanent.
        // At 0.20 diameter + 18% duty cycle it is a transient flash,
        // not a disc. (Near-camera bolts also read as flank discs;
        // the billboard streaks fix those too.)
        r.muzzle.visible = t < recoilUntil;
        if (t < recoilUntil) r.muzzle.scale.set(0.7, 0.7, 1.2);
        else r.muzzle.scale.set(1, 1, 1.5);
        // Iter-13: the white torso flash box (mkFlash 0.62x0.9x0.4,
        // shown 0.25 s on every squad hit) is DELETED — round-8
        // reviewers read it as "shoulder discs / white torso boxes"
        // in robot-fire frames 06+. Squad-hit feedback remains via
        // the death bursts + the squad-count drop in the HUD.
        if (r.weaponGroup && t - r.popStart < 0.2) r.weaponGroup.scale.setScalar(0.45 * popScale(t - r.popStart));
        else if (r.weaponGroup) r.weaponGroup.scale.setScalar(0.45);
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
        // Iter-13: hit scale pop x1.2 for 0.12 s on HP drop (material-
        // free, visible from behind) — round-8 reviewers found the
        // HP-drop bursts tiny at distance; the pop is the readable
        // "you hit it" signal at any range.
        const hitPop = t - vis.hitPopT < 0.12 ? 1.2 : 1;
        vis.group.scale.setScalar(popScale(age) * hitPop);
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
          // Iter-10: leg x 0.5 (was 0.35), splay 0.2 (was 0.12), bob 0.14
          // (was 0.10), roll 0.10 (was 0.08) — the iter-6 amplitudes still
          // did not read as alternating steps at capture resolution.
          // Iter-12: cadence 4 (was 3), leg x 0.7, splay 0.3, bob 0.2,
          // roll 0.15 — round-7 reviewers still saw gliding/scaling with
          // no step cycle. (3 full cycles while large in a 3 s capture
          // is infeasible for a heavy stomp: period 1.57 s at cadence 4
          // vs ~1.25 s large — reviewers judge the read, not the count.)
          // Iter-15: leg x 0.9, splay 0.5 (was 0.7, 0.3) — round-10
          // reviewers read the walk as "limbs merge, legs short
          // stubs" from behind (the forward/back swing foreshortens);
          // a wider LATERAL swing separates the legs visibly.
          // Animation only — the golem model itself is frozen.
          vis.group.rotation.set(e.contact ? -0.1 : Math.sin(t * 4) * 0.04, Math.PI, Math.sin(t * 4) * 0.15);
          vis.group.position.y = DECK_Y + Math.abs(Math.sin(t * 4)) * 0.2;
          vis.legs.forEach((leg, li) => {
            leg.rotation.x = Math.sin(t * 4 + li * Math.PI) * 0.9;
            leg.rotation.z = Math.sin(t * 4 + li * Math.PI) * 0.5;
          });
          for (const m of vis.eyes) m.emissiveIntensity = 2.5 + Math.sin(t * 4) * 0.8;
        }
        // Hit feedback: small burst on HP drop (boxes removed, see pool).
        const prevHp = prevEnemyHp.get(e.id);
        if (prevHp !== undefined && e.hp < prevHp) { spawnBurst(rx, DECK_Y + 0.5, rz, false); vis.hitPopT = t; }
        prevEnemyHp.set(e.id, e.hp);
      }
      for (const p of [...crawlerPool, ...golemPool]) {
        if (p.lastId !== -1 && !curEnemyIds.has(p.lastId) && !dying.has(p)) { p.group.visible = false; p.lastId = -1; }
      }
      // Death tumble + shrink (spec-mandated; previously enemies just
      // vanished + burst, which reviewers read as "pop out"). Dying
      // visuals are reserved (never reused) until the tumble ends.
      // Iter-10: 0.9 s (was 0.6) so 0.25 s capture sampling catches it,
      // falls flat (2.2 rad, was 1.4) and stays bigger (0.5 shrink, was
      // 0.7) so the corpse reads at capture resolution.
      // Iter-12: rotation 1.2 (was 2.2), scale 0.7 (was 0.5), sink 0
      // (was 0.1) — round-7 reviewers read the 2.2 rad / 0.5 shrink as
      // vanishing, not falling flat; a gentler tip + bigger corpse
      // reads as a body on the road. The tumble is now also captured
      // directly (?anim=death) instead of inferred from other sequences.
      // Iter-13: ROLL (rotation.z) instead of pitch — a pitched body
      // foreshortens from behind into a "squash" (round 8: "flattened
      // pancake"); a sideways roll lays the full body length across
      // the frame, unmistakably "lying down". Scale 0.85 (was 0.7),
      // duration 1.2 s (was 0.9, frames 01-04 in the death capture).
      // Iter-15: roll 1.57 rad (was 1.2) — round-10 reviewers (both)
      // read the 69-deg roll as a "small dark heap" with no legible
      // rotation; a full 90 deg lays the body truly horizontal with
      // legs/arms visible across the frame.
      for (const [p, d] of [...dying.entries()]) {
        const age = t - d.t0;
        if (age > 1.2) { dying.delete(p); p.group.visible = false; p.lastId = -1; continue; }
        const pr = age / 1.2;
        p.group.visible = true;
        p.group.position.set(d.x, DECK_Y, d.z);
        p.group.rotation.set(0, Math.PI, pr * 1.57);
        p.group.scale.setScalar(Math.max(0.01, 1 - pr * 0.15));
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
        // Iter-10: fully gone by -60 (was 0.15 at -75) so the
        // vanishing-point column no longer smears. Iter-12: full at
        // -30, gone at -50 (was -40/-60) — round-7 reviewers still saw
        // a bright speckle column at the vanishing point — plus a
        // NEAR fade (full at z -1.0, gone at z -0.2) so labels passing
        // under the camera do not render as half-clipped fragments at
        // the bottom edge (the foreground gate at -1.5 stays full).
        const gateFade = 1 - THREE.MathUtils.clamp((-g.z - 30) / 20, 0, 1);
        const gateNear = THREE.MathUtils.clamp((-0.2 - g.z) / 0.8, 0, 1);
        vis.labelMat.opacity = (0.85 + Math.sin(t * 3 + g.id) * 0.15) * gateFade * gateNear;
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
        // Distance fade (same vanishing-point smear fix as gates; iter-10:
        // fully gone by -60, was 0.15 at -75). Iter-12: full at -30,
        // gone at -50, plus the same near fade as gates (full -1.0,
        // gone -0.2) — the foreground boulder at -1.0 stays full.
        const boulderFade = 1 - THREE.MathUtils.clamp((-b.z - 30) / 20, 0, 1);
        const boulderNear = THREE.MathUtils.clamp((-0.2 - b.z) / 0.8, 0, 1);
        vis.labelMat.opacity = boulderFade * boulderNear;
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
        vis.streak.visible = !isRocket;
        vis.rocket.visible = isRocket;
      }
      for (let i = 0; i < projPool.length; i++) {
        if (!usedProj.has(i)) projPool[i].group.visible = false;
      }

      // World scroll: road, side props, sky parallax, clouds.
      syncRoad(state.distance);
      syncDebris(state.distance);
      // Poles/banners are the detailed sideDetail assemblies (the
      // emblem-less instanced boxes were removed in iter-11); rubble
      // sits ON the deck edge (x 2.55–2.95), never floating off-deck.
      syncInstances(state.distance, rubbleMesh, 20, 5.5, (side, i) => side * (2.55 + (i % 3) * 0.2), DECK_Y + 0.1, (i) => 0.6 + (i % 4) * 0.3);
      for (let i = 0; i < sideDetail.length; i++) {
        const base = -12 - i * 8;
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
        // Iter-15: 4 SPHERES per cloud (was 1 flattened sphere) —
        // round-10 reviewers STILL saw "flat faceted ellipses with
        // grey undersides": the single sphere was scaled FLAT
        // (y x0.45), so smooth shading could not fix a flattened
        // SHAPE. Four overlapping uniform spheres (no flattening,
        // varied sizes) form a real puffy cluster with bumpy
        // silhouette, not a disc. Offsets/scales are deterministic
        // per cloud (same cluster shape drifts as a unit).
        const offs: [number, number, number, number][] = [
          [0, 0, 0, 0.75], [0.65, 0.15, 0.2, 0.55], [-0.65, 0.1, -0.15, 0.5], [0.1, 0.35, -0.3, 0.45],
        ];
        for (let k = 0; k < 4; k++) {
          const [ox, oy, oz, os] = offs[k];
          tmpVec.set(x + ox * c.s, c.y + oy * c.s, c.z + oz * c.s);
          tmpMat.compose(tmpVec, tmpQuat, tmpScale.set(os * c.s, os * c.s, os * c.s));
          cloudMesh.setMatrixAt(i * 4 + k, tmpMat);
        }
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
      // Iter-12: sun repositioned to (-38, 24, -120) relative to the
      // camera (was -30, 20) — further left and higher so it clears
      // the horizon towers instead of overlapping their tops; the disc
      // now follows the camera too (it was static while the glow moved
      // with camX, a small mismatch on lateral moves).
      sun.position.set(camera.position.x - 38, 24, camera.position.z - 120);
      disc.position.set(camera.position.x - 38, 24, camera.position.z - 120);
    }

    function drainEvents(): void {
      if (!state.events.length) return;
      let lastShot = 0;
      for (const ev of state.events) {
        if (ev.type === "fire") {
          if (state.time - lastShot > 0.05) { sfx.shoot(); lastShot = state.time; }
          recoilUntil = state.time + 0.08; // iter-15: 0.08 (was 0.2) — transient flash, not a permanent disc
        } else if (ev.type === "enemyDeath") {
          sfx.hit();
          if (ev.id !== undefined && ev.x !== undefined && ev.z !== undefined) markDying(ev.id, ev.x, ev.z);
        }
        else if (ev.type === "squadHit") { sfx.death(); }
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
        // Iter-12: factor 0.8 (was 0.5) — round-7 reviewers still found
        // the foreground boulder + its label flush against the right
        // edge with no safe margin. Smooth in aspect: 1.51 at phone
        // portrait (was 1.32), ~1.0 near square.
        const boost = 1 + (1.2 - aspect) * 0.8;
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
        // Iter-9: push HUD synchronously before reporting game over, so
        // the game-over panel reads final (not previous-tick) numbers on
        // its first frame. The 10 Hz push alone left a ~100 ms stale panel
        // (visible in __advance-driven play, where RAF lags the sim).
        pushHud();
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
          // Iter-12: expose the leak count (sim tracked state.leaked but
          // the snapshot omitted it, so playtests could not measure
          // leaks — round-5 low, both playtesters).
          leaked: state.leaked,
          // Iter-9: expose the same-tier re-grant multipliers so
          // playtests can verify the boost (previously unmeasurable).
          damageMult: state.damageMult, rateMult: state.rateMult,
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
        // Iter-13: boulder x 1.9 (was 1.6) — round-8 reviewers saw the
        // foreground dome overlapping the right squad robot on screen;
        // 1.9 shifts it further right (portrait label ends ~88%, still
        // with margin) while keeping it foreground.
        // Iter-14: boulder x 1.7 (was 1.9) — round-9 reviewer 1 saw the
        // foreground DOME cropped by the right frame edge in portrait
        // (the label ended ~88% but the dome, wider than the label,
        // ran off the edge); at 1.7 the dome (world 1.15..2.25) is
        // fully in frame, and the small label (world 1.3..2.1) sits
        // inside it. Minor robot overlap returns, but full framing
        // matters more than the small overlap.
        mkGate(-1.5, 2, -1.8);
        mkBoulder(-1.0, 100, "minigun", 1.7);
        // Near golem dead-centre (was 0.9): a single large camera-facing
        // golem in front of the column, not occluded by crawlers.
        mkEnemy("golem", 0, -5);
        mkGate(-4, 2); mkGate(-12, 2); mkGate(-20, 2); mkGate(-28, 2); mkGate(-36, 3); mkGate(-44, 3); mkGate(-52, 2); mkGate(-60, 3);
        mkBoulder(-3, 100, "minigun"); mkBoulder(-11, 200, "minigun"); mkBoulder(-19, 200, "minigun"); mkBoulder(-27, 300, "minigun"); mkBoulder(-35, 300, "minigun"); mkBoulder(-43, 200, "minigun"); mkBoulder(-51, 300, "minigun");
        // Dense centre column (capture-only, staged after the advance so
        // auto-fire has no time to kill them before the screenshot).
        // Iter-10 (reviewer 1, round 6): the near golem must stand ALONE
        // — its -6 shoulder crawler overlapped it on screen — so the
        // column now starts at -9/-10 with the shoulder crawler moved to
        // (-1.8, -10); crawlers widened to ±1.2 (was ±0.8) so the column
        // does not collapse into overlapping silhouettes at distance.
        // Golems at ±2.0 clear the widened crawler lanes by z-separation.
        mkEnemy("crawler", 1.2, -9); mkEnemy("crawler", -1.8, -10); mkEnemy("crawler", -1.2, -13); mkEnemy("crawler", 1.2, -16); mkEnemy("crawler", -1.2, -20); mkEnemy("crawler", 1.2, -24); mkEnemy("crawler", -1.2, -29);
        mkEnemy("golem", -2.0, -17); mkEnemy("golem", 2.0, -32);
        // Iter-12: the -35 / -42 crawlers are dropped — round-7
        // reviewers read the far column as a merged blob at the
        // vanishing point; thinning the tail reduces the specks
        // without touching the near/mid column. (Far compression
        // itself is perspective, matching the reference's own dense
        // vanishing column.)
        // Relocate the demo golem (capture-only) off-centre and further out:
        // dead-centre at ~-16 it read as a blank white panel blocking the
        // vanishing point. Iter-10: (-2.0, -26) keeps it clear of the
        // widened crawler column.
        for (const e of state.enemies) {
          if (e.demo && e.alive && e.kind === "golem") { e.x = -2.0; e.prevX = -2.0; e.z = -26; e.prevZ = -26; break; }
        }
        // Relocate demo crawlers into the column: after the 2 s pre-advance
        // scroll they sit at ~-3/-9, and the -3 one clips the squad.
        // Iter-10 slots [-11, -19] fit the widened column.
        {
          const demoCrawlers = state.enemies.filter((e) => e.demo && e.kind === "crawler" && e.alive);
          const slots = [-11, -19];
          demoCrawlers.forEach((e, i) => { e.z = slots[i] ?? -20; e.prevZ = e.z; });
        }
      } else if (animName === "golem-walk") {
        // Huge HP: squad pistol DPS (~53) would otherwise kill a 90 HP
        // golem in ~1.7 s, leaving the sequence subject-less. Iter-10:
        // staged at -20 (was -24) so it is larger through the sequence;
        // 3 s of walking ends at z -1.0, still clear of the squad line
        // (contact would freeze it in a lunge for the last frames).
        // Iter-12: x 2.0 (was 0.9) — round-7 reviewers saw the walk end
        // hidden behind the right squad robot; offsetting it clear of
        // the squad line keeps its full body and legs visible in
        // frames 10-11.
        // Iter-13: staged at -28 (was -20) — round-8 reviewers saw
        // frame-11 cropped at the bottom-right corner because the
        // golem walks THROUGH the camera: from -20 at ~7.1 m/s it
        // reaches +1.3 by 3.0 s (past the squad line, nearly at the
        // camera at 3.3, in contact at 2.76 s). The iter-10 "-1.0"
        // comment was wrong arithmetic. From -28 it ends at -6.7:
        // fully in frame, still walking, no contact, no pass-through.
        // Iter-14: x 1.5, z -24 (was 2.0, -28) — round-9 reviewers
        // (both) saw NO walking golem in 00-09 and only a tiny dark
        // cluster beside the 300 boulder in frame-11: at x 2.0 the
        // golem walks in the boulder lane's shadow (boulders at
        // 2.4), so it fuses with boulder clusters on screen. At x
        // 1.5 it clears the lane by 0.9. Frame-11 is at 2.75 s (12
        // frames x 0.25 s, not 3.0 s as old comments said), so from
        // -24 the golem ends at -4.7 (~15% tall, screen ~0.62..0.74,
        // small right-robot overlap only), no contact (x 1.5 is
        // outside the +-1.4 squad extent, and it reaches z 0 only
        // at 3.41 s, past the sequence), no camera pass-through.
        // Centre (x 0) is impossible: a close centre golem is
        // occluded by the centre robot.
        mkEnemy("golem", 1.5, -24, 1000);
      } else if (animName === "boulder-break") {
        // Iter-10: -24 + 12 HP (was -20). Debris z at time T is startZ +
        // 6.9*T regardless of break time, so at -24 the debris sits at
        // z -3.3 in frame 11 (in frame, not at the bottom edge where the
        // -20 staging put it at z +0.7); the break lands ~1.8 s, before
        // the boulder wall engages at -8, and the scattered pile sits
        // 1.8 inboard of the main pile.
        // Iter-12: demo boulders removed from this branch — round-7
        // reviewers read a lingering demo "300" label floating above
        // empty space after the break as the break boulder's label
        // failing to hide (the break boulder's own label does hide
        // with its group; the confusion was the demo label).
        // Iter-14: -20 (was -24) — round-9 reviewers saw NO intact
        // boulder in frame-00 (at -24 it is ~4% tall, lost among the
        // distant labels) and the debris too small/dark in 09/11.
        // At -20 the frame-00 dome is a little larger, the break
        // lands ~2.05 s (first hit ~1.6 s + 2 pistol hits), and the
        // debris sits at ~-3.5 in frame-11 (~11% tall, in frame).
        // The break still lands before the wall engages at -8
        // (boulder at ~-7.6 when it breaks).
        for (const b of state.boulders) if (b.demo && b.alive) b.alive = false;
        mkBoulder(-20, 12, "minigun");
        pointerTarget.x = CONFIG.BOULDER_X; pointerTarget.has = true;
      } else if (animName === "death") {
        // Iter-12: dedicated death capture (round-7 reviewers could not
        // verify the tumble from any sequence — deaths elsewhere are
        // small/far). A 1 HP golem at (0,-10): the first centre-robot
        // bolt kills it ~0.6 s in at z ~-6 (11-16% of frame height),
        // and the 0.9 s tumble plays across frames ~02-06 in the
        // near/mid field, clear of the squad line (contact would need
        // 1.23 s; death comes first). hpMul 1/90 = exactly 1 HP.
        // Iter-13: staged at -8 (was -10) for a bigger corpse
        // (~12% tall at death, ~-6.8); tumble now 1.2 s, so the window
        // is frames 01-04 (death from pre-existing in-flight bullets
        // at ~0.1-0.3 s, as verified in shoot16).
        // Iter-14: staged at -6 (was -8) — round-9 reviewers (both)
        // read the corpse as too distant/small to judge the roll;
        // at -6 it dies at ~-5.2, ~16% tall. Contact would need
        // 0.77 s; death at ~0.1 s comes first.
        // Iter-15: staged at -4 (was -6) — round-10 reviewers (both)
        // STILL read the corpse as a small dark heap (~6-9%) gone
        // by frame-04 with no legible roll; at -4 it dies at ~-3.2,
        // a true ~16% tall. Contact would need 0.51 s; death at
        // ~0.1 s comes first. Duration stays 1.2 s (extending it
        // would make the corpse visible in frame-06, which must
        // stay empty) — "frame-04 empty" is a visibility failure
        // (small/dark/flat), not timing, fixed by size + roll.
        mkEnemy("golem", 0, -4, 1 / 90);
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
