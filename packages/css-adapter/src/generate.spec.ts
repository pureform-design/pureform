import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { buttonConfig } from "@pureform/core/fixtures/button";
import type { CoreConfig } from "@pureform/core/types";
import { pureform } from "@pureform/preset";
import { describe, expect, it } from "vitest";

import { buildCss } from "./build";
import { generate } from "./generate";
import { pureformCss, pureformPlugin, writeIfChanged } from "./vite";

describe("generate", () => {
    it("writes each component as a pure call holding its manifest", async () => {
        const { js } = await generate(pureform(), { classPrefix: "pf" });
        expect(js).toMatch(
            /^import \{ componentClasses \} from "@pureform\/css-adapter\/runtime";/,
        );
        expect(js).toContain(
            'export const avatar = /* @__PURE__ */ componentClasses({"className":"pf-avatar",',
        );
    });

    it("types each function by its variant values and slots", async () => {
        const { dts } = await generate(buttonConfig);
        expect(dts).toContain(
            'export declare const button: ComponentClasses<{ "color": "brand" | "danger"; "variant": "solid" | "outline" | "ghost"; "size": "sm" | "md" | "lg" }, "root" | "label" | "leadingIcon" | "trailingIcon">;',
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
                "components.js",
                "components.d.ts",
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

    it("serves the stylesheet and the class name functions as virtual modules", async () => {
        const cssId = call<[string], string>(
            plugin.resolveId,
            "virtual:pureform.css",
        );
        expect(cssId).toBe("\0virtual:pureform.css");
        expect(await call(plugin.load, cssId)).toContain(".button__root {");
        const recipesId = call<[string], string>(
            plugin.resolveId,
            "virtual:pureform/components",
        );
        expect(await call(plugin.load, recipesId)).toContain(
            "export const button =",
        );
    });

    it("leaves other modules alone", () => {
        expect(call(plugin.resolveId, "./app.ts")).toBeUndefined();
    });
});

describe("pureformPlugin", () => {
    const call = <A extends unknown[], R>(hook: unknown, ...args: A) =>
        (hook as (...args: A) => R)(...args);

    it("writes the stylesheet from the given compiler, before the build starts", async () => {
        const dir = await mkdtemp(join(tmpdir(), "pureform-plugin-"));
        try {
            const outFile = join(dir, "nested", "styles.css");
            const plugin = pureformPlugin(
                {
                    config: buttonConfig,
                    compile: (config) =>
                        `/* ${Object.keys(config.components)} */`,
                    dts: join(dir, "pureform.d.ts"),
                },
                { name: "test", outFile },
            );
            expect(plugin.enforce).toBe("pre");
            await call(plugin.buildStart);
            expect(await readFile(outFile, "utf8")).toBe("/* button */");
            expect(
                await readFile(join(dir, "pureform.d.ts"), "utf8"),
            ).toContain('declare module "virtual:pureform/components" {');
            // Written to disk, so the stylesheet isn't served as a module.
            expect(
                call(plugin.resolveId, "virtual:pureform.css"),
            ).toBeUndefined();
        } finally {
            await rm(dir, { recursive: true });
        }
    });
});

describe("writeIfChanged", () => {
    it("writes only when the contents differ", async () => {
        const dir = await mkdtemp(join(tmpdir(), "pureform-write-"));
        try {
            const path = join(dir, "a.css");
            expect(await writeIfChanged(path, "a")).toBe(true);
            expect(await writeIfChanged(path, "a")).toBe(false);
            expect(await writeIfChanged(path, "b")).toBe(true);
        } finally {
            await rm(dir, { recursive: true });
        }
    });
});
