import * as THREE from 'three';
import { PALETTE } from '../config/palette';
import { box, cyl, dodeca, labelTexture, mat } from './helpers';
export function createRoadTile(): THREE.Group {
  const g = new THREE.Group(); g.name = 'roadTile';
  const base = box(12, 0.3, 12, PALETTE.steel, 0, -0.15, 0); base.name = 'base'; g.add(base);
  const lineL = box(0.3, 0.02, 12, PALETTE.whiteLine, -2, 0.02, 0); lineL.name = 'lineL'; g.add(lineL);
  const lineR = box(0.3, 0.02, 12, PALETTE.whiteLine, 2, 0.02, 0); lineR.name = 'lineR'; g.add(lineR);
  const railL = cyl(0.08, 0.08, 12, PALETTE.armorDark, -6, 0.4, 0, 6); railL.rotation.x = Math.PI / 2; railL.name = 'railL'; g.add(railL);
  const railR = cyl(0.08, 0.08, 12, PALETTE.armorDark, 6, 0.4, 0, 6); railR.rotation.x = Math.PI / 2; railR.name = 'railR'; g.add(railR);
  return g;
}
