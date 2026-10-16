// Looking up a component's registry entry for the class hooks, and the errors and warnings they
// give about lazy entries, the same in every web binding.

import type {
    ClassFactory,
    ComponentName,
    RegistryEntry,
} from "@pureform/styling";

import { requireRegistry } from "./provider";
import type { ProviderState } from "./provider";

/** The registry entry for `name` from the provider's registry; throws when there's no registry
 *  or no such component. */
export const classEntry = <N extends ComponentName>(
    state: Pick<ProviderState, "registry">,
    name: N,
): RegistryEntry<ClassFactory<N>> =>
    requireRegistry(state).entry(name) as RegistryEntry<ClassFactory<N>>;

/** The error `useClassFactory` throws for a lazy entry. */
export const lazyFactoryError = (name: string): Error =>
    new Error(
        `pureform: "${name}" loads on demand, so its factory isn't there yet. Use useLazyClassFactory("${name}"), or useClasses for classes.`,
    );

/** The development warning when `useLazyClassFactory` runs during a server render. */
export const serverLazyFactoryMessage = (name: string): string =>
    `pureform: useLazyClassFactory("${name}") ran during a server render. A factory can't be serialized, so its boundary renders the fallback on the server and loads on the client; use useClasses for classes that render on the server.`;
