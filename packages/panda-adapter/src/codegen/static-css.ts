// The build-time module `panda.config.ts` spreads in: `staticCss` entries that keep every
// variant of the generated components, and every theme. Panda's extractor can't see what the
// registry picks at run time.

const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;

const key = (name: string): string =>
    IDENTIFIER.test(name) ? name : JSON.stringify(name);

/** The `panda.ts` module's source: `export const staticCss`, typed by Panda's config. */
export const staticCssModule = (
    components: readonly string[],
    themes: readonly string[],
): string =>
    [
        'import type { Config } from "@pandacss/dev";',
        "",
        "export const staticCss = {",
        `    themes: [${themes.map((theme) => JSON.stringify(theme)).join(", ")}],`,
        components.length > 0
            ? [
                  "    recipes: {",
                  ...components.map((name) => `        ${key(name)}: ["*"],`),
                  "    },",
              ].join("\n")
            : "    recipes: {},",
        '} satisfies NonNullable<Config["staticCss"]>;',
        "",
    ].join("\n");
