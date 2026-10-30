# Skybound Robot Runway Assault — Phase 2 (Playable)

Next.js App Router + TypeScript + direct Three.js (no R3F in the game path).
Phase 1 models + Phase 2 scene, procedural animations, game rules and controls,
playable end to end on desktop mouse and touch.

## Run
```bash
npm install
npm run dev        # http://localhost:3000 — click "Start run"
npm run build
npm test           # vitest: sim rules (gates, damage, waves, swept collision, lose, score)
```

## Controls
- **Steer by mouse move:** pointer x maps across the full road width; the
  squad follows with critically damped smoothing. Touch drag and pen work
  the same way (`touch-action: none` on the canvas).
- **Keyboard fallback:** A/D or arrow keys move, Esc/P pauses.
- **Goal:** auto-fire clears enemies; drive LEFT through multiplier gates to
  grow the squad; drive RIGHT to shoot upgrade boulders for better weapons
  (pistol → minigun → rocket-launcher → targeting-rifle). Squad 0 = game over.
- **HUD:** squad count, weapon, distance, score, best (localStorage).
- **Debug:** `?debug=1` shows FPS, entity counts, god mode, spawn tools.
- **Captures:** `?shot=hero` (deterministic hero frame) and `?anim=<name>`
  (robot-fire, golem-walk, boulder-break frame sequences via `__advance`).

## Config
All tunable numbers live in one file: `src/config/game.ts` (speeds, HP,
weapon stats, camera, fog, pools, balance). Spawn schedules live in
`src/config/spawn.ts`. Balance targets: first 30 s beatable with pistol,
casual survives 60–90 s, skilled > 5 min. Tune only via config.
Full rules: `docs/RULES.md`. Phase 2 log (incl. the repo correction):
`docs/phase2-log.md`.

## Gallery / viewer (Phase 1)
- Gallery: `/models`
- Viewer: `/models/<id>?view=front|back|close|iso|sheet|tiled&turntable=0`
- Holding check: `/models/robot?view=iso&holding=pistol` (also minigun, rocket-launcher, targeting-rifle)
- Road seam check: `/models/road?view=tiled`

## Screenshots / e2e
```bash
npm run build && npx next start -p 3100 &
SHOOT_BASE=http://localhost:3100 npm run shoot-game   # screenshots/game/ (hero + anim frames)
E2E_BASE=http://localhost:3100 npx tsx scripts/e2e-game.ts   # gate, boulder, lose, restart
```
Requires Playwright Chromium with SwiftShader flags (see scripts/shoot-game.ts).
Captures are verified non-blank (file size + zero console errors) before review.
Note: headless RAF is throttled, so e2e/playtests drive the sim with
`window.__advance(dt)` instead of wall-clock waiting.

## Roll back
- Local tags: `v0.1-models` (Phase 1 models, needs-review set),
  `v0.2-scene`, `v0.3-animations`, `v0.4-rules`, `v1.0-playable`.
  Check out a tag to roll back to that stage.
- Revert a single commit without rewriting history: `git revert <commit-hash>`.
- Never force-push, squash, merge remote, or delete branches/tags. Local
  history is authoritative; remote main is a single connector snapshot
  commit (see `docs/phase2-log.md` for the repo correction and the tag
  limitation: the connector cannot create remote tags).
- Remote pushes use the GitHub connector snapshot route (plain `git push`
  has no credentials in this VM).

## Phase 2 exports
See `src/models/registry.ts`: `REGISTRY` and all `build<Subject>()`
functions. Game code: `src/game/sim.ts` (pure deterministic sim),
`src/game/GameCanvas.tsx` (renderer + animation), `src/game/labels.ts`
(canvas-texture gate/boulder labels), `src/game/audio.ts` (WebAudio SFX),
`src/game/anim.ts` (easing/pop/breathing helpers).
Docs: `docs/model-log.md`, `docs/phase2-log.md`, `docs/RULES.md`,
`docs/CHANGELOG.md`.
