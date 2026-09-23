import { html, LitElement } from "lit";
import { customElement, state } from "lit/decorators.js";
import { EventBus } from "../../../core/EventBus";
import { Gold } from "../../../core/game/Game";
import {
  effectiveModifiers,
  Ideology,
  IDEOLOGY_ORDER,
} from "../../../core/game/Ideology";
import {
  pointsToNextLevel,
  RESEARCH_LEVELS,
} from "../../../core/game/Research";
import { Controller } from "../../Controller";
import { showInGameConfirm } from "../../InGameModal";
import { SendSetIdeologyIntentEvent } from "../../Transport";
import { renderNumber, translateText } from "../../Utils";
import { GameView } from "../../view";

/**
 * The player's government and research at a glance, and the one place they
 * can change the former.
 *
 * Switching is a major, expensive decision, so this panel puts the price and
 * the reorganization penalty in front of the player before they commit
 * rather than letting them discover it afterwards.
 */
@customElement("government-panel")
export class GovernmentPanel extends LitElement implements Controller {
  public game: GameView;
  public eventBus: EventBus;

  @state()
  private isVisible = false;

  /** Bumped every tick so live figures (cost, progress) stay current. */
  @state()
  private revision = 0;

  init() {}

  tick() {
    if (this.isVisible) {
      this.revision++;
    }
  }

  createRenderRoot() {
    return this;
  }

  open() {
    this.isVisible = true;
  }

  close() {
    this.isVisible = false;
  }

  private async switchTo(ideology: Ideology, cost: Gold, free: boolean) {
    const minutes = Math.ceil(
      (this.game.config().ideologyTransitionDuration() *
        this.game.config().msPerTick()) /
        60_000,
    );
    if (!free) {
      const confirmed = await showInGameConfirm(
        translateText("ideology.confirm_switch", {
          ideology: translateText(`ideology.${ideology.toLowerCase()}.name`),
          cost: renderNumber(cost),
          minutes,
        }),
        { heading: translateText("ideology.switch") },
      );
      if (!confirmed) return;
    }
    this.eventBus.emit(new SendSetIdeologyIntentEvent(ideology));
    this.close();
  }

