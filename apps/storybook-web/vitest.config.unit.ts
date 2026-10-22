// The codegen's own specs (`scripts/**/*.spec.ts`), under Node.

import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        include: ["scripts/**/*.spec.ts"],
        testTimeout: 30_000,
    },
});
