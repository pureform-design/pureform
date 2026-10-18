// How `pureform generate` (the omni `generate` task, before Panda's codegen) writes `.pureform/`:
// it reads these options from this file's `glue` export.

import type { PureformPluginOptions } from "@pureform/bundler";
import type { PandaCodegenOptions } from "@pureform/panda-adapter/codegen";

/** The var prefix the preset names component vars with; `.pureform/`'s factories use it too. */
export const PREFIX = "pf";

export const glue = {
    target: "panda",
    options: { prefix: PREFIX },
} satisfies PureformPluginOptions<PandaCodegenOptions>;
