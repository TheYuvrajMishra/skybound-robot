# Phase 2 log

## Repo correction (critical, read first)

- The Phase 2 spec names an existing repo `skybound-robot-runway`. That repo
  DOES NOT EXIST on GitHub (connector search returned total_count 0 on
  2026-10-30). NO repo was created.
- The only real project is https://github.com/TheYuvrajMishra/skybound-robot
  (local `~/workspace/skybound-robot`, package `skybound-robot-runway-assault`).
  Phase 2 was built there, on top of the Phase 1 `v0.1-models` set.
- Local history is authoritative for rollback. Remote main head at Phase 2
  start was `e437012549ff5c19596b3356f1004e86f5bc5152` (a single connector
  snapshot commit, content-only). NEVER run `git pull` / merge / reset
  against remote: it would overwrite the local per-commit history and tags.
- Push method: plain `git push` fails in this VM (no GitHub credentials).
  Pushes use the GitHub connector snapshot route (see
  `/opt/hatch/connectors/github/references/snapshot-push.md`).
- Tag limitation (from Phase 1, still true unless proven otherwise): the
  connector cannot create remote tags. Local tags + commit hashes are the
  rollback points; the final report states which tags are local-only vs
  remote-verified. Never force-push, never rewrite/squash, never delete
  branches or tags.

## Model state at Phase 2 start (honesty note)

- `v0.1-models` is a NEEDS-REVIEW set, not an approved set: final Phase 1
  iter-11 scores were 3.0–5.5 vs the 9+ bar, `docs/approved/` is empty, all
  subjects carry local `p1-*-needs-review` tags.
- The user confirmed on 2026-10-30 15:23 IST that the Phase 1 models are the
  best set and are perfectly in the repo, and accepted them for Phase 2.
  Models are therefore treated as FROZEN. No model was changed during Phase 2.
  (Rule: any future model change must be its own `fix(model/<name>)` commit
  with its sheet review re-run.)

## Decisions and deviations

- **Shadows:** blob shadows (dark ellipse under robots/enemies) instead of
  real shadow maps. The spec allowed either; blobs are cheaper and safer
  for the 60 fps target.
- **Labels face the camera (+Z side):** gate label at local (0, 0.855, 0.06),
  boulder label at (0, 0.5, 0.5). The models' own `faceAnchor` is on the -Z
  side and would be occluded/mirrored from the camera, so camera-side labels
  were chosen for readability.
- **Restart by remount:** Restart is a React `key` remount of GameCanvas
  (full renderer re-creation) rather than an in-place sim reset. Guarantees
  reset correctness (pools, camera, tweens) at the cost of WebGL context
  re-creation.
- **Boulder push zone narrowed:** the first implementation pushed the squad
  clear whenever a boulder was within |z| <= 1.2. Playtesting the sim showed
  this shoved the squad out of the boulder lane before its volleys could
  land, making boulders nearly unbreakable (a seeded test case failed: the
  squad could not break a 1-HP boulder while standing in its lane). The zone
  is now z >= -0.6 (at the squad line), so the squad can shoot a boulder
  down on approach and is only pushed when it actually reaches the line.
  No damage either way. Documented in `docs/RULES.md`.
- **Leak = no damage (ASSUMPTION, needs user confirmation):** an enemy that
  slips past the squad's lateral extent despawns with no robot loss. The
  spec's "they hit once, then despawn" is ambiguous; damaging the squad for
  dodged enemies would make lane dodging pointless. Flagged in the final
  report and in `docs/RULES.md`.
- **Bloom:** real UnrealBloomPass behind the quality toggle, with a
  direct-render fallback if composer creation throws.
- **Push cadence deviation:** the spec says push after every commit. If
  per-commit snapshot pushes are blocked by approval volume, work is still
  committed locally at every step (never lost, never rewritten) and pushed
  consolidated at each stage tag at minimum. The deviation and the pushed
  heads are recorded here per stage (see below).
- **Screenshots committed once:** the capture-fix commit included
  `screenshots/game/*.png` because that directory is not gitignored. Later
  commits add only `src/`, `scripts/`, `docs/`, `package*.json`. (No harm:
  the shots are the review evidence.)
- **Capture-mode fixes (found by debugging, not by reviewers):**
  - Hero captures first showed the start-screen overlay and no squad: the
    overlay is now hidden when `?shot=`/`?anim=` is present, and capture
    mode runs in god mode so demo enemies cannot wipe the squad mid-capture.
  - The first clean hero shot still showed no robots: the capture advance
    loop ticked the sim without syncing visuals, so robots sat at spawn
    scale 0.01 and at un-sprung positions. The capture loop now syncs every
    step. A temporary `window.__game.debugRobots()` probe found this; it
    remains in the code as a debug aid (harmless, debug-only).

## Stage A — scene (tag v0.2-scene)

- Iteration 1 (reviewers R1, R2, both score 2/10, fail): camera too high/far
  and robots a fused blob; no readable enemies; only one small gate and one
  tiny boulder; a large blank white rectangle blocking the centre lane;
  flat sky, wide lane bands, dark centre seam, floating banners/rocks.
  NOTE: the anim-sequence findings from iteration 1 were largely artifacts
  of STALE captures (the re-shoot pipe was truncated by `| head`, so
  golem/boulder frames still showed the old start-screen overlay). Scene
  findings were valid and were all addressed in iteration 2.
- Iteration 2 changes (all priority 1–2 applied):
  - Camera moved closer/lower (y 4.6→3.6, z 4.8→3.6, lookY 0.4→0.6) so
    robots fill ~20% of frame height and stay distinct.
  - Capture staging densified (hero only, not live balance): gate chain
    left (-4/-16/-32), boulder chain right (-6/-18/-34), crawlers centre
    (-2/-8/-16), golem relocated off-centre to (1.2, -20).
  - Side rails added (dark rail + cyan strip at x ±3.08); poles/banners
    moved onto the rails (±3.08/±3.02); rubble moved onto the deck edge
    (2.55–2.95); side-prop assemblies placed at x ±3.0 (mirrored left)
    after reading buildSideProps — it is a SINGLE pole+banner assembly,
    so x=0 put a banner across the road and ±3.9 left it floating.
  - Thin crisp lane lines (0.09 wide) at x ±1.86; deck-coloured centre
    seam cover strip at x=0.
  - Fog near 25→35, fog/sky horizon colour deepened (#bcd8f0), bloom
    strength 0.55→0.35, sun intensity 2.2→2.6, hemisphere 0.95→1.05.
  - Squad run cycle: legs now swing + body bobs whenever running (was
    lateral-only, read as frozen); muzzle flash/muzzle enlarged, recoil
    window 0.09→0.14 s, projectile bolts enlarged (0.07→0.11, length 4→5).
  - Capture staging moved to AFTER the advance (pre-advance staging used
    to scroll past the line and despawn before frames were captured), and
    staged enemies now spawn with spawnTime 1 s in the past (popScale(0)
    = 0.01 had rendered them invisible — this was why moving the staged
    golem did not change the hero image at first).
  - Root cause found for the "white rectangle": it was the pale demo golem
    model itself at (0, ~-16), seen nearly head-on at distance; relocating
    it off-centre and further out shrank it to a small far panel.
- Iteration 2 captures: hero landscape + portrait + all 3 anim sequences
  fully re-shot (38 files, all distinct sizes, zero console errors).
- Iteration 2 confirmation round (fresh reviewers, both score 3/10, fail):
  robots still fused; nearest crawler dead-centre blocking the lane;
  gate/boulder chains too sparse and small with tiny labels; thick white
  bands + dark centre stripe; flat sky, floating props; robot firing and
  run cycle unreadable (no gun/flash/recoil/bolt stream from behind, only
  blue side stubs and disconnected cyan diamonds); golem-walk shows no
  golem, only a flat pale translucent slab popping in/out; boulder-break
  never breaks (30→14, no cracks/shake/fragments, no projectile seen
  hitting it); large cyan rings grow/overlap and obscure the centre lane;
  crawlers slide without leg animation; portrait wastes foreground.
  Camera contradiction: round-1 said too high/far; confirmation R2 says
  too low/steep and to raise/pull back; R1 does not flag camera height.
  Reference arbitration (read directly): the reference is PORTRAIT, high
  camera behind a single hero robot (~15% of frame height), wide road at
  the bottom narrowing to a vanishing point, thin white lane lines, no
  centre seam, gates as a long left chain, boulders huge on the right
  (nearest ~25% width, ~2x robot height), dense centre enemy column
  graded by distance, all enemies FACING the camera (faces/eyes visible),
  dense cloud sea with many towers, warm sun glow. So round-1 "too
  high/far" was wrong about the reference; the current camera is kept as
  a compromise and judged by reviewers, not oscillated further.
## Iteration 3 changes (all priority 1–2 applied):
  - Enemies now face the squad/camera: enemy visuals rotate π in sync
    (models are built facing −Z — eyes at negative z — so they previously
    walked backwards and the golem read as a blank pale slab). Lunge tilt
    sign verified still correct after the flip (top tilts toward squad).
    Golem eye emissive boosted 1.6→2.5 so the orange eyes bloom.
  - Formation x-spacing 0.55→0.8 in `formationSlots` (robots no longer
    fused shoulder-to-shoulder); gate/boulder overlap still verified by
    vitest + e2e.
  - Hero staging densified (capture-only): 8 gates (−4…−60), 7 boulders
    (−3…−51); gate/boulder pools 8→16 so staged + demo entities render.
    Nearest staged crawler moved −2→−6 (it blocked the centre lane).
  - Removed the iter-2 thin lane lines (±1.86) and centre seam cover
    (x=0): they doubled the road model's own wide lane bands and read as
    even thicker bands + a dark centre stripe. The model's own bands and
    thin centre seam remain as a known Phase 1 model limitation (frozen).
  - Boulder visuals scaled 1.25×; `BOULDER_HALF` 0.55→0.7 to match; staged
    boulder-break HP 30→15 so it breaks mid-sequence; on HP drop the
    boulder now spawns a small burst at its position and shake 0.03→0.08.
  - Projectile trails added (stretched additive cyan box behind each
    bolt, spec-required, previously missing); muzzle size 0.11→0.16,
    recoil window 0.14→0.2 s.
  - Run cycle boosted: leg swing 0.28→0.5, body bob 0.04→0.08, armR swings
    when not recoiling.
  - Death rings: crawler/boulder bursts now grow at 1.2/s with 0.5 s life
    (was 4/s, 0.7 s, radius 3.1 dominating the centre lane); golem rings
    keep the large ring.
  - Portrait pull-back factor 0.7→0.35 (FOV widening carries road width).
  - Cloud sea added: 50 large flattened white ellipsoids below/around
    the deck (y −8…−3), so sky platforms sit in clouds instead of void.
  - Verified personally on the iter-3 captures before the review round:
    robots separated with clear gaps; crawlers show orange eyes/faces;
    near boulder "100" fills the right lane; gate chain left is dense;
    cloud sea present below the bridge; burst rings no longer dominate.
  - Iteration counting (honest): iter-1 (round 1) + iter-2 + iter-3 (this)
    = 3 fix iterations, followed by a confirmation round with fresh
    reviewers; that satisfies the spec's "minimum 3 iterations, then one
    confirmation round" (the round-2 confirmation was an extra round
    between iter-2 and iter-3, not counted as a fix iteration).

- Iteration 3 confirmation round (fresh reviewers, both score 4/10, fail):
  camera still too low/shallow vs the reference's steep high-angle dive;
  only 3-4 small crawlers, no golems readable; gate/boulder chains sparse
  with tiny labels; the white plane artefact recurs in every animation
  sequence; robot firing unreadable (guns at hip, no flash/recoil/bolt
  stream); run cycle invisible; golem-walk shows no walking golem;
  boulder-break never breaks (1 s sequences too short); rings dominate.
  Playtest findings (full reports): go-right and jitter died at 5.5 s
  (demo golem, fixed above); go-left died at ~5 s (demo golem + the
  formation widening on multiply yanking the centre to -0.80 into the
  centre enemy column); stay-centre/AFK survived 57-58.5 s (score ~1465,
  41 kills) — AFK optimal while lane play died to demo entities; runs
  fully deterministic (fixed 1337 seed); Best lagged the final score by
  2 (score kept accruing after gameOver under __advance); setGodMode
  silently inactive without ?debug=1; jitter flips crossed ~77% of the
  road in 0.5 s (MAX_LAT_SPEED 9); waves arrived as a 14-enemy wall.
- Iteration 4 changes (all priority 1-2 applied):
  - ROOT CAUSE of the white plane, found by projecting every visible
    mesh to screen space in a debug capture: enemy hit-flash boxes.
    damageEnemy refreshes flashUntil on every hit, so under squad fire
    the box (golem: 1.2x1.4 white, opacity 0.6) stayed visible
    permanently and every shot enemy rendered as a white rectangle.
    Fix: enemy flash boxes removed entirely; hit feedback is now a
    small burst on HP drop (like boulders). Robot squad-hit flash kept
    (brief, damage-only, legitimate).
  - Camera reframed to a steep high-angle dive: y 7.0, z 4.5 (not 2.0 —
    at z 2.0 the squad falls 33° below the view axis and crops out of
    the frame bottom), lookY 0.8, lookZ -8, fov 60. Axis pitch ~26°,
    squad bottom-anchored, far road near the top. Verified personally:
    robots fully visible, dense enemy column, gate/boulder chains
    readable, no white rectangle, golem reads as a dark rocky golem
    with orange lava cracks.
  - Bloom threshold 0.85→1.0 (sun-lit pale rock used to cross it and
    bloom white); fog colour deepened #bcd8f0→#a8c8e8; sun 2.6→2.8.
  - Gate labels 0.9x0.45→1.3x0.65, boulder labels 0.85x0.5→1.2x0.7.
  - Bolts enlarged (scale 1,1,5→1.5,1.5,7), trails thickened
    (0.05→0.14 wide, 1.4→2.0 long, opacity 0.45→0.75); muzzle pulses
    bigger on firing frames; leg swing 0.5→0.8, bob 0.08→0.12.
  - Anim sequences lengthened: shoot script advances 0.25 s/frame
    (3 s total, was 1/12 s = 1 s — too short for any break or walk to
    read). Golem-walk: staged golem at -24 with 1000x HP (survives the
    sequence and walks from mid to near without contacting the squad).
    Boulder-break: staged boulder at -10 (breaks ~1.4 s in; the crumble
    burst already existed, it just never triggered in 1 s).
    Hero: 9 crawlers + 2 staged golems + relocated demo golem.
  - Balance: live runs get a random seed (captures keep 1337);
    tick freezes on gameOver (score no longer creeps past Best);
    setGodMode works without ?debug=1; MAX_LAT_SPEED 9→7; wave spawn
    stagger widened (crawler 2.2→3.5, golem 3→4.5) so waves stream in
    instead of arriving as a wall.
  - Verified: vitest 20/20, e2e all-pass, go-left repro survives past
    8 s with squad intact (was dead at 5.5 s).


## Stage B — animations (tag v0.3-animations)

- Covered by the same capture/review rounds as Stage A (frame sequences
  for robot-fire, golem-walk, boulder-break). Confirmation round decides
  the tag.

## Stage C — rules and controls (tags v0.4-rules, v1.0-playable)

- Capture bug found from round-4 reviewer 1 (2026-10-30): golem-walk
  frame-03 was black below the horizon in shoot10 (54,658 bytes, sky
  strip only). Proved deterministic, not transient: re-shoots of the
  same state reproduced it byte-identically, and re-screenshotting the
  same state without advancing stayed black while advancing once more
  restored the frame. Renderer state (camera, canvas, composer sizes)
  was identical across the good/bad frames. Bisected to the composer:
  direct render (no composer) was clean, and skipping only the bloom
  pass was clean. Root cause: the composer's render targets were sized
  at CSS resolution (1600x900) while the canvas backing was DPR-scaled
  (2400x1350) — renderFrame changed the pixel ratio after applySize
  had sized the composer — and under SwiftShader that mismatch plus
  the default HalfFloatType composer targets blacked out one exact
  state. Fix (two real fixes, both kept): (1) composer targets now use
  UnsignedByteType instead of HalfFloatType (scene HDR range is modest,
  brightest emissive ~2.7, so no visible difference; byte targets avoid
  the software-renderer float-buffer edge case); (2) renderFrame
  re-syncs composer pixel ratio + size whenever the ratio changes, and
  applySize sets the composer's ratio before sizing it, so composer
  targets now match the canvas backing (verified 2400x1350). After the
  fix, shoot11 (all 38 files, zero console errors, no file under
  150 KB) has a clean golem-walk frame-03 (282,124 bytes, visually
  verified: road, squad, golem, gate, boulder all present) and the hero
  look is unchanged (bloom glow still present). All temporary probe
  scripts and debug exposures were removed before committing; only
  src/game/GameCanvas.tsx changed. Gates: tsc, eslint, vitest 20/20,
  next build all pass. Note: this fix touches rendering only, not the
  sim — playtest round-2 results (sim-driven) remain valid against it.
