import { anatomy } from "@pureform/anatomy";
import type {
    cardAnatomy,
    circularProgressAnatomy,
    linearProgressAnatomy,
    searchBarAnatomy,
    sliderAnatomy,
} from "@pureform/anatomy";
import { avatarRootProps } from "@pureform/binding-core";
import { badgeRootProps, badgeSelection } from "@pureform/binding-core";
import { CARD_ROOT_PROPS, cardEntryActive } from "@pureform/binding-core";
import type { CardPart } from "@pureform/binding-core";
import { iconRootProps, iconSelection } from "@pureform/binding-core";
import {
    isIndeterminate,
    PROGRESS_ROOT_PROPS,
    progressPercent,
    progressRootProps,
    progressSelection,
} from "@pureform/binding-core";
import type {
    CircularProgressPart,
    LinearProgressPart,
} from "@pureform/binding-core";
import { SEARCH_BAR_ROOT_PROPS } from "@pureform/binding-core";
import type { SearchBarPart } from "@pureform/binding-core";
import {
    SLIDER_ROOT_PROPS,
    sliderMarkerTokens,
    sliderSelection,
    sliderStopActive,
    sliderStops,
    sliderClearanceOf,
    sliderInsetIconMeasuresOfStyle,
    sliderInsetIconOverflows,
    sliderTrackTokens,
} from "@pureform/binding-core";
import type { SliderPart } from "@pureform/binding-core";
import { textSelection } from "@pureform/binding-core";
import { avatarMachineProps } from "@pureform/binding-web";
import {
    cardElement,
    cardLayout,
    cardRootProps,
    cardSelection,
} from "@pureform/binding-web";
import { rippleMachineProps } from "@pureform/binding-web";
import { searchBarMachineProps } from "@pureform/binding-web";
import { separatorRootProps } from "@pureform/binding-web";
import {
    sliderControllableProps,
    sliderMachineProps,
} from "@pureform/binding-web";
import { describe, expect, expectTypeOf, it, vi } from "vitest";

import { sliderNativeDefault } from "../components";

describe("parts", () => {
    it("name each component's parts", () => {
        expectTypeOf<LinearProgressPart>().toEqualTypeOf<
            (typeof linearProgressAnatomy.partNames)[number]
        >();
        expectTypeOf<CircularProgressPart>().toEqualTypeOf<
            (typeof circularProgressAnatomy.partNames)[number]
        >();
        expectTypeOf<SliderPart>().toEqualTypeOf<
            (typeof sliderAnatomy.partNames)[number]
        >();
        expectTypeOf<CardPart>().toEqualTypeOf<
            (typeof cardAnatomy.partNames)[number]
        >();
        expectTypeOf<SearchBarPart>().toEqualTypeOf<
            (typeof searchBarAnatomy.partNames)[number]
        >();
    });

    it("keep the controllable value off the element", () => {
        for (const list of [
            SLIDER_ROOT_PROPS,
            SEARCH_BAR_ROOT_PROPS,
        ] as const) {
            expect(list).toEqual(
                expect.arrayContaining([
                    "value",
                    "defaultValue",
                    "onValueChange",
                ]),
            );
        }
        expect(PROGRESS_ROOT_PROPS).toContain("value");
        expect(CARD_ROOT_PROPS).toContain("interactive");
    });
});

describe("progress", () => {
    it("is indeterminate without a value, unless told", () => {
        expect(isIndeterminate({})).toBe(true);
        expect(isIndeterminate({ value: null })).toBe(true);
        expect(isIndeterminate({ value: 0 })).toBe(false);
        expect(isIndeterminate({ value: 40, indeterminate: true })).toBe(true);
    });

    it("gives the value as a clamped percentage of the range", () => {
        expect(progressPercent({ value: 40 })).toBe(40);
        expect(progressPercent({ value: 3, min: 1, max: 5 })).toBe(50);
        expect(progressPercent({ value: 140 })).toBe(100);
        expect(progressPercent({ value: 5, min: 5, max: 5 })).toBe(0);
        expect(progressPercent({})).toBe(0);
    });

    it("sets the value token unless indeterminate or given", () => {
        expect(progressSelection({ value: 40 })).toEqual({
            indeterminate: false,
            color: undefined,
            tokens: { value: 40 },
        });
        expect(progressSelection({})).toEqual({
            indeterminate: true,
            color: undefined,
            tokens: {},
        });
        expect(
            progressSelection({ value: 40, tokens: { value: 10 } }).tokens,
        ).toEqual({ value: 10 });
    });

    it("is a progressbar with the value only while determinate", () => {
        expect(progressRootProps({ value: 140 })).toEqual({
            role: "progressbar",
            "aria-valuemin": 0,
            "aria-valuemax": 100,
            "aria-valuenow": 100,
        });
        expect(progressRootProps({ min: 1, max: 5 })).toEqual({
            role: "progressbar",
            "aria-valuemin": 1,
            "aria-valuemax": 5,
            "aria-valuenow": undefined,
        });
    });
});

