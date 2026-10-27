// Runtime themes and token overrides on the web: the `<style>` block a runtime theme is written
// as, the inline vars overrides become, and the decisions both bindings make about when to
// generate a theme and when to keep the server's block.

import type {
    AnyRuntimeTheme,
    CssVars,
    ThemeSchemeVars,
    WebRegistry,
} from "@pureform/styling-web";
import { themeScope } from "@pureform/styling-web";
import { tokenVar } from "@pureform/styling-web/theme-vars";

import type { ThemeHydration, ThemeOverrides } from "./provider";
import { themeAttributeOf } from "./provider";

/** The attribute every runtime theme's `<style>` block carries, its scope as the value, so the
 *  client can find the server's block. */
export const THEME_BLOCK_ATTRIBUTE = "data-pf-theme";

/** The `precedence` React hoists runtime themes' blocks under. */
export const THEME_PRECEDENCE = "pureform";

/** The selector a runtime theme's block applies under: the target's theme attribute, with the
 *  theme's scope as its value. */
export const themeSelector = (attribute: string, scope: string): string =>
    `[${attribute}="${scope}"]`;

const declarations = (vars: CssVars, indent: string): string[] =>
    Object.entries(vars).map(([name, value]) => `${indent}${name}: ${value};`);

/** A runtime theme's CSS: its light vars under `selector`, and the dark ones under the scheme
 *  conditions the stylesheet uses (a `.dark` ancestor, or the system's dark scheme unless the root
 *  is `.light`). */
export const themeCss = (selector: string, vars: ThemeSchemeVars): string => {
    const lines = [`${selector} {`, ...declarations(vars.light, "  "), "}"];
    const dark = vars.dark ?? {};
    if (Object.keys(dark).length > 0) {
        lines.push(
            `.dark ${selector} {`,
            ...declarations(dark, "  "),
            "}",
            "@media (prefers-color-scheme: dark) {",
            `  :root:not(.light) ${selector} {`,
            ...declarations(dark, "    "),
            "  }",
            "}",
        );
    }
    return lines.join("\n");
};

/** A provider's own token overrides as CSS vars for its element's `style`, named the way the
 *  registry's target names them: `{ "colors.primary": "#006a60" }` gives `{ "--colors-primary":
 *  "#006a60" }`. Numbers become their string, so pass lengths with their unit. `undefined` when
 *  there are none. Paths that name no var are left out. */
export const overrideVars = (
    overrides: ThemeOverrides | undefined,
    registry: Pick<WebRegistry, "vars"> | undefined,
): CssVars | undefined => {
    if (!overrides) return undefined;
    let style: Record<`--${string}`, string> | undefined;
    for (const [path, value] of Object.entries(overrides)) {
        const name = tokenVar(path, registry?.vars);
        if (name === undefined || value === undefined) continue;
        (style ??= {})[name] = String(value);
    }
    return style;
};

/** A runtime theme's block as a provider holds it: its scope, the vars it generated (when it
 *  did), and the block's CSS (generated, or the server's). */
export interface ThemeBlock {
    readonly scope: string;
    readonly vars: ThemeSchemeVars | undefined;
    readonly css: string | undefined;
}

/** The theme's vars when its generator is loaded, else `undefined`. */
export const generateThemeVars = (
    theme: AnyRuntimeTheme,
    registry: Pick<WebRegistry, "themeAttribute" | "vars"> | undefined,
): ThemeSchemeVars | undefined =>
    theme.source.loaded?.(theme.input, registry?.vars ?? {});

/** Loads the theme's generator and runs it. */
export const loadThemeVars = async (
    theme: AnyRuntimeTheme,
    registry: Pick<WebRegistry, "themeAttribute" | "vars"> | undefined,
): Promise<ThemeSchemeVars> =>
    (await theme.source.load())(theme.input, registry?.vars ?? {});

/** A block from generated vars. */
export const generatedBlock = (
    theme: AnyRuntimeTheme,
    registry: Pick<WebRegistry, "themeAttribute" | "vars"> | undefined,
    vars: ThemeSchemeVars,
): ThemeBlock => {
    const scope = themeScope(theme);
    return {
        scope,
        vars,
        css: themeCss(themeSelector(themeAttributeOf(registry), scope), vars),
    };
};

export interface InitialBlockOptions {
    readonly hydrate: ThemeHydration;
    /** Rendering on the server. */
    readonly server: boolean;
    /** The server's block for a scope, on the client (`serverThemeCss`). */
    readonly existing?: ((scope: string) => string | undefined) | undefined;
}

/** A runtime theme's block on first render. The server generates it (its generator must be
 *  loaded: `preloadTheme`). With `hydrate: "reuse"` the client keeps the server's block and
 *  generates nothing; with `"regenerate"`, or with no block to keep, it generates when the
 *  generator is loaded, and the provider loads it otherwise (`needsThemeLoad`). */
export const initialThemeBlock = (
    theme: AnyRuntimeTheme,
    registry: Pick<WebRegistry, "themeAttribute" | "vars"> | undefined,
    options: InitialBlockOptions,
): ThemeBlock => {
    const scope = themeScope(theme);
    const existing = options.server ? undefined : options.existing?.(scope);
    const vars =
        options.server ||
        options.hydrate === "regenerate" ||
        existing === undefined
            ? generateThemeVars(theme, registry)
            : undefined;
    return vars
        ? generatedBlock(theme, registry, vars)
        : { scope, vars: undefined, css: existing };
};

/** Whether the client must load the theme's generator: it has no block yet, or it hydrates with
 *  `"regenerate"` and hasn't generated. */
export const needsThemeLoad = (
    block: ThemeBlock,
    hydrate: ThemeHydration,
): boolean =>
    block.vars === undefined &&
    (block.css === undefined || hydrate === "regenerate");

/** The CSS of the block the server rendered for a scope, if the page has one. Only call it in
 *  the browser. */
export const serverThemeCss = (scope: string): string | undefined =>
    typeof document === "undefined"
        ? undefined
        : (document.querySelector(
              `style[${THEME_BLOCK_ATTRIBUTE}="${scope}"], style[data-href~="${scope}"]`,
          )?.textContent ?? undefined);

/** The message for a runtime theme rendered on the server before its generator loaded. */
export const unloadedThemeMessage = (theme: AnyRuntimeTheme): string =>
    `pureform: the runtime theme "${theme.source.name}" rendered on the server before its generator loaded, so the page's first paint won't have it. Await preloadTheme(theme) before rendering.`;
