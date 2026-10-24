// The drag handle: a button holding the pill, which a sheet or a pane renders where it can be
// dragged. Name it for what a press does ("Close sheet").

import { dragHandleAnatomy } from "@pureform/anatomy";
import type { PartName, TestIdOverride } from "@pureform/anatomy";
import { dragHandleSelection } from "@pureform/binding-core";
import type { DragHandleVariantProps } from "@pureform/binding-core";
import type { ReactNode } from "react";

import { testIdOf, withEngine } from "../parts";
import { nativeSlots, withUnselectable } from "../slot-props";
import type { NativeSlotProps } from "../slot-props";
import { useComponentSlots } from "../styles";

/** The drag handle's parts: `"root" | "handle"`. */
type Part = PartName<typeof dragHandleAnatomy>;

/** What each part renders as, for its keyed `style` and `slotProps`. */
export interface DragHandleHosts {
    readonly root: "Pressable";
    readonly handle: "View";
}

export interface DragHandleProps
    extends DragHandleVariantProps, NativeSlotProps<DragHandleHosts> {
    /** Its name, for assistive technology: what a press does. */
    readonly "aria-label"?: string | undefined;
    readonly onPress?: (() => void) | undefined;
    readonly testId?: TestIdOverride<Part> | undefined;
}

function DragHandleImpl(props: DragHandleProps): ReactNode {
    const { styles: s, views: v } = useComponentSlots<Part>(
        "dragHandle",
        dragHandleSelection(props),
    );
    const id = (part: Part) => testIdOf(dragHandleAnatomy, part, props.testId);
    const slot = nativeSlots(props);
    return (
        <v.root.Pressable
            {...slot.props("root")}
            role="button"
            {...(props["aria-label"] === undefined
                ? {}
                : { "aria-label": props["aria-label"] })}
            {...(props.onPress === undefined ? {} : { onPress: props.onPress })}
            style={slot.style("root", withUnselectable(s.root))}
            testID={id("root")}
        >
            <v.handle.View
                {...slot.props("handle")}
                style={slot.style("handle", s.handle)}
                testID={id("handle")}
            />
        </v.root.Pressable>
    );
}

/** Material's drag handle: `<DragHandle aria-label="Close sheet" onPress={close} />`. */
export const DragHandle = withEngine(DragHandleImpl, "DragHandle");
