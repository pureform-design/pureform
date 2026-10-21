// The loading indicator: a `role="progressbar"` view with no value, around a container and the
// indicator, which turns and (with an SVG engine) is drawn in Material's shapes. React Native's
// keyframes don't carry a clip shape, so the shape doesn't morph here: the indicator turns in its
// first shape with an SVG engine, and as a circle without one.

import { loadingIndicatorAnatomy } from "@pureform/anatomy";
import type { TestIdOverride } from "@pureform/anatomy";
import { loadingIndicatorSelection } from "@pureform/binding-core";
import type {
    LoadingIndicatorPart,
    LoadingIndicatorVariantProps,
} from "@pureform/binding-core";
import type { ReactNode } from "react";

import { testIdOf, withEngine } from "../parts";
import { useEngine } from "../provider";
import { useComponentSlots } from "../styles";

export interface LoadingIndicatorProps extends LoadingIndicatorVariantProps {
    readonly "aria-label"?: string | undefined;
    readonly testId?: TestIdOverride<LoadingIndicatorPart> | undefined;
}

function LoadingIndicatorImpl(props: LoadingIndicatorProps): ReactNode {
    const engine = useEngine();
    const {
        styles: s,
        selected,
        views: v,
    } = useComponentSlots<LoadingIndicatorPart>(
        "loadingIndicator",
        loadingIndicatorSelection(props) as Record<string, unknown>,
    );
    const Drawing = engine.Drawing;
    const id = (part: LoadingIndicatorPart) =>
        testIdOf(loadingIndicatorAnatomy, part, props.testId);
    return (
        <v.root.View
            role="progressbar"
            {...(props["aria-label"] === undefined
                ? {}
                : { "aria-label": props["aria-label"] })}
            style={s.root}
            testID={id("root")}
        >
            <v.container.View style={s.container} testID={id("container")}>
                <v.indicator.View style={s.indicator} testID={id("indicator")}>
                    {Drawing ? (
                        <Drawing drawing={selected.drawings.indicator} />
                    ) : null}
                </v.indicator.View>
            </v.container.View>
        </v.root.View>
    );
}

/** M3 Expressive's loading indicator: `<LoadingIndicator aria-label="Loading" />`, on a round
 *  container with `variant="contained"`. */
export const LoadingIndicator = withEngine(
    LoadingIndicatorImpl,
    "LoadingIndicator",
);
