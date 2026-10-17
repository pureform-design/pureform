// `PureformProvider`: the registry, direction, motion, defaults, and slot props for everything
// under it. It writes `dir` and `data-pf-motion` on its own element (`display: contents`), so the
// CSS and the browser agree with what components read from it.

import {
    providerAttributes,
    requireRegistry,
    resolveProvider,
    ROOT_PROVIDER,
    trainVersionMismatch,
    warnOnce,
} from "@pureform/binding-core";
import type {
    AnyRegistry,
    Direction,
    MotionSetting,
    ProviderOptions,
    ProviderState,
} from "@pureform/binding-core";
import {
    createContext,
    type HTMLAttributes,
    type ReactNode,
    type Ref,
    useContext,
    useEffect,
    useMemo,
} from "react";

import { isDev } from "./env";
import { mergePartProps } from "./props";
import type { PartProps } from "./props";

/** What components read from the nearest provider. */
export type PureformState = ProviderState<PartProps>;

const PureformContext = createContext<PureformState>(ROOT_PROVIDER);

export interface PureformProviderProps
    extends
        ProviderOptions<PartProps>,
        Omit<HTMLAttributes<HTMLDivElement>, "dir"> {
    children?: ReactNode;
    ref?: Ref<HTMLDivElement> | undefined;
}

/** Provides the registry and the settings components read, over the nearest provider's. A
 *  `theme` names one of the config's themes, scoped by the target's attribute on the provider's
 *  element; `overrides` and `hydrate` are carried but not applied yet: runtime themes are p5b.
 *  Object options (`defaults`, `slotProps`, `overrides`) are compared by identity: keep them
 *  stable (module constants or `useMemo`) so components under it don't re-render needlessly. */
export function PureformProvider({
    registry,
    dir,
    motion,
    defaults,
    slotProps,
    theme,
    overrides,
    hydrate,
    style,
    children,
    ...rest
}: PureformProviderProps): ReactNode {
    const parent = useContext(PureformContext);
    const state = useMemo(
        () =>
            resolveProvider(
                parent,
                {
                    registry,
                    dir,
                    motion,
                    defaults,
                    slotProps,
                    theme,
                    overrides,
                    hydrate,
                },
                mergePartProps,
            ),
        [
            parent,
            registry,
            dir,
            motion,
            defaults,
            slotProps,
            theme,
            overrides,
            hydrate,
        ],
    );
    useEffect(() => {
        if (!isDev || !registry) return;
        const message = trainVersionMismatch(registry);
        if (message) warnOnce(message);
    }, [registry]);
    return (
        <PureformContext value={state}>
            <div
                {...rest}
                {...providerAttributes({ motion, theme }, state)}
                style={{ display: "contents", ...style }}
            >
                {children}
            </div>
        </PureformContext>
    );
}

/** The nearest provider's state, or the root's defaults with none. */
export const usePureform = (): PureformState => useContext(PureformContext);

/** The nearest provider's registry. Throws when no provider has one. */
export const useRegistry = (): AnyRegistry => requireRegistry(usePureform());

/** The direction in effect: pass it to every machine as `dir`. */
export const useDirection = (): Direction => usePureform().dir;

/** The motion setting in effect: the nearest `"reduce"` or `"full"`, else `"system"`. Most
 *  components want `useReducedMotion()` instead. */
export const useMotion = (): MotionSetting => usePureform().motion;
