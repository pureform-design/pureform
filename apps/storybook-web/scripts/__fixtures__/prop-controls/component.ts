// A component export as a binding declares it: binding-core's props through `Omit`, and its own.

import type { FixtureProps } from "./binding-core/props";
import type { DomProps } from "./dom/props";

export declare const Fixture: (
    props: Omit<FixtureProps, "never"> & DomProps,
) => unknown;
