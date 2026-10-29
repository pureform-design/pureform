// The search view: Root, an unstyled positioned element around the trigger (the search bar that
// opens the view) and the view; Zag's dialog (the view is modal: focus stays in it, and goes back
// to the search bar once it closes) and Zag's combobox (the query and its suggestions), with the
// view's surface over the viewport or over the bar's place, its header (leading and trailing
// icons around the input), divider, and content, and the suggestions drawn as menu items. The
// ready-made SearchView sits over them.

import {
    searchViewMenuAnatomy,
    searchViewOverlayAnatomy,
} from "@pureform/anatomy";
import type {
    iconButtonAnatomy,
    PartName,
    searchBarAnatomy,
    TestIdOverride,
} from "@pureform/anatomy";
import {
    isPresent,
    opensSearchView,
    SEARCH_VIEW_COLLECTION,
    SEARCH_VIEW_CONTENT_PROPS,
    SEARCH_VIEW_ROOT_PROPS,
    searchViewCarriedKey,
    searchViewLabel,
    searchViewMatches,
    searchViewMenuSelection,
    searchViewSelection,
} from "@pureform/binding-core";
import type {
    MenuScopeInstances,
    SearchViewContentProps,
    SearchViewItem,
    SearchViewPart,
    SearchViewRootOwnProps,
    Unstyled,
} from "@pureform/binding-core";
import {
    presentProps,
    SEARCH_VIEW_ROOT_STYLE,
    SEARCH_VIEW_TRIGGER_STYLE,
    searchViewComboboxProps,
    searchViewPositionerLayout,
} from "@pureform/binding-web";
import { searchViewDomDialogProps } from "@pureform/binding-web";
import { stackPositioner } from "@pureform/binding-web";
import * as combobox from "@pureform/machines/combobox";
import * as dialog from "@pureform/machines/dialog";
import type { JSX, ValidComponent } from "@solidjs/web";
import {
    type Accessor,
    createMemo,
    createSignal,
    createUniqueId,
    For,
    omit,
    Show,
    untrack,
} from "solid-js";

import { useControllable } from "../controllable";
import { BackIcon, CloseIcon } from "../glyphs";
import { IconButton } from "../icon-button";
import { itemInteractionSources } from "../interaction";
import type { ItemInteractionSources } from "../interaction";
import { mergeProps, normalizeProps, useMachine } from "../internal/zag";
import type { PropTypes } from "../internal/zag";
import { createPartContext } from "../part-context";
import { createSlotProps, useComponent } from "../parts";
import type {
    ComponentScope,
    InnerPropsOf,
    MenuScopeProps,
    SlotKeyedProps,
} from "../parts";
import { usePresence } from "../presence";
import type { Presence } from "../presence";
import type { PartProps } from "../props";
import { useDirection } from "../provider";
import { SearchBar } from "../search-bar";

type Anatomy = typeof searchViewOverlayAnatomy;
type MenuAnatomy = typeof searchViewMenuAnatomy;
type SearchBarAnatomy = typeof searchBarAnatomy;
type IconButtonAnatomy = typeof iconButtonAnatomy;

/** What Root shares with its parts. */
interface SearchViewContextValue {
    readonly scope: ComponentScope<Anatomy>;
    readonly menu: ComponentScope<MenuAnatomy>;
    readonly view: Accessor<dialog.Api<PropTypes>>;
    readonly query: Accessor<combobox.Api<PropTypes>>;
    readonly matches: Accessor<readonly SearchViewItem[]>;
    readonly variant: Accessor<string | undefined>;
    readonly presence: Presence;
    readonly sources: ItemInteractionSources;
    readonly setPositioner: (element: HTMLElement) => void;
    readonly label: Accessor<string>;
    readonly disabled: Accessor<boolean | undefined>;
    readonly setInput: (element: HTMLInputElement) => void;
    readonly submit: () => void;
}

