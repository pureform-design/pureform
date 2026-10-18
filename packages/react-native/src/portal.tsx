// A portal: its children render at the nearest host, over the page, in their stacking layer, and
// keep the pureform provider they're declared under (registry, scheme, theme, overrides, motion,
// direction, indication, engine). The app's own contexts don't cross; read them outside and pass
// what the overlay needs in.

import { warnOnce } from "@pureform/binding-core";
import {
    createContext,
    useContext,
    useLayoutEffect,
    useMemo,
    useState,
} from "react";
import type { ReactNode } from "react";

import { isDev } from "./env";
import { useLayer } from "./layer";
import type { StackingLayer } from "./layer";
import { usePortalHost } from "./portal-host";
import type { PortalKey } from "./portal-host";
import { PureformScopeProvider, usePureformScope } from "./provider";

// The key of the portal around, so one opened from it sorts over it.
const ParentContext = createContext<PortalKey>([]);

export interface PortalProps {
    /** The stacking layer it draws in (`menu`, `scrim`, `dialog`, `snackbar`, `tooltip`), by
     *  the theme's z-index. Among equal layers, the later to open draws over. Default `base`. */
    readonly layer?: StackingLayer | undefined;
    readonly children?: ReactNode;
}

/**
 * Renders `children` at the nearest `PortalHost`, over the page, in `layer`. Position them
 * yourself inside the host's layer, which covers the view the host is in (the app's root, for the
 * root provider's):
 *
 * ```tsx
 * <Portal layer="menu">
 *     <View style={{ position: "absolute", top, left }}>…</View>
 * </Portal>
 * ```
 */
export function Portal(props: PortalProps): ReactNode {
    const host = usePortalHost();
    const parent = useContext(ParentContext);
    const scope = usePureformScope();
    if (!scope) {
        throw new Error(
            "pureform: a Portal needs a PureformProvider around it, which holds its host.",
        );
    }
    const layer = useLayer(props.layer ?? "base") ?? 0;
    const [id] = useState(() => host?.store.nextId() ?? 0);
    const [order] = useState(() => host?.store.nextOrder() ?? 0);
    const key = useMemo<PortalKey>(
        () => [...parent, [layer, order]],
        [parent, layer, order],
    );
    const node = (
        <ParentContext value={key}>
            <PureformScopeProvider scope={scope}>
                {props.children}
            </PureformScopeProvider>
        </ParentContext>
    );
    useLayoutEffect(() => {
        host?.store.set(id, { key, node });
    });
    useLayoutEffect(() => () => host?.store.remove(id), [host, id]);
    if (host) return null;
    if (isDev) {
        warnOnce(
            "pureform: a Portal has no PortalHost above it, so it renders in place. The root PureformProvider holds one; check that nothing renders it in another React root.",
        );
    }
    return node;
}
