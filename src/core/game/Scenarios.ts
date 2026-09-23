/**
 * Pre-made singleplayer setups: a map, a cast of historical factions with
 * their own governments, tech and army sizes, and the era's technology
 * limits. The player picks a faction and starts as it; bots fill the rest.
 *
 * Positions and flags are borrowed from the map manifest by nation name
 * (`baseNation`), so a scenario never needs its own map or flag art. A
 * faction can override the position outright when history puts it somewhere
 * the modern nation is not.
 *
 * Pure data: consumed by NationCreation (to seat the cast), GameRunner (to
 * seat the human) and Config (for the tech ceiling and unit bans).
 */

import { GameMapType, GameMode, UnitType } from "./Game";
import { Ideology } from "./Ideology";

export enum ScenarioId {
  ModernWorld = "modern_world",
  WW2 = "ww2",
  WW1 = "ww1",
  Empires1500 = "empires_1500",
  MongolConquest = "mongol_conquest",
}

export const SCENARIO_ORDER: readonly ScenarioId[] = [
  ScenarioId.ModernWorld,
  ScenarioId.WW2,
  ScenarioId.WW1,
  ScenarioId.Empires1500,
  ScenarioId.MongolConquest,
] as const;

export interface ScenarioFaction {
  /** Stable id used by the lobby config to name the player's choice. */
  key: string;
  /** Display name in game (may differ from the manifest nation). */
  name: string;
  /** Manifest nation to borrow spawn coordinates and flag from. */
  baseNation?: string;
  /** Explicit spawn override, for powers the modern map has no nation for. */
  coordinates?: [number, number];
  /** Flag override (ISO code under resources/flags/). */
  flag?: string;
  /** Pre-set alliance bloc; must be one of the scenario's `teams`. */
  team?: string;
  ideology: Ideology;
  researchLevel: number;
  /** Multiplier on starting troops — how dominant this faction begins. */
  strength: number;
  startingGold?: number;
  /** Whether the player may choose this faction. */
  playable: boolean;
}

export interface Scenario {
  id: ScenarioId;
  map: GameMapType;
  gameMode: GameMode;
  /** Alliance blocs. Omitted for free-for-all scenarios. */
  teams?: string[];
  /** Bloc for factions with no team (and for leftover manifest nations). */
  neutralTeam?: string;
  factions: ScenarioFaction[];
  /** Units the era does not have. */
  disabledUnits: UnitType[];
  /** Technology ceiling for everyone in the scenario. */
  maxResearchLevel: number;
  /** Seat the map's remaining nations as minor neutral powers. */
  includeOtherManifestNations: boolean;
}

const C = Ideology.Capitalism;
const K = Ideology.Communism;
const M = Ideology.Militarism;
const T = Ideology.Technocracy;

/** Shorthand for a faction that plays itself, unchanged from the manifest. */
function self(
  name: string,
  ideology: Ideology,
  researchLevel: number,
  strength = 1,
  playable = true,
): ScenarioFaction {
  return {
    key: name,
    name,
    baseNation: name,
    ideology,
    researchLevel,
    strength,
    playable,
  };
}

/** A historical power standing on a modern nation's ground. */
function as(
  key: string,
  name: string,
  baseNation: string,
  team: string | undefined,
  ideology: Ideology,
  researchLevel: number,
  strength = 1,
  playable = false,
): ScenarioFaction {
  return {
    key,
    name,
    baseNation,
    team,
    ideology,
    researchLevel,
    strength,
    playable,
  };
}

