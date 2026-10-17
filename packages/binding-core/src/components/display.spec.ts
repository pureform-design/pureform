import type {
    cardAnatomy,
    circularProgressAnatomy,
    linearProgressAnatomy,
    searchBarAnatomy,
    sliderAnatomy,
} from "@pureform/anatomy";
import { describe, expect, expectTypeOf, it } from "vitest";

import { avatarElement, avatarRootProps } from "./avatar";
import {
    CARD_ROOT_PROPS,
    cardElement,
    cardRootProps,
    cardSelection,
} from "./card";
import type { CardPart } from "./card";
import { iconRootProps, iconSelection } from "./icon";
import {
    isIndeterminate,
    PROGRESS_ROOT_PROPS,
    progressPercent,
    progressRootProps,
    progressSelection,
} from "./progress";
import type { CircularProgressPart, LinearProgressPart } from "./progress";
import { rippleMachineProps } from "./ripple";
import { searchBarMachineProps, SEARCH_BAR_ROOT_PROPS } from "./search-bar";
import type { SearchBarPart } from "./search-bar";
import { separatorRootProps } from "./separator";
import {
    SLIDER_ROOT_PROPS,
    sliderMachineProps,
    sliderNativeDefault,
    sliderSelection,
} from "./slider";
import type { SliderPart } from "./slider";
import { textSelection } from "./text";

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
    it("sets the value token from the percentage, under the instance's", () => {
        expect(sliderSelection({ color: "secondary" }, 40)).toEqual({
            color: "secondary",
            tokens: { value: 40 },
        });
        expect(sliderSelection({ tokens: { handleSize: "24px" } }, 0)).toEqual({
            color: undefined,
            tokens: { value: 0, handleSize: "24px" },
        });
    });

    it("maps Root's props onto the machine's, its id to the root's", () => {
        expect(
            sliderMachineProps({ id: "volume", min: 1, name: "volume" }),
        ).toMatchObject({
            min: 1,
            name: "volume",
            ids: { root: "volume", input: undefined },
        });
    });

    it("resets the native input to the default, else min", () => {
        expect(sliderNativeDefault(40, 0)).toBe("40");
        expect(sliderNativeDefault(undefined, 10)).toBe("10");
        expect(sliderNativeDefault(undefined, undefined)).toBe("0");
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
});

describe("static components", () => {
    it("draws an avatar as a picture or a named image", () => {
        expect(avatarElement({ src: "/ada.png" })).toBe("img");
        expect(avatarElement({})).toBe("span");
        expect(avatarRootProps({ src: "/ada.png" }, "img")).toEqual({
            src: "/ada.png",
            alt: "",
        });
        expect(avatarRootProps({ label: "Ada" }, "span")).toEqual({
            role: "img",
            "aria-label": "Ada",
        });
        expect(avatarRootProps({}, "span")).toEqual({ "aria-hidden": "true" });
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
