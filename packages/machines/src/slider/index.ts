// Zag's slider, re-exported so bindings take every machine from one package, under the preset's
// part names: the root is also Zag's control (the element the pointer moves the value on), Zag's
// range is the active track, its thumbs the handles, and its dragging indicator the value
// indicator. The preset places every part from its tokens, so Zag's inline styles are left off.
// It takes pureform's fieldset rule, leaves the form reset to the bindings, emits to an
// interaction source (a drag presses and drags it, a thumb takes focus, the root hovers), and
// steps with the up and down arrows when horizontal too, as a range input does.

import type {
    Machine as AnyMachine,
    Service as AnyService,
} from "@zag-js/core";
import {
    connect as zagConnect,
    machine as zagMachine,
    type Api as ZagApi,
    type Machine as ZagMachine,
} from "@zag-js/slider";
import type { NormalizeProps, PropTypes } from "@zag-js/types";

import {
    chainProps,
    emittersOf,
    isOwnFocusEvent,
    type InteractionProps,
    type SchemaOf,
    withInteraction,
    type WithProps,
} from "../interaction";
import { withFieldsetRule, zagElement } from "../zag-form";
import { parts } from "./slider.anatomy";

export { anatomy, parts } from "./slider.anatomy";
export {
    props,
    splitProps,
    thumbProps,
    splitThumbProps,
    markerProps,
    splitMarkerProps,
} from "@zag-js/slider";
export type {
    ElementIds,
    FocusChangeDetails,
    MarkerProps,
    ThumbProps,
    ValueChangeDetails,
    ValueTextDetails,
} from "@zag-js/slider";

export type Schema = WithProps<SchemaOf<ZagMachine>, InteractionProps>;
export type Props = Schema["props"];
export type Machine = AnyMachine<Schema>;
export type Service = AnyService<Schema>;

const rootId = (scope: { id?: string | undefined; ids?: unknown }) =>
    (scope.ids as { root?: string } | undefined)?.root ??
    `slider:${scope.id}`;

const zag = zagMachine as unknown as ZagMachine;

/** Zag's slider machine: its control is the root, its thumbs are centered on their values (the
 *  preset draws them past the track's ends), the fieldset rule is pureform's, and what's in
 *  progress ends when it becomes disabled. */
export const machine: Machine = withInteraction(
    withFieldsetRule(
        {
            ...zag,
            props: (params) => {
                const props = zag.props!(params);
                const root = rootId(props as never);
                return {
                    ...props,
                    thumbAlignment: params.props.thumbAlignment ?? "center",
                    ids: { ...props.ids, root, control: root },
                } as typeof props;
            },
        },
        zagElement("root", (id) => `slider:${id}`),
    ),
    ({ track, computed }, emitters) => {
        track([() => computed("isDisabled")], () => {
            if (computed("isDisabled")) emitters.end();
        });
    },
);

/** The slider's API: Zag's, with the preset's parts. */
export interface Api<T extends PropTypes = PropTypes> extends Omit<
    ZagApi<T>,
    | "getControlProps"
    | "getRangeProps"
    | "getThumbProps"
    | "getHiddenInputProps"
    | "getDraggingIndicatorProps"
> {
    /** Each thumb's value as a percentage of the range, 0 to 100. */
    percents: number[];
    /** A value as a percentage of the range, 0 to 100, clamped: where a stop goes. */
    percentOf(value: number): number;
    disabled: boolean;
    /** The thumb that has focus or is dragged, or -1. */
    focusedIndex: number;
    /** The root, which is also the control the pointer moves the value on. */
    getRootProps(): T["element"];
    getTrackProps(): T["element"];
    /** The inactive track before a range, or before a centered slider's active track. */
    getStartTrackProps(): T["element"];
    getActiveTrackProps(): T["element"];
    /** A thumb's handle: the element with the `slider` role, which takes focus and the keys. */
    getHandleProps(index: number): T["element"];
    /** A thumb's state layer. */
    getStateLayerProps(index: number): T["element"];
    /** A thumb's hidden input, which submits its value. */
    getInputProps(index: number): T["input"];
    /** A thumb's value indicator: shown while it's dragged. */
    getValueIndicatorProps(index: number): T["element"];
}

const withoutStyle = <P>(props: P): P => {
    const { style: _style, ...rest } = props as P & { style?: unknown };
    return rest as P;
};

