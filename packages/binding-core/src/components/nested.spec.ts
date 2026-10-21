import { describe, expect, it } from "vitest";

import {
    LIST_ITEM_CONTENT_PROPS,
    listItemExpandIds,
    listItemExpandRowProps,
    listItemRegionProps,
} from "./list-item";
import { hasSubmenu, submenuPositioning } from "./menu";

describe("expandable list item", () => {
    const ids = listItemExpandIds("mail");

    it("names the region from the row and the row from the region", () => {
        expect(listItemExpandRowProps(ids, true)).toEqual({
            id: "mail-row",
            "aria-expanded": "true",
            "aria-controls": "mail-region",
        });
        expect(listItemRegionProps(ids, true)).toEqual({
            id: "mail-region",
            role: "region",
            "aria-labelledby": "mail-row",
            hidden: undefined,
        });
    });

    it("hides the region while collapsed", () => {
        expect(listItemExpandRowProps(ids, false)["aria-expanded"]).toBe(
            "false",
        );
        expect(listItemRegionProps(ids, false).hidden).toBe(true);
    });

    it("takes the region as content, kept off Root", () => {
        expect(LIST_ITEM_CONTENT_PROPS).toContain("region");
    });
});

describe("submenu", () => {
    it("opens beside its item, toward the end of the line", () => {
        expect(submenuPositioning("ltr").placement).toBe("right-start");
        expect(submenuPositioning("rtl").placement).toBe("left-start");
        expect(
            submenuPositioning("ltr", { placement: "bottom" }).placement,
        ).toBe("bottom");
    });

    it("opens only for an item with items", () => {
        expect(hasSubmenu({})).toBe(false);
        expect(hasSubmenu({ items: [] })).toBe(false);
        expect(hasSubmenu({ items: [{ value: "a", label: "A" }] })).toBe(true);
    });
});
