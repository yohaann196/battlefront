import { describe, expect, test } from "vitest";
import { NationExecution } from "../../src/core/execution/NationExecution";
import { PlayerExecution } from "../../src/core/execution/PlayerExecution";
import {
  Cell,
  Difficulty,
  Game,
  Nation,
  Player,
  PlayerInfo,
  PlayerType,
  UnitType,
} from "../../src/core/game/Game";
import { Ideology } from "../../src/core/game/Ideology";
import { setup } from "../util/Setup";
import { TestConfig } from "../util/TestConfig";
import { executeTicks } from "../util/utils";

async function nationGame(difficulty: Difficulty): Promise<{
  game: Game;
  nation: Player;
}> {
  const nationInfo = new PlayerInfo(
    "Testland",
    PlayerType.Nation,
    null,
    "testland",
    false,
    null,
    [],
    null,
    null,
    { ideology: Ideology.Technocracy },
  );
  const game = await setup(
    "big_plains",
    { difficulty, instantBuild: true },
    [],
    undefined,
    undefined,
    true,
    [new Nation(new Cell(50, 50), nationInfo)],
  );
  game.addPlayer(nationInfo);
  const nation = game.player("testland");
  for (let x = 30; x < 70; x++) {
    for (let y = 30; y < 70; y++) nation.conquer(game.ref(x, y));
  }
  game.addExecution(new PlayerExecution(nation));
  return { game, nation };
}

describe("Nations use the new buildings", () => {
  test("a nation builds research labs and barracks, not just cities", async () => {
    const { game, nation } = await nationGame(Difficulty.Hard);
    nation.addGold(500_000_000n);

    for (const n of game.nations()) {
      game.addExecution(new NationExecution("testgame", n));
    }
    executeTicks(game, 400);

    expect(nation.unitCount(UnitType.City)).toBeGreaterThan(0);
    expect(nation.unitCount(UnitType.ResearchLab)).toBeGreaterThan(0);
    expect(nation.unitCount(UnitType.Barracks)).toBeGreaterThan(0);
  });

  test("a nation's research climbs once it has labs", async () => {
    const { game, nation } = await nationGame(Difficulty.Hard);
    nation.addGold(500_000_000n);

    for (const n of game.nations()) {
      game.addExecution(new NationExecution("testgame", n));
    }
    executeTicks(game, 400);

    expect(nation.researchLabLevels()).toBeGreaterThan(0);
    expect(nation.researchPoints()).toBeGreaterThan(0);
  });

  test("a nation with no reachable nuke saves for research instead", async () => {
    const { game, nation } = await nationGame(Difficulty.Hard);
    // Real gating: nothing nuclear is available at level 0 with no labs.
    (game.config() as TestConfig).setResearchGating(true);

    const behavior = new (
      await import("../../src/core/execution/nation/NationStructureBehavior")
    ).NationStructureBehavior(
      new (await import("../../src/core/PseudoRandom")).PseudoRandom(1),
      game,
      nation,
    );

    const target = (
      behavior as unknown as { getSaveUpTarget(): bigint }
    ).getSaveUpTarget();

    // A lab, not a 100M MIRV it cannot build.
    const labCost = game.unitInfo(UnitType.ResearchLab).cost(game, nation);
    const mirvCost = game.unitInfo(UnitType.MIRV).cost(game, nation);
    expect(target).toBeLessThan(mirvCost);
    expect(target).toBeLessThanOrEqual(labCost * 2n);
  });

  test("a nation that has the tech does save for warheads", async () => {
    const { game, nation } = await nationGame(Difficulty.Hard);
    const config = game.config() as TestConfig;
    config.setResearchGating(true);

    // Give it a full nuclear program.
    nation.addResearchPoints(Number.MAX_SAFE_INTEGER);
    nation.addGold(500_000_000n);
    for (const [x, y] of [
      [35, 35],
      [45, 45],
      [55, 55],
      [65, 65],
    ]) {
      nation.buildUnit(UnitType.ResearchLab, game.ref(x, y), {});
    }
    expect(nation.researchLabLevels()).toBe(4);

    const behavior = new (
      await import("../../src/core/execution/nation/NationStructureBehavior")
    ).NationStructureBehavior(
      new (await import("../../src/core/PseudoRandom")).PseudoRandom(1),
      game,
      nation,
    );
    const target = (
      behavior as unknown as { getSaveUpTarget(): bigint }
    ).getSaveUpTarget();

    // Now the MIRV is a real goal worth banking for.
    expect(target).toBeGreaterThan(
      game.unitInfo(UnitType.ResearchLab).cost(game, nation) * 10n,
    );
  });
});
