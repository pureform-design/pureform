// Icon slots own the icon's fill and direction: every icon slot reads its component's `iconFill`
// token as Material Symbols' fill axis, the states Material draws filled switch it on, and an
// icon marked `data-pf-mirror` flips under rtl.

import { compilePreset } from "@pureform/panda-adapter";
import { describe, expect, it } from "vitest";

import { pureform } from "./pureform";

const recipes = compilePreset(pureform()).theme!;

/** Every icon slot, by component. */
const ICON_SLOTS: Record<string, string[]> = {
    button: ["icon", "secondaryIcon"],
    chip: ["icon", "trailingIcon"],
    dialog: ["icon"],
    fab: ["icon"],
    iconButton: ["icon"],
    inputChip: ["icon", "remove"],
    listItem: ["leading", "trailing"],
    menu: ["itemLeading", "itemTrailing"],
    navigationBar: ["icon"],
    navigationRail: ["icon"],
    appBar: ["leading", "trailing"],
    searchBar: ["leading", "trailing"],
    select: ["leadingIcon", "trailingIcon"],
    autocomplete: ["leadingIcon", "trailingIcon"],
    searchView: ["leading", "trailing"],
    tabs: ["icon"],
    tagsInput: ["leadingIcon", "trailingIcon"],
    textArea: ["leadingIcon", "trailingIcon"],
    textField: ["leadingIcon", "trailingIcon"],
};

type Style = Record<string, unknown>;

const slotStyle = (component: string, slot: string): Style =>
    recipes.slotRecipes![component]!.base![slot] as Style;

// A conditional value's cases, by selector, with the base under `base`.
const cases = (value: unknown): Record<string, string> =>
    typeof value === "string"
        ? { base: value }
        : (value as Record<string, string>);

const fill = (component: string, token: string, rest: number) =>
    `"FILL" var(--components-${component}-${token}, ${rest})`;

describe("icon fill", () => {
    it("reads each component's iconFill token in every icon slot", () => {
        for (const [component, slots] of Object.entries(ICON_SLOTS)) {
            for (const slot of slots) {
                const { fontVariationSettings } = slotStyle(component, slot);
                expect(
                    cases(fontVariationSettings).base,
                    `${component}.${slot}`,
                ).toBe(fill(component, "iconFill", 0));
            }
        }
    });

    it("fills the current destination's icon", () => {
        for (const component of ["navigationBar", "navigationRail"]) {
            const { base, ...on } = cases(
                slotStyle(component, "icon").fontVariationSettings,
            );
            expect(base).toBe(fill(component, "iconFill", 0));
            expect(on).toEqual({
                [`.${component}__item:is([aria-selected=true], [aria-pressed=true], [aria-current]:not([aria-current=false])) &`]:
                    fill(component, "activeIconFill", 1),
            });
        }
    });

    it("fills a selected icon button's icon", () => {
        const { base, ...on } = cases(
            slotStyle("iconButton", "icon").fontVariationSettings,
        );
        expect(base).toBe(fill("iconButton", "iconFill", 0));
        expect(on).toEqual({
            ".iconButton__root:is([aria-selected=true], [aria-pressed=true], [aria-current]:not([aria-current=false])) &":
                fill("iconButton", "selectedIconFill", 1),
        });
    });

    it("leaves a standalone icon to its slot unless filled says otherwise", () => {
        const { variants } = recipes.recipes!.icon!;
        expect(variants!.filled).toEqual({
            inherit: {},
            false: { fontVariationSettings: '"FILL" 0' },
            true: { fontVariationSettings: '"FILL" 1' },
        });
        expect(variants!.size!.medium).not.toHaveProperty(
            "fontVariationSettings",
        );
    });
});

describe("icon mirror", () => {
    const mirrored = (style: Style) =>
        (style._rtl as Record<string, Style> | undefined)?.[
            "&[data-pf-mirror]"
        ];

    it("flips every icon slot marked data-pf-mirror under rtl", () => {
        for (const [component, slots] of Object.entries(ICON_SLOTS)) {
            for (const slot of slots) {
                const style = slotStyle(component, slot);
                expect(mirrored(style), `${component}.${slot}`).toEqual({
                    transform: style.transform
                        ? `${cases(style.transform).base} scaleX(-1)`
                        : "scaleX(-1)",
                });
            }
        }
    });

    it("keeps a field icon's centering when it flips", () => {
        expect(mirrored(slotStyle("textField", "leadingIcon"))).toEqual({
            transform: "translateY(-50%) scaleX(-1)",
        });
    });

    it("flips a standalone icon at every size", () => {
        const { size } = recipes.recipes!.icon!.variants!;
        for (const style of Object.values(size!)) {
            expect(mirrored(style as Style)).toEqual({
                transform: "scaleX(-1)",
            });
        }
    });
});
