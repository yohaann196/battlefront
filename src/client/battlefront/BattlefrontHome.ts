import { html, LitElement } from "lit";
import { customElement, state } from "lit/decorators.js";
import { assetUrl } from "../../core/AssetUrls";
import { Difficulty, GameMapType } from "../../core/game/Game";
import { Ideology, IDEOLOGY_ORDER } from "../../core/game/Ideology";
import {
  playableFactions,
  SCENARIO_ORDER,
  ScenarioFaction,
  ScenarioId,
  SCENARIOS,
} from "../../core/game/Scenarios";
import type { SinglePlayerModal } from "../SinglePlayerModal";
import { terrainMapFileLoader } from "../TerrainMapFileLoader";
import "../UsernameInput";
import { translateText } from "../Utils";

/**
 * Battlefront's landing screen.
 *
 * The game is a singleplayer strategy sandbox, so the front page is the thing
 * you actually choose — a theatre, a power to command, and the doctrine you
 * run it under — rather than a lobby browser. Everything here feeds the same
 * launch path the full setup panel uses (SinglePlayerModal.launch), so this
 * stays a launcher and not a second copy of the game-start logic.
 */
@customElement("battlefront-home")
export class BattlefrontHome extends LitElement {
  @state() private scenario: ScenarioId | null = SCENARIO_ORDER[0];
  @state() private faction: string | null = null;
  @state() private ideology: Ideology | null = null;
  @state() private difficulty: Difficulty = Difficulty.Medium;
  @state() private flags: Record<string, string> = {};
  @state() private launching = false;

  createRenderRoot() {
    return this;
  }

  connectedCallback() {
    super.connectedCallback();
    if (this.scenario !== null) void this.selectScenario(this.scenario);
  }

  private get modal(): SinglePlayerModal | null {
    return document.querySelector("single-player-modal");
  }

  private async selectScenario(id: ScenarioId) {
    this.scenario = id;
    const scenario = SCENARIOS[id];
    const first = playableFactions(scenario)[0] ?? null;
    this.faction = first?.key ?? null;
    // The faction's historical doctrine is the default; the player can
    // override it below without losing the rest of the setup.
    this.ideology = first?.ideology ?? null;
    this.flags = {};
    await this.loadFlags(id);
  }

  /** Resolves each faction's flag from the theatre map's own manifest. */
  private async loadFlags(id: ScenarioId) {
    const scenario = SCENARIOS[id];
    try {
      const manifest = await terrainMapFileLoader
        .getMapData(scenario.map)
        .manifest();
      const byName = new Map(
        (manifest.nations ?? []).map((n) => [n.name, n.flag]),
      );
      const flags: Record<string, string> = {};
      for (const f of playableFactions(scenario)) {
        const flag =
          f.flag ??
          (f.baseNation === undefined ? undefined : byName.get(f.baseNation));
        if (flag !== undefined) flags[f.key] = flag;
      }
      // A later selection may have landed while this was loading.
      if (this.scenario === id) this.flags = flags;
    } catch {
      // Flags are decoration; never let them block a launch.
    }
  }

  private selectFaction(f: ScenarioFaction) {
    this.faction = f.key;
    this.ideology = f.ideology;
  }

  private async deploy() {
    const modal = this.modal;
    if (modal === null || this.scenario === null || this.faction === null) {
      return;
    }
    this.launching = true;
    try {
      await modal.launch({
        scenarioId: this.scenario,
        faction: this.faction,
        ideology: this.ideology ?? undefined,
        difficulty: this.difficulty,
      });
    } finally {
      this.launching = false;
    }
  }

  /** Opens the full setup panel for a game outside the scripted theatres. */
  private customGame() {
    const modal = this.modal;
    if (modal === null) return;
    void modal.launch({
      scenarioId: null,
      map: GameMapType.World,
      difficulty: this.difficulty,
    });
  }

  private openSetup() {
    this.modal?.open();
  }

