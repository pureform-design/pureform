import base from "@pureform/oxlint-config/base";
import { ignorePatterns } from "@pureform/oxlint-config/ignores";
import jsx from "@pureform/oxlint-config/jsx";
import react from "@pureform/oxlint-config/react";
import { defineConfig } from "oxlint";

export default defineConfig({
    ignorePatterns,
    extends: [base, jsx, react],
});
