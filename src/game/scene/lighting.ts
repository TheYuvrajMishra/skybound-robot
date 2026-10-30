import * as THREE from 'three';
export function createLights(scene: THREE.Scene): THREE.DirectionalLight { const sun = new THREE.DirectionalLight(0xffe0b3, 2.2); sun.position.set(-10, 20, 5); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); scene.add(sun); scene.add(new THREE.HemisphereLight(0xbfe8ff, 0x334155, 0.9)); return sun; }
