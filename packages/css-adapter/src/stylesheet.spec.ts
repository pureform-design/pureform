import { defineConfig, defineStaticUtility } from "@pureform/core";
import { alias, arg, hex, px, when } from "@pureform/core/ast";
import { buttonConfig } from "@pureform/core/fixtures/button";
import type { CoreConfig } from "@pureform/core/types";
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
            ".textField__container--variant_outlined.textField__container--color_error {",
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

    it("lowers conditional values into nested rules", () => {
        const css = withBox({ color: when("hover", hex("#00f"), hex("#000")) });
        expect(ruleOf(css, ".box")).toMatch(
            /color: rgb\(0 0 0\);\n\s+&:is\(:hover, \[data-hover\]\) \{\n\s+color: rgb\(0 0 255\);/,
        );
    });
});
