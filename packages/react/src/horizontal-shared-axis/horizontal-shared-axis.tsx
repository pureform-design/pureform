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
import {
    createContext,
    Fragment,
    type ElementType,
    type ReactNode,
    useContext,
    useLayoutEffect,
    useRef,
    useState,
} from "react";

import { useComponent } from "../parts";
import type { ComponentScope } from "../parts";
import { omitProps } from "../props";
import type { PartProps } from "../props";

type Anatomy = typeof horizontalSharedAxisAnatomy;

/** The shared axis's props: its own (`index`, `scrim`, tokens, `testId`, `unstyled`), `as`, and
 *  the root element's own props. Its children are the page `index` names. */
export interface HorizontalSharedAxisProps
    extends
        Omit<PartProps, keyof HorizontalSharedAxisRootOwnProps>,
        HorizontalSharedAxisRootOwnProps {
    /** Another element or component to render instead of `<div>`. */
    readonly as?: ElementType | undefined;
}

const PageContext = createContext<SharedAxisPageState>("current");

/** Where the page around the caller is: `"current"`, `"entering"`, or `"leaving"` (still
 *  drawn while it goes; a part that hides itself when it isn't selected, such as a tab's
 *  panel, stays shown). `"current"` outside a shared axis. */
export const useSharedAxisPage = (): SharedAxisPageState =>
    useContext(PageContext);

// Waits for the element's own animations, then reports that its page settled. An element with
// none (unstyled, or no animation support) settles at once.
function Page(props: {
    readonly scope: ComponentScope<Anatomy>;
    readonly page: SharedAxisPage;
    readonly onSettle: (page: SharedAxisPage) => void;
    readonly children: ReactNode;
}): ReactNode {
    const { page, onSettle } = props;
    const element = useRef<HTMLElement>(null);
    useLayoutEffect(() => {
        if (page.state === "current") return;
        let live = true;
        const animations = element.current?.getAnimations?.() ?? [];
        Promise.all(animations.map((animation) => animation.finished)).then(
            () => live && onSettle(page),
            () => undefined,
        );
        return () => {
            live = false;
        };
    }, [page, onSettle]);
    return (
        <PageContext.Provider value={page.state}>
            {props.scope.render("page", {
                element: "div",
                ref: element,
                machine: sharedAxisPageProps(page),
                props: { children: props.children },
            })}
        </PageContext.Provider>
    );
}

function Root(props: HorizontalSharedAxisProps): ReactNode {
    const scope = useComponent(horizontalSharedAxisAnatomy, {
        selection: horizontalSharedAxisSelection(props),
        testId: props.testId,
        unstyled: props.unstyled,
    });
    const [pages, setPages] = useState(() => sharedAxisStart(props.index));
    // A change of index is a change of page: adjust the pages while rendering.
    const changed = sharedAxisChange(pages, props.index);
    if (changed !== pages) setPages(changed);
    // Each page's latest children; a leaving page keeps what it showed last.
    const contents = useRef(new Map<number, ReactNode>());
    contents.current.set(props.index, props.children);
    for (const index of contents.current.keys()) {
        if (!changed.some((page) => page.index === index)) {
            contents.current.delete(index);
        }
    }
    const [onSettle] = useState(
        () => (page: SharedAxisPage) =>
            setPages((now) => sharedAxisSettle(now, page.index, page.state)),
    );
    const {
        as,
        children: _children,
        ...rest
    } = omitProps(props, HORIZONTAL_SHARED_AXIS_ROOT_PROPS);
    const entering = changed.find((page) => page.state === "entering");
    const leaving = changed.some((page) => page.state === "leaving");
    const children = changed.map((page) => (
        <Page key={page.index} scope={scope} page={page} onSettle={onSettle}>
            {contents.current.get(page.index)}
        </Page>
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
        props: { ...rest, children },
    });
}

/** Material's horizontal shared axis, for spatially related pages (tabs, steps, onboarding):
 *  `<HorizontalSharedAxis index={step}>{pages[step]}</HorizontalSharedAxis>`. A higher `index`
 *  slides forward, a lower one backward; `scrim` veils the page underneath while they move. */
export const HorizontalSharedAxis: ((
    props: HorizontalSharedAxisProps,
) => ReactNode) & {
    readonly Root: (props: HorizontalSharedAxisProps) => ReactNode;
} = Object.assign(Root, { Root });
