// The motion of a drilled menu (`submenu="drill"`) moving between levels, for the web bindings'
// ready-made menus. Before the level changes, `menuDrillFrom` notes the content's size and where
// the row the motion starts from has its label; once the new level is drawn, `menuDrillTo`
// animates the content from the old size to its new one and moves the label (FLIP) from where it
// was to its place in the new level, while the other rows fade in. Going in, the pressed item's
// label goes into the submenu's header (the back row); going back, the header's label goes into
// the submenu's item in the level above. Under reduced motion nothing moves.

/** What a drill step moves from: the content's size, and the moving label's box. */
export interface MenuDrillSnapshot {
    readonly width: number;
    readonly height: number;
    readonly label: DOMRect | undefined;
    /** The row whose label it moves into, by value. */
    readonly to: string;
}

/** The drill motion's timing: Material's medium duration and emphasized curve by default. */
export interface MenuDrillTiming {
    readonly duration: number;
    readonly easing: string;
}

export const MENU_DRILL_TIMING: MenuDrillTiming = {
    duration: 300,
    easing: "cubic-bezier(0.2, 0, 0, 1)",
};

const row = (content: Element, value: string): HTMLElement | null =>
    content.querySelector<HTMLElement>(
        `[data-part="item"][data-value="${CSS.escape(value)}"]`,
    );

const labelOf = (item: Element | null): HTMLElement | null =>
    item?.querySelector<HTMLElement>('[data-pf-part="item-label"]') ?? null;

const reduced = (view: Window | null) =>
    view?.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

/** Notes what a drill step moves from, before the level changes: `from` is the row whose label
 *  moves (the pressed item, or the back row going out), `to` the row it moves into in the next
 *  level (the back row going in, or the submenu's item going out). */
export const menuDrillFrom = (
    content: HTMLElement | null,
    from: string,
    to: string,
): MenuDrillSnapshot | undefined => {
    if (!content) return undefined;
    const box = content.getBoundingClientRect();
    return {
        width: box.width,
        height: box.height,
        label: labelOf(row(content, from))?.getBoundingClientRect(),
        to,
    };
};

/** Runs a drill step's motion once the new level is drawn; returns its animations (none under
 *  reduced motion). */
export const menuDrillTo = (
    content: HTMLElement | null,
    snapshot: MenuDrillSnapshot | undefined,
    timing: MenuDrillTiming = MENU_DRILL_TIMING,
): Animation[] => {
    if (!content || !snapshot || reduced(content.ownerDocument.defaultView))
        return [];
    const options = { duration: timing.duration, easing: timing.easing };
    const animations: Animation[] = [];
    const box = content.getBoundingClientRect();
    if (box.width !== snapshot.width || box.height !== snapshot.height) {
        animations.push(
            content.animate(
                [
                    {
                        width: `${snapshot.width}px`,
                        height: `${snapshot.height}px`,
                        overflow: "hidden",
                    },
                    {
                        width: `${box.width}px`,
                        height: `${box.height}px`,
                        overflow: "hidden",
                    },
                ],
                options,
            ),
        );
    }
    const target = row(content, snapshot.to);
    const label = labelOf(target);
    if (label && snapshot.label) {
        const now = label.getBoundingClientRect();
        const dx = snapshot.label.left - now.left;
        const dy = snapshot.label.top - now.top;
        if (dx !== 0 || dy !== 0) {
            animations.push(
                label.animate(
                    [
                        { transform: `translate(${dx}px, ${dy}px)` },
                        { transform: "translate(0px, 0px)" },
                    ],
                    options,
                ),
            );
        }
    }
    // The level's other rows and groups fade in around the label.
    for (const other of content.children) {
        if (
            other === target ||
            !other.matches('[data-part="item"], [data-pf-part="item-group"]')
        )
            continue;
        animations.push(
            other.animate([{ opacity: 0 }, { opacity: 1 }], options),
        );
    }
    return animations;
};
