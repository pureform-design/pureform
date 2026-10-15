// Building blocks shared by pureform's component specs.

import {
    absolute,
    add,
    mul,
    pointer,
    relative,
    row,
    center,
    inlineFlex,
    unitless,
    alias,
    colorMix,
    dynamic,
    none,
    pct,
    px,
    solid,
    transform,
    transition,
    translate,
    transparent,
    tween,
    slot,
    when,
} from "@pureform/core/ast";
import type {
    Condition,
    AliasNode,
    ColorValue,
    SlotCondition,
    NumericValue,
    StyleMap,
    ValueNode,
} from "@pureform/core/ast";
import type { CoreConfig } from "@pureform/core/types";
import {
    MATERIAL_DENSITIES,
    colorRole,
    duration,
    easing,
    opacity,
    size,
    spacing,
    textStyle,
} from "@pureform/theme";

import { stateLayer } from "../state-layer";

/** The Material color groups a component can be tinted with through its `color` variant. */
export const COLOR_GROUPS = [
    "primary",
    "secondary",
    "tertiary",
    "success",
    "warning",
    "error",
    "info",
] as const;

export type ColorGroup = (typeof COLOR_GROUPS)[number];

/** The color groups a component offers through its `color` variant. The built-in groups by
 *  default; `pureform()` passes the palette's groups, including custom ones. */
export type ColorGroups = readonly string[];

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** A Material system color from the palette, for example `sys("onPrimary")`. It reads the
 *  semantic token, so it follows the light or dark scheme. */
export const sys = (name: string): AliasNode => colorRole(name);

/** A component's token set. Each entry compiles to an overridable
 *  `--<prefix>-components-<name>-<token>` var that falls back to the given default, so an app
 *  can restyle a component at runtime by setting the var on it or any ancestor. `ref(token)`
 *  is the alias a recipe reads it through. */
export const componentTokens = <K extends string>(
    name: string,
    defaults: Record<K, ValueNode>,
) => ({
    tokens: Object.fromEntries(
        Object.entries<ValueNode>(defaults).map(([token, value]) => [
            token,
            dynamic(["components", name, token], value),
        ]),
    ) as Record<K, ValueNode>,
    ref: (token: K): AliasNode => alias("components", name, token),
});

/** The tokens every outlined control shares: its stroke width and color. */
export type OutlineTokens = "outlineWidth" | "outlineColor";

/** The content color drawn on a group's main color, for example `onPrimary`. */
export const on = (name: string): AliasNode => sys(`on${capitalize(name)}`);

/** The on-surface color at one of the disabled opacities. */
export const disabledColor = (
    level: "disabledContainer" | "disabledContent",
): ColorValue => colorMix(transparent, sys("onSurface"), opacity(level));

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
    minWidth: size("touchTarget"),
    minHeight: size("touchTarget"),
    width: pct(100),
    height: pct(100),
};

/** How a component variant fills its container, following the Material button family. */
export type Fill = "filled" | "tonal" | "outlined" | "text" | "elevated";

