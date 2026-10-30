import {
    defineComponent,
    defineConfig,
    defineStaticUtility,
} from "@pureform/core";
import {
    alias,
    arg,
    hex,
    px,
    spring,
    transition,
    tween,
    when,
} from "@pureform/core/ast";
import { buttonConfig } from "@pureform/core/fixtures/button";
import type { CoreConfig } from "@pureform/core/types";
import { narrowConfig } from "@pureform/generate";
import { materialShape } from "@pureform/material";
import { pureform } from "@pureform/preset";
import { describe, expect, it } from "vitest";

import { compileCss } from "./stylesheet";

// The rule for a selector, from its opening brace to its matching close.
const ruleOf = (css: string, selector: string): string => {
    const start = css.indexOf(`${selector} {`);
    if (start < 0) throw new Error(`no rule for ${selector}`);
    let depth = 0;
    for (let i = css.indexOf("{", start); i < css.length; i++) {
        if (css[i] === "{") depth++;
        if (css[i] === "}" && --depth === 0) return css.slice(start, i + 1);
    }
    throw new Error(`unclosed rule for ${selector}`);
};

describe("compileCss", () => {
    it("compiles to a stable stylesheet", () => {
        expect(compileCss(buttonConfig)).toMatchSnapshot();
    });

    it("orders its layers, with components last", () => {
        expect(compileCss(buttonConfig)).toMatch(
            /^@layer pureform\.reset, pureform\.tokens, pureform\.components;/,
        );
    });

    it("leaves layers out when asked", () => {
        const css = compileCss(buttonConfig, { layer: false });
        expect(css).not.toContain("@layer pureform");
        expect(css).toContain("@layer base, variants, compounds;");
    });
});

