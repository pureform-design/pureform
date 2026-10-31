// Web part attributes and prop-source assembly, in merge order.
import type {
    ComponentAnatomy,
    PartName,
    TestIdOverride,
} from "@pureform/anatomy";
import { partSlot } from "@pureform/anatomy";
import type { PartStates, Unstyled } from "@pureform/binding-core";
import { isUnstyled, ownedKeysMessage } from "@pureform/binding-core";
import type { SlotClasses } from "@pureform/styling-web";
import type { AttributeState, StateAttribute } from "@pureform/web-contracts";
import { STATE_ATTRIBUTES } from "@pureform/web-contracts";

import { partAttributes } from "./anatomy";
import { splitMachine, withoutOwned } from "./owned";

type Dict = Readonly<Record<string, unknown>>;

/** A part's classes and token style from the registry, by the slot that draws it (a menu's
 *  `content` is drawn by its `root` slot), or `undefined` when it has none: an unstyled part, or an
 *  extra part outside the AST's slots (a select's hidden `<select>`). */
export const partClasses = <A extends ComponentAnatomy>(
    anatomy: A,
    part: PartName<A>,
    slots: Readonly<Record<string, SlotClasses>> | undefined,
    unstyled?: boolean,
): SlotClasses | undefined => {
    if (unstyled || !slots) return undefined;
    const spec = (anatomy.parts as ComponentAnatomy["parts"])[part];
    if (!spec?.styled) return undefined;
    const slot = partSlot(spec);
    return slot === null ? undefined : slots[slot];
};

/** The error for a compound part rendered outside its Root: `outsideRootMessage("Button",
 *  "Label")`. `root` names the part that provides it, when that isn't Root (a radio group's
 *  `Item`). */
export const outsideRootMessage = (
    component: string,
    part: string,
    root = "Root",
): string =>
    `pureform: <${component}.${part}> must be inside <${component}.${root}>, which shares the machine and classes with its parts.`;

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
        if (name)
            attributes[name] = states[state as AttributeState] ? "" : undefined;
    }
    return attributes;
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
    /** The component whose provider key (`datePicker.cell`) also reaches this part, ahead of the
     *  user's props, when the part is another component's: a picker's calendar cells. Over the
     *  anatomy's own `owner`. */
    readonly owner?:
        | { readonly component: string; readonly part: string }
        | undefined;
    /** Every slot's classes, from the registry. */
    readonly classes?: Readonly<Record<string, SlotClasses>> | undefined;
    /** The provider's `slotProps`, by component and slot. */
    readonly slotProps?: object | undefined;
    /** The user's props for the part; `children` and `ref` are left out. */
    readonly props?: object | undefined;
    /** Called, in development, with a message when the provider's `slotProps` set a key the
     *  component owns. The binding passes `warnOnce` there. */
    readonly warn?: ((message: string) => void) | undefined;
}

/** A part's props sources, in the order they merge: the machine's part props (but its `style`),
 *  the anatomy's `data-scope`/`data-pf-part`/`data-testid`, the `data-pf-*` state attributes, the
 *  registry's class and token style (unless unstyled), the provider's `slotProps` for the part,
 *  then for a backdrop or a cell the provider's props for its owner (the scrim's own come first),
 *  the user's props, and last the machine's `style`, so a positioner's placement holds. The
 *  provider can't set what the component owns (the machine's props other than handlers, classes
 *  and `OVERRIDABLE_KEYS`, and the attributes above); a dropped key is reported through `warn`.
 *  The user's props are not held back, since a part drawn `as` another component arrives as the
 *  outer part's merged props. A provider addresses a part by its name, as an instance's keyed
 *  props do (the surface of an overlay is `content`, though the preset draws it with its `root`
 *  slot). Pass them to `combineProps` with the binding's rules. */
export const partSources = <A extends ComponentAnatomy>(
    input: PartSourcesInput<A>,
): readonly (Dict | undefined)[] => {
    const { anatomy, part } = input;
    const unstyled =
        isUnstyled(input.unstyled, part) || input.partUnstyled === true;
    const provider = input.slotProps as
        | Readonly<
              Record<
                  string,
                  Readonly<Record<string, Dict | undefined>> | undefined
              >
          >
        | undefined;
    const owner =
        input.owner ?? (part === anatomy.root ? anatomy.owner : undefined);
    const machine = splitMachine(input.machine as Dict | undefined);
    const clean = (source: Dict | undefined) => {
        const { source: kept, dropped } = withoutOwned(source, machine.owned);
        if (dropped.length > 0)
            input.warn?.(
                ownedKeysMessage(
                    anatomy.name,
                    part,
                    dropped,
                    "the provider's slotProps",
                ),
            );
        return kept;
    };
    return [
        machine.rest,
        partAttributes(anatomy, part, input.testId) as unknown as Dict,
        stateAttributes(input.states) as Dict,
        partClasses(anatomy, part, input.classes, unstyled) as Dict | undefined,
        clean(provider?.[anatomy.name]?.[part]),
        clean(owner ? provider?.[owner.component]?.[owner.part] : undefined),
        spreadableProps(input.props),
        machine.style,
    ];
};
