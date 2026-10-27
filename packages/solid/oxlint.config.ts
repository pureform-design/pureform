import base from "@pureform/oxlint-config/base";
import { ignorePatterns } from "@pureform/oxlint-config/ignores";
import jsx from "@pureform/oxlint-config/jsx";
import solid from "@pureform/oxlint-config/solid";
import { defineConfig } from "oxlint";

export default defineConfig({
    ignorePatterns,
    extends: [base, jsx, solid],
    rules: {
        "solid/reactivity": [
            "warn",
            {
                // Calls that take accessors and read them only where they're tracked:
                // `sources.item(value, source)` returns an accessor over both,
                // `value.reset(update)` runs `update` synchronously during a form reset, and
                // `slots(part, instance)` (`SlotPropsOf`) reads a repeated part's instance
                // accessor inside the merge it returns.
                customReactiveFunctions: ["item", "reset", "slot", "slots"],
            },
        ],
    },
});
