// Rendering a view through React Native Web with React Testing Library, and waiting for React to
// settle. Interactions run inside `act`, so React applies their updates before the test reads
// the page.

import { act, cleanup, render } from "@testing-library/react";
import { useState } from "react";
import type { ReactNode } from "react";
import { afterEach, vi } from "vitest";
import { userEvent } from "vitest/browser";

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

/** Waits until React Native Web has reported `element`'s layout to its `onLayout`: its resize
 *  observer reports on the next rendering frame, and its measure answers a task later. A test
 *  that reads what a view measures (a sheet's height) waits for this rather than for time, which
 *  a loaded machine stretches. */
export const laidOut = async (element: Element): Promise<void> => {
    await act(
        () =>
            new Promise<void>((resolve) => {
                const observer = new ResizeObserver(() => {
                    observer.disconnect();
                    resolve();
                });
                observer.observe(element);
            }),
    );
    await settle();
};

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

/** Moves the pointer to the page's corner, away from where a test renders: an earlier test's
 *  click leaves it there, and a component showing under it would hear it hover. */
export const pointerAway = async (): Promise<void> => {
    const corner = document.body.appendChild(document.createElement("div"));
    corner.style.cssText =
        "position: fixed; right: 0; bottom: 0; width: 4px; height: 4px";
    await userEvent.hover(corner);
    corner.remove();
};

/** Runs a user interaction inside `act`, then settles. */
export const interact = async (
    action: () => Promise<unknown> | void,
): Promise<void> => {
    await act(async () => {
        await action();
    });
    await settle();
};

/** Drags `element` with the mouse: presses at `from` (from its top left; its center by default),
 *  moves by each `[dx, dy]` in a task of its own, as a pointer's moves arrive, so React Native
 *  Web's responder and the drag see each one, and returns what releases it at the last. */
export const drag = async (
    element: HTMLElement,
    moves: readonly (readonly [dx: number, dy: number])[],
    from?: { readonly x: number; readonly y: number },
): Promise<() => Promise<void>> => {
    const box = element.getBoundingClientRect();
    const x = box.left + (from?.x ?? box.width / 2);
    const y = box.top + (from?.y ?? box.height / 2);
    const at = ([dx, dy]: readonly [number, number]) => ({
        bubbles: true,
        button: 0,
        buttons: 1,
        clientX: x + dx,
        clientY: y + dy,
    });
    await interact(() => {
        element.dispatchEvent(new MouseEvent("mousedown", at([0, 0])));
    });
    for (const move of moves) {
        await interact(() => {
            element.dispatchEvent(new MouseEvent("mousemove", at(move)));
        });
    }
    return () =>
        interact(() => {
            element.dispatchEvent(
                new MouseEvent("mouseup", at(moves.at(-1) ?? [0, 0])),
            );
        });
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
