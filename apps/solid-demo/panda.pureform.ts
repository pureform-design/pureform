// The pureform preset for Panda: the composed pureform config compiled by the Panda adapter.

import { compilePreset } from "@pureform/panda-adapter";
import { pureform } from "@pureform/preset";

export const pureformPreset = compilePreset(pureform(), {
    name: "pureform",
    prefix: "pf",
});
