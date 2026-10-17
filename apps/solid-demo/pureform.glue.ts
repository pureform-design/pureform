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
    // No pruning: the browser suites read this folder's registry (every component) and Panda's
    // stylesheet built from it, and a build would rewrite it with only what the page draws.
    prune: false,
} satisfies PureformPluginOptions<PandaCodegenOptions>;
