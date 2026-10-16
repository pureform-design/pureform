/// <reference types="node" />
// Metro integration: precompute a pureform config while Metro bundles, as the Vite plugin does
// for the web. A file named `*.pureform.ts` (or .tsx, .js, .mjs) default-exports
// `precompute(config, options)`. Metro hands it to pureform's transformer, which runs it in
// Node and bundles the styles it returns, so the app ships the precomputed data and none of
// the lowering. Without the transformer, the file still works by precomputing at startup.
//
//   // metro.config.js
//   const { getDefaultConfig } = require("@react-native/metro-config");
//   const { withPureform } = require("@pureform/rn-adapter/metro");
//   module.exports = withPureform(getDefaultConfig(__dirname), { watch: ["src/theme"] });

import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import { OPTIONS_ENV } from "./metro-options";
import type { TransformerOptions } from "./metro-options";

const require_ = createRequire(import.meta.url);

// This module's own address. Read apart from `new URL`, which Vite would take for an asset.
const here = import.meta.url;

export interface PureformMetroOptions {
    /** Files and folders a `*.pureform.*` file reads, such as the config, whose contents key
     *  Metro's cache: a change to them precomputes again on Metro's next start. Metro caches
     *  a file's transform by its own contents, so without them, a config change needs
     *  `--reset-cache`. */
    watch?: string[];
}

interface MetroConfig {
    projectRoot?: string;
    transformer?: { babelTransformerPath?: string; [key: string]: unknown };
    [key: string]: unknown;
}

const DEFAULT_TRANSFORMER = "@react-native/metro-babel-transformer";

/** A Metro config with pureform's transformer in front of its Babel transformer, React
 *  Native's or Expo's, which every other file still goes through. */
export const withPureform = <C extends MetroConfig>(
    config: C,
    options: PureformMetroOptions = {},
): C => {
    const root = config.projectRoot ?? process.cwd();
    const upstream =
        config.transformer?.babelTransformerPath ??
        require_.resolve(DEFAULT_TRANSFORMER, { paths: [root] });
    const transformer: TransformerOptions = {
        upstream,
        watch: (options.watch ?? []).map((path) =>
            path.startsWith("/") ? path : `${root}/${path}`,
        ),
    };
    // Metro's transform workers start after the config loads, and inherit the environment.
    process.env[OPTIONS_ENV] = JSON.stringify(transformer);
    return {
        ...config,
        transformer: {
            ...config.transformer,
            // Beside this module, built or not.
            babelTransformerPath: fileURLToPath(
                new URL(`./metro-transformer${here.match(/\.\w+$/)![0]}`, here),
            ),
        },
    };
};
