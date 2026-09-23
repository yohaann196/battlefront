import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { describe, expect, test } from "vitest";
import {
  GameMapType,
  GameMode,
  PlayerType,
  UnitType,
} from "../../src/core/game/Game";
import { createScenarioNations } from "../../src/core/game/NationCreation";
import { MAX_RESEARCH_LEVEL } from "../../src/core/game/Research";
import {
  playableFactions,
  SCENARIO_ORDER,
  scenarioFaction,
  ScenarioId,
  SCENARIOS,
} from "../../src/core/game/Scenarios";
import { Nation as ManifestNation } from "../../src/core/game/TerrainMapLoader";
import { PseudoRandom } from "../../src/core/PseudoRandom";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** The resources/ manifest a scenario's map is generated from. */
const MAP_DIRS: Record<string, string> = {
  [GameMapType.World]: "world",
  [GameMapType.Europe]: "europe",
  [GameMapType.Asia]: "asia",
};

function manifestNations(map: GameMapType): ManifestNation[] {
  const dir = MAP_DIRS[map];
  expect(dir, `no manifest directory known for ${map}`).toBeDefined();
  const file = path.join(
    __dirname,
    `../../resources/maps/${dir}/manifest.json`,
  );
  return JSON.parse(fs.readFileSync(file, "utf8")).nations ?? [];
}

describe("Scenario definitions", () => {
  test("every scenario is reachable from the ordered list", () => {
    expect(SCENARIO_ORDER).toHaveLength(Object.keys(SCENARIOS).length);
    for (const id of SCENARIO_ORDER) {
      expect(SCENARIOS[id].id).toBe(id);
    }
  });

  test.each(SCENARIO_ORDER)(
    "%s: every faction can be placed on its map",
    (id) => {
      const scenario = SCENARIOS[id];
      const names = new Set(manifestNations(scenario.map).map((n) => n.name));
      for (const faction of scenario.factions) {
        const placeable =
          faction.coordinates !== undefined ||
          (faction.baseNation !== undefined && names.has(faction.baseNation));
        expect(
          placeable,
          `${id}: ${faction.name} has no position (baseNation ${faction.baseNation})`,
        ).toBe(true);
      }
    },
  );

  test.each(SCENARIO_ORDER)("%s: faction keys and names are unique", (id) => {
    const scenario = SCENARIOS[id];
    const keys = scenario.factions.map((f) => f.key);
    const names = scenario.factions.map((f) => f.name);
    expect(new Set(keys).size, `${id} has duplicate keys`).toBe(keys.length);
    expect(new Set(names).size, `${id} has duplicate names`).toBe(names.length);
  });

  test.each(SCENARIO_ORDER)("%s: teams are coherent", (id) => {
    const scenario = SCENARIOS[id];
    if (scenario.gameMode === GameMode.Team) {
      expect(
        scenario.teams,
        `${id} is a team game with no teams`,
      ).toBeDefined();
      for (const faction of scenario.factions) {
        expect(
          scenario.teams!.includes(faction.team!),
          `${id}: ${faction.name} is on unknown team ${faction.team}`,
        ).toBe(true);
      }
    } else {
      // A free-for-all must not pre-assign anyone to a bloc.
      for (const faction of scenario.factions) {
        expect(
          faction.team,
          `${id}: ${faction.name} has a team`,
        ).toBeUndefined();
      }
    }
  });

  test.each(SCENARIO_ORDER)("%s: offers something to play", (id) => {
    expect(playableFactions(SCENARIOS[id]).length).toBeGreaterThan(0);
  });

  test.each(SCENARIO_ORDER)("%s: research ceiling is in range", (id) => {
    const scenario = SCENARIOS[id];
    expect(scenario.maxResearchLevel).toBeGreaterThanOrEqual(1);
    expect(scenario.maxResearchLevel).toBeLessThanOrEqual(MAX_RESEARCH_LEVEL);
    // No faction may start above the era's ceiling.
    for (const faction of scenario.factions) {
      expect(
        faction.researchLevel,
        `${id}: ${faction.name} starts above the ceiling`,
      ).toBeLessThanOrEqual(scenario.maxResearchLevel);
    }
  });

  test("earlier eras ban the weapons they did not have", () => {
    const ww1 = SCENARIOS[ScenarioId.WW1];
    for (const banned of [
      UnitType.AtomBomb,
      UnitType.HydrogenBomb,
      UnitType.MIRV,
      UnitType.MissileSilo,
    ]) {
      expect(ww1.disabledUnits).toContain(banned);
    }

    const mongols = SCENARIOS[ScenarioId.MongolConquest];
    expect(mongols.disabledUnits).toContain(UnitType.Factory);
    expect(mongols.maxResearchLevel).toBeLessThan(
      SCENARIOS[ScenarioId.WW2].maxResearchLevel,
    );

    // WW2 stops at fission: the hydrogen bomb came later.
    const ww2 = SCENARIOS[ScenarioId.WW2];
    expect(ww2.disabledUnits).toContain(UnitType.HydrogenBomb);
    expect(ww2.disabledUnits).not.toContain(UnitType.AtomBomb);
  });
});

