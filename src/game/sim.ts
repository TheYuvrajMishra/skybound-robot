/**
 * Pure, deterministic game simulation. No three.js, no DOM, no Math.random.
 * Tick order (deterministic): input -> movement -> spawn -> fire ->
 * projectile hits -> contacts -> gate/boulder resolution -> deaths -> score.
 * The squad stays at z=0; the world scrolls toward the camera (+Z).
 */
import { CONFIG, WEAPONS, type WeaponId } from "../config/game";
import { nextGateDistance, nextBoulderDistance, pickGateMult, pickBoulderTier } from "../config/spawn";
import { createRng, type Rng } from "./rng";

export type EnemyKind = "crawler" | "golem";

export interface Enemy {
  id: number; kind: EnemyKind;
  x: number; z: number; prevX: number; prevZ: number;
  hp: number; maxHp: number; speed: number; radius: number;
  alive: boolean; contact: boolean; attackCd: number;
  spawnTime: number; flashUntil: number;
  // demo: start-screen decoration. Demo entities render and scroll but
  // never damage, multiply, grant, push, or absorb bullets in live play
  // (a demo golem used to wipe a fresh 3-robot squad at ~4 s when the
  // player steered right, because the widened formation overlaps it).
  demo?: boolean;
}

export interface Projectile {
  id: number; weapon: WeaponId;
  x: number; z: number; prevX: number; prevZ: number;
  vx: number; vz: number; damage: number; aoe: number;
  homing: boolean; pierce: boolean; alive: boolean;
  hitIds: Set<number>;
}

export interface Gate {
  id: number; x: number; z: number; prevZ: number; mult: number;
  triggered: boolean; alive: boolean; flashUntil: number;
  demo?: boolean;
}

export interface Boulder {
  id: number; x: number; z: number; prevZ: number;
  hp: number; maxHp: number; tier: WeaponId;
  granted: boolean; alive: boolean; shakeUntil: number; pendingGrant: boolean;
  demo?: boolean;
}

export interface SimEvent {
  type: "fire" | "enemyDeath" | "squadHit" | "gate" | "boulderGrant" | "boulderBreak" | "leak" | "gameOver" | "spawn";
  weapon?: WeaponId; count?: number; mult?: number; kind?: string;
  x?: number; z?: number; // boulderBreak: where the boulder broke (debris placement); enemyDeath: death position + id
  id?: number;
}

export interface SimInput {
  targetX?: number;
  keyDir?: number; // -1 left, +1 right, 0 none
  godMode?: boolean;
}

export interface SimState {
  seed: number; rng: Rng;
  time: number; distance: number; scrollSpeed: number;
  score: number; kills: number; leaked: number;
  squadCount: number; squadX: number; prevSquadX: number; targetX: number; velX: number;
  weapon: WeaponId; damageMult: number; rateMult: number;
  enemies: Enemy[]; projectiles: Projectile[]; gates: Gate[]; boulders: Boulder[];
  nextId: number; nextGateDist: number; nextBoulderDist: number;
  waveTimer: number; waveNumber: number; robotFire: number[];
  events: SimEvent[]; dying: boolean; dyingTimer: number; gameOver: boolean;
}

export function createState(seed = 1337): SimState {
  const rng = createRng(seed);
  return {
    seed, rng,
    time: 0, distance: 0, scrollSpeed: CONFIG.SCROLL_BASE,
    score: 0, kills: 0, leaked: 0,
    squadCount: CONFIG.START_SQUAD, squadX: 0, prevSquadX: 0, targetX: 0, velX: 0,
    weapon: "pistol", damageMult: 1, rateMult: 1,
    enemies: [], projectiles: [], gates: [], boulders: [],
    nextId: 1, nextGateDist: 40, nextBoulderDist: 70,
    waveTimer: CONFIG.WAVE_FIRST_AT, waveNumber: 0,
    robotFire: Array.from({ length: CONFIG.MAX_SQUAD }, (_, i) => 0.2 + i * 0.03),
    events: [], dying: false, dyingTimer: 0, gameOver: false,
  };
}

