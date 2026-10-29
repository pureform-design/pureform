// The button group: a row the registry styles, holding a button per labelled item and an icon
// button per icon-only one, each placed by its index (`single` in a standard group, its place in
// the run in a connected one). A selectable group makes them toggles: a press turns one on, and
// in a single-select group the others off.

import { buttonGroupAnatomy } from "@pureform/anatomy";
import {
    buttonGroupPosition,
    buttonGroupSelection,
    groupedButtonVariants,
    toggleSelection,
} from "@pureform/binding-core";
import type {
    ButtonGroupContentProps,
    ButtonGroupItem,
    ButtonGroupPart,
    ButtonGroupRootOwnProps,
} from "@pureform/binding-core";
import type { ReactNode } from "react";

import { Button } from "../button/button";
import type { ButtonProps } from "../button/button";
import { overDefaults } from "../defaults";
import { IconButton } from "../icon-button/icon-button";
import type { IconButtonProps } from "../icon-button/icon-button";
import { testIdOf, useControllable, withEngine } from "../parts";
import { useNativeSlotReader } from "../slot-props";
import type { InnerPropsOf, NativeSlotProps } from "../slot-props";
import { useComponentSlots } from "../styles";

/** What each part renders as, for its keyed `style` and `slotProps`. */
export interface ButtonGroupHosts {
    readonly root: "View";
}

export interface ButtonGroupProps
    extends
        Omit<ButtonGroupRootOwnProps, "unstyled">,
        Omit<ButtonGroupContentProps<ReactNode>, "items">,
        NativeSlotProps<ButtonGroupHosts> {
    readonly "aria-label"?: string | undefined;
    /** The buttons, in order: each its data and its own `style`, `slotProps` and `tokens`, over
     *  the defaults for its kind. */
    readonly items?: readonly ButtonGroupEntry[] | undefined;
    /** Every labelled button's `style`, `slotProps`, `tokens` and `testId`; an item's own `testId` wins. */
    readonly buttonProps?: InnerPropsOf<ButtonProps> | undefined;
    /** The same for every icon-only button. */
    readonly iconButtonProps?: InnerPropsOf<IconButtonProps> | undefined;
}

/** One button of the ready-made group: its data, and its own customizing props, over the defaults
 *  for its kind (`buttonProps` with a label, `iconButtonProps` without one). */
export type ButtonGroupEntry = ButtonGroupItem<ReactNode> &
    Omit<InnerPropsOf<ButtonProps> & InnerPropsOf<IconButtonProps>, "testId">;

function ButtonGroupImpl(props: ButtonGroupProps): ReactNode {
    const nativeSlots = useNativeSlotReader("buttonGroup");
    const { styles: s, views: v } = useComponentSlots<ButtonGroupPart>(
        "buttonGroup",
        buttonGroupSelection(props),
    );
    const [value, setValue] = useControllable(
        "ButtonGroup",
        "value",
        props.value,
        props.defaultValue,
        props.onValueChange,
        [] as string[],
    );
    const items = props.items ?? [];
    const id = (part: ButtonGroupPart) =>
        testIdOf(buttonGroupAnatomy, part, props.testId);
    const slot = nativeSlots(props);
    return (
        <v.root.View
            {...slot.props("root")}
            role="group"
            {...(props["aria-label"] === undefined
                ? {}
                : { "aria-label": props["aria-label"] })}
            style={slot.style("root", s.root)}
            testID={id("root")}
        >
            {items.map((item, index) => {
                const key = item.value ?? String(index);
                const variants = groupedButtonVariants(
                    props,
                    {},
                    buttonGroupPosition(index, items.length, props.connected),
                );
                const selectable = props.selectable !== undefined;
                const selected = selectable ? value.includes(key) : undefined;
                const onPress = () => {
                    if (selectable)
                        setValue(
                            toggleSelection(
                                value,
                                key,
                                props.selectable === "multiple",
                                props.deselectable ?? true,
                            ),
                        );
                    item.onClick?.();
                };
                const disabled = item.disabled || props.disabled;
                return item.label === undefined ? (
                    <IconButton
                        key={key}
                        {...(overDefaults(props.iconButtonProps, {
                            style: item.style,
                            slotProps: item.slotProps,
                            tokens: item.tokens,
                        } as InnerPropsOf<IconButtonProps>) as object)}
                        {...(variants as Partial<IconButtonProps>)}
                        variant={
                            (variants.variant === "text"
                                ? "standard"
                                : variants.variant) as IconButtonProps["variant"]
                        }
                        aria-label={item["aria-label"] ?? ""}
                        icon={item.icon}
                        width={item.width}
                        disabled={disabled}
                        selected={selected}
                        onPress={onPress}
                        testId={item.testId ?? props.iconButtonProps?.testId}
                        indication={props.indication}
                        interactionSource={item.interactionSource}
                    />
                ) : (
                    <Button
                        key={key}
                        {...(overDefaults(props.buttonProps, {
                            style: item.style,
                            slotProps: item.slotProps,
                            tokens: item.tokens,
                        } as InnerPropsOf<ButtonProps>) as object)}
                        {...(variants as Partial<ButtonProps>)}
                        label={item.label}
                        icon={item.icon}
                        disabled={disabled}
                        selected={selected}
                        onPress={onPress}
                        testId={item.testId ?? props.buttonProps?.testId}
                        indication={props.indication}
                        interactionSource={item.interactionSource}
                    />
                );
            })}
        </v.root.View>
    );
}

/** M3 Expressive's button group: `<ButtonGroup connected selectable="single" items={[{ label:
 *  "Day" }, { label: "Week" }]} />`. */
export const ButtonGroup = withEngine(ButtonGroupImpl, "ButtonGroup");
