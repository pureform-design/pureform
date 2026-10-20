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

// The item index a key moves focus to, from the focused one; `undefined` for other keys.
const keyTarget = (
    key: string,
    index: number,
    count: number,
    rtl: boolean,
): number | undefined => {
    const forward = rtl ? "ArrowLeft" : "ArrowRight";
    const back = rtl ? "ArrowRight" : "ArrowLeft";
    if (key === forward) return Math.min(index + 1, count - 1);
    if (key === back) return Math.max(index - 1, 0);
    if (key === "Home") return 0;
    if (key === "End") return count - 1;
    return undefined;
};

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
        const index = keyTarget(
            event.key,
            items.indexOf(item as HTMLElement),
            items.length,
            prop("dir") === "rtl",
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

const zag = zagMachine as unknown as AnyMachine<SchemaOf<ZagMachine>>;

/** Zag's carousel machine: items that size themselves and each snap, the keys by direction, and an
 *  interaction emitter per mask. */
export const machine: Machine = withInteraction({
    ...zag,
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
        effects: {
            ...zag.implementations?.effects,
            trackKeyboardScroll: trackKeyboardScroll as never,
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
            return { ...props, style } as T["element"];
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
