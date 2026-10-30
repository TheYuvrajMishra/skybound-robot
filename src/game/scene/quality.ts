export const QUALITY = { low: { pixelRatioCap: 1, shadows: false, cloudCount: 2 }, med: { pixelRatioCap: 1.5, shadows: true, cloudCount: 4 }, high: { pixelRatioCap: 2, shadows: true, cloudCount: 5 } } as const;
export type Quality = keyof typeof QUALITY;
