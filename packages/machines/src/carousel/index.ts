// Zag's carousel, re-exported so bindings take every machine from one package, with the parts the
// preset draws: each item's `mask` (the rounded item people see, which takes focus and presses)
// and its `content`. Items size themselves (`autoSize`), since the bindings size them from the
// layout, and each one is a page to snap to. The arrow keys move focus between the masks, by
// direction (Zag's own keys don't flip under `rtl`), and scroll the focused one into place; with
// `reducedMotion` they and the page props scroll at once rather than smoothly. Each mask emits to
// its own interaction source, keyed by its index.

import {
    connect as zagConnect,
    machine as zagMachine,
    type Api as CarouselApi,
    type Machine as ZagMachine,
} from "@zag-js/carousel";
import type {
    Machine as AnyMachine,
    Params,
    Service as AnyService,
} from "@zag-js/core";
import type { NormalizeProps, PropTypes } from "@zag-js/types";

import {
    emittersOf,
    type ItemInteractionProps,
    type SchemaOf,
    withInteraction,
    type WithProps,
} from "../interaction";
import { pressableItemProps } from "../interaction/pressable";
import { rovingIndex } from "../interaction/roving";

export * from "@zag-js/carousel";
import { parts } from "./carousel.anatomy";

export { anatomy, parts } from "./carousel.anatomy";

/** What the carousel takes besides Zag's props. */
export interface CarouselOwnProps {
    /** Scroll at once rather than smoothly, when the keys or the page move the row. */
    reducedMotion?: boolean | undefined;
}

export type Schema = WithProps<
    SchemaOf<ZagMachine>,
    ItemInteractionProps & CarouselOwnProps
>;
export type Props = Schema["props"];
export type Machine = AnyMachine<Schema>;
export type Service = AnyService<Schema>;

/** An item's place among the items. */
export interface MaskProps {
    readonly index: number;
    readonly disabled?: boolean | undefined;
}

/** Zag's API with the preset's parts. */
export interface Api<T extends PropTypes = PropTypes> extends CarouselApi<T> {
    /** An item's mask: focusable (only the current page's takes focus from Tab), pressable. */
    getMaskProps(props: MaskProps): T["element"];
    /** An item's content, at the item's full size inside the mask. */
    getContentProps(props: MaskProps): T["element"];
}

const ITEM = '[data-part="item"]';
const MASK = '[data-part="mask"]';

type ZagParams = Params<SchemaOf<ZagMachine> & { props: CarouselOwnProps }>;

// Replaces Zag's keys on the window, which page by `ArrowRight`/`ArrowLeft` whatever the direction
// and always smoothly.
function trackKeyboardScroll({ scope, send, prop }: ZagParams) {
    const group = scope.getById(
        prop("ids")?.itemGroup ?? `carousel:${scope.id}:item-group`,
    );
    if (!group) return;
    const onKeyDown = (event: KeyboardEvent) => {
        if (event.defaultPrevented) return;
        const item = (event.target as Element | null)?.closest(ITEM);
        if (!item || !group.contains(item)) return;
        const items = [...group.querySelectorAll<HTMLElement>(ITEM)];
        const index = rovingIndex(
            event.key,
            items.indexOf(item as HTMLElement),
            items.length,
            { rtl: prop("dir") === "rtl" },
        );
        if (index === undefined) return;
        event.preventDefault();
        items[index]
            ?.querySelector<HTMLElement>(MASK)
            ?.focus({ preventScroll: true });
        send({ type: "INDEX.SET", index, instant: !!prop("reducedMotion") });
    };
    group.addEventListener("keydown", onKeyDown);
    return () => group.removeEventListener("keydown", onKeyDown);
}

// Zag's, without its tab index sync: the row's tab index is set with its props (a tab stop only
// without items), and the sync reads the page's styles as the machine starts, before a runtime
// theme's block is in, so the items' colors would then tween from the old theme's.
function trackSlideMutation({ scope, send, prop }: ZagParams) {
    const group = scope.getById(
        prop("ids")?.itemGroup ?? `carousel:${scope.id}:item-group`,
    );
    if (!group) return;
    const observer = new (scope.getWin().MutationObserver)(() =>
        send({ type: "SNAP.REFRESH", src: "slide.mutation" }),
    );
    observer.observe(group, { childList: true, subtree: true });
    return () => observer.disconnect();
}

