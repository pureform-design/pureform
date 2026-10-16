// Native forms, as the bindings own them rather than Zag: a control's native input defaults to
// what a reset should show, and after the browser's reset the machine is sent the default. Also
// the disabled state of the fieldsets around a control, by the browser's rule.

import {
    setNativeDefault,
    trackFieldsetDisabled,
    trackFormReset,
} from "@pureform/machines/form";
import type { NativeDefault } from "@pureform/machines/form";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

export interface FormResetOptions {
    /** What a reset should show: the controlled value when controlled, else the default
     *  (`ControllableState.resetsTo`, as the native input's type wants it). */
    readonly resetsTo: NativeDefault;
    /** Runs during the form's `reset` event, before the machine's own reset listener: pass
     *  `ControllableState.beforeReset`. */
    readonly onBeforeReset?: (() => void) | undefined;
    /** Sends the machine the default after the browser's reset, unless the reset was prevented.
     *  Wrap the send in `ControllableState.reset` so callbacks report `reason: "reset"`. */
    readonly onReset: () => void;
}

/** Wires a control's native input into its form's reset: the input's native default follows
 *  `resetsTo` (written after every commit, since the machine's props write the current state),
 *  and is written again during the `reset` event, before the browser resets; then `onReset`
 *  runs. Pass the input element once mounted (a callback ref into state). */
export function useFormReset(
    input: Element | null | undefined,
    options: FormResetOptions,
): void {
    const latest = useRef(options);
    useLayoutEffect(() => {
        latest.current = options;
        setNativeDefault(input, options.resetsTo);
    });
    useEffect(() => {
        if (!input) return undefined;
        return trackFormReset(input, {
            onBeforeReset: () => {
                setNativeDefault(input, latest.current.resetsTo);
                latest.current.onBeforeReset?.();
            },
            onReset: () => latest.current.onReset(),
        });
    }, [input]);
}

/** Whether a disabled fieldset disables the element, by the browser's rule: any disabled
 *  ancestor fieldset, except inside its first legend. `false` until mounted. */
export function useFieldsetDisabled(
    element: Element | null | undefined,
): boolean {
    const [disabled, setDisabled] = useState(false);
    useEffect(
        () =>
            element ? trackFieldsetDisabled(element, setDisabled) : undefined,
        [element],
    );
    return disabled;
}
