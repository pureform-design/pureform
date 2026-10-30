import * as button from "@pureform/machines/button";
import { render } from "@solidjs/web";
import { createMachine } from "@zag-js/core";
import { createEffect, createMemo, createSignal, flush } from "solid-js";
import { afterEach, describe, expect, it, vi } from "vitest";

import { normalizeProps, useMachine } from ".";

// A machine with a count, its double kept by a watch (as Zag's select keeps its highlighted
// item from its highlighted value), and a watch on a prop.
interface CounterSchema {
    props: {
        count?: number | undefined;
        defaultCount?: number;
        step?: number;
        onCountChange?: (count: number, prev: number | undefined) => void;
        onStepChange?: (step: number | undefined) => void;
    };
    context: { count: number; double: number };
    state: "idle";
    action: string;
    event: { type: "INC" } | { type: "SET"; value: number };
}

const counter = createMachine<CounterSchema>({
    props: ({ props }) => ({ defaultCount: 0, ...props }),
    context: ({ bindable, prop }) => ({
        count: bindable<number>(() => ({
            value: prop("count"),
            defaultValue: prop("defaultCount")!,
            onChange: (count, prev) => prop("onCountChange")?.(count, prev),
        })),
        double: bindable<number>(() => ({
            defaultValue: (prop("count") ?? prop("defaultCount")!) * 2,
        })),
    }),
    initialState: () => "idle",
    watch({ track, context, prop, action }) {
        track([() => context.get("count")], () => action(["syncDouble"]));
        track([() => prop("step")], () => prop("onStepChange")?.(prop("step")));
    },
    on: {
        INC: { actions: ["increment"] },
        SET: { actions: ["set"] },
    },
    states: { idle: {} },
    implementations: {
        actions: {
            increment: ({ context }) =>
                context.set("count", (prev: number) => prev + 1),
            set: ({ context, event }) =>
                context.set("count", (event as { value: number }).value),
            syncDouble: ({ context }) =>
                context.set("double", context.get("count") * 2),
        },
    },
});

let dispose: (() => void) | undefined;
afterEach(() => {
    dispose?.();
    dispose = undefined;
    document.body.innerHTML = "";
});

const settle = async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
    flush();
};

/** Runs the counter, recording every pair of count and double a reader saw. */
const run = (props: () => CounterSchema["props"] = () => ({})) => {
    const seen: [number, number][] = [];
    let service!: ReturnType<typeof useMachine<CounterSchema>>;
    const host = document.createElement("div");
    document.body.append(host);
    dispose = render(() => {
        service = useMachine(counter, props);
        const pair = createMemo(() => {
            const next: [number, number] = [
                service.context.get("count"),
                service.context.get("double"),
            ];
            seen.push(next);
            return next;
        });
        return <p>{pair().join(" ")}</p>;
    }, host);
    flush();
    return {
        seen,
        host,
        send: (event: CounterSchema["event"]) => service.send(event),
    };
};

