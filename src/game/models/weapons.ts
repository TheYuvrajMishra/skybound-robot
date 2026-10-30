import * as THREE from 'three';
import type { WeaponId } from '../config/balance';
import { createPistol } from './pistol';
import { createMinigun } from './minigun';
import { createRocketLauncher } from './rocketLauncher';
import { createTargetingRifle } from './targetingRifle';
export { createPistol, createMinigun, createRocketLauncher, createTargetingRifle };
export function createWeapon(id: WeaponId): THREE.Group { return id === 'minigun' ? createMinigun() : id === 'rocket' ? createRocketLauncher() : id === 'targeting' ? createTargetingRifle() : createPistol(); }
export function setWeapon(robot: THREE.Group, weaponId: WeaponId): void {
  const mount = robot.getObjectByName('gunMount') as THREE.Group | undefined; if (!mount) return;
  while (mount.children.length) mount.remove(mount.children[0] as THREE.Object3D);
  mount.add(createWeapon(weaponId));
}
