// `@pureform/react-native/svg`: React Native's Animated, drawing shapes, gradients, and soft-edged
// ripples with react-native-svg.

import { SvgDrawing, useSvgRipple } from "@pureform/rn-adapter/svg";

import { animated } from "../engine";
import type { MotionEngine } from "../engine";

/** React Native's Animated, with react-native-svg drawing shapes and gradients: shapes morph
 *  and ripples clip to them. */
export const animatedSvg: MotionEngine = {
    ...animated,
    name: "animated-svg",
    svg: true,
    useRipple: useSvgRipple,
    Drawing: SvgDrawing,
};
