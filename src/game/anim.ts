/** Procedural animation helpers (delta-time based, no external clips). */
export function easeOutBack(t: number): number {
  const c = 1.70158;
  const u = t - 1;
  return 1 + (c + 1) * u * u * u + c * u * u;
}

/** Spawn pop: scale overshoot over the first 0.35 s after spawn. */
export function popScale(age: number): number {
  if (age >= 0.35) return 1;
  return Math.max(0.01, easeOutBack(age / 0.35));
}

export function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

/** Breathing scale for idle robots. */
export function breathing(t: number, phase: number): number {
  return 1 + Math.sin(t * 2.2 + phase) * 0.015;
}