- Iter-3 e2e: first run timed out on the gate test (distance only 13
  after 25 s) while two playtester browsers + a shoot + a build were
  running concurrently; re-run with only the playtesters running passed
  fully (gate 3→6, boulder→minigun, game over, restart, zero console
  errors). Judged an environment-contention flake, not a regression:
  __advance + sim are unchanged by iter-3 and vitest is green.
- Playtest finding (real bug, fixed): "go right and shoot boulders" died
  at 5.5 sim-s. Reproduced locally: the DEMO golem (centre, z −30) reaches
  the squad line at ~4 s, and the widened formation (half 1.05) overlaps it
  while the squad is still within 1.75 of centre, so one contact kills all
  3 starting robots. Fix: demo entities now carry `demo: true` and are
  decoration-only in the sim (no damage/multiply/grant/push/bullet hits;
  demo enemies despawn past z = 2). 3 new vitest cases cover it (20/20).
  Repro after the fix: go-right survives past 8 s with squad intact and
  kills wave crawlers. The e2e gate test was updated to spawn a live gate
  (demo gates no longer multiply), and now passes fully again.

## Iteration 5 (round-4 findings: reviewers 4.5/10 and 5/10, playtest round 2)

- Camera (both reviewers: road a narrow ribbon, squad dome heads at the
  bottom edge): closer + lower — y 7→4, z 4.5→3, lookZ -8→-6 (fov 60,
  lookY 0.8 kept). Hero robot now ~21% of frame height with feet in
  frame, road ~70% of width at the bottom, vanishing point near the
  top. Portrait pull-back removed (boost 0.35→0; the wider FOV carries
  the width). Note the geometric bound, recorded honestly: 20-25%
  robot height + full road width + long recession cannot all hold at
  once with a 60° FOV, and one round-4 demand (3x robot size) exceeds
  the reference itself (~15% single hero) — the 21% compromise is the
  frontier, not a failure to follow the note.
- Fog near 35→40, far 85→95, colour deepened to #9ec0e0 (reviewers:
  far road dissolved to white haze). Sun sprite moved into frame
  (-30, 20, -120, scale 30; it was at -55, 42, -150, i.e. 70° off-axis
  and invisible) so the sky now has a visible sun glow.
- Hero staging: foreground gate (-1.5) and boulder (-1.0) + near golem
  (0.9, -5); demo crawlers relocated to -10/-16 (after the 2 s
  pre-advance scroll one sat at -3 and clipped the squad in hero).
- Labels enlarged: gates 1.3x0.65→1.6x0.8, boulders 1.2x0.7→1.5x0.85.
  '1x' labels declined: labels must show the true multiplier (2x/3x).
- Bolts narrowed (1.5,1.5,7)→(1.0,1.0,6), trails thinned
  (0.14→0.10 wide, 2.0→1.6 long, opacity 0.75→0.6): the iter-4 bolts
  read as huge flat diamond planes over the robots.
- Robot readability: blaster scaled 1.6x (visual only, not a model
  edit), recoil arm -0.35→-0.6, run-cycle frequency 10→6 rad/s (at the
  0.75 s anim sampling, 10 rad/s aliased to near-identical poses).
  Gun NOT raised to shoulder height: the blaster is not parented to
  armR, so raising it would float disconnected from the arm, and it
  would deviate from the frozen Phase-1 model.
- Capture-mode drain fix (real bug): __advance never called
  drainEvents, so recoilUntil was never set and muzzle flash NEVER
  showed in anim captures — part of the "no flash" read. __advance now
  drains before sync (same order as the live loop); SFX no-ops without
  a gesture. Burst aging fixed in the same pass: __advance aged bursts
  by DT per 0.25 s advance (15x too slow), so stale bursts sat at fixed
  positions reading as stray rings; bursts now age by the full advance.
- Anim staging: robot-fire 3→5 crawlers (targets persisted to frame
  11); boulder-break -10/15 HP→-14/20 HP (the old boulder crossed the
  squad line, where bullets can no longer hit it, before accumulating
  lethal damage — it vanished without a readable break; the new one
  breaks ~frame 06-07). Persistent debris piles added (visual-only
  pool of 4 in GameCanvas, placed by the boulderBreak event, scrolled
  with the world, despawned past z = 12), so rubble remains after the
  break instead of only a fading burst.
- Boulder push (playtest minor, real bug): the old snap moved the
  squad 1.1 units in one tick and overwrote targetX. Replaced with the
  sliding wall above (RULES.md updated). New vitest case covers it
  (max per-tick jump < 0.2, targetX preserved, squad guided clear).
- Balance (playtest round 2, config-only): BOULDER_HP
  [100,200,300,400]→[60,120,200,280] (zero boulders broken in 60 s of
  dedicated right-lane pistol play); same-tier boulder re-grant now
  boosts instead of no-op (new vitest case); wave budget cap 14→12
  (centre runs died at 50-59 s vs the 60-90 s casual target);
  MAX_LAT_SPEED 7→6 (jitter reversals still crossed ~85% of the lane
  in 0.5 s).
- Deliberately NOT changed (spec-mandated, flagged for the parent):
  golem killRobots = 3 (a starter squad of 3 can die to one golem
  contact — abrupt, but the spec prescribes it); gate multiplication
  (3→99 in 60 s of left-lane play is the spec's ceil(count x N)
  compounding, i.e. the reward path, not a bug); road tan recolor
  (frozen Phase-1 model materials); shadow maps (spec allowed blob
  shadows, which are present); squad z-advance in sequences (spec:
  the world scrolls, the squad stays at z = 0 — the "frozen squad"
  read is the architecture, and road/gate/boulder streaming IS the
  motion); clamp redesign (round-2 playtesters confirm edge-triggering
  works: gates multiply and the squad holds its lane clamp as designed).
- Gates after iter-5: tsc, eslint, vitest 22/22, next build, e2e
  all-pass (start, gate 3→6, boulder→minigun, game over, restart,
  zero console errors).

## Iteration 6 — round-5 reviewer 1 (score 4.5/10, fail)

Reviewer 1 (round 5, judged shoot13) verified the black frame fixed
and no stale burst rings, but scored 4.5: firing "almost invisible"
(muzzle indistinguishable from bolt diamonds, no recoil read, enemies
pop out), run cycle "frozen", golem walk "pure scale/translation",
boulder break "a pop-out, not a shatter" (debris gone by frame 09),
portrait foreground gate/boulder labels clipped at the edges,
boulder icons thin outlines, centre enemies merged into one blob,
far labels stacked into a text smear. All priority 1-2 items applied:
- Labels: weapon icons now FILLED with a cyan glow (shadowBlur 14),
  not stroke-only outlines; gate text + boulder numbers get a dark
  outline + brighter fill; boulder number font 64 -> 72.
- Label distance fade: gate/boulder label opacity fades to 0.15 by
  z = -75 (full at -40), so far labels stop stacking into a smear.
  Fog far 95 -> 88 (mild; the chain density stays, as earlier
  rounds demanded it).
- Portrait framing: foreground gate staged inboard at x -1.8 and
  foreground boulder at x 1.6 (capture-only; at lane x +/-2.4 their
  1.6-wide labels clipped at the portrait edges), plus a smooth
  portrait pull-back boost 1 + (1.2 - aspect) * 0.5 (1.32 at phone
  portrait, ~1.0 near square). Landscape unaffected.
- Hero enemy restage: near golem dead-centre (0, -5) as one large
  camera-facing golem in front of the column; near crawlers pushed
  to +/-0.8 so they clear its +/-0.7 silhouette; mid golem to -1.2
  so the -11 crawler is not inside it.
- Bolts: octahedron -> capsule (rounded streak, 0.14 wide, ~1.5
  long), muzzle: octahedron -> additive white-hot sphere, firing
  scale (3, 3, 5) so firing frames are unmistakable.
- Robot stride: from behind, pitch swings foreshorten along the
  view axis and read as frozen, so lateral leg splay (+/-0.25) and
  arm sideways swing (0.2) were added, and the bob raised 0.12 -> 0.2.
- Golem walk: legL/legR pivots (they exist in the model) now animate
  alternating steps (0.35) + splay (0.12), body roll 0.08 + bob 0.10
  at a shared 3 rad/s cadence (was sway 0.03 + bob 0.05).
- Death tumble + shrink (spec-mandated, previously missing):
  enemyDeath events now carry id/x/z; drainEvents reserves the pool
  visual as "dying" for 0.6 s (never reused mid-tumble) and sync
  topples it (rotation.x -> 1.4), sinks it 0.15 and shrinks it to
  0.3 alongside the existing burst. New vitest case covers the event.
- Boulder-break staging: -20 + 12 HP (debris z at time T is
  startZ + 6.9*T regardless of break time, so the old -14 staging
  put debris behind the camera by frame 09; at -20 the break lands
  ~1.65 s, just before the wall engages at -8, and debris stays in
  frame through frame 11). Debris now scatters TWO piles (break
  position + 0.7 inboard) so one pile survives to the last frames.
- Sky groups y -4 -> -8 (towers/platforms rise from the cloud sea,
  more tower stays in frame); sun texture core hardened (white at
  0, 0.95 at 0.15) + scale 30 -> 36 so the disc reads; blob shadow
  opacity 0.32 -> 0.45 and robot blob radius 0.32 -> 0.42.
- Deliberately NOT changed: road width (frozen model geometry x3;
  widening it would break the GATE_X/BOULDER_X/ROAD_HALF tuning);
  robot spacing 0.8 (gaps ARE present in shoot13; the merged read
  came from the bolt diamonds, now changed); shadow maps (spec
  allowed blob shadows); gate mults (true values, not 1x).
- Gates after iter-6 code changes: tsc, eslint, vitest 23/23 pass.
  NOT rebuilt/restarted on :3100 and NOT re-shot yet: the round-3
  playtesters are driving :3100 live, and a restart mid-run could
  fail a strategy load. Rebuild + restart + shoot14 + e2e + the
  round-6 confirmation review happen after the playtesters report.
  Round-5 reviewer 2 and both round-3 playtester results are still
  pending at this point; their findings fold into iter-7 if any.

## Iteration 7 — round-5 reviewer 2 (score 5.0/10, fail)

Reviewer 2 (round 5, judged shoot13) also confirmed the black frame
fixed. Its P1s overlap iter-6 (portrait clipping, filled icons,
golem walk, boulder debris — all already in iter-6, unshot) but add:
- Shadows: one tight directional shadow light added (1024 PCFSoft,
  ±14 box, bias -0.0005, normalBias 0.05), opaque meshes cast
  (robots, golems, crawlers, boulders, gate posts, swapped weapons;
  transparent glass/labels/blobs/flashes never cast, so no solid
  rectangle shadows), road tiles receive. Blob shadows kept as well
  (contact + cast read as complementary, not double-dark). Warm key
  (0xfff2cc, 2.8) + cool hemisphere fill were already the setup.
- Horizon terminus: a fog:false dark silhouette skyline (7 towers +
  a cloud bank) glued camera-relative to the vanishing point
  (0.3 lateral parallax, z = camera z - 108), so the far field no
  longer dissolves into empty pale sky.
- Sun bloom: sprite colour pushed to (1.6, 1.5, 1.3) so the core
  crosses the bloom threshold (1.0) and blooms for real; the halo
  stays below it. (Iter-6 core/scale fix was unshot; this stacks.)
- Cloud sea: tinted blue-grey (0xd9e4ee, was pure white on pale sky
  = invisible), pulled inward (x from 10, was 14), count 50 -> 70.
- Label backing: dark rounded rect (rgba(0,10,25,0.55)) behind gate
  text and boulder icon+number, so white text holds against pale
  sky/clouds at distance.
- Bolts as ground decals: bolt material now additive, trail
  shortened 1.6 -> 0.9 and moved to z +0.7 (it used to poke out
  behind the robot at spawn), projectile height DECK_Y + 0.35 (gun
  height, was +0.25). The bolt origin was already at gun height;
  the decal read came from the long flat trail + non-glowing bolts.
- Recoil: whole-robot z-kick (+0.08 toward camera on firing
  frames), because the arm pitch (-0.6) foreshortens from behind
  exactly like the leg swings did.
- Banners: the banner cloth material is SHARED (model mat cache),
  so it cannot be flipped globally; each sideDetail group now
  clones its bannerCloth material and sets DoubleSide on the clone.
  This fixes the left (rotated) assemblies showing a bare pole:
  their cloth backface was culled from the camera.
- Debris: rubble lightened (0x8a94a0, was dark grey on dark road)
  and piles scaled 1.3x, so the aftermath reads at ~50%+ of the
  boulder footprint.
- Hero column restage: strict alternation (crawlers alternate sides
  with >=3 z-gaps, first at -1.0/-6), golems at |x| >= 1.8 (outside
  crawler lanes + golem half-width), demo golem to (-1.8, -22).
- Deliberately NOT changed: distant-label scale compensation
  (reviewer 2 asked for minimum on-screen label height, but that
  directly conflicts with reviewer 1's fade fix for the vanishing-
  point text smear — bigger far labels would overlap MORE; the
  dark backing + filled icons + fade is the middle path);
  blaster raised to shoulder height (still declined: it would float
  disconnected from the arm on the frozen model; the muzzle flash,
  recoil kick and additive bolts now carry the firing read);
  mid-distance entity scale 1.5x (breaks perspective coherence and
  would decouple golem visuals from their 0.7 hitbox radius);
  road widening (frozen geometry + config coupling, as before).
- Gates after iter-7 code changes: tsc, eslint, vitest 23/23 pass.
  Still NOT rebuilt/restarted on :3100 or re-shot: the round-3
  playtesters are still live. Rebuild + restart + shoot14 + e2e +
  round-6 review happen after they report. One TDZ near-miss
  caught during this iteration: the recoil kick first referenced
  `running` before its declaration and was moved below it.

## Iteration 8 — playtest round 3, playtester 2 (go-right / AFK / jittery)

Results (iter-5 build, headless SwiftShader, 90 s strategies):
- GO RIGHT: survived 90 s, squad 3, targeting-rifle. KEY QUESTION
  ANSWERED YES: pistol -> rocket-launcher at 34.5 s, -> targeting-
  rifle at 72 s, each on a boulder-count 1 -> 0 step. No snap at any
  boulder event (max jump 1.41 on the initial approach, within
  MAX_LAT_SPEED 6). SquadX pinned at 1.6 (the formation clamp, as
  designed). Kills/10 s ramped with each tier (pistol 2/5/3, rocket
  8/9/10/12, targeting-rifle 22/13).
- AFK: survived 90 s (round 2 died at 50 s), squad 3, minigun via an
  opportunistic boulder break at 51.5 s, score 2576, kills 77, zero
  input. Ordering is correct (skilled 2751 > AFK 2576 > jittery 476)
  but AFK survival is seed-dependent (50 s vs 90 s across rounds);
  logged as a balance note, not a blocker — see below.
- JITTERY: game over at 31.5 s (squad 3 -> 0 in one step at 30.5 s,
  a golem contact). Max jump 2.90 in one 0.5 s step (5.79 u/s, under
  the 6 cap — continuous movement, not a snap). Score freeze
  verified (476 / 201 m unchanged over 10 extra steps).
- Perf (headless only, NOT device fps): 2787 ms per advance(0.5)
  average (go-right 2394, AFK 3347, jittery 2312; spikes to ~11 s);
  cost scales with on-screen entities. No console/page errors, no
  NaN, no crash or freeze in any run.
