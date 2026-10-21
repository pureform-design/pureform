// Zag's steps, re-exported so bindings take every machine from one package, with the parts the
// preset draws (a header's `label` and `caption`). A row follows the tabs pattern: Zag's list is a
// `tablist` and each header a `tab`, so only the current one is a tab stop (every one in Zag's
// non-linear mode). A column isn't a tab list, since its content sits among the headers: its list
// is a `list` of steps, each header a button that discloses its content (`aria-expanded`, and
// `aria-current` on the current one), and the content a `region`. In both, the arrow keys of the
// orientation (a row's flip under `rtl`), Home and End move focus between the headers, wrapping;
// Enter and Space press the focused one, as the button does. A header can be marked invalid
// (`aria-invalid`, the error state) and disabled (a completed step that isn't editable). A
// completed step's indicator is marked `aria-checked`, which the preset reads. Each header emits
// to its own interaction source, keyed by its index.

import type {
    Machine as AnyMachine,
    Service as AnyService,
} from "@zag-js/core";
import {
    connect as zagConnect,
    machine as zagMachine,
    type Api as StepsApi,
    type Machine as ZagMachine,
} from "@zag-js/steps";
import type { NormalizeProps, PropTypes } from "@zag-js/types";

import {
    chainProps,
    emittersOf,
    type ItemInteractionProps,
    type SchemaOf,
    withInteraction,
    type WithProps,
} from "../interaction";
import { pressableItemProps } from "../interaction/pressable";

export * from "@zag-js/steps";
import { parts } from "./stepper.anatomy";

export { anatomy, parts } from "./stepper.anatomy";

export type Schema = WithProps<SchemaOf<ZagMachine>, ItemInteractionProps>;
export type Props = Schema["props"];
export type Machine = AnyMachine<Schema>;
export type Service = AnyService<Schema>;

/** A step's header: its place among the steps, and whether it is in the error state or can't be
 *  pressed. */
export interface TriggerProps {
    readonly index: number;
    readonly invalid?: boolean | undefined;
    readonly disabled?: boolean | undefined;
}

/** Zag's API, with the headers' own state and keys. */
export interface Api<T extends PropTypes = PropTypes> extends Omit<
    StepsApi<T>,
    "getTriggerProps"
> {
    /** A step's header: a `tab` that is a tab stop only when current (a column's is a button that
     *  discloses its content), with the arrow keys. */
    getTriggerProps(props: TriggerProps): T["button"];
    /** A step's label, the header's text. */
    getLabelProps(): T["element"];
    /** A step's caption, the header's optional second line. */
    getCaptionProps(): T["element"];
}

const TRIGGER = '[data-part="trigger"]';

// The header to focus for a key from the one at `index` among `count`, or `undefined` for other
// keys: the orientation's forward and back keys (a row's flip under `rtl`), Home and End.
const keyTarget = (
    key: string,
    index: number,
    count: number,
    vertical: boolean,
    rtl: boolean,
): number | undefined => {
    const forward = vertical ? "ArrowDown" : rtl ? "ArrowLeft" : "ArrowRight";
    const back = vertical ? "ArrowUp" : rtl ? "ArrowRight" : "ArrowLeft";
    if (key === forward) return (index + 1) % count;
    if (key === back) return (index - 1 + count) % count;
    if (key === "Home") return 0;
    if (key === "End") return count - 1;
    return undefined;
};

/** Zag's steps machine, keeping an interaction emitter per header. */
export const machine: Machine = withInteraction(zagMachine);

/** Zag's connect, with the preset's parts, the headers' arrow keys, and each header emitting to
 *  its own source. */
export function connect<T extends PropTypes>(
    service: Service,
    normalize: NormalizeProps<T>,
): Api<T> {
    const api = zagConnect(service as never, normalize) as StepsApi<T>;
    const emitters = emittersOf(service);
    const vertical = service.prop("orientation") === "vertical";
    const rtl = service.prop("dir") === "rtl";
    return {
        ...api,
        getTriggerProps({ index, invalid = false, disabled = false }) {
            const state = api.getItemState({ index });
            const zag = api.getTriggerProps({ index }) as Record<
                string,
                unknown
            >;
            // Every step is done: the last header is the tab stop.
            const stop = state.current || (api.isCompleted && state.last);
            const props = normalize.button({
                ...zag,
                disabled,
                tabIndex: vertical
                    ? (zag["tabIndex"] as number)
                    : stop
                      ? 0
                      : -1,
                // A column's headers disclose their content, rather than switch tabs.
                ...(vertical
                    ? {
                          role: undefined,
                          "aria-selected": undefined,
                          "aria-expanded": state.current,
                          "aria-current": state.current ? "step" : undefined,
                      }
                    : {}),
                "aria-invalid": invalid || undefined,
                "data-invalid": invalid ? "" : undefined,
                "data-disabled": disabled ? "" : undefined,
            });
            const keys = normalize.element({
                onKeyDown(event) {
                    if (event.defaultPrevented) return;
                    const list =
                        event.currentTarget.closest('[data-part="list"]');
                    const triggers = [
                        ...(list?.querySelectorAll<HTMLElement>(TRIGGER) ?? []),
                    ];
                    const from = triggers.indexOf(event.currentTarget);
                    const to = keyTarget(
                        event.key,
                        from,
                        triggers.length,
                        vertical,
                        rtl,
                    );
                    if (to === undefined || from < 0) return;
                    event.preventDefault();
                    // Skip the headers that can't be pressed.
                    let target = to;
                    const step = event.key === "Home" ? 1 : to >= from ? 1 : -1;
                    for (
                        let tries = 0;
                        triggers[target]?.matches(":disabled") &&
                        tries < triggers.length;
                        tries++
                    ) {
                        target =
                            (target + step + triggers.length) % triggers.length;
                    }
                    triggers[target]?.focus();
                },
            });
            return pressableItemProps(
                chainProps(props, keys),
                emitters.item(String(index)),
                disabled,
                normalize,
            ) as T["button"];
        },
        // A row is a tab list, whose children are the headers: an item is presentational, and a
        // step is current by its header's `aria-selected`. A column is a list of steps.
        getListProps() {
            const list = api.getListProps() as Record<string, unknown>;
            return normalize.element(
                vertical
                    ? {
                          ...list,
                          role: "list",
                          "aria-owns": undefined,
                          "aria-orientation": undefined,
                      }
                    : list,
            );
        },
        getItemProps(props) {
            const { "aria-current": _current, ...item } = api.getItemProps(
                props,
            ) as Record<string, unknown>;
            return normalize.element({
                ...item,
                role: vertical ? "listitem" : "presentation",
            });
        },
        getContentProps(props) {
            const content = api.getContentProps(props) as Record<
                string,
                unknown
            >;
            return normalize.element(
                vertical ? { ...content, role: "region" } : content,
            );
        },
        getIndicatorProps(props) {
            const state = api.getItemState(props);
            return normalize.element({
                ...api.getIndicatorProps(props),
                "aria-checked": state.completed || undefined,
            });
        },
        getLabelProps: () => normalize.element({ ...parts.label.attrs }),
        getCaptionProps: () => normalize.element({ ...parts.caption.attrs }),
    } as Api<T>;
}