interface ItemContextValue {
    readonly item: Accessor<SearchViewItem>;
}

const context = createPartContext<SearchViewContextValue>("SearchView");
const itemContext = createPartContext<ItemContextValue>("SearchView", "Item");

/** Root's props: the variant and tokens, the machines' props (`open`, `inputValue`, `items`,
 *  `onSelect`, …), `testId` and `unstyled` for every part, `as`, and the element's own props. */
export interface SearchViewRootProps
    extends
        Omit<PartProps, keyof SearchViewRootOwnProps>,
        SearchViewRootOwnProps {
    /** Another element or component to render instead of `<div>`. */
    readonly as?: ValidComponent | undefined;
    /** The suggestions' own props, drawn as menu items: `testId`, `unstyled`, and `tokens` (the
     *  ready-made also takes `class`, `style`, and `slotProps` keyed by the items' parts, also by
     *  suggestion, `MenuScopeInstances`). */
    readonly menuProps?: SearchViewMenuProps | undefined;
}

/** The list's own props, keyed by the menu's parts (an option's also by option). */
type SearchViewMenuProps = MenuScopeProps<MenuAnatomy, SearchViewItem>;

/** A part's props: the element's own, and the part's `unstyled`. */
export interface SearchViewPartProps extends PartProps {
    readonly unstyled?: boolean | undefined;
}

/** A leading or trailing part's props: a part's, and `mirror` to flip an icon under `rtl`. */
export interface SearchViewIconProps extends SearchViewPartProps {
    readonly mirror?: boolean | undefined;
}

/** A suggestion's props: the suggestion, as data, and a part's. */
export interface SearchViewItemProps extends SearchViewPartProps {
    readonly item: SearchViewItem;
}

/** The search view's root, a positioned `<div>` around the trigger and the view, so a docked
 *  view drops over the search bar. The registry doesn't style it. */
function Root(props: SearchViewRootProps): JSX.Element {
    const id = createUniqueId();
    const dir = useDirection();
    const open = useControllable<"open", boolean>("SearchView", "open", props);
    const inputValue = useControllable<"inputValue", string>(
        "SearchView",
        "inputValue",
        props,
    );
    let input: HTMLInputElement | undefined;
    const view = useMachine(dialog.machine, () => ({
        id,
        dir: dir(),
        ...searchViewDomDialogProps(props, () => input ?? null),
        ...open.machineProps(),
    }));
    const viewApi = createMemo(() => dialog.connect(view, normalizeProps));
    const [typed, setTyped] = createSignal(
        untrack(() => props.inputValue ?? props.defaultInputValue ?? ""),
    );
    const matches = createMemo(() =>
        searchViewMatches(props.items ?? [], typed(), props.filter),
    );
    const collection = createMemo(() =>
        combobox.collection<SearchViewItem>({
            items: matches(),
            ...SEARCH_VIEW_COLLECTION,
        }),
    );
    const close = () => {
        if (props.closeOnSelect !== false) viewApi().setOpen(false);
    };
    const sources = itemInteractionSources();
    const service = useMachine(combobox.machine, () => {
        const text = inputValue.machineProps();
        return {
            id,
            ...sources.machineProps,
            dir: dir(),
            collection: collection(),
            ...searchViewComboboxProps(props, viewApi().open),
            ...text,
            onInputValueChange: (details: { inputValue: string }) => {
                setTyped(details.inputValue);
                text.onInputValueChange({ inputValue: details.inputValue });
            },
            onSelect: (details: { itemValue?: string | undefined }) => {
                const value = details.itemValue;
                if (value === undefined) return;
                props.onSelect?.({
                    value,
                    item: untrack(matches).find((item) => item.value === value),
                });
                close();
            },
        };
    });
    const query = createMemo(() => combobox.connect(service, normalizeProps));
    const submit = () => {
        props.onSubmit?.({ inputValue: query().inputValue });
        close();
    };
    let positioner: HTMLElement | undefined;
    const presence = usePresence(
        () => viewApi().open,
        (surface) =>
            positioner ? stackPositioner(positioner, surface) : undefined,
    );
    const scope = useComponent(searchViewOverlayAnatomy, {
        selection: () => searchViewSelection(props),
        testId: () => props.testId as TestIdOverride<keyof Anatomy["parts"]>,
        unstyled: () => props.unstyled as Unstyled<keyof Anatomy["parts"]>,
    });
    const menu = useComponent(searchViewMenuAnatomy, {
        selection: () => ({
            ...searchViewMenuSelection(),
            tokens: props.menuProps?.tokens,
        }),
        testId: () =>
            props.menuProps?.testId ??
            (typeof props.testId === "string" ? props.testId : undefined),
        unstyled: () =>
            props.menuProps?.unstyled as Unstyled<PartName<MenuAnatomy>>,
        indication: () => props.indication,
    });
    const rest = omit(props, "as", "menuProps", ...SEARCH_VIEW_ROOT_PROPS);
    return (
        <context.Provider
            value={{
                scope,
                menu,
                view: viewApi,
                query,
                matches,
                variant: () => props.variant as string | undefined,
                presence,
                sources,
                setPositioner: (element) => {
                    positioner = element;
                },
                label: () => searchViewLabel(props),
                disabled: () => props.disabled,
                setInput: (element) => {
                    input = element;
                },
                submit,
            }}
        >
            {scope.render("root", {
                element: "div",
                as: () => props.as,
                machine: () => ({ style: SEARCH_VIEW_ROOT_STYLE }),
                props: rest,
            })}
        </context.Provider>
    );
}

