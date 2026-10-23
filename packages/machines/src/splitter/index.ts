// Zag's splitter, re-exported so bindings take every machine from one package. It sizes panes in
// percent of the root, resized by dragging the divider between two or by the arrow keys on it
// (Shift for 10%, Home and End to the limits). Snapping a drag to anchors is the bindings'.
//
// Zag measures the panes again whenever the root's resize observer reports, and when the root's
// length hasn't changed it puts back the `defaultSize`: the observer's first report, late under
// load, undid a resize made before it. This one skips a measure that has nothing new: the same
// root length and the same panels and size props as the last.

import type { Machine as AnyMachine, Params } from "@zag-js/core";
import { machine as zagMachine } from "@zag-js/splitter";

import type { SchemaOf } from "../interaction";

export * from "@zag-js/splitter";
export { anatomy, parts } from "./splitter.anatomy";

type Schema = SchemaOf<typeof zagMachine>;
type ZagParams = Params<Schema>;

const zag = zagMachine as unknown as AnyMachine<Schema>;

const rootId = ({ scope }: ZagParams) =>
    (scope.ids as { root?: string } | undefined)?.root ??
    `splitter:${scope.id}`;

// What the last measure saw, per running machine (keyed by its refs).
const measured = new WeakMap<object, string>();

const measureKey = (params: ZagParams): string | undefined => {
    const root = params.scope.getById(rootId(params));
    if (!root) return undefined;
    const rect = root.getBoundingClientRect();
    const length =
        params.prop("orientation") === "vertical" ? rect.height : rect.width;
    if (!(length > 0)) return undefined;
    return JSON.stringify([
        length,
        params.prop("panels"),
        params.prop("size") ?? [],
        params.prop("defaultSize") ?? [],
    ]);
};

export const machine = {
    ...zag,
    implementations: {
        ...zag.implementations,
        actions: {
            ...zag.implementations?.actions,
            syncSize(params: ZagParams) {
                const key = measureKey(params);
                const size = params.context.get("size") as number[];
                const panels = params.context.get("panels") as unknown[];
                if (
                    key !== undefined &&
                    measured.get(params.refs) === key &&
                    size.length === panels.length
                )
                    return;
                zag.implementations!.actions!["syncSize"]!(params);
                if (key !== undefined) measured.set(params.refs, key);
            },
        },
    },
} as unknown as typeof zagMachine;
