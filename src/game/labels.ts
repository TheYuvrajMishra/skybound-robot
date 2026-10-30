/** Canvas-texture labels: gate numbers, boulder icon+number. No external assets.
 * Textures are cached and redrawn only when the value changes; call disposeLabels()
 * on unmount. No text is baked into the 3D models themselves. */
import * as THREE from "three";
import type { WeaponId } from "../config/game";

const cache = new Map<string, THREE.CanvasTexture>();

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const ctx = c.getContext("2d")!;
  return [c, ctx];
}

function drawIcon(ctx: CanvasRenderingContext2D, id: WeaponId, x: number, y: number, s: number): void {
  ctx.save();
  ctx.translate(x, y);
  // Iter-6: icons are FILLED with a glow, not thin outlines — the
  // stroke-only outlines read as tiny white scribbles at hero distance.
  ctx.strokeStyle = "#eafcff"; ctx.fillStyle = "#eafcff"; ctx.lineWidth = Math.max(3, s * 0.08);
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.shadowColor = "rgba(0,229,255,0.9)"; ctx.shadowBlur = 14;
  const fillStroke = (draw: () => void) => { ctx.beginPath(); draw(); ctx.fill(); ctx.stroke(); };
  if (id === "pistol") {
    fillStroke(() => { ctx.moveTo(-s * 0.4, -s * 0.1); ctx.lineTo(s * 0.45, -s * 0.1); ctx.lineTo(s * 0.45, s * 0.15); ctx.lineTo(-s * 0.1, s * 0.15); ctx.closePath(); });
    fillStroke(() => { ctx.moveTo(0, s * 0.15); ctx.lineTo(s * 0.15, s * 0.55); ctx.lineTo(-s * 0.1, s * 0.55); ctx.closePath(); });
  } else if (id === "minigun") {
    for (let i = -1; i <= 1; i++) {
      fillStroke(() => { ctx.arc(i * s * 0.28, -s * 0.15, s * 0.12, 0, Math.PI * 2); });
    }
    fillStroke(() => { ctx.moveTo(-s * 0.3, s * 0.15); ctx.lineTo(s * 0.3, s * 0.15); ctx.lineTo(s * 0.2, s * 0.6); ctx.lineTo(-s * 0.2, s * 0.6); ctx.closePath(); });
  } else if (id === "rocket-launcher") {
    fillStroke(() => { ctx.moveTo(-s * 0.35, s * 0.3); ctx.lineTo(-s * 0.05, -s * 0.55); ctx.lineTo(s * 0.35, s * 0.3); ctx.closePath(); });
    ctx.beginPath(); ctx.moveTo(-s * 0.3, s * 0.35); ctx.lineTo(s * 0.3, s * 0.35); ctx.stroke();
    fillStroke(() => { ctx.moveTo(-s * 0.15, s * 0.35); ctx.lineTo(-s * 0.15, s * 0.6); ctx.lineTo(s * 0.15, s * 0.6); ctx.lineTo(s * 0.15, s * 0.35); ctx.closePath(); });
  } else {
    // targeting rifle: crosshair
    ctx.beginPath(); ctx.arc(0, 0, s * 0.35, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-s * 0.55, 0); ctx.lineTo(-s * 0.2, 0); ctx.moveTo(s * 0.2, 0); ctx.lineTo(s * 0.55, 0); ctx.moveTo(0, -s * 0.55); ctx.lineTo(0, -s * 0.2); ctx.moveTo(0, s * 0.2); ctx.lineTo(0, s * 0.55); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, s * 0.07, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

export function gateTexture(mult: number): THREE.CanvasTexture {
  const key = `gate:${mult}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const [c, ctx] = makeCanvas(256, 128);
  ctx.clearRect(0, 0, 256, 128);
  // Iter-7: dark backing so white text does not wash out against pale
  // sky/clouds at distance (labels had no backing, only bare text).
  ctx.fillStyle = "rgba(0,10,25,0.55)";
  ctx.beginPath(); ctx.roundRect(28, 14, 200, 100, 18); ctx.fill();
  // Iter-6: dark outline + brighter fill so the number reads against
  // bright sky/fog at distance (plain cyan on translucent glass washed out).
  ctx.font = "bold 84px system-ui, sans-serif";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.lineWidth = 12; ctx.strokeStyle = "rgba(0,20,40,0.9)";
  ctx.strokeText(`${mult}x`, 128, 68);
  ctx.fillStyle = "#eafcff";
  ctx.fillText(`${mult}x`, 128, 68);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  cache.set(key, tex);
  return tex;
}

export function boulderTexture(tier: WeaponId, hp: number, maxHp: number): THREE.CanvasTexture {
  const key = `boulder:${tier}:${hp}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const [c, ctx] = makeCanvas(256, 160);
  ctx.clearRect(0, 0, 256, 160);
  // Iter-7: dark backing (same contrast fix as gates).
  ctx.fillStyle = "rgba(0,10,25,0.55)";
  ctx.beginPath(); ctx.roundRect(8, 20, 240, 120, 18); ctx.fill();
  drawIcon(ctx, tier, 64, 80, 55);
  // Iter-6: dark outline behind the number (same contrast fix as gates).
  ctx.font = "bold 72px system-ui, sans-serif";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.lineWidth = 10; ctx.strokeStyle = "rgba(0,20,40,0.9)";
  ctx.strokeText(String(Math.max(0, Math.ceil(hp))), 168, 84);
  ctx.fillStyle = hp <= maxHp * 0.3 ? "#ffb020" : "#eafcff";
  ctx.fillText(String(Math.max(0, Math.ceil(hp))), 168, 84);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  cache.set(key, tex);
  return tex;
}

export function disposeLabels(): void {
  for (const t of cache.values()) t.dispose();
  cache.clear();
}
