// Hand-written in the shape `pureform generate` will write (p4b-panda replaces it): the
// button's class factory over Panda's slot recipe, one cached result per selection, with
// instance tokens as CSS vars on the root.

import { selectionCache, withTokenStyle } from "@pureform/styling";
import type { ClassFactory, ClassSlots, Selection } from "@pureform/styling";

import { button as recipe } from "../../styled-system/recipes/button";

const vars = {
    radius: "--pf-components-button-radius",
    gap: "--pf-components-button-gap",
    iconSize: "--pf-components-button-iconSize",
    iconFill: "--pf-components-button-iconFill",
    outlineWidth: "--pf-components-button-outlineWidth",
    outlineColor: "--pf-components-button-outlineColor",
    heightSmall: "--pf-components-button-heightSmall",
    heightMedium: "--pf-components-button-heightMedium",
    heightLarge: "--pf-components-button-heightLarge",
    paddingSmall: "--pf-components-button-paddingSmall",
    paddingMedium: "--pf-components-button-paddingMedium",
    paddingLarge: "--pf-components-button-paddingLarge",
    accent: "--pf-components-button-accent",
    onAccent: "--pf-components-button-onAccent",
    accentContainer: "--pf-components-button-accentContainer",
    onAccentContainer: "--pf-components-button-onAccentContainer",
    densityOffset: "--pf-components-button-densityOffset",
    corner: "--pf-components-button-corner",
} as const;

const classes = selectionCache<Selection<"button">, ClassSlots<"button">>(
    {
        variants: ["color", "density", "size", "variant"],
        defaults: {
            color: "primary",
            density: "inherit",
            size: "medium",
            variant: "filled",
        },
    },
    (s) => {
        const slots = recipe(s);
        return {
            root: { class: slots.root },
            label: { class: slots.label },
            icon: { class: slots.icon },
            touchTarget: { class: slots.touchTarget },
        };
    },
);

export const button: ClassFactory<"button"> = (s) =>
    withTokenStyle(classes(s), s.tokens, vars);
