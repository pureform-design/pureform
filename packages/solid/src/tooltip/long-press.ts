// A touch held on the trigger shows the tooltip (`tooltipLongPress`), for the plain and the rich
// tooltip's triggers.

import { tooltipLongPress } from "@pureform/binding-web";
import { onSettled } from "solid-js";

/** A ref for the trigger that shows the tooltip on a long press. */
export function useTooltipLongPress(
    setOpen: (open: boolean) => void,
    interactive: () => boolean,
): (element: HTMLElement) => void {
    let trigger: HTMLElement | undefined;
    onSettled(() => {
        if (!trigger) return;
        return tooltipLongPress(trigger, { setOpen, interactive });
    });
    return (element) => {
        trigger = element;
    };
}
