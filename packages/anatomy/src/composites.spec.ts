import { describe, expect, it } from "vitest";

import { partAttributes, partSlot } from "./attributes";
import {
    autocompleteMenuAnatomy,
    bottomSheetBackdropAnatomy,
    bottomSheetOverlayAnatomy,
    compositeTestIds,
    datePickerBackdropAnatomy,
    datePickerOverlayAnatomy,
    dialogBackdropAnatomy,
    dialogOverlayAnatomy,
    dockedDatePickerOverlayAnatomy,
    fullscreenDialogOverlayAnatomy,
    menuOverlayAnatomy,
    radioGroupAnatomy,
    searchViewMenuAnatomy,
    searchViewOverlayAnatomy,
    selectMenuAnatomy,
    sideSheetBackdropAnatomy,
    sideSheetOverlayAnatomy,
    tabsCompositeAnatomy,
    popoverOverlayAnatomy,
    richTooltipOverlayAnatomy,
    tooltipOverlayAnatomy,
} from "./composites";
import {
    anatomy,
    bottomSheetAnatomy,
    datePickerAnatomy,
    dockedDatePickerAnatomy,
    dialogAnatomy,
    fullscreenDialogAnatomy,
    menuAnatomy,
    popoverAnatomy,
    richTooltipAnatomy,
    searchViewAnatomy,
    sideSheetAnatomy,
    tabsAnatomy,
    tooltipAnatomy,
} from "./generated";
import type { ComponentAnatomy } from "./types";

