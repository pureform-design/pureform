import { nativeFactory } from "@pureform/rn-adapter/factory";
import { createRegistry } from "@pureform/styling";
import { runtime, runtimeTokens } from "virtual:pureform-rn";

import { reactDomAdapter } from "../react/adapter";

// Every component a factory over styles resolved at run time (see `.storybook/main.ts`).
const registry = createRegistry(
    Object.fromEntries(
        Object.entries(runtimeTokens).map(([name, tokens]) => [
            name,
            nativeFactory(name, runtime, tokens),
        ]),
    ),
);

export const nativeAdapter = reactDomAdapter(
    "native",
    "React Native",
    registry,
);
