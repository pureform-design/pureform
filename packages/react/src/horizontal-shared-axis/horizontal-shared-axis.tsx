// The horizontal shared axis: a root around the page `index` names. When `index` changes, the
// page shown before slides and fades out the way the change goes while the new one slides and
// fades in (the preset's keyframes, on the theme's springs); the outgoing page stays, inert,
// until its animations end. Right to left mirrors the slide; reduced motion keeps the fades.

import { horizontalSharedAxisAnatomy } from "@pureform/anatomy";
import {
    HORIZONTAL_SHARED_AXIS_ROOT_PROPS,
    horizontalSharedAxisSelection,
    sharedAxisChange,
} from "@pureform/binding-core";
import type {
    HorizontalSharedAxisRootOwnProps,
    PageKey,
    TransitionPage,
} from "@pureform/binding-core";
import {
    pageRootProps,
    sharedAxisPageProps,
    sharedAxisScrimProps,
} from "@pureform/binding-web";
import { Fragment, type ElementType, type ReactNode } from "react";

import { TransitionPageView, useTransitionPages } from "../page-transition";
import { useComponent } from "../parts";
import { omitProps } from "../props";
import type { PartProps } from "../props";

/** The shared axis's props: its own (`index`, `scrim`, tokens, `testId`, `unstyled`), `as`, and
 *  the root element's own props. Its children are the page `index` names. */
export interface HorizontalSharedAxisProps
    extends
        Omit<PartProps, keyof HorizontalSharedAxisRootOwnProps>,
        HorizontalSharedAxisRootOwnProps {
    /** Another element or component to render instead of `<div>`. */
    readonly as?: ElementType | undefined;
}

const change = (pages: readonly TransitionPage[], key: PageKey) =>
    sharedAxisChange(pages, Number(key));

function Root(props: HorizontalSharedAxisProps): ReactNode {
    const scope = useComponent(horizontalSharedAxisAnatomy, {
        selection: horizontalSharedAxisSelection(props),
        testId: props.testId,
        unstyled: props.unstyled,
    });
    const { pages, contents, settle } = useTransitionPages(
        props.index,
        props.children,
        change,
    );
    const {
        as,
        children: _children,
        ...rest
    } = omitProps(props, HORIZONTAL_SHARED_AXIS_ROOT_PROPS);
    const entering = pages.find((page) => page.state === "entering");
    const leaving = pages.some((page) => page.state === "leaving");
    const children = pages.map((page) => (
        <TransitionPageView
            key={page.key}
            page={page}
            settle={settle}
            render={(ref) =>
                scope.render("page", {
                    element: "div",
                    ref,
                    machine: sharedAxisPageProps(page),
                    props: { children: contents.get(page.key) },
                })
            }
        />
    ));
    // Between the pages while both show; their stacking puts it over the one underneath.
    if (props.scrim && leaving && entering?.direction) {
        children.splice(
            1,
            0,
            <Fragment key="scrim">
                {scope.render("scrim", {
                    element: "div",
                    machine: sharedAxisScrimProps(entering.direction),
                })}
            </Fragment>,
        );
    }
    return scope.render("root", {
        element: "div",
        as,
        machine: pageRootProps(pages, true),
        props: { ...rest, children },
    });
}

/** Material's horizontal shared axis, for spatially related pages (tabs, steps, onboarding):
 *  `<HorizontalSharedAxis index={step}>{pages[step]}</HorizontalSharedAxis>`. A higher `index`
 *  slides forward, a lower one backward; `scrim` (off by default: Compose draws it only behind
 *  predictive back) veils the page underneath while they move. */
export const HorizontalSharedAxis: ((
    props: HorizontalSharedAxisProps,
) => ReactNode) & {
    readonly Root: (props: HorizontalSharedAxisProps) => ReactNode;
} = Object.assign(Root, { Root });
