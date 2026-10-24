// The keys of a control that's checked (a checkbox, a switch, a radio) on React Native Web: Space
// checks it, as the web's native controls do, and Enter doesn't. React Native Web's pressables
// press on Enter for every role and on Space only for a button, the other way round. Elsewhere
// the platform's own accessibility actions press it, and nothing changes.

import { useRef } from "react";
import { Platform } from "react-native";

interface KeyEvent {
    readonly nativeEvent: { readonly key?: string };
    preventDefault?(): void;
}

/** The pressable's press props: `press` runs on a press and, on the web, on Space, but not for
 *  the press React Native Web makes of Enter. `onPressIn` is the pressable's own (its
 *  indication's), which these wrap. */
export const useCheckKeys = <E>(
    press: () => void,
    disabled: boolean | undefined,
    onPressIn: (event?: E) => void,
): {
    onPress: () => void;
    onPressIn: (event?: E) => void;
    onKeyDown?: (event: KeyEvent) => void;
} => {
    // Set by Enter's keydown, which comes after the press it starts (React Native Web's handler
    // runs first), and cleared by the next press's start.
    const enter = useRef(false);
    if (Platform.OS !== "web") return { onPress: press, onPressIn };
    return {
        onPressIn: (event) => {
            enter.current = false;
            onPressIn(event);
        },
        onPress: () => {
            if (!enter.current) press();
        },
        onKeyDown: (event) => {
            const key = event.nativeEvent.key;
            if (key === "Enter") enter.current = true;
            else if (key === " " && !disabled) {
                event.preventDefault?.();
                press();
            }
        },
    };
};
