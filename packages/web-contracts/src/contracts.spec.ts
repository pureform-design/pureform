import type { PortableCondition } from "@pureform/core/ast";
import { describe, expect, expectTypeOf, it } from "vitest";

import {
    STATE_ATTRIBUTES,
    MOTION_ATTRIBUTE,
    MOTION_PROPERTY,
    REDUCED_MOTION_QUERY,
    PART_ATTRIBUTE,
    SCOPE_ATTRIBUTE,
    TEST_ID_ATTRIBUTE,
} from "./index";
import type { AttributeState, StateAttribute, PartAttributes } from "./index";

describe("web wire contracts", () => {
    it("preserves every explicit state name, including names unlike the semantic state", () => {
        expect(STATE_ATTRIBUTES).toEqual({
            hover: "data-pf-hover",
            pressed: "data-pf-active",
            dragged: "data-pf-dragging",
            filled: "data-pf-filled",
            mirrored: "data-pf-mirror",
            overflowing: "data-pf-overflowing",
            descending: "data-pf-descending",
        });
        expectTypeOf<AttributeState>().toExtend<PortableCondition>();
        expectTypeOf<StateAttribute>().toExtend<`data-${string}`>();
    });

    it("preserves anatomy and motion wire names", () => {
        expect([PART_ATTRIBUTE, SCOPE_ATTRIBUTE, TEST_ID_ATTRIBUTE]).toEqual([
            "data-pf-part",
            "data-scope",
            "data-testid",
        ]);
        expect(MOTION_ATTRIBUTE).toBe("data-pf-motion");
        expect(MOTION_PROPERTY).toBe("--pf-motion");
        expect(REDUCED_MOTION_QUERY).toBe("(prefers-reduced-motion: reduce)");
        expectTypeOf<keyof PartAttributes>().toEqualTypeOf<
            "data-pf-part" | "data-scope" | "data-testid"
        >();
    });
});
