// The user the cases act as. The cases don't import a test runner's `userEvent`: the runner passes
// its own to `createCases` (Vitest's `vitest/browser`, Storybook's `storybook/test`), and the
// cases' actions call it through `userEvent` here.

/** The part of a `userEvent` the cases use. Vitest's and Testing Library's both fit. */
export interface UserEvent {
    click(element: Element, options?: any): Promise<void>;
    keyboard(text: string): Promise<void>;
    type(element: Element, text: string, options?: any): Promise<void>;
}

let current: UserEvent | undefined;

/** Sets the `userEvent` the cases act with; `createCases` calls it. */
export const setUserEvent = (user: UserEvent): void => {
    current = user;
};

const user = (): UserEvent => {
    if (!current) {
        throw new Error(
            "@pureform/component-cases: call createCases(userEvent) before acting",
        );
    }
    return current;
};

/** What the cases call: the `userEvent` given to `createCases`. */
export const userEvent: UserEvent = {
    click: (element, options) => user().click(element, options),
    keyboard: (text) => user().keyboard(text),
    type: (element, text, options) => user().type(element, text, options),
};
