import { describe, expect, it } from "vitest";

import { partAttributes, partSlot } from "./attributes";
import {
    compositeTestIds,
    dialogBackdropAnatomy,
    dialogOverlayAnatomy,
    listAnatomy,
    menuOverlayAnatomy,
    radioGroupAnatomy,
    selectMenuAnatomy,
    tabsCompositeAnatomy,
    tooltipOverlayAnatomy,
} from "./composites";
import {
    anatomy,
    dialogAnatomy,
    menuAnatomy,
    tabsAnatomy,
    tooltipAnatomy,
} from "./generated";
import type { ComponentAnatomy } from "./types";

describe("composites", () => {
    it.each([
        ["the select's menu", selectMenuAnatomy, menuAnatomy],
        ["the menu's overlay", menuOverlayAnatomy, menuAnatomy],
        ["the tabs", tabsCompositeAnatomy, tabsAnatomy],
    ] as const)(
        "%s shows indication where the preset's component does",
        (_, composite, preset) => {
            expect(composite.indication).toEqual(preset.indication);
        },
    );

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

    it.each([
        ["menu", menuOverlayAnatomy, menuAnatomy, compositeTestIds.menu],
        [
            "tooltip",
            tooltipOverlayAnatomy,
            tooltipAnatomy,
            compositeTestIds.tooltip,
        ],
        [
            "dialog",
            dialogOverlayAnatomy,
            dialogAnatomy,
            compositeTestIds.dialog,
        ],
    ] as const)(
        "the %s's overlay draws every slot of the preset's, its surface as content, and wraps it in unstyled parts",
        (_, overlay, preset, ids) => {
            const parts = overlay.parts as ComponentAnatomy["parts"];
            const slots = Object.values(parts)
                .filter((part) => part.styled)
                .map(partSlot);
            expect(slots.sort()).toEqual([...preset.partNames].sort());
            expect(partSlot(parts.content!)).toBe("root");
            expect(partSlot(parts.root!)).toBeNull();
            for (const name of ["root", "trigger", "positioner"]) {
                expect(parts[name]!.styled).toBe(false);
            }
            for (const name of overlay.partNames) {
                expect(parts[name]!.testId).toBe(
                    (ids as Record<string, string>)[name],
                );
                if (parts[name]!.styled && name !== "content") {
                    expect(parts[name]!.mirror).toBe(
                        (preset.parts as ComponentAnatomy["parts"])[name]!
                            .mirror,
                    );
                }
            }
            expect(partAttributes(overlay, "root")["data-testid"]).toBe(
                preset.parts.root.testId,
            );
        },
    );

    it("the dialog's backdrop is drawn by the scrim, under the dialog's scope", () => {
        expect(dialogBackdropAnatomy.name).toBe("scrim");
        expect(partAttributes(dialogBackdropAnatomy, "root")).toEqual({
            "data-scope": "dialog",
            "data-pf-part": "backdrop",
            "data-testid": compositeTestIds.dialogBackdrop.root,
        });
    });

    it("the tabs draw every slot of the preset's, the tab list as list, between unstyled Root and panels", () => {
        const parts = tabsCompositeAnatomy.parts as ComponentAnatomy["parts"];
        const slots = Object.values(parts)
            .filter((part) => part.styled)
            .map(partSlot);
        expect(slots.sort()).toEqual([...tabsAnatomy.partNames].sort());
        expect(partSlot(parts.list!)).toBe("root");
        expect(partSlot(parts.root!)).toBeNull();
        expect(parts.content!.styled).toBe(false);
        for (const name of tabsCompositeAnatomy.partNames) {
            expect(parts[name]!.testId).toBe(compositeTestIds.tabs[name]);
            const preset = (tabsAnatomy.parts as ComponentAnatomy["parts"])[
                name
            ];
            if (preset && name !== "root") {
                expect(parts[name]!.mirror).toBe(preset.mirror);
            }
        }
        expect(
            partAttributes(tabsCompositeAnatomy, "root")["data-testid"],
        ).toBe(tabsAnatomy.parts.root.testId);
    });

    it("the list is unstyled, around its items", () => {
        expect(Object.keys(anatomy)).not.toContain(listAnatomy.name);
        for (const name of listAnatomy.partNames) {
            expect(listAnatomy.parts[name].styled).toBe(false);
            expect(listAnatomy.parts[name].testId).toBe(
                compositeTestIds.list[name],
            );
        }
    });
});
