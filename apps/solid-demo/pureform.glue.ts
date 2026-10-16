// How the demo generates `.pureform/`: the bundler plugin in `vite.config.ts` (on dev and
// build) and `scripts/generate.ts` (the omni `generate` task, before Panda's codegen) both
// take these options.

import type { PureformPluginOptions } from "@pureform/bundler";
import type { PandaCodegenOptions } from "@pureform/panda-adapter/codegen";

/** The var prefix the preset names component vars with; `.pureform/`'s factories use it too. */
export const PREFIX = "pf";

export const glue = {
    target: "panda",
    options: { prefix: PREFIX },
} satisfies PureformPluginOptions<PandaCodegenOptions>;
