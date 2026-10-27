// The app bar: Root, a `<header>` that follows the page scrolling under it, around the Leading
// navigation button, the Content (Headline and Subtitle, or a search bar), and the Trailing
// actions, and the ready-made AppBar over them. It has no machine: the scroll offset, given or
// read from `scrollTarget`, sets its scrolled color and collapses a flexible bar.

import { appBarAnatomy } from "@pureform/anatomy";
import type { PartName } from "@pureform/anatomy";
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
import { subscribeScroll } from "@pureform/binding-web";
import type { ScrollTarget } from "@pureform/binding-web";
import type { JSX, ValidComponent } from "@solidjs/web";
import {
    type Accessor,
    createEffect,
    createMemo,
    createSignal,
    omit,
    Show,
} from "solid-js";

import { createPartContext } from "../part-context";
import { createSlotProps, useComponent } from "../parts";
import type { ComponentScope, SlotKeyedProps } from "../parts";
import type { PartProps } from "../props";
import { SearchBar } from "../search-bar/search-bar";
import type { SearchBarProps } from "../search-bar/search-bar";

type Anatomy = typeof appBarAnatomy;

/** What Root shares with its parts. */
interface AppBarContextValue {
    readonly scope: ComponentScope<Anatomy>;
    /** The scroll state the bar draws. */
    readonly state: Accessor<AppBarScrollState>;
}

const context = createPartContext<AppBarContextValue>("AppBar");

/** Root's props: the variants and tokens, the scroll behavior, `testId` and `unstyled` for
 *  every part, `as`, and the element's own props. */
