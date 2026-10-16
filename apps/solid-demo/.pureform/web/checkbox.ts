// Hand-written in the shape `pureform generate` will write (p4b-panda replaces it): the
// checkbox's class factory over Panda's slot recipe, one cached result per selection, with
// instance tokens as CSS vars on the root.

import { selectionCache, withTokenStyle } from "@pureform/styling";
import type { ClassFactory, ClassSlots, Selection } from "@pureform/styling";

import { checkbox as recipe } from "../../styled-system/recipes/checkbox";

const vars = {
    size: "--pf-components-checkbox-size",
    boxSize: "--pf-components-checkbox-boxSize",
    boxRadius: "--pf-components-checkbox-boxRadius",
    borderWidth: "--pf-components-checkbox-borderWidth",
    checkWidth: "--pf-components-checkbox-checkWidth",
    checkHeight: "--pf-components-checkbox-checkHeight",
    dashWidth: "--pf-components-checkbox-dashWidth",
    markThickness: "--pf-components-checkbox-markThickness",
    borderColor: "--pf-components-checkbox-borderColor",
    checkedColor: "--pf-components-checkbox-checkedColor",
    iconColor: "--pf-components-checkbox-iconColor",
    errorColor: "--pf-components-checkbox-errorColor",
    errorIconColor: "--pf-components-checkbox-errorIconColor",
    disabledIconColor: "--pf-components-checkbox-disabledIconColor",
    corner: "--pf-components-checkbox-corner",
} as const;

const classes = selectionCache<Selection<"checkbox">, ClassSlots<"checkbox">>(
    {
        variants: ["color", "density"],
        defaults: { color: "primary", density: "inherit" },
    },
    (s) => {
        const slots = recipe(s);
        return {
            root: { class: slots.root },
            touchTarget: { class: slots.touchTarget },
            input: { class: slots.input },
            box: { class: slots.box },
            checkIcon: { class: slots.checkIcon },
            indeterminateIcon: { class: slots.indeterminateIcon },
        };
    },
);

export const checkbox: ClassFactory<"checkbox"> = (s) =>
    withTokenStyle(classes(s), s.tokens, vars);
