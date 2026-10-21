// The `ProvidedTokens` context (component-architecture.md §5.5): token values handed to the
// components inside, by component, for code that renders without the web's cascade. A styled
// container needs none of it, since its root's custom properties inherit. A component takes
// its share as instance tokens, under its own `tokens` prop.

import { mergeProvidedTokens, providedTokensFor } from "@pureform/binding-core";
import type { ProvidedTokens as Provided } from "@pureform/binding-core";
import type { JSX } from "@solidjs/web";
import { type Accessor, createContext, createMemo, useContext } from "solid-js";

const NONE: Accessor<Provided> = () => ({});

const ProvidedTokensContext = createContext<Accessor<Provided>>(NONE);

/** Gives the components inside token values, by component then token, over the ones an outer
 *  provider gives (the nearest wins, per token). */
export function ProvidedTokens(props: {
    tokens: Provided | undefined;
    children?: JSX.Element;
}): JSX.Element {
    const outer = useContext(ProvidedTokensContext);
    const merged = createMemo(() => mergeProvidedTokens(outer(), props.tokens));
    return (
        <ProvidedTokensContext value={merged}>
            {props.children}
        </ProvidedTokensContext>
    );
}

/** The token values the providers around give `component`, by token, or `undefined`. */
export function useProvidedTokens(
    component: string,
): Accessor<Readonly<Record<string, string | number>> | undefined> {
    const provided = useContext(ProvidedTokensContext);
    return () => providedTokensFor(provided(), component);
}
