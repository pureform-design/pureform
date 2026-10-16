import { describe, expect, it } from "vitest";

import { tempRoot, writeTree } from "./__fixtures__/project";
import { isGenerateError } from "./errors";
import { assertGlue, missingGlueMessage } from "./missing";

describe("missing glue", () => {
    it("names both ways to generate it", () => {
        expect(missingGlueMessage(".pureform/", "src/main.tsx")).toBe(
            [
                "pureform: the generated glue in .pureform/ is missing (imported from src/main.tsx).",
                "Generate it with `pureform generate` from @pureform/cli (for tsc, lint, and tests, for example in the `prepare` script),",
                "or add the pureform plugin from @pureform/bundler to the bundler's config, which writes it when dev or build starts.",
            ].join("\n"),
        );
    });

    it("throws when the folder has no index, and passes once it does", () => {
        const root = tempRoot();
        let error: unknown;
        try {
            assertGlue(".pureform", { root });
        } catch (thrown) {
            error = thrown;
        }
        expect(isGenerateError(error, "missing-glue")).toBe(true);
        expect((error as Error).message).toContain(
            "the generated glue in .pureform/ is missing.",
        );
        writeTree(root, { ".pureform/index.ts": "export {};" });
        expect(() => assertGlue(".pureform", { root })).not.toThrow();
    });
});
