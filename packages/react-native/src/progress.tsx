// The progress indicators: linear (a track and its indicator) and circular (two halves, each
// clipping an arc). Without a value they're indeterminate. The value is the instance's `value`
// token, a percentage of the way from `min` to `max`, which moves over its transition.

import {
    circularProgressAnatomy,
    linearProgressAnatomy,
} from "@pureform/anatomy";
import type { TestIdOverride } from "@pureform/anatomy";
import { progressSelection } from "@pureform/binding-core";
import type {
    CircularProgressPart,
    LinearProgressPart,
    ProgressValueProps,
    ProgressVariantProps,
} from "@pureform/binding-core";
import type { ReactNode } from "react";

import { testIdOf, withEngine } from "./parts";
import { useEngine } from "./provider";
import { useComponentSlots } from "./styles";

export interface LinearProgressProps
    extends ProgressVariantProps<"linearProgress">, ProgressValueProps {
    readonly "aria-label"?: string | undefined;
    readonly testId?: TestIdOverride<LinearProgressPart> | undefined;
}

export interface CircularProgressProps
    extends ProgressVariantProps<"circularProgress">, ProgressValueProps {
    readonly "aria-label"?: string | undefined;
    readonly testId?: TestIdOverride<CircularProgressPart> | undefined;
}

const valueProps = (
    props: ProgressValueProps & { readonly "aria-label"?: string | undefined },
) => ({
    role: "progressbar" as const,
    ...(props.value == null ? {} : { "aria-valuenow": props.value }),
    "aria-valuemin": props.min ?? 0,
    "aria-valuemax": props.max ?? 100,
    ...(props["aria-label"] === undefined
        ? {}
        : { "aria-label": props["aria-label"] }),
});

function LinearProgressImpl(props: LinearProgressProps): ReactNode {
    const engine = useEngine();
    const { styles: s } = useComponentSlots(
        "linearProgress",
        progressSelection(props) as Record<string, unknown>,
    );
    const id = (part: LinearProgressPart) =>
        testIdOf(linearProgressAnatomy, part, props.testId);
    return (
        <engine.View {...valueProps(props)} style={s.root} testID={id("root")}>
            <engine.View style={s.indicator} testID={id("indicator")} />
        </engine.View>
    );
}

/** Material's linear progress indicator: `<LinearProgress value={40} />`, indeterminate
 *  without a value. */
export const LinearProgress = withEngine(LinearProgressImpl, "LinearProgress");

function CircularProgressImpl(props: CircularProgressProps): ReactNode {
    const engine = useEngine();
    const { styles: s } = useComponentSlots(
        "circularProgress",
        progressSelection(props) as Record<string, unknown>,
    );
    const id = (part: CircularProgressPart) =>
        testIdOf(circularProgressAnatomy, part, props.testId);
    return (
        <engine.View {...valueProps(props)} style={s.root} testID={id("root")}>
            <engine.View style={s.endHalf} testID={id("endHalf")}>
                <engine.View style={s.endArc} testID={id("endArc")} />
            </engine.View>
            <engine.View style={s.startHalf} testID={id("startHalf")}>
                <engine.View style={s.startArc} testID={id("startArc")} />
            </engine.View>
        </engine.View>
    );
}

/** Material's circular progress indicator: `<CircularProgress value={40} />`, indeterminate
 *  without a value. */
export const CircularProgress = withEngine(
    CircularProgressImpl,
    "CircularProgress",
);
