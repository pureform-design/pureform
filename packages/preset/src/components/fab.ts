// The pureform floating action button: Material's FAB at M3 Expressive's sizes, with an optional
// label for the extended FAB.
//
// Sizes follow M3 Expressive: `default` (56), `medium` (80), and `large` (96), each with its
// icon size and corner radius. Extended, each takes Expressive's small, medium, and large
// extended FAB's padding, gap, and label type. `small` (40) is deprecated in Expressive and
// kept for apps that use it.
//
// The container takes a color group's container color (`tonal`), its main color (`filled`),
// or a surface with the group's color as content (`surface`, deprecated in Expressive and
// kept). It rests at elevation level 3
// and lifts to level 4 on hover. Its container can take a shape, so the icon and label sit
// inside it:
//
//   <button class={root}>
//     <span class={touchTarget} />
//     <span class={container}><span class={icon}>…</span><span class={label}>…</span></span>
//   </button>

import { typed } from "@pureform/core";
import { add, none, px, unitless } from "@pureform/core/ast";
import type { NumericValue } from "@pureform/core/ast";
import { radius, size as sizeToken, spacing, textStyle } from "@pureform/theme";

import { INDICATION_TOKENS } from "../state-layer";
import {
    DEFAULT_SHAPES,
    shapedColors,
    shapedContainer,
    shapedElevationLevels,
    shapeVariant,
} from "./shaped";
import type { Shapes } from "./shaped";
import {
    DEFAULT_GROUP,
    colorTokenVariants,
    componentTokens,
    defaultGroups,
    entriesOf,
    groupTokens,
    iconBox,
    iconFill,
    INDICATION_ROOT,
    keysOf,
    sizeTokenName,
    sizeTokens,
    pressableRoot,
    sys,
    tokenFillColors,
    touchTarget,
    variantsOf,
} from "./shared";
import type { ColorGroup, ColorGroups, Fill } from "./shared";

const FILLS = {
    tonal: "tonal",
    filled: "filled",
    surface: "elevated",
} satisfies Record<string, Fill>;

/** One of M3 Expressive's FAB sizes, or the deprecated `small` one, with its extended FAB. */
export interface FabSize {
    size: NumericValue;
    radius: NumericValue;
    icon: NumericValue;
    /** The extended FAB's padding, gap between icon and label, and label type. */
    padding: NumericValue;
    gap: NumericValue;
    label: string;
}

export const FAB_SIZES = {
    // Deprecated in M3 Expressive.
    small: {
        size: px(40),
        radius: radius("medium"),
        icon: sizeToken("iconMedium"),
        padding: spacing("4"),
        gap: spacing("3"),
        label: "labelLarge",
    },
    default: {
        size: px(56),
        radius: radius("large"),
        icon: sizeToken("iconMedium"),
        padding: spacing("4"),
        gap: spacing("2"),
        label: "titleMedium",
    },
    medium: {
        size: px(80),
        // M3 Expressive's "large increased" corner (20px in Material), from the theme's roles so
        // a shape theme rounds it too.
        radius: add(radius("large"), radius("extraSmall")),
        icon: px(28),
        padding: px(26),
        gap: spacing("3"),
        label: "titleLarge",
    },
    large: {
        size: px(96),
        radius: radius("extraLarge"),
        icon: px(36),
        padding: px(28),
        gap: spacing("4"),
        label: "headlineSmall",
    },
} satisfies Record<string, FabSize>;

const { tokens, ref } = componentTokens("fab", {
    radius: radius("large"),
    // Each size's side and corner radius, so a theme can retune a size.
    ...sizeTokens(FAB_SIZES, "size", "size"),
    ...sizeTokens(FAB_SIZES, "radius", "radius"),
    iconSize: sizeToken("iconMedium"),
    iconFill: unitless(0),
    gap: spacing("2"),
    padding: spacing("4"),
    ...groupTokens(DEFAULT_GROUP),
    ...INDICATION_TOKENS,
});

