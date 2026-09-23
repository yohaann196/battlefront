import { html, LitElement } from "lit";
import { customElement, state } from "lit/decorators.js";
import { composeVersionDisplay, desktopVersion } from "../DesktopShell";
import { currentGameVersion } from "../GameVersion";
import "../LangSelector";
import { translateText } from "../Utils";

/**
 * The footer.
 *
 * Battlefront is a derivative of OpenFront, which is AGPL-3.0: the upstream
 * copyright notice has to stay somewhere reasonably visible, and this is it.
 * Removing that line would be a licence violation, not a branding decision.
 */
@customElement("page-footer")
export class BattlefrontFooter extends LitElement {
  private readonly gameVersion = currentGameVersion();

  @state() private versionLabel = this.gameVersion;

  createRenderRoot() {
    return this;
  }

  connectedCallback() {
    super.connectedCallback();
    void desktopVersion().then((shellVersion) => {
      this.versionLabel = composeVersionDisplay(this.gameVersion, shellVersion);
    });
  }

  render() {
    return html`
      <footer
        class="[.in-game_&]:hidden w-full border-t bf-rule shrink-0 relative z-50"
        style="background: rgba(11, 14, 19, 0.92)"
      >
        <div
          class="max-w-6xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-[0.7rem]"
          style="color: var(--bf-text-faint)"
        >
          <span class="bf-label">${translateText("battlefront.title")}</span>
          <!-- AGPL-3.0 attribution: required, keep visible. -->
          <span class="text-center">
            ${translateText("battlefront.built_on")} —
            <a
              href="https://github.com/openfrontio/OpenFrontIO"
              target="_blank"
              rel="noopener noreferrer"
              class="underline hover:no-underline"
              >OpenFront</a
            >
            © OpenFront and Contributors, AGPL-3.0
          </span>
          <div class="flex items-center gap-3">
            <!-- AGPL: users are entitled to the source, so link it plainly. -->
            <a
              href="https://github.com/openfrontio/OpenFrontIO"
              target="_blank"
              rel="noopener noreferrer"
              class="hover:underline"
              >${translateText("main.github")}</a
            >
            <a
              href="https://openfront.wiki/"
              target="_blank"
              rel="noopener noreferrer"
              class="hover:underline"
              >${translateText("main.wiki")}</a
            >
          </div>
          <div class="flex items-center gap-3">
            <!-- Single instance: translateText() resolves the active language
                 via document.querySelector("lang-selector"), so a second one
                 would shadow it, and none at all leaves every string as its
                 raw key. -->
            <lang-selector></lang-selector>
            <span class="footer-version tabular-nums"
              >${this.versionLabel}</span
            >
          </div>
        </div>
      </footer>
    `;
  }
}
