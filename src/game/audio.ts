/** Optional procedural WebAudio SFX. Created only after a user gesture. */
export class Sfx {
  private ctx: AudioContext | null = null;
  muted = false;

  init(): void {
    if (this.ctx) {
      if (this.ctx.state === "suspended") void this.ctx.resume();
      return;
    }
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AC();
    } catch { this.ctx = null; }
  }

  private blip(freq: number, dur: number, type: OscillatorType, vol: number, slide = 0): void {
    if (!this.ctx || this.muted) return;
    try {
      const t = this.ctx.currentTime;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = type; o.frequency.setValueAtTime(freq, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(g); g.connect(this.ctx.destination);
      o.start(t); o.stop(t + dur);
    } catch { /* audio is best-effort */ }
  }

  shoot(): void { this.blip(880, 0.07, "square", 0.03, -300); }
  hit(): void { this.blip(220, 0.08, "triangle", 0.05, -80); }
  gate(): void { this.blip(660, 0.18, "sine", 0.08, 660); }
  grant(): void { this.blip(520, 0.3, "sine", 0.08, 520); }
  death(): void { this.blip(160, 0.25, "sawtooth", 0.06, -100); }
  gameOver(): void { this.blip(330, 0.6, "triangle", 0.08, -200); }
}
