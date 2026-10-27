import { testIds } from "@pureform/anatomy";
import { screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { createSnackbarQueue, SnackbarHost } from ".";
import type { SnackbarOptions } from ".";
import { PureformProvider } from "..";
import { overlaysRegistry } from "../__fixtures__/registry";
import { mount, settle } from "../testing/render";

const ids = testIds.snackbar;

const byTestId = (id: string): HTMLElement => screen.getByTestId(id);

// A pointer left on an earlier snackbar would hold this one's time: park it in a far corner.
beforeEach(async () => {
    const corner = document.createElement("div");
    corner.style.cssText =
        "position: fixed; right: 0; top: 0; width: 8px; height: 8px";
    document.body.append(corner);
    await userEvent.hover(corner);
    corner.remove();
});

afterEach(() => {
    vi.useRealTimers();
});

const host = (offset?: string) => {
    const queue = createSnackbarQueue();
    mount(
        <PureformProvider registry={overlaysRegistry()}>
            <SnackbarHost queue={queue} offset={offset} />
        </PureformProvider>,
    );
    return queue;
};

const text = () =>
    document.querySelector<HTMLElement>(`[data-testid="${ids.supportingText}"]`)
        ?.textContent ?? null;

describe("SnackbarHost", () => {
    it("shows one snackbar at a time, in order, each once the one before closes", async () => {
        const queue = host();
        queue.show({ supportingText: "first", closeLabel: "Dismiss" });
        queue.show({ supportingText: "second", closeLabel: "Dismiss" });
        await settle();
        expect(
            document.querySelectorAll(`[data-testid="${ids.root}"]`),
        ).toHaveLength(1);
        expect(text()).toBe("first");
        await userEvent.click(byTestId(ids.close));
        await vi.waitFor(() => expect(text()).toBe("second"));
        queue.dismiss();
        await vi.waitFor(() => expect(text()).toBeNull());
    });

    it("times each in turn, from when it shows", async () => {
        vi.useFakeTimers();
        const queue = host();
        const onOpenChange =
            vi.fn<NonNullable<SnackbarOptions["onOpenChange"]>>();
        queue.show({ supportingText: "first", duration: 1000, onOpenChange });
        queue.show({ supportingText: "second", duration: 2000 });
        await vi.advanceTimersByTimeAsync(10);
        expect(text()).toBe("first");
        await vi.advanceTimersByTimeAsync(990);
        expect(onOpenChange).toHaveBeenCalledWith({
            open: false,
            reason: "timeout",
        });
        await vi.advanceTimersByTimeAsync(50);
        expect(text()).toBe("second");
        await vi.advanceTimersByTimeAsync(1850);
        expect(text()).toBe("second");
        await vi.advanceTimersByTimeAsync(1000);
        expect(text()).toBeNull();
    });

    it("drops a waiting snackbar unseen, and takes the layout", async () => {
        const queue = host("80px");
        queue.show({ supportingText: "first", layout: "twoLine" });
        const second = queue.show({ supportingText: "second" });
        queue.dismiss(second);
        await settle();
        expect(byTestId(ids.root).className).toContain("twoLine");
        queue.dismiss();
        await vi.waitFor(() => expect(text()).toBeNull());
    });

    it("sits above the offset", async () => {
        host("80px");
        await settle();
        const placed = document.querySelector<HTMLElement>(
            "[style*='position: fixed']",
        );
        expect(placed?.style.bottom).toContain("80px");
    });
});
