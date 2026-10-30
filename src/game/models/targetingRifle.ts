import * as THREE from 'three';
import { PALETTE } from '../config/palette';
import { box, cyl, mat } from './helpers';
import type { WeaponId } from '../config/balance';
export function createTargetingRifle(): THREE.Group { const g = new THREE.Group(); g.name = 'targeting'; g.add(box(0.12, 0.16, 0.9, PALETTE.armorDark, 0, 0, -0.2)); const scope = cyl(0.07, 0.07, 0.3, PALETTE.armor, 0, 0.16, -0.25, 8); scope.rotation.x = Math.PI / 2; g.add(scope); g.add(box(0.05, 0.05, 0.2, PALETTE.cyan, 0, 0.05, -0.35, PALETTE.cyan, 1.2)); return g; }
