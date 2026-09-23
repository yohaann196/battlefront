/**
 * Economic ideologies: the strategic identity a player commits to.
 *
 * Every ideology is a trade — a buff you build around and a cost you plan
 * around — so the choice stays interesting all game rather than resolving to
 * one dominant pick. Switching is possible but deliberately painful (see
 * Config.ideologySwitchCost and the transition window below).
 *
 * Pure data: no imports, no randomness, no floating-point transcendentals.
 * Every value here is a plain multiplier applied by Config.
 */

export enum Ideology {
  Capitalism = "Capitalism",
  Communism = "Communism",
  Militarism = "Militarism",
  Technocracy = "Technocracy",
}

/** Declaration order — also the order the UI lists them in. */
export const IDEOLOGY_ORDER: readonly Ideology[] = [
  Ideology.Capitalism,
  Ideology.Communism,
  Ideology.Militarism,
  Ideology.Technocracy,
] as const;

export const DEFAULT_IDEOLOGY = Ideology.Capitalism;

/**
 * Multipliers applied to the matching Config formula. 1 is "unchanged";
 * above 1 is better for the player except on the three *Cost fields, where
 * below 1 is better (they scale what you pay).
 */
export interface IdeologyModifiers {
  /** Passive worker gold per tick. */
  goldRate: number;
  /** Trade ship and train payouts. */
  tradeGold: number;
  /** Troop recruitment rate. */
  troopGrowth: number;
  /** Troop cap. */
  maxTroops: number;
  /** Offensive strength (attacker losses shrink, attacks land faster). */
  attack: number;
  /** Defensive strength (attackers bleed more and advance slower). */
  defense: number;
  /** Research points per tick. */
  researchRate: number;
  /** Cost of military structures (barracks, artillery, fortress, posts, SAM, silo, warships). */
  militaryCost: number;
  /** Cost of economic structures (city, port, factory). */
  economicCost: number;
  /** Cost of research labs. */
  researchCost: number;
}

export const IDEOLOGY_MODIFIERS: Record<Ideology, IdeologyModifiers> = {
  // Gold engine. Out-earns everyone and buys its way through problems, but
  // its armies grow slowly and its barracks are expensive.
  [Ideology.Capitalism]: {
    // tradeGold is deliberately below the 1.3 a pure "trade empire" would
    // want: combined with the economy-wide trim in Config, even the best
    // trading government should sit at roughly the old baseline rather than
    // above it. Capitalism's edge over the others here is still large.
    goldRate: 1.25,
    tradeGold: 1.15,
    troopGrowth: 0.9,
    maxTroops: 1.0,
    attack: 1.0,
    defense: 1.0,
    researchRate: 1.0,
    militaryCost: 1.1,
    economicCost: 0.85,
    researchCost: 1.0,
  },
  // Manpower engine. Huge, fast-growing, hard-to-dislodge armies on a thin
  // economy — it wins by attrition, not by out-spending.
  [Ideology.Communism]: {
    goldRate: 0.85,
    tradeGold: 0.75,
    troopGrowth: 1.25,
    maxTroops: 1.2,
    attack: 1.0,
    defense: 1.1,
    researchRate: 0.9,
    militaryCost: 1.0,
    economicCost: 1.1,
    researchCost: 1.0,
  },
  // Offense engine. Hits hardest and fields the cheapest military, but its
  // economy and research lag — a race it has to finish early.
  [Ideology.Militarism]: {
    goldRate: 0.9,
    tradeGold: 0.85,
    troopGrowth: 1.05,
    maxTroops: 1.0,
    attack: 1.15,
    defense: 1.0,
    researchRate: 0.85,
    militaryCost: 0.75,
    economicCost: 1.2,
    researchCost: 1.15,
  },
  // Tech engine. Reaches doctrine and rocketry far ahead of everyone on a
  // smaller, softer army — it wins later, through unlocks.
  [Ideology.Technocracy]: {
    goldRate: 1.0,
    tradeGold: 1.0,
    troopGrowth: 0.9,
    maxTroops: 0.9,
    attack: 0.95,
    defense: 1.05,
    researchRate: 1.5,
    militaryCost: 1.1,
    economicCost: 1.0,
    researchCost: 0.7,
  },
};

export function isIdeology(value: unknown): value is Ideology {
  return (
    typeof value === "string" &&
    (IDEOLOGY_ORDER as readonly string[]).includes(value)
  );
}

/** Stable numeric id, used for the desync hash. */
export function ideologyOrdinal(ideology: Ideology): number {
  return IDEOLOGY_ORDER.indexOf(ideology);
}

/**
 * Modifiers as they apply right now. During the transition window that
 * follows a switch, the new government is still finding its feet: every
 * advantage is held at 1 while every penalty already bites. That is what
 * makes switching a real commitment rather than a free re-roll.
 */
export function effectiveModifiers(
  ideology: Ideology,
  inTransition: boolean,
): IdeologyModifiers {
  const base = IDEOLOGY_MODIFIERS[ideology];
  if (!inTransition) {
    return base;
  }
  return {
    goldRate: Math.min(base.goldRate, 1),
    tradeGold: Math.min(base.tradeGold, 1),
    troopGrowth: Math.min(base.troopGrowth, 1),
    maxTroops: Math.min(base.maxTroops, 1),
    attack: Math.min(base.attack, 1),
    defense: Math.min(base.defense, 1),
    researchRate: Math.min(base.researchRate, 1),
    // Costs invert: "no benefit" means never cheaper than baseline.
    militaryCost: Math.max(base.militaryCost, 1),
    economicCost: Math.max(base.economicCost, 1),
    researchCost: Math.max(base.researchCost, 1),
  };
}
