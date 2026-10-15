import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { px } from "@pureform/core/ast";
import { materialColor } from "@pureform/material";
import { pureform } from "@pureform/preset";
import { compile } from "@tailwindcss/node";
import { describe, expect, it } from "vitest";

import { compileTailwind, toTailwind } from "./tailwind";
import { pureformTailwind } from "./vite";

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

    it("adds variants for the color schemes and each named theme", () => {
        expect(variants.map((v) => v.name)).toEqual([
            "dark",
            "light",
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
});

describe("compileTailwind", () => {
    const css = compileTailwind(config);

    it("puts the components in nested layers inside Tailwind's components layer", () => {
        expect(css).toMatch(
            /^@theme \{\n {4}--spacing-0: 0px;[^]*\n@theme inline \{/,
        );
        expect(css).toContain(
            "@layer components {\n    @layer pureform.reset, pureform.tokens, pureform.recipes;",
        );
    });

    it("generates utilities from pureform's tokens", async () => {
        const out = await build(css, [
            "bg-primary",
            "rounded-large",
            "text-body-large",
            "shadow-level1",
            "medium:p-2",
            "p-4",
        ]);
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

    it("keeps the components below utilities, and their own layers in order", async () => {
        const out = await build(css, ["p-0"]);
        expect(out).toMatch(/^@layer theme, base, components, utilities;/m);
        expect(out).toContain(
            "@layer pureform.recipes {\n    @layer base, variants, compounds;",
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

describe("pureformTailwind", () => {
    it("writes the stylesheet before the build starts", async () => {
        const dir = await mkdtemp(join(tmpdir(), "pureform-tailwind-"));
        try {
            const outFile = join(dir, "pureform.gen.css");
            const plugin = pureformTailwind({
                config,
                outFile,
                classPrefix: "pf",
            });
            await (plugin.buildStart as () => Promise<void>)();
            const css = await readFile(outFile, "utf8");
            expect(css).toBe(compileTailwind(config, { classPrefix: "pf" }));
            expect(css).toContain(".pf-button__root {");
            const recipes = await (
                plugin.load as (id: string) => Promise<string>
            )("\0virtual:pureform/recipes");
            expect(recipes).toContain('"className":"pf-button"');
        } finally {
            await rm(dir, { recursive: true });
        }
    });
});
