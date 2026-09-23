import { beforeEach, describe, expect, test } from "vitest";
import {
  Game,
  Player,
  PlayerInfo,
  PlayerType,
  UnitType,
} from "../../src/core/game/Game";
import { Ideology } from "../../src/core/game/Ideology";
import {
  researchPointsForLevel,
  UNIT_RESEARCH_REQUIREMENTS,
} from "../../src/core/game/Research";
import { setup } from "../util/Setup";
import { TestConfig } from "../util/TestConfig";
import { constructionExecution } from "../util/utils";

function info(name: string): PlayerInfo {
  return new PlayerInfo(
    name,
    PlayerType.Human,
    null,
    name,
    false,
    null,
    [],
    null,
    null,
    { ideology: Ideology.Technocracy },
  );
}

/** Whether the build menu would offer this unit right now. */
function canBuild(game: Game, player: Player, type: UnitType): boolean {
  return (
    player.buildableUnits(game.ref(10, 10)).find((b) => b.type === type)
      ?.canBuild !== false
  );
}

describe("Research gating", () => {
  let game: Game;
  let player: Player;

  beforeEach(async () => {
    game = await setup("plains", { instantBuild: true }, [info("p")]);
    // These tests are about the tech tree, so the gate is on.
    (game.config() as TestConfig).setResearchGating(true);
    player = game.player("p");
    for (let x = 0; x < 40; x++) {
      for (let y = 0; y < 40; y++) {
        player.conquer(game.ref(x, y));
      }
    }
    // Gold is never the reason a unit is unavailable in these tests.
    player.addGold(1_000_000_000n);
  });

  test("gated units are unavailable at level 0", () => {
    for (const type of Object.keys(UNIT_RESEARCH_REQUIREMENTS) as UnitType[]) {
      expect(canBuild(game, player, type), `${type} should be locked`).toBe(
        false,
      );
    }
    // Ungated buildings stay available from the first minute.
    expect(canBuild(game, player, UnitType.City)).toBe(true);
    expect(canBuild(game, player, UnitType.Barracks)).toBe(true);
    expect(canBuild(game, player, UnitType.ResearchLab)).toBe(true);
  });

  test("each conventional unlock arrives at exactly its own level", () => {
    // Walk the ladder once, forwards, checking what is available at each
    // rung. Only units with no lab requirement are covered here; the
    // nuclear ones need infrastructure as well (see the next test).
    const expected: [UnitType, number][] = [
      [UnitType.Artillery, 2],
      [UnitType.Fortress, 3],
      [UnitType.SAMLauncher, 3],
    ];

    for (let level = 0; level <= 3; level++) {
      player.addResearchPoints(
        researchPointsForLevel(level) - player.researchPoints(),
      );
      expect(player.researchLevel()).toBe(level);

      for (const [type, required] of expected) {
        expect(
          canBuild(game, player, type),
          `${type} at research level ${level}`,
        ).toBe(level >= required);
      }
    }
  });

  test("the level alone does not buy a nuclear program — labs must exist", () => {
    player.addResearchPoints(researchPointsForLevel(7));
    expect(player.researchLevel()).toBe(7);

    // Silos need one lab, atom bombs two.
    expect(player.researchLabLevels()).toBe(0);
    expect(canBuild(game, player, UnitType.MissileSilo)).toBe(false);

    constructionExecution(game, player, 5, 5, UnitType.ResearchLab);
    expect(player.researchLabLevels()).toBe(1);
    expect(canBuild(game, player, UnitType.MissileSilo)).toBe(true);
    expect(canBuild(game, player, UnitType.AtomBomb)).toBe(false);

    constructionExecution(game, player, 25, 25, UnitType.ResearchLab);
    expect(player.researchLabLevels()).toBe(2);
    // With a silo standing, the atom bomb is finally on the table.
    constructionExecution(game, player, 15, 15, UnitType.MissileSilo);
    expect(canBuild(game, player, UnitType.AtomBomb)).toBe(true);
    // The heavier warheads still need more of a program.
    expect(canBuild(game, player, UnitType.HydrogenBomb)).toBe(false);
    expect(canBuild(game, player, UnitType.MIRV)).toBe(false);
  });

  test("losing labs takes the nuclear option away again", () => {
    player.addResearchPoints(researchPointsForLevel(7));
    constructionExecution(game, player, 5, 5, UnitType.ResearchLab);
    constructionExecution(game, player, 25, 25, UnitType.ResearchLab);
    constructionExecution(game, player, 15, 15, UnitType.MissileSilo);
    expect(canBuild(game, player, UnitType.AtomBomb)).toBe(true);

    player.units(UnitType.ResearchLab)[0].delete();
    expect(player.researchLabLevels()).toBe(1);
    expect(canBuild(game, player, UnitType.AtomBomb)).toBe(false);
  });

  test("a scenario's ceiling keeps the era's weapons out of reach", () => {
    player.addResearchPoints(researchPointsForLevel(7));
    constructionExecution(game, player, 5, 5, UnitType.ResearchLab);
    constructionExecution(game, player, 25, 25, UnitType.ResearchLab);

    const config = game.config() as TestConfig;
    config.maxResearchLevel = () => 3;

    expect(player.researchLevel()).toBe(3);
    expect(canBuild(game, player, UnitType.Fortress)).toBe(true);
    expect(canBuild(game, player, UnitType.MissileSilo)).toBe(false);
    expect(canBuild(game, player, UnitType.AtomBomb)).toBe(false);
  });
});
