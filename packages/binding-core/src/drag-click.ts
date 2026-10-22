// The click a browser fires where a drag lets go: it ends a drag, not a press, so neither the
// element nor anything inside it hears it.

/** Swallows the next click on `element` (or inside it), before its own handlers or its
 *  children's hear it. Returns what takes the listener back if no click came, such as the next
 *  press. */
export const swallowNextClick = (element: Element): (() => void) => {
    const remove = () =>
        element.removeEventListener("click", listener, { capture: true });
    const listener = (event: Event) => {
        remove();
        event.preventDefault();
        event.stopImmediatePropagation();
    };
    element.addEventListener("click", listener, { capture: true });
    return remove;
};
