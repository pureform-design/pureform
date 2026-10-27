import { createRegistry } from "@pureform/styling";
import { describe, expect, it } from "vitest";

import {
    classEntry,
    lazyFactoryError,
    serverLazyFactoryMessage,
} from "./entries";

const registry = createRegistry({
    button: () => ({ root: { class: "button" } }),
    chip: { lazy: () => new Promise<never>(() => {}) },
});

describe("classEntry", () => {
    it("returns the provider registry's entry", () => {
        expect(classEntry({ registry }, "button").kind).toBe("static");
        expect(classEntry({ registry }, "chip").kind).toBe("lazy");
    });

    it("names what's missing", () => {
        expect(() => classEntry({ registry: undefined }, "button")).toThrow(
            /PureformProvider registry/,
        );
        expect(() => classEntry({ registry }, "card")).toThrow(/card/);
    });
});

describe("lazy entry messages", () => {
    it("point at the hook to use instead", () => {
        expect(lazyFactoryError("chip").message).toMatch(
            /useLazyClassFactory\("chip"\)/,
        );
        expect(serverLazyFactoryMessage("chip")).toMatch(/server render/);
    });
});
