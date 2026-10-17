// How the demo generates `.pureform/`: the bundler plugin in `vite.config.ts` (on dev and build)
// takes these options, and `pureform generate` (the omni `generate` task) reads them from this
// file's `glue` export.

import type { PureformPluginOptions } from "@pureform/bundler";
import type { TailwindCodegenOptions } from "@pureform/tailwind-adapter/codegen";

export const glue = {
    target: "tailwind",
    // Classes as `pf-button__root`, component vars as `--pf-components-button-radius`.
    options: { prefix: "pf", classPrefix: "pf" },
    // The components the page uses: the registry and the stylesheet keep only these.
    components: [
        "text",
        "button",
        "iconButton",
        "media",
        "textField",
        "checkbox",
        "card",
    ],
} satisfies PureformPluginOptions<TailwindCodegenOptions>;
