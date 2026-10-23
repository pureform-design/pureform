// Building blocks shared by pureform's component specs.

import { mergeStyles, transitionMoves } from "@pureform/core";
import {
    absolute,
    add,
    min,
    mul,
    sub,
    pointer,
    relative,
    rotate,
    row,
    center,
    inlineFlex,
    isolate,
    unitless,
    alias,
    colorMix,
    dynamic,
    fontVariations,
    none,
    numeric,
    pct,
    px,
    scaleX,
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
    DynamicNode,
    ColorValue,
    SlotCondition,
    NumericValue,
    StyleMap,
    TransformOp,
    Timing,
    TransitionPart,
    ValueType,
    ValueNode,
} from "@pureform/core/ast";
import {
    MATERIAL_DENSITIES,
    type MaterialDensity,
    colorRole,
    duration,
    easing,
    opacity,
    radius,
    size,
    spacing,
    spring,
    textStyle,
} from "@pureform/theme";
import type { SpringRole } from "@pureform/theme";

import {
    INDICATION_TOKENS,
    STATE_LAYER_OPACITY,
    stateLayer,
} from "../state-layer";
import type {
    IndicationRef,
    IndicationToken,
    StateLayerOptions,
} from "../state-layer";

/** The corners of a shape Material draws as a circle, such as a radio's dot or a handle: a
 *  circle whatever the theme's corners, which a full radius follows. */
export const circle = pct(50);

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
export type ColorGroups<G extends string = string> = readonly G[];

/** The built-in groups, as a factory's default for the group names it's typed by. */
export const defaultGroups = <G extends string>() =>
    COLOR_GROUPS as ColorGroups as ColorGroups<G>;

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
    /** The types of value tokens hold, for those whose changes transition:
     *  `{ value: "number" }`. */
    valueTypes: Partial<Record<K, ValueType>> = {},
) => {
    const tokens = Object.fromEntries(
        Object.entries<ValueNode>(defaults).map(([token, value]) => [
            token,
            dynamic(["components", name, token], value, valueTypes[token as K]),
        ]),
    ) as Record<K, DynamicNode>;
    return {
        tokens: tokens as Record<K, ValueNode>,
        ref: (token: K): AliasNode => alias("components", name, token),
        /** A token's own dynamic value, which a transition names to move it. */
        own: (token: K): DynamicNode => tokens[token],
    };
};

/** The tokens every outlined control shares: its stroke width and color. */
export type OutlineTokens = "outlineWidth" | "outlineColor";

/** The content color drawn on a group's main color, for example `onPrimary`. */
export const on = (name: string): AliasNode => sys(`on${capitalize(name)}`);

/** The on-surface color at one of the disabled opacities. */
export const disabledColor = (
    level: "disabledContainer" | "disabledContent",
): ColorValue => colorMix(transparent, sys("onSurface"), opacity(level));

/** The indication tokens' root style: every interactive component's base sets them back to the
 *  theme's on its root, so a component's own tokens reach its slots but not a nested component
 *  of the same kind, which starts from the theme's again. */
export const INDICATION_ROOT: StyleMap = { tokens: INDICATION_TOKENS };

/** Container and content colors for an interactive surface: the container takes a state layer
 *  of the content color, at the opacities `token` reads, and the content stays as given. */
