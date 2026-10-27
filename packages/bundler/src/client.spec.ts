import { spawnSync } from "node:child_process";
import { symlinkSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { fakeAdapter, tempApp } from "./__fixtures__/app";
import { unpluginFactory } from "./plugin";

const TSCONFIG = resolve(__dirname, "../../tsconfig/base.json");
const TSC = join(
    createRequire(import.meta.url).resolve("typescript/package.json"),
    "..",
    "bin",
    "tsc",
);

const APP = [
    'import { registry, themes, version } from "virtual:pureform/registry";',
    'import type { Components } from "virtual:pureform/registry";',
    "",
    "export const names: readonly string[] = registry.names;",
    'export const chip = registry.entry("chip").kind;',
    'export const first: Components = "divider";',
    "export const theme: string | undefined = themes[0];",
    "export const built: string = version;",
    "// @ts-expect-error: not registered",
    'registry.entry("nope");',
    "// @ts-expect-error: not registered",
    'export const wrong: Components = "nope";',
];

/** Type checks an app of `names` against one client entry; returns tsc's output and the files
 *  it loaded. */
const check = async (entry: string, source: string[]) => {
    const root = tempApp("chip", "divider");
    symlinkSync(
        resolve(__dirname, ".."),
        join(root, "node_modules/@pureform/bundler"),
    );
    const plugin = unpluginFactory(
        { root, target: fakeAdapter() },
        { framework: "rollup" },
    );
    await (plugin.buildStart as () => Promise<void>).call({
        addWatchFile: () => undefined,
    });
    writeFileSync(join(root, "app.ts"), [...source, ""].join("\n"));
    writeFileSync(
        join(root, "tsconfig.json"),
        JSON.stringify({
            extends: TSCONFIG,
            compilerOptions: {
                noEmit: true,
                types: [entry],
            },
            include: ["app.ts", ".pureform/registry.d.ts"],
        }),
    );
    // TypeScript 7 has no compiler API, so this runs its `tsc`.
    const checked = spawnSync(
        process.execPath,
        [TSC, "-p", root, "--pretty", "false", "--listFiles"],
        { encoding: "utf8" },
    );
    const lines = checked.stdout.split("\n").filter(Boolean);
    return {
        status: checked.status,
        errors: lines.filter((line) => !line.startsWith("/")),
        files: lines.filter((line) => line.startsWith("/")),
    };
};

const isStylingWeb = (file: string) => /\/styling-web\//.test(file);

describe("@pureform/bundler/client", () => {
    it(
        "types virtual:pureform/registry as the neutral registry, loading no web package",
        { timeout: 60_000 },
        async () => {
            const checked = await check("@pureform/bundler/client", [
                ...APP,
                'import type { Registry } from "@pureform/styling";',
                "export const neutral: Registry<any> = registry;",
                "// @ts-expect-error: a web registry's field, absent from a neutral one",
                "export const attribute = registry.themeAttribute;",
                "// @ts-expect-error: a web registry's method, absent from a neutral one",
                'registry.themeAttributes("dark");',
            ]);
            expect(checked.errors).toEqual([]);
            expect(checked.status).toBe(0);
            expect(checked.files.filter(isStylingWeb)).toEqual([]);
        },
    );
});

describe("@pureform/bundler/client-web", () => {
    it(
        "types virtual:pureform/registry as a web registry",
        { timeout: 60_000 },
        async () => {
            const checked = await check("@pureform/bundler/client-web", [
                ...APP,
                'import type { Registry } from "@pureform/styling";',
                "type Any = Registry<any>;",
                'import type { AnyWebRegistry } from "@pureform/styling-web";',
                "export const neutral: Registry<any> = registry;",
                "export const web: AnyWebRegistry = registry;",
                "export const attribute: string | undefined = registry.themeAttribute;",
                'export const attributes: Readonly<Record<string, string>> = registry.themeAttributes("dark");',
            ]);
            expect(checked.errors).toEqual([]);
            expect(checked.status).toBe(0);
            expect(checked.files.filter(isStylingWeb)).not.toEqual([]);
        },
    );
});
