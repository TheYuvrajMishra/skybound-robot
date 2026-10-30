export function clampStrafe(v: number): number { return Math.max(-1, Math.min(1, v)); }
export function strafeFromDrag(startX: number, currentX: number): number { return clampStrafe((currentX - startX) / 80); }
