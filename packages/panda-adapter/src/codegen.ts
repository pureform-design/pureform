// The Panda adapter's codegen, which `@pureform/generate` loads for the `panda` target: a
// `ClassFactory` module per component over the recipe functions Panda's codegen writes, and
// the `staticCss` entries that keep their variants in Panda's stylesheet.

import type { VarPrefix } from "@pureform/css-lowering";
import { defineCodegen } from "@pureform/generate";

import { factoryModule, recipeFile, tokenVars } from "./codegen/factory";
import { staticCssModule } from "./codegen/static-css";

export { factoryModule, recipeFile, tokenVars } from "./codegen/factory";
export type { FactoryModuleInput } from "./codegen/factory";
export { staticCssModule } from "./codegen/static-css";

/** The Panda target's build options. */
export interface PandaCodegenOptions {
    /** Panda's `outdir`, relative to the app's root or absolute. Default `"styled-system"`. */
    outdir?: string;
    /** The var prefix the preset was compiled with (`compilePreset`'s `prefix`), which names
     *  the instance tokens' CSS vars. Default none. */
    prefix?: VarPrefix;
}

/** The file `panda.config.ts` imports `staticCss` from, relative to `.pureform/`. */
export const STATIC_CSS_FILE = "panda.ts";

/** The Panda adapter's codegen: `web/<name>.ts` per component, and `panda.ts`. */
export const codegen = defineCodegen<PandaCodegenOptions>({
    name: "panda",
    platform: "web",
    codegen: (context) => {
        const outdir = context.options.outdir ?? "styled-system";
        const components = context.components.map((name) => {
            const spec = context.config.components[name]!;
            const path = `web/${name}.ts`;
            return {
                name,
                path,
                contents: factoryModule({
                    name,
                    shape: context.shape(name),
                    slotted: spec.kind === "slotComponent",
                    recipe: context.importPath(
                        path,
                        `${outdir}/recipes/${recipeFile(name)}`,
                    ),
                    vars: tokenVars(name, spec, context.options.prefix),
                }),
            };
        });
        return {
            components,
            files: [
                {
                    path: STATIC_CSS_FILE,
                    contents: staticCssModule(
                        context.components,
                        Object.keys(context.config.themes ?? {}),
                    ),
                },
            ],
        };
    },
});

export default codegen;