export const interactiveColors = (
    token: IndicationRef,
    container: ColorValue,
    content: ColorValue,
): StyleMap => ({
    backgroundColor: stateLayer(token, { base: container, content }),
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

/** The roles a component's group tokens point at for a color group: its main and container
 *  colors, and the content drawn on each. */
export const groupTokens = (group: string) => ({
    accent: sys(group),
    onAccent: on(group),
    accentContainer: sys(`${group}Container`),
    onAccentContainer: on(`${group}Container`),
});

/** A component token naming one of a group's roles. */
export type GroupToken = keyof ReturnType<typeof groupTokens>;

/** The `color` variant group for a component with group tokens: each group points them at its
 *  roles, except the default group, which the tokens' defaults already name. */
export const colorTokenVariants = <G extends string>(
    groups: ColorGroups<G>,
): Record<G, { root: StyleMap }> =>
    Object.fromEntries(
        groups.map((group): [G, { root: StyleMap }] => [
            group,
            {
                root:
                    group === DEFAULT_GROUP
                        ? {}
                        : { tokens: groupTokens(group) },
            },
        ]),
    ) as Record<G, { root: StyleMap }>;

/** Container and content colors for one fill, read through the group tokens, which the
 *  `color` variant points at a group. One rule per fill then draws every group, where colors
 *  set outright would need one per fill and group. */
export const tokenFillColors = (
    fill: Fill,
    token: (name: GroupToken) => AliasNode,
): { container: ColorValue; content: ColorValue } => {
    switch (fill) {
        case "filled":
            return { container: token("accent"), content: token("onAccent") };
        case "tonal":
            return {
                container: token("accentContainer"),
                content: token("onAccentContainer"),
            };
        case "elevated":
            return {
                container: sys("surfaceContainerLow"),
                content: token("accent"),
            };
        case "outlined":
        case "text":
            return { container: transparent, content: token("accent") };
    }
};

/** A fill's root colors read through the group tokens: its state-layered container, its
 *  content color, and its disabled colors. */
export const fillTokenColors = (
    fill: Fill,
    token: (name: GroupToken | IndicationToken) => AliasNode,
): StyleMap => {
    const { container, content } = tokenFillColors(fill, token);
    return {
        ...interactiveColors(token, container, content),
        states: { disabled: disabledColors(fill) },
    };
};

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

/** The variant-level root style for a fill: its outline and elevation. Its colors come from
 *  `fillTokenColors`. */
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
 *  theme's motion provider retimes every component. Nothing here moves, so they run under
 *  reduced motion too. */
export const STATE_TWEENS = [
    tween("backgroundColor", duration("short3"), easing("standard")),
    tween("color", duration("short3"), easing("standard")),
    tween("borderColor", duration("short3"), easing("standard")),
    tween("outlineColor", duration("short3"), easing("standard")),
    tween("boxShadow", duration("medium1"), easing("standard")),
];

export const stateTransition = transition(...STATE_TWEENS);

/** A transition of the given parts that stops movement under reduced motion: the parts that
 *  move, resize, or reshape drop out, and color, opacity, and elevation fades keep running.
 *  Nothing left is `none`. */
export const motionTransition = (
    ...parts: TransitionPart[]
): NonNullable<StyleMap["transition"]> => {
    const fades = parts.filter((part) => !transitionMoves(part.property));
    if (fades.length === parts.length) return transition(...parts);
    return when(
        "reducedMotion",
        fades.length > 0 ? transition(...fades) : none,
        transition(...parts),
    );
};

/** A transition of the given properties over `short3` on the standard curve, or on a timing
 *  given first, which may be a spring (`tweens({ spring: spring("spatialFast") }, "width")`).
 *  Under reduced motion the moving ones change at once and the fades still run. For movement a
 *  component adds to its state colors. */
export function tweens(
    ...properties: TransitionPart["property"][]
): NonNullable<StyleMap["transition"]>;
export function tweens(
    timing: Timing,
    ...properties: TransitionPart["property"][]
): NonNullable<StyleMap["transition"]>;
export function tweens(
    ...args: (Timing | TransitionPart["property"])[]
): NonNullable<StyleMap["transition"]> {
    const [first, ...rest] = args;
    const given =
        first !== undefined && typeof first !== "string" && !("type" in first)
            ? first
            : undefined;
    const timing: Timing = given ?? {
        duration: duration("short3"),
        easing: easing("standard"),
    };
    const properties = (given ? rest : args) as TransitionPart["property"][];
    return motionTransition(
        ...properties.map((property) => tween(property, timing)),
    );
}

/** A transition moving `moving` on the spring `role` and fading `fades` on `tweens`' timing
 *  (`short3`, standard), as Compose splits a component's motion: a spring for what moves
 *  (position, size, shape, rotation) and the colors on their own timing. Under reduced motion
 *  the moving ones change at once and the fades still run. */
export const springTweens = (
    role: SpringRole,
    moving: readonly TransitionPart["property"][],
    fades: readonly TransitionPart["property"][] = [],
): NonNullable<StyleMap["transition"]> =>
    motionTransition(
        ...moving.map((property) => tween(property, { spring: spring(role) })),
        ...fades.map((property) =>
            tween(property, {
                duration: duration("short3"),
                easing: easing("standard"),
            }),
        ),
    );

/** How a chevron turns over: on the fast spatial spring, its color on its tween. Every chevron
 *  that turns (the list's, accordion's and tree's expand indicator, the select's arrow) uses it,
 *  so they turn alike. Compose rotates its dropdown arrow at once (`ExposedDropdownMenuDefaults
 *  .TrailingIcon`); a small part's movement takes `FastSpatial` in its motion scheme. */
export const chevronTransition = springTweens(
    "spatialFast",
    ["transform"],
    ["color"],
);

/** How an expanding part (the accordion's content, a tree's group, a list item's region, a
 *  vertical stepper's content) grows open and shrinks shut: its height on the default spatial
 *  spring, which binding-core's `watchCollapse` runs as the part's `hidden` changes. Compose
 *  expands and shrinks with `AnimatedVisibility`'s `expandVertically`/`shrinkVertically`, a
 *  size change, which M3 Expressive's motion scheme moves on `DefaultSpatial`. Under reduced
 *  motion it has no transition, so the part shows and hides at once. */
export const collapseTransition = springTweens("spatialDefault", ["height"]);

/** A turning icon's transform: turned over (180°) while `turned` holds, else upright. The
 *  expand indicators', the split button's chevron and the table's sort arrow; give it
 *  `chevronTransition`, or `springTweens("spatialFast", ["transform"], fades)` for other fades. */
export const turnedOver = (turned: Condition) =>
    when()
        .on(turned, transform(rotate(numeric(180, "deg"))))
        .else(transform(rotate(numeric(0, "deg"))));

/** A stacking context of its own: a part inside that `stackAbove()`s its siblings stacks only
 *  against them, never against the page. Spread it on the container. */
export const isolated: StyleMap = { isolation: isolate };

/** Draws over its siblings in an `isolated` container (the list item's row over its action,
 *  the tabs' indicator over the tabs, the switch's input over its track). */
export const stackAbove = (): StyleMap => ({ zIndex: unitless(1) });

/** Material's focus indicator: a ring of the focus indicator's thickness and color, its outer
 *  offset outside the element (by default the theme's 3px, secondary, and 2px), shown while
 *  `focused` holds (keyboard focus by default). `token` reads the component's indication
 *  tokens. It replaces the browser's own outline, and is drawn with `outline`, so it never
 *  moves anything. */
export const focusRing = (
    token: IndicationRef,
    focused: Condition | Condition[] = "focusVisible",
): StyleMap => ({
    outlineStyle: when(focused, solid, none),
    outlineWidth: token("focusIndicatorThickness"),
    outlineColor: token("focusIndicatorColor"),
    outlineOffset: token("focusIndicatorOuterOffset"),
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

/** A factory's component, with its variants typed by what it was built with: the color groups
 *  and density steps it was given. Its recipe is checked against plain strings, since
 *  TypeScript can't relate styles keyed by a generic group to the variant's own keys. */
export const variantsOf =
    <V extends Record<string, string>>() =>
    <S extends { readonly $variants?: object }>(spec: S): WithVariants<S, V> =>
        spec as Omit<S, "$variants"> as WithVariants<S, V>;

/** A spec whose variants' types are replaced by `V`'s, rather than intersected with them,
 *  which would fold a type like `"0" | (string & {})` into `string`. */
type WithVariants<S extends { readonly $variants?: object }, V> = Omit<
    S,
    "$variants"
> & {
    readonly $variants?: Omit<NonNullable<S["$variants"]>, keyof V> & V;
};

/** A `color` variant group: an entry per group, built from that group's roles, except the
 *  default group, which the base already draws. */
export const colorVariant = <T, G extends string = string>(
    groups: ColorGroups<G>,
    build: (roles: ReturnType<typeof groupRoles>) => T,
): Record<G, T | Record<string, never>> =>
    Object.fromEntries(
        groups.map((group) => [
            group,
            group === DEFAULT_GROUP ? {} : build(groupRoles(group)),
        ]),
    ) as Record<G, T | Record<string, never>>;

/** Merge slot styles, slot by slot, their states too; later maps win per property. */
export const mergeSlotStyles = (
    ...maps: Record<string, StyleMap>[]
): Record<string, StyleMap> => {
    const out: Record<string, StyleMap> = {};
    for (const map of maps) {
        for (const [slot, style] of Object.entries(map)) {
            out[slot] = out[slot] ? mergeStyles(out[slot], style) : style;
        }
    }
    return out;
};

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

/** Material Symbols' fill axis for an icon slot: `rest` (0 or 1, a component's `iconFill`
 *  token), or `filled.fill` while `filled.on` holds, such as the current destination. Icon
 *  fonts read it; an svg icon ignores it. */
export const iconFill = (
    rest: NumericValue,
    filled?: { on: Condition | Condition[]; fill: NumericValue },
): NonNullable<StyleMap["fontVariationSettings"]> =>
    filled
        ? when(
              filled.on,
              fontVariations({ FILL: filled.fill }),
              fontVariations({ FILL: rest }),
          )
        : fontVariations({ FILL: rest });

/** An icon slot of the given size: a box that centers its content, and sets the font size so
 *  a glyph or icon-font icon fills it like an svg would. `fill` sets Material Symbols' fill
 *  axis (see `iconFill`). An icon marked `mirrored` (`data-pf-mirror` on the web) flips under
 *  `rtl`, after the slot's own `transform`, if it has one. */
export const iconBox = (
    size: NonNullable<StyleMap["width"]>,
    {
        fill,
        transform: moved = [],
    }: {
        fill?: StyleMap["fontVariationSettings"];
        transform?: TransformOp[];
    } = {},
): StyleMap => ({
    display: inlineFlex,
    alignItems: center,
    justifyContent: center,
    minWidth: size,
    width: size,
    height: size,
    fontSize: size,
    lineHeight: unitless(1),
    ...(fill ? { fontVariationSettings: fill } : {}),
    ...(moved.length > 0 ? { transform: transform(...moved) } : {}),
    states: {
        rtl: {
            states: {
                mirrored: {
                    transform: transform(...moved, scaleX(unitless(-1))),
                },
            },
        },
    },
});

/** A round button as large as its icon box: no border or padding, the focus ring, and a state
 *  layer of `content` over nothing. The number field's steppers and the input chip's remove
 *  button; a part adds its own color, margins and disabled rule. */
export const roundIconButton = (
    token: IndicationRef,
    size: NonNullable<StyleMap["width"]>,
    {
        fill,
        content,
    }: {
        fill?: StyleMap["fontVariationSettings"];
        content: StateLayerOptions["content"];
    },
): StyleMap => ({
    ...iconBox(size, { fill }),
    ...focusRing(token),
    position: relative,
    cursor: pointer,
    borderWidth: px(0),
    paddingInlineStart: px(0),
    paddingInlineEnd: px(0),
    paddingBlockStart: px(0),
    paddingBlockEnd: px(0),
    borderRadius: radius("full"),
    backgroundColor: stateLayer(token, { base: transparent, content }),
});

/** The root every pressable component shares: the focus ring (reading `token`, the
 *  component's indication tokens) and state transition, a positioned inline row that centers
 *  its content (the touch target sits over it), no border, a pointer, and no clicks while
 *  disabled. */
export const pressableRoot = (token: IndicationRef) =>
    ({
        ...focusRing(token),
        transition: stateTransition,
        position: relative,
        display: inlineFlex,
        flexDirection: row,
        alignItems: center,
        justifyContent: center,
        borderWidth: px(0),
        cursor: pointer,
        states: { disabled: { pointerEvents: none } },
    }) satisfies StyleMap;

/** A notification's text action (the snackbar's and the toast's): a full-round text button in
 *  `color`, `actionHeight` tall, with its state layer from the component's indication tokens. */
export const notificationAction = (
    token: IndicationRef & ((name: "actionHeight") => AliasNode),
    color: ColorValue,
) =>
    ({
        ...pressableRoot(token),
        ...interactiveColors(token, transparent, color),
        textStyle: textStyle("labelLarge"),
        height: token("actionHeight"),
        paddingInlineStart: spacing("3"),
        paddingInlineEnd: spacing("3"),
        borderRadius: radius("full"),
    }) satisfies StyleMap;

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
 *  hovered, focused, or pressed, at the opacities `token` reads (the component's indication
 *  tokens). `selected` gives the colors once a state such as `checked` or `selected` holds: its
 *  tint color, its container if it fills, and its container while disabled if that differs. A
 *  disabled slot shows no tint. */
export const slotStateLayer = (
    token: IndicationRef,
    slotName: string,
    rest: { base: ColorValue; content: ColorValue; disabled?: ColorValue },
    selected?: {
        state: SlotCondition;
        base?: ColorValue;
        content: ColorValue;
        disabled?: ColorValue;
    },
) => {
    const layer = when();
    for (const [state, level] of [
        ["hover", STATE_LAYER_OPACITY.hover],
        ["focusVisibleWithin", STATE_LAYER_OPACITY.focus],
        ["pressed", STATE_LAYER_OPACITY.pressed],
    ] as const) {
        const condition = slot(slotName, state);
        layer.on(condition, colorMix(rest.base, rest.content, token(level)));
        if (selected) {
            layer.on(
                [selected.state, condition],
                colorMix(
                    selected.base ?? rest.base,
                    selected.content,
                    token(level),
                ),
            );
        }
    }
    if (selected?.base) layer.on(selected.state, selected.base);
    layer.on(slot(slotName, "disabled"), rest.disabled ?? rest.base);
    if (selected?.disabled) {
        layer.on(
            [selected.state, slot(slotName, "disabled")],
            selected.disabled,
        );
    }
    return layer.else(rest.base);
};

/** Density steps by name: grid units each adds to a dense component's height. The theme's
 *  layout declares them; Material's `"0"` to `"-3"` by default. */
export type Densities<D extends string = string> = Record<D, number>;

export const DEFAULT_DENSITIES: Densities<MaterialDensity> = MATERIAL_DENSITIES;

/** Material's steps, as a factory's default for the step names it's typed by. */
export const defaultDensities = <D extends string>() =>
    DEFAULT_DENSITIES as Densities as Densities<D>;

/** A `density` variant's values: `inherit`, then each step's name. */
export const densitySteps = <D extends string>(
    densities: Densities<D>,
): ("inherit" | D)[] => ["inherit", ...keysOf(densities)];

/** The theme's density offset, which `density` on the layout provider sets. */
export const THEME_DENSITY: NumericValue = size("densityOffset");

/** What a density step adds: a grid unit per step, negative to take it off. */
export const densityOffset = (units: number): NumericValue =>
    units === 0 ? px(0) : mul(spacing("1"), unitless(units));

/** A size at the theme's density. */
export const dense = (value: NumericValue): NumericValue =>
    add(value, THEME_DENSITY);

type SlotStyles = Record<string, StyleMap>;

/** A component's density token: the offset its sizes add, the theme's unless a `density` step
 *  sets it. */
export const DENSITY_TOKEN = { densityOffset: THEME_DENSITY };

/** The `density` variant for a component with the density token: each step sets it, so one
 *  rule per size reads every step, where sizes set outright would need one per size and
 *  step. `inherit` sets it back to the theme's, so a component inside a denser one still
 *  follows the theme rather than inheriting its parent's token. */
export const densityTokenVariant = <D extends string>(
    densities: Densities<D>,
): Record<"inherit" | D, { root: StyleMap }> =>
    Object.fromEntries([
        ["inherit", { root: { tokens: { densityOffset: THEME_DENSITY } } }],
        ...entriesOf(densities).map(([name, units]) => [
            name,
            { root: { tokens: { densityOffset: densityOffset(units) } } },
        ]),
    ]) as Record<"inherit" | D, { root: StyleMap }>;

/** A `density` variant: `inherit` follows the theme, and each step restates the sized styles
 *  at its offset. For a component whose sizes depend on no other variant. */
export const densityVariant = <D extends string>(
    densities: Densities<D>,
    sized: (offset: NumericValue) => SlotStyles,
): Record<"inherit" | D, SlotStyles> =>
    ({
        inherit: {},
        ...Object.fromEntries(
            entriesOf(densities).map(([name, units]) => [
                name,
                sized(densityOffset(units)),
            ]),
        ),
    }) as Record<"inherit" | D, SlotStyles>;

/** An object's keys, typed as its declared names rather than `string`. */
export const keysOf = <T extends object>(object: T) =>
    Object.keys(object) as (keyof T & string)[];

/** An object's entries, keyed by its declared names rather than `string`. */
export const entriesOf = <T extends object>(object: T) =>
    Object.entries(object) as [keyof T & string, T[keyof T]][];

/** A name in lower case, typed as such, for a variant value made from a token suffix. */
export const lower = <S extends string>(name: S) =>
    name.toLowerCase() as Lowercase<S>;

/** `from` while `flag` is 0, `to` while it's 1: a variant sets the flag, so a value can follow
 *  two variant groups without a compound for each pair of their values. */
export const blend = (
    from: NumericValue,
    to: NumericValue,
    flag: NumericValue,
): NumericValue => add(from, mul(sub(to, from), flag));

/** M3 Expressive's corner morph from a component's tokens: `radius` (round) and `squareRadius`
 *  at rest, swapped while a toggle is on, and `pressedRadius` while pressed (which wins over
 *  selected, as in Compose's `shapeByInteraction`; from the element or a shared interaction
 *  source). `square` is the flag the `corner` variant
 *  sets, so the size sets the radii and the corner picks between them with no compound per
 *  size and corner. `toggles` is the flag the `toggle` variant sets: `selected` also matches
 *  `aria-current` and `aria-selected`, so only a toggle swaps its corners when selected. */
export const cornerRadius = (
    ref: (
        token:
            | "radius"
            | "squareRadius"
            | "pressedRadius"
            | "square"
            | "toggles",
    ) => NumericValue,
) => {
    const rest = blend(ref("radius"), ref("squareRadius"), ref("square"));
    const swapped = blend(ref("squareRadius"), ref("radius"), ref("square"));
    return when()
        .on(slot("root", "pressed"), ref("pressedRadius"))
        .on(slot("root", "selected"), blend(rest, swapped, ref("toggles")))
        .else(rest);
};

/** A full (pill) radius for a part `height` tall: half its height, or less where the theme's
 *  full radius is smaller. The theme's full radius is a huge length (9999px) that the browser
 *  clamps, so a corner morphing from it spends nearly all its spring above the clamp and
 *  snaps at the end; half the height interpolates over the visible range, as Compose's
 *  `RoundedCornerShape(50)` morphs in pixels of the shape's size. */
export const pillRadius = (height: NumericValue): NumericValue =>
    min(radius("full"), mul(height, unitless(0.5)));

/** Which corners a corner-morphing component rests in by default. */
export type RestingCorner = "round" | "square";

/** The tokens `cornerRadius` reads: the round `radius` (full), the given square and pressed
 *  radii, the `corner` variant's `square` flag (1 when `rest` is square), and the `toggle`
 *  variant's `toggles` flag. A component spreads them first in its token set. */
export const cornerMorphTokens = (
    rest: RestingCorner,
    squareRadius: ValueNode,
    pressedRadius: ValueNode,
) => ({
    radius: radius("full"),
    squareRadius,
    pressedRadius,
    square: unitless(rest === "square" ? 1 : 0),
    toggles: unitless(0),
});

/** The `corner` and `toggle` variant groups that set `cornerMorphTokens`' flags; the resting
 *  corner's entry stays empty, since the tokens' defaults already name it. */
export const cornerMorphVariants = (rest: RestingCorner) => ({
    corner: {
        round:
            rest === "round"
                ? {}
                : { root: { tokens: { square: unitless(0) } } },
        square:
            rest === "square"
                ? {}
                : { root: { tokens: { square: unitless(1) } } },
    },
    toggle: {
        false: {},
        true: { root: { tokens: { toggles: unitless(1) } } },
    },
});

/** Shape changes that settle on the `role` spring, with the state colors: the corners
 *  (`borderRadius`), or a clip path's morph (`clipPath`). Under reduced motion the shape
 *  changes at once and the colors still fade. */
export const shapeTransition = (
    role: SpringRole,
    property: "borderRadius" | "clipPath" = "borderRadius",
) =>
    motionTransition(
        ...STATE_TWEENS,
        tween(property, { spring: spring(role) }),
    );

/** Corner changes on the `effectsDefault` spring, as Compose's buttons, icon buttons and split
 *  buttons morph their shape (an effects spring on purpose, so the corners never bounce). */
export const cornerTransition = shapeTransition("effectsDefault");

/** Corner changes on the `spatialFast` spring: Compose's chips (`shapeByInteraction` with
 *  `FastSpatial`) and the FAB menu's toggle (`ToggleFloatingActionButton`, `FastSpatial`). */
export const spatialCornerTransition = shapeTransition("spatialFast");

/** A component token per size for one of its measures, named `<prefix><Size>`
 *  (`heightSmall`), so a theme can retune each size. */
export const sizeTokens = <
    S extends string,
    M extends string,
    P extends string,
>(
    sizes: Record<S, Record<M, ValueNode>>,
    measure: M,
    prefix: P,
) =>
    Object.fromEntries(
        entriesOf(sizes).map(([name, s]) => [
            sizeTokenName(prefix, name),
            s[measure],
        ]),
    ) as Record<`${P}${Capitalize<S>}`, ValueNode>;

/** The token `sizeTokens` names for a size's measure. */
export const sizeTokenName = <P extends string, S extends string>(
    prefix: P,
    size: S,
) => `${prefix}${capitalize(size)}` as `${P}${Capitalize<S>}`;
