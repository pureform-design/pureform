// A config as an app writes it: importing pureform packages and its own files.

import { defineConfig } from "@pureform/core";

import { divider } from "./divider";

export default defineConfig({
    tokens: {},
    semanticTokens: {},
    components: { divider },
});
