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
import type { ElementType, ReactNode } from "react";

import { createPartContext } from "../part-context";
import { useComponent, useSlotProps, plainParts } from "../parts";
import type { ComponentScope, SlotKeyedProps } from "../parts";
import { omitProps } from "../props";
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
    readonly as?: ElementType | undefined;
}

/** A part's props: the element's own, and the part's `unstyled`. */
export interface LoadingIndicatorPartProps extends PartProps {
    readonly unstyled?: boolean | undefined;
}

/** The loading indicator's root: the box, with `role="progressbar"` and no value. */
function Root(props: LoadingIndicatorRootProps): ReactNode {
    const scope = useComponent(loadingIndicatorAnatomy, {
        selection: loadingIndicatorSelection(props),
        testId: props.testId,
        unstyled: props.unstyled,
    });
    const { as, ...rest } = omitProps(props, LOADING_INDICATOR_ROOT_PROPS);
    return (
        <context.Provider value={{ scope }}>
            {scope.render("root", {
                element: "div",
                as,
                machine: loadingIndicatorRootProps(),
                props: rest,
            })}
        </context.Provider>
    );
}

const part = plainParts(context.use, "span");

/** The container: round and filled when `contained`, empty otherwise. Holds `Indicator`. */
const Container = part("container", "Container");
/** The shape that turns and morphs. Empty. */
const Indicator = part("indicator", "Indicator");

/** The ready-made loading indicator's props: Root's, with `className`, `style`, and
 *  `slotProps` keyed by part. */
export interface LoadingIndicatorProps
    extends
        Omit<
            LoadingIndicatorRootProps,
            keyof SlotKeyedProps<Anatomy> | "children"
        >,
        SlotKeyedProps<Anatomy> {}

/** The ready-made loading indicator: Root, its container and the indicator. */
function ReadyMade(props: LoadingIndicatorProps): ReactNode {
    const {
        className: _className,
        style: _style,
        slotProps: _slotProps,
        ...rootProps
    } = props;
    const slot = useSlotProps(props);
    return (
        <Root {...rootProps} {...(slot("root") as object)}>
            <Container {...slot("container")}>
                <Indicator {...slot("indicator")} />
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
