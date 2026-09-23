import { describe, expect, test } from "vitest";
import { ScenarioSpawnExecution } from "../../src/core/execution/ScenarioSpawnExecution";
import {
  Cell,
  GameMode,
  Nation,
  PlayerInfo,
  PlayerType,
  UnitType,
} from "../../src/core/game/Game";
import { Ideology } from "../../src/core/game/Ideology";
import { researchPointsForLevel } from "../../src/core/game/Research";
import { ScenarioId } from "../../src/core/game/Scenarios";
import { setup } from "../util/Setup";
import { executeTicks } from "../util/utils";

/** A scenario config as the lobby would build it. */
const WW2_AS_GERMANY = {
  scenario: { id: ScenarioId.WW2, faction: "germany" },
  gameMode: GameMode.Team,
} as const;

function factionPlayer(
  name: string,
  team: string,
  ideology: Ideology,
  researchLevel: number,
  strength = 1,
): PlayerInfo {
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
    { ideology, team, researchLevel, strength },
  );
}

describe("Playing a scenario", () => {
  test("blocs come from the scenario, not from team balancing", async () => {
    const germany = factionPlayer(
      "Germany",
      "Axis",
      Ideology.Militarism,
      4,
      1.6,
    );
    const ussr = new Nation(
      new Cell(20, 20),
      new PlayerInfo(
        "Soviet Union",
        PlayerType.Nation,
        null,
        "ussr",
        false,
        null,
        [],
        null,
        "ru",
        { ideology: Ideology.Communism, team: "Allies", researchLevel: 4 },
      ),
    );

    const game = await setup(
      "big_plains",
      WW2_AS_GERMANY,
      [germany],
      undefined,
      undefined,
      true,
      [ussr],
    );

    expect(game.player("Germany").team()).toBe("Axis");
    expect(game.player("ussr").team()).toBe("Allies");
    expect(game.teams()).toContain("Axis");
    expect(game.teams()).toContain("Allies");
  });

  test("a faction starts with its own government, tech and army", async () => {
    const germany = factionPlayer(
      "Germany",
      "Axis",
      Ideology.Militarism,
      4,
      1.6,
    );
    const plain = factionPlayer("Plain", "Neutral", Ideology.Capitalism, 0, 1);

    const game = await setup("big_plains", WW2_AS_GERMANY, [germany, plain]);
    const strong = game.player("Germany");
    const weak = game.player("Plain");

    expect(strong.ideology()).toBe(Ideology.Militarism);
    expect(strong.researchPoints()).toBe(researchPointsForLevel(4));
    // A great power fields a bigger army from the first tick.
    expect(strong.troops()).toBeGreaterThan(weak.troops());
  });

  test("the era's technology ceiling and weapon bans apply", async () => {
    const game = await setup(
      "big_plains",
      { scenario: { id: ScenarioId.MongolConquest, faction: "mongols" } },
      [factionPlayer("Mongol Empire", "", Ideology.Militarism, 2, 2.2)],
    );
    const config = game.config();

    expect(config.maxResearchLevel()).toBe(2);
    for (const banned of [
      UnitType.Factory,
      UnitType.MissileSilo,
      UnitType.AtomBomb,
      UnitType.HydrogenBomb,
      UnitType.MIRV,
    ]) {
      expect(config.isUnitDisabled(banned), `${banned} should be banned`).toBe(
        true,
      );
    }
    // What the era did have is still buildable.
    expect(config.isUnitDisabled(UnitType.City)).toBe(false);
    expect(config.isUnitDisabled(UnitType.Barracks)).toBe(false);
  });

  test("the player is dropped onto their faction's homeland", async () => {
    const homeland = new Cell(60, 60);
    const germany = factionPlayer(
      "Germany",
      "Axis",
      Ideology.Militarism,
      4,
      1.6,
    );

    // autoEndSpawnPhase=false so the scenario spawn drives it, as in a game.
    const game = await setup(
      "big_plains",
      WW2_AS_GERMANY,
      [germany],
      undefined,
      undefined,
      false,
    );
    game.addExecution(
      new ScenarioSpawnExecution("testgame", germany, homeland),
    );

    expect(game.inSpawnPhase()).toBe(true);
    executeTicks(game, 15);

    const player = game.player("Germany");
    expect(player.hasSpawned()).toBe(true);
    // Landed within the search window of the historical position.
    const spawn = player.spawnTile()!;
    expect(Math.abs(game.x(spawn) - homeland.x)).toBeLessThanOrEqual(25);
    expect(Math.abs(game.y(spawn) - homeland.y)).toBeLessThanOrEqual(25);
    // Spawning a human in singleplayer ends the placement phase.
    expect(game.inSpawnPhase()).toBe(false);
  });

  test("nations still reach the map when the player auto-spawns", async () => {
    const germany = factionPlayer(
      "Germany",
      "Axis",
      Ideology.Militarism,
      4,
      1.6,
    );
    const ussr = new Nation(
      new Cell(120, 60),
      new PlayerInfo(
        "Soviet Union",
        PlayerType.Nation,
        null,
        "ussr",
        false,
        null,
        [],
        null,
        "ru",
        { ideology: Ideology.Communism, team: "Allies", researchLevel: 4 },
      ),
    );

    const game = await setup(
      "big_plains",
      WW2_AS_GERMANY,
      [germany],
      undefined,
      undefined,
      false,
      [ussr],
    );
    // Nations place themselves during the spawn phase.
    for (const nation of game.nations()) {
      game.addExecution(
        new (
          await import("../../src/core/execution/NationExecution")
        ).NationExecution("testgame", nation),
      );
    }
    game.addExecution(
      new ScenarioSpawnExecution("testgame", germany, new Cell(60, 60)),
    );

    executeTicks(game, 20);

    expect(game.player("Germany").hasSpawned()).toBe(true);
    // The delay before the player lands is what gives nations time to claim
    // their ground before the phase closes.
    expect(game.player("ussr").hasSpawned()).toBe(true);
  });
});
