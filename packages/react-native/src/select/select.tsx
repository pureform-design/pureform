// The select: a field that takes no typing, whose trailing arrow turns while its menu is open.
// Pressing it opens a menu of its items below it, over the page in a `Modal`; picking one closes
// it. The menu grows in and fades out as on the web, and the `Modal` closes once it's gone.

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
    TextFieldAffixProps,
} from "@pureform/binding-core";
import { useRef, useState } from "react";
import type { ReactNode } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";

import { Menu } from "../menu/menu";
import { useControllable } from "../parts";
import { usePresence } from "../presence";
import { useEngine } from "../provider";
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

// The picked item's label. An item that leaves `items` while it's picked keeps its label until
// the value changes, as Zag's select keeps it on the web; a value that's in no item shows none.
const useShownLabel = (
    items: readonly SelectItem[],
    value: string | null,
): string => {
    const kept = useRef<SelectItem | null>(null);
    const found = items.find((item) => item.value === value);
    if (found) kept.current = found;
    else if (kept.current?.value !== value) kept.current = null;
    return kept.current?.label ?? "";
};

export interface SelectProps
    extends
        Omit<SelectVariantProps, "leadingIcon" | "prefixText" | "suffixText">,
        TextFieldAffixProps<ReactNode>,
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

// The menu grows from the field's side, as the web's grows from its positioner's origin.
const MENU_ORIGIN = { transformOrigin: "top left" } as const;

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
    const engine = useEngine();
    const [menu, setMenu] = useState<{
        left: number;
        top: number;
        width: number;
    }>();
    const [expanded, setExpanded] = useState(false);
    const presence = usePresence(expanded, "popup");
    const container = useRef<Measurable>(null);
    const open = () =>
        container.current?.measureInWindow((left, top, width, height) => {
            setMenu({ left, top: top + height, width });
            setExpanded(true);
        });
    const close = () => setExpanded(false);
    const shown = useShownLabel(items, value);
    return (
        <View>
            <Field
                {...field}
                name="select"
                selection={selectSelection({
                    ...props,
                    leadingIcon: isPresent(props.leadingIcon),
                    prefixText: isPresent(props.prefixText),
                    suffixText: isPresent(props.suffixText),
                })}
                testId={(part) => partId(selectAnatomy, part, testId)}
                trailingIcon={props.trailingIcon ?? "▾"}
                value={shown}
                display
                expanded={expanded}
                container={container}
            />
            <Pressable
                role="combobox"
                {...(typeof props.label === "string"
                    ? { "aria-label": props.label }
                    : {})}
                aria-expanded={expanded}
                disabled={props.disabled}
                onPress={open}
                style={StyleSheet.absoluteFill}
            />
            <Modal
                transparent
                visible={presence.present && menu !== undefined}
                onRequestClose={close}
            >
                <Pressable
                    aria-label="Close"
                    style={StyleSheet.absoluteFill}
                    onPress={close}
                />
                {presence.present && menu ? (
                    <engine.View
                        {...presence.props}
                        style={{
                            position: "absolute",
                            ...menu,
                            // A closing menu takes no more presses.
                            pointerEvents: expanded ? "auto" : "none",
                            ...MENU_ORIGIN,
                            ...presence.style,
                        }}
                    >
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
                                close();
                            }}
                        />
                    </engine.View>
                ) : null}
            </Modal>
        </View>
    );
}
