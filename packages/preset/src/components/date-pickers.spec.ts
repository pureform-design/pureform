import { compilePreset } from "@pureform/panda-adapter";
import { describe, expect, it } from "vitest";

import { configWith } from "../__fixtures__/config";
import { calendarCell, CALENDAR_SELECTIONS } from "./calendar";
import { dateInput } from "./date-input";
import { datePicker } from "./date-picker";
import { dockedDatePicker } from "./docked-date-picker";

const recipe = (name: string, spec: Parameters<typeof configWith>[0]) =>
    compilePreset(configWith(spec)).theme?.slotRecipes?.[name];

type Styles = Record<string, Record<string, unknown>>;

// The properties each variant group sets, slot by slot ("slot.property"), tokens apart.
const setBy = (variants: Record<string, Record<string, Styles>>) =>
    Object.fromEntries(
        Object.entries(variants).map(([group, values]) => [
            group,
            new Set(
                Object.values(values).flatMap((styles) =>
                    Object.entries(styles).flatMap(([slot, style]) =>
                        Object.keys(style)
                            .filter((key) => key !== "tokens")
                            .map((key) => `${slot}.${key}`),
                    ),
                ),
            ),
        ]),
    );

// Pairs of groups that set one property of one slot: Panda orders their classes by name, not
// by group, so the targets would disagree on which wins.
const overlaps = (variants: Record<string, Record<string, Styles>>) => {
    const groups = Object.entries(setBy(variants));
    const found: string[] = [];
    for (const [i, [a, aSet]] of groups.entries())
        for (const [b, bSet] of groups.slice(i + 1))
            for (const key of aSet)
                if (bSet.has(key)) found.push(`${a}/${b}: ${key}`);
    return found;
};

describe("calendarCell", () => {
    it("is a cell around its circle or pill", () => {
        expect(calendarCell.slots).toEqual(["root", "trigger"]);
        expect(calendarCell.structure).toEqual({ root: ["trigger"] });
    });

    it("takes its view, selection, today and outside per cell, with no compounds", () => {
        const variants = calendarCell.recipe.variants ?? {};
        expect(Object.keys(variants)).toEqual([
            "view",
            "selection",
            "today",
            "outside",
        ]);
        expect(Object.keys(variants.selection ?? {})).toEqual([
            ...CALENDAR_SELECTIONS,
        ]);
        expect(calendarCell.recipe.compoundVariants ?? []).toEqual([]);
    });

    it("sets no property from two groups: the groups set tokens the styles read", () => {
        expect(
            overlaps(
                calendarCell.recipe.variants as unknown as Record<
                    string,
                    Record<string, Styles>
                >,
            ),
        ).toEqual([]);
    });

    it("mixes today's, the range's and the chosen colors in by percentage flags", () => {
        const trigger = JSON.stringify(
            recipe("calendarCell", calendarCell)?.base?.trigger,
        );
        expect(trigger).toContain(
            "var(--components-calendarCell-selected, 0%)",
        );
        expect(trigger).toContain("var(--components-calendarCell-today, 0%)");
        expect(trigger).toContain("var(--components-calendarCell-ranged, 0%)");
    });

    it("rounds the trigger and a range's ends from the theme's roles", () => {
        const compiled = recipe("calendarCell", calendarCell);
        expect(JSON.stringify(compiled?.base?.trigger)).toContain(
            "components-calendarCell-radius",
        );
        expect(
            JSON.stringify(compiled?.variants?.selection?.rangeStart?.root),
        ).toContain("radii.full");
    });

    it("compiles to a stable Panda slot recipe", () => {
        expect(recipe("calendarCell", calendarCell)).toMatchSnapshot();
    });
});

describe("datePicker", () => {
    it("has the modal picker's parts", () => {
        expect(datePicker.slots).toEqual([
            "root",
            "header",
            "headline",
            "selectedDate",
            "modeToggle",
            "divider",
            "controls",
            "viewTrigger",
            "prev",
            "next",
            "weekdays",
            "weekday",
            "grid",
            "week",
            "yearList",
            "actions",
        ]);
        expect(datePicker.recipe.variants ?? {}).toEqual({});
    });

    it("rounds its surface from the theme's extra large role", () => {
        expect(
            JSON.stringify(recipe("datePicker", datePicker)?.base?.root),
        ).toContain("components-datePicker-pickerRadius");
    });

    it("lines the weekdays up with the cells", () => {
        const base = recipe("datePicker", datePicker)?.base;
        expect(base?.weekday?.width).toBe(base?.weekday?.height);
        expect(String(base?.weekday?.width)).toContain("cellSize");
    });

    it("compiles to a stable Panda slot recipe", () => {
        expect(recipe("datePicker", datePicker)).toMatchSnapshot();
    });
});

describe("dockedDatePicker", () => {
    it("is the text field's parts with the calendar's popup", () => {
        expect(dockedDatePicker.slots.slice(0, 9)).toEqual([
            "root",
            "container",
            "leadingIcon",
            "prefixText",
            "input",
            "suffixText",
            "label",
            "trailingIcon",
            "supportingText",
        ]);
        expect(dockedDatePicker.structure?.root).toEqual([
            "container",
            "supportingText",
            "content",
        ]);
        expect(dockedDatePicker.structure?.controls).toEqual([
            "prev",
            "monthButton",
            "next",
            "yearButton",
        ]);
    });

    it("is outlined, with the calendar button at the end, by default", () => {
        expect(dockedDatePicker.recipe.defaultVariants).toMatchObject({
            variant: "outlined",
            trailingIcon: "true",
        });
    });

    it("keeps the field's one compound", () => {
        expect(dockedDatePicker.recipe.compoundVariants).toHaveLength(1);
    });

    it("compiles to a stable Panda slot recipe", () => {
        expect(recipe("dockedDatePicker", dockedDatePicker)).toMatchSnapshot();
    });
});

describe("dateInput", () => {
    it("holds the field under its surface, its input a group of segments", () => {
        expect(dateInput.structure).toMatchObject({
            root: ["header", "divider", "field", "actions"],
            field: ["container", "supportingText"],
            input: ["segment"],
        });
    });

    it("keeps the field variants' tokens on its root", () => {
        const color = dateInput.recipe.variants?.color as unknown as Record<
            string,
            Styles
        >;
        expect(color.secondary?.root).toHaveProperty("tokens");
        expect(Object.keys(color.secondary?.root ?? {})).toEqual(["tokens"]);
    });

    it("notches the outlined label in the picker's container", () => {
        expect(JSON.stringify(dateInput.tokens?.labelBackground)).toContain(
            "surfaceContainerHigh",
        );
    });

    it("compiles to a stable Panda slot recipe", () => {
        expect(recipe("dateInput", dateInput)).toMatchSnapshot();
    });
});
