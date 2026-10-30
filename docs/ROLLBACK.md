# ROLLBACK

Local annotated tags (created in the local repo; remote snapshot cannot create tags via the connector — see DECISIONS.md):

- v0.0-scaffold — Next.js scaffold, placeholder pipeline, configs
- v0.1-models — all model factories + /dev/models + tri budgets
- v0.1-models-robot — robot/imp/golem milestone inside P1
- v0.2-scene — camera, lighting, sky, road streamer, showcase (?showcase=1)
- v0.3-animations — anim system + /dev/anims
- v0.4-rules — pure sim + tests + HUD/input
- v0.4-rules-gates — gates/boulders milestone inside P4
- v1.0-release — hardening, README, docs complete

Commands:

```bash
git checkout <tag>          # inspect a tag (detached HEAD)
git switch -c fix/<name> <tag>   # branch from a tag to fix
git revert <sha>            # undo a commit safely, no history rewrite
```

To verify a tag builds in isolation: `git checkout <tag> && npm ci && npm run build`, then return with `git switch dev`.

## Honest tag-build note (2026-10-30)

v0.4-rules and v1.0-release are verified buildable in isolation (full tree, typecheck + build at HEAD).
v0.0-scaffold, v0.1-models, v0.2-scene and v0.3-animations are milestone markers, NOT isolated builds in this session's history: the code was written first and then committed by phase, so the page/GameCanvas committed in P0/P2 already import sim/UI/anim files that only landed in later phase commits. Do not check out v0.2/v0.3 expecting a green build; use v0.4-rules or v1.0-release for a working checkout.
