// Provided tokens (component-architecture.md §5.5): the values a container gives the components
// inside it, such as a vibrant toolbar's icon button accent. On the web the container's root
// sets them as inherited custom properties; elsewhere each binding hands them down through its
// `ProvidedTokens` context, built on these rules, and a nested component takes its own share.

/** Token values a container provides, by component, then token: `{ iconButton: { accent } }`.
 *  Values are finished: resolved where the container is. */
export type ProvidedTokens = Readonly<
    Record<string, Readonly<Record<string, string | number>>>
>;

const NONE: ProvidedTokens = {};

/** Provided tokens from values keyed by path (`components.iconButton.accent`), as React
 *  Native's selection returns them. */
export const providedTokensFromPaths = (
    values: Readonly<Record<string, unknown>> | undefined,
): ProvidedTokens => {
    const out: Record<string, Record<string, string | number>> = {};
    for (const [path, value] of Object.entries(values ?? {})) {
        const [root, component, ...token] = path.split(".");
        if (root !== "components" || !component || token.length === 0) continue;
        if (typeof value !== "string" && typeof value !== "number") continue;
        (out[component] ??= {})[token.join(".")] = value;
    }
    return Object.keys(out).length > 0 ? out : NONE;
};

/** Provided tokens keyed by path (`components.iconButton.accent`), as React Native's overrides
 *  take them. */
export const providedTokenPaths = (
    provided: ProvidedTokens | undefined,
): Record<string, string | number> => {
    const out: Record<string, string | number> = {};
    for (const [component, tokens] of Object.entries(provided ?? {})) {
        for (const [token, value] of Object.entries(tokens)) {
            out[`components.${component}.${token}`] = value;
        }
    }
    return out;
};

/** The tokens a provider inside another gives: the outer one's, with the inner one's over
 *  them, per token, so the nearest provider wins. Returns `outer` itself when `inner` adds
 *  nothing. */
export const mergeProvidedTokens = (
    outer: ProvidedTokens,
    inner: ProvidedTokens | undefined,
): ProvidedTokens => {
    if (!inner || Object.keys(inner).length === 0) return outer;
    if (Object.keys(outer).length === 0) return inner;
    const out: Record<string, Readonly<Record<string, string | number>>> = {
        ...outer,
    };
    for (const [component, tokens] of Object.entries(inner)) {
        out[component] = { ...outer[component], ...tokens };
    }
    return out;
};

/** One component's share of the provided tokens, by token name, or `undefined` when none. */
export const providedTokensFor = (
    provided: ProvidedTokens,
    component: string,
): Readonly<Record<string, string | number>> | undefined => {
    const own = provided[component];
    return own && Object.keys(own).length > 0 ? own : undefined;
};

/** A selection with provided tokens under its own instance tokens, which win. Returns the
 *  selection itself when nothing is provided. */
export const withProvidedTokens = <S extends object>(
    selection: S,
    provided: Readonly<Record<string, string | number>> | undefined,
): S =>
    provided
        ? ({
              ...selection,
              tokens: {
                  ...provided,
                  ...(selection as { tokens?: object }).tokens,
              },
          } as S)
        : selection;
