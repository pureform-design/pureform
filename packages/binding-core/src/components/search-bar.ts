// The search bar's contract, shared by every binding: the props Root takes for itself, how they
// map onto the selection and the text field machine (a search bar is a text input without a label
// or supporting text), the content the ready-made search bar takes, and the input's own props.

import type {
    PartName,
    searchBarAnatomy,
    TestIdOverride,
} from "@pureform/anatomy";
import type { InstanceTokens, Selection } from "@pureform/styling";

import type { Controllable } from "../controllable";
import type { Unstyled } from "../parts";
import type { VariantProp } from "./variants";

/** The search bar's parts: `"root" | "leading" | "input" | "trailing"`. */
export type SearchBarPart = PartName<typeof searchBarAnatomy>;

/** The search bar's variants and instance tokens. */
export interface SearchBarVariantProps {
    /** Centers the query and placeholder, as an app bar's search does. */
    readonly centered?: VariantProp<"searchBar", "centered">;
    /** The app bar it sits in is scrolled under: the bar takes the scrolled container color. */
    readonly scrolled?: VariantProp<"searchBar", "scrolled">;
    readonly tokens?: InstanceTokens<"searchBar"> | undefined;
}

/** The ids of the elements the machine finds. */
export interface SearchBarElementIds {
    readonly root?: string | undefined;
    readonly input?: string | undefined;
}

/** What Root passes to the text field machine, besides the variants. */
export interface SearchBarBehaviorProps extends Controllable<"value", string> {
    readonly disabled?: boolean | undefined;
    readonly required?: boolean | undefined;
    readonly readOnly?: boolean | undefined;
    /** The hint the empty input shows, such as "Search mail". */
    readonly placeholder?: string | undefined;
    /** The name the input submits its text under.
     *  @control none */
    readonly name?: string | undefined;
    /** The id of the form the input belongs to, for a search bar outside it.
     *  @control none */
    readonly form?: string | undefined;
    /** Root's id, also the machine's.
     *  @control none */
    readonly id?: string | undefined;
    readonly ids?: SearchBarElementIds | undefined;
}

/** Everything Root takes for itself, besides the element's own props and `as`. */
export interface SearchBarRootOwnProps
    extends SearchBarVariantProps, SearchBarBehaviorProps {
    /** A prefix for every part's test id (`mail` → `mail-input`), or ids by part. */
    readonly testId?: TestIdOverride<SearchBarPart> | undefined;
    /** Every part, or some, without the registry's styles. */
    readonly unstyled?: Unstyled<SearchBarPart> | undefined;
}

/** The keys of `SearchBarRootOwnProps`, which Root keeps off its element. */
export const SEARCH_BAR_ROOT_PROPS = [
    "centered",
    "scrolled",
    "tokens",
    "disabled",
    "required",
    "readOnly",
    "placeholder",
    "name",
    "form",
    "id",
    "ids",
    "value",
    "defaultValue",
    "onValueChange",
    "testId",
    "unstyled",
] as const satisfies readonly (keyof SearchBarRootOwnProps)[];

/** The props of the ready-made search bar that belong on the native input: its name and
 *  description, and the search's own attributes. */
export const SEARCH_BAR_INPUT_PROPS = [
    "list",
    "aria-label",
    "aria-labelledby",
    "aria-describedby",
    "aria-controls",
    "aria-expanded",
    "aria-autocomplete",
] as const;

/** What the ready-made search bar renders inside Root, in the framework's node type. */
export interface SearchBarContentProps<Node> {
    /** An icon before the input, such as a magnifier or a menu; renders only when given, hidden
     *  from assistive technology. */
    readonly leading?: Node;
    /** Icons, icon buttons, or an avatar after the input; renders only when given. */
    readonly trailing?: Node;
    /** Flip the leading or trailing part under `rtl`, for an icon that points. */
    readonly mirrorLeading?: boolean | undefined;
    readonly mirrorTrailing?: boolean | undefined;
}

/** The keys of `SearchBarContentProps`. */
export const SEARCH_BAR_CONTENT_PROPS = [
    "leading",
    "trailing",
    "mirrorLeading",
    "mirrorTrailing",
] as const satisfies readonly (keyof SearchBarContentProps<unknown>)[];

/** The registry selection from Root's props. */
export const searchBarSelection = (
    props: SearchBarVariantProps,
): Selection<"searchBar"> => ({
    centered: props.centered,
    scrolled: props.scrolled,
    tokens: props.tokens,
});

/** The text field machine's props from Root's, besides `id`, `dir`, and the controllable `value`
 *  (the binding's `useControllable`). The placeholder is the input's own: a search bar has no
 *  floating label. */
export const searchBarMachineProps = (props: SearchBarBehaviorProps) => ({
    disabled: props.disabled,
    required: props.required,
    readOnly: props.readOnly,
    placeholder: props.placeholder ?? "",
    name: props.name,
    form: props.form,
    ids: { root: props.id ?? props.ids?.root, input: props.ids?.input },
});
