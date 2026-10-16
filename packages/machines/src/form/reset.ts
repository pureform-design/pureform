export interface TrackFormResetOptions {
    /** Runs during the form's `reset` event, before the browser resets its controls. Set
     *  native defaults here (`setNativeDefault`), so the page shows the default at once. */
    onBeforeReset?: (() => void) | undefined;
    /** Runs once the browser's reset has run, unless a listener prevented it. Send the
     *  machine its default here, or call a controlled component's change callback. */
    onReset: () => void;
}

/** The form a control belongs to: its own `form` (which follows a `form` attribute), else
 *  the closest form around it. */
export function getFormOf(
    element: Element | null | undefined,
): HTMLFormElement | null {
    if (!element) return null;
    if ("form" in element) {
        const form = element.form;
        if (form && (form as Element).localName === "form")
            return form as HTMLFormElement;
    }
    return element.closest("form");
}

/**
 * Follow resets of the form `element` belongs to. Zag resets its state during the `reset`
 * event, before the browser resets the controls, so the browser's reset then wins; this
 * waits for the browser instead. Returns a function that stops listening.
 */
export function trackFormReset(
    element: Element | null | undefined,
    options: TrackFormResetOptions,
): VoidFunction {
    const form = getFormOf(element);
    if (!form) return () => {};
    const win = form.ownerDocument.defaultView ?? globalThis;
    const timers = new Set<ReturnType<typeof setTimeout>>();

    const onResetEvent = (event: Event) => {
        options.onBeforeReset?.();
        // The browser resets the controls after the event's listeners, and microtasks can run
        // between them, so wait for the next task.
        const timer = win.setTimeout(() => {
            timers.delete(timer);
            if (!event.defaultPrevented) options.onReset();
        });
        timers.add(timer);
    };

    form.addEventListener("reset", onResetEvent);
    return () => {
        form.removeEventListener("reset", onResetEvent);
        for (const timer of timers) win.clearTimeout(timer);
        timers.clear();
    };
}