const MODERN_WORLD: Scenario = {
  id: ScenarioId.ModernWorld,
  map: GameMapType.World,
  gameMode: GameMode.FFA,
  factions: [
    // Nuclear powers, already at the top of the ladder.
    self("United States", C, 7, 1.5),
    self("Russia", M, 7, 1.4),
    self("China", K, 6, 1.4),
    self("United Kingdom", C, 6, 1.1),
    self("France", C, 6, 1.1),
    self("India", C, 5, 1.2),
    self("Pakistan", M, 5),
    // Major conventional powers.
    self("Germany", T, 4, 1.1),
    self("Japan", T, 4, 1.1),
    self("Türkiye", M, 4),
    self("Brazil", C, 3, 1.1),
    self("Canada", C, 3),
    self("Australia", C, 3),
    self("Iran", M, 4),
    self("Saudi Arabia", C, 3),
    self("Egypt", M, 3),
    self("Indonesia", C, 3),
    self("Ukraine", M, 3),
    self("Poland", T, 3),
    self("Italy", C, 3),
    self("Spain", C, 3),
    self("Sweden", T, 3),
    self("Norway", T, 2),
    self("Finland", T, 3),
    self("Mexico", C, 2),
    self("South Africa", C, 2),
    self("Argentina", C, 2),
    self("Thailand", C, 2),
    self("Philippines", C, 2),
    self("Taiwan", T, 3),
    self("Kazakhstan", M, 2),
    self("Cuba", K, 2),
    self("Venezuela", K, 2),
    self("Colombia", C, 2),
    self("Peru", C, 1),
    self("Bolivia", K, 1),
    self("Uruguay", C, 1),
    self("Morocco", C, 2),
    self("Algeria", M, 2),
    self("Libya", M, 1),
    self("Sudan", M, 1),
    self("Ethiopia", K, 1),
    self("Kenya", C, 1),
    self("DR Congo", K, 1),
    self("Zambia", C, 1),
    self("Namibia", C, 1),
    self("Chad", M, 1),
    self("Niger", M, 1),
    self("Benin", C, 1),
    self("Senegal", C, 1),
    self("Madagascar", C, 1),
    self("Oman", C, 1),
    self("Sri Lanka", C, 1),
    self("Bhutan", T, 1),
    self("New Zealand", C, 2),
    self("Ireland", C, 2),
    self("Iceland", T, 1),
    self("Belarus", K, 2),
    self("Romania", C, 2),
    self("Latvia", T, 1),
    self("Mongolia", K, 1),
    self("Siberia", M, 1),
    self("Greenland", T, 1),
    self("Alaska", C, 1),
    self("Yukon", C, 1),
    self("Nunavut", C, 1),
    self("Quebec", C, 2),
    self("California", C, 3),
    self("Texas", C, 3),
    self("Antarctica", T, 1, 1, false),
    self("West Antarctica", T, 1, 1, false),
    self("East Antarctica", T, 1, 1, false),
  ],
  disabledUnits: [],
  maxResearchLevel: 7,
  includeOtherManifestNations: true,
};

