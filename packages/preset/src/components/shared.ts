// Building blocks shared by pureform's component specs.

import {
    absolute,
    alias,
    colorMix,
    pct,
    px,
    solid,
    transform,
    translate,
    transparent,
} from "@pureform/core/ast";
import type { AliasNode, ColorValue, StyleMap } from "@pureform/core/ast";
import type { CoreConfig } from "@pureform/core/types";

import { stateLayer } from "../state-layer";

/** The Material color groups a component can be tinted with through its `color` variant. */
export const COLOR_GROUPS = [
    "primary",
    "secondary",
    "tertiary",
    "positive",
    "notice",
    "negative",
    "info",
] as const;

export type ColorGroup = (typeof COLOR_GROUPS)[number];

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** A Material system color from the palette, for example `sys("onPrimary")`. */
export const sys = (name: string): AliasNode => alias("tokens", "colors", name);

/** The content color drawn on a group's main color, for example `onPrimary`. */
export const on = (name: string): AliasNode => sys(`on${capitalize(name)}`);

/** The on-surface color at one of the disabled opacities. */
export const disabledColor = (
    opacity: "disabledContainer" | "disabledContent",
): ColorValue =>
    colorMix(
        transparent,
        sys("onSurface"),
        alias("tokens", "opacity", opacity),
    );

/** Container and content colors for an interactive surface: the container takes a state layer
 *  of the content color, and the content stays as given. */
export const interactiveColors = (
    container: ColorValue,
    content: ColorValue,
): StyleMap => ({
    backgroundColor: stateLayer({ base: container, content }),
    color: content,
});

/** A transparent slot centered on its parent that grows the hit area to the Material minimum
 *  without changing the visible size. */
export const touchTarget: StyleMap = {
    position: absolute,
    top: pct(50),
    left: pct(50),
    transform: transform(translate(pct(-50), pct(-50))),
    minWidth: alias("tokens", "sizes", "touchTarget"),
    minHeight: alias("tokens", "sizes", "touchTarget"),
    width: pct(100),
    height: pct(100),
};

/** How a component variant fills its container, following the Material button family. */
export type Fill = "filled" | "tonal" | "outlined" | "text" | "elevated";

/** Container and content colors for one fill in one color group. */
export const fillColors = (
    fill: Fill,
    group: ColorGroup,
): { container: ColorValue; content: ColorValue } => {
    switch (fill) {
        case "filled":
            return { container: sys(group), content: on(group) };
        case "tonal":
            return {
                container: sys(`${group}Container`),
                content: on(`${group}Container`),
            };
        case "elevated":
            return {
                container: sys("surfaceContainerLow"),
                content: sys(group),
            };
        case "outlined":
        case "text":
            return { container: transparent, content: sys(group) };
    }
};

type SlottedSpec = Extract<
    CoreConfig["components"][string],
    { kind: "slotComponent" }
>;
type CompoundVariants = NonNullable<SlottedSpec["recipe"]["compoundVariants"]>;

/** One compound variant per color group and variant, setting the root's state-layered
 *  container, its content color, and its disabled colors. `fills` maps each variant name to
 *  how it fills. The disabled colors live here rather than on the variant because Panda emits
 *  compound variants as atomic utilities, which outrank recipe variants: a disabled color on
 *  the variant would lose to the compound's resting color. */
export const colorCompounds = (fills: Record<string, Fill>): CompoundVariants =>
    Object.entries(fills).flatMap(([variant, fill]) =>
        COLOR_GROUPS.map((color) => {
            const { container, content } = fillColors(fill, color);
            return {
                match: { color, variant },
                style: {
                    root: {
                        ...interactiveColors(container, content),
                        states: { disabled: disabledColors(fill) },
                    },
                },
            };
        }),
    );

/** The `color` variant group: one empty entry per color group, so compound variants can match
 *  on it. */
export const colorVariants = (): Record<string, { root: StyleMap }> =>
    Object.fromEntries(COLOR_GROUPS.map((group) => [group, { root: {} }]));

/** Disabled colors for a fill: Material draws a disabled control in the on-surface color, with
 *  a faint container for filled styles and a faint outline for the outlined style. */
export const disabledColors = (fill: Fill): StyleMap => {
    const content = disabledColor("disabledContent");
    switch (fill) {
        case "outlined":
            return {
                backgroundColor: transparent,
                color: content,
                outlineColor: disabledColor("disabledContainer"),
            };
        case "text":
            return { backgroundColor: transparent, color: content };
        default:
            return {
                backgroundColor: disabledColor("disabledContainer"),
                color: content,
            };
    }
};

/** Resting and hovered elevation per fill, as Material specifies for buttons. */
export const fillElevation = (fill: Fill): StyleMap => {
    switch (fill) {
        case "elevated":
            return {
                apply: { shadowElevation: "level1" },
                states: { hover: { apply: { shadowElevation: "level2" } } },
            };
        case "filled":
        case "tonal":
            return {
                apply: { shadowElevation: "level0" },
                states: { hover: { apply: { shadowElevation: "level1" } } },
            };
        default:
            return {};
    }
};

/** The variant-level root style for a fill: its outline and elevation. The colors come from
 *  `colorCompounds`, since they also depend on the color group. */
export const fillVariant = (fill: Fill): { root: StyleMap } => {
    const elevation = fillElevation(fill);
    const outline: StyleMap =
        fill === "outlined"
            ? {
                  outlineWidth: px(1),
                  outlineStyle: solid,
                  outlineColor: sys("outline"),
                  outlineOffset: px(-1),
              }
            : {};
    return {
        root: {
            ...outline,
            ...elevation,
            states: {
                ...elevation.states,
                disabled: elevation.apply
                    ? { apply: { shadowElevation: "level0" } }
                    : {},
            },
        },
    };
};
