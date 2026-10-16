const firstLegend = (fieldset: HTMLFieldSetElement) => {
    for (const child of fieldset.children) {
        if (child.localName === "legend") return child;
    }
    return null;
};

const fieldsetsAround = (element: Element) => {
    const fieldsets: HTMLFieldSetElement[] = [];
    let current = element.parentElement?.closest("fieldset");
    while (current) {
        fieldsets.push(current);
        current = current.parentElement?.closest("fieldset");
    }
    return fieldsets;
};

/**
 * Whether a disabled fieldset disables `element`, by the rule the browser uses for native
 * controls: any disabled fieldset around it, except when it sits in that fieldset's first
 * legend.
 */
export function isFieldsetDisabled(
    element: Element | null | undefined,
): boolean {
    if (!element) return false;
    return fieldsetsAround(element).some(
        (fieldset) =>
            fieldset.disabled && !firstLegend(fieldset)?.contains(element),
    );
}

/**
 * Follow whether a disabled fieldset disables `element`. Calls `onChange` once with the
 * current value, then on every change. Zag's `trackFormControl` reads only the closest
 * fieldset and ignores legends; this follows every fieldset around the element. Returns a
 * function that stops following.
 */
export function trackFieldsetDisabled(
    element: Element | null | undefined,
    onChange: (disabled: boolean) => void,
): VoidFunction {
    if (!element) return () => {};
    const fieldsets = fieldsetsAround(element);
    let disabled = isFieldsetDisabled(element);
    onChange(disabled);
    if (fieldsets.length === 0) return () => {};

    const win = element.ownerDocument.defaultView ?? globalThis;
    const observer = new win.MutationObserver(() => {
        const next = isFieldsetDisabled(element);
        if (next === disabled) return;
        disabled = next;
        onChange(next);
    });
    for (const fieldset of fieldsets) {
        observer.observe(fieldset, {
            attributes: true,
            attributeFilter: ["disabled"],
            childList: true,
        });
    }
    return () => observer.disconnect();
}