const WW2: Scenario = {
  id: ScenarioId.WW2,
  map: GameMapType.Europe,
  gameMode: GameMode.Team,
  teams: ["Axis", "Allies", "Neutral"],
  neutralTeam: "Neutral",
  factions: [
    // Axis
    as("germany", "Germany", "Germany", "Axis", M, 4, 1.6, true),
    as("italy", "Italy", "Italy", "Axis", M, 3, 1.2, true),
    as("hungary", "Hungary", "Hungary", "Axis", M, 2),
    as("romania", "Romania", "Romania", "Axis", M, 2),
    as("bulgaria", "Bulgaria", "Bulgaria", "Axis", M, 2),
    as("finland", "Finland", "Finland", "Axis", M, 2),
    as("slovakia", "Slovakia", "Slovakia", "Axis", M, 1),
    as("croatia", "Croatia", "Croatia", "Axis", M, 1),
    as("ostmark", "Ostmark", "Austria", "Axis", M, 2),
    as("italian_libya", "Italian Libya", "Libya", "Axis", M, 1),
    as("albania", "Albania", "Albania", "Axis", M, 1),
    // Allies
    as("uk", "United Kingdom", "England", "Allies", C, 4, 1.4, true),
    as("scotland", "Scotland", "Scotland", "Allies", C, 2),
    as("wales", "Wales", "Wales", "Allies", C, 1),
    as("ulster", "Northern Ireland", "Northern Ireland", "Allies", C, 1),
    as("france", "France", "France", "Allies", C, 3, 1.3, true),
    as("poland", "Poland", "Poland", "Allies", C, 2, 1.1, true),
    as("ussr", "Soviet Union", "Russia", "Allies", K, 4, 1.8, true),
    as("ukraine_ssr", "Ukrainian SSR", "Ukraine", "Allies", K, 2),
    as("belarus_ssr", "Byelorussian SSR", "Belarus", "Allies", K, 2),
    as("lithuania_ssr", "Lithuanian SSR", "Lithuania", "Allies", K, 1),
    as("latvia_ssr", "Latvian SSR", "Latvia", "Allies", K, 1),
    as("estonia_ssr", "Estonian SSR", "Estonia", "Allies", K, 1),
    as("georgia_ssr", "Georgian SSR", "Georgia", "Allies", K, 1),
    as("kazakh_ssr", "Kazakh SSR", "Kazakhstan", "Allies", K, 1),
    as("greece", "Greece", "Greece", "Allies", C, 2),
    as("yugoslavia", "Yugoslavia", "Serbia", "Allies", C, 2, 1.1),
    as("norway", "Norway", "Norway", "Allies", C, 2),
    as("netherlands", "Netherlands", "Netherlands", "Allies", C, 2),
    as("belgium", "Belgium", "Belgium", "Allies", C, 2),
    as("denmark", "Denmark", "Denmark", "Allies", C, 1),
    as("egypt", "Kingdom of Egypt", "Egypt", "Allies", C, 2),
    as("iraq", "Kingdom of Iraq", "Iraq", "Allies", C, 1),
    as("syria", "Mandate of Syria", "Syria", "Allies", C, 1),
    as("jordan", "Transjordan", "Jordan", "Allies", C, 1),
    as("lebanon", "Lebanon", "Lebanon", "Allies", C, 1),
    as("palestine", "Mandate of Palestine", "Israel", "Allies", C, 1),
    // Neutral
    as("spain", "Spain", "Spain", "Neutral", M, 2, 1.1, true),
    as("portugal", "Portugal", "Portugal", "Neutral", C, 1),
    as("sweden", "Sweden", "Sweden", "Neutral", T, 3, 1, true),
    as("switzerland", "Switzerland", "Switzerland", "Neutral", T, 3),
    as("ireland", "Ireland", "Ireland", "Neutral", C, 1),
    as("iceland", "Iceland", "Iceland", "Neutral", C, 1),
    as("turkey", "Türkiye", "Türkiye", "Neutral", M, 2, 1.1, true),
    as("morocco", "Morocco", "Morocco", "Neutral", C, 1),
    as("algeria", "Algeria", "Algeria", "Neutral", C, 1),
    as("tunisia", "Tunisia", "Tunisia", "Neutral", C, 1),
  ],
  // The Manhattan Project is the ceiling: fission yes, thermonuclear no.
  disabledUnits: [UnitType.HydrogenBomb, UnitType.MIRV],
  maxResearchLevel: 5,
  includeOtherManifestNations: false,
};

