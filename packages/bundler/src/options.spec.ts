import { join } from "node:path";

import type { GenerateResult } from "@pureform/generate";
import { describe, expect, it } from "vitest";

import { tempApp, writeTree } from "./__fixtures__/app";
import { describeResult, generateOptions } from "./options";

const result = (statuses: string[]): GenerateResult =>
    ({
        root: "/app",
        outDir: "/app/.pureform",
        files: statuses.map((status, index) => ({
            path: `web/${index}.ts`,
            status,
        })),
    }) as unknown as GenerateResult;

describe("generateOptions", () => {
    it("finds the config in the root and leaves out what isn't set", () => {
        const root = tempApp("chip");
        expect(
            generateOptions({ target: "panda", watch: false }, root),
        ).toEqual({ target: "panda", config: "pureform.config.ts", root });
        writeTree(root, { "pureform.config.mjs": "" });
        expect(
            generateOptions(
                {
                    target: "css",
                    config: "design.ts",
                    options: { prefix: "pf" },
                    components: ["chip"],
                    outDir: "glue",
                },
                join(root, "other"),
            ),
        ).toEqual({
            target: "css",
            config: "design.ts",
            options: { prefix: "pf" },
            components: ["chip"],
            outDir: "glue",
            root: join(root, "other"),
        });
    });
});

describe("describeResult", () => {
    it("says nothing when nothing changed", () => {
        expect(describeResult(result(["unchanged"]))).toBeUndefined();
    });

    it("names a few files, and counts many", () => {
        expect(
            describeResult(result(["written", "unchanged", "removed"])),
        ).toBe(
            "pureform: updated .pureform/ (written web/0.ts, removed web/2.ts)",
        );
        expect(
            describeResult(
                result(["written", "written", "written", "removed"]),
            ),
        ).toBe("pureform: updated .pureform/ (3 written, 1 removed)");
    });
});
