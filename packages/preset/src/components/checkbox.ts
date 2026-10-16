// The pureform checkbox: Material's checkbox, checked, unchecked, or indeterminate.
//
// Markup: a native checkbox laid over the control, and the box holding both marks. The marks
// draw themselves (the check from two borders, the dash as a bar), so their slots stay empty;
// each shows only in its state. Set the
// indeterminate state through the input's `indeterminate` property, and errors with
// `aria-invalid="true"`.
//
//   <span class={root}>
//     <span class={touchTarget} />
//     <input class={input} type="checkbox" />
//     <span class={box}>
//       <span class={checkIcon} />
//       <span class={indeterminateIcon} />
//     </span>
//   </span>

import { typed } from "@pureform/core";
import {
    absolute,
    center,
    inlineFlex,
    none,
    pointer,
    px,
    slot,
    solid,
    transparent,
    unitless,
    when,
    numeric,
    rotate,
    transform,
    translateY,
    add,
} from "@pureform/core/ast";
import type { ColorValue } from "@pureform/core/ast";
import { size as sizeToken } from "@pureform/theme";
import type { MaterialDensity } from "@pureform/theme";

import {
    CONTROL_CHECKED,
    CONTROL_DISABLED,
    CONTROL_INVALID,
    controlInput,
    controlRoot,
    controlStateLayer,
    controlTouchTarget,
    CONTROL_FOCUS,
} from "./control";
import {
    DEFAULT_GROUP,
    circle,
    colorVariant,
    componentTokens,
    defaultDensities,
    defaultGroups,
    dense,
    densitySteps,
    densityVariant,
    disabledColor,
    focusRing,
    mergeSlots,
    stateTransition,
    sys,
    variantsOf,
} from "./shared";
import type { ColorGroup, ColorGroups, Densities } from "./shared";

const { tokens, ref } = componentTokens("checkbox", {
    size: sizeToken("controlMedium"),
    boxSize: px(18),
    boxRadius: px(2),
    borderWidth: px(2),
    // The check is an L of two borders turned 45 degrees; the dash is a bar.
    checkWidth: px(6),
    checkHeight: px(11),
    dashWidth: px(10),
    markThickness: px(2),
    borderColor: sys("onSurfaceVariant"),
    checkedColor: sys("primary"),
    iconColor: sys("onPrimary"),
    errorColor: sys("error"),
    errorIconColor: sys("onError"),
    disabledIconColor: sys("surface"),
});

const INDETERMINATE = slot("root", "indeterminate");
// Either mark fills the box.
const MARKED = [CONTROL_CHECKED, INDETERMINATE] as const;

/** The colors a checkbox takes from its color group. */
interface CheckboxColors {
    checked: ColorValue;
    onChecked: ColorValue;
}

// Every property that depends on the color group, each with its full set of states, so a
// color variant replaces it whole and error and disabled still win.
const colored = ({ checked, onChecked }: CheckboxColors) => ({
    root: {
        backgroundColor: controlStateLayer(sys("onSurface"), checked),
    },
    box: {
        backgroundColor: when()
            .on(MARKED[0], checked)
            .on(MARKED[1], checked)
            .on([CONTROL_INVALID, MARKED[0]], ref("errorColor"))
            .on([CONTROL_INVALID, MARKED[1]], ref("errorColor"))
            .on([CONTROL_DISABLED, MARKED[0]], disabledColor("disabledContent"))
            .on([CONTROL_DISABLED, MARKED[1]], disabledColor("disabledContent"))
            .else(transparent),
    },
    checkIcon: { borderColor: iconColor(onChecked) },
    indeterminateIcon: { backgroundColor: iconColor(onChecked) },
});

const iconColor = (rest: ColorValue) =>
    when()
        .on(CONTROL_INVALID, ref("errorIconColor"))
        .on(CONTROL_DISABLED, ref("disabledIconColor"))
        .else(rest);

