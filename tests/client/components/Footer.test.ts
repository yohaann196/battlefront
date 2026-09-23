import version from "resources/version.txt?raw";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ClientEnv } from "../../../src/client/ClientEnv";
import {
  composeVersionDisplay,
  desktopVersion,
} from "../../../src/client/DesktopShell";
import {
  composeGameVersion,
  currentGameVersion,
} from "../../../src/client/GameVersion";

const SHA = "bf739f86c4e1d2a3b5c6d7e8f90123456789abcd";

// version.txt is a build-time placeholder in the repo, so derive the expected
// label from the same source the footer reads rather than hardcoding it. The
// choice itself is covered in tests/client/GameVersion.test.ts.
const gameVersion = `v${version.trim().replace(/^v/, "")}`;

/**
 * The footer's version line, exercised through the two calls it makes rather
 * than by mounting the component: the label is pure composition, and driving
 * it directly keeps the test about the behaviour instead of Lit's render
 * timing. The markup hook itself (.footer-version) is covered by the browser
 * pass, not here.
 */
describe("footer version line", () => {
  beforeEach(() => {
    ClientEnv.reset();
  });

  afterEach(() => {
    window.openfrontDesktop = undefined;
    delete (window as { BOOTSTRAP_CONFIG?: unknown }).BOOTSTRAP_CONFIG;
    ClientEnv.reset();
  });

  it("renders the game version on the web, with no Steam subtext", async () => {
    window.openfrontDesktop = undefined;

    const shellVersion = await desktopVersion();
    expect(shellVersion).toBeNull();
    expect(composeVersionDisplay(currentGameVersion(), shellVersion)).toBe(
      gameVersion,
    );
  });

  it("appends the shell version inside the desktop shell", async () => {
    window.openfrontDesktop = { version: () => Promise.resolve("0.2.0") };

    const shellVersion = await desktopVersion();
    expect(composeVersionDisplay(currentGameVersion(), shellVersion)).toBe(
      `${gameVersion} (Steam v0.2.0)`,
    );
  });

  // With a real BOOTSTRAP_CONFIG in the page and the placeholder still in
  // version.txt, the line must name the commit rather than "vx.xx.xx".
  it("shows the commit rather than the placeholder on an untagged build", () => {
    (window as { BOOTSTRAP_CONFIG?: unknown }).BOOTSTRAP_CONFIG = {
      gameEnv: "prod",
      numWorkers: 1,
      turnstileSiteKey: "1x00000000000000000000AA",
      jwtAudience: "openfront.io",
      instanceId: "test",
      gitCommit: SHA,
    };
    window.openfrontDesktop = undefined;

    expect(currentGameVersion()).toBe(composeGameVersion(version, SHA));
  });

  // The bridge lives in a separate private repo, so the footer must degrade to
  // the game version alone rather than render a broken label.
  it("falls back to the game version when the bridge rejects", async () => {
    window.openfrontDesktop = {
      version: () => Promise.reject(new Error("boom")),
    };

    const shellVersion = await desktopVersion();
    expect(composeVersionDisplay(currentGameVersion(), shellVersion)).toBe(
      gameVersion,
    );
  });
});
