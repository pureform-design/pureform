// React Native throws on a string inside a View, while React Native Web only logs it: fail the
// test the way a device would.
const error = console.error.bind(console);
console.error = (...args: unknown[]) => {
    if (
        typeof args[0] === "string" &&
        args[0].startsWith("Unexpected text node")
    )
        throw new Error(args[0]);
    error(...args);
};
