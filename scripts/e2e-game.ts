/** Playwright e2e for the Phase 2 game rules, driven through the live page.
 * Usage: E2E_BASE=http://localhost:3100 npx tsx scripts/e2e-game.ts
 * The prod server must already be running. Exits non-zero on any failure. */
import { chromium } from "playwright";

const BASE = process.env.E2E_BASE || "http://localhost:3100";
type Snap = { squad: number; weapon: string; score: number; distance: number; kills: number; gameOver: boolean; dying: boolean; enemies: number; gates: number; boulders: number; squadX: number };

async function waitFor(page: import("playwright").Page, pred: (s: Snap) => boolean, label: string, timeoutMs = 30000): Promise<Snap> {
  // Drive the sim with __advance: headless RAF is throttled (~1 fps), so
  // wall-clock waiting would run the game in slow motion (max 5 steps/frame).
  const start = Date.now();
  let last: Snap = await page.evaluate(() => (window as unknown as { __game: { snapshot: () => Snap } }).__game.snapshot());
  while (Date.now() - start < timeoutMs) {
    if (pred(last)) return last;
    await page.evaluate(() => (window as unknown as { __advance: (dt: number) => void }).__advance(0.25));
    last = await page.evaluate(() => (window as unknown as { __game: { snapshot: () => Snap } }).__game.snapshot());
  }
  throw new Error(`TIMEOUT waiting for: ${label} (last=${JSON.stringify(last)})`);
}

function check(cond: boolean, label: string): void {
  console.log(`${cond ? "PASS" : "FAIL"} ${label}`);
  if (!cond) throw new Error(`FAILED: ${label}`);
}

async function main(): Promise<void> {
  const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--no-sandbox", "--disable-gpu-sandbox"] });
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  const errors: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(String(e)));
  try {
    await page.goto(`${BASE}/`, { waitUntil: "networkidle", timeout: 60000 });
    await page.getByRole("button", { name: /start run/i }).click();
    await page.waitForTimeout(500);
    let s = await page.evaluate(() => (window as unknown as { __game: { snapshot: () => Snap } }).__game.snapshot());
    check(s.squad === 3 && s.weapon === "pistol", `start: squad 3 pistol (got ${s.squad} ${s.weapon})`);

    // Gate: steer left and spawn a live gate close by. (Demo gates are
    // decoration-only since the demo-flag fix and no longer multiply.)
    await page.evaluate(() => (window as unknown as { __game: { setTargetX: (x: number) => void } }).__game.setTargetX(-2.4));
    await page.evaluate(() => (window as unknown as { __game: { spawnGate: (m: number, z: number) => void } }).__game.spawnGate(2, -12));
    s = await waitFor(page, (x) => x.squad >= 6, "gate multiplies squad 3 -> >=6", 60000);
    check(s.squad >= 6, `gate multiply: squad ${s.squad}`);

    // Boulder (fresh run: a live wave in front of the boulder absorbs pistol
    // bullets, so the boulder assertion runs on a clean lane, still through
    // the real damage/grant path).
    await page.goto(`${BASE}/`, { waitUntil: "networkidle", timeout: 60000 });
    await page.getByRole("button", { name: /start run/i }).click();
    await page.waitForTimeout(500);
    await page.evaluate(() => (window as unknown as { __game: { setTargetX: (x: number) => void } }).__game.setTargetX(2.4));
    await page.evaluate(() => (window as unknown as { __game: { spawnBoulder: (t: string, hp: number, z: number) => void } }).__game.spawnBoulder("minigun", 5, -12));
    s = await waitFor(page, (x) => x.weapon !== "pistol", "boulder break grants a weapon", 60000);
    check(s.weapon === "minigun", `boulder grant: weapon ${s.weapon}`);

    // Lose: spawn a golem point-blank in the squad lane; it kills the whole squad.
    await page.evaluate(() => (window as unknown as { __game: { spawnEnemy: (k: string, x: number, z: number) => void } }).__game.spawnEnemy("golem", 2.4, -0.5));
    s = await waitFor(page, (x) => x.gameOver === true, "golem contact leads to game over", 20000);
    check(s.gameOver === true, "game over reached");
    await page.getByRole("button", { name: /play again/i }).click();
    await page.waitForTimeout(500);
    s = await page.evaluate(() => (window as unknown as { __game: { snapshot: () => Snap } }).__game.snapshot());
    check(s.squad === 3 && s.weapon === "pistol" && !s.gameOver, `restart resets (squad ${s.squad}, weapon ${s.weapon}, gameOver ${s.gameOver})`);

    check(errors.length === 0, `zero console errors (got ${errors.length}: ${errors.slice(0, 3).join(" | ")})`);
    console.log("E2E ALL PASS");
  } finally {
    await browser.close();
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