/** Formation slots: front row at z=0, rows behind toward the camera. */
export function formationSlots(count: number): { x: number; z: number }[] {
  const n = Math.min(count, CONFIG.MAX_VISIBLE);
  const cols = Math.min(5, Math.max(1, n));
  const slots: { x: number; z: number }[] = [];
  for (let i = 0; i < n; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const rowCols = Math.min(cols, n - row * cols);
    // 0.8 spacing: at 0.55 the robots touched shoulder-to-shoulder and read
    // as one fused blob; 0.8 leaves a clear gap between neighbours.
    slots.push({ x: (col - (rowCols - 1) / 2) * 0.8, z: row * 0.65 });
  }
  return slots;
}

export function formationHalf(count: number): number {
  const slots = formationSlots(count);
  let half = 0.25;
  for (const s of slots) half = Math.max(half, Math.abs(s.x) + 0.25);
  return half;
}

function clamp(v: number, lo: number, hi: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.min(hi, Math.max(lo, v));
}

/** Segment (2D, XZ) vs AABB slab test. Returns t in [0,1] or null. */
export function segmentBoxT(
  px: number, pz: number, qx: number, qz: number,
  minX: number, maxX: number, minZ: number, maxZ: number,
): number | null {
  let tmin = 0; let tmax = 1;
  const dx = qx - px; const dz = qz - pz;
  const axes: [number, number, number, number][] = [
    [px, dx, minX, maxX],
    [pz, dz, minZ, maxZ],
  ];
  for (const [p, d, mn, mx] of axes) {
    if (Math.abs(d) < 1e-9) {
      if (p < mn || p > mx) return null;
    } else {
      let t1 = (mn - p) / d; let t2 = (mx - p) / d;
      if (t1 > t2) [t1, t2] = [t2, t1];
      tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
      if (tmin > tmax) return null;
    }
  }
  return tmin;
}

function spawnEnemy(s: SimState, kind: EnemyKind, x: number, z: number): void {
  const base = kind === "crawler" ? CONFIG.CRAWLER : CONFIG.GOLEM;
  const hpScale = Math.min(2.5, 1 + s.distance / 800);
  const spScale = Math.min(1.6, 1 + s.distance / 1200);
  s.enemies.push({
    id: s.nextId++, kind, x: clamp(x, -1.6, 1.6), z, prevX: x, prevZ: z,
    hp: base.hp * hpScale, maxHp: base.hp * hpScale,
    speed: base.speed * spScale, radius: base.radius,
    alive: true, contact: false, attackCd: 0, spawnTime: s.time, flashUntil: 0,
  });
}

function spawnWave(s: SimState): void {
  s.waveNumber++;
  const budget = Math.min(12, 4 + Math.floor(s.distance / 120) + s.waveNumber);
  const golems = Math.min(3, Math.floor(budget / 6));
  const crawlers = budget - golems;
  let i = 0;
  for (let k = 0; k < crawlers; k++) {
    // Wider stagger (was 2.2): waves used to arrive as a single 14-enemy
    // wall that ended centre runs in ~5 s; now they stream in.
    spawnEnemy(s, "crawler", (s.rng() * 2 - 1) * 1.2 + (s.rng() - 0.5) * 0.8, CONFIG.SPAWN_FAR - i * 3.5);
    i++;
  }
  for (let k = 0; k < golems; k++) {
    spawnEnemy(s, "golem", (s.rng() * 2 - 1) * 0.9, CONFIG.SPAWN_FAR - i * 4.5);
    i++;
  }
  s.events.push({ type: "spawn", kind: "wave" });
}

