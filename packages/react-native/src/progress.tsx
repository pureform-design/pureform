// The progress indicators: linear (a track, its indicator and a stop dot) and circular (a track,
// then two halves, each clipping an arc). Without a value they're indeterminate. The value is the instance's `value`
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
    ProgressReadyMadeProps,
    ProgressValueProps,
    ProgressVariantProps,
} from "@pureform/binding-core";
import type { ReactNode } from "react";

import { testIdOf, withEngine } from "./parts";
import { useEngine } from "./provider";
import { useComponentSlots } from "./styles";

export interface LinearProgressProps
    extends
        ProgressVariantProps<"linearProgress">,
        ProgressValueProps,
        ProgressReadyMadeProps {
    readonly "aria-label"?: string | undefined;
    readonly testId?: TestIdOverride<LinearProgressPart> | undefined;
}

export interface CircularProgressProps
    extends
        ProgressVariantProps<"circularProgress">,
        ProgressValueProps,
        ProgressReadyMadeProps {
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
    const {
        styles: s,
        selected,
        views: v,
    } = useComponentSlots<LinearProgressPart>(
        "linearProgress",
        progressSelection(props) as Record<string, unknown>,
    );
    const id = (part: LinearProgressPart) =>
        testIdOf(linearProgressAnatomy, part, props.testId);
    return (
        <v.root.View {...valueProps(props)} style={s.root} testID={id("root")}>
            {props.track === false ? null : (
                <v.track.View style={s.track} testID={id("track")} />
            )}
            <v.indicator.View style={s.indicator} testID={id("indicator")}>
                {/* A wavy indicator is drawn in its wave with an SVG engine. */}
                {engine.Drawing ? (
                    <engine.Drawing drawing={selected.drawings.indicator} />
                ) : null}
            </v.indicator.View>
            <v.stopIndicator.View
                style={s.stopIndicator}
                testID={id("stopIndicator")}
            />
        </v.root.View>
    );
}

/** Material's linear progress indicator: `<LinearProgress value={40} />`, indeterminate
 *  without a value. */
export const LinearProgress = withEngine(LinearProgressImpl, "LinearProgress");

function CircularProgressImpl(props: CircularProgressProps): ReactNode {
    const { styles: s, views: v } = useComponentSlots<CircularProgressPart>(
        "circularProgress",
        progressSelection(props) as Record<string, unknown>,
    );
    const id = (part: CircularProgressPart) =>
        testIdOf(circularProgressAnatomy, part, props.testId);
    return (
        <v.root.View {...valueProps(props)} style={s.root} testID={id("root")}>
            {props.track === false ? null : (
                <v.track.View style={s.track} testID={id("track")}>
                    <v.trackEndHalf.View
                        style={s.trackEndHalf}
                        testID={id("trackEndHalf")}
                    >
                        <v.trackEndArc.View
                            style={s.trackEndArc}
                            testID={id("trackEndArc")}
                        />
                    </v.trackEndHalf.View>
                    <v.trackStartHalf.View
                        style={s.trackStartHalf}
                        testID={id("trackStartHalf")}
                    >
                        <v.trackStartArc.View
                            style={s.trackStartArc}
                            testID={id("trackStartArc")}
                        />
                    </v.trackStartHalf.View>
                </v.track.View>
            )}
            <v.endHalf.View style={s.endHalf} testID={id("endHalf")}>
                <v.endArc.View style={s.endArc} testID={id("endArc")} />
            </v.endHalf.View>
            <v.startHalf.View style={s.startHalf} testID={id("startHalf")}>
                <v.startArc.View style={s.startArc} testID={id("startArc")} />
            </v.startHalf.View>
        </v.root.View>
    );
}

/** Material's circular progress indicator: `<CircularProgress value={40} />`, indeterminate
 *  without a value. */
export const CircularProgress = withEngine(
    CircularProgressImpl,
    "CircularProgress",
);
