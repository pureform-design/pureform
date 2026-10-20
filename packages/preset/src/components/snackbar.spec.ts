import { describe, expect, it } from "vitest";

import { configWith } from "../__fixtures__/config";
import { snackbar } from "./snackbar";

describe("snackbar", () => {
    it("validates against a full pureform config", () => {
        expect(() => configWith(snackbar)).not.toThrow();
    });

    it("wraps the action and close button in an actions part", () => {
        expect(snackbar.slots).toContain("actions");
        expect(snackbar.recipe.base.actions).toBeDefined();
    });

    it("has one-line, two-line and long-action layouts, one-line by default", () => {
        expect(Object.keys(snackbar.recipe.variants?.layout ?? {})).toEqual([
            "oneLine",
            "twoLine",
            "longAction",
        ]);
        expect(snackbar.recipe.defaultVariants).toEqual({ layout: "oneLine" });
    });

    it("wraps the long layout's actions below the text, at the end", () => {
        const long = snackbar.recipe.variants?.layout?.longAction;
        expect(long?.root?.flexWrap).toBeDefined();
        expect(long?.supportingText?.flexBasis).toBeDefined();
        expect(long?.actions?.marginInlineStart).toBeDefined();
        expect(snackbar.recipe.compoundVariants ?? []).toHaveLength(0);
    });
});