const mark = {
    position: absolute,
    pointerEvents: none,
} as const;

const pf = typed();

/** Build the checkbox with a `color` variant per group in `groups`. */
export const createCheckbox = <
    const G extends string = ColorGroup,
    D extends string = MaterialDensity,
>(
    groups: ColorGroups<G> = defaultGroups(),
    densities: Densities<D> = defaultDensities(),
) =>
    variantsOf<{ color: G | typeof DEFAULT_GROUP; density: "inherit" | D }>()(
        pf.slotComponent({
            name: "checkbox",
            $meta: {
                description:
                    "Material checkbox over a native input. Render the empty checkIcon and indeterminateIcon slots; each draws its mark in its state.",
            },
            tokens,
            slots: [
                "root",
                "touchTarget",
                "input",
                "box",
                "checkIcon",
                "indeterminateIcon",
            ],
            structure: {
                root: ["touchTarget", "input", "box"],
                box: ["checkIcon", "indeterminateIcon"],
            },
            variants: {
                density: densitySteps<string>(densities),
                color: groups as ColorGroups,
            },
            recipe: () => ({
                base: mergeSlots(
                    {
                        root: {
                            ...focusRing(CONTROL_FOCUS),
                            ...controlRoot(dense(ref("size"))),
                            transition: stateTransition,
                            borderRadius: circle,
                            cursor: pointer,
                        },
                        touchTarget: controlTouchTarget,
                        input: controlInput,
                        box: {
                            transition: stateTransition,
                            position: absolute,
                            display: inlineFlex,
                            alignItems: center,
                            justifyContent: center,
                            width: ref("boxSize"),
                            height: ref("boxSize"),
                            borderRadius: ref("boxRadius"),
                            borderStyle: solid,
                            borderWidth: ref("borderWidth"),
                            pointerEvents: none,
                            // A marked box is all fill; an unmarked one is all border.
                            borderColor: when()
                                .on(CONTROL_INVALID, ref("errorColor"))
                                .on(
                                    CONTROL_DISABLED,
                                    disabledColor("disabledContent"),
                                )
                                .on(MARKED[0], transparent)
                                .on(MARKED[1], transparent)
                                .else(ref("borderColor")),
                        },
                        checkIcon: {
                            ...mark,
                            width: ref("checkWidth"),
                            height: ref("checkHeight"),
                            borderStyle: solid,
                            borderWidth: px(0),
                            // A check mark doesn't point, so its stroke stays on the
                            // physical right under rtl rather than following the inline end.
                            borderInlineStartWidth: when(
                                "rtl",
                                ref("markThickness"),
                                px(0),
                            ),
                            borderInlineEndWidth: when(
                                "rtl",
                                px(0),
                                ref("markThickness"),
                            ),
                            borderBlockEndWidth: ref("markThickness"),
                            transform: transform(
                                translateY(px(-1)),
                                rotate(numeric(45, "deg")),
                            ),
                            opacity: when()
                                .on(CONTROL_CHECKED, unitless(1))
                                .on(INDETERMINATE, unitless(0))
                                .else(unitless(0)),
                        },
                        indeterminateIcon: {
                            ...mark,
                            width: ref("dashWidth"),
                            height: ref("markThickness"),
                            opacity: when()
                                .on(INDETERMINATE, unitless(1))
                                .else(unitless(0)),
                        },
                    },
                    colored({
                        checked: ref("checkedColor"),
                        onChecked: ref("iconColor"),
                    }),
                ),
                variants: {
                    density: densityVariant(densities, (offset) => {
                        const side = add(ref("size"), offset);
                        return { root: { width: side, height: side } };
                    }),
                    color: colorVariant(groups, (g) =>
                        colored({ checked: g.main, onChecked: g.on }),
                    ),
                },
                defaultVariants: { color: DEFAULT_GROUP, density: "inherit" },
            }),
        }),
    );

export const checkbox = createCheckbox();
