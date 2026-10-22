// The pureform radio button: Material's radio button.
//
// Markup: a native radio laid over the control, and the ring holding the dot. Group radios
// with a shared `name`, as usual; errors take `aria-invalid="true"`.
//
//   <span class={root}>
//     <span class={touchTarget} />
//     <input class={input} type="radio" name="size" />
//     <span class={ring}><span class={dot} /></span>
//   </span>

import { typed } from "@pureform/core";
import {
    absolute,
    center,
    inlineFlex,
    none,
    pointer,
    px,
    scale,
    solid,
    transform,
    unitless,
    when,
    add,
} from "@pureform/core/ast";
import type { ColorValue } from "@pureform/core/ast";
import { size as sizeToken } from "@pureform/theme";
import type { MaterialDensity } from "@pureform/theme";

import { INDICATION_TOKENS } from "../state-layer";
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
    INDICATION_ROOT,
    mergeSlots,
    stateTransition,
    sys,
    tweens,
    variantsOf,
} from "./shared";
import type { ColorGroup, ColorGroups, Densities } from "./shared";

const pf = typed();

const { tokens, ref } = componentTokens("radio", {
    size: sizeToken("controlMedium"),
    ringSize: px(20),
    dotSize: px(10),
    borderWidth: px(2),
    borderColor: sys("onSurfaceVariant"),
    checkedColor: sys("primary"),
    errorColor: sys("error"),
    ...INDICATION_TOKENS,
});

// The ring and the dot share one color: the group's once checked.
const markColor = (checked: ColorValue, rest: ColorValue) =>
    when()
        .on(CONTROL_CHECKED, checked)
        .on(CONTROL_INVALID, ref("errorColor"))
        .on(CONTROL_DISABLED, disabledColor("disabledContent"))
        .else(rest);

// Every property that depends on the color group, each with its full set of states.
const colored = (checked: ColorValue) => ({
    root: {
        backgroundColor: controlStateLayer(ref, sys("onSurface"), checked),
    },
    ring: { borderColor: markColor(checked, ref("borderColor")) },
    dot: { backgroundColor: markColor(checked, checked) },
});

/** Build the radio button with a `color` variant per group in `groups`. */
export const createRadio = <
    const G extends string = ColorGroup,
    D extends string = MaterialDensity,
>(
    groups: ColorGroups<G> = defaultGroups(),
    densities: Densities<D> = defaultDensities(),
) =>
    variantsOf<{ color: G | typeof DEFAULT_GROUP; density: "inherit" | D }>()(
        pf.slotComponent({
            name: "radio",
            bindingVariants: ["density"],
            $meta: {
                description:
                    "Material radio button over a native input. Group radios with a shared name.",
            },
            tokens,
            slots: ["root", "touchTarget", "input", "ring", "dot"],
            structure: {
                root: ["touchTarget", "input", "ring"],
                ring: ["dot"],
            },
            indication: [
                {
                    trigger: "input",
                    surface: "root",
                    centered: true,
                    focus: "root",
                },
            ],
            variants: {
                density: densitySteps<string>(densities),
                color: groups as ColorGroups,
            },
            recipe: () => ({
                base: mergeSlots(
                    {
                        root: {
                            ...INDICATION_ROOT,
                            ...focusRing(ref, CONTROL_FOCUS),
                            ...controlRoot(dense(ref("size"))),
                            transition: stateTransition,
                            borderRadius: circle,
                            cursor: pointer,
                        },
                        touchTarget: controlTouchTarget,
                        input: controlInput,
                        ring: {
                            transition: stateTransition,
                            position: absolute,
                            display: inlineFlex,
                            alignItems: center,
                            justifyContent: center,
                            width: ref("ringSize"),
                            height: ref("ringSize"),
                            borderRadius: circle,
                            borderStyle: solid,
                            borderWidth: ref("borderWidth"),
                            pointerEvents: none,
                        },
                        dot: {
                            width: ref("dotSize"),
                            height: ref("dotSize"),
                            borderRadius: circle,
                            transform: when()
                                .on(
                                    CONTROL_CHECKED,
                                    transform(scale(unitless(1))),
                                )
                                .else(transform(scale(unitless(0)))),
                            transition: tweens("transform", "backgroundColor"),
                        },
                    },
                    colored(ref("checkedColor")),
                ),
                variants: {
                    density: densityVariant(densities, (offset) => {
                        const side = add(ref("size"), offset);
                        return { root: { width: side, height: side } };
                    }),
                    color: colorVariant(groups, (g) => colored(g.main)),
                },
                defaultVariants: { color: DEFAULT_GROUP, density: "inherit" },
            }),
        }),
    );

export const radio = createRadio();
