export const easeOutBack = (t: number): number => { const c = 1.70158; const u = t - 1; return 1 + (c + 1) * u * u * u + c * u * u; };
export const easeInOut = (t: number): number => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
export const clamp01 = (t: number): number => Math.max(0, Math.min(1, t));
export interface Track { start: number; duration: number; apply: (t: number) => void; }
export function runTracks(tracks: Track[], time: number): void { for (const tr of tracks) { const t = clamp01((time - tr.start) / tr.duration); if (t >= 0 && t <= 1) tr.apply(tr.duration === 0 ? 1 : easeInOut(t)); } }
