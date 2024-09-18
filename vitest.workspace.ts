import type { WorkspaceProjectConfiguration } from "vitest/config";

export default [
    "packages/*",
    "apps/*",
] satisfies WorkspaceProjectConfiguration[];
