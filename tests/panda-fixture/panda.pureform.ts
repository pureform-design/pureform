// The pureform preset for Panda: the fixture's config (`pureform.config.ts`) compiled by the
// Panda adapter. `panda.config.ts` hands it to Panda, and the browser suites import it (with the
// config and the prefix) to compare what Panda generated against what the preset declares.

// Extensionless: the browser suites' tsconfig, which checks this file through their imports,
// doesn't allow `.ts` import paths.
import { compilePreset } from "@pureform/panda-adapter";

import { PREFIX } from "./pureform.codegen";
import pureformConfig from "./pureform.config";

export { PREFIX, pureformConfig };

export const pureformPreset = compilePreset(pureformConfig, {
    name: "pureform",
    prefix: PREFIX,
});