/** The search bar that opens the view: a native `<button>` around it, named from the view's
 *  label (the placeholder), which says it opens a dialog (`aria-haspopup`) and whether it's open
 *  (`aria-expanded`). A press on it, Enter, Space, the down arrow, or typing opens it, and a
 *  typed character carries over to the view's query. Put no interactive element in it: the
 *  ready-made's search bar is inert. The registry doesn't style it. */
function Trigger(props: SearchViewPartProps): JSX.Element {
    const { scope, view, query, label, disabled } = context.use("Trigger");
    const rest = omit(props, "unstyled");
    return scope.render("trigger", {
        element: "button",
        machine: () =>
            mergeProps(view().getTriggerProps(), {
                "aria-label": label(),
                disabled: disabled(),
                style: SEARCH_VIEW_TRIGGER_STYLE,
                onKeyDown: (event: KeyboardEvent) => {
                    if (view().open || !opensSearchView(event)) return;
                    event.preventDefault();
                    const carried = searchViewCarriedKey(event.key);
                    if (carried !== undefined)
                        query().setInputValue(
                            query().inputValue + carried,
                            "input-change",
                        );
                    view().setOpen(true);
                },
            }),
        unstyled: () => props.unstyled,
        props: rest,
    });
}

/** Places the view over the viewport (`fullScreen`) or over the search bar's place, stacked at
 *  its surface's layer; hidden once it's closed and its exit animation is over. The registry
 *  doesn't style it. */
function Positioner(props: SearchViewPartProps): JSX.Element {
    const { scope, view, variant, presence, setPositioner } =
        context.use("Positioner");
    const rest = omit(props, "unstyled");
    return scope.render("positioner", {
        element: "div",
        ref: setPositioner,
        machine: () =>
            mergeProps(
                view().getPositionerProps(),
                normalizeProps.element(
                    searchViewPositionerLayout(variant(), presence.present()),
                ),
            ),
        unstyled: () => props.unstyled,
        props: rest,
    });
}

/** The view's surface, a modal dialog. It stays while its exit animation runs. */
function Surface(props: SearchViewPartProps): JSX.Element {
    const { scope, view, presence } = context.use("Surface");
    const rest = omit(props, "unstyled");
    return scope.render("surface", {
        element: "div",
        ref: presence.ref,
        machine: () =>
            presentProps(view().getContentProps(), presence.present()),
        unstyled: () => props.unstyled,
        props: rest,
    });
}

