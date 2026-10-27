import { createConfig } from "@pureform/oxlint-config/base";
import { ignorePatterns } from "@pureform/oxlint-config/ignores";
import { defineConfig } from "oxlint";

// The workspace's root config. Its `options` apply only while it is the root, so a package's lint
// runs from the workspace root (`check:lint`); a package config (`packages/react`'s) is nested
// under it and adds its plugins and rules.
export default defineConfig({
    options: {
        reportUnusedDisableDirectives: "deny",
        typeAware: true,
        typeCheck: true,
    },
    extends: [createConfig()],
    ignorePatterns,
});
