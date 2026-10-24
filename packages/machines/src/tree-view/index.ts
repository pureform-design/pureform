// Zag's tree view, re-exported so bindings take every machine from one package. Each node's row
// (a leaf's item, a branch's control) emits to the node's interaction source: it's pressed (by the
// pointer, Enter, or Space), hovered, and focused. Every node is a `treeitem` (WAI-ARIA APG's
// tree) that holds what's below it, as Safari's accessibility tree needs: a leaf's item is its
// row, and a branch's element (Zag's) holds its row (the control, now plain, with no role and
// no focus of its own) and then its group of children. The branch's element takes focus and the
// keys for its row, and is named from its row's text (`aria-labelledby`), not its children's.
// The row's styles read the branch's state from its parent (the preset's tree).

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
const asWritten = createNormalizer(
    (props) => props,
) as NormalizeProps<PropTypes>;

type Written = Record<string, unknown>;
type Handler = (event: never) => void;

/** The id of a branch's row's text, which names the branch. */
export const branchTextId = (nodeId: string): string => `${nodeId}:text`;

// What only the focusable treeitem has, which leaves the branch's control for its element.
const CONTROL_ONLY = ["role", "id", "tabIndex", "onFocus"] as const;

const BRANCH = "[data-part=branch]";

// A branch's row, from its element.
const controlOf = (branch: Element): Element | null =>
    branch.querySelector(":scope > [data-part=branch-control]");

// A key event on a branch's element, as Zag's keys read it: from the branch's row, as Zag's own
// tree has focus there.
const retargeted = <E extends object>(event: E): E => {
    const target = (event as { target?: unknown }).target;
    if (!(target instanceof Element) || !target.matches(BRANCH)) return event;
    const control = controlOf(target);
    if (!control) return event;
    return new Proxy(event, {
        get(own, key) {
            if (key === "target") return control;
            if (key === "composedPath") return () => [control];
            const value = Reflect.get(own, key, own) as unknown;
            return typeof value === "function" ? value.bind(own) : value;
        },
    });
};

const pressKey = (key: string) => key === "Enter" || key === " ";

/** Zag's connect, with each node's row emitting to the node's interaction source, and a branch's
 *  element as its treeitem (APG) holding its row and its group, taking focus and keys for the
 *  row, named from the row's text. */
export function connect<T extends PropTypes>(
    service: Service,
    normalize: NormalizeProps<T>,
): Api<T> {
    const api = zagConnect(service as never, normalize);
    const written = zagConnect(service as never, asWritten) as unknown as {
        getTreeProps(): Written;
        getBranchProps(props: never): Written;
        getBranchControlProps(props: never): Written;
        getBranchTextProps(props: never): Written;
    };
    const emitters = emittersOf(service);
    return {
        ...api,
        getTreeProps: () => {
            const tree = { ...written.getTreeProps() };
            const keyDown = tree["onKeyDown"] as Handler;
            tree["onKeyDown"] = (event: object) =>
                keyDown(retargeted(event) as never);
            return normalize.element(tree) as never;
        },
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
            const state = api.getNodeState(props);
            const control = written.getBranchControlProps(props as never);
            const emitter = emitters.item(state.value);
            const own = (event: { target: unknown; currentTarget: unknown }) =>
                event.target === event.currentTarget;
            const row = (event: { currentTarget: unknown }) =>
                controlOf(event.currentTarget as Element) ?? undefined;
            const branch: Written = {
                ...written.getBranchProps(props as never),
                id: control["id"],
                tabIndex: control["tabIndex"],
                "aria-labelledby": branchTextId(state.id),
                onFocus(event: FocusEvent) {
                    if (!own(event)) return;
                    (control["onFocus"] as Handler)(event as never);
                    emitter.focus(
                        (event.currentTarget as Element).matches(
                            ":focus-visible",
                        ),
                        row(event),
                    );
                },
                onBlur(event: FocusEvent) {
                    if (own(event)) emitter.blur(row(event));
                },
                // Enter and Space press the row, as they would the row itself.
                onKeyDown(event: KeyboardEvent) {
                    if (!own(event) || state.disabled || !pressKey(event.key))
                        return;
                    emitter.keyDown(event, row(event));
                },
                onKeyUp(event: KeyboardEvent) {
                    if (own(event) && pressKey(event.key))
                        emitter.keyUp(row(event));
                },
            };
            return normalize.element(branch) as never;
        },
        getBranchControlProps: (props) => {
            const state = api.getNodeState(props);
            const control: Written = {
                ...written.getBranchControlProps(props as never),
            };
            for (const key of CONTROL_ONLY) delete control[key];
            return pressableItemProps(
                normalize.element(control),
                emitters.item(state.value),
                state.disabled,
                normalize,
            ) as never;
        },
        getBranchTextProps: (props) => {
            const state = api.getNodeState(props);
            return normalize.element({
                ...written.getBranchTextProps(props as never),
                id: branchTextId(state.id),
            }) as never;
        },
    };
}