/** The row at the top: the leading icon, the input, and the trailing icons. */
function Header(props: SearchViewPartProps): JSX.Element {
    const { scope } = context.use("Header");
    const rest = omit(props, "unstyled");
    return scope.render("header", {
        element: "div",
        unstyled: () => props.unstyled,
        props: rest,
    });
}

/** Before the input: an icon, or an icon button such as back (the ready-made's closes the
 *  view). */
function Leading(props: SearchViewIconProps): JSX.Element {
    const { scope } = context.use("Leading");
    const rest = omit(props, "unstyled", "mirror");
    return scope.render("leading", {
        element: "span",
        states: () => ({ mirrored: props.mirror }),
        unstyled: () => props.unstyled,
        props: rest,
    });
}

/** The query: the combobox input, which takes focus as the view opens. The arrow keys move
 *  through the suggestions, Enter chooses the highlighted one or submits the query, and Escape
 *  closes the view. */
function Input(props: SearchViewPartProps): JSX.Element {
    const { scope, query, setInput, submit } = context.use("Input");
    const rest = omit(props, "unstyled");
    return scope.render("input", {
        element: "input",
        machine: () =>
            mergeProps(
                query().getInputProps(),
                normalizeProps.input({
                    type: "search",
                    onKeyDown: (event: { readonly key: string }) => {
                        if (
                            event.key === "Enter" &&
                            query().highlightedValue === null
                        )
                            submit();
                    },
                }),
            ),
        ref: (element) => setInput(element as HTMLInputElement),
        unstyled: () => props.unstyled,
        props: rest,
    });
}

/** After the input: icons or icon buttons, such as clear. */
function Trailing(props: SearchViewIconProps): JSX.Element {
    const { scope } = context.use("Trailing");
    const rest = omit(props, "unstyled", "mirror");
    return scope.render("trailing", {
        element: "span",
        states: () => ({ mirrored: props.mirror }),
        unstyled: () => props.unstyled,
        props: rest,
    });
}

/** The line between the header and the content (none in the contained view). */
function Divider(props: SearchViewPartProps): JSX.Element {
    const { scope } = context.use("Divider");
    const rest = omit(props, "unstyled");
    return scope.render("divider", {
        element: "div",
        machine: () => ({ role: "presentation" }),
        unstyled: () => props.unstyled,
        props: rest,
    });
}

/** The suggestions: the combobox's listbox, or any content (results, recent searches). */
function Content(props: SearchViewPartProps): JSX.Element {
    const { scope, query } = context.use("Content");
    const rest = omit(props, "unstyled");
    return scope.render("content", {
        element: "div",
        machine: () => query().getContentProps(),
        unstyled: () => props.unstyled,
        props: rest,
    });
}

/** A suggestion, drawn as a menu item; the highlighted one shows the hover state. */
function Item(props: SearchViewItemProps): JSX.Element {
    const { menu, query, sources } = context.use("Item");
    const item = () => props.item;
    const source = sources.item(
        () => props.item.value,
        () => props.item.interactionSource,
    );
    const rest = omit(props, "unstyled", "item");
    return (
        <itemContext.Provider value={{ item }}>
            {menu.render("item", {
                element: "div",
                interactionSource: source,
                machine: () => query().getItemProps({ item: item() }),
                states: () => ({
                    hover: query().getItemState({ item: item() }).highlighted,
                }),
                unstyled: () => props.unstyled,
                props: rest,
            })}
        </itemContext.Provider>
    );
}

const itemPart = (
    part: "itemLeading" | "itemContent" | "itemSupportingText" | "itemTrailing",
    name: string,
) =>
    function ItemPart(props: SearchViewIconProps): JSX.Element {
        const { menu } = context.use(name);
        const rest = omit(props, "unstyled", "mirror");
        return menu.render(part, {
            element: "span",
            states: () => ({ mirrored: props.mirror }),
            unstyled: () => props.unstyled,
            props: rest,
        });
    };

