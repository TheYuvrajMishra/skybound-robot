import { describe, it, expect } from "vitest";
import { createState, tick, formationSlots, formationHalf, segmentBoxT } from "./sim";
import { CONFIG } from "../config/game";

const DT = 1 / 60;
function run(s: ReturnType<typeof createState>, seconds: number, input: { targetX?: number } = {}) {
  const steps = Math.round(seconds / DT);
  for (let i = 0; i < steps; i++) tick(s, DT, input);
}

describe("gate math", () => {
  it("multiplies squad by ceil(count * N) and caps at MAX_SQUAD", () => {
    const s = createState(1);
    s.squadCount = 3;
    s.gates.push({ id: 99, x: CONFIG.GATE_X, z: -5, prevZ: -5, mult: 2, triggered: false, alive: true, flashUntil: 0 });
    s.targetX = -2.4;
    run(s, 1.5, { targetX: -2.4 });
    expect(s.squadCount).toBe(6);
    const g = s.gates.find((x) => x.id === 99);
    expect(g?.triggered).toBe(true);
  });
  it("a gate outside the squad X range does not multiply", () => {
    const s = createState(2);
    s.squadCount = 3;
    s.gates.push({ id: 99, x: CONFIG.GATE_X, z: -5, prevZ: -5, mult: 3, triggered: false, alive: true, flashUntil: 0 });
    run(s, 1.5, { targetX: 2.4 });
    expect(s.squadCount).toBe(3);
  });
  it("gate triggers only once", () => {
    const s = createState(3);
    s.squadCount = 4;
    s.gates.push({ id: 99, x: CONFIG.GATE_X, z: -5, prevZ: -5, mult: 2, triggered: false, alive: true, flashUntil: 0 });
    run(s, 1.5, { targetX: -2.4 });
    expect(s.squadCount).toBe(8);
  });
});

describe("damage and weapons", () => {
  it("pistol bullets damage and kill a crawler, incrementing kills", () => {
    const s = createState(4);
    s.squadCount = 1;
    s.enemies.push({ id: 50, kind: "crawler", x: 0, z: -5, prevX: 0, prevZ: -5, hp: 1, maxHp: 12, speed: 0, radius: 0.45, alive: true, contact: false, attackCd: 0, spawnTime: 0, flashUntil: 0 });
    const before = s.kills;
    run(s, 2);
    expect(s.enemies.find((e) => e.id === 50)?.alive).toBeFalsy();
    expect(s.kills).toBeGreaterThan(before);
  });
  it("enemyDeath event carries the id and death position for the death tumble", () => {
    const s = createState(44);
    s.squadCount = 1;
    s.enemies.push({ id: 51, kind: "crawler", x: 0, z: -5, prevX: 0, prevZ: -5, hp: 1, maxHp: 12, speed: 0, radius: 0.45, alive: true, contact: false, attackCd: 0, spawnTime: 0, flashUntil: 0 });
    run(s, 2);
    const ev = s.events.find((e) => e.type === "enemyDeath");
    expect(ev?.id).toBe(51);
    expect(ev?.kind).toBe("crawler");
    expect(ev?.x).toBe(0);
    expect(typeof ev?.z).toBe("number");
    expect(ev!.z!).toBeLessThan(0);
  });
  it("rocket AoE damages nearby enemies", () => {
    const s = createState(5);
    s.weapon = "rocket-launcher";
    s.squadCount = 1;
    for (const x of [-0.2, 0.2]) {
      s.enemies.push({ id: 60 + Math.round(x * 10), kind: "crawler", x, z: -6, prevX: x, prevZ: -6, hp: 20, maxHp: 20, speed: 0, radius: 0.45, alive: true, contact: false, attackCd: 0, spawnTime: 0, flashUntil: 0 });
    }
    run(s, 3);
    const alive = s.enemies.filter((e) => e.alive).length;
    expect(alive).toBeLessThan(2);
  });
  it("boulder at 0 HP grants the weapon exactly once", () => {
    const s = createState(6);
    s.weapon = "pistol";
    // Iter-12: staged at -15 (was -5). At -5 the boulder was nearly on
    // the squad line before the squad reached the right lane, so the
    // wall pushed the squad left and only seed-lucky aim draws hit it
    // — the test passed on the old 4-degree cone's draws and failed on
    // the 2-degree cone's. At -15 the squad is in position (right robot
    // at 2.4) long before the wall engages, so the grant logic itself
    // is what the test measures, not aim RNG.
    s.boulders.push({ id: 70, x: CONFIG.BOULDER_X, z: -15, prevZ: -15, hp: 1, maxHp: 100, tier: "minigun", granted: false, alive: true, shakeUntil: 0, pendingGrant: false });
    s.targetX = 2.4;
    run(s, 3, { targetX: 2.4 });
    expect(s.weapon).toBe("minigun");
    expect(s.boulders.filter((b) => b.alive).length).toBe(0);
  });
});

