import { linearEasing } from "@pureform/core/ast";
import { describe, expect, it } from "vitest";

import { formatLinearEasing, parseLinearEasing } from "./easing";

describe("CSS linear easing transport", () => {
    it("round trips omitted inputs and overshoot", () => {
        const points = linearEasing(0, [0.4, 20], [1.05, 60.5], 1).points;
        const text = formatLinearEasing(points);
        expect(text).toBe("linear(0, 0.4 20%, 1.05 60.5%, 1)");
        expect(parseLinearEasing(text)).toEqual(points);
    });

    it("expands flat stops and preserves duplicate inputs", () => {
        expect(parseLinearEasing("linear(0, 0.5 10% 20%, 0.8 20%, 1)")).toEqual(
            [[0], [0.5, 10], [0.5, 20], [0.8, 20], [1]],
        );
    });

    it("rejects other curves and invalid points", () => {
        for (const text of [
            "cubic-bezier(0, 0, 1, 1)",
            "linear(0)",
            "linear(0, NaN)",
            "linear(0 60%, 1 20%)",
        ])
            expect(parseLinearEasing(text)).toBeUndefined();
    });
});
