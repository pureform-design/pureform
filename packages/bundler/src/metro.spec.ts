import { existsSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { isGenerateError } from "@pureform/generate";
import { describe, expect, it } from "vitest";

import {
    configSource,
    eventually,
    fakeAdapter,
    outputFile,
    tempApp,
    writeTree,
} from "./__fixtures__/app";
import { withPureform } from "./metro";
import type { MetroResolutionContext } from "./metro";
import { REGISTRY_ID } from "./options";

const rejection = async (promise: Promise<unknown>) => {
    try {
        await promise;
    } catch (error) {
        return error;
    }
    throw new Error("expected a rejection");
};

// A resolution context whose own resolver answers with the module's name.
const context = (root: string): MetroResolutionContext => ({
    originModulePath: join(root, "App.tsx"),
    resolveRequest: (_, moduleName) => ({ type: "context", moduleName }),
});

describe("withPureform", () => {
    it("generates before Metro starts, and resolves the registry to the index", async () => {
        const root = tempApp("chip");
        const config = await withPureform(
            { projectRoot: root, transformer: { keep: true } },
            { target: fakeAdapter(), watch: false },
        );
        expect(config.transformer).toEqual({ keep: true });
        expect(outputFile(root, "web/chip.ts")).toContain('"chip"');
        const resolve = config.resolver!.resolveRequest!;
        expect(resolve(context(root), REGISTRY_ID, "ios")).toEqual({
            type: "sourceFile",
            filePath: join(root, ".pureform/index.ts"),
        });
        expect(resolve(context(root), "react", "ios")).toEqual({
            type: "context",
            moduleName: "react",
        });

        rmSync(join(root, ".pureform"), { recursive: true });
        let error: unknown;
        try {
            resolve(context(root), REGISTRY_ID, "ios");
        } catch (thrown) {
            error = thrown;
        }
        expect(isGenerateError(error, "missing-output")).toBe(true);
        expect((error as Error).message).toContain(
            "the generated registry in .pureform/ is missing (imported from App.tsx)",
        );
    });

    it("goes through the config's own resolveRequest for other modules", async () => {
        const root = tempApp("chip");
        const config = await withPureform(
            {
                projectRoot: root,
                resolver: {
                    sourceExts: ["ts"],
                    resolveRequest: (_, moduleName) => ({
                        type: "own",
                        moduleName,
                    }),
                },
            },
            { target: fakeAdapter(), watch: false },
        );
        expect(config.resolver?.["sourceExts"]).toEqual(["ts"]);
        expect(
            config.resolver!.resolveRequest!(context(root), "react", null),
        ).toEqual({ type: "own", moduleName: "react" });
    });

    it("fails when the first generation does", async () => {
        const root = tempApp("chip");
        writeTree(root, { "pureform.config.ts": "export default 1;\n" });
        for (const watch of [false, true]) {
            const error = await rejection(
                withPureform(
                    { projectRoot: root },
                    { target: fakeAdapter(), watch },
                ),
            );
            expect(isGenerateError(error, "config-export")).toBe(true);
        }
    });

    it("generates again when the config changes", async () => {
        const root = tempApp("chip");
        await withPureform({ projectRoot: root }, { target: fakeAdapter() });
        writeFileSync(
            join(root, "pureform.config.ts"),
            configSource("chip", "badge"),
        );
        await eventually(() =>
            existsSync(join(root, ".pureform/web/badge.ts")),
        );
    });
});
