// Condition lowering and the conditional-value object compiler.
//
// A `ConditionalNode` in a value slot compiles to a conditional value object (`{ base, key:
// value }`) rather than a flat string. Each key is a selector or an at-rule, or the target's
// own key where it has one (Panda's `_dark`, a named breakpoint), through the context's hooks.

import { getByPath, tokenValue } from "@pureform/core";
import type {
    Condition,
    ConditionalNode,
    SlotCondition,
    SlotState,
    NumericScalarNode,
    ValueNode,
} from "@pureform/core/ast";
import {
    STATE_ATTRIBUTES,
    REDUCED_MOTION_QUERY,
} from "@pureform/web-contracts";

import { compileNodeToCSS } from "./compile-node";
import type { LowerCtx } from "./context";
import { aliasTarget } from "./css";

// Interaction, form, and direction conditions as selectors. Each state matches a native
// pseudo-class first, then an ARIA attribute, and only where neither covers it a `data-pf-*`
// attribute the bindings set. A behavior library's own attributes (`data-state`, `data-hover`)
// are never matched, so swapping it can't change styling.
const { hover, pressed, dragged, filled, mirrored, overflowing, descending } =
    STATE_ATTRIBUTES;

// A text input holding a value, or an element containing one. CSS sees a value through
// `:placeholder-shown`, so the input needs a placeholder (a single space works when none
// should show).
const HAS_VALUE =
    ":is(input, textarea):not(:placeholder-shown), :has(:is(input, textarea):not(:placeholder-shown))";

// aria-pressed marks a toggle button (a filter chip) and aria-current the current page in
// navigation, so selected matches both, as the selected slot state does.
const SELECTED =
    "[aria-selected=true], [aria-pressed=true], [aria-current]:not([aria-current=false])";

const CONDITION_SELECTOR: Record<string, string> = {
    hover: `&:is(:hover, [${hover}])`,
    focus: "&:focus",
    focusVisible: "&:focus-visible",
    active: `&:is(:active, [${pressed}])`,
    pressed: `&:is(:active, [${pressed}])`,
    // Repeating the attribute raises specificity above hover, focus, and pressed, so the drag
    // tint wins wherever the rules are ordered; the pointer is over the element while dragging.
    dragged: `&[${dragged}][${dragged}]`,
    disabled: "&:is(:disabled, [aria-disabled=true])",
    selected: `&:is(${SELECTED})`,
    checked: "&:is(:checked, [aria-checked=true])",
    invalid: "&:is(:invalid, [aria-invalid=true])",
    readOnly: "&:is(:read-only, [aria-readonly=true])",
    // A value that isn't in a text input, such as a select's, is marked by the binding.
    filled: `&:is(${HAS_VALUE}, [${filled}])`,
    // A control whose popup is open.
    expanded: "&[aria-expanded=true]",
    // An element pointing the way a sort runs, descending; only pureform marks it.
    descending: `&[${descending}]`,
    // An element that flips under rtl, such as an icon that points; only pureform marks it.
    mirrored: `&[${mirrored}]`,
    // A part that doesn't fit where it usually sits; only pureform marks it.
    overflowing: `&[${overflowing}]`,
    ltr: "&:where(:dir(ltr))",
    rtl: "&:where(:dir(rtl))",
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
    reducedMotion: `@media ${REDUCED_MOTION_QUERY}`,
    clipShape: "@supports (clip-path: shape(from 0 0, line to 0 0))",
    cornerShape: "@supports (corner-shape: squircle)",
};

// What each slot state matches on the slot's element, and how many times its selector repeats.
// Repeating raises specificity, so a later state wins wherever the rules are ordered: hover,
// filled, selected, checked, expanded, and descending, then indeterminate and focus, then pressed, then
// invalid, then disabled. Selected combines with the later states through an AND case rather
// than outranking them. The matches follow the conditions above: native, then ARIA, then
// `data-pf-*`, each on the slot or, for a state of a control inside it, through `:has()`.
const SLOT_STATE: Record<SlotState, { match: string; rank: number }> = {
    hover: { match: `:hover, [${hover}]`, rank: 1 },
    filled: { match: `${HAS_VALUE}, [${filled}]`, rank: 1 },
    selected: { match: SELECTED, rank: 1 },
    checked: {
        match: ":checked, :has(:checked), [aria-checked=true]",
        rank: 1,
    },
    expanded: {
        match: "[aria-expanded=true], :has([aria-expanded=true])",
        rank: 1,
    },
    descending: { match: `[${descending}]`, rank: 1 },
    // Above checked, so a box that is both shows the dash.
    indeterminate: {
        match: ":indeterminate, :has(:indeterminate), [aria-checked=mixed]",
        rank: 2,
    },
    focusWithin: { match: ":focus-within", rank: 2 },
    focusVisibleWithin: {
        match: ":focus-visible, :has(:focus-visible)",
        rank: 2,
    },
    pressed: { match: `:active, [${pressed}]`, rank: 3 },
    invalid: {
        match: "[aria-invalid=true], :has([aria-invalid=true])",
        rank: 4,
    },
    disabled: {
        match: ":disabled, :has(:disabled), [aria-disabled=true]",
        rank: 5,
    },
};

// The selector for a slot state: on the styled slot itself, or on an ancestor slot's class.
// Inside a descendant's `:has()`, a state's own `:has()` alternatives are left out, since `:has()`
// can't nest: the descendant then matches on its own element alone.
const stateSelector = (conditions: SlotCondition[], nested = false): string =>
    conditions
        .map(({ state }) => {
            const { match, rank } = SLOT_STATE[state];
            const own = nested
                ? match
                      .split(/,\s*(?![^(]*\))/)
                      .filter((alternative) => !alternative.startsWith(":has("))
                      .join(", ")
                : match;
            return `:is(${own})`.repeat(rank);
        })
        .join("");

// Slot states as one selector. States of one slot join on that slot's element, and the
// ancestor slots chain outermost first, ending at the styled slot (`&`) with its own states.
// Nesting them instead would demand a separate element per state, in the wrong order. A
// descendant's states follow as `:has()` along the structure's path from the styled slot, child
// by child, so a slot only follows the descendant the structure places in it (not one in a
// nested component of the same kind).
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
    const classOf = (slot: string) => `.${prefix}${className}__${slot}`;
    // A slot's path down from the styled slot, when it's a descendant: its ancestors up to the
    // styled slot, outermost first, then itself.
    const pathFrom = (slot: string): string[] | undefined => {
        const chain = ctx.slotAncestors?.get(slot) ?? [];
        const at = chain.indexOf(name);
        if (at < 0) return undefined;
        return [...chain.slice(0, at).reverse(), slot];
    };
    const others = [...bySlot.keys()].filter((slot) => slot !== name);
    const descendants = others.flatMap((slot) => {
        const path = pathFrom(slot);
        return path ? [[slot, path] as const] : [];
    });
    const outer = others
        .filter((slot) => !descendants.some(([inner]) => inner === slot))
        .sort((a, b) => ancestors.indexOf(b) - ancestors.indexOf(a))
        .map(
            (slot) =>
                `${classOf(slot)}${stateSelector(bySlot.get(slot) ?? [])}`,
        );
    const inner = descendants
        .map(
            ([slot, path]) =>
                `:has(> ${path
                    .map(
                        (step) =>
                            `${classOf(step)}${step === slot ? stateSelector(bySlot.get(slot) ?? [], true) : ""}`,
                    )
                    .join(" > ")})`,
        )
        .join("");
    return [...outer, `&${stateSelector(bySlot.get(name) ?? [])}${inner}`].join(
        " ",
    );
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
