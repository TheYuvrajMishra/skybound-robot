/** Deterministic game captures: ?shot=hero (landscape + portrait) and
 * ?anim=<name> frame sequences (12 frames via window.__advance).
 * Usage: SHOOT_BASE=http://localhost:3000 npx tsx scripts/shoot-game.ts
 * The dev/prod server must already be running. */
import { chromium } from "playwright";
import * as fs from "fs";
import * as path from "path";

const BASE = process.env.SHOOT_BASE || "http://localhost:3000";
const OUT = process.env.SHOOT_OUT || path.join("screenshots", "game");

async function shot(browser: import("playwright").Browser, url: string, out: string, w: number, h: number): Promise<void> {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  const errors: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
  try {
    await page.waitForFunction(() => (window as unknown as { __SHOT_READY__?: boolean }).__SHOT_READY__ === true, { timeout: 60000 });
  } catch { console.error(`READY timeout: ${url}`); }
  await page.waitForTimeout(500);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  await page.screenshot({ path: out });
  const size = fs.statSync(out).size;
  console.log(`${out} (${size} bytes) consoleErrors=${errors.length} ${errors.slice(0, 2).join(" | ")}`);
  if (size < 30000) console.error(`WARNING: small screenshot (possible blank): ${out}`);
  await page.close();
}

async function animFrames(browser: import("playwright").Browser, anim: string, outDir: string): Promise<void> {
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  page.on("console", (m) => { if (m.type() === "error") console.error("[anim console.error]", m.text()); });
  page.on("pageerror", (e) => console.error("[anim pageerror]", String(e)));
  await page.goto(`${BASE}/?anim=${anim}`, { waitUntil: "networkidle", timeout: 60000 });
  try {
    await page.waitForFunction(() => (window as unknown as { __SHOT_READY__?: boolean }).__SHOT_READY__ === true, { timeout: 60000 });
  } catch { console.error(`READY timeout anim ${anim}`); }
  fs.mkdirSync(outDir, { recursive: true });
  for (let f = 0; f < 12; f++) {
    // 0.25 s per frame = 3 s sequences (was 1/12 s = 1 s total, too short
    // for a boulder break or a golem walk to read).
    await page.evaluate(() => (window as unknown as { __advance?: (dt: number) => void }).__advance?.(0.25));
    await page.waitForTimeout(100);
    const out = path.join(outDir, `frame-${String(f).padStart(2, "0")}.png`);
    await page.screenshot({ path: out });
    console.log(`${out} (${fs.statSync(out).size} bytes)`);
  }
  await page.close();
}

async function main(): Promise<void> {
  const browser = await chromium.launch({
    args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--no-sandbox", "--disable-gpu-sandbox"],
  });
  try {
    await shot(browser, `${BASE}/?shot=hero`, path.join(OUT, "hero-landscape.png"), 1600, 900);
    await shot(browser, `${BASE}/?shot=hero`, path.join(OUT, "hero-portrait.png"), 900, 1600);
    for (const anim of ["robot-fire", "golem-walk", "boulder-break"]) {
      await animFrames(browser, anim, path.join(OUT, `anim-${anim}`));
    }
  } finally {
    await browser.close();
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
