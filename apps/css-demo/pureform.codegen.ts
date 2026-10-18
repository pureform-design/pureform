// How the demo generates `.pureform/`: the bundler plugin in `vite.config.ts` (on dev and build)
// takes these options, and `pureform generate` (the omni `generate` task) reads them from this
// file's `glue` export. `vite build` prunes the glue to the components the page draws and the
// variant values it selects (the bundler's `prune`, on by default in builds).

import type { PureformPluginOptions } from "@pureform/bundler";
import type { CssCodegenOptions } from "@pureform/css-adapter/codegen";

export const glue = {
    target: "css",
    // Classes as `pf-button__root`, component vars as `--pf-components-button-radius`.
    options: { prefix: "pf", classPrefix: "pf" },
} satisfies PureformPluginOptions<CssCodegenOptions>;
