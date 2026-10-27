// The radio group: Root on Zag's radio group machine (an unstyled element around the radios), each
// radio as the preset draws it (Item, a `<label>` around a native radio laid over its ring and
// dot), and the ready-made RadioGroup over them. The binding owns the form reset and the fieldset
// rule rather than Zag.

import { radioAnatomy, radioGroupAnatomy } from "@pureform/anatomy";
import {
    RADIO_GROUP_ROOT_PROPS,
    RADIO_PROPS,
    radioSelection,
} from "@pureform/binding-core";
import type {
    RadioGroupContentProps,
    RadioGroupRootOwnProps,
    RadioGroupVariantProps,
    RadioOwnProps,
} from "@pureform/binding-core";
import { radioGroupResetValue } from "@pureform/binding-web";
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
import { normalizeProps } from "@zag-js/react";
import type { PropTypes } from "@zag-js/react";
import {
    type ElementType,
    type ReactNode,
    useCallback,
    useId,
    useLayoutEffect,
    useRef,
    useState,
} from "react";

import { useControllable } from "../controllable";
import { useFieldsetDisabled, useFormReset } from "../form";
import { useItemInteractionSources } from "../interaction";
import type { ItemInteractionSources } from "../interaction";
import { useMachine } from "../machine";
import { createPartContext } from "../part-context";
import { useComponent, useSlotProps, useUnstyledComponent } from "../parts";
import type { ComponentScope, InnerPropsOf, SlotKeyedProps } from "../parts";
import { combinePartProps, omitProps } from "../props";
import type { PartProps } from "../props";
import { useDirection } from "../provider";

/** What Root shares with its radios. */
interface RadioGroupContextValue {
    readonly api: radioGroup.Api<PropTypes>;
    /** The group's variants, every radio's defaults. */
    readonly variants: RadioGroupVariantProps;
    /** Puts the radios back to the controlled value after a click; see `ItemInput`. Stable. */
    readonly restoreInputs: () => void;
    readonly sources: ItemInteractionSources;
    /** The group's indication, every radio's. */
    readonly indication: Indication | undefined;
}

/** What a radio shares with its parts. */
interface RadioContextValue {
    readonly scope: ComponentScope<typeof radioAnatomy>;
    readonly item: radioGroup.ItemProps;
}

const groupContext = createPartContext<RadioGroupContextValue>("RadioGroup");
const itemContext = createPartContext<RadioContextValue>("RadioGroup", "Item");

/** Root's props: the radios' variants, the machine's props (`value`, `name`,
 *  `disabled`, …), `testId`, `as`, and the element's own props. Name the group with `aria-label`
 *  or `aria-labelledby`. */
export interface RadioGroupRootProps
    extends
        Omit<PartProps, keyof RadioGroupRootOwnProps>,
        RadioGroupRootOwnProps {
    /** Another element or component to render instead of `<div>`. */
    readonly as?: ElementType | undefined;
}

/** A radio's props: its value, variants over the group's, `testId` and `unstyled` for its parts,
 *  `as`, and the element's own props. */
export interface RadioGroupItemProps
    extends Omit<PartProps, keyof RadioOwnProps>, RadioOwnProps {
    /** Another element or component to render instead of `<label>`. */
    readonly as?: ElementType | undefined;
}

/** A radio part's props: the element's own, and the part's `unstyled`. */
export interface RadioGroupPartProps extends PartProps {
    readonly unstyled?: boolean | undefined;
}

/** The group's root: an element with `role="radiogroup"` that runs the machine and shares it with
 *  its radios. The registry doesn't style it. */
