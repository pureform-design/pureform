// Zag's pagination, re-exported so bindings take every machine from one package, behind the
// paginator: a range label, a page-size select and the four triggers. Changing the page size keeps
// the first item on screen visible, as Angular Material's paginator does (Zag leaves the page
// alone unless it falls out of range). The root is a labelled `group`, and the range label is a
// polite live region, so the new range is announced as the page changes. Zag's `item` and
// `ellipsis` (numbered pages) stay in the API, though the paginator doesn't draw them.

import type { Machine as AnyMachine, Params } from "@zag-js/core";
import {
    connect as zagConnect,
    machine as zagMachine,
    type Api as PaginationApi,
    type Machine as ZagMachine,
} from "@zag-js/pagination";
import type { NormalizeProps, PropTypes } from "@zag-js/types";

import { type SchemaOf } from "../interaction";
import { parts } from "./paginator.anatomy";

export * from "@zag-js/pagination";

export { anatomy, parts } from "./paginator.anatomy";

export type Schema = SchemaOf<ZagMachine>;
export type Props = Schema["props"];
export type Machine = AnyMachine<Schema>;
export type Service = import("@zag-js/core").Service<Schema>;

/** Zag's API with the preset's parts. */
export interface Api<T extends PropTypes = PropTypes> extends PaginationApi<T> {
    /** The group of the page-size label and select. */
    getPageSizeProps(): T["element"];
    getPageSizeLabelProps(): T["element"];
    /** The element around the page-size select. */
    getPageSizeSelectProps(): T["element"];
    /** The text that says which items are shown: a polite live region. */
    getRangeLabelProps(): T["element"];
    /** The row of the first, previous, next and last triggers. */
    getActionsProps(): T["element"];
}

const DEFAULT_TRANSLATIONS = {
    rootLabel: "Pagination",
    firstTriggerLabel: "First page",
    prevTriggerLabel: "Previous page",
    nextTriggerLabel: "Next page",
    lastTriggerLabel: "Last page",
};

const zag = zagMachine as unknown as AnyMachine<Schema>;

type ZagParams = Params<Schema>;

/** The page that keeps the first item of the current page on screen at a new page size. */
export const pageAfterSize = (
    page: number,
    pageSize: number,
    size: number,
): number => Math.floor(((page - 1) * pageSize) / Math.max(size, 1)) + 1;

/** Zag's pagination machine, a page size change keeping the first item of the page shown. */
export const machine: Machine = {
    ...zag,
    props: (params) =>
        zag.props!({
            ...params,
            props: {
                ...params.props,
                translations: {
                    ...DEFAULT_TRANSLATIONS,
                    ...params.props.translations,
                },
            },
        }),
    implementations: {
        ...zag.implementations,
        actions: {
            ...zag.implementations?.actions,
            setPageSize({ context, event }: ZagParams) {
                const size = Number(event["size"]);
                const page = pageAfterSize(
                    context.get("page"),
                    context.get("pageSize"),
                    size,
                );
                context.set("pageSize", size);
                context.set("page", page);
            },
        } as never,
    },
};

/** Zag's connect, with the root a labelled `group` and the preset's parts. */
export function connect<T extends PropTypes>(
    service: Service,
    normalize: NormalizeProps<T>,
): Api<T> {
    const api = zagConnect(service as never, normalize) as PaginationApi<T>;
    const part = (
        name: keyof typeof parts,
        extra: Record<string, unknown> = {},
    ) =>
        normalize.element({
            ...parts[name].attrs,
            dir: service.prop("dir"),
            ...extra,
        });
    return {
        ...api,
        getRootProps: () => ({
            ...api.getRootProps(),
            ...normalize.element({ role: "group" }),
        }),
        getPageSizeProps: () => part("pageSize"),
        getPageSizeLabelProps: () => part("pageSizeLabel"),
        getPageSizeSelectProps: () => part("pageSizeSelect"),
        getRangeLabelProps: () =>
            part("rangeLabel", {
                "aria-live": "polite",
                "aria-atomic": "true",
            }),
        getActionsProps: () => part("actions"),
    };
}
