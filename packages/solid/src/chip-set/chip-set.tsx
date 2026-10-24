// The chip set: Root, a row of chips (`chipSetAnatomy`) that wraps or scrolls on one line, on Zag's
// toggle group when selectable; its Chip, a chip in the set's variants and selection; and the
// ready-made ChipSet over them.

import { chipSetAnatomy } from "@pureform/anatomy";
import type { chipAnatomy } from "@pureform/anatomy";
import {
    buttonGroupRootProps,
    toggleGroupItemProps,
    CHIP_SET_CONTENT_PROPS,
    CHIP_SET_ROOT_PROPS,
    chipSetChipVariants,
    chipSetMachineProps,
    chipSetSelection,
} from "@pureform/binding-core";
import type {
    ChipSetContentProps,
    ChipSetItem,
    ChipSetRootOwnProps,
} from "@pureform/binding-core";
import * as toggleGroup from "@pureform/machines/button-group";
import type { JSX, ValidComponent } from "@solidjs/web";
import {
    type Accessor,
    createMemo,
    createUniqueId,
    For,
    merge,
    omit,
} from "solid-js";

import { Chip } from "../chip/chip";
import type { ChipProps } from "../chip/chip";
import { useControllable } from "../controllable";
import { normalizeProps, useMachine } from "../internal/zag";
import type { PropTypes } from "../internal/zag";
import { createPartContext } from "../part-context";
import { createSlotProps, useComponent } from "../parts";
import type { InnerPropsOf, SlotKeyedProps } from "../parts";
import type { PartProps } from "../props";
import { useDirection } from "../provider";

/** What Root shares with its chips. */
interface ChipSetContextValue {
    readonly api: Accessor<toggleGroup.Api<PropTypes>>;
    readonly props: ChipSetRootProps;
}

const context = createPartContext<ChipSetContextValue>("ChipSet");

/** Root's props: the set's `singleLine` and `setTokens`, the chips' variants, the selection
 *  (`selectable`, `value`, …), `testId`, `as`, and the element's own props. Name the set with
 *  `aria-label` or `aria-labelledby`. */
export interface ChipSetRootProps
    extends Omit<PartProps, keyof ChipSetRootOwnProps>, ChipSetRootOwnProps {
    /** Another element or component to render instead of `<div>`. */
    readonly as?: ValidComponent | undefined;
}

/** A chip in the set: a chip's props, and its value in a selectable set. */
export type ChipSetChipProps = ChipProps & {
    readonly value?: string | undefined;
};

/** The set's root, a `<div role="group">` that runs the toggle group when selectable. */
function Root(props: ChipSetRootProps): JSX.Element {
    const id = createUniqueId();
    const dir = useDirection();
    const value = useControllable("ChipSet", "value", props);
    const service = useMachine(toggleGroup.machine, () => ({
        id: props.id ?? id,
        dir: dir(),
        ...chipSetMachineProps(props),
        ...value.machineProps(),
    }));
    const api = createMemo(() => toggleGroup.connect(service, normalizeProps));
    const scope = useComponent(chipSetAnatomy, {
        selection: () => chipSetSelection(props),
        testId: () => props.testId,
        unstyled: () => props.unstyled,
    });
    return (
        <context.Provider value={{ api, props }}>
            {scope.render("root", {
                element: "div",
                as: () => props.as,
                machine: () =>
                    props.selectable
                        ? buttonGroupRootProps(api().getRootProps())
                        : { role: "group" },
                props: omit(props, "as", ...CHIP_SET_ROOT_PROPS),
            })}
        </context.Provider>
    );
}

/** A chip in the set, in its variants and, given a `value` in a selectable set, a filter chip
 *  on the set's selection. */
function SetChip(props: ChipSetChipProps): JSX.Element {
    const { api, props: set } = context.use("Chip");
    const item = () =>
        props.value === undefined
            ? undefined
            : { value: props.value, disabled: props.disabled };
    const variants = () => chipSetChipVariants(set, props);
    const selection = () => {
        const one = item();
        if (!set.selectable || !one) return {};
        return toggleGroupItemProps(api(), one);
    };
    const merged = merge(
        omit(props, "value"),
        {
            get variant() {
                return variants().variant;
            },
            get corner() {
                return variants().corner;
            },
            get color() {
                return variants().color;
            },
            get density() {
                return variants().density;
            },
            get disabled() {
                return props.disabled || set.disabled;
            },
            get indication() {
                return props.indication ?? set.indication;
            },
        },
        selection,
    );
    return <Chip {...(merged as unknown as ChipProps)} />;
}

type Keyed = SlotKeyedProps<typeof chipSetAnatomy>;

/** The ready-made set's props: Root's, with `class`, `style` and `slotProps` keyed by the set's
 *  own part (`root`), the chips as data, and `chipProps`, every chip's defaults. */
export interface ChipSetProps
    extends
        Omit<ChipSetRootProps, keyof Keyed | "children">,
        Keyed,
        ChipSetContentProps<JSX.Element> {
    /** Every chip's `class`, `style`, `slotProps`, `unstyled`, `testId` and `tokens`, keyed by
     *  the chip's parts. An item's own `testId` wins. */
    readonly chipProps?: InnerPropsOf<typeof chipAnatomy> | undefined;
}

const READY_MADE_PROPS = [
    "class",
    "style",
    "slotProps",
    "chipProps",
    ...CHIP_SET_CONTENT_PROPS,
] as const;

/** The ready-made set: a chip per item, a filter chip in a selectable set. */
function ReadyMade(props: ChipSetProps): JSX.Element {
    // An entry per item, keyed by its value (else its index), so a chip follows its item's
    // changes rather than being made again.
    const entries = createMemo(() =>
        (props.items ?? []).map((item, index) => ({
            key: item.value ?? index,
            item,
        })),
    );
    const one = (item: ChipSetItem<JSX.Element>, index: number) => ({
        value: item.value ?? (props.selectable ? String(index) : undefined),
        label: item.label,
        icon: item.icon,
        trailingIcon: item.trailingIcon,
        disabled: item.disabled,
        onClick: item.onClick,
        testId: item.testId ?? props.chipProps?.testId,
        interactionSource: item.interactionSource,
    });
    const root = createSlotProps(props)("root");
    return (
        <Root
            {...(omit(props, ...READY_MADE_PROPS) as ChipSetRootProps)}
            {...(root as object)}
        >
            <For each={entries()} keyed={(entry) => entry.key}>
                {(entry, index) => (
                    <SetChip
                        {...(props.chipProps as object)}
                        {...(one(entry().item, index()) as object)}
                    />
                )}
            </For>
        </Root>
    );
}

/** A set of Material chips. Use it ready-made, `<ChipSet selectable="multiple"
 *  aria-label="Filters" items={[{ label: "Vegan" }, { label: "Nut free" }]} />`, or compose it:
 *  `ChipSet.Root` holding `ChipSet.Chip`s, each with its `value` in a selectable set. */
export const ChipSet = Object.assign(ReadyMade, { Root, Chip: SetChip });
