import * as THREE from 'three';
export function applySky(scene: THREE.Scene): void { scene.background = new THREE.Color(0x9fd4ff); scene.fog = new THREE.Fog(0x9fd4ff, 40, 110); }