const WW1: Scenario = {
  id: ScenarioId.WW1,
  map: GameMapType.Europe,
  gameMode: GameMode.Team,
  teams: ["Central Powers", "Entente", "Neutral"],
  neutralTeam: "Neutral",
  factions: [
    // Central Powers
    as(
      "germany",
      "German Empire",
      "Germany",
      "Central Powers",
      M,
      3,
      1.6,
      true,
    ),
    as(
      "austria",
      "Austria-Hungary",
      "Austria",
      "Central Powers",
      M,
      3,
      1.4,
      true,
    ),
    as("hungary", "Kingdom of Hungary", "Hungary", "Central Powers", M, 2),
    as("bohemia", "Bohemia", "Czechia", "Central Powers", M, 2),
    as("slovakia", "Upper Hungary", "Slovakia", "Central Powers", M, 1),
    as("croatia", "Croatia-Slavonia", "Croatia", "Central Powers", M, 1),
    as("bosnia", "Bosnia", "Bosnia and Herzegovina", "Central Powers", M, 1),
    as(
      "ottoman",
      "Ottoman Empire",
      "Türkiye",
      "Central Powers",
      M,
      2,
      1.3,
      true,
    ),
    as("bulgaria", "Bulgaria", "Bulgaria", "Central Powers", M, 2),
    as("syria_ott", "Ottoman Syria", "Syria", "Central Powers", M, 1),
    as("iraq_ott", "Ottoman Mesopotamia", "Iraq", "Central Powers", M, 1),
    as("jordan_ott", "Ottoman Transjordan", "Jordan", "Central Powers", M, 1),
    as("lebanon_ott", "Ottoman Lebanon", "Lebanon", "Central Powers", M, 1),
    as("palestine_ott", "Ottoman Palestine", "Israel", "Central Powers", M, 1),
    // Entente
    as("france", "France", "France", "Entente", C, 3, 1.4, true),
    as("britain", "British Empire", "England", "Entente", C, 3, 1.4, true),
    as("scotland", "Scotland", "Scotland", "Entente", C, 2),
    as("wales", "Wales", "Wales", "Entente", C, 1),
    as("ulster", "Ulster", "Northern Ireland", "Entente", C, 1),
    as("ireland", "Ireland", "Ireland", "Entente", C, 1),
    as("russia", "Russian Empire", "Russia", "Entente", M, 2, 1.7, true),
    as("ukraine_ru", "Little Russia", "Ukraine", "Entente", M, 1),
    as("belarus_ru", "White Russia", "Belarus", "Entente", M, 1),
    as("lithuania_ru", "Vilna Governorate", "Lithuania", "Entente", M, 1),
    as("latvia_ru", "Courland", "Latvia", "Entente", M, 1),
    as("estonia_ru", "Estonia", "Estonia", "Entente", M, 1),
    as("georgia_ru", "Georgia", "Georgia", "Entente", M, 1),
    as("kazakh_ru", "Steppe Krai", "Kazakhstan", "Entente", M, 1),
    as("finland_ru", "Grand Duchy of Finland", "Finland", "Entente", M, 1),
    as("italy", "Italy", "Italy", "Entente", C, 2, 1.2, true),
    as("serbia", "Serbia", "Serbia", "Entente", M, 1, 1.1),
    as("romania", "Romania", "Romania", "Entente", C, 1),
    as("greece", "Greece", "Greece", "Entente", C, 1),
    as("belgium", "Belgium", "Belgium", "Entente", C, 2),
    as("portugal", "Portugal", "Portugal", "Entente", C, 1),
    as("egypt", "Sultanate of Egypt", "Egypt", "Entente", C, 1),
    as("morocco", "French Morocco", "Morocco", "Entente", C, 1),
    as("algeria", "French Algeria", "Algeria", "Entente", C, 1),
    as("tunisia", "French Tunisia", "Tunisia", "Entente", C, 1),
    as("libya", "Italian Libya", "Libya", "Entente", C, 1),
    // Neutral
    as("spain", "Spain", "Spain", "Neutral", C, 1, 1, true),
    as("netherlands", "Netherlands", "Netherlands", "Neutral", C, 2),
    as("switzerland", "Switzerland", "Switzerland", "Neutral", T, 2),
    as("denmark", "Denmark", "Denmark", "Neutral", C, 1),
    as("norway", "Norway", "Norway", "Neutral", C, 1),
    as("sweden", "Sweden", "Sweden", "Neutral", T, 2),
    as("iceland", "Iceland", "Iceland", "Neutral", C, 1),
    as("albania", "Albania", "Albania", "Neutral", M, 1),
  ],
  // Trenches and artillery: no rockets, no air defence, no warheads.
  disabledUnits: [
    UnitType.MissileSilo,
    UnitType.SAMLauncher,
    UnitType.AtomBomb,
    UnitType.HydrogenBomb,
    UnitType.MIRV,
  ],
  maxResearchLevel: 3,
  includeOtherManifestNations: false,
};