describe("wave director", () => {
  it("spawns waves and scales budget with distance", () => {
    const s = createState(7);
    run(s, 20);
    expect(s.waveNumber).toBeGreaterThanOrEqual(1);
    expect(s.enemies.length).toBeGreaterThan(0);
  });
  it("every wave is bounded (budget cap from config)", () => {
    const s = createState(8);
    s.distance = 5000;
    s.waveTimer = 0;
    tick(s, DT, {});
    const wave = s.enemies.filter((e) => e.alive).length;
    expect(wave).toBeLessThanOrEqual(CONFIG.WAVE_BUDGET_CAP);
  });
  it("late-game enemy HP scales past the old 2.5x cap", () => {
    const s = createState(81);
    s.distance = 5000;
    s.waveTimer = 0;
    tick(s, DT, {});
    const crawler = s.enemies.find((e) => e.alive && e.kind === "crawler");
    expect(crawler?.maxHp).toBeGreaterThan(CONFIG.CRAWLER.hp * 2.5);
    expect(crawler?.maxHp).toBeLessThanOrEqual(CONFIG.CRAWLER.hp * CONFIG.HP_SCALE_CAP);
  });
  it("boulder wall guides the squad clear without a snap and keeps targetX", () => {
    const s = createState(31);
    s.squadCount = 3;
    // Iter-10: start AT the new road clamp (1.4, was 1.6 at 0.8 spacing).
    // Starting outside the clamp made the first tick hard-clamp 1.6->1.4
    // and trip the no-snap assertion — a test setup artifact, not a wall
    // snap (the wall itself moves ~0.016/tick).
    s.squadX = 1.4; s.targetX = 2.4; s.velX = 0;
    s.boulders.push({ id: 94, x: CONFIG.BOULDER_X, z: -8, prevZ: -8, hp: 500, maxHp: 500, tier: "minigun", granted: false, alive: true, shakeUntil: 0, pendingGrant: false });
    let prev = s.squadX; let maxJump = 0;
    for (let i = 0; i < 90; i++) {
      tick(s, DT, { targetX: 2.4, godMode: true });
      maxJump = Math.max(maxJump, Math.abs(s.squadX - prev));
      prev = s.squadX;
    }
    // No teleport: the old snap moved 1.1 units in one tick.
    expect(maxJump).toBeLessThan(0.2);
    // Held input preserved: the old code overwrote targetX with the push
    // value (~0.5); the wall leaves it at the road clamp (1.4, exactly —
    // the sim clamps stored targetX), so the squad springs back toward
    // the held lane once the boulder passes.
    expect(s.targetX).toBeGreaterThanOrEqual(1.4);
    // And the squad did get guided clear of the boulder lane.
    expect(s.squadX).toBeLessThan(0.8);
  });
  it("breaking your current tier's boulder grants a boost, not nothing", () => {
    const s = createState(32);
    s.weapon = "pistol";
    // Iter-12: staged at -15 (was -5) — same seed-lucky-aim reason as
    // the grant test above; the boost logic is what is measured here.
    s.boulders.push({ id: 95, x: CONFIG.BOULDER_X, z: -15, prevZ: -15, hp: 1, maxHp: 60, tier: "pistol", granted: false, alive: true, shakeUntil: 0, pendingGrant: false });
    s.targetX = 2.4;
    run(s, 3, { targetX: 2.4 });
    expect(s.weapon).toBe("pistol");
    expect(s.damageMult).toBeGreaterThan(1);
  });
});

