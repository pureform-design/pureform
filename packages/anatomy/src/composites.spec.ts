import { describe, expect, it } from "vitest";

import { partAttributes } from "./attributes";
import {
    compositeTestIds,
    radioGroupAnatomy,
    selectMenuAnatomy,
} from "./composites";
import { anatomy, menuAnatomy } from "./generated";

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

    it("the select's menu takes the menu's slot names, under the select's scope and test ids", () => {
        for (const part of selectMenuAnatomy.partNames) {
            expect(selectMenuAnatomy.parts[part].styled).toBe(
                (menuAnatomy.partNames as readonly string[]).includes(part),
            );
            expect(selectMenuAnatomy.parts[part].testId).toBe(
                compositeTestIds.selectMenu[part],
            );
        }
        expect(partAttributes(selectMenuAnatomy, "root")).toEqual({
            "data-scope": "select",
            "data-pf-part": "content",
            "data-testid": "pf-select-content",
        });
    });
});
