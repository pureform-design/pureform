// The Tailwind adapter's codegen, which `@pureform/generate` loads for the `tailwind` target:
// the CSS adapter's `ClassFactory` modules, since the Tailwind stylesheet keeps its class
// names, and that stylesheet for those components. The bundler plugin (`@pureform/bundler`) and
// `pureform generate` run it.
//
// Tailwind keeps every rule of the components layer whether or not its scanner sees the
// classes (only utilities are generated from what it sees), so the factories' classes need no
// `@source inline(...)`.

import { themeAttributeOf } from "@pureform/css-adapter";
import {
    STYLESHEET_FILE,
    componentModules,
    subsetConfig,
} from "@pureform/css-adapter/codegen";
import { defineCodegen } from "@pureform/generate";

import { compileTailwind } from "./tailwind";
import type { TailwindOptions } from "./tailwind";

export { STYLESHEET_FILE } from "@pureform/css-adapter/codegen";

/** The Tailwind target's build options: the stylesheet's (`compileTailwind`'s). `classPrefix`
 *  names the classes and `prefix` the instance tokens' vars, in the factories too. */
export type TailwindCodegenOptions = TailwindOptions;

/** The Tailwind adapter's codegen: `web/<name>.ts` per component, and `styles.css`, the
 *  Tailwind stylesheet for them, which the app imports after `tailwindcss`. The registry scopes
 *  named themes with `themeAttribute`, the attribute the `theme-<name>` variants match. */
export const codegen = defineCodegen<TailwindCodegenOptions>({
    name: "tailwind",
    platform: "web",
    codegen: (context) => ({
        components: componentModules(context),
        files: [
            {
                path: STYLESHEET_FILE,
                contents: compileTailwind(
                    subsetConfig(context.config, context.components),
                    context.options,
                ),
            },
        ],
        themeAttribute: themeAttributeOf(context.options),
    }),
});

export default codegen;