  private renderIdeologies() {
    const player = this.game.myPlayer();
    if (player === null) return "";
    const config = this.game.config();
    const current = player.ideology();
    const free = !player.hasChosenIdeology();
    const cost = config.ideologySwitchCost(player);
    const transition = player.ideologyTransitionRemainingTicks();
    const affordable = free || player.gold() >= cost;

    return html`
      <div class="flex flex-col gap-2">
        ${transition > 0
          ? html`<div
              class="text-xs text-amber-300 bg-amber-900/30 border border-amber-500/40 rounded px-2 py-1"
            >
              ${translateText("ideology.transition", {
                seconds: Math.ceil(
                  (transition * config.msPerTick()) / 1000,
                ).toString(),
              })}
              — ${translateText("ideology.transition_note")}
            </div>`
          : ""}
        ${IDEOLOGY_ORDER.map((ideology) => {
          const key = ideology.toLowerCase();
          const isCurrent = ideology === current;
          const mods = effectiveModifiers(
            ideology,
            isCurrent && transition > 0,
          );
          return html`
            <div
              class="rounded-lg border p-2 ${isCurrent
                ? "border-purple-400 bg-purple-400/10"
                : "border-slate-600 bg-slate-700/30"}"
            >
              <div class="flex items-center justify-between gap-2">
                <span class="font-bold text-white"
                  >${translateText(`ideology.${key}.name`)}</span
                >
                ${isCurrent
                  ? html`<span class="text-xs text-purple-300 font-semibold"
                      >${translateText("ideology.current")}</span
                    >`
                  : html`<button
                      class="text-xs font-bold rounded px-2 py-1 ${affordable &&
                      transition <= 0
                        ? "bg-purple-500 hover:bg-purple-400 text-white"
                        : "bg-slate-600 text-slate-400 cursor-not-allowed"}"
                      ?disabled=${!affordable || transition > 0}
                      @click=${() => this.switchTo(ideology, cost, free)}
                    >
                      ${free
                        ? translateText("ideology.switch_free")
                        : translateText("ideology.switch_cost", {
                            cost: renderNumber(cost),
                          })}
                    </button>`}
              </div>
              <div class="text-xs text-slate-300 mt-0.5">
                ${translateText(`ideology.${key}.desc`)}
              </div>
              <div class="text-[0.7rem] text-green-300 mt-1">
                ${translateText(`ideology.${key}.buffs`)}
              </div>
              <div class="text-[0.7rem] text-red-300">
                ${translateText(`ideology.${key}.debuffs`)}
              </div>
              ${isCurrent
                ? html`<div
                    class="text-[0.7rem] text-slate-400 mt-1 tabular-nums"
                  >
                    ${translateText("government.economy")}:
                    ×${mods.goldRate.toFixed(2)} ·
                    ${translateText("government.military")}:
                    ×${mods.attack.toFixed(2)}
                  </div>`
                : ""}
            </div>
          `;
        })}
      </div>
    `;
  }

  private renderResearch() {
    const player = this.game.myPlayer();
    if (player === null) return "";
    const config = this.game.config();
    const level = player.researchLevel();
    const labs = player.researchLabLevels();
    const next = pointsToNextLevel(
      player.researchPoints(),
      config.maxResearchLevel(),
    );
    const perSecond = config.researchPointsPerTick(player) * 10;

    return html`
      <div class="flex flex-col gap-1">
        <div class="flex items-center justify-between text-xs text-slate-300">
          <span
            >${translateText("research.level", { level })} ·
            ${translateText("research.labs", { labs })}</span
          >
          <span class="tabular-nums"
            >${translateText("research.rate", {
              rate: perSecond.toFixed(1),
            })}</span
          >
        </div>
        ${labs === 0
          ? html`<div class="text-xs text-amber-300">
              ${translateText("research.no_labs")}
            </div>`
          : ""}
        ${next === null
          ? html`<div class="text-xs text-sky-300">
              ${translateText("research.max")}
            </div>`
          : html`<div class="text-xs text-slate-400 tabular-nums">
              ${translateText("research.progress", {
                points: Math.floor(player.researchPoints()),
                total: next.total,
              })}
            </div>`}
        <div class="flex flex-col gap-1 mt-1">
          ${RESEARCH_LEVELS.filter(
            (entry) => entry.level <= config.maxResearchLevel(),
          ).map((entry) => {
            const done = level >= entry.level;
            return html`
              <div
                class="flex items-start gap-2 rounded px-2 py-1 ${done
                  ? "bg-sky-500/10 border border-sky-500/40"
                  : "bg-slate-700/30 border border-slate-600"}"
              >
                <span
                  class="text-xs font-bold tabular-nums ${done
                    ? "text-sky-300"
                    : "text-slate-500"}"
                  >${translateText("research.level_short", {
                    level: entry.level,
                  })}</span
                >
                <div class="flex-1">
                  <div
                    class="text-xs font-semibold ${done
                      ? "text-white"
                      : "text-slate-400"}"
                  >
                    ${translateText(`research.level_${entry.key}.name`)}
                  </div>
                  <div class="text-[0.7rem] text-slate-400">
                    ${translateText(`research.level_${entry.key}.desc`)}
                  </div>
                </div>
                <span class="text-[0.7rem] text-slate-500 tabular-nums">
                  ${done
                    ? translateText("research.unlocked")
                    : renderNumber(entry.points)}
                </span>
              </div>
            `;
          })}
        </div>
      </div>
    `;
  }

  render() {
    if (!this.isVisible || this.game?.myPlayer() === null) {
      return html``;
    }
    return html`
      <div
        class="fixed inset-0 bg-black/60 backdrop-blur-xs z-2000 flex items-center justify-center p-4"
        @click=${(e: MouseEvent) => {
          if (e.target === e.currentTarget) this.close();
        }}
        @contextmenu=${(e: Event) => e.preventDefault()}
      >
        <div
          class="bg-slate-800 border border-slate-600 rounded-lg max-w-md w-full max-h-[80vh] overflow-y-auto"
        >
          <div
            class="flex items-center justify-between p-4 border-b border-slate-600"
          >
            <h2 class="text-xl font-semibold text-white">
              ${translateText("government.title")}
            </h2>
            <button
              class="text-slate-400 hover:text-white text-2xl font-bold leading-none"
              @click=${() => this.close()}
            >
              ×
            </button>
          </div>
          <div class="p-4 flex flex-col gap-4">
            <div>
              <h3
                class="text-sm font-bold text-slate-300 uppercase tracking-wide mb-2"
              >
                ${translateText("ideology.title")}
              </h3>
              ${this.renderIdeologies()}
            </div>
            <div>
              <h3
                class="text-sm font-bold text-slate-300 uppercase tracking-wide mb-2"
              >
                ${translateText("research.title")}
              </h3>
              ${this.renderResearch()}
            </div>
          </div>
        </div>
      </div>
    `;
  }
}
