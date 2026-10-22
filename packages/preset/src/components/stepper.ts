// The pureform stepper: a list of steps, each a header that shows how far along it is, joined by a
// connector, with the current step's content. Material doesn't specify it (Angular's `mat-stepper`
// is the reference), so the parts come from Angular's token sets and Zag's `steps`, and the
// values are ours (see the c6b context).
//
// A step's header is a button: an indicator (the step's number, an icon, or a check once
// completed), its label, and an optional caption under it. `orientation` lays the steps out in a
// row (a connector between the headers) or a column (a connector under each header, beside its
// content).
//
//   <div class={root}>
//     <div class={list} role="tablist">
//       <div class={item} aria-current="step">
//         <button class={trigger} role="tab" aria-selected="true">
//           <span class={indicator}>1</span>
//           <span class={label}>Address</span>
//           <span class={caption}>Optional</span>
//         </button>
//         <div class={separator} />
//         <div class={content} role="tabpanel">…</div>   vertical: here; horizontal: after the list
//       </div>
//     </div>
//   </div>
//
// The current step's header (`aria-selected`) is active, a completed step's indicator
// (`aria-checked`) is filled, and a header marked `aria-invalid` shows the error colors. The
// indicator and label read the header's state, so none of them needs a state of its own.

import { typed } from "@pureform/core";
import {
    absolute,
    add,
    center,
    column,
    div,
    flex,
    pct,
    px,
    relative,
    row,
    slot,
    start,
    stretch,
    sub,
    unitless,
    when,
} from "@pureform/core/ast";
import { radius, spacing, textStyle } from "@pureform/theme";
import type { MaterialDensity } from "@pureform/theme";

import { INDICATION_TOKENS, stateLayer } from "../state-layer";
import {
    componentTokens,
    defaultDensities,
    DENSITY_TOKEN,
    densitySteps,
    densityTokenVariant,
    disabledColor,
    INDICATION_ROOT,
    pressableRoot,
    stateTransition,
    sys,
    variantsOf,
} from "./shared";
import type { Densities } from "./shared";

/** The stepper's `orientation` values. */
export const STEPPER_ORIENTATIONS = ["horizontal", "vertical"] as const;

export type StepperOrientation = (typeof STEPPER_ORIENTATIONS)[number];

const pf = typed();

const { tokens, ref } = componentTokens("stepper", {
    container: sys("surface"),
    // A step that isn't reached yet.
    content: sys("onSurfaceVariant"),
    indicatorContainer: sys("surfaceContainerHighest"),
    indicatorContent: sys("onSurfaceVariant"),
    // The current step's label, and the indicator of a current or completed step.
    activeContent: sys("onSurface"),
    activeIndicatorContainer: sys("primary"),
    activeIndicatorContent: sys("onPrimary"),
    errorContent: sys("error"),
    errorIndicatorContainer: sys("error"),
    errorIndicatorContent: sys("onError"),
    captionColor: sys("onSurfaceVariant"),
    connector: sys("outlineVariant"),
    connectorThickness: px(1),
    // A vertical connector's least length, under a step that has no content showing.
    connectorLength: px(24),
    // The space between a horizontal connector and the headers either side of it.
    connectorGap: spacing("2"),
    indicatorSize: px(24),
    height: px(56),
    paddingInline: spacing("4"),
    gap: spacing("2"),
    radius: radius("medium"),
    contentPadding: spacing("4"),
    ...DENSITY_TOKEN,
    ...INDICATION_TOKENS,
});

const TRIGGER_SELECTED = slot("trigger", "selected");
const TRIGGER_INVALID = slot("trigger", "invalid");
const TRIGGER_DISABLED = slot("trigger", "disabled");
const INDICATOR_CHECKED = slot("indicator", "checked");

const pressable = pressableRoot(ref);

// The header's height at the theme's density.
const headerHeight = add(ref("height"), ref("densityOffset"));

// A connector's color under a heading: the same at every state.
const connectorLine = {
    backgroundColor: ref("connector"),
};

