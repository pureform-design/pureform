import { trackFieldsetDisabled } from "./fieldset";
import { trackFormReset } from "./reset";

export interface TrackFormControlOptions {
    /** Called with whether a disabled fieldset disables the control: once at the start,
     *  then on every change. */
    onFieldsetDisabledChange?: ((disabled: boolean) => void) | undefined;
    /** Called during the form's `reset` event, before the browser resets its controls. */
    onBeforeFormReset?: (() => void) | undefined;
    /** Called once the browser's reset of the control's form has run. */
    onFormReset?: (() => void) | undefined;
}

/**
 * Zag's `trackFormControl` from `@zag-js/dom-query`, in the same shape, built on
 * `trackFieldsetDisabled` and `trackFormReset`, which fix its two halves. Returns a function
 * that stops tracking.
 */
export function trackFormControl(
    element: Element | null | undefined,
    options: TrackFormControlOptions,
): VoidFunction {
    if (!element) return () => {};
    const { onFieldsetDisabledChange, onBeforeFormReset, onFormReset } =
        options;
    const cleanups: VoidFunction[] = [];
    if (onFieldsetDisabledChange) {
        cleanups.push(trackFieldsetDisabled(element, onFieldsetDisabledChange));
    }
    if (onFormReset || onBeforeFormReset) {
        cleanups.push(
            trackFormReset(element, {
                onBeforeReset: onBeforeFormReset,
                onReset: () => onFormReset?.(),
            }),
        );
    }
    return () => cleanups.forEach((cleanup) => cleanup());
}
