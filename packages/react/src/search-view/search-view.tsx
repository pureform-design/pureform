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
import type { PartName, TestIdOverride } from "@pureform/anatomy";
import {
    isPresent,
    opensSearchView,
    presentProps,
    SEARCH_VIEW_COLLECTION,
    SEARCH_VIEW_ROOT_PROPS,
    SEARCH_VIEW_ROOT_STYLE,
    SEARCH_VIEW_TRIGGER_STYLE,
    searchViewCarriedKey,
    searchViewComboboxProps,
    searchViewLabel,
    searchViewMatches,
    searchViewMenuSelection,
    searchViewPositionerLayout,
    searchViewSelection,
} from "@pureform/binding-core";
import type {
    SearchViewContentProps,
    SearchViewItem,
    SearchViewPart,
    SearchViewRootOwnProps,
    Unstyled,
} from "@pureform/binding-core";
import { searchViewDomDialogProps } from "@pureform/binding-dom";
import { stackPositioner } from "@pureform/binding-dom";
import * as combobox from "@pureform/machines/combobox";
import * as dialog from "@pureform/machines/dialog";
import { mergeProps, normalizeProps } from "@zag-js/react";
import type { PropTypes } from "@zag-js/react";
import {
    type ElementType,
    type KeyboardEvent,
    type ReactNode,
    type RefObject,
    useCallback,
    useId,
    useMemo,
    useRef,
    useState,
} from "react";

import { useControllable } from "../controllable";
import { BackIcon, CloseIcon } from "../glyphs";
import { IconButton } from "../icon-button";
import { useItemInteractionSources } from "../interaction";
import type { ItemInteractionSources } from "../interaction";
import { useMachine } from "../machine";
import { createPartContext } from "../part-context";
import { useComponent, useSlotProps } from "../parts";
import type { ComponentScope, SlotKeyedProps } from "../parts";
import { usePresence } from "../presence";
import type { Presence } from "../presence";
import { omitProps } from "../props";
import type { PartProps } from "../props";
import { useDirection } from "../provider";
import { SearchBar } from "../search-bar";

type Anatomy = typeof searchViewOverlayAnatomy;
type MenuAnatomy = typeof searchViewMenuAnatomy;

/** What Root shares with its parts. */
interface SearchViewContextValue {
    readonly scope: ComponentScope<Anatomy>;
    readonly menu: ComponentScope<MenuAnatomy>;
    readonly view: dialog.Api<PropTypes>;
    readonly query: combobox.Api<PropTypes>;
    readonly matches: readonly SearchViewItem[];
    readonly variant: string | undefined;
    readonly presence: Presence;
    readonly sources: ItemInteractionSources;
    readonly positioner: RefObject<HTMLElement | null>;
    readonly label: string;
    readonly disabled: boolean | undefined;
    readonly setInput: (element: HTMLElement | null) => void;
    readonly submit: () => void;
}

/** What a suggestion shares with its parts. */
interface ItemContextValue {
    readonly item: SearchViewItem;
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
    readonly as?: ElementType | undefined;
}

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

const NO_ITEMS: readonly SearchViewItem[] = [];

/** The search view's root, a positioned `<div>` around the trigger and the view, so a docked
 *  view drops over the search bar. The registry doesn't style it. */
