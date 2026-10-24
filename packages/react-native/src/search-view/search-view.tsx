// The search view: a trigger (a read-only search bar showing the query, by default) that opens
// the view, in a `Modal`: a header with a back icon button, the query's input, and a clear icon
// button while there's a query, then a divider and the suggestions the query matches, drawn as
// the menu's items. A `Modal` is a window of its own on a device, which takes the back button,
// keeps assistive technology and touches inside, and on the web traps focus and gives it back to
// the trigger as it closes. `fullScreen` fills it; `docked` and `contained` sit over the
// trigger's place, measured as it opens, as the select's menu sits under its field. The web's
// contained view moves its icons outward as it opens, by keyframes; React Native draws no motion
// there.

import { compositeTestIds, searchViewAnatomy } from "@pureform/anatomy";
import type { PartName, TestIdOverride } from "@pureform/anatomy";
import {
    isPresent,
    opensSearchView,
    searchViewCarriedKey,
    searchViewLabel,
    searchViewMatches,
    searchViewMenuSelection,
    searchViewSelection,
} from "@pureform/binding-core";
import type {
    ChangeDetails,
    IndicationProps,
    SearchViewContentProps,
    SearchViewItem,
    SearchViewSelectDetails,
    SearchViewSubmitDetails,
    SearchViewVariantProps,
    AutocompleteFilter,
} from "@pureform/binding-core";
import { useId, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { IconButton } from "../icon-button/icon-button";
import { MenuItems } from "../menu/menu";
import { ModalWindow, modalViewProps, useModalOverlay } from "../modal";
import { testIdOf, useControllable, useStableCallback } from "../parts";
import { useEngine } from "../provider";
import { SearchBar } from "../search-bar/search-bar";
import { useComponentSlots } from "../styles";

/** The view's parts this binding renders. */
type Part = PartName<typeof searchViewAnatomy>;

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

/** What a search view gives the trigger it renders. */
export interface SearchViewTriggerProps {
    /** Opens the view. */
    readonly onPress: () => void;
    readonly "aria-haspopup": "dialog";
    /** Whether the view is open. */
    readonly "aria-expanded": boolean;
    /** The query. */
    readonly value: string;
}

export interface SearchViewProps
    extends
        SearchViewVariantProps,
        IndicationProps,
        Omit<SearchViewContentProps<ReactNode>, "trigger"> {
    /** What opens it, rendered in place. @default a read-only `SearchBar` showing the query */
    readonly trigger?:
        | ReactNode
        | ((trigger: SearchViewTriggerProps) => ReactNode);
    /** Whether the view is open. Controlled when defined. */
    readonly open?: boolean | undefined;
    readonly defaultOpen?: boolean | undefined;
    readonly onOpenChange?:
        | ((details: ChangeDetails<"open", boolean>) => void)
        | undefined;
    /** The query. Controlled when defined. */
    readonly inputValue?: string | undefined;
    readonly defaultInputValue?: string | undefined;
    readonly onInputValueChange?:
        | ((details: ChangeDetails<"inputValue", string>) => void)
        | undefined;
    /** The suggestions, in order; the view shows those `filter` keeps. */
    readonly items?: readonly SearchViewItem[] | undefined;
    /** Which suggestions the query keeps. `false` keeps all (the app filters `items`). */
    readonly filter?: AutocompleteFilter | false | undefined;
    /** A suggestion was chosen; the query becomes its label. */
    readonly onSelect?:
        | ((details: SearchViewSelectDetails) => void)
        | undefined;
    /** The keyboard's submit: search for the query. */
    readonly onSubmit?:
        | ((details: SearchViewSubmitDetails) => void)
        | undefined;
    /** Close the view once a suggestion is chosen. @default true */
    readonly closeOnSelect?: boolean | undefined;
    /** The input's hint, such as "Search mail". */
    readonly placeholder?: string | undefined;
    /** The view's name. @default the placeholder, else "Search" */
    readonly "aria-label"?: string | undefined;
    readonly disabled?: boolean | undefined;
    readonly testId?: TestIdOverride<Part> | undefined;
}

/** Material's search view:
 *  `<SearchView placeholder="Search mail" items={…} onSelect={…} onSubmit={…} />`. */
export function SearchView(props: SearchViewProps): ReactNode {
    const engine = useEngine();
    const { open, setOpen, presence, close } = useModalOverlay(
        "SearchView",
        props,
    );
    const [query, setQuery] = useControllable(
        "SearchView",
        "inputValue",
        props.inputValue,
        props.defaultInputValue,
        props.onInputValueChange,
        "",
    );
    const variant = props.variant ?? "fullScreen";
    const anchored = variant === "docked" || variant === "contained";
    const trigger = useRef<Measurable>(null);
    const [place, setPlace] = useState<{
        left: number;
        top: number;
        width: number;
    }>();
    const show = useStableCallback(() => {
        if (open || props.disabled) return;
        if (anchored && trigger.current)
            trigger.current.measureInWindow((left, top, width) => {
                setPlace({ left, top, width });
                setOpen(true);
            });
        else setOpen(true);
    });
    const { styles: s, views: v } = useComponentSlots<Part>(
        "searchView",
        searchViewSelection(props),
    );
    const id = (part: Part) => testIdOf(searchViewAnatomy, part, props.testId);
    const label = searchViewLabel(props);
    // The suggestions the view's combobox controls.
    const listId = useId();
    const matches = searchViewMatches(props.items ?? [], query, props.filter);
    const select = (value: string) => {
        const item = matches.find((entry) => entry.value === value);
        if (item && item.label !== query) setQuery(item.label);
        props.onSelect?.({ value, item });
        if (props.closeOnSelect ?? true) close();
    };
    // On the web, as the web's bar: Enter, the down arrow or a typed character opens it, the
    // character carried into the query.
    const openOnKey = (event: {
        readonly nativeEvent: {
            readonly key: string;
            readonly ctrlKey?: boolean;
            readonly metaKey?: boolean;
            readonly altKey?: boolean;
        };
        preventDefault?(): void;
    }) => {
        const key = event.nativeEvent;
        if (props.disabled || open || !opensSearchView(key)) return;
        event.preventDefault?.();
        const carried = searchViewCarriedKey(key.key);
        if (carried !== undefined) setQuery(query + carried);
        show();
    };
    const given: SearchViewTriggerProps = {
        onPress: show,
        "aria-haspopup": "dialog",
        "aria-expanded": open,
        value: query,
    };
    return (
        <>
            <View
                ref={trigger as never}
                collapsable={false}
                testID={compositeTestIds.searchView.trigger}
            >
                {props.trigger === undefined ? (
                    <View>
                        <SearchBar
                            value={query}
                            {...(props.placeholder === undefined
                                ? {}
                                : { placeholder: props.placeholder })}
                            disabled={props.disabled}
                            // The button over it takes focus and presses.
                            inputProps={{ editable: false, focusable: false }}
                        />
                        <Pressable
                            role="button"
                            aria-haspopup="dialog"
                            aria-expanded={open}
                            aria-label={label}
                            disabled={props.disabled}
                            onPress={show}
                            {...({ onKeyDown: openOnKey } as object)}
                            style={StyleSheet.absoluteFill}
                        />
                    </View>
                ) : typeof props.trigger === "function" ? (
                    props.trigger(given)
                ) : (
                    props.trigger
                )}
            </View>
            <ModalWindow visible={presence.present} label={label}>
                <View {...modalViewProps()} style={StyleSheet.absoluteFill}>
                    {anchored ? (
                        <Pressable
                            accessible={false}
                            focusable={false}
                            style={StyleSheet.absoluteFill}
                            onPress={close}
                        />
                    ) : null}
                    <engine.View
                        {...presence.props}
                        style={{
                            ...(anchored
                                ? { position: "absolute", ...place }
                                : { flex: 1 }),
                            // A closing view takes no more presses.
                            pointerEvents: open ? "auto" : "none",
                            ...presence.style,
                        }}
                    >
                        <v.root.View
                            role="dialog"
                            aria-label={label}
                            style={{
                                ...s.root,
                                ...(anchored ? {} : { flex: 1 }),
                            }}
                            testID={id("root")}
                        >
                            <v.header.View
                                style={s.header}
                                testID={id("header")}
                            >
                                <v.leading.View
                                    style={s.leading}
                                    testID={id("leading")}
                                >
                                    <IconButton
                                        aria-label={props.backLabel ?? "Back"}
                                        icon={props.leading ?? "←"}
                                        onPress={close}
                                    />
                                </v.leading.View>
                                <v.input.TextInput
                                    autoFocus
                                    value={query}
                                    onChangeText={setQuery}
                                    onSubmitEditing={() => {
                                        props.onSubmit?.({
                                            inputValue: query,
                                        });
                                        if (props.closeOnSelect ?? true)
                                            close();
                                    }}
                                    editable={!props.disabled}
                                    placeholder={props.placeholder ?? ""}
                                    role="combobox"
                                    aria-label={label}
                                    aria-expanded
                                    aria-controls={listId}
                                    style={s.input}
                                    testID={id("input")}
                                />
                                {isPresent(props.trailing) ? (
                                    <v.trailing.View
                                        style={s.trailing}
                                        testID={id("trailing")}
                                    >
                                        {props.trailing}
                                    </v.trailing.View>
                                ) : query !== "" ? (
                                    <v.trailing.View
                                        style={s.trailing}
                                        testID={id("trailing")}
                                    >
                                        <IconButton
                                            aria-label={
                                                props.clearLabel ?? "Clear"
                                            }
                                            icon="✕"
                                            onPress={() => setQuery("")}
                                        />
                                    </v.trailing.View>
                                ) : null}
                            </v.header.View>
                            <v.divider.View
                                style={s.divider}
                                testID={id("divider")}
                            />
                            <v.content.View
                                nativeID={listId}
                                style={s.content}
                                testID={id("content")}
                            >
                                <ScrollView keyboardShouldPersistTaps="handled">
                                    {props.children ??
                                        (matches.length > 0 ? (
                                            <MenuItems
                                                {...searchViewMenuSelection()}
                                                items={matches}
                                                {...(props.indication ===
                                                undefined
                                                    ? {}
                                                    : {
                                                          indication:
                                                              props.indication,
                                                      })}
                                                onSelect={(details) =>
                                                    select(details.value)
                                                }
                                            />
                                        ) : null)}
                                </ScrollView>
                            </v.content.View>
                        </v.root.View>
                    </engine.View>
                </View>
            </ModalWindow>
        </>
    );
}
