import * as THREE from 'three';
import { PALETTE } from '../config/palette';
import { box, cyl, dodeca, labelTexture, mat } from './helpers';
export function createProjectiles(): THREE.Group { const g = new THREE.Group(); g.name = 'projectiles'; const bolt = box(0.12, 0.12, 0.8, PALETTE.cyan, 0, 0, 0, PALETTE.cyan, 1.5); bolt.name = 'bolt'; g.add(bolt); const rocket = cyl(0.12, 0.12, 0.7, PALETTE.armor, 1, 0, 0, 6); rocket.rotation.x = Math.PI / 2; rocket.name = 'rocketProj'; g.add(rocket); return g; }