- REAL BUG FOUND from the "gates 13 > wave budget 12" flag: the wave
  budget caps ENEMIES, not gates, so 13 was not a budget violation
  — but 13 LIVE gates in 90 s was still wrong. Root cause: the gate
  resolution loop skipped triggered gates (`if (!alive || triggered)
  continue`) BEFORE the despawn check, so every gate that crossed
  the line became immortal — 11 spawns + 2 demo = 13, growing
  forever, and it would eventually exhaust the 16-slot gate pool
  and make new gates invisible in runs past ~2 min. Fix: the
  despawn check now runs before the triggered skip, for all gates.
- SECOND LEAK in the same cleanup region: dead enemies were kept
  while z < DESPAWN_NEAR, but dead enemies never move, so every
  kill stayed in the array forever (unbounded growth + O(corpses)
  per tick). The renderer detects deaths by disappearance from the
  alive set and the tumble is event-driven, so dead enemies are now
  pruned immediately. Two new vitest cases cover both fixes.
- NOT changed (spec-mandated / as-designed, flagged for parent):
  golem killRobots = 3 (the "instant full-squad wipe" the playtester
  called major is the spec's rule: one golem contact kills a
  3-robot squad); squadX pinning at ±1.6 (the formation clamp for a
  live squad — the ±2.38 readings are dying squads whose formation
  half shrank to 0.25, as established in rounds 1-2); AFK ease (one
  seed's 90 s survival vs another's 50 s death — tuning on a single
  seed would overcorrect; the skilled > AFK > erratic ordering holds).
- Gates after iter-8 code changes: tsc, eslint, vitest 25/25 pass.
  Still NOT rebuilt/restarted on :3100 or re-shot: playtester 1
  (round 3) is still running. Rebuild + restart + shoot14 + e2e +
  round-6 review happen after it reports. Round 3 is NOT clean
  (spec-mandated wipe + balance notes remain), so a round-4
  playtest will still be needed before tagging on playtest grounds.

## Iteration 9 — playtest round 3, playtester 1 (centre / left / regression)

Results (iter-5 build, headless SwiftShader; fresh page per strategy):
- STAY CENTRE: 60 s survived, squad 3, pistol, score 1383, 408 m,
  39 kills, max 13 enemies on screen. Never steered, never dropped.
- GO LEFT: 60 s survived, squad 99 (MAX_SQUAD cap), targeting-rifle
  DESPITE left steering (wide formation / fan fire breaks right-lane
  boulders), score 1408, 408 m, 40 kills. Final squadX -0.8 (the
  formation clamp for a wide squad, as designed).
- REGRESSION (natural centre, capped 1200 s): game over NEVER
  occurred — squad never dropped below 3 in 1200 s, 2305 kills,
  score 72481, distance 14856. The +143 score / +68 m / +3 kills
  over a further 5 s is live-play growth, NOT freeze creep (the run
  had not ended). Alive gates grew monotonically to 261 — the
  iter-8 gate leak, independently confirmed (this run used the
  pre-fix iter-5 build).
- REGRESSION (forced game over via spawnEnemy golem on the line):
  squad 3 -> 0 in 1 step, gameOver after 1.5 s (DYING_TIME 1.2 s);
  Best 195 EXACTLY equals final snapshot score 195 (localStorage
  also 195) — the lag-by-2 Best bug is fixed; creep exactly 0/0/0
  over +5 s — freeze holds. A repeat gave the identical 195/70/5.
- Balance issue (major): centre AFK play is effectively immortal.
  Measured contributors: (1) the auto-fire fan (AUTO_AIM 6 degrees)
  over the 80 m spawn distance reaches right-lane boulders, so a
  centre run auto-upgrades to targeting-rifle without steering
  right; (2) targeting-rifle homing + pierce, 25 damage; (3) the
  difficulty ramp FLATLINES: HP scaling caps at 2.5x (reached at
  distance 1200) and speed at 1.6x, while player DPS keeps growing
  via upgrades. (The playtester's note "HP does not scale" is
  imprecise — scaling EXISTS in spawnEnemy but caps early.)
- Balance fix (config-only, per spec "tune only via config"): the
  hardcoded scale caps moved into game.ts and raised — HP_SCALE_CAP
  2.5 -> 5, SP_SCALE_CAP 1.6 -> 2.0 (same per-distance slopes, so
  the early game is IDENTICAL: at distance < 200 the scales match
  the old values exactly); WAVE_BUDGET_CAP 12 -> 16 (was hardcoded
  in spawnWave); WAVE_INTERVAL_MIN 6 -> 5; AUTO_AIM_DEG 6 -> 4
  (deviation from the spec's stated +-6 default, logged: it narrows
  the boulder-clipping fan while keeping a small cone; boulders stay
  primarily a steering reward). At distance 14856 the new regime is
  crawler 60 HP / golem 450 HP, 16-enemy waves every ~5 s — rifle
  centre play should leak enemies to the line and attrition, while
  pistol centre still dies to late waves. Round-4 playtest must
  verify a natural centre game over occurs (and when).
- Minor (harness-visible, live-trivial): the game-over panel showed
  previous-tick numbers on its first frame (Score 163 vs final 195)
  because HUD pushes at 10 Hz via RAF while __advance-driven play
  outruns RAF; it self-corrected within 500 ms real time. Fix: the
  canvas now pushes HUD synchronously before reporting game over,
  so the panel reads final numbers on frame one.
- Test-API gap closed: snapshot() now exposes damageMult/rateMult,
  so round 4 can verify the same-tier re-grant boost (previously
  unmeasurable). The two recorded exec failures for this playtester
  (exitCode 2, SIGTERM) were its own cleanup commands, not missing
  results — the JSON was delivered fully.
- Gates after iter-9 code changes: tsc, eslint, vitest 26/26 pass
  (budget test updated to the config cap + a new late-HP-scale test).
  ALL round-3 children are now complete, so the :3100 restart,
  shoot14, e2e, round-6 review and round-4 playtest are unblocked
  (see the next log section).

## Iteration 10 (round-6 reviewer 1, score 4.0, fail; commit 7358e03)

Reviewer 1 judged shoot14. Confirmed fixed, not re-reported: portrait
foreground label clipping, golem-walk frame-03 black frame. Everything
else it read as still failing; several reads contradict the code or
personal verification and were arbitrated, not blindly applied:
- Hero column: near golem now stands alone (shoulder crawler moved to
  (-1.8,-10)); column widened to +/-1.2; golems at +/-2.0; demo golem
  (-2.0,-26); demo crawlers [-11,-19].
- Distant labels: fade now reaches 0 by z=-60 (was 0.15 at -75).
  Density NOT cut: the geometry chain stays dense (earlier rounds
  demanded it); only labels vanish at distance, which is realistic.
- Sun/skyline: hard disc sprite (flat white circle, scale 12, colour
  1.8/1.7/1.4) inside the glow; skyline darkened 0x6b8299 -> 0x3d5266.
  The old skyline colour WAS pale grey-blue, so "washed out" was fair
  even though fog:false — it was a contrast failure, not fog.
- Shadows: light lowered to 26 deg elevation (shadows ~2.1x height),
  2048 map, +/-10 frustum. Note: sunLight.target was already added to
  the scene, so aim was correct; the old 50 deg elevation made short
  soft patches that read as blobs.
- Cloud sea: +30 deck-hugging billows (x 3..12, y -2..-3.6); total 100.
- Banners: sideDetail assemblies 4 -> 6 at 14 spacing (denser).
- Squad separation: formation spacing 0.8 -> 1.0. The 1.6x blaster
  widened each robot silhouette to ~0.8, closing the 0.8 gaps — that
  is the merge mechanism. The reviewer's 1.4 was declined: it would
  shrink the centre clamp to 0.6 and cripple lane reach. New clamp for
  3 robots is 1.4; formation edge stays 2.65 (ROAD_HALF - 0.35), so
  gate/boulder triggering is unchanged.
- Bolts/muzzle/recoil: bolt radius 0.07 -> 0.12; muzzle cyan-white
  (pure white on white robot backs was invisible under additive
  blending) + 4x firing scale; recoil kick 0.08 -> 0.15 + pitch-back
  -0.12 + torso roll; armL swings opposite armR (was static); arm
  z-swing 0.2 -> 0.35; bob 0.2 -> 0.25.
- Golem walk: leg x 0.5, splay 0.2, bob 0.14, roll 0.10; staging -20
  (was -24, larger through the sequence, still clear of the line at
  frame 11: z -1.0). The reviewer's "2x closer" (-12) was declined:
  it would reach the line at ~1.7 s and lunge for the last frames.
- Death tumble: 0.9 s (was 0.6, which 0.25 s sampling could miss
  entirely), falls flat 2.2 rad, shrinks to 0.5 (was 0.7).
- Debris: 6 rocks + 1.4x pile; scatter 1.2 inboard + 0.5 back (was
  0.7/0.3, the two piles merged into one cluster).
- Boulder-break staging: -24 (was -20), so debris sits at z -3.3 in
  frame 11 (in frame, not at the bottom edge at z +0.7). The
  "large at frame 00" demand was declined as geometrically
  incompatible with "debris visible in frame 11": debris z(3 s) =
  startZ + 20.7 forces startZ < -17.7, i.e. a small starting boulder.
  The subject is the HP-labelled boulder breaking mid-sequence.
- Foreground boulder shrink 25-30% declined: the reference's nearest
  boulder is equally huge (~20% height, 25% width).
- Gates: tsc, eslint, vitest 26/26 (3 test expectations updated for
  the new 1.4 clamp), next build passes. NOT restarted on :3100 or
  re-shot: round-6 reviewer 2 + round-4 playtesters still live on the
  iter-9 server. Shoot15 + e2e rerun follow when they report; their
  findings fold into iter-11 if they add anything.

## Iteration 11 (round-6 reviewer 2 new items, score 4.0, fail; commit 5f9d994)

Reviewer 2 judged the same shoot14 captures as reviewer 1, so most
of its findings were already fixed in iter-10 (fade to 0 by -60, sun
disc, lower light, deck cloud band, column restage, 0.9 s tumble,
1.4x debris). Only its NEW items went into this iteration:
- Boulder icons 60 -> 100 px (~39% of the 1.5-wide label, near the
  45% ask; the canvas caps side-by-side at ~40% without shrinking
  the number below readability), number font 72 -> 64 at x 184.
- Sun disc scale 12 -> 20 (~120 px in landscape) + depthTest off so
  drifting clouds never occlude it.
- Shadow frustum +/-10 -> +/-14 (column coverage to ~-22 at
  73 px/unit). Full -30 declined (needs +/-23+, ~44 px/unit).
- Horizon tower bases sunk to -12 (were -2, floating above clouds),
  heights varied 14..28 (2x); tallest top unchanged at 16. Bank -10.
- Cloud sea far band 70 -> 90 (total 120, no extra draw calls).
- Banners: the "blank slab" read was the emblem-less INSTANCED
  banner/pole boxes, NOT the detailed assemblies (emblem verified in
  the model: glowing cyan mesh on BOTH faces). Removed the instanced
  pole/banner meshes; sideDetail assemblies 6 -> 10 at 11 spacing
  cover the full 110 m window (was a 40 m gap). Only instanced
  rubble remains.
- Declined: near-golem 20% shrink (hitbox/visual incoherence);
  squad spacing 1.4 (same iter-10 decline); lower-body narrowing +
  raised gun barrel (model edits, frozen geometry); foreground
  boulder inboard/camera pullback (crop unverified — my view +
  reviewer 1 show both boulders in frame; re-check on shoot15);
  golem-walk at -10..-15 (-10 hits the line at 1.45 s and lunges;
  -20 stands); "5+ concurrent bolts per gun" (pistol already flies
  ~10 bolts/gun unobstructed; the column absorbs them).
- Gates: tsc, eslint, vitest 26/26, next build pass. Still NOT
  restarted on :3100 or re-shot: round-4 playtesters still live on
  the iter-9 server. Shoot15 + e2e rerun follow when they report.

## Playtest round 4, playtester 2 (GO RIGHT / AFK / JITTERY / GATE SPOT-CHECK; iter-9 build)

- GO RIGHT AND SHOOT BOULDERS: 90 s, SURVIVED, squad 3,
  targeting-rifle, score 4540, distance 840, kills 148. KEY QUESTION
  ANSWERED YES, emphatically: same-tier re-grant boosts granted —
  first at 12 s while still pistol (damageMult 1.25, rateMult 1.15),
  then pistol -> minigun at 22 s, minigun -> targeting-rifle at
  48.5 s, plus further re-grants at 30/38/59/65/71.5/78/86.5 s, ending
  damageMult 3.0, rateMult 2.0. Sliding wall smooth (max squadX jump
  0.183 per 0.5 s step, no snap). SquadX bounded 1.408..1.6 (iter-9
  formation clamp, intended). Gates 2/1/2 at 30/60/90 s.
- AFK: 60.5 s, GAME OVER, squad 0, pistol throughout, NO upgrade,
  damageMult/rateMult 1.0, score 1832, distance 532, kills 52. The
  iter-9 auto-aim narrowing (6 -> 4 deg) WORKED: round 3 AFK
  auto-upgraded to minigun and survived 90 s; this AFK never upgraded
  and died at 60.5 s — inside the casual 60-90 s target. No bug.
- JITTERY_MOUSE: NOT COMPLETED (no data). GATE SPOT-CHECK (120 s
  centre): NOT COMPLETED (only partial gate evidence from the two
  completed runs: 2/1/2 and 2/2 — small, not growing, consistent with
  the despawn fix but not the full series).
- SERVER BREAKAGE (environmental, NOT game code — and caused by this
  coordinator): at ~13:29 and ~13:33 the on-disk .next was rebuilt
  (the iter-10/11 `npm run build` validation runs) while the old
  :3100 server kept serving in-memory HTML referencing the deleted
  webpack chunk (1442b7fd3322bac9.js -> HTTP 400), so every fresh
  page after that failed to hydrate (window.__game never appeared).
  The playtester tried a route-interception workaround and abandoned
  it (chunk-id mapping differs). LESSON, now a rule: NEVER run
  `npm run build` while children drive the live server — the build
  replaces .next out from under the running server. Build only after
  all server children finish, then restart once. The remaining
  round-4 child (playtester 1) will hit the same breakage for its
  later strategies; its partial data stands, and the missed
  strategies re-run after the restart.
- Balance notes (no fix, design working as coded): boost stacking
  reaches the sim's EXPLICIT caps (damageMult min(3, ...), rateMult
  min(2, ...) in sim.ts grant code) after ~8 re-grants in 90 s of
  dedicated right-lane play — verified in code, not unbounded.
  GO_RIGHT ended with enemies alive spiking 0 -> 1 -> 15 (iter-9
  ramp working, not trivialized). AFK 60 s idle survival is within
  target, not a free-upgrade path anymore.
- Perf (headless SwiftShader only, never device fps): 571 ms per
  0.5 s advance (GO_RIGHT 454 ms, AFK 745 ms at 320x180; render-bound,
  not sim-bound). Zero console errors on completed runs; failed pages
  logged only the HTTP 400 resource error.
- Round 4 is therefore INCOMPLETE (2 of 4 strategies unrun for
  environmental reasons), not clean and not failed on game bugs. A
  round-5 re-run of the missed strategies (jittery, 120 s centre gate
  series, + whatever playtester 1 misses) is required after the
  server restart, before any tagging claim.

## Playtest round 4, playtester 1 (STAY CENTRE / GO LEFT / REGRESSION; iter-9 build)

