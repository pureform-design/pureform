// The type-level specs (`*.types.spec.ts`), which Vitest's typecheck checks; nothing here needs a
// browser. The components' specs are the component tests (`vitest.config.component.ts`).

import unitTestConfig from "@pureform/vitest-config/unit";
import { mergeConfig, type UserWorkspaceConfig } from "vitest/config";

import baseConfig from "./vite.config.ts";

export default mergeConfig(mergeConfig(baseConfig, unitTestConfig), {
    // The library build leaves TypeScript to the app; the tests compile it here.
    oxc: {},
} satisfies UserWorkspaceConfig);
