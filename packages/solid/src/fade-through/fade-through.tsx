// The fade through: Material's transition between content that isn't spatially related, such as
// navigation destinations. The app wraps the content and names what it shows with `value`; a new
// value fades the shown page out, then the new one in as it grows into place. The page shown first
// doesn't animate; a page that left stays, out of reach, until its exit ends. Each page keeps the
// content it was given when its value came in; given a function, it's called with the page's own
// value, so a leaving page doesn't follow the signal that changed `value`.

import { fadeThroughAnatomy } from "@pureform/anatomy";
import {
    changePages,
    FADE_THROUGH_ROOT_PROPS,
    fadeThroughSelection,
} from "@pureform/binding-core";
import type {
    FadeThroughRootOwnProps,
    FadeThroughValue,
    PageKey,
    TransitionPage,
} from "@pureform/binding-core";
import { fadeThroughPageProps, pageRootProps } from "@pureform/binding-web";
import type { JSX, ValidComponent } from "@solidjs/web";
import { For, merge, omit } from "solid-js";

import { createTransitionPages, TransitionPageView } from "../page-transition";
import { useComponent } from "../parts";
import type { PartProps } from "../props";

/** The fade through's props: its own (`value`, `testId`, `unstyled`), `as`, the content, and the
 *  element's own props. */
export interface FadeThroughProps
    extends
        Omit<PartProps, keyof FadeThroughRootOwnProps | "children">,
        FadeThroughRootOwnProps {
    /** Another element or component to render instead of `<div>`. */
    readonly as?: ValidComponent | undefined;
    /** The content `value` shows, or a function of the value giving it. A page keeps what it was
     *  given, but content that reads a signal stays live: content reading the signal that sets
     *  `value` takes the function, so a leaving page keeps showing its own value. */
    readonly children?:
        | JSX.Element
        | ((value: FadeThroughValue) => JSX.Element);
}

// Quick switches keep every page still leaving until its own exit ends.
const change = (pages: readonly TransitionPage[], key: PageKey) =>
    changePages(pages, key, { keepLeaving: true });

/** Material's fade through: `<FadeThrough value={destination()}>{(value) => <Page of={value}
 *  />}</FadeThrough>`, with the navigation bar's or rail's `value`. */
export function FadeThrough(props: FadeThroughProps): JSX.Element {
    const scope = useComponent(fadeThroughAnatomy, {
        selection: () => fadeThroughSelection(),
        testId: () => props.testId,
        unstyled: () => props.unstyled,
    });
    const { pages, settle } = createTransitionPages(() => props.value, change);
    const content = (value: PageKey): JSX.Element => {
        const given = props.children;
        return typeof given === "function" && given.length > 0
            ? (given as (value: PageKey) => JSX.Element)(value)
            : (given as JSX.Element);
    };
    return scope.render("root", {
        element: "div",
        as: () => props.as,
        machine: () => pageRootProps(pages()),
        props: merge(
            omit(props, "as", "children", ...FADE_THROUGH_ROOT_PROPS),
            {
                get children() {
                    return (
                        <For
                            each={pages()}
                            keyed={(page: TransitionPage) => page.key}
                        >
                            {(page) => (
                                <TransitionPageView
                                    page={page}
                                    settle={settle}
                                    content={content}
                                    render={(ref, shown) =>
                                        scope.render("page", {
                                            element: "div",
                                            ref,
                                            machine: () =>
                                                fadeThroughPageProps(page()),
                                            props: {
                                                get children() {
                                                    return shown;
                                                },
                                            },
                                        })
                                    }
                                />
                            )}
                        </For>
                    );
                },
            },
        ),
    });
}
