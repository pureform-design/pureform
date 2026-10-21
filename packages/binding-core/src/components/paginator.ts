// The paginator's contract, shared by every binding: the props Root takes for itself, how they map
// onto Zag's pagination machine and the selection, the page-size options and the range label, and
// the arithmetic React Native shares (it has no machine). The paginator is the preset's
// `paginator` (a row); its triggers are icon buttons and its page-size field the select. Angular
// Material's paginator is the model (M3 has none): a range label, a page-size select, and first,
// previous, next and last buttons. Pages are numbered from 1, as Zag's are.

import type {
    PartName,
    paginatorAnatomy,
    TestIdOverride,
} from "@pureform/anatomy";
import type { InstanceTokens, Selection } from "@pureform/styling";

import type { ChangeReason, Controllable } from "../controllable";
import type { Unstyled } from "../parts";
import type { SelectItem } from "./select";

/** The paginator's parts. The four triggers are icon buttons. */
export type PaginatorPart = PartName<typeof paginatorAnatomy>;

/** A change of the page: the page and the page size it's at, and why when a form reset caused it. */
export interface PaginatorPageDetails {
    readonly page: number;
    readonly pageSize: number;
    readonly reason?: ChangeReason | undefined;
}

/** A change of the page size. Changing it keeps the first item of the page on screen, so the page
 *  changes with it (`onPageChange`). */
export interface PaginatorPageSizeDetails {
    readonly pageSize: number;
    readonly reason?: ChangeReason | undefined;
}

/** The range label's numbers: the 1-based first and last item shown, and the total. With no items,
 *  all are 0. */
export interface PaginatorRange {
    readonly start: number;
    readonly end: number;
    readonly count: number;
}

/** The words the paginator shows and speaks; each defaults to English. */
export interface PaginatorTranslations {
    /** The group's name. @default "Pagination" */
    readonly rootLabel?: string | undefined;
    /** The page-size select's label. @default "Items per page:" */
    readonly itemsPerPage?: string | undefined;
    /** The range label's text. @default "1 – 10 of 100" */
    readonly range?: ((range: PaginatorRange) => string) | undefined;
    readonly firstPage?: string | undefined;
    readonly previousPage?: string | undefined;
    readonly nextPage?: string | undefined;
    readonly lastPage?: string | undefined;
}

/** The paginator's variants and tokens. It has no variant groups: it follows the theme's density. */
export interface PaginatorVariantProps {
    readonly tokens?: InstanceTokens<"paginator"> | undefined;
}

/** What Zag's pagination takes from Root's props, and what the row shows. */
export interface PaginatorBehaviorProps
    extends
        Controllable<"page", number, PaginatorPageDetails>,
        Controllable<"pageSize", number, PaginatorPageSizeDetails> {
    /** The number of items in all, across every page. @default 0 */
    readonly count?: number | undefined;
    /** The page sizes the select offers; the current size is added when it isn't there.
     *  @default [10, 25, 50, 100] */
    readonly pageSizeOptions?: readonly number[] | undefined;
    /** Hides the page-size select and its label. */
    readonly hidePageSize?: boolean | undefined;
    /** Shows the first and last page buttons beside previous and next. */
    readonly showFirstLastButtons?: boolean | undefined;
    /** Disables every control. */
    readonly disabled?: boolean | undefined;
    readonly translations?: PaginatorTranslations | undefined;
    /** The group element's id; the machine finds the element by it. */
    readonly id?: string | undefined;
}

/** Everything Root takes for itself, besides the element's own props and `as`. */
export interface PaginatorRootOwnProps
    extends PaginatorVariantProps, PaginatorBehaviorProps {
    readonly testId?: TestIdOverride<PaginatorPart> | undefined;
    readonly unstyled?: Unstyled<PaginatorPart> | undefined;
}

