// `useExpandMotion()`: what an expanding part (the accordion's content, a tree's children, a list
// item's region, a vertical stepper's content) calls just before it shows or hides, so the layout
// around it grows open and shrinks shut instead of jumping, as Compose's `AnimatedVisibility`
// expands and shrinks (`expandVertically`, `shrinkVertically`). React Native mounts the part while
// it shows, so its size has no style to transition: the next layout change runs on
// `LayoutAnimation`, timed from the theme's default spatial spring (the web's `height` transition,
// `collapseTransition`). Nothing moves under reduced motion. It never touches a scroll position.

import { settleTime } from "@pureform/core";
import { useReducedMotion, useTokens } from "@pureform/rn-adapter/react";
import { useCallback } from "react";
import { LayoutAnimation } from "react-native";

import { themeSpring } from "./presence";
import { usePureform } from "./provider";

/** Calls `LayoutAnimation.configureNext` on the theme's `spatialDefault` spring; call it just
 *  before the state change that shows or hides the part. */
export function useExpandMotion(): () => void {
    const tokens = useTokens();
    const reducedMotion = useReducedMotion();
    const { timeScale } = usePureform();
    return useCallback(() => {
        if (reducedMotion) return;
        const spring = themeSpring("spatialDefault", tokens, timeScale);
        if (!spring) return;
        // The theme gives the damping coefficient; LayoutAnimation takes the ratio.
        const ratio =
            spring.damping / (2 * Math.sqrt(spring.stiffness * spring.mass));
        const duration = Math.round(
            settleTime({ ...spring, damping: ratio }) * 1000,
        );
        if (!(duration > 0)) return;
        LayoutAnimation.configureNext({
            duration,
            create: { type: "easeInEaseOut", property: "opacity" },
            update: { type: "spring", springDamping: Math.min(ratio, 1) },
            delete: { type: "easeInEaseOut", property: "opacity" },
        });
    }, [reducedMotion, tokens, timeScale]);
}
