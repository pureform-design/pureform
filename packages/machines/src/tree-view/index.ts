// Zag's tree view, re-exported so bindings take every machine from one package. Each node's row
// (a leaf's item, a branch's control) emits to the node's interaction source: it's pressed (by the
// pointer, Enter, or Space), hovered, and focused. Every row is its node's `treeitem`, which takes
// focus and the keys (WAI-ARIA APG's tree): a branch's control, rather than Zag's button inside
// the branch's treeitem, says the branch's level, selection, expansion and state itself, and owns
// its group of children (`aria-owns`), which stays its sibling in the branch's element (now plain)
// so the row's name is its own text. The row's styles read the same attributes.

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
import { createNormalizer } from "@zag-js/types";
import type { NormalizeProps, PropTypes } from "@zag-js/types";

import {
    emittersOf,
    type ItemInteractionProps,
    type SchemaOf,
    withInteraction,
    type WithProps,
} from "../interaction";
import { pressableItemProps } from "../interaction/pressable";

export * from "@zag-js/tree-view";
export { anatomy, parts } from "./tree-view.anatomy";

export type Schema = WithProps<SchemaOf<ZagMachine>, ItemInteractionProps>;
export type Props = Schema["props"];
export type Machine = AnyMachine<Schema>;
export type Service = AnyService<Schema>;

/** Zag's tree view machine, keeping an interaction emitter per node. */
export const machine: Machine = withInteraction(zagMachine);

// Zag's props as it writes them, before a framework's normalizer, to move between parts.
const asWritten = createNormalizer((props) => props) as NormalizeProps<PropTypes>;

type Written = Record<string, unknown>;

/** The id of a branch's group of children, which its row owns. */
export const branchGroupId = (nodeId: string): string => `${nodeId}:group`;

// What a branch's treeitem says, which moves from Zag's branch element to its row.
const TREEITEM_ARIA = [
    "role",
    "aria-level",
    "aria-selected",
    "aria-expanded",
    "aria-disabled",
    "aria-busy",
] as const;

/** Zag's connect, with each node's row emitting to the node's interaction source, and a branch's
 *  control as its treeitem (APG), owning its group. */
export function connect<T extends PropTypes>(
    service: Service,
    normalize: NormalizeProps<T>,
): Api<T> {
    const api = zagConnect(service as never, normalize);
    const written = zagConnect(service as never, asWritten) as unknown as {
        getBranchProps(props: never): Written;
        getBranchControlProps(props: never): Written;
        getBranchContentProps(props: never): Written;
    };
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
        getBranchProps: (props) => {
            const branch = { ...written.getBranchProps(props as never) };
            for (const key of TREEITEM_ARIA) delete branch[key];
            return normalize.element(branch) as never;
        },
        getBranchControlProps: (props) => {
            const state = api.getNodeState(props);
            const branch = written.getBranchProps(props as never);
            const control: Written = {
                ...written.getBranchControlProps(props as never),
            };
            for (const key of TREEITEM_ARIA) control[key] = branch[key];
            control["aria-owns"] = branchGroupId(state.id);
            return pressableItemProps(
                normalize.element(control),
                emitters.item(state.value),
                state.disabled,
                normalize,
            ) as never;
        },
        getBranchContentProps: (props) => {
            const state = api.getNodeState(props);
            return normalize.element({
                ...written.getBranchContentProps(props as never),
                id: branchGroupId(state.id),
            }) as never;
        },
    };
}
