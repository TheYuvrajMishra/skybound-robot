import * as THREE from 'three';
import { PALETTE } from '../config/palette';
import { box, cyl, dodeca, labelTexture, mat } from './helpers';
export function createCloud(): THREE.Group { const g = new THREE.Group(); g.name = 'cloud'; for (let i = 0; i < 4; i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(1 + i * 0.3, 6, 5), mat(PALETTE.cloud)); s.position.set(i * 1.2 - 1.5, i * 0.2, 0); g.add(s); } return g; }
