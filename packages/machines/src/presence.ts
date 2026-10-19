// Zag's presence, re-exported so bindings take every machine from one package. It keeps an
// overlay mounted while its exit animation runs, and lets it go at once when none does. One
// change: only the exit's own animations end it. Zag's lets any `animationcancel` on the surface
// end the exit, so an overlay closed during its enter animation could vanish at once: the enter's
// cancel, sent in the frame after the exit replaced it, arrives once the exit is being tracked.

import type { Machine as AnyMachine, Params } from "@zag-js/core";
import { getEventTarget, nextTick, setStyle } from "@zag-js/dom-query";
import { machine as zagMachine } from "@zag-js/presence";
import type { Machine } from "@zag-js/presence";

export * from "@zag-js/presence";

type Schema = Machine extends AnyMachine<infer S> ? S : never;

const animationName = (styles: CSSStyleDeclaration | null) =>
    styles?.animationName || "none";

/** Zag's presence machine, whose exit ends only with an animation of the exit's own. */
export const machine: Machine = {
    ...zagMachine,
    implementations: {
        ...zagMachine.implementations,
        effects: {
            ...zagMachine.implementations!.effects,
            // Zag's `trackExitAnimation` (`@zag-js/presence` 1.46.0), with each event checked
            // against the exit's animations.
            trackExitAnimation({ context, refs, send, prop }: Params<Schema>) {
                const node = refs.get("node");
                if (!node) return;
                const exiting = (event: AnimationEvent) =>
                    getEventTarget(event) === node &&
                    !prop("present") &&
                    (context.get("unmountAnimationName") ?? "")
                        .split(",")
                        .map((name) => name.trim())
                        .includes(event.animationName);
                const onStart = (event: AnimationEvent) => {
                    const target = event.composedPath?.()[0] ?? event.target;
                    if (target === node) {
                        context.set(
                            "prevAnimationName",
                            animationName(refs.get("styles")),
                        );
                    }
                };
                const onEnd = (event: AnimationEvent) => {
                    if (
                        exiting(event) &&
                        animationName(refs.get("styles")) ===
                            context.get("unmountAnimationName")
                    ) {
                        send({ type: "UNMOUNT", src: "animationend" });
                    }
                };
                const onCancel = (event: AnimationEvent) => {
                    if (exiting(event)) {
                        send({ type: "UNMOUNT", src: "animationcancel" });
                    }
                };
                node.addEventListener("animationstart", onStart);
                node.addEventListener("animationcancel", onCancel);
                node.addEventListener("animationend", onEnd);
                const cleanupStyles = setStyle(node, {
                    animationFillMode: "forwards",
                });
                return () => {
                    node.removeEventListener("animationstart", onStart);
                    node.removeEventListener("animationcancel", onCancel);
                    node.removeEventListener("animationend", onEnd);
                    nextTick(() => cleanupStyles());
                };
            },
        },
    },
};
