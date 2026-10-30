import * as THREE from "three";
import { buildRobot } from "./robot";
import { buildCrawler } from "./crawler";
import { buildGolem } from "./golem";
import { buildPistol, buildMinigun, buildRocketLauncher, buildTargetingRifle } from "./weapons";
import { buildGate, buildBoulder, buildRoad, buildSideProps, buildSkyProps, buildProjectiles } from "./environment";

export type Builder = () => THREE.Group;

export interface ModelEntry {
  id: string;
  name: string;
  builder: Builder;
  sheetPath: string;
  triCap: number;
}

export const REGISTRY: ModelEntry[] = [
  { id: "robot", name: "Protagonist Robot", builder: buildRobot, sheetPath: "reference/sheets/01-protagonist-robot.webp", triCap: 2500 },
  { id: "crawler", name: "Crawler Imp", builder: buildCrawler, sheetPath: "reference/sheets/02-crawler-imp.webp", triCap: 1500 },
  { id: "golem", name: "Rock Golem", builder: buildGolem, sheetPath: "reference/sheets/03-rock-golem.webp", triCap: 3000 },
  { id: "pistol", name: "Pistol", builder: buildPistol, sheetPath: "reference/sheets/04-pistol.webp", triCap: 1200 },
  { id: "minigun", name: "Minigun", builder: buildMinigun, sheetPath: "reference/sheets/05-minigun.webp", triCap: 1200 },
  { id: "rocket-launcher", name: "Rocket Launcher", builder: buildRocketLauncher, sheetPath: "reference/sheets/06-rocket-launcher.webp", triCap: 1200 },
  { id: "targeting-rifle", name: "Targeting Rifle", builder: buildTargetingRifle, sheetPath: "reference/sheets/07-targeting-rifle.webp", triCap: 1200 },
  { id: "gate", name: "Multiplier Gate", builder: buildGate, sheetPath: "reference/sheets/08-multiplier-gate.webp", triCap: 600 },
  { id: "boulder", name: "Upgrade Boulder", builder: buildBoulder, sheetPath: "reference/sheets/09-upgrade-boulder.webp", triCap: 1000 },
  { id: "road", name: "Road Segment", builder: buildRoad, sheetPath: "reference/sheets/10-road-segment.webp", triCap: 1500 },
  { id: "side-props", name: "Side Props", builder: buildSideProps, sheetPath: "reference/sheets/11-side-props.webp", triCap: 800 },
  { id: "sky-props", name: "Sky Props", builder: buildSkyProps, sheetPath: "reference/sheets/12-sky-props.webp", triCap: 1500 },
  { id: "projectiles", name: "Projectiles & VFX", builder: buildProjectiles, sheetPath: "reference/sheets/13-projectiles-vfx.webp", triCap: 400 },
];

export function getEntry(id: string): ModelEntry | undefined {
  return REGISTRY.find((e) => e.id === id);
}

/** Phase 2 exports: every builder plus the registry itself. */
export { buildRobot, buildCrawler, buildGolem, buildPistol, buildMinigun, buildRocketLauncher, buildTargetingRifle, buildGate, buildBoulder, buildRoad, buildSideProps, buildSkyProps, buildProjectiles };
