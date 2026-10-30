// The radio group: Root on Zag's radio group machine (an unstyled element around the radios), each
// radio as the preset draws it (Item, a `<label>` around a native radio laid over its ring and
// dot), and the ready-made RadioGroup over them. The binding owns the form reset and the fieldset
// rule rather than Zag.

import { radioAnatomy, radioGroupAnatomy } from "@pureform/anatomy";
import {
    RADIO_GROUP_CONTENT_PROPS,
    RADIO_GROUP_ROOT_PROPS,
    RADIO_PROPS,
    radioSelection,
} from "@pureform/binding-core";
import type {
    RadioGroupContentProps,
    RadioGroupItem,
    RadioGroupRootOwnProps,
    RadioOwnProps,
    RadioGroupVariantProps,
} from "@pureform/binding-core";
import { overDefaults, radioGroupResetValue } from "@pureform/binding-web";
import {
    radioGroupMachineProps,
    radioGroupRootProps,
    radioInputProps,
    radioItemProps,
    radioRingProps,
} from "@pureform/binding-web";
import {
    radioInputs,
    setRadioDefaults,
    syncRadioInputs,
} from "@pureform/binding-web";
import type { Indication } from "@pureform/binding-web/indication";
import * as radioGroup from "@pureform/machines/radio-group";
import type { JSX, ValidComponent } from "@solidjs/web";
import {
    type Accessor,
    createMemo,
    createSignal,
    createUniqueId,
    flush,
    For,
    omit,
    untrack,
} from "solid-js";

import { useControllable } from "../controllable";
import { useFieldsetDisabled, useFormReset } from "../form";
import { itemInteractionSources } from "../interaction";
import type { ItemInteractionSources } from "../interaction";
import { normalizeProps, useMachine } from "../internal/zag";
import type { PropTypes } from "../internal/zag";
import { createPartContext } from "../part-context";
import { createSlotProps, useComponent } from "../parts";
import type { ComponentScope, InnerPropsOf, SlotKeyedProps } from "../parts";
import { combinePartProps } from "../props";
import type { PartProps } from "../props";
import { useDirection, usePureform } from "../provider";

/** What Root shares with its radios. */
interface RadioGroupContextValue {
    readonly api: Accessor<radioGroup.Api<PropTypes>>;
    /** The group's variants, every radio's defaults. */
    readonly variants: Accessor<RadioGroupVariantProps>;
    /** The group's element, whose radios a controlled click puts back. */
    readonly root: Accessor<HTMLElement | undefined>;
    readonly sources: ItemInteractionSources;
    /** The group's indication, every radio's. */
    readonly indication: Accessor<Indication | undefined>;
}

/** What a radio shares with its parts. */
interface RadioContextValue {
    readonly scope: ComponentScope<typeof radioAnatomy>;
    readonly item: Accessor<radioGroup.ItemProps>;
}

const groupContext = createPartContext<RadioGroupContextValue>("RadioGroup");
const itemContext = createPartContext<RadioContextValue>("RadioGroup", "Item");

/** Root's props: the radios' variants and tokens, the machine's props (`value`, `name`,
 *  `disabled`, …), `testId`, `as`, and the element's own props. Name the group with `aria-label`
 *  or `aria-labelledby`. */
export interface RadioGroupRootProps
    extends
        Omit<PartProps, keyof RadioGroupRootOwnProps>,
        RadioGroupRootOwnProps {
    /** Another element or component to render instead of `<div>`. */
    readonly as?: ValidComponent | undefined;
}

/** A radio's props: its value, variants over the group's, `testId` and `unstyled` for its parts,
 *  `as`, and the element's own props. */
export interface RadioGroupItemProps
    extends Omit<PartProps, keyof RadioOwnProps>, RadioOwnProps {
    /** Another element or component to render instead of `<label>`. */
    readonly as?: ValidComponent | undefined;
}

/** A radio part's props: the element's own, and the part's `unstyled`. */
export interface RadioGroupPartProps extends PartProps {
    readonly unstyled?: boolean | undefined;
}

/** The group's root: an element with `role="radiogroup"` that runs the machine and shares it with
 *  its radios. The registry doesn't style it. */
