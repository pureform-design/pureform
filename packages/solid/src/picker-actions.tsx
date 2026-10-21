// A dialog-like picker's actions (the modal date picker's and the date input's Cancel and OK): a
// `<button>`, or `as` (`as={Button}`), that runs the picker's action on a click the app's own
// `onClick` doesn't prevent.

import { Dynamic } from "@solidjs/web";
import type { JSX, ValidComponent } from "@solidjs/web";
import { omit } from "solid-js";

/** An action's props: `as` to render a component instead of `<button>`, which takes the rest. */
export interface PickerActionProps {
    readonly as?: ValidComponent | undefined;
    readonly [prop: string]: unknown;
}

/** An action that reads `run` from Root's context, naming the part. */
export const pickerAction =
    (display: string, use: (name: string) => () => void) =>
    (props: PickerActionProps): JSX.Element => {
        const run = use(display);
        const onClick = (event: MouseEvent) => {
            (props["onClick"] as ((event: MouseEvent) => void) | undefined)?.(
                event,
            );
            if (!event.defaultPrevented) run();
        };
        return (
            <Dynamic
                component={props.as ?? "button"}
                type="button"
                {...omit(props, "as", "onClick")}
                onClick={onClick}
            />
        );
    };
