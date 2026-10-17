// The CSS adapter's codegen, which `@pureform/generate` loads for the `css` target: a
// `ClassFactory` module per component with its classes written out, and the stylesheet for
// those components. It succeeds the Vite plugin's `virtual:pureform/components`.

import type { CoreConfig } from "@pureform/core/types";
import { defineCodegen } from "@pureform/generate";
import type { CodegenContext, ComponentModule } from "@pureform/generate";

import { manifestOf } from "./classes";
import { factoryModule, tokenVars } from "./codegen/factory";
import { themeAttributeOf } from "./options";
import type { CssOptions } from "./options";
import { compileCss } from "./stylesheet";

export { classExpression, factoryModule, tokenVars } from "./codegen/factory";
export type { FactoryModuleInput } from "./codegen/factory";

/** The CSS target's build options: the stylesheet's (`compileCss`'s). `classPrefix` names the
 *  classes and `prefix` the instance tokens' vars, in the factories too. */
export type CssCodegenOptions = CssOptions;

/** The stylesheet's file, relative to `.pureform/`. */
export const STYLESHEET_FILE = "styles.css";

/** The config with only the given components, in that order. */
export const subsetConfig = (
    config: CoreConfig,
    components: readonly string[],
): CoreConfig => ({
    ...config,
    components: Object.fromEntries(
        components.map((name) => [name, config.components[name]!]),
    ),
});

/** `web/<name>.ts` for each of the context's components: its `ClassFactory`, classed as the
 *  stylesheet names them. Other web adapters over this stylesheet reuse it. */
export const componentModules = (
    context: CodegenContext<Pick<CssOptions, "classPrefix" | "prefix">>,
): ComponentModule[] =>
    context.components.map((name) => {
        const spec = context.config.components[name]!;
        return {
            name,
            path: `web/${name}.ts`,
            contents: factoryModule({
                name,
                manifest: manifestOf(spec, context.options),
                vars: tokenVars(name, spec, context.options.prefix),
            }),
        };
    });

/** The CSS adapter's codegen: `web/<name>.ts` per component, and `styles.css` for them. The
 *  registry scopes named themes with the stylesheet's `themeAttribute`. */
export const codegen = defineCodegen<CssCodegenOptions>({
    name: "css",
    platform: "web",
    codegen: (context) => ({
        components: componentModules(context),
        files: [
            {
                path: STYLESHEET_FILE,
                contents: compileCss(
                    subsetConfig(context.config, context.components),
                    context.options,
                ),
            },
        ],
        themeAttribute: themeAttributeOf(context.options),
    }),
});

export default codegen;
