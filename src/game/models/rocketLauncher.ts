import * as THREE from 'three';
import { PALETTE } from '../config/palette';
import { box, cyl, mat } from './helpers';
import type { WeaponId } from '../config/balance';
export function createRocketLauncher(): THREE.Group { const g = new THREE.Group(); g.name = 'rocket'; const t = cyl(0.14, 0.14, 0.7, PALETTE.armor, 0, 0, -0.1, 8); t.rotation.x = Math.PI / 2; g.add(t); const cone = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.25, 8), mat(PALETTE.enemyGlow, PALETTE.enemyGlow, 1)); cone.rotation.x = -Math.PI / 2; cone.position.set(0, 0, -0.55); g.add(cone); g.add(box(0.1, 0.18, 0.12, PALETTE.armorDark, 0, -0.2, 0.1)); return g; }
