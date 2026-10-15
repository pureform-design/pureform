import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { buttonConfig } from "@pureform/core/fixtures/button";
import type { CoreConfig } from "@pureform/core/types";
import { pureform } from "@pureform/preset";
import { describe, expect, it } from "vitest";

import { buildCss } from "./build";
import { generate } from "./generate";
import { pureformCss } from "./vite";

describe("generate", () => {
    it("writes each component as a pure call holding its manifest", async () => {
        const { js } = await generate(pureform(), { classPrefix: "pf" });
        expect(js).toMatch(
            /^import \{ recipe \} from "@pureform\/css-adapter\/runtime";/,
        );
        expect(js).toContain(
            'export const avatar = /* @__PURE__ */ recipe({"className":"pf-avatar",',
        );
    });

    it("types each function by its variant values and slots", async () => {
        const { dts } = await generate(buttonConfig);
        expect(dts).toContain(
            'export declare const button: RecipeFn<{ "color": "brand" | "danger"; "variant": "solid" | "outline" | "ghost"; "size": "sm" | "md" | "lg" }, "root" | "label" | "leadingIcon" | "trailingIcon">;',
        );
    });

    it("passes the stylesheet through the transform", async () => {
        const { css } = await generate(buttonConfig, {
            transform: (input) => `/* processed */\n${input}`,
        });
        expect(css.startsWith("/* processed */\n@layer")).toBe(true);
    });

    it("rejects a component name that can't be an export", async () => {
        const config: CoreConfig = {
            tokens: {},
            semanticTokens: {},
            components: {
                "my-box": {
                    kind: "component",
                    name: "my-box",
                    recipe: { base: {} },
                },
            },
        };
        await expect(generate(config)).rejects.toThrow(
            'component "my-box" is not a valid export name',
        );
    });
});

describe("buildCss", () => {
    it("writes the stylesheet and the class name modules", async () => {
        const outDir = await mkdtemp(join(tmpdir(), "pureform-"));
        try {
            const paths = await buildCss(buttonConfig, { outDir });
            expect(paths.map((path) => path.slice(outDir.length + 1))).toEqual([
                "styles.css",
                "recipes.js",
                "recipes.d.ts",
            ]);
            expect(
                await readFile(join(outDir, "styles.css"), "utf8"),
            ).toContain(".button__root {");
        } finally {
            await rm(outDir, { recursive: true });
        }
    });
});

describe("pureformCss", () => {
    const plugin = pureformCss({ config: () => buttonConfig });
    const call = <A extends unknown[], R>(hook: unknown, ...args: A) =>
        (hook as (...args: A) => R)(...args);

    it("serves the stylesheet and the recipes as virtual modules", async () => {
        const cssId = call<[string], string>(
            plugin.resolveId,
            "virtual:pureform.css",
        );
        expect(cssId).toBe("\0virtual:pureform.css");
        expect(await call(plugin.load, cssId)).toContain(".button__root {");
        const recipesId = call<[string], string>(
            plugin.resolveId,
            "virtual:pureform/recipes",
        );
        expect(await call(plugin.load, recipesId)).toContain(
            "export const button =",
        );
    });

    it("leaves other modules alone", () => {
        expect(call(plugin.resolveId, "./app.ts")).toBeUndefined();
    });
});
