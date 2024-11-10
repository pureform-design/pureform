import type { WorkspaceProjectConfiguration } from "vitest/config";

export default [
    "./**/vitest.config.{unit,e2e,integration}.ts",
] satisfies WorkspaceProjectConfiguration[];
