'use client';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useMemo, useRef, useState } from 'react';
import { createRobot, createImp, createGolem } from '@/game/models/characters';
import { createGate, createBoulder } from '@/game/models/environment';
import { animateRobot, animateImp, animateGolem } from '@/game/anim/system';
const MODELS: Record<string, () => THREE.Group> = { robot: createRobot, imp: createImp, golem: createGolem, gate: createGate, boulder: createBoulder };
function Animated({ name, anim, speed }: { name: string; anim: string; speed: number }) {
  const ref = useRef<THREE.Group>(null); const t = useRef(0);
  const group = useMemo(() => { const f = MODELS[name]; return f ? f() : new THREE.Group(); }, [name]);
  useFrame((_, dt) => { t.current += dt * speed; const g = ref.current; if (!g) return; if (anim === 'run' && name === 'robot') animateRobot(g, t.current, 10, false); if (anim === 'scuttle' && name === 'imp') animateImp(g, t.current, 0); if (anim === 'stomp' && name === 'golem') animateGolem(g, t.current); if (anim === 'pulse' && (name === 'gate' || name === 'boulder')) { const s = 1 + Math.sin(t.current * 4) * 0.03; g.scale.setScalar(s); } if (anim === 'idle' && name === 'robot') animateRobot(g, t.current, 3, false); });
  return <group ref={ref}><primitive object={group} /></group>;
}
export default function AnimsPage() {
  const [name, setName] = useState('robot'); const [anim, setAnim] = useState('run'); const [speed, setSpeed] = useState(1);
  return (<main className="p-4"><h1 className="text-xl font-bold">Animation viewer</h1><div className="mt-2 flex gap-2">
    <label>Model <select value={name} onChange={(e) => setName(e.target.value)} className="border p-1">{Object.keys(MODELS).map((k) => <option key={k} value={k}>{k}</option>)}</select></label>
    <label>Animation <select value={anim} onChange={(e) => setAnim(e.target.value)} className="border p-1">{['idle', 'run', 'scuttle', 'stomp', 'pulse'].map((k) => <option key={k} value={k}>{k}</option>)}</select></label>
    <label>Speed {speed.toFixed(1)} <input type="range" min={0.1} max={3} step={0.1} value={speed} onChange={(e) => setSpeed(Number(e.target.value))} /></label></div>
    <div className="mt-4 h-[70vh] bg-neutral-300"><Canvas camera={{ position: [3, 2, 4], fov: 50 }}><ambientLight intensity={0.8} /><directionalLight position={[5, 10, 5]} intensity={1.5} /><Animated name={name} anim={anim} speed={speed} /><OrbitControls /></Canvas></div></main>);
}
