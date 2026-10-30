import * as THREE from 'three';
import { PALETTE } from '../config/palette';
export function mat(color: number, emissive = 0, emissiveIntensity = 0): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.8, metalness: 0.15, emissive, emissiveIntensity });
}
export function box(w: number, h: number, d: number, color: number, x = 0, y = 0, z = 0, emissive = 0, ei = 0): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color, emissive, ei)); m.position.set(x, y, z); m.name = 'box'; return m;
}
export function cyl(rt: number, rb: number, h: number, color: number, x = 0, y = 0, z = 0, seg = 8, emissive = 0, ei = 0): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat(color, emissive, ei)); m.position.set(x, y, z); return m;
}
export function sph(r: number, color: number, x = 0, y = 0, z = 0, emissive = 0, ei = 0): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), mat(color, emissive, ei)); m.position.set(x, y, z); return m;
}
export function dodeca(r: number, color: number, x = 0, y = 0, z = 0, emissive = 0, ei = 0): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), mat(color, emissive, ei)); m.position.set(x, y, z); return m;
}
export function triCount(root: THREE.Object3D): number {
  let n = 0; root.traverse((o) => { const mesh = o as THREE.Mesh; if (mesh.isMesh) { const g = mesh.geometry; const pos = g.attributes.position; n += g.index ? g.index.count / 3 : (pos ? pos.count / 3 : 0); } }); return Math.round(n);
}
export function disposeGroup(root: THREE.Object3D): void {
  root.traverse((o) => { const mesh = o as THREE.Mesh; if (mesh.isMesh) { mesh.geometry.dispose(); const m = mesh.material as THREE.Material | THREE.Material[]; if (Array.isArray(m)) m.forEach((x) => x.dispose()); else m.dispose(); } });
}
export function labelTexture(text: string, iconId: string): THREE.Texture | null {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas'); c.width = 256; c.height = 128; const ctx = c.getContext('2d'); if (!ctx) return null;
  ctx.clearRect(0, 0, 256, 128); ctx.fillStyle = '#7dd8ff'; ctx.font = 'bold 64px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  let size = 64; ctx.font = `bold ${size}px system-ui, sans-serif`; while (ctx.measureText(text).width > 200 && size > 20) { size -= 4; ctx.font = `bold ${size}px system-ui, sans-serif`; }
  ctx.fillText(text, 128, 64);
  ctx.strokeStyle = '#7dd8ff'; ctx.lineWidth = 6; ctx.beginPath();
  if (iconId === 'rocket') { ctx.moveTo(40, 90); ctx.lineTo(80, 40); ctx.lineTo(110, 90); ctx.closePath(); ctx.stroke(); }
  else if (iconId === 'minigun') { for (let i = 0; i < 3; i++) { ctx.strokeRect(30 + i * 18, 60, 12, 40); } }
  else if (iconId === 'crosshair') { ctx.arc(60, 80, 22, 0, Math.PI * 2); ctx.stroke(); }
  else { ctx.strokeRect(40, 60, 40, 30); }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; return tex;
}
export function setLabel(group: THREE.Group, opts: { text: string; iconId: string }): void {
  const label = group.getObjectByName('label') as THREE.Mesh | undefined; if (!label) return;
  const tex = labelTexture(opts.text, opts.iconId);
  if (tex) { const m = label.material as THREE.MeshStandardMaterial; if (m.map) m.map.dispose(); m.map = tex; m.transparent = true; m.needsUpdate = true; }
  group.userData.labelText = opts.text; group.userData.labelIcon = opts.iconId;
}
export const CYAN = PALETTE.cyan; export const ORANGE = PALETTE.enemyGlow;
