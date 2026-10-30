# Skybound Robot Runway Assault

Third-person runner-shooter: a squad of small white chibi robots on an endless
sky bridge auto-shoots forward. Enemies walk down the centre lane, multiplier
gates sit on the left, upgrade boulders on the right.

## Run

```bash
npm ci
npm run dev
```

Open http://localhost:3000. Dev viewers: `/dev/models`, `/dev/anims`.
Showcase scene: `/?showcase=1`.

## Controls

- A/D or Arrow Left/Right: strafe within the centre corridor
- Drag / touch drag: strafe
- Space / Esc: pause, R: restart
- Click Start to play (audio, if enabled, starts only after a gesture)

## Build / test

```bash
npm run typecheck && npm run lint && npm run build
npm test
npm run tri-budget
```

## Rollback

See `docs/ROLLBACK.md`. Tags: v0.0-scaffold, v0.1-models, v0.2-scene,
v0.3-animations, v0.4-rules, v1.0-release.

## Architecture

```mermaid
flowchart LR
  Input --> Sim[Pure sim (60Hz, seeded)] --> Render[Three.js pools]
  Sim --> HUD[Zustand UI only]
```

## Performance / accessibility

Draw calls are pooled (robots <=40, bullets <=120, enemies pooled by kind). Pixel ratio capped at 2, shadow map 1024. Reduced motion disables camera shake; HUD uses buttons with labels, not colour alone (weapon names + icons).
