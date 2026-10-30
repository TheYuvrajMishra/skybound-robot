# Skybound Robot Runway Assault — Rules (Phase 2, v1.0-playable)

Every gameplay rule, in one place. Tunable numbers live in `src/config/game.ts`
and `src/config/spawn.ts`; this document states the rules, not the numbers.

## World and camera

- The squad stays at z = 0 and the world scrolls toward the camera (+Z).
  Scroll speed starts at `SCROLL_BASE` and grows with distance, capped at
  `SCROLL_MAX`. Road tiles recycle by distance modulo so the bridge is endless.
- The road is 6 units wide (`ROAD_HALF` = 3.0) split into 3 partitions by
  white lane lines: LEFT = multiplier gates, CENTER = squad and enemies,
  RIGHT = upgrade boulders. Gates spawn at `GATE_X` (-2.4), boulders at
  `BOULDER_X` (+2.4).
- The camera sits behind and above the squad, looking down the bridge to the
  vanishing point (FOV ~55, pitch ~30° tuned in config). It lags slightly
  behind the squad's lateral movement. FOV/distance adapt to aspect ratio so
  the full road width is visible in portrait and landscape.

## Demo entities (start-screen decoration)

- The entities seeded at startup for the start screen and hero captures
  (2 gates, 2 boulders, 2 crawlers, 1 golem) carry `demo: true`. They render
  and scroll like live entities, but in the sim they never damage the squad,
  never multiply it, never grant a weapon, never push it, and never absorb
  bullets; demo enemies despawn once past z = 2. This was fixed after a
  playtest showed the demo golem wiping a fresh 3-robot squad at ~4 s when
  the player steered right (the widened formation overlaps a centre golem).
  Live gates/boulders/enemies are unaffected; capture staging uses live
  (non-demo) entities.

## Controls

- **Steer by mouse move (primary control):** pointer x, normalised over the
  canvas, maps to a target world X across the full road width. The squad
  follows with critically damped smoothing (`SPRING_STIFFNESS` /
  `SPRING_DAMPING`) and a max lateral speed (`MAX_LAT_SPEED`). The target is
  clamped so the whole formation stays on the road (formation width counts).
- `LANE_SNAP` exists in config and defaults to `false` (continuous steering,
  no lane snapping).
- Pointer Events only (mouse, touch drag, pen), primary pointer only. Before
  the first move the squad is centred. If the pointer leaves the window, the
  last target is kept. Input is ignored on the start, pause and game-over
  screens. `touch-action: none`; text selection, scrolling and the context
  menu are blocked on the canvas.
- **Keyboard fallback:** A/D and arrow keys move, `Esc`/`P` pauses. Key
  movement uses `KEY_LAT_SPEED`.
- **Auto-pause:** window blur or tab hidden pauses the run. Resize recomputes
  the pointer mapping. `devicePixelRatio` changes are handled by re-measuring
  the canvas on resize.

## Tick order (deterministic)

Every fixed step (1/60 s) runs, in order:

1. input (pointer/key target, clamped, NaN-guarded)
2. movement (squad spring, world scroll, entity motion)
3. spawn (waves, gates, boulders from `config/spawn.ts` schedules)
4. fire (auto-fire, see below)
5. projectile hits (swept segment-vs-AABB, so fast projectiles never tunnel)
6. contacts (enemies reaching the squad line)
7. gate / boulder resolution (multiplies, grants)
8. deaths (squad dying timer, enemy/boulder removal)
9. score (`floor(distance) + kills * SCORE_PER_KILL`)

Positions are NaN/Infinity-guarded on every tick; a bad value is clamped to
the last sane value, never propagated.

## Auto-fire and weapons

- Every robot shoots straight ahead from its own formation slot x, at its
  weapon's interval, with a small auto-aim cone (`AUTO_AIM_DEG`, default ±6°).
- Weapon tiers, strictly ordered: pistol < minigun < rocket-launcher <
  targeting-rifle. The rocket has area-of-effect splash; the targeting rifle
  homes slightly and pierces (it tracks a per-projectile `hitIds` set, so one
  enemy is never damaged twice by the same bolt).
- Total DPS scales with squad size: each visible robot fires independently,
  and damage also scales with the true count (see formation cap below).
- Projectile pool is capped (`PROJECTILE_POOL`). On exhaustion the oldest
  lowest-tier projectile is dropped; the game never crashes.
- **Weapon swap with projectiles in flight:** in-flight projectiles keep the
  stats of the weapon that fired them; only new shots use the new weapon.
- `GATE_SHOT_TO_UPGRADE` exists in config and defaults to `false` (gates
  multiply the squad; they never upgrade weapons by being shot).

## Enemies

- **Crawler:** low HP, fast, spawns in swarms. **Golem:** high HP, slow, tanky.
- Enemies spawn at the far end (`SPAWN_FAR`) in seeded waves, mainly in the
  centre lane with some lateral spread. The difficulty director scales count,
  HP and speed with distance and time, with caps, minimum spawn gaps and a
  per-wave spawn budget (max 14) so every wave is beatable.
