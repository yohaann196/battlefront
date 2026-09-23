import { html, LitElement } from "lit";
import { customElement, state } from "lit/decorators.js";
import { assetUrl } from "../../core/AssetUrls";
import { UnitType } from "../../core/game/Game";
import { Ideology } from "../../core/game/Ideology";
import { pointsToNextLevel } from "../../core/game/Research";
import { Controller } from "../Controller";
import { renderNumber, renderTroops, translateText } from "../Utils";
import { GameView } from "../view";

/**
 * The national status strip that runs across the top of a battle.
 *
 * OpenFront tells you your gold and your troops; Battlefront is about what
 * kind of state you are running, so the bar leads with the things that
 * actually decide the game — who you are, your doctrine, how far your
 * research has got, what your army can still grow to, and whether the world
 * has sanctioned you. It is one instrument panel, not a row of floating
 * chips.
 */
@customElement("battlefront-command-bar")
export class CommandBar extends LitElement implements Controller {
  public game: GameView;

  @state() private visible = false;
  @state() private nation = "";
  @state() private flag: string | null = null;
  @state() private ideology: Ideology | null = null;
  @state() private inTransition = false;
  @state() private researchLevel = 0;
  @state() private researchPct = 0;
  @state() private researchCapped = false;
  @state() private labs = 0;
  @state() private gold = 0n;
  @state() private income = 0;
  @state() private troops = 0;
  @state() private maxTroops = 0;
  @state() private tiles = 0;
  @state() private sanctionTicks = 0;
  @state() private silos = 0;
  @state() private theatre: string | null = null;

  createRenderRoot() {
    return this;
  }

  init() {}

  tick() {
    const player = this.game?.myPlayer();
    if (!player || !player.isAlive() || this.game.inSpawnPhase()) {
      if (this.visible) this.visible = false;
      return;
    }
    this.visible = true;

    const config = this.game.config();
    this.nation = player.displayName();
    this.flag = player.cosmetics?.flag ?? null;
    this.ideology = player.ideology();
    this.inTransition = player.ideologyTransitionRemainingTicks() > 0;

    this.researchLevel = player.researchLevel();
    this.labs = player.researchLabLevels();
    const next = pointsToNextLevel(
      player.researchPoints(),
      config.maxResearchLevel(),
    );
    this.researchCapped = next === null;
    this.researchPct =
      next === null
        ? 100
        : Math.max(
            0,
            Math.min(
              100,
              Math.floor((player.researchPoints() / next.total) * 100),
            ),
          );

    this.gold = player.gold();
    this.income = Number(config.goldAdditionRate(player)) * 10;
    this.troops = player.troops();
    this.maxTroops = config.maxTroops(player);
    this.tiles = player.numTilesOwned();
    this.sanctionTicks = player.nukePenaltyRemainingTicks();
    this.silos = player.totalUnitLevels(UnitType.MissileSilo);

    const scenario = config.gameConfig().scenario;
    this.theatre =
      scenario === undefined
        ? null
        : translateText(`scenario.${scenario.id}.name`);
  }

  private clock(ticks: number): string {
    const seconds = Math.ceil((ticks * this.game.config().msPerTick()) / 1000);
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  }

  private openGovernment() {
    const panel = document.querySelector("government-panel") as {
      open?: () => void;
    } | null;
    panel?.open?.();
  }

  private renderSanctions() {
    if (this.sanctionTicks <= 0) return "";
    return html`
      <div
        class="bf-sanction flex items-center justify-center gap-3 px-3 py-0.5 text-[0.62rem] font-bold tracking-widest uppercase"
      >
        <span
          >${translateText("nuke.sanctions_banner", {
            time: this.clock(this.sanctionTicks),
          })}</span
        >
        <span class="opacity-80 normal-case tracking-normal font-semibold">
          ${translateText("nuke.sanctions_detail")}
        </span>
      </div>
    `;
  }

