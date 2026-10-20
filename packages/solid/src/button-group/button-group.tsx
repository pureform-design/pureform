// The button group: Root, a row (`buttonGroupAnatomy`) on Zag's toggle group when selectable; its
// Button and IconButton, the button and icon button in the group's variants and selection; and
// the ready-made ButtonGroup over them, which places each button by its index.

import { buttonGroupAnatomy } from "@pureform/anatomy";
import {
    BUTTON_GROUP_CONTENT_PROPS,
    BUTTON_GROUP_ROOT_PROPS,
    buttonGroupItemProps,
    buttonGroupMachineProps,
    buttonGroupPosition,
    buttonGroupRootProps,
    buttonGroupSelection,
    groupedButtonVariants,
} from "@pureform/binding-core";
import type {
    ButtonGroupContentProps,
    ButtonGroupItem,
    ButtonGroupPosition,
    ButtonGroupRootOwnProps,
} from "@pureform/binding-core";
import * as buttonGroup from "@pureform/machines/button-group";
import type { JSX, ValidComponent } from "@solidjs/web";
import {
    type Accessor,
    createMemo,
    createUniqueId,
    For,
    merge,
    omit,
    Show,
} from "solid-js";

import { Button } from "../button/button";
import type { ButtonProps } from "../button/button";
import { useControllable } from "../controllable";
import { IconButton } from "../icon-button/icon-button";
import type { IconButtonProps } from "../icon-button/icon-button";
import { normalizeProps, useMachine } from "../internal/zag";
import type { PropTypes } from "../internal/zag";
import { createPartContext } from "../part-context";
import { useComponent } from "../parts";
import type { PartProps } from "../props";
import { useDirection } from "../provider";

/** What Root shares with its buttons. */
interface ButtonGroupContextValue {
    readonly api: Accessor<buttonGroup.Api<PropTypes>>;
    readonly props: ButtonGroupRootProps;
}

const context = createPartContext<ButtonGroupContextValue>("ButtonGroup");

/** Root's props: the group's `size` and `connected`, the buttons' variants, the selection
 *  (`selectable`, `value`, …), `testId`, `as`, and the element's own props. Name the group with
 *  `aria-label` or `aria-labelledby`. */
export interface ButtonGroupRootProps
    extends
        Omit<PartProps, keyof ButtonGroupRootOwnProps>,
        ButtonGroupRootOwnProps {
    /** Another element or component to render instead of `<div>`. */
    readonly as?: ValidComponent | undefined;
}

/** What a grouped button takes besides a button's props: its value in a selectable group, and
 *  its place in the group (`single` unless given; in a connected group give `first`, `middle` or
 *  `last`, or use `buttonGroupPosition`). */
interface GroupedProps {
    readonly value?: string | undefined;
    readonly position?: ButtonGroupPosition | undefined;
}

export type ButtonGroupButtonProps = Omit<ButtonProps, "position"> &
    GroupedProps;
export type ButtonGroupIconButtonProps = Omit<IconButtonProps, "position"> &
    GroupedProps;

/** The group's root, a `<div role="group">` that runs the toggle group when selectable. */
function Root(props: ButtonGroupRootProps): JSX.Element {
    const id = createUniqueId();
    const dir = useDirection();
    const value = useControllable("ButtonGroup", "value", props);
    const service = useMachine(buttonGroup.machine, () => ({
        id: props.id ?? id,
        dir: dir(),
        ...buttonGroupMachineProps(props),
        ...value.machineProps(),
    }));
    const api = createMemo(() => buttonGroup.connect(service, normalizeProps));
    const scope = useComponent(buttonGroupAnatomy, {
        selection: () => buttonGroupSelection(props),
        testId: () => props.testId,
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
                props: omit(props, "as", ...BUTTON_GROUP_ROOT_PROPS),
            })}
        </context.Provider>
    );
}

// A grouped button's props over its own: the group's variants and its position, and in a
// selectable group Zag's item props, its id, and its pressed state.
const useGrouped = <
    P extends GroupedProps & { readonly disabled?: boolean | undefined },