/** An icon before a suggestion's text, such as a clock for a recent search. */
const ItemLeading = itemPart("itemLeading", "ItemLeading");
/** A suggestion's text: its label and supporting text. */
const ItemContent = itemPart("itemContent", "ItemContent");
/** A second line under a suggestion's label. */
const ItemSupportingText = itemPart("itemSupportingText", "ItemSupportingText");
/** An icon after a suggestion's text. */
const ItemTrailing = itemPart("itemTrailing", "ItemTrailing");

/** A suggestion's label. */
function ItemLabel(props: SearchViewPartProps): JSX.Element {
    const { menu, query } = context.use("ItemLabel");
    const { item } = itemContext.use("ItemLabel");
    const rest = omit(props, "unstyled");
    return menu.render("itemLabel", {
        element: "span",
        machine: () => query().getItemTextProps({ item: item() }),
        unstyled: () => props.unstyled,
        props: rest,
    });
}

/** The ready-made search view's props: Root's, with `class`, `style`, and `slotProps` keyed by
 *  part, the search bar that opens it (a search bar showing the query unless given), the leading
 *  and trailing icons, and content in place of the suggestions. */
export interface SearchViewProps
    extends
        Omit<SearchViewRootProps, keyof SlotKeyedProps<Anatomy> | "children">,
        SlotKeyedProps<Anatomy>,
        SearchViewContentProps<JSX.Element> {
    readonly testId?: TestIdOverride<SearchViewPart>;
    readonly unstyled?: Unstyled<SearchViewPart>;
    /** The search bar drawn as the trigger when `trigger` isn't given. */
    readonly searchBarProps?: InnerPropsOf<SearchBarAnatomy> | undefined;
    /** The back button in the header. */
    readonly backButtonProps?: InnerPropsOf<IconButtonAnatomy> | undefined;
    /** The clear button shown while there's a query. */
    readonly clearButtonProps?: InnerPropsOf<IconButtonAnatomy> | undefined;
}

const READY_MADE_PROPS = [
    "class",
    "style",
    "slotProps",
    "children",
    "searchBarProps",
    "backButtonProps",
    "clearButtonProps",
    ...SEARCH_VIEW_CONTENT_PROPS,
] as const;