const elevation = shapedElevationLevels("level3", "level4");

const pf = typed();

/** Build the FAB with a `color` variant per group in `groups`. */
export const createFab = <const G extends string = ColorGroup>(
    groups: ColorGroups<G> = defaultGroups(),
    shapes: Shapes = DEFAULT_SHAPES,
) =>
    variantsOf<{ color: G | typeof DEFAULT_GROUP }>()(
        pf.slotComponent({
            name: "fab",
            $meta: {
                description:
                    "Material floating action button. Put the icon, and the label for an extended FAB, in the container. shape clips the container to one of the theme's shapes.",
            },
            tokens,
            slots: ["root", "touchTarget", "container", "icon", "label"],
            structure: {
                root: ["touchTarget", "container"],
                container: ["icon", "label"],
            },
            indication: [
                {
                    trigger: "root",
                    surface: "container",
                    centered: false,
                    focus: "root",
                },
            ],
            variants: {
                color: groups as ColorGroups,
                variant: keysOf(FILLS),
                size: keysOf(FAB_SIZES),
                extended: ["true", "false"],
                shape: ["none", ...Object.keys(shapes)],
            },
            recipe: () => ({
                base: {
                    root: {
                        ...INDICATION_ROOT,
                        ...pressableRoot(ref),
                        ...elevation.root,
                        states: {
                            ...elevation.root.states,
                            disabled: {
                                ...elevation.root.states.disabled,
                                pointerEvents: none,
                            },
                        },
                    },
                    container: {
                        ...shapedContainer(ref("radius")),
                        ...elevation.container,
                        gap: ref("gap"),
                    },
                    icon: iconBox(ref("iconSize"), {
                        fill: iconFill(ref("iconFill")),
                    }),
                    label: { textStyle: textStyle("titleMedium") },
                    touchTarget,
                },
                variants: {
                    color: colorTokenVariants(groups),
                    variant: Object.fromEntries(
                        entriesOf(FILLS).map(([name, fill]) => {
                            const colors = tokenFillColors(fill, ref);
                            // Material's surface FAB sits on the high surface container.
                            const container =
                                name === "surface"
                                    ? sys("surfaceContainerHigh")
                                    : colors.container;
                            return [
                                name,
                                shapedColors(ref, fill, {
                                    ...colors,
                                    container,
                                }),
                            ];
                        }),
                    ),
                    size: Object.fromEntries(
                        entriesOf(FAB_SIZES).map(([name, f]) => [
                            name,
                            {
                                root: {
                                    tokens: {
                                        iconSize: f.icon,
                                        gap: f.gap,
                                        padding: f.padding,
                                    },
                                    height: ref(sizeTokenName("size", name)),
                                    minWidth: ref(sizeTokenName("size", name)),
                                },
                                label: { textStyle: textStyle(f.label) },
                            },
                        ]),
                    ),
                    extended: {
                        true: {
                            container: {
                                paddingInlineStart: ref("padding"),
                                paddingInlineEnd: ref("padding"),
                            },
                        },
                        // Unextended, it's square at any size: its width follows its height.
                        false: { root: { aspectRatio: unitless(1) } },
                    },
                    shape: shapeVariant(shapes, {
                        radius: ref("radius"),
                    }),
                },
                // The container's radius follows the size only when unshaped. A shape sets its
                // own, and as a variant it would tie with the size's, leaving the order of their
                // rules to decide.
                compoundVariants: keysOf(FAB_SIZES).map((size) => ({
                    match: { size, shape: "none" as const },
                    style: {
                        container: {
                            borderRadius: ref(sizeTokenName("radius", size)),
                        },
                    },
                })),
                defaultVariants: {
                    color: "primary",
                    variant: "tonal",
                    size: "default",
                    extended: "false",
                    shape: "none",
                },
            }),
        }),
    );

export const fab = createFab();
