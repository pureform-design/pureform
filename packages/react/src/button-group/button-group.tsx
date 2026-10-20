// The button group: Root, a row (`buttonGroupAnatomy`) on Zag's toggle group when selectable; its
// Button and IconButton, the button and icon button in the group's variants and selection; and
// the ready-made ButtonGroup over them, which places each button by its index.

import { buttonGroupAnatomy } from "@pureform/anatomy";
import {
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
import { normalizeProps } from "@zag-js/react";
import type { PropTypes } from "@zag-js/react";
import { type ElementType, type ReactNode, useId } from "react";

import { Button } from "../button/button";
import type { ButtonProps } from "../button/button";
import { useControllable } from "../controllable";
import { IconButton } from "../icon-button/icon-button";
import type { IconButtonProps } from "../icon-button/icon-button";
import { useMachine } from "../machine";
import { createPartContext } from "../part-context";
import { useComponent } from "../parts";
import { omitProps } from "../props";
import type { PartProps } from "../props";
import { useDirection } from "../provider";

/** What Root shares with its buttons. */
interface ButtonGroupContextValue {
    readonly api: buttonGroup.Api<PropTypes>;
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
    readonly as?: ElementType | undefined;
}

/** What a grouped button takes besides a button's props: its value in a selectable group, and
 *  its place in the group (`single` unless given; in a connected group give `first`, `middle` or
 *  `last`, or use `buttonGroupPosition`). */
interface GroupedProps {
    readonly value?: string | undefined;
    readonly position?: ButtonGroupPosition | undefined;
}

export type ButtonGroupButtonProps = Omit<ButtonProps, "position" | "value"> &
    GroupedProps;
export type ButtonGroupIconButtonProps = Omit<
    IconButtonProps,
    "position" | "value"
> &
    GroupedProps;

/** The group's root, a `<div role="group">` that runs the toggle group when selectable. */
function Root(props: ButtonGroupRootProps): ReactNode {
    const id = useId();
    const dir = useDirection();
    const value = useControllable<"value", string[]>(
        "ButtonGroup",
        "value",
        props,
    );
    const service = useMachine(buttonGroup.machine, {
        id: props.id ?? id,
        dir,
        ...buttonGroupMachineProps(props),
        ...value.machineProps,
    });
    const api = buttonGroup.connect(service, normalizeProps);
    const scope = useComponent(buttonGroupAnatomy, {
        selection: buttonGroupSelection(props),
        testId: props.testId,
    });
    const { as, ...rest } = omitProps(props, BUTTON_GROUP_ROOT_PROPS);
    return (
        <context.Provider value={{ api, props }}>
            {scope.render("root", {
                element: "div",
                as,
                machine: props.selectable
                    ? buttonGroupRootProps(api.getRootProps())
                    : { role: "group" },
                props: rest,
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
    { value, ...props }: P,
    fill: (variant: ButtonProps["variant"]) => unknown,
): object => {
    const { api, props: group } = context.use(name);
    const variants = groupedButtonVariants(group, props as never, "single");
    const own = {
        ...props,
        ...variants,
        variant: fill(variants.variant),
        disabled: props.disabled || group.disabled,
    };
    if (!group.selectable || value === undefined) return own;
    const item = { value, disabled: props.disabled };
    const state = api.getItemState(item);
    return {
        ...own,
        ...buttonGroupItemProps(api.getItemProps(item)),
        id: state.id,
        disabled: state.disabled,
        toggle: true,
        selected: state.pressed,
        onSelectedChange: () => {},
    };
};

/** A button in the group, in its variants and, given a `value`, its selection. */
function GroupButton(props: ButtonGroupButtonProps): ReactNode {
    const grouped = useGrouped("Button", props, (variant) => variant);
    return <Button {...(grouped as ButtonProps)} />;
}

/** An icon button in the group, in its variants and, given a `value`, its selection. A
 *  button's `text` fill is an icon button's `standard`. */
function GroupIconButton(props: ButtonGroupIconButtonProps): ReactNode {
    const grouped = useGrouped("IconButton", props, (variant) =>
        variant === "text" ? "standard" : variant,
    );
    return <IconButton {...(grouped as IconButtonProps)} />;
}

/** The ready-made group's props: Root's and the buttons as data. */
export interface ButtonGroupProps
    extends
        Omit<ButtonGroupRootProps, "children">,
        ButtonGroupContentProps<ReactNode> {}

/** The ready-made group: a button per item with a label, an icon button per icon-only item, each
 *  placed by its index. */
function ReadyMade({ items = [], ...props }: ButtonGroupProps): ReactNode {
    const one = (item: ButtonGroupItem<ReactNode>, index: number) => ({
        value: item.value ?? (props.selectable ? String(index) : undefined),
        position: buttonGroupPosition(index, items.length, props.connected),
        disabled: item.disabled,
        onClick: item.onClick,
        "aria-label": item["aria-label"],
        testId: item.testId,
        interactionSource: item.interactionSource,
    });
    return (
        <Root {...props}>
            {items.map((item, index) =>
                item.label === undefined ? (
                    <GroupIconButton
                        key={item.value ?? index}
                        {...(one(item, index) as object)}
                        icon={item.icon}
                        width={item.width}
                    />
                ) : (
                    <GroupButton
                        key={item.value ?? index}
                        {...(one(item, index) as object)}
                        label={item.label}
                        icon={item.icon}
                    />
                ),
            )}
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
