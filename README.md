# Skybound Robot Runway Assault — Phase 1 (Models Only)

Next.js App Router + TypeScript + Three.js (@react-three/fiber, @react-three/drei).
Procedural low-poly models only. NO scene, gameplay, controls, or animations yet (Phase 2).

## Run
```bash
npm install
npm run dev        # http://localhost:3000
npm run build
```

## Gallery / viewer
- Gallery: `/models`
- Viewer: `/models/<id>?view=front|back|close|iso|sheet|tiled&turntable=0`
- Holding check: `/models/robot?view=iso&holding=pistol` (also minigun, rocket-launcher, targeting-rifle)
- Road seam check: `/models/road?view=tiled`

## Screenshots
```bash
npm run dev &
SHOOT_ITER=1 npx tsx scripts/shoot.ts   # screenshots/tmp/<subject>/iter-1/*.png
```
Requires Playwright Chromium with SwiftShader flags (see scripts/shoot.ts).
Screenshots are verified non-blank (non-background pixels > 2%) before review.

## Roll back
- Local tags: `git checkout p1-<subject>-approved` (per-model approval) or `git checkout v0.1-models` (all Phase 1 models).
- Revert a single commit without rewriting history: `git revert <commit-hash>`.
- Never force-push, squash, or delete branches/tags.
- Remote pushes use the GitHub connector snapshot route (plain `git push` has no credentials in this VM); see docs/model-log.md for the tag limitation note.

## Phase 2 exports
See `src/models/registry.ts`: `REGISTRY` (id, name, builder, sheetPath, triCap) and all
`build<Subject>()` functions, each returning a `THREE.Group` with named pivots/anchors.
Docs: `docs/model-log.md`, `docs/CHANGELOG.md`.
