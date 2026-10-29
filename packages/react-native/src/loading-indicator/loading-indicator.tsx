// The loading indicator: a `role="progressbar"` view with no value, around a container and the
// indicator, which turns and (with an SVG engine) morphs through Material's shapes, as the web's
// keyframes do (the engine's drawing runs the keyframes' shapes). Without SVG it turns as a
// circle; under reduced motion it only turns.

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
import { useNativeSlotReader } from "../slot-props";
import type { NativeSlotProps } from "../slot-props";
import { useComponentSlots } from "../styles";

/** What each part renders as, for its keyed `style` and `slotProps`. */
export interface LoadingIndicatorHosts {
    readonly root: "View";
    readonly container: "View";
    readonly indicator: "View";
}

export interface LoadingIndicatorProps
    extends
        LoadingIndicatorVariantProps,
        NativeSlotProps<LoadingIndicatorHosts> {
    readonly "aria-label"?: string | undefined;
    readonly testId?: TestIdOverride<LoadingIndicatorPart> | undefined;
}

function LoadingIndicatorImpl(props: LoadingIndicatorProps): ReactNode {
    const nativeSlots = useNativeSlotReader("loadingIndicator");
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
    const slot = nativeSlots(props);
    return (
        <v.root.View
            {...slot.props("root")}
            role="progressbar"
            {...(props["aria-label"] === undefined
                ? {}
                : { "aria-label": props["aria-label"] })}
            style={slot.style("root", s.root)}
            testID={id("root")}
        >
            <v.container.View
                {...slot.props("container")}
                style={slot.style("container", s.container)}
                testID={id("container")}
            >
                <v.indicator.View
                    {...slot.props("indicator")}
                    style={slot.style("indicator", s.indicator)}
                    testID={id("indicator")}
                >
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