describe("createScenarioNations", () => {
  test("seats the cast, minus the faction the player took", () => {
    const scenario = SCENARIOS[ScenarioId.WW2];
    const nations = createScenarioNations(
      scenario,
      "germany",
      manifestNations(scenario.map),
      new PseudoRandom(1),
    );

    const names = nations.map((n) => n.playerInfo.name);
    expect(names).not.toContain("Germany");
    expect(names).toContain("Soviet Union");
    expect(names).toContain("United Kingdom");
    expect(nations).toHaveLength(scenario.factions.length - 1);
  });

  test("carries each faction's government, tech, team and flag", () => {
    const scenario = SCENARIOS[ScenarioId.WW2];
    const nations = createScenarioNations(
      scenario,
      "germany",
      manifestNations(scenario.map),
      new PseudoRandom(1),
    );

    const ussr = nations.find((n) => n.playerInfo.name === "Soviet Union")!;
    const faction = scenarioFaction(scenario, "ussr")!;
    expect(ussr.playerInfo.playerType).toBe(PlayerType.Nation);
    expect(ussr.playerInfo.preset?.ideology).toBe(faction.ideology);
    expect(ussr.playerInfo.preset?.researchLevel).toBe(faction.researchLevel);
    expect(ussr.playerInfo.preset?.team).toBe("Allies");
    // Borrowed from the modern nation it stands on.
    expect(ussr.playerInfo.nationFlag).toBe("ru");
    expect(ussr.spawnCell).toBeDefined();
  });

  test("a faction with its own coordinates ignores its base nation's", () => {
    const scenario = SCENARIOS[ScenarioId.MongolConquest];
    const nations = createScenarioNations(
      scenario,
      "mongols",
      manifestNations(scenario.map),
      new PseudoRandom(1),
    );

    const song = nations.find((n) => n.playerInfo.name === "Song Dynasty")!;
    const jin = nations.find((n) => n.playerInfo.name === "Jin Dynasty")!;
    const faction = scenarioFaction(scenario, "song")!;

    expect(song.spawnCell!.x).toBe(faction.coordinates![0]);
    expect(song.spawnCell!.y).toBe(faction.coordinates![1]);
    // The two Chinese states stand apart rather than on the same tile.
    expect(song.spawnCell).not.toEqual(jin.spawnCell);
  });

  test("Modern World fills in the map's remaining nations as neutrals", () => {
    const scenario = SCENARIOS[ScenarioId.ModernWorld];
    const nations = createScenarioNations(
      scenario,
      "United States",
      manifestNations(scenario.map),
      new PseudoRandom(1),
    );

    // Every faction but the player's, plus any manifest nation not named.
    expect(nations.length).toBeGreaterThanOrEqual(scenario.factions.length - 1);
    expect(nations.map((n) => n.playerInfo.name)).not.toContain(
      "United States",
    );
    // Real-world nuclear powers start well up the ladder.
    const russia = nations.find((n) => n.playerInfo.name === "Russia")!;
    expect(russia.playerInfo.preset?.researchLevel).toBe(7);
  });

  test("a scenario that names no extras adds none", () => {
    const scenario = SCENARIOS[ScenarioId.Empires1500];
    expect(scenario.includeOtherManifestNations).toBe(false);
    const nations = createScenarioNations(
      scenario,
      "spain",
      manifestNations(scenario.map),
      new PseudoRandom(1),
    );
    expect(nations).toHaveLength(scenario.factions.length - 1);
  });

  test("placement is deterministic for a given seed", () => {
    const scenario = SCENARIOS[ScenarioId.WW1];
    const run = () =>
      createScenarioNations(
        scenario,
        "france",
        manifestNations(scenario.map),
        new PseudoRandom(42),
      ).map((n) => `${n.playerInfo.name}@${n.spawnCell?.x},${n.spawnCell?.y}`);
    expect(run()).toEqual(run());
  });
});
