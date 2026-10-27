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
import type { JSX, ValidComponent } from "@solidjs/web";
import { createMemo, For, merge, omit, Show } from "solid-js";

import { createTransitionPages, TransitionPageView } from "../page-transition";
import { useComponent } from "../parts";
import type { PartProps } from "../props";

/** The shared axis's props: its own (`index`, `scrim`, tokens, `testId`, `unstyled`), `as`, and
 *  the root element's own props. Its children are the page `index` names, or a function from a
 *  page's index to it: a page that leaves keeps what it was built with, so children that read
 *  `index` themselves should be a function. */
export interface HorizontalSharedAxisProps
    extends
        Omit<PartProps, keyof HorizontalSharedAxisRootOwnProps | "children">,
        HorizontalSharedAxisRootOwnProps {
    /** Another element or component to render instead of `<div>`. */
    readonly as?: ValidComponent | undefined;
    readonly children?: JSX.Element | ((index: number) => JSX.Element);
}

const change = (pages: readonly TransitionPage[], key: PageKey) =>
    sharedAxisChange(pages, Number(key));

function Root(props: HorizontalSharedAxisProps): JSX.Element {
    const scope = useComponent(horizontalSharedAxisAnatomy, {
        selection: () => horizontalSharedAxisSelection(props),
        testId: () => props.testId,
        unstyled: () => props.unstyled,
    });
    const { pages, settle } = createTransitionPages(() => props.index, change);
    const content = (index: PageKey): JSX.Element => {
        const children = props.children;
        return typeof children === "function" && children.length > 0
            ? (children as (index: number) => JSX.Element)(Number(index))
            : (children as JSX.Element);
    };
    const scrimDirection = createMemo(() => {
        const now = pages();
        if (!props.scrim || !now.some((page) => page.state === "leaving"))
            return undefined;
        return now.find((page) => page.state === "entering")?.direction;
    });
    const merged = merge(
        omit(props, "as", "children", ...HORIZONTAL_SHARED_AXIS_ROOT_PROPS),
        {
            get children() {
                return (
                    <>
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
                                                sharedAxisPageProps(page()),
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
                        {/* Over the page underneath while both show; the pages' stacking places it. */}
                        <Show when={scrimDirection()}>
                            {(direction) =>
                                scope.render("scrim", {
                                    element: "div",
                                    machine: () =>
                                        sharedAxisScrimProps(direction()),
                                })
                            }
                        </Show>
                    </>
                );
            },
        },
    );
    return scope.render("root", {
        element: "div",
        as: () => props.as,
        machine: () => pageRootProps(pages(), true),
        props: merged,
    });
}

/** Material's horizontal shared axis, for spatially related pages (tabs, steps, onboarding):
 *  `<HorizontalSharedAxis index={step()}>{(at) => pages[at]}</HorizontalSharedAxis>`. A higher
 *  `index` slides forward, a lower one backward; `scrim` (off by default: Compose draws it only
 *  behind predictive back) veils the page underneath while they move. */
export const HorizontalSharedAxis: ((
    props: HorizontalSharedAxisProps,
) => JSX.Element) & {
    readonly Root: (props: HorizontalSharedAxisProps) => JSX.Element;
} = Object.assign(Root, { Root });
