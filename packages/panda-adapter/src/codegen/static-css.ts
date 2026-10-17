// The build-time module `panda.config.ts` spreads in: `staticCss` entries that keep every
// variant of the generated components, and every theme. Panda's extractor can't see what the
// registry picks at run time. A pruned build narrows a component to the values it uses.

const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;

const key = (name: string): string =>
    IDENTIFIER.test(name) ? name : JSON.stringify(name);

/** A component's `staticCss` rule when pruning narrows it: every group with its values, or
 *  `["*"]` for all of them (Panda generates only the defaults of a group a rule leaves out). */
export type StaticCssRule = Readonly<Record<string, readonly string[]>>;

const rule = (groups: StaticCssRule | undefined): string =>
    groups
        ? `[{ ${Object.entries(groups)
              .map(
                  ([group, values]) =>
                      `${key(group)}: [${values.map((value) => JSON.stringify(value)).join(", ")}]`,
              )
              .join(", ")} }]`
        : '["*"]';

/** The `panda.ts` module's source: `export const staticCss`, typed by Panda's config. `rules`
 *  narrows the components a pruned build uses only some values of. */
export const staticCssModule = (
    components: readonly string[],
    themes: readonly string[],
    rules: Readonly<Record<string, StaticCssRule>> = {},
): string =>
    [
        'import type { Config } from "@pandacss/dev";',
        "",
        "export const staticCss = {",
        `    themes: [${themes.map((theme) => JSON.stringify(theme)).join(", ")}],`,
        components.length > 0
            ? [
                  "    recipes: {",
                  ...components.map(
                      (name) => `        ${key(name)}: ${rule(rules[name])},`,
                  ),
                  "    },",
              ].join("\n")
            : "    recipes: {},",
        '} satisfies NonNullable<Config["staticCss"]>;',
        "",
    ].join("\n");
