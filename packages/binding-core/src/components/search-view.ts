// The search view's contract, shared by every binding: the props Root takes for itself, how they
// map onto the selection, Zag's dialog (the view: modal, so focus stays in it and goes back when
// it closes) and Zag's combobox (the query and its suggestions), and where the positioner puts
// the view. The search bar that opens it is the trigger: a press on it, or typing into it, opens
// the view, which takes focus in its own input.

import type {
    PartName,
    searchViewMenuAnatomy,
    searchViewOverlayAnatomy,
    TestIdOverride,
} from "@pureform/anatomy";
import type { InstanceTokens, Selection } from "@pureform/styling";

import type { Controllable } from "../controllable";
import type { Unstyled } from "../parts";
import type { AutocompleteFilter } from "./autocomplete";
import { autocompleteMatches } from "./autocomplete";
import type { IndicationProps, InteractionSourceProps } from "./indication";
import type { VariantProp } from "./variants";

/** The search view's parts: `"root" | "trigger" | "positioner" | "surface" | "header" |
 *  "leading" | "input" | "trailing" | "divider" | "content"`. */
export type SearchViewPart = PartName<typeof searchViewOverlayAnatomy>;

/** The parts of a suggestion, drawn as a menu item. */
export type SearchViewItemPart = PartName<typeof searchViewMenuAnatomy>;

/** One suggestion, as data. */
export interface SearchViewItem extends InteractionSourceProps {
    readonly value: string;
    /** What the suggestion shows, and what the query becomes when it's chosen. */
    readonly label: string;
    /** A second line under the label. */
    readonly supportingText?: string | undefined;
    readonly disabled?: boolean | undefined;
}

/** The search view's variant and instance tokens. */
export interface SearchViewVariantProps {
    /** `fullScreen` covers the viewport; `docked` and `contained` drop over the search bar's
     *  place, inside Root. @default "fullScreen" */
    readonly variant?: VariantProp<"searchView", "variant">;
    readonly tokens?: InstanceTokens<"searchView"> | undefined;
}

/** The ids of the search view's elements, for composition. */
export interface SearchViewElementIds {
    readonly root?: string | undefined;
    readonly surface?: string | undefined;
    readonly input?: string | undefined;
    readonly content?: string | undefined;
}

/** What the machines take from Root's props. `open` is the view's; `inputValue` is the query. */
export interface SearchViewBehaviorProps
    extends Controllable<"open", boolean>, Controllable<"inputValue", string> {
    /** The suggestions, in order; the view shows those `filter` keeps. */
    readonly items?: readonly SearchViewItem[] | undefined;
    /** Which suggestions the query keeps. `false` keeps all (the app filters `items`).
     *  @default labels containing the query, ignoring case */
    readonly filter?: AutocompleteFilter | false | undefined;
    /** A suggestion was chosen: by a press, or Enter on the highlighted one. The query becomes
     *  its label. */
    readonly onSelect?:
        | ((details: SearchViewSelectDetails) => void)
        | undefined;
    /** Enter with no suggestion highlighted: search for the query. */
    readonly onSubmit?:
        | ((details: SearchViewSubmitDetails) => void)
        | undefined;
    /** Close the view once a suggestion is chosen or the query submitted. @default true */
    readonly closeOnSelect?: boolean | undefined;
    /** The input's hint, such as "Search mail". */
    readonly placeholder?: string | undefined;
    /** The view's name for assistive technology. @default the placeholder, else "Search" */
    readonly "aria-label"?: string | undefined;
    readonly disabled?: boolean | undefined;
    /** @control none */
    readonly id?: string | undefined;
    readonly ids?: SearchViewElementIds | undefined;
}

/** What `onSelect` hears. */
export interface SearchViewSelectDetails {
    readonly value: string;
    readonly item: SearchViewItem | undefined;
}

/** What `onSubmit` hears. */
export interface SearchViewSubmitDetails {
    readonly inputValue: string;
}

/** Everything Root takes for itself, besides the element's own props and `as`. */
export interface SearchViewRootOwnProps
    extends SearchViewVariantProps, SearchViewBehaviorProps, IndicationProps {
    readonly testId?: TestIdOverride<SearchViewPart> | undefined;
    readonly unstyled?: Unstyled<SearchViewPart> | undefined;
}

/** The keys of `SearchViewRootOwnProps`, which Root keeps off its element. */
export const SEARCH_VIEW_ROOT_PROPS = [
    "variant",
    "tokens",
    "items",
    "filter",
    "onSelect",
    "onSubmit",
    "closeOnSelect",
    "placeholder",
    "aria-label",
    "disabled",
    "id",
    "ids",
    "open",
    "defaultOpen",
    "onOpenChange",
    "inputValue",
    "defaultInputValue",
    "onInputValueChange",
    "testId",
    "unstyled",
    "indication",
] as const satisfies readonly (keyof SearchViewRootOwnProps)[];

