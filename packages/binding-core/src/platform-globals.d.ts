// The few globals every platform this package runs on has (browsers, React Native, Node), declared
// here because its tsconfig leaves the DOM lib out, so a DOM type or API fails to compile.

declare var console: { warn(...data: unknown[]): void };

declare function setTimeout(handler: () => void, timeout?: number): unknown;

declare function queueMicrotask(callback: () => void): void;
