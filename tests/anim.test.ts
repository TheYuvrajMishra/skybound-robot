import { describe, it, expect } from 'vitest';
import { easeInOut, clamp01, runTracks } from '../src/game/anim/easing';
describe('anim', () => { it('eases and clamps', () => { expect(easeInOut(0)).toBe(0); expect(easeInOut(1)).toBe(1); expect(clamp01(2)).toBe(1); }); it('runs tracks', () => { let v = 0; runTracks([{ start: 0, duration: 1, apply: (t) => { v = t; } }], 0.5); expect(v).toBeGreaterThan(0); expect(v).toBeLessThanOrEqual(1); }); });
