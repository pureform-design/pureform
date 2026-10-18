// How the demo generates `.pureform/`: the bundler plugin in `vite.config.ts` (on dev and
// build) takes these options, and `pureform generate` (the omni `generate` task, before Panda's
// codegen) reads them from this file's `codegen` export. Builds prune (the plugin's default): they
// generate only the components and variant values the app's source uses.

import type { PureformPluginOptions } from "@pureform/bundler";
import type { PandaCodegenOptions } from "@pureform/panda-adapter/codegen";

/** The var prefix the preset names component vars with; `.pureform/`'s factories use it too. */
export const PREFIX = "pf";

export const codegen = {
    target: "panda",
    options: { prefix: PREFIX },
    // The components the demo draws, and the ripple their indication draws with.
    components: ["button", "checkbox", "ripple"],
} satisfies PureformPluginOptions<PandaCodegenOptions>;
