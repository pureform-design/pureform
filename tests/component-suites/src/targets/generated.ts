// Writes the CSS and Tailwind targets' registries from the Panda fixture's config, once per run,
// before the projects start (`vitest.config.browser.ts` awaits it): `.pureform/css` and
// `.pureform/tailwind`, with every component, so a component the config has is in every registry.
// The Panda target's registry is the fixture's own (`tests/panda-fixture/.pureform`, its omni
// `generate` task).

import { fileURLToPath } from "node:url";

import type { CssCodegenOptions } from "@pureform/css-adapter/codegen";
import { generate } from "@pureform/generate";
import type { GenerateResult } from "@pureform/generate";
import type { TailwindCodegenOptions } from "@pureform/tailwind-adapter/codegen";

const root = fileURLToPath(new URL("../..", import.meta.url));

/** The config every target is generated from: the Panda fixture's. */
export const CONFIG = fileURLToPath(
    new URL("../../../panda-fixture/pureform.config.ts", import.meta.url),
);

/** Each generated target's options: classes and component vars prefixed as the Panda fixture's. */
export const GENERATED = {
    css: {
        target: "css",
        options: {
            prefix: "pf",
            classPrefix: "pf",
        } satisfies CssCodegenOptions,
    },
    tailwind: {
        target: "tailwind",
        options: {
            prefix: "pf",
            classPrefix: "pf",
        } satisfies TailwindCodegenOptions,
    },
} as const;

/** Writes `.pureform/<target>` for the CSS and Tailwind targets. */
export const generateRegistries = (): Promise<GenerateResult[]> =>
    Promise.all(
        Object.entries(GENERATED).map(([name, options]) =>
            generate({
                ...options,
                root,
                config: CONFIG,
                outDir: `.pureform/${name}`,
            }),
        ),
    );
