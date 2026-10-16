// Hand-written in the shape `pureform generate` will write (p4b-panda replaces it): the
// `staticCss` entries that keep every variant of the registered components. Panda's extractor
// can't see variants picked through the registry, so `panda.config.ts` spreads these in.

import type { Config } from "@pandacss/dev";

export const staticCss = {
    recipes: { button: ["*"], checkbox: ["*"] },
} satisfies NonNullable<Config["staticCss"]>;
