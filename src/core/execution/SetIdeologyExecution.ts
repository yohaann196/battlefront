import { Execution, Game, MessageType, Player } from "../game/Game";
import { Ideology } from "../game/Ideology";

/**
 * Changes a player's economic system.
 *
 * The first choice is free — it is the government the player entered the game
 * with. Every change after that costs a flat sum plus half the treasury, and
 * is followed by a transition window in which the new system's advantages do
 * not apply yet (Config.ideologyModifiers). Together those make switching a
 * deliberate mid-game pivot rather than a way to chase whatever the current
 * minute rewards.
 */
export class SetIdeologyExecution implements Execution {
  constructor(
    private player: Player,
    private ideology: Ideology,
  ) {}

  init(mg: Game, ticks: number): void {
    if (this.player.ideology() === this.ideology) {
      return;
    }

    const isFirstChoice = this.player.ideologyChangedTick() < 0;
    if (!isFirstChoice) {
      if (this.player.ideologyTransitionRemainingTicks() > 0) {
        // Still reorganizing from the last change.
        return;
      }
      const cost = mg.config().ideologySwitchCost(this.player);
      if (this.player.gold() < cost) {
        return;
      }
      this.player.removeGold(cost);
    }

    this.player.setIdeology(this.ideology);
    mg.displayMessage(
      "events_display.ideology_changed",
      MessageType.IDEOLOGY_CHANGED,
      this.player.id(),
      undefined,
      { ideology: `ideology.${ideologyKey(this.ideology)}.name` },
    );
  }

  tick(ticks: number): void {
    return;
  }

  isActive(): boolean {
    return false;
  }

  activeDuringSpawnPhase(): boolean {
    // Choosing a government before the first shot is the whole point.
    return true;
  }
}

/** Ideology enum value → its i18n key segment ("Capitalism" → "capitalism"). */
function ideologyKey(ideology: Ideology): string {
  return ideology.toLowerCase();
}