// Inside Root, so it can read the query and the suggestions.
function ReadyMadeContent(props: {
    readonly own: SearchViewProps;
    readonly slots: ReturnType<typeof createSlotProps<Anatomy>>;
}): JSX.Element {
    const { view, query, matches } = context.use("Root");
    // oxlint-disable-next-line solid/reactivity -- the parent's own props, passed once and never replaced
    const own = props.own;
    // oxlint-disable-next-line solid/reactivity -- the parent's slot props function, passed once and never replaced
    const slots = props.slots;
    const menuSlots = createSlotProps<
        MenuAnatomy,
        never,
        MenuScopeInstances<SearchViewItem>
    >({
        get class() {
            return own.menuProps?.class;
        },
        get style() {
            return own.menuProps?.style;
        },
        get slotProps() {
            return own.menuProps?.slotProps;
        },
        get unstyled() {
            return own.menuProps?.unstyled;
        },
    } as SlotKeyedProps<
        MenuAnatomy,
        never,
        MenuScopeInstances<SearchViewItem>
    >);
    return (
        <>
            <Trigger {...slots("trigger")}>
                {isPresent(own.trigger) ? (
                    own.trigger
                ) : (
                    <SearchBar
                        {...own.searchBarProps}
                        as="span"
                        inert
                        placeholder={own.placeholder}
                        value={query().inputValue}
                        readOnly
                    />
                )}
            </Trigger>
            <Positioner {...slots("positioner")}>
                <Surface {...slots("surface")}>
                    <Header {...slots("header")}>
                        <Leading mirror {...slots("leading")}>
                            <IconButton
                                {...own.backButtonProps}
                                aria-label={own.backLabel ?? "Back"}
                                icon={
                                    isPresent(own.leading) ? (
                                        own.leading
                                    ) : (
                                        <BackIcon />
                                    )
                                }
                                onClick={() => view().setOpen(false)}
                            />
                        </Leading>
                        <Input {...slots("input")} />
                        <Show
                            when={
                                isPresent(own.trailing) ||
                                query().inputValue !== ""
                            }
                        >
                            <Trailing {...slots("trailing")}>
                                {isPresent(own.trailing) ? (
                                    own.trailing
                                ) : (
                                    <IconButton
                                        {...own.clearButtonProps}
                                        aria-label={own.clearLabel ?? "Clear"}
                                        icon={<CloseIcon />}
                                        onClick={() => {
                                            query().setInputValue(
                                                "",
                                                "clear-trigger",
                                            );
                                            query().focus();
                                        }}
                                    />
                                )}
                            </Trailing>
                        </Show>
                    </Header>
                    <Divider {...slots("divider")} />
                    <Content {...slots("content")}>
                        {isPresent(own.children) ? (
                            own.children
                        ) : (
                            <For
                                each={matches()}
                                keyed={(item: SearchViewItem) => item.value}
                            >
                                {(item, index) => {
                                    const copy = () => ({
                                        index: index(),
                                        item: item(),
                                    });
                                    return (
                                        <Item
                                            item={item()}
                                            {...menuSlots("item", copy)}
                                        >
                                            <ItemContent
                                                {...menuSlots(
                                                    "itemContent",
                                                    copy,
                                                )}
                                            >
                                                <ItemLabel
                                                    {...menuSlots(
                                                        "itemLabel",
                                                        copy,
                                                    )}
                                                >
                                                    {item().label}
                                                </ItemLabel>
                                                <Show
                                                    when={item().supportingText}
                                                >
                                                    <ItemSupportingText
                                                        {...menuSlots(
                                                            "itemSupportingText",
                                                            copy,
                                                        )}
                                                    >
                                                        {item().supportingText}
                                                    </ItemSupportingText>
                                                </Show>
                                            </ItemContent>
                                        </Item>
                                    );
                                }}
                            </For>
                        )}
                    </Content>
                </Surface>
            </Positioner>
        </>
    );
}

/** The ready-made search view: the search bar that opens it, and the view with the back button,
 *  the query, the clear button while there's a query, the divider, and the suggestions. */
function ReadyMade(props: SearchViewProps): JSX.Element {
    const slots = createSlotProps(props);
    const own = omit(props, ...READY_MADE_PROPS) as SearchViewRootProps;
    const root = slots("root") as object;
    return (
        <Root {...own} {...root}>
            <ReadyMadeContent own={props} slots={slots} />
        </Root>
    );
}

/** Material's search view. Use it ready-made, `<SearchView placeholder="Search mail" items={[{
 *  value: "inbox", label: "Inbox" }, …]} onSelect={…} onSubmit={…} />`, or compose its parts
 *  under `SearchView.Root`: `Trigger` (around a SearchBar), then `Positioner` holding `Surface`,
 *  which holds `Header` (with `Leading`, `Input`, and `Trailing`), `Divider`, and `Content`, with
 *  an `Item` per suggestion (holding `ItemLeading`, `ItemContent` with `ItemLabel` and
 *  `ItemSupportingText`, and `ItemTrailing`). */
export const SearchView = Object.assign(ReadyMade, {
    Root,
    Trigger,
    Positioner,
    Surface,
    Header,
    Leading,
    Input,
    Trailing,
    Divider,
    Content,
    Item,
    ItemLeading,
    ItemContent,
    ItemLabel,
    ItemSupportingText,
    ItemTrailing,
});
