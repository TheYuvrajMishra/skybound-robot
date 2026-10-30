import * as THREE from 'three';
import { PALETTE } from '../config/palette';
import { box, cyl, sph } from './helpers';
export function createImp(): THREE.Group {
  const g = new THREE.Group(); g.name = 'imp';
  const body = sph(0.32, PALETTE.stoneDark, 0, 0.35, 0); body.name = 'body'; g.add(body);
  const e1 = sph(0.08, PALETTE.enemyGlow, -0.12, 0.45, -0.28, PALETTE.enemyGlow, 1.5); e1.name = 'eyeL'; g.add(e1);
  const e2 = sph(0.08, PALETTE.enemyGlow, 0.12, 0.45, -0.28, PALETTE.enemyGlow, 1.5); e2.name = 'eyeR'; g.add(e2);
  for (let i = 0; i < 6; i++) { const leg = new THREE.Group(); leg.name = `leg${i}`; leg.position.set(i < 3 ? -0.28 : 0.28, 0.18, -0.2 + (i % 3) * 0.2); leg.add(box(0.07, 0.22, 0.07, PALETTE.stoneDark, 0, -0.08, 0)); g.add(leg); }
  return g;
}
