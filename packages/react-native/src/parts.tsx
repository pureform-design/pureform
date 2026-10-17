// What the components share: Pressable's interaction state as handlers, press ripples in a
// slot's color and corners, controlled and uncontrolled state, test ids, and starting a
// component over when the provider's engine changes (its hooks differ).

import { partTestId } from "@pureform/anatomy";
import type {
    ComponentAnatomy,
    PartName,
    TestIdOverride,
} from "@pureform/anatomy";
import { createControlTracker, warnOnce } from "@pureform/binding-core";
import type { ChangeDetails } from "@pureform/binding-core";
import type { Ripples } from "@pureform/rn-adapter/animated";
import type { Selected, State } from "@pureform/rn-adapter/factory";
import { pressableState } from "@pureform/rn-adapter/react";
import { createElement, useRef, useState } from "react";
import type { ComponentType, ReactNode } from "react";

import { isDev } from "./env";
import { useEngine } from "./provider";

/** Controls aren't text to select. Native text isn't selectable unless asked, but React Native
 *  Web's is, and a drag across a control would select its parts. */
export const unselectable = { userSelect: "none" } as const;

/** Pressable's handlers for a component's interaction state. */
export interface PressHandlers {
    onPressIn: () => void;
    onPressOut: () => void;
    onHoverIn: () => void;
    onHoverOut: () => void;
    onFocus: () => void;
    onBlur: () => void;
}

/** Pressable's interaction state with the component's own (`disabled`, `checked`, …), and the
 *  handlers that track it. */
export function usePress(
    own: Omit<State, "pressed" | "hover" | "focus" | "focusVisible" | "active">,
): { state: State; handlers: PressHandlers } {
    const [pressed, setPressed] = useState(false);
    const [hovered, setHovered] = useState(false);
    const [focused, setFocused] = useState(false);
    return {
        state: pressableState({ pressed, hovered, focused }, own),
        handlers: {
            onPressIn: () => setPressed(true),
            onPressOut: () => setPressed(false),
            onHoverIn: () => setHovered(true),
            onHoverOut: () => setHovered(false),
            onFocus: () => setFocused(true),
            onBlur: () => setFocused(false),
        },
    };
}

/** What a ripple takes from its component. */
export interface InkSlotOptions {
    /** The slot whose content color and corners the ripple takes, and whose drawing it clips
     *  to. Default `root`. */
    readonly slot?: string;
    /** Grow from the center, as icon buttons do. */
    readonly centered?: boolean;
    readonly disabled?: boolean;
}

/** Press ripples in a slot's content color and corners, clipped to its shape where it draws
 *  one, from the provider's engine. */
export function useInk(
    selected: Selected,
    options: InkSlotOptions = {},
): Ripples {
    const engine = useEngine();
    const slot = options.slot ?? "root";
    const own = selected.styles[slot];
    const radius = own?.borderRadius;
    return engine.useRipple({
        clip: selected.drawings[slot],
        color: String(own?.color ?? "rgb(0, 0, 0)"),
        ...(typeof radius === "number" || typeof radius === "string"
            ? { radius }
            : {}),
        ...(options.centered ? { centered: true } : {}),
        ...(options.disabled ? { disabled: true } : {}),
    });
}

/** Pressable's handlers with a ripple's added. */
export const withInk = (handlers: PressHandlers, ink: Ripples) => ({
    ...handlers,
    onPressIn: (event: { nativeEvent: { pageX: number; pageY: number } }) => {
        handlers.onPressIn();
        ink.handlers.onPressIn(event);
    },
    onPressOut: () => {
        handlers.onPressOut();
        ink.handlers.onPressOut();
    },
});

/** A component that starts over when the provider's engine changes, since each engine's hooks
 *  differ. What the app holds stays; the component's own state (a press) starts again. */
export const withEngine = <P extends object>(
    Impl: ComponentType<P>,
    displayName: string,
): ComponentType<P> => {
    const Component = (props: P): ReactNode =>
        createElement(Impl, { ...props, key: useEngine().name });
    Component.displayName = displayName;
    return Component;
};

/** A part's test id: its default (`pf-button-root`), or what `testId` sets. */
export const testIdOf = <A extends ComponentAnatomy>(
    anatomy: A,
    part: PartName<A>,
    testId: TestIdOverride<PartName<A>> | undefined,
): string => partTestId(anatomy, part, testId);

/** A piece of state a user can change, controlled by `value` when it's defined, else kept from
 *  `defaultValue`. `set` calls `onChange` with `{ [name]: next }` either way. */
export function useControllable<N extends string, T>(
    component: string,
    name: N,
    value: T | undefined,
    defaultValue: T | undefined,
    onChange: ((details: ChangeDetails<N, T>) => void) | undefined,
    fallback: T,
): [T, (next: T) => void] {
    const [own, setOwn] = useState<T | undefined>(defaultValue);
    const controlled = value !== undefined;
    const track = useRef<((controlled: boolean) => void) | null>(null);
    track.current ??= createControlTracker(
        component,
        name,
        controlled,
        warnOnce,
    );
    if (isDev) track.current(controlled);
    const current = controlled ? value : own;
    return [
        current ?? fallback,
        (next: T) => {
            if (!controlled) setOwn(next);
            onChange?.({ [name]: next } as ChangeDetails<N, T>);
        },
    ];
}
