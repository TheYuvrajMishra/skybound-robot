import { chromium } from "playwright";
import * as fs from "fs";
import * as path from "path";

const BASE = process.env.SHOOT_BASE || "http://localhost:3000";
const SUBJECTS = (process.env.SHOOT_SUBJECTS || "").split(",").filter(Boolean);
const ITER = process.env.SHOOT_ITER || "1";
const VIEWS = (process.env.SHOOT_VIEWS || "front,back,close,sheet,iso").split(",");

const ALL = ["robot", "crawler", "golem", "pistol", "minigun", "rocket-launcher", "targeting-rifle", "gate", "boulder", "road", "side-props", "sky-props", "projectiles"];

async function main() {
  const subjects = SUBJECTS.length ? SUBJECTS : ALL;
  const browser = await chromium.launch({
    args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--no-sandbox", "--disable-gpu-sandbox"],
  });
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
  page.on("console", (m) => { if (m.type() === "error") console.error("[console.error]", m.text()); });
  page.on("pageerror", (e) => console.error("[pageerror]", String(e)));
  for (const id of subjects) {
    for (const view of VIEWS) {
      const dir = path.join("screenshots", "tmp", id, `iter-${ITER}`);
      fs.mkdirSync(dir, { recursive: true });
      const url = `${BASE}/models/${id}?view=${view}&turntable=0`;
      await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
      try {
        await page.waitForFunction(() => (window as unknown as { __MODEL_READY__?: boolean }).__MODEL_READY__ === true, { timeout: 30000 });
      } catch { console.error(`READY timeout: ${id} ${view}`); }
      await page.waitForTimeout(500);
      const out = path.join(dir, `${view}.png`);
      await page.screenshot({ path: out });
      const size = fs.statSync(out).size;
      console.log(`${id} ${view} -> ${out} (${size} bytes)`);
    }
  }
  await browser.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