  private renderScenarios() {
    return html`
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        ${SCENARIO_ORDER.map((id) => {
          const scenario = SCENARIOS[id];
          const selected = this.scenario === id;
          return html`
            <button
              class="bf-card p-4 pl-5"
              data-selected=${selected}
              @click=${() => this.selectScenario(id)}
            >
              <div class="flex items-start justify-between gap-2">
                <span class="bf-label text-sm" style="color: var(--bf-text)"
                  >${translateText(`scenario.${id}.name`)}</span
                >
                <span class="bf-tag shrink-0"
                  >${scenario.factions.length}
                  ${translateText("battlefront.powers")}</span
                >
              </div>
              <p
                class="text-xs mt-1.5 leading-snug"
                style="color: var(--bf-text-dim)"
              >
                ${translateText(`scenario.${id}.desc`)}
              </p>
              <div class="flex flex-wrap gap-1.5 mt-2.5">
                <span class="bf-tag"
                  >${translateText("battlefront.tech_ceiling", {
                    level: scenario.maxResearchLevel,
                  })}</span
                >
                ${scenario.disabledUnits.length > 0
                  ? html`<span class="bf-tag" data-tone="red"
                      >${translateText("battlefront.era_restricted")}</span
                    >`
                  : ""}
              </div>
            </button>
          `;
        })}
      </div>
    `;
  }

  private renderFactions() {
    if (this.scenario === null) return "";
    const scenario = SCENARIOS[this.scenario];
    return html`
      <div
        class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2"
      >
        ${playableFactions(scenario).map((f) => {
          const flag = f.flag ?? this.flags[f.key];
          const selected = this.faction === f.key;
          return html`
            <button
              class="bf-card px-2.5 py-2 pl-3.5 flex items-center gap-2"
              data-selected=${selected}
              @click=${() => this.selectFaction(f)}
            >
              ${flag === undefined
                ? ""
                : html`<img
                    src=${assetUrl(`flags/${flag}.svg`)}
                    alt=""
                    width="22"
                    height="15"
                    class="shrink-0"
                  />`}
              <span class="min-w-0">
                <span
                  class="block text-xs font-bold truncate"
                  style="color: var(--bf-text)"
                  >${f.name}</span
                >
                <span
                  class="block text-[0.625rem] truncate"
                  style="color: var(--bf-text-faint)"
                  >${translateText(
                    `ideology.${f.ideology.toLowerCase()}.name`,
                  )}</span
                >
              </span>
            </button>
          `;
        })}
      </div>
    `;
  }

  private renderDoctrines() {
    return html`
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-2">
        ${IDEOLOGY_ORDER.map((ideology) => {
          const key = ideology.toLowerCase();
          const selected = this.ideology === ideology;
          return html`
            <button
              class="bf-card p-3 pl-4"
              data-selected=${selected}
              @click=${() => (this.ideology = ideology)}
            >
              <span class="bf-label text-xs" style="color: var(--bf-text)"
                >${translateText(`ideology.${key}.name`)}</span
              >
              <span
                class="block text-[0.65rem] mt-1 leading-snug"
                style="color: #7fbf8a"
                >${translateText(`ideology.${key}.buffs`)}</span
              >
              <span
                class="block text-[0.65rem] leading-snug"
                style="color: #c9736f"
                >${translateText(`ideology.${key}.debuffs`)}</span
              >
            </button>
          `;
        })}
      </div>
    `;
  }

  private renderDifficulty() {
    const levels: [Difficulty, string][] = [
      [Difficulty.Easy, "difficulty.easy"],
      [Difficulty.Medium, "difficulty.medium"],
      [Difficulty.Hard, "difficulty.hard"],
      [Difficulty.Impossible, "difficulty.impossible"],
    ];
    return html`
      <div class="flex flex-wrap gap-2">
        ${levels.map(
          ([value, key]) => html`
            <button
              class="bf-card px-3 py-1.5 pl-4"
              data-selected=${this.difficulty === value}
              @click=${() => (this.difficulty = value)}
            >
              <span class="bf-label text-[0.7rem]" style="color: var(--bf-text)"
                >${translateText(key)}</span
              >
            </button>
          `,
        )}
      </div>
    `;
  }

