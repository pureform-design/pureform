// A touch held on the trigger shows the tooltip (`tooltipLongPress`), for the plain and the rich
// tooltip's triggers.

import { tooltipLongPress } from "@pureform/binding-core/dom";
import { useCallback, useRef } from "react";

/** A ref for the trigger that shows the tooltip on a long press. */
export function useTooltipLongPress(
    setOpen: (open: boolean) => void,
    interactive: boolean,
): (element: HTMLElement | null) => (() => void) | undefined {
    const latest = useRef({ setOpen, interactive });
    latest.current = { setOpen, interactive };
    return useCallback(
        (element: HTMLElement | null) =>
            element
                ? tooltipLongPress(element, {
                      setOpen: (open) => latest.current.setOpen(open),
                      interactive: () => latest.current.interactive,
                  })
                : undefined,
        [],
    );
}
