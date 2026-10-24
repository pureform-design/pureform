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
import { useSelectedStyles } from "../styles";

export interface TouchTargetProps extends Omit<
    TouchTargetRootOwnProps,
    "unstyled"
> {}

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
                style={{
                    minWidth: minimum,
                    minHeight: minimum,
                    width: "100%",
                    height: "100%",
                }}
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

type SizeStyle = {
    readonly width?: unknown;
    readonly height?: unknown;
    readonly minWidth?: unknown;
    readonly minHeight?: unknown;
};

const sizeOf = (own: unknown, least: unknown, otherwise: number) =>
    typeof own === "number"
        ? own
        : typeof least === "number"
          ? least
          : otherwise;

/** The `hitSlop` that grows a pressable drawn at `root`'s size (its `width` and `height`, else
 *  its `minWidth` and `minHeight`) to its touch target's (the component's `touchTarget` slot:
 *  its minimum size, 48 when it gives none). A side with no number (a chip's width, which its
 *  label sets) gets none. The small pressables (checkbox, radio, switch, icon button, chip) take
 *  it, so their whole target takes a press on Android, where their target view outside them may
 *  be clipped. */
export const touchTargetSlopOf = (
    root: SizeStyle,
    target: SizeStyle = {},
): Insets => {
    const width = sizeOf(root.width, root.minWidth, Infinity);
    const height = sizeOf(root.height, root.minHeight, Infinity);
    const x = Math.max(
        0,
        (sizeOf(target.minWidth, target.width, 48) - width) / 2,
    );
    const y = Math.max(
        0,
        (sizeOf(target.minHeight, target.height, 48) - height) / 2,
    );
    return { top: y, bottom: y, left: x, right: x };
};
