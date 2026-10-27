// The copy button: the ready-made icon button, running Zag's clipboard machine beside it. A press
// copies `value`; once written, for `timeout` ms the icon is a check, the accessible name says it
// copied, and a hidden live region beside the button announces it. A denied write calls
// `onCopyError` instead. It's drawn by the `iconButton` registry entry.

import {
    COPY_BUTTON_OWN_PROPS,
    COPY_LABEL,
    copyAnnouncement,
} from "@pureform/binding-core";
import type {
    CopyButtonBehaviorProps,
    CopyButtonContentProps,
} from "@pureform/binding-core";
import {
    COPY_ANNOUNCEMENT_STYLE,
    copyButtonMachineProps,
} from "@pureform/binding-web";
import * as clipboard from "@pureform/machines/clipboard";
import type { JSX } from "@solidjs/web";
import { createMemo, createUniqueId, merge, omit } from "solid-js";

import { CheckIcon, CopyIcon } from "../glyphs";
import { IconButton } from "../icon-button";
import type { IconButtonProps } from "../icon-button";
import { normalizeProps, useMachine } from "../internal/zag";

/** The copy button's props: the icon button's, except what a copy button sets itself (the name,
 *  the icon, the toggle and its group `position`), with the value to copy and the icons. */
export type CopyButtonProps = Omit<
    IconButtonProps,
    | "icon"
    | "aria-label"
    | "aria-labelledby"
    | "selected"
    | "defaultSelected"
    | "onSelectedChange"
    | "toggle"
    | "position"
    // The behavior's `onCopy` (the copied value) replaces the DOM's clipboard event handler.
    | "onCopy"
> &
    CopyButtonBehaviorProps &
    CopyButtonContentProps<JSX.Element>;

/** An icon button that copies `value` and confirms it:
 *  `<CopyButton value={token} onCopy={() => toast("Copied")} />`. */
export function CopyButton(props: CopyButtonProps): JSX.Element {
    const id = createUniqueId();
    const service = useMachine(clipboard.machine, () => ({
        id,
        ...copyButtonMachineProps(props),
    }));
    const api = createMemo(() => clipboard.connect(service, normalizeProps));
    const rest = omit(props, ...COPY_BUTTON_OWN_PROPS, "onClick");
    const button = merge(rest, {
        get "aria-label"() {
            return api().getTriggerProps()["aria-label"] ?? COPY_LABEL;
        },
        get "data-copied"() {
            return api().copied ? "" : undefined;
        },
        get icon() {
            // oxlint-disable-next-line solid/components-return-once -- a live props getter the part reads, not a component body
            return api().copied
                ? (props.copiedIcon ?? <CheckIcon />)
                : (props.icon ?? <CopyIcon />);
        },
        onClick: (event: MouseEvent) => {
            (props.onClick as ((e: MouseEvent) => void) | undefined)?.(event);
            if (!event.defaultPrevented) api().copy();
        },
    }) as IconButtonProps;
    return (
        <>
            <IconButton {...button} />
            {/* oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- a visually hidden live region; <output> would join an enclosing form's elements */}
            <span role="status" style={COPY_ANNOUNCEMENT_STYLE}>
                {copyAnnouncement(props, api().copied)}
            </span>
        </>
    );
}
