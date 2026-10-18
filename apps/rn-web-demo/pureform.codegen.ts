// How the demo generates `.pureform/`: the bundler plugin in `vite.config.ts` (on dev and build)
// takes these options, and `pureform generate` (the omni `generate` task) reads them from this
// file's `glue` export. Each component's module is a `StyleFactory` over its precomputed styles.

import type { PureformPluginOptions } from "@pureform/bundler";
import type { RnCodegenOptions } from "@pureform/rn-adapter/codegen";

import { COMPONENTS } from "./pureform.config";

export const glue = {
    target: "native",
    // React Native Web passes font families to CSS, so the whole stack applies.
    options: { fontStack: "all" },
    components: COMPONENTS,
    // No pruning: the page switches to runtime styles for every component it draws, and a
    // pruned build would draw differently from the dev server.
    prune: false,
} satisfies PureformPluginOptions<RnCodegenOptions>;
