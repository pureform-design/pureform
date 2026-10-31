// The keys of a part's props that the component owns, which a provider's `slotProps` can't set. What
// each key is differs by platform (the web's machine props and `data-*` attributes, React Native's
// `testID`); finding them in a source and saying so is shared.

type Dict = Readonly<Record<string, unknown>>;

/** The keys of `source` that `isOwned` names and that are set: a key whose value is `undefined`
 *  sets nothing, so it isn't dropped. */
export const ownedKeysIn = (
    source: Dict | undefined,
    isOwned: (key: string) => boolean,
): readonly string[] => {
    if (!source) return [];
    const found: string[] = [];
    for (const key of Object.keys(source)) {
        if (source[key] !== undefined && isOwned(key)) found.push(key);
    }
    return found;
};

/** The development warning for keys a component ignored: `from` is where they were set
 *  (`"the provider's slotProps"`). Pass it to `warnOnce` from a development build only. */
export const ownedKeysMessage = (
    component: string,
    part: string,
    dropped: readonly string[],
    from: string,
): string =>
    `pureform: <${component}> ${part} ignored ${dropped.map((key) => `"${key}"`).join(", ")} from ${from}: the component sets ${dropped.length === 1 ? "it" : "them"}.`;
