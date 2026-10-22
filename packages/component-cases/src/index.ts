// `@pureform/component-cases`: what the shared suites and Storybook know about each component,
// without naming a framework or a test runner. See the README.

import { COMPONENTS } from "./cases";
import type { ComponentCase } from "./types";
import { setUserEvent, type UserEvent } from "./user-event";

/** Every component's case, acting through `userEvent` (the runner's: Vitest's, Storybook's). */
export const createCases = (userEvent: UserEvent): readonly ComponentCase[] => {
    setUserEvent(userEvent);
    return COMPONENTS;
};

export { COMPONENTS };
export { animationsDone } from "./animations";
export { button } from "./cases/button";
export { menu } from "./cases/menu";
export { switchControl } from "./cases/switch";
export { tabsCase } from "./cases/tabs";
export { textField } from "./cases/text-field";
export { toastCase } from "./cases/toast";
export { COMPONENT_NAMES } from "./scene";
export type { ComponentName, SceneProps } from "./scene";
export * from "./types";
export type { UserEvent } from "./user-event";
