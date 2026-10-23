import { describe, expect, it } from "vitest";

import {
    MENU_CASCADE_MIN_WIDTH,
    menuDrillLevel,
    menuSubmenuMode,
} from "./menu";

describe("menuSubmenuMode", () => {
    it("keeps cascade and drill, and makes auto cascade in a wide window and drill in a compact one", () => {
        expect(menuSubmenuMode("cascade", 320)).toBe("cascade");
        expect(menuSubmenuMode("drill", 1280)).toBe("drill");
        expect(menuSubmenuMode(undefined, 1280)).toBe("cascade");
        expect(menuSubmenuMode("auto", MENU_CASCADE_MIN_WIDTH)).toBe("cascade");
        expect(menuSubmenuMode("auto", MENU_CASCADE_MIN_WIDTH - 1)).toBe(
            "drill",
        );
        // Before the window is known (a server's render): cascade.
        expect(menuSubmenuMode("auto", undefined)).toBe("cascade");
    });
});

describe("menuDrillLevel", () => {
    const items = [
        { value: "cut", label: "Cut" },
        {
            value: "share",
            label: "Share",
            items: [
                { value: "mail", label: "Mail" },
                {
                    value: "more",
                    label: "More",
                    items: [{ value: "print", label: "Print" }],
                },
            ],
        },
    ];
    const groups = [{ id: "g", items: [{ value: "help", label: "Help" }] }];

    it("shows the top level's items and groups at the start", () => {
        expect(menuDrillLevel(items, groups, [])).toEqual({
            submenu: undefined,
            depth: 0,
            items,
            groups,
        });
    });

    it("shows a submenu's items alone, however deep, and stops at a value that opens none", () => {
        const one = menuDrillLevel(items, groups, ["share"]);
        expect(one.submenu?.value).toBe("share");
        expect(one.items.map((item) => item.value)).toEqual(["mail", "more"]);
        expect(one.groups).toEqual([]);
        const two = menuDrillLevel(items, groups, ["share", "more"]);
        expect(two.depth).toBe(2);
        expect(two.items.map((item) => item.value)).toEqual(["print"]);
        expect(menuDrillLevel(items, groups, ["cut", "x"]).depth).toBe(0);
    });
});