- **Contact:** an enemy reaching the squad z-line (`SQUAD_LINE_Z`) while
  overlapping the squad's lateral extent hits the squad. A crawler kills 1
  robot and dies. A golem kills 3 immediately and keeps attacking every 1 s
  while it stays in contact.
- **Leak (ASSUMPTION — see below):** an enemy that reaches the squad line
  OUTSIDE the squad's lateral extent slips past: it counts as a leak, deals
  NO damage, and despawns. Rationale: the spec's "they hit once, then
  despawn" is ambiguous, and damaging the squad for enemies it successfully
  dodged would make lane dodging pointless. This is flagged for confirmation.
- Overkill damage is discarded; splash damage never re-hits an already-dead
  enemy (dead enemies are removed from hit tests the same tick).

## Gates (left lane)

- When a gate crosses the squad z-line while overlapping the squad's X
  range, the squad count becomes `ceil(count * N)`, capped at `MAX_SQUAD`.
  Each gate triggers exactly once, even if it overlaps for several ticks.
- A gate that does not overlap the squad's X range passes harmlessly.
- Gate multipliers cycle through `GATE_MULTS` ([2, 2, 3]); spacing follows
  `nextGateDistance` in `config/spawn.ts`.

## Boulders (right lane)

- A boulder's HP equals its shown number. Bullets damage it; its label counts
  down as HP falls (the label redraws only when the value changes).
- At 0 HP the weapon is granted exactly once, even if several bullets land
  in the same tick (a `pendingGrant` + `granted` guard).
- The spawner only offers tiers >= the current weapon tier. At max tier, a
  destroyed boulder instead grants a damage boost (+0.25) and a fire-rate
  boost (+0.15), stacking. Re-breaking your current tier's boulder grants
  the same boost (it used to grant nothing, which made pistol-era
  boulders feel like duds).
- **Boulders are solid:** as a boulder approaches from z = -8 to the squad
  line, a wall position blends from the road clamp to the clear position
  beside the boulder, guiding the squad clear at ~1 unit/s with its held
  input intact; this deals NO damage. (The old rule teleported the squad
  to the clear position the tick the boulder reached the line — a 1.1-unit
  jump that also overwrote targetX. An even earlier z ± 1.2 push zone
  shoved the squad clear before its volleys could land, making boulders
  nearly unbreakable.)
- An unbroken boulder that scrolls past the squad line is lost.
- Boulders that reach the line while the squad is elsewhere also pass
  harmlessly.

## Squad and formation

- `START_SQUAD` = 3, `MAX_SQUAD` = 99. `MAX_VISIBLE` = 40 robots are drawn;
  above 40, the HUD shows the true count and damage keeps scaling with the
  true count.
- Formation slots: rows of up to 5, 0.55 x-spacing, 0.65 z-spacing, front row
  at z = 0 and further rows toward the camera. Units spring to their slots
  (never teleport); slots re-layout when the count changes. When robots are
  added they spawn-pop (scale overshoot); when killed they tumble, spark and
  shrink.
- Edge cases: squad 0, 1 and MAX are all handled (1 robot = single front slot;
  MAX clamps gates; 0 starts the death sequence).

## Lose, score, best score

- Squad count 0 starts a 1.2 s death animation, then the game-over screen.
- Score = `floor(distance) + kills * SCORE_PER_KILL` (K = 25).
- Best score persists in `localStorage` key `skybound-best-score`
  (try/catch, SSR-safe; a failure simply disables persistence).
- Restart fully resets the seed, pools, timers, camera and tweens. It is
  implemented as a React `key` remount of the game canvas, which guarantees
  a clean WebGL context and pool state (at the cost of context re-creation).
- Pause freezes the simulation and all animations. Pause during game over is
  a no-op (the game-over screen takes precedence).

## HUD and audio

- HUD is an HTML overlay (Tailwind, safe-area aware): squad count, weapon,
  distance, score, best. No text is baked into the 3D models; numbers and
  icons appear only through canvas textures on gates/boulders.
- `?debug=1` shows FPS, entity counts, a god-mode toggle and spawn tools
  (spawn crawler / golem / gate / boulder).
- Optional procedural WebAudio SFX (shoot, hit, gate, grant, death, game
  over) start only after the first user gesture; a mute toggle is in the HUD.
- `prefers-reduced-motion` reduces camera shake and flash intensity.
- No-WebGL browsers get a fallback screen; a lost WebGL context shows a
  "context lost" overlay (recovery requires a page reload).

## Balance targets

- First 30 s beatable with the pistol. A casual player survives 60–90 s; a
  skilled player survives > 5 min. Tuning is done only via config values.

## Simulation determinism

- The sim (`src/game/sim.ts`) uses a seeded mulberry32 RNG — never
  `Math.random` — and a fixed 1/60 s step with an accumulator (max 5 steps
  per frame, backlog dropped after tab resume). Render interpolation lerps
  `prev` → `current` state each frame. `window.__advance(dt)` steps the sim
  deterministically for tests and captures; `window.__game.snapshot()`
  exposes the current counts.
