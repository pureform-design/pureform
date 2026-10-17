// How the demo generates `.pureform/`: the bundler plugin in `vite.config.ts` (on dev and
// build) takes these options, and `pureform generate` (the omni `generate` task, before Panda's
// codegen) reads them from this file's `glue` export.

import type { PureformPluginOptions } from "@pureform/bundler";
import type { PandaCodegenOptions } from "@pureform/panda-adapter/codegen";

/** The var prefix the preset names component vars with; `.pureform/`'s factories use it too. */
export const PREFIX = "pf";

export const glue = {
    target: "panda",
    options: { prefix: PREFIX },
    // No pruning: most of the pages call Panda's recipes (`$recipes`) with variants picked at run
    // time, which the plugin's scan doesn't read, so a pruned build would keep only the button,
    // checkbox, and ripple, and `staticCss` would lose the rest.
    prune: false,
} satisfies PureformPluginOptions<PandaCodegenOptions>;