- STAY CENTRE: 60 s, SURVIVED, squad 3, minigun (upgraded via centre
  auto-fire destroying a boulder — the 4 deg aim still allows SOME
  centre boulder breaks), score 1381, distance 406, kills 39. Squad
  never dropped (min 3 over all 120 steps); max enemies 12. Gates
  stable at 2 at 20/40/60 s (partial leak evidence only, NOT the 300 s
  series). damageMult/rateMult stayed 1.0 (only one boulder destroyed
  — an upgrade, not a re-grant — so the boost mechanic is untested
  by centre runs, not disproven; playtester 2's GO_RIGHT tested it).
- GO LEFT: NOT RUN (server breakage; squad growth, gate
  multiplication, final squadX vs -2.4 all unverified this round).
- REGRESSION A+B (300 s gate series + 600 s natural centre game
  over): NOT RUN (server breakage). The 600 s question — does the
  iter-9 ramp end the 1200 s centre immortality? — is UNVERIFIED.
  Do NOT treat the 60 s gate stability as a pass for the 300 s check.
- REGRESSION C (game-over panel first frame, forced golem): PASSED
  on the first OBSERVABLE frame. Fresh context, 10 s centre, then
  spawnEnemy('golem',0,0): squad 3->0 in one 0.5 s step (spec'd golem
  kill 3), gameOver 1.0 s later; first post-yield DOM read showed
  exactly "Score 194 / Distance 69 m / Kills 5 / Best 194", matching
  the final snapshot, and freeze held (194/69/5 unchanged over 5 s +
  advances). The "low" caveat: a DOM read INSIDE the same JS task as
  the __advance() call that flips gameOver still shows the pre-game
  HUD, because React flushes only after the task yields — that is a
  React-flush artifact, not stale panel numbers. Acceptance is
  therefore defined as the first observable frame, where it passes;
  the iter-9 synchronous pushHud() is present in source and works.
- Balance notes (no fix): centre-only 60 s is strong (never dropped,
  free minigun); single golem contact wiping the squad is the spec'd
  rule, not a bug, but abrupt; boost untested by centre runs.
- Perf (headless SwiftShader only): 3238 ms per 0.5 s advance at
  1280x720 High (composer, DPR 1.5) — i.e. ~0.15x real time, so a 600 s
  run would take ~65 min at default settings. The 640x360 Low config
  for long runs was never measured (its pages failed on the server
  breakage). Round-5 brief MUST mandate small viewport (320x180 or
  640x360) + Quality low for long runs. console_errors=1 counts only
  the webpack 400 on later diagnostic loads; the completed centre run
  itself had 0 console/page errors.
- ALL round-4 children now complete. Server restarted (see next
  section); round 5 re-runs the missed strategies on the iter-10/11
  build.

## Server restart + shoot15 (iter-10/11 build)

- Old server (pid 1670, started 13:13, build qdOK2xUviVUFVJkgfDr2G)
  killed by pid after all round-4 children finished; port 3100
  confirmed free; new `next start -p 3100` (pid 6516) serves the
  on-disk build m37kXbgoLwPpvYzkTHw87 (iter-10/11 code). Verified:
  HTTP 200 + all 7 referenced chunks return 200, including the new
  webpack chunk d877c5c979c4e17f — the hydration failure mode is gone.
- (Shoot15 results to be filled in below once the run completes.)

## Shoot15 (iter-10/11 build; server restarted, pid 6516)

- Shoot: `SHOOT_BASE=http://localhost:3100 npx tsx scripts/shoot-game.ts
  > /tmp/shoot15.log 2>&1`, exit 0, 38 files, zero console errors, all
  distinct sizes, min 334,750 bytes (no blanks). Hero landscape hash
  4103172149b9e59cbe915f145ac8273503fd1a2f4c1b866a17d6ffdfee2be728,
  hero portrait hash c739f9459603480ccb462990303ddb43db09be33022ccbd9858092972ed2bfb7.
- Personally verified before the round-7 review:
  - Sun disc: large, crisp, opaque white disc top-left — fixed.
  - Skyline: dark blue-grey silhouettes, varied heights, standing in
    the cloud sea — contrast fixed.
  - Cloud sea: dense billows flanking both road edges — no void band.
  - Near golem: stands alone, crawlers separated with visible gaps.
  - Gate chain "2x" dense left; boulder icons LARGE glowing cyan
    glyphs beside "100" — the icon-size fix reads.
  - Foreground boulders FULLY in frame in landscape — reviewer 2's
    "cropped by frame edge" claim NOT reproduced on shoot15 either
    (it was not reproduced on shoot14 by the coordinator); no fix
    made, flagged for round-7 reviewers to verify with edge pixels.
  - Banners show glowing emblems; no emblem-less slabs (instanced
    boxes removed).
  - Shadows: long dark shadows under robots, golem, foreground
    boulders — the lower light reads.
  - Far-field label smear: gone (fade to 0 by -60 works).
  - Squad separation: gaps now POSITIVE (0.13 units: 1.0 spacing minus
    ~0.87 white torso shells) and visible in portrait, narrow in
    landscape. May still be flagged; further spacing trades against
    the centre clamp (1.2 spacing -> clamp 1.2, 1.4 -> 1.0) and needs
    test updates + a rebuild, so it waits for round-7 verdicts AND
    round-5 playtest completion (no code changes while playtesters
    drive the server).
  - Robot-fire frame-06: thick bright bolt stream, burst ring on a
    hit crawler, legs visible below the ovals. Muzzle flashes are
    SAMPLING-LIMITED: the 0.2 s flash per 0.45 s shot means the
    reviewers' 00/03/06/09/11 subset catches a window only on frame-03
    (sim times 2.0/2.75/3.5/4.25/4.75 vs windows on the 0.45 grid);
    frames 01/05/07/10 of the full 12 also catch windows. Round-7
    reviewers are briefed to judge firing across ALL 12 frames. If
    they still flag it, iter-12 can extend the flash window — after
    round-5 finishes, not before.
  - Golem-walk frame-06: golem large, dark, camera-facing, orange
    eyes; frame-03 fully lit (black-frame regression absent).
  - Boulder-break frame-09 AND frame-11: debris persists, TWO
    distinct light-grey piles visible in frame-11 — the "gone by
    09/11" complaint is fixed.
- Round-7 confirmation reviewers spawned on shoot15 (briefed with
  the iter-10/11 change list, ground rules, and the all-12-frames
  muzzle note). Round-5 playtesters already running on the same
  server (spawned before shoot15 completed; they drive the server,
  reviewers read files — no conflict).
- E2E rerun DEFERRED until round-5 playtesters finish, to avoid
  contention flakes (the iter-3 e2e timeout was contention-caused)
  and because e2e gates tagging, not the review.

## Round-7 reviewer 2 (shoot15; score 3.5, fail)

Harsher than round 6 (4.0/4.0) — but it judged shoot15, and one
iter-10 change BACKFIRED, which explains the drop. Verified fixed
by this reviewer: frame-03 black frame absent; banners show glowing
emblems; sun disc present, not occluded; near gate 2x legible; squad
gaps visible in clear frames. Everything else it calls failing; each
claim was checked against code before accepting or rejecting:
- MUZZLE BLOB (P1, REAL, iter-10 backfire): the 4x muzzle spheres
  (0.56 wide x 0.84 long, additive pale cyan-white) at the guns merge
  with the white torso shells, so in firing frames the squad reads as
  one continuous pale band. The reviewer counts 9/12 flash frames —
  that is STAGGERED robot fire timers (3 robots x 0.2 s windows /
  0.45 s interval means usually >=1 robot flashing), not the
  synchronized grid the coordinator assumed. Note: the reviewer
  misidentifies the blob as the robot flash PLANE — verified in code
  that r.flashUntil is NEVER set (stays -10), so the flash plane is
  always invisible; the blob is muzzle sphere + torso. The FIX is
  still the reviewer's: shrink the muzzle (see iter-12 plan).
- PORTRAIT CROP (P1, REAL, portrait only): the reviewer explicitly
  claims portrait only (not landscape, per the coordinator's
  verification). Geometry supports it: at portrait pull-back the -1.0
  boulder's right edge sits at ~25.3 deg = exactly the half-FOV, and
  its label's right digits exceed it. Fix: portrait pull-back boost
  0.5 -> 0.8 (see iter-12). The reviewer also notes the squad sits
  high in portrait with empty road below — a composition trade-off
  (bottom-anchoring the squad costs road width at this FOV), not
  chased further.
- BOULDER BACKING (P1, PARTLY REAL): labels DO have a dark backing
  (rgba(0,10,25,0.55), iter-7) — the reviewer saying "no backing"
  means it is too weak to notice against grey boulder. Fix:
  strengthen to 0.75. The "100 icon does not read as a pistol" is a
  misread (100 boulders are MINIGUN tier, not pistol), but the
  underlying point (abstract glyphs at distance) stands; icon stays
  100 px (120 px would clip the canvas / collide with the number).
- FAR LABEL SMEAR (P1, MECHANISM VERIFIED, RANGE WRONG): label
  materials ARE transparent and opacity IS driven by the fade
  (verified at GameCanvas lines 299/314/868/896) — so the fade works,
  but its range (full at -40, 0 at -60) leaves the -40..-60 band at
  100%..0% where labels converge. The "tiny teal rectangles" are the
  gate GLASS (geometry, always visible), not labels. Fix: tighten the
  fade to full at -30, 0 at -50.
- GOLEM/BOULDER SHADOWS (P1, CONTRAST, NOT FLAGS): enableShadows IS
  called on golem + boulder pools and their meshes are opaque, so
  flags and +/-14 coverage are correct. The issue is contrast: dark
  shadows on the dark road merge with road shading, while tall thin
  gate posts read clearly. Fix: hemisphere fill 1.05 -> 0.8, key
  2.8 -> 3.0 (raises the lit/shadow ratio).
- SUN (P2): flat pure-white disc (clipped core) + faint halo +
  overlaps a tower. Fix: warm-tinted disc texture, bigger soft glow
  sprite, reposition to (-38,24,-120).
- SKYLINE (P2): flat boxes, bases not reading as sunk. Fix: taller
  cloud bank (2.5 -> 8 tall, centred y -8, spans -12..-4) so bases
  sit inside a bank silhouette. Second row / pointed tops deferred
  (boxes with varied heights already read as a skyline; detail work
  has lower return than the P1s).
- CLOUD DECK (P2): discrete billows leave sky-blue gaps at road
  edges. Fix: continuous cloud strips under both edges (x +/-7,
  y -2.5, 10 x 1.5 x 110, cloud material) beneath the billows.
- CENTRE COLUMN (P2, DECLINED): far-field compression is perspective
  and matches the reference's own dense vanishing column; widening
  to +/-2.0 would put crawlers in the gate/boulder lanes. Near/mid
  separation (golem alone, gapped crawlers) stands as verified.
- BANNERS (P3, REAL, WRAP ARTIFACT): at the hero shot's distance the
  wrap puts the nearest group at z -6, leaving the foreground
  (z 0..-6) empty — banner presence cycles with distance. Fix:
  sideDetail 10 @ 11 -> 14 @ 8 (max gap 8 m < 10 m foreground, so a
  banner is always near).
- RECOIL/STRIDE (P1/P2): firing-frame-only kick/pitch + |sin| bob
  aliasing at 0.75 s sampling make postures read identical; limbs
  are white-on-white so small swings vanish. Fix: arm z 0.35 -> 0.5,
  robot leg splay 0.25 -> 0.4, bob 0.25 -> 0.35, pitch -0.12 -> -0.2,
  kick 0.15 -> 0.2. Raised gun pose declined again (model).
- GOLEM WALK (P1): legs same colour as body + bulky torso hide the
  steps; AND frames 10-11 overlap the squad on screen (golem at
  (0.9,-1.0) projects onto the right robot at (1.0,0)). Fix:
  leg x 0.5 -> 0.7, splay 0.2 -> 0.3, bob 0.14 -> 0.2, roll 0.10 ->
  0.15; staging x 0.9 -> 2.0 (laterally clear of the squad span).
  Closer staging declined (hits the line and lunges, as before).
- DEBRIS (P1, PARTLY REAL): two piles 1.2 apart with ~1.5-unit
  spreads TOUCH visually (scatter 61% +/- 6.5%, main 73% +/- 6.5%),
  so they read as one cluster. Fix: scatter 1.2 -> 1.8 inboard.
  The "300 label remains above debris" is a MISREAD: the break
  boulder's label is "12" (hidden at break); the "300" is a DEMO
  boulder's label in the same lane. Fix: remove demo boulders from
  the boulder-break capture branch so nothing confuses the read.
  Near staging declined again (geometric incompatibility, logged).
- DEATH TUMBLE (P2): a flat dark corpse on the dark road has no
  contrast, so tumbles read as pop-outs. Fix: rotation 2.2 -> 1.2
  (tilted, not flat), scale 0.5 -> 0.7, sink 0.1 -> 0.
- BOLT STREAM (P1): bolts are spaced 8.1 m apart (0.45 s x 18 m/s),
  so no continuous line forms; trails are only 0.9 long. Fix:
  trail length 0.9 -> 2.5 (centre z +1.55), opacity 0.6 -> 0.5.
  "Confine to centre lane" declined: 3 robots at x -1/0/1 ARE the
  centre lane; 3 streams are correct for 3 guns.
- ITERATION COUNT WARNING: iter-12 will be the 12th fix iteration
  (cap 15 per stage). If round-8 still fails, iter-13/14 must close
  it or the spec forces commit-best + logged diffs.
- NO CODE CHANGED YET: round-5 playtesters are driving :3100, and a
  rebuild would break them again (same lesson as round 4). Iter-12
  implements after they finish, then shoot16 + round-8 review.

## Round-7 reviewer 1 (shoot15; score 4.0, fail)

Converges with reviewer 2 on the core items (muzzle blob 9/12,
bolt density, recoil/stride, golem articulation + end occlusion,
single-cluster debris, far smear, icon legibility, shadows, cloud
sea, skyline, sun warmth, portrait edge). Both reviewers agreeing
makes this a consensus, not one harsh outlier. New items:
- PORTRAIT EDGE (P2, BROADER): not just boulders — anim frames also
  crop gates/banners at near-plane edges (robot-fire 07 '2x' fragment,
  golem-walk 07 '2x'). The hero part is fixed by the pull-back boost;
  the anim part is partly transient scroll (props exiting the frame
  are normal), but half-label fragments at the bottom edge are
  avoidable: add a NEAR-fade for labels (full at z -3, 0 at z -0.5).
- CAMERA COMPOSITION (P2): squad occupies the bottom 30-35% and is
  partially cropped at the frame bottom (feet below frame), vs the
  reference's fully-visible ~15% hero. Fix: camera z 3.0 -> 3.3
  (modest pull-back: squad ~19%, feet in frame, road still ~93% of
  width at the bottom with cloud sea in the corners). This slightly
  trades road-width fill for full-squad visibility.
- SHADOW FLAGS (P1, VERIFIED CORRECT): road tiles DO receiveShadow
  (traverse sets it, line 472) and all pools cast — the reviewer
  asking to "enable" them is answered by existing code. Contrast
  (hemisphere/key) remains the fix.
- SKYLINE (P2): add a SECOND wider shorter row (same dark material,
  x -20..20, heights 6-12) for full-width density. Side-tower
  darkening declined (model materials); window strips declined
  (sub-pixel at 108 m).
- SUN (P2): agrees with reviewer 2 (warm + gradient + keep large).
- CLOUD SEA (P1): agrees (continuous strip). Colour reversal: sea
  0xd9e4ee -> 0xffffff — the iter-7 grey tint REDUCED contrast vs
  the sky (luminance ~0.88 vs sky ~0.85); white (1.0) pops better now
  that the sea is dense (the iter-7 "invisible" read was sparsity,
  not colour).
- CENTRE COLUMN (P2): strict alternation already approximated; far
  compression is perspective (declined, as before). Actionable part:
  remove the two farthest hero crawlers (-35, -42) to thin the
  vanishing-point specks (capture-only).
- BOULDER LABEL DOME OCCLUSION (P1, REAL, NEW MECHANISM): the label
  sits at (0, 0.5, 0.5), but the dome's front surface at y 0.5 is at
  z 0.56 — so the label plane is 0.06 INSIDE the dome and its lower
  digits are occluded. That is exactly reviewer 1's "first digit
  partly obscured by the dome". Fix: label z 0.5 -> 0.85 (clear of the
  0.75 dome front + margin). "Parent/destroy label on break" already
  holds (the whole boulder group hides); the lingering "300" is the
  demo boulder, fixed by demo removal in the break capture.
- BOLT DENSITY (P1): 3-7 visible vs 10-12 asked. Fire rate is balance
  (not changed); visual density comes from trails (2.5 long, planned)
  + bolt radius 0.12 -> 0.15. Colour stays 0x00e5ff (already
  saturated; the palette cyan).
- GOLEM CYCLES (P1, INFEASIBILITY NOTED): "3 full step cycles while
  large" cannot hold for a heavy-stomp golem in 3 s (3 rad/s period
  2.09 s; large for ~1.25 s = 0.6 cycles; 3 cycles needs 12.6 rad/s
  scuttle or a 6 s+ sequence). Compromise: cadence 3 -> 4 rad/s
  (period 1.57 s) + amplitudes up + staging x 2.0. Reviewers judge
  the RESULT (reads as walking?), not the cycle count.
