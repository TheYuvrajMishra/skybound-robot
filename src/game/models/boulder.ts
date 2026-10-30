import * as THREE from 'three';
import { PALETTE } from '../config/palette';
import { box, cyl, dodeca, labelTexture, mat } from './helpers';
export function createBoulder(): THREE.Group {
  const g = new THREE.Group(); g.name = 'boulder';
  const rock = dodeca(1.1, PALETTE.stone, 0, 1.0, 0); rock.name = 'rock'; rock.scale.set(1.2, 1, 1); g.add(rock);
  const tex = labelTexture('100', 'pistol'); const face = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.7), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, ...(tex ? { map: tex } : {}), emissive: PALETTE.cyan, emissiveIntensity: 0.3 })); face.position.set(0, 1.0, -1.05); face.name = 'facePanel'; g.add(face);
  for (let i = 0; i < 4; i++) { const r = dodeca(0.18, PALETTE.stoneDark, -1 + i * 0.6, 0.15, 0.6); r.name = 'rubble'; g.add(r); }
  return g;
}
