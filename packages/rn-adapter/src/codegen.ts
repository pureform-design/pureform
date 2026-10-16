// The React Native adapter's codegen, which `@pureform/generate` loads for the `native` target:
// a `StyleFactory` module per component over its precomputed styles, and the themes they
// share. It succeeds precomputing the whole config in a `*.pureform.ts` file.

import { tokenValue } from "@pureform/core";
import type { AnyComponentSpec } from "@pureform/core/types";
import { defineCodegen } from "@pureform/generate";
import type { ComponentModule } from "@pureform/generate";

import { precompute, splitPrecomputed } from "./build";
import type { BuildOptions } from "./build";
import { selectionOrder } from "./factory";
import type { PrecomputedStyles } from "./resolve";

/** The native target's build options: `precompute`'s, but the components, which are the
 *  allow-list's. */
export type RnCodegenOptions = Omit<BuildOptions, "components">;

/** The themes' values and formulas every module reads, relative to `.pureform/`. Not a
 *  component's path, which can't hold `-`. */
export const THEMES_FILE = "native/theme-values.ts";

/** The theme key each instance token sets, by token: a `dynamic` token's own path, else the
 *  component's key for it, as a theme override names it. */
export const instanceTokenKeys = (
    name: string,
    spec: AnyComponentSpec,
): Record<string, string> =>
    Object.fromEntries(
        Object.entries(spec.tokens ?? {}).map(([token, entry]) => {
            const node = tokenValue(entry) as {
                type?: string;
                path?: string[];
            };
            const path =
                node.type === "dynamic" && node.path
                    ? node.path
                    : ["components", name, token];
            return [token, path.join(".")];
        }),
    );

// Data as a string JSON.parse reads, which engines parse faster than an object literal and
// type checkers don't infer.
const json = (value: unknown): string =>
    `JSON.parse(${JSON.stringify(JSON.stringify(value))})`;

const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;

const key = (name: string): string =>
    IDENTIFIER.test(name) ? name : JSON.stringify(name);

export interface FactoryModuleInput {
    /** The component's name, an identifier. */
    name: string;
    /** Its precomputed styles alone (`splitPrecomputed`'s). */
    styles: PrecomputedStyles;
    /** `instanceTokenKeys`. */
    tokens: Readonly<Record<string, string>>;
}

/** `native/<name>.ts`: the component's `NativeFactory` over its own templates and values,
 *  with the shared themes. */
export const factoryModule = ({
    name,
    styles,
    tokens,
}: FactoryModuleInput): string => {
    const named = Object.entries(tokens);
    return [
        'import { nativeFactory } from "@pureform/rn-adapter/factory";',
        "import type {",
        "    NativeFactory,",
        "    PrecomputedStyles,",
        '} from "@pureform/rn-adapter/factory";',
        "",
        'import { formulas, themes } from "./theme-values";',
        "",
        'const data: Pick<PrecomputedStyles, "templates" | "values" | "dependents"> =',
        `    ${json({
            templates: styles.templates,
            values: styles.values,
            dependents: styles.dependents,
        })};`,
        "",
        ...(named.length > 0
            ? [
                  "const tokens = {",
                  ...named.map(
                      ([token, theme]) =>
                          `    ${key(token)}: ${JSON.stringify(theme)},`,
                  ),
                  "} as const;",
                  "",
              ]
            : []),
        `export const ${name}: NativeFactory<${JSON.stringify(name)}> = nativeFactory(`,
        `    ${JSON.stringify(name)},`,
        '    { mode: "precomputed", themes, formulas, ...data },',
        ...(named.length > 0 ? ["    tokens,"] : []),
        ");",
        "",
    ].join("\n");
};

/** `native/theme-values.ts`: each theme's token values, and the formulas of those reading
 *  others, by theme key (`base:light`, `teal:dark`). */
export const themesModule = (styles: PrecomputedStyles): string =>
    [
        'import type { ThemeValues, Value } from "@pureform/rn-adapter/factory";',
        "",
        `export const themes: Record<string, ThemeValues> = ${json(styles.themes)};`,
        "",
        `export const formulas: Record<string, Record<string, Value>> = ${json(styles.formulas ?? {})};`,
        "",
    ].join("\n");

/** The React Native adapter's codegen: `native/<name>.ts` per component, and
 *  `native/theme-values.ts`. */
export const codegen = defineCodegen<RnCodegenOptions>({
    name: "native",
    platform: "native",
    codegen: (context) => {
        const styles = precompute(context.config, {
            ...context.options,
            components: [...context.components],
        });
        const split = splitPrecomputed(styles);
        const components = context.components.map((name): ComponentModule => ({
            name,
            path: `native/${name}.ts`,
            contents: factoryModule({
                name,
                styles: split[name]!,
                tokens: instanceTokenKeys(
                    name,
                    context.config.components[name]!,
                ),
            }),
            shape: {
                ...context.shape(name),
                states: selectionOrder(styles.templates[name]!).states,
            },
        }));
        return {
            components,
            files: [{ path: THEMES_FILE, contents: themesModule(styles) }],
        };
    },
});

export default codegen;
