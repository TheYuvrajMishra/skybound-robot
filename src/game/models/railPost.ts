import * as THREE from 'three';
import { PALETTE } from '../config/palette';
import { box, cyl, dodeca, labelTexture, mat } from './helpers';
export function createRailPost(): THREE.Group { const g = new THREE.Group(); g.name = 'railPost'; g.add(box(0.25, 1.0, 0.25, PALETTE.armorDark, 0, 0.5, 0)); g.add(box(0.1, 0.6, 0.1, PALETTE.cyan, 0, 0.6, -0.14, PALETTE.cyan, 1)); return g; }