describe("composites", () => {
    it.each([
        ["the select's menu", selectMenuAnatomy, menuAnatomy],
        ["the autocomplete's menu", autocompleteMenuAnatomy, menuAnatomy],
        ["the search view's items", searchViewMenuAnatomy, menuAnatomy],
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
            "richTooltip",
            richTooltipOverlayAnatomy,
            richTooltipAnatomy,
            compositeTestIds.richTooltip,
        ],
        [
            "popover",
            popoverOverlayAnatomy,
            popoverAnatomy,
            compositeTestIds.popover,
        ],
        [
            "dialog",
            dialogOverlayAnatomy,
            dialogAnatomy,
            compositeTestIds.dialog,
        ],
        [
            "datePicker",
            datePickerOverlayAnatomy,
            datePickerAnatomy,
            compositeTestIds.datePicker,
        ],
        [
            "fullscreenDialog",
            fullscreenDialogOverlayAnatomy,
            fullscreenDialogAnatomy,
            compositeTestIds.fullscreenDialog,
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

    it("the menu's context trigger is an unstyled part of the root, named as Zag names it", () => {
        const part = menuOverlayAnatomy.parts.contextTrigger;
        expect(part.styled).toBe(false);
        expect(part.parent).toBe("root");
        expect(part.attribute).toBe("context-trigger");
        expect(menuOverlayAnatomy.parts.root.children).toContain(
            "contextTrigger",
        );
    });

    it("the autocomplete's menu is the select's under the autocomplete's scope and test ids", () => {
        expect(autocompleteMenuAnatomy.partNames).toEqual(
            selectMenuAnatomy.partNames,
        );
        for (const part of autocompleteMenuAnatomy.partNames) {
            expect(autocompleteMenuAnatomy.parts[part].testId).toBe(
                compositeTestIds.autocompleteMenu[part],
            );
        }
        expect(partAttributes(autocompleteMenuAnatomy, "root")).toEqual({
            "data-scope": "autocomplete",
            "data-pf-part": "content",
            "data-testid": "pf-autocomplete-content",
        });
    });

    it("the search view draws every slot of the preset's, its surface as surface, in unstyled parts", () => {
        const parts =
            searchViewOverlayAnatomy.parts as ComponentAnatomy["parts"];
        const slots = Object.values(parts)
            .filter((part) => part.styled)
            .map(partSlot);
        expect(slots.sort()).toEqual([...searchViewAnatomy.partNames].sort());
        expect(partSlot(parts.surface!)).toBe("root");
        expect(partSlot(parts.root!)).toBeNull();
        for (const name of ["root", "trigger", "positioner"])
            expect(parts[name]!.styled).toBe(false);
        for (const name of searchViewOverlayAnatomy.partNames) {
            expect(parts[name]!.testId).toBe(compositeTestIds.searchView[name]);
            if (parts[name]!.styled && name !== "surface")
                expect(parts[name]!.mirror).toBe(
                    (searchViewAnatomy.parts as ComponentAnatomy["parts"])[
                        name
                    ]!.mirror,
                );
        }
    });

    it("the search view's items take the menu's item slots under its scope", () => {
        for (const part of searchViewMenuAnatomy.partNames) {
            expect(menuAnatomy.partNames).toContain(part);
            expect(searchViewMenuAnatomy.parts[part].testId).toBe(
                compositeTestIds.searchViewMenu[part],
            );
            expect(searchViewMenuAnatomy.parts[part].mirror).toBe(
                menuAnatomy.parts[part].mirror,
            );
        }
    });

    it("the docked date picker adds Zag's positioner, unstyled, around its popup", () => {
        const parts =
            dockedDatePickerOverlayAnatomy.parts as ComponentAnatomy["parts"];
        expect(
            dockedDatePickerOverlayAnatomy.partNames.filter(
                (name) => name !== "positioner",
            ),
        ).toEqual([...dockedDatePickerAnatomy.partNames]);
        expect(parts.positioner!.styled).toBe(false);
        expect(parts.content!.parent).toBe("positioner");
        for (const name of dockedDatePickerOverlayAnatomy.partNames)
            expect(parts[name]!.testId).toBe(
                compositeTestIds.dockedDatePicker[name],
            );
    });

    it("the date picker's backdrop is drawn by the scrim, under the picker's scope", () => {
        expect(partAttributes(datePickerBackdropAnatomy, "root")).toEqual({
            "data-scope": "date-picker",
            "data-pf-part": "backdrop",
            "data-testid": compositeTestIds.datePickerBackdrop.root,
        });
    });

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
        // Each tab wraps its parts in its content, as the preset's does.
        const preset = tabsAnatomy.parts as ComponentAnatomy["parts"];
        expect(parts.tab!.children).toEqual(preset.tab!.children);
        for (const name of ["tabContent", "icon", "label", "indicator"]) {
            expect(parts[name]!.parent).toBe(preset[name]!.parent);
            expect(parts[name]!.children).toEqual(preset[name]!.children);
        }
    });

    it.each([
        [
            "bottomSheet",
            bottomSheetOverlayAnatomy,
            bottomSheetAnatomy,
            bottomSheetBackdropAnatomy,
            compositeTestIds.bottomSheet,
        ],
        [
            "sideSheet",
            sideSheetOverlayAnatomy,
            sideSheetAnatomy,
            sideSheetBackdropAnatomy,
            compositeTestIds.sideSheet,
        ],
    ] as const)(
        "the %s's overlay draws every slot of the preset's, its surface as content and its content as body, over a scrim backdrop",
        (_, overlay, preset, backdrop, ids) => {
            const parts = overlay.parts as ComponentAnatomy["parts"];
            const slots = Object.values(parts)
                .filter((part) => part.styled)
                .map(partSlot);
            expect(slots.sort()).toEqual([...preset.partNames].sort());
            expect(partSlot(parts.content!)).toBe("root");
            expect(partSlot(parts.body!)).toBe("content");
            for (const name of ["root", "trigger", "positioner"]) {
                expect(parts[name]!.styled).toBe(false);
            }
            for (const name of overlay.partNames) {
                expect(parts[name]!.testId).toBe(
                    (ids as Record<string, string>)[name],
                );
            }
            expect(backdrop.name).toBe("scrim");
            expect(backdrop.scope).toBe(overlay.scope);
            expect(partAttributes(backdrop, "root")["data-pf-part"]).toBe(
                "backdrop",
            );
        },
    );
});
