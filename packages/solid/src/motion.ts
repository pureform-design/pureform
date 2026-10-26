// `useReducedMotion()`: whether to reduce motion, from the nearest provider's `"reduce"` or
// `"full"`, else the system's preference. It starts from `false` for the system (the server can't
// know it) and picks the real value up after mount, which changes nothing rendered: JS motion only
// runs after an interaction.

import { resolveReducedMotion } from "@pureform/binding-core";
import { subscribeReducedMotion, watchCollapse } from "@pureform/binding-web";
import { type Accessor, createMemo, createSignal, onSettled } from "solid-js";

import { usePureform } from "./provider";

/** Whether to reduce motion: pass it to ripples, tweens, and machines that animate. */
export function useReducedMotion(): Accessor<boolean> {
    const state = usePureform();
    const [system, setSystem] = createSignal(false);
    onSettled(() => subscribeReducedMotion(setSystem));
    return createMemo(() => resolveReducedMotion(state().motion, system()));
}

/** A ref for a part that expands and collapses with `hidden` (an accordion's content, a tree's
 *  group): its height grows and shrinks on the part's own transition (`watchCollapse`). Call it
 *  in the component: a ref runs outside it while hydrating, where a cleanup would be lost. */
export const useCollapsible = (): ((element: HTMLElement) => void) => {
    let part: HTMLElement | undefined;
    onSettled(() => (part ? watchCollapse(part) : undefined));
    return (element) => {
        part = element;
    };
};