function fireOne(s: SimState, slotX: number): void {
  const w = WEAPONS[s.weapon];
  // Pool cap: drop the oldest low-priority projectile, never crash.
  if (s.projectiles.filter((p) => p.alive).length >= CONFIG.PROJECTILE_POOL) {
    const victims = s.projectiles.filter((p) => p.alive);
    victims.sort((a, b) => (WEAPONS[a.weapon].tier - WEAPONS[b.weapon].tier) || (a.id - b.id));
    if (victims[0]) victims[0].alive = false;
  }
  const aim = (s.rng() * 2 - 1) * (CONFIG.AUTO_AIM_DEG * Math.PI / 180);
  const vx = Math.sin(aim) * w.speed;
  const vz = -Math.cos(aim) * w.speed;
  s.projectiles.push({
    id: s.nextId++, weapon: s.weapon,
    x: s.squadX + slotX, z: -0.8, prevX: s.squadX + slotX, prevZ: -0.8,
    vx, vz, damage: w.damage * s.damageMult, aoe: w.aoe,
    homing: w.homing, pierce: w.pierce, alive: true, hitIds: new Set(),
  });
  s.events.push({ type: "fire", weapon: s.weapon });
}

function damageEnemy(s: SimState, e: Enemy, dmg: number): void {
  if (!e.alive) return;
  e.hp -= dmg;
  e.flashUntil = s.time + 0.12;
  if (e.hp <= 0) {
    e.alive = false;
    s.kills++;
    s.events.push({ type: "enemyDeath", kind: e.kind, id: e.id, x: e.x, z: e.z });
  }
}

