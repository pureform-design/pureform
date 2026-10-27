// The pages of a page transition, shared by the fade through and the horizontal shared axis: the
// pages binding-core's page model keeps for a key, changed while rendering as derived state is,
// each page's content (a leaving page's as it last was), and `settle`, which a page calls once its
// motion has ended. The transition gives the change and moves each page on the provider's engine.

import { keepContents, settlePage, startPages } from "@pureform/binding-core";
import type { PageKey, TransitionPage } from "@pureform/binding-core";
import { useRef, useState } from "react";

/** The pages for `key` showing `content`, changed by `change`; each page's content; and
 *  `settle`. */
export function useTransitionPages<C>(
    key: PageKey,
    content: C,
    change: (
        pages: readonly TransitionPage[],
        key: PageKey,
    ) => readonly TransitionPage[],
): {
    readonly pages: readonly TransitionPage[];
    readonly contents: ReadonlyMap<PageKey, C>;
    readonly settle: (page: TransitionPage) => void;
} {
    const [pages, setPages] = useState(() => startPages(key));
    const next = change(pages, key);
    if (next !== pages) setPages(next);
    // oxlint-disable-next-line react/refs -- a stable mutable cache of each page's content, kept across renders
    const contents = useRef(new Map<PageKey, C>()).current;
    keepContents(contents, next, key, content);
    const [settle] = useState(
        () => (page: TransitionPage) =>
            setPages((now) => settlePage(now, page.key, page.state)),
    );
    return { pages: next, contents, settle };
}
