/**
 * Builds the static site that GitHub Pages serves.
 *
 * Battlefront is singleplayer: the simulation runs in the browser and the
 * game server only ever existed to relay multiplayer intents, so the whole
 * game can ship as static files. The normal production build still expects a
 * server to render `index.html` (it leaves EJS placeholders behind and
 * prefixes asset URLs at request time), so this script finishes that job at
 * build time instead:
 *
 *   1. resolve every template placeholder against the built asset manifest
 *   2. point both the bundle and the hashed assets at the Pages sub-path
 *   3. add the files Pages itself needs (.nojekyll, a 404 that serves the app)
 *
 * Run it after `vite build`; `npm run build-pages` does both.
 */

import ejs from "ejs";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const outDir = path.join(root, "static");

/**
 * Sub-path the site is served from, without a trailing slash.
 *
 * GitHub Pages serves a project site at https://<user>.github.io/<repo>/, so
 * every absolute URL in the page has to carry that prefix. Override with
 * PAGES_BASE="" when deploying to a domain root or a user/organisation site.
 */
const base = (process.env.PAGES_BASE ?? "/battlefront").replace(/\/+$/, "");

function read(file: string): string {
  return fs.readFileSync(path.join(outDir, file), "utf8");
}

function assetUrl(manifest: Record<string, string>, assetPath: string): string {
  const hashed = manifest[assetPath];
  return hashed ? `${base}${hashed}` : `${base}/${assetPath}`;
}

function main(): void {
  // Vite's own output, not the source template: the build injects the hashed
  // bundle and stylesheet refs into it and rewrites them to the cdnBaseRaw
  // placeholder, which is exactly what still needs resolving here.
  const template = read("index.html");
  const manifest = JSON.parse(read("asset-manifest.json")) as Record<
    string,
    string
  >;

  // The client reads BOOTSTRAP_CONFIG for these. cdnBase carries the sub-path,
  // which is what makes every manifest lookup resolve under /<repo>/.
  const html = ejs.render(template, {
    gitCommit: JSON.stringify(process.env.GITHUB_SHA ?? "pages"),
    assetManifest: JSON.stringify(manifest),
    cdnBase: JSON.stringify(base),
    gameEnv: JSON.stringify("prod"),
    // The build rewrote its own /assets/ refs to this placeholder so a server
    // could prefix them per request; here it is a constant.
    cdnBaseRaw: base,
    // Singleplayer only: there is no lobby to protect and no account to
    // sign in to, but the client still expects these to be present.
    turnstileSiteKey: JSON.stringify("1x00000000000000000000AA"),
    jwtAudience: JSON.stringify("battlefront.local"),
    instanceId: JSON.stringify("pages"),
    manifestHref: assetUrl(manifest, "manifest.json"),
    faviconHref: assetUrl(manifest, "images/Favicon.svg"),
    gameplayScreenshotUrl: assetUrl(manifest, "images/GameplayScreenshot.png"),
    backgroundImageUrl: assetUrl(manifest, "images/BackgroundImage.png"),
    desktopLogoImageUrl: assetUrl(manifest, "images/BattlefrontLogoDark.svg"),
    mobileLogoImageUrl: assetUrl(manifest, "images/BattlefrontLogoDark.svg"),
    // Server identity: a static site has none. The template guards each of
    // these, and an empty string renders the guard's "omit the line" branch.
    cluster: "",
    instanceLetter: "",
    serverHost: "",
    siteHost: "",
    stripePublishableKey: "",
  });

  // Belt and braces: anything the placeholder rewrite missed is still
  // domain-root relative and would 404 under the sub-path.
  const rebased = html.replace(
    /(\s(?:src|href)=)(["'])\/assets\//g,
    `$1$2${base}/assets/`,
  );

  fs.writeFileSync(path.join(outDir, "index.html"), rebased);
  // Pages has no SPA rewrite; serving the app from 404 keeps deep links working.
  fs.writeFileSync(path.join(outDir, "404.html"), rebased);
  // Without this, Pages' Jekyll pass drops every _assets/ path on the floor.
  fs.writeFileSync(path.join(outDir, ".nojekyll"), "");

  const remaining = (rebased.match(/<%-/g) ?? []).length;
  if (remaining > 0) {
    throw new Error(
      `${remaining} unresolved template placeholders remain in index.html`,
    );
  }

  console.log(
    `pages build ready in static/ (base "${base}", ${Object.keys(manifest).length} hashed assets)`,
  );
}

main();
