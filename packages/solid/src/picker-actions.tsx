// A composed component's actions (the modal date picker's and the date input's Cancel and OK, the
// stepper's Next and Previous): a `<button>`, or `as` (`as={Button}`), that runs the action on a
// click the app's own `onClick` doesn't prevent.

import { Dynamic } from "@solidjs/web";
import type { JSX, ValidComponent } from "@solidjs/web";
import { omit } from "solid-js";

/** An action's props: `as` to render a component instead of `<button>`, which takes the rest. */
export interface PickerActionProps {
    readonly as?: ValidComponent | undefined;
    readonly [prop: string]: unknown;
}

/** An action that reads `run` from Root's context, naming the part, and with `disabled`, whether
 *  it can't run now (the app's `disabled` wins). */
export const pickerAction =
    (
        display: string,
        use: (name: string) => () => void,
        disabled?: (name: string) => () => boolean,
    ) =>
    (props: PickerActionProps): JSX.Element => {
        const run = use(display);
        const off = disabled?.(display);
        const onClick = (event: MouseEvent) => {
            (props["onClick"] as ((event: MouseEvent) => void) | undefined)?.(
                event,
            );
            if (!event.defaultPrevented) run();
        };
        const rest = omit(props, "as", "onClick");
        return (
            <Dynamic
                component={props.as ?? "button"}
                type="button"
                disabled={off?.()}
                {...rest}
                onClick={onClick}
            />
        );
    };