/** The keys of `PaginatorRootOwnProps`, which Root keeps off its element. */
export const PAGINATOR_ROOT_PROPS = [
    "tokens",
    "page",
    "defaultPage",
    "onPageChange",
    "pageSize",
    "defaultPageSize",
    "onPageSizeChange",
    "count",
    "pageSizeOptions",
    "hidePageSize",
    "showFirstLastButtons",
    "disabled",
    "translations",
    "id",
    "testId",
    "unstyled",
] as const satisfies readonly (keyof PaginatorRootOwnProps)[];

/** The page sizes offered when none are given. */
export const DEFAULT_PAGE_SIZE_OPTIONS: readonly number[] = [10, 25, 50, 100];

/** The page size a paginator starts with when none is given. */
export const DEFAULT_PAGE_SIZE = 10;

/** The paginator's registry selection. */
export const paginatorSelection = (
    props: PaginatorVariantProps,
): Selection<"paginator"> => ({ tokens: props.tokens });

/** The page sizes the select offers: `options` and `current`, each once, smallest first. */
export const paginatorPageSizes = (
    options: readonly number[] | undefined,
    current: number,
): number[] =>
    [...new Set([...(options ?? DEFAULT_PAGE_SIZE_OPTIONS), current])]
        .filter((size) => size > 0)
        .sort((a, b) => a - b);

/** The page sizes as the select's items. */
export const paginatorSizeItems = (sizes: readonly number[]): SelectItem[] =>
    sizes.map((size) => ({ value: String(size), label: String(size) }));

/** The number of pages. None for no items. */
export const paginatorTotalPages = (count: number, pageSize: number): number =>
    Math.ceil(Math.max(count, 0) / Math.max(pageSize, 1));

/** A page within the range of pages, at least the first. */
export const paginatorClampPage = (
    page: number,
    count: number,
    pageSize: number,
): number =>
    Math.min(
        Math.max(Math.trunc(page) || 1, 1),
        Math.max(paginatorTotalPages(count, pageSize), 1),
    );

/** The page that keeps the first item of the page on screen at a new page size. */
export const paginatorPageAfterSize = (
    page: number,
    pageSize: number,
    size: number,
): number => Math.floor(((page - 1) * pageSize) / Math.max(size, 1)) + 1;

/** The first and last item shown on a page, from 1. */
export const paginatorRange = (
    page: number,
    pageSize: number,
    count: number,
): PaginatorRange => {
    const total = Math.max(count, 0);
    if (total === 0) return { start: 0, end: 0, count: 0 };
    const start = (page - 1) * pageSize;
    return {
        start: Math.min(start, total) + 1,
        end: Math.min(start + pageSize, total),
        count: total,
    };
};

/** The range label's text: "1 – 10 of 100", as Angular Material words it. */
export const paginatorRangeLabel = (
    range: PaginatorRange,
    translations?: PaginatorTranslations,
): string => {
    if (translations?.range) return translations.range(range);
    if (range.count === 0) return "0 of 0";
    return `${range.start} – ${range.end} of ${range.count}`;
};

/** Zag's props from Root's, besides the controllable page and page size (the binding's
 *  `useControllable`) and `id`: the item count and the words the triggers carry. */
export const paginatorMachineProps = (props: PaginatorBehaviorProps) => ({
    count: props.count ?? 0,
    translations: {
        rootLabel: props.translations?.rootLabel,
        firstTriggerLabel: props.translations?.firstPage,
        prevTriggerLabel: props.translations?.previousPage,
        nextTriggerLabel: props.translations?.nextPage,
        lastTriggerLabel: props.translations?.lastPage,
    },
});

/** A trigger's props from Zag's, when the whole paginator is disabled: the buttons are never
 *  enabled, whatever page it's on. */
export const paginatorTriggerProps = <P extends object>(
    props: P,
    disabled: boolean | undefined,
): P =>
    disabled ? ({ ...props, disabled: true, "data-disabled": "" } as P) : props;
