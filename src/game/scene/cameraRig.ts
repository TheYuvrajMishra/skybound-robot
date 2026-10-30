import * as THREE from 'three';
export function createCamera(): THREE.PerspectiveCamera { const c = new THREE.PerspectiveCamera(55, 1, 0.1, 300); c.position.set(0, 9.5, 11); c.lookAt(0, 0, -18); return c; }
export function applyResponsive(camera: THREE.PerspectiveCamera, w: number, h: number): void { camera.aspect = w / h; const portrait = h > w; camera.position.set(0, portrait ? 12 : 9.5, portrait ? 14 : 11); camera.lookAt(0, 0, -18); camera.updateProjectionMatrix(); }
