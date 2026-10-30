import * as THREE from 'three';
import { PALETTE } from '../config/palette';
import { box, cyl, sph } from './helpers';
export function createRobot(): THREE.Group {
  const g = new THREE.Group(); g.name = 'robot';
  const torso = box(0.55, 0.5, 0.35, PALETTE.armor, 0, 0.62, 0); torso.name = 'torso'; g.add(torso);
  const core = cyl(0.16, 0.16, 0.06, PALETTE.cyan, 0, 0.62, -0.19, 8, PALETTE.cyan, 1.2); core.rotation.x = Math.PI / 2; core.name = 'core'; g.add(core);
  const head = new THREE.Group(); head.name = 'head'; head.position.set(0, 1.05, 0);
  head.add(sph(0.32, PALETTE.armor, 0, 0, 0)); const visor = box(0.42, 0.16, 0.1, PALETTE.cyan, 0, 0.02, -0.28, PALETTE.cyan, 1); visor.name = 'visor'; head.add(visor); g.add(head);
  const mkLimb = (name: string, x: number, y: number, isArm: boolean) => { const l = new THREE.Group(); l.name = name; l.position.set(x, y, 0); const part = isArm ? box(0.16, 0.42, 0.16, PALETTE.armorDark, 0, -0.18, 0) : box(0.18, 0.4, 0.18, PALETTE.armorDark, 0, -0.2, 0); l.add(part); g.add(l); return l; };
  mkLimb('armL', -0.38, 0.82, true); mkLimb('armR', 0.38, 0.82, true); mkLimb('legL', -0.16, 0.38, false); mkLimb('legR', 0.16, 0.38, false);
  const gunMount = new THREE.Group(); gunMount.name = 'gunMount'; gunMount.position.set(0.15, 0.7, -0.25); g.add(gunMount);
  g.userData.height = 1.4; return g;
}
