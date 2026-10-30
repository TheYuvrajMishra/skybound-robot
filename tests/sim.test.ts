import { describe, it, expect } from 'vitest';
import { createGame, restartGame, formationSlots } from '../src/game/sim/state';
import { step, advance, stateHash } from '../src/game/sim/systems';
import { BALANCE } from '../src/game/config/balance';
const input = { left: false, right: false, strafe: 0 };
function playing(seed = 42) { const g = createGame(seed); g.phase = 'PLAYING'; return g; }
describe('formation', () => {
  it('packs deterministically and starts centre', () => { expect(formationSlots(1)).toEqual([{ x: 0, z: 0 }]); expect(formationSlots(5).length).toBe(5); expect(formationSlots(40).length).toBe(40); });
  it('caps squad and converts excess to bonus', () => { const g = playing(); g.squad = 40; g.gates.push({ id: 1, z: -0.1, value: 5, applied: false }); step(g, input, 1 / 60); expect(g.squad).toBe(40); expect(g.bonus).toBeGreaterThan(0); });
});
describe('bullets', () => {
  it('swept collision hits a fast bullet target without tunnelling', () => { const g = playing(); g.spawnTimer = 999; g.gateTimer = 999; g.boulderTimer = 999; g.fireTimer = 999; g.enemies.push({ id: 9, kind: 'imp', x: 0, z: -3, hp: 1, maxHp: 1, speed: 0, phase: 0 }); g.bullets.push({ id: 10, x: 0, z: 0, prevZ: 0, vx: 0, vz: -200, damage: 1, weapon: 'pistol', life: 3, pierce: 0, aoe: 0, homing: false, targetId: null }); step(g, input, 1 / 60); expect(g.kills).toBe(1); });
  it('gate applies once and adds robots (additive default)', () => { const g = playing(); g.gates.push({ id: 2, z: -0.1, value: 2, applied: false }); const before = g.squad; step(g, input, 1 / 60); expect(g.squad).toBe(before + 2); expect(g.gates.length).toBe(0); });
  it('boulder break upgrades tier, lower tier later only bonuses', () => { const g = playing(); g.fireTimer = 999; g.boulders.push({ id: 3, z: -0.4, hp: 1, maxHp: 1, weapon: 'rocket' }); g.bullets.push({ id: 11, x: 4, z: 0, prevZ: 0, vx: 0, vz: -30, damage: 1, weapon: 'pistol', life: 3, pierce: 0, aoe: 0, homing: false, targetId: null }); step(g, input, 1 / 60); expect(g.weapon).toBe('rocket'); });
});
describe('contact and restart', () => {
  it('contact kills one robot then invulnerability prevents chain loss', () => { const g = playing(); g.squad = 3; g.fireTimer = 999; g.enemies.push({ id: 4, kind: 'imp', x: 0, z: -0.4, hp: 1, maxHp: 1, speed: 0, phase: 0 }); step(g, input, 1 / 60); expect(g.squad).toBe(2); g.enemies.push({ id: 5, kind: 'imp', x: 0, z: -0.4, hp: 1, maxHp: 1, speed: 0, phase: 0 }); step(g, input, 1 / 60); expect(g.squad).toBe(2); });
  it('restart leaves zero live entities', () => { const g = playing(); g.enemies.push({ id: 6, kind: 'imp', x: 0, z: -10, hp: 1, maxHp: 1, speed: 6, phase: 0 }); const r = restartGame(g); expect(r.enemies.length).toBe(0); expect(r.bullets.length).toBe(0); expect(r.squad).toBe(BALANCE.startSquad); });
  it('large dt is clamped like many small steps (no crash, bounded movement)', () => { const g = playing(); step(g, input, 1); expect(g.distance).toBeLessThan(2); });
});
describe('determinism and autoplay', () => {
  it('same seed + inputs gives same hash', () => { const a = playing(7); const b = playing(7); advance(a, input, 600); advance(b, input, 600); expect(stateHash(a)).toBe(stateHash(b)); });
  it('autoplay 5 simulated minutes without leaks', () => { const g = playing(99); advance(g, input, 60 * 60 * 5); expect(g.enemies.length).toBeLessThanOrEqual(BALANCE.enemyCap); expect(g.bullets.length).toBeLessThan(200); });
});
