// Rendering a view with React Testing Library, and waiting for React and the machines to settle.
// Interactions run inside `act`, so React applies their updates before the test reads the page.

import { act, cleanup, render } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach } from "vitest";

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
