import { buttonAnatomy, iconButtonAnatomy } from "@pureform/anatomy";
import {
    PART_ATTRIBUTE,
    SCOPE_ATTRIBUTE,
    TEST_ID_ATTRIBUTE,
} from "@pureform/web-contracts";
import { describe, expect, it } from "vitest";

import { partAttributes } from "./anatomy";

describe("partAttributes", () => {
    it("names the scope, the part, and the test id", () => {
        expect(partAttributes(iconButtonAnatomy, "touchTarget")).toEqual({
            [SCOPE_ATTRIBUTE]: "icon-button",
            [PART_ATTRIBUTE]: "touch-target",
            [TEST_ID_ATTRIBUTE]: "pf-icon-button-touch-target",
        });
        expect(partAttributes(buttonAnatomy, "label", "save")).toEqual({
            "data-scope": "button",
            "data-pf-part": "label",
            "data-testid": "save-label",
        });
    });

    it("gives every instance without a test id the same frozen attributes", () => {
        const attributes = partAttributes(buttonAnatomy, "label");
        expect(partAttributes(buttonAnatomy, "label")).toBe(attributes);
        expect(Object.isFrozen(attributes)).toBe(true);
        expect(partAttributes(buttonAnatomy, "label", "save")).not.toBe(
            attributes,
        );
    });
});
