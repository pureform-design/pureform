import type { TestProjectConfiguration } from "vitest/config";

export default [
    "./**/vitest.config.{unit,e2e,integration,api}.ts",
] satisfies TestProjectConfiguration[];
