import base from "@pureform/oxlint-config/base";
import jsx from "@pureform/oxlint-config/jsx";
import solid from "@pureform/oxlint-config/solid";
import { defineConfig } from "oxlint";

export default defineConfig({
    extends: [base, jsx, solid],
});