- DEATH TUMBLE (P2, VERIFICATION GAP, REAL): no sequence stages a
  death near/mid-field, so the tumble cannot be verified from
  captures. Fix: ADD a 4th capture sequence ?anim=death (golem 1 HP
  at (0,-10): dies on first bolt ~0.6 s at z ~-6, 11-16% tall, tumbles
  0.9 s across frames ~03-06) + shoot-script 4th sequence. This is
  new capture infrastructure, justified because death is a spec'd
  animation with no capture.
- DEBRIS COLOUR: lighten 0x8a94a0 -> 0x9aa8b5 (contrast vs dark road).
- SQUAD SEPARATION (P2): agrees (fixed by muzzle shrink; keep 1.0).

## Round-5 playtester B (iter-10/11 build; 320x180, Quality Low)

Confirms playtester A: centre/AFK auto-upgrades (AUTO_AIM 2-degree
fix in iter-12), gate-cap sprint (spec property, not fixed),
leaked-field low (fixed in iter-12). New:
- STAY CENTRE (60 s, SURVIVED, targeting-rifle, 2222, 67 kills):
  zero steering yet minigun by 20 s, targeting-rifle by 40 s.
- GO LEFT (60 s, SURVIVED, squad 99 = MAX_SQUAD cap by ~40 s,
  rocket-launcher, 2179, 65 kills): 3 -> 6 -> 96 -> 99. Final
  squadX -0.40 is the wide-formation clamp (5-column, half 2.25),
  not a steering failure; gates triggered via formation edges
  throughout (documented behaviour).
- REGRESSION A — GATE LEAK (600 s centre): gates sampled every
  30 s, max 2, never above 2, no growth. PASS.
- REGRESSION B — NATURAL CENTRE GAME OVER (600 s centre): did
  NOT end. Squad 3 -> 2 between 90-120 s, then held at exactly 2
  from 120 s through 600 s (kills 2256, score 65676, boosts capped
  3.0/2.0, targeting-rifle). The late ramp (HP 5x, speed 2.0x,
  budget 16) did NOT close out a stabilised maxed squad within
  600 s. NOT a spec violation (spec targets are floors: "skilled
  >5 min"; no target says unskilled must die by X; caps exist to
  keep waves beatable). NOT retuned blindly in iter-12: round-6
  playtesters will run a 1200 s centre run to judge whether the
  ramp EVER closes it out; retune only on that evidence.
- REGRESSION C — PANEL FIRST FRAME: PASS (exact 211/86/5,
  freeze holds over 5 sim-seconds).
- LOW (same as A's low 3): snapshot().leaked undefined.
- PERF: median 617 ms, mean 766 ms per 0.5 s advance (1470
  advances, contention-inflated — playtester A overlapped).
  Zero console errors. Headless-only.

## Shoot16 (iter-12 build) — personally verified 2026-10-30

50 files, zero console errors, all 342 KB+ with distinct sizes.
Hero landscape hash bbb74f12daae40653f9777963aae274eaec30aeb858a850b63d0a00e7ce1119c,
portrait 70b066ed4cbc2c5c7adb08aa87195b69324f3e761a351fc506e7d03bab66d475.
Verified fixed: muzzle blob gone (robot-fire 03 shows 3 distinct
robots with gaps + modest muzzle at the gun, no torso blobs); bolt
stream denser (6-7 streaks near/mid lane); squad feet in frame in
both heroes (~20% landscape, ~15% portrait); portrait boulder
labels + domes fully in frame with right margin (both 100s);
boulder digits no longer occluded by domes (z 0.85); cloud sea
white + continuous under both road edges; golem shadow stretches
right (contrast fix); golem-walk 11 ends clear of the squad line
(x 2.0, full body visible bottom-right); boulder-break 11 debris
persists with NO floating label above it (demo removal worked —
the far "300" elsewhere is a distant boulder, not the break site).
DEATH SEQUENCE CORRECTION: the tumble window is frames ~01-03,
not 03-06 as the code comment says — pre-existing in-flight
bullets (fired during the 6 s pre-advance at demos, which cannot
be hit) kill the 1 HP golem at ~0.1-0.3 s, so the 0.9 s tumble ends
~1.2 s. Frame 02 shows the tipped corpse + burst, frame 03 shows
it flattening, frame 04 is empty. Round-8 reviewers must judge
death frames 01-03. (Code comment frame numbers left stale;
correct at the next code touch, no rebuild for a comment.)

## Round-8 reviewers (shoot16; reviewer 1: 4.0 fail, reviewer 2: 5.0 fail)

Both fail, but several findings are misreads or declined items, and
the real P1s are fixable in iter-13. VERIFIED BY CODE READ before
logging (not assumed):
- ROBOT ORIENTATION (reviewer 1 P1, MISREAD): the robots DO face
  away (-Z), running forward. The visible cyan circle is the BACK
  disc — the robot model (src/models/robot.ts) has a chest core on
  the front AND "a full circular cyan disc in a circular plate" on
  the back, by design. The camera correctly sees the back disc.
  "Facing the camera" is wrong; no orientation change.
- FLASH "SHOULDER DISCS" (reviewer 1 P1, REAL): the robot flash box
  (mkFlash 0.62 wide x 0.9 tall x 0.4 deep at torso height, white)
  shows for 0.25 s on every squad hit — in robot-fire, crawlers
  reach the squad line from ~1.5 s, so frames 06+ show big white
  torso boxes. That IS the "pale disc behind the shoulder". Fix:
  DELETE the flash box entirely (every squad hit already produces
  a robot death + burst, so no feedback is lost).
- MUZZLE/BOLT "WINGS" (both P1, REAL, iter-12 backfire): the 2.5
  trail (lengthened in iter-12 for density) + 1.95 bolt project
  vertically from behind (Z maps to screen-Y under the camera
  pitch), reading as solid wings/blades, not gunfire. Fix: trail
  2.5 -> 1.2, bolt scale z 3 -> 2 (total streak ~2.2, was ~4.45),
  keep radius 0.15. Density must come from count, not length.
- BOULDER LABELS (both P1, REAL): (a) minigun icon reads as
  "three dots" — it IS three barrel circles; redraw as three
  barrel RECTANGLES + body so it reads as a gun at small size.
  (b) "Huge black slab extending past the boulder": the 1.5-wide
  label (spans 1.65..3.15 for a boulder at 2.4, dome 1.7..3.1)
  overhangs the dome + road edge. Fix: plane 1.5x0.85 -> 1.3x0.74
  + x -0.1 (spans 1.65..2.95, inside the dome, 25% smaller slab).
  (c) "Second 100 stacks over the same boulder": MISREAD — two
  different boulders (-1.0 and -3, both minigun tier) whose labels
  stack in perspective; the smaller plane reduces the overlap.
  (d) Foreground boulder overlaps the right robot on screen: move
  it x 1.6 -> 1.9 (portrait margin still safe: label ends ~88%).
- GOLEM-WALK END (both P1, REAL, coordinator misread): frame-11
  crops the golem at the bottom-right corner because it walks
  THROUGH the camera, not because x 2.0 is wrong. Math: from -20
  at ~7.1 m/s (scroll + speed) it reaches +1.3 by 3.0 s — past the
  squad line AND nearly at the camera (3.3), and in contact at
  2.76 s. The iter-10 "-1.0" comment was wrong arithmetic. Fix:
  stage -20 -> -28 (ends -6.7, fully in frame, walking, no
  contact). Keep x 2.0.
- DEATH TUMBLE (both P1, REAL): (a) the big-death burst ring
  (radius to 3.1) dominates the corpse and reads as a "portal".
  Fix: big ring growth 4 -> 1.5 (max radius ~1.35). (b) Pitch
  tumble foreshortens from behind into a "squash". Fix: ROLL
  (rotation.z) instead of pitch, so the body lies horizontally
  across the frame; scale 0.7 -> 0.85; duration 0.9 -> 1.2 s
  (frames 01-04). (c) Death staging -10 -> -8 (bigger corpse).
- DEBRIS (R1 P1, R2 P2, REAL): loose dark tetra scatter reads as
  ambient road rocks, not piles. Fix: pile scale 1.4 -> 2.0,
  rocks 6 -> 8 per pile, tighter cluster (+-0.3), colour
  0x9aa8b5 -> 0xc0c8d0 (distinct from edge rubble 0x6e747b).
  Keep scatter 1.8.
- SUN (both P2, REAL): no warm tint visible because the disc
  multiplier (1.8,1.7,1.4) pushes all channels over the bloom
  threshold, washing to white. Fix: disc (1.9,1.5,0.9), glow
  (1.7,1.4,0.9), halo alpha 0.5 -> 0.7. Size floor kept.
- SKYLINE ROW 2 (both P2, REAL, mechanism found): the shorter row
  (6-12 tall) hides BEHIND the 8-tall bank (spans y -12..-4): a
  6-tall tower (-12..-6) is entirely behind it. Fix: row 2 heights
  10-16, x -24..24 (offset from main towers), z -4 — a middle
  layer whose tops (-2..4) clear the bank (-4) but stay below the
  main tops (16). Bank stays 8.
- CLOUDS (both P2, REAL): faceted grey undersides are flatShading
  + standard lighting; box strips read as flat planes. Fix: sea
  flatShading false + slight emissive (soft puffs, no grey
  undersides); replace box strips with a puffy sphere row
  (stripMesh, 56 smooth spheres at x +-7, y -2.5, z +5..-105).
- FAR "30" TRUNCATION (R2 P2, REAL): boulder label (spans to 3.15)
  is overlapped by banner poles at x 3.0, hiding the last digit
  of right-aligned numbers. Fixed by the 1.3-wide + x -0.1 label
  (spans to 2.95, pole at 3.0 clear).
- HIT REACTION (R1 P2, REAL): bursts on HP drop exist but are
  tiny at distance. Fix: enemy hit scale pop (x1.2 for 0.12 s on
  HP drop, material-free, visible from behind).
- PORTRAIT (R1 P2 vs R2 P1, CONTRADICTORY — HOLD): R1 says
  pull-back overshot (squad small, empty road); R2 says labels
  still touch the edge (wants MORE pull-back). Both cannot hold.
  Holding boost 0.8 (round-7 consensus + coordinator-verified
  margins); banner/tower edge clips are transient scroll/parallax
  artifacts, not framing errors. Do NOT oscillate the boost.
- DECLINED (spec/frozen, logged not fixed): raised firing arm
  (blaster is a group child at waist, not armR — frozen model);
  single large hero robot (spec: squad game, START_SQUAD 3);
  gate width/text/left-only (spec: gates left, 2x/3x; frozen gate
  model); far speck column (labels already fade by -50; enemies
  at distance are gameplay content that must stay visible; fog
  applies); rocket "up-arrow" icon (it IS the rocket nose + fins;
  minigun redraw is the clear win, rocket left as drawn).
- NO CODE CHANGED YET: round-6 playtesters are driving :3100.
  Iter-13 implements after they finish, then shoot17 + round-9
  review. Iteration count: iter-13 is the 13th (cap 15).

## Round-6 playtester B (iter-12 build; 320x180, Quality Low)

- STAY-CENTRE (60 s, SURVIVED, pistol, 1383, 39 kills): AUTO_AIM
  2-degree VERDICT: PASS. Zero steering, pistol throughout, NO
  upgrades, NO boosts (1.0/1.0), leaked 0, squadX 0.00. The round-5
  centre-to-targeting-rifle result is GONE.
- GO-LEFT (60 s, SURVIVED, squad 99 by ~47 s, targeting-rifle,
  1384, 39 kills): squad 3 -> 9 -> 18 -> 54 -> 99; weapon pistol ->
  targeting-rifle directly (no intermediate tier sampled) while
  squadX never exceeded -0.4. Cause: pickBoulderTier offers ANY
  tier >= current (spec) + the wide 99-formation's edge slots fire
  into the right lane. SPEC-COMPLIANT, logged as a conscious-call
  item (like gate growth): if "boulders require deliberate
  right-lane play" is strict intent, left-only max weapon by ~47 s
  contradicts it; if wide-formation road coverage is acceptable
  emergent reward, no change. NOT fixed in iter-13 (rule question).
- REGRESSION A — GATE LEAK (80 s, DIED, not 600 s): gates 2/1/1,
  max 2, no growth — PASS within the window. Supplementary
  god-mode 600 s run: gates 1-2 at all twenty 30 s samples, max 2,
  leaked 0 — the leak fix HOLDS for 600 s. The non-god run cannot
  survive long enough to measure it without god mode on iter-12
  (centre dies at ~76 s, see below).
- REGRESSION B — LONG CENTRE (80 s, DIED, not 600/1200 s):
  RESOLVES the round-5 open question. The round-5 stabilised maxed
  centre squad is UNREACHABLE on iter-12 (centre cannot upgrade
  anymore), so the 1200 s question is moot for centre hold. The
  unupgraded centre squad dies at ~76 s (sim clock 75.98 s, both
  independent runs, same point) via a golem one-shot (GOLEM.
  killRobots 3 = START_SQUAD 3, spec) — a cliff (3 at 60 s, 0 at
  80 s), not attrition. Death at 76 s sits inside the spec casual
  60-90 s band. NO ramp retune needed: the ramp closes out centre
  play via the golem one-shot, not via late HP/speed. The 1200 s
  question can only be re-asked for a squad that upgrades via
  deliberate right-lane play.
- REGRESSION C — PANEL FIRST FRAME: PASS (exact 195/70/5, freeze
  holds over 5 sim-seconds).
- LOW (new, -> iter-13): formation-growth position clamp snaps
  the centre up to 1.03 in one 0.5 s step when the squad grows
  (3 -> 9: squadX -1.4 -> -0.4 as maxX shrinks 1.4 -> 0.4). The
  playtester hedged (spring could cover 1.03), but the mechanism
  is the hard position clamp (`s.squadX = clamp(...)` after the
  spring move), not spring travel. Fix: rate-limit the clamp to
  MAX_LAT_SPEED x dt per tick (fast slide, no teleport, formation
  never far off-road). Centre-run max delta was 0.00, so the
  iter-12 wall clamp itself works.
- PERF: median 1006 ms (centre) / 1185 ms (left) per 0.5 s advance
  (contention-inflated: other agents active, ~442 MB free). Zero
  console errors across all 6 runs. Headless-only. One
  environment flake (first left-60 attempt ended with the page
  closed mid-run, no page error; retry clean) — not a game bug.
- STILL RUNNING: round-6 playtester A. No code changes until A
  finishes.

## Round-6 playtester A (iter-12 build; 640x360, Quality Low)

ALL ITER-12 FIXES VERIFIED PASS:
- GO-RIGHT (90 s, SURVIVED, targeting-rifle, 3074, 97 kills):
  pistol -> minigun (17.5 s) -> rocket (30 s) -> targeting-rifle
  (43 s) + boosts to 2.0/1.60. BOULDER CLAMP PASS: max per-0.5 s
  squadX jump 0.156 (excluding step-1 approach); squadX settled
  at 1.40. leaked 0 (defined).
- SQUAD-0 GRANT PROBE: PASS — a boulder broke during the dying
  window and granted NOTHING (weapon stayed pistol, mults 1/1
  through gameOver). The iter-12 guard works.
- AFK (76 s, DIED, pistol, 1857, 53 kills): AUTO-AIM 2deg FIX
  PASS — stayed pistol entire run, zero weapon/boost events,
  mults frozen 1/1. Round-5's zero-input AFK-to-targeting-rifle
  is gone. Died at 76 s (same golem one-shot point as B).
- JITTERY (60 s, SURVIVED, squad 72, targeting-rifle, 1408, 40
  kills): max jump 2.378 on input flips — NOT a teleport (spring
  max 6/s = 3.0 per 0.5 s window, in-spec travel). No NaN, no road
  exit. Gate-growth observation same as B (spec-compliant).
- GATE-LEAK SPOT-CHECK (79.5 s, DIED): PARTIAL PASS — gates 1 at
  30 s, 1 at 60 s (bar met on the observed window); died before
  90/120/130 s samples (centre cannot survive to 130 s without
  steering/god on iter-12). 90 s+ behaviour unmeasured here, NOT
  failed — B's god-mode 600 s run covers the long window (gates
  1-2). Combined: gate leak PASSES.