export function tick(s: SimState, dtIn: number, input: SimInput): void {
  // Terminal state: freeze everything so the final score never creeps
  // past the game-over screen's Best (used to lag by a few points when
  // __advance kept stepping after gameOver).
  if (s.gameOver) return;
  // 1. INPUT
  const dt = Number.isFinite(dtIn) && dtIn > 0 ? Math.min(dtIn, 0.25) : 1 / 60;
  if (input.targetX !== undefined && Number.isFinite(input.targetX)) s.targetX = input.targetX;
  if (input.keyDir) s.targetX += input.keyDir * CONFIG.KEY_LAT_SPEED * dt;
  const half = formationHalf(s.squadCount);
  const maxX = Math.max(0, CONFIG.ROAD_HALF - half - 0.35);
  s.targetX = clamp(s.targetX, -maxX, maxX);

  // 2. MOVEMENT (critically damped spring, clamped lateral speed)
  s.prevSquadX = s.squadX;
  const accel = (s.targetX - s.squadX) * CONFIG.SPRING_STIFFNESS - s.velX * CONFIG.SPRING_DAMPING;
  s.velX = clamp(s.velX + accel * dt, -CONFIG.MAX_LAT_SPEED, CONFIG.MAX_LAT_SPEED);
  s.squadX = clamp(s.squadX + s.velX * dt, -maxX, maxX);
  if (!Number.isFinite(s.squadX) || !Number.isFinite(s.velX)) { s.squadX = 0; s.velX = 0; }
  s.time += dt;
  s.scrollSpeed = Math.min(CONFIG.SCROLL_MAX, CONFIG.SCROLL_BASE + s.distance * CONFIG.SCROLL_GROWTH);
  s.distance += s.scrollSpeed * dt;
  for (const e of s.enemies) { e.prevX = e.x; e.prevZ = e.z; }
  for (const p of s.projectiles) { p.prevX = p.x; p.prevZ = p.z; }
  for (const g of s.gates) g.prevZ = g.z;
  for (const b of s.boulders) b.prevZ = b.z;

  // World scroll: everything moves +Z toward the camera.
  for (const g of s.gates) if (g.alive) g.z += s.scrollSpeed * dt;
  for (const b of s.boulders) if (b.alive) b.z += s.scrollSpeed * dt;
  for (const e of s.enemies) {
    if (!e.alive || e.contact) continue;
    e.z += (s.scrollSpeed + e.speed) * dt;
  }
  // Boulders are solid: a sliding wall, not a snap. The old code teleported
  // the squad to pushTo the tick the boulder reached the squad line (a
  // 1.1-unit jump for a right-holding squad, and it overwrote targetX).
  // Now the wall position blends from the road clamp to pushTo as the
  // boulder approaches from z=-8 to the line, so the squad is guided
  // clear at ~1 unit/s with its held input intact; when the boulder
  // passes, the squad springs back toward its target.
  for (const b of s.boulders) {
    if (!b.alive || b.demo || b.z < -8 || b.z > 1.2) continue;
    const p = clamp((b.z + 8) / 7.4, 0, 1); // 0 far, 1 at the squad line
    if (b.x >= s.squadX) {
      const wall = maxX + (b.x - CONFIG.BOULDER_HALF - half - 0.15 - maxX) * p;
      if (s.squadX > wall) { s.squadX = wall; if (s.velX > 0) s.velX = 0; }
    } else {
      const wall = -maxX + (b.x + CONFIG.BOULDER_HALF + half + 0.15 + maxX) * p;
      if (s.squadX < wall) { s.squadX = wall; if (s.velX < 0) s.velX = 0; }
    }
  }

  // 3. SPAWN
  if (s.distance >= s.nextGateDist) {
    s.gates.push({ id: s.nextId++, x: CONFIG.GATE_X, z: CONFIG.SPAWN_FAR, prevZ: CONFIG.SPAWN_FAR, mult: pickGateMult(s.rng), triggered: false, alive: true, flashUntil: 0 });
    s.nextGateDist = nextGateDistance(s.rng, s.distance);
  }
  if (s.distance >= s.nextBoulderDist) {
    const tier = pickBoulderTier(s.rng, s.weapon);
    const hp = CONFIG.BOULDER_HP[WEAPONS[tier].tier];
    s.boulders.push({ id: s.nextId++, x: CONFIG.BOULDER_X, z: CONFIG.SPAWN_FAR, prevZ: CONFIG.SPAWN_FAR, hp, maxHp: hp, tier, granted: false, alive: true, shakeUntil: 0, pendingGrant: false });
    s.nextBoulderDist = nextBoulderDistance(s.rng, s.distance);
  }
  s.waveTimer -= dt;
  if (s.waveTimer <= 0) {
    spawnWave(s);
    s.waveTimer = Math.max(CONFIG.WAVE_INTERVAL_MIN, CONFIG.WAVE_INTERVAL_BASE - s.distance / 200 - s.waveNumber * 0.3);
  }

  // 4. FIRE (every robot, from its own slot x; dead squad does not fire)
  if (!s.dying && !s.gameOver && s.squadCount > 0) {
    const w = WEAPONS[s.weapon];
    const slots = formationSlots(s.squadCount);
    for (let i = 0; i < slots.length; i++) {
      if (s.time >= s.robotFire[i]) {
        fireOne(s, slots[i].x);
        s.robotFire[i] = s.time + (w.interval / s.rateMult) * (0.9 + s.rng() * 0.2);
      }
    }
  }

  // 5. PROJECTILE HITS (swept segment vs AABB, nearest hit wins; pierce keeps going)
  for (const p of s.projectiles) {
    if (!p.alive) continue;
    if (p.homing) {
      let best: Enemy | null = null; let bestD = 1e9;
      for (const e of s.enemies) {
        if (!e.alive || e.z > p.z || p.hitIds.has(e.id)) continue;
        const d = Math.hypot(e.x - p.x, e.z - p.z);
        if (d < bestD) { bestD = d; best = e; }
      }
      if (best && bestD < 12) {
        const dx = best.x - p.x; const dz = best.z - p.z;
        const len = Math.hypot(dx, dz) || 1;
        const sp = Math.hypot(p.vx, p.vz);
        p.vx = (p.vx + (dx / len) * sp * 3 * dt) / (1 + 3 * dt);
        p.vz = (p.vz + (dz / len) * sp * 3 * dt) / (1 + 3 * dt);
        const n = Math.hypot(p.vx, p.vz) || 1;
        p.vx = (p.vx / n) * sp; p.vz = (p.vz / n) * sp;
      }
    }
    p.x += p.vx * dt; p.z += p.vz * dt;
    if (p.z < -95 || Math.abs(p.x) > 8) { p.alive = false; continue; }
    // Nearest target along the segment.
    let bestT = Infinity; let bestE: Enemy | null = null; let bestB: Boulder | null = null;
    for (const e of s.enemies) {
      if (!e.alive || e.demo || p.hitIds.has(e.id)) continue;
      const t = segmentBoxT(p.prevX, p.prevZ, p.x, p.z, e.x - e.radius, e.x + e.radius, e.z - e.radius, e.z + e.radius);
      if (t !== null && t < bestT) { bestT = t; bestE = e; bestB = null; }
    }
    for (const b of s.boulders) {
      if (!b.alive || b.demo || b.granted) continue;
      const t = segmentBoxT(p.prevX, p.prevZ, p.x, p.z, b.x - CONFIG.BOULDER_HALF, b.x + CONFIG.BOULDER_HALF, b.z - 0.5, b.z + 0.5);
      if (t !== null && t < bestT) { bestT = t; bestE = null; bestB = b; }
    }
    if (bestE) {
      p.hitIds.add(bestE.id);
      if (p.aoe > 0) {
        for (const e of s.enemies) {
          if (e.alive && Math.hypot(e.x - bestE.x, e.z - bestE.z) <= p.aoe) damageEnemy(s, e, p.damage);
        }
        p.alive = false;
      } else {
        damageEnemy(s, bestE, p.damage);
        if (!p.pierce) p.alive = false;
      }
    } else if (bestB) {
      bestB.hp -= p.damage;
      bestB.shakeUntil = s.time + 0.25;
      p.alive = false;
      if (bestB.hp <= 0 && !bestB.granted) {
        bestB.pendingGrant = true;
        s.events.push({ type: "boulderBreak", kind: bestB.tier, x: bestB.x, z: bestB.z });
      }
    }
  }

  // 6. CONTACTS
  for (const e of s.enemies) {
    if (!e.alive) continue;
    if (e.demo) { if (e.z > 2) e.alive = false; continue; }
    if (e.contact) {
      // Golem keeps attacking every 1 s while in contact.
      if (e.kind === "golem") {
        e.attackCd -= dt;
        if (e.attackCd <= 0) {
          e.attackCd = CONFIG.GOLEM.attackInterval;
          if (!input.godMode && !s.dying) {
            s.squadCount = Math.max(0, s.squadCount - CONFIG.GOLEM.killRobots);
            s.events.push({ type: "squadHit", kind: "golem", count: s.squadCount });
          }
        }
      }
      continue;
    }
    if (e.z >= CONFIG.SQUAD_LINE_Z) {
      if (Math.abs(e.x - s.squadX) <= half + e.radius) {
        e.contact = true;
        if (e.kind === "crawler") {
          e.alive = false;
          if (!input.godMode && !s.dying) {
            s.squadCount = Math.max(0, s.squadCount - CONFIG.CRAWLER.killRobots);
            s.events.push({ type: "squadHit", kind: "crawler", count: s.squadCount });
          }
        } else {
          e.attackCd = CONFIG.GOLEM.attackInterval;
          if (!input.godMode && !s.dying) {
            s.squadCount = Math.max(0, s.squadCount - CONFIG.GOLEM.killRobots);
            s.events.push({ type: "squadHit", kind: "golem", count: s.squadCount });
          }
        }
      } else if (e.z > 2.0) {
        // Leak: slipped past the squad's lateral extent — escapes, no robot loss.
        e.alive = false;
        s.leaked++;
        s.events.push({ type: "leak", kind: e.kind });
      }
    } else if (e.z > 2.0) {
      e.alive = false;
      s.leaked++;
      s.events.push({ type: "leak", kind: e.kind });
    }
  }

  // 7. GATE / BOULDER RESOLUTION
  for (const g of s.gates) {
    if (!g.alive) continue;
    // Iter-8 fix: the despawn check used to sit AFTER the triggered
    // skip, so every gate that crossed the line became immortal —
    // live gates grew to 13 in a 90 s playtest (11 spawns + 2 demo)
    // and would eventually exhaust the 16-slot gate pool, making new
    // gates invisible in long runs. Despawn applies to all gates.
    if (g.z > CONFIG.DESPAWN_NEAR) { g.alive = false; continue; }
    if (g.triggered) continue;
    if (g.prevZ < 0 && g.z >= 0) {
      g.triggered = true;
      g.flashUntil = s.time + 0.5;
      if (!g.demo && Math.abs(g.x - s.squadX) <= half + CONFIG.GATE_HALF) {
        s.squadCount = Math.min(CONFIG.MAX_SQUAD, Math.ceil(s.squadCount * g.mult));
        s.events.push({ type: "gate", mult: g.mult, count: s.squadCount });
      }
    }
  }
  for (const b of s.boulders) {
    if (!b.alive) continue;
    if (b.pendingGrant && !b.granted) {
      b.granted = true;
      b.alive = false;
      if (WEAPONS[b.tier].tier >= WEAPONS[s.weapon].tier && s.weapon !== b.tier) {
        s.weapon = b.tier;
        s.events.push({ type: "boulderGrant", kind: b.tier });
      } else if (s.weapon === b.tier || WEAPONS[b.tier].tier < WEAPONS[s.weapon].tier) {
        // Same-tier re-grant or lower tier: a damage/fire-rate boost, not
        // a no-op. (Breaking your current tier's boulder used to grant
        // nothing, which made pistol-era boulders feel like duds.)
        s.damageMult = Math.min(3, s.damageMult + CONFIG.MAX_TIER_BOOST_DAMAGE);
        s.rateMult = Math.min(2, s.rateMult + CONFIG.MAX_TIER_BOOST_RATE);
        s.events.push({ type: "boulderGrant", kind: b.tier });
      }
    }
    if (b.z > CONFIG.DESPAWN_NEAR && !b.granted) b.alive = false; // unbroken boulder lost
  }

  // 8. DEATHS / LOSE
  if (s.squadCount <= 0 && !s.dying && !s.gameOver) {
    s.dying = true;
    s.dyingTimer = CONFIG.DYING_TIME;
  }
  if (s.dying && !s.gameOver) {
    s.dyingTimer -= dt;
    if (s.dyingTimer <= 0) {
      s.gameOver = true;
      s.events.push({ type: "gameOver" });
    }
  }

  // 9. SCORE + cleanup + NaN guards
  s.score = Math.floor(s.distance) + s.kills * CONFIG.SCORE_PER_KILL;
  // Iter-8 fix: dead enemies used to be kept while z < DESPAWN_NEAR,
  // but dead enemies never move, so every kill stayed in the array
  // forever (unbounded growth + O(corpses) per tick). The renderer
  // detects deaths by disappearance from the alive set and the tumble
  // is event-driven, so immediate pruning is safe for both.
  s.enemies = s.enemies.filter((e) => e.alive);
  s.projectiles = s.projectiles.filter((p) => p.alive);
  s.gates = s.gates.filter((g) => g.alive);
  s.boulders = s.boulders.filter((b) => b.alive);
  for (const e of s.enemies) {
    if (!Number.isFinite(e.x) || !Number.isFinite(e.z)) { e.x = 0; e.z = CONFIG.SPAWN_FAR; }
  }
}

export function resetState(s: SimState, seed: number): void {
  const fresh = createState(seed);
  Object.assign(s, fresh);
}
