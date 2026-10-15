// Pick a component's styles for its variants and state.
//
// Layers order the entries as the CSS adapter's cascade layers do (base, variants, compound
// variants), and within a layer a rule's specificity and then its order decide, as selectors
// do. Inherited properties then pass from each slot to its children, which CSS does and React
// Native doesn't outside nested text.

import type { ComponentStyles } from "./lower";
import { compositeOver, formatColor, parseColor } from "./rgba";
import { TINT } from "./values";
import type { Value } from "./values";

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

// Turn what CSS reads differently into React Native's terms: `none` line styles (no line),
// a tint layered over the background, a line height relative to the font size, and no shadow.
const settle = (style: Style): Style => {
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
    for (const [line, width] of [
        ["outlineStyle", "outlineWidth"],
        ["borderStyle", "borderWidth"],
    ] as const) {
        if (style[line] === "none") {
            delete style[line];
            style[width] = 0;
        }
    }
    return style;
};

/** A component's style per slot (or its one style, without slots) for variants and state. */
export const select = (
    component: ComponentStyles<Value>,
    variants: Record<string, string | boolean | undefined> = {},
    state: State = {},
): Record<string, Style> => {
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
                if (rule.when.every((s) => active.has(s))) list.push(rule);
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
    for (const style of Object.values(styles)) settle(style);
    return styles;
};