/** Container and content colors for one fill in one color group. */
export const fillColors = (
    fill: Fill,
    group: string,
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
 *  how it fills. The disabled colors live here rather than on the variant because Panda puts
 *  compound variants in a cascade layer after the variants layer: a disabled color on the
 *  variant would lose to the compound's resting color. */
export const colorCompounds = (
    fills: Record<string, Fill>,
    groups: ColorGroups = COLOR_GROUPS,
): CompoundVariants =>
    Object.entries(fills).flatMap(([variant, fill]) =>
        groups.map((color) => {
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

/** One compound variant per color group but the default, where `match` holds as well, styled
 *  for the group. The match keeps its literal values, so a typed recipe checks them. */
export const groupCompounds = <const M extends Record<string, string>, S>(
    groups: ColorGroups,
    match: M,
    style: (group: string) => S,
): { match: M & { color: string }; style: S }[] =>
    groups
        .filter((group) => group !== DEFAULT_GROUP)
        .map((color) => ({ match: { ...match, color }, style: style(color) }));

/** The `color` variant group: one empty entry per color group, so compound variants can match
 *  on it. */
export const colorVariants = (
    groups: ColorGroups = COLOR_GROUPS,
): Record<string, { root: StyleMap }> =>
    Object.fromEntries(groups.map((group) => [group, { root: {} }]));

/** Disabled colors for a fill: Material draws a disabled control in the on-surface color, with
 *  a faint container for filled styles and a faint outline for the outlined style. */
export const disabledColors = (fill: Fill): StyleMap => {
    const content = disabledColor("disabledContent");
    switch (fill) {
        case "outlined":
            return {
                backgroundColor: transparent,
                color: content,
                borderColor: disabledColor("disabledContainer"),
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
export const fillVariant = (
    fill: Fill,
    ref: (token: OutlineTokens) => AliasNode,
): { root: StyleMap } => {
    const elevation = fillElevation(fill);
    const outline: StyleMap =
        fill === "outlined"
            ? {
                  borderWidth: ref("outlineWidth"),
                  borderStyle: solid,
                  borderColor: ref("outlineColor"),
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

/** How a component eases between states: the state layer and colors over `short3`, and
 *  elevation over `medium1`, both on the standard curve. The motion tokens set both, so a
 *  theme's motion provider retimes every component. Under reduced motion, states change
 *  instantly. */
export const STATE_TWEENS = [
    tween("backgroundColor", duration("short3"), easing("standard")),
    tween("color", duration("short3"), easing("standard")),
    tween("borderColor", duration("short3"), easing("standard")),
    tween("outlineColor", duration("short3"), easing("standard")),
    tween("boxShadow", duration("medium1"), easing("standard")),
];

export const stateTransition = when(
    "reducedMotion",
    none,
    transition(...STATE_TWEENS),
);

/** A transition of the given properties over `short3` on the standard curve, instant under
 *  reduced motion. For movement a component adds to its state colors. */
export const tweens = (...properties: Parameters<typeof tween>[0][]) =>
    when(
        "reducedMotion",
        none,
        transition(
            ...properties.map((property) =>
                tween(property, duration("short3"), easing("standard")),
            ),
        ),
    );

/** Material's focus indicator: a 3px ring in the secondary color, 2px outside the element,
 *  shown while `focused` holds (keyboard focus by default). It replaces the browser's own
 *  outline, and is drawn with `outline`, so it never moves anything. */
export const focusRing = (
    focused: Condition | Condition[] = "focusVisible",
): StyleMap => ({
    outlineStyle: when(focused, solid, none),
    outlineWidth: px(3),
    outlineColor: sys("secondary"),
    outlineOffset: px(2),
});

/** A color group's four roles, for example `primary`, `onPrimary`, `primaryContainer`, and
 *  `onPrimaryContainer`. */
export const groupRoles = (group: string) => ({
    main: sys(group),
    on: on(group),
    container: sys(`${group}Container`),
    onContainer: on(`${group}Container`),
});

/** The default color group. A component's base draws it through its tokens, so its `color`
 *  variant entry stays empty and the tokens keep working. */
export const DEFAULT_GROUP = "primary";

/** A `color` variant group: an entry per group, built from that group's roles, except the
 *  default group, which the base already draws. */
export const colorVariant = <T>(
    groups: ColorGroups,
    build: (roles: ReturnType<typeof groupRoles>) => T,
): Record<string, T | Record<string, never>> =>
    Object.fromEntries(
        groups.map((group) => [
            group,
            group === DEFAULT_GROUP ? {} : build(groupRoles(group)),
        ]),
    );

/** Merge slot styles, slot by slot; later maps win per property. */
export const mergeSlots = (
    ...maps: Record<string, StyleMap>[]
): Record<string, StyleMap> => {
    const out: Record<string, StyleMap> = {};
    for (const map of maps) {
        for (const [slot, style] of Object.entries(map)) {
            out[slot] = { ...out[slot], ...style };
        }
    }
    return out;
};

/** An icon slot of the given size: a box that centers its content, and sets the font size so
 *  a glyph or icon-font icon fills it like an svg would. */
export const iconBox = (size: NonNullable<StyleMap["width"]>): StyleMap => ({
    display: inlineFlex,
    alignItems: center,
    justifyContent: center,
    minWidth: size,
    width: size,
    height: size,
    fontSize: size,
    lineHeight: unitless(1),
});

/** The root every pressable component shares: the focus ring and state transition, a
 *  positioned inline row that centers its content (the touch target sits over it), no border,
 *  a pointer, and no clicks while disabled. */
export const pressableRoot: StyleMap = {
    ...focusRing(),
    transition: stateTransition,
    position: relative,
    display: inlineFlex,
    flexDirection: row,
    alignItems: center,
    justifyContent: center,
    borderWidth: px(0),
    cursor: pointer,
    states: { disabled: { pointerEvents: none } },
};

/** A Material surface: a container color, the content color drawn on it, and an elevation
 *  level. Card, menu, and dialog are surfaces. */
export const surface = (
    container: ColorValue,
    content: ColorValue,
    level: string,
): StyleMap => ({
    backgroundColor: container,
    color: content,
    apply: { shadowElevation: level },
});

/** A bare text input: the body text in the given color, and nothing else drawn, so the
 *  component around it supplies the container. Text fields, text areas, and the search bar
 *  share it. */
export const inputText = (color: ColorValue): StyleMap => ({
    textStyle: textStyle("bodyLarge"),
    width: pct(100),
    borderWidth: px(0),
    outlineStyle: none,
    backgroundColor: transparent,
    color,
    states: { disabled: { color: disabledColor("disabledContent") } },
});

/** A state layer that follows another slot: `base` tinted with `content` while `slotName` is
 *  hovered, focused, or pressed. `selected` gives the colors once a state such as `checked` or
 *  `selected` holds: its tint color, and its container if it fills. A disabled slot shows no
 *  tint. */
export const slotStateLayer = (
    slotName: string,
    rest: { base: ColorValue; content: ColorValue; disabled?: ColorValue },
    selected?: { state: SlotCondition; base?: ColorValue; content: ColorValue },
) => {
    const layer = when();
    for (const [state, level] of [
        ["hover", "stateHover"],
        ["focusVisibleWithin", "stateFocus"],
        ["pressed", "statePressed"],
    ] as const) {
        const condition = slot(slotName, state);
        layer.on(condition, colorMix(rest.base, rest.content, opacity(level)));
        if (selected) {
            layer.on(
                [selected.state, condition],
                colorMix(
                    selected.base ?? rest.base,
                    selected.content,
                    opacity(level),
                ),
            );
        }
    }
    if (selected?.base) layer.on(selected.state, selected.base);
    return layer
        .on(slot(slotName, "disabled"), rest.disabled ?? rest.base)
        .else(rest.base);
};

/** Density steps by name: grid units each adds to a dense component's height. The theme's
 *  layout declares them; Material's `"0"` to `"-3"` by default. */
export type Densities = Record<string, number>;

export const DEFAULT_DENSITIES: Densities = MATERIAL_DENSITIES;

/** The theme's density offset, which `density` on the layout provider sets. */
export const THEME_DENSITY: NumericValue = size("densityOffset");

/** What a density step adds: a grid unit per step, negative to take it off. */
export const densityOffset = (units: number): NumericValue =>
    units === 0 ? px(0) : mul(spacing("1"), unitless(units));

/** A size at the theme's density. */
export const dense = (value: NumericValue): NumericValue =>
    add(value, THEME_DENSITY);

type SlotStyles = Record<string, StyleMap>;

/** A `density` variant: `inherit` follows the theme, and each step restates the sized styles
 *  at its offset. For a component whose sizes depend on no other variant. */
export const densityVariant = (
    densities: Densities,
    sized: (offset: NumericValue) => SlotStyles,
): Record<string, SlotStyles> => ({
    inherit: {},
    ...Object.fromEntries(
        Object.entries(densities).map(([name, units]) => [
            name,
            sized(densityOffset(units)),
        ]),
    ),
});

/** A `density` variant whose steps only name themselves, for a component whose sizes depend on
 *  another variant; `densityCompounds` then restates them per that variant's value. */
export const densityMarkers = (
    densities: Densities,
): Record<string, SlotStyles> =>
    Object.fromEntries(
        ["inherit", ...Object.keys(densities)].map((name) => [name, {}]),
    );

/** An object's keys, typed as its declared names rather than `string`. */
export const keysOf = <T extends object>(object: T) =>
    Object.keys(object) as (keyof T & string)[];

/** An object's entries, keyed by its declared names rather than `string`. */
export const entriesOf = <T extends object>(object: T) =>
    Object.entries(object) as [keyof T & string, T[keyof T]][];

/** A name in lower case, typed as such, for a variant value made from a token suffix. */
export const lower = <S extends string>(name: S) =>
    name.toLowerCase() as Lowercase<S>;

/** One compound variant per density step, restating the sized styles where `match` holds.
 *  The match keeps its literal values, so a typed recipe checks them. */
export const densityCompounds = <
    const M extends Record<string, string>,
    D extends string = string,
>(
    densities: Record<D, number>,
    match: M,
    sized: (offset: NumericValue) => SlotStyles,
): { match: M & { density: D }; style: SlotStyles }[] =>
    (Object.entries(densities) as [D, number][]).map(([density, units]) => ({
        match: { ...match, density },
        style: sized(densityOffset(units)),
    }));
