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
import { normalizeProps } from "@zag-js/react";
import { type ReactNode, useId } from "react";

import { CheckIcon, CopyIcon } from "../glyphs";
import { IconButton } from "../icon-button";
import type { IconButtonProps } from "../icon-button";
import { useMachine } from "../machine";
import { omitProps } from "../props";

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
> &
    CopyButtonBehaviorProps &
    CopyButtonContentProps<ReactNode>;

/** An icon button that copies `value` and confirms it:
 *  `<CopyButton value={token} onCopy={() => toast("Copied")} />`. */
export function CopyButton(props: CopyButtonProps): ReactNode {
    const id = useId();
    const service = useMachine(clipboard.machine, {
        id,
        ...copyButtonMachineProps(props),
    });
    const api = clipboard.connect(service, normalizeProps);
    const { onClick, ...rest } = omitProps(props, COPY_BUTTON_OWN_PROPS);
    const trigger = api.getTriggerProps();
    return (
        <>
            <IconButton
                {...rest}
                aria-label={trigger["aria-label"] ?? COPY_LABEL}
                data-copied={api.copied ? "" : undefined}
                icon={
                    api.copied
                        ? (props.copiedIcon ?? <CheckIcon />)
                        : (props.icon ?? <CopyIcon />)
                }
                onClick={(event) => {
                    onClick?.(event);
                    if (!event.defaultPrevented) api.copy();
                }}
            />
            <span role="status" style={COPY_ANNOUNCEMENT_STYLE}>
                {copyAnnouncement(props, api.copied)}
            </span>
        </>
    );
}
