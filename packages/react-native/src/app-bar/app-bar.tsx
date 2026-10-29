// The app bar: a strip at the top of the screen holding the leading navigation button, the
// headline and subtitle (or a search bar), and trailing actions. It has no machine: the app gives
// it the offset of the scroll view under it (`useAppBarScroll` wires one up), which sets its
// scrolled color and collapses a flexible bar. A string headline or subtitle is drawn as text.

import { appBarAnatomy } from "@pureform/anatomy";
import type { TestIdOverride } from "@pureform/anatomy";
import {
    APP_BAR_AT_REST,
    appBarContentLast,
    appBarDrawnState,
    appBarScrollState,
    appBarSelection,
    isPresent,
    providedTokensFromPaths,
} from "@pureform/binding-core";
import type {
    AppBarContentProps,
    AppBarPart,
    AppBarScrollProps,
    AppBarScrollState,
    AppBarVariantProps,
} from "@pureform/binding-core";
import {
    type ReactNode,
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";
import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";

import { testIdOf, withEngine } from "../parts";
import { ProvidedTokens } from "../provided-tokens";
import { SearchBar } from "../search-bar";
import type { SearchBarProps } from "../search-bar";
import { useNativeSlotReader } from "../slot-props";
import type { NativeSlotProps } from "../slot-props";
import { useComponentSlots } from "../styles";

/** What each part renders as, for its keyed `style` and `slotProps`. */
export interface AppBarHosts {
    readonly headline: "Text";
    readonly subtitle: "Text";
    readonly content: "View";
    readonly root: "View";
    readonly leading: "View";
    readonly trailing: "View";
}

export interface AppBarProps
    extends
        AppBarVariantProps,
        AppBarScrollProps,
        AppBarContentProps<ReactNode, SearchBarProps>,
        NativeSlotProps<AppBarHosts> {
    readonly testId?: TestIdOverride<AppBarPart> | undefined;
}

/** The scroll state from the offset, kept from render to render so a collapsed bar expands only
 *  once the page is well back. */
function useScrollState(props: AppBarProps): AppBarScrollState {
    const previous = useRef(APP_BAR_AT_REST);
    const fromOffset = appBarScrollState(props.scrollOffset ?? 0, {
        size: props.size,
        behavior: props.scrollBehavior,
        // oxlint-disable-next-line react/refs -- the committed state of the last render, read for hysteresis; written in an effect
        previous: previous.current,
    });
    useEffect(() => {
        previous.current = fromOffset;
    });
    return appBarDrawnState(props, fromOffset);
}

function AppBarImpl(props: AppBarProps): ReactNode {
    const nativeSlots = useNativeSlotReader("appBar");
    const search = props.searchBarProps !== undefined;
    const state = useScrollState(props);
    const {
        styles: s,
        views: v,
        selected,
    } = useComponentSlots<AppBarPart>(
        "appBar",
        appBarSelection({ ...props, search }, state),
        props.mirrorLeading ? { mirrored: true } : {},
    );
    const id = (part: AppBarPart) =>
        testIdOf(appBarAnatomy, part, props.testId);
    const slot = nativeSlots(props);
    const text = (part: "headline" | "subtitle", node: ReactNode) => {
        if (!isPresent(node)) return null;
        const Slot = v[part];
        return (
            <Slot.Text
                {...slot.props(part)}
                accessibilityRole={part === "headline" ? "header" : undefined}
                style={slot.style(part, s[part])}
                testID={id(part)}
            >
                {node}
            </Slot.Text>
        );
    };
    const content = (
        <v.content.View
            {...slot.props("content")}
            style={slot.style("content", s.content)}
            testID={id("content")}
        >
            {search ? (
                <SearchBar
                    centered
                    scrolled={state.scrolled}
                    {...props.searchBarProps}
                />
            ) : (
                <>
                    {text("headline", props.headline)}
                    {text("subtitle", props.subtitle)}
                </>
            )}
        </v.content.View>
    );
    // What the leading and trailing parts give their icon buttons: their own colors.
    const provided = (part: "leading" | "trailing") =>
        providedTokensFromPaths(selected.providedTokens[part]);
    const last = appBarContentLast({ size: props.size, search }, state);
    return (
        <v.root.View
            {...slot.props("root")}
            accessibilityRole="header"
            style={slot.style("root", s.root)}
            testID={id("root")}
        >
            <v.leading.View
                {...slot.props("leading")}
                style={slot.style("leading", s.leading)}
                testID={id("leading")}
            >
                <ProvidedTokens tokens={provided("leading")}>
                    {props.leading}
                </ProvidedTokens>
            </v.leading.View>
            {last ? null : content}
            <v.trailing.View
                {...slot.props("trailing")}
                style={slot.style("trailing", s.trailing)}
                testID={id("trailing")}
            >
                <ProvidedTokens tokens={provided("trailing")}>
                    {props.trailing}
                </ProvidedTokens>
            </v.trailing.View>
            {last ? content : null}
        </v.root.View>
    );
}

/** Material's app bar: `<AppBar headline="Inbox" leading={<IconButton …/>} trailing={…}
 *  size="mediumFlexible" {...scroll} />`, with `const { scrollOffset, onScroll } =
 *  useAppBarScroll()` and `<ScrollView onScroll={onScroll} scrollEventThrottle={16}>` under it. */
export const AppBar = withEngine(AppBarImpl, "AppBar");

/** The offset of a scroll view, for an app bar: give `onScroll` to the scroll view and
 *  `scrollOffset` to the app bar. */
export function useAppBarScroll(): {
    readonly scrollOffset: number;
    readonly onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
} {
    const [scrollOffset, setScrollOffset] = useState(0);
    const onScroll = useCallback(
        (event: NativeSyntheticEvent<NativeScrollEvent>) =>
            setScrollOffset(event.nativeEvent.contentOffset.y),
        [],
    );
    return { scrollOffset, onScroll };
}
