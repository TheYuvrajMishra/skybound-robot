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
  AUTO_AIM_DEG: 2, // was 6 (spec default), then 4 (iter-9). The 6-degree
  // fan let centre fire clip right-lane boulders over their whole
  // approach, so centre runs auto-upgraded without ever steering right
  // (round-3 AFK got minigun with zero input). 4 degrees narrowed the
  // fan but still let a bullet from the right robot (x 1.0) bend 2.1 m
  // over 30 m to x 3.1 — into the boulder lane (2.4) — so round-5
  // centre/AFK runs still auto-upgraded by RNG luck. 2 degrees draws
  // the line the road partitions intend: centre fire covers the enemy
  // column (max |x| 2.0: a bullet from x 1.0 bends 1.05 m to 2.05)
  // but cannot reach the boulder lane, so boulders require deliberate
  // right-lane play. Go-right play is unaffected (right robot at 2.4
  // fires straight into boulders). This retires the "centre-fire
  // boulder breaks are emergent" note — they were an artefact of the
  // 4-degree cone blurring the partition line.
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
  WAVE_INTERVAL_MIN: 5, // was 6: late waves come slightly more often
  WAVE_BUDGET_CAP: 16, // was 12 (hardcoded in spawnWave): bigger late waves
  // Iter-9 difficulty ramp: enemy HP/speed scaling used to CAP at 2.5x/1.6x
  // (reached at distance 1200/1200), so late-game pressure flatlined while
  // player DPS kept growing via upgrades — round-3 centre play survived
  // 1200 s with zero input. Caps raised; the early game is untouched
  // (at distance < 200 the scales are identical to before).
  HP_SCALE_PER_DIST: 800, // hpScale = min(HP_SCALE_CAP, 1 + distance / this)
  HP_SCALE_CAP: 5,
  SP_SCALE_PER_DIST: 1200, // spScale = min(SP_SCALE_CAP, 1 + distance / this)
  SP_SCALE_CAP: 2.0,
  DYING_TIME: 1.2,
  // Iter-5 reframe (round 4, both reviewers): closer + lower than the
  // iter-4 steep dive — the squad was only dome heads at the bottom edge.
  // Iter-12: z 3.3 (was 3.0) — round-7 reviewers measured the squad at
  // 30-35% of frame height with feet cropped at the bottom edge, vs
  // the reference's fully-visible ~15% hero. The modest pull-back puts
  // the hero robot at ~19% with feet in frame; the road still fills
  // ~93% of the width at the bottom (cloud sea in the corners).
  // At (y 4, z 3.3, lookZ -6) the axis pitch is ~20°, and the vanishing
  // point stays near the top. (A still-closer camera would crop the
  // squad or lose the far road: 20-25% robot height + full road width
  // + long recession cannot all hold at once with a 60° FOV; this is
  // the geometric compromise.)
  CAMERA: { fov: 60, y: 4.0, z: 3.3, lookY: 0.8, lookZ: -6, lag: 0.55 },
  FOG_NEAR: 40,
  FOG_FAR: 88,
  DPR_MIN: 0.75,
  DPR_MAX: 2,
} as const;

export const GATE_MULTS = [2, 2, 3] as const;
