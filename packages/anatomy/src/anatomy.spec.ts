import type { AnyComponentSpec } from "@pureform/core";
import { pureform } from "@pureform/preset";
import { describe, expect, it } from "vitest";

import { deriveAnatomy } from "./derive";
import { anatomy, testIds } from "./generated";
import type { ComponentAnatomy, IndicationAnatomy } from "./types";

const components = pureform().components as Record<string, AnyComponentSpec>;
const written = anatomy as Record<string, ComponentAnatomy>;

const REFRESH = "the preset changed: run @pureform/anatomy's generate task";

// The icon slots, which take `mirror`; the preset's icons spec lists the same ones.
const ICON_PARTS: Record<string, string[]> = {
    accordion: ["leading", "indicator"],
    button: ["icon", "secondaryIcon"],
    autocomplete: ["leadingIcon", "trailingIcon"],
    datePicker: ["modeToggle", "prev", "next"],
    dockedDatePicker: ["leadingIcon", "trailingIcon", "prev", "next"],
    dateInput: ["modeToggle", "leadingIcon", "trailingIcon"],
    chip: ["icon", "trailingIcon"],
    dialog: ["icon"],
    fab: ["icon"],
    fabMenu: ["itemIcon"],
    fileUpload: ["icon"],
    icon: ["root"],
    iconButton: ["icon"],
    inputChip: ["icon", "remove"],
    listItem: ["leading", "trailing", "indicator"],
    menu: ["itemLeading", "itemTrailing"],
    navigationBar: ["icon"],
    navigationRail: ["icon"],
    appBar: ["leading", "trailing"],
    searchBar: ["leading", "trailing"],
    searchView: ["leading", "trailing"],
    select: ["leadingIcon", "trailingIcon"],
    slider: ["insetIcon"],
    splitButton: ["trailingIcon"],
    dataTable: ["sortIndicator"],
    tabs: ["icon"],
    tagsInput: ["leadingIcon", "trailingIcon"],
    nativeSelect: ["icon"],
    numberField: ["leadingIcon", "decrementTrigger", "incrementTrigger"],
    textArea: ["leadingIcon", "trailingIcon"],
    textField: ["leadingIcon", "trailingIcon"],
    tree: ["leading", "indicator"],
};

// Where each interactive component shows indication, as the design's table has it: the
// trigger, the surface, whether the ripple is centered, and the focus part.
const at = (
    trigger: string,
    surface: string,
    centered: boolean,
    focus = trigger,
): IndicationAnatomy => ({ trigger, surface, centered, focus });

const INDICATION: Record<string, IndicationAnatomy[]> = {
    button: [at("root", "root", false)],
    chip: [at("root", "root", false)],
    // The chip, and its remove button as a surface of its own.
    inputChip: [at("root", "root", false), at("remove", "remove", true)],
    // Each of the number field's round step buttons.
    numberField: [
        at("decrementTrigger", "decrementTrigger", true),
        at("incrementTrigger", "incrementTrigger", true),
    ],
    // When interactive, as a link or a button; with an action area, the container shows its
    // states and its layer sits in the action area.
    card: [
        at("root", "root", false),
        { ...at("actionArea", "root", false, "root"), layer: "actionArea" },
    ],
    // Each item's mask.
    carousel: [at("mask", "mask", false)],
    // Each item's header, and each node's row.
    accordion: [at("trigger", "trigger", false)],
    tree: [at("node", "node", false)],
    stepper: [at("trigger", "trigger", false)],
    listItem: [at("root", "root", false)],
    // Each day, month or year of a date picker's calendar.
    calendarCell: [at("trigger", "trigger", true)],
    tabs: [at("tab", "tab", false)],
    // Its items, and the select's options, which the menu draws.
    menu: [at("item", "item", false)],
    snackbar: [at("action", "action", false), at("close", "close", false)],
    toast: [
        at("actionTrigger", "actionTrigger", false),
        at("closeTrigger", "closeTrigger", false),
    ],
    iconButton: [at("root", "container", true)],
    fab: [at("root", "container", false)],
    // The FAB that opens and closes it, and each item.
    fabMenu: [
        at("closeTrigger", "closeTrigger", false),
        at("item", "item", false),
    ],
    // Each of its two buttons.
    splitButton: [
        at("leadingButton", "leadingButton", false),
        at("trailingButton", "trailingButton", false),
    ],
    // The pill: the active indicator inside it draws only on the current destination.
    navigationBar: [at("item", "indicator", true)],
    navigationRail: [at("item", "indicator", true)],
    // The select inside its wrapper, which draws the state layer.
    nativeSelect: [at("select", "root", false)],
    checkbox: [at("input", "root", true, "root")],
    radio: [at("input", "root", true, "root")],
    switchControl: [at("input", "stateLayer", true, "root")],
    slider: [at("handle", "stateLayer", true, "handle")],
    // The hour and minute selectors, and each period.
    timePicker: [
        at("hourSelector", "hourSelector", false),
        at("minuteSelector", "minuteSelector", false),
        at("period", "period", false),
    ],
    timeInput: [at("period", "period", false)],
    dataTable: [at("sortHeader", "sortHeader", false)],
};

