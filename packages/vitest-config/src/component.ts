import { defineProject, mergeConfig } from "vitest/config";

import { coverage } from "./coverage.ts";

// Component tests: real components, with their providers, rendered in a real browser. A package
// adds its framework plugin, a `browser.provider`, and its test utilities on top of this; the
// files are `src/**/*.component.spec.*`, next to the component.
export default mergeConfig(
    defineProject({
        test: {
            // Generous: on a loaded machine a single user event can take seconds to come back, and a
            // test of several of them outlasts a few seconds without anything being wrong.
            testTimeout: 30_000,
            include: [
                "./src/**/*.component.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
            ],
            exclude: [
                "./src/**/__tests__/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
            ],
            // Check the type assertions (expectTypeOf, @ts-expect-error) in the same specs, and
            // type errors in the sources they load.
            typecheck: {
                enabled: true,
                include: ["./src/**/*.component.{test,spec}.{ts,mts,cts,tsx}"],
            },
            // The package adds its `provider` and `instances` (a viewport, a timezone, a locale).
            browser: {
                enabled: true,
                headless: true,
            },
        },
    }),
    { test: { coverage } },
);
