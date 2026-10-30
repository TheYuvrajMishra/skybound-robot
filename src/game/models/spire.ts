import * as THREE from 'three';
import { PALETTE } from '../config/palette';
import { box, cyl, dodeca, labelTexture, mat } from './helpers';
export function createSpire(): THREE.Group { const g = new THREE.Group(); g.name = 'spire'; const t = cyl(0.8, 1.6, 12, PALETTE.armorDark, 0, 6, 0, 6); g.add(t); const tip = new THREE.Mesh(new THREE.ConeGeometry(0.8, 3, 6), mat(PALETTE.cyan, PALETTE.cyan, 0.8)); tip.position.y = 13.5; g.add(tip); return g; }
