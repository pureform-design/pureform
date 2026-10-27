// What the smoke test's global setup (`vitest-e2e-server.ts`) provides and the test
// (`src/demo.e2e.test.ts`) injects. Both tsconfigs include it: `tsconfig.node.json` checks the
// setup's `project.provide` calls against it, and `tsconfig.json` the test's `inject` calls.

export {};

declare module "vitest" {
    interface ProvidedContext {
        /** The demo's dev server, started and warmed up by `vitest-e2e-server.ts`. */
        demoUrl: string;
        /** A system Chromium to use instead of Playwright's download, or "". */
        chromiumPath: string;
    }
}
