// Every component the shared suites run over. Add a component's case here.

import { button } from "./button";
import { checkbox } from "./checkbox";
import type { ComponentCase } from "./types";

export const COMPONENTS: readonly ComponentCase[] = [button, checkbox];

export type * from "./types";
export { byTestId } from "./types";
