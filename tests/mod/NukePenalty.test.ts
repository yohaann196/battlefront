import { beforeEach, describe, expect, test, vi } from "vitest";
import { MirvExecution } from "../../src/core/execution/MIRVExecution";
import { NukeExecution } from "../../src/core/execution/NukeExecution";
import { PlayerExecution } from "../../src/core/execution/PlayerExecution";
import {
  Game,
  MessageType,
  Player,
  PlayerInfo,
  PlayerType,
  Relation,
  UnitType,
} from "../../src/core/game/Game";
import { Ideology } from "../../src/core/game/Ideology";
import { setup } from "../util/Setup";
import { executeTicks } from "../util/utils";

function info(name: string, type = PlayerType.Human): PlayerInfo {
  return new PlayerInfo(name, type, null, name, false, null, [], null, null, {
    ideology: Ideology.Technocracy,
  });
}

/** Builds a silo and launches an atom bomb at `target`'s land. */
function launchNukeAt(game: Game, launcher: Player, targetTile: number) {
  launcher.addGold(500_000_000n);
  launcher.buildUnit(UnitType.MissileSilo, Array.from(launcher.tiles())[0], {});
  game.addExecution(new NukeExecution(UnitType.AtomBomb, launcher, targetTile));
  executeTicks(game, 3);
}

