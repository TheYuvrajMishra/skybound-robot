import * as THREE from 'three';
import { PALETTE } from '../config/palette';
import { box, cyl, dodeca, labelTexture, mat } from './helpers';
export function createFloatingPlatform(): THREE.Group { const g = new THREE.Group(); g.name = 'platform'; g.add(box(6, 0.5, 6, PALETTE.steel, 0, 0, 0)); g.add(dodeca(2, PALETTE.stone, 0, -1.2, 0)); g.add(box(0.2, 1.5, 0.2, PALETTE.cyan, 0, 1, 0, PALETTE.cyan, 1)); return g; }
