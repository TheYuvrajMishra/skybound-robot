export function animateImp(group: { getObjectByName: (n: string) => unknown }, time: number, phase: number): void {
  const g = group as unknown as { getObjectByName: (n: string) => { rotation: { x: number } } | null };
  for (let i = 0; i < 6; i++) { const leg = g.getObjectByName(`leg${i}`); if (leg) leg.rotation.x = Math.sin(time * 14 + phase + i) * 0.6; }
}
