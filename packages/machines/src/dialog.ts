// Zag's dialog, re-exported so bindings take every machine from one package. It traps focus,
// hides the page from assistive technology, and blocks scrolling while open and modal. One change:
// Zag's dismissable layer doesn't mirror the dialog's layer onto the backdrop and positioner.
// Mirroring reads the surface's computed `z-index` as the dialog opens, which forces a style
// recalculation of the whole page, and the layer then writes the body's `pointer-events`, so the
// next frame recalculates the page again. The bindings stack the positioner themselves, in the
// next frame (`stackPositioner` from `@pureform/binding-web`); the backdrop takes its layer
// from the scrim's styles.

import type { Machine as AnyMachine, Params, Scope } from "@zag-js/core";
import { machine as zagMachine } from "@zag-js/dialog";
import type { Machine } from "@zag-js/dialog";

export * from "@zag-js/dialog";

type Schema = Machine extends AnyMachine<infer S> ? S : never;

const zagEffects = zagMachine.implementations!.effects!;

// The ids Zag's dialog finds its backdrop and positioner by, as `@zag-js/dialog` 1.46.0 names
// them.
const mirroredIds = (scope: Scope): ReadonlySet<string> =>
    new Set([
        scope.ids?.["backdrop"] ?? `dialog:${scope.id}:backdrop`,
        scope.ids?.["positioner"] ?? `dialog:${scope.id}:positioner`,
    ]);

/** Zag's dialog machine, whose dismissable layer doesn't mirror its layer onto the backdrop and
 *  positioner: it finds neither. */
export const machine: Machine = {
    ...zagMachine,
    implementations: {
        ...zagMachine.implementations,
        effects: {
            ...zagEffects,
            trackDismissableElement(params: Params<Schema>) {
                const { scope } = params;
                const hidden = mirroredIds(scope);
                return zagEffects["trackDismissableElement"]!({
                    ...params,
                    scope: {
                        ...scope,
                        getById: <T extends Element = HTMLElement>(
                            id: string,
                        ) => (hidden.has(id) ? null : scope.getById<T>(id)),
                    },
                });
            },
        },
    },
};
