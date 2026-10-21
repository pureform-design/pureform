// The loading indicator: Root, a `role="progressbar"` box with no value, around its Container and
// the morphing Indicator, and the ready-made LoadingIndicator over them. It has no machine: the
// preset turns and morphs the indicator.

import { loadingIndicatorAnatomy } from "@pureform/anatomy";
import {
    LOADING_INDICATOR_ROOT_PROPS,
    loadingIndicatorRootProps,
    loadingIndicatorSelection,
} from "@pureform/binding-core";
import type { LoadingIndicatorRootOwnProps } from "@pureform/binding-core";
import type { JSX, ValidComponent } from "@solidjs/web";
import { omit } from "solid-js";

import { createPartContext } from "../part-context";
import { createSlotProps, useComponent } from "../parts";
import type { ComponentScope, SlotKeyedProps } from "../parts";
import type { PartProps } from "../props";

type Anatomy = typeof loadingIndicatorAnatomy;

/** What Root shares with its parts. */
interface LoadingIndicatorContextValue {
    readonly scope: ComponentScope<Anatomy>;
}

const context =
    createPartContext<LoadingIndicatorContextValue>("LoadingIndicator");

/** Root's props: the variants and tokens, `testId` and `unstyled` for every part, `as`, and the
 *  element's own props. Name it with `aria-label` or `aria-labelledby`. */
export interface LoadingIndicatorRootProps
    extends
        Omit<PartProps, keyof LoadingIndicatorRootOwnProps>,
        LoadingIndicatorRootOwnProps {
    /** Another element or component to render instead of `<div>`. */
    readonly as?: ValidComponent | undefined;
}

/** A part's props: the element's own, and the part's `unstyled`. */
export interface LoadingIndicatorPartProps extends PartProps {
    readonly unstyled?: boolean | undefined;
}

/** The loading indicator's root: the box, with `role="progressbar"` and no value. */
function Root(props: LoadingIndicatorRootProps): JSX.Element {
    const scope = useComponent(loadingIndicatorAnatomy, {
        selection: () => loadingIndicatorSelection(props),
        testId: () => props.testId,
        unstyled: () => props.unstyled,
    });
    return (
        <context.Provider value={{ scope }}>
            {scope.render("root", {
                element: "div",
                as: () => props.as,
                machine: () => loadingIndicatorRootProps(),
                props: omit(props, "as", ...LOADING_INDICATOR_ROOT_PROPS),
            })}
        </context.Provider>
    );
}

const part = (name: "container" | "indicator", label: string) =>
    function Part(props: LoadingIndicatorPartProps): JSX.Element {
        const { scope } = context.use(label);
        return scope.render(name, {
            element: "span",
            unstyled: () => props.unstyled,
            props: omit(props, "unstyled"),
        });
    };

/** The container: round and filled when `contained`, empty otherwise. Holds `Indicator`. */
const Container = part("container", "Container");
/** The shape that turns and morphs. Empty. */
const Indicator = part("indicator", "Indicator");

/** The ready-made loading indicator's props: Root's, with `class`, `style`, and `slotProps`
 *  keyed by part. */
export interface LoadingIndicatorProps
    extends
        Omit<
            LoadingIndicatorRootProps,
            keyof SlotKeyedProps<Anatomy> | "children"
        >,
        SlotKeyedProps<Anatomy> {}

/** The ready-made loading indicator: Root, its container and the indicator. */
function ReadyMade(props: LoadingIndicatorProps): JSX.Element {
    const slots = createSlotProps(props);
    const own = omit(
        props,
        "class",
        "style",
        "slotProps",
    ) as LoadingIndicatorRootProps;
    const root = slots("root") as object;
    const container = slots("container");
    const indicator = slots("indicator");
    return (
        <Root {...own} {...root}>
            <Container {...container}>
                <Indicator {...indicator} />
            </Container>
        </Root>
    );
}

/** M3 Expressive's loading indicator, for a wait too short to measure. Use it ready-made,
 *  `<LoadingIndicator aria-label="Loading" />` (`variant="contained"` puts it on a round
 *  container), or compose `LoadingIndicator.Root` around `Container` holding `Indicator`. */
export const LoadingIndicator = Object.assign(ReadyMade, {
    Root,
    Container,
    Indicator,
});
