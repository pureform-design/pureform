// `@pureform/react-native/reanimated`: Reanimated 4 runs transitions, keyframe animations,
// overlays' enter and exit, and the tabs' indicator slide on the UI thread, as CSS's animation
// properties.

import { useRipple } from "@pureform/rn-adapter/animated";
import {
    reanimatedPresence,
    useReanimatedComponentStyles,
    useReanimatedSlide,
} from "@pureform/rn-adapter/reanimated";
import { Pressable, TextInput } from "react-native";
import Reanimated from "react-native-reanimated";

import { pressNow } from "../engine";
import type { MotionEngine } from "../engine";

/** Reanimated on the UI thread, with no SVG. Ripples are Animated's solid discs. */
export const reanimated: MotionEngine = {
    name: "reanimated",
    svg: false,
    useStyles: useReanimatedComponentStyles,
    useRipple,
    presence: reanimatedPresence,
    useSlide: useReanimatedSlide,
    View: Reanimated.View,
    Text: Reanimated.Text,
    TextInput: Reanimated.createAnimatedComponent(TextInput),
    Pressable: pressNow(Reanimated.createAnimatedComponent(Pressable)),
};
