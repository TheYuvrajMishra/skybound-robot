import { create } from 'zustand';
import type { Phase } from '../sim/state';
import type { WeaponId } from '../config/balance';
interface UIState { phase: Phase; score: number; best: number; squad: number; weapon: WeaponId; event: string; fps: number; reducedMotion: boolean; quality: 'low' | 'med' | 'high'; muted: boolean; set: (p: Partial<UIState>) => void; }
export const useUI = create<UIState>()((set) => ({ phase: 'MENU', score: 0, best: 0, squad: 1, weapon: 'pistol', event: '', fps: 0, reducedMotion: false, quality: 'high', muted: true, set: (p) => set(p) }));
export function loadBest(): number { try { return Number(localStorage.getItem('skybound-high-score-v1') ?? 0) || 0; } catch { return 0; } }
export function saveBest(v: number): void { try { localStorage.setItem('skybound-high-score-v1', String(v)); } catch { /* private mode: ignore */ } }
