import { defineProject, mergeConfig } from "vitest/config";

import { coverage } from "./coverage.ts";

export default mergeConfig(
    defineProject({
        test: {
            testTimeout: 1000,
            include: ["./src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
            exclude: [
                "./src/**/__tests__/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
            ],
            // Check the type assertions (expectTypeOf, @ts-expect-error) in the same specs,
            // which the runtime run passes regardless, and type errors in the sources they load.
            typecheck: {
                enabled: true,
                include: ["./src/**/*.{test,spec}.{ts,mts,cts,tsx}"],
            },
        },
    }),
    { test: { coverage } },
);
