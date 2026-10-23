// An example's `as: undefined` leaves the component's `as: "button"` out (Card's "not
// interactive"): JSON and Storybook's arg merge both lose the `undefined`, so the story names it.

import { describe, expect, it } from "vitest";

import { withoutUnset } from "../src/renderers/multi-render";

describe("withoutUnset", () => {
    const component = { as: "button", children: "Plan" };

    it("drops an arg the story leaves out", () => {
        expect(
            withoutUnset({ ...component, variant: "outlined" }, component, {
                pureform: { unset: ["as"] },
            }),
        ).toEqual({ children: "Plan", variant: "outlined" });
    });

    it("keeps one a control changed, and every arg without the parameter", () => {
        expect(
            withoutUnset({ ...component, as: "a" }, component, {
                pureform: { unset: ["as"] },
            }),
        ).toEqual({ ...component, as: "a" });
        expect(withoutUnset(component, component, {})).toEqual(component);
    });
});
