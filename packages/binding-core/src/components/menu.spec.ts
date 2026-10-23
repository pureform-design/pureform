import { describe, expect, it } from "vitest";

import { menuDrillLevel, menuSubmenuMode, menuSubmenuRoomOf } from "./menu";

describe("menuSubmenuMode", () => {
    it("keeps cascade and drill, and makes auto cascade when a submenu fits beside the menu", () => {
        const tight = { beside: 100, needed: 200 };
        const roomy = { beside: 200, needed: 200 };
        expect(menuSubmenuMode("cascade", tight)).toBe("cascade");
        expect(menuSubmenuMode("drill", roomy)).toBe("drill");
        expect(menuSubmenuMode(undefined, roomy)).toBe("cascade");
        expect(menuSubmenuMode("auto", roomy)).toBe("cascade");
        expect(menuSubmenuMode("auto", tight)).toBe("drill");
        // Before the menu is measured (a server's render): cascade.
        expect(menuSubmenuMode("auto", undefined)).toBe("cascade");
    });
});

describe("menuSubmenuRoomOf", () => {
    it("takes the wider side beside the menu, inside its boundary", () => {
        const boundary = { left: 0, right: 1000 };
        expect(menuSubmenuRoomOf({ left: 100, right: 300 }, boundary)).toEqual({
            beside: 700,
            needed: 200,
        });
        expect(menuSubmenuRoomOf({ left: 750, right: 950 }, boundary)).toEqual({
            beside: 750,
            needed: 200,
        });
        // A menu filling a narrow container (a side panel) in a wide window has no room.
        expect(
            menuSubmenuRoomOf({ left: 20, right: 300 }, { left: 0, right: 320 })
                .beside,
        ).toBe(20);
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