/** Zag's connect, under the preset's parts and with the interaction source. */
export function connect<T extends PropTypes>(
    service: Service,
    normalize: NormalizeProps<T>,
): Api<T> {
    const api = zagConnect(service as never, normalize) as ZagApi<T>;
    const emitter = emittersOf(service).own;
    const disabled = !!service.computed("isDisabled");
    const interactive = !!service.computed("isInteractive");
    const horizontal = service.prop("orientation") !== "vertical";
    const focusedIndex = service.context.get("focusedIndex");
    const dragging = api.dragging;
    const max = service.prop("max");
    const min = service.prop("min");
    const percentOf = (value: number) =>
        max > min
            ? ((Math.min(Math.max(value, min), max) - min) / (max - min)) * 100
            : 0;
    const percents = api.value.map(percentOf);

    // A pointer going down on the root or a handle presses and drags, until it's let go. The
    // drag stops before the press ends, as a drag inside a press does.
    const startDrag = (event: PointerEvent, element: Element) => {
        if (!interactive) return;
        const win = element.ownerDocument.defaultView;
        const stop = () => {
            emitter.dragStop(element);
            win?.removeEventListener("pointerup", stop, true);
            win?.removeEventListener("pointercancel", stop, true);
        };
        win?.addEventListener("pointerup", stop, true);
        win?.addEventListener("pointercancel", stop, true);
        if (emitter.pointerDown(event, element)) emitter.dragStart(element);
        else stop();
    };

    const state = { "data-disabled": disabled ? "" : undefined };

    return {
        ...api,
        percents,
        percentOf,
        disabled,
        focusedIndex,
        getRootProps() {
            const root = withoutStyle(api.getRootProps());
            // The control's style is behaviour (no touch scrolling, no text selection while
            // dragging); the root's places Zag's thumbs, which the preset does.
            const { id: _id, ...control } = api.getControlProps() as Record<
                string,
                unknown
            >;
            return chainProps(
                chainProps(root, control),
                normalize.element({
                    ...parts.root.attrs,
                    onPointerDown(event: PointerEvent) {
                        startDrag(event, event.currentTarget as Element);
                    },
                    onPointerMove(event: PointerEvent) {
                        if (disabled) return;
                        emitter.pointerOver(event, event.currentTarget!);
                    },
                    onPointerLeave(event: PointerEvent) {
                        emitter.hoverExit(event.currentTarget);
                    },
                } as never),
            );
        },
        getTrackProps() {
            return normalize.element({
                ...(withoutStyle(api.getTrackProps()) as object),
                ...parts.track.attrs,
            } as never);
        },
        getStartTrackProps() {
            return normalize.element({
                ...parts.startTrack.attrs,
                ...state,
                "data-orientation": service.prop("orientation"),
            } as never);
        },
        getActiveTrackProps() {
            return normalize.element({
                ...(withoutStyle(api.getRangeProps()) as object),
                ...parts.activeTrack.attrs,
            } as never);
        },
        getHandleProps(index) {
            const handle = chainProps(
                withoutStyle(api.getThumbProps({ index })),
                normalize.element({
                    onPointerDown(event: PointerEvent) {
                        startDrag(event, event.currentTarget as Element);
                    },
                    onFocus(event: FocusEvent) {
                        if (!isOwnFocusEvent(event)) return;
                        emitter.focusIn(event.currentTarget as Element);
                    },
                    onBlur(event: FocusEvent) {
                        if (!isOwnFocusEvent(event)) return;
                        emitter.blur(event.currentTarget);
                    },
                    onKeyDown(event: KeyboardEvent) {
                        if (!interactive || !horizontal) return;
                        if (event.key === "ArrowUp") api.increment(index);
                        else if (event.key === "ArrowDown") api.decrement(index);
                    },
                } as never),
            );
            return {
                ...handle,
                ...parts.handle.attrs,
                "aria-invalid": service.prop("invalid") ? "true" : undefined,
            };
        },
        getStateLayerProps(index) {
            return normalize.element({
                ...parts.stateLayer.attrs,
                ...state,
                "data-index": index,
                "data-orientation": service.prop("orientation"),
            } as never);
        },
        getInputProps(index) {
            return normalize.input({
                ...(api.getHiddenInputProps({ index }) as object),
                ...parts.input.attrs,
                // Not submitted while disabled, as a disabled native input isn't.
                disabled,
            } as never);
        },
        getValueIndicatorProps(index) {
            const own = withoutStyle(
                api.getDraggingIndicatorProps({ index }),
            ) as Record<string, unknown>;
            const open = index === focusedIndex && dragging;
            return normalize.element({
                ...own,
                ...parts.valueIndicator.attrs,
                hidden: !open,
                "data-state": open ? "open" : "closed",
            } as never);
        },
        getMarkerGroupProps() {
            return withoutStyle(api.getMarkerGroupProps());
        },
        getMarkerProps(props) {
            return withoutStyle(api.getMarkerProps(props));
        },
    };
}
