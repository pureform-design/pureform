import type {
    listAnatomy,
    listItemAnatomy,
    navigationBarAnatomy,
    navigationRailAnatomy,
    tabsCompositeAnatomy,
} from "@pureform/anatomy";
import { LIST_ROOT_PROPS, listItemVariants } from "@pureform/binding-core";
import type { ListPart } from "@pureform/binding-core";
import { LIST_ITEM_ROOT_PROPS, listItemLines } from "@pureform/binding-core";
import type { ListItemPart } from "@pureform/binding-core";
import {
    NAVIGATION_ROOT_PROPS,
    navigationSelection,
} from "@pureform/binding-core";
import type { NavigationPart } from "@pureform/binding-core";
import {
    TABS_ROOT_PROPS,
    tabsDefaultValue,
    tabsHaveIcons,
    tabsHavePanels,
    tabsItemProps,
    tabsSelection,
} from "@pureform/binding-core";
import type { TabsPart } from "@pureform/binding-core";
import {
    listItemElement,
    listItemRootProps,
    listItemSelection,
} from "@pureform/binding-web";
import {
    navigationItemElement,
    navigationItemElementProps,
    navigationItemMachineProps,
    navigationMachineProps,
} from "@pureform/binding-web";
import { tabsMachineProps, tabsTriggerProps } from "@pureform/binding-web";
import { describe, expect, expectTypeOf, it } from "vitest";

describe("parts", () => {
    it("name each component's parts", () => {
        expectTypeOf<TabsPart>().toEqualTypeOf<
            (typeof tabsCompositeAnatomy.partNames)[number]
        >();
        expectTypeOf<NavigationPart>().toEqualTypeOf<
            | (typeof navigationBarAnatomy.partNames)[number]
            | (typeof navigationRailAnatomy.partNames)[number]
        >();
        expectTypeOf<ListItemPart>().toEqualTypeOf<
            (typeof listItemAnatomy.partNames)[number]
        >();
        expectTypeOf<ListPart>().toEqualTypeOf<
            (typeof listAnatomy.partNames)[number]
        >();
    });

    it("keep the controllable value off the element", () => {
        for (const list of [TABS_ROOT_PROPS, NAVIGATION_ROOT_PROPS] as const) {
            expect(list).toEqual(
                expect.arrayContaining([
                    "value",
                    "defaultValue",
                    "onValueChange",
                ]),
            );
        }
        expect(LIST_ITEM_ROOT_PROPS).toContain("selected");
        expect(LIST_ROOT_PROPS).toContain("testId");
    });
});

describe("tabs", () => {
    it("select the variants, the icon one included", () => {
        expect(
            tabsSelection({
                variant: "secondary",
                icon: true,
                inlineIcon: true,
                color: "x",
            }),
        ).toEqual({
            variant: "secondary",
            icon: true,
            inlineIcon: true,
            color: "x",
            tokens: undefined,
        });
    });

    it("give Zag Root's id as its root id", () => {
        expect(tabsMachineProps({ id: "trips" }).ids.root).toBe("trips");
        expect(tabsMachineProps({ ids: { root: "a" } }).ids.root).toBe("a");
    });

    it("drop data-ssr, and aria-controls when a tab has no panel", () => {
        const zag = {
            "data-ssr": "",
            "aria-controls": "panel",
            role: "tab",
        };
        expect(tabsTriggerProps(zag, { controls: true })).toEqual({
            "aria-controls": "panel",
            role: "tab",
        });
        expect(tabsTriggerProps(zag, { controls: false })).toEqual({
            role: "tab",
        });
    });

    it("disable a tab with the tabs", () => {
        expect(tabsItemProps({ value: "a" }, true)).toEqual({
            value: "a",
            disabled: true,
        });
        expect(tabsItemProps({ value: "a", disabled: true }, false)).toEqual({
            value: "a",
            disabled: true,
        });
    });

    it("default the ready-made tabs to the first enabled tab, unless given or controlled", () => {
        const items = [
            { value: "a", disabled: true },
            { value: "b" },
            { value: "c" },
        ];
        expect(tabsDefaultValue({}, items)).toBe("b");
        expect(tabsDefaultValue({ defaultValue: "c" }, items)).toBe("c");
        expect(tabsDefaultValue({ defaultValue: null }, items)).toBeNull();
        expect(tabsDefaultValue({ value: "c" }, items)).toBeUndefined();
    });

    it("see icons and panels in the items", () => {
        expect(tabsHaveIcons([{}, { icon: "★" }])).toBe(true);
        expect(tabsHaveIcons([{}, { icon: null }])).toBe(false);
        expect(tabsHavePanels([{ content: "x" }])).toBe(true);
        expect(tabsHavePanels([{}])).toBe(false);
    });
});

