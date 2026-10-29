import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { fakeAdapter, fixtureConfig, tempRoot } from "./__fixtures__/project";
import { defineCodegen } from "./adapter";
import { isGenerateError } from "./errors";
import { entryFile, generateTargets, OUTPUT_ENV } from "./targets";

const read = (root: string, path: string) =>
    readFileSync(join(root, ".pureform", path), "utf8");

const body = (contents: string) => contents.split("\n").slice(3).join("\n");

// Every file under a folder, relative to it.
const tree = (dir: string): string[] =>
    existsSync(dir)
        ? (
              readdirSync(dir, { recursive: true, withFileTypes: true }) as {
                  isFile(): boolean;
                  parentPath: string;
                  name: string;
              }[]
          )
              .filter((entry) => entry.isFile())
              .map((entry) =>
                  join(entry.parentPath, entry.name).slice(dir.length + 1),
              )
              .sort()
        : [];

// A web adapter that writes a script other tools load, as Panda's `panda.ts`.
const scriptAdapter = () =>
    defineCodegen({
        name: "script",
        platform: "web",
        codegen: (context) => ({
            components: context.components.map((name) => ({
                name,
                path: `web/${name}.ts`,
                contents: `export const ${name} = () => ({});\n`,
            })),
            files: [
                {
                    path: "panda.ts",
                    contents: `export const staticCss = ${JSON.stringify(context.components)};\nexport type Names = string;\n`,
                },
            ],
        }),
    });

