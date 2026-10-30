import { describe, it, expect } from 'vitest';
import { createRobot, createImp, createGolem } from '../src/game/models/characters';
import { createPistol, createMinigun, createRocketLauncher, createTargetingRifle } from '../src/game/models/weapons';
import { createGate, createBoulder, createRoadTile, createBanner, createRailPost, createSpire, createFloatingPlatform, createCloud, createProjectiles } from '../src/game/models/environment';
import { triCount } from '../src/game/models/helpers';
const MODELS = { robot: [createRobot(), 900], imp: [createImp(), 500], golem: [createGolem(), 1200], pistol: [createPistol(), 1500], minigun: [createMinigun(), 1500], rocket: [createRocketLauncher(), 1500], targeting: [createTargetingRifle(), 1500], gate: [createGate(), 1500], boulder: [createBoulder(), 1500], roadTile: [createRoadTile(), 1500], banner: [createBanner(), 1500], railPost: [createRailPost(), 1500], spire: [createSpire(), 1500], platform: [createFloatingPlatform(), 1500], cloud: [createCloud(), 1500], projectiles: [createProjectiles(), 1500] } as const;
describe('triangle budgets', () => { for (const [name, [group, budget]] of Object.entries(MODELS)) { it(`${name} <= ${budget} tris`, () => { expect(triCount(group as never)).toBeLessThanOrEqual(budget); }); } });
