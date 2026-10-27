import { linearEasing } from "@pureform/core/ast";
import { cubicBezier, linear } from "react-native-reanimated";
import { describe, expect, it, vi } from "vitest";

import { cssEasing } from "./reanimated";
import { LINEAR } from "./values";

vi.mock("react-native-reanimated", () => ({
    cubicBezier: vi.fn((...points: number[]) => ({ bezier: points })),
    linear: vi.fn((...points: unknown[]) => ({ linear: points })),
}));

describe("Reanimated's native timing API", () => {
    it("passes sampled stops directly, keeping omissions, duplicates, and overshoot", () => {
        cssEasing(linearEasing(0, [1.2, 50], [0.8, 50], 1));
        expect(linear).toHaveBeenLastCalledWith(
            0,
            [1.2, "50%"],
            [0.8, "50%"],
            1,
        );
    });

    it("translates Bézier and keyword nodes without CSS parsing", () => {
        cssEasing({
            type: "easing",
            kind: "cubicBezier",
            points: [0.2, -0.4, 0, 1.3],
        });
        expect(cubicBezier).toHaveBeenLastCalledWith(0.2, -0.4, 0, 1.3);
        cssEasing({ type: "easing", kind: "keyword", name: "ease" });
        expect(cubicBezier).toHaveBeenLastCalledWith(0.25, 0.1, 0.25, 1);
        cssEasing(LINEAR);
        expect(cubicBezier).toHaveBeenLastCalledWith(0, 0, 1, 1);
    });

    it("keeps Native's existing steps-as-linear behavior", () => {
        expect(
            cssEasing({
                type: "easing",
                kind: "steps",
                steps: { count: 3, jump: "start" },
            }),
        ).toBe("linear");
    });
});
