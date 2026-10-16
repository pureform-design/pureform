import { describe, expect, it } from "vitest";

import {
    GENERATED_MARK,
    hashOf,
    headerHash,
    isGenerated,
    stableStringify,
    withHeader,
} from "./hash";

describe("stableStringify", () => {
    it("sorts keys and drops undefined properties", () => {
        expect(
            stableStringify({ b: 1, a: { d: undefined, c: [2, undefined] } }),
        ).toBe('{"a":{"c":[2,null]},"b":1}');
    });

    it("keeps functions as their source", () => {
        expect(stableStringify({ f: (x: number) => x + 1 })).toContain("x + 1");
    });

    it("marks a cycle rather than following it, and allows shared values", () => {
        const shared = { x: 1 };
        const value: Record<string, unknown> = { a: shared, b: shared };
        value.self = value;
        expect(stableStringify(value)).toBe(
            '{"a":{"x":1},"b":{"x":1},"self":{"$cycle":true}}',
        );
    });
});

describe("hashOf", () => {
    it("is the same for equal values in any key order, and differs otherwise", () => {
        expect(hashOf({ a: 1, b: 2 })).toBe(hashOf({ b: 2, a: 1 }));
        expect(hashOf({ a: 1 })).not.toBe(hashOf({ a: 2 }));
        expect(hashOf({})).toMatch(/^[0-9a-f]{16}$/);
    });
});

describe("headers", () => {
    it("writes line comments, and block comments for CSS", () => {
        const ts = withHeader("web/button.ts", "export {};\n", "abc123");
        expect(ts).toBe(
            `// ${GENERATED_MARK}\n// pureform-hash: abc123\n\nexport {};\n`,
        );
        const css = withHeader("pureform.css", ".a {}\n", "abc123");
        expect(
            css.startsWith(
                `/* ${GENERATED_MARK} */\n/* pureform-hash: abc123 */`,
            ),
        ).toBe(true);
        expect(headerHash(ts)).toBe("abc123");
        expect(headerHash(css)).toBe("abc123");
    });

    it("tells generated files from the app's", () => {
        expect(isGenerated("// pureform-hash: abc\nexport {};")).toBe(false);
        expect(headerHash("export {};")).toBeUndefined();
    });
});
