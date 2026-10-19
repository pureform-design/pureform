// Mounting a view in the test page, and waiting for Solid and the machines to settle.

import { render } from "@solidjs/web";
import { flush } from "solid-js";
import { afterEach, vi } from "vitest";

let disposers: (() => void)[] = [];

afterEach(() => {
    for (const dispose of disposers) dispose();
    disposers = [];
    document.body.innerHTML = "";
});

/** Renders `view` into a new element in the page, disposed after the test. */
export const mount = (view: () => unknown): HTMLElement => {
    const host = document.createElement("div");
    document.body.append(host);
    disposers.push(render(view as never, host));
    flush();
    return host;
};

/** Waits a task: microtasks (machine sends) and Solid's updates run first. */
export const settle = async (): Promise<void> => {
    await new Promise((resolve) => setTimeout(resolve, 0));
    flush();
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

/** The element with this test id. */
export const byTestId = <E extends HTMLElement = HTMLElement>(
    id: string,
): E => {
    const element = document.querySelector<E>(`[data-testid="${id}"]`);
    if (!element) throw new Error(`no element with data-testid="${id}"`);
    return element;
};
