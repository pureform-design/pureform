// A registry over the preset's React Native styles, as the generated registry would hold it:
// each entry a component's factory with its instance tokens' keys.

import { nativeFactory } from "@pureform/rn-adapter/factory";
import type { NativeFactory } from "@pureform/rn-adapter/factory";
import { createRegistry } from "@pureform/styling";
import type { Registry } from "@pureform/styling";
import { commands } from "vitest/browser";

export type TestRegistry = Registry<Record<string, NativeFactory>>;

/** A registry of the preset's components, the ones in `lazy` loaded on demand. */
export const presetRegistry = async (
    components: readonly string[],
    lazy: readonly string[] = [],
): Promise<TestRegistry> => {
    const names = [...components, ...lazy];
    const styles = await commands.nativeStyles(names);
    const keys = await commands.tokenKeys(names);
    const factory = (name: string) => nativeFactory(name, styles, keys[name]);
    return createRegistry({
        ...Object.fromEntries(components.map((name) => [name, factory(name)])),
        ...Object.fromEntries(
            lazy.map((name) => [
                name,
                { lazy: () => Promise.resolve(factory(name)) },
            ]),
        ),
    }) as unknown as TestRegistry;
};
