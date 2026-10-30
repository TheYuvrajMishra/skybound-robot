import * as THREE from 'three';
import { PALETTE } from '../config/palette';
import { box, cyl, dodeca, labelTexture, mat } from './helpers';
export function createBanner(): THREE.Group { const g = new THREE.Group(); g.name = 'banner'; g.add(cyl(0.08, 0.08, 3.5, PALETTE.armorDark, 0, 1.75, 0, 6)); const cloth = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 2.2), new THREE.MeshStandardMaterial({ color: PALETTE.blueBanner, flatShading: true, side: THREE.DoubleSide })); cloth.position.set(0.7, 2.2, 0); cloth.name = 'cloth'; g.add(cloth); return g; }
