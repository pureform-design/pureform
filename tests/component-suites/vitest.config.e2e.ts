// The suites that need more than a component rendered in the page: the server rendering suite
// (Node renders, the page hydrates) and the indication benchmark, once per binding and web target
// (see `vitest.config.shared.ts`).

import e2eTestConfig from "@pureform/vitest-config/e2e";
import { mergeConfig } from "vitest/config";

import baseConfig from "./vite.config.ts";
import shared from "./vitest.config.shared.ts";

export default mergeConfig(mergeConfig(baseConfig, e2eTestConfig), shared);
