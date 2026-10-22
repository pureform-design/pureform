// How the app generates `.pureform/`, the Panda registry Solid and React draw with: the bundler
// plugin in `.storybook/main.ts` takes these options, and `pureform generate` reads them from
// this file's `codegen` export. React Native draws with rn-adapter's runtime styles instead.

import type { PureformPluginOptions } from "@pureform/bundler";
import type { PandaCodegenOptions } from "@pureform/panda-adapter/codegen";

/** The var prefix the preset names component vars with; `.pureform/`'s factories use it too. */
export const PREFIX = "pf";

/** The components the stories draw (by their anatomy names), and the ripple their indication
 *  draws with. Both registries, Panda's and React Native's runtime one, take this list. */
export const COMPONENTS = [
    "button",
    "switchControl",
    "textField",
    "supportingText",
    "ripple",
];

export const codegen = {
    target: "panda",
    options: { prefix: PREFIX },
    components: COMPONENTS,
    // Stories pick variants from controls at run time, which pruning can't see.
    prune: false,
} satisfies PureformPluginOptions<PandaCodegenOptions>;