describe("slider", () => {
    it("sets the placing tokens from the percentages, under the instance's", () => {
        expect(sliderSelection({ color: "secondary" }, 40)).toEqual({
            color: "secondary",
            handleShape: undefined,
            size: undefined,
            orientation: undefined,
            tokens: {
                value: 40,
                activeStart: 0,
                activeEnd: 40,
                startGap: 0,
                endGap: 1,
            },
        });
        expect(
            sliderSelection({ tokens: { handleSize: "24px" } }, 0).tokens,
        ).toMatchObject({ value: 0, handleSize: "24px" });
    });

    it("places a range's and a centered slider's active track", () => {
        expect(sliderTrackTokens([20, 70])).toEqual({
            value: 70,
            activeStart: 20,
            activeEnd: 70,
            startGap: 1,
            endGap: 1,
        });
        expect(sliderTrackTokens([30], true)).toEqual({
            value: 30,
            activeStart: 30,
            activeEnd: 50,
            startGap: 1,
            endGap: 0,
        });
        expect(sliderTrackTokens([80], true)).toMatchObject({
            activeStart: 50,
            activeEnd: 80,
            startGap: 0,
        });
    });

    it("puts stops at each step or the values given, active on the active track", () => {
        expect(sliderStops(true, { min: 0, max: 1, step: 0.25 })).toEqual([
            0, 0.25, 0.5, 0.75, 1,
        ]);
        expect(sliderStops([10, 90], {})).toEqual([10, 90]);
        expect(sliderStops(undefined, {})).toEqual([]);
        expect(sliderStopActive(30, [40], {})).toBe(true);
        expect(sliderStopActive(50, [40], {})).toBe(false);
        expect(sliderStopActive(45, [40], { centered: true })).toBe(true);
        expect(sliderStopActive(10, [20, 60], {})).toBe(false);
        expect(sliderMarkerTokens(30, true)).toEqual({
            value: 30,
            stopActive: 1,
        });
    });

    it("maps Root's props onto Zag's, its id to the root's", () => {
        expect(
            sliderMachineProps(
                {
                    id: "volume",
                    min: 1,
                    name: "volume",
                    centered: true,
                    orientation: "vertical",
                },
                "m1",
            ),
        ).toMatchObject({
            min: 1,
            name: "volume",
            origin: "center",
            orientation: "vertical",
            ids: { root: "volume", control: "volume" },
        });
        expect(sliderMachineProps({}, "m1").ids.root).toBe("slider:m1");
    });

    it("gives the owner its value in the shape it gave", () => {
        const onValueChange = vi.fn();
        const single = sliderControllableProps({
            value: undefined,
            defaultValue: 40,
            onValueChange,
        });
        expect(single.defaultValue).toEqual([40]);
        single.onValueChange({ value: [41] });
        expect(onValueChange).toHaveBeenLastCalledWith({ value: 41 });
        const range = sliderControllableProps({
            value: [20, 60],
            defaultValue: undefined,
            onValueChange,
        });
        range.onValueChange({ value: [20, 61] });
        expect(onValueChange).toHaveBeenLastCalledWith({ value: [20, 61] });
    });

    it("resets the native inputs to the default, else min", () => {
        expect(sliderNativeDefault(40, 0)).toBe("40");
        expect(sliderNativeDefault([20, 60], 0)).toBe("20,60");
        expect(sliderNativeDefault(undefined, 10)).toBe("10");
        expect(sliderNativeDefault(undefined, undefined)).toBe("0");
    });
});

