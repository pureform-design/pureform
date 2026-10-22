// The component cases (`@pureform/component-cases`), acting through Vitest's `userEvent`.

import { createCases } from "@pureform/component-cases";
import { userEvent } from "vitest/browser";

export * from "@pureform/component-cases";

export const COMPONENTS = createCases(userEvent);