/** What the ready-made search view renders, in the framework's node type. */
export interface SearchViewContentProps<Node> {
    /** The search bar that opens the view; a press on it or typing into it opens it. */
    readonly trigger?: Node;
    /** The leading icon button's icon. @default a back arrow, which closes the view */
    readonly leading?: Node;
    /** The leading button's name. @default "Back" */
    readonly backLabel?: string | undefined;
    /** Trailing icons; the clear button shows while there's a query unless given. */
    readonly trailing?: Node;
    /** The clear button's name. @default "Clear" */
    readonly clearLabel?: string | undefined;
    /** Content instead of the suggestions, such as recent searches or results. */
    readonly children?: Node;
}

/** The keys of `SearchViewContentProps` the ready-made search view keeps off Root. */
export const SEARCH_VIEW_CONTENT_PROPS = [
    "trigger",
    "leading",
    "backLabel",
    "trailing",
    "clearLabel",
] as const satisfies readonly (keyof SearchViewContentProps<unknown>)[];

/** The registry selection from Root's props. */
export const searchViewSelection = (
    props: SearchViewVariantProps,
): Selection<"searchView"> => ({
    variant: props.variant,
    tokens: props.tokens,
});

/** The suggestions' registry selection: the menu's, in its default colors. */
export const searchViewMenuSelection = (): Selection<"menu"> => ({});

/** The suggestions the view shows for the query. */
export const searchViewMatches = (
    items: readonly SearchViewItem[],
    inputValue: string,
    filter: AutocompleteFilter | false | undefined,
): SearchViewItem[] =>
    autocompleteMatches(items, inputValue, filter) as SearchViewItem[];

/** The collection's options: how Zag reads a `SearchViewItem`. */
export const SEARCH_VIEW_COLLECTION = {
    itemToValue: (item: SearchViewItem) => item.value,
    itemToString: (item: SearchViewItem) => item.label,
    isItemDisabled: (item: SearchViewItem) => item.disabled === true,
} as const;

/** The view's name. */
export const searchViewLabel = (props: SearchViewBehaviorProps): string =>
    props["aria-label"] ?? props.placeholder ?? "Search";

/** Zag's dialog props for the view, besides `id`, `dir` and the controllable `open`: modal, so
 *  focus stays in it and goes back to the search bar once it closes. `input` finds the view's
 *  input, which takes focus as it opens. */
export const searchViewDialogProps = (
    props: SearchViewBehaviorProps,
    input: () => HTMLElement | null,
) => ({
    modal: true,
    role: "dialog" as const,
    restoreFocus: true,
    initialFocusEl: input,
    "aria-label": searchViewLabel(props),
    ids: { content: props.ids?.surface },
});

/** Zag's combobox props for the query, besides `id`, `dir`, the collection and the controllable
 *  `inputValue`: always open while the view is, and leaving dismissal to the view's dialog. */
export const searchViewComboboxProps = (
    props: SearchViewBehaviorProps,
    open: boolean,
) => ({
    open,
    disableLayer: true,
    allowCustomValue: true,
    selectionBehavior: "replace" as const,
    placeholder: props.placeholder ?? "",
    disabled: props.disabled,
    ids: {
        root: props.id ?? props.ids?.root,
        input: props.ids?.input,
        content: props.ids?.content,
    },
});

/** Whether a key pressed in the search bar opens the view: Enter, the down arrow, or a
 *  character. */
export const opensSearchView = (event: {
    readonly key: string;
    readonly ctrlKey?: boolean;
    readonly metaKey?: boolean;
    readonly altKey?: boolean;
}): boolean =>
    event.key === "Enter" ||
    event.key === "ArrowDown" ||
    (event.key.length === 1 &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey);

/** Where the positioner puts the view: over the viewport for `fullScreen`; at the top of Root,
 *  over the search bar's place, for `docked` and `contained`. Hidden once the view is gone. */
export const searchViewPositionerLayout = (
    variant: string | undefined,
    present: boolean,
) => ({
    hidden: !present,
    style:
        variant === "docked" || variant === "contained"
            ? ({
                  position: "absolute",
                  top: "0",
                  left: "0",
                  right: "0",
                  display: "flex",
                  boxSizing: "border-box",
              } as const)
            : ({
                  position: "fixed",
                  inset: "0",
                  display: "flex",
                  alignItems: "stretch",
                  boxSizing: "border-box",
              } as const),
});

/** Root's own layout: positioned, so a docked view drops over the search bar inside it. */
export const SEARCH_VIEW_ROOT_STYLE = { position: "relative" } as const;
