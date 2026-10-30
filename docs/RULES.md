# RULES

All tunables live in `src/game/config/balance.ts`.

- State: MENU -> PLAYING -> PAUSED -> GAME_OVER -> MENU/RESTART. Restart fully resets entities.
- Squad: starts 1, cap 40. Formation slots: slot 0 front-centre, then rows backward, widening outward, clamped to centre corridor x in [-1.2, 1.2]. Strafe A/D, arrows, pointer/touch drag. Never enters gate/boulder lanes.
- HP: 1 hit = 1 robot lost. Invulnerability 0.8s after a loss.
- Shooting: fixed interval per weapon (pistol 0.45s, minigun 0.12s, rocket 0.9s, targeting 0.4s), every robot fires in sync with deterministic jitter via seeded RNG for spread. Targeting rifle homes to nearest enemy within x-distance 3 ahead. Bullets pooled, lifetime 3s, speed 30, swept collision prevZ->newZ.
- Weapons: pistol dmg 1 single; minigun dmg 1 very fast spread; rocket dmg 6 AoE 3; targeting dmg 3 pierce 1 homing. Damage is per-weapon, not per-robot stacked. Whole squad shares the weapon, including robots added later.
- Enemies: imp HP 1, speed 6, swarm 3-6, score 10; golem HP 8, speed 2.5, score 50, appears after 150m at 12% of waves, sometimes escorted by 2 imps. Spawn at z=-70, cap 250 alive, minimum wave gap 1.0s. Enemies move at speed + 0.35*scrollSpeed. Contact at z>=-0.5 kills one robot, enemy removed. Passing enemies despawn at z=8.
- Gates (left lane, x=-4): spawn every 5-9s, value 1-3. Bullet hit +1 up to 99. Apply at z>=0, once, additive, cap conversion to score as in DECISIONS.md.
- Boulders (right lane, x=4): spawn every 7-12s, HP = 4 + tier*4 + floor(distance/500), weapon icon random. Break grants upgrade per tier rule in DECISIONS.md. Unbroken boulders despawn at z=2 with no effect.
- Score: floor(distance) + kill points + cap-excess bonus. Scroll speed 8 -> 16, ramp 0.004 per metre. High score in localStorage key `skybound-high-score-v1`, try/catch.
- Input: Space/Esc pause, R restart, blur/visibilitychange auto-pause, first touch controls, pointer capture released on cancel.
- Fixed timestep 60Hz, dt clamped to 0.05s, seeded RNG (mulberry-style step in systems.ts).
