import { BALANCE, WEAPON_ORDER, type WeaponId } from '../config/balance';
import { CONSTANTS } from '../config/constants';
import { formationSlots, type GameState, type Input } from './state';

function rand(s: GameState): number {
  let a = (s.rngState + 0x6d2b79f5) | 0; s.rngState = a;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function pickWeapon(s: GameState): WeaponId { return WEAPON_ORDER[Math.floor(rand(s) * WEAPON_ORDER.length)] ?? 'pistol'; }

export function step(s: GameState, input: Input, dtRaw: number): void {
  if (s.phase !== 'PLAYING') return;
  const dt = Math.min(Math.max(dtRaw, 0), CONSTANTS.maxDt);
  s.time += dt;
  if (s.invuln > 0) s.invuln = Math.max(0, s.invuln - dt);
  // Strafe, centre corridor only.
  let move = 0; if (input.left) move -= 1; if (input.right) move += 1; move += input.strafe;
  s.squadX = Math.max(-BALANCE.centerClamp, Math.min(BALANCE.centerClamp, s.squadX + move * 8 * dt));
  s.distance += s.scrollSpeed * dt;
  s.scrollSpeed = Math.min(BALANCE.scrollMax, BALANCE.scrollBase + s.distance * BALANCE.scrollRampPerMetre);
  // Spawner: minimum gap, cap, reaction distance (spawn always at spawnZ).
  s.spawnTimer -= dt;
  if (s.spawnTimer <= 0 && s.enemies.length < BALANCE.enemyCap) {
    const golemChance = s.distance > 150 ? 0.12 : 0;
    if (rand(s) < golemChance) {
      s.enemies.push({ id: s.nextId++, kind: 'golem', x: (rand(s) - 0.5) * 2, z: BALANCE.spawnZ, hp: BALANCE.golemHp * (1 + Math.floor(s.distance / 800)), maxHp: BALANCE.golemHp, speed: BALANCE.golemSpeed, phase: rand(s) * 6 });
      if (rand(s) < 0.6) for (let i = 0; i < 2; i++) s.enemies.push({ id: s.nextId++, kind: 'imp', x: (rand(s) - 0.5) * 3, z: BALANCE.spawnZ - 3 - i * 2, hp: BALANCE.impHp, maxHp: BALANCE.impHp, speed: BALANCE.impSpeed, phase: rand(s) * 6 });
    } else {
      const n = 3 + Math.floor(rand(s) * 4);
      for (let i = 0; i < n; i++) s.enemies.push({ id: s.nextId++, kind: 'imp', x: (rand(s) - 0.5) * 3, z: BALANCE.spawnZ - i * 2, hp: BALANCE.impHp, maxHp: BALANCE.impHp, speed: BALANCE.impSpeed, phase: rand(s) * 6 });
    }
    s.spawnTimer = Math.max(1.0, 2.6 - s.distance * 0.0004) + rand(s);
  }
  s.gateTimer -= dt;
  if (s.gateTimer <= 0) { s.gates.push({ id: s.nextId++, z: BALANCE.spawnZ, value: 1 + Math.floor(rand(s) * 3), applied: false }); s.gateTimer = 5 + rand(s) * 4; }
  s.boulderTimer -= dt;
  if (s.boulderTimer <= 0) { const w = pickWeapon(s); s.boulders.push({ id: s.nextId++, z: BALANCE.spawnZ, hp: 4 + BALANCE.weapons[w].tier * 4 + Math.floor(s.distance / 500), maxHp: 10, weapon: w }); s.boulderTimer = 7 + rand(s) * 5; }
  // Shooting.
  const w = BALANCE.weapons[s.weapon];
  const interval = w.interval * Math.max(0.7, 1 - s.bonusLevel * 0.08);
  s.fireTimer -= dt;
  if (s.fireTimer <= 0) {
    s.fireTimer = interval;
    const slots = formationSlots(s.squad);
    const gate = s.gates.find((g) => g.z < -5); const boulder = s.boulders.find((b) => b.z < -5);
    const divert = (gate || boulder) && s.squad >= 2 ? Math.max(1, Math.floor(s.squad * 0.2)) : 0;
    slots.forEach((slot, i) => {
      let vx = w.spread ? (rand(s) - 0.5) * w.spread * 4 : 0; let targetId: number | null = null;
      if (i < divert) {
        const target = i % 2 === 0 ? (gate ?? boulder) : (boulder ?? gate);
        if (target) { const tx = 'value' in target ? BALANCE.leftLaneX : BALANCE.rightLaneX; vx = (tx - (s.squadX + slot.x)) * 1.5; targetId = target.id; }
      }
      s.bullets.push({ id: s.nextId++, x: s.squadX + slot.x, z: slot.z, prevZ: slot.z, vx, vz: -BALANCE.bulletSpeed, damage: w.damage, weapon: s.weapon, life: BALANCE.bulletLife, pierce: w.pierce, aoe: w.aoe, homing: w.homing, targetId });
    });
  }
  // Bullets with swept collision (prevZ -> newZ, no tunnelling).
  const deadBullets = new Set<number>(); const deadEnemies = new Set<number>();
  for (const b of s.bullets) {
    b.prevZ = b.z; b.life -= dt;
    if (b.homing) { const near = s.enemies.filter((e) => e.z < 0 && Math.abs(e.x - b.x) < 3).sort((a, c) => Math.abs(a.z - b.z) - Math.abs(c.z - b.z))[0]; if (near) b.vx += (near.x - b.x) * 4 * dt; }
    b.x += b.vx * dt; b.z += b.vz * dt;
    if (b.life <= 0 || b.z < BALANCE.spawnZ) { deadBullets.add(b.id); continue; }
    const lo = Math.min(b.prevZ, b.z), hi = Math.max(b.prevZ, b.z);
    const gate = s.gates.find((g) => g.z >= lo && g.z <= hi && Math.abs(b.x - BALANCE.leftLaneX) < 1.4);
    if (gate) { gate.value = Math.min(BALANCE.gateValueCap, gate.value + 1); deadBullets.add(b.id); continue; }
    const boulder = s.boulders.find((bo) => bo.z >= lo && bo.z <= hi && Math.abs(b.x - BALANCE.rightLaneX) < 1.4);
    if (boulder) {
      boulder.hp -= b.damage;
      if (boulder.hp <= 0) {
        const newTier = BALANCE.weapons[boulder.weapon].tier; const curTier = BALANCE.weapons[s.weapon].tier;
        if (newTier > curTier) { s.weapon = boulder.weapon; s.bonusLevel = 0; } else if (s.bonusLevel < 3) s.bonusLevel += 1;
        s.lastEvent = `UPGRADED: ${BALANCE.weapons[s.weapon].name}`;
        s.boulders = s.boulders.filter((x) => x.id !== boulder.id);
      }
      deadBullets.add(b.id); continue;
    }
    for (const e of s.enemies) {
      if (deadEnemies.has(e.id)) continue;
      const r = e.kind === 'golem' ? 1.3 : 0.9;
      if (e.z >= lo && e.z <= hi && Math.abs(b.x - e.x) < r) {
        e.hp -= b.damage;
        if (b.aoe > 0) { for (const o of s.enemies) if (Math.hypot(o.x - e.x, o.z - e.z) < b.aoe) o.hp -= b.damage; }
        if (e.hp <= 0) { deadEnemies.add(e.id); s.kills += 1; s.bonus += e.kind === 'golem' ? BALANCE.golemScore : BALANCE.impScore; }
        if (b.pierce > 0) b.pierce -= 1; else deadBullets.add(b.id);
        break;
      }
    }
  }
  s.bullets = s.bullets.filter((b) => !deadBullets.has(b.id));
  s.enemies = s.enemies.filter((e) => !deadEnemies.has(e.id));
  // World scroll: gates/boulders move with road, enemies walk + scroll.
  for (const e of s.enemies) { e.z += (e.speed + s.scrollSpeed * 0.35) * dt; if (e.kind === 'imp') e.x = Math.max(-1.8, Math.min(1.8, e.x + Math.sin(s.time * 3 + e.phase) * 0.6 * dt)); }
  for (const g of s.gates) g.z += s.scrollSpeed * dt;
  for (const b of s.boulders) b.z += s.scrollSpeed * dt;
  // Gates apply once at squad line; boulders passing despawn with no effect.
  for (const g of [...s.gates]) if (!g.applied && g.z >= 0) {
    g.applied = true; const room = BALANCE.maxSquad - s.squad; const gain = Math.min(g.value, room);
    s.squad += gain; if (g.value > room) { s.bonus += (g.value - room) * 10; s.lastEvent = 'MAX'; } else s.lastEvent = `+${gain}`;
    s.gates = s.gates.filter((x) => x.id !== g.id);
  }
  s.boulders = s.boulders.filter((b) => b.z < 2);
  // Contact: rear-most loss is deterministic — squad count only, enemy removed.
  for (const e of [...s.enemies]) if (e.z >= -0.5) {
    s.enemies = s.enemies.filter((x) => x.id !== e.id);
    if (s.invuln <= 0) { s.squad -= 1; s.invuln = BALANCE.invulnSeconds; s.lastEvent = 'HIT'; if (s.squad <= 0) { s.squad = 0; s.phase = 'GAME_OVER'; } }
  }
  s.enemies = s.enemies.filter((e) => e.z < BALANCE.despawnZ);
  s.score = Math.floor(s.distance) + s.bonus;
}
export function advance(s: GameState, input: Input, steps: number): void { for (let i = 0; i < steps; i++) step(s, input, 1 / 60); }
export function stateHash(s: GameState): string {
  return JSON.stringify({ squad: s.squad, score: s.score, distance: Math.floor(s.distance), kills: s.kills, enemies: s.enemies.map((e) => [e.kind, Math.round(e.z)]), weapon: s.weapon });
}
