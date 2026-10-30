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
  // Iter-14: shadowBlur 5 (was 14) — round-9 reviewers read the
  // minigun bars as merged 00/000 blobs; the bar gap is 10 px and
  // a 14 px blur bridges it. Blur 5 keeps the glow without merging.
  ctx.strokeStyle = "#eafcff"; ctx.fillStyle = "#eafcff"; ctx.lineWidth = Math.max(3, s * 0.08);
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.shadowColor = "rgba(0,229,255,0.9)"; ctx.shadowBlur = 5;
  const fillStroke = (draw: () => void) => { ctx.beginPath(); draw(); ctx.fill(); ctx.stroke(); };
  if (id === "pistol") {
    fillStroke(() => { ctx.moveTo(-s * 0.4, -s * 0.1); ctx.lineTo(s * 0.45, -s * 0.1); ctx.lineTo(s * 0.45, s * 0.15); ctx.lineTo(-s * 0.1, s * 0.15); ctx.closePath(); });
    fillStroke(() => { ctx.moveTo(0, s * 0.15); ctx.lineTo(s * 0.15, s * 0.55); ctx.lineTo(-s * 0.1, s * 0.55); ctx.closePath(); });
  } else if (id === "minigun") {
    // Iter-13: three barrel RECTANGLES + body (was three small
    // circles) — round-8 reviewers read the circles as "three dots,
    // not a weapon". Parallel barrels read as a multi-barrel gun
    // even at small label sizes.
    // Iter-15: bars wider (0.24, was 0.18) + spacing (0.36, was
    // 0.28) — round-10 reviewers read the bars as "tiny indistinct
    // white marks" at the small label size; wider bars + a 0.12
    // gap (blur 5 keeps them distinct) read at hero distance.
    // Icon spans 16..112, clear of the number at 131+.
    for (let i = -1; i <= 1; i++) {
      fillStroke(() => { ctx.roundRect(i * s * 0.36 - s * 0.12, -s * 0.5, s * 0.24, s * 0.55, s * 0.06); });
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
  // Iter-7: dark backing (same contrast fix as gates). Iter-12: 0.75
  // (was 0.55) — round-7 reviewers still read boulder labels as pale
  // washed cyan against the road/sky; the more opaque backing makes
  // the icon + number read as a solid panel.
  ctx.fillStyle = "rgba(0,10,25,0.75)";
  ctx.beginPath(); ctx.roundRect(8, 20, 240, 120, 18); ctx.fill();
  drawIcon(ctx, tier, 64, 80, 100);
  // Iter-6: dark outline behind the number (same contrast fix as gates).
  // Iter-11: icon 100 (was 60) — reviewers read it as a tiny cyan blob
  // under 15% of the boulder face; 100px on the 256 canvas is ~39% of
  // the 1.5-wide label, near the 45% ask without shrinking the number
  // below readability (font 64, was 72, shifted right to clear the icon).
  ctx.font = "bold 64px system-ui, sans-serif";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.lineWidth = 10; ctx.strokeStyle = "rgba(0,20,40,0.9)";
  ctx.strokeText(String(Math.max(0, Math.ceil(hp))), 184, 84);
  ctx.fillStyle = hp <= maxHp * 0.3 ? "#ffb020" : "#eafcff";
  ctx.fillText(String(Math.max(0, Math.ceil(hp))), 184, 84);
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
