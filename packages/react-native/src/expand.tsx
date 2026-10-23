// `Expanding`: an expanding part (the accordion's content, a tree's children, a list item's
// region, a vertical stepper's content) that grows open and shrinks shut instead of jumping, as
// the web's `height` transition (`collapseTransition`) and Compose's `AnimatedVisibility`
// (`expandVertically`, `shrinkVertically`) do. It measures its content's own height and springs
// its height between that and nothing on the theme's default spatial spring, clipping the
// content meanwhile; the layout around it follows each frame, on every platform (React Native
// Web too, where `LayoutAnimation` does nothing). At rest open it has no height of its own, so
// the content's changes lay out as usual; shut, it renders nothing. Nothing moves under reduced
// motion. It never touches a scroll position.

import { useReducedMotion, useTokens } from "@pureform/rn-adapter/react";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Animated, View } from "react-native";
import type { LayoutChangeEvent } from "react-native";

import { themeSpring } from "./presence";
import { usePureform } from "./provider";

type Phase = "open" | "closed" | "opening" | "closing";

export interface ExpandingProps {
    /** Whether the part shows. */
    readonly open: boolean;
    readonly children: ReactNode;
}

/** Shows `children` while `open`, growing open and shrinking shut on the theme's spring. */
export function Expanding(props: ExpandingProps): ReactNode {
    const tokens = useTokens();
    const reducedMotion = useReducedMotion();
    const { timeScale } = usePureform();
    const spring = reducedMotion
        ? undefined
        : themeSpring("spatialDefault", tokens, timeScale);
    const [phase, setPhase] = useState<Phase>(props.open ? "open" : "closed");
    // Read by the layout callback, which may run before the render the phase change asks for.
    const latest = useRef(phase);
    const go = (next: Phase) => {
        latest.current = next;
        setPhase(next);
    };
    const height = useRef(new Animated.Value(0)).current;
    // The content's own height, from its last layout.
    const natural = useRef(0);
    const springTo = (to: number, then: Phase) => {
        height.stopAnimation();
        Animated.spring(height, {
            toValue: to,
            stiffness: spring!.stiffness,
            damping: spring!.damping,
            mass: spring!.mass,
            overshootClamping: true,
            useNativeDriver: false,
        }).start(({ finished }) => {
            if (
                finished &&
                latest.current !== "open" &&
                latest.current !== "closed"
            )
                go(then);
        });
    };
    const first = useRef(true);
    useEffect(() => {
        if (first.current) {
            first.current = false;
            return;
        }
        const was = latest.current;
        if (!spring) return go(props.open ? "open" : "closed");
        if (props.open) {
            if (was === "open" || was === "opening") return;
            go("opening");
            // Mounted already (shutting): spring back from where it is. Otherwise the content's
            // first layout starts it.
            if (was === "closing") springTo(natural.current, "open");
            else height.setValue(0);
        } else {
            if (was === "closed" || was === "closing") return;
            if (was === "open") height.setValue(natural.current);
            go("closing");
            springTo(0, "closed");
        }
        // Only `open` starts a change; the spring is read as it starts.
    }, [props.open]);
    useEffect(() => () => height.stopAnimation(), [height]);
    const onLayout = (event: LayoutChangeEvent) => {
        const measured = event.nativeEvent.layout.height;
        if (measured === natural.current && latest.current !== "opening")
            return;
        natural.current = measured;
        if (latest.current === "opening") springTo(measured, "open");
    };
    if (phase === "closed") return null;
    const moving = phase === "opening" || phase === "closing";
    return (
        <Animated.View
            style={moving ? { height, overflow: "hidden" } : undefined}
        >
            <View collapsable={false} onLayout={onLayout}>
                {props.children}
            </View>
        </Animated.View>
    );
}
