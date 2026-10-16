// Development warnings, each given once for the page's life. The binding decides whether it's in
// development (Solid's `isDev`, React's `process.env.NODE_ENV`) and only calls these then.

const warned = new Set<string>();

/** Calls `warn` with `message` once per message for the page's life. */
export const warnOnce = (
    message: string,
    warn: (message: string) => void = console.warn,
): void => {
    if (warned.has(message)) return;
    warned.add(message);
    warn(message);
};
