// The `ProvidedTokens` context (component-architecture.md §5.5): token values a container hands
// the components inside it, by component. React Native has no cascade, so the provider also
// lays them over the style provider's overrides for its subtree: each nested component then
// resolves its own variants' tokens and its instance tokens over them, as the web does.

import {
    mergeProvidedTokens,
    providedTokenPaths,
    providedTokensFor,
} from "@pureform/binding-core";
import type { ProvidedTokens as Provided } from "@pureform/binding-core";
import { OverridesLayer } from "@pureform/rn-adapter/react";
import { createContext, createElement, useContext, useMemo } from "react";
import type { ReactNode } from "react";

const ProvidedTokensContext = createContext<Provided>({});

/** Gives the components inside token values, by component then token, over the ones an outer
 *  provider gives (the nearest wins, per token). */
export function ProvidedTokens(props: {
    tokens: Provided | undefined;
    children?: ReactNode;
}): ReactNode {
    const outer = useContext(ProvidedTokensContext);
    const key = JSON.stringify(props.tokens ?? {});
    const merged = useMemo(
        () => mergeProvidedTokens(outer, props.tokens),
        // oxlint-disable-next-line react-hooks/exhaustive-deps -- keyed by the tokens' contents, not the object's identity
        [outer, key],
    );
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- keyed by the tokens' contents, not the object's identity
    const overrides = useMemo(() => providedTokenPaths(props.tokens), [key]);
    return createElement(
        ProvidedTokensContext.Provider,
        { value: merged },
        createElement(OverridesLayer, { overrides }, props.children),
    );
}

/** The token values the providers around give `component`, by token, or `undefined`. */
export function useProvidedTokens(
    component: string,
): Readonly<Record<string, string | number>> | undefined {
    return providedTokensFor(useContext(ProvidedTokensContext), component);
}
