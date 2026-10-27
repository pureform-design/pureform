// The web factory's output: class strings per slot, and CSS vars for instance tokens. The
// component types (`Selection`, `SlotOf`, the registry they read) are styling's, which generated
// declarations augment.

import type { ComponentRef, Selection, SlotOf } from "@pureform/styling";

/** CSS custom properties for an element's `style`. */
export type TokenStyle = Readonly<Record<`--${string}`, string>>;

/** One slot's classes on the web, and the CSS vars for instance tokens where it has any. */
export interface SlotClasses {
    readonly class: string;
    readonly style?: TokenStyle;
}

/** Each slot's classes. */
export type ClassSlots<C extends ComponentRef> = {
    readonly [S in SlotOf<C>]: SlotClasses;
};

/** Web: class strings per slot, plus CSS vars for instance tokens. States aren't in the
 *  selection: the element carries them and the CSS matches them. */
export type ClassFactory<C extends ComponentRef> = (
    selection: Selection<C>,
) => ClassSlots<C>;
