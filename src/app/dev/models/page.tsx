'use client';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useMemo, useRef, useState } from 'react';
import { createRobot, createImp, createGolem } from '@/game/models/characters';
import { createPistol, createMinigun, createRocketLauncher, createTargetingRifle } from '@/game/models/weapons';
import { createGate, createBoulder, createRoadTile, createBanner, createRailPost, createSpire, createFloatingPlatform, createCloud, createProjectiles } from '@/game/models/environment';
import { triCount } from '@/game/models/helpers';
const FACTORIES: Record<string, () => THREE.Group> = { robot: createRobot, imp: createImp, golem: createGolem, pistol: createPistol, minigun: createMinigun, rocketLauncher: createRocketLauncher, targetingRifle: createTargetingRifle, gate: createGate, boulder: createBoulder, roadTile: createRoadTile, banner: createBanner, railPost: createRailPost, spire: createSpire, floatingPlatform: createFloatingPlatform, cloud: createCloud, projectiles: createProjectiles };
function Viewer({ name, turntable, wireframe }: { name: string; turntable: boolean; wireframe: boolean }) {
  const ref = useRef<THREE.Group>(null);
  const group = useMemo(() => { const f = FACTORIES[name]; if (!f) return new THREE.Group(); const g = f(); g.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { const mat = m.material as THREE.MeshStandardMaterial; mat.wireframe = wireframe; } }); return g; }, [name, wireframe]);
  useFrame((_, dt) => { if (turntable && ref.current) ref.current.rotation.y += dt * 0.8; });
  return <group ref={ref}><primitive object={group} /></group>;
}
export default function ModelsPage() {
  const [name, setName] = useState('robot'); const [turntable, setTurntable] = useState(true); const [wireframe, setWireframe] = useState(false); const [preset, setPreset] = useState<[number, number, number]>([3, 2, 4]);
  const stats = useMemo(() => { const f = FACTORIES[name]; if (!f) return { tris: 0, box: '' }; const g = f(); const box = new THREE.Box3().setFromObject(g); const s = box.getSize(new THREE.Vector3()); return { tris: triCount(g), box: `${s.x.toFixed(2)} × ${s.y.toFixed(2)} × ${s.z.toFixed(2)}` }; }, [name]);
  return (<main className="p-4"><h1 className="text-xl font-bold">Model viewer</h1><div className="mt-2 flex flex-wrap gap-2">
    <label>Asset <select value={name} onChange={(e) => setName(e.target.value)} className="border p-1">{Object.keys(FACTORIES).map((k) => <option key={k} value={k}>{k}</option>)}</select></label>
    <button className="border px-2" onClick={() => setTurntable(!turntable)}>Turntable: {turntable ? 'on' : 'off'}</button>
    <button className="border px-2" onClick={() => setWireframe(!wireframe)}>Wireframe: {wireframe ? 'on' : 'off'}</button>
    <button className="border px-2" onClick={() => setPreset([3, 2, 4])}>Front</button>
    <button className="border px-2" onClick={() => setPreset([-3, 2, -4])}>Back</button>
    <button className="border px-2" onClick={() => setPreset([1, 1, 1.5])}>Close-up</button>
    <span>Triangles: {stats.tris} · Bounding box: {stats.box}</span></div>
    <div className="mt-4 h-[70vh] bg-neutral-300"><Canvas camera={{ position: preset, fov: 50 }}><ambientLight intensity={0.8} /><directionalLight position={[5, 10, 5]} intensity={1.5} /><gridHelper args={[20, 20]} /><Viewer name={name} turntable={turntable} wireframe={wireframe} /><OrbitControls /></Canvas></div></main>);
}
