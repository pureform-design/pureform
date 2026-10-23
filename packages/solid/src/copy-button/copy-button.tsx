// The copy button: the ready-made icon button, running Zag's clipboard machine beside it. A press
// copies `value`; for `timeout` ms the icon is a check and the accessible name says it copied.
// It's drawn by the `iconButton` registry entry.

import {
    COPY_BUTTON_OWN_PROPS,
    COPY_LABEL,
    copyButtonMachineProps,
} from "@pureform/binding-core";
import type {
    CopyButtonBehaviorProps,
    CopyButtonContentProps,
} from "@pureform/binding-core";
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
    return (
        <IconButton
            {...(merge(rest, {
                get "aria-label"() {
                    return api().getTriggerProps()["aria-label"] ?? COPY_LABEL;
                },
                get "data-copied"() {
                    return api().copied ? "" : undefined;
                },
                get icon() {
                    return api().copied
                        ? (props.copiedIcon ?? <CheckIcon />)
                        : (props.icon ?? <CopyIcon />);
                },
                onClick: (event: MouseEvent) => {
                    (props.onClick as ((e: MouseEvent) => void) | undefined)?.(
                        event,
                    );
                    if (!event.defaultPrevented) api().copy();
                },
            }) as IconButtonProps)}
        />
    );
}
