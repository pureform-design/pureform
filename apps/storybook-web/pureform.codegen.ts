// How the app generates `.pureform/`: the bundler plugin in `.storybook/main.ts` takes these
// options, and `pureform generate` reads them from this file's `codegen` export. Two targets: the
// Panda registry Solid and React draw with, and the React Native one `src/native/` draws with.

import { anatomy } from "@pureform/anatomy";
import type { PureformPluginOptions } from "@pureform/bundler";
import type { PandaCodegenOptions } from "@pureform/panda-adapter/codegen";
import type { RnCodegenOptions } from "@pureform/rn-adapter/codegen";

/** The var prefix the preset names component vars with; `.pureform/`'s factories use it too. */
export const PREFIX = "pf";

/** Every component, by its anatomy name: the stories draw each one with a case, and both
 *  targets take this list. */
export const COMPONENTS = Object.keys(anatomy);

export const codegen = {
    targets: {
        web: {
            target: "panda",
            options: { prefix: PREFIX },
            components: COMPONENTS,
        },
        native: {
            target: "native",
            // React Native Web passes font families to CSS, so the whole stack applies.
            options: { fontStack: "all" },
            components: COMPONENTS,
            // The whole Vite build maps `react-native` to React Native Web, so the native
            // renderer's files are named rather than found by the alias.
            include: ["src/native"],
        },
    },
    // Stories pick variants from controls at run time, which pruning can't see.
    prune: false,
} satisfies PureformPluginOptions<PandaCodegenOptions | RnCodegenOptions>;
