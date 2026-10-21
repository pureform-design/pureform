import { materialShape } from "@pureform/material";
import { compilePreset } from "@pureform/panda-adapter";
import { describe, expect, it } from "vitest";

import { configWith } from "../__fixtures__/config";
import { pureform } from "../pureform";
import { timeInput } from "./time-input";
import { timePicker } from "./time-picker";

const json = (value: unknown) => JSON.stringify(value);

// Which slot properties each variant group sets: two groups setting the same property on one
// slot would draw differently on Panda, which orders variant classes by name.
const touched = (variants: Record<string, Record<string, unknown>>) =>
    Object.fromEntries(
        Object.entries(variants).map(([group, values]) => [
            group,
            new Set(
                Object.values(values).flatMap((slots) =>
                    Object.entries(slots as Record<string, object>).flatMap(
                        ([slot, style]) =>
                            Object.keys(style).map((key) => `${slot}.${key}`),
                    ),
                ),
            ),
        ]),
    );

describe("timePicker", () => {
    it("validates against a full pureform config", () => {
        expect(() => configWith(timePicker)).not.toThrow();
    });

    it("has M3's parts: headline, selectors, period selector, dial and actions", () => {
        expect(timePicker.slots).toEqual([
            "root",
            "headline",
            "body",
            "hourSelector",
            "separator",
            "minuteSelector",
            "scrollItem",
            "periodSelector",
            "period",
            "dial",
            "dialTrack",
            "dialHandle",
            "dialCenter",
            "dialLabel",
            "actions",
        ]);
    });

    it("has a dial and a scroll mode, a vibrant color set, and no compounds", () => {
        expect(Object.keys(timePicker.recipe.variants?.mode ?? {})).toEqual([
            "dial",
            "scroll",
        ]);
        expect(Object.keys(timePicker.recipe.variants?.color ?? {})).toEqual([
            "standard",
            "vibrant",
        ]);
        expect(timePicker.recipe.compoundVariants ?? []).toEqual([]);
    });

    it("sets the vibrant colors through tokens only", () => {
        const vibrant = timePicker.recipe.variants?.color?.vibrant;
        expect(Object.keys(vibrant ?? {})).toEqual(["root"]);
        expect(Object.keys(vibrant?.root ?? {})).toEqual(["tokens"]);
    });

    it("has no two variant groups setting the same property on a slot", () => {
        const { mode, color } = touched(
            timePicker.recipe.variants as Record<
                string,
                Record<string, unknown>
            >,
        );
        expect([...mode!].filter((key) => color!.has(key))).toEqual([]);
    });

    it("declares indication on the selectors and the periods", () => {
        expect(timePicker.indication?.map((entry) => entry.surface)).toEqual([
            "hourSelector",
            "minuteSelector",
            "period",
        ]);
    });

    it("keeps the dial, its handle and centre round under any corner", () => {
        for (const slot of ["dial", "dialHandle", "dialCenter"] as const) {
            expect(json(timePicker.recipe.base?.[slot])).toContain(
                '"cornerShape":{"type":"keyword","value":"round"}',
            );
        }
        const bevelled = pureform({
            shape: materialShape({}, { corner: "bevel" }),
        }).components.timePicker;
        expect(json(bevelled.recipe.base.dial)).toContain('"round"');
        expect(json(bevelled.recipe.base.root)).not.toContain('"round"');
    });

    it("turns the hand with a transform that reduced motion stops", () => {
        const transition = json(timePicker.recipe.base?.dialTrack?.transition);
        expect(transition).toContain('"on":"reducedMotion"');
        expect(transition).toContain("transform");
    });

    it("uses logical insets: the bindings place the dial's parts", () => {
        expect(json(timePicker.recipe)).not.toMatch(
            /"(paddingLeft|paddingRight|marginLeft|marginRight|left|right)"/,
        );
    });

    it("compiles to a stable Panda slot recipe", () => {
        expect(
            compilePreset(configWith(timePicker)).theme?.slotRecipes
                ?.timePicker,
        ).toMatchSnapshot();
    });
});

describe("timeInput", () => {
    it("validates against a full pureform config", () => {
        expect(() => configWith(timeInput)).not.toThrow();
    });

    it("has M3's parts: headline, two fields, period selector and actions", () => {
        expect(timeInput.slots).toEqual([
            "root",
            "headline",
            "body",
            "hourField",
            "minuteField",
            "input",
            "fieldLabel",
            "separator",
            "periodSelector",
            "period",
            "actions",
        ]);
        expect(timeInput.recipe.compoundVariants ?? []).toEqual([]);
    });

    it("shares the picker's headline, separator, period selector and actions", () => {
        for (const slot of [
            "headline",
            "periodSelector",
            "period",
            "actions",
        ] as const) {
            expect(
                json(timeInput.recipe.base?.[slot]).replaceAll(
                    "timeInput",
                    "timePicker",
                ),
            ).toEqual(json(timePicker.recipe.base?.[slot]));
        }
    });

    it("compiles to a stable Panda slot recipe", () => {
        expect(
            compilePreset(configWith(timeInput)).theme?.slotRecipes?.timeInput,
        ).toMatchSnapshot();
    });
});
