# Model Log — Phase 1

## Deviations from the original spec (logged, not hidden)
- Repo: the user supplied the EXISTING repo https://github.com/TheYuvrajMishra/skybound-robot
  (verified EMPTY at root on 2026-10-30 after the user's own "Clear repo for scratch rebuild"
  delete commits). No new repo was created; the original private `skybound-robot-runway`
  name was NOT used. The reused repo is PUBLIC, not private.
- Do NOT restore the old trashed build (~/workspace/skybound-robot trash copy) — from-scratch rebuild.
- Sheet 07 file was originally uploaded as `weapon-plasma-rifle`; it IS subject 7 (targeting rifle).
- Push method: plain `git push` fails in this VM (no GitHub credentials). Pushes use the
  GitHub connector snapshot route per /opt/hatch/connectors/github/references/snapshot-push.md.
  Snapshot pushes carry file contents only — no local git history, branches, or tags.
  Local tags therefore exist locally; remote tag presence is verified separately and
  reported honestly (see "Tag status" below).
- Viewer: models are rendered via @react-three/fiber Canvas (dynamic import, ssr:false)
  with plain THREE.Group builders (pure, no React) so Phase 2 can reuse them directly.
- Push frequency deviation (decided during the build): per-commit snapshot pushes would
  spam one approval card per connector write call, so the plan is ONE consolidated
  connector snapshot push to main at the end, with all local commits preserved locally.
- Weapon orientation (from sheet inspection): minigun, rocket-launcher and targeting-rifle
  sheets present the weapon VERTICALLY in their front/back panels (minigun barrels up,
  launcher rear cap up / warhead cone down, rifle muzzle up), while the pistol front panel
  is horizontal. Builders therefore use: pistol along X (muzzle +X, rendering muzzle-left
  from the front camera at -Z); minigun/rocket-launcher/targeting-rifle along Y (muzzle +Y,
  except the launcher warhead points -Y). Viewer holding logic: pistol rotation.y = PI/2;
  vertical weapons rotation.x = -PI/2 so the muzzle points -Z when held.
- Road front/back framing: the sheet's front/back panels are ELEVATED views looking down
  the road (deck top + end face visible), not end-on views. The viewer keeps the elevated
  runway framing (camera above and behind the end, looking down the road); a pure end-on
  ortho fit collapsed the road to a 0.2%-pixel strip in iteration 1. Reviewers who asked
  for end-on views were overruled by the sheet itself; this choice is logged, not hidden.
- Road length vs reviewer proportion: reviewers asked for a wider road (~3x width); the
  spec's exact length 10 and width 2.0 win. Deck depth was set to 0.5 (25% of width, inside
  the reviewers' 18–35% range).
- Side-props subject definition vs sheet: the spec lists banner pole + railing post + rubble
  as separate items, but sheet 11 shows a SINGLE banner-pole assembly (pole + crossbar +
  pennant + rocks clustered at the base). The builder was restructured to that single
  assembly; the "railing" reads as the crossbar and the "rubble" as the base rock cluster.
  No spec item was silently dropped — the mapping is recorded here.
- Sky-props layout: the sheet stacks the composition vertically (spire on top, railed
  platform middle, rock-mound/cloud below, with floating gaps). The builder was rebuilt
  stacked on one vertical axis; the earlier side-by-side layout was discarded.
- Reviewer claims verified as misreads (checked against the sheets, not blindly applied):
  (a) pistol "floating spike below the slide" in sheet.png was the trigger-guard/grip-strip
  seen in the composite close panel, not detached geometry; (b) rocket-launcher/minigun
  "duplicated geometry" in sheet.png was the composite's panel boundaries, not model
  duplication; (c) several front/back proportion claims that contradict the actual sheet
  (e.g. road width) were resolved in favour of the sheet + spec and logged above.
