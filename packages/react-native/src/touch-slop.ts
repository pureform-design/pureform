// The hit slop that grows a small pressable to its touch target, from its styles alone (no
// registry entry of its own), for the components that draw a `touchTarget` slot.

import type { Insets } from "react-native";

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
