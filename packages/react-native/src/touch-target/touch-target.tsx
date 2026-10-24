// The touch target: an invisible view that grows a small pressable's hit area to the theme's
// minimum (48 by default), centred on it, hidden from assistive technology. Put it first inside
// the pressable, as the web's goes first inside a positioned element: a press on it is a press on
// the pressable, since it's the pressable's child. On Android a child's touches outside its parent
// reach it only where nothing clips them; `useTouchTargetSlop` gives the same area as a
// `hitSlop` for a pressable that takes one instead.

import { touchTargetAnatomy } from "@pureform/anatomy";
import type { TouchTargetRootOwnProps } from "@pureform/binding-core";
import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import type { Insets, ViewStyle } from "react-native";

import { testIdOf } from "../parts";
import { nativeSlots } from "../slot-props";
import type { NativeSlotProps } from "../slot-props";
import { useSelectedStyles } from "../styles";

/** What each part renders as, for its keyed `style` and `slotProps`. */
export interface TouchTargetHosts {
    readonly root: "View";
}

export interface TouchTargetProps
    extends
        Omit<TouchTargetRootOwnProps, "unstyled">,
        NativeSlotProps<TouchTargetHosts> {}

// The theme's minimum target, as the preset's style gives it.
const minimumOf = (style: ViewStyle): number =>
    typeof style.minWidth === "number" ? style.minWidth : 48;

const useOwnStyle = (name: string, selection: Record<string, unknown>) => {
    const selected = useSelectedStyles(name, selection);
    return (selected.styles.root ?? selected.styles[""] ?? {}) as ViewStyle;
};

/** Grows a small pressable's hit area to the theme's minimum: `<Pressable style={{ width: 24,
 *  height: 24 }}><TouchTarget />…</Pressable>`. */
export function TouchTarget(props: TouchTargetProps): ReactNode {
    const slot = nativeSlots(props);
    const minimum = minimumOf(useOwnStyle("touchTarget", {}));
    // Centred by a layer over the parent rather than the web's percentage translate, which
    // React Native's transforms don't take everywhere: the target is the parent's size, at
    // least the minimum, its middle on the parent's.
    return (
        <View
            aria-hidden
            pointerEvents="box-none"
            style={{
                ...(StyleSheet.absoluteFill as object),
                alignItems: "center",
                justifyContent: "center",
                overflow: "visible",
            }}
        >
            <View
                {...slot.props("root")}
                style={slot.style("root", {
                    minWidth: minimum,
                    minHeight: minimum,
                    width: "100%",
                    height: "100%",
                })}
                testID={testIdOf(touchTargetAnatomy, "root", props.testId)}
            />
        </View>
    );
}

/** The `hitSlop` that grows a `width` × `height` pressable to the theme's minimum target. */
export function useTouchTargetSlop(width: number, height: number): Insets {
    const minimum = minimumOf(useOwnStyle("touchTarget", {}));
    const x = Math.max(0, (minimum - width) / 2);
    const y = Math.max(0, (minimum - height) / 2);
    return { top: y, bottom: y, left: x, right: x };
}
