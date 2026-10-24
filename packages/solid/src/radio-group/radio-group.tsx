// The radio group: Root on Zag's radio group machine (an unstyled element around the radios), each
// radio as the preset draws it (Item, a `<label>` around a native radio laid over its ring and
// dot), and the ready-made RadioGroup over them. The binding owns the form reset and the fieldset
// rule rather than Zag.

import { radioAnatomy, radioGroupAnatomy } from "@pureform/anatomy";
import {
    RADIO_GROUP_CONTENT_PROPS,
    RADIO_GROUP_ROOT_PROPS,
    RADIO_PROPS,
    radioGroupMachineProps,
    radioGroupResetValue,
    radioGroupRootProps,
    radioInputProps,
    radioItemProps,
    radioRingProps,
    radioSelection,
} from "@pureform/binding-core";
import type {
    RadioGroupContentProps,
    RadioGroupItem,
    RadioGroupRootOwnProps,
    RadioOwnProps,
    RadioPart,
    RadioVariantProps,
    SlotKeyed,
    Unstyled,
} from "@pureform/binding-core";
import type { Indication } from "@pureform/binding-core/indication";
import {
    radioInputs,
    setRadioDefaults,
    syncRadioInputs,
} from "@pureform/binding-dom";
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
import { useComponent, useUnstyledComponent } from "../parts";
import type { ComponentScope } from "../parts";
import { combinePartProps } from "../props";
import type { PartProps } from "../props";
import { useDirection } from "../provider";

/** What Root shares with its radios. */
interface RadioGroupContextValue {
    readonly api: Accessor<radioGroup.Api<PropTypes>>;
    /** The group's variants, every radio's defaults. */
    readonly variants: Accessor<RadioVariantProps>;
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
    const scope = useUnstyledComponent(radioGroupAnatomy, {
        testId: () => props.testId,
    });
    return (
        <groupContext.Provider
            value={{
                api,
                variants: () => ({
                    color: props.color,
                    density: props.density,
                    tokens: props.tokens,
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
                props: omit(props, "as", ...RADIO_GROUP_ROOT_PROPS),
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
    return (
        <itemContext.Provider value={{ scope, item }}>
            {scope.render("root", {
                element: "label",
                as: () => props.as,
                machine: () => radioItemProps(api().getItemProps(item())),
                states: () => ({ pressed: api().getItemState(item()).active }),
                props: omit(props, "as", ...RADIO_PROPS),
            })}
        </itemContext.Provider>
    );
}

/** The 48px touch target around a radio. Empty. */
function ItemTouchTarget(props: RadioGroupPartProps): JSX.Element {
    const { scope } = itemContext.use("ItemTouchTarget");
    return scope.render("touchTarget", {
        element: "span",
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
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
    return scope.render("input", {
        element: "input",
        machine: () =>
            combinePartProps([
                radioInputProps(api().getItemHiddenInputProps(item())),
                { onClick },
            ]),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
    });
}

/** The ring that holds the dot, hidden from assistive technology. */
function ItemRing(props: RadioGroupPartProps): JSX.Element {
    const { api } = groupContext.use("ItemRing");
    const { scope, item } = itemContext.use("ItemRing");
    return scope.render("ring", {
        element: "span",
        machine: () => radioRingProps(api().getItemControlProps(item())),
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
    });
}

/** The dot, which the CSS shows when the radio is checked. Empty. */
function ItemDot(props: RadioGroupPartProps): JSX.Element {
    const { scope } = itemContext.use("ItemDot");
    return scope.render("dot", {
        element: "span",
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
    });
}

/** The ready-made radio group's props: Root's (`class` and `style` are the group element's), the
 *  radios as `items`, and props for every radio's parts, keyed by part. */
export interface RadioGroupProps
    extends Omit<RadioGroupRootProps, "children">, RadioGroupContentProps {
    /** Every radio's parts' props, by part: `{ input: { class: "…" } }`. */
    readonly slotProps?: SlotKeyed<RadioPart, RadioGroupPartProps> | undefined;
    /** Every radio's parts, or some, without the registry's styles. */
    readonly unstyled?: Unstyled<RadioPart> | undefined;
}

const READY_MADE_PROPS = [
    "slotProps",
    "unstyled",
    ...RADIO_GROUP_CONTENT_PROPS,
] as const;

/** The ready-made radio group: a radio per item, each with every part in the preset's
 *  structure, named by its item's `label`. */
function ReadyMade(props: RadioGroupProps): JSX.Element {
    const slot = (part: RadioPart) => props.slotProps?.[part] ?? {};
    return (
        <Root {...(omit(props, ...READY_MADE_PROPS) as RadioGroupRootProps)}>
            <For
                each={props.items ?? []}
                keyed={(item: RadioGroupItem) => item.value}
            >
                {(item) => (
                    <Item
                        {...slot("root")}
                        value={item().value}
                        disabled={item().disabled}
                        invalid={item().invalid}
                        testId={item().testId}
                        interactionSource={item().interactionSource}
                        unstyled={props.unstyled}
                    >
                        <ItemTouchTarget {...slot("touchTarget")} />
                        <ItemInput
                            aria-label={item().label}
                            {...slot("input")}
                        />
                        <ItemRing {...slot("ring")}>
                            <ItemDot {...slot("dot")} />
                        </ItemRing>
                    </Item>
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
