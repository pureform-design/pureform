// The autocomplete: the select's field with an editable input, whose trailing arrow turns while
// its list is open. Typing opens the list of the suggestions its text matches, under the field,
// over the page through the portal host (not a `Modal`, which would take the keyboard's focus
// from the input); pressing the arrow opens or closes it. Choosing one sets the value and the
// text to its label and closes it, as do a press outside, the back button, and Escape.

import { autocompleteAnatomy } from "@pureform/anatomy";
import type { TestIdOverride } from "@pureform/anatomy";
import {
    autocompleteMatches,
    autocompleteMenuSelection,
    autocompleteSelection,
    isPresent,
} from "@pureform/binding-core";
import type {
    AutocompleteFilter,
    AutocompleteItem,
    AutocompletePart,
    AutocompleteVariantProps,
    ChangeDetails,
    IndicationProps,
    TextFieldAffixProps,
} from "@pureform/binding-core";
import { useId, useState } from "react";
import type { ReactNode } from "react";
import { Pressable, View } from "react-native";

import { Menu } from "../menu/menu";
import { Anchored, useFieldPopup } from "../overlay";
import { useControllable } from "../parts";
import { Portal } from "../portal";
import { useEngine } from "../provider";
import { Field, partId } from "../text-input";
import type { FieldProps } from "../text-input";

export interface AutocompleteProps
    extends
        Omit<
            AutocompleteVariantProps,
            "leadingIcon" | "prefixText" | "suffixText"
        >,
        TextFieldAffixProps<ReactNode>,
        IndicationProps,
        Omit<FieldProps, "value" | "defaultValue" | "onValueChange"> {
    readonly items: readonly AutocompleteItem[];
    /** The chosen suggestion's value, `null` for none. Controlled when defined. */
    readonly value?: string | null | undefined;
    readonly defaultValue?: string | null | undefined;
    readonly onValueChange?:
        | ((details: ChangeDetails<"value", string | null>) => void)
        | undefined;
    /** The typed text. Controlled when defined. */
    readonly inputValue?: string | undefined;
    readonly defaultInputValue?: string | undefined;
    readonly onInputValueChange?:
        | ((details: ChangeDetails<"inputValue", string>) => void)
        | undefined;
    /** Whether the list is open. Controlled when defined. */
    readonly open?: boolean | undefined;
    readonly defaultOpen?: boolean | undefined;
    readonly onOpenChange?:
        | ((details: ChangeDetails<"open", boolean>) => void)
        | undefined;
    /** Which suggestions the typed text keeps. `false` keeps all (the app filters `items`).
     *  @default labels containing the text, ignoring case */
    readonly filter?: AutocompleteFilter | false | undefined;
    /** An error message: marks the field invalid and replaces the supporting text. */
    readonly error?: string | undefined;
    /** The arrow's name, for assistive technology. @default "Show suggestions" */
    readonly toggleLabel?: string | undefined;
    readonly testId?: TestIdOverride<AutocompletePart> | undefined;
}

// The list grows from the field's side, as the web's grows from its positioner's origin.
const MENU_ORIGIN = { transformOrigin: "top left" } as const;
const POSITIONING = { sameWidth: true } as const;

/** Material's editable exposed dropdown:
 *  `<Autocomplete label="City" items={cities} onValueChange={…} />`. */
export function Autocomplete(props: AutocompleteProps): ReactNode {
    const {
        items,
        value: _value,
        defaultValue: _defaultValue,
        onValueChange,
        inputValue: _inputValue,
        defaultInputValue,
        onInputValueChange,
        open: _open,
        defaultOpen,
        onOpenChange,
        filter,
        error,
        toggleLabel,
        testId,
        indication,
        variant: _variant,
        color: _color,
        density: _density,
        tokens: _tokens,
        ...field
    } = props;
    const [value, setValue] = useControllable<"value", string | null>(
        "Autocomplete",
        "value",
        props.value,
        props.defaultValue,
        onValueChange,
        null,
    );
    const [text, setText] = useControllable(
        "Autocomplete",
        "inputValue",
        props.inputValue,
        defaultInputValue ??
            items.find((item) => item.value === props.defaultValue)?.label,
        onInputValueChange,
        "",
    );
    const [open, setOpen] = useControllable(
        "Autocomplete",
        "open",
        props.open,
        defaultOpen,
        onOpenChange,
        false,
    );
    const engine = useEngine();
    const { presence, container, anchor, show, close, trigger } = useFieldPopup(
        open,
        setOpen,
    );
    // The list filters by what the user typed only, as the web's does: the text starting as the
    // chosen suggestion's label, or set to one, shows every suggestion.
    const [typed, setTyped] = useState("");
    const matches = autocompleteMatches(items, typed, filter);
    const disabled = props.disabled || props.readOnly;
    // The list the combobox controls, while it shows.
    const listId = useId();
    const listShown = open && presence.present && anchor !== undefined;
    return (
        <View>
            <Field
                {...field}
                {...(error === undefined
                    ? {}
                    : { invalid: true, supportingText: error })}
                name="autocomplete"
                selection={autocompleteSelection({
                    ...props,
                    leadingIcon: isPresent(props.leadingIcon),
                    prefixText: isPresent(props.prefixText),
                    suffixText: isPresent(props.suffixText),
                })}
                testId={(part) => partId(autocompleteAnatomy, part, testId)}
                trailingIcon={props.trailingIcon ?? "▾"}
                inputProps={{
                    role: "combobox",
                    // Expanded once the list shows, which then names it.
                    "aria-expanded": listShown,
                    ...(listShown ? { "aria-controls": listId } : {}),
                    ...props.inputProps,
                }}
                value={text}
                onValueChange={(details) => {
                    setText(details.value);
                    setTyped(details.value);
                    show();
                }}
                expanded={open}
                container={container}
            />
            {/* The arrow, over the field's trailing icon (which takes no presses itself). */}
            <Pressable
                role="button"
                aria-label={toggleLabel ?? "Show suggestions"}
                aria-expanded={open}
                disabled={disabled}
                onLayout={trigger.onLayout}
                onPress={() => (open ? close() : show())}
                style={trigger.style}
            />
            {presence.present && anchor ? (
                <Portal layer="menu">
                    <Anchored
                        anchor={anchor}
                        positioning={POSITIONING}
                        placement="bottom-start"
                        gutter={0}
                        onPressOutside={close}
                    >
                        {() => (
                            <engine.View
                                {...presence.props}
                                nativeID={listId}
                                style={{
                                    // A closing list takes no more presses.
                                    pointerEvents: open ? "auto" : "none",
                                    ...MENU_ORIGIN,
                                    ...presence.style,
                                }}
                            >
                                {matches.length > 0 ? (
                                    <Menu
                                        {...autocompleteMenuSelection({
                                            color: props.color,
                                            density: props.density,
                                        })}
                                        items={matches}
                                        {...(indication === undefined
                                            ? {}
                                            : { indication })}
                                        value={value}
                                        onSelect={(details) => {
                                            const item = items.find(
                                                (entry) =>
                                                    entry.value ===
                                                    details.value,
                                            );
                                            if (details.value !== value)
                                                setValue(details.value);
                                            if (item && item.label !== text)
                                                setText(item.label);
                                            setTyped("");
                                            close();
                                        }}
                                    />
                                ) : null}
                            </engine.View>
                        )}
                    </Anchored>
                </Portal>
            ) : null}
        </View>
    );
}
