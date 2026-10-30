import * as THREE from 'three';
import { PALETTE } from '../config/palette';
import { box, cyl, sph } from './helpers';
export function createGolem(): THREE.Group {
  const g = new THREE.Group(); g.name = 'golem';
  const torso = box(1.0, 0.9, 0.7, PALETTE.stone, 0, 0.95, 0); torso.name = 'torso'; g.add(torso);
  const crack = box(0.08, 0.7, 0.05, PALETTE.enemyGlow, 0, 0.95, -0.37, PALETTE.enemyGlow, 1.2); crack.name = 'cracks'; g.add(crack);
  const head = box(0.55, 0.4, 0.45, PALETTE.stoneDark, 0, 1.6, 0); head.name = 'head'; g.add(head);
  const eye = box(0.3, 0.08, 0.05, PALETTE.enemyGlow, 0, 1.62, -0.24, PALETTE.enemyGlow, 1.5); g.add(eye);
  const armL = new THREE.Group(); armL.name = 'armL'; armL.position.set(-0.65, 1.25, 0); armL.add(box(0.35, 0.9, 0.35, PALETTE.stone, 0, -0.35, 0)); g.add(armL);
  const armR = new THREE.Group(); armR.name = 'armR'; armR.position.set(0.65, 1.25, 0); armR.add(box(0.35, 0.9, 0.35, PALETTE.stone, 0, -0.35, 0)); g.add(armR);
  g.add(box(0.35, 0.5, 0.35, PALETTE.stoneDark, -0.3, 0.25, 0)); g.add(box(0.35, 0.5, 0.35, PALETTE.stoneDark, 0.3, 0.25, 0));
  return g;
}
