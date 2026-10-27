// Portable part states, keyed values, and shared customization helpers.

import type { ComponentAnatomy, PartName } from "@pureform/anatomy";
import type {
    FormCondition,
    InteractionCondition,
    MarkCondition,
} from "@pureform/core/ast";

/** Explicit part states supplied by a binding, rather than inferred from its native control. */
export type PartStates = {
    readonly [
        S in Extract<
            InteractionCondition | FormCondition | MarkCondition,
            | "hover"
            | "pressed"
            | "dragged"
            | "filled"
            | "mirrored"
            | "overflowing"
            | "descending"
        >
    ]?: boolean | undefined;
};

/** A value per slot, as ready-made components take `class`, `style`, and `slotProps`:
 *  `{ root: "wide", label: "caps" }`. */
export type SlotKeyed<P extends string, V> = { readonly [K in P]?: V };

/** One slot's value from a slot-keyed prop. */
export const forSlot = <P extends string, V>(
    value: SlotKeyed<P, V> | undefined,
    slot: NoInfer<P>,
): V | undefined => value?.[slot];

/** A repeated part's value (a calendar cell's, a table row's): one for every copy, or a function
 *  of the copy (its `instance`: index, state, data, as the component documents) returning it, or
 *  `undefined` for none. The function runs once per copy per render, only when one is passed. */
export type PerInstance<V, I> = V | ((instance: I) => V | undefined);

/** A ready-made's repeated parts, each to what it knows of one copy: `{ cell: CalendarCellInstance }`. */
export type PartInstances = { readonly [part: string]: unknown };

/** A slot-keyed value whose repeated parts (`I`'s keys) also take a function of the copy. */
export type SlotKeyedEach<P extends string, V, I = {}> = {
    readonly [K in P]?: K extends keyof I ? PerInstance<V, I[K]> : V;
};

/** A repeated part's value for one copy: the function's result, or the value itself. */
export const forInstance = <V, I>(
    value: PerInstance<V, I> | undefined,
    instance: I,
): V | undefined =>
    typeof value === "function"
        ? (value as (instance: I) => V | undefined)(instance)
        : value;

/** Whether any of a part's keyed values is a function of the copy, which `forInstance` resolves. */
export const isPerInstance = (
    keyed: readonly unknown[],
    part: string,
): boolean => {
    for (const value of keyed) {
        if (
            value &&
            typeof value === "object" &&
            typeof (value as Dict)[part] === "function"
        )
            return true;
    }
    return false;
};

/** What `unstyled` takes: `true` for every part, or per part (a repeated part's by copy, which
 *  Root ignores: the ready-made resolves it for each copy). */
export type Unstyled<P extends string = string, I = AnyInstances> =
    | boolean
    | SlotKeyedEach<P, boolean, I>;

/** Every part's copy unknown: what Root's `unstyled` takes, so a ready-made's passes through. */
type AnyInstances = { readonly [part: string]: never };

/** One part's entry of a per-part override (`testId`, `unstyled`) as a separate component's
 *  `root`: a Root that also renders another component's root (a dialog's backdrop, drawn by the
 *  scrim) names it `part`. A value for every part passes through. */
export const partAsRoot = <V extends string | boolean>(
    value: V | SlotKeyed<string, unknown> | undefined,
    part: string,
): V | { readonly root: V } | undefined =>
    typeof value !== "object"
        ? value
        : value[part] === undefined
          ? undefined
          : { root: value[part] as V };

/** Whether `unstyled` opts this part out of the registry's styles. */
export const isUnstyled = (
    unstyled: Unstyled | undefined,
    part: string,
): boolean =>
    typeof unstyled === "object" ? unstyled[part] === true : unstyled === true;

/** Whether a part is an icon slot: one that takes `mirror` and provides `useIconStyle()`. */
export const isIconPart = <A extends ComponentAnatomy>(
    anatomy: A,
    part: PartName<A>,
): boolean =>
    (anatomy.parts as ComponentAnatomy["parts"])[part]?.mirror === true;

type Dict = Readonly<Record<string, unknown>>;

/** What a ready-made accepts to customize a component it draws (a list's list items, a group's
 *  buttons): the inner component's own per-part props, tokens and test ids, every one optional.
 *  `C` is the binding's customize props for that component (React's `className`, `style`,
 *  `slotProps`, `unstyled`, `testId`, `tokens`; Solid's `class` for `className`; React Native's
 *  keyed `style`, `slotProps`, `testId`, `tokens`). Variants aren't included: the outer component
 *  passes its own. */
export type InnerProps<C extends object> = { readonly [K in keyof C]?: C[K] };

const isEmpty = (value: object | null | undefined): boolean => {
    if (!value) return true;
    for (const key in value) {
        if ((value as Dict)[key] !== undefined) return false;
    }
    return true;
};

const isRecord = (value: unknown): value is Dict =>
    typeof value === "object" && value !== null && !Array.isArray(value);

/** Two keyed values merged part by part with `part`, either one as-is when the other is unset. */
export const mergeKeyedDefaults = (
    defaults: unknown,
    own: unknown,
    part: (defaults: unknown, own: unknown) => unknown,
): unknown => {
    if (defaults === undefined) return own;
    if (own === undefined) return defaults;
    if (!isRecord(defaults) || !isRecord(own)) return own;
    const merged: Record<string, unknown> = { ...defaults };
    for (const key of Object.keys(own)) {
        const base = merged[key];
        const value = own[key];
        merged[key] =
            base === undefined
                ? value
                : typeof base === "function" || typeof value === "function"
                  ? // A repeated part's values by copy: both resolved for each copy, then merged.
                    (instance: unknown) =>
                        part(
                            forInstance(base, instance),
                            forInstance(value, instance),
                        )
                  : part(base, value);
    }
    return merged;
};

/** Two records merged shallowly, own keys (even `undefined` ones) over defaults; anything else is
 *  `own` as-is. */
export const mergeShallowDefaults = (
    defaults: unknown,
    own: unknown,
): unknown =>
    isRecord(defaults) && isRecord(own) ? { ...defaults, ...own } : own;

/** A binding's merge for a key both sides set (a class, a keyed style): `defaults` and `own` are
 *  both defined. Returns the merged value; `own` alone to let the child's value win. */
export type DefaultsMergePolicy = (
    key: string,
    defaults: unknown,
    own: unknown,
) => unknown;

/** A child's own props over its container's defaults for it (a list item's over the list's
 *  `listItemProps`): the child's own win, own keys left `undefined` are skipped, and `tokens`
 *  merge shallowly. A key both sides set merges with the binding's `merge` (classes, styles and
 *  slot props are platform-specific). Returns `own` or `defaults` as-is when the other is empty,
 *  so a child with nothing of its own gets the defaults object itself. */
export const overDefaults = <P extends object>(
    defaults: P | undefined,
    own: P,
    merge: DefaultsMergePolicy,
): P => {
    if (isEmpty(defaults)) return own;
    if (isEmpty(own)) return defaults as P;
    const merged: Record<string, unknown> = { ...(defaults as Dict) };
    for (const key of Object.keys(own)) {
        const value = (own as Dict)[key];
        if (value === undefined) continue;
        const base = merged[key];
        merged[key] =
            base === undefined
                ? value
                : key === "tokens"
                  ? mergeShallowDefaults(base, value)
                  : merge(key, base, value);
    }
    return merged as P;
};

/** A repeated part's copy drawn from a ready-made's data (a step, a tab, a slide): its 0-based
 *  `index` and the user's `item`. */
export interface ItemInstance<T> {
    readonly index: number;
    readonly item: T;
}
