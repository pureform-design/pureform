// The app bar: Root, a `<header>` that follows the page scrolling under it, around the Leading
// navigation button, the Content (Headline and Subtitle, or a search bar), and the Trailing
// actions, and the ready-made AppBar over them. It has no machine: the scroll offset, given or
// read from `scrollTarget`, sets its scrolled color and collapses a flexible bar.

import { appBarAnatomy } from "@pureform/anatomy";
import {
    APP_BAR_AT_REST,
    APP_BAR_CONTENT_PROPS,
    APP_BAR_ROOT_PROPS,
    appBarContentLast,
    appBarDrawnState,
    appBarScrollState,
    appBarSelection,
    isPresent,
} from "@pureform/binding-core";
import type {
    AppBarContentProps,
    AppBarRootOwnProps,
    AppBarScrollState,
} from "@pureform/binding-core";
import { subscribeScroll } from "@pureform/binding-dom";
import type { ScrollTarget } from "@pureform/binding-dom";
import {
    type ElementType,
    type ReactNode,
    useEffect,
    useRef,
    useState,
} from "react";

import { createPartContext } from "../part-context";
import { useComponent, useSlotProps } from "../parts";
import type { ComponentScope, SlotKeyedProps } from "../parts";
import { omitProps } from "../props";
import type { PartProps } from "../props";
import { SearchBar } from "../search-bar/search-bar";
import type { SearchBarProps } from "../search-bar/search-bar";

type Anatomy = typeof appBarAnatomy;

/** What Root shares with its parts. */
interface AppBarContextValue {
    readonly scope: ComponentScope<Anatomy>;
    /** The scroll state the bar draws. */
    readonly state: AppBarScrollState;
}

const context = createPartContext<AppBarContextValue>("AppBar");

/** Root's props: the variants and tokens, the scroll behavior, `testId` and `unstyled` for
 *  every part, `as`, and the element's own props. */
export interface AppBarRootProps
    extends Omit<PartProps, keyof AppBarRootOwnProps>, AppBarRootOwnProps {
    /** The element or window the page scrolls in; the bar follows its offset. */
    readonly scrollTarget?: ScrollTarget | undefined;
    /** Another element or component to render instead of `<header>`. */
    readonly as?: ElementType | undefined;
}

/** A part's props: the element's own, and the part's `unstyled`. */
export interface AppBarPartProps extends PartProps {
    readonly unstyled?: boolean | undefined;
}

/** The leading part's props: a part's, and `mirror` to flip an icon under `rtl`. */
export interface AppBarLeadingProps extends AppBarPartProps {
    readonly mirror?: boolean | undefined;
}

/** The scroll state from Root's props: the offset given, or the scroll target's. */
function useScrollState(props: AppBarRootProps): AppBarScrollState {
    const [watched, setWatched] = useState<number | undefined>(undefined);
    const { scrollTarget } = props;
    useEffect(
        () =>
            scrollTarget === undefined
                ? undefined
                : subscribeScroll(scrollTarget, setWatched),
        [scrollTarget],
    );
    // The state is kept from render to render, so a collapsed bar expands only once the page is
    // well back (see `appBarScrollState`).
    const previous = useRef(APP_BAR_AT_REST);
    const fromOffset = appBarScrollState(props.scrollOffset ?? watched ?? 0, {
        size: props.size,
        behavior: props.scrollBehavior,
        previous: previous.current,
    });
    useEffect(() => {
        previous.current = fromOffset;
    });
    return appBarDrawnState(props, fromOffset);
}

/** The app bar's root: a `<header>`, the strip at the top of the screen. */
function Root(props: AppBarRootProps): ReactNode {
    const state = useScrollState(props);
    const scope = useComponent(appBarAnatomy, {
        selection: appBarSelection(props, state),
        testId: props.testId,
        unstyled: props.unstyled,
    });
    const {
        as,
        scrollTarget: _scrollTarget,
        ...rest
    } = omitProps(props, APP_BAR_ROOT_PROPS);
    return (
        <context.Provider value={{ scope, state }}>
            {scope.render("root", { element: "header", as, props: rest })}
        </context.Provider>
    );
}

/** The navigation button before the headline, such as a back or menu icon button. */
function Leading({
    unstyled,
    mirror,
    ...props
}: AppBarLeadingProps): ReactNode {
    const { scope } = context.use("Leading");
    return scope.render("leading", {
        element: "div",
        states: { mirrored: mirror },
        unstyled,
        props,
    });
}

