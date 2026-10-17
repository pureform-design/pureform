// The select: a field that takes no typing, whose trailing arrow turns while its menu is open.
// Pressing it opens a menu of its items below it, over the page in a `Modal`; picking one closes
// it.

import { selectAnatomy } from "@pureform/anatomy";
import type { TestIdOverride } from "@pureform/anatomy";
import {
    isPresent,
    selectMenuSelection,
    selectSelection,
} from "@pureform/binding-core";
import type {
    ChangeDetails,
    IndicationProps,
    SelectItem,
    SelectPart,
    SelectVariantProps,
} from "@pureform/binding-core";
import { useRef, useState } from "react";
import type { ReactNode } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";

import { Menu } from "../menu/menu";
import { useControllable } from "../parts";
import { Field, partId } from "../text-input";
import type { FieldProps } from "../text-input";

// A view, read for where it sits on screen.
interface Measurable {
    measureInWindow: (
        done: (
            left: number,
            top: number,
            width: number,
            height: number,
        ) => void,
    ) => void;
}

export interface SelectProps
    extends
        Omit<SelectVariantProps, "leadingIcon">,
        IndicationProps,
        Omit<
            FieldProps,
            "value" | "defaultValue" | "onValueChange" | "inputProps"
        > {
    readonly items: readonly SelectItem[];
    /** The picked item's value, `null` for none. Controlled when defined. */
    readonly value?: string | null | undefined;
    readonly defaultValue?: string | null | undefined;
    readonly onValueChange?:
        | ((details: ChangeDetails<"value", string | null>) => void)
        | undefined;
    readonly testId?: TestIdOverride<SelectPart> | undefined;
}

/** Material's select: `<Select label="Size" items={sizes} defaultValue="m" />`. */
export function Select(props: SelectProps): ReactNode {
    const {
        items,
        value: _value,
        defaultValue: _defaultValue,
        onValueChange,
        testId,
        indication,
        ...field
    } = props;
    const [value, setValue] = useControllable<"value", string | null>(
        "Select",
        "value",
        props.value,
        props.defaultValue,
        onValueChange,
        null,
    );
    const [menu, setMenu] = useState<{
        left: number;
        top: number;
        width: number;
    }>();
    const container = useRef<Measurable>(null);
    const open = () =>
        container.current?.measureInWindow((left, top, width, height) =>
            setMenu({ left, top: top + height, width }),
        );
    const shown = items.find((item) => item.value === value)?.label ?? "";
    return (
        <View>
            <Field
                {...field}
                name="select"
                selection={selectSelection({
                    ...props,
                    leadingIcon: isPresent(props.leadingIcon),
                })}
                testId={(part) => partId(selectAnatomy, part, testId)}
                trailingIcon={props.trailingIcon ?? "▾"}
                value={shown}
                display
                expanded={menu !== undefined}
                container={container}
            />
            <Pressable
                role="combobox"
                {...(typeof props.label === "string"
                    ? { "aria-label": props.label }
                    : {})}
                aria-expanded={menu !== undefined}
                disabled={props.disabled}
                onPress={open}
                style={StyleSheet.absoluteFill}
            />
            <Modal
                transparent
                visible={menu !== undefined}
                onRequestClose={() => setMenu(undefined)}
            >
                <Pressable
                    aria-label="Close"
                    style={StyleSheet.absoluteFill}
                    onPress={() => setMenu(undefined)}
                />
                {menu ? (
                    <View style={{ position: "absolute", ...menu }}>
                        <Menu
                            {...selectMenuSelection({
                                color: props.color,
                                density: props.density,
                            })}
                            items={items}
                            {...(indication === undefined
                                ? {}
                                : { indication })}
                            value={value}
                            onSelect={(details) => {
                                if (details.value !== value)
                                    setValue(details.value);
                                setMenu(undefined);
                            }}
                        />
                    </View>
                ) : null}
            </Modal>
        </View>
    );
}
