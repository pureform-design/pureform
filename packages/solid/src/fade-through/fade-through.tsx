// The fade through: Material's transition between content that isn't spatially related, such as
// navigation destinations. The app wraps the content and names what it shows with `value`; a new
// value fades the shown page out, then the new one in as it grows into place. The page shown first
// doesn't animate; a page that left stays, out of reach, until its exit ends. Each page keeps the
// content it was given when its value came in; given a function, it's called with the page's own
// value, so a leaving page doesn't follow the signal that changed `value`.

import { fadeThroughAnatomy } from "@pureform/anatomy";
import {
    dropPage,
    FADE_THROUGH_ROOT_PROPS,
    fadeThroughSelection,
    pageStateProps,
    showPage,
} from "@pureform/binding-core";
import type {
    FadeThroughPage,
    FadeThroughRootOwnProps,
    FadeThroughValue,
} from "@pureform/binding-core";
import { whenAnimationsEnd } from "@pureform/binding-core/dom";
import type { JSX, ValidComponent } from "@solidjs/web";
import {
    createEffect,
    createSignal,
    For,
    merge,
    omit,
    untrack,
} from "solid-js";

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

type Page = FadeThroughPage<null>;

/** Material's fade through: `<FadeThrough value={destination()}>{(value) => <Page of={value}
 *  />}</FadeThrough>`, with the navigation bar's or rail's `value`. */
export function FadeThrough(props: FadeThroughProps): JSX.Element {
    const scope = useComponent(fadeThroughAnatomy, {
        selection: () => fadeThroughSelection(),
        testId: () => props.testId,
        unstyled: () => props.unstyled,
    });
    const [pages, setPages] = createSignal<readonly Page[]>(
        showPage<null>(
            [],
            untrack(() => props.value),
            null,
        ),
    );
    createEffect(
        () => props.value,
        (value) => {
            setPages((current) => showPage(current, value, null));
        },
    );
    const page = (entry: () => Page) => {
        const { value } = untrack(entry);
        const content = untrack(() => {
            const given = props.children;
            return typeof given === "function" && given.length > 0
                ? (given as (value: FadeThroughValue) => JSX.Element)(value)
                : (given as JSX.Element);
        });
        let element: HTMLElement | undefined;
        createEffect(
            () => entry().state,
            (state) =>
                state === "closed" && element
                    ? whenAnimationsEnd(element, () =>
                          setPages((current) => dropPage(current, value)),
                      )
                    : undefined,
        );
        return scope.render("page", {
            element: "div",
            ref: (node) => {
                element = node;
            },
            machine: () => pageStateProps(entry().state),
            props: { children: content },
        });
    };
    return scope.render("root", {
        element: "div",
        as: () => props.as,
        props: merge(
            omit(props, "as", "children", ...FADE_THROUGH_ROOT_PROPS),
            {
                get children() {
                    return (
                        <For
                            each={pages()}
                            keyed={(entry: Page) => entry.value}
                        >
                            {page}
                        </For>
                    );
                },
            },
        ),
    });
}
