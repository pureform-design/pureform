// Native forms, as the bindings own them rather than Zag: a control's native input defaults to
// what a reset should show, and after the browser's reset the machine is sent the default. Also
// the disabled state of the fieldsets around a control, by the browser's rule.

import {
    setNativeDefault,
    trackFieldsetDisabled,
    trackFormReset,
} from "@pureform/machines/form";
import type { NativeDefault } from "@pureform/machines/form";
import { type Accessor, createEffect, createSignal, untrack } from "solid-js";

export interface FormResetOptions {
    /** What a reset should show: the controlled value when controlled, else the default
     *  (`ControllableState.resetsTo`, as the native input's type wants it). */
    readonly resetsTo: Accessor<NativeDefault>;
    /** Runs during the form's `reset` event, before the machine's own reset listener: pass
     *  `ControllableState.beforeReset`. */
    readonly onBeforeReset?: (() => void) | undefined;
    /** Sends the machine the default after the browser's reset, unless the reset was prevented.
     *  Wrap the send in `ControllableState.reset` so callbacks report `reason: "reset"`. */
    readonly onReset: () => void;
    /** Writes the native default: `setNativeDefault` on the input unless given. A radio group
     *  writes every radio's. */
    readonly writeDefault?:
        | ((input: Element, value: NativeDefault) => void)
        | undefined;
}

/** Wires a control's native input into its form's reset: the input's native default follows
 *  `resetsTo` (written after the machine's props, which write the current state), and is written
 *  again during the `reset` event, before the browser resets; then `onReset` runs. */
export function useFormReset(
    input: Accessor<Element | null | undefined>,
    options: FormResetOptions,
): void {
    createEffect(
        () => [input(), options.resetsTo()] as const,
        ([element, value]) => {
            if (element)
                (options.writeDefault ?? setNativeDefault)(element, value);
        },
    );
    createEffect(input, (element) =>
        element
            ? trackFormReset(element, {
                  onBeforeReset: () => {
                      (options.writeDefault ?? setNativeDefault)(
                          element,
                          untrack(options.resetsTo),
                      );
                      options.onBeforeReset?.();
                  },
                  onReset: options.onReset,
              })
            : undefined,
    );
}

/** Whether a disabled fieldset disables the element, by the browser's rule: any disabled
 *  ancestor fieldset, except inside its first legend. `false` until mounted. */
export function useFieldsetDisabled(
    element: Accessor<Element | null | undefined>,
): Accessor<boolean> {
    const [disabled, setDisabled] = createSignal(false, { ownedWrite: true });
    createEffect(element, (current) =>
        current ? trackFieldsetDisabled(current, setDisabled) : undefined,
    );
    return disabled;
}
