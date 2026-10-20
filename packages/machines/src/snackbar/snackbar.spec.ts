import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import * as snackbar from ".";
import { run, settle } from "../testing/vanilla";
import type { MachineProps } from "../testing/vanilla";

// The pointer stays wherever an earlier spec left it, often on the page's top left corner where
// the snackbar lands, which holds its time. It waits in the viewport's far corner instead.
beforeEach(async () => {
    const corner = document.createElement("div");
    corner.style.cssText =
        "position: fixed; right: 0; bottom: 0; width: 8px; height: 8px";
    document.body.append(corner);
    await userEvent.hover(corner);
    corner.remove();
});

afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = "";
});

/** A snackbar with an action and a close button, run with `props`. */
const bar = (props: MachineProps<snackbar.Schema>) => {
    const host = document.createElement("div");
    host.innerHTML = `<div data-root><span data-text>Archived</span><button data-action>Undo</button><button data-close>Close</button></div>`;
    document.body.append(host);
    const root = host.querySelector<HTMLElement>("[data-root]")!;
    const action = host.querySelector<HTMLElement>("[data-action]")!;
    const close = host.querySelector<HTMLElement>("[data-close]")!;
    const running = run(
        snackbar.machine,
        snackbar.connect,
        { id: "bar", ...props },
        (api, spread) => {
            spread(root, api.getRootProps());
            spread(action, api.getActionProps());
            spread(close, api.getCloseProps());
        },
    );
    return { ...running, root, action, close };
};

describe("snackbar machine", () => {
    it("shows as a status, hidden while closed", async () => {
        const { api, root, stop } = bar({ defaultOpen: true });
        expect(api().open).toBe(true);
        expect(root.getAttribute("role")).toBe("status");
        expect(root.hidden).toBe(false);
        api().setOpen(false);
        await settle();
        expect(api().open).toBe(false);
        expect(root.hidden).toBe(true);
        stop();
    });

    it("closes after its duration, with the reason", async () => {
        vi.useFakeTimers();
        const onOpenChange = vi.fn();
        const { api, stop } = bar({
            defaultOpen: true,
            duration: 1000,
            onOpenChange,
        });
        vi.advanceTimersByTime(999);
        expect(api().open).toBe(true);
        vi.advanceTimersByTime(1);
        await vi.runAllTimersAsync();
        expect(api().open).toBe(false);
        expect(onOpenChange).toHaveBeenCalledExactlyOnceWith({
            open: false,
            reason: "timeout",
        });
        stop();
    });

    it("stays open with no duration", async () => {
        vi.useFakeTimers();
        const { api, stop } = bar({ defaultOpen: true, duration: null });
        await vi.advanceTimersByTimeAsync(60_000);
        expect(api().open).toBe(true);
        stop();
    });

    it("holds its time while focus is inside, and counts again from the start once it leaves", async () => {
        const onOpenChange = vi.fn();
        const { api, action, stop } = bar({
            defaultOpen: true,
            duration: 100,
            onOpenChange,
        });
        action.focus();
        await settle();
        expect(api().paused).toBe(true);
        await new Promise((resolve) => setTimeout(resolve, 150));
        expect(api().open).toBe(true);
        action.blur();
        await settle();
        expect(api().paused).toBe(false);
        await new Promise((resolve) => setTimeout(resolve, 150));
        expect(api().open).toBe(false);
        expect(onOpenChange).toHaveBeenCalledExactlyOnceWith({
            open: false,
            reason: "timeout",
        });
        stop();
    });

    it("reports the action, then closes", async () => {
        const onAction = vi.fn();
        const onOpenChange = vi.fn();
        const { api, action, stop } = bar({
            defaultOpen: true,
            onAction,
            onOpenChange,
        });
        await userEvent.click(action);
        await settle();
        expect(onAction).toHaveBeenCalledOnce();
        expect(onOpenChange).toHaveBeenCalledExactlyOnceWith({
            open: false,
            reason: "action",
        });
        expect(api().open).toBe(false);
        stop();
    });

    it("closes from the close button and Escape", async () => {
        const onOpenChange = vi.fn();
        const { api, close, stop } = bar({ defaultOpen: true, onOpenChange });
        await userEvent.click(close);
        await settle();
        expect(onOpenChange).toHaveBeenLastCalledWith({
            open: false,
            reason: "close",
        });
        expect(api().open).toBe(false);
        api().setOpen(true);
        await settle();
        close.focus();
        await userEvent.keyboard("{Escape}");
        await settle();
        expect(onOpenChange).toHaveBeenLastCalledWith({
            open: false,
            reason: "escape",
        });
        expect(api().open).toBe(false);
        stop();
    });

    it("controlled: asks, and moves only with the prop", async () => {
        const onOpenChange = vi.fn();
        const props = { open: true, onOpenChange };
        const { api, close, setProps, stop } = bar(props);
        await userEvent.click(close);
        await settle();
        expect(onOpenChange).toHaveBeenCalledExactlyOnceWith({
            open: false,
            reason: "close",
        });
        expect(api().open).toBe(true);
        setProps({ ...props, open: false });
        await settle();
        expect(api().open).toBe(false);
        expect(onOpenChange).toHaveBeenCalledOnce();
        stop();
    });
});
