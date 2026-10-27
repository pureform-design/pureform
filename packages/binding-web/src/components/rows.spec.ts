import {
    listItemPosition,
    listItemVariants,
    listSelection,
    tilePosition,
} from "@pureform/binding-core";
import { menuGrouped, menuSelection } from "@pureform/binding-core";
import { selectGroupedItems, selectItemGroups } from "@pureform/binding-core";
import { listItemSelection } from "@pureform/binding-web";
import { menuItemMachineProps } from "@pureform/binding-web";
import { describe, expect, it } from "vitest";

describe("list", () => {
    it("places each item among a segmented list's tiles", () => {
        expect(listItemPosition(0, 1, true)).toBe("single");
        expect([0, 1, 2].map((i) => listItemPosition(i, 3, true))).toEqual([
            "first",
            "middle",
            "last",
        ]);
        expect(listItemPosition(1, 3, false)).toBe("none");
    });

    it("places a tile in any run of tiles", () => {
        expect([0, 1, 2, 3].map((i) => tilePosition(i, 4))).toEqual([
            "first",
            "middle",
            "middle",
            "last",
        ]);
        expect(tilePosition(0, 1)).toBe("single");
    });

    it("selects its variant, and gives its items its leading type", () => {
        expect(listSelection({ variant: "segmented" })).toEqual({
            variant: "segmented",
            tokens: undefined,
        });
        const item = listItemVariants(
            { leadingType: "avatar" },
            { position: "first" },
        );
        expect(item.leadingType).toBe("avatar");
        expect(item.position).toBe("first");
        expect(listItemSelection(item, "div")).toMatchObject({
            leadingType: "avatar",
            position: "first",
        });
    });
});

describe("menu", () => {
    it("is grouped when given groups, unless told", () => {
        expect(menuGrouped({})).toBe(false);
        expect(menuGrouped({ groups: [{ id: "a", items: [] }] })).toBe(true);
        expect(
            menuGrouped({ grouped: false, groups: [{ id: "a", items: [] }] }),
        ).toBe(false);
        expect(menuSelection({ vibrant: true })).toMatchObject({
            vibrant: true,
        });
    });

    it("takes a toggleable item's props from Zag's option item", () => {
        const api = {
            getItemProps: (item: object) => ({ kind: "item", ...item }),
            getOptionItemProps: (item: object) => ({ kind: "option", ...item }),
        };
        expect(menuItemMachineProps(api, { value: "cut" })).toMatchObject({
            kind: "item",
            value: "cut",
        });
        expect(
            menuItemMachineProps(api, { value: "grid", type: "checkbox" }),
        ).toMatchObject({ kind: "option", type: "checkbox", checked: false });
    });
});

describe("select", () => {
    it("groups its options in the order each group first appears", () => {
        const items = [
            { value: "a", label: "A" },
            { value: "x", label: "X", group: "Fruit" },
            { value: "y", label: "Y", group: "Veg" },
            { value: "z", label: "Z", group: "Fruit" },
        ];
        expect(
            selectItemGroups(items).map((g) => [
                g.group,
                g.items.map((i) => i.value),
            ]),
        ).toEqual([
            [undefined, ["a"]],
            ["Fruit", ["x", "z"]],
            ["Veg", ["y"]],
        ]);
        expect(selectGroupedItems(items).map((i) => i.value)).toEqual([
            "a",
            "x",
            "z",
            "y",
        ]);
    });
});
