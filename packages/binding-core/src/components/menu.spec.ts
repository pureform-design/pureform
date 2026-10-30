import { describe, expect, it } from "vitest";

import {
    MENU_BACK_VALUE,
    menuDrillLevel,
    menuDrillPathTo,
    menuDrillPick,
    MENU_SUBMENU_MARGIN,
    menuSubmenuAdapt,
    menuSubmenuMode,
    menuSubmenuRoomOf,
} from "./menu";

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

    it("measures the submenu's own size beside its row, down from its top or up from its bottom", () => {
        const boundary = { left: 0, right: 1000, top: 0, bottom: 600 };
        const menu = { left: 100, right: 300 };
        const room = (top: number, width: number, height: number) =>
            menuSubmenuRoomOf(menu, boundary, {
                row: { top, bottom: top + 48 },
                size: { width, height },
            });
        // A submenu wider than its menu, which still fits beside it.
        expect(room(100, 500, 200)).toEqual({
            beside: 700,
            needed: 500,
            upright: 500,
            neededHeight: 200,
        });
        expect(menuSubmenuMode("auto", room(100, 500, 200))).toBe("cascade");
        // Too wide for either side.
        expect(menuSubmenuMode("auto", room(100, 800, 200))).toBe("drill");
        // Near the bottom it opens upward from the row's bottom instead.
        expect(menuSubmenuMode("auto", room(500, 200, 400))).toBe("cascade");
        // Taller than the room either way: it drills.
        expect(room(250, 200, 400).upright).toBe(350);
        expect(menuSubmenuMode("auto", room(250, 200, 400))).toBe("drill");
        // No top or bottom: unbounded downward.
        expect(
            menuSubmenuMode(
                "auto",
                menuSubmenuRoomOf(
                    menu,
                    { left: 0, right: 1000 },
                    {
                        row: { top: 0, bottom: 48 },
                        size: { width: 200, height: 5000 },
                    },
                ),
            ),
        ).toBe("cascade");
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

describe("menuDrillPick", () => {
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
    it("drills in on a submenu's item, out on the back row, and leaves a leaf to the app", () => {
        expect(menuDrillPick(items, [], [], "share")).toEqual(["share"]);
        expect(menuDrillPick(items, [], ["share"], "more")).toEqual([
            "share",
            "more",
        ]);
        expect(
            menuDrillPick(items, [], ["share", "more"], MENU_BACK_VALUE),
        ).toEqual(["share"]);
        expect(menuDrillPick(items, [], [], "cut")).toBeUndefined();
        expect(menuDrillPick(items, [], ["share"], "mail")).toBeUndefined();
        // A stale path ends where it stops opening submenus.
        expect(menuDrillPick(items, [], ["gone"], "share")).toEqual(["share"]);
    });
});

describe("menuDrillPathTo", () => {
    it("finds a submenu item at any depth, and nothing for a leaf", () => {
        const items = [
            { value: "cut", label: "Cut" },
            {
                value: "share",
                label: "Share",
                items: [
                    {
                        value: "social",
                        label: "Social",
                        items: [{ value: "post", label: "Post" }],
                    },
                ],
            },
        ];
        const groups = [
            {
                id: "more",
                items: [
                    {
                        value: "tools",
                        label: "Tools",
                        items: [{ value: "x", label: "X" }],
                    },
                ],
            },
        ];
        expect(menuDrillPathTo(items, groups, "share")).toEqual(["share"]);
        expect(menuDrillPathTo(items, groups, "social")).toEqual([
            "share",
            "social",
        ]);
        expect(menuDrillPathTo(items, groups, "tools")).toEqual(["tools"]);
        expect(menuDrillPathTo(items, groups, "cut")).toBeUndefined();
        expect(menuDrillPathTo(items, groups, "post")).toBeUndefined();
    });
});

describe("menuSubmenuAdapt", () => {
    const room = (beside: number, needed = 100) => ({ beside, needed });

    it("drills a cascade as soon as it doesn't fit, and keeps it when it does", () => {
        expect(menuSubmenuAdapt("cascade", room(100))).toBe("cascade");
        expect(menuSubmenuAdapt("cascade", room(99))).toBe("drill");
    });

    it("cascades a drill again only with the margin to spare, so the boundary doesn't flicker", () => {
        expect(menuSubmenuAdapt("drill", room(100))).toBe("drill");
        expect(
            menuSubmenuAdapt("drill", room(100 + MENU_SUBMENU_MARGIN - 1)),
        ).toBe("drill");
        expect(
            menuSubmenuAdapt("drill", room(100 + MENU_SUBMENU_MARGIN)),
        ).toBe("cascade");
    });

    it("applies the margin to height, and keeps the mode when unmeasured", () => {
        const tall = (upright: number) => ({
            beside: 500,
            needed: 100,
            upright,
            neededHeight: 200,
        });
        expect(menuSubmenuAdapt("cascade", tall(200))).toBe("cascade");
        expect(menuSubmenuAdapt("drill", tall(200))).toBe("drill");
        expect(menuSubmenuAdapt("drill", tall(216))).toBe("cascade");
        expect(menuSubmenuAdapt("drill", undefined)).toBe("drill");
        expect(menuSubmenuAdapt("cascade", undefined)).toBe("cascade");
    });
});
