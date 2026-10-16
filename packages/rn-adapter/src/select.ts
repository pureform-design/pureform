// Pick a component's styles for its variants and state.
//
// Layers order the entries as the CSS adapter's cascade layers do (base, variants, compound
// variants), and within a layer a rule's specificity and then its order decide, as selectors
// do. Inherited properties then pass from each slot to its children, which CSS does and React
// Native doesn't outside nested text.

import { dropShadows } from "./geometry";
import type { ComponentStyles } from "./lower";
import { compositeOver, formatColor, parseColor } from "./rgba";
import {
    ANIMATION,
    DROP_SHADOW,
    SHAPE,
    TINT,
    TRANSITION,
    isPercentOffset,
} from "./values";
import type {
    Animation,
    GradientValue,
    ShapeValue,
    Transition,
    Value,
} from "./values";

/** A component's state. Pressable reports the interaction states, props the rest. */
export interface State {
    hover?: boolean;
    focus?: boolean;
    focusVisible?: boolean;
    pressed?: boolean;
    active?: boolean;
    dragged?: boolean;
    disabled?: boolean;
    selected?: boolean;
    checked?: boolean;
    indeterminate?: boolean;
    invalid?: boolean;
    readOnly?: boolean;
    filled?: boolean;
    expanded?: boolean;
    reducedMotion?: boolean;
    rtl?: boolean;
    /** The color scheme, for styles that switch on it rather than through tokens. */
    scheme?: "light" | "dark";
    /** The window's width, for viewport conditions. Without it, none of them hold. */
    width?: number;
    /** Whether the app draws with SVG, for shapes and gradients. Without it, components take
     *  their rounded fallback and gradients drop. */
    svg?: boolean;
}

/** What a slot draws with SVG, under its content: its fill color clipped to its shape, where
 *  it has one, and a gradient over it. */
export interface Drawing {
    shape?: ShapeValue;
    /** The fill under the gradient, moved off the view's background to follow the shape. */
    fill?: string;
    gradient?: GradientValue;
}

export type Style = Record<string, Value>;

/** Properties CSS passes from an element to its children. */
const INHERITED = [
    "color",
    "fontFamily",
    "fontSize",
    "fontStyle",
    "fontWeight",
    "letterSpacing",
    "lineHeight",
    "textAlign",
    "textTransform",
];

const activeStates = (state: State): Set<string> => {
    const active = new Set<string>();
    for (const [name, on] of Object.entries(state)) {
        if (on === true) active.add(name);
    }
    if (state.scheme) active.add(state.scheme);
    if (state.rtl !== undefined) active.add(state.rtl ? "rtl" : "ltr");
    return active;
};

const WIDTH = /^width(>=|<=|<)(-?[\d.]+)$/;

// Whether a state holds: one of the component's, or a bound on the window's width.
const holds = (
    name: string,
    active: Set<string>,
    width: number | undefined,
) => {
    const bound = WIDTH.exec(name);
    if (!bound) return active.has(name);
    if (width === undefined) return false;
    const n = Number(bound[2]);
    return bound[1] === ">="
        ? width >= n
        : bound[1] === "<="
          ? width <= n
          : width < n;
};

const INSET_MARGIN: Record<string, string> = {
    top: "marginTop",
    bottom: "marginBottom",
    left: "marginLeft",
    right: "marginRight",
    start: "marginStart",
    end: "marginEnd",
};

// Turn what CSS reads differently into React Native's terms: `none` line styles (no line),
// a tint layered over the background, a line height relative to the font size, no shadow,
// a flex box's direction, and an outline over its neighbors.
const settle = (style: Style, svg: boolean): Style => {
    // A drop shadow follows what's drawn. With SVG drawing the shapes, that's a filter, which
    // React Native draws on Android and the web; without, the box is what's drawn.
    const drop = style[DROP_SHADOW];
    delete style[DROP_SHADOW];
    if (typeof drop === "string" && drop !== "none") {
        if (svg) style.filter = dropShadows(drop);
        else {
            const own = style.boxShadow;
            style.boxShadow =
                typeof own === "string" && own !== "none"
                    ? `${own}, ${drop}`
                    : drop;
        }
    }
    const tint = style[TINT];
    if (typeof tint === "string") {
        const below = style.backgroundColor;
        style.backgroundColor = formatColor(
            compositeOver(
                parseColor(tint),
                parseColor(typeof below === "string" ? below : "transparent"),
            ),
        );
    }
    delete style[TINT];
    const { lineHeight, fontSize } = style;
    if (typeof lineHeight === "string" && lineHeight.endsWith("x")) {
        if (typeof fontSize === "number") {
            style.lineHeight = Number.parseFloat(lineHeight) * fontSize;
        } else {
            delete style.lineHeight;
        }
    }
    if (style.boxShadow === "none") delete style.boxShadow;
    // A percentage plus pixels: on an inset, the pixels go to its margin, which Yoga adds to an
    // absolute position. Elsewhere React Native has no sum for it, and the percentage stays.
    for (const [property, value] of Object.entries(style)) {
        if (!isPercentOffset(value)) continue;
        style[property] = `${value.percent}%`;
        const margin = INSET_MARGIN[property];
        if (margin) {
            const own = style[margin];
            style[margin] = (typeof own === "number" ? own : 0) + value.offset;
        }
    }
    // A CSS flex box runs in a row unless told otherwise, and React Native's in a column.
    // Only a slot that asks for flex gets the row: CSS stacks a block's children, as React
    // Native's column does.
    if (style.display === "flex" && style.flexDirection === undefined) {
        style.flexDirection = "row";
    }
    for (const [line, width] of [
        ["outlineStyle", "outlineWidth"],
        ["borderStyle", "borderWidth"],
    ] as const) {
        if (style[line] === "none") {
            delete style[line];
            style[width] = 0;
        }
    }
    // A solid outline of no width, not none: React Native has no none, and an outline left
    // unset lets a browser draw its own focus ring, which ignores the width.
    if (style.outlineWidth === 0 && style.outlineStyle === undefined) {
        style.outlineStyle = "solid";
    }
    // CSS paints outlines over everything beside them, and React Native Web layers each view
    // over the ones before it, which would cover a focus ring's far side.
    if (
        style.outlineStyle !== undefined &&
        typeof style.outlineWidth === "number" &&
        style.outlineWidth > 0 &&
        style.zIndex === undefined
    ) {
        style.zIndex = 1;
    }
    return style;
};

