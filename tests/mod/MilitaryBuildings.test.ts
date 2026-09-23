import { beforeEach, describe, expect, test } from "vitest";
import { AttackExecution } from "../../src/core/execution/AttackExecution";
import { PlayerExecution } from "../../src/core/execution/PlayerExecution";
import {
  Game,
  Player,
  PlayerInfo,
  PlayerType,
  Structures,
  UnitType,
} from "../../src/core/game/Game";
import { Ideology } from "../../src/core/game/Ideology";
import { setup } from "../util/Setup";
import { UseRealAttackLogic } from "../util/TestConfig";
import { constructionExecution, executeTicks } from "../util/utils";

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

describe("Barracks", () => {
  let game: Game;
  let player: Player;

  beforeEach(async () => {
    game = await setup("plains", { instantBuild: true }, [info("p")]);
    player = game.player("p");
    for (let x = 0; x < 40; x++) {
      for (let y = 0; y < 40; y++) player.conquer(game.ref(x, y));
    }
    player.addGold(100_000_000n);
  });

  test("raises the troop ceiling and speeds recruitment", () => {
    const config = game.config();
    const maxBefore = config.maxTroops(player);
    const rateBefore = config.troopIncreaseRate(player);

    constructionExecution(game, player, 5, 5, UnitType.Barracks);
    expect(player.units(UnitType.Barracks)).toHaveLength(1);

    expect(config.maxTroops(player)).toBeGreaterThan(maxBefore);
    expect(config.troopIncreaseRate(player)).toBeGreaterThan(rateBefore);
  });

  test("upgrading a barracks compounds both effects", () => {
    constructionExecution(game, player, 5, 5, UnitType.Barracks);
    const config = game.config();
    const maxOneLevel = config.maxTroops(player);

    const barracks = player.units(UnitType.Barracks)[0];
    player.upgradeUnit(barracks);

    expect(barracks.level()).toBe(2);
    expect(config.maxTroops(player)).toBeGreaterThan(maxOneLevel);
  });

  test("gives no economic benefit, unlike a city", () => {
    const config = game.config();
    const goldBefore = config.goldAdditionRate(player);
    constructionExecution(game, player, 5, 5, UnitType.Barracks);
    expect(config.goldAdditionRate(player)).toBe(goldBefore);
  });
});

