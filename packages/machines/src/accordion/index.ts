// Zag's accordion, re-exported so bindings take every machine from one package. Each item's header
// emits to the item's interaction source: it's pressed (by the pointer, Enter, or Space), hovered,
// and focused.

import {
    connect as zagConnect,
    machine as zagMachine,
    type Api,
    type Machine as ZagMachine,
} from "@zag-js/accordion";
import type {
    Machine as AnyMachine,
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

export * from "@zag-js/accordion";
export { anatomy, parts } from "./accordion.anatomy";

export type Schema = WithProps<SchemaOf<ZagMachine>, ItemInteractionProps>;
export type Props = Schema["props"];
export type Machine = AnyMachine<Schema>;
export type Service = AnyService<Schema>;

/** Zag's accordion machine, keeping an interaction emitter per item. */
export const machine: Machine = withInteraction(zagMachine);

/** Zag's connect, with each item's header emitting to the item's interaction source. */
export function connect<T extends PropTypes>(
    service: Service,
    normalize: NormalizeProps<T>,
): Api<T> {
    const api = zagConnect(service as never, normalize);
    const emitters = emittersOf(service);
    return {
        ...api,
        getItemTriggerProps: (props) =>
            pressableItemProps(
                api.getItemTriggerProps(props),
                emitters.item(props.value),
                api.getItemState(props).disabled,
                normalize,
            ),
    };
}