/** Build the stepper with a `density` variant per step in `densities`. */
export const createStepper = <D extends string = MaterialDensity>(
    densities: Densities<D> = defaultDensities(),
) =>
    variantsOf<{ density: "inherit" | D }>()(
        pf.slotComponent({
            name: "stepper",
            bindingVariants: ["density"],
            $meta: {
                description:
                    "Stepper: a header per step (an indicator, a label and an optional caption) joined by a connector, with the current step's content. orientation horizontal or vertical. Mark the current step's header aria-selected, a completed indicator aria-checked and an error header aria-invalid.",
            },
            tokens,
            slots: [
                "root",
                "list",
                "item",
                "trigger",
                "indicator",
                "label",
                "caption",
                "separator",
                "content",
            ],
            structure: {
                root: ["list"],
                list: ["item"],
                item: ["trigger", "separator", "content"],
                trigger: ["indicator", "label", "caption"],
            },
            indication: [
                {
                    trigger: "trigger",
                    surface: "trigger",
                    centered: false,
                    focus: "trigger",
                },
            ],
            variants: {
                orientation: [...STEPPER_ORIENTATIONS],
                density: densitySteps<string>(densities),
            },
            recipe: () => ({
                base: {
                    root: {
                        ...INDICATION_ROOT,
                        display: flex,
                        flexDirection: column,
                        backgroundColor: ref("container"),
                    },
                    list: { display: flex },
                    item: { position: relative, display: flex },
                    trigger: {
                        ...pressable,
                        justifyContent: start,
                        flexShrink: unitless(0),
                        gap: ref("gap"),
                        minHeight: headerHeight,
                        paddingInlineStart: ref("paddingInline"),
                        paddingInlineEnd: ref("paddingInline"),
                        borderRadius: ref("radius"),
                        backgroundColor: stateLayer(ref, {
                            base: ref("container"),
                            content: ref("activeContent"),
                        }),
                        color: when()
                            .on(TRIGGER_SELECTED, ref("activeContent"))
                            .on(TRIGGER_INVALID, ref("errorContent"))
                            .on(
                                TRIGGER_DISABLED,
                                disabledColor("disabledContent"),
                            )
                            .else(ref("content")),
                    },
                    // The step's number, an icon or a check, in a circle.
                    indicator: {
                        position: relative,
                        display: flex,
                        alignItems: center,
                        justifyContent: center,
                        flexShrink: unitless(0),
                        width: ref("indicatorSize"),
                        height: ref("indicatorSize"),
                        borderRadius: radius("full"),
                        textStyle: textStyle("labelMedium"),
                        transition: stateTransition,
                        backgroundColor: when()
                            .on(
                                TRIGGER_SELECTED,
                                ref("activeIndicatorContainer"),
                            )
                            .on(
                                INDICATOR_CHECKED,
                                ref("activeIndicatorContainer"),
                            )
                            .on(TRIGGER_INVALID, ref("errorIndicatorContainer"))
                            .else(ref("indicatorContainer")),
                        color: when()
                            .on(TRIGGER_SELECTED, ref("activeIndicatorContent"))
                            .on(
                                INDICATOR_CHECKED,
                                ref("activeIndicatorContent"),
                            )
                            .on(TRIGGER_INVALID, ref("errorIndicatorContent"))
                            .else(ref("indicatorContent")),
                    },
                    label: { textStyle: textStyle("titleSmall") },
                    caption: {
                        textStyle: textStyle("bodySmall"),
                        color: ref("captionColor"),
                    },
                    separator: connectorLine,
                    content: {
                        paddingBlockStart: ref("contentPadding"),
                        paddingBlockEnd: ref("contentPadding"),
                        paddingInlineStart: ref("contentPadding"),
                        paddingInlineEnd: ref("contentPadding"),
                    },
                },
                variants: {
                    // A row of headers, each followed by a connector that takes the space between
                    // them; the content shows under the list.
                    orientation: {
                        horizontal: {
                            list: {
                                flexDirection: row,
                                alignItems: center,
                            },
                            item: {
                                flexDirection: row,
                                alignItems: center,
                                flexGrow: unitless(1),
                            },
                            separator: {
                                flexGrow: unitless(1),
                                height: ref("connectorThickness"),
                                minWidth: ref("connectorGap"),
                                marginInlineStart: ref("connectorGap"),
                                marginInlineEnd: ref("connectorGap"),
                            },
                        },
                        // A column of steps. The connector runs down from under the indicator, beside
                        // the content, and the content lines up with the label.
                        vertical: {
                            list: { flexDirection: column },
                            item: {
                                flexDirection: column,
                                alignItems: stretch,
                                minHeight: add(
                                    headerHeight,
                                    ref("connectorLength"),
                                ),
                            },
                            separator: {
                                position: absolute,
                                insetBlockStart: add(
                                    div(headerHeight, unitless(2)),
                                    div(ref("indicatorSize"), unitless(2)),
                                    ref("connectorGap"),
                                ),
                                insetBlockEnd: px(0),
                                insetInlineStart: sub(
                                    add(
                                        ref("paddingInline"),
                                        div(ref("indicatorSize"), unitless(2)),
                                    ),
                                    div(ref("connectorThickness"), unitless(2)),
                                ),
                                width: ref("connectorThickness"),
                            },
                            content: {
                                paddingInlineStart: add(
                                    ref("paddingInline"),
                                    ref("indicatorSize"),
                                    ref("gap"),
                                ),
                                width: pct(100),
                            },
                        },
                    },
                    density: densityTokenVariant(densities),
                },
                defaultVariants: {
                    orientation: "horizontal",
                    density: "inherit",
                },
            }),
        }),
    );

export const stepper = createStepper();
