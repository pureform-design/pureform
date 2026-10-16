// The pureform plugin for Rolldown:
//
//   import pureform from "@pureform/bundler/rolldown";
//   pureform({ target: "panda", options: { prefix: "pf" } });

import { pureform as plugin } from "./plugin";

export type { PureformPluginOptions } from "./options";

/** The pureform plugin for Rolldown. */
export const pureform = plugin.rolldown;

export default pureform;