describe("compileCss (full pureform config)", () => {
    const config = pureform({
        themes: { beveled: { shape: materialShape({}, { corner: "bevel" }) } },
    });
    const css = compileCss(config);

    it("sets dark tokens on the root, by class and by system preference", () => {
        const root = ruleOf(css, ":root");
        expect(root).toContain("color-scheme: light dark;");
        expect(root).toMatch(/&\.dark \{[^}]*--colors-primary: /);
        expect(root).toMatch(
            /@media \(prefers-color-scheme: dark\) \{\n\s+&:not\(\.light\) \{/,
        );
    });

    it("reduces motion as the system asks unless a provider's attribute overrides it", () => {
        const handle = ruleOf(css, ".switchControl__handle");
        expect(handle).toMatch(
            /@media \(prefers-reduced-motion: reduce\) \{\n\s+&:not\(\[data-pf-motion\], \[data-pf-motion\] \*\) \{\n\s+transition: background-color [^;]*;/,
        );
        expect(handle).toMatch(
            /@container style\(--pf-motion: reduce\) \{\n\s+&:not\(\[data-pf-motion\]\) \{\n\s+transition: background-color [^;]*;/,
        );
        expect(handle).toContain("@container style(--pf-motion: system)");
        expect(handle).toContain("&[data-pf-motion=system]");
        expect(css).toContain("--pf-motion: system;");
        expect(css).not.toContain("@motion");
    });

    it("sets a named theme's tokens under its attribute", () => {
        expect(ruleOf(css, '[data-theme="beveled"]')).toContain(
            "--components-button-corner: bevel;",
        );
        const custom = compileCss(config, { themeAttribute: "data-pf-theme" });
        expect(custom).toContain('[data-pf-theme="beveled"] {');
    });

    it("gives each variant value a class, and chains compound variant classes", () => {
        expect(css).toContain(".button__root--variant_tonal {");
        expect(css).toContain(
            ".fab__container--size_small.fab__container--shape_none {",
        );
    });

    it("selects slot states through the ancestor slot's class", () => {
        expect(ruleOf(css, ".textField__label")).toContain(
            ".textField__container:is(",
        );
    });

    it("writes text styles out in place", () => {
        expect(ruleOf(css, ".button__label")).toContain(
            "font-size: var(--font-sizes-label-large);",
        );
        expect(css).not.toContain("text-style:");
    });

    it("prefixes classes and vars", () => {
        const prefixed = compileCss(config, {
            classPrefix: "pf",
            tokenPrefix: "pf",
            prefix: "pf",
        });
        expect(prefixed).toContain(".pf-button__root {");
        expect(prefixed).toContain(".pf-textField__container:is(");
        expect(prefixed).toContain("--pf-colors-primary:");
        expect(prefixed).toContain("var(--pf-components-button-gap,");
    });
});

describe("compileCss (utilities)", () => {
    const base: CoreConfig = {
        tokens: { spacing: { "2": px(8) }, colors: { red: hex("#f00") } },
        semanticTokens: {},
        utilities: {
            ring: defineStaticUtility({
                values: { thick: { outlineWidth: px(3) } },
            }),
            gap2: {
                kind: "dynamic",
                scale: ["tokens", "spacing"],
                template: { gap: arg() },
            },
        },
        components: {},
    };

    const withBox = (style: Record<string, unknown>) =>
        compileCss(
            defineConfig({
                ...base,
                components: {
                    box: {
                        kind: "component",
                        name: "box",
                        recipe: { base: style },
                    },
                },
            } as CoreConfig),
        );

    it("writes a static utility's styles out, the map's own winning", () => {
        const css = withBox({
            apply: { ring: "thick" },
            outlineWidth: px(1),
            color: alias("tokens", "colors", "red"),
        });
        expect(ruleOf(css, ".box")).toContain("outline-width: 1px;");
        expect(ruleOf(css, ".box")).not.toContain("outline-width: 3px;");
    });

    it("fills a dynamic utility's template from its scale", () => {
        const css = withBox({ apply: { gap2: "2" } });
        expect(ruleOf(css, ".box")).toContain("gap: var(--spacing-2);");
    });

    it("sets tokens as custom properties, through states", () => {
        const css = withBox({
            tokens: { "components.box.accent": hex("#00f") },
            states: {
                hover: { tokens: { "components.box.accent": hex("#000") } },
            },
        });
        expect(ruleOf(css, ".box")).toMatch(
            /--components-box-accent: rgb\(0 0 255\);\n\s+&:is\(:hover, \[data-pf-hover\]\) \{\n\s+--components-box-accent: rgb\(0 0 0\);/,
        );
    });

    it("lowers conditional values into nested rules", () => {
        const css = withBox({ color: when("hover", hex("#00f"), hex("#000")) });
        expect(ruleOf(css, ".box")).toMatch(
            /color: rgb\(0 0 0\);\n\s+&:is\(:hover, \[data-pf-hover\]\) \{\n\s+color: rgb\(0 0 255\);/,
        );
    });
});

describe("compileCss (typed component tokens)", () => {
    it("registers them with @property, outside the layers, so they transition", () => {
        const css = compileCss(pureform());
        expect(css).toContain(
            '@property --components-circularProgress-value {\n    syntax: "<number>";\n    inherits: true;\n    initial-value: 0;\n}',
        );
        expect(css.indexOf("@property")).toBeLessThan(
            css.indexOf("@layer pureform.tokens {"),
        );
        expect(css).toMatch(/transition: --components-circularProgress-value /);
    });
});

describe("compileCss (springs)", () => {
    const config: CoreConfig = {
        tokens: {},
        semanticTokens: {},
        springs: {
            spatialFast: spring({ stiffness: 800, damping: 0.6 }),
        },
        themes: {
            stiff: {
                springs: {
                    spatialFast: spring({ stiffness: 1400, damping: 0.9 }),
                },
            },
        },
        components: {
            box: defineComponent({
                name: "box",
                recipe: {
                    base: {
                        transition: transition(
                            tween("transform", {
                                spring: alias("springs", "spatialFast"),
                            }),
                        ),
                    },
                },
            }),
        },
    };
    const css = compileCss(config);

    it("writes each spring as a duration var and a linear() easing var", () => {
        const root = ruleOf(css, ":root");
        expect(root).toMatch(/--springs-spatial-fast-duration: \d+ms;/);
        expect(root).toMatch(
            /--springs-spatial-fast-easing: linear\(0, [^;]*, 1\);/,
        );
        expect(ruleOf(css, '[data-theme="stiff"]')).toMatch(
            /--springs-spatial-fast-duration: \d+ms;/,
        );
    });

    it("reads the vars in a transition", () => {
        expect(css).toContain(
            "transition: transform var(--springs-spatial-fast-duration) var(--springs-spatial-fast-easing);",
        );
        expect(css).toMatchSnapshot();
    });
});

describe("compileCss (spring component tokens)", () => {
    const base = pureform();
    const css = compileCss({
        ...base,
        themes: {
            ...base.themes,
            slow: {
                components: {
                    tabs: {
                        tokens: {
                            indicatorSpring: alias("springs", "spatialSlow"),
                        },
                    },
                },
            },
        },
    });

    it("times the tabs' indicator by its spring token, falling back to the role's vars", () => {
        expect(css).toContain(
            "transition: transform var(--components-tabs-indicatorSpring-duration, var(--springs-spatial-default-duration)) var(--components-tabs-indicatorSpring-easing, var(--springs-spatial-default-easing))",
        );
    });

    it("writes a theme's override of the token as the role's two vars", () => {
        const slow = ruleOf(css, '[data-theme="slow"]');
        expect(slow).toContain(
            "--components-tabs-indicatorSpring-duration: var(--springs-spatial-slow-duration);",
        );
        expect(slow).toContain(
            "--components-tabs-indicatorSpring-easing: var(--springs-spatial-slow-easing);",
        );
    });
});

describe("compileCss (pruned full config)", () => {
    it("builds without the progress components, and drops their keyframes", () => {
        const narrowed = narrowConfig(pureform(), ["button"]);
        expect(Object.keys(narrowed.keyframes ?? {})).not.toContain(
            "linearProgressTrack",
        );
        expect(() => compileCss(narrowed)).not.toThrow();
        const kept = narrowConfig(pureform(), ["button", "linearProgress"]);
        expect(Object.keys(kept.keyframes ?? {})).toContain(
            "linearProgressTrack",
        );
        expect(() => compileCss(kept)).not.toThrow();
    });
});

describe("compileCss (pruned keyframes)", () => {
    const names = (css: string) =>
        new Set([...css.matchAll(/@keyframes (\w+)/g)].map((m) => m[1]!));
    // Every keyframes name an animation in the stylesheet asks for.
    const asked = (css: string, known: readonly string[]) =>
        known.filter((name) =>
            new RegExp(`animation[^;{}]*\\b${name}\\b`).test(css),
        );

    const config = pureform();
    const all = Object.keys(config.keyframes ?? {});
    const SUBSETS = [
        ["button"],
        ["button", "linearProgress"],
        ["menu", "button"],
        ["fadeThrough"],
        ["loadingIndicator", "circularProgress"],
        ["bottomSheet", "sideSheet", "toast", "fabMenu"],
        ["horizontalSharedAxis", "tabs"],
        Object.keys(config.components),
    ];

    it.each(SUBSETS)(
        "leaves no animation without its keyframes (%s)",
        (...keep) => {
            const css = compileCss(narrowConfig(config, keep));
            const defined = names(css);
            for (const name of asked(css, all))
                expect(defined.has(name)).toBe(true);
        },
    );

    it("leaves a button-only build none of the keyframes, and every component's the full build's", () => {
        const full = compileCss(config);
        const pruned = compileCss(narrowConfig(config, ["button"]));
        expect(names(full).size).toBe(all.length);
        expect(names(pruned).size).toBe(0);
        expect(pruned).not.toContain("@keyframes");
        expect(
            compileCss(narrowConfig(config, Object.keys(config.components))),
        ).toBe(full);
    });

    it("keeps a named theme's own animation references", () => {
        const withTheme = {
            ...config,
            themes: {
                ...config.themes,
                lively: {
                    components: {
                        button: { transition: "overlayFadeIn 1s" },
                    },
                },
            },
        } as unknown as CoreConfig;
        expect(
            Object.keys(narrowConfig(withTheme, ["button"]).keyframes!),
        ).toContain("overlayFadeIn");
    });
});
