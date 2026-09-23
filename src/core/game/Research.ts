/**
 * Passive research: the tech ladder every player climbs by owning research
 * labs. Points accrue on their own (see Config.researchPointsPerTick), so
 * research is an investment decision — labs cost gold and land you could have
 * spent on an army — rather than a menu to micromanage.
 *
 * The ladder is strictly ordered: troop buffs first, weapons later, nuclear
 * weapons last. Nukes additionally demand a minimum number of labs, so a
 * player cannot coast to the top of the ladder on one building.
 *
 * Pure data: the only import is the UnitType enum it gates.
 */

import { UnitType } from "./Game";

export const MAX_RESEARCH_LEVEL = 7;

export interface ResearchLevel {
  /** 1-based; index in RESEARCH_LEVELS is level - 1. */
  level: number;
  /** i18n key suffix: research.level_<key>.name / .desc */
  key: string;
  /** Total points needed to reach this level. */
  points: number;
  /** Multiplier added to attack strength at this level (1 = no change). */
  attack: number;
  /** Multiplier added to defense strength at this level (1 = no change). */
  defense: number;
  /** Multiplier on troop recruitment at this level (1 = no change). */
  troopGrowth: number;
  /** Unit types this level makes buildable, for UI copy. */
  unlocks: UnitType[];
}

/**
 * Cumulative thresholds. A single level-1 lab makes ~1 point/tick (10/s), so
 * the first unlock lands around five minutes of a dedicated lab and the top
 * of the ladder is a genuine long-game commitment.
 */
export const RESEARCH_LEVELS: readonly ResearchLevel[] = [
  {
    level: 1,
    key: "conscription",
    points: 3_000,
    attack: 1.0,
    defense: 1.0,
    troopGrowth: 1.1,
    unlocks: [],
  },
  {
    level: 2,
    key: "military_doctrine",
    points: 8_000,
    attack: 1.1,
    defense: 1.0,
    troopGrowth: 1.1,
    unlocks: [UnitType.Artillery],
  },
  {
    level: 3,
    key: "fortification",
    points: 15_000,
    attack: 1.1,
    defense: 1.1,
    troopGrowth: 1.1,
    unlocks: [UnitType.Fortress, UnitType.SAMLauncher],
  },
  {
    level: 4,
    key: "rocketry",
    points: 24_000,
    attack: 1.15,
    defense: 1.1,
    troopGrowth: 1.1,
    unlocks: [UnitType.MissileSilo],
  },
  {
    level: 5,
    key: "nuclear_fission",
    points: 36_000,
    attack: 1.15,
    defense: 1.1,
    troopGrowth: 1.1,
    unlocks: [UnitType.AtomBomb],
  },
  {
    level: 6,
    key: "thermonuclear",
    points: 51_000,
    attack: 1.15,
    defense: 1.1,
    troopGrowth: 1.1,
    unlocks: [UnitType.HydrogenBomb],
  },
  {
    level: 7,
    key: "mirv_program",
    points: 70_000,
    attack: 1.15,
    defense: 1.1,
    troopGrowth: 1.1,
    unlocks: [UnitType.MIRV],
  },
] as const;

export interface ResearchRequirement {
  /** Minimum research level. */
  level: number;
  /** Minimum number of finished research labs (counted by level). */
  labs: number;
}

/**
 * What a unit type demands before it can be built. Nuclear weapons need lab
 * infrastructure on top of the level, so reaching the ladder's end on one
 * upgraded lab is not enough to start a nuclear program.
 */
export const UNIT_RESEARCH_REQUIREMENTS: Partial<
  Record<UnitType, ResearchRequirement>
> = {
  [UnitType.Artillery]: { level: 2, labs: 0 },
  [UnitType.Fortress]: { level: 3, labs: 0 },
  [UnitType.SAMLauncher]: { level: 3, labs: 0 },
  [UnitType.MissileSilo]: { level: 4, labs: 1 },
  [UnitType.AtomBomb]: { level: 5, labs: 2 },
  [UnitType.HydrogenBomb]: { level: 6, labs: 3 },
  [UnitType.MIRV]: { level: 7, labs: 4 },
};

/** Total points required to be at `level` (0 for level 0). */
export function researchPointsForLevel(level: number): number {
  if (level <= 0) return 0;
  const capped = Math.min(level, MAX_RESEARCH_LEVEL);
  return RESEARCH_LEVELS[capped - 1].points;
}

/** Highest level reached with `points`, never above `cap`. */
export function researchLevelForPoints(points: number, cap: number): number {
  const maxLevel = Math.min(cap, MAX_RESEARCH_LEVEL);
  let level = 0;
  for (const entry of RESEARCH_LEVELS) {
    if (entry.level > maxLevel) break;
    if (points < entry.points) break;
    level = entry.level;
  }
  return level;
}

/** Points still needed for the next level, or null when capped out. */
export function pointsToNextLevel(
  points: number,
  cap: number,
): { level: number; needed: number; total: number } | null {
  const maxLevel = Math.min(cap, MAX_RESEARCH_LEVEL);
  const current = researchLevelForPoints(points, maxLevel);
  if (current >= maxLevel) return null;
  const next = RESEARCH_LEVELS[current];
  return {
    level: next.level,
    needed: Math.max(0, next.points - points),
    total: next.points,
  };
}

function levelEntry(level: number): ResearchLevel | null {
  const capped = Math.min(level, MAX_RESEARCH_LEVEL);
  return capped <= 0 ? null : RESEARCH_LEVELS[capped - 1];
}

export function researchAttackBonus(level: number): number {
  return levelEntry(level)?.attack ?? 1;
}

export function researchDefenseBonus(level: number): number {
  return levelEntry(level)?.defense ?? 1;
}

export function researchTroopGrowthBonus(level: number): number {
  return levelEntry(level)?.troopGrowth ?? 1;
}
