// A dialog-like picker's actions (the modal date picker's and the date input's Cancel and OK): a
// `<button>`, or `as` (`as={Button}`), that runs the picker's action on a click the app's own
// `onClick` doesn't prevent.

import {
    createElement,
    type ElementType,
    type MouseEvent,
    type ReactNode,
} from "react";

/** An action's props: `as` to render a component instead of `<button>`, which takes the rest. */
export interface PickerActionProps {
    readonly as?: ElementType | undefined;
    readonly onClick?: ((event: MouseEvent<HTMLElement>) => void) | undefined;
    readonly [prop: string]: unknown;
}

/** An action that reads `run` from Root's context, naming the part. */
export const pickerAction =
    (display: string, use: (name: string) => () => void) =>
    ({ as, onClick, ...props }: PickerActionProps): ReactNode => {
        const run = use(display);
        return createElement(as ?? "button", {
            type: "button",
            ...props,
            onClick: (event: MouseEvent<HTMLElement>) => {
                onClick?.(event);
                if (!event.defaultPrevented) run();
            },
        });
    };
