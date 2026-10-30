import * as THREE from 'three';
import { PALETTE } from '../config/palette';
import { box, cyl, mat } from './helpers';
import type { WeaponId } from '../config/balance';
export function createPistol(): THREE.Group { const g = new THREE.Group(); g.name = 'pistol'; g.add(box(0.12, 0.14, 0.4, PALETTE.armorDark, 0, 0, -0.1)); g.add(box(0.1, 0.22, 0.12, PALETTE.armor, 0, -0.16, 0.08)); g.add(box(0.06, 0.04, 0.1, PALETTE.enemyGlow, 0, 0.08, -0.1, PALETTE.enemyGlow, 1)); return g; }