function Root(props: RadioGroupRootProps): JSX.Element {
    const id = createUniqueId();
    const dir = useDirection();
    const provider = usePureform();
    const orientation = (): "horizontal" | "vertical" =>
        (props.orientation ?? provider().defaults.radioGroup?.orientation) ===
        "horizontal"
            ? "horizontal"
            : "vertical";
    const value = useControllable("RadioGroup", "value", props);
    const [root, setRoot] = createSignal<HTMLElement | undefined>(undefined, {
        ownedWrite: true,
    });
    const fieldsetDisabled = useFieldsetDisabled(root);
    const sources = itemInteractionSources();
    const service = useMachine(radioGroup.machine, () => ({
        id,
        ...sources.machineProps,
        dir: dir(),
        ...radioGroupMachineProps(props, fieldsetDisabled()),
        orientation: orientation(),
        ...value.machineProps(),
    }));
    const api = createMemo(() => radioGroup.connect(service, normalizeProps));
    // The form follows the first radio, which also names a form outside the group's.
    const firstInput = createMemo(() => radioInputs(root())[0]);
    useFormReset(firstInput, {
        resetsTo: () => value.resetsTo() ?? null,
        writeDefault: (_, resetsTo) =>
            setRadioDefaults(untrack(root), resetsTo as string | null),
        onBeforeReset: value.beforeReset,
        onReset: () =>
            value.reset(() =>
                service.send({
                    type: "SET_VALUE",
                    value: radioGroupResetValue(value.defaultValue),
                    isTrusted: true,
                }),
            ),
    });
    const scope = useComponent(radioGroupAnatomy, {
        selection: () => ({ orientation: props.orientation }),
        testId: () => props.testId,
        unstyled: () => props.unstyled,
    });
    const rest = omit(props, "as", ...RADIO_GROUP_ROOT_PROPS);
    return (
        <groupContext.Provider
            value={{
                api,
                variants: () => ({
                    color: props.color,
                    density: props.density,
                }),
                root,
                sources,
                indication: () => props.indication,
            }}
        >
            {scope.render("root", {
                element: "div",
                as: () => props.as,
                machine: () => radioGroupRootProps(api().getRootProps()),
                ref: setRoot,
                props: rest,
            })}
        </groupContext.Provider>
    );
}

/** A radio: a `<label>` around its native radio, so its touch target checks it. */
function Item(props: RadioGroupItemProps): JSX.Element {
    const { api, variants, sources, indication } = groupContext.use("Item");
    const source = sources.item(
        () => props.value,
        () => props.interactionSource,
    );
    const item = () => ({
        value: props.value,
        disabled: props.disabled,
        invalid: props.invalid,
    });
    const scope = useComponent(radioAnatomy, {
        selection: () => radioSelection(variants(), props),
        testId: () => props.testId,
        unstyled: () => props.unstyled,
        indication,
        interactionSource: source,
    });
    const rest = omit(props, "as", ...RADIO_PROPS);
    return (
        <itemContext.Provider value={{ scope, item }}>
            {scope.render("root", {
                element: "label",
                as: () => props.as,
                machine: () => radioItemProps(api().getItemProps(item())),
                states: () => ({ pressed: api().getItemState(item()).active }),
                props: rest,
            })}
        </itemContext.Provider>
    );
}

/** The 48px touch target around a radio. Empty. */
function ItemTouchTarget(props: RadioGroupPartProps): JSX.Element {
    const { scope } = itemContext.use("ItemTouchTarget");
    const rest = omit(props, "unstyled");
    return scope.render("touchTarget", {
        element: "span",
        unstyled: () => props.unstyled,
        props: rest,
    });
}

/** The native radio, invisible over the ring: it takes every interaction, submits with the form,
 *  and is what assistive technology reads, so name it here (`aria-label`). */
function ItemInput(props: RadioGroupPartProps): JSX.Element {
    const { api, root } = groupContext.use("ItemInput");
    const { scope, item } = itemContext.use("ItemInput");
    // The browser checks the radio on a click before the machine hears of it. Once the machine
    // has sent the change and the owner's update has applied, the radios are put back to the
    // machine's value, so a controlled group the owner didn't change doesn't move.
    const onClick = () => {
        queueMicrotask(() => {
            flush();
            syncRadioInputs(
                untrack(root),
                untrack(() => api().value),
            );
        });
    };
    const rest = omit(props, "unstyled");
    return scope.render("input", {
        element: "input",
        machine: () =>
            combinePartProps([
                radioInputProps(api().getItemHiddenInputProps(item())),
                { onClick },
            ]),
        unstyled: () => props.unstyled,
        props: rest,
    });
}

/** The ring that holds the dot, hidden from assistive technology. */
function ItemRing(props: RadioGroupPartProps): JSX.Element {
    const { api } = groupContext.use("ItemRing");
    const { scope, item } = itemContext.use("ItemRing");
    const rest = omit(props, "unstyled");
    return scope.render("ring", {
        element: "span",
        machine: () => radioRingProps(api().getItemControlProps(item())),
        unstyled: () => props.unstyled,
        props: rest,
    });
}