describe("slider inset icon", () => {
    it("fits in the active track while it's at least the icon, its padding and the handle's gap", () => {
        // 400px long: 20% is 80px, less the 8px clearance, past 40.
        expect(sliderInsetIconOverflows(400, [20])).toBe(false);
        // 10% is 40px, less the clearance: too short.
        expect(sliderInsetIconOverflows(400, [10])).toBe(true);
        expect(sliderInsetIconOverflows(400, [0])).toBe(true);
    });

    it("counts both gaps of a range, and fits when unmeasured", () => {
        expect(sliderInsetIconOverflows(400, [40, 52])).toBe(true);
        expect(sliderInsetIconOverflows(400, [40, 60])).toBe(false);
        expect(sliderInsetIconOverflows(0, [0])).toBe(false);
    });

    it("follows the theme's icon size and padding when given", () => {
        // 20% of 400px is 80px, less 8: 72. A 24px icon with 24px padding needs 72.
        expect(sliderInsetIconOverflows(400, [20], false, {})).toBe(false);
        expect(
            sliderInsetIconOverflows(400, [20], false, {
                size: 24,
                padding: 24,
            }),
        ).toBe(false);
        expect(
            sliderInsetIconOverflows(400, [20], false, {
                size: 24,
                padding: 25,
            }),
        ).toBe(true);
        expect(
            sliderInsetIconOverflows(400, [20], false, {
                size: 12,
                padding: 6,
            }),
        ).toBe(false);
    });

    it("reads the measures from React Native's resolved styles", () => {
        const at = { vertical: false, overflowing: false, percents: [20] };
        const icon = (insetIcon: Record<string, unknown> | undefined) => ({
            insetIcon,
        });
        expect(
            sliderInsetIconMeasuresOfStyle(
                icon({ width: 24, marginStart: 12 }),
                at,
            ),
        ).toEqual({ size: 24, padding: 12, clearance: 8 });
        // Overflowing, the margin also holds the handle's clearance (8 × the end gap, 1).
        expect(
            sliderInsetIconMeasuresOfStyle(
                icon({ width: 24, marginStart: 20 }),
                {
                    ...at,
                    overflowing: true,
                },
            ),
        ).toEqual({ size: 24, padding: 12, clearance: 8 });
        expect(
            sliderInsetIconMeasuresOfStyle(
                icon({ height: 24, marginBottom: 12 }),
                {
                    ...at,
                    vertical: true,
                },
            ),
        ).toEqual({ size: 24, padding: 12, clearance: 8 });
        expect(
            sliderInsetIconMeasuresOfStyle(icon({ width: "1x" }), at),
        ).toBeUndefined();
        expect(
            sliderInsetIconMeasuresOfStyle(icon(undefined), at),
        ).toBeUndefined();
    });

    it("reads the theme's handle clearance from the inactive track's margin", () => {
        const at = { vertical: false, overflowing: true, percents: [20] };
        expect(
            sliderInsetIconMeasuresOfStyle(
                {
                    insetIcon: { width: 24, marginStart: 26 },
                    track: { marginStart: 14 },
                },
                at,
            ),
        ).toEqual({ size: 24, padding: 12, clearance: 14 });
        // A theme's 14px clearance leaves 80 - 14 = 66px: short of 24 + 2 × 24.
        expect(
            sliderInsetIconOverflows(400, [20], false, {
                size: 24,
                padding: 24,
                clearance: 14,
            }),
        ).toBe(true);
        // No end gap tells nothing.
        expect(sliderClearanceOf(14, 0)).toBeUndefined();
        expect(sliderClearanceOf(undefined, 1)).toBeUndefined();
    });
});

