// The FAB menu's stagger on the web: CSS runs every item's animation, and this only works out
// their timing. It samples the theme's slow effects spring (Compose staggers the menu's items on
// `SlowEffects`) into one wait per item, with the item nearest the FAB first when the menu opens
// and last when it closes, and writes each as the item's `staggerDelay` token var (for its reveal)
// and `fadeDelay` (for its fade), which the item's own CSS animations wait for. The list's exit
// waits the longest wait (`staggerTotal`), so it stays until its last item has left. The items are
// counted from the list itself, so nothing has to hand the menu its item count, and no count caps
// the stagger. Until the theme's spring is known (a first render, or a registry without one), and
// under reduced motion, the items carry no wait and move together.
//
// A CSS animation that's replaced starts again from its first frame, so an item toggled partway
// through moving would snap back to where its new animation begins. The reveal and the fade each
// run on their own spring, so this works out where each is (from when the item's last run began
// and the spring's own curve) and gives the new animation a negative wait that skips it to the
// point on its way back that has as much shown. An item that hadn't started is skipped past its
// end, so it stays hidden rather than showing to hide; one that has finished waits as a first
// toggle does. All of this is timing the CSS runs: nothing moves from JavaScript.

import { stagger } from "@pureform/animate-web";
import { settleTime, springAt } from "@pureform/core";
import type { SpringNode } from "@pureform/core/ast";
import type { WebRegistry } from "@pureform/styling-web";
import { tokenVar } from "@pureform/styling-web/theme-vars";

import { springFromVars, springRoleVar } from "./settle";

export interface FabMenuStaggerOptions {
    /** The registry that names the target's CSS vars; none, and nothing staggers. */
    readonly registry: Pick<WebRegistry, "vars"> | undefined;
    /** Whether the menu is opening (the nearest item first) or closing (the farthest first). */
    readonly open: boolean;
    readonly reducedMotion: boolean;
    /** The clock the items' animations run on, in ms: the document's timeline. A test sets it. */
    readonly now?: (() => number) | undefined;
}

/** What an item was last given: which way it was moving, when that began, and the waits its two
 *  animations were given (negative for one skipped ahead). */
interface Run {
    readonly open: boolean;
    startedAt: number;
    readonly reveal: number;
    readonly fade: number;
}

const runs = new WeakMap<HTMLElement, Run>();

const ms = (value: number) => `${Math.round(value * 100) / 100}ms`;

// A share of an item's distance this close to 0 or 1 counts as there.
const EDGE = 0.001;

const clock = (): number =>
    // The animations' own clock, so a frame's offset between it and the script's doesn't skew them.
    Number(document.timeline?.currentTime ?? performance.now());

/** How far a spring has run `ms` after it began, 0 to 1 (it may overshoot, which a clip doesn't). */
const progressAt = (spring: SpringNode, time: number): number =>
    time <= 0 ? 0 : Math.min(1, Math.max(0, springAt(spring, time / 1000)));

/** How long a spring takes to settle, in ms: past it, an animation on it is over. */
const doneAfter = (spring: SpringNode): number =>
    Math.ceil(settleTime(spring) * 1000) + 1;

/** The time into a spring's run at which it has covered `share` of its distance. */
const timeAt = (spring: SpringNode, share: number): number => {
    if (share <= EDGE) return 0;
    if (share >= 1 - EDGE) return doneAfter(spring);
    for (let time = 0; time <= doneAfter(spring); time++) {
        if (progressAt(spring, time) >= share) return time;
    }
    return doneAfter(spring);
};

/** The wait a toggled item's animation on `spring` takes: `planned` (the stagger's) when nothing
 *  of it is mid-motion, else a negative one that starts it where the item is now. `was` is the
 *  item's earlier run, `waited` what that run's animation on this spring was given. */
const carryOn = (
    spring: SpringNode,
    was: Run | undefined,
    waited: number | undefined,
    open: boolean,
    planned: number,
    now: number,
): number => {
    if (!was || waited === undefined || was.open === open) return planned;
    // How much of the item the earlier run has shown by now.
    const progress = progressAt(spring, now - was.startedAt - waited);
    const shown = was.open ? progress : 1 - progress;
    // Not begun: it stays hidden. Whole: it stays shown. Either way the new run is a first one for
    // an item that has to move, and over before it starts for one that doesn't.
    if (shown <= EDGE) return open ? planned : -doneAfter(spring);
    if (shown >= 1 - EDGE) return open ? -doneAfter(spring) : planned;
    // Mid-motion: on from here, at once. Opening continues from `shown`, closing from what's left.
    return -timeAt(spring, open ? shown : 1 - shown);
};

/** Writes each of `list`'s items its waits, and the list the longest of them, for the animations
 *  its CSS runs. Call it as the menu opens or closes and as its items change, before the browser
 *  paints. Items already running the phase being asked for are left as they are. */
export const fabMenuStagger = (
    list: HTMLElement,
    options: FabMenuStaggerOptions,
): void => {
    const { registry } = options;
    const vars = registry?.vars;
    const delay = tokenVar("components.fabMenu.staggerDelay", vars);
    const fadeDelay = tokenVar("components.fabMenu.fadeDelay", vars);
    const total = tokenVar("components.fabMenu.staggerTotal", vars);
    if (!delay || !fadeDelay || !total) return;
    const items = [...list.children] as HTMLElement[];
    const clear = () => {
        for (const item of items) {
            item.style.removeProperty(delay);
            item.style.removeProperty(fadeDelay);
            runs.delete(item);
        }
        list.style.removeProperty(total);
    };
    const named = (role: string): SpringNode | undefined => {
        const name = springRoleVar(registry, role);
        return name ? springFromVars(list, name) : undefined;
    };
    const slow = named("effectsSlow");
    if (!slow || options.reducedMotion) {
        clear();
        return;
    }
    // The two springs an item's own animations run on. Without them an item can't carry on, and
    // staggers as a first toggle does.
    const spatial = named("spatialFast");
    const effects = named("effectsFast");
    const { delays } = stagger({
        count: items.length,
        spring: slow,
        phase: options.open ? "enter" : "exit",
    });
    const now = (options.now ?? clock)();
    const started: HTMLElement[] = [];
    items.forEach((item, index) => {
        const was = runs.get(item);
        // Already on this phase: its animations are running on the waits they were given, and
        // changing one would move them.
        if (was && was.open === options.open) return;
        const planned = delays[index] ?? 0;
        const reveal = spatial
            ? carryOn(spatial, was, was?.reveal, options.open, planned, now)
            : planned;
        const fade = effects
            ? carryOn(effects, was, was?.fade, options.open, planned, now)
            : planned;
        item.style.setProperty(delay, ms(reveal));
        item.style.setProperty(fadeDelay, ms(fade));
        runs.set(item, { open: options.open, startedAt: now, reveal, fade });
        started.push(item);
    });
    // The list holds for the longest wait any item still has ahead of it.
    const longest = Math.max(
        0,
        ...items.map((item) => runs.get(item)?.reveal ?? 0),
    );
    list.style.setProperty(total, ms(longest));
    // The animations begin at the next frame, not now: note the time they actually began, so the
    // next toggle works out where they are from the real start.
    if (started.length > 0 && !options.now) {
        requestAnimationFrame(() => {
            for (const item of started) {
                const run = runs.get(item);
                const begun = item
                    .getAnimations?.()
                    .find(
                        (animation) => animation.startTime !== null,
                    )?.startTime;
                if (run && run.startedAt === now && begun != null) {
                    run.startedAt = Number(begun);
                }
            }
        });
    }
};
