import type { UserWorkspaceConfig } from "vitest/config";

export default {
    test: {
        include: ["src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    },
} satisfies UserWorkspaceConfig;
