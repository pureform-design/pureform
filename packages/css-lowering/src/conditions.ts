// Condition lowering and the conditional-value object compiler.
//
// A `ConditionalNode` in a value slot compiles to a conditional value object (`{ base, key:
// value }`) rather than a flat string. Each key is a selector or an at-rule, or the target's
// own key where it has one (Panda's `_hover`, a named breakpoint), through the context's hooks.

import { getByPath, tokenValue } from "@pureform/core";
import type {
    Condition,
    ConditionalNode,
    SlotCondition,
    SlotState,
    NumericScalarNode,
    ValueNode,
} from "@pureform/core/ast";

import { compileNodeToCSS } from "./compile-node";
import type { LowerCtx } from "./context";
import { aliasTarget } from "./css";

// Interaction, form, and direction conditions as selectors. The ones a target commonly builds in
// (hover, focus, disabled) match Panda's built-ins, so either adapter styles the same elements.
const CONDITION_SELECTOR: Record<string, string> = {
    hover: "&:is(:hover, [data-hover])",
    focus: "&:is(:focus, [data-focus])",
    focusVisible: "&:is(:focus-visible, [data-focus-visible])",
    active: "&:is(:active, [data-active])",
    pressed: "&:is(:active, [data-active])",
    // Repeating the attribute raises specificity above hover, focus, and pressed, so the drag
    // tint wins wherever the rules are ordered; the pointer is over the element while dragging.
    dragged: "&[data-dragging][data-dragging]",
    disabled:
        "&:is(:disabled, [disabled], [data-disabled], [aria-disabled=true])",
    // aria-pressed marks a toggle button (a filter chip) and aria-current the current page in
    // navigation, so selected matches both, as the selected slot state does.
    selected:
        "&:is([aria-selected=true], [aria-pressed=true], [aria-current]:not([aria-current=false]), [data-selected])",
    checked:
        '&:is(:checked, [data-checked], [aria-checked=true], [data-state="checked"])',
    invalid: "&:is(:invalid, [data-invalid], [aria-invalid=true])",
    readOnly: "&:is(:read-only, [data-read-only], [aria-readonly=true])",
    // An input or textarea with a value, or an element containing one, or anything marked
    // `data-filled`. CSS sees a value through `:placeholder-shown`, so the input needs a
    // placeholder (a single space works when none should show).
    filled: "&:is(:is(input, textarea):not(:placeholder-shown), :has(:is(input, textarea):not(:placeholder-shown)), [data-filled])",
    // A control whose popup is open, or anything marked data-expanded.
    expanded: "&:is([aria-expanded=true], [data-expanded])",
    ltr: ":where([dir=ltr], :dir(ltr)) &",
    rtl: ":where([dir=rtl], :dir(rtl)) &",
};

// Media and feature conditions as at-rules.
const MEDIA_RULE: Record<string, string> = {
    moreContrast: "@media (prefers-contrast: more)",
    lessContrast: "@media (prefers-contrast: less)",
    print: "@media print",
    landscape: "@media (orientation: landscape)",
    portrait: "@media (orientation: portrait)",
    touch: "@media (pointer: coarse)",
    mouse: "@media (pointer: fine)",
    reducedMotion: "@media (prefers-reduced-motion: reduce)",
    clipShape: "@supports (clip-path: shape(from 0 0, line to 0 0))",
    cornerShape: "@supports (corner-shape: squircle)",
};

