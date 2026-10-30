// The FAB menu's stagger on the web: CSS runs every item's animation, and this only works out
// their timing. It samples the theme's slow effects spring (Compose staggers the menu's items on
// `SlowEffects`) into one wait per item, with the item nearest the FAB first when the menu opens
// and last when it closes, and writes each as the item's `staggerDelay` token var, which the
// item's own CSS animation waits for. The list's exit waits the longest wait (`staggerTotal`), so
// it stays until its last item has left. The items are counted from the list itself, so nothing
// has to hand the menu its item count, and no count caps the stagger. Until the theme's spring is
// known (a first render, or a registry without one), and under reduced motion, the items carry no
// wait and move together.

import { stagger } from "@pureform/animate-web";
import type { WebRegistry } from "@pureform/styling-web";
import { tokenVar } from "@pureform/styling-web/theme-vars";

import { springFromVars, springRoleVar } from "./settle";

export interface FabMenuStaggerOptions {
    /** The registry that names the target's CSS vars; none, and nothing staggers. */
    readonly registry: Pick<WebRegistry, "vars"> | undefined;
    /** Whether the menu is opening (the nearest item first) or closing (the farthest first). */
    readonly open: boolean;
    readonly reducedMotion: boolean;
}

const ms = (value: number) => `${Math.round(value * 100) / 100}ms`;

/** Writes each of `list`'s items its wait, and the list the longest of them, for the animations
 *  its CSS runs. Call it as the menu opens or closes and as its items change, before the browser
 *  paints. */
export const fabMenuStagger = (
    list: HTMLElement,
    options: FabMenuStaggerOptions,
): void => {
    const { registry } = options;
    const delay = tokenVar("components.fabMenu.staggerDelay", registry?.vars);
    const total = tokenVar("components.fabMenu.staggerTotal", registry?.vars);
    if (!delay || !total) return;
    const items = [...list.children] as HTMLElement[];
    const clear = () => {
        for (const item of items) item.style.removeProperty(delay);
        list.style.removeProperty(total);
    };
    const name = springRoleVar(registry, "effectsSlow");
    const spring = name ? springFromVars(list, name) : undefined;
    if (!spring || options.reducedMotion) {
        clear();
        return;
    }
    const { delays } = stagger({
        count: items.length,
        spring,
        phase: options.open ? "enter" : "exit",
    });
    items.forEach((item, index) =>
        item.style.setProperty(delay, ms(delays[index] ?? 0)),
    );
    list.style.setProperty(total, ms(Math.max(0, ...delays)));
};
