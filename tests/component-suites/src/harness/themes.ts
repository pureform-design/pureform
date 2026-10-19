// The runtime theme a scene asks for, the same in the browser and on the server: Material's seed
// theme, through a source that counts how often it generates in this context, so a suite can
// tell that hydrating with `hydrate: "reuse"` generated nothing.

import { seedTheme } from "@pureform/material/runtime-theme";
import type { SeedThemeInput } from "@pureform/material/runtime-theme";
import { defineRuntimeTheme } from "@pureform/styling";
import type { RuntimeTheme } from "@pureform/styling";

import type { SceneProvider } from "./scene";

/** How often the seed theme has generated in this context (the page, or the server). */
export const generated = { count: 0 };

/** Material's seed theme, counting its generations. Its scope is the same as `seedTheme`'s. */
export const countedSeedTheme = defineRuntimeTheme<SeedThemeInput>(
    "material-seed",
    async () => {
        const generate = await seedTheme({ seed: "#000000" }).source.load();
        return (input, vars) => {
            generated.count++;
            return generate(input, vars);
        };
    },
);

/** Imports Material's seed generator, the module `countedSeedTheme` wraps, and leaves
 *  `countedSeedTheme`'s source unloaded: a provider still loads it after hydrating, without
 *  waiting on the import. */
export const importSeedGenerator = async (): Promise<void> => {
    await seedTheme({ seed: "#000000" }).source.load();
};

/** The provider's `theme` for a scene: its runtime theme when it has a seed, else its named
 *  theme. */
export const sceneTheme = (
    provider: SceneProvider | undefined,
): string | RuntimeTheme<SeedThemeInput> | undefined =>
    provider?.seed === undefined
        ? provider?.theme
        : countedSeedTheme({ seed: provider.seed });