describe("card", () => {
    it("is a link, a given element, or a div, interactive when it acts", () => {
        expect(cardElement({ href: "#a", as: "button" })).toBe("a");
        expect(cardElement({ as: "button" })).toBe("button");
        expect(cardElement({})).toBe("div");
        expect(cardSelection({}, "button").interactive).toBe(true);
        expect(cardSelection({}, "div").interactive).toBe(false);
        expect(cardSelection({ interactive: false }, "a").interactive).toBe(
            false,
        );
    });

    it("disables a button natively and anything else with ARIA", () => {
        expect(cardRootProps({ disabled: true }, "button")).toEqual({
            type: "button",
            disabled: true,
            "aria-disabled": undefined,
        });
        expect(cardRootProps({ disabled: true }, "a")).toEqual({
            type: undefined,
            disabled: undefined,
            "aria-disabled": "true",
        });
    });

    it("selects the sections' variants", () => {
        expect(
            cardSelection({ padded: false, actionsAlign: "start" }, "div"),
        ).toMatchObject({ padded: false, actionsAlign: "start" });
    });

    it("moves its action to the action area only beside other controls", () => {
        expect(cardLayout({}, "div")).toEqual({
            sections: false,
            actionArea: false,
            headerOutside: false,
            header: false,
            supportingText: false,
        });
        // One action: the whole card is the link, its text its name.
        expect(
            cardLayout({ headline: "Pro", supportingText: "…" }, "a"),
        ).toEqual({
            sections: true,
            actionArea: false,
            headerOutside: false,
            header: true,
            supportingText: true,
        });
        expect(
            cardLayout({ headline: "Pro", actions: "Buy" }, "a"),
        ).toMatchObject({
            actionArea: true,
            headerOutside: false,
        });
        expect(
            cardLayout({ headline: "Pro", headerAction: "⋮" }, "button"),
        ).toMatchObject({ actionArea: true, headerOutside: true });
        // A card that doesn't act has nothing to move.
        expect(cardLayout({ actions: "Buy" }, "div").actionArea).toBe(false);
        expect(
            cardLayout({ actions: "Buy", interactive: false }, "a").actionArea,
        ).toBe(false);
    });

    it("shows the root's indication while Root acts, the action area's otherwise", () => {
        const [root, area] = anatomy.card.indication;
        expect(cardEntryActive(true)(root)).toBe(true);
        expect(cardEntryActive(true)(area)).toBe(false);
        expect(cardEntryActive(false)(root)).toBe(false);
        expect(cardEntryActive(false)(area)).toBe(true);
    });
});

describe("static components", () => {
    it("names an avatar by its label and hides it without one", () => {
        expect(avatarRootProps({ label: "Ada" })).toEqual({
            role: "img",
            "aria-label": "Ada",
        });
        expect(avatarRootProps({})).toEqual({ "aria-hidden": "true" });
        const onStatusChange = () => {};
        expect(avatarMachineProps({ id: "a", onStatusChange })).toEqual({
            id: "a",
            onStatusChange,
        });
    });

    it("names a badge by its label and hides a dot without one", () => {
        expect(badgeRootProps({ label: "3 unread" })).toEqual({
            role: "img",
            "aria-label": "3 unread",
        });
        expect(badgeRootProps({ size: "small" })).toEqual({
            "aria-hidden": "true",
        });
        expect(badgeRootProps({})).toEqual({});
        expect(badgeSelection({ placement: "anchored" })).toMatchObject({
            placement: "anchored",
        });
    });

    it("names an icon only with a label", () => {
        expect(iconRootProps({})).toEqual({ "aria-hidden": "true" });
        expect(iconRootProps({ label: "Done" })).toEqual({
            role: "img",
            "aria-label": "Done",
        });
        expect(iconSelection({ size: "large" })).toMatchObject({
            size: "large",
        });
    });

    it("gives a separator other than an hr its role", () => {
        expect(separatorRootProps("hr")).toEqual({});
        expect(separatorRootProps("div")).toEqual({ role: "separator" });
    });

    it("selects the text style through textStyle", () => {
        expect(textSelection({ textStyle: "titleLarge" })).toEqual({
            style: "titleLarge",
        });
    });

    it("leaves the search bar's placeholder empty unless given", () => {
        expect(searchBarMachineProps({}).placeholder).toBe("");
        expect(
            searchBarMachineProps({ placeholder: "Search mail" }).placeholder,
        ).toBe("Search mail");
    });

    it("maps the ripple's effect onto the machine's variant", () => {
        expect(
            rippleMachineProps({ effect: "ink-sparkle", id: "r" }),
        ).toMatchObject({ variant: "ink-sparkle", ids: { layer: "r" } });
    });
});