describe("generateTargets", () => {
    it("publishes a complete final plan when target sets overlap", async () => {
        const root = tempRoot();
        const first = fakeAdapter();
        const other = defineCodegen({ ...fakeAdapter(), name: "other" });
        await Promise.all([
            generateTargets({
                root,
                config: fixtureConfig(),
                targets: { first: { target: first }, other: { target: other } },
            }),
            generateTargets({
                root,
                config: fixtureConfig(),
                targets: { other: { target: other, components: ["chip"] } },
            }),
        ]);
        for (const file of tree(join(root, ".pureform")).filter((file) =>
            file.endsWith(".ts"),
        )) {
            for (const match of read(root, file).matchAll(
                /from "([.][/][^"]+)"/g,
            )) {
                expect(
                    existsSync(
                        join(root, ".pureform", file, "..", `${match[1]}.ts`),
                    ),
                ).toBe(true);
            }
        }
    });

    it("writes a single target's full output under its name, with top-level entries and declarations", async () => {
        const root = tempRoot();
        const result = await generateTargets({
            root,
            config: fixtureConfig(),
            target: fakeAdapter(),
        });
        expect(result.defaultTarget).toBe("fake");
        expect(tree(join(root, ".pureform"))).toEqual([
            "fake.css",
            "fake/full/fake.css",
            "fake/full/index.ts",
            "fake/full/web/button.ts",
            "fake/full/web/chip.ts",
            "index.ts",
            "registry.d.ts",
        ]);
        expect(body(read(root, "index.ts"))).toBe(
            'export * from "./fake/full/index";\n',
        );
        expect(body(read(root, "fake.css"))).toBe(
            '@import "./fake/full/fake.css";\n',
        );
        expect(read(root, "registry.d.ts")).toContain(
            'declare module "@pureform/styling"',
        );
    });

    it("keeps full and pruned apart, so a build and a dev server don't overwrite each other", async () => {
        const root = tempRoot();
        const options = {
            root,
            config: fixtureConfig(),
            target: fakeAdapter(),
        };
        await generateTargets(options);
        const full = read(root, "fake/full/index.ts");
        const top = read(root, "index.ts");
        const declarations = read(root, "registry.d.ts");
        await generateTargets({
            ...options,
            pruned: true,
            usage: { components: ["chip"], variants: {} },
        });
        expect(read(root, "fake/full/index.ts")).toBe(full);
        expect(read(root, "fake/pruned/index.ts")).not.toContain("button");
        // The editor's view doesn't depend on which ran last.
        expect(read(root, "index.ts")).toBe(top);
        expect(read(root, "registry.d.ts")).toBe(declarations);
        const again = await generateTargets(options);
        expect(again.changed).toBe(false);
        expect(existsSync(join(root, ".pureform/fake/pruned/index.ts"))).toBe(
            true,
        );
    });

    it("declares the registry only at the top", async () => {
        const root = tempRoot();
        await generateTargets({
            root,
            config: fixtureConfig(),
            targets: {
                web: { target: fakeAdapter() },
                native: { target: fakeAdapter("native") },
            },
            pruned: true,
            usage: { components: ["button"], variants: {} },
        });
        const declaring = tree(join(root, ".pureform")).filter((path) =>
            read(root, path).includes("declare module"),
        );
        expect(declaring).toEqual(["registry.d.ts"]);
    });

    it("writes several targets, an entry per target, and entries from the first web target", async () => {
        const root = tempRoot();
        const result = await generateTargets({
            root,
            config: fixtureConfig(),
            targets: {
                native: { target: fakeAdapter("native"), components: ["chip"] },
                web: { target: fakeAdapter() },
            },
        });
        expect(result.defaultTarget).toBe("web");
        expect(body(read(root, "index.ts"))).toBe(
            'export * from "./web/full/index";\n',
        );
        expect(body(read(root, "native.ts"))).toBe(
            'export * from "./native/full/index";\n',
        );
        expect(read(root, "native/full/index.ts")).not.toContain("button");
        expect(result.entries["index.ts"]).toEqual({
            target: undefined,
            file: "index.ts",
        });
        expect(result.entries["native.ts"]).toEqual({
            target: "native",
            file: "index.ts",
        });
    });

    it("maps an entry to the target and output a bundler asks for", async () => {
        const root = tempRoot();
        const result = await generateTargets({
            root,
            config: fixtureConfig(),
            targets: {
                web: { target: fakeAdapter() },
                native: { target: fakeAdapter("native") },
            },
            pruned: true,
            usage: { components: ["chip"], variants: {} },
        });
        const out = join(root, ".pureform");
        expect(entryFile(result, out, "native", "pruned")).toBe(
            join(out, "native/pruned/index.ts"),
        );
        expect(entryFile(result, join(out, "index"), "web", "full")).toBe(
            join(out, "web/full/index.ts"),
        );
        expect(entryFile(result, join(out, "native.ts"), "web", "full")).toBe(
            join(out, "native/full/index.ts"),
        );
        expect(
            entryFile(result, join(out, "fake.css"), "native", "pruned"),
        ).toBe(join(out, "web/pruned/fake.css"));
        expect(
            entryFile(result, join(out, "web/full/index.ts"), "web", "full"),
        ).toBeUndefined();
    });

    it("lets a script entry that tools load outside the bundler pick the pruned output", async () => {
        const root = tempRoot();
        await generateTargets({
            root,
            config: fixtureConfig(),
            target: scriptAdapter(),
            pruned: true,
            usage: { components: ["chip"], variants: {} },
        });
        const entry = body(read(root, "panda.ts"));
        expect(entry).toContain(`env?.["${OUTPUT_ENV}"] === "pruned"`);
        expect(entry).toContain("export const staticCss = chosen.staticCss;");
        expect(entry).toContain(
            'export type { Names } from "./script/full/panda";',
        );
    });

    it("removes generated files of an older layout", async () => {
        const root = tempRoot();
        const { generate } = await import("./generate");
        await generate({
            root,
            config: fixtureConfig(),
            target: fakeAdapter(),
        });
        expect(existsSync(join(root, ".pureform/web/button.ts"))).toBe(true);
        await generateTargets({
            root,
            config: fixtureConfig(),
            target: fakeAdapter(),
        });
        expect(existsSync(join(root, ".pureform/web/button.ts"))).toBe(false);
    });

    it("checks every target and the entries", async () => {
        const root = tempRoot();
        const options = {
            root,
            config: fixtureConfig(),
            targets: {
                web: { target: fakeAdapter() },
                native: { target: fakeAdapter("native") },
            },
        };
        expect((await generateTargets({ ...options, check: true })).ok).toBe(
            false,
        );
        await generateTargets(options);
        expect((await generateTargets({ ...options, check: true })).ok).toBe(
            true,
        );
    });

    it("rejects both target and targets, and names that clash with entries", async () => {
        const root = tempRoot();
        const both = await generateTargets({
            root,
            config: fixtureConfig(),
            target: fakeAdapter(),
            targets: { web: { target: fakeAdapter() } },
        }).catch((error: unknown) => error);
        expect(isGenerateError(both)).toBe(true);
        const clash = await generateTargets({
            root,
            config: fixtureConfig(),
            targets: {
                index: { target: fakeAdapter() },
                native: { target: fakeAdapter("native") },
            },
        }).catch((error: unknown) => error);
        expect(String(clash)).toContain('"index"');
    });
});
