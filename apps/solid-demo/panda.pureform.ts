// The pureform preset for Panda: the demo's config (`pureform.config.ts`) compiled by the Panda
// adapter.

import { compilePreset } from "@pureform/panda-adapter";

import pureformConfig from "./pureform.config";

export { pureformConfig };

/** The var prefix the preset names component vars with; `.pureform/`'s factories use it too. */
export const PREFIX = "pf";

export const pureformPreset = compilePreset(pureformConfig, {
    name: "pureform",
    prefix: PREFIX,
});
