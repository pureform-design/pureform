// The fade through: Material's transition between content that isn't spatially related, such as
// navigation destinations. The app wraps the content and names what it shows with `value`; a new
// value fades the shown page out, then the new one in as it grows into place. The page shown first
// doesn't animate; a page that left stays, out of reach, until its exit ends.

import { fadeThroughAnatomy } from "@pureform/anatomy";
import {
    dropPage,
    FADE_THROUGH_ROOT_PROPS,
    fadeThroughSelection,
    pageStateProps,
    showPage,
} from "@pureform/binding-core";
import type {
    FadeThroughRootOwnProps,
    FadeThroughState,
    FadeThroughValue,
} from "@pureform/binding-core";
import { whenAnimationsEnd } from "@pureform/binding-core/dom";
import { useLayoutEffect, useRef, useState } from "react";
import type { ElementType, ReactNode } from "react";

import { useComponent } from "../parts";
import type { PartScope } from "../parts";
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

interface PageProps {
    readonly scope: PartScope<typeof fadeThroughAnatomy>;
    readonly state: FadeThroughState;
    readonly gone: () => void;
    readonly children: ReactNode;
}

function Page({ scope, state, gone, children }: PageProps): ReactNode {
    const node = useRef<HTMLElement>(null);
    const leave = useRef(gone);
    leave.current = gone;
    useLayoutEffect(() => {
        if (state !== "closed" || !node.current) return;
        return whenAnimationsEnd(node.current, () => leave.current());
    }, [state]);
    return scope.render("page", {
        element: "div",
        machine: pageStateProps(state),
        ref: node,
        props: { children },
    });
}

/** Material's fade through: `<FadeThrough value={destination}>{page}</FadeThrough>`, with the
 *  navigation bar's or rail's `value`. */
export function FadeThrough(props: FadeThroughProps): ReactNode {
    const scope = useComponent(fadeThroughAnatomy, {
        selection: fadeThroughSelection(),
        testId: props.testId,
        unstyled: props.unstyled,
    });
    const [pages, setPages] = useState(() =>
        showPage<null>([], props.value, null),
    );
    const next = showPage(pages, props.value, null);
    // A new value updates the pages during this render, as derived state does.
    if (next !== pages) setPages(next);
    // Each page's content: the shown one's from this render, a leaving one's as it last was.
    const contents = useRef(new Map<FadeThroughValue, ReactNode>()).current;
    const given = props.children;
    contents.set(
        props.value,
        typeof given === "function" ? given(props.value) : given,
    );
    for (const value of contents.keys()) {
        if (!next.some((page) => page.value === value)) contents.delete(value);
    }
    const rest = omitProps(props, [
        "as",
        "children",
        ...FADE_THROUGH_ROOT_PROPS,
    ]);
    const drop = (value: FadeThroughValue) => () =>
        setPages((current) => dropPage(current, value));
    return scope.render("root", {
        element: "div",
        as: props.as,
        props: {
            ...rest,
            children: next.map((page) => (
                <Page
                    key={page.value}
                    scope={scope}
                    state={page.state}
                    gone={drop(page.value)}
                >
                    {contents.get(page.value)}
                </Page>
            )),
        },
    });
}