- Screenshot determinism: fixed 1600x900 viewport, wait for networkidle +
  window.__MODEL_READY__ (set after 2 animation frames), 500ms settle. Non-background
  pixel check (>2% vs #d9d9d9, tolerance 8) run on every shot batch; all final batches pass.

## Iterations summary (local commits, main branch)
- Iter 1: v1 all 13 subjects (dev-server shots, Next.js dev badge visible).
- Iter 2: gap/glow/framing fixes; reviewed by 26 reviewers — all fail (scores 1–3).
- Iter 3 (+3b): full remodel per reviewer P1/P2 items (chibi robot, spiked crawler dome,
  boulder golem head, vertical weapons, NoToneMapping viewer, tapered gate, finned rockets,
  seated spire crystal); robot/minigun gap fixes in 3b.
- Iter 4: final fix round — gate (tapered posts, plinths, brackets, chevron strips, blank
  glass), boulder (lumpy body, inset blank panel, cyan cracks, touching pebbles), road
  (deep deck, 10 plates, X-brace ends, dome + skirt, 3-tube rails with caps), side-props
  (single assembly, pointed pennant, hollow-diamond emblem, full-length strip, base rocks),
  sky-props (stacked axis, crown + pyramid + ringed crystal, 12-post platform, 11-puff
  cloud), projectiles (segmented rockets, jagged fireball, coreless starburst), rifle
  rebuild (7:1 body, pronged muzzle, large side scope, thumbhole stock), pistol (short
  barrels, 10 ribs, 68-degree grip rake), minigun/launcher details, robot/crawler/golem nits.
- Iter 4b: side-props emblem edge angles, sky-props strip spread + ladder on shaft,
  road close-anchor reposition, rifle strip/muzzle joins.
- Iter 4c/4d: road close-anchor height then lateral offset (final: 1.45, 0.6, -3.0) so the
  close view reads as a rail-detail view instead of a near-field obstruction.
- Final shot sets for confirmation review: iter-5 for robot, crawler, golem, pistol,
  minigun, rocket-launcher, gate, boulder, projectiles; iter-6 for targeting-rifle,
  side-props, sky-props; iter-8 for road (incl. tiled.png seam check).
- Confirmation review: 26 fresh reviewers, all fail (scores 2–5.5; side-props highest
  at 5.5/4.5). Pass bar (both pass, score >= 9, zero P1 changes) met by NO subject.
- Iter 5 (viewer + palette + all 13 builders): per-axis ortho fit fixing the portrait
  panel-cropping bug (front/back: fitH = max(sz.y, sz.x/aspect) x 1.10; iso/tiled:
  diagonal-projection fit; road runway fit) + width-aware close-camera distance;
  global palette lightening (dark greys stopped reading near-black); robot chibi
  re-proportion (helmet 1.20x torso, legs 0.35, faceted chest + full circular core,
  forward ear discs, single-cylinder blaster at the hand); crawler faceted dome +
  17 sunk spikes + diagonal femurs + proud eyes/brows + protruding abdomen with
  surface-mounted spine plates; golem raised angular head + lower-face jaw cluster
  seated on the head ellipsoid + surface-following lava + plate/ring/lattice on the
  torso rear surface; pistol restored 0.12 barrel protrusion + closed guard +
  grip-local underside strip (fixes the floating model-space slit bug); minigun
  6-barrel bundle at ring 0.11 + flush hub + wide loop handle; rocket-launcher
  arms RESTORED (iter-4 arm loop never called g.add(arm) — root cause of the
  "missing arms" reviews) + wide mid-body + broad fins + warhead close anchor;
  rifle 9:1 body + long scope + pronged muzzle + on-axis thumbhole stock; gate
  flared base + flush cap + narrow strips + zigzags + circuit traces + thin pale
  glass edge (back panel deleted); boulder inset panel + rim chunks bridging the
  panel/body gap + surface cracks + touching pebbles; road 0.78-deep assembly +
  3-tube sides + boxed X-brace ends + continuous stripes + vent clamp; side-props
  octagonal pole/crossbar + draped triangulated banner + geometrically correct
  diamond emblem (prior edge signs formed a bowtie) + wide glow strip; sky-props
  widened shaft + crown windows + ringed elongated crystal + claws clearing the
  crystal + connected under-trusses; projectiles wider rockets + triangular fins +
  continuous grey flame + 20-spike fireball + solid-core starburst.
  Attachment audit: every face part checked against its body's ellipsoid/surface
  so parts straddle (not float in front of) their mounting surface; fixed floats:
  crawler brows/eyes/cheeks/gem/jaw/fangs/glow/horns/spine plates, golem jaw
  rocks/pebbles/cracks/plate/ring/lattice, sky collar strips/hook arms/windows,
  road vent dot, gate glass edges, boulder rim/cracks.
  Triangle counts (measured, all within soft caps): robot 1776/2500, crawler
  1464/1500, golem 2464/3000, pistol 676/1200, minigun 1168/1200 (barrel block
  6->5 segments + hub 8->6 to get under the cap), rocket-launcher 1124/1200,
  targeting-rifle 976/1200, gate 580/600, boulder 696/1000, road 1388/1500,
  side-props 736/800, sky-props 1464/1500, projectiles per item: rocketCyan
  260/400, fireball 316/400, burst 388/400 (debris 15->12 for the cap),
  rocketGrey 260/400. Note: the projectiles GROUP total (1224) is not the cap;
  the cap applies per VFX item.
- Arbitrations (iter 5): crawler keeps 6 legs (sheet front/back each show 3 per
  side; "8 legs" double-counts overlap); gate pillar width kept (reviewers
  bracket it; sheet pylon:total ratio ~1:7 matches the builder's 1:7.2); road
  length:width stays the spec's exact 10x2.0 (5:1) over reviewers' ~3:1;
  projectiles fin span arbitrated to 0.57x body width (reviewers: 0.35x vs
  0.85x); starburst blades arbitrated to 0.45 long / 0.375 tip radius
  (reviewers: 1.50x core radius vs 2.5x core diameter); side-props emblem
  tail keeps a tapered point (fork prongs omitted for the triangle budget).

## Iteration 9 review round (shots of the iter-5 code, re-shot as iter 9)
- 26 fresh reviewers, all verdict fail, none meeting the pass bar
  (both pass + score >= 9 + zero priority-1 changes). Scores: robot 3.0,
  3.0; crawler 3.5, 3.5; golem 3.5, 3.5; pistol 3.5, 3.5; minigun 3.5, 4.0;
  rocket-launcher 3.0, 3.0; targeting-rifle 3.0, 3.0; gate 3.0, 3.0;
  boulder 4.0, 3.5; road 2.5, 3.0; side-props 4.0, 4.0; sky-props 4.0,
  4.0; projectiles 3.0, 3.0. Scores are flat vs the confirmation round
  (2-5.5): the harsh-review-vs-procedural-primitives gap is not closing
  with detail additions alone.
- VERIFIED defects (confirmed by viewing the iter-9 shots, not just
  reviewer claims): road end-frame X-braces were 2.15 long at 0.37 rad,
  so they stuck ~0.6 above/below the frame and read as antennae/V-sticks
  at both ends; road side assemblies sat 0.20 out from the deck edge,
  leaving a full-length light-grey gap; boulder rim chunks sat 0.08 proud
  of the surface and read as a stud/bolt ring; boulder pebbles sat clear
  of the body silhouette with a visible gap; robot ear cyan discs fully
  covered the blue discs in front view; crawler front/back leg feet fell
  INSIDE the body silhouette in front view (only the mid leg read).
- Reviewer claims NOT followed (checked against the sheets/code):
  gate glass width kept (confirmation round asked for the wider glass;
  iter-9 asked for 50% — the two rounds bracket the current 0.95);
  rocket-launcher mid-body width kept (confirmation asked to widen to
  1.9x upper barrel; iter-9 asked to narrow to 42% of arm span);
  side-props banner length kept (rounds disagree: 0.62-0.67 vs 0.63 of
  pole height — the current 1.30/1.80 = 0.72 is already long).

## Iteration 6 (commits c169727, a6d4c5d, 126dc9a, c037ede)
- Viewer: fill light 0.7 -> 0.9 (many models read near-black in shadow);
  closeDir support in ModelCanvas: a builder may set userData.closeDir
  (a direction vector) and the close camera uses it instead of -Z.
- Robot: oval visor (grey rim oval + cyan oval + pale centre, replacing
  the rectangular slab); ear rims are now thin cyan TORUS rings so the
  blue disc shows; chest strip deleted; thigh raised to overlap the hip
  plate (torso-to-leg gap closed); elbows bend via forearm pivots
  (rz = side x -0.35); back-head vent slots replaced by bolt plates +
  one small vent; blaster rebuilt chunky (box body + cylinder barrel +
  cyan tip ring) at (0.31, 0.26); handSocket moved to match.
- Crawler: leg reaches enlarged (front/back 0.30/0.32 -> 0.45, mid
  0.42 -> 0.50) and pivots moved out to x +/-0.24 so all 6 feet clear
  the body silhouette in front view; femurs thinned to 0.045; spikes
  enlarged (r 0.055 -> 0.07, lengths +0.06); eyes r 0.07 -> 0.085; horns
  r 0.06 -> 0.075, length 0.18 -> 0.24; brow slabs thickened to 0.07.
- Golem: arms angled outward (rz = side x 0.25) so fists clear the torso
  silhouette; pelvis narrowed 0.44 -> 0.30; back lava ring rebuilt as a
  continuous hexagon (segments 0.19 long, tangent orientation); chest
  Y-crack rebuilt as two overlapping stem segments with branches
  starting on the stem; brow plates enlarged to 0.20 x 0.08; eyes
  enlarged and moved to z -0.185; snout integrated (z -0.17, sy 0.9);
  toe rocks added; two upper torso boulders added for segmentation.
- Pistol: grip straightened (rz 0.38 -> 0.22, ~78 deg) and widened to
  0.13; sights seated at y 0.20; silver muzzle rim added; lower barrel
  fattened to r 0.055 with a larger octagonal cap; hex bolt moved beside
  (not on top of) the honeycomb diamond.
- Minigun: barrel block 5 -> 4 segments (tri-neutral) funding new silver
  muzzle rim rings per barrel; dark star spokes replaced by a white-blue
  core disc; close-up reframed on the muzzle face (closeAnchor
  (0, 0.63, 0), closeDir [0.35, 1.0, -0.5]) — the +Y muzzle face was
  edge-on from the default -Z close camera.
- Rocket-launcher: cone widened to r 0.14; fins moved to 45-degree
  diagonals (two fins read per side in front view) and enlarged;
  hex ports enlarged (front 0.045, 5 x 0.028 around the cone); long
  vertical cyan strips added on the lower barrel front, with z values
  following the barrel surface.
- Targeting-rifle: octagonal cyan lens face added on the scope front +
  side knob; muzzle prongs 5 -> 8; trigger guard enlarged; thumbhole
  rebuilt as a TRIANGLE (top bar + two diagonals meeting at a point);
  side panels/strips narrowed.
- Gate: base widened (sx 0.24, bottom 0.39 = 1.9x shaft width); back-face
  zigzag strips deleted (they read as floating diagonal slashes).
- Boulder: base slab added (squashed icosahedron hiding the bottom point
  vertex); panel shrunk to 0.44 x 0.26 and set deeper (z -0.385); rim
  replaced by 5 large lumps barely proud of the surface (surfZ - 0.01);
  top-centre bump deleted; pebbles repositioned tucked under the base
  so their tops overlap the body's lower silhouette.
- Road: X-braces corrected to 1.94 long at +/-1.245 rad (fully enclosed
  in the end frame); side tubes moved to x +/-1.08 and skirts/clamps to
  +/-1.02 so the assembly is flush with the deck edge.
- Side-props: pole thickened (r 0.085/0.09), crossbar r 0.08, top collar
  r 0.16, base plate 0.44 wide; finial rebuilt as a ROUNDED sphere dome
  (6x4 segments, sy 0.85) instead of a pointed icosahedron; glow strip
  segmented at the collars (3 segments per face, white core front face
  only for the tri budget); emblem slimmed to ~0.36 tall with thinner
  strokes; rocks flattened (sy 0.7); 2 smallest pebbles trimmed.
- Sky-props: platform raised to y 1.35 and spire to y 1.90 (air gaps
  ~0.34/0.40 instead of ~0.09/0.30); shaft widened (sx 0.30, sz 0.24);
  cap widened/taller (sx 0.38, height 0.30); crystal r 0.24, ring r 0.27,
  claws rescaled to match; closeAnchor moved to (0, 4.85, -0.3).
- Projectiles: cyan nose rebuilt as a single faceted ogive hemisphere
  (sy 1.9); cyan flame attached to the nozzle (y -0.16) + 5 sparkle dots,
  halo disc deleted; grey nose as ogive hemisphere (sy 1.7); grey
  exhaust rebuilt as 8 decreasing faceted chunks; fireball spikes
  enlarged (r 0.06, length 0.26) and reduced 20 -> 16; starburst blades
  8 -> 12 (6 cyan left, 6 orange-red right), wider (sx 0.07), debris
  trimmed 12 -> 6 to stay under the cap.
- Triangle counts (iter 6, all within soft caps; projectiles per item):
  robot 2008/2500, crawler 1464/1500, golem 2704/3000, pistol 708/1200,
  minigun 1176/1200, rocket-launcher 1176/1200, targeting-rifle
  1044/1200, gate 532/600, boulder 664/1000, road 1388/1500,
  side-props 796/800, sky-props 1464/1500, rocketCyan 268/400,
  fireball 284/400, burst 332/400, rocketGrey 244/400.

## Iteration 6b fixes (after iter-10 shots were first taken, before review)
- Robot visor oval height: the first iter-6 attempt used local sy for
  the oval height and rendered a full circle; fixed by using local sz
  (part() scale applies in local space before rotation, and the visor
  cylinders are rotated rx=pi/2, so local Z becomes world height).
  Blaster moved from (0.31, 0.26) to (0.27, 0.25, -0.04) so it overlaps
  the bent right fist instead of floating beside it; handSocket moved
  to match. Iter-10 shots for robot were re-shot after this fix.
- Boulder: the iter-6 full-width base slab was REPLACED by a small
  central bottom mound (ico r 0.16, scaled (1.2, 0.5, 1.0), y 0.06)
  after the slab read in the iter-10 front shot as the full-width flat
  base wedge that iter 5 had explicitly deleted. Iter-10 shots for
  boulder were re-shot after this fix. Tri-neutral by construction
  (same geometry counts, moved positions); not re-measured at 6b.

## Holding verification (iter 6, scripts/shoot-holding.ts)
- /models/robot?view=iso&holding=<weapon> screenshot-verified for all
  4 weapons: pistol gripped in the hand with barrels forward, minigun
  gripped with barrels forward and loop handle visible. The minigun is
  large relative to the robot (gripSocket (0, -0.08) attaches at
  handSocket; the gun's bulk extends below/behind) — acceptable for a
  held heavy weapon; Phase 2 can adjust offset via gripSocket. Shots in
  git-ignored screenshots/tmp/holding/.

## Iteration 10 review round (iter-10 shots, 26 fresh reviewers)
- Scores (both reviewers per subject, ALL verdict fail, none meeting
  the pass bar of both pass + score >= 9 + zero priority-1 changes):
  robot 5.5, 5.5; crawler 5.0, 4.0; golem 4.5, 4.5; pistol 5.0, 4.5;
  minigun 4.0, 4.0; rocket-launcher 3.8, 4.0; targeting-rifle 3.5, 3.5;
  gate 5.0, 4.0; boulder 5.0, 5.5; road 4.0, 4.0; side-props 6.0, 6.0;
  sky-props 4.5, 4.0; projectiles 5.0, 5.0.
- Trajectory: round 1 (iter-2 shots) 1-3 -> confirmation round 2-5.5 ->
  iter 9: 2.5-4.0 -> iter 10: 3.5-6.0. Iter 6's verified fixes lifted
  scores ~+1 to +2 over iter 9, but the gap to the pass bar remains
  structural: reviewers compare procedural low-poly primitives against
  richly detailed sheet renders.
- Verified by viewing the iter-10 shots (not just reviewer claims):
  rocket-launcher warhead genuinely reads as two flat orange slabs —
  the 0.20-tall diagonal fins are as tall as the 0.17 cone and occlude
  it, leaving only a small tip visible (drives the iter-7 warhead
  rebuild); road close view is nearly empty because the close camera
  approaches along the road length instead of perpendicular to the
  side assembly (drives the iter-7 road closeDir); side-props front is
  actually strong (emblem well-sized, finial a faceted dome).
- Misread/conflict classes arbitrated (not blindly applied):
  (a) rocket warhead "flat block" — the code HAS a faceted cone; the
  fins occlude it (see verified note above); (b) minigun barrels
  "square posts with no bores" — barrels ARE 4-segment cylinders with
  hollow bore discs and rim rings; 4 segments read as square in ortho
  (iter 7 raises them to 5 segments, paid for by deleting the rims);
  (c) gate "T-lines on the glass" — those are the circuit traces near
  the panel's inner edges, kept deliberately since iter 5; the glass
  face itself is blank; (d) rifle scope "lens faces the camera" — the
  scope axis IS parallel to the barrel (+Y); the iter-6 front lens
  face disc is what reads as a camera-facing lens, so iter 7 deletes
  it and keeps the top lens; (e) road "single flat slab with one flat
  cyan strip" — the 3-tube side assemblies exist but read edge-on in
  the elevated runway view, and the deck diagonal seams read as
  "diagonal rods floating across the deck" (iter 7 deletes the diagonal
  seams); (f) side-props glow "differs front vs back" — TRUE and
  self-inflicted: iter 6 trimmed the white core to the front face only
  for the tri budget, so the back genuinely lacks it (iter 7 restores
  it, paid for by segment/cloth/rock trims); (g) golem "hip plank" —
  that is the pelvis box, deleted in iter 7; (h) crawler jaw widening
  to 0.24 rejected: the jaw box corners would float off the curving
  head mass (surface falls back to z -0.212 at x +/-0.12 vs jaw back
  -0.24); upper fangs added instead; (i) sky-props side strips at
  x +/-0.19 were INSIDE the shaft (half-width 0.212) and invisible,
  front strips at z -0.16 were flush with the surface — both moved
  proud in iter 7; (j) golem back ring at radius 0.16 would be buried
  at the old z 0.265 (torso rear surface 0.274-0.278 there), so iter 7
  moves it to z 0.28.

## Iteration 7 changes (commits 6dd488d, 62ca634, a4e0c59)
- This is the LAST planned code iteration. Whatever the iter-11 review
  round returns, subjects will be tagged approved (if they pass) or
  p1-<subject>-needs-review with remaining diffs logged — no further
  iteration rounds are planned, because four review rounds show the
  remaining gap is structural to the procedural-primitive approach,
  not closable by another tweak round.
- Robot: visor widened (rim sx 1.25, cyan sx 1.15, centre sx 1.2);
  ear discs r 0.073 -> 0.065 with thinner torus rims (0.068, tube
  0.005); hip plate sx 0.21 -> 0.18 and waist ring 0.30 -> 0.26 (no
  waist shelf); blaster body depth 0.20 -> 0.26, barrel/cap/muzzle
  moved to match; knee caps r 0.06 -> 0.07 in light material.
- Crawler: leg reaches 0.45/0.50/0.45 -> 0.38/0.42/0.38 with shallower
  angles 0.65/0.35/0.52 -> 0.45/0.25/0.38 (knees visibly above ground,
  real vertical tibias, span ~2.2x body); brow slabs to rock material
  at rz side x 0.5; eye glow #FF5A00 -> #FF6A00; head mass pushed
  forward (z -0.15 -> -0.18); 2 upper fangs added.
- Golem: pelvis box deleted; chest lava rebuilt as ONE connected
  diagonal polyline fissure (surface-following z) + 2 branches;
  side pebbles moved inward (x +/-0.26, z -0.17); jaw rows enlarged
  (upper 0.06, mid 0.05, chin 0.055); eyes r 0.06 -> 0.045, scale
  (1.25, 0.6, 0.3), z -0.18; brow boxes 0.20 x 0.09 x 0.13 at z -0.18;
  back plate r 0.17 -> 0.14, ring radius 0.19 -> 0.16 at z 0.28.
- Pistol: grip side panels added (2 dark boxes, breaks the slab read).
- Minigun: barrel block 4 -> 5 segments, muzzle rim rings deleted
  (tri-neutral); loop handle legs 0.05 -> 0.065 wide.
- Rocket-launcher: cone r 0.14 -> 0.16, length 0.17 -> 0.24; fins
  shrunk to 0.12 x 0.12 at radius 0.13; hex ring ports moved to radius
  0.10 (follows the fatter cone).
- Targeting-rifle: front lens face disc deleted (kept the top lens);
  muzzle prongs radius 0.06 -> 0.05, size 0.022 -> 0.02; thumbhole
  stock rebuilt as a REAL frame (top block + bottom block + 2 side
  posts, genuine through-hole; vents 4 -> 2).
- Gate: front zigzag strips deleted (both iter-10 reviewers agreed).
- Boulder: cracks rebuilt as connected polylines with shared joints
  starting at the panel border; 4 rock shards overlapping the panel
  corners; bumps and rim lumps flattened (sy 0.6), rim repositioned
  asymmetrically.
- Road: diagonal seams deleted; closeDir [1, 0.25, -0.5] added so the
  close view looks at the side assembly perpendicularly instead of
  down the road length.
- Side-props: crossbar end knob replaced by a flat box cap; finial
  sy 0.85 -> 1.1 (taller dome); white glow core restored on BOTH faces;
  pole/crossbar/ring 8 -> 6 segments, cloth rows 4 -> 3, 2 smallest
  rocks removed (pays for the core); banner lightened to #3570BE.
- Sky-props: front strips z -0.16 -> -0.175, side strips x +/-0.19 ->
  +/-0.215, collar strips z -0.15 -> -0.175, crown windows/ribs
  z -0.235 -> -0.24, back blade/strips z 0.16 -> 0.175, back rib
  strip/notch z 0.25 -> 0.26; ring r 0.27 -> 0.29, tube 0.03 -> 0.04,
  claws rescaled x1.21; platform deck 0.30 -> 0.24 thick with posts,
  rails, under-panels, end blocks and trusses moved to stay touching.
- Projectiles: rocket bodies widened to 0.25 (segments, noses, nozzle
  rings, fins resized to match); cyan flame rebuilt as a frustum with
  a wide flat top AT the nozzle (old pointed octahedron read as a
  detached diamond; the white inner core was fully inside the opaque
  flame and never visible, so it is deleted); grey exhaust chunks get
  alternating x offsets + rotations (irregular, not beaded); fireball
  spikes varied (lengths 0.20-0.32, radii 0.05-0.07); starburst core
  shrunk to r 0.05 with 6 chunk octahedra around it; both rockets'
  back panels deleted.
- Triangle counts (iter 7, all within soft caps; projectiles per item):
  robot 2008/2500, crawler 1480/1500, golem 2668/3000, pistol 732/1200,
  minigun 1176/1200, rocket-launcher 1176/1200, targeting-rifle
  984/1200, gate 484/600, boulder 724/1000, road 1340/1500,
  side-props 772/800, sky-props 1464/1500, rocketCyan 256/400,
  fireball 284/400, burst 380/400, rocketGrey 232/400.

## Iteration 11 review round (FINAL round, iter-11 shots, 26 fresh reviewers)
- Scores (both reviewers per subject, ALL verdict fail, none meeting
  the pass bar of both pass + score >= 9 + zero priority-1 changes):
  robot 4.5, 4.5; crawler 4.5, 4.5; golem 5.0, 5.0; pistol 4.0, 4.0;
  minigun 5.0, 5.0; rocket-launcher 4.0, 5.2; targeting-rifle 3.0, 3.5;
  gate 5.0, 5.5; boulder 5.5, 5.0; road 4.0, 4.5; side-props 5.5, 5.5;
  sky-props 5.0, 5.0; projectiles 5.5, 5.0.
- Trajectory iter 10 -> iter 11 is FLAT overall (some subjects up:
  golem 4.5 -> 5.0, minigun 4.0 -> 5.0, sky-props 4.5/4.0 -> 5.0; some
  down: robot 5.5 -> 4.5, pistol 5.0/4.5 -> 4.0, side-props 6.0 ->
  5.5; rest within 0.5). Four review rounds now show the remaining
  gap is structural to the procedural-primitive approach, not closable
  by another tweak round, so per the decision recorded under iter 7,
  NO further iteration round is run. All 13 subjects are tagged
  p1-<subject>-needs-review at the final commit, with remaining diffs
  below; v0.1-models tags the same commit as the Phase 1 model set
  (needs-review set, NOT an approved set). docs/approved/ stays EMPTY
  because no subject passed; the final iter-11 shots remain in the
  git-ignored screenshots/tmp/<subject>/iter-11/ directories.
- Remaining diffs per subject (condensed from the iter-11 P1 items;
  full JSONs were extracted to the coordinator's /tmp/reviews11/):
  robot: torso reads as a flat rectangular box, not a tapered
  octagonal plate; legs/feet read as slabs, not short chibi limbs;
  visor reads as a thin flat oval, not a tall trapezoid; arms read as
  straight with no elbows; blaster reads as a wrist block in front
  view (its length only shows in iso).
  crawler: legs read as merged wedges with only 2 shins per side in
  ortho and no visible knee joints; rear abdomen does not read as a
  separate segment in front/back views (it is rear-only geometry);
  horns read too small/thin; eyes read too small, flat and yellow;
  jaw reads as a flat plate with tiny teeth, not an open glowing jaw.
  golem: chest lava reads as a single thin straight diagonal stick
  with one branch (the polyline segments are too thin to read as a
  branching vein network); brow reads as flat slabs hiding the eyes;
  back lava reads as a symmetric radial sunburst, not an irregular
  ring; limbs read as smooth balls, not rock; fists read as flat
  slabs with pebbles only on the front edge.
  pistol: slide reads as a flat slab with no taper/nose chamfer/
  stepped rear; honeycomb panel reads as an invented solid black
  diamond; top strip reads as a flat hairline, not a raised ribbed
  ridge; barrels read barely protruding with square flat ends.
  minigun: barrel cluster reads as two spaced pillars with a hollow
  centre gap (side profile hides the middle barrels); back side-pod
  horizontal stripes read as missing; some cyan details read as
  floating fragments below the pods; muzzle-face centre reads as a
  thin washer, not a large filled starburst.
  rocket-launcher: cone still reads too small/dark/smooth with fins
  as rectangular slabs, not swept triangular fins; side pods read as
  hanging vertically without angled struts; upper body reads as a
  wide flat box, not a tapered faceted cylinder; grip reads as a
  solid block on the wrong side in front view.
  targeting-rifle: frame stock reads as a hollow rectangle with a
  tilted slab, not a diagonal thumbhole stock with solid butt;
  muzzle reads as 4 tall thin tines with no shroud/glowing core;
  body reads as a uniform thin flat slab; scope reads as a thin
  near-black cylinder with no bulbs/knobs/faceting.
  gate: pillars read as plain flat slabs with flat tops, no
  chamfer/shoulder/stepped base; brackets read as thin bars with dark
  cubes, not tapered wedge arms with hinge bosses; close-up pillar
  face reads blank; glass traces read as single straight lines with
  T-feet, not branching networks with nodes.
  boulder: panel corner shards read as flat grey slabs covering the
  corners (the iter-7 shard fix backfired in perception); panel
  reads as a sharp protruding rectangle; cracks still read as
  straight detached bars, not a branching network; base rocks read
  oversized (largest 21% of boulder width).
  road: side assemblies read as flat rails, not stacked cylindrical
  tubes (roundness is invisible in the elevated runway view); end
  faces read as solid slabs with no visible X-brace or glowing tube
  ends (the truss only shows end-on, which the runway framing does
  not give); end-corner cyan blobs read as jagged; deck stripes read
  too wide and broken by notches.
  side-props: crossarm reads as a flat box beam, not a faceted
  cylindrical rod; finial still reads as an oversized ball (~210-220%
  of pole width) sitting on a square block; banner reads as a flat
  rigid board with a short wide V tip; emblem reads too small (~22%
  of banner length); base rocks read as 4-5 dark pyramids, not 8-10
  irregular mid-grey boulders.
  sky-props: crown reads collapsed (2 tiers, missing windowed middle
  tier/ladder/side arms); crystal ring reads as missing (the thin
  cyan torus blends into the cyan crystal) and claws read as straight
  struts; shaft reads as a thin flat slab, half the sheet width;
  cap reads as a low flat pyramid; platform underside reads as thin
  V-struts, not deep trapezoidal supports with beam and panels.
  projectiles: starburst reads as a thin flat pinwheel with a white
  hole centre; fireball reads as a near-perfect sphere with short
  uniform spikes; cyan flame reads as a long detached flat cone with
  no core; grey flame reads as a detached diamond chain; rocket fins
  read oversized (grey ~190% of body width) and noses blunt.
- Structural note (applies to most subjects): reviewers repeatedly
  read cylinders and 4-sided frustums in side profile as "flat slabs
  / rectangular boxes", because a cylinder seen from the side IS a
  rectangle in projection. Closing that gap would need a different
  modelling approach (e.g. bevelled/rounded profiles, denser facet
  counts, or baked shading cues) and larger triangle budgets — out of
  scope for this Phase 1 primitive-based pass.

## Conventions
- Y up, faces -Z (weapons: muzzle +X so the front camera shows the sheet profile),
  origin at base-centre/feet, robot height = 1.0 unit.
- Low-poly: MeshStandardMaterial flatShading, roughness 0.6–0.9, glow via emissive.
- Gate glass and boulder face are BLANK (no text/icon/number); `glass` mesh and
  `faceAnchor` exposed for Phase 2. Weapons expose `gripSocket`; robot exposes `handSocket`.
- Road tile: exact length 10 along Z, verified with ?view=tiled.

## Tag status
- (Filled in as approvals land; local tags are listed with commit hashes in docs/CHANGELOG.md.
  Remote tag verification is done via the GitHub connector list_tags/get_tag calls.)

## Per-subject notes
- (Filled in per approval: iterations, final scores, tri counts, remaining diffs.)
