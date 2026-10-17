// What a part carries besides its machine's props: its `data-pf-*` state attributes, its classes
// from the registry, and the slot-keyed props of ready-made components.

import type {
    ComponentAnatomy,
    PartName,
    TestIdOverride,
} from "@pureform/anatomy";
import { partAttributes } from "@pureform/anatomy";
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

/** The error for a compound part rendered outside its Root: `outsideRootMessage("Button",
 *  "Label")`. `root` names the part that provides it, when that isn't Root (a radio group's
 *  `Item`). */
export const outsideRootMessage = (
    component: string,
    part: string,
    root = "Root",
): string =>
    `pureform: <${component}.${part}> must be inside <${component}.${root}>, which shares the machine and classes with its parts.`;

type Dict = Readonly<Record<string, unknown>>;

const NOT_SPREAD = new Set(["children", "ref"]);

/** A part's user props without `children` and `ref`, which the binding places itself. */
export const spreadableProps = (
    props: object | undefined,
): Dict | undefined => {
    if (!props) return undefined;
    const source = props as Dict;
    const picked: Record<string, unknown> = {};
    for (const key of Object.keys(source)) {
        if (!NOT_SPREAD.has(key)) picked[key] = source[key];
    }
    return picked;
};

/** What one part merges, besides the binding's rules for joining them. */
export interface PartSourcesInput<A extends ComponentAnatomy> {
    readonly anatomy: A;
    readonly part: PartName<A>;
    /** The machine's props for the part (`api.getRootProps()`). */
    readonly machine?: object | undefined;
    /** The states the part marks with `data-pf-*` attributes. */
    readonly states?: PartStates | undefined;
    /** Root's `testId`. */
    readonly testId?: TestIdOverride<PartName<A>> | undefined;
    /** Root's `unstyled`, for every part or some. */
    readonly unstyled?: Unstyled<PartName<A>> | undefined;
    /** The part's own `unstyled`. */
    readonly partUnstyled?: boolean | undefined;
    /** Every slot's classes, from the registry. */
    readonly classes?: Readonly<Record<string, SlotClasses>> | undefined;
    /** The provider's `slotProps`, by component and slot. */
    readonly slotProps?: object | undefined;
    /** The user's props for the part; `children` and `ref` are left out. */
    readonly props?: object | undefined;
}

/** A part's props sources, in the order they merge: the machine's part props, the anatomy's
 *  `data-scope`/`data-pf-part`/`data-testid`, the `data-pf-*` state attributes, the registry's
 *  class and token style (unless unstyled), the provider's `slotProps` for the part, and the
 *  user's props. Pass them to `combineProps` with the binding's rules. */
export const partSources = <A extends ComponentAnatomy>(
    input: PartSourcesInput<A>,
): readonly (Dict | undefined)[] => {
    const { anatomy, part } = input;
    const unstyled =
        isUnstyled(input.unstyled, part) || input.partUnstyled === true;
    const provided = (
        input.slotProps as
            | Readonly<
                  Record<
                      string,
                      Readonly<Record<string, Dict | undefined>> | undefined
                  >
              >
            | undefined
    )?.[anatomy.name]?.[part];
    return [
        input.machine as Dict | undefined,
        partAttributes(anatomy, part, input.testId) as unknown as Dict,
        stateAttributes(input.states) as Dict,
        partClasses(anatomy, part, input.classes, unstyled) as Dict | undefined,
        provided,
        spreadableProps(input.props),
    ];
};
