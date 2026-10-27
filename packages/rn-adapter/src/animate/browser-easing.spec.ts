import { linearEasing } from "@pureform/core/ast";
import { describe, expect, it } from "vitest";

import { browserEasing } from "./browser-easing";

describe("RN-Web's browser easing boundary", () => {
    it("serializes sampled stops only for WAAPI", () => {
        expect(browserEasing(linearEasing(0, [1.2, 50], [0.8, 50], 1))).toBe(
            "linear(0, 1.2 50%, 0.8 50%, 1)",
        );
    });

    it("serializes named and explicit Béziers, keeping Native steps linear", () => {
        expect(
            browserEasing({ type: "easing", kind: "keyword", name: "easeOut" }),
        ).toBe("cubic-bezier(0, 0, 0.58, 1)");
        expect(
            browserEasing({
                type: "easing",
                kind: "cubicBezier",
                points: [0.2, -0.4, 0, 1.3],
            }),
        ).toBe("cubic-bezier(0.2, -0.4, 0, 1.3)");
        expect(
            browserEasing({
                type: "easing",
                kind: "steps",
                steps: { count: 2 },
            }),
        ).toBe("linear");
    });
});
