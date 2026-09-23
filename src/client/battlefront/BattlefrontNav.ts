import { html, LitElement } from "lit";
import { customElement } from "lit/decorators.js";
import { translateText } from "../Utils";

/**
 * The top bar.
 *
 * Battlefront has no account, store, ladder or clans, so the bar carries the
 * wordmark and the three things a singleplayer game actually needs: settings,
 * help and language.
 */
@customElement("battlefront-nav")
export class BattlefrontNav extends LitElement {
  createRenderRoot() {
    return this;
  }

  private openPage(id: string) {
    const show = (window as unknown as { showPage?: (p: string) => void })
      .showPage;
    show?.(id);
  }

  render() {
    const items: [string, string][] = [
      ["page-settings", "battlefront.settings"],
      ["page-help", "battlefront.help"],
      ["page-language", "battlefront.language"],
    ];
    return html`
      <nav
        class="[.in-game_&]:hidden w-full border-b bf-rule"
        style="background: rgba(11, 14, 19, 0.92); backdrop-filter: blur(8px)"
      >
        <div
          class="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4"
        >
          <button
            class="flex items-baseline gap-2 min-w-0"
            @click=${() => this.openPage("page-play")}
          >
            <span
              class="bf-label text-lg leading-none"
              style="color: var(--bf-text)"
              >${translateText("battlefront.title")}</span
            >
            <span
              class="hidden sm:inline text-[0.6rem] bf-label"
              style="color: var(--bf-amber)"
              >SP</span
            >
          </button>
          <div class="flex items-center gap-1">
            ${items.map(
              ([id, key]) => html`
                <button
                  class="bf-btn px-3 py-1.5 text-[0.7rem] border-transparent"
                  @click=${() => this.openPage(id)}
                >
                  ${translateText(key)}
                </button>
              `,
            )}
          </div>
        </div>
      </nav>
    `;
  }
}