const EMPIRES_1500: Scenario = {
  id: ScenarioId.Empires1500,
  map: GameMapType.World,
  gameMode: GameMode.FFA,
  factions: [
    as("spain", "Spain", "Spain", undefined, C, 3, 1.5, true),
    // The World map has no Portugal nation; seat it on the Atlantic coast
    // west of Spain (verified land).
    {
      key: "portugal",
      name: "Portugal",
      coordinates: [896, 272],
      flag: "pt",
      ideology: C,
      researchLevel: 3,
      strength: 1.3,
      playable: true,
    },
    as("france", "France", "France", undefined, M, 2, 1.3, true),
    as("england", "England", "United Kingdom", undefined, C, 3, 1.3, true),
    as("hre", "Holy Roman Empire", "Germany", undefined, M, 2, 1.4, true),
    as("ottoman", "Ottoman Empire", "Türkiye", undefined, M, 3, 1.6, true),
    as("ming", "Ming Dynasty", "China", undefined, K, 3, 1.8, true),
    as("mughal", "Mughal Empire", "India", undefined, M, 2, 1.5, true),
    as("safavid", "Safavid Persia", "Iran", undefined, M, 2, 1.3, true),
    as("muscovy", "Muscovy", "Russia", undefined, M, 2, 1.3, true),
    as("aztec", "Aztec Empire", "Mexico", undefined, M, 1, 1.2, true),
    as("inca", "Inca Empire", "Peru", undefined, K, 1, 1.2, true),
    as("mamluk", "Mamluk Sultanate", "Egypt", undefined, M, 2, 1.2),
    as("songhai", "Songhai Empire", "Niger", undefined, M, 1, 1.2, true),
    as("japan", "Sengoku Japan", "Japan", undefined, M, 2, 1.2, true),
    as("kongo", "Kingdom of Kongo", "DR Congo", undefined, C, 1, 1.1),
    as("poland", "Poland-Lithuania", "Poland", undefined, C, 2, 1.3, true),
    as("sweden", "Sweden", "Sweden", undefined, M, 2, 1.1),
    as("denmark", "Denmark-Norway", "Norway", undefined, C, 2, 1.1),
    as("ethiopia", "Ethiopian Empire", "Ethiopia", undefined, K, 1, 1.1),
    as("morocco", "Saadi Morocco", "Morocco", undefined, M, 1, 1.1),
    as("majapahit", "Majapahit", "Indonesia", undefined, C, 1, 1.1),
    as("ayutthaya", "Ayutthaya", "Thailand", undefined, C, 1, 1.1),
    as("kazakh", "Kazakh Khanate", "Kazakhstan", undefined, M, 1, 1.1),
    as("vijayanagara", "Vijayanagara", "Sri Lanka", undefined, C, 1, 1.1),
    as("venice", "Venice", "Italy", undefined, C, 2, 1.2, true),
    as("novgorod", "Siberian Khanate", "Siberia", undefined, M, 1),
    as("ajuran", "Ajuran Sultanate", "Sudan", undefined, M, 1),
  ],
  // Age of sail: gunpowder and fortresses, nothing industrial.
  disabledUnits: [
    UnitType.Factory,
    UnitType.MissileSilo,
    UnitType.SAMLauncher,
    UnitType.AtomBomb,
    UnitType.HydrogenBomb,
    UnitType.MIRV,
  ],
  maxResearchLevel: 3,
  includeOtherManifestNations: false,
};

