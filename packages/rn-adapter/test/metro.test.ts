import {
    mkdtempSync,
    readFileSync,
    realpathSync,
    rmSync,
    writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { runInNewContext } from "node:vm";

import { afterAll, describe, expect, it } from "vitest";

import type { PrecomputedStyles } from "../src";
import { withPureform } from "../src/metro";
import { OPTIONS_ENV } from "../src/metro-options";

const fixture = resolve(__dirname, "metro");
const require = createRequire(join(fixture, "index.js"));
const Metro = require("metro") as typeof import("metro");
const { getDefaultConfig } =
    require("@react-native/metro-config") as typeof import("@react-native/metro-config");

const out = mkdtempSync(join(tmpdir(), "pureform-metro-"));
afterAll(() => rmSync(out, { recursive: true, force: true }));

const folderOf = (file: string) => dirname(realpathSync(file));

// Metro crawls every file it watches and hashes its contents, so the test watches only what
// the bundle reads: this package (the fixture, and its links into node_modules), the Babel
// helpers the fixture imports, Metro's runtime, and the polyfills React Native puts before
// the app. Watching the repository hashed every installed package and omni's cache,
// gigabytes that took minutes on a busy machine or a slow disk.
const watchFolders = (defaults: ReturnType<typeof getDefaultConfig>) => [
    resolve(__dirname, ".."),
    folderOf(require.resolve("@babel/runtime/package.json")),
    folderOf(
        createRequire(require.resolve("metro")).resolve(
            "metro-runtime/package.json",
        ),
    ),
    ...defaults.serializer.getPolyfills({ platform: "ios" }).map(folderOf),
];

// The fixture's Metro config, with pureform's transformer loaded from source.
const metroConfig = () => {
    const defaults = getDefaultConfig(fixture);
    const config = withPureform(
        Metro.mergeConfig(defaults, {
            projectRoot: fixture,
            watchFolders: watchFolders(defaults),
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
        const app = {} as { pureformStyles?: PrecomputedStyles };
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