>(
    name: string,
    props: P,
    fill: (variant: ButtonProps["variant"]) => unknown,
) => {
    const { api, props: group } = context.use(name);
    const item = () =>
        props.value === undefined
            ? undefined
            : { value: props.value, disabled: props.disabled };
    const selectable = () => !!group.selectable && item() !== undefined;
    const variants = () => {
        const v = groupedButtonVariants(group, props as never, "single");
        return {
            ...v,
            variant: fill(v.variant),
            disabled: props.disabled || group.disabled,
        };
    };
    const selection = () => {
        const one = item();
        if (!selectable() || !one) return {};
        const state = api().getItemState(one);
        return {
            ...buttonGroupItemProps(api().getItemProps(one)),
            id: state.id,
            disabled: state.disabled,
            toggle: true,
            selected: state.pressed,
            onSelectedChange: () => {},
        };
    };
    return merge(
        omit(props, "value"),
        {
            get color() {
                return variants().color;
            },
            get variant() {
                return variants().variant;
            },
            get corner() {
                return variants().corner;
            },
            get density() {
                return variants().density;
            },
            get size() {
                return variants().size;
            },
            get position() {
                return variants().position;
            },
            get disabled() {
                return variants().disabled;
            },
        },
        selection,
    );
};

/** A button in the group, in its variants and, given a `value`, its selection. */
function GroupButton(props: ButtonGroupButtonProps): JSX.Element {
    const merged = useGrouped("Button", props, (variant) => variant);
    return <Button {...(merged as unknown as ButtonProps)} />;
}

/** An icon button in the group, in its variants and, given a `value`, its selection. A
 *  button's `text` fill is an icon button's `standard`. */
function GroupIconButton(props: ButtonGroupIconButtonProps): JSX.Element {
    const merged = useGrouped("IconButton", props, (variant) =>
        variant === "text" ? "standard" : variant,
    );
    return <IconButton {...(merged as unknown as IconButtonProps)} />;
}

/** The ready-made group's props: Root's and the buttons as data. */
export interface ButtonGroupProps
    extends
        Omit<ButtonGroupRootProps, "children">,
        ButtonGroupContentProps<JSX.Element> {}

const READY_MADE_PROPS = [...BUTTON_GROUP_CONTENT_PROPS] as const;

/** The ready-made group: a button per item with a label, an icon button per icon-only item, each
 *  placed by its index. */
function ReadyMade(props: ButtonGroupProps): JSX.Element {
    // An entry per item, keyed by its value (else its index), so a button follows its item's
    // changes rather than being made again.
    const entries = createMemo(() =>
        (props.items ?? []).map((item, index) => ({
            key: item.value ?? index,
            item,
        })),
    );
    const position = (index: number) =>
        buttonGroupPosition(index, entries().length, props.connected);
    const one = (item: ButtonGroupItem<JSX.Element>, index: number) => ({
        value: item.value ?? (props.selectable ? String(index) : undefined),
        position: position(index),
        disabled: item.disabled,
        onClick: item.onClick,
        "aria-label": item["aria-label"],
        testId: item.testId,
        interactionSource: item.interactionSource,
    });
    return (
        <Root {...(omit(props, ...READY_MADE_PROPS) as ButtonGroupRootProps)}>
            <For each={entries()} keyed={(entry) => entry.key}>
                {(entry, index) => (
                    <Show
                        when={entry().item.label !== undefined}
                        fallback={
                            <GroupIconButton
                                {...(one(entry().item, index()) as object)}
                                icon={entry().item.icon}
                                width={entry().item.width}
                            />
                        }
                    >
                        <GroupButton
                            {...(one(entry().item, index()) as object)}
                            label={entry().item.label}
                            icon={entry().item.icon}
                        />
                    </Show>
                )}
            </For>
        </Root>
    );
}

/** M3 Expressive's button group. Use it ready-made, `<ButtonGroup connected selectable="single"
 *  items={[{ label: "Day" }, { label: "Week" }]} />`, or compose it: `ButtonGroup.Root` holding
 *  `ButtonGroup.Button`s and `ButtonGroup.IconButton`s, each with its `position` in a connected
 *  group and its `value` in a selectable one. */
export const ButtonGroup = Object.assign(ReadyMade, {
    Root,
    Button: GroupButton,
    IconButton: GroupIconButton,
});
