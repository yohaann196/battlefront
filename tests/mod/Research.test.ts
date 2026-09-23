import { beforeEach, describe, expect, test, vi } from "vitest";
import { PlayerExecution } from "../../src/core/execution/PlayerExecution";
import {
  Game,
  MessageType,
  Player,
  PlayerInfo,
  PlayerType,
  UnitType,
} from "../../src/core/game/Game";
import { Ideology } from "../../src/core/game/Ideology";
import {
  MAX_RESEARCH_LEVEL,
  RESEARCH_LEVELS,
  researchLevelForPoints,
  researchPointsForLevel,
  UNIT_RESEARCH_REQUIREMENTS,
} from "../../src/core/game/Research";
import { setup } from "../util/Setup";
import { TestConfig } from "../util/TestConfig";
import { constructionExecution, executeTicks } from "../util/utils";

function info(name: string, ideology = Ideology.Technocracy): PlayerInfo {
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
    { ideology },
  );
}

describe("Research ladder", () => {
  test("levels are ordered and strictly more expensive as they go", () => {
    expect(RESEARCH_LEVELS).toHaveLength(MAX_RESEARCH_LEVEL);
    RESEARCH_LEVELS.forEach((entry, i) => {
      expect(entry.level).toBe(i + 1);
      if (i > 0) {
        expect(entry.points).toBeGreaterThan(RESEARCH_LEVELS[i - 1].points);
      }
    });
  });

  test("points map to the highest level fully paid for", () => {
    expect(researchLevelForPoints(0, MAX_RESEARCH_LEVEL)).toBe(0);
    const first = RESEARCH_LEVELS[0];
    expect(researchLevelForPoints(first.points - 1, MAX_RESEARCH_LEVEL)).toBe(
      0,
    );
    expect(researchLevelForPoints(first.points, MAX_RESEARCH_LEVEL)).toBe(1);
    expect(
      researchLevelForPoints(Number.MAX_SAFE_INTEGER, MAX_RESEARCH_LEVEL),
    ).toBe(MAX_RESEARCH_LEVEL);
  });

  test("a cap holds the level down no matter how many points are banked", () => {
    expect(researchLevelForPoints(Number.MAX_SAFE_INTEGER, 2)).toBe(2);
  });

  test("researchPointsForLevel round-trips with researchLevelForPoints", () => {
    for (let level = 1; level <= MAX_RESEARCH_LEVEL; level++) {
      const points = researchPointsForLevel(level);
      expect(researchLevelForPoints(points, MAX_RESEARCH_LEVEL)).toBe(level);
    }
  });

  test("nuclear weapons demand lab infrastructure, not just a level", () => {
    for (const nuke of [
      UnitType.AtomBomb,
      UnitType.HydrogenBomb,
      UnitType.MIRV,
    ]) {
      expect(UNIT_RESEARCH_REQUIREMENTS[nuke]!.labs).toBeGreaterThan(0);
    }
    // Conventional unlocks do not.
    expect(UNIT_RESEARCH_REQUIREMENTS[UnitType.Artillery]!.labs).toBe(0);
  });
});

