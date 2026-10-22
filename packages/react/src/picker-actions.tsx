// A composed component's actions (the modal date picker's and the date input's Cancel and OK, the
// stepper's Next and Previous): a `<button>`, or `as` (`as={Button}`), that runs the action on a
// click the app's own `onClick` doesn't prevent.

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

/** An action that reads `run` from Root's context, naming the part, and with `disabled`, whether
 *  it can't run now (the app's `disabled` wins). */
export const pickerAction =
    (
        display: string,
        use: (name: string) => () => void,
        disabled?: (name: string) => boolean,
    ) =>
    ({ as, onClick, ...props }: PickerActionProps): ReactNode => {
        const run = use(display);
        return createElement(as ?? "button", {
            type: "button",
            ...(disabled ? { disabled: disabled(display) } : {}),
            ...props,
            onClick: (event: MouseEvent<HTMLElement>) => {
                onClick?.(event);
                if (!event.defaultPrevented) run();
            },
        });
    };
