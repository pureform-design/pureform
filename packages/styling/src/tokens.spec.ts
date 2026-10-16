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
