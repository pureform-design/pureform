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

describe("@pureform/bundler/client", () => {
    it(
        "types virtual:pureform/registry from the generated declarations",
        { timeout: 60_000 },
        async () => {
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
            writeFileSync(
                join(root, "app.ts"),
                [
                    'import { registry, themes, version } from "virtual:pureform/registry";',
                    'import type { Components } from "virtual:pureform/registry";',
                    "",
                    "export const names: readonly string[] = registry.names;",
                    'export const chip = registry.entry("chip").kind;',
                    'export const first: Components = "divider";',
                    "export const theme: string | undefined = themes[0];",
                    "// @ts-expect-error: not registered",
                    'registry.entry("nope");',
                    "// @ts-expect-error: not registered",
                    'export const wrong: Components = "nope";',
                    "",
                ].join("\n"),
            );
            writeFileSync(
                join(root, "tsconfig.json"),
                JSON.stringify({
                    extends: TSCONFIG,
                    compilerOptions: {
                        noEmit: true,
                        types: ["@pureform/bundler/client"],
                    },
                    include: ["app.ts", ".pureform/registry.d.ts"],
                }),
            );
            // TypeScript 7 has no compiler API, so this runs its `tsc`.
            const checked = spawnSync(
                process.execPath,
                [TSC, "-p", root, "--pretty", "false"],
                { encoding: "utf8" },
            );
            expect(checked.stdout.split("\n").filter(Boolean)).toEqual([]);
            expect(checked.status).toBe(0);
        },
    );
});