- LOW (new, -> iter-13): dead squad's squadX keeps sliding toward
  the held target during the 1.2 s dying animation (1.40 -> 2.39),
  because movement integration continues while dying. Cosmetic
  only (gameOver still fires at 1.2 s, score freezes, no road
  exit, no grant/score effect) — and invisible (squad 0 renders
  no robots; only the camera drifts ~0.54 laterally via lag).
  This is the recurring "post-game-over +-2.38 readings" confusion
  from every round. Fix: freeze the spring (not the scroll) while
  dying, so squadX and the camera hold still for the game-over
  screen. Cheap (2 lines) and it ends the recurring flag.
- BALANCE (spec-consistent, not fix items): jittery farms gates
  (spec); centre-only dies ~80 s while steered lanes snowball
  (steering IS the core skill; centre death at 76-80 s is inside
  the casual 60-90 s band; steered survival is intended).
- PERF: mean 992 ms, median 828 ms, max 5569 ms over 615 advances
  (640x360 Low; slower than prior ~570 ms claims — larger
  viewport + contention, measured not explained away). Zero
  console errors. Headless-only.
- ROUND-6 VERDICT: NOT clean (2 lows: formation clamp snap (B)
  + dying squadX drift (A), both minor, both now in iter-13).
  So round-6 does NOT count as clean run #1. After iter-13,
  round-7 + round-8 playtests must both be clean.

## Round-9 reviewer 2 (shoot17, 5.0/10, FAIL) — logged, NOT yet implemented (reviewer 1 still running; iter-14 waits for both)

- PASSED: iter-13 fix (1) — no white flash boxes on robot torsos
  in any robot-fire frame (confirms coordinator verification).
- P1 bolt trails: bolts still read as "floating pale spoons/
  paddles, detached from blasters" in robot-fire 00/03/06/09/11.
  PRELIMINARY MECHANISM (verify in code before fixing): a bolt
  travels -Z, so the camera sees it end-on; its 1.2-long trail
  extends along Z (depth), which under the ~30 deg camera pitch
  projects to a tall pale teardrop on screen — the trail IS the
  paddle. Candidate fix: brighter bolt material (white-hot core),
  trail 1.2 -> 0.5, muzzle scale 2 -> 1.2 (the "large pale side
  discs" P3 are the muzzle flash spheres at scale 2, sitting at
  the robot's side — same root cause, fold in).
- P1 golem-walk: "frames 00-09 show no foreground golem, frame-11
  only a tiny dark lump at the right edge near the '300' boulder,
  partly occluded". CONFLICTS with coordinator's shoot17
  verification (frame-11 golem fully in frame at mid-right,
  ~0.55-0.68 screen-x, walking, clear of the banner/boulder).
  MUST RE-READ frames 00/06/09/11 before deciding: if frame-11
  is good, this is a misread of scale, BUT the "too small for
  most of the sequence" complaint is still valid (golem starts
  at -28, ~5% tall). Candidate: restage -28 -> -24 (ends -2.7,
  ~20-30% tall in frame-11, no contact: x 2.0 is outside the
  +-1.4 squad extent, and it does not reach z 0 within 3 s).
- P1 boulder debris: "dark grey/black angular scatter across the
  centre lane, not two distinct light-grey piles; no intact
  boulder visible in frame-00". CONFLICTS with coordinator's
  frame-11 verification (two light-grey clusters). MUST READ
  the break code + frames 00/09 before deciding: check pile
  separation (if the groups overlap, they read as one spread)
  and whether frame-00 shows the staged boulder intact.
- P1 boulder labels: minigun "000 blobs" (glow merges the three
  bars) in landscape; portrait nearest boulder "clipped to two
  bars by the dome edge, pill overflows dome onto road".
  MECHANISM FOUND (geometry, not opinion): boulder hemisphere
  radius 0.8; at label height y 0.5 the dome is only
  2*sqrt(0.64-0.25) = 1.25 wide, so the 1.3 label OVERHANGS.
  Candidate fix: label y 0.5 -> 0.35 (dome 1.48 wide there),
  width 1.3 -> 1.2, reduce icon glow so bars stay distinct.
- P1 sun: "still essentially pure white, faint pale halo".
  MECHANISM: disc texture core is white AND multiplier
  (1.9,1.5,0.9) pushes all channels over the bloom threshold,
  so bloom washes it to white. Candidate fix: disc colour
  (2.0,1.1,0.3) + texture core stops to warm gold, so blue
  stays under threshold and the disc reads golden.
- P2 death ring: "cyan ring encircles the corpse in frame-01,
  resembling the banned portal ring". Candidate fix: remove the
  ring mesh from bursts entirely (shards + tumble carry the
  death; the ring caused the portal read in two rounds).
- P2 skyline: "main row flat dark rectangles; second row barely
  distinguishable". Candidate fix: paler material for row-2
  (distinct distant row) + small cyan spire tips on main towers
  (reference-like glowing spires).
- P2 sky clouds: "flat faceted discs with grey undersides"
  (the drifting cloudMesh, unlike the sea which was fixed in
  iter-13). Candidate fix: cloudMesh flatShading false +
  slight emissive, same as the sea.
- P2/P3 noted, not separate items: robot side discs = muzzle
  flashes (see bolt fix); death frame-06 correctly empty (as
  specified); distant "300"/"200"/"100" are boulders' own labels
  (reviewer correctly did not flag them as floating labels).

## Iter-13 (IMPLEMENTED 2026-10-30, commit 06206ba; gates green: tsc, eslint, vitest 26/26, next build passes; shoot17 50 files zero console errors; e2e ALL PASS)

- Freeze the squad spring (not the scroll) while dying (round-6
  A low: dead squad's squadX slid 1.40 -> 2.39 during the 1.2 s
  dying animation, drifting the camera; freezing it holds the
  game-over framing still and ends the recurring +-2.38 flag).
- Rate-limit the formation position clamp to MAX_LAT_SPEED x dt
  per tick (round-6 B low: growth 3 -> 9 snapped squadX -1.4 ->
  -0.4 in one tick via the hard clamp; slide back at max speed
  instead, no teleport, formation never far off-road).
- Delete the robot flash box (mkFlash + both uses): the "shoulder
  discs". Squad-hit feedback remains via death bursts + count drop.
- Trail 2.5 -> 1.2, bolt scale z 3 -> 2 (streak ~2.2, was ~4.45);
  keep bolt radius 0.15.
- Minigun icon redraw: three barrel RECTANGLES + body (not dots).
- Boulder label plane 1.5x0.85 -> 1.3x0.74 + x -0.1 (inside the
  dome, clears banner poles, 25% smaller slab).
- Foreground boulder x 1.6 -> 1.9 (less robot overlap).
- Golem-walk staging -20 -> -28 (ends -6.7, fully in frame, no
  contact, no camera pass-through). Keep x 2.0.
- Death tumble: ROLL (rotation.z) not pitch; scale 0.7 -> 0.85;
  duration 0.9 -> 1.2 s (frames 01-04); big burst ring growth
  4 -> 1.5; death staging -10 -> -8.
- Debris: pile scale 1.4 -> 2.0, rocks 6 -> 8 per pile, tighter
  cluster (+-0.3), colour -> 0xc0c8d0. Keep scatter 1.8.
- Sun: disc colour (1.9,1.5,0.9), glow (1.7,1.4,0.9), halo
  alpha 0.7. Size floor kept.
- Skyline row 2: heights 10-16, x -24..24, z -4. Bank stays 8.
- Clouds: sea flatShading false + slight emissive; box strips
  replaced by puffy sphere rows (stripMesh, 56 smooth spheres).
- Enemy hit scale pop (x1.2 for 0.12 s on HP drop).
- HOLD (not changed): portrait boost 0.8; robot orientation
  (verified correct); raised arm, single hero, gate width/text,
  far enemy density (see round-8 section for reasons).
Then: gates, rebuild + restart :3100, shoot17, personal
verification, e2e, round-9 review (2 fresh reviewers).

## Round-9 reviewer 1 (shoot17, 5.0/10, FAIL) — converges with reviewer 2 on all P1s

- Bolts: "fat bulbous heads on thin sticks, like spoons/paddles/
  balloons, torso-height in the foreground, detached from
  blasters". Golem-walk: "no clearly visible walking golem in
  00-09, frame-11 only a tiny dark cluster at far right beside
  the 300 label and banner pole". Death: "frame-01 cyan ring
  still present; frames 02-04 a small dark flattened heap, not
  a legible sideways roll; corpse too distant/small to judge
  ~0.85 scale". Sun: "pure/near-white in every frame; only a
  faint halo + yellow tint on the nearest left tower". Boulder
  labels: "near 100 labels sit astride the dome silhouette,
  black box protrudes beyond the dome, icon clipped to two
  bars/zeros". Debris: "one loose spread of dark grey/blue-grey
  angular shards across the centre road, not two distinct
  light-grey piles". Skyline: "one central dark block cluster
  plus pale side towers; no distinct second row". Sky clouds:
  "flat low-poly discs with grey undersides, flying-saucer
  slabs". Minigun: "bars where visible, but clipped + glow so
  heavily they read as 00/000". Flank discs: "large pale
  translucent disc on each robot's flank, balloon/shield, no
  reference counterpart". Foreground boulder + right-edge banner
  cropped by the frame edge (defect, no P assigned).
- Mismatches (reference vs game, NOT actionable — spec/frozen):
  single large hero vs 3 small robots; warm tiled bridge vs
  dark-grey road; large close enemies vs tiny distant ones.
  The squad game, frozen models, and road palette are design,
  not defects; the actionable items are the P1/P2 fixes below.
- ROUND-9 VERDICT: 5.0/5.0, both fail (up from round-8 4.0/5.0
  — slight improvement, still far from the >=9 bar). Iter-14
  is the 14th fix iteration (cap 15): if round-10 still fails,
  iter-15 must close it or commit best + log diffs.

## Iter-14 (FULL PLAN — implements round-9 P1+P2, both reviewers)

- Bolts: radius 0.15 -> 0.12 (thinner head); trail 1.2 -> 0.4
  centred z +0.85 (bolt rear is +0.65; 0.4 trail spans
  0.65..1.05, a short streak, not a paddle stem); ADD a white
  inner core capsule (radius 0.05, same length/rotation/scale,
  white additive) inside each bolt — bright core + cyan shell
  reads as energy, not a pale pill. Core tracked in ProjVis
  (visible = !isRocket, same as bolt/trail).
- Muzzle flash pulse scale (2,2,3) -> (1.2,1.2,1.8) — the
  0.56-diameter pulse IS the "large pale flank disc /
  balloon/shield" (reviewer 1 P2); at 0.34 diameter it is a
  flash at the gun, not a disc obscuring the torso.
- Golem-walk: x 2.0 -> 1.5, z -28 -> -24. Frame-11 (2.75 s, not
  3.0 s — the old comments used 3.0 s) ends at -4.7, ~15%
  tall, screen ~0.62..0.74 (small right-robot overlap only),
  no contact (x 1.5 is outside the +-1.4 squad extent, and it
  reaches z 0 only at 3.41 s, past the sequence), no camera
  pass-through. The x 2.0 staging walked in the boulder lane's
  shadow (boulders at 2.4), so the golem fused with boulder
  clusters on screen — 1.5 clears the lane by 0.9. Centre (x 0)
  is impossible: a close centre golem is occluded by the
  centre robot (reviewers' "centre" is aspirational; 1.5 is
  the achievable clear position).
- Death: REMOVE the burst ring mesh entirely (all bursts) —
  the ring caused the portal read in rounds 8 AND 9; shards +
  tumble carry the death. Death staging -8 -> -6 (dies at
  ~-5.2, ~16% tall, up from ~12%) so the roll reads.
- Sun: disc fill #fff3d6 -> #ffc850 (warm gold) + disc colour
  (1.9,1.5,0.9) -> (2.0,1.1,0.3); glow colour (1.7,1.4,0.9)
  -> (1.8,1.2,0.4); sunTexture core stops to warm gold
  (255,190,80)/(255,200,100). Blue stays well under the bloom
  threshold, so bloom is golden, not white.