function Root(props: RadioGroupRootProps): ReactNode {
    const id = useId();
    const dir = useDirection();
    const value = useControllable<"value", string | null>(
        "RadioGroup",
        "value",
        props,
    );
    const [root, setRoot] = useState<HTMLElement | null>(null);
    const fieldsetDisabled = useFieldsetDisabled(root);
    const sources = useItemInteractionSources();
    const service = useMachine(radioGroup.machine, {
        id,
        ...sources.machineProps,
        dir,
        ...radioGroupMachineProps(props, fieldsetDisabled),
        ...value.machineProps,
    });
    const api = radioGroup.connect(service, normalizeProps);
    // The form follows the first radio, which also names a form outside the group's.
    const [firstInput, setFirstInput] = useState<HTMLInputElement | null>(null);
    useLayoutEffect(() => {
        setFirstInput(radioInputs(root)[0] ?? null);
    });
    useFormReset(firstInput, {
        resetsTo: value.resetsTo ?? null,
        writeDefault: (_, resetsTo) =>
            setRadioDefaults(root, resetsTo as string | null),
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
    // The controlled value as last committed, read after a click rather than captured by it.
    const control = useRef({
        root,
        controlled: value.controlled,
        value: value.value,
    });
    useLayoutEffect(() => {
        control.current = {
            root,
            controlled: value.controlled,
            value: value.value,
        };
    });
    const restoreInputs = useCallback(() => {
        const { root: element, controlled, value: current } = control.current;
        if (controlled && current !== undefined) {
            syncRadioInputs(element, current);
        }
    }, []);
    const scope = useUnstyledComponent(radioGroupAnatomy, {
        testId: props.testId,
    });
    const { as, ...rest } = omitProps(props, RADIO_GROUP_ROOT_PROPS);
    return (
        <groupContext.Provider
            value={{
                api,
                variants: {
                    color: props.color,
                    density: props.density,
                },
                restoreInputs,
                sources,
                indication: props.indication,
            }}
        >
            {scope.render("root", {
                element: "div",
                as,
                machine: radioGroupRootProps(api.getRootProps()),
                ref: setRoot as (element: HTMLElement | null) => void,
                props: rest,
            })}
        </groupContext.Provider>
    );
}

/** A radio: a `<label>` around its native radio, so its touch target checks it. */
function Item(props: RadioGroupItemProps): ReactNode {
    const { api, variants, sources, indication } = groupContext.use("Item");
    const source = sources.item(props.value, props.interactionSource);
    const item = {
        value: props.value,
        disabled: props.disabled,
        invalid: props.invalid,
    };
    const scope = useComponent(radioAnatomy, {
        selection: radioSelection(variants, props),
        testId: props.testId,
        unstyled: props.unstyled,
        indication,
        interactionSource: source,
    });
    const { as, ...rest } = omitProps(props, RADIO_PROPS);
    return (
        <itemContext.Provider value={{ scope, item }}>
            {scope.render("root", {
                element: "label",
                as,
                machine: radioItemProps(api.getItemProps(item)),
                states: { pressed: api.getItemState(item).active },
                props: rest,
            })}
        </itemContext.Provider>
    );
}

/** The 48px touch target around a radio. Empty. */
function ItemTouchTarget({
    unstyled,
    ...props
}: RadioGroupPartProps): ReactNode {
    const { scope } = itemContext.use("ItemTouchTarget");
    return scope.render("touchTarget", { element: "span", unstyled, props });
}

/** The native radio, invisible over the ring: it takes every interaction, submits with the form,
 *  and is what assistive technology reads, so name it here (`aria-label`). */
function ItemInput({ unstyled, ...props }: RadioGroupPartProps): ReactNode {
    const { api, restoreInputs } = groupContext.use("ItemInput");
    const { scope, item } = itemContext.use("ItemInput");
    // The browser checks the radio on a click before the machine hears of it. Once the machine
    // has sent the change and told the owner, a controlled group's radios are put back to the
    // value last committed; the owner's update, if any, then moves them with the machine.
    const onClick = () => {
        queueMicrotask(restoreInputs);
    };
    return scope.render("input", {
        element: "input",
        machine: combinePartProps([
            radioInputProps(api.getItemHiddenInputProps(item)),
            { onClick },
        ]),
        unstyled,
        props,
    });
}

/** The ring that holds the dot, hidden from assistive technology. */
function ItemRing({ unstyled, ...props }: RadioGroupPartProps): ReactNode {
    const { api } = groupContext.use("ItemRing");
    const { scope, item } = itemContext.use("ItemRing");
    return scope.render("ring", {
        element: "span",
        machine: radioRingProps(api.getItemControlProps(item)),
        unstyled,
        props,
    });
}

/** The dot, which the CSS shows when the radio is checked. Empty. */
function ItemDot({ unstyled, ...props }: RadioGroupPartProps): ReactNode {
    const { scope } = itemContext.use("ItemDot");
    return scope.render("dot", { element: "span", unstyled, props });
}

type GroupKeyed = Omit<SlotKeyedProps<typeof radioGroupAnatomy>, "unstyled">;

/** The ready-made radio group's props: Root's, with `className`, `style` and `slotProps` keyed by
 *  the group's own part (`root`), the radios as `items`, and `radioProps`, every radio's
 *  defaults. */
export interface RadioGroupProps
    extends
        Omit<RadioGroupRootProps, keyof GroupKeyed | "children">,
        GroupKeyed,
        RadioGroupContentProps {
    /** Every radio's `className`, `style`, `slotProps`, `unstyled`, `testId` and `tokens`, keyed
     *  by the radio's parts: `{ className: { input: "…" }, tokens: { … } }`. An item's own
     *  `testId` wins. */
    readonly radioProps?: InnerPropsOf<typeof radioAnatomy> | undefined;
}

const NO_RADIO_PROPS: InnerPropsOf<typeof radioAnatomy> = {};

/** The ready-made radio group: a radio per item, each with every part in the preset's
 *  structure, named by its item's `label`. */
function ReadyMade(props: RadioGroupProps): ReactNode {
    const {
        className: _className,
        style: _style,
        slotProps: _slotProps,
        radioProps = NO_RADIO_PROPS,
        items,
        ...rootProps
    } = props;
    const group = useSlotProps(props);
    const slot = useSlotProps(radioProps);
    return (
        <Root {...rootProps} {...(group("root") as object)}>
            {(items ?? []).map((item) => (
                <Item
                    key={item.value}
                    {...slot("root")}
                    value={item.value}
                    disabled={item.disabled}
                    invalid={item.invalid}
                    testId={item.testId ?? radioProps.testId}
                    tokens={radioProps.tokens}
                    interactionSource={item.interactionSource}
                    unstyled={radioProps.unstyled}
                >
                    <ItemTouchTarget {...slot("touchTarget")} />
                    <ItemInput aria-label={item.label} {...slot("input")} />
                    <ItemRing {...slot("ring")}>
                        <ItemDot {...slot("dot")} />
                    </ItemRing>
                </Item>
            ))}
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
