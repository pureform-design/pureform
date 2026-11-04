import type { GenerateResult } from "@pureform/generate";
import { describe, expect, it } from "vitest";

import { describePruning } from "./index";

const result = (tokenPruning?: GenerateResult["tokenPruning"]) =>
    ({
        components: ["button"],
        ...(tokenPruning && { tokenPruning }),
    }) as unknown as GenerateResult;

describe("describePruning", () => {
    it("says nothing about tokens when pruning didn't run", () => {
        expect(describePruning(result())).not.toContain("tokens");
    });

    it("says what token pruning kept", () => {
        const line = describePruning(
            result({
                tokens: { kept: 312, total: 843 },
                themes: { kept: 2, total: 4 },
            }),
        );
        expect(line).toContain("kept 312 of 843 tokens, 2 of 4 themes");
    });

    it("leaves out what it kept whole", () => {
        const line = describePruning(
            result({
                tokens: { kept: 5, total: 5 },
                themes: { kept: 0, total: 0 },
            }),
        );
        expect(line).not.toContain("kept 5");
    });
});
