import type {
    dialogOverlayAnatomy,
    menuOverlayAnatomy,
    snackbarAnatomy,
    tooltipOverlayAnatomy,
} from "@pureform/anatomy";
import { describe, expect, expectTypeOf, it } from "vitest";

import {
    DIALOG_ROOT_PROPS,
    dialogBackdropLayout,
    dialogMachineProps,
    dialogPositionerLayout,
    dialogSelection,
} from "./dialog";
import type { DialogPart } from "./dialog";
import {
    MENU_ROOT_PROPS,
    menuItemProps,
    menuMachineProps,
    menuSelection,
} from "./menu";
import type { MenuPart } from "./menu";
import {
    overlayPositionerProps,
    overlayPresent,
    presentProps,
} from "./overlay";
import {
    SNACKBAR_ROOT_PROPS,
    snackbarMachineProps,
    snackbarSelection,
} from "./snackbar";
import type { SnackbarPart } from "./snackbar";
import {
    isInteractiveTooltip,
    isRichTooltip,
    TOOLTIP_ROOT_PROPS,
    tooltipMachineProps,
    tooltipSelection,
} from "./tooltip";
import type { TooltipPart } from "./tooltip";

describe("parts", () => {
    it("name each overlay's parts", () => {
        expectTypeOf<MenuPart>().toEqualTypeOf<
            (typeof menuOverlayAnatomy.partNames)[number]
        >();
        expectTypeOf<TooltipPart>().toEqualTypeOf<
            (typeof tooltipOverlayAnatomy.partNames)[number]
        >();
        expectTypeOf<DialogPart>().toEqualTypeOf<
            (typeof dialogOverlayAnatomy.partNames)[number] | "backdrop"
        >();
        expectTypeOf<SnackbarPart>().toEqualTypeOf<
            (typeof snackbarAnatomy.partNames)[number]
        >();
    });

    it("keep the controllable open state off the element", () => {
        for (const list of [
            MENU_ROOT_PROPS,
            TOOLTIP_ROOT_PROPS,
            DIALOG_ROOT_PROPS,
            SNACKBAR_ROOT_PROPS,
        ] as readonly (readonly string[])[]) {
            expect(list).toEqual(
                expect.arrayContaining([
                    "open",
                    "defaultOpen",
                    "onOpenChange",
                    "testId",
                    "unstyled",
                ]),
            );
        }
    });
});

describe("overlays", () => {
    it("hide the positioner once gone", () => {
        expect(overlayPositionerProps({ id: "p" }, false)).toEqual({
            id: "p",
            hidden: true,
        });
        expect(overlayPositionerProps({ id: "p" }, true).hidden).toBe(false);
    });

    it("show while open, and stay while presence holds them after", () => {
        expect(overlayPresent(true, false)).toBe(true);
        expect(overlayPresent(false, true)).toBe(true);
        expect(overlayPresent(false, false)).toBe(false);
        // Zag hides the surface the moment it closes; presence's word wins.
        expect(presentProps({ hidden: true, id: "c" }, true)).toEqual({
            id: "c",
            hidden: false,
        });
    });

    it("open the menu under the trigger's start, unless told otherwise", () => {
        expect(menuMachineProps({}).positioning).toEqual({
            placement: "bottom-start",
        });
        expect(
            menuMachineProps({
                positioning: { placement: "top-end", gutter: 2 },
            }).positioning,
        ).toEqual({ placement: "top-end", gutter: 2 });
        expect(
            menuItemProps({ value: "cut", label: "Cut", disabled: true }),
        ).toEqual({
            value: "cut",
            valueText: undefined,
            disabled: true,
            closeOnSelect: undefined,
        });
        expect(menuSelection({ color: "secondary" })).toEqual({
            color: "secondary",
            density: undefined,
            tokens: undefined,
        });
    });

    it("make a rich tooltip interactive, unless told otherwise", () => {
        expect(isRichTooltip({ variant: "rich" })).toBe(true);
        expect(isInteractiveTooltip({ variant: "rich" })).toBe(true);
        expect(isInteractiveTooltip({})).toBe(false);
        expect(isInteractiveTooltip({ interactive: true })).toBe(true);
        expect(tooltipMachineProps({ variant: "rich" }).interactive).toBe(true);
        expect(tooltipMachineProps({}).interactive).toBe(false);
        expect(
            tooltipMachineProps({ variant: "rich", interactive: false })
                .interactive,
        ).toBe(false);
        expect(tooltipMachineProps({}).positioning).toEqual({
            placement: "bottom",
        });
        expect(tooltipSelection({ variant: "rich" })).toEqual({
            variant: "rich",
            tokens: undefined,
        });
    });

    it("name the dialog's headline and body as Zag's title and description", () => {
        const { ids } = dialogMachineProps({
            ids: { headline: "h", body: "b" },
        });
        expect(ids.title).toBe("h");
        expect(ids.description).toBe("b");
        expect(dialogSelection({ icon: true })).toEqual({
            icon: true,
            tokens: undefined,
        });
        expect(dialogPositionerLayout(false).hidden).toBe(true);
        expect(dialogPositionerLayout(true).style.position).toBe("fixed");
        expect(dialogBackdropLayout(false).hidden).toBe(true);
        expect(dialogBackdropLayout(true)).toEqual({
            hidden: false,
            style: { position: "fixed" },
        });
    });

    it("give the snackbar's root its id", () => {
        expect(snackbarMachineProps({ id: "saved" }).ids.root).toBe("saved");
        expect(snackbarMachineProps({ duration: null }).duration).toBeNull();
        expect(snackbarSelection({})).toEqual({
            layout: undefined,
            tokens: undefined,
        });
        expect(snackbarSelection({ layout: "longAction" }).layout).toBe(
            "longAction",
        );
    });
});
