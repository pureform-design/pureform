// The search bar: a pressable root holding its leading icon, the input, and its trailing icon.
// Its interaction source hears the root's hover and press and the input's focus, which always
// shows, as a text field's does; it reads its text as a filled input. It has no ripple: the
// field draws its own state.

import { searchBarAnatomy } from "@pureform/anatomy";
import type { TestIdOverride } from "@pureform/anatomy";
import { searchBarSelection } from "@pureform/binding-core";
import type {
    ChangeDetails,
    SearchBarContentProps,
    SearchBarPart,
    SearchBarVariantProps,
} from "@pureform/binding-core";
import type { ReactNode } from "react";

import { iconParts } from "../icon-style";
import { interactionStates, useInteraction } from "../interaction";
import { testIdOf, useControllable, withEngine } from "../parts";
import { nativeSlots, withUnselectable } from "../slot-props";
import type { NativeSlotProps } from "../slot-props";
import { useComponentSlots } from "../styles";

/** What each part renders as, for its keyed `style` and `slotProps`. */
export interface SearchBarHosts {
    readonly trailing: "View";
    readonly leading: "View";
    readonly root: "Pressable";
    readonly input: "TextInput";
}

export interface SearchBarProps
    extends
        SearchBarVariantProps,
        SearchBarContentProps<ReactNode>,
        NativeSlotProps<SearchBarHosts> {
    /** The text. Controlled when defined. */
    readonly value?: string | undefined;
    readonly defaultValue?: string | undefined;
    readonly onValueChange?:
        | ((details: ChangeDetails<"value", string>) => void)
        | undefined;
    /** What shows while it's empty, and its name for assistive technology. Default "Search". */
    readonly placeholder?: string | undefined;
    readonly disabled?: boolean | undefined;
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
    const slots = useComponentSlots<SearchBarPart>(
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
    const { styles: s, selected, views: v } = slots;
    const {
        onFocus: _focus,
        onBlur: _blur,
        ...handlers
    } = interaction.handlers;
    const placeholder = props.placeholder ?? "Search";
    const id = (part: SearchBarPart) =>
        testIdOf(searchBarAnatomy, part, props.testId);
    const slot = nativeSlots(props);
    const icon = iconParts(slots, id, slot);
    return (
        <v.root.Pressable
            {...slot.props("root")}
            {...slot.with("root", handlers)}
            disabled={props.disabled}
            style={slot.style("root", withUnselectable(s.root))}
            testID={id("root")}
        >
            {icon("leading", props.leading)}
            <v.input.TextInput
                {...slot.props("input")}
                value={value}
                onChangeText={slot.on("input", "onChangeText", setValue)}
                onFocus={slot.on("input", "onFocus", () =>
                    interaction.emitter.focus(true),
                )}
                onBlur={slot.on("input", "onBlur", () =>
                    interaction.emitter.blur(),
                )}
                editable={!props.disabled}
                placeholder={placeholder}
                // A placeholder's color is a prop, so it takes the plain value.
                placeholderTextColor={String(
                    selected.styles.input?.color ?? "",
                )}
                aria-label={placeholder}
                style={slot.style("input", s.input)}
                testID={id("input")}
            />
            {icon("trailing", props.trailing)}
        </v.root.Pressable>
    );
}

/** Material's search bar: `<SearchBar leading={<Glyph glyph="⌕" />} onValueChange={…} />`. */
export const SearchBar = withEngine(SearchBarImpl, "SearchBar");
