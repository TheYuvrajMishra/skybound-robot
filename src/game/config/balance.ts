export const BALANCE = {
  startSquad: 1, maxSquad: 40, robotHp: 1, invulnSeconds: 0.8,
  laneWidth: 6, centerClamp: 1.2, leftLaneX: -4, rightLaneX: 4,
  spawnZ: -70, despawnZ: 8, squadZ: 0, enemyCap: 250,
  scrollBase: 8, scrollMax: 16, scrollRampPerMetre: 0.004,
  gateMode: 'additive' as const, gateValueCap: 99, gateChargeCap: 99,
  impHp: 1, impSpeed: 6, impScore: 10, golemHp: 8, golemSpeed: 2.5, golemScore: 50,
  bulletSpeed: 30, bulletLife: 3,
  weapons: {
    pistol: { tier: 0, name: 'Pistol', interval: 0.45, damage: 1, spread: 0, pierce: 0, aoe: 0, homing: false },
    minigun: { tier: 1, name: 'Minigun', interval: 0.12, damage: 1, spread: 0.35, pierce: 0, aoe: 0, homing: false },
    rocket: { tier: 2, name: 'Rocket Launcher', interval: 0.9, damage: 6, spread: 0, pierce: 0, aoe: 3, homing: false },
    targeting: { tier: 3, name: 'Targeting Rifle', interval: 0.4, damage: 3, spread: 0, pierce: 1, aoe: 0, homing: true },
  } as const,
} as const;
export type WeaponId = keyof typeof BALANCE.weapons;
export const WEAPON_ORDER: WeaponId[] = ['pistol', 'minigun', 'rocket', 'targeting'];
