// The Panda adapter's codegen, which `@pureform/generate` loads for the `panda` target: a
// `ClassFactory` module per component over the recipe functions Panda's codegen writes, and
// the `staticCss` entries that keep their variants in Panda's stylesheet.

import { instanceSpringVars } from "@pureform/css-lowering";
import type { VarPrefix } from "@pureform/css-lowering";
import { defineCodegen } from "@pureform/generate";
import type { CodegenContext } from "@pureform/generate";

import { factoryModule, recipeFile, tokenVars } from "./codegen/factory";
import { staticCssModule } from "./codegen/static-css";
import type { StaticCssRule } from "./codegen/static-css";
import { THEME_ATTRIBUTE } from "./options";

export { factoryModule, recipeFile, tokenVars } from "./codegen/factory";
export type { FactoryModuleInput } from "./codegen/factory";
export { staticCssModule } from "./codegen/static-css";
export type { StaticCssRule } from "./codegen/static-css";

/** The Panda target's build options. */
export interface PandaCodegenOptions {
    /** Panda's `outdir`, relative to the app's root or absolute. Default `"styled-system"`. */
    outdir?: string;
    /** The var prefix the preset was compiled with (`compilePreset`'s `prefix`), which names
     *  the instance tokens' CSS vars. Default none. */
    prefix?: VarPrefix;
    /** Panda's own `prefix`, when the app's Panda config sets one: it names the token vars,
     *  which providers write for token overrides and runtime themes. Default none. */
    tokenPrefix?: string;
}

/** The file `panda.config.ts` imports `staticCss` from, relative to `.pureform/`. */
export const STATIC_CSS_FILE = "panda.ts";

// A pruned build's narrowed components: each group's values in use, or all of them.
const staticCssRules = (
    context: CodegenContext<PandaCodegenOptions>,
): Record<string, StaticCssRule> =>
    Object.fromEntries(
        Object.entries(context.variants ?? {}).map(([name, used]) => [
            name,
            Object.fromEntries(
                Object.keys(context.shape(name).variants).map((group) => [
                    group,
                    used[group] ?? ["*"],
                ]),
            ),
        ]),
    );

/** The Panda adapter's codegen: `web/<name>.ts` per component, and `panda.ts`. The registry
 *  scopes named themes with Panda's own `data-panda-theme`, and names vars with `prefix`. */
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
                    springs: instanceSpringVars(
                        context.shape(name).springs,
                        context.options.tokenPrefix,
                    ),
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
                        staticCssRules(context),
                    ),
                },
            ],
            themeAttribute: THEME_ATTRIBUTE,
            vars: {
                prefix: context.options.prefix,
                tokenPrefix: context.options.tokenPrefix,
            },
        };
    },
});

export default codegen;
