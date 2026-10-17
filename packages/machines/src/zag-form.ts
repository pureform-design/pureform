// Zag's machines with pureform's form rules: each tracks the fieldsets around its element by the
// browser's rule (`trackFieldsetDisabled`), where Zag reads only the closest fieldset and so
// disables a control in the first legend of a disabled fieldset. A form reset is left to the
// bindings, which own it: Zag's would reset during the `reset` event, to the value at creation.

import type { Machine, MachineSchema, Params, Scope } from "@zag-js/core";

import { trackFieldsetDisabled } from "./form";

/** `machine` with its `trackFormControlState` effect replaced: it follows the fieldsets around
 *  `element(scope)` and sets the `fieldsetDisabled` context, and nothing else. */
export const withFieldsetRule = <T extends MachineSchema>(
    machine: Machine<T>,
    element: (scope: Scope) => Element | null | undefined,
): Machine<T> => ({
    ...machine,
    implementations: {
        ...machine.implementations,
        effects: {
            ...machine.implementations?.effects,
            trackFormControlState: ({ context, scope }: Params<T>) =>
                trackFieldsetDisabled(element(scope), (disabled) =>
                    (
                        context as unknown as {
                            set(key: "fieldsetDisabled", value: boolean): void;
                        }
                    ).set("fieldsetDisabled", disabled),
                ),
        } as NonNullable<Machine<T>["implementations"]>["effects"],
    },
});

/** An element of a Zag machine by its `ids` key, or the id Zag gives it otherwise. */
export const zagElement =
    (key: string, fallback: (id: string | undefined) => string) =>
    (scope: Scope): HTMLElement | null =>
        scope.getById(
            (scope.ids as Record<string, string | undefined> | undefined)?.[
                key
            ] ?? fallback(scope.id),
        );
