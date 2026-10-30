import * as THREE from 'three';
import { PALETTE } from '../config/palette';
import { box, cyl, dodeca, labelTexture, mat } from './helpers';
export function createGate(): THREE.Group {
  const g = new THREE.Group(); g.name = 'gate';
  const postL = box(0.4, 3.2, 0.4, PALETTE.armorDark, -1.8, 1.6, 0); postL.name = 'postL'; g.add(postL);
  const postR = box(0.4, 3.2, 0.4, PALETTE.armorDark, 1.8, 1.6, 0); postR.name = 'postR'; g.add(postR);
  const glass = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.8, 0.08), new THREE.MeshStandardMaterial({ color: PALETTE.cyan, transparent: true, opacity: 0.35, emissive: PALETTE.cyan, emissiveIntensity: 0.4, flatShading: true })); glass.position.set(0, 1.6, 0); glass.name = 'glass'; g.add(glass);
  const tex = labelTexture('1x', ''); const labelMat = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, ...(tex ? { map: tex } : {}), emissive: 0xffffff, emissiveIntensity: 0.2 });
  const label = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.1), labelMat); label.position.set(0, 1.6, -0.06); label.name = 'label'; g.add(label);
  g.add(cyl(0.06, 0.06, 2.8, PALETTE.cyan, -1.8, 1.6, 0, 6, PALETTE.cyan, 1)); return g;
}
