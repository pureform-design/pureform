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
    button: ["icon"],
    chip: ["icon"],
    dialog: ["icon"],
    fab: ["icon"],
    icon: ["root"],
    iconButton: ["icon"],
    listItem: ["leading", "trailing"],
    menu: ["itemLeading", "itemTrailing"],
    navigationBar: ["icon"],
    navigationRail: ["icon"],
    searchBar: ["leading", "trailing"],
    select: ["leadingIcon", "trailingIcon"],
    tabs: ["icon"],
    textArea: ["leadingIcon", "trailingIcon"],
    textField: ["leadingIcon", "trailingIcon"],
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
    // When interactive, as a link or a button; with an action area, the container shows its
    // states and its layer sits in the action area.
    card: [
        at("root", "root", false),
        { ...at("actionArea", "root", false, "root"), layer: "actionArea" },
    ],
    listItem: [at("root", "root", false)],
    tabs: [at("tab", "tab", false)],
    // Its items, and the select's options, which the menu draws.
    menu: [at("item", "item", false)],
    snackbar: [at("action", "action", false), at("close", "close", false)],
    iconButton: [at("root", "container", true)],
    fab: [at("root", "container", false)],
    // The pill: the active indicator inside it draws only on the current destination.
    navigationBar: [at("item", "indicator", true)],
    navigationRail: [at("item", "indicator", true)],
    checkbox: [at("input", "root", true, "root")],
    radio: [at("input", "root", true, "root")],
    switchControl: [at("input", "stateLayer", true, "root")],
    slider: [at("handle", "stateLayer", true, "handle")],
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
            expect(root, name).toBe("root");
            for (const part of Object.values(parts)) {
                if (part.name === root) {
                    expect(part.parent, `${name}.${part.name}`).toBeNull();
                } else {
                    expect(part.parent, `${name}.${part.name}`).not.toBeNull();
                }
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
