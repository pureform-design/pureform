// The autocomplete: the select's field with an editable input, whose trailing arrow turns while
// its list is open. Typing opens the list of the suggestions its text matches, under the field,
// over the page through the portal host (not a `Modal`, which would take the keyboard's focus
// from the input); pressing the arrow opens or closes it. Choosing one sets the value and the
// text to its label and closes it, as do a press outside, the back button, and Escape. As WAI-ARIA
// APG's list autocomplete, the input is a combobox controlling a listbox of the suggestions as
// options; focus stays in the input, and on a keyboard the down and up arrows open the list and
// highlight the next or previous option (the input's `aria-activedescendant`, the option saying
// `aria-selected`), Enter chooses the highlighted one, Alt with the down arrow opens the list and
// with the up arrow closes it.

import { autocompleteAnatomy } from "@pureform/anatomy";
import type { TestIdOverride } from "@pureform/anatomy";
import {
    autocompleteMatches,
    autocompleteMenuSelection,
    autocompleteSelection,
    isPresent,
    selectItemGroups,
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

import { MenuListbox } from "../menu/menu";
import type { MenuProps } from "../menu/menu";
import { Anchored, useFieldPopup } from "../overlay";
import { useControllable } from "../parts";
import { Portal } from "../portal";
import { useEngine } from "../provider";
import type { InnerPropsOf } from "../slot-props";
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
    /** The menu's `style`, `slotProps`, `tokens` and `testId`. */
    readonly menuProps?: InnerPropsOf<MenuProps> | undefined;
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
        menuProps,
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
    // The matches by group, as the select's options are: a run outside any group is unlabelled.
    // The arrow keys and option ids keep walking `matches`, which holds the same order.
    const groups = selectItemGroups(matches).map((run, index) => ({
        id: run.group ?? `ungrouped-${index}`,
        label: run.group,
        items: run.items,
    }));
    const grouped = groups.some((run) => run.label !== undefined);
    // The suggestions as drawn, which the arrow keys walk: grouped ones sit together.
    const drawn = grouped ? groups.flatMap((run) => run.items) : matches;
    const disabled = props.disabled || props.readOnly;
    // The list the combobox controls, while it shows.
    const listId = useId();
    const listShown = open && presence.present && anchor !== undefined;
    // The option the keys highlight, while the list shows.
    const [highlighted, setHighlighted] = useState<string>();
    const active = listShown
        ? matches.find((item) => item.value === highlighted)?.value
        : undefined;
    const optionId = (value: string) =>
        `${listId}-${matches.findIndex((item) => item.value === value)}`;
    const choose = (chosen: string) => {
        const item = items.find((entry) => entry.value === chosen);
        if (chosen !== value) setValue(chosen);
        if (item && item.label !== text) setText(item.label);
        setTyped("");
        setHighlighted(undefined);
        close();
    };
    const step = (by: 1 | -1) => {
        if (drawn.length === 0) return;
        const at = drawn.findIndex((item) => item.value === active);
        const next =
            at < 0
                ? by === 1
                    ? 0
                    : drawn.length - 1
                : (at + by + drawn.length) % drawn.length;
        setHighlighted(drawn[next]!.value);
    };
    const onKeyPress = (event: {
        nativeEvent: { key: string; altKey?: boolean };
        preventDefault?(): void;
    }) => {
        const { key, altKey } = event.nativeEvent;
        if (disabled) return;
        if (key === "ArrowDown" || key === "ArrowUp") {
            event.preventDefault?.();
            if (altKey) {
                if (key === "ArrowDown") show();
                else close();
                return;
            }
            if (!open) show();
            step(key === "ArrowDown" ? 1 : -1);
        } else if (key === "Enter" && active !== undefined) {
            event.preventDefault?.();
            choose(active);
        }
    };
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
                    // React Native Web writes these; React Native's types leave them out.
                    ...({ "aria-autocomplete": "list" } as object),
                    ...(listShown ? { "aria-controls": listId } : {}),
                    ...(active === undefined
                        ? {}
                        : { "aria-activedescendant": optionId(active) }),
                    onKeyPress,
                }}
                value={text}
                onValueChange={(details) => {
                    setText(details.value);
                    setTyped(details.value);
                    setHighlighted(undefined);
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
                                style={{
                                    // A closing list takes no more presses.
                                    pointerEvents: open ? "auto" : "none",
                                    ...MENU_ORIGIN,
                                    ...presence.style,
                                }}
                            >
                                {matches.length > 0 ? (
                                    <MenuListbox
                                        {...menuProps}
                                        {...autocompleteMenuSelection({
                                            color: props.color,
                                            density: props.density,
                                        })}
                                        listbox={{
                                            id: listId,
                                            active: {
                                                value: active,
                                                idOf: optionId,
                                            },
                                        }}
                                        {...(typeof props.label === "string"
                                            ? { "aria-label": props.label }
                                            : {})}
                                        {...(grouped
                                            ? { groups, grouped: false }
                                            : { items: matches })}
                                        {...(indication === undefined
                                            ? {}
                                            : { indication })}
                                        value={value}
                                        onSelect={(details) =>
                                            choose(details.value)
                                        }
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
