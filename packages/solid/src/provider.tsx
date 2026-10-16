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
import { isDev } from "@solidjs/web";
import type { JSX } from "@solidjs/web";
import {
    type Accessor,
    createContext,
    createEffect,
    createMemo,
    omit,
    useContext,
} from "solid-js";

import { mergePartProps, mergeStyles } from "./props";
import type { PartProps } from "./props";

/** What components read from the nearest provider. */
export type PureformState = ProviderState<PartProps>;

const PureformContext = createContext<Accessor<PureformState>>(
    () => ROOT_PROVIDER,
);

export interface PureformProviderProps
    extends
        ProviderOptions<PartProps>,
        Omit<JSX.HTMLAttributes<HTMLDivElement>, "dir"> {
    children?: JSX.Element;
}

const OPTIONS = [
    "registry",
    "dir",
    "motion",
    "defaults",
    "slotProps",
    "theme",
    "overrides",
    "hydrate",
] as const;

/** Provides the registry and the settings components read, over the nearest provider's. Its
 *  `theme`, `overrides`, and `hydrate` are carried but not applied yet: runtime themes are p5b. */
export function PureformProvider(props: PureformProviderProps): JSX.Element {
    const parent = useContext(PureformContext);
    const state = createMemo(() =>
        resolveProvider(
            parent(),
            {
                registry: props.registry,
                dir: props.dir,
                motion: props.motion,
                defaults: props.defaults,
                slotProps: props.slotProps,
                theme: props.theme,
                overrides: props.overrides,
                hydrate: props.hydrate,
            },
            mergePartProps,
        ),
    );
    if (isDev) {
        createEffect(
            () => props.registry,
            (registry) => {
                const message = registry && trainVersionMismatch(registry);
                if (message) warnOnce(message);
            },
        );
    }
    const rest = omit(props, ...OPTIONS, "children", "style");
    const attributes = createMemo(() =>
        providerAttributes({ motion: props.motion }, state()),
    );
    return (
        <PureformContext value={state}>
            <div
                {...rest}
                {...attributes()}
                style={mergeStyles([{ display: "contents" }, props.style])}
            >
                {props.children}
            </div>
        </PureformContext>
    );
}

/** The nearest provider's state, or the root's defaults with none. */
export const usePureform = (): Accessor<PureformState> =>
    useContext(PureformContext);

/** The nearest provider's registry. Reading it throws when no provider has one. */
export const useRegistry = (): Accessor<AnyRegistry> => {
    const state = usePureform();
    return () => requireRegistry(state());
};

/** The direction in effect: pass it to every machine as `dir`. */
export const useDirection = (): Accessor<Direction> => {
    const state = usePureform();
    return () => state().dir;
};

/** The motion setting in effect: the nearest `"reduce"` or `"full"`, else `"system"`. Most
 *  components want `useReducedMotion()` instead. */
export const useMotion = (): Accessor<MotionSetting> => {
    const state = usePureform();
    return () => state().motion;
};
