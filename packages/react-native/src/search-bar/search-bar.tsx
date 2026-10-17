// The search bar: a pressable root holding its leading icon, the input, and its trailing icon.
// It tracks the input's focus and text, which it reads as focus and a filled input.

import { searchBarAnatomy } from "@pureform/anatomy";
import type { TestIdOverride } from "@pureform/anatomy";
import { isPresent, searchBarSelection } from "@pureform/binding-core";
import type {
    ChangeDetails,
    SearchBarContentProps,
    SearchBarPart,
    SearchBarVariantProps,
} from "@pureform/binding-core";
import { useState } from "react";
import type { ReactNode } from "react";
import type { TextInputProps } from "react-native";

import { IconSlot, iconSlot } from "../icon-style";
import {
    testIdOf,
    unselectable,
    useControllable,
    usePress,
    withEngine,
} from "../parts";
import { useEngine } from "../provider";
import { useComponentSlots } from "../styles";

export interface SearchBarProps
    extends SearchBarVariantProps, SearchBarContentProps<ReactNode> {
    /** The text. Controlled when defined. */
    readonly value?: string | undefined;
    readonly defaultValue?: string | undefined;
    readonly onValueChange?:
        | ((details: ChangeDetails<"value", string>) => void)
        | undefined;
    /** What shows while it's empty, and its name for assistive technology. Default "Search". */
    readonly placeholder?: string | undefined;
    readonly disabled?: boolean | undefined;
    readonly inputProps?: TextInputProps | undefined;
    readonly testId?: TestIdOverride<SearchBarPart> | undefined;
}

function SearchBarImpl(props: SearchBarProps): ReactNode {
    const engine = useEngine();
    const [focused, setFocused] = useState(false);
    const [value, setValue] = useControllable(
        "SearchBar",
        "value",
        props.value,
        props.defaultValue,
        props.onValueChange,
        "",
    );
    const { state, handlers } = usePress({
        ...(props.disabled ? { disabled: true } : {}),
        ...(props.mirrorLeading || props.mirrorTrailing
            ? { mirrored: true }
            : {}),
    });
    const { styles: s, selected } = useComponentSlots(
        "searchBar",
        searchBarSelection(props),
        {
            ...state,
            focus: focused,
            focusVisible: focused,
            filled: value !== "",
        },
    );
    const placeholder = props.placeholder ?? "Search";
    const id = (part: SearchBarPart) =>
        testIdOf(searchBarAnatomy, part, props.testId);
    const icon = (part: "leading" | "trailing", node: ReactNode) =>
        isPresent(node) ? (
            <engine.View style={s[part]} testID={id(part)}>
                <IconSlot {...iconSlot(selected, part)} motion={s[part]}>
                    {node}
                </IconSlot>
            </engine.View>
        ) : null;
    return (
        <engine.Pressable
            {...handlers}
            onFocus={undefined}
            onBlur={undefined}
            disabled={props.disabled}
            style={{ ...s.root, ...unselectable }}
            testID={id("root")}
        >
            {icon("leading", props.leading)}
            <engine.TextInput
                {...props.inputProps}
                value={value}
                onChangeText={setValue}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                editable={!props.disabled}
                placeholder={placeholder}
                // A placeholder's color is a prop, so it takes the plain value.
                placeholderTextColor={String(
                    selected.styles.input?.color ?? "",
                )}
                aria-label={placeholder}
                style={s.input}
                testID={id("input")}
            />
            {icon("trailing", props.trailing)}
        </engine.Pressable>
    );
}

/** Material's search bar: `<SearchBar leading={<Glyph glyph="⌕" />} onValueChange={…} />`. */
export const SearchBar = withEngine(SearchBarImpl, "SearchBar");
