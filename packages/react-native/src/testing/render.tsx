// Rendering a view through React Native Web with React Testing Library, and waiting for React to
// settle. Interactions run inside `act`, so React applies their updates before the test reads
// the page.

import { act, cleanup, render } from "@testing-library/react";
import { useState } from "react";
import type { ReactNode } from "react";
import { afterEach, vi } from "vitest";

afterEach(() => {
    cleanup();
    document.body.innerHTML = "";
});

/** Renders `view` inside an awaited `act`, so a view that suspends resolves. */
export const mount = async (view: ReactNode): Promise<HTMLElement> => {
    let container!: HTMLElement;
    await act(async () => {
        container = render(view).container;
    });
    return container;
};

/** Waits a task inside `act`. */
export const settle = (ms = 0): Promise<void> =>
    act(async () => {
        await new Promise((resolve) => setTimeout(resolve, ms));
    });

/** Waits, a task at a time, until `check` passes: as long as a loaded machine takes, where a
 *  user event alone can take seconds to come back. */
export const until = (check: () => void, timeout = 10_000): Promise<void> =>
    vi.waitFor(
        async () => {
            await settle();
            check();
        },
        { timeout, interval: 10 },
    );

/** Runs a user interaction inside `act`, then settles. */
export const interact = async (
    action: () => Promise<unknown> | void,
): Promise<void> => {
    await act(async () => {
        await action();
    });
    await settle();
};

/** A value the test sets from outside the view: `<value.Holder>{(v) => …}</value.Holder>`,
 *  then `await value.set(next)`. */
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

/** An element by test id. */
export const byTestId = (id: string): HTMLElement => {
    const found = document.querySelector<HTMLElement>(`[data-testid="${id}"]`);
    if (!found) throw new Error(`no element with test id "${id}"`);
    return found;
};

/** An element's computed style. */
export const computed = (id: string): CSSStyleDeclaration =>
    getComputedStyle(byTestId(id));
