// The linear progress indicator: Root, a `role="progressbar"` track, around its Indicator, and the
// ready-made LinearProgress over them. It has no machine: the app sets the value, which places the
// indicator through the preset's `value` token. Without one it's indeterminate, and the indicator
// slides along the track.

import { linearProgressAnatomy } from "@pureform/anatomy";
import {
    PROGRESS_ROOT_PROPS,
    progressRootProps,
    progressSelection,
} from "@pureform/binding-core";
import type { ProgressRootOwnProps } from "@pureform/binding-core";
import type { JSX, ValidComponent } from "@solidjs/web";
import { omit } from "solid-js";

import { createPartContext } from "../part-context";
import { createSlotProps, useComponent } from "../parts";
import type { ComponentScope, SlotKeyedProps } from "../parts";
import type { PartProps } from "../props";

type Anatomy = typeof linearProgressAnatomy;

/** What Root shares with its parts. */
interface LinearProgressContextValue {
    readonly scope: ComponentScope<Anatomy>;
}

const context = createPartContext<LinearProgressContextValue>("LinearProgress");

/** Root's props: the value and its range, the variants and tokens, `testId` and `unstyled` for
 *  every part, `as`, and the element's own props. Name it with `aria-label` or
 *  `aria-labelledby`. */
export interface LinearProgressRootProps
    extends
        Omit<PartProps, keyof ProgressRootOwnProps<"linearProgress">>,
        ProgressRootOwnProps<"linearProgress"> {
    /** Another element or component to render instead of `<div>`. */
    readonly as?: ValidComponent | undefined;
}

/** A part's props: the element's own, and the part's `unstyled`. */
export interface LinearProgressPartProps extends PartProps {
    readonly unstyled?: boolean | undefined;
}

/** The linear progress indicator's root: the track, with `role="progressbar"` and the value. */
function Root(props: LinearProgressRootProps): JSX.Element {
    const scope = useComponent(linearProgressAnatomy, {
        selection: () => progressSelection(props),
        testId: () => props.testId,
        unstyled: () => props.unstyled,
    });
    return (
        <context.Provider value={{ scope }}>
            {scope.render("root", {
                element: "div",
                as: () => props.as,
                machine: () => progressRootProps(props),
                props: omit(props, "as", ...PROGRESS_ROOT_PROPS),
            })}
        </context.Provider>
    );
}

/** The bar that shows the amount done, or slides while indeterminate. Empty. */
function Indicator(props: LinearProgressPartProps): JSX.Element {
    const { scope } = context.use("Indicator");
    return scope.render("indicator", {
        element: "div",
        unstyled: () => props.unstyled,
        props: omit(props, "unstyled"),
    });
}

/** The ready-made linear progress indicator's props: Root's, with `class`, `style`, and
 *  `slotProps` keyed by part. */
export interface LinearProgressProps
    extends
        Omit<
            LinearProgressRootProps,
            keyof SlotKeyedProps<Anatomy> | "children"
        >,
        SlotKeyedProps<Anatomy> {}

/** The ready-made linear progress indicator: Root and its indicator. */
function ReadyMade(props: LinearProgressProps): JSX.Element {
    const slots = createSlotProps(props);
    const own = omit(
        props,
        "class",
        "style",
        "slotProps",
    ) as LinearProgressRootProps;
    const root = slots("root") as object;
    const indicator = slots("indicator");
    return (
        <Root {...own} {...root}>
            <Indicator {...indicator} />
        </Root>
    );
}

/** Material's linear progress indicator. Use it ready-made, `<LinearProgress value={40}
 *  aria-label="Uploading" />` (leave `value` out while the amount is unknown), or compose
 *  `LinearProgress.Root` around `LinearProgress.Indicator`. */
export const LinearProgress = Object.assign(ReadyMade, { Root, Indicator });