// What each slot state matches on the slot's element, and how many times its selector repeats.
// Repeating raises specificity, so a later state wins wherever the rules are ordered: hover,
// filled, selected, checked, and expanded, then indeterminate and focus, then pressed, then invalid, then disabled. Selected
// combines with the later states through an AND case rather than outranking them. Each also takes a data attribute, for custom
// controls and native-like bindings that set the state by hand.
const SLOT_STATE: Record<SlotState, { match: string; rank: number }> = {
    hover: { match: ":hover, [data-hover]", rank: 1 },
    filled: {
        match: ":is(input, textarea):not(:placeholder-shown), :has(:is(input, textarea):not(:placeholder-shown)), [data-filled]",
        rank: 1,
    },
    selected: {
        match: "[aria-selected=true], [aria-pressed=true], [aria-current]:not([aria-current=false]), [data-selected]",
        rank: 1,
    },
    checked: {
        match: ":checked, :has(:checked), [aria-checked=true], [data-checked]",
        rank: 1,
    },
    expanded: {
        match: "[aria-expanded=true], :has([aria-expanded=true]), [data-expanded]",
        rank: 1,
    },
    // Above checked, so a box that is both shows the dash.
    indeterminate: {
        match: ":indeterminate, :has(:indeterminate), [aria-checked=mixed], [data-indeterminate]",
        rank: 2,
    },
    focusWithin: { match: ":focus-within, [data-focused]", rank: 2 },
    focusVisibleWithin: {
        match: ":focus-visible, :has(:focus-visible), [data-focus-visible]",
        rank: 2,
    },
    pressed: { match: ":active, [data-pressed]", rank: 3 },
    invalid: {
        match: "[aria-invalid=true], :has([aria-invalid=true]), [data-invalid]",
        rank: 4,
    },
    disabled: { match: ":disabled, :has(:disabled), [data-disabled]", rank: 5 },
};

// The selector for a slot state: on the styled slot itself, or on an ancestor slot's class.
const stateSelector = (conditions: SlotCondition[]): string =>
    conditions
        .map(({ state }) => {
            const { match, rank } = SLOT_STATE[state];
            return `:is(${match})`.repeat(rank);
        })
        .join("");

// Slot states as one selector. States of one slot join on that slot's element, and the
// ancestor slots chain outermost first, ending at the styled slot (`&`) with its own states.
// Nesting them instead would demand a separate element per state, in the wrong order.
const slotSelector = (conditions: SlotCondition[], ctx: LowerCtx): string => {
    const [first] = conditions;
    if (!first) return "&";
    if (!ctx.slot) {
        throw new Error(
            `slot("${first.slot}", "${first.state}") is only valid inside a slotted component's recipe`,
        );
    }
    const { name, className, ancestors = [] } = ctx.slot;
    const bySlot = new Map<string, SlotCondition[]>();
    for (const condition of conditions) {
        bySlot.set(condition.slot, [
            ...(bySlot.get(condition.slot) ?? []),
            condition,
        ]);
    }
    const prefix = ctx.classPrefix ? `${ctx.classPrefix}-` : "";
    const outer = [...bySlot.keys()]
        .filter((slot) => slot !== name)
        .sort((a, b) => ancestors.indexOf(b) - ancestors.indexOf(a))
        .map(
            (slot) =>
                `.${prefix}${className}__${slot}${stateSelector(bySlot.get(slot) ?? [])}`,
        );
    return [...outer, `&${stateSelector(bySlot.get(name) ?? [])}`].join(" ");
};

// The keys for an AND-list of conditions, in nesting order: every slot condition in one key,
// and one key for each other condition.
const conditionKeys = (conditions: Condition[], ctx: LowerCtx): string[] => {
    const slots = conditions.filter(
        (c): c is SlotCondition => typeof c === "object" && c.type === "slot",
    );
    const keys: string[] = [];
    let placed = false;
    for (const condition of conditions) {
        if (typeof condition === "object" && condition.type === "slot") {
            if (!placed) keys.push(slotSelector(slots, ctx));
            placed = true;
        } else {
            keys.push(conditionKey(condition, ctx));
        }
    }
    return keys;
};

const sizeCss = (n: NumericScalarNode): string =>
    n.unit === "none" ? String(n.value) : `${n.value}${n.unit}`;

const breakpointCss = (name: string, ctx: LowerCtx): string => {
    const bp = ctx.config.breakpoints?.[name];
    if (!bp) throw new Error(`unknown breakpoint token: ${name}`);
    return sizeCss(bp);
};

// Exclusive upper bound: CSS has no `<` on width ranges in the common syntax, so subtract a
// hair, matching how tooling emits half-open bands.
const exclusive = (css: string): string => `calc(${css} - 0.02px)`;

