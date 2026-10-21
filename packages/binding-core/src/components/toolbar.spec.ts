import { describe, expect, it } from "vitest";

import { overflowCount } from "../overflow";
import {
    toolbarKeyTarget,
    toolbarMenuItems,
    toolbarMenuSelect,
    toolbarOverflowTestId,
    toolbarRootProps,
    toolbarSelection,
} from "./toolbar";
import type { ToolbarItem } from "./toolbar";

describe("overflowCount", () => {
    it("keeps every element when they fit, gaps included", () => {
        expect(
            overflowCount({
                sizes: [40, 40, 40],
                available: 128,
                gap: 4,
                trigger: 40,
            }),
        ).toBe(3);
    });

    it("keeps as many as fit before the overflow button", () => {
        // 40 + 4 + 40 + 4 + 40 (the button) = 128.
        expect(
            overflowCount({
                sizes: [40, 40, 40, 40],
                available: 130,
                gap: 4,
                trigger: 40,
            }),
        ).toBe(2);
        expect(
            overflowCount({
                sizes: [40, 40],
                available: 30,
                gap: 4,
                trigger: 40,
            }),
        ).toBe(0);
    });

    it("stops at the first element that doesn't fit, keeping the order", () => {
        expect(
            overflowCount({
                sizes: [40, 100, 20],
                available: 120,
                gap: 0,
                trigger: 40,
            }),
        ).toBe(1);
    });

    it("forgives a rounding error under half a pixel", () => {
        expect(
            overflowCount({
                sizes: [40.3, 40.3],
                available: 80.4,
                gap: 0,
                trigger: 40,
            }),
        ).toBe(2);
    });
});

describe("toolbar", () => {
    const items: ToolbarItem<string>[] = [
        { value: "bold", label: "Bold", icon: "B", selected: true },
        { value: "italic", label: "Italic", icon: "I", disabled: true },
        { value: "link", label: "Link", onClick: () => {} },
    ];

    it("selects overflow only when on", () => {
        expect(toolbarSelection({ color: "vibrant" })).toEqual({
            placement: undefined,
            orientation: undefined,
            color: "vibrant",
            overflow: undefined,
            tokens: undefined,
        });
        expect(toolbarSelection({ overflow: true }).overflow).toBe(true);
    });

    it("is a toolbar with its orientation", () => {
        expect(toolbarRootProps({})).toEqual({
            role: "toolbar",
            "aria-orientation": "horizontal",
        });
        expect(
            toolbarRootProps({ orientation: "vertical" })["aria-orientation"],
        ).toBe("vertical");
    });

    it("moves the elements past the count into menu items, toggles as checkboxes", () => {
        const menu = toolbarMenuItems(items, 1);
        expect(menu.map((item) => item.value)).toEqual(["italic", "link"]);
        expect(menu[0]).toMatchObject({
            label: "Italic",
            leadingIcon: "I",
            disabled: true,
        });
        expect(menu[0]?.type).toBeUndefined();
        expect(toolbarMenuItems(items, 0)[0]).toMatchObject({
            type: "checkbox",
            checked: true,
        });
    });

    it("runs a chosen menu item's click", () => {
        let clicked = "";
        toolbarMenuSelect(
            [{ value: "a", label: "A", onClick: () => (clicked = "a") }],
            "a",
        );
        expect(clicked).toBe("a");
        expect(() => toolbarMenuSelect(items, "missing")).not.toThrow();
    });

    it("names the overflow button under the toolbar's test id", () => {
        expect(toolbarOverflowTestId("edit")).toBe("edit-overflow");
        expect(toolbarOverflowTestId(undefined)).toBe("pf-toolbar-overflow");
    });

    it("moves focus along the orientation, mirrored under rtl, wrapping", () => {
        expect(toolbarKeyTarget("ArrowRight", 0, 3, "horizontal", "ltr")).toBe(
            1,
        );
        expect(toolbarKeyTarget("ArrowLeft", 0, 3, "horizontal", "ltr")).toBe(
            2,
        );
        expect(toolbarKeyTarget("ArrowLeft", 0, 3, "horizontal", "rtl")).toBe(
            1,
        );
        expect(toolbarKeyTarget("ArrowDown", 2, 3, "vertical", "rtl")).toBe(0);
        expect(
            toolbarKeyTarget("ArrowDown", 0, 3, "horizontal", "ltr"),
        ).toBeUndefined();
        expect(toolbarKeyTarget("End", 0, 3, "horizontal", "ltr")).toBe(2);
        expect(toolbarKeyTarget("Home", 2, 3, "vertical", "ltr")).toBe(0);
        expect(
            toolbarKeyTarget("ArrowRight", 0, 0, "horizontal", "ltr"),
        ).toBeUndefined();
    });
});
