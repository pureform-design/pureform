// What the editor and `tsc` see of `.pureform/`: the same after a build as after a dev server,
// with several targets, and declared once.

import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { generateTargets } from "@pureform/generate";
import { describe, expect, it } from "vitest";

import { fakeAdapter, tempApp, writeTree } from "./__fixtures__/app";

const TSC = resolve(__dirname, "../node_modules/.bin/tsc");

// Runs `tsc --noEmit` in an app, returning what it printed.
const typecheck = (root: string): string => {
    try {
        execFileSync(TSC, ["--noEmit", "-p", "tsconfig.json"], {
            cwd: root,
            encoding: "utf8",
        });
        return "";
    } catch (error) {
        return String((error as { stdout?: string }).stdout ?? error);
    }
};

// Every file under `.pureform/` that declares a module.
const declaring = (root: string): string[] =>
    (
        readdirSync(join(root, ".pureform"), {
            recursive: true,
            withFileTypes: true,
        }) as { isFile(): boolean; parentPath: string; name: string }[]
    )
        .filter((entry) => entry.isFile())
        .map((entry) => join(entry.parentPath, entry.name))
        .filter((file) => readFileSync(file, "utf8").includes("declare module"))
        .map((file) => file.slice(join(root, ".pureform").length + 1));

describe("types of .pureform/", () => {
    it("type-check the same after a build and after a dev server, with several targets", async () => {
        const root = tempApp("chip", "divider");
        writeTree(root, {
            "tsconfig.json": JSON.stringify({
                compilerOptions: {
                    strict: true,
                    module: "esnext",
                    moduleResolution: "bundler",
                    target: "esnext",
                    skipLibCheck: true,
                    noEmit: true,
                    allowImportingTsExtensions: true,
                },
                include: ["src", ".pureform/**/*.*"],
            }),
            "src/app.ts": `import { registry, themes } from "../.pureform";\nimport { registry as native } from "../.pureform/native";\nimport type { ComponentRegistry } from "@pureform/styling";\nexport const names: readonly string[] = [...registry.names, ...native.names];\nexport const theme: "teal" = themes[0];\nexport type Chip = ComponentRegistry["chip"];\n`,
        });
        const options = {
            root,
            config: "pureform.config.ts",
            versionCheck: false,
            targets: {
                web: { target: fakeAdapter() },
                native: { target: fakeAdapter("native") },
            },
        };
        await generateTargets({
            ...options,
            pruned: true,
            usage: { components: ["chip"], variants: {} },
        });
        const afterBuild = typecheck(root);
        await generateTargets(options);
        const afterDev = typecheck(root);
        expect(afterBuild).toBe("");
        expect(afterDev).toBe(afterBuild);
        expect(declaring(root)).toEqual(["registry.d.ts"]);
    });
});
