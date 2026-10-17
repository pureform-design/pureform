// `@pureform/react-native/reanimated-svg`: Reanimated 4 on the UI thread, drawing with
// react-native-svg, whose shapes morph and ripples grow on the UI thread too.

import {
    ReanimatedSvgDrawing,
    useReanimatedSvgRipple,
} from "@pureform/rn-adapter/reanimated-svg";

import type { MotionEngine } from "../engine";
import { reanimated } from "./reanimated";

/** Reanimated, with react-native-svg drawing shapes and gradients. */
export const reanimatedSvg: MotionEngine = {
    ...reanimated,
    name: "reanimated-svg",
    svg: true,
    useRipple: useReanimatedSvgRipple,
    Drawing: ReanimatedSvgDrawing,
};
