import { writeFileSync } from "node:fs";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { fakeAdapter, tempRoot, writeTree } from "./__fixtures__/project";
import type { GenerateTargetsResult as GenerateResult } from "./targets";
import { watchGenerate } from "./watch";
import type { GenerateWatcher } from "./watch";

const config = (name: string) =>
    `import { ${name} } from "./parts";\nexport default { tokens: {}, semanticTokens: {}, components: { ${name} } };\n`;

const parts = `export const chip = { kind: "component", name: "chip", recipe: { base: {} } };\nexport const divider = { kind: "component", name: "divider", recipe: { base: {} } };\n`;

// Resolves on the next call of a callback.
const next = <T>() => {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>((done) => (resolve = done));
    return { promise, resolve };
};

describe("watchGenerate", () => {
    let watcher: GenerateWatcher | undefined;
    afterEach(() => watcher?.close());

    it("generates, then again when the config or a file it imports changes", async () => {
        const root = tempRoot();
        writeTree(root, {
            "pureform.config.ts": config("chip"),
            "parts.ts": parts,
            "unrelated.ts": "export {};\n",
        });
        const adapter = fakeAdapter();
        let result = next<GenerateResult>();
        watcher = watchGenerate(
            { root, config: "pureform.config.ts", target: adapter },
            { onResult: (value) => result.resolve(value), delay: 10 },
        );
        const first = await watcher.ready;
        expect(first?.changed).toBe(true);
        expect(await result.promise).toBe(first);

        result = next();
        writeFileSync(join(root, "unrelated.ts"), "export const x = 1;\n");
        writeFileSync(join(root, "pureform.config.ts"), config("divider"));
        const second = await result.promise;
        expect(second.files.map((file) => file.path)).toContain(
            "fake/full/web/divider.ts",
        );

        result = next();
        writeFileSync(
            join(root, "parts.ts"),
            parts.replace('"divider" }', '"divider", slots: ["root"] }'),
        );
        await result.promise;
        expect(adapter.calls).toHaveLength(3);
    });

    it("reports a failed run, keeps watching, and recovers", async () => {
        const root = tempRoot();
        writeTree(root, { "pureform.config.ts": "export default 1;\n" });
        const error = next<unknown>();
        let result = next<GenerateResult>();
        watcher = watchGenerate(
            { root, config: "pureform.config.ts", target: fakeAdapter() },
            {
                onError: (value) => error.resolve(value),
                onResult: (value) => result.resolve(value),
                delay: 10,
            },
        );
        expect(await watcher.ready).toBeUndefined();
        expect(String(await error.promise)).toContain("pureform:");
        result = next();
        writeTree(root, { "parts.ts": parts });
        writeFileSync(join(root, "pureform.config.ts"), config("chip"));
        expect((await result.promise).ok).toBe(true);
    });

    it("stops on close", async () => {
        const root = tempRoot();
        writeTree(root, {
            "pureform.config.ts": config("chip"),
            "parts.ts": parts,
        });
        const adapter = fakeAdapter();
        watcher = watchGenerate(
            { root, config: "pureform.config.ts", target: adapter },
            { delay: 10 },
        );
        await watcher.ready;
        watcher.close();
        writeFileSync(join(root, "pureform.config.ts"), config("divider"));
        await new Promise((done) => setTimeout(done, 100));
        expect(adapter.calls).toHaveLength(1);
    });
});
