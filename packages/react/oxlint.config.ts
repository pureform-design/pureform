import base from "@pureform/oxlint-config/base";
import jsx from "@pureform/oxlint-config/base";
import react from "@pureform/oxlint-config/base";
import { defineConfig } from "oxlint";

export default defineConfig({
    extends: [base, jsx, react],
});