describe("Nuclear sanctions", () => {
  let game: Game;
  let launcher: Player;
  let bystander: Player;
  let victim: Player;

  beforeEach(async () => {
    game = await setup("big_plains", { instantBuild: true }, [
      info("launcher"),
      info("bystander"),
      info("victim"),
    ]);
    launcher = game.player("launcher");
    bystander = game.player("bystander");
    victim = game.player("victim");
    for (let x = 0; x < 30; x++) {
      for (let y = 0; y < 30; y++) launcher.conquer(game.ref(x, y));
    }
    for (let x = 60; x < 90; x++) {
      for (let y = 0; y < 30; y++) bystander.conquer(game.ref(x, y));
    }
    for (let x = 120; x < 150; x++) {
      for (let y = 0; y < 30; y++) victim.conquer(game.ref(x, y));
    }
  });

  test("launching makes the launcher a pariah for five minutes", () => {
    expect(launcher.isNuclearPariah()).toBe(false);

    launchNukeAt(game, launcher, game.ref(130, 10));
    expect(launcher.units(UnitType.AtomBomb)).toHaveLength(1);
    expect(launcher.isNuclearPariah()).toBe(true);

    const duration = game.config().nukePenaltyDuration();
    // Five minutes at ten ticks a second.
    expect(duration * game.config().msPerTick()).toBe(5 * 60 * 1000);

    expect(launcher.nukePenaltyRemainingTicks()).toBeGreaterThan(0);
    executeTicks(game, duration + 2);
    expect(launcher.isNuclearPariah()).toBe(false);
    expect(launcher.nukePenaltyRemainingTicks()).toBe(0);
  });

  test("the whole world turns hostile, not just the target", () => {
    launchNukeAt(game, launcher, game.ref(130, 10));

    expect(victim.relation(launcher)).toBe(Relation.Hostile);
    // Even a player on the far side of the map wants nothing to do with them.
    expect(bystander.relation(launcher)).toBe(Relation.Hostile);
  });

  test("hostility outlasts the ordinary decay of relations", () => {
    launchNukeAt(game, launcher, game.ref(130, 10));

    // Relation scores decay toward neutral every tick; the pariah status is
    // what keeps the world hostile for the full sanctions window.
    game.addExecution(new PlayerExecution(bystander));
    executeTicks(game, 600);

    expect(launcher.isNuclearPariah()).toBe(true);
    expect(bystander.relation(launcher)).toBe(Relation.Hostile);
  });

  test("income is halved while sanctioned", () => {
    const config = game.config();
    const normalIncome = config.goldAdditionRate(launcher);
    const normalTrade = config.tradeShipGold(500, launcher);

    launchNukeAt(game, launcher, game.ref(130, 10));

    expect(config.nukeSanctionMultiplier()).toBe(0.5);
    expect(Number(config.goldAdditionRate(launcher))).toBeCloseTo(
      Number(normalIncome) / 2,
      0,
    );
    expect(Number(config.tradeShipGold(500, launcher))).toBeCloseTo(
      Number(normalTrade) / 2,
      0,
    );
  });

  test("defense is 20% weaker while sanctioned", () => {
    const config = game.config();
    const before = config.defenseStrength(launcher);

    launchNukeAt(game, launcher, game.ref(130, 10));

    expect(config.nukeDefenseDebuff()).toBe(0.8);
    expect(config.defenseStrength(launcher)).toBeCloseTo(before * 0.8, 6);
  });

  test("the launcher is shunned, but is not an alliance traitor", () => {
    launchNukeAt(game, launcher, game.ref(130, 10));

    // isTraitor drives the traitor icon and the AI's appetite for attacking.
    expect(launcher.isTraitor()).toBe(true);
    // ...but they betrayed no one, so the betrayal debuff does not apply.
    expect(launcher.isAllianceTraitor()).toBe(false);
  });

  test("everyone is told, in their own terms", () => {
    const displayMessage = vi.spyOn(game, "displayMessage");
    launchNukeAt(game, launcher, game.ref(130, 10));

    const calls = displayMessage.mock.calls.filter(
      (call) => call[1] === MessageType.NUKE_SANCTIONS,
    );
    const self = calls.filter(
      (call) => call[0] === "events_display.nuke_sanctions_self",
    );
    const others = calls.filter(
      (call) => call[0] === "events_display.nuke_sanctions_other",
    );

    expect(self).toHaveLength(1);
    expect(self[0][2]).toBe(launcher.id());
    // Both other players hear about it.
    expect(others).toHaveLength(2);
  });

  test("a second launch restarts the clock rather than stacking windows", () => {
    launchNukeAt(game, launcher, game.ref(130, 10));
    const duration = game.config().nukePenaltyDuration();

    executeTicks(game, Math.floor(duration / 2));
    const halfway = launcher.nukePenaltyRemainingTicks();
    expect(halfway).toBeLessThan(duration);

    launchNukeAt(game, launcher, game.ref(131, 11));
    expect(launcher.nukePenaltyRemainingTicks()).toBeGreaterThan(halfway);
    expect(launcher.nukePenaltyRemainingTicks()).toBeLessThanOrEqual(duration);
  });

  test("nations that use the bomb are sanctioned too", async () => {
    const nationGame = await setup("big_plains", { instantBuild: true }, [
      info("human"),
    ]);
    const nationInfo = info("nation", PlayerType.Nation);
    nationGame.addPlayer(nationInfo);
    const nation = nationGame.player("nation");
    const human = nationGame.player("human");
    for (let x = 0; x < 30; x++) {
      for (let y = 0; y < 30; y++) nation.conquer(nationGame.ref(x, y));
    }
    for (let x = 120; x < 150; x++) {
      for (let y = 0; y < 30; y++) human.conquer(nationGame.ref(x, y));
    }

    launchNukeAt(nationGame, nation, nationGame.ref(130, 10));
    expect(nation.isNuclearPariah()).toBe(true);
    expect(human.relation(nation)).toBe(Relation.Hostile);
  });

  test("a MIRV brings the same consequences", () => {
    launcher.addGold(1_000_000_000n);
    launcher.buildUnit(
      UnitType.MissileSilo,
      Array.from(launcher.tiles())[0],
      {},
    );
    game.addExecution(new MirvExecution(launcher, game.ref(130, 10)));
    executeTicks(game, 3);

    expect(launcher.units(UnitType.MIRV)).toHaveLength(1);
    expect(launcher.isNuclearPariah()).toBe(true);
    expect(bystander.relation(launcher)).toBe(Relation.Hostile);
  });
});
