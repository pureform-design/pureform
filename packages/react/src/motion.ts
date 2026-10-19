// `useReducedMotion()`: whether to reduce motion, from the nearest provider's `"reduce"` or
// `"full"`, else the system's preference. The server (and hydration) reads `false` for the
// system, and the client picks the real value up after mount, which changes nothing rendered:
// JS motion only runs after an interaction.

import { resolveReducedMotion } from "@pureform/binding-core";
import {
    subscribeReducedMotion,
    systemReducedMotion,
} from "@pureform/binding-core/dom";
import { useSyncExternalStore } from "react";

import { useComponentState } from "./provider";

const subscribe = (onChange: () => void) =>
    subscribeReducedMotion(() => onChange());

const onServer = () => false;

/** Whether to reduce motion: pass it to ripples, tweens, and machines that animate. */
export function useReducedMotion(): boolean {
    const { motion } = useComponentState();
    const system = useSyncExternalStore(
        subscribe,
        systemReducedMotion,
        onServer,
    );
    return resolveReducedMotion(motion, system);
}
