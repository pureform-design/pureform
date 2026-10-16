// The pureform plugin for Rollup:
//
//   import pureform from "@pureform/bundler/rollup";
//   pureform({ target: "panda", options: { prefix: "pf" } });

import { pureform as plugin } from "./plugin";

export type { PureformPluginOptions } from "./options";

/** The pureform plugin for Rollup. */
export const pureform = plugin.rollup;

export default pureform;
