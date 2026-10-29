import { alias, px } from "@pureform/core/ast";
import { materialColor } from "@pureform/material";
import { pureform } from "@pureform/preset";
import { compile } from "@tailwindcss/node";
import { describe, expect, it } from "vitest";

import { compileTailwind, toTailwind } from "./tailwind";

const config = {
    ...pureform({
        themes: { teal: { color: materialColor({ seed: "#006A60" }) } },
    }),
    breakpoints: { medium: px(600) },
};

// The stylesheet run through Tailwind's compiler, with the classes it should generate.
const build = async (css: string, candidates: string[]) => {
    const compiler = await compile(`@import "tailwindcss";\n${css}`, {
        base: import.meta.dirname,
        onDependency: () => {},
    });
    return compiler.build(candidates);
};

describe("toTailwind", () => {
    const { theme, variants, clear } = toTailwind(config);

    it("maps tokens to Tailwind's namespaces as references to pureform's vars", () => {
        expect(theme).toMatchObject({
            "--color-primary": "var(--colors-primary)",
            "--color-on-surface": "var(--colors-on-surface)",
            "--radius-large": "var(--radii-large)",
            "--shadow-level1": "var(--shadows-level1)",
            "--font-plain": "var(--fonts-plain)",
            "--ease-emphasized": "var(--easings-emphasized)",
            "--text-body-large": "var(--font-sizes-body-large)",
            "--text-body-large--line-height": "var(--line-heights-body-large)",
            "--text-body-large--font-weight": "var(--font-weights-body-large)",
            "--breakpoint-medium": "600px",
        });
    });

    it("declares spacing, which shares Tailwind's names, by value rather than as a cycle", () => {
        const { shared } = toTailwind(config);
        expect(theme["--spacing-4"]).toBeUndefined();
        expect(shared["--spacing-4"]).toMatch(/px|rem/);
    });

    it("declares the stacking scale, which shares Tailwind's names, by value", () => {
        const { shared } = toTailwind(config);
        expect(theme["--z-index-menu"]).toBeUndefined();
        expect(shared["--z-index-menu"]).toBe("200");
        expect(shared["--z-index-tooltip"]).toBe("600");
    });

    it("leaves the raw palette out unless asked", () => {
        expect(theme["--color-primary40"]).toBeUndefined();
        const all = toTailwind(config, { palette: true }).theme;
        expect(Object.keys(all).length).toBeGreaterThan(
            Object.keys(theme).length,
        );
    });

    it("keeps Tailwind's defaults unless replacing them", () => {
        expect(clear).toEqual([]);
        expect(toTailwind(config, { replace: true }).clear).toEqual(
            expect.arrayContaining(["color", "radius", "text", "breakpoint"]),
        );
    });

    it("adds variants for the color schemes, reduced motion, and each named theme", () => {
        expect(variants.map((v) => v.name)).toEqual([
            "dark",
            "light",
            "motion-reduce",
            "ltr",
            "rtl",
            "theme-teal",
        ]);
        const named = toTailwind(config, {
            themeVariant: (name) => name,
            themeAttribute: "data-pf-theme",
        }).variants.at(-1);
        expect(named).toEqual({
            name: "teal",
            paths: [
                ['&:where([data-pf-theme="teal"], [data-pf-theme="teal"] *)'],
            ],
        });
    });

    it("reduces motion as the system asks unless a provider's attribute overrides it", () => {
        expect(variants.find((v) => v.name === "motion-reduce")).toEqual({
            name: "motion-reduce",
            paths: [
                [
                    "@media (prefers-reduced-motion: reduce)",
                    "&:not([data-pf-motion=full] *)",
                ],
                [
                    "[data-pf-motion=reduce] &:not([data-pf-motion=reduce] [data-pf-motion=full] *)",
                ],
            ],
        });
    });

    it("overrides Tailwind's direction variants with element-local direction", async () => {
        const css = await build(compileTailwind(config), [
            "rtl:ml-2",
            "ltr:mr-2",
        ]);
        expect(css).toContain(".rtl\\:ml-2:where(:dir(rtl))");
        expect(css).toContain(".ltr\\:mr-2:where(:dir(ltr))");
        expect(css).not.toContain('[dir="rtl"] *');
    });
});

