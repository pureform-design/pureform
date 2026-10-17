import { describe, expect, it } from "vitest";

import { partAttributes } from "./attributes";
import { compositeTestIds, radioGroupAnatomy } from "./composites";
import { anatomy } from "./generated";

describe("composites", () => {
    it("aren't preset components, and the registry doesn't style them", () => {
        expect(Object.keys(anatomy)).not.toContain(radioGroupAnatomy.name);
        expect(radioGroupAnatomy.parts.root.styled).toBe(false);
    });

    it("carry the attributes and test ids of any part", () => {
        expect(partAttributes(radioGroupAnatomy, "root", "size")).toEqual({
            "data-scope": "radio-group",
            "data-pf-part": "root",
            "data-testid": "size-root",
        });
        expect(compositeTestIds.radioGroup.root).toBe(
            radioGroupAnatomy.parts.root.testId,
        );
    });
});