describe("swept collision", () => {
  it("segment vs box detects a fast projectile that would tunnel", () => {
    // Projectile jumps from z=-5 to z=+5 in one step; box at z=0 must still register.
    const t = segmentBoxT(0, -5, 0, 5, -0.5, 0.5, -0.5, 0.5);
    expect(t).not.toBeNull();
    expect(t!).toBeGreaterThanOrEqual(0);
    expect(t!).toBeLessThanOrEqual(1);
  });
  it("a segment missing the box returns null", () => {
    expect(segmentBoxT(3, -5, 3, 5, -0.5, 0.5, -0.5, 0.5)).toBeNull();
  });
});

describe("contacts and lose", () => {
  it("a crawler in contact kills 1 robot and dies", () => {
    const s = createState(9);
    s.squadCount = 3;
    s.enemies.push({ id: 80, kind: "crawler", x: 0, z: -0.5, prevX: 0, prevZ: -0.5, hp: 100, maxHp: 100, speed: 0, radius: 0.45, alive: true, contact: false, attackCd: 0, spawnTime: 0, flashUntil: 0 });
    s.robotFire = s.robotFire.map(() => 999); // no firing: isolate contact
    run(s, 0.5);
    expect(s.squadCount).toBe(2);
  });
  it("a golem in contact keeps attacking every 1 s", () => {
    const s = createState(10);
    s.squadCount = 10;
    s.enemies.push({ id: 81, kind: "golem", x: 0, z: -0.5, prevX: 0, prevZ: -0.5, hp: 10000, maxHp: 10000, speed: 0, radius: 0.7, alive: true, contact: false, attackCd: 0, spawnTime: 0, flashUntil: 0 });
    s.robotFire = s.robotFire.map(() => 999);
    run(s, 2.5);
    expect(s.squadCount).toBeLessThanOrEqual(4); // contact hit (3) + at least one more 1 s attack (3)
  });
  it("squad 0 leads to game over after the death animation", () => {
    const s = createState(11);
    s.squadCount = 1;
    s.enemies.push({ id: 82, kind: "crawler", x: 0, z: -0.5, prevX: 0, prevZ: -0.5, hp: 100, maxHp: 100, speed: 0, radius: 0.45, alive: true, contact: false, attackCd: 0, spawnTime: 0, flashUntil: 0 });
    s.robotFire = s.robotFire.map(() => 999);
    run(s, 3);
    expect(s.gameOver).toBe(true);
  });
  it("an enemy slipping past the squad laterally is a leak, not a kill", () => {
    const s = createState(12);
    s.squadCount = 3;
    // Iter-10: enemy at -2.0 (was -1.5). The wider 1.0 formation's left
    // robot starts at -1.0, and -1.5 is within its 0.7 contact reach, so
    // the old position now contacts before the squad steers right. -2.0
    // is outside even the wide formation's reach and keeps the test's
    // intent: an enemy on the far side while the squad steers right.
    s.enemies.push({ id: 83, kind: "crawler", x: -2.0, z: -0.5, prevX: -2.0, prevZ: -0.5, hp: 100, maxHp: 100, speed: 0, radius: 0.45, alive: true, contact: false, attackCd: 0, spawnTime: 0, flashUntil: 0 });
    s.robotFire = s.robotFire.map(() => 999);
    run(s, 1, { targetX: 2.4 });
    expect(s.squadCount).toBe(3);
    expect(s.leaked).toBe(1);
  });
});

