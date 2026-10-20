import { afterEach, describe, expect, it, vi } from "vitest";

import * as snackbar from ".";
import { run } from "../testing/vanilla";

interface Options extends snackbar.QueueOptions {
    readonly text: string;
    readonly duration?: number | null;
}

afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = "";
});

/** Runs the queue's front snackbar on the machine, as a binding does: open until it asks to close,
 *  and gone at once (no exit animation). Returns the texts shown, in order. */
const host = (queue: snackbar.Queue<Options>) => {
    const shown: string[] = [];
    let running: { stop: () => void } | undefined;
    let id: string | undefined;
    const render = () => {
        const current = queue.current();
        if (current?.id === id) {
            if (current?.closing) {
                running?.stop();
                running = undefined;
                queue.gone(current.id);
            }
            return;
        }
        running?.stop();
        id = current?.id;
        if (!current) return;
        shown.push(current.options.text);
        const item = current;
        running = run(
            snackbar.machine,
            snackbar.connect,
            {
                id: item.id,
                open: true,
                duration: item.options.duration,
                onOpenChange: ({ open, reason }) => {
                    if (!open) queue.dismiss(item.id, reason);
                },
            },
            () => {},
        );
    };
    queue.subscribe(render);
    return shown;
};

describe("snackbar queue", () => {
    it("shows one at a time, in the order they came", () => {
        const queue = snackbar.createQueue<Options>();
        const first = queue.show({ text: "first" });
        const second = queue.show({ text: "second" });
        queue.show({ text: "third" });
        expect(queue.current()?.id).toBe(first);
        expect(queue.items().map((item) => item.options.text)).toEqual([
            "first",
            "second",
            "third",
        ]);
        queue.dismiss();
        // Closing, and still in front until its exit is over.
        expect(queue.current()).toMatchObject({ id: first, closing: "close" });
        queue.gone(first);
        expect(queue.current()?.id).toBe(second);
    });

    it("lets a waiting snackbar leave unseen, and tells the shown one why it closes", () => {
        const queue = snackbar.createQueue<Options>();
        const onOpenChange = vi.fn();
        const first = queue.show({ text: "first", onOpenChange });
        const second = queue.show({ text: "second" });
        queue.dismiss(second);
        expect(queue.items().map((item) => item.id)).toEqual([first]);
        queue.dismiss(first, "action");
        queue.dismiss(first, "close");
        expect(onOpenChange).toHaveBeenCalledOnce();
        expect(onOpenChange).toHaveBeenCalledWith({
            open: false,
            reason: "action",
        });
    });

    it("clears: the shown one closes and the rest leave", () => {
        const queue = snackbar.createQueue<Options>();
        const first = queue.show({ text: "first" });
        queue.show({ text: "second" });
        queue.clear();
        expect(queue.items()).toEqual([
            expect.objectContaining({ id: first, closing: "close" }),
        ]);
    });

    it("times each in turn: the next shows only once the one before runs out", async () => {
        vi.useFakeTimers();
        const queue = snackbar.createQueue<Options>();
        const shown = host(queue);
        const onOpenChange = vi.fn();
        queue.show({ text: "first", duration: 1000, onOpenChange });
        queue.show({ text: "second", duration: 3000 });
        queue.show({ text: "third", duration: null });
        expect(shown).toEqual(["first"]);
        await vi.advanceTimersByTimeAsync(999);
        expect(shown).toEqual(["first"]);
        await vi.advanceTimersByTimeAsync(1);
        expect(onOpenChange).toHaveBeenCalledWith({
            open: false,
            reason: "timeout",
        });
        expect(shown).toEqual(["first", "second"]);
        // The second counts its own duration from when it shows.
        await vi.advanceTimersByTimeAsync(2999);
        expect(shown).toEqual(["first", "second"]);
        await vi.advanceTimersByTimeAsync(1);
        expect(shown).toEqual(["first", "second", "third"]);
        // The third stays until it's closed.
        await vi.advanceTimersByTimeAsync(60_000);
        expect(queue.current()?.options.text).toBe("third");
        queue.dismiss();
        expect(queue.items()).toEqual([]);
    });
});
