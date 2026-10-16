// What a part carries besides its machine's props: its `data-pf-*` state attributes, its classes
// from the registry, and the slot-keyed props of ready-made components.

import type { ComponentAnatomy, PartName } from "@pureform/anatomy";
import type { AttributeState, StateAttribute } from "@pureform/core";
import { STATE_ATTRIBUTES } from "@pureform/core";
import type { SlotClasses } from "@pureform/styling";

/** The states a part marks with `data-pf-*` attributes: `{ pressed: api.pressed }`. Every other
 *  state comes from the native element or ARIA, which the machine's props set. */
export type PartStates = {
    readonly [S in AttributeState]?: boolean | undefined;
};

/** The `data-pf-*` attributes for some states: `""` when on, `undefined` (no attribute) when off. */
export type StateAttributes = {
    readonly [A in StateAttribute]?: "" | undefined;
};

/** The `data-pf-*` attributes for the states given. A state left out gets no key, so a part sets
 *  only the attributes it owns. */
export const stateAttributes = (
    states: PartStates | undefined,
): StateAttributes => {
    const attributes: Partial<Record<StateAttribute, "" | undefined>> = {};
    if (!states) return attributes;
    for (const state in states) {
        const name = STATE_ATTRIBUTES[state as AttributeState];
        if (name) {
            attributes[name] = states[state as AttributeState] ? "" : undefined;
        }
    }
    return attributes;
};

/** A value per slot, as ready-made components take `class`, `style`, and `slotProps`:
 *  `{ root: "wide", label: "caps" }`. */
export type SlotKeyed<P extends string, V> = { readonly [K in P]?: V };

/** One slot's value from a slot-keyed prop. */
export const forSlot = <P extends string, V>(
    value: SlotKeyed<P, V> | undefined,
    slot: NoInfer<P>,
): V | undefined => value?.[slot];

/** What `unstyled` takes: `true` for every part, or per part. */
export type Unstyled<P extends string = string> =
    | boolean
    | SlotKeyed<P, boolean>;

/** Whether `unstyled` opts this part out of the registry's styles. */
export const isUnstyled = (
    unstyled: Unstyled | undefined,
    part: string,
): boolean =>
    typeof unstyled === "object" ? unstyled[part] === true : unstyled === true;

/** A part's classes and token style from the registry, or `undefined` when it has none: an
 *  unstyled part, or an extra part outside the AST's slots (a select's hidden `<select>`). */
export const partClasses = <A extends ComponentAnatomy>(
    anatomy: A,
    part: PartName<A>,
    slots: Readonly<Record<string, SlotClasses>> | undefined,
    unstyled?: boolean,
): SlotClasses | undefined => {
    if (unstyled || !slots) return undefined;
    const spec = (anatomy.parts as ComponentAnatomy["parts"])[part];
    if (!spec?.styled) return undefined;
    return slots[part];
};

/** Whether a part is an icon slot: one that takes `mirror` and provides `useIconStyle()`. */
export const isIconPart = <A extends ComponentAnatomy>(
    anatomy: A,
    part: PartName<A>,
): boolean =>
    (anatomy.parts as ComponentAnatomy["parts"])[part]?.mirror === true;