describe("navigation", () => {
    it("selects the bar's layout and the rail's flags; a modal rail is expanded", () => {
        expect(navigationSelection({ itemLayout: "horizontal" })).toEqual({
            color: undefined,
            itemLayout: "horizontal",
            tokens: undefined,
        });
        expect(
            navigationSelection<"navigationRail">({ modal: true }),
        ).toMatchObject({ expanded: true, modal: true });
        expect(
            navigationSelection<"navigationRail">({
                modal: true,
                expanded: false,
            }),
        ).toMatchObject({ expanded: false, modal: true });
    });

    it("selects the color and tokens", () => {
        expect(navigationSelection({ color: "secondary" })).toEqual({
            color: "secondary",
            tokens: undefined,
        });
    });

    it("gives the machine Root's id and disabled", () => {
        expect(navigationMachineProps({ id: "main", disabled: true })).toEqual({
            disabled: true,
            ids: { root: "main", item: undefined },
        });
    });

    it("renders a destination as a link with an href, else as a button", () => {
        expect(navigationItemElement({ value: "a", href: "/a" })).toBe("a");
        expect(navigationItemElement({ value: "a" })).toBe("button");
        expect(navigationItemMachineProps({ value: "a", href: "/a" })).toEqual({
            value: "a",
            disabled: undefined,
            current: "page",
        });
        expect(navigationItemMachineProps({ value: "a" }).current).toBe("true");
        expect(navigationItemElementProps({ value: "a" }, true)).toEqual({
            type: "button",
            disabled: true,
        });
        expect(
            navigationItemElementProps({ value: "a", href: "/a" }, true),
        ).toEqual({});
    });
});

describe("list item", () => {
    it("renders a link with an href, else as, else a div", () => {
        expect(listItemElement({ href: "/a", as: "button" })).toBe("a");
        expect(listItemElement({ as: "button" })).toBe("button");
        expect(listItemElement({})).toBe("div");
    });

    it("is interactive as a link or a button, unless told", () => {
        expect(listItemSelection({}, "a").interactive).toBe(true);
        expect(listItemSelection({}, "button").interactive).toBe(true);
        expect(listItemSelection({}, "div").interactive).toBe(false);
        expect(
            listItemSelection({ interactive: true }, "div").interactive,
        ).toBe(true);
    });

    it("marks its state on the element", () => {
        expect(listItemRootProps({ selected: true }, "a")).toMatchObject({
            "aria-current": "page",
        });
        expect(listItemRootProps({ selected: true }, "div")).toMatchObject({
            "aria-current": "true",
        });
        expect(listItemRootProps({ disabled: true }, "button")).toEqual({
            type: "button",
            "aria-current": undefined,
            disabled: true,
            "aria-disabled": undefined,
        });
        expect(listItemRootProps({ disabled: true }, "div")).toMatchObject({
            disabled: undefined,
            "aria-disabled": "true",
        });
    });

    it("counts its lines from its content", () => {
        expect(listItemLines({})).toBe("one");
        expect(listItemLines({ supportingText: "x" })).toBe("two");
        expect(listItemLines({ overline: "x", supportingText: "y" })).toBe(
            "three",
        );
    });

    it("takes the list's variants under its own", () => {
        expect(
            listItemVariants(
                { density: "compact", color: "a" },
                { color: "b", tokens: { paddingInline: 2 } as never },
            ),
        ).toEqual({
            lines: undefined,
            interactive: undefined,
            density: "compact",
            color: "b",
            tokens: { paddingInline: 2 },
        });
    });
});
