import { formatLinearEasing, sampleSpring } from "@pureform/core";
import { spring } from "@pureform/core/ast";
import { describe, expect, it } from "vitest";

import { joinClasses, tokenStyle, withTokenStyle } from "./tokens";

const vars = {
    value: "--components-circularProgress-value",
    accent: "--components-circularProgress-accent",
} as const;

describe("tokenStyle", () => {
    it("names each token's var and stringifies numbers", () => {
        expect(tokenStyle({ value: 0.4, accent: "red" }, vars)).toEqual({
            "--components-circularProgress-value": "0.4",
            "--components-circularProgress-accent": "red",
        });
    });

    it("writes a spring as the token's duration and easing vars", () => {
        const fast = spring({ stiffness: 800, damping: 0.6 });
        const { duration, points } = sampleSpring(fast);
        expect(
            tokenStyle(
                { move: fast },
                { move: "--components-tabs-indicatorSpring" },
            ),
        ).toEqual({
            "--components-tabs-indicatorSpring-duration": `${duration}ms`,
            "--components-tabs-indicatorSpring-easing":
                formatLinearEasing(points),
            "--components-tabs-indicatorSpring-stiffness": "800",
            "--components-tabs-indicatorSpring-damping": "0.6",
            "--components-tabs-indicatorSpring-mass": "1",
        });
    });

    it("reads a spring role's vars for a role's name on a spring token", () => {
        expect(
            tokenStyle(
                { move: "spatialSlow", accent: "red" },
                {
                    move: "--components-tabs-indicatorSpring",
                    accent: "--components-tabs-accent",
                },
                { move: "--pf-springs" },
            ),
        ).toEqual({
            "--components-tabs-indicatorSpring-duration":
                "var(--pf-springs-spatial-slow-duration)",
            "--components-tabs-indicatorSpring-easing":
                "var(--pf-springs-spatial-slow-easing)",
            "--components-tabs-indicatorSpring-stiffness":
                "var(--pf-springs-spatial-slow-stiffness)",
            "--components-tabs-indicatorSpring-damping":
                "var(--pf-springs-spatial-slow-damping)",
            "--components-tabs-indicatorSpring-mass":
                "var(--pf-springs-spatial-slow-mass)",
            "--components-tabs-accent": "red",
        });
    });

    it("gives nothing when no known token is set", () => {
        expect(tokenStyle(undefined, vars)).toBeUndefined();
        expect(tokenStyle({}, vars)).toBeUndefined();
        expect(
            tokenStyle({ value: undefined, other: 1 }, vars),
        ).toBeUndefined();
    });
});

describe("withTokenStyle", () => {
    const slots = Object.freeze({
        root: Object.freeze({ class: "root" }),
        label: Object.freeze({ class: "label" }),
    });

    it("passes the slots through when no token is set", () => {
        expect(withTokenStyle(slots, undefined, vars)).toBe(slots);
        expect(withTokenStyle(slots, {}, vars)).toBe(slots);
    });

    it("adds the vars to the root's style, leaving the rest as they were", () => {
        const result = withTokenStyle(slots, { value: 1 }, vars);
        expect(result).toEqual({
            root: {
                class: "root",
                style: { "--components-circularProgress-value": "1" },
            },
            label: { class: "label" },
        });
        expect(result.label).toBe(slots.label);
        expect(Object.isFrozen(result.root)).toBe(true);
        expect(slots.root).toEqual({ class: "root" });
    });

    it("adds them to another slot, keeping its style", () => {
        const styled = {
            box: { class: "box", style: { "--a": "1" } },
        } as const;
        expect(withTokenStyle(styled, { accent: "red" }, vars, "box")).toEqual({
            box: {
                class: "box",
                style: {
                    "--a": "1",
                    "--components-circularProgress-accent": "red",
                },
            },
        });
    });
});

describe("joinClasses", () => {
    it("joins with spaces and skips empty parts", () => {
        expect(joinClasses("a", false, undefined, "", null, "b")).toBe("a b");
        expect(joinClasses()).toBe("");
    });
});