const rangeRule = (
    at: "media" | "container",
    container: string | undefined,
    min: string | undefined,
    max: string | undefined,
): string => {
    const parts: string[] = [];
    if (min) parts.push(`(min-width: ${min})`);
    if (max) parts.push(`(max-width: ${max})`);
    const query = parts.join(" and ");
    if (at === "container") {
        return `@container ${container ? `${container} ` : ""}${query}`;
    }
    return `@media ${query}`;
};

/** The conditional-value key for one condition: the target's own key if it has one, else a
 *  selector or at-rule. */
export const conditionKey = (condition: Condition, ctx: LowerCtx): string => {
    if (typeof condition === "string") {
        return (
            ctx.conditionKey?.(condition) ??
            CONDITION_SELECTOR[condition] ??
            MEDIA_RULE[condition] ??
            condition
        );
    }
    switch (condition.type) {
        case "viewportBreakpoint":
            // A plain `from` takes the target's breakpoint key, if it names them.
            if (condition.from && !condition.until) {
                const key = ctx.breakpointKey?.(condition.from);
                if (key) return key;
            }
            return rangeRule(
                "media",
                undefined,
                condition.from ? breakpointCss(condition.from, ctx) : undefined,
                condition.until
                    ? exclusive(breakpointCss(condition.until, ctx))
                    : undefined,
            );
        case "viewportSize":
            return rangeRule(
                "media",
                undefined,
                condition.min ? sizeCss(condition.min) : undefined,
                condition.max ? sizeCss(condition.max) : undefined,
            );
        case "containerBreakpoint":
            return rangeRule(
                "container",
                condition.container,
                condition.from ? breakpointCss(condition.from, ctx) : undefined,
                condition.until
                    ? exclusive(breakpointCss(condition.until, ctx))
                    : undefined,
            );
        case "containerSize":
            return rangeRule(
                "container",
                condition.container,
                condition.min ? sizeCss(condition.min) : undefined,
                condition.max ? sizeCss(condition.max) : undefined,
            );
        case "rawCondition":
            return condition.by[ctx.target] ?? "";
        case "slot":
            return slotSelector([condition], ctx);
    }
};

export type CondObject = { [key: string]: string | CondObject };

const assignNested = (
    target: CondObject,
    keys: string[],
    value: string | CondObject,
): void => {
    const [head, ...tail] = keys;
    if (head === undefined) return;
    const existing = target[head];
    if (tail.length === 0) {
        // A case that shares a key with a longer one becomes the nested object's base.
        if (typeof existing === "object" && typeof value === "string") {
            existing.base = value;
        } else {
            target[head] = value;
        }
        return;
    }
    // A shorter case already holding this key keeps its value as the base.
    const next: CondObject =
        typeof existing === "string" ? { base: existing } : (existing ?? {});
    target[head] = next;
    assignNested(next, tail, value);
};

/** Compile a `ConditionalNode` to a conditional value object. AND-lists nest their
 *  keys; several cases merge into one object. */
export const compileConditional = (
    node: ConditionalNode,
    ctx: LowerCtx,
): CondObject => {
    const out: CondObject = { base: compileValue(node.base, ctx) };
    for (const c of node.cases) {
        const conds = Array.isArray(c.on) ? c.on : [c.on];
        assignNested(
            out,
            conditionKeys(conds, ctx),
            compileValue(c.value, ctx),
        );
    }
    return out;
};

/** Compile a value that may be conditional: a `ConditionalNode` becomes a conditional object,
 *  everything else a flat CSS string. An alias to a conditional token is followed first. */
export const compileValue = (
    node: ValueNode,
    ctx: LowerCtx,
): string | CondObject => {
    if (node.type === "conditional") return compileConditional(node, ctx);
    // A token tier emits its own conditional values, so an alias into one stays a token ref.
    // Anything else that resolves to a conditional (a component token) is unfolded in place.
    if (node.type === "alias" && aliasTarget(node.path).kind !== "token") {
        const resolved = tokenValue(
            getByPath(ctx.config, node.path),
        ) as ValueNode;
        if (resolved.type === "conditional") {
            return compileConditional(resolved, ctx);
        }
    }
    return compileNodeToCSS(node, ctx);
};
