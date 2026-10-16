// The pureform plugin for Esbuild:
//
//   import pureform from "@pureform/bundler/esbuild";
//   pureform({ target: "panda", options: { prefix: "pf" } });

import { pureform as plugin } from "./plugin";

export type { PureformPluginOptions } from "./options";

/** The pureform plugin for Esbuild. */
export const pureform = plugin.esbuild;

export default pureform;