describe("compileTailwind", () => {
    const css = compileTailwind(config);

    it("puts the components in nested layers inside Tailwind's components layer", () => {
        expect(css).toMatch(
            /^@theme \{\n {4}--spacing-0: 0px;[^]*\n@theme inline \{/,
        );
        expect(css).toContain(
            "@layer components {\n    @layer pureform.reset, pureform.tokens, pureform.components;",
        );
    });

    it("writes each spring as a duration var, a linear() easing var and its exact parameters' vars", () => {
        const springs = [...css.matchAll(/(--springs-[a-z-]+): ([^;]+);/g)].map(
            ([, name, value]) => [name, value],
        );
        expect(springs.map(([name]) => name)).toEqual(
            [
                "spatial-fast",
                "spatial-default",
                "spatial-slow",
                "effects-fast",
                "effects-default",
                "effects-slow",
            ].flatMap((role) => [
                `--springs-${role}-duration`,
                `--springs-${role}-easing`,
                `--springs-${role}-stiffness`,
                `--springs-${role}-damping`,
                `--springs-${role}-mass`,
            ]),
        );
        expect(Object.fromEntries(springs)).toMatchSnapshot();
    });

    it("generates utilities from pureform's tokens", async () => {
        const out = await build(css, [
            "bg-primary",
            "rounded-large",
            "text-body-large",
            "shadow-level1",
            "medium:p-2",
            "p-4",
            "z-raised",
        ]);
        expect(out).toContain("z-index: var(--z-index-raised);");
        expect(out).toContain("padding: var(--spacing-4);");
        expect(out).toContain("background-color: var(--colors-primary);");
        expect(out).toContain("border-radius: var(--radii-large);");
        expect(out).toMatch(
            /\.text-body-large \{\s*font-size: var\(--font-sizes-body-large\);\s*line-height: var\(--tw-leading, var\(--line-heights-body-large\)\);/,
        );
        expect(out).toContain("@media (width >= 600px)");
    });

    it("scopes the scheme and theme variants as the components are", async () => {
        const out = await build(css, [
            "dark:bg-primary",
            "theme-teal:bg-primary",
        ]);
        expect(out).toContain(".dark\\:bg-primary:where(.dark, .dark *)");
        expect(out).toMatch(
            /@media \(prefers-color-scheme: dark\) \{\s*\.dark\\:bg-primary:where\(:root:not\(\.light\), :root:not\(\.light\) \*\)/,
        );
        expect(out).toContain(
            '.theme-teal\\:bg-primary:where([data-theme="teal"], [data-theme="teal"] *)',
        );
    });

    it("replaces Tailwind's motion-reduce variant with the provider-aware one", async () => {
        const out = await build(css, ["motion-reduce:transition-none"]);
        expect(out).toMatch(
            /@media \(prefers-reduced-motion: reduce\) \{\s*\.motion-reduce\\:transition-none:not\(\[data-pf-motion=full\] \*\)/,
        );
        expect(out).toContain(
            "[data-pf-motion=reduce] .motion-reduce\\:transition-none:not([data-pf-motion=reduce] [data-pf-motion=full] *)",
        );
    });

    it("keeps the components below utilities, and their own layers in order", async () => {
        const out = await build(css, ["p-0"]);
        expect(out).toMatch(/^@layer theme, base, components, utilities;/m);
        expect(out).toContain(
            "@layer pureform.components {\n    @layer base, variants, compounds;",
        );
        expect(out).toContain(".button__root {");
    });

    it("clears Tailwind's own values when replacing them", async () => {
        const out = await build(compileTailwind(config, { replace: true }), [
            "bg-red-500",
            "bg-primary",
        ]);
        expect(out).not.toContain(".bg-red-500");
        expect(out).toContain(".bg-primary");
    });
});

describe("compileTailwind (spring component tokens)", () => {
    const css = compileTailwind({
        ...config,
        themes: {
            ...config.themes,
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
        expect(css).toMatch(
            /\[data-theme="slow"\] \{[^}]*--components-tabs-indicatorSpring-duration: var\(--springs-spatial-slow-duration\);\s*--components-tabs-indicatorSpring-easing: var\(--springs-spatial-slow-easing\);/,
        );
    });
});
