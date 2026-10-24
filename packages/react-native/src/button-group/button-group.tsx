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
    InnerProps,
    ButtonGroupContentProps,
    ButtonGroupPart,
    ButtonGroupRootOwnProps,
} from "@pureform/binding-core";
import type { ReactNode } from "react";

import { Button } from "../button/button";
import type { ButtonProps } from "../button/button";
import { IconButton } from "../icon-button/icon-button";
import type { IconButtonProps } from "../icon-button/icon-button";
import { testIdOf, useControllable, withEngine } from "../parts";
import { useComponentSlots } from "../styles";

export interface ButtonGroupProps
    extends
        Omit<ButtonGroupRootOwnProps, "unstyled">,
        ButtonGroupContentProps<ReactNode> {
    readonly "aria-label"?: string | undefined;
    /** Every labelled button's `tokens` and `testId`; an item's own `testId` wins. */
    readonly buttonProps?:
        | InnerProps<Pick<ButtonProps, "tokens" | "testId">>
        | undefined;
    /** The same for every icon-only button. */
    readonly iconButtonProps?:
        | InnerProps<Pick<IconButtonProps, "tokens" | "testId">>
        | undefined;
}

function ButtonGroupImpl(props: ButtonGroupProps): ReactNode {
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
    return (
        <v.root.View
            role="group"
            {...(props["aria-label"] === undefined
                ? {}
                : { "aria-label": props["aria-label"] })}
            style={s.root}
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
                        {...(props.iconButtonProps as object)}
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
                        {...(props.buttonProps as object)}
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