/** The dot, which the CSS shows when the radio is checked. Empty. */
function ItemDot(props: RadioGroupPartProps): JSX.Element {
    const { scope } = itemContext.use("ItemDot");
    const rest = omit(props, "unstyled");
    return scope.render("dot", {
        element: "span",
        unstyled: () => props.unstyled,
        props: rest,
    });
}

type GroupKeyed = Pick<
    SlotKeyedProps<typeof radioGroupAnatomy>,
    "class" | "style" | "slotProps"
>;

/** The ready-made radio group's props: Root's, with `class`, `style` and `slotProps` keyed by the
 *  group's own part (`root`), the radios as `items`, and `radioProps`, every radio's defaults. */
export interface RadioGroupProps
    extends
        Omit<RadioGroupRootProps, keyof GroupKeyed | "children">,
        GroupKeyed,
        Omit<RadioGroupContentProps, "items"> {
    /** The radios, in order: each its data and its own `class`, `style`, `slotProps`, `unstyled`
     *  and `tokens`, over `radioProps`. */
    readonly items?: readonly RadioGroupEntry[] | undefined;
    /** Every radio's `class`, `style`, `slotProps`, `unstyled`, `testId` and `tokens`, keyed by
     *  the radio's parts: `{ class: { input: "…" }, tokens: { … } }`. An item's own `testId`
     *  wins. */
    readonly radioProps?: InnerPropsOf<typeof radioAnatomy> | undefined;
}

const READY_MADE_PROPS = [
    "class",
    "style",
    "slotProps",
    "radioProps",
    ...RADIO_GROUP_CONTENT_PROPS,
] as const;

/** One radio of the ready-made group: its data, and its own customizing props, over `radioProps`. */
export type RadioGroupEntry = RadioGroupItem &
    Omit<InnerPropsOf<typeof radioAnatomy>, "testId">;

/** One radio of the ready-made group, drawn with its defaults and its own customizing props. Each
 *  radio is its own component, reading its merged props reactively. */
function RadioEntry(props: {
    readonly item: () => RadioGroupEntry;
    readonly defaults: () => InnerPropsOf<typeof radioAnatomy> | undefined;
}): JSX.Element {
    const merged = () =>
        overDefaults(props.defaults(), {
            class: props.item().class,
            style: props.item().style,
            slotProps: props.item().slotProps,
            unstyled: props.item().unstyled,
            tokens: props.item().tokens,
        } as InnerPropsOf<typeof radioAnatomy>);
    const slot = createSlotProps({
        get class() {
            return merged().class;
        },
        get style() {
            return merged().style;
        },
        get slotProps() {
            return merged().slotProps;
        },
    } as SlotKeyedProps<typeof radioAnatomy>);
    const root = slot("root");
    const touchTarget = slot("touchTarget");
    const input = slot("input");
    const ring = slot("ring");
    const dot = slot("dot");
    return (
        <Item
            {...root}
            value={props.item().value}
            disabled={props.item().disabled}
            invalid={props.item().invalid}
            testId={props.item().testId ?? props.defaults()?.testId}
            tokens={merged().tokens}
            interactionSource={props.item().interactionSource}
            unstyled={merged().unstyled}
        >
            <ItemTouchTarget {...touchTarget} />
            <ItemInput aria-label={props.item().label} {...input} />
            <ItemRing {...ring}>
                <ItemDot {...dot} />
            </ItemRing>
        </Item>
    );
}

/** The ready-made radio group: a radio per item, each with every part in the preset's
 *  structure, named by its item's `label`. */
function ReadyMade(props: RadioGroupProps): JSX.Element {
    const group = createSlotProps(
        props as GroupKeyed as SlotKeyedProps<typeof radioGroupAnatomy>,
    )("root");
    const own = omit(props, ...READY_MADE_PROPS) as RadioGroupRootProps;
    return (
        <Root {...own} {...(group as object)}>
            <For
                each={props.items ?? []}
                keyed={(item: RadioGroupEntry) => item.value}
            >
                {(item) => (
                    <RadioEntry item={item} defaults={() => props.radioProps} />
                )}
            </For>
        </Root>
    );
}

/** Material's radio buttons in a group. Use it ready-made, `<RadioGroup name="size"
 *  aria-label="Size" items={[{ value: "s", label: "Small" }, …]} />`, or compose its parts:
 *  `RadioGroup.Root` holding an `Item` per radio, each with `ItemTouchTarget`, `ItemInput`, and
 *  `ItemRing` holding `ItemDot`. */
export const RadioGroup = Object.assign(ReadyMade, {
    Root,
    Item,
    ItemTouchTarget,
    ItemInput,
    ItemRing,
    ItemDot,
});
