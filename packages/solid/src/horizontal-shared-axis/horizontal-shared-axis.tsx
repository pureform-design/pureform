// The horizontal shared axis: a root around the page `index` names. When `index` changes, the
// page shown before slides and fades out the way the change goes while the new one slides and
// fades in (the preset's keyframes, on the theme's springs); the outgoing page stays, inert,
// until its animations end. Right to left mirrors the slide; reduced motion keeps the fades.

import { horizontalSharedAxisAnatomy } from "@pureform/anatomy";
import {
    HORIZONTAL_SHARED_AXIS_ROOT_PROPS,
    horizontalSharedAxisSelection,
    sharedAxisChange,
    sharedAxisPageProps,
    sharedAxisScrimProps,
    sharedAxisSettle,
    sharedAxisStart,
} from "@pureform/binding-core";
import type {
    HorizontalSharedAxisRootOwnProps,
    SharedAxisPage,
    SharedAxisPageState,
} from "@pureform/binding-core";
import type { JSX, ValidComponent } from "@solidjs/web";
import {
    type Accessor,
    createContext,
    createEffect,
    createMemo,
    createSignal,
    For,
    merge,
    omit,
    Show,
    untrack,
    useContext,
} from "solid-js";

import { useComponent } from "../parts";
import type { ComponentScope } from "../parts";
import type { PartProps } from "../props";

type Anatomy = typeof horizontalSharedAxisAnatomy;

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

const PageContext = createContext<Accessor<SharedAxisPageState>>(
    () => "current",
);

/** Where the page around the caller is: `"current"`, `"entering"`, or `"leaving"` (still
 *  drawn while it goes; a part that hides itself when it isn't selected, such as a tab's
 *  panel, stays shown). `"current"` outside a shared axis. */
export const useSharedAxisPage = (): Accessor<SharedAxisPageState> =>
    useContext(PageContext);

// Waits for the element's own animations, then reports that its page settled. An element with
// none (unstyled, or no animation support) settles at once.
function Page(props: {
    readonly scope: ComponentScope<Anatomy>;
    readonly page: Accessor<SharedAxisPage>;
    readonly onSettle: (page: SharedAxisPage) => void;
    readonly content: (index: number) => JSX.Element;
}): JSX.Element {
    let element: HTMLElement | undefined;
    createEffect(
        () => props.page(),
        (page) => {
            if (page.state === "current") return;
            let live = true;
            // A frame on, once the page is in the document with its new state's styles.
            const frame = requestAnimationFrame(() => {
                const animations = element?.getAnimations?.() ?? [];
                Promise.all(
                    animations.map((animation) => animation.finished),
                ).then(
                    () => live && props.onSettle(page),
                    () => undefined,
                );
            });
            return () => {
                live = false;
                cancelAnimationFrame(frame);
            };
        },
    );
    const state = () => props.page().state;
    return (
        <PageContext value={state}>
            {(() => {
                // Built once, under the page's context: a leaving page keeps what it showed.
                const content = untrack(() =>
                    props.content(props.page().index),
                );
                return props.scope.render("page", {
                    element: "div",
                    ref: (el) => {
                        element = el;
                    },
                    machine: () => sharedAxisPageProps(props.page()),
                    props: {
                        get children() {
                            return content;
                        },
                    },
                });
            })()}
        </PageContext>
    );
}

function Root(props: HorizontalSharedAxisProps): JSX.Element {
    const scope = useComponent(horizontalSharedAxisAnatomy, {
        selection: () => horizontalSharedAxisSelection(props),
        testId: () => props.testId,
        unstyled: () => props.unstyled,
    });
    const [pages, setPages] = createSignal<readonly SharedAxisPage[]>(
        untrack(() => sharedAxisStart(props.index)),
    );
    createEffect(
        () => props.index,
        (index) => {
            setPages((now) => sharedAxisChange(now, index));
        },
    );
    const onSettle = (page: SharedAxisPage) =>
        setPages((now) => sharedAxisSettle(now, page.index, page.state));
    const content = (index: number): JSX.Element => {
        const children = props.children;
        return typeof children === "function"
            ? (children as (index: number) => JSX.Element)(index)
            : children;
    };
    const scrimDirection = createMemo(() => {
        const now = pages();
        if (!props.scrim || !now.some((page) => page.state === "leaving"))
            return undefined;
        return now.find((page) => page.state === "entering")?.direction;
    });
    return scope.render("root", {
        element: "div",
        as: () => props.as,
        props: merge(
            omit(props, "as", "children", ...HORIZONTAL_SHARED_AXIS_ROOT_PROPS),
            {
                get children() {
                    return (
                        <>
                            <For
                                each={pages()}
                                keyed={(page: SharedAxisPage) => page.index}
                            >
                                {(page) => (
                                    <Page
                                        scope={scope}
                                        page={page}
                                        onSettle={onSettle}
                                        content={content}
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
        ),
    });
}

/** Material's horizontal shared axis, for spatially related pages (tabs, steps, onboarding):
 *  `<HorizontalSharedAxis index={step()}>{(at) => pages[at]}</HorizontalSharedAxis>`. A higher
 *  `index` slides forward, a lower one backward; `scrim` veils the page underneath while they
 *  move. */
export const HorizontalSharedAxis: ((
    props: HorizontalSharedAxisProps,
) => JSX.Element) & {
    readonly Root: (props: HorizontalSharedAxisProps) => JSX.Element;
} = Object.assign(Root, { Root });