const MONGOL_CONQUEST: Scenario = {
  id: ScenarioId.MongolConquest,
  map: GameMapType.Asia,
  gameMode: GameMode.FFA,
  factions: [
    {
      key: "mongols",
      name: "Mongol Empire",
      baseNation: "Mongolia",
      ideology: M,
      researchLevel: 2,
      strength: 2.2,
      startingGold: 1_000_000,
      playable: true,
    },
    as("jin", "Jin Dynasty", "China", undefined, K, 2, 1.5, true),
    // The Song and Xi Xia have no modern nation of their own; they stand
    // south and west of the Jin heartland.
    {
      key: "song",
      name: "Song Dynasty",
      baseNation: "China",
      coordinates: [1220, 700],
      flag: "cn",
      ideology: K,
      researchLevel: 2,
      strength: 1.5,
      playable: true,
    },
    {
      key: "xixia",
      name: "Xi Xia",
      baseNation: "China",
      coordinates: [1090, 560],
      flag: "cn",
      ideology: M,
      researchLevel: 1,
      strength: 1.1,
      playable: false,
    },
    as(
      "khwarezm",
      "Khwarezmian Empire",
      "Kazakhstan",
      undefined,
      M,
      2,
      1.3,
      true,
    ),
    as("persia", "Persia", "Iran", undefined, C, 2, 1.2),
    as("abbasid", "Abbasid Caliphate", "Iraq", undefined, C, 2, 1.2, true),
    as("rus", "Kievan Rus'", "Ukraine", undefined, M, 1, 1.2, true),
    as("vladimir", "Vladimir-Suzdal", "Russia", undefined, M, 1, 1.1),
    as("rum", "Sultanate of Rum", "Türkiye", undefined, M, 1, 1.1),
    as("ayyubid", "Ayyubid Sultanate", "Egypt", undefined, M, 1, 1.2),
    as("delhi", "Delhi Sultanate", "India", undefined, M, 2, 1.3, true),
    as("ghurid", "Ghurid Sultanate", "Pakistan", undefined, M, 1, 1.1),
    as("goryeo", "Goryeo", "South Korea", undefined, C, 1, 1.1),
    as("kamakura", "Kamakura Japan", "Japan", undefined, M, 2, 1.2, true),
    as("pagan", "Pagan Kingdom", "Myanmar", undefined, C, 1),
    as("daiviet", "Đại Việt", "Vietnam", undefined, M, 1, 1.1),
    as("karakhitai", "Kara-Khitai", "Tajikistan", undefined, M, 1),
  ],
  // Horse archers and siege engines only.
  disabledUnits: [
    UnitType.Factory,
    UnitType.MissileSilo,
    UnitType.SAMLauncher,
    UnitType.AtomBomb,
    UnitType.HydrogenBomb,
    UnitType.MIRV,
  ],
  maxResearchLevel: 2,
  includeOtherManifestNations: false,
};

export const SCENARIOS: Record<ScenarioId, Scenario> = {
  [ScenarioId.ModernWorld]: MODERN_WORLD,
  [ScenarioId.WW2]: WW2,
  [ScenarioId.WW1]: WW1,
  [ScenarioId.Empires1500]: EMPIRES_1500,
  [ScenarioId.MongolConquest]: MONGOL_CONQUEST,
};

export function getScenario(id: ScenarioId): Scenario {
  return SCENARIOS[id];
}

export function scenarioFaction(
  scenario: Scenario,
  key: string,
): ScenarioFaction | null {
  return scenario.factions.find((f) => f.key === key) ?? null;
}

export function playableFactions(scenario: Scenario): ScenarioFaction[] {
  return scenario.factions.filter((f) => f.playable);
}

export function isScenarioId(value: unknown): value is ScenarioId {
  return (
    typeof value === "string" &&
    (SCENARIO_ORDER as readonly string[]).includes(value)
  );
}
