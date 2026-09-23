import { Cell, Execution, Game, PlayerInfo } from "../game/Game";
import { PseudoRandom } from "../PseudoRandom";
import { GameID } from "../Schemas";
import { simpleHash } from "../Util";
import { SpawnExecution } from "./SpawnExecution";
import { findLandSpawnNear } from "./Util";

/**
 * Drops the player onto their chosen faction's homeland at the start of a
 * scenario.
 *
 * In a scenario you are a specific power, so there is no spawn to pick — the
 * map already says where you belong. The spawn is held back for a few ticks
 * because a human spawning in singleplayer ends the spawn phase immediately,
 * and every nation needs to have queued its own placement before that
 * happens or it never reaches the map at all.
 */
const TICKS_BEFORE_SPAWN = 10;

export class ScenarioSpawnExecution implements Execution {
  private random: PseudoRandom;
  private mg: Game;
  private active = true;

  constructor(
    private gameID: GameID,
    private playerInfo: PlayerInfo,
    private homeland: Cell,
  ) {
    this.random = new PseudoRandom(
      simpleHash(playerInfo.id) + simpleHash(this.gameID),
    );
  }

  init(mg: Game, ticks: number): void {
    this.mg = mg;
  }

  tick(ticks: number): void {
    if (ticks < TICKS_BEFORE_SPAWN) {
      return;
    }
    this.active = false;

    const tile = findLandSpawnNear(this.mg, this.homeland, this.random);
    if (tile === null) {
      // Leave the spawn phase running so the player can place themselves by
      // hand rather than being stranded.
      console.warn(
        `scenario: no spawn near (${this.homeland.x}, ${this.homeland.y}) for ${this.playerInfo.name}`,
      );
      return;
    }
    this.mg.addExecution(
      new SpawnExecution(this.gameID, this.playerInfo, tile),
    );
  }

  isActive(): boolean {
    return this.active;
  }

  activeDuringSpawnPhase(): boolean {
    return true;
  }
}
