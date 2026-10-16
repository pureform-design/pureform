// The pureform preset for Panda: the demo's config (`pureform.config.ts`) compiled by the Panda
// adapter.

import { compilePreset } from "@pureform/panda-adapter";

import pureformConfig from "./pureform.config";
import { PREFIX } from "./pureform.glue";

export { PREFIX, pureformConfig };

export const pureformPreset = compilePreset(pureformConfig, {
    name: "pureform",
    prefix: PREFIX,
});
