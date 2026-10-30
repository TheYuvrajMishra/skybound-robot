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

## Known issues carried to the final report

- (Fill in at the end: anything left unfixed, with severity.)
