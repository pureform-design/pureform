// The search bar: a pressable root holding its leading icon, the input, and its trailing icon.
// Its interaction source hears the root's hover and press and the input's focus, which always
// shows, as a text field's does; it reads its text as a filled input. It has no ripple: the
// field draws its own state.

import { searchBarAnatomy } from "@pureform/anatomy";
import type { TestIdOverride } from "@pureform/anatomy";
import { isPresent, searchBarSelection } from "@pureform/binding-core";
import type {
    ChangeDetails,
    SearchBarContentProps,
    SearchBarPart,
    SearchBarVariantProps,
} from "@pureform/binding-core";
import type { ReactNode } from "react";
import type { TextInputProps } from "react-native";

import { IconSlot, iconSlot } from "../icon-style";
import { interactionStates, useInteraction } from "../interaction";
import { testIdOf, unselectable, useControllable, withEngine } from "../parts";
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
    const [value, setValue] = useControllable(
        "SearchBar",
        "value",
        props.value,
        props.defaultValue,
        props.onValueChange,
        "",
    );
    const { interaction, state } = useInteraction(undefined, props.disabled);
    const {
        styles: s,
        selected,
        views: v,
    } = useComponentSlots<SearchBarPart>(
        "searchBar",
        searchBarSelection(props),
        {
            ...interactionStates(state, {
                ...(props.disabled ? { disabled: true } : {}),
                ...(props.mirrorLeading || props.mirrorTrailing
                    ? { mirrored: true }
                    : {}),
            }),
            filled: value !== "",
        },
    );
    const {
        onFocus: _focus,
        onBlur: _blur,
        ...handlers
    } = interaction.handlers;
    const placeholder = props.placeholder ?? "Search";
    const id = (part: SearchBarPart) =>
        testIdOf(searchBarAnatomy, part, props.testId);
    const icon = (part: "leading" | "trailing", node: ReactNode) => {
        const Slot = v[part];
        return isPresent(node) ? (
            <Slot.View style={s[part]} testID={id(part)}>
                <IconSlot {...iconSlot(selected, part)} motion={s[part]}>
                    {node}
                </IconSlot>
            </Slot.View>
        ) : null;
    };
    return (
        <v.root.Pressable
            {...handlers}
            disabled={props.disabled}
            style={{ ...s.root, ...unselectable }}
            testID={id("root")}
        >
            {icon("leading", props.leading)}
            <v.input.TextInput
                {...props.inputProps}
                value={value}
                onChangeText={setValue}
                onFocus={() => interaction.emitter.focus(true)}
                onBlur={() => interaction.emitter.blur()}
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
        </v.root.Pressable>
    );
}

/** Material's search bar: `<SearchBar leading={<Glyph glyph="⌕" />} onValueChange={…} />`. */
export const SearchBar = withEngine(SearchBarImpl, "SearchBar");
