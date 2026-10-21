// The `ProvidedTokens` context (component-architecture.md §5.5): token values handed to the
// components inside, by component, for code that renders without the web's cascade. A styled
// container needs none of it, since its root's custom properties inherit. A component takes
// its share as instance tokens, under its own `tokens` prop.

import { mergeProvidedTokens, providedTokensFor } from "@pureform/binding-core";
import type { ProvidedTokens as Provided } from "@pureform/binding-core";
import { createContext, useContext, useMemo } from "react";
import type { ReactNode } from "react";

const ProvidedTokensContext = createContext<Provided>({});

/** Gives the components inside token values, by component then token, over the ones an outer
 *  provider gives (the nearest wins, per token). */
export function ProvidedTokens(props: {
    tokens: Provided | undefined;
    children?: ReactNode;
}): ReactNode {
    const outer = useContext(ProvidedTokensContext);
    const merged = useMemo(
        () => mergeProvidedTokens(outer, props.tokens),
        [outer, props.tokens],
    );
    return (
        <ProvidedTokensContext.Provider value={merged}>
            {props.children}
        </ProvidedTokensContext.Provider>
    );
}

/** The token values the providers around give `component`, by token, or `undefined`. */
export function useProvidedTokens(
    component: string,
): Readonly<Record<string, string | number>> | undefined {
    return providedTokensFor(useContext(ProvidedTokensContext), component);
}
