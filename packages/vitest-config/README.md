# @pureform/vitest-config

The workspace's shared Vitest configuration: one project config per kind of test, which each
package merges into its own `vitest.config.*.ts`, and a global setup for browser-mode projects. It
depends on nothing but Vite and Vitest (peers); every package with tests depends on it.

## What's in it

The package ships its TypeScript sources (`./*` maps to `src/*.ts`); there is no build.

| Subpath                                  | What it is                                                                                                                                                |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@pureform/vitest-config/unit`           | Unit tests: `src/**/*.test.*` outside `__tests__/` and the component tests, a 1 s limit per test, and the type assertions in the same specs checked       |
| `@pureform/vitest-config/component`      | Component tests: `src/**/*.component.spec.*`, real components rendered in Chromium (browser mode), a 30 s limit per test, and the type assertions checked |
| `@pureform/vitest-config/integration`    | Integration tests: `src/**/__tests__/**/*.test.*`                                                                                                         |
| `@pureform/vitest-config/service`        | Service tests: `src/**/*.service.test.*`                                                                                                                  |
| `@pureform/vitest-config/e2e`            | End-to-end and smoke tests: `src/**/*.e2e.test.*`                                                                                                         |
| `@pureform/vitest-config/coverage`       | The V8 coverage defaults every config above carries, inert unless a run passes `--coverage`                                                               |
| `@pureform/vitest-config/browser-warmup` | A global setup for a browser-mode project: compiles the test files' modules before any test runs (below)                                                  |

```ts
import e2eTestConfig from "@pureform/vitest-config/e2e";
import { mergeConfig } from "vitest/config";

import baseConfig from "./vite.config";

export default mergeConfig(mergeConfig(baseConfig, e2eTestConfig), {
    test: {
        globalSetup: ["@pureform/vitest-config/browser-warmup"],
        browser: { enabled: true /* … */ },
    },
});
```

## The browser warm-up

In browser mode, Vite compiles each module the first time the page asks for it, so a cold
server compiles the whole page inside the first test's hooks, and its dependency optimizer
bundles the dependencies it finds on the way, which reloads the page and fails the test file
("Vite unexpectedly reloaded a test"). On a loaded machine the first can outlast the hook's
limit, and the second happens more often.

`browser-warmup` does that work in the global setup instead, on the server the browser loads
from (the project's `client` environment):

1. it starts the dependency optimizer, which otherwise starts with the browser's first request;
2. it compiles each test file, then every module a compiled one imports, statically or
   dynamically, until none is left (a stylesheet's imports are skipped: they are the files its
   compiler read, which the page never requests);
3. it waits for the optimizer to bundle the dependencies the compiling found; when the new
   bundle replaces the old one, Vite drops every compiled module, so it compiles them again,
   until a round ends with the bundle unchanged.

It gives up with an error after 5 minutes. Listing a project's dependencies in
`optimizeDeps.include` still pays: the first bundle has them, and the round that compiles
everything a second time is skipped.

## Building and testing

Nothing to build; the packages that use it test it (`test:e2e` in each demo for the warm-up).
