# MODELS

All factories return a THREE.Group, origin at ground centre, facing -Z, flatShading, shared palette in `src/game/config/palette.ts`. Triangle counts are verified by `npm run tri-budget` (tests/tri-budget.test.ts).

- robot (~1.0-1.4 units tall in code, torso/head/arms/legs/core/gunMount named nodes; gunMount is the weapon attach point; setWeapon() swaps weapons)
- imp (~0.6): body, eyeL/eyeR, legs[0..5]
- golem (~1.8): torso, head, armL/armR, cracks (emissive orange-red)
- pistol, minigun, rocketLauncher, targetingRifle (attach via setWeapon)
- gate: postL/postR, glass (transparent cyan), label (CanvasTexture, scale-fit 1-4 digits, icons drawn as canvas vectors)
- boulder: rock, facePanel (CanvasTexture HP + weapon icon), rubble
- roadTile: base, lineL/lineR, railL/railR; 12-unit tile, seamless recycling on Z
- banner: post + cloth (blue, diamond emblem in reference; cloth sway in anim system)
- railPost, spire, floatingPlatform, cloud, projectiles (bolt + rocket)

Budgets: golem <=1200, robot <=900, imp <=500, all others <=1500. Actual counts are printed by the tri-budget test run.
