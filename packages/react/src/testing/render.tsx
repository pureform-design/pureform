// Rendering a view with React Testing Library, and waiting for React and the machines to settle.
// Interactions run inside `act`, so React applies their updates before the test reads the page.
// Also a value set from outside the view, and an error boundary for the tests that throw.

import { act, cleanup, render } from "@testing-library/react";
import { Component, type ReactNode, useState } from "react";
import { afterEach, vi } from "vitest";

afterEach(() => {
    cleanup();
    document.body.innerHTML = "";
});

/** Renders `view` into a new element in the page, unmounted after the test. */
export const mount = (view: ReactNode): HTMLElement => render(view).container;

/** Renders `view` inside an awaited `act`, for views that suspend. */
export const mountAsync = async (view: ReactNode): Promise<HTMLElement> => {
    let container!: HTMLElement;
    await act(async () => {
        container = render(view).container;
    });
    return container;
};

/** Waits a task inside `act`: microtasks (machine sends) and React's updates run first. */
export const settle = (): Promise<void> =>
    act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
    });

/** Runs a user interaction (`userEvent` from `vitest/browser`) inside `act`, then settles. */
export const interact = async (
    action: () => Promise<unknown>,
): Promise<void> => {
    await act(async () => {
        await action();
    });
    await settle();
};

/** A value the test sets from outside the view, as a Solid test would with a signal:
 *  `<value.Holder>{(v) => <Button selected={v} />}</value.Holder>`, then `await value.set(true)`. */
export const outside = <T,>(initial: T) => {
    const handle = { set: (_value: T) => {} };
    function Holder(props: { children: (value: T) => ReactNode }): ReactNode {
        const [value, setValue] = useState(initial);
        handle.set = setValue;
        return props.children(value);
    }
    return {
        Holder,
        set: (value: T): Promise<void> =>
            act(async () => {
                handle.set(value);
            }),
    };
};

/** Runs `view` with `console.error` silenced: React logs what an error boundary caught, and the
 *  tests read the boundary instead. */
export const quietly = (view: () => void): void => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
        view();
    } finally {
        error.mockRestore();
    }
};

/** An error boundary that renders the error it caught as `data-testid="error"`. */
export class Errored extends Component<
    { children: ReactNode },
    { error: unknown }
> {
    override state: { error: unknown } = { error: undefined };
    static getDerivedStateFromError(error: unknown) {
        return { error };
    }
    override render(): ReactNode {
        return this.state.error === undefined ? (
            this.props.children
        ) : (
            <p data-testid="error">{String(this.state.error)}</p>
        );
    }
}
