'use client';
import * as THREE from 'three';
import { useEffect, useRef, useState } from 'react';
import { createGame, restartGame, formationSlots } from '../sim/state';
import { step } from '../sim/systems';
import { createRobot, createImp, createGolem } from '../models/characters';
import { createGate, createBoulder } from '../models/environment';
import { createCamera, applyResponsive } from './cameraRig';
import { createLights } from './lighting';
import { applySky } from './sky';
import { createRoadTiles, updateRoadTiles } from './roadStreamer';
import { createDecor, updateDecor } from './decor';
import { QUALITY } from './quality';
import { strafeFromDrag } from '../input/strafe';
import { setWeapon } from '../models/weapons';
import { setLabel, disposeGroup } from '../models/helpers';
import { animateRobot, animateImp, animateGolem } from '../anim/system';
import { useUI, loadBest, saveBest } from '../ui/store';
import { gameControl } from '../ui/controller';
import { BALANCE } from '../config/balance';

export default function GameCanvas({ showcase = false }: { showcase?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' }); } catch { setFailed(true); return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, QUALITY.high.pixelRatioCap)); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    const scene = new THREE.Scene(); applySky(scene);
    const camera = createCamera();
    const resize = () => { const w = el.clientWidth || 800, h = el.clientHeight || 600; renderer.setSize(w, h); applyResponsive(camera, w, h); };
    resize(); el.appendChild(renderer.domElement);
    createLights(scene);
    const tiles = createRoadTiles(scene);
    const decor = createDecor(scene);
    const sim = createGame(12345);
    if (showcase) { sim.phase = 'PLAYING'; sim.squad = 5; sim.gates.push({ id: 900, z: -20, value: 2, applied: false }); sim.boulders.push({ id: 901, z: -28, hp: 5, maxHp: 10, weapon: 'rocket' }); sim.enemies.push({ id: 902, kind: 'imp', x: -0.5, z: -35, hp: 1, maxHp: 1, speed: 6, phase: 0 }); sim.enemies.push({ id: 903, kind: 'golem', x: 0.8, z: -45, hp: 8, maxHp: 8, speed: 2.5, phase: 1 }); }
    else sim.phase = 'MENU';
    const input = { left: false, right: false, strafe: 0 };
    const robots: THREE.Group[] = []; let curWeapon = sim.weapon;
    for (let i = 0; i < BALANCE.maxSquad; i++) { const r = createRobot(); setWeapon(r, 'pistol'); r.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) m.castShadow = true; }); r.visible = false; scene.add(r); robots.push(r); }
    const enemyMap = new Map<number, THREE.Group>(); const impPool: THREE.Group[] = []; const golemPool: THREE.Group[] = [];
    const bulletPool: THREE.Mesh[] = []; for (let i = 0; i < 120; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.8), new THREE.MeshStandardMaterial({ color: 0x00e5ff, emissive: 0x00e5ff, emissiveIntensity: 1.5 })); m.visible = false; scene.add(m); bulletPool.push(m); }
    const gateMap = new Map<number, THREE.Group>(); const boulderMap = new Map<number, THREE.Group>();
    const getEnemy = (kind: string) => { const pool = kind === 'golem' ? golemPool : impPool; let g = pool.pop(); if (!g) { g = kind === 'golem' ? createGolem() : createImp(); g.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) m.castShadow = true; }); } g.visible = true; scene.add(g); return g; };
    let raf = 0; let last = performance.now(); let acc = 0; let uiTimer = 0; let frames = 0; let fpsTimer = 0; let lastEvent = ''; let destroyed = false;
    const keyDown = (e: KeyboardEvent) => { if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') input.left = true; if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') input.right = true; if (e.key === ' ' || e.key === 'Escape') { e.preventDefault(); gameControl.pause(); } if (e.key === 'r' || e.key === 'R') gameControl.restart(); };
    const keyUp = (e: KeyboardEvent) => { if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') input.left = false; if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') input.right = false; };
    let dragX: number | null = null;
    const pDown = (e: PointerEvent) => { dragX = e.clientX; }; const pMove = (e: PointerEvent) => { if (dragX !== null) input.strafe = strafeFromDrag(dragX, e.clientX); }; const pUp = () => { dragX = null; input.strafe = 0; };
    const onVis = () => { if (document.hidden && sim.phase === 'PLAYING') { sim.phase = 'PAUSED'; useUI.getState().set({ phase: 'PAUSED' }); } };
    const onLost = (e: Event) => { e.preventDefault(); sim.phase = 'PAUSED'; useUI.getState().set({ phase: 'PAUSED' }); };
    window.addEventListener('keydown', keyDown); window.addEventListener('keyup', keyUp); window.addEventListener('resize', resize);
    el.addEventListener('pointerdown', pDown); el.addEventListener('pointermove', pMove); el.addEventListener('pointerup', pUp); el.addEventListener('pointercancel', pUp);
    document.addEventListener('visibilitychange', onVis); renderer.domElement.addEventListener('webglcontextlost', onLost);
    gameControl.start = () => { const g = restartGame(sim); Object.assign(sim, g); useUI.getState().set({ phase: 'PLAYING', best: loadBest() }); };
    gameControl.pause = () => { if (sim.phase === 'PLAYING') { sim.phase = 'PAUSED'; useUI.getState().set({ phase: 'PAUSED' }); } else if (sim.phase === 'PAUSED') { sim.phase = 'PLAYING'; useUI.getState().set({ phase: 'PLAYING' }); } };
    gameControl.restart = () => { const g = restartGame(sim); Object.assign(sim, g); useUI.getState().set({ phase: 'PLAYING' }); };
    useUI.getState().set({ phase: sim.phase, best: loadBest() });
    const loop = (now: number) => {
      if (destroyed) return; raf = requestAnimationFrame(loop);
      const dt = Math.min((now - last) / 1000, 0.05); last = now; frames += 1; fpsTimer += dt; if (fpsTimer >= 1) { useUI.getState().set({ fps: frames }); frames = 0; fpsTimer = 0; }
      if (sim.phase === 'PLAYING' && !showcase) { acc += dt; while (acc >= 1 / 60) { step(sim, input, 1 / 60); acc -= 1 / 60; } }
      const reduced = useUI.getState().reducedMotion;
      // Road scroll (world moves toward player; squad stays near origin).
      if (sim.phase === 'PLAYING') { const dz = sim.scrollSpeed * dt; updateRoadTiles(tiles, dz); updateDecor(decor, dz); }
      const slots = formationSlots(sim.squad);
      if (curWeapon !== sim.weapon) { curWeapon = sim.weapon; for (const r of robots) setWeapon(r, curWeapon); }
      robots.forEach((r, i) => { if (i < sim.squad && slots[i]) { r.visible = true; r.position.set(sim.squadX + (slots[i]?.x ?? 0), 0, (slots[i]?.z ?? 0)); animateRobot(r, sim.time, sim.scrollSpeed, reduced); } else r.visible = false; });
      const seen = new Set<number>();
      for (const e of sim.enemies) { seen.add(e.id); let g = enemyMap.get(e.id); if (!g) { g = getEnemy(e.kind); enemyMap.set(e.id, g); } g.position.set(e.x, 0, e.z); if (e.kind === 'imp') animateImp(g, sim.time, e.phase); else { const sh = animateGolem(g, sim.time); if (sh.shake && !reduced) camera.position.y = 9.5 + sh.shake * 0.2; } }
      for (const [id, g] of [...enemyMap]) if (!seen.has(id)) { g.visible = false; (g.name === 'golem' ? golemPool : impPool).push(g); enemyMap.delete(id); };
      bulletPool.forEach((m, i) => { const b = sim.bullets[i]; if (b) { m.visible = true; m.position.set(b.x, 0.7, b.z); } else m.visible = false; });
      const seenG = new Set<number>();
      for (const gt of sim.gates) { seenG.add(gt.id); let g = gateMap.get(gt.id); if (!g) { g = createGate(); scene.add(g); gateMap.set(gt.id, g); } g.position.set(BALANCE.leftLaneX, 0, gt.z); if (g.userData.labelText !== `${gt.value}x`) setLabel(g, { text: `${gt.value}x`, iconId: '' }); }
      for (const [id, g] of [...gateMap]) if (!seenG.has(id)) { scene.remove(g); disposeGroup(g); gateMap.delete(id); };
      const seenB = new Set<number>();
      for (const bo of sim.boulders) { seenB.add(bo.id); let g = boulderMap.get(bo.id); if (!g) { g = createBoulder(); scene.add(g); boulderMap.set(bo.id, g); } g.position.set(BALANCE.rightLaneX, 0, bo.z); const label = `${bo.hp}`; if (g.userData.labelText !== label) setLabel(g, { text: label, iconId: bo.weapon === 'rocket' ? 'rocket' : bo.weapon === 'minigun' ? 'minigun' : bo.weapon === 'targeting' ? 'crosshair' : 'pistol' }); }
      for (const [id, g] of [...boulderMap]) if (!seenB.has(id)) { scene.remove(g); disposeGroup(g); boulderMap.delete(id); };
      uiTimer += dt; if (uiTimer > 0.1 || sim.phase !== useUI.getState().phase || sim.lastEvent !== lastEvent) { uiTimer = 0; lastEvent = sim.lastEvent; useUI.getState().set({ phase: sim.phase, score: sim.score, squad: sim.squad, weapon: sim.weapon, event: sim.lastEvent }); if (sim.phase === 'GAME_OVER') saveBest(Math.max(loadBest(), sim.score)); }
      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      destroyed = true; cancelAnimationFrame(raf); window.removeEventListener('keydown', keyDown); window.removeEventListener('keyup', keyUp); window.removeEventListener('resize', resize); el.removeEventListener('pointerdown', pDown); el.removeEventListener('pointermove', pMove); el.removeEventListener('pointerup', pUp); el.removeEventListener('pointercancel', pUp); document.removeEventListener('visibilitychange', onVis); renderer.domElement.removeEventListener('webglcontextlost', onLost);
      scene.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.geometry.dispose(); } }); renderer.dispose(); if (renderer.domElement.parentElement === el) el.removeChild(renderer.domElement);
    };
  }, [showcase]);
  if (failed) return <div className="flex h-full items-center justify-center bg-slate-200 p-6 text-center">WebGL is not available in this browser. Try a browser with WebGL enabled, or reload.</div>;
  return <div ref={ref} className="h-full w-full touch-none" aria-label="Skybound Robot Runway Assault game canvas" />;
}