describe("the written anatomy", () => {
    it("holds every preset component and no other", () => {
        expect(Object.keys(written).sort(), REFRESH).toEqual(
            Object.keys(components).sort(),
        );
    });

    it.each(Object.keys(components))("matches %s's AST", (name) => {
        const spec = components[name]!;
        expect(spec.name).toBe(name);
        expect(written[name], REFRESH).toEqual(deriveAnatomy(spec));
    });

    it.each(Object.keys(components))(
        "has one part per %s slot, in order",
        (name) => {
            const spec = components[name]!;
            const slots = spec.kind === "component" ? ["root"] : spec.slots;
            const { partNames, parts } = written[name]!;
            expect(partNames.slice(0, slots.length)).toEqual(slots);
            for (const slot of slots) expect(parts[slot]!.styled).toBe(true);
        },
    );

    it("nests every part inside the root", () => {
        for (const { name, root, parts } of Object.values(written)) {
            // The toast's outermost part is the region its toasts stack in, as Zag's.
            expect(root, name).toBe(name === "toast" ? "group" : "root");
            for (const part of Object.values(parts)) {
                // An expandable list item's region is its row's sibling: the row is a button. A
                // swipeable one's frame holds its row and its action, side by side. The search
                // view's trigger stays outside its portalled surface.
                const topLevel =
                    part.name === root ||
                    [
                        "listItem.region",
                        "listItem.frame",
                        "listItem.action",
                        "searchView.trigger",
                    ].includes(`${name}.${part.name}`);
                expect(part.parent === null, `${name}.${part.name}`).toBe(
                    topLevel,
                );
            }
        }
    });

    it("marks the icon slots as taking mirror", () => {
        const mirrored = Object.fromEntries(
            Object.values(written)
                .map(({ name, parts }) => [
                    name,
                    Object.values(parts)
                        .filter((part) => part.mirror)
                        .map((part) => part.name),
                ])
                .filter(([, parts]) => parts!.length > 0),
        );
        expect(mirrored).toEqual(ICON_PARTS);
    });

    it("says where every interactive component shows indication, and no other", () => {
        expect(
            Object.fromEntries(
                Object.values(written)
                    .filter((component) => component.indication)
                    .map(({ name, indication }) => [name, indication]),
            ),
        ).toEqual(INDICATION);
    });

    it("adds the select's hidden native select as an unstyled part", () => {
        expect(anatomy.select.partNames.at(-1)).toBe("hiddenSelect");
        expect(anatomy.select.parts.hiddenSelect).toEqual({
            name: "hiddenSelect",
            attribute: "hidden-select",
            testId: "pf-select-hidden-select",
            parent: "root",
            children: [],
            styled: false,
            mirror: false,
        });
        expect(anatomy.select.parts.root.children).toContain("hiddenSelect");
    });

    it("wraps a tab's icon, label, and indicator in its content, as Material's tabs do", () => {
        expect(anatomy.tabs.parts.tab.children).toEqual(["tabContent"]);
        expect(anatomy.tabs.parts.tabContent).toMatchObject({
            attribute: "tab-content",
            testId: "pf-tabs-tab-content",
            parent: "tab",
            children: ["icon", "label", "indicator"],
        });
    });

    it("lists every part's test id under testIds", () => {
        expect(
            Object.fromEntries(
                Object.values(written).map(({ name, parts }) => [
                    name,
                    Object.fromEntries(
                        Object.values(parts).map((part) => [
                            part.name,
                            part.testId,
                        ]),
                    ),
                ]),
            ),
        ).toEqual(testIds);
        expect(testIds.button.root).toBe("pf-button-root");
        expect(testIds.iconButton.touchTarget).toBe(
            "pf-icon-button-touch-target",
        );
    });
});
