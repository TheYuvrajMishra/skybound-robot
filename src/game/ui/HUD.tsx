'use client';
import { useUI, loadBest, saveBest } from './store';
import { gameControl } from './controller';
import { BALANCE, type WeaponId } from '../config/balance';
export default function HUD() {
  const { phase, score, best, squad, weapon, event, fps } = useUI();
  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col p-4 text-white" role="status">
      <div className="flex justify-between gap-2 text-sm font-bold drop-shadow">
        <span>Squad: {squad}/{BALANCE.maxSquad}</span>
        <span>Weapon: {BALANCE.weapons[weapon].name}</span>
        <span>Score: {score} · Best: {Math.max(best, score)}</span><span>FPS: {fps}</span>
        <button className="pointer-events-auto rounded bg-cyan-600 px-3 py-1" onClick={() => gameControl.pause()} aria-label="Pause or resume">Pause</button>
      </div>
      {event ? <div className="mx-auto mt-2 rounded bg-black/50 px-3 py-1 text-lg font-bold">{event}</div> : null}
      {phase === 'MENU' ? (
        <div className="pointer-events-auto m-auto max-w-md rounded bg-black/60 p-6 text-center">
          <h1 className="text-3xl font-bold">Skybound Robot Runway Assault</h1>
          <p className="mt-2 text-sm">Strafe with A/D or drag. Your squad auto-shoots. Hit left gates to grow, break right boulders to upgrade. Don&apos;t let enemies reach you.</p>
          <button className="mt-4 rounded bg-cyan-500 px-6 py-2 font-bold" onClick={() => { saveBest(loadBest()); gameControl.start(); }}>Start</button>
          <p className="mt-2 text-xs">Space/Esc pause · R restart · Works on touch, 360px to 4K</p>
        </div>
      ) : null}
      {phase === 'PAUSED' ? (
        <div className="pointer-events-auto m-auto rounded bg-black/60 p-6 text-center"><h2 className="text-2xl font-bold">Paused</h2><button className="mt-4 rounded bg-cyan-500 px-6 py-2 font-bold" onClick={() => gameControl.pause()}>Resume</button></div>
      ) : null}
      {phase === 'GAME_OVER' ? (
        <div className="pointer-events-auto m-auto rounded bg-black/60 p-6 text-center"><h2 className="text-2xl font-bold">Game Over</h2><p className="mt-2">Score {score}</p><button className="mt-4 rounded bg-cyan-500 px-6 py-2 font-bold" onClick={() => gameControl.restart()}>Restart (R)</button></div>
      ) : null}
    </div>
  );
}