  render() {
    if (!this.visible) return html``;
    const troopPct =
      this.maxTroops <= 0
        ? 0
        : Math.min(100, Math.floor((this.troops / this.maxTroops) * 100));
    const doctrine =
      this.ideology === null
        ? "—"
        : translateText(`ideology.${this.ideology.toLowerCase()}.name`);

    return html`
      <div class="bf-cmd w-full pointer-events-auto">
        ${this.renderSanctions()}
        <div class="flex items-stretch h-11 overflow-x-auto">
          <!-- Who you are -->
          <div class="bf-cmd-cell flex-row! items-center gap-2 min-w-[9rem]">
            ${this.flag === null
              ? ""
              : html`<img
                  src=${this.flag.startsWith("/")
                    ? this.flag
                    : assetUrl(`flags/${this.flag}.svg`)}
                  alt=""
                  width="22"
                  height="15"
                  class="shrink-0"
                />`}
            <span class="min-w-0">
              <span class="bf-cmd-k"
                >${this.theatre ?? translateText("battlefront.title")}</span
              >
              <span class="bf-cmd-v">${this.nation}</span>
            </span>
          </div>

          <!-- Doctrine: click to open the government panel -->
          <button
            class="bf-cmd-cell text-left hover:bg-white/5 min-w-[7.5rem]"
            title=${translateText("government.title")}
            @click=${() => this.openGovernment()}
          >
            <span class="bf-cmd-k">${translateText("ideology.title")}</span>
            <span class="bf-cmd-v" data-tone="amber">
              ${doctrine}${this.inTransition ? " *" : ""}
            </span>
          </button>

          <!-- Research -->
          <button
            class="bf-cmd-cell text-left hover:bg-white/5 min-w-[8.5rem]"
            title=${translateText("research.title")}
            @click=${() => this.openGovernment()}
          >
            <span class="bf-cmd-k">
              ${translateText("research.title")} ·
              ${translateText("research.labs", {
                labs: this.labs,
              })}
            </span>
            <span class="bf-cmd-v" data-tone="steel">
              ${this.researchCapped
                ? translateText("research.max")
                : translateText("research.level", {
                    level: this.researchLevel,
                  })}
            </span>
            <span class="bf-meter" data-tone="steel"
              ><i style="width:${this.researchPct}%"></i
            ></span>
          </button>

          <!-- Treasury -->
          <div class="bf-cmd-cell min-w-[7.5rem]">
            <span class="bf-cmd-k"
              >${translateText("battlefront.treasury")}</span
            >
            <span class="bf-cmd-v" data-tone="amber"
              >${renderNumber(this.gold)}</span
            >
            <span class="bf-cmd-k">+${renderNumber(this.income)}/s</span>
          </div>

          <!-- Army -->
          <div class="bf-cmd-cell min-w-[8rem]">
            <span class="bf-cmd-k">${translateText("battlefront.army")}</span>
            <span class="bf-cmd-v">
              ${renderTroops(this.troops)} / ${renderTroops(this.maxTroops)}
            </span>
            <span class="bf-meter"><i style="width:${troopPct}%"></i></span>
          </div>

          <!-- Territory -->
          <div class="bf-cmd-cell min-w-[6rem]">
            <span class="bf-cmd-k"
              >${translateText("battlefront.territory")}</span
            >
            <span class="bf-cmd-v">${renderNumber(this.tiles)}</span>
          </div>

          <!-- Strategic forces: only once there is something to report -->
          ${this.silos > 0
            ? html`<div class="bf-cmd-cell min-w-[6.5rem]">
                <span class="bf-cmd-k"
                  >${translateText("battlefront.strategic")}</span
                >
                <span class="bf-cmd-v" data-tone="red"
                  >${translateText("battlefront.silos", {
                    count: this.silos,
                  })}</span
                >
              </div>`
            : ""}
        </div>
      </div>
    `;
  }
}
