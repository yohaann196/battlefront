import { beforeEach, describe, expect, test } from "vitest";
import { Config } from "../../src/core/configuration/Config";
import { SetIdeologyExecution } from "../../src/core/execution/SetIdeologyExecution";
import {
  Game,
  Player,
  PlayerInfo,
  PlayerType,
  UnitType,
} from "../../src/core/game/Game";
import {
  effectiveModifiers,
  Ideology,
  IDEOLOGY_MODIFIERS,
} from "../../src/core/game/Ideology";
import { setup } from "../util/Setup";
import { executeTicks } from "../util/utils";

function info(name: string, ideology: Ideology): PlayerInfo {
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

describe("Ideology modifiers", () => {
  test("a transition grants none of the upsides but all of the downsides", () => {
    const settled = IDEOLOGY_MODIFIERS[Ideology.Capitalism];
    const transitioning = effectiveModifiers(Ideology.Capitalism, true);

    // Benefits are withheld...
    expect(settled.goldRate).toBeGreaterThan(1);
    expect(transitioning.goldRate).toBe(1);
    expect(transitioning.economicCost).toBe(1);
    // ...while penalties still bite.
    expect(transitioning.troopGrowth).toBe(settled.troopGrowth);
    expect(transitioning.militaryCost).toBe(settled.militaryCost);
  });

  test("every ideology trades an advantage for a real cost", () => {
    for (const [name, mods] of Object.entries(IDEOLOGY_MODIFIERS)) {
      const values = Object.entries(mods);
      const better = values.filter(([key, v]) =>
        key.endsWith("Cost") ? v < 1 : v > 1,
      );
      const worse = values.filter(([key, v]) =>
        key.endsWith("Cost") ? v > 1 : v < 1,
      );
      expect(better.length, `${name} has no advantage`).toBeGreaterThan(0);
      expect(worse.length, `${name} has no drawback`).toBeGreaterThan(0);
    }
  });
});

describe("Ideology in the simulation", () => {
  let game: Game;
  let capitalist: Player;
  let communist: Player;

  beforeEach(async () => {
    game = await setup("plains", {}, [
      info("cap", Ideology.Capitalism),
      info("com", Ideology.Communism),
    ]);
    capitalist = game.player("cap");
    communist = game.player("com");
    capitalist.conquer(game.ref(10, 10));
    communist.conquer(game.ref(40, 40));
  });

  test("players start with the government they chose", () => {
    expect(capitalist.ideology()).toBe(Ideology.Capitalism);
    expect(communist.ideology()).toBe(Ideology.Communism);
    // Nobody has "changed" yet, so the first switch is free.
    expect(capitalist.ideologyChangedTick()).toBe(-1);
  });

  test("capitalism earns more gold; communism grows more troops", () => {
    const config = game.config();
    expect(config.goldAdditionRate(capitalist)).toBeGreaterThan(
      config.goldAdditionRate(communist),
    );

    // Compare recruitment from an identical starting position.
    communist.setTroops(capitalist.troops());
    expect(config.troopIncreaseRate(communist)).toBeGreaterThan(
      config.troopIncreaseRate(capitalist),
    );
    expect(config.maxTroops(communist)).toBeGreaterThan(
      config.maxTroops(capitalist),
    );
  });

  test("military buildings are cheaper for militarists, dearer for capitalists", async () => {
    const militaristGame = await setup("plains", {}, [
      info("mil", Ideology.Militarism),
      info("cap2", Ideology.Capitalism),
    ]);
    const militarist = militaristGame.player("mil");
    const capitalist2 = militaristGame.player("cap2");
    militarist.conquer(militaristGame.ref(10, 10));
    capitalist2.conquer(militaristGame.ref(40, 40));

    const barracks = militaristGame.unitInfo(UnitType.Barracks);
    expect(barracks.cost(militaristGame, militarist)).toBeLessThan(
      barracks.cost(militaristGame, capitalist2),
    );

    const city = militaristGame.unitInfo(UnitType.City);
    expect(city.cost(militaristGame, militarist)).toBeGreaterThan(
      city.cost(militaristGame, capitalist2),
    );
  });
});

describe("SetIdeologyExecution", () => {
  let game: Game;
  let player: Player;
  let config: Config;

  beforeEach(async () => {
    game = await setup("plains", {}, [info("p", Ideology.Capitalism)]);
    player = game.player("p");
    player.conquer(game.ref(10, 10));
    config = game.config();
  });

  test("the first commitment is free", () => {
    const goldBefore = player.gold();
    game.addExecution(new SetIdeologyExecution(player, Ideology.Militarism));
    game.executeNextTick();

    expect(player.ideology()).toBe(Ideology.Militarism);
    expect(player.gold()).toBeGreaterThanOrEqual(goldBefore);
  });

  test("switching again costs a flat sum plus half the treasury", () => {
    // Use up the free first choice.
    game.addExecution(new SetIdeologyExecution(player, Ideology.Militarism));
    game.executeNextTick();
    executeTicks(game, config.ideologyTransitionDuration() + 1);

    player.addGold(10_000_000n);
    const goldBefore = player.gold();
    const expectedCost = config.ideologySwitchCost(player);

    game.addExecution(new SetIdeologyExecution(player, Ideology.Communism));
    game.executeNextTick();

    expect(player.ideology()).toBe(Ideology.Communism);
    // One tick of income lands alongside the charge.
    expect(player.gold()).toBeLessThanOrEqual(goldBefore - expectedCost + 200n);
    expect(player.gold()).toBeGreaterThanOrEqual(goldBefore - expectedCost);
  });

  test("a switch is refused without the gold for it", () => {
    game.addExecution(new SetIdeologyExecution(player, Ideology.Militarism));
    game.executeNextTick();
    executeTicks(game, config.ideologyTransitionDuration() + 1);

    player.removeGold(player.gold());
    game.addExecution(new SetIdeologyExecution(player, Ideology.Technocracy));
    game.executeNextTick();

    expect(player.ideology()).toBe(Ideology.Militarism);
  });

  test("a second switch is refused until the transition has run its course", () => {
    player.addGold(100_000_000n);
    game.addExecution(new SetIdeologyExecution(player, Ideology.Militarism));
    game.executeNextTick();

    // Still reorganizing.
    expect(player.ideologyTransitionRemainingTicks()).toBeGreaterThan(0);
    game.addExecution(new SetIdeologyExecution(player, Ideology.Communism));
    game.executeNextTick();
    expect(player.ideology()).toBe(Ideology.Militarism);

    // Once it settles, the switch goes through.
    executeTicks(game, config.ideologyTransitionDuration() + 1);
    expect(player.ideologyTransitionRemainingTicks()).toBe(0);
    game.addExecution(new SetIdeologyExecution(player, Ideology.Communism));
    game.executeNextTick();
    expect(player.ideology()).toBe(Ideology.Communism);
  });

  test("during the transition the new government's bonuses do not apply", () => {
    const config = game.config();
    game.addExecution(new SetIdeologyExecution(player, Ideology.Communism));
    game.executeNextTick();

    // Communism's troop-growth bonus is withheld while transitioning...
    expect(config.ideologyModifiers(player).troopGrowth).toBe(1);
    // ...but its weak economy applies immediately.
    expect(config.ideologyModifiers(player).goldRate).toBe(
      IDEOLOGY_MODIFIERS[Ideology.Communism].goldRate,
    );

    executeTicks(game, config.ideologyTransitionDuration() + 1);
    expect(config.ideologyModifiers(player).troopGrowth).toBe(
      IDEOLOGY_MODIFIERS[Ideology.Communism].troopGrowth,
    );
  });
});
