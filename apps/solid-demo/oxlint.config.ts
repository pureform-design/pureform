import base from "@pureform/oxlint-config/base";
import { ignorePatterns } from "@pureform/oxlint-config/ignores";
import jsx from "@pureform/oxlint-config/jsx";
import solid from "@pureform/oxlint-config/solid";
import { defineConfig } from "oxlint";

export default defineConfig({
    ignorePatterns,
    extends: [base, jsx, solid],
});
