// The fade through: Material's transition between content that isn't spatially related, such as
// navigation destinations. The app wraps the content and names what it shows with `value`; a new
// value fades the shown page out, then the new one in as it grows into place. The page shown first
// doesn't animate; a page that left stays, out of reach, until its exit ends.

import { fadeThroughAnatomy } from "@pureform/anatomy";
import {
    changePages,
    FADE_THROUGH_ROOT_PROPS,
    fadeThroughPageProps,
    fadeThroughSelection,
    pageRootProps,
} from "@pureform/binding-core";
import type {
    FadeThroughRootOwnProps,
    FadeThroughValue,
    PageKey,
    TransitionPage,
} from "@pureform/binding-core";
import type { ElementType, ReactNode } from "react";

import { TransitionPageView, useTransitionPages } from "../page-transition";
import { useComponent } from "../parts";
import type { PartProps } from "../props";
import { omitProps } from "../props";

/** The fade through's props: its own (`value`, `testId`, `unstyled`), `as`, the content, and the
 *  element's own props. */
export interface FadeThroughProps
    extends
        Omit<PartProps, keyof FadeThroughRootOwnProps | "children">,
        FadeThroughRootOwnProps {
    /** Another element or component to render instead of `<div>`. */
    readonly as?: ElementType | undefined;
    /** The content `value` shows, or a function of the value giving it. */
    readonly children?: ReactNode | ((value: FadeThroughValue) => ReactNode);
}

// Quick switches keep every page still leaving until its own exit ends.
const change = (pages: readonly TransitionPage[], key: PageKey) =>
    changePages(pages, key, { keepLeaving: true });

/** Material's fade through: `<FadeThrough value={destination}>{page}</FadeThrough>`, with the
 *  navigation bar's or rail's `value`. */
export function FadeThrough(props: FadeThroughProps): ReactNode {
    const scope = useComponent(fadeThroughAnatomy, {
        selection: fadeThroughSelection(),
        testId: props.testId,
        unstyled: props.unstyled,
    });
    const given = props.children;
    const { pages, contents, settle } = useTransitionPages(
        props.value,
        typeof given === "function" ? given(props.value) : given,
        change,
    );
    const rest = omitProps(props, [
        "as",
        "children",
        ...FADE_THROUGH_ROOT_PROPS,
    ]);
    return scope.render("root", {
        element: "div",
        as: props.as,
        machine: pageRootProps(pages),
        props: {
            ...rest,
            children: pages.map((page) => (
                <TransitionPageView
                    key={page.key}
                    page={page}
                    settle={settle}
                    render={(ref) =>
                        scope.render("page", {
                            element: "div",
                            machine: fadeThroughPageProps(page),
                            ref,
                            props: { children: contents.get(page.key) },
                        })
                    }
                />
            )),
        },
    });
}