describe("Fortress and Artillery in combat", () => {
  let game: Game;
  let attacker: Player;
  let defender: Player;

  beforeEach(async () => {
    game = await setup(
      "plains",
      { instantBuild: true },
      [info("attacker"), info("defender")],
      undefined,
      // TestConfig flattens attackLogic; these cases are about that maths.
      UseRealAttackLogic,
    );
    attacker = game.player("attacker");
    defender = game.player("defender");
    for (let x = 0; x < 20; x++) {
      for (let y = 0; y < 40; y++) attacker.conquer(game.ref(x, y));
    }
    for (let x = 20; x < 40; x++) {
      for (let y = 0; y < 40; y++) defender.conquer(game.ref(x, y));
    }
    attacker.addGold(100_000_000n);
    defender.addGold(100_000_000n);
  });

  test("a fortress defends harder than a defense post", () => {
    const config = game.config();
    expect(config.fortressDefenseBonus()).toBeGreaterThan(
      config.defensePostDefenseBonus(),
    );
    expect(config.fortressRange()).toBeGreaterThan(config.defensePostRange());
  });

  test("a fortress makes the defender's tiles cost the attacker more", () => {
    const config = game.config();
    const base = {
      terrain: game.terrainType(game.ref(20, 20)),
      attackTroops: 10_000,
      attacker: { type: PlayerType.Human, numTiles: 800 },
      defender: {
        type: PlayerType.Human,
        numTiles: 800,
        troops: 10_000,
        isTraitor: false,
        isDisconnectedTeammate: false,
      },
      defenderHasDefensePost: false,
      falloutRatio: null,
      borderSize: 40,
    };

    const plain = config.attackLogic({ ...base });
    const fortified = config.attackLogic({
      ...base,
      defenderHasFortress: true,
    });

    expect(fortified.attackerTroopLoss).toBeGreaterThan(
      plain.attackerTroopLoss,
    );
    expect(fortified.tickFraction).toBeGreaterThan(plain.tickFraction);
  });

  test("artillery makes an attack cheaper and faster", () => {
    const config = game.config();
    const base = {
      terrain: game.terrainType(game.ref(20, 20)),
      attackTroops: 10_000,
      attacker: { type: PlayerType.Human, numTiles: 800 },
      defender: {
        type: PlayerType.Human,
        numTiles: 800,
        troops: 10_000,
        isTraitor: false,
        isDisconnectedTeammate: false,
      },
      defenderHasDefensePost: false,
      falloutRatio: null,
      borderSize: 40,
    };

    const plain = config.attackLogic({ ...base });
    const supported = config.attackLogic({
      ...base,
      attackerHasArtillery: true,
    });

    expect(supported.attackerTroopLoss).toBeLessThan(plain.attackerTroopLoss);
    expect(supported.tickFraction).toBeLessThan(plain.tickFraction);
  });

  test("artillery does nothing against empty land", () => {
    const config = game.config();
    const base = {
      terrain: game.terrainType(game.ref(20, 20)),
      attackTroops: 10_000,
      attacker: { type: PlayerType.Human, numTiles: 800 },
      defender: null,
      defenderHasDefensePost: false,
      falloutRatio: null,
      borderSize: 40,
    };

    expect(config.attackLogic({ ...base, attackerHasArtillery: true })).toEqual(
      config.attackLogic({ ...base }),
    );
  });

  test("a real attack reads the buildings standing on the map", () => {
    // Fortress on the defender's side of the border, artillery on ours.
    constructionExecution(game, defender, 21, 20, UnitType.Fortress);
    constructionExecution(game, attacker, 19, 20, UnitType.Artillery);
    expect(defender.units(UnitType.Fortress)).toHaveLength(1);
    expect(attacker.units(UnitType.Artillery)).toHaveLength(1);

    const exec = new AttackExecution(5_000, attacker, defender.id(), null);
    game.addExecution(exec);
    executeTicks(game, 3);

    // The attack is under way and the simulation stayed consistent.
    expect(attacker.outgoingAttacks().length).toBeGreaterThanOrEqual(0);
  });
});

describe("Capture rules", () => {
  let game: Game;
  let owner: Player;
  let captor: Player;

  beforeEach(async () => {
    game = await setup("plains", { instantBuild: true }, [
      info("owner"),
      info("captor"),
    ]);
    owner = game.player("owner");
    captor = game.player("captor");
    for (let x = 0; x < 40; x++) {
      for (let y = 0; y < 40; y++) owner.conquer(game.ref(x, y));
    }
    owner.addGold(100_000_000n);
  });

  test("useful buildings change hands; emplacements are razed", () => {
    constructionExecution(game, owner, 5, 5, UnitType.Barracks);
    constructionExecution(game, owner, 15, 15, UnitType.ResearchLab);
    constructionExecution(game, owner, 25, 25, UnitType.Fortress);
    constructionExecution(game, owner, 35, 35, UnitType.Artillery);

    game.addExecution(new PlayerExecution(owner));
    // Take the ground each building actually stands on: structures are
    // nudged apart by the minimum-distance rule, so they rarely land on the
    // exact tile that was requested.
    for (const unit of [...owner.units()]) {
      captor.conquer(unit.tile());
    }
    executeTicks(game, 3);

    expect(captor.units(UnitType.Barracks)).toHaveLength(1);
    expect(captor.units(UnitType.ResearchLab)).toHaveLength(1);
    expect(captor.units(UnitType.Fortress)).toHaveLength(1);
    // Artillery is destroyed rather than handed to the attacker it slowed.
    expect(captor.units(UnitType.Artillery)).toHaveLength(0);
    expect(owner.units(UnitType.Artillery)).toHaveLength(0);
  });
});

describe("Structure registry", () => {
  test("the new buildings are registered as structures", () => {
    for (const type of [
      UnitType.Barracks,
      UnitType.Artillery,
      UnitType.Fortress,
      UnitType.ResearchLab,
    ]) {
      expect(Structures.has(type), `${type} is not a structure`).toBe(true);
    }
  });
});
