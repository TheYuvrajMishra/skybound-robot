import { chromium } from "playwright";
import * as fs from "fs";
import * as path from "path";

// Holding verification shots: robot iso view with each weapon attached
// to handSocket (?view=iso&holding=<weapon>). Not part of the review
// rounds; used to verify weapons render in the hand before tagging.
const BASE = process.env.SHOOT_BASE || "http://localhost:3000";
const WEAPONS = ["pistol", "minigun", "rocket-launcher", "targeting-rifle"];

async function main() {
  const browser = await chromium.launch({
    args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--no-sandbox", "--disable-gpu-sandbox"],
  });
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  page.on("console", (m) => { if (m.type() === "error") console.error("[console.error]", m.text()); });
  page.on("pageerror", (e) => console.error("[pageerror]", String(e)));
  const dir = path.join("screenshots", "tmp", "holding");
  fs.mkdirSync(dir, { recursive: true });
  for (const w of WEAPONS) {
    const url = `${BASE}/models/robot?view=iso&holding=${w}&turntable=0`;
    await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
    try {
      await page.waitForFunction(() => (window as unknown as { __MODEL_READY__?: boolean }).__MODEL_READY__ === true, { timeout: 30000 });
    } catch { console.error(`READY timeout: holding ${w}`); }
    await page.waitForTimeout(500);
    const out = path.join(dir, `${w}.png`);
    await page.screenshot({ path: out });
    console.log(`holding ${w} -> ${out} (${fs.statSync(out).size} bytes)`);
  }
  await browser.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