/** A component's styles per slot for variants and state, and each slot's transitions. */
export interface Selected {
    styles: Record<string, Style>;
    transitions: Record<string, Transition[]>;
    /** Each slot's keyframe animation, where it has one. */
    animations: Record<string, Animation>;
    /** Each slot's parent slot, where it has one. */
    parents: Record<string, string>;
    /** What each slot draws with SVG, where it draws anything. Only with the `svg` state. */
    drawings: Record<string, Drawing>;
}

/** A component's style per slot (or its one style under `""`, without slots) for variants and
 *  state. */
export const select = (
    component: ComponentStyles<Value>,
    variants: Record<string, string | boolean | undefined> = {},
    state: State = {},
): Record<string, Style> =>
    selectWithTransitions(component, variants, state).styles;

/** As `select`, with each slot's transitions beside its style. */
export const selectWithTransitions = (
    component: ComponentStyles<Value>,
    variants: Record<string, string | boolean | undefined> = {},
    state: State = {},
): Selected => {
    const chosen: Record<string, string> = { ...component.defaultVariants };
    for (const [group, value] of Object.entries(variants)) {
        if (value !== undefined) chosen[group] = String(value);
    }
    const active = activeStates(state);
    const styles: Record<string, Style> = {};
    for (const layer of [0, 1, 2] as const) {
        const bySlot = new Map<
            string,
            { specificity: number; style: Style }[]
        >();
        for (const entry of component.entries) {
            if (entry.layer !== layer) continue;
            if (!Object.entries(entry.match).every(([g, v]) => chosen[g] === v))
                continue;
            const list = bySlot.get(entry.slot) ?? [];
            for (const rule of entry.rules) {
                if (rule.when.every((s) => holds(s, active, state.width)))
                    list.push(rule);
            }
            bySlot.set(entry.slot, list);
        }
        for (const [slot, list] of bySlot) {
            // A stable sort keeps the order among rules of equal specificity.
            list.sort((a, b) => a.specificity - b.specificity);
            styles[slot] = Object.assign(
                styles[slot] ?? {},
                ...list.map((r) => r.style),
            );
        }
    }
    for (const slot of component.slots ?? [""]) styles[slot] ??= {};
    // Parents before children: walk the structure from the slots no one contains.
    const structure = component.structure ?? {};
    const children = new Set(Object.values(structure).flat());
    const visit = (slot: string) => {
        for (const child of structure[slot] ?? []) {
            const own = styles[child]!;
            // A CSS flex item shrinks to fit unless told otherwise, and React Native's doesn't.
            if (
                styles[slot]!.display === "flex" &&
                own.flexShrink === undefined &&
                own.flex === undefined
            ) {
                own.flexShrink = 1;
            }
            for (const property of INHERITED) {
                if (
                    own[property] === undefined &&
                    styles[slot]![property] !== undefined
                ) {
                    own[property] = styles[slot]![property]!;
                }
            }
            visit(child);
        }
    };
    for (const slot of Object.keys(styles))
        if (!children.has(slot)) visit(slot);
    const transitions: Record<string, Transition[]> = {};
    const animations: Record<string, Animation> = {};
    const drawings: Record<string, Drawing> = {};
    for (const [slot, style] of Object.entries(styles)) {
        const own = style[TRANSITION];
        delete style[TRANSITION];
        const animation = style[ANIMATION];
        delete style[ANIMATION];
        if (
            typeof animation === "object" &&
            animation !== null &&
            !Array.isArray(animation)
        ) {
            animations[slot] = animation as unknown as Animation;
        }
        transitions[slot] = Array.isArray(own)
            ? (own as unknown as Transition[])
            : [];
        const shape = style[SHAPE] as ShapeValue | undefined;
        delete style[SHAPE];
        const tint = style[TINT];
        const gradient =
            typeof tint === "object" && tint !== null && "stops" in tint
                ? (tint as unknown as GradientValue)
                : undefined;
        if (gradient) delete style[TINT];
        settle(style, state.svg === true);
        if (state.svg && (shape || gradient)) {
            const drawing: Drawing = {};
            if (shape) {
                drawing.shape = shape;
                const fill = style.backgroundColor;
                if (typeof fill === "string") drawing.fill = fill;
                delete style.backgroundColor;
                // CSS clips a box shadow away with the box.
                delete style.boxShadow;
            }
            if (gradient) drawing.gradient = gradient;
            drawings[slot] = drawing;
        }
    }
    const parents: Record<string, string> = {};
    for (const [parent, children] of Object.entries(
        component.structure ?? {},
    )) {
        for (const child of children) parents[child] = parent;
    }
    return { styles, transitions, animations, parents, drawings };
};
