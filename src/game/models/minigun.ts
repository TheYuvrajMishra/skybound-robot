import * as THREE from 'three';
import { PALETTE } from '../config/palette';
import { box, cyl, mat } from './helpers';
import type { WeaponId } from '../config/balance';
export function createMinigun(): THREE.Group { const g = new THREE.Group(); g.name = 'minigun'; for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2; g.add(cyl(0.05, 0.05, 0.55, PALETTE.armorDark, Math.cos(a) * 0.09, Math.sin(a) * 0.09, -0.2, 6)).children; } g.children.forEach((c) => { c.rotation.x = Math.PI / 2; }); g.add(box(0.22, 0.22, 0.25, PALETTE.armor, 0, 0, 0.15)); g.add(box(0.1, 0.05, 0.08, PALETTE.cyan, 0, 0.13, 0.1, PALETTE.cyan, 1)); return g; }
