// The pages of a page transition, shared by the fade through and the horizontal shared axis: the
// pages binding-core's page model keeps for a key, each page's content as it last was, and a
// page element that reports when its motion has ended, so a leaving page goes and an entering one
// settles. The transition gives the change (its direction, whether pages still leaving stay) and
// each page's attributes.

import { keepContents, settlePage, startPages } from "@pureform/binding-core";
import type {
    PageKey,
    PageState,
    TransitionPage,
} from "@pureform/binding-core";
import { whenAnimationsEnd } from "@pureform/binding-web";
import {
    createContext,
    useContext,
    useLayoutEffect,
    useRef,
    useState,
} from "react";
import type { ReactNode, RefObject } from "react";

const PageContext = createContext<PageState>("current");

/** Where the page around the caller is in a fade through or shared axis: `"current"`,
 *  `"entering"`, or `"leaving"` (still drawn while it goes; a part that hides itself when it isn't
 *  selected, such as a tab's panel, stays shown). `"current"` outside one. */
export const useTransitionPage = (): PageState => useContext(PageContext);

/** The pages for `key` showing `content`, changed by `change` while rendering, as derived state
 *  is; each page's content (a leaving page's as it last was); and `settle`, which a page calls
 *  once its motion has ended. */
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

/** One page, which `render` draws with the element ref it's given (the transition's `page`
 *  part), and which settles once the animations its state starts have ended (at once without
 *  any: unstyled, or no animation support). */
export function TransitionPageView(props: {
    readonly page: TransitionPage;
    readonly settle: (page: TransitionPage) => void;
    readonly render: (ref: RefObject<HTMLElement | null>) => ReactNode;
}): ReactNode {
    const { page, settle } = props;
    const element = useRef<HTMLElement>(null);
    useLayoutEffect(() => {
        if (page.state === "current" || !element.current) return;
        return whenAnimationsEnd(element.current, () => settle(page));
    }, [page, settle]);
    return (
        <PageContext.Provider value={page.state}>
            {props.render(element)}
        </PageContext.Provider>
    );
}
