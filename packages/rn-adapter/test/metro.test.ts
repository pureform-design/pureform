import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { runInNewContext } from "node:vm";

import { afterAll, describe, expect, it } from "vitest";

import { withPureform } from "../src/metro";
import { OPTIONS_ENV } from "../src/metro-options";

const fixture = resolve(__dirname, "metro");
const repository = resolve(__dirname, "../../..");
const require = createRequire(join(fixture, "index.js"));
const Metro = require("metro") as typeof import("metro");
const { getDefaultConfig } = require("@react-native/metro-config") as {
    getDefaultConfig: (root: string) => object;
};

const out = mkdtempSync(join(tmpdir(), "pureform-metro-"));
afterAll(() => rmSync(out, { recursive: true, force: true }));

// The fixture's Metro config, with pureform's transformer loaded from source.
const metroConfig = () => {
    const config = withPureform(
        Metro.mergeConfig(getDefaultConfig(fixture), {
            projectRoot: fixture,
            watchFolders: [repository],
            resetCache: true,
            cacheStores: [],
        }) as Parameters<typeof withPureform>[0],
        { watch: ["styles.pureform.ts"] },
    );
    return {
        ...config,
        transformer: {
            ...config.transformer,
            babelTransformerPath: join(fixture, "transformer.cjs"),
        },
    };
};

describe("withPureform", () => {
    it("bundles a pureform file's precomputed styles, and none of the lowering", async () => {
        const bundle = join(out, "bundle.js");
        await Metro.runBuild(
            await Metro.loadConfig({ cwd: fixture }, metroConfig() as never),
            {
                entry: "./index.js",
                platform: "ios",
                minify: false,
                dev: false,
                out: bundle,
            },
        );
        const code = readFileSync(bundle, "utf8");
        expect(code).toContain(
            "Precomputed by pureform from styles.pureform.ts.",
        );
        expect(code).not.toMatch(/chroma|lowerRn|createJiti/);

        // The bundle runs as the app would, and leaves the styles on its global.
        const app = {} as {
            pureformStyles?: { themes: object; components: object };
        };
        runInNewContext(code, app);
        expect(app.pureformStyles!.mode).toBe("precomputed");
        expect(Object.keys(app.pureformStyles!.templates)).toEqual(["button"]);
        expect(Object.keys(app.pureformStyles!.themes)).toEqual(["base:light"]);
    }, 120_000);

    it("keys the transform cache by the watched files' contents", async () => {
        const watched = join(out, "config.ts");
        writeFileSync(watched, "export const a = 1;");
        process.env[OPTIONS_ENV] = JSON.stringify({
            upstream: require.resolve("@react-native/metro-babel-transformer"),
            watch: [watched],
        });
        const { getCacheKey } = await import("../src/metro-transformer");
        const before = getCacheKey();
        expect(getCacheKey()).toBe(before);
        writeFileSync(watched, "export const a = 2;");
        expect(getCacheKey()).not.toBe(before);
    });
});
