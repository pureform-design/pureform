// The pages of a page transition, shared by the fade through and the horizontal shared axis: the
// pages binding-core's page model keeps for a key, and a page that builds its content once (a
// leaving page keeps what it showed) and reports when its motion has ended, so a leaving page
// goes and an entering one settles. The transition gives the change (its direction, whether
// pages still leaving stay) and each page's attributes.

import { settlePage, startPages } from "@pureform/binding-core";
import type {
    PageKey,
    PageState,
    TransitionPage,
} from "@pureform/binding-core";
import { whenAnimationsEnd } from "@pureform/binding-dom";
import type { JSX } from "@solidjs/web";
import {
    type Accessor,
    createContext,
    createEffect,
    createSignal,
    untrack,
    useContext,
} from "solid-js";

const PageContext = createContext<Accessor<PageState>>(() => "current");

/** Where the page around the caller is in a fade through or shared axis: `"current"`,
 *  `"entering"`, or `"leaving"` (still drawn while it goes; a part that hides itself when it isn't
 *  selected, such as a tab's panel, stays shown). `"current"` outside one. */
export const useTransitionPage = (): Accessor<PageState> =>
    useContext(PageContext);

/** The pages for the key `key` reads, changed by `change` when it changes, and `settle`, which a
 *  page calls once its motion has ended. */
export function createTransitionPages(
    key: () => PageKey,
    change: (
        pages: readonly TransitionPage[],
        key: PageKey,
    ) => readonly TransitionPage[],
): {
    readonly pages: Accessor<readonly TransitionPage[]>;
    readonly settle: (page: TransitionPage) => void;
} {
    const [pages, setPages] = createSignal<readonly TransitionPage[]>(
        startPages(untrack(key)),
    );
    createEffect(key, (next) => {
        setPages((now) => change(now, next));
    });
    return {
        pages,
        settle: (page) =>
            setPages((now) => settlePage(now, page.key, page.state)),
    };
}

/** One page, under its state's context: `render` draws it with `ref` (the transition's `page`
 *  part) and `content`, built once from `content`. It settles once the animations its state
 *  starts have ended, a frame on, when its new state's styles apply (at once without any:
 *  unstyled, or no animation support). */
export function TransitionPageView(props: {
    readonly page: Accessor<TransitionPage>;
    readonly settle: (page: TransitionPage) => void;
    readonly content: (key: PageKey) => JSX.Element;
    readonly render: (
        ref: (element: HTMLElement) => void,
        content: JSX.Element,
    ) => JSX.Element;
}): JSX.Element {
    let element: HTMLElement | undefined;
    createEffect(
        () => props.page(),
        (page) => {
            if (page.state === "current") return;
            let cancel: (() => void) | undefined;
            const frame = requestAnimationFrame(() => {
                if (element)
                    cancel = whenAnimationsEnd(element, () =>
                        props.settle(page),
                    );
            });
            return () => {
                cancelAnimationFrame(frame);
                cancel?.();
            };
        },
    );
    const state = () => props.page().state;
    return (
        <PageContext value={state}>
            {(() => {
                // Built once, under the page's context: a leaving page keeps what it showed.
                const content = untrack(() => props.content(props.page().key));
                return props.render((node) => {
                    element = node;
                }, content);
            })()}
        </PageContext>
    );
}
