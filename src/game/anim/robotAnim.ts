export function animateRobot(group: { getObjectByName: (n: string) => unknown }, time: number, speed: number, reducedMotion: boolean): void {
  const g = group as unknown as { getObjectByName: (n: string) => { rotation: { x: number } } | null };
  if (reducedMotion) return;
  const legL = g.getObjectByName('legL'); const legR = g.getObjectByName('legR'); const armL = g.getObjectByName('armL'); const armR = g.getObjectByName('armR');
  const s = Math.sin(time * 8 * Math.max(0.3, speed / 10));
  if (legL) legL.rotation.x = s * 0.5; if (legR) legR.rotation.x = -s * 0.5; if (armL) armL.rotation.x = -s * 0.4; if (armR) armR.rotation.x = s * 0.4;
}
