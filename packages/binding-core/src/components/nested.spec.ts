import { describe, expect, it } from "vitest";

import {
    LIST_ITEM_CONTENT_PROPS,
    listItemExpandMachineProps,
} from "./list-item";
import { hasSubmenu, submenuPositioning } from "./menu";

describe("expandable list item", () => {
    it("takes the region as content, kept off Root", () => {
        expect(LIST_ITEM_CONTENT_PROPS).toContain("region");
    });
});

describe("expandable list item on Zag's accordion", () => {
    it("is one collapsible item, controlled while expanded is given", () => {
        expect(listItemExpandMachineProps({})).toMatchObject({
            collapsible: true,
            multiple: false,
            value: undefined,
            defaultValue: [],
        });
        expect(listItemExpandMachineProps({ expanded: true }).value).toEqual([
            "item",
        ]);
        expect(
            listItemExpandMachineProps({ defaultExpanded: true }).defaultValue,
        ).toEqual(["item"]);
    });

    it("reports whether it expanded", () => {
        const seen: boolean[] = [];
        const props = listItemExpandMachineProps({
            onExpandedChange: ({ expanded }) => seen.push(expanded),
        });
        props.onValueChange({ value: ["item"] });
        props.onValueChange({ value: [] });
        expect(seen).toEqual([true, false]);
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
