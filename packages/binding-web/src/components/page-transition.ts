import { pagesMoving, pagesLeaving } from "@pureform/binding-core";
import type { TransitionPage } from "@pureform/binding-core";

/** The root's attributes while a page leaves (or, with `whileMoving`, while any page moves, for
 *  a transition whose entering page slides too): `data-transitioning`, which clips the root. */
export const pageRootProps = (
    pages: readonly TransitionPage[],
    whileMoving = false,
): Readonly<Record<string, string>> =>
    (whileMoving ? pagesMoving(pages) : pagesLeaving(pages))
        ? { "data-transitioning": "" }
        : {};