export interface AppBarRootProps
    extends Omit<PartProps, keyof AppBarRootOwnProps>, AppBarRootOwnProps {
    /** The element or window the page scrolls in; the bar follows its offset. */
    readonly scrollTarget?: ScrollTarget | undefined;
    /** Another element or component to render instead of `<header>`. */
    readonly as?: ValidComponent | undefined;
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
function useScrollState(props: AppBarRootProps): Accessor<AppBarScrollState> {
    const [watched, setWatched] = createSignal<number | undefined>(undefined);
    createEffect(
        () => props.scrollTarget,
        (target) =>
            target === undefined
                ? undefined
                : subscribeScroll(target, setWatched),
    );
    let previous = APP_BAR_AT_REST;
    const fromOffset = createMemo(() => {
        const offset = props.scrollOffset ?? watched() ?? 0;
        previous = appBarScrollState(offset, {
            size: props.size,
            behavior: props.scrollBehavior,
            previous,
        });
        return previous;
    });
    return createMemo(() => appBarDrawnState(props, fromOffset()));
}

/** The app bar's root: a `<header>`, the strip at the top of the screen. */
function Root(props: AppBarRootProps): JSX.Element {
    const state = useScrollState(props);
    const scope = useComponent(appBarAnatomy, {
        selection: () => appBarSelection(props, state()),
        testId: () => props.testId,
        unstyled: () => props.unstyled,
    });
    const rest = omit(props, "as", "scrollTarget", ...APP_BAR_ROOT_PROPS);
    return (
        <context.Provider value={{ scope, state }}>
            {scope.render("root", {
                element: "header",
                as: () => props.as,
                props: rest,
            })}
        </context.Provider>
    );
}

/** The navigation button before the headline, such as a back or menu icon button. */
function Leading(props: AppBarLeadingProps): JSX.Element {
    const { scope } = context.use("Leading");
    const rest = omit(props, "unstyled", "mirror");
    return scope.render("leading", {
        element: "div",
        states: () => ({ mirrored: props.mirror }),
        unstyled: () => props.unstyled,
        props: rest,
    });
}

/** The headline and subtitle, or a search bar. In an expanded flexible bar, render it after
 *  Trailing, so it takes a line of its own (the ready-made does). */
function Content(props: AppBarPartProps): JSX.Element {
    const { scope } = context.use("Content");
    const rest = omit(props, "unstyled");
    return scope.render("content", {
        element: "div",
        unstyled: () => props.unstyled,
        props: rest,
    });
}

/** The screen's title, a heading. */
function Headline(props: AppBarPartProps): JSX.Element {
    const { scope } = context.use("Headline");
    const rest = omit(props, "unstyled");
    return scope.render("headline", {
        element: "h1",
        unstyled: () => props.unstyled,
        props: rest,
    });
}

/** A line under the headline. */
function Subtitle(props: AppBarPartProps): JSX.Element {
    const { scope } = context.use("Subtitle");
    const rest = omit(props, "unstyled");
    return scope.render("subtitle", {
        element: "p",
        unstyled: () => props.unstyled,
        props: rest,
    });
}

/** Actions after the headline: icon buttons, an avatar, or an overflow menu. */
function Trailing(props: AppBarPartProps): JSX.Element {
    const { scope } = context.use("Trailing");
    const rest = omit(props, "unstyled");
    return scope.render("trailing", {
        element: "div",
        unstyled: () => props.unstyled,
        props: rest,
    });
}

/** The scroll state the app bar draws, for a part placed in it: `{ scrolled, collapsed }`. */
export function useAppBarState(): Accessor<AppBarScrollState> {
    return context.use("useAppBarState").state;
}

/** The ready-made app bar's props: Root's, with `class`, `style`, and `slotProps` keyed by part,
 *  and its content. */
export interface AppBarProps
    extends
        Omit<AppBarRootProps, keyof SlotKeyedProps<Anatomy> | "children">,
        SlotKeyedProps<Anatomy>,
        AppBarContentProps<JSX.Element, SearchBarProps> {}

const READY_MADE_PROPS = [
    "class",
    "style",
    "slotProps",
    ...APP_BAR_CONTENT_PROPS,
] as const;

// The search bar in the content, drawn in the bar's scrolled color.
function EmbeddedSearchBar(props: { readonly search: SearchBarProps }) {
    const state = useAppBarState();
    return <SearchBar centered scrolled={state().scrolled} {...props.search} />;
}

/** The ready-made app bar: the parts it has content for, the content after the actions while a
 *  flexible bar is expanded. */
function ReadyMade(props: AppBarProps): JSX.Element {
    const slots = createSlotProps(props);
    const own = omit(props, ...READY_MADE_PROPS) as AppBarRootProps;
    const search = () => props.searchBarProps !== undefined;
    return (
        <Root
            {...own}
            search={props.search ?? search()}
            {...(slots("root") as object)}
        >
            <ReadyMadeParts
                {...props}
                search={props.search ?? search()}
                slots={slots}
            />
        </Root>
    );
}

function ReadyMadeParts(
    props: AppBarProps & {
        readonly slots: (part: PartName<Anatomy>) => PartProps;
    },
): JSX.Element {
    const state = useAppBarState();
    const last = () => appBarContentLast(props, state());
    const content = () => (
        <Content {...props.slots("content")}>
            <Show
                when={props.searchBarProps}
                fallback={
                    <>
                        <Show when={isPresent(props.headline)}>
                            <Headline {...props.slots("headline")}>
                                {props.headline}
                            </Headline>
                        </Show>
                        <Show when={isPresent(props.subtitle)}>
                            <Subtitle {...props.slots("subtitle")}>
                                {props.subtitle}
                            </Subtitle>
                        </Show>
                    </>
                }
            >
                {(search) => <EmbeddedSearchBar search={search()} />}
            </Show>
        </Content>
    );
    return (
        <>
            <Leading mirror={props.mirrorLeading} {...props.slots("leading")}>
                {props.leading}
            </Leading>
            <Show when={!last()}>{content()}</Show>
            <Trailing {...props.slots("trailing")}>{props.trailing}</Trailing>
            <Show when={last()}>{content()}</Show>
        </>
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
