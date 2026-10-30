/**
 * ALL tunable game numbers live here. Tune only via this file.
 * Phase 2, Stage C balance targets: START_SQUAD = 3, first 30 s beatable
 * with pistol, casual survives 60-90 s, skilled > 5 min.
 */

export type WeaponId = "pistol" | "minigun" | "rocket-launcher" | "targeting-rifle";

export interface WeaponStats {
  id: WeaponId;
  name: string;
  tier: number;
  damage: number;
  interval: number; // seconds between shots per robot
  speed: number; // projectile speed, units/s
  aoe: number; // splash radius, 0 = none
  homing: boolean;
  pierce: boolean;
}

export const WEAPONS: Record<WeaponId, WeaponStats> = {
  pistol: { id: "pistol", name: "Pistol", tier: 0, damage: 8, interval: 0.45, speed: 18, aoe: 0, homing: false, pierce: false },
  minigun: { id: "minigun", name: "Minigun", tier: 1, damage: 6, interval: 0.16, speed: 22, aoe: 0, homing: false, pierce: false },
  "rocket-launcher": { id: "rocket-launcher", name: "Rocket Launcher", tier: 2, damage: 30, interval: 0.9, speed: 14, aoe: 1.4, homing: false, pierce: false },
  "targeting-rifle": { id: "targeting-rifle", name: "Targeting Rifle", tier: 3, damage: 25, interval: 0.7, speed: 26, aoe: 0, homing: true, pierce: true },
};

export const WEAPON_ORDER: WeaponId[] = ["pistol", "minigun", "rocket-launcher", "targeting-rifle"];

export const CONFIG = {
  START_SQUAD: 3,
  MAX_SQUAD: 99,
  MAX_VISIBLE: 40,
  ROAD_HALF: 3.0, // road deck half-width after the x3 tile scale
  ROAD_TILE: 10,
  GATE_X: -2.4,
  BOULDER_X: 2.4,
  GATE_HALF: 0.7,
  BOULDER_HALF: 0.7, // matches the 1.25x boulder visual scale below
  SCROLL_BASE: 6,
  SCROLL_GROWTH: 0.004, // per unit of distance
  SCROLL_MAX: 13,
  LANE_SNAP: false,
  MAX_LAT_SPEED: 6, // was 7: jitter reversals still crossed ~85% of the lane in 0.5 s
  KEY_LAT_SPEED: 6,
  SPRING_STIFFNESS: 55,
  SPRING_DAMPING: 15,
  AUTO_AIM_DEG: 6,
  GATE_SHOT_TO_UPGRADE: false, // flag exists, default off (gates multiply on pass, not on shot)
  SCORE_PER_KILL: 25,
  PROJECTILE_POOL: 128,
  ENEMY_POOL_CRAWLER: 24,
  ENEMY_POOL_GOLEM: 12,
  SPAWN_FAR: -80,
  DESPAWN_NEAR: 12,
  SQUAD_LINE_Z: -0.4,
  CRAWLER: { hp: 12, speed: 2.2, radius: 0.45, killRobots: 1 },
  GOLEM: { hp: 90, speed: 0.9, radius: 0.7, killRobots: 3, attackInterval: 1 },
  BOULDER_HP: [60, 120, 200, 280], // by weapon tier offered; was [100,200,300,400]: playtest round 2 broke zero boulders in 60 s of dedicated right-lane pistol play (25-50 hits vs 1/3 of squad DPS reaching the boulder)
  MAX_TIER_BOOST_DAMAGE: 0.25,
  MAX_TIER_BOOST_RATE: 0.15,
  GATE_INTERVAL_MIN: 45,
  GATE_INTERVAL_VAR: 25,
  BOULDER_INTERVAL_MIN: 65,
  BOULDER_INTERVAL_VAR: 30,
  WAVE_FIRST_AT: 4,
  WAVE_INTERVAL_BASE: 13,
  WAVE_INTERVAL_MIN: 6,
  DYING_TIME: 1.2,
  // Iter-5 reframe (round 4, both reviewers): closer + lower than the
  // iter-4 steep dive — the squad was only dome heads at the bottom edge.
  // At (y 4, z 3, lookZ -6) the axis pitch is ~20°, the hero robot is
  // ~21% of frame height with feet in frame, the road fills ~70% of the
  // width at the bottom, and the vanishing point stays near the top.
  // (A still-closer camera would crop the squad or lose the far road:
  // 20-25% robot height + full road width + long recession cannot all
  // hold at once with a 60° FOV; this is the geometric compromise.)
  CAMERA: { fov: 60, y: 4.0, z: 3.0, lookY: 0.8, lookZ: -6, lag: 0.55 },
  FOG_NEAR: 40,
  FOG_FAR: 88,
  DPR_MIN: 0.75,
  DPR_MAX: 2,
} as const;

export const GATE_MULTS = [2, 2, 3] as const;
