// Zag's radio group, re-exported so bindings take every machine from one package, with pureform's
// form rules on its machine: the browser's fieldset rule around the group element, and no reset of
// its own (the bindings own it). Each radio emits to its own interaction source: its item (the
// label around the control) is pressed and hovered, and its native input takes focus and the Space
// key.

import type {
    Machine as AnyMachine,
    Service as AnyService,
} from "@zag-js/core";
import {
    connect as zagConnect,
    machine as zagMachine,
    type Api,
    type Machine as ZagMachine,
} from "@zag-js/radio-group";
import type { NormalizeProps, PropTypes } from "@zag-js/types";

import {
    chainProps,
    emittersOf,
    isOwnFocusEvent,
    type ItemInteractionProps,
    type SchemaOf,
    withInteraction,
    type WithProps,
} from "./interaction";
import { withFieldsetRule, zagElement } from "./zag-form";

export * from "@zag-js/radio-group";

export type Schema = WithProps<SchemaOf<ZagMachine>, ItemInteractionProps>;
export type Props = Schema["props"];
export type Machine = AnyMachine<Schema>;
export type Service = AnyService<Schema>;

/** Zag's radio group machine, with pureform's fieldset rule and no reset of its own, ending what
 *  every radio has in progress when the group becomes disabled. */
export const machine: Machine = withInteraction(
    withFieldsetRule(
        zagMachine,
        zagElement("root", (id) => `radio-group:${id}`),
    ),
    ({ track, computed }, emitters) => {
        track([() => computed("isDisabled")], () => {
            if (computed("isDisabled")) emitters.end();
        });
    },
);

/** Zag's connect, with each radio's item and native input emitting to the radio's interaction
 *  source. */
export function connect<T extends PropTypes>(
    service: Service,
    normalize: NormalizeProps<T>,
): Api<T> {
    const api = zagConnect(service as never, normalize);
    const emitters = emittersOf(service);
    return {
        ...api,
        getItemProps: (props) => {
            const emitter = emitters.item(props.value);
            const { disabled } = api.getItemState(props);
            if (disabled) emitter.disabled();
            return chainProps(
                api.getItemProps(props),
                normalize.element({
                    onPointerDown(event) {
                        if (disabled) return;
                        emitter.pointerDown(event, event.currentTarget);
                        // Zag lets go of the pressed radio only when the pointer comes up on it:
                        // let go wherever it comes up, as `:active` does.
                        const win = (event.currentTarget as Element | null)
                            ?.ownerDocument.defaultView;
                        if (!win) return;
                        const letGo = () => {
                            win.removeEventListener("pointerup", letGo, true);
                            win.removeEventListener(
                                "pointercancel",
                                letGo,
                                true,
                            );
                            if (
                                service.context.get("activeValue") ===
                                props.value
                            ) {
                                service.send({
                                    type: "SET_ACTIVE",
                                    value: null,
                                });
                            }
                        };
                        win.addEventListener("pointerup", letGo, true);
                        win.addEventListener("pointercancel", letGo, true);
                    },
                    onPointerMove(event) {
                        if (disabled) return;
                        emitter.pointerOver(event, event.currentTarget);
                    },
                    onPointerLeave(event) {
                        emitter.hoverExit(event.currentTarget);
                    },
                }),
            );
        },
        getItemHiddenInputProps: (props) => {
            const emitter = emitters.item(props.value);
            const { disabled } = api.getItemState(props);
            if (disabled) emitter.disabled();
            return chainProps(
                api.getItemHiddenInputProps(props),
                normalize.element({
                    onKeyDown(event) {
                        if (disabled || event.key !== " ") return;
                        emitter.keyDown(event, event.currentTarget);
                    },
                    onKeyUp(event) {
                        if (event.key !== " ") return;
                        emitter.keyUp(event.currentTarget);
                    },
                    onFocus(event) {
                        if (!isOwnFocusEvent(event)) return;
                        emitter.focusIn(event.currentTarget);
                    },
                    onBlur(event) {
                        if (!isOwnFocusEvent(event)) return;
                        emitter.blur(event.currentTarget);
                    },
                }),
            );
        },
    };
}
