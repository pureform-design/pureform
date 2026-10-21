// Zag's tree view, re-exported so bindings take every machine from one package. Each node's row
// (a leaf's item, a branch's control) emits to the node's interaction source: it's pressed (by the
// pointer, Enter, or Space), hovered, and focused. A branch's control also says what its treeitem
// does, so the row's styles read it from the row: `aria-expanded` while expanded, `aria-current`
// while selected (as Zag marks a selected leaf), and `aria-disabled` while disabled.

import type {
    Machine as AnyMachine,
    Service as AnyService,
} from "@zag-js/core";
import {
    connect as zagConnect,
    machine as zagMachine,
    type Api,
    type Machine as ZagMachine,
} from "@zag-js/tree-view";
import type { NormalizeProps, PropTypes } from "@zag-js/types";

import {
    emittersOf,
    type ItemInteractionProps,
    type SchemaOf,
    withInteraction,
    type WithProps,
} from "../interaction";
import { pressableItemProps } from "../interaction/pressable";
import { chainProps } from "../interaction/zag";

export * from "@zag-js/tree-view";
export { anatomy, parts } from "./tree-view.anatomy";

export type Schema = WithProps<SchemaOf<ZagMachine>, ItemInteractionProps>;
export type Props = Schema["props"];
export type Machine = AnyMachine<Schema>;
export type Service = AnyService<Schema>;

/** Zag's tree view machine, keeping an interaction emitter per node. */
export const machine: Machine = withInteraction(zagMachine);

/** Zag's connect, with each node's row emitting to the node's interaction source, and a branch's
 *  control marked expanded, selected, and disabled as its treeitem is. */
export function connect<T extends PropTypes>(
    service: Service,
    normalize: NormalizeProps<T>,
): Api<T> {
    const api = zagConnect(service as never, normalize);
    const emitters = emittersOf(service);
    return {
        ...api,
        getItemProps: (props) => {
            const state = api.getNodeState(props);
            return pressableItemProps(
                api.getItemProps(props),
                emitters.item(state.value),
                state.disabled,
                normalize,
            );
        },
        getBranchControlProps: (props) => {
            const state = api.getNodeState(props);
            return pressableItemProps(
                chainProps(
                    api.getBranchControlProps(props),
                    normalize.element({
                        "aria-expanded": state.expanded,
                        "aria-current": state.selected ? "true" : undefined,
                        "aria-disabled": state.disabled ? "true" : undefined,
                    }),
                ),
                emitters.item(state.value),
                state.disabled,
                normalize,
            );
        },
    };
}
