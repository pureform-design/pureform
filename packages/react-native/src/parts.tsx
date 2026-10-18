// What the components share: controlled and uncontrolled state, test ids, starting a component
// over when the provider's engine changes (its hooks differ), and what keeps a composite's rows
// from rendering again with it: a stable callback and a selection kept while it selects the same.

import { partTestId } from "@pureform/anatomy";
import type {
    ComponentAnatomy,
    PartName,
    TestIdOverride,
} from "@pureform/anatomy";
import {
    createControlTracker,
    selectionSignature,
    warnOnce,
} from "@pureform/binding-core";
import type { ChangeDetails } from "@pureform/binding-core";
import {
    createElement,
    useCallback,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import type { ComponentType, ReactNode } from "react";

import { isDev } from "./env";
import { useEngine } from "./provider";

/** Controls aren't text to select. Native text isn't selectable unless asked, but React Native
 *  Web's is, and a drag across a control would select its parts. */
export const unselectable = { userSelect: "none" } as const;

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

/** A function that stays the same across renders and calls the latest `callback`, for a row that
 *  shouldn't render again when its parent does. Call it from handlers, not while rendering. */
export function useStableCallback<A extends unknown[], R>(
    callback: (...args: A) => R,
): (...args: A) => R {
    const latest = useRef(callback);
    useLayoutEffect(() => {
        latest.current = callback;
    });
    return useCallback((...args: A) => latest.current(...args), []);
}

/** `selection`, or the one from an earlier render while it selects the same (variants and tokens
 *  compared by value), so rows given it can skip rendering. */
export function useStableSelection<S extends object>(selection: S): S {
    return useMemo(() => selection, [selectionSignature(selection)]);
}