  private sectionHeading(numeral: string, key: string) {
    return html`
      <div class="flex items-center gap-3 mb-3">
        <span
          class="bf-label text-[0.7rem] tabular-nums"
          style="color: var(--bf-amber)"
          >${numeral}</span
        >
        <span class="bf-label text-[0.7rem]" style="color: var(--bf-text-dim)"
          >${translateText(key)}</span
        >
        <span class="flex-1 border-t bf-rule"></span>
      </div>
    `;
  }

  render() {
    const faction =
      this.scenario === null || this.faction === null
        ? null
        : (playableFactions(SCENARIOS[this.scenario]).find(
            (f) => f.key === this.faction,
          ) ?? null);

    return html`
      <div class="bf-grid-field min-h-dvh flex flex-col">
        <div class="flex-1 w-full max-w-6xl mx-auto px-4 py-8 lg:py-12">
          <header class="mb-7">
            <h1
              class="bf-label text-3xl lg:text-4xl"
              style="color: var(--bf-text)"
            >
              ${translateText("battlefront.title")}
            </h1>
            <p class="text-sm mt-1" style="color: var(--bf-text-dim)">
              ${translateText("battlefront.tagline")}
            </p>
          </header>

          <div class="bf-panel p-3 mb-8 flex items-center gap-3">
            <span
              class="bf-label text-[0.65rem] shrink-0"
              style="color: var(--bf-text-faint)"
              >${translateText("battlefront.commander")}</span
            >
            <username-input class="flex-1 min-w-0"></username-input>
          </div>

          <section class="mb-8">
            ${this.sectionHeading("01", "battlefront.select_theatre")}
            ${this.renderScenarios()}
          </section>

          <section class="mb-8">
            ${this.sectionHeading("02", "battlefront.select_power")}
            ${this.renderFactions()}
          </section>

          <section class="mb-8">
            ${this.sectionHeading("03", "battlefront.select_doctrine")}
            ${this.renderDoctrines()}
          </section>

          <section class="mb-9">
            ${this.sectionHeading("04", "battlefront.select_opposition")}
            ${this.renderDifficulty()}
          </section>

          <!-- Launch bar: the committed setup, then the single action. -->
          <div
            class="bf-panel p-4 flex flex-col lg:flex-row lg:items-center gap-4"
          >
            <div class="flex-1 min-w-0">
              <span
                class="bf-label text-[0.65rem]"
                style="color: var(--bf-text-faint)"
                >${translateText("battlefront.orders")}</span
              >
              <p class="text-sm mt-1" style="color: var(--bf-text)">
                ${faction === null
                  ? translateText("battlefront.no_power")
                  : translateText("battlefront.orders_summary", {
                      faction: faction.name,
                      theatre:
                        this.scenario === null
                          ? ""
                          : translateText(`scenario.${this.scenario}.name`),
                      doctrine: translateText(
                        `ideology.${(this.ideology ?? faction.ideology).toLowerCase()}.name`,
                      ),
                    })}
              </p>
            </div>
            <button
              class="bf-cta px-8 py-3 text-sm shrink-0"
              ?disabled=${faction === null || this.launching}
              @click=${() => this.deploy()}
            >
              ${this.launching
                ? translateText("battlefront.deploying")
                : translateText("battlefront.deploy")}
            </button>
          </div>

          <div class="flex flex-wrap gap-2 mt-4">
            <button
              class="bf-btn px-4 py-2 text-xs"
              @click=${() => this.customGame()}
            >
              ${translateText("battlefront.custom_game")}
            </button>
            <button
              class="bf-btn px-4 py-2 text-xs"
              @click=${() => this.openSetup()}
            >
              ${translateText("battlefront.advanced_setup")}
            </button>
          </div>
        </div>
      </div>
    `;
  }
}
