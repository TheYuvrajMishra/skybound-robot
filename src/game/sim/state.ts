import { BALANCE, type WeaponId } from '../config/balance';
export type Phase = 'MENU' | 'PLAYING' | 'PAUSED' | 'GAME_OVER';
export type EnemyKind = 'imp' | 'golem';
export interface Enemy { id: number; kind: EnemyKind; x: number; z: number; hp: number; maxHp: number; speed: number; phase: number; }
export interface Bullet { id: number; x: number; z: number; prevZ: number; vx: number; vz: number; damage: number; weapon: WeaponId; life: number; pierce: number; aoe: number; homing: boolean; targetId: number | null; }
export interface Gate { id: number; z: number; value: number; applied: boolean; }
export interface Boulder { id: number; z: number; hp: number; maxHp: number; weapon: WeaponId; }
export interface Input { left: boolean; right: boolean; strafe: number; }
export interface GameState {
  phase: Phase; seed: number; time: number; distance: number; score: number; bonus: number;
  kills: number; squad: number; squadX: number; weapon: WeaponId; bonusLevel: number;
  fireTimer: number; invuln: number; scrollSpeed: number; nextId: number;
  enemies: Enemy[]; bullets: Bullet[]; gates: Gate[]; boulders: Boulder[];
  spawnTimer: number; gateTimer: number; boulderTimer: number; lastEvent: string;
  rngState: number;
}
export function createGame(seed = 12345): GameState {
  return { phase: 'MENU', seed, time: 0, distance: 0, score: 0, bonus: 0, kills: 0,
    squad: BALANCE.startSquad, squadX: 0, weapon: 'pistol', bonusLevel: 0,
    fireTimer: 0, invuln: 0, scrollSpeed: BALANCE.scrollBase, nextId: 1,
    enemies: [], bullets: [], gates: [], boulders: [], spawnTimer: 1.2, gateTimer: 4, boulderTimer: 6,
    lastEvent: '', rngState: seed };
}
/** Deterministic formation: grow backward (-z is visual back? slots use x/z offsets), then outward. Slot 0 is front-centre. */
export function formationSlots(n: number): { x: number; z: number }[] {
  const order: { x: number; z: number }[] = [];
  const cols = [-1.2, -0.6, 0, 0.6, 1.2];
  for (let row = 0; row < 20 && order.length < n; row++) {
    for (let c = 0; c < cols.length && order.length < n; c++) {
      // Row 0 only centre first, then widen; deterministic slot order.
      if (row === 0 && c !== 2) continue;
      order.push({ x: cols[c] ?? 0, z: row * 1.1 });
    }
  }
  return order.slice(0, n);
}
export function restartGame(s: GameState): GameState {
  const g = createGame(s.seed); g.phase = 'PLAYING'; return g;
}