const zag = zagMachine as unknown as AnyMachine<SchemaOf<ZagMachine>>;

type Action = (params: ZagParams) => void;
const zagActions = zag.implementations?.actions as Record<string, Action>;

// The page an item is on, measuring the snap points first (an item can be reached before their
// first measure, so soon after the machine starts): the page that scrolls the item to the row's
// start, or the closest one for an item past the last (Zag's gives those no page, -1).
function setMatchingPage(params: ZagParams) {
    const { context, scope, prop, event } = params;
    zagActions["setSnapPoints"]!(params);
    const group = scope.getById(
        prop("ids")?.itemGroup ?? `carousel:${scope.id}:item-group`,
    );
    const items = group ? [...group.querySelectorAll<HTMLElement>(ITEM)] : [];
    const item = items[Number(event["index"])];
    const points = context.get("pageSnapPoints");
    if (!item || !items[0] || points.length === 0) return;
    const distance = Math.abs(
        item.getBoundingClientRect().left -
            items[0].getBoundingClientRect().left,
    );
    const off = (index: number) =>
        Math.abs(Math.abs(points[index]! - points[0]!) - distance);
    const page = points.reduce(
        (closest, _, index) => (off(index) < off(closest) ? index : closest),
        0,
    );
    if (page !== context.get("page")) context.set("page", page);
}

/** Zag's carousel machine: items that size themselves and each snap, the keys by direction, and an
 *  interaction emitter per mask. */
export const machine: Machine = withInteraction({
    ...zag,
    // Zag measures the snap points as it starts, which reads the page's styles before a runtime
    // theme's block is in (the items' colors would then tween from the old theme's). Its resize
    // tracking measures them on the next frame anyway.
    entry: (zag.entry as string[]).filter(
        (action) => action !== "setSnapPoints",
    ),
    props: (params) =>
        zag.props!({
            ...params,
            props: {
                autoSize: true,
                slidesPerPage: 1,
                slidesPerMove: 1,
                ...params.props,
            },
        }),
    implementations: {
        ...zag.implementations,
        actions: {
            ...zag.implementations?.actions,
            setMatchingPage: setMatchingPage as never,
        },
        effects: {
            ...zag.implementations?.effects,
            trackKeyboardScroll: trackKeyboardScroll as never,
            trackSlideMutation: trackSlideMutation as never,
        },
    },
});

/** Zag's connect, with the preset's parts and each mask emitting to its source. The page props
 *  scroll at once under `reducedMotion`; the row's gap is the preset's, not Zag's. */
export function connect<T extends PropTypes>(
    service: Service,
    normalize: NormalizeProps<T>,
): Api<T> {
    const api = zagConnect(service as never, normalize) as CarouselApi<T>;
    const emitters = emittersOf(service);
    const instant = !!service.prop("reducedMotion");
    return {
        ...api,
        scrollToIndex: (index, now) => api.scrollToIndex(index, now ?? instant),
        scrollTo: (page, now) => api.scrollTo(page, now ?? instant),
        scrollNext: (now) => api.scrollNext(now ?? instant),
        scrollPrev: (now) => api.scrollPrev(now ?? instant),
        getItemGroupProps() {
            const props = api.getItemGroupProps() as {
                style?: Record<string, unknown>;
            };
            const { gap: _gap, ...style } = props.style ?? {};
            // Zag sets it once mounted (the row is a tab stop only when nothing in it is); the
            // masks are, so the server renders it as the client will.
            const tabIndex = service.prop("slideCount") > 0 ? -1 : 0;
            return {
                ...props,
                ...normalize.element({ tabIndex }),
                style,
            } as T["element"];
        },
        getMaskProps: ({ index, disabled = false }) =>
            pressableItemProps(
                normalize.element({
                    ...parts.mask.attrs,
                    "data-index": index,
                    "data-disabled": disabled ? "" : undefined,
                    "aria-disabled": disabled || undefined,
                    tabIndex: index === api.page ? 0 : -1,
                }),
                emitters.item(String(index)),
                disabled,
                normalize,
            ),
        getContentProps: ({ index }) =>
            normalize.element({ ...parts.content.attrs, "data-index": index }),
    };
}
