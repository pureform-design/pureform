// The DOM half: the system's reduced-motion preference, an icon slot's measured style, and a
// native checkbox kept in step with its machine. Only call these in the browser, after mount; the
// root entry stays free of DOM use for React Native.

import { DEFAULT_ICON_STYLE, sameIconStyle } from "./icon-style";
import type { IconStyle } from "./icon-style";
import { REDUCED_MOTION_QUERY } from "./motion";

/** Whether the system asks for reduced motion now; `false` where there's no `matchMedia`. */
export const systemReducedMotion = (): boolean =>
    typeof matchMedia === "function" &&
    matchMedia(REDUCED_MOTION_QUERY).matches;

/** Calls `onChange` with the system's preference now and on every change. Returns the cleanup. */
export const subscribeReducedMotion = (
    onChange: (reduce: boolean) => void,
): VoidFunction => {
    if (typeof matchMedia !== "function") {
        onChange(false);
        return () => {};
    }
    const query = matchMedia(REDUCED_MOTION_QUERY);
    const listener = (event: MediaQueryListEvent) => onChange(event.matches);
    onChange(query.matches);
    query.addEventListener("change", listener);
    return () => query.removeEventListener("change", listener);
};

const FILL = /"FILL"\s+(-?[\d.]+)/;

/** An icon slot's style as computed now: its `font-size` (the slot's icon size), `color`, and
 *  Material Symbols' `FILL` axis from `font-variation-settings`. */
export const readIconStyle = (element: Element): IconStyle => {
    const computed = getComputedStyle(element);
    const size = Number.parseFloat(computed.fontSize);
    const fill = FILL.exec(computed.fontVariationSettings)?.[1];
    return {
        size: Number.isFinite(size) ? size : undefined,
        color: computed.color || DEFAULT_ICON_STYLE.color,
        filled: fill !== undefined && Number.parseFloat(fill) >= 0.5,
    };
};

// The component root an icon part belongs to, whose attributes carry the states that restyle it.
const componentRoot = (element: Element): Element => {
    const scope = element.getAttribute("data-scope");
    const root = scope
        ? element.closest(`[data-scope="${scope}"][data-pf-part="root"]`)
        : null;
    return root ?? element.parentElement ?? element;
};

/** Calls `onChange` with the icon slot's style now, and again whenever it changes: after an
 *  attribute changes in its component (`aria-pressed`, `aria-current`, `data-pf-*`), after a
 *  transition in the component ends, and when the slot resizes. Returns the cleanup.
 *
 *  A style that changes by a pseudo-class alone (`:hover`) with no transition isn't seen. */
export const observeIconStyle = (
    element: Element,
    onChange: (style: IconStyle) => void,
): VoidFunction => {
    let current = readIconStyle(element);
    onChange(current);
    const update = () => {
        const next = readIconStyle(element);
        if (sameIconStyle(next, current)) return;
        current = next;
        onChange(next);
    };
    const root = componentRoot(element);
    const mutations = new MutationObserver(update);
    mutations.observe(root, { attributes: true, subtree: true });
    const resize =
        typeof ResizeObserver === "function"
            ? new ResizeObserver(update)
            : undefined;
    resize?.observe(element);
    root.addEventListener("transitionend", update);
    root.addEventListener("transitioncancel", update);
    return () => {
        mutations.disconnect();
        resize?.disconnect();
        root.removeEventListener("transitionend", update);
        root.removeEventListener("transitioncancel", update);
    };
};

/** Puts a native checkbox back in step with its machine's state: after a click on a controlled
 *  checkbox whose owner didn't take the change, the browser has toggled the input anyway. Call it
 *  once the machine and the owner have handled the click. */
export const syncCheckedInput = (
    input: HTMLInputElement,
    checked: boolean | "indeterminate",
): void => {
    const on = checked === true;
    const mixed = checked === "indeterminate";
    if (input.checked !== on) input.checked = on;
    if (input.indeterminate !== mixed) input.indeterminate = mixed;
};
