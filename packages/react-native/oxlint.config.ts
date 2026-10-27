import base from "@pureform/oxlint-config/base";
import { ignorePatterns } from "@pureform/oxlint-config/ignores";
import jsx from "@pureform/oxlint-config/jsx";
import react from "@pureform/oxlint-config/react";
import { defineConfig } from "oxlint";

export default defineConfig({
    ignorePatterns,
    extends: [base, jsx, react],
    rules: {
        // React Native has no HTML elements to prefer over a `role`: every part is a View, Text or
        // Pressable, which takes its semantics from `role`.
        "jsx-a11y/prefer-tag-over-role": "off",
        // `adjustable` is React Native's role for a value control (a slider, a picker's wheel).
        "jsx-a11y/aria-role": ["warn", { allowedInvalidRoles: ["adjustable"] }],
    },
});
