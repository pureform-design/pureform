import { createMachine } from "@zag-js/core";

import type { SnackbarSchema } from "./snackbar.types";

// What an open snackbar does, held or not.
const whileOpen = () => ({
    CLOSE: [
        { guard: "isOpenControlled", actions: ["invokeOnClose"] },
        { target: "closed" as const, actions: ["invokeOnClose"] },
    ],
    ACTION: { actions: ["invokeOnAction"] },
    "CONTROLLED.CLOSE": { target: "closed" as const },
});

export const machine = createMachine<SnackbarSchema>({
    props({ props }) {
        return {
            ...props,
            defaultOpen: props.defaultOpen ?? false,
            duration: props.duration === undefined ? 5000 : props.duration,
        };
    },

    initialState({ prop }) {
        return (prop("open") ?? prop("defaultOpen")) ? "open" : "closed";
    },

    context({ bindable }) {
        return {
            pointerInside: bindable<boolean>(() => ({ defaultValue: false })),
            focusInside: bindable<boolean>(() => ({ defaultValue: false })),
        };
    },

    watch({ track, action, prop }) {
        track([() => prop("open")], () => {
            action(["toggleVisibility"]);
        });
    },

    states: {
        closed: {
            entry: ["clearHold"],
            on: {
                OPEN: [
                    { guard: "isOpenControlled", actions: ["invokeOnOpen"] },
                    { target: "open", actions: ["invokeOnOpen"] },
                ],
                "CONTROLLED.OPEN": { target: "open" },
            },
        },
        // Open, counting down its duration.
        open: {
            tags: ["open"],
            effects: ["waitForDuration"],
            on: {
                ...whileOpen(),
                PAUSE: { target: "paused", actions: ["setHold"] },
                RESUME: { actions: ["setHold"] },
            },
        },
        // Open, held by the pointer or focus: the countdown starts again once both leave.
        paused: {
            tags: ["open"],
            on: {
                ...whileOpen(),
                PAUSE: { actions: ["setHold"] },
                RESUME: [
                    {
                        guard: "isLastHold",
                        target: "open",
                        actions: ["setHold"],
                    },
                    { actions: ["setHold"] },
                ],
            },
        },
    },

    implementations: {
        guards: {
            isOpenControlled: ({ prop }) => prop("open") !== undefined,
            // The event releases the only thing still holding it.
            isLastHold: ({ context, event }) => {
                if (event.type !== "RESUME") return false;
                const other =
                    event.source === "pointer"
                        ? "focusInside"
                        : "pointerInside";
                return !context.get(other);
            },
        },

        effects: {
            waitForDuration({ prop, send }) {
                const duration = prop("duration");
                if (duration == null || !Number.isFinite(duration)) return;
                const timer = setTimeout(
                    () => send({ type: "CLOSE", reason: "timeout" }),
                    duration,
                );
                return () => clearTimeout(timer);
            },
        },

        actions: {
            invokeOnOpen({ prop, event }) {
                const reason = event.type === "OPEN" ? event.reason : undefined;
                prop("onOpenChange")?.({
                    open: true,
                    reason: reason ?? "open",
                });
            },
            invokeOnClose({ prop, event }) {
                const reason = event.type === "CLOSE" ? event.reason : "close";
                prop("onOpenChange")?.({ open: false, reason });
            },
            invokeOnAction({ prop, send }) {
                prop("onAction")?.();
                send({ type: "CLOSE", reason: "action" });
            },
            toggleVisibility({ prop, send }) {
                send({
                    type: prop("open") ? "CONTROLLED.OPEN" : "CONTROLLED.CLOSE",
                });
            },
            setHold({ context, event }) {
                if (event.type !== "PAUSE" && event.type !== "RESUME") return;
                const held = event.type === "PAUSE";
                context.set(
                    event.source === "pointer"
                        ? "pointerInside"
                        : "focusInside",
                    held,
                );
            },
            clearHold({ context }) {
                context.set("pointerInside", false);
                context.set("focusInside", false);
            },
        },
    },
});
