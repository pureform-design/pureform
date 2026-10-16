// The pureform plugin for Vite:
//
//   import pureform from "@pureform/bundler/vite";
//   pureform({ target: "panda", options: { prefix: "pf" } });

import { pureform as plugin } from "./plugin";

export type { PureformPluginOptions } from "./options";

/** The pureform plugin for Vite. */
export const pureform = plugin.vite;

export default pureform;