/** The headline and subtitle, or a search bar. In an expanded flexible bar, render it after
 *  Trailing, so it takes a line of its own (the ready-made does). */
function Content({ unstyled, ...props }: AppBarPartProps): ReactNode {
    const { scope } = context.use("Content");
    return scope.render("content", { element: "div", unstyled, props });
}

/** The screen's title, a heading. */
function Headline({ unstyled, ...props }: AppBarPartProps): ReactNode {
    const { scope } = context.use("Headline");
    return scope.render("headline", { element: "h1", unstyled, props });
}

/** A line under the headline. */
function Subtitle({ unstyled, ...props }: AppBarPartProps): ReactNode {
    const { scope } = context.use("Subtitle");
    return scope.render("subtitle", { element: "p", unstyled, props });
}

/** Actions after the headline: icon buttons, an avatar, or an overflow menu. */
function Trailing({ unstyled, ...props }: AppBarPartProps): ReactNode {
    const { scope } = context.use("Trailing");
    return scope.render("trailing", { element: "div", unstyled, props });
}

/** The scroll state the app bar draws, for a part placed in it: `{ scrolled, collapsed }`. */
export function useAppBarState(): AppBarScrollState {
    return context.use("useAppBarState").state;
}

/** The ready-made app bar's props: Root's, with `className`, `style`, and `slotProps` keyed by
 *  part, and its content. */
export interface AppBarProps
    extends
        Omit<AppBarRootProps, keyof SlotKeyedProps<Anatomy> | "children">,
        SlotKeyedProps<Anatomy>,
        AppBarContentProps<ReactNode, SearchBarProps> {}

// The search bar in the content, drawn in the bar's scrolled color.
function EmbeddedSearchBar({
    search,
}: {
    readonly search: SearchBarProps;
}): ReactNode {
    const { scrolled } = useAppBarState();
    return <SearchBar centered scrolled={scrolled} {...search} />;
}

// The parts, the content after the actions while a flexible bar is expanded.
function ReadyMadeParts({
    props,
    slot,
}: {
    readonly props: AppBarProps;
    readonly slot: ReturnType<typeof useSlotProps<Anatomy>>;
}): ReactNode {
    const state = useAppBarState();
    const last = appBarContentLast(
        { size: props.size, search: props.searchBar !== undefined },
        state,
    );
    const content = (
        <Content {...slot("content")}>
            {props.searchBar !== undefined ? (
                <EmbeddedSearchBar search={props.searchBar} />
            ) : (
                <>
                    {isPresent(props.headline) ? (
                        <Headline {...slot("headline")}>
                            {props.headline}
                        </Headline>
                    ) : null}
                    {isPresent(props.subtitle) ? (
                        <Subtitle {...slot("subtitle")}>
                            {props.subtitle}
                        </Subtitle>
                    ) : null}
                </>
            )}
        </Content>
    );
    return (
        <>
            <Leading mirror={props.mirrorLeading} {...slot("leading")}>
                {props.leading}
            </Leading>
            {last ? null : content}
            <Trailing {...slot("trailing")}>{props.trailing}</Trailing>
            {last ? content : null}
        </>
    );
}

/** The ready-made app bar: the parts it has content for. */
function ReadyMade(props: AppBarProps): ReactNode {
    const {
        className: _className,
        style: _style,
        slotProps: _slotProps,
        ...rest
    } = props;
    const rootProps = omitProps(rest, APP_BAR_CONTENT_PROPS);
    const slot = useSlotProps(props);
    return (
        <Root
            {...rootProps}
            search={props.search ?? props.searchBar !== undefined}
            {...(slot("root") as object)}
        >
            <ReadyMadeParts props={props} slot={slot} />
        </Root>
    );
}

/** Material's app bar. Use it ready-made, `<AppBar headline="Inbox" leading={<IconButton …/>}
 *  trailing={…} size="mediumFlexible" scrollTarget={window} />`, or compose its parts under
 *  `AppBar.Root`: `Leading`, `Content` (with `Headline` and `Subtitle`), then `Trailing`. */
export const AppBar = Object.assign(ReadyMade, {
    Root,
    Leading,
    Content,
    Headline,
    Subtitle,
    Trailing,
});