describe("demo entities are decoration only", () => {
  it("a demo golem overlapping the squad deals no damage", () => {
    const s = createState(20);
    s.enemies.push({ id: 91, kind: "golem", x: 0, z: -1, prevX: 0, prevZ: -1, hp: 90, maxHp: 90, speed: 0.9, radius: 0.7, alive: true, contact: false, attackCd: 0, spawnTime: 0, flashUntil: 0, demo: true });
    run(s, 1.5, { targetX: 2.4 });
    expect(s.squadCount).toBe(3);
    expect(s.gameOver).toBe(false);
  });
  it("a demo gate does not multiply the squad", () => {
    const s = createState(21);
    s.gates.push({ id: 92, x: CONFIG.GATE_X, z: -5, prevZ: -5, mult: 3, triggered: false, alive: true, flashUntil: 0, demo: true });
    run(s, 1.5, { targetX: -2.4 });
    expect(s.squadCount).toBe(3);
  });
  it("a demo boulder does not push the squad", () => {
    const s = createState(22);
    s.boulders.push({ id: 93, x: CONFIG.BOULDER_X, z: -0.5, prevZ: -0.5, hp: 200, maxHp: 200, tier: "minigun", granted: false, alive: true, shakeUntil: 0, pendingGrant: false, demo: true });
    run(s, 0.5, { targetX: 2.4 });
    // Without the demo flag the push would shove the squad to ~0.3; the
    // lateral clamp for 3 robots is 1.4 (iter-10 spacing 1.0, was 1.6),
    // and 0.5 s of spring travel reaches ~1.23, so >1.1 proves no push
    // happened.
    expect(s.squadX).toBeGreaterThan(1.1);
  });
});

describe("score and formation", () => {
  it("score = distance + kills * K", () => {
    const s = createState(13);
    s.distance = 100; s.kills = 4;
    tick(s, DT, {});
    expect(s.score).toBe(Math.floor(s.distance) + 4 * CONFIG.SCORE_PER_KILL);
  });
  it("formation slots never teleport the count: slots grow with count and stay in bounds", () => {
    for (const n of [1, 3, 5, 12, 40]) {
      const slots = formationSlots(n);
      expect(slots.length).toBe(Math.min(n, CONFIG.MAX_VISIBLE));
      expect(formationHalf(n)).toBeLessThanOrEqual(CONFIG.ROAD_HALF);
      for (const sl of slots) expect(Math.abs(sl.x)).toBeLessThanOrEqual(CONFIG.ROAD_HALF);
    }
  });
  it("NaN target input is guarded", () => {
    const s = createState(14);
    tick(s, DT, { targetX: NaN });
    expect(Number.isFinite(s.squadX)).toBe(true);
    expect(Number.isFinite(s.targetX)).toBe(true);
  });
});

describe("cleanup (iter-8)", () => {
  it("a triggered gate still despawns past the line (no immortal gates)", () => {
    const s = createState(15);
    s.gates.push({ id: 70, x: CONFIG.GATE_X, z: 11, prevZ: 11, mult: 2, triggered: true, alive: true, flashUntil: 0 });
    run(s, 1);
    expect(s.gates.find((g) => g.id === 70)).toBeUndefined();
  });
  it("dead enemies are pruned immediately instead of accumulating", () => {
    const s = createState(16);
    s.enemies.push({ id: 71, kind: "crawler", x: 0, z: -5, prevX: 0, prevZ: -5, hp: 0, maxHp: 12, speed: 0, radius: 0.45, alive: false, contact: false, attackCd: 0, spawnTime: 0, flashUntil: 0 });
    tick(s, DT, {});
    expect(s.enemies.find((e) => e.id === 71)).toBeUndefined();
  });
});
