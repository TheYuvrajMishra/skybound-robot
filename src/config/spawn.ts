/** Spawn schedules for gates (left) and boulders (right), like the reference. */
import { CONFIG, GATE_MULTS, WEAPON_ORDER, type WeaponId } from "./game";
import type { Rng } from "../game/rng";

export function nextGateDistance(rng: Rng, distance: number): number {
  return distance + CONFIG.GATE_INTERVAL_MIN + rng() * CONFIG.GATE_INTERVAL_VAR;
}

export function nextBoulderDistance(rng: Rng, distance: number): number {
  return distance + CONFIG.BOULDER_INTERVAL_MIN + rng() * CONFIG.BOULDER_INTERVAL_VAR;
}

export function pickGateMult(rng: Rng): number {
  return GATE_MULTS[Math.floor(rng() * GATE_MULTS.length)];
}

/** Spawner only offers tiers >= current; at max tier the grant is a boost. */
export function pickBoulderTier(rng: Rng, current: WeaponId): WeaponId {
  const cur = WEAPON_ORDER.indexOf(current);
  if (cur >= WEAPON_ORDER.length - 1) return WEAPON_ORDER[WEAPON_ORDER.length - 1];
  const idx = cur + Math.floor(rng() * (WEAPON_ORDER.length - cur));
  return WEAPON_ORDER[idx];
}
