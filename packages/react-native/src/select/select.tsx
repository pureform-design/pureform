// The select: a field that takes no typing, whose trailing arrow turns while its list is open.
// Pressing it opens a list of its items below it, over the page in a `Modal`; picking one closes
// it. The list grows in and fades out as on the web, and the `Modal` closes once it's gone. To
// assistive technology it's a select-only combobox (APG) controlling a listbox of options. On the
// web its keys are the web's select's: Enter, Space, and the arrow keys up and down open the list
// on the chosen option; the arrow keys sideways (by direction), Home and End choose without
// opening it; in the list the arrow keys, Home and End move, Enter and Space choose, and Escape
// and Tab close it, focus going back to the field.

import { selectAnatomy } from "@pureform/anatomy";
import type { TestIdOverride } from "@pureform/anatomy";
import {
    isPresent,
    selectItemGroups,
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
import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Modal, Platform, Pressable, StyleSheet, View } from "react-native";

import { isTypedKey, MenuKeys, MenuListbox, typeahead } from "../menu/menu";
import type { MenuProps } from "../menu/menu";
import { useControllable } from "../parts";
import { usePresence } from "../presence";
import { useDirection, useEngine } from "../provider";
import type { InnerPropsOf } from "../slot-props";
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
    // oxlint-disable-next-line react/refs -- keeps a picked item's label while it's out of the items, until the value changes
    if (found) kept.current = found;
    // oxlint-disable-next-line react/refs -- keeps a picked item's label while it's out of the items, until the value changes
    else if (kept.current?.value !== value) kept.current = null;
    // oxlint-disable-next-line react/refs -- keeps a picked item's label while it's out of the items, until the value changes
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
    /** The menu's `style`, `slotProps`, `tokens` and `testId`. */
    readonly menuProps?: InnerPropsOf<MenuProps> | undefined;
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
        menuProps,
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
    const combobox = useRef<{ focus?(): void }>(null);
    // On the web, focus goes back to the field once the list is gone.
    const refocus = useRef(false);
    const close = () => {
        setExpanded(false);
        refocus.current = Platform.OS === "web";
    };
    const rtl = useDirection() === "rtl";
    // The enabled options in order, for the keys that choose without opening the list.
    const choosable = items.filter((item) => !item.disabled);
    const chooseAt = (at: (index: number) => number) => {
        const index = choosable.findIndex((item) => item.value === value);
        const next = choosable[at(index)];
        if (next && next.value !== value) setValue(next.value);
    };
    // Typed on the field: the list opens on the first option starting with it (WAI-ARIA APG's
    // select-only combobox).
    const [search, setSearch] = useState<string>();
    const typed = useRef(typeahead());
    const onFieldKey = (event: {
        nativeEvent: {
            key: string;
            altKey?: boolean;
            ctrlKey?: boolean;
            metaKey?: boolean;
        };
        preventDefault(): void;
    }) => {
        if (props.disabled || expanded) return;
        const { key } = event.nativeEvent;
        if (isTypedKey(event.nativeEvent)) {
            event.preventDefault();
            setSearch(typed.current(key));
            open();
            return;
        }
        const forward = rtl ? "ArrowLeft" : "ArrowRight";
        const back = rtl ? "ArrowRight" : "ArrowLeft";
        if (key === " " || key === "ArrowDown" || key === "ArrowUp") {
            setSearch(undefined);
            open();
        } else if (key === forward)
            chooseAt((index) => Math.min(index + 1, choosable.length - 1));
        else if (key === back) chooseAt((index) => Math.max(index - 1, 0));
        else if (key === "Home") chooseAt(() => 0);
        else if (key === "End") chooseAt(() => choosable.length - 1);
        else return;
        event.preventDefault();
    };
    useEffect(() => {
        if (presence.present || !refocus.current) return undefined;
        refocus.current = false;
        // After the `Modal` lets go: its focus trap holds focus while it's mounted, and may hand
        // it back to the page a frame later, so it's checked again then.
        let frame = requestAnimationFrame(() => {
            combobox.current?.focus?.();
            frame = requestAnimationFrame(() => {
                const field = combobox.current as unknown;
                if (globalThis.document?.activeElement !== field)
                    combobox.current?.focus?.();
            });
        });
        return () => cancelAnimationFrame(frame);
    }, [presence.present]);
    const shown = useShownLabel(items, value);
    // The options by group: a run outside any group goes unlabelled.
    const groups = useMemo(
        () =>
            selectItemGroups(items).map((run, index) => ({
                id: run.group ?? `ungrouped-${index}`,
                label: run.group,
                items: run.items,
            })),
        [items],
    );
    const grouped = groups.some((run) => run.label !== undefined);
    // The list the combobox controls, while it shows.
    const listId = useId();
    // React Native Web draws the `Modal` as a `role="dialog"`, which needs a name.
    const windowName =
        Platform.OS === "web" && typeof props.label === "string"
            ? ({ "aria-label": props.label } as object)
            : {};
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
                ref={combobox as never}
                // oxlint-disable-next-line jsx-a11y/role-has-required-aria-props -- aria-controls is spread in below while the menu is shown
                role="combobox"
                {...(typeof props.label === "string"
                    ? { "aria-label": props.label }
                    : {})}
                aria-expanded={expanded}
                {...(expanded && presence.present && menu
                    ? { "aria-controls": listId }
                    : {})}
                disabled={props.disabled}
                onPress={() => {
                    setSearch(undefined);
                    open();
                }}
                {...(Platform.OS === "web"
                    ? ({ onKeyDown: onFieldKey } as object)
                    : {})}
                style={StyleSheet.absoluteFill}
            />
            <Modal
                transparent
                visible={presence.present && menu !== undefined}
                onRequestClose={close}
                {...windowName}
            >
                <Pressable
                    accessible={false}
                    focusable={false}
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
                        <MenuKeys
                            // oxlint-disable-next-line jsx-a11y/no-autofocus -- an opened menu takes focus, as the menu pattern asks
                            autoFocus
                            search={search}
                            onKey={(key) => {
                                if (key === "Tab") close();
                                return false;
                            }}
                        >
                            <MenuListbox
                                {...menuProps}
                                listbox={{ id: listId }}
                                {...(typeof props.label === "string"
                                    ? { "aria-label": props.label }
                                    : {})}
                                {...selectMenuSelection({
                                    color: props.color,
                                    density: props.density,
                                })}
                                {...(grouped
                                    ? { groups, grouped: false }
                                    : { items })}
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
                        </MenuKeys>
                    </engine.View>
                ) : null}
            </Modal>
        </View>
    );
}
