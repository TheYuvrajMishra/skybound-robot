export function animateGolem(group: { getObjectByName: (n: string) => unknown }, time: number): { shake: number } {
  const g = group as unknown as { getObjectByName: (n: string) => { rotation: { x: number } } | null };
  const armL = g.getObjectByName('armL'); const armR = g.getObjectByName('armR');
  if (armL) armL.rotation.x = Math.sin(time * 2) * 0.15; if (armR) armR.rotation.x = -Math.sin(time * 2) * 0.15;
  return { shake: Math.abs(Math.sin(time * 2)) < 0.05 ? 0.12 : 0 };
}