describe("Research in the simulation", () => {
  let game: Game;
  let player: Player;

  beforeEach(async () => {
    game = await setup("plains", { instantBuild: true }, [info("p")]);
    player = game.player("p");
    for (let x = 0; x < 30; x++) {
      for (let y = 0; y < 30; y++) {
        player.conquer(game.ref(x, y));
      }
    }
  });

  test("no labs means no research at all", () => {
    expect(game.config().researchPointsPerTick(player)).toBe(0);
    executeTicks(game, 20);
    expect(player.researchPoints()).toBe(0);
    expect(player.researchLevel()).toBe(0);
  });

  test("a lab under construction produces nothing until it is finished", async () => {
    const slowGame = await setup("plains", { instantBuild: false }, [
      info("q"),
    ]);
    const slow = slowGame.player("q");
    for (let x = 0; x < 30; x++) {
      for (let y = 0; y < 30; y++) slow.conquer(slowGame.ref(x, y));
    }
    slow.addGold(10_000_000n);

    slowGame.addExecution(
      new (
        await import("../../src/core/execution/ConstructionExecution")
      ).ConstructionExecution(slow, UnitType.ResearchLab, slowGame.ref(5, 5)),
    );
    executeTicks(slowGame, 2);

    const lab = slow.units(UnitType.ResearchLab)[0];
    expect(lab.isUnderConstruction()).toBe(true);
    expect(slowGame.config().researchPointsPerTick(slow)).toBe(0);

    const duration =
      slowGame.unitInfo(UnitType.ResearchLab).constructionDuration ?? 0;
    executeTicks(slowGame, duration + 2);
    expect(lab.isUnderConstruction()).toBe(false);
    expect(slowGame.config().researchPointsPerTick(slow)).toBeGreaterThan(0);
  });

  test("labs accumulate points and announce each level reached", () => {
    player.addGold(10_000_000n);
    constructionExecution(game, player, 5, 5, UnitType.ResearchLab);
    expect(player.units(UnitType.ResearchLab)).toHaveLength(1);

    // Research accrues in PlayerExecution alongside income, so the test has
    // to run it (players built by setup() are never spawned).
    game.addExecution(new PlayerExecution(player));

    const displayMessage = vi.spyOn(game, "displayMessage");
    const perTick = game.config().researchPointsPerTick(player);
    expect(perTick).toBeGreaterThan(0);

    // Run long enough to cross the first threshold.
    const ticksNeeded = Math.ceil(RESEARCH_LEVELS[0].points / perTick) + 2;
    executeTicks(game, ticksNeeded);

    expect(player.researchLevel()).toBeGreaterThanOrEqual(1);
    const unlocks = displayMessage.mock.calls.filter(
      (call) => call[1] === MessageType.RESEARCH_UNLOCKED,
    );
    expect(unlocks.length).toBeGreaterThanOrEqual(1);
    expect(unlocks[0][0]).toBe("events_display.research_unlocked");
  });

  test("upgrading a lab is worth as much as building another", () => {
    player.addGold(50_000_000n);
    constructionExecution(game, player, 5, 5, UnitType.ResearchLab);
    const oneLab = game.config().researchPointsPerTick(player);

    const lab = player.units(UnitType.ResearchLab)[0];
    player.upgradeUnit(lab);
    const upgradedLab = game.config().researchPointsPerTick(player);

    expect(lab.level()).toBe(2);
    expect(upgradedLab).toBeCloseTo(oneLab * 2, 5);
    expect(player.researchLabLevels()).toBe(2);
  });

  test("a technocrat researches faster than a militarist", async () => {
    const militaryGame = await setup("plains", { instantBuild: true }, [
      info("m", Ideology.Militarism),
    ]);
    const militarist = militaryGame.player("m");
    for (let x = 0; x < 30; x++) {
      for (let y = 0; y < 30; y++) militarist.conquer(militaryGame.ref(x, y));
    }
    militarist.addGold(10_000_000n);
    constructionExecution(militaryGame, militarist, 5, 5, UnitType.ResearchLab);

    player.addGold(10_000_000n);
    constructionExecution(game, player, 5, 5, UnitType.ResearchLab);

    expect(game.config().researchPointsPerTick(player)).toBeGreaterThan(
      militaryGame.config().researchPointsPerTick(militarist),
    );
  });

  test("a scenario's technology ceiling holds the level down", () => {
    player.addResearchPoints(Number.MAX_SAFE_INTEGER);
    expect(player.researchLevel()).toBe(MAX_RESEARCH_LEVEL);

    (game.config() as TestConfig).maxResearchLevel = vi.fn(() => 2);
    expect(player.researchLevel()).toBe(2);
  });
});
