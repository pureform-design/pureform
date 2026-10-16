import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
    fakeAdapter,
    fixtureConfig,
    installed,
    tempRoot,
    writeTree,
} from "./__fixtures__/project";
import { defineCodegen } from "./adapter";
import { isGenerateError } from "./errors";
import { generate } from "./generate";
import type { GenerateResult } from "./generate";
import { GENERATED_MARK, headerHash } from "./hash";
import { VERSION } from "./package-version";

const read = (root: string, path: string) =>
    readFileSync(join(root, ".pureform", path), "utf8");

const statuses = (result: GenerateResult) =>
    Object.fromEntries(result.files.map((file) => [file.path, file.status]));

const rejection = async (promise: Promise<unknown>) => {
    try {
        await promise;
    } catch (error) {
        return error;
    }
    throw new Error("expected a rejection");
};

// The source after the two header lines and the blank line.
const body = (contents: string) => contents.split("\n").slice(3).join("\n");

describe("generate", () => {
    it("writes each module, the adapter's files, the index, and the declarations, all headed by one hash", async () => {
        const root = tempRoot();
        const adapter = fakeAdapter();
        const result = await generate({
            root,
            config: fixtureConfig(),
            target: adapter,
            options: { prefix: "pf-" },
        });
        expect(statuses(result)).toEqual({
            "web/button.ts": "written",
            "web/chip.ts": "written",
            "fake.css": "written",
            "index.ts": "written",
            "registry.d.ts": "written",
        });
        expect(result.changed).toBe(true);
        expect(result.ok).toBe(true);
        expect(result.trainVersion).toBe(VERSION);
        for (const file of result.files) {
            expect(headerHash(read(root, file.path))).toBe(result.hash);
        }
        expect(read(root, "web/button.ts")).toBe(
            `// ${GENERATED_MARK}\n// pureform-hash: ${result.hash}\n\nexport const button = () => ({ root: { class: "pf-button" } });\n`,
        );
        expect(read(root, "fake.css").startsWith("/* ")).toBe(true);

        const [context] = adapter.calls;
        expect(context?.components).toEqual(["button", "chip"]);
        expect(context?.options).toEqual({ prefix: "pf-" });
        expect(context?.root).toBe(root);
        expect(context?.outDir).toBe(join(root, ".pureform"));
        expect(context?.shape("chip")).toEqual({
            variants: {},
            defaults: {},
            slots: ["root"],
            tokens: [],
        });
        expect(
            context?.importPath(
                "web/button.ts",
                "styled-system/recipes/button",
            ),
        ).toBe("../../styled-system/recipes/button");
        expect(context?.importPath("panda.ts", join(root, "src/x"))).toBe(
            "../src/x",
        );
    });

    it("writes the registry index with every entry static, the version, and the themes", async () => {
        const root = tempRoot();
        await generate({
            root,
            config: fixtureConfig(),
            target: fakeAdapter(),
        });
        expect(body(read(root, "index.ts"))).toBe(
            [
                'import { createRegistry } from "@pureform/styling";',
                "",
                'import { button } from "./web/button";',
                'import { chip } from "./web/chip";',
                "",
                "/** The core train's version this glue was made with. */",
                `export const version = "${VERSION}";`,
                "",
                "export const registry = createRegistry(",
                "    {",
                "        button,",
                "        chip,",
                "    },",
                "    { version },",
                ");",
                "",
                'export const themes = ["teal", "dense"] as const;',
                "",
                'export type Components = "button" | "chip";',
                "",
            ].join("\n"),
        );
    });

    it("declares each component's shape on ComponentRegistry", async () => {
        const root = tempRoot();
        await generate({
            root,
            config: fixtureConfig(),
            target: fakeAdapter(),
        });
        expect(body(read(root, "registry.d.ts"))).toBe(
            [
                'declare module "@pureform/styling" {',
                "    interface ComponentRegistry {",
                "        button: {",
                "            variants: {",
                '                variant: "filled" | "text";',
                '                toggle: "true" | "false";',
                "            };",
                '            slots: "root" | "label";',
                '            tokens: "radius" | "gap";',
                "        };",
                "        chip: {",
                '            slots: "root";',
                "        };",
                "    }",
                "}",
                "",
                "export {};",
                "",
            ].join("\n"),
        );
    });

    it("writes lazy entries, states, and other export names as asked", async () => {
        const root = tempRoot();
        const adapter = defineCodegen({
            name: "native-fake",
            platform: "native",
            codegen: (context) => ({
                components: context.components.map((name) => ({
                    name,
                    path: `native/${name}.ts`,
                    exportName: `${name}Styles`,
                    contents: `export const ${name}Styles = () => ({});\n`,
                    shape: {
                        ...context.shape(name),
                        states: ["pressed", "disabled"],
                    },
                })),
            }),
        });
        await generate({
            root,
            config: fixtureConfig(),
            target: adapter,
            lazy: ["chip"],
        });
        const index = read(root, "index.ts");
        expect(index).toContain(
            'import { buttonStyles as button } from "./native/button";',
        );
        expect(index).not.toContain('from "./native/chip"');
        expect(index).toContain(
            '        chip: { lazy: () => import("./native/chip").then((module) => module.chipStyles) },',
        );
        const declarations = read(root, "registry.d.ts");
        expect(declarations).toContain(
            '            states: "pressed" | "disabled";\n            lazy: true;',
        );
    });

    it("generates only the allow-listed components, in the config's order", async () => {
        const root = tempRoot();
        const result = await generate({
            root,
            config: fixtureConfig(),
            target: fakeAdapter(),
            components: ["chip"],
        });
        expect(Object.keys(statuses(result))).toEqual([
            "web/chip.ts",
            "fake.css",
            "index.ts",
            "registry.d.ts",
        ]);
        expect(read(root, "index.ts")).toContain(
            'export type Components = "chip";',
        );
    });

    it("rejects an allow-list or lazy list naming components the config doesn't have", async () => {
        const root = tempRoot();
        const unknown = await rejection(
            generate({
                root,
                config: fixtureConfig(),
                target: fakeAdapter(),
                components: ["button", "card"],
            }),
        );
        expect(isGenerateError(unknown, "components")).toBe(true);
        expect((unknown as Error).message).toContain(
            'the components option names "card", which the config doesn\'t have (it has "button", "chip")',
        );
        const left = await rejection(
            generate({
                root,
                config: fixtureConfig(),
                target: fakeAdapter(),
                components: ["chip"],
                lazy: ["button"],
            }),
        );
        expect((left as Error).message).toContain(
            'the lazy option names "button", which the components option leaves out',
        );
    });

    describe("rewriting only on change", () => {
        it("leaves every file alone when nothing changed", async () => {
            const root = tempRoot();
            const options = {
                root,
                config: fixtureConfig(),
                target: fakeAdapter(),
            };
            const first = await generate(options);
            const modified = statSync(join(root, ".pureform/index.ts")).mtimeMs;
            const second = await generate(options);
            expect(second.hash).toBe(first.hash);
            expect(second.changed).toBe(false);
            expect(new Set(Object.values(statuses(second)))).toEqual(
                new Set(["unchanged"]),
            );
            expect(statSync(join(root, ".pureform/index.ts")).mtimeMs).toBe(
                modified,
            );
        });

        it("rewrites when the config, the options, or the target change", async () => {
            const root = tempRoot();
            const base = await generate({
                root,
                config: fixtureConfig(),
                target: fakeAdapter(),
            });
            const config = fixtureConfig();
            (config.themes ??= {}).sharp = {};
            const themed = await generate({
                root,
                config,
                target: fakeAdapter(),
            });
            expect(themed.hash).not.toBe(base.hash);
            expect(statuses(themed)["web/button.ts"]).toBe("written");
            const prefixed = await generate({
                root,
                config,
                target: fakeAdapter(),
                options: { prefix: "x-" },
            });
            expect(prefixed.hash).not.toBe(themed.hash);
            const native = await generate({
                root,
                config,
                target: fakeAdapter("native"),
                options: { prefix: "x-" },
            });
            expect(native.hash).not.toBe(prefixed.hash);
        });

        it("removes generated files no longer wanted, and keeps the app's own", async () => {
            const root = tempRoot();
            await generate({
                root,
                config: fixtureConfig(),
                target: fakeAdapter(),
            });
            writeTree(root, { ".pureform/notes.md": "mine" });
            const result = await generate({
                root,
                config: fixtureConfig(),
                target: fakeAdapter("native"),
            });
            expect(statuses(result)).toMatchObject({
                "native/button.ts": "written",
                "web/button.ts": "removed",
                "web/chip.ts": "removed",
            });
            expect(existsSync(join(root, ".pureform/web"))).toBe(false);
            expect(read(root, "notes.md")).toBe("mine");
        });
    });

    describe("check", () => {
        const setup = async () => {
            const root = tempRoot();
            const options = {
                root,
                config: fixtureConfig(),
                target: fakeAdapter(),
            };
            await generate(options);
            return { root, options };
        };

        it("passes fresh glue and writes nothing", async () => {
            const { root, options } = await setup();
            const modified = statSync(join(root, ".pureform/index.ts")).mtimeMs;
            const result = await generate({ ...options, check: true });
            expect(result.ok).toBe(true);
            expect(result.changed).toBe(false);
            expect(statSync(join(root, ".pureform/index.ts")).mtimeMs).toBe(
                modified,
            );
        });

        it("fails on missing glue without running the adapter", async () => {
            const adapter = fakeAdapter();
            const result = await generate({
                root: tempRoot(),
                config: fixtureConfig(),
                target: adapter,
                check: true,
            });
            expect(result.ok).toBe(false);
            expect(statuses(result)).toEqual({ "index.ts": "missing" });
            expect(adapter.calls).toHaveLength(0);
        });

        it("fails on glue made from other inputs by its hashes, without running the adapter", async () => {
            const { root, options } = await setup();
            const adapter = fakeAdapter();
            const result = await generate({
                ...options,
                target: adapter,
                options: { prefix: "changed-" },
                check: true,
            });
            expect(result.ok).toBe(false);
            expect(new Set(Object.values(statuses(result)))).toEqual(
                new Set(["stale"]),
            );
            expect(Object.keys(statuses(result))).toContain("web/button.ts");
            expect(adapter.calls).toHaveLength(0);
            expect(read(root, "web/button.ts")).toContain('"button"');
        });

        it("compares contents when the hashes match", async () => {
            const { root, options } = await setup();
            const file = join(root, ".pureform/web/chip.ts");
            writeFileSync(file, `${readFileSync(file, "utf8")}// edited\n`);
            const result = await generate({ ...options, check: true });
            expect(result.ok).toBe(false);
            expect(statuses(result)["web/chip.ts"]).toBe("modified");
            expect(statuses(result)["web/button.ts"]).toBe("unchanged");
        });

        it("finds missing and extra files", async () => {
            const { root, options } = await setup();
            const glue = join(root, ".pureform");
            writeTree(glue, {
                "web/old.ts": readFileSync(join(glue, "web/chip.ts"), "utf8"),
            });
            writeFileSync(join(glue, "fake.css"), "");
            const { rmSync } = await import("node:fs");
            rmSync(join(glue, "registry.d.ts"));
            const result = await generate({ ...options, check: true });
            expect(statuses(result)).toMatchObject({
                "fake.css": "stale",
                "registry.d.ts": "missing",
                "web/old.ts": "extra",
            });
        });
    });

    describe("the train check", () => {
        it("fails before generating when installed train packages differ", async () => {
            const root = tempRoot();
            writeTree(root, {
                ...installed("@pureform/core", "0.4.0"),
                ...installed("@pureform/styling", "0.4.1"),
            });
            const adapter = fakeAdapter();
            const error = await rejection(
                generate({ root, config: fixtureConfig(), target: adapter }),
            );
            expect(isGenerateError(error, "train-mismatch")).toBe(true);
            expect((error as Error).message).toContain(
                "Install them at 0.4.1:\n  @pureform/core@0.4.1",
            );
            expect(adapter.calls).toHaveLength(0);
            expect(existsSync(join(root, ".pureform"))).toBe(false);
        });

        it("records the installed train's version, and can be turned off", async () => {
            const root = tempRoot();
            writeTree(root, {
                ...installed("@pureform/core", "0.4.0"),
                ...installed("@pureform/styling", "0.4.1"),
            });
            const result = await generate({
                root,
                config: fixtureConfig(),
                target: fakeAdapter(),
                trainCheck: false,
            });
            expect(result.trainVersion).toBe("0.4.1");
            expect(read(root, "index.ts")).toContain(
                'export const version = "0.4.1";',
            );
        });

        it("puts the installed versions in the hash", async () => {
            const root = tempRoot();
            const options = {
                root,
                config: fixtureConfig(),
                target: fakeAdapter(),
            };
            writeTree(root, installed("@pureform/styling", "0.4.0"));
            const before = await generate(options);
            writeTree(root, installed("@pureform/styling", "0.4.1"));
            const after = await generate({ ...options, check: true });
            expect(after.hash).not.toBe(before.hash);
            expect(after.ok).toBe(false);
        });
    });

    describe("loading", () => {
        it("loads the config from a path, and returns the files to watch", async () => {
            const root = tempRoot();
            writeTree(root, {
                "pureform.config.ts": `import { chip } from "./chip";\nexport default { tokens: {}, semanticTokens: {}, components: { chip } };\n`,
                "chip.ts": `export const chip = { kind: "component", name: "chip", recipe: { base: {} } };\n`,
            });
            const result = await generate({
                root,
                config: "pureform.config.ts",
                target: fakeAdapter(),
            });
            expect(result.dependencies).toEqual([
                join(root, "pureform.config.ts"),
                join(root, "chip.ts"),
            ]);
            expect(read(root, "index.ts")).toContain(
                'export type Components = "chip";',
            );
        });

        it("loads a target's adapter from its package's /codegen subpath", async () => {
            const root = tempRoot();
            writeTree(root, {
                ...installed("@pureform/panda-adapter", "0.0.0-test", {
                    type: "module",
                    exports: { "./codegen": "./codegen.mjs" },
                }),
                "node_modules/@pureform/panda-adapter/codegen.mjs": `export const codegen = { name: "panda", platform: "web", codegen: (context) => ({ components: context.components.map((name) => ({ name, path: \`web/\${name}.ts\`, contents: "export const " + name + " = () => ({});\\n" })) }) };\n`,
            });
            const result = await generate({
                root,
                config: fixtureConfig(),
                target: "panda",
            });
            expect(Object.keys(statuses(result))).toContain("web/button.ts");
        });

        it("names the adapter package to install when it's missing", async () => {
            const error = await rejection(
                generate({
                    root: tempRoot(),
                    config: fixtureConfig(),
                    target: "tailwind",
                }),
            );
            expect(isGenerateError(error, "adapter-not-found")).toBe(true);
            expect((error as Error).message).toContain(
                'the "tailwind" target needs @pureform/tailwind-adapter',
            );
        });
    });

    describe("the adapter's output", () => {
        const failing = (output: unknown) =>
            rejection(
                generate({
                    root: tempRoot(),
                    config: fixtureConfig(),
                    target: defineCodegen({
                        name: "broken",
                        platform: "web",
                        codegen: () => output as never,
                    }),
                }),
            );
        const module = (name: string, path = `web/${name}.ts`) => ({
            name,
            path,
            contents: "",
        });

        it.each([
            [
                "a missing component",
                { components: [module("button")] },
                'returned no module for "chip"',
            ],
            [
                "a component not asked for",
                {
                    components: [
                        module("button"),
                        module("chip"),
                        module("card"),
                    ],
                },
                'returned "card", which weren\'t asked for',
            ],
            [
                "a path outside the folder",
                {
                    components: [
                        module("button", "../button.ts"),
                        module("chip"),
                    ],
                },
                'returned the path "../button.ts"',
            ],
            [
                "a file generate writes itself",
                {
                    components: [module("button"), module("chip")],
                    files: [{ path: "index.ts", contents: "" }],
                },
                'returned "index.ts", which generate writes itself',
            ],
            [
                "a path used twice",
                {
                    components: [
                        module("button"),
                        module("chip", "web/button.ts"),
                    ],
                },
                'returned "web/button.ts" more than once',
            ],
            [
                "a module that isn't code",
                {
                    components: [
                        module("button", "web/button.css"),
                        module("chip"),
                    ],
                },
                'returned "web/button.css" for "button"',
            ],
        ])("rejects %s", async (_, output, message) => {
            const error = await failing(output);
            expect(isGenerateError(error, "adapter-output")).toBe(true);
            expect((error as Error).message).toContain(message);
        });
    });

    describe("hints", () => {
        it("asks to include the folder in a tsconfig that doesn't", async () => {
            const root = tempRoot();
            writeTree(root, { "tsconfig.json": { include: ["src"] } });
            const result = await generate({
                root,
                config: fixtureConfig(),
                target: fakeAdapter(),
            });
            expect(result.hints).toEqual([
                'Add ".pureform/**/*" to "include" in tsconfig.json: TypeScript skips folders whose names start with a dot, so it won\'t see the generated declarations otherwise.',
            ]);
            writeTree(root, {
                "tsconfig.json": { include: ["src", ".pureform/**/*.*"] },
            });
            const included = await generate({
                root,
                config: fixtureConfig(),
                target: fakeAdapter(),
            });
            expect(included.hints).toEqual([]);
        });
    });
});
