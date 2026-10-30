import * as THREE from 'three';
import { createRoadTile } from '../models/environment';
export function createRoadTiles(scene: THREE.Scene): THREE.Group[] { const tiles: THREE.Group[] = []; for (let i = 0; i < 14; i++) { const t = createRoadTile(); t.position.z = 12 - i * 12; scene.add(t); tiles.push(t); } return tiles; }
export function updateRoadTiles(tiles: THREE.Group[], dz: number): void { for (const t of tiles) { t.position.z += dz; if (t.position.z > 18) t.position.z -= 14 * 12; } }
