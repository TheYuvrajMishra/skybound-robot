"use client";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import type { HudState } from "@/game/GameCanvas";

const GameCanvas = dynamic(() => import("@/game/GameCanvas"), { ssr: false });

type Screen = "start" | "playing" | "paused" | "gameover";
const BEST_KEY = "skybound-best-score";

function loadBest(): number {
  try {
    const v = window.localStorage.getItem(BEST_KEY);
    return v ? parseInt(v, 10) || 0 : 0;
  } catch { return 0; }
}

export default function Home() {
  const [screen, setScreen] = useState<Screen>("start");
  const [resetSignal, setResetSignal] = useState(0);
  const [hud, setHud] = useState<HudState>({ squad: 3, weapon: "Pistol", distance: 0, score: 0, kills: 0, fps: 60, enemies: 0, projectiles: 0, gameOver: false, dying: false });
  const [muted, setMuted] = useState(false);
  const [quality, setQuality] = useState<"high" | "low">("high");
  const [debug, setDebug] = useState(false);
  const [capture, setCapture] = useState(false);
  const [god, setGod] = useState(false);
  const [best, setBest] = useState(0);
  const screenRef = useRef(screen);
  screenRef.current = screen;

  useEffect(() => {
    setBest(loadBest());
    const q = new URLSearchParams(window.location.search);
    setDebug(q.get("debug") === "1");
    setCapture(q.get("shot") !== null || q.get("anim") !== null);
  }, []);

  // Start (fresh sim) must NOT remount the canvas: bumping resetSignal here
  // used to reset the sim and its loop on every start.
  const start = useCallback(() => {
    setScreen("playing");
  }, []);

  // Restart (after game over) MUST remount: the old sim is in gameOver and
  // the loop stops stepping it, so only a fresh canvas fully resets.
  const restart = useCallback(() => {
    setResetSignal((s) => s + 1);
    setScreen("playing");
  }, []);

  const onGameOver = useCallback((score: number) => {
    setScreen("gameover");
    setBest((prev) => {
      const next = Math.max(prev, score);
      try { window.localStorage.setItem(BEST_KEY, String(next)); } catch { /* SSR-safe best-effort */ }
      return next;
    });
  }, []);

  const onPauseRequest = useCallback(() => {
    if (screenRef.current === "playing") setScreen("paused");
  }, []);

  const onHud = useCallback((h: HudState) => setHud(h), []);
  const game = () => (window as unknown as { __game?: Record<string, (...args: never[]) => unknown> }).__game;

  const panel: CSSProperties = {
    position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    background: "rgba(5,12,24,0.72)", color: "#fff", zIndex: 10, padding: 24, textAlign: "center", gap: 12,
  };
  const btn: CSSProperties = {
    background: "#00a8cc", color: "#fff", border: "none", borderRadius: 10, padding: "12px 26px",
    fontSize: 18, fontWeight: 700, cursor: "pointer",
  };

  return (
    <main style={{ width: "100vw", height: "100dvh", position: "relative", overflow: "hidden", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ position: "absolute", inset: 0 }}>
        <GameCanvas
          key={resetSignal}
          running={screen === "playing"}
          paused={screen === "paused"}
          debug={debug}
          muted={muted}
          quality={quality}
          onHud={onHud}
          onGameOver={onGameOver}
          onPauseRequest={onPauseRequest}
        />
      </div>

      {(screen === "playing" || screen === "paused") && (
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 5, display: "flex", justifyContent: "space-between", padding: "max(12px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right)) 12px max(16px, env(safe-area-inset-left))", color: "#fff", textShadow: "0 1px 4px rgba(0,0,0,0.6)", fontWeight: 700, pointerEvents: "none" }}>
          <span>🤖 {hud.squad} &nbsp;|&nbsp; {hud.weapon}</span>
          <span>{hud.distance}m &nbsp;|&nbsp; ⭐ {hud.score}</span>
          <span>Best {Math.max(best, hud.score)}</span>
        </div>
      )}
      {screen === "playing" && (
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 5, textAlign: "center", padding: "8px 12px max(12px, env(safe-area-inset-bottom))", color: "#fff", textShadow: "0 1px 4px rgba(0,0,0,0.6)", fontSize: 13, pointerEvents: "none" }}>
          Move the mouse (or drag on touch) to steer • A / D also work • Esc / P pauses
          <button
            style={{ pointerEvents: "auto", marginLeft: 12, background: "rgba(0,0,0,0.4)", color: "#fff", border: "1px solid rgba(255,255,255,0.5)", borderRadius: 8, padding: "4px 10px", cursor: "pointer" }}
            onClick={() => setMuted((m) => !m)}
          >
            {muted ? "🔇 Unmute" : "🔊 Mute"}
          </button>
          <button
            style={{ pointerEvents: "auto", marginLeft: 8, background: "rgba(0,0,0,0.4)", color: "#fff", border: "1px solid rgba(255,255,255,0.5)", borderRadius: 8, padding: "4px 10px", cursor: "pointer" }}
            onClick={() => setQuality((q) => (q === "high" ? "low" : "high"))}
          >
            Quality: {quality}
          </button>
        </div>
      )}

      {screen === "start" && !capture && (
        <div style={panel}>
          <h1 style={{ fontSize: 34, margin: 0 }}>Skybound Robot Runway Assault</h1>
          <p style={{ maxWidth: 520, lineHeight: 1.5, margin: 0 }}>
            Your squad auto-fires down the sky bridge. Steer with the mouse to dodge enemies,
            drive left through multiplier gates to grow your squad, and drive right to shoot
            upgrade boulders for better weapons.
          </p>
          <p style={{ margin: 0, opacity: 0.85, fontSize: 14 }}>Start: 3 robots with pistols • Gates multiply • Boulders upgrade • Don&apos;t let the squad hit zero</p>
          <button style={btn} onClick={start}>▶ Start run</button>
          <Link href="/models" style={{ color: "#8feaff" }}>View the Phase 1 model gallery</Link>
        </div>
      )}
      {screen === "paused" && (
        <div style={panel}>
          <h2 style={{ margin: 0 }}>Paused</h2>
          <p style={{ margin: 0 }}>Score {hud.score} • Distance {hud.distance}m • Squad {hud.squad}</p>
          <button style={btn} onClick={() => setScreen("playing")}>Resume</button>
          <button style={{ ...btn, background: "#334155" }} onClick={restart}>Restart</button>
        </div>
      )}
      {screen === "gameover" && (
        <div style={panel}>
          <h2 style={{ margin: 0 }}>Game over</h2>
          <p style={{ margin: 0 }}>Score {hud.score} • Distance {hud.distance}m • Kills {hud.kills} • Best {best}</p>
          <button style={btn} onClick={restart}>↻ Play again</button>
        </div>
      )}

      {debug && screen === "playing" && (
        <div style={{ position: "absolute", left: 12, top: 56, zIndex: 6, background: "rgba(0,0,0,0.65)", color: "#fff", padding: 10, borderRadius: 8, fontSize: 12, lineHeight: 1.6 }}>
          <div>FPS {hud.fps} • Enemies {hud.enemies} • Projectiles {hud.projectiles} • Squad {hud.squad}</div>
          <label><input type="checkbox" checked={god} onChange={(e) => { setGod(e.target.checked); (game()?.setGodMode as ((v: boolean) => void) | undefined)?.(e.target.checked); }} /> God mode</label>
          <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
            <button onClick={() => (game()?.spawnEnemy as ((k: string, x: number, z: number) => void) | undefined)?.("crawler", 0, -30)}>+ Crawler</button>
            <button onClick={() => (game()?.spawnEnemy as ((k: string, x: number, z: number) => void) | undefined)?.("golem", 0, -30)}>+ Golem</button>
            <button onClick={() => (game()?.spawnGate as ((m: number, z: number) => void) | undefined)?.(2, -30)}>+ Gate 2x</button>
            <button onClick={() => (game()?.spawnBoulder as ((t: string, hp: number, z: number) => void) | undefined)?.("minigun", 20, -30)}>+ Boulder</button>
          </div>
        </div>
      )}
    </main>
  );
}
