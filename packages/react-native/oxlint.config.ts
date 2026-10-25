import base from "@pureform/oxlint-config/base";
import jsx from "@pureform/oxlint-config/jsx";
import react from "@pureform/oxlint-config/react";
import { defineConfig } from "oxlint";

export default defineConfig({
    extends: [base, jsx, react],
});
