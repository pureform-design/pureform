import type {
    dialogOverlayAnatomy,
    fullscreenDialogOverlayAnatomy,
    menuOverlayAnatomy,
    snackbarAnatomy,
    richTooltipOverlayAnatomy,
    tooltipOverlayAnatomy,
} from "@pureform/anatomy";
import { DIALOG_ROOT_PROPS, dialogSelection } from "@pureform/binding-core";
import type { DialogPart } from "@pureform/binding-core";
import {
    FULLSCREEN_DIALOG_ROOT_PROPS,
    fullscreenDialogSelection,
} from "@pureform/binding-core";
import type { FullscreenDialogPart } from "@pureform/binding-core";
import {
    MENU_ROOT_PROPS,
    menuItemProps,
    menuSelection,
} from "@pureform/binding-core";
import type { MenuPart } from "@pureform/binding-core";
import { overlayPresent } from "@pureform/binding-core";
import { popoverSelection } from "@pureform/binding-core";
import {
    isInteractiveRichTooltip,
    RICH_TOOLTIP_ROOT_PROPS,
    richTooltipSelection,
} from "@pureform/binding-core";
import type { RichTooltipPart } from "@pureform/binding-core";
import { SNACKBAR_ROOT_PROPS, snackbarSelection } from "@pureform/binding-core";
import type { SnackbarPart } from "@pureform/binding-core";
import {
    isInteractiveTooltip,
    TOOLTIP_ROOT_PROPS,
    tooltipSelection,
} from "@pureform/binding-core";
import type { TooltipPart } from "@pureform/binding-core";
import {
    dialogBackdropLayout,
    dialogMachineProps,
    dialogPositionerLayout,
} from "@pureform/binding-web";
import { fullscreenDialogPositionerLayout } from "@pureform/binding-web";
import { menuMachineProps } from "@pureform/binding-web";
import { overlayPositionerProps, presentProps } from "@pureform/binding-web";
import { popoverMachineProps } from "@pureform/binding-web";
import { richTooltipMachineProps } from "@pureform/binding-web";
import { snackbarMachineProps } from "@pureform/binding-web";
import { tooltipMachineProps } from "@pureform/binding-web";
import { describe, expect, expectTypeOf, it } from "vitest";

describe("parts", () => {
    it("name each overlay's parts", () => {
        expectTypeOf<MenuPart>().toEqualTypeOf<
            (typeof menuOverlayAnatomy.partNames)[number]
        >();
        expectTypeOf<TooltipPart>().toEqualTypeOf<
            (typeof tooltipOverlayAnatomy.partNames)[number]
        >();
        expectTypeOf<RichTooltipPart>().toEqualTypeOf<
            (typeof richTooltipOverlayAnatomy.partNames)[number]
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
            RICH_TOOLTIP_ROOT_PROPS,
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

    it("keep the plain tooltip non-interactive, and the rich one interactive, unless told otherwise", () => {
        expect(isInteractiveTooltip({})).toBe(false);
        expect(isInteractiveTooltip({ interactive: true })).toBe(true);
        expect(tooltipMachineProps({}).interactive).toBe(false);
        expect(isInteractiveRichTooltip({})).toBe(true);
        expect(richTooltipMachineProps({}).interactive).toBe(true);
        expect(
            richTooltipMachineProps({ interactive: false }).interactive,
        ).toBe(false);
        expect(tooltipMachineProps({}).positioning).toEqual({
            placement: "bottom",
        });
        expect(tooltipSelection({})).toEqual({ tokens: undefined });
        expect(richTooltipSelection({})).toEqual({ tokens: undefined });
    });

    it("map the popover's props onto Zag's: in place, bottom-start by default, body as the description", () => {
        const props = popoverMachineProps({
            modal: true,
            ids: { title: "t", body: "b", caret: "c" },
        });
        expect(props.modal).toBe(true);
        expect(props.portalled).toBe(false);
        expect(props.positioning).toEqual({ placement: "bottom-start" });
        expect(props.ids).toMatchObject({
            title: "t",
            description: "b",
            arrow: "c",
        });
        expect(popoverMachineProps({}).modal).toBeUndefined();
        expect(popoverSelection({})).toEqual({ tokens: undefined });
        expect(
            popoverMachineProps({ positioning: { placement: "top" } })
                .positioning,
        ).toEqual({ placement: "top" });
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

    it("lay the full-screen dialog over the viewport and select its tokens", () => {
        expect(fullscreenDialogSelection({})).toEqual({ tokens: undefined });
        expect(fullscreenDialogPositionerLayout(false).hidden).toBe(true);
        expect(fullscreenDialogPositionerLayout(true).style).toMatchObject({
            position: "fixed",
            alignItems: "stretch",
        });
        expect(fullscreenDialogPositionerLayout(true).style).not.toHaveProperty(
            "padding",
        );
        expect(FULLSCREEN_DIALOG_ROOT_PROPS).toContain("open");
        expectTypeOf<FullscreenDialogPart>().toEqualTypeOf<
            (typeof fullscreenDialogOverlayAnatomy.partNames)[number]
        >();
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
