// Whether a value holds `window` within the depth Storybook's channel serializes (a React
// synthetic event's `view`, a DOM event's `view`, a `globalThis` prop).

export const reachesWindow = (value: unknown, depth = 6): boolean => {
    const seen = new Set<unknown>();
    const walk = (v: unknown, left: number): boolean => {
        if (v === globalThis) return true;
        if (!v || typeof v !== "object" || left === 0 || seen.has(v))
            return false;
        seen.add(v);
        // Not `Object.keys` on a node: a DOM node's own keys are few, and its tree isn't a payload.
        return Object.values(v).some((child) => walk(child, left - 1));
    };
    return walk(value, depth);
};