function Root(props: SearchViewRootProps): ReactNode {
    const id = useId();
    const dir = useDirection();
    const open = useControllable<"open", boolean>("SearchView", "open", props);
    const inputValue = useControllable<"inputValue", string>(
        "SearchView",
        "inputValue",
        props,
    );
    const input = useRef<HTMLElement | null>(null);
    const setInput = useCallback((element: HTMLElement | null) => {
        input.current = element;
    }, []);
    const view = useMachine(dialog.machine, {
        id,
        dir,
        ...searchViewDomDialogProps(props, () => input.current),
        ...open.machineProps,
    });
    const viewApi = dialog.connect(view, normalizeProps);
    // What the input shows, for the filter: Zag's own once it runs, the given text before.
    const [typed, setTyped] = useState(
        () => props.inputValue ?? props.defaultInputValue ?? "",
    );
    const items = props.items ?? NO_ITEMS;
    const matches = useMemo(
        () => searchViewMatches(items, typed, props.filter),
        [items, typed, props.filter],
    );
    const collection = useMemo(
        () =>
            combobox.collection<SearchViewItem>({
                items: matches,
                ...SEARCH_VIEW_COLLECTION,
            }),
        [matches],
    );
    const close = () => {
        if (props.closeOnSelect !== false) viewApi.setOpen(false);
    };
    const sources = useItemInteractionSources();
    const text = inputValue.machineProps;
    const service = useMachine(combobox.machine, {
        id,
        ...sources.machineProps,
        dir,
        collection,
        ...searchViewComboboxProps(props, viewApi.open),
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
                item: matches.find((item) => item.value === value),
            });
            close();
        },
    });
    const query = combobox.connect(service, normalizeProps);
    const submit = () => {
        props.onSubmit?.({ inputValue: query.inputValue });
        close();
    };
    const positioner = useRef<HTMLElement | null>(null);
    const presence = usePresence(viewApi.open, (surface) =>
        positioner.current
            ? stackPositioner(positioner.current, surface)
            : undefined,
    );
    const scope = useComponent(searchViewOverlayAnatomy, {
        selection: searchViewSelection(props),
        testId: props.testId as TestIdOverride<PartName<Anatomy>> | undefined,
        unstyled: props.unstyled as Unstyled<PartName<Anatomy>> | undefined,
    });
    const menu = useComponent(searchViewMenuAnatomy, {
        selection: searchViewMenuSelection(),
        testId: typeof props.testId === "string" ? props.testId : undefined,
        indication: props.indication,
    });
    const { as, ...rest } = omitProps(props, SEARCH_VIEW_ROOT_PROPS);
    return (
        <context.Provider
            value={{
                scope,
                menu,
                view: viewApi,
                query,
                matches,
                variant: props.variant as string | undefined,
                presence,
                sources,
                positioner,
                label: searchViewLabel(props),
                disabled: props.disabled,
                setInput,
                submit,
            }}
        >
            {scope.render("root", {
                element: "div",
                as,
                machine: { style: SEARCH_VIEW_ROOT_STYLE },
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
function Trigger({ unstyled, ...props }: SearchViewPartProps): ReactNode {
    const { scope, view, query, label, disabled } = context.use("Trigger");
    return scope.render("trigger", {
        element: "button",
        machine: mergeProps(
            view.getTriggerProps(),
            normalizeProps.button({
                "aria-label": label,
                disabled,
                style: SEARCH_VIEW_TRIGGER_STYLE,
                onKeyDown: (event: KeyboardEvent) => {
                    if (view.open || !opensSearchView(event)) return;
                    event.preventDefault();
                    const carried = searchViewCarriedKey(event.key);
                    if (carried !== undefined)
                        query.setInputValue(
                            query.inputValue + carried,
                            "input-change",
                        );
                    view.setOpen(true);
                },
            }),
        ),
        unstyled,
        props,
    });
}

/** Places the view over the viewport (`fullScreen`) or over the search bar's place, stacked at
 *  its surface's layer; hidden once it's closed and its exit animation is over. The registry
 *  doesn't style it. */
function Positioner({ unstyled, ...props }: SearchViewPartProps): ReactNode {
    const { scope, view, variant, presence, positioner } =
        context.use("Positioner");
    return scope.render("positioner", {
        element: "div",
        ref: positioner,
        machine: mergeProps(
            view.getPositionerProps(),
            normalizeProps.element(
                searchViewPositionerLayout(variant, presence.present),
            ),
        ),
        unstyled,
        props,
    });
}

/** The view's surface, a modal dialog. It stays while its exit animation runs. */
function Surface({ unstyled, ...props }: SearchViewPartProps): ReactNode {
    const { scope, view, presence } = context.use("Surface");
    return scope.render("surface", {
        element: "div",
        ref: presence.ref,
        machine: presentProps(view.getContentProps(), presence.present),
        unstyled,
        props,
    });
}

/** The row at the top: the leading icon, the input, and the trailing icons. */
function Header({ unstyled, ...props }: SearchViewPartProps): ReactNode {
    const { scope } = context.use("Header");
    return scope.render("header", { element: "div", unstyled, props });
}

/** Before the input: an icon, or an icon button such as back (the ready-made's closes the
 *  view). */
function Leading({
    unstyled,
    mirror,
    ...props
}: SearchViewIconProps): ReactNode {
    const { scope } = context.use("Leading");
    return scope.render("leading", {
        element: "span",
        states: { mirrored: mirror },
        unstyled,
        props,
    });
}

/** The query: the combobox input, which takes focus as the view opens. The arrow keys move
 *  through the suggestions, Enter chooses the highlighted one or submits the query, and Escape
 *  closes the view. */
function Input({ unstyled, ...props }: SearchViewPartProps): ReactNode {
    const { scope, query, setInput, submit } = context.use("Input");
    return scope.render("input", {
        element: "input",
        machine: mergeProps(
            query.getInputProps(),
            normalizeProps.input({
                type: "search",
                onKeyDown: (event: { readonly key: string }) => {
                    if (
                        event.key === "Enter" &&
                        query.highlightedValue === null
                    )
                        submit();
                },
            }),
        ),
        ref: setInput,
        unstyled,
        props,
    });
}

/** After the input: icons or icon buttons, such as clear. */
function Trailing({
    unstyled,
    mirror,
    ...props
}: SearchViewIconProps): ReactNode {
    const { scope } = context.use("Trailing");
    return scope.render("trailing", {
        element: "span",
        states: { mirrored: mirror },
        unstyled,
        props,
    });
}

/** The line between the header and the content (none in the contained view). */
function Divider({ unstyled, ...props }: SearchViewPartProps): ReactNode {
    const { scope } = context.use("Divider");
    return scope.render("divider", {
        element: "div",
        machine: { role: "presentation" },
        unstyled,
        props,
    });
}

/** The suggestions: the combobox's listbox, or any content (results, recent searches). */
function Content({ unstyled, ...props }: SearchViewPartProps): ReactNode {
    const { scope, query } = context.use("Content");
    return scope.render("content", {
        element: "div",
        machine: query.getContentProps(),
        unstyled,
        props,
    });
}

/** A suggestion, drawn as a menu item; the highlighted one shows the hover state. */
function Item({ unstyled, item, ...props }: SearchViewItemProps): ReactNode {
    const { menu, query, sources } = context.use("Item");
    const source = sources.item(item.value, item.interactionSource);
    return (
        <itemContext.Provider value={{ item }}>
            {menu.render("item", {
                element: "div",
                interactionSource: source,
                machine: query.getItemProps({ item }),
                states: { hover: query.getItemState({ item }).highlighted },
                unstyled,
                props,
            })}
        </itemContext.Provider>
    );
}

const itemPart = (
    part: "itemLeading" | "itemContent" | "itemSupportingText" | "itemTrailing",
    name: string,
) =>
    function ItemPart({
        unstyled,
        mirror,
        ...props
    }: SearchViewIconProps): ReactNode {
        const { menu } = context.use(name);
        return menu.render(part, {
            element: "span",
            states: { mirrored: mirror },
            unstyled,
            props,
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
function ItemLabel({ unstyled, ...props }: SearchViewPartProps): ReactNode {
    const { menu, query } = context.use("ItemLabel");
    const { item } = itemContext.use("ItemLabel");
    return menu.render("itemLabel", {
        element: "span",
        machine: query.getItemTextProps({ item }),
        unstyled,
        props,
    });
}

/** The ready-made search view's props: Root's, with `className`, `style`, and `slotProps` keyed
 *  by part, the search bar that opens it (a search bar showing the query unless given), the
 *  leading and trailing icons, and content in place of the suggestions. */
export interface SearchViewProps
    extends
        Omit<SearchViewRootProps, keyof SlotKeyedProps<Anatomy> | "children">,
        SlotKeyedProps<Anatomy>,
        SearchViewContentProps<ReactNode> {
    readonly testId?: TestIdOverride<SearchViewPart>;
    readonly unstyled?: Unstyled<SearchViewPart>;
}

// Inside Root, so it can read the query and the suggestions.
function ReadyMadeContent({
    own,
}: {
    readonly own: SearchViewProps;
}): ReactNode {
    const { view, query, matches } = context.use("Root");
    const slot = useSlotProps(own);
    return (
        <>
            <Trigger {...slot("trigger")}>
                {isPresent(own.trigger) ? (
                    own.trigger
                ) : (
                    <SearchBar
                        as="span"
                        inert
                        placeholder={own.placeholder}
                        value={query.inputValue}
                        readOnly
                    />
                )}
            </Trigger>
            <Positioner {...slot("positioner")}>
                <Surface {...slot("surface")}>
                    <Header {...slot("header")}>
                        <Leading mirror {...slot("leading")}>
                            <IconButton
                                aria-label={own.backLabel ?? "Back"}
                                icon={
                                    isPresent(own.leading) ? (
                                        own.leading
                                    ) : (
                                        <BackIcon />
                                    )
                                }
                                onClick={() => view.setOpen(false)}
                            />
                        </Leading>
                        <Input {...slot("input")} />
                        {isPresent(own.trailing) || query.inputValue !== "" ? (
                            <Trailing {...slot("trailing")}>
                                {isPresent(own.trailing) ? (
                                    own.trailing
                                ) : (
                                    <IconButton
                                        aria-label={own.clearLabel ?? "Clear"}
                                        icon={<CloseIcon />}
                                        onClick={() => {
                                            query.setInputValue(
                                                "",
                                                "clear-trigger",
                                            );
                                            query.focus();
                                        }}
                                    />
                                )}
                            </Trailing>
                        ) : null}
                    </Header>
                    <Divider {...slot("divider")} />
                    <Content {...slot("content")}>
                        {isPresent(own.children)
                            ? own.children
                            : matches.map((item) => (
                                  <Item key={item.value} item={item}>
                                      <ItemContent>
                                          <ItemLabel>{item.label}</ItemLabel>
                                          {item.supportingText ? (
                                              <ItemSupportingText>
                                                  {item.supportingText}
                                              </ItemSupportingText>
                                          ) : null}
                                      </ItemContent>
                                  </Item>
                              ))}
                    </Content>
                </Surface>
            </Positioner>
        </>
    );
}

/** The ready-made search view: the search bar that opens it, and the view with the back button,
 *  the query, the clear button while there's a query, the divider, and the suggestions. */
function ReadyMade(props: SearchViewProps): ReactNode {
    const {
        className: _className,
        style: _style,
        slotProps: _slotProps,
        children: _children,
        trigger: _trigger,
        leading: _leading,
        trailing: _trailing,
        backLabel: _backLabel,
        clearLabel: _clearLabel,
        ...rootProps
    } = props;
    const slot = useSlotProps(props);
    return (
        <Root {...rootProps} {...(slot("root") as object)}>
            <ReadyMadeContent own={props} />
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
