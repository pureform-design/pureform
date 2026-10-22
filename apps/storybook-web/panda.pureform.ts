// The pureform preset for Panda: the demo's config (`pureform.config.ts`) compiled by the Panda
// adapter.

import { compilePreset } from "@pureform/panda-adapter";

import { PREFIX } from "./pureform.codegen";
import pureformConfig from "./pureform.config";

export { PREFIX, pureformConfig };

export const pureformPreset = compilePreset(pureformConfig, {
    name: "pureform",
    prefix: PREFIX,
});