describe("a machine's watches", () => {
    it("does not render a disabled button again when its watch clears interaction", async () => {
        const [disabled, setDisabled] = createSignal(false);
        const seen: boolean[] = [];
        let service!: button.Service;
        const host = document.body.appendChild(document.createElement("div"));
        dispose = render(() => {
            service = useMachine(button.machine, () => ({
                id: "relay-button",
                disabled: disabled(),
            }));
            const api = createMemo(() =>
                button.connect(service, normalizeProps),
            );
            createEffect(api, (value) => {
                seen.push(value.disabled);
            });
            return <button {...api().getRootProps()}>Previous page</button>;
        }, host);
        await settle();
        service.send({ type: "CONTEXT.SET", context: { focused: true } });
        host.querySelector("button")!.dispatchEvent(
            new PointerEvent("pointermove", {
                bubbles: true,
                pointerType: "mouse",
            }),
        );
        await settle();
        seen.length = 0;
        setDisabled(true);
        await settle();
        expect(host.querySelector("button")!.disabled).toBe(true);
        expect(seen).toEqual([true]);
        setDisabled(false);
        await settle();
        expect(host.querySelector("button")!.disabled).toBe(false);
        expect(seen).toEqual([true, false]);
    });

    it("write in the same flush as the write they follow, so no reader sees one without the other", async () => {
        const { seen, host, send } = run();
        await settle();
        send({ type: "INC" });
        await settle();
        send({ type: "SET", value: 5 });
        await settle();
        expect(host.textContent).toBe("5 10");
        expect(seen).toEqual([
            [0, 0],
            [1, 2],
            [5, 10],
        ]);
    });

    it("don't run for the values they start with", async () => {
        const onStepChange = vi.fn<(step: number | undefined) => void>();
        const { seen } = run(() => ({
            defaultCount: 3,
            step: 1,
            onStepChange,
        }));
        await settle();
        expect(seen).toEqual([[3, 6]]);
        expect(onStepChange).not.toHaveBeenCalled();
    });

    it("run when a prop they read changes", async () => {
        const onStepChange = vi.fn<(step: number | undefined) => void>();
        const [step, setStep] = createSignal(1);
        // oxlint-disable-next-line solid/reactivity -- run passes it to useMachine as the machine's props
        run(() => ({ step: step(), onStepChange }));
        await settle();
        setStep(2);
        await settle();
        expect(onStepChange).toHaveBeenCalledOnce();
        expect(onStepChange).toHaveBeenCalledWith(2);
    });

    it("follow a controlled value once the prop changes", async () => {
        const [count, setCount] = createSignal(1);
        const onCountChange = vi.fn<
            (count: number, prev: number | undefined) => void
        >((next: number, _prev?: number) => setCount(next));
        // oxlint-disable-next-line solid/reactivity -- run passes it to useMachine as the machine's props
        const { host, send } = run(() => ({ count: count(), onCountChange }));
        await settle();
        expect(host.textContent).toBe("1 2");
        send({ type: "INC" });
        await settle();
        expect(onCountChange).toHaveBeenCalledOnce();
        expect(onCountChange).toHaveBeenCalledWith(2, 1);
        expect(host.textContent).toBe("2 4");
    });
});

describe("a bindable", () => {
    it("keeps its own value when uncontrolled, and reports each change once", async () => {
        const onCountChange =
            vi.fn<(count: number, prev: number | undefined) => void>();
        const { host, send } = run(() => ({ defaultCount: 1, onCountChange }));
        await settle();
        send({ type: "INC" });
        await settle();
        expect(host.textContent).toBe("2 4");
        expect(onCountChange.mock.calls).toEqual([[2, 1]]);
        send({ type: "SET", value: 2 });
        await settle();
        expect(onCountChange).toHaveBeenCalledOnce();
    });

    it("only asks to change when controlled", async () => {
        const onCountChange =
            vi.fn<(count: number, prev: number | undefined) => void>();
        const { host, send } = run(() => ({ count: 1, onCountChange }));
        await settle();
        send({ type: "INC" });
        await settle();
        expect(onCountChange.mock.calls).toEqual([[2, 1]]);
        expect(host.textContent).toBe("1 2");
    });
});

// A machine whose refs read a prop later, as the interaction emitters read their source when an
// event fires.
interface ReaderSchema {
    props: { step?: number | undefined };
    context: Record<string, never>;
    refs: { step: () => number | undefined };
    state: "idle";
    event: { type: "NONE" };
}

const reader = createMachine<ReaderSchema>({
    initialState: () => "idle",
    refs: ({ prop }) => ({ step: () => prop("step") }),
    states: { idle: {} },
});

describe("a machine's refs", () => {
    it("read the current props, untracked, even from an effect callback", async () => {
        const warn = vi.spyOn(console, "warn");
        try {
            const [step, setStep] = createSignal(1, { ownedWrite: true });
            const read: (number | undefined)[] = [];
            const host = document.body.appendChild(
                document.createElement("div"),
            );
            dispose = render(() => {
                const service = useMachine(reader, () => ({ step: step() }));
                createEffect(step, () => {
                    read.push(service.refs.get("step")());
                });
                return null;
            }, host);
            flush();
            await settle();
            setStep(2);
            flush();
            expect(read).toEqual([1, 2]);
            expect(warn).not.toHaveBeenCalled();
        } finally {
            warn.mockRestore();
        }
    });
});