- Boulder label (CORRECTED MATH — the iter-13 "inside the
  dome" claim was wrong: it used local units as world units):
  boulder group scale is 1.25, so the 1.3-local label is 1.625
  WORLD, wider than the dome (ellipsoid RX 0.441 x 1.25 =
  0.551, world width 1.10). The label MUST be <= 0.80 world
  to fit the ellipsoid face at all its heights. New plane
  local 0.64x0.364 (= 0.80x0.455 world, aspect 1.76
  unchanged) at local (0, 0.4, 0.85) (was (-0.1, 0.5,
  0.85)): world spans x 2.0..2.8 (inside dome 1.86..2.94 at
  that height, clear of the pole at 3.0 by 0.2, no shift
  needed) and y 0.27..0.73 (inside the dome's face at every
  height — verified against the ellipsoid equation).
- Icon glow: labels.ts shadowBlur 14 -> 5 (bar gap is 10 px,
  blur 14 merged the three bars into 00/000; blur 5 keeps them
  distinct).
- Debris: material MeshStandardMaterial -> MeshBasicMaterial
  (unlit, always light 0xc0c8d0 — the lit material read dark
  in shadow); pile scale 2.0 -> 2.5; separation 1.8 -> 2.6
  (at frame-11 distance the old 1.8 separation gave only a
  1.9% frame gap, so the piles merged into one spread; 2.6
  gives a ~6% gap); break staging -24 -> -20 (debris at
  ~-3.5 in frame-11, ~11% tall, in frame; frame-00 boulder a
  little larger).
- Skyline: row-2 gets its OWN paler material (0x6b7d8a, fog
  false) so it reads as a distinct distant row, not the same
  dark mass; ADD cyan pyramid spire tips (ConeGeometry 4
  segments, MeshBasicMaterial 0x00e5ff) on all 7 main towers
  (reference-like glowing spires).
- Sky clouds: cloudMesh flatShading false + emissive
  0xffffff 0.25 (same fix as the sea in iter-13).
- Foreground boulder x 1.9 -> 1.7 (reviewer 1 defect: dome
  cropped by the right frame edge in portrait; at 1.7 the
  dome (world 1.15..2.25) is fully in frame, label
  1.7+-0.4 = 1.3..2.1 inside it).
- HOLD (not changed): single hero, road colour, portrait
  boost 0.8, raised arm, gate width/text, far enemy density
  (reasons in round-8 + round-9 sections above).

## Iter-14 (IMPLEMENTED 2026-10-30, commits c811a73 + 19e712f; gates green: tsc, eslint, vitest 26/26, next build passes; shoot18c 50 files zero console errors; e2e ALL PASS; personally verified)

## Shoot18c (iter-14 build) — personally verified 2026-10-30

- Hero landscape: sun GOLDEN (amber disc + warm halo, not
  white); skyline with cyan spire tips + paler second row;
  boulder labels small black pills ON the domes (no overflow);
  foreground boulder fully in frame; squad feet in frame;
  gates 2x legible; cloud sea continuous.
- Hero portrait: same (golden sun, foreground boulder fully in
  frame at x 1.7, labels on domes). Right-edge banner still
  partially cropped at the extreme corner — transient scroll
  artifact, HOLD (portrait boost held).
- Robot-fire 06: NO flank discs; bolts short bright streaks
  with white cores (spoon read much reduced).
- Golem-walk 11: FULL golem, walking, ~20% tall, fully in
  frame, clear of the boulder lane (a spawned "300" label sits
  above/behind it by perspective coincidence — judge the
  golem body separately from the label).
- Boulder-break 11 (AFTER the unlit-material backfire fix):
  TWO distinct light-grey shaded mounds with a clear gap
  (left + right piles, faceted, 3D). The unlit version (first
  shoot18) rendered as giant flat white slabs — reverted to
  lit + emissive lift + scale 2.0 before review.
- Death 02: sideways corpse, ~16% tall, NO ring.
- E2E on iter-14: ALL PASS (start, gate x2, boulder minigun
  grant, game over, restart, zero console errors).
- Round-10 reviewers spawned on shoot18c (2 fresh reviewers).

## Round-10 reviewer 1 (shoot18c, 5.0/10, FAIL) — logged, NOT yet implemented (reviewer 2 still running; iter-15 waits for both)

- PASSED: ring deletion (no cyan ring in death 01-04).
- P1 bolts STILL spoons: "white-hot oval core inside a pale cyan
  capsule, foreshortened end-on". MECHANISM CONFIRMED: ANY -Z
  capsule viewed from behind foreshortens into an oval, and the
  full-length white core made a white oval. Three rounds of
  capsule tweaks failed. CANDIDATE (definitive, not a tweak):
  BILLBOARD streak sprites for bolts — a vertical streak
  texture (white core, cyan glow, tapered ends) on a Sprite
  that always faces the camera, so it CANNOT foreshorten.
  Replace bolt+core+trail meshes with one sprite per
  projectile (same pool, visible = !isRocket). Rockets
  unchanged (cones, never flagged).
- P1 muzzle discs persist: "large pale discs on robot flanks,
  far larger than a 0.34-diameter flash". ANALYSIS: the 0.34
  flash at close range is 8.9% of frame height (~45% of robot
  height) — prominent enough to read as a disc, AND near-camera
  bolts (large pale ovals) sit adjacent to robots and read as
  flank discs too. CANDIDATE: muzzle pulse (1.2,1.2,1.8) ->
  (0.7,0.7,1.2) (0.20 diameter) + pulse duration 0.2 -> 0.08 s
  (44% duty cycle made it look permanent; 18% reads as a
  transient flash). The billboard bolts kill the near-bolt
  discs too.
- P1 sky clouds STILL discs: "flat faceted ellipses with grey
  undersides". MECHANISM: cloudMesh spheres are scaled FLAT
  (y x0.32) — smooth shading does not fix a flattened SHAPE.
  CANDIDATE: clustered spheres (4 per cloud x 20 clouds = 80
  instances, NO y-flattening, offsets +-s x 0.5) — real puffs,
  not discs. Sea unchanged (flattened is correct for a layer).
- P1 debris STILL shards + engulfing: "flat triangles,
  frame-11 oversized and passing through robots". MECHANISM:
  tetrahedra ARE triangles, and at scale 2.0 + close range
  (z -3.5) they are 8%+ tall and overlap the robots on screen.
  CANDIDATE: IcosahedronGeometry(0.22, 1) (rounded, not
  triangular) + pile scale 2.0 -> 1.2 (piles ~6% tall, below
  robot height, no engulfing), keep separation 2.6 (gap stays
  clear). Piles at (2.4, -0.2) stay — the centre pile overlaps
  the centre robot on screen only if huge; at 1.2 it is a
  small mound in front, not engulfing.
- P1 death STILL small/gone: "corpse ~5-6% tall, gone by
  frame-04, no roll reads". ANALYSIS: staged -6 dies at -5.2
  (~12%, not 16%); the 1.2-rad roll (69 deg) is not a full
  90 deg, and the dark golem on the dark road loses contrast
  as it flattens. CANDIDATE: staging -6 -> -4 (dies ~-3.2,
  ~16% tall; contact would need 0.51 s, death at ~0.1 s comes
  first) + roll 1.2 -> 1.57 rad (full 90 deg, body horizontal).
  No emissive (frozen model look preserved).
- P1 boulder labels STILL overflow/clipped: "foreground 100
  at the dome's lower-right edge spilling onto the road;
  mid 100 half-hidden by the foreground dome; portrait pills
  at the dome edge, not centred". MECHANISM: the label floats
  0.57 world IN FRONT of the dome face (local z 0.85 =
  world 1.06 vs face 0.49), so parallax shifts it down/out
  from the dome on screen — it reads as detached/overflowing
  even though its world x fits. CANDIDATE: label position
  (0, 0.4, 0.85) -> (0, 0.44, 0.45) (world y 0.55 = dome
  centre height, world z 0.56 = just 0.07 in front of the
  face at that height — ON the face, not floating, minimal
  parallax, corners clear by 0.22). Minigun bars thicker
  (0.18 -> 0.24 width) for legibility at the small label size
  (the dome is only 1.10 world, so the icon cannot be
  reference-large without overflowing — that tradeoff is
  inherent to the reviewer's own "fully inside" demand).
- P2 golem-walk silhouette: "dark and muddy, limbs merge, legs
  short stubs". CANDIDATE (animation only, NO model change):
  golem leg x 0.7 -> 0.9, splay 0.3 -> 0.5 (wider lateral
  swing reads from behind; the model's legs ARE separated,
  but the swing foreshortens from behind). DECLINED: lighten
  leg/arm material (frozen Phase 1 model; would need
  fix(model/golem) + sheet review; animation addresses
  readability without touching the model). The "300 label
  behind" is a transient spawned-boulder perspective
  coincidence (they separate as they scroll), not a staging
  flaw.
- P3 skyline row-2: "paler towers read as isolated side
  towers, not a distinct row behind". CANDIDATE: add 6
  INTERLEAVED inner row-2 towers (x -7.25, -4, -1, 2, 5.25,
  8.5; heights 20-24, paler material, z -4) BETWEEN the main
  towers — they peek above/between the main row and read as
  a second row, not side towers. Keep the outer row-2 towers.
- Defect (no P): "small dark polyhedra on the road read as
  stray geometry" (burst shards lingering). CANDIDATE (cheap):
  shards all orange (was orange/grey) so they read as sparks,
  not rubble.

## Round-10 reviewer 2 (shoot18c, 4.5/10, FAIL) — converges with reviewer 1 on all P1s

- Bolts: "wide vertical pale-cyan ovals with a white centre and
  a short stem, reading as upright spoons/paddles/lollipops".
  Claims bolts are "camera-facing vertical discs" — a
  MISPERCEPTION (they are -Z capsules that foreshorten into
  discs from behind). Their fix ("thin -Z capsule, 3-4x longer
  than wide") is what iter-14 already has (7:1) yet still reads
  as a disc — proving -Z geometry cannot win from behind.
  BILLBOARD vertical streaks are the fix (they match the
  reference's "bright blue vertical gunfire streaks" that
  reviewer 1's mismatch explicitly wants, and cannot
  foreshorten). Reviewer 2's "not camera-facing" is declined
  on this evidence, with the rationale logged.
- Muzzle discs, debris, death, labels: same P1s as reviewer 1
  (same fixes). Death adds: "do not remove the corpse before
  frame 04; keep frame 06 empty" — NOTE: duration stays 1.2 s
  (extending to 1.5 s would make the corpse visible in
  frame-06, breaking the specified empty 06). "Frame-04 empty"
  is a VISIBILITY failure (small/dark/flat), not timing —
  fixed by closer staging + full 90 deg roll.
- Golem-walk P2: "move laterally clear of any boulder dome
  silhouette". ANALYSIS (screen-space overlap math): golem
  at x 1.5 (frame-11 screen ~0.68) vs spawned boulder at 2.4
  (screen ~0.65) vs centre robot (screen 0.50) — no x is fully
  clear on both sides (x 1.5: 8.1% boulder overlap, 0% robot;
  x 0.8: 5.4% + 4.3%; x 0.6: 3.2% + 6.5%). x 1.5 has the
  LOWEST total overlap and is clear in WORLD space (0.9 from
  the boulder lane, outside the squad extent). KEEP x 1.5;
  the splay increase separates the silhouette instead. The
  boulder alignment is a transient perspective coincidence
  (the boulder scrolls; the alignment differs per frame).
- Clouds P2, skyline P3: same fixes as reviewer 1 (clusters;
  interleaved inner row-2 + lighter material).
- ROUND-10 VERDICT: 5.0/4.5, both fail (down slightly from
  round-9 5.0/5.0 — the debris/label fixes helped some reads
  but the persistent spoon/disc/death/label mechanisms still
  dominate). Iter-15 is the CAP: after it, round-11 decides;
  if round-11 still fails, commit best + log diffs per spec
  (no iter-16).

## Iter-15 (IMPLEMENTED 2026-10-30; gates + shoot19 + e2e pending at log time)

- Bolts -> BILLBOARD streak sprites (definitive fix): a
  vertical streak texture (white core, cyan glow, tapered
  ends) on a Sprite that always faces the camera — it CANNOT
  foreshorten into a disc. Replaces bolt+core+trail meshes
  (same pool, visible = !isRocket). Rockets unchanged.
  Rationale vs reviewer 2's "-Z capsule" ask: three rounds
  proved -Z capsules read as discs from behind; the
  reference's own gunfire IS vertical streaks.
- Muzzle pulse (1.2,1.2,1.8) -> (0.7,0.7,1.2) (0.20 diameter,
  was 0.34 = 8.9% of frame height at close range) + pulse
  duration 0.2 -> 0.08 s (44% duty cycle looked permanent).
- Sky clouds -> clustered spheres (4 per cloud x 20 = 80
  instances, NO y-flattening, offsets +-s x 0.5, varied
  scales) — real puffs, not discs. Sea unchanged.
- Debris -> IcosahedronGeometry(0.22, 1) (rounded, not
  triangular tetrahedra) + pile scale 2.0 -> 1.2 (piles ~6%
  tall, below robot height, no engulfing). Keep separation
  2.6 + lit material + emissive lift.
- Death staging -6 -> -4 (dies ~-3.2, ~16% tall; contact
  would need 0.51 s, death at ~0.1 s comes first) + roll
  1.2 -> 1.57 rad (full 90 deg, body horizontal). Duration
  stays 1.2 s (frame-06 must stay empty).
- Boulder label position (0, 0.4, 0.85) -> (0, 0.44, 0.45)
  (world y 0.55 = dome centre height, world z 0.56 = just
  0.07 in front of the face — ON the face, not floating
  0.57 ahead, so parallax no longer shifts it off the dome).
  Minigun bars wider (0.18 -> 0.24) + spacing (0.28 -> 0.36)
  (gap 0.12 x s = 12 px, blur 5 keeps them distinct; icon
  spans 16..112, clear of the number at 131+).
- Golem walk: leg x 0.7 -> 0.9, splay 0.3 -> 0.5 (wider
  lateral swing reads from behind; animation only, NO model
  change). x stays 1.5 (see overlap math above).
- Skyline row-2: material 0x6b7d8a -> 0x8a99a8 (lighter,
  higher contrast) + 6 INTERLEAVED inner towers (x -7.25,
  -4, -1, 2, 5.25, 8.5; heights 20-24) BETWEEN the main
  towers, so the second row reads across the width, not just
  at the sides. Keep outer row-2 + spire tips.
- Burst shards all orange (was orange/grey) so they read as
  sparks, not stray rubble on the road.
- HOLD: golem x 1.5 (math above), death duration 1.2 s
  (frame-06 empty), single hero, road colour, portrait
  boost, raised arm, gate width/text, far density, golem
  material (frozen).

## Iter-15 (VERIFIED 2026-10-30; commit 13056a3; gates green: tsc, eslint, vitest 26/26, next build passes; shoot19 50 files zero console errors; e2e ALL PASS; personally verified; round-11 reviewers + round-7 playtesters spawned)

- Shoot19 (log /tmp/shoot19.log, 50 files, zero console
  errors): hero landscape hash
  a62db730d7ffe7ca9e4e8d88c033878c590519a6c520c1aefa3d7b41123273e8.
- Personally verified: robot-fire 06 — bolts are TRUE
  VERTICAL STREAKS (tall narrow cyan-white lines, not
  spoons/discs), NO flank discs on any robot; hero
  landscape — golden sun, puffy clustered clouds (bumpy
  multi-lobed, not flat discs), interleaved pale skyline
  row-2 visible between main towers, boulder labels ON the
  dome faces (centred, not overflowing), minigun bars
  thicker; golem-walk 11 — LARGE golem (~22% tall) in
  mid-stride with legs visibly apart, orange eyes distinct,
  fully in frame (the "300" label above/behind it is a
  spawned-boulder perspective coincidence, judged
  separately); boulder-break 11 — TWO rounded light-grey
  mounds with a clear gap, below robot height, robots
  unobscured (not shards, not slabs); death 02 — corpse
  tipped sideways mid-roll, ~16% tall, NO ring; death 04 —
  corpse STILL PRESENT lying horizontal (the round-10
  "gone by 04" complaint is fixed by size + full roll, not
  by extending duration, which would break frame-06).
- E2E on iter-15 (log /tmp/e2e19.log): ALL PASS — start
  squad 3 pistol, gate multiply squad 6, boulder grant
  minigun, game over reached, restart resets (squad 3,
  pistol, gameOver false), zero console errors.
- Round-11 reviewers (2 fresh) + round-7 playtesters (2)
  spawned on shoot19 / live :3100 build. Iter-15 is the
  CAP: round-11 decides — if it passes (>=9, zero P1),
  proceed to tags; if it fails, commit best + log diffs,
  NO iter-16. Round-7 playtests run in parallel (they only
  drive :3100, no rebuild will break them); round-8
  playtests follow if round-7 is clean (two consecutive
  clean runs required).

## Round-11 (shoot19, BOTH FAIL — 5.0 / 6.0, up from round-10 5.0/4.5; CAP REACHED, NO iter-16)

- VERIFIED AS FIXED (both reviewers agree the old P1s are
  gone): bolts are STREAKS now (not spoons/paddles/discs);
  NO flank discs on any robot; NO cyan ring in death;
  corpse PRESENT in frame-04; close hero boulder labels
  sit ON the domes; high sky clouds are puffy clusters.
- REMAINING DIFFS (the gap to >=9 — logged per spec, NOT
  iterated further; the build below is the best commit):
  1. Bolt QUALITY (both, P1/P2): streaks are uniform-width,
     flat-ended, and DETACHED from the muzzles (a gap
     between gun and streak start). Mechanism: the streak
     texture's vertical alpha taper is linear (soft ends,
     not pointed), and the sprite is centred on the
     projectile position, not anchored at the muzzle. Fix
     (NOT done, cap): pointed taper texture + anchor the
     streak's near end at the firing robot's muzzle.
  2. Golem-walk scale/stride (both, P1): frame-11 golem
     reads as mid-distance, crouched, legs tucked, eyes
     tiny dots — NOT the claimed LARGE mid-stride golem.
     Mechanism: the golem MODEL is small vs the
     reference's huge golems (a model-scale gap, not an
     animation gap — the splay increase did not overcome
     it), and the "300" spawned-boulder label still sits
     on its head by perspective. Fix (NOT done, cap):
     larger golem model or much closer staging + suppress
     the overlapping label for the shot.
  3. Sun colour (both, P2): pale lemon-yellow flat disc,
     not golden/amber. Mechanism: the (255,190,80) texture
     + (2.0,1.1,0.3) multiplier overexpose to light
     yellow under bloom + bright sky. Fix (NOT done,
     cap): deeper saturated amber + less bloom wash.
  4. Skyline row-2 (both, P2): NO interleaved pale row
     across the centre — pale towers only at the sides,
     centre is a solid dark block. Mechanism: the
     interleaved inner towers (x -7.25..8.5, z -4) do not
     read as a second row from this camera angle (the
     dense main row occludes/shifts them in perspective).
     Fix (NOT done, cap): a genuinely layered skyline
     geometry that reads from the behind-camera view.
  5. Side clouds (both, P1/P2): side/below-road banks are
     STILL flat slabs/discs with grey undersides. Mechanism:
     iter-15 clustered ONLY the sky clouds (cloudMesh);
     the sea (stripMesh) + side banks were not touched,
     and they read as continuous flat banks. Fix (NOT
     done, cap): break the sea/banks into separate puff
     clusters.
  6. Debris overlap (both, P1/P2): frame-09 pair is
     correct, but frame-11 mounds overlap the robots'
     lower bodies. Mechanism: the left pile at x 1.1
     (boulder 2.4 minus separation 1.3) sits directly
     behind the right robot (x 1.0) — on screen they
     coincide. The coordinator's shoot19 "unobscured"
     read was wrong (height, not screen overlap). Fix
     (NOT done, cap): move the piles' x clear of the
     robot slots or restage the break.
  7. Death roll timing (both, P2/P3): frame-01 shows no
     roll (rotation only ~11 deg at 0.25 s), and frame-04
     reads as a crumpled blob, not a clean 90 deg roll.
     Mechanism: the roll is linear over 1.2 s, so early
     frames show little rotation, and the dark golem on
     the dark road loses limb definition when flat. Fix
     (NOT done, cap): faster initial rotation + a
     silhouette that stays legible when horizontal.
  8. Boulder labels (both, P2): minigun bars STILL read
     as thin white strokes (0.24 width on a 0.80-world
     label is ~1-2% of frame width), and the nearest hero
     labels are partly occluded by the right robot (the
     foreground boulder at 1.7 overlaps the right robot
     at 1.0 on screen). Inherent tension: the icon cannot
     be reference-large without overflowing the dome
     (the reviewer's own "fully inside" demand). Fix
     (NOT done, cap): thicker bars + restage the
     foreground boulder clear of the robot.
- ROUND-11 VERDICT: FAIL (5.0/6.0). Per the spec hard
  cap, this is the FINAL visual state: the iter-15 build
  (commit 34bafa3) is the best commit. The visual gap to
  the reference is FLAGGED for the parent/user — it does
  not block the gameplay/tag path (rules, e2e, and
  playtests judge correctness, not the reference-look
  bar), but the final report must state clearly that the
  >=9 visual bar was NOT met.
- Playtests round-7 still running at log time; round-8
  follows if round-7 is clean.

## Playtest round-7, playtester B (iter-15 build, 320x180, Quality Low; completed 2026-10-30 16:51:40 UTC; NOT clean — 1 minor bug)

- STAY-CENTRE 60s survived, pistol, 1408, 408m, 40 kills,
  leaked 0, squadX 0 throughout — BUT one same-tier pistol
  boost at 52.5s (damageMult 1->1.25, rateMult 1->1.15,
  weapon stayed pistol). GO-LEFT 60s survived, squad 96,
  minigun (via wide-formation edge fire, spec), 1383.
  GO-RIGHT 90s survived, targeting-rifle (pistol->rocket
  @19s, minigun skipped, spawner offers any tier >=
  current ->targeting-rifle @30s), 5 max-tier boosts to
  2.25/1.75, 3077, 97 kills. AFK 84.5s died, pistol, no
  upgrades/boosts, leaked 1 (at death). JITTERY 60s
  survived, squad 18, minigun, max per-step travel 2.254
  (< 3.0 spring bound), no NaN/road exit. REGRESSION A
  god-mode 600s: gates 1-2 at all twenty 30s samples, max
  2, leaked 0 — leak fix HOLDS for 600s; alive-enemy
  count reached 133 by 600s (waves spawn faster than a
  centre pistol squad kills them; no crash/leak — a
  long-run observation, not a bug). REGRESSION B long
  centre: died 80-82s (2s granularity), pistol, no
  boosts/leaks — inside the spec casual 60-90s band.
  REGRESSION C panel first frame: PASS (exact match,
  freeze holds; the 0->1 drift happened between Start
  and pause engaging, not while paused).
- Fixes verified PASS: (a) formation clamp (per-tick max
  0.1 = MAX_LAT_SPEED x DT, growth tick 9->18 jump
  0.0008); (b) dying freeze (squadX exactly -0.0871 on
  all three dying samples, drift 0.0000); (c) no
  flash-box discs (clean screenshot at the 3->2 hit
  moment); (d) billboard streaks (thin vertical lines,
  no spoons/discs); (e) death roll horizontal, no ring
  (caveat: at 320x180 the 90-deg endpoint is not sharply
  resolvable, but reads lying, not squashed); (f) two
  rounded light-grey mounds with a gap (fine-step 0.1s
  shots; 0.5s shots miss the debris because it scrolls
  past in ~1s); (g) sun golden; (h) skyline row-2
  interleaved (caveat: subtle at 320x180); (i) puffy
  clouds. (j) hit pop NOT measured (the 0.12s window
  cannot be resolved at ~1.3s/frame headless, and no
  snapshot exposes enemy scale) — a measurement limit,
  NOT a bug.
- BUG (minor, intermittent — the reason round-7 is NOT
  clean for this playtester): centre-fire boulder EDGE
  CLIP grants a boost. Mechanism: the spawner can offer
  a pistol-tier boulder (any tier >= current, including
  equal), and a max-aim (+2-deg) bullet from the right
  slot (x 1.0) drifts ~1.05m over 30m to x ~2.05, inside
  the boulder box (inner edge 2.4 - 0.7 = 1.7), so centre
  fire can clip and break it. Severity: minor — the AFK
  run (84.5s) and the 600s god-mode centre run showed NO
  boost, and NO centre run ever upgraded weapon tier, so
  the weapon-upgrade part of the 2-deg fix HOLDS; only
  the no-boosts expectation is violated when tier + clip
  luck align. This is a design-intent leak (the iter-12
  "boulders require deliberate right-lane play" intent),
  NOT a spec-rule violation (the spec says boulders are
  "damaged by bullets" and "at 0 grant weapon" — it does
  not forbid centre fire from hitting them). Fix options
  (NOT yet chosen — awaiting the second playtester):
  AUTO_AIM 2-deg -> 1-deg (drift 0.52m over 30m, misses
  1.7 — but weakens centre coverage of edge enemies and
  needs re-validation), or log as a known minor issue.
  Narrowing the boulder box does NOT fix it (the visual
  dome is 0.551 half-width, so a box narrower than 1.7
  inner edge would let bullets pass through the visible
  dome).
- Balance (spec-consistent, not fix items): left snowball
  to 96 in 60s (spec x2 rule); left/jittery minigun via
  edge fire (spec spawner question); right-lane very
  strong (5 boosts to 2.25/1.75 by 90s — the spec max-tier
  boost working as designed); wall clamp smooth and
  monotonic (the 0.3-per-0.5s-step threshold is not met
  by spring travel on release, 0.894 — but that is
  velocity-limited travel, per-tick <= 0.1, not a
  teleport; the old fighting-clamp oscillation is gone).
- Perf: median 1296 ms, mean 1335 ms, max 3359 ms per
  0.5s advance (320x180 Low; contention-inflated — the
  second round-7 playtester ran concurrently). Zero
  console errors.
- Environment: two early suite attempts were killed by
  VM runtime restarts (which also wiped /tmp and stopped
  :3100); the playtester restored :3100 from the existing
  .next build with NO rebuild (next start -p 3100) and
  left it running. Final numbers come from a complete
  re-run; no final run was truncated. Playtester wrote
  nothing into the repo tree.
- ROUND-7 STATUS: NOT clean on this playtester (1 minor
  bug). The second round-7 playtester is still running;
  the fix-vs-flag decision for the edge-clip bug waits
  for its result.

## Playtest round-7, playtester A — ADDENDUM ONLY (full JSON did not arrive in the handoff; only this addendum, so A's clean verdict is NOT directly quotable)

- A visual-phase centre run (died at 973m, score 5098,
  165 kills) showed final snapshot leaked: 3, damageMult
  2.0, rateMult 1.6, weapon still pistol — whereas every
  listed strategy/regression run reported leaked: 0.
  Likely BENIGN (measurement artifact, not a gate leak):
  that snapshot was taken after a ~700ms LIVE (unpaused)
  window following dying detection, during which enemies
  walked past the already-dead squad; the paused-method
  game-over snapshots (long centre, AFK rerun, freeze
  probe) all showed leaked: 0 at the game-over moment.
  So `leaked` may count enemies passing a dead squad
  rather than mid-run leaks. Follow-up (if the parent
  wants it nailed down): one centre run snapshotting
  `leaked` immediately at gameOver (paused) vs after a
  short live window.
- Centre boosts are corroborated (NOT anomalous): this
  run AND the 600s god run both gained boosts while
  staying on pistol — consistent with playtester B's
  edge-clip mechanism.
- The only weapon anomaly: a FIRST AFK run's
  pistol->minigun upgrade, which the rerun did NOT
  reproduce. (Without A's full JSON the repro steps are
  unknown; the mechanism would be the same edge clip
  applied to a higher-tier boulder, but breaking a
  100-HP minigun boulder on 8-damage centre clips alone
  needs many lucky max-aim draws, so the instance is
  unreproduced and its setup is unverified.)

## Round-7 VERDICT: NOT clean (edge-clip confirmed by both playtesters for boosts; weapon-upgrade instance unreproduced) — FIX INVESTIGATION: NO CLEAN FIX, FLAGGED NOT FIXED

- Investigation (sim.ts + game.ts): bullets despawn at
  z < -95 (up to 95m range); boulders spawn at SPAWN_FAR
  -80. Bullet travel to meeting = 0.75 x initial distance
  (bullet 18 m/s + scroll 6 m/s closing). At AUTO_AIM 1
  deg, drift = 0.75D x tan(1 deg) = 0.0131D — for drift
  >= 0.7 (to reach the box inner edge 1.7 from x 1.0),
  need D >= 53.4m, and boulders spawn at 80m, so the clip
  SURVIVES at 1 deg for far boulders. Closing it via aim
  needs <= 0.67 deg (drift 0.7 over max 60m travel),
  which cuts centre coverage to +/-1.7 (edge enemies at
  1.7-2.0 uncovered) — a balance harm. A range cap would
  need < 20m travel (drift < 0.7 at 2 deg) — crippling
  long-range fire. Moving boulders right (2.4 -> 2.8)
  pushes the dome (half 0.551) past the road edge (3.0)
  AND still clips at far range (drift 2.09 over 60m
  reaches 3.09, inside 2.1..3.5). Narrowing the box below
  the visual width lets bullets pass through the visible
  dome. CONCLUSION: no fix closes the clip without
  harming balance or visuals. The clip is
  SPEC-COMPLIANT (spec: boulders "damaged by bullets",
  "at 0 grant weapon" — it does not forbid centre fire
  from hitting them); it violates only the iter-12
  design INTENT ("boulders require deliberate right-lane
  play"), and only intermittently (boost-only in the
  reproducible case). DECISION: logged as a known minor
  issue, NOT fixed. The "2 consecutive clean runs" bar
  is therefore NOT met — flagged in the final report
  alongside the visual bar. The game remains playable
  with all spec rules working and e2e green.
- Round-8 playtests are NOT spawned: with no fix to
  validate, a further round would re-measure the same
  known issue. The tag + push path proceeds with both
  flags (visual >=9 not met; 2 clean playtest runs not
  met).

## Iter-12 (FULL PLAN — implements after round-5 playtesters finish)

IMPLEMENTED 2026-10-30 (all items below + the round-5 additions).
Gates green on iter-12 code: tsc clean, eslint clean, vitest 26/26
(two boulder-grant tests re-staged from z -5 to -15 — the -5 setup
relied on seed-lucky aim draws under the old 4-degree cone; at -15
the squad is in position before the wall engages, so the tests
measure grant logic, not aim RNG). Wall test still passes (the
target clamp guides the squad clear with no snap and keeps targetX).

Scene: muzzle firing scale (4,4,6) -> (2,2,3); label fade full -30 /
0 -50 (gates + boulders); portrait pull-back boost 0.5 -> 0.8;
boulder label backing 0.55 -> 0.75 + label z 0.5 -> 0.85; label
near-fade (full z -3, 0 at z -0.5); hemisphere 1.05 -> 0.8, key
2.8 -> 3.0; sun disc warm tint + glow sprite 36 -> 55 + reposition
(-38,24,-120); horizon bank 2.5 -> 8 tall at y -8 + second wider
shorter row; cloud strips under both edges (x +/-7, y -2.5,
10 x 1.5 x 110, white) + sea colour -> white; sideDetail 14 @ 8;
camera z 3.0 -> 3.3; hero staging minus far crawlers (-35, -42).
Anim: robot arm z 0.35 -> 0.5, leg splay 0.25 -> 0.4, bob 0.25 ->
0.35, pitch -0.12 -> -0.2, kick 0.15 -> 0.2; golem leg 0.5 -> 0.7,
splay 0.2 -> 0.3, bob 0.14 -> 0.2, roll 0.10 -> 0.15, cadence 3 -> 4,
staging x 0.9 -> 2.0; debris scatter 1.2 -> 1.8, colour lighter,
demo boulders removed from break capture; tumble rotation 2.2 ->
1.2, scale 0.5 -> 0.7, sink 0.1 -> 0; bolt radius 0.12 -> 0.15, trail
0.9 -> 2.5 (centre z +1.55), opacity 0.6 -> 0.5; NEW ?anim=death
sequence + shoot-script 4th sequence.
Then: gates, rebuild + restart :3100, shoot16 (now 50 files),
personal verification, e2e, round-8 review (2 fresh reviewers).
Iteration count: iter-12 is the 12th fix iteration (cap 15).

## Round-5 playtester A (iter-10/11 build; 320x180, Quality Low)

NOT CLEAN — so round 5 does NOT count as clean run #1. Two clean
runs (round 6 + round 7, post-iter-12) are still required.
- GO-RIGHT (55.5 s, GAME OVER, squad 0, pistol, 1171, 371 m,
  32 kills): no weapon upgrade, but same-tier boosts to 1.5/1.30.
  A same-strategy probe survived 65 s+ with targeting-rifle
  1.75/1.45 — go-right outcomes are highly RNG-dependent.
- AFK (90 s, SURVIVED, squad 3, targeting-rifle, 3076, 651 m,
  97 kills): ZERO input yet pistol -> minigun (31.5 s) ->
  targeting-rifle (54 s) + 6 boosts to 2.5/1.90. The 4-degree
  auto-aim did NOT remove AFK progression this seed (round-4 AFK
  died at 60.5 s pistol-only; round-5 AFK thrived). Root cause:
  at 4 degrees, a bullet from the right robot (x 1.0) bends 2.1 m
  over 30 m and reaches x 3.1 — into the boulder lane (2.4) — so
  centre fire breaks boulders by RNG luck.
- JITTERY (60 s, SURVIVED, squad 3 -> 48, targeting-rifle, 1408,
  40 kills): sweeping both lanes doubled through gates 4x.
  SPEC-COMPLIANT, NOT A BUG: gate rule is ceil(count x N) capped
  at MAX_SQUAD 99, and a left-pinned player would hit even more
  gates than a sweeper. Exponential gate growth is a property of
  the spec's x2 rule, not a jittery exploit. Logged as a
  potential rule-change candidate (growth curve) for the user —
  NOT changed in iter-12 without confirmation.
- GATE-LEAK SPOT-CHECK (130 s, SURVIVED, squad 3,
  targeting-rifle, 6251, 1026 m, 209 kills): PASS — gates sampled
  1/2/1/1/2 (never growing, never past 10), boulders 0-1,
  enemies 2-14. Both boost caps reached (3.0/2.0) by 122 s.
- LOW 1: boulder wall push 0.31-0.77 per 0.5 s step during wall
  engagement (multi-step slide, NOT the old 1.1 snap). Cause:
  the push moves POSITION while the spring pulls back to the
  1.4 pin, so they fight and oscillate. Fix: apply the wall as a
  TARGET clamp (effectiveTargetX = min(targetX, boulder clear x)
  while a boulder is alongside) so the spring moves smoothly.
- LOW 2: same-tier boost granted to a dead squad (squad 0 at
  54.0 s, game over at 55.5 s). Fix: skip boulder grants when
  squad count is 0 (one-line guard).
- LOW 3: snapshot().leaked is undefined (sim tracks state.leaked
  but GameCanvas snapshot omits it). Fix: add the field.
- PERF: 823 ms per 0.5 s advance (contention-inflated: second
  SwiftShader process concurrently, load ~6; prior solo ~570 ms —
  NOT a regression). Zero console errors in all 4 strategies.
  Headless-SwiftShader only, never device fps.
- STILL RUNNING: round-5 playtester B. No code changes until B
  finishes.

## Iter-12 additions (from round-5 playtester A)

- AUTO_AIM 4 -> 2 degrees (DEVIATION from spec +-6, superseding
  the iter-9 4-degree step). Rationale: 2 degrees draws the line
  the road partitions intend — centre fire covers the enemy
  column (max |x| 2.0: a bullet from x 1.0 bends 1.05 m to 2.05)
  but cannot reach the boulder lane (2.4), so boulders require
  deliberate right-lane play and AFK/centre play cannot
  self-progress. Go-right play is unaffected (right robot at
  2.4 fires straight into boulders). This retires the
  "centre-fire boulder breaks are emergent" note — they were
  an artefact of the 4-degree cone blurring the partition line.
- Boulder wall as target clamp (see LOW 1 above).
- Skip boulder grants at squad 0 (LOW 2).
- snapshot().leaked field (LOW 3).

## Known issues carried to the final report

- (Fill in at the end: anything left unfixed, with severity.)
