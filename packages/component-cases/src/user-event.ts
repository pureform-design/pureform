// The user the cases act as. The cases don't import a test runner's `userEvent`: the runner passes
// its own to `createCases` (Vitest's `vitest/browser`, Storybook's `storybook/test`), and the
// cases' actions call it through `userEvent` here.

/** The part of a `userEvent` the cases use. Vitest's and Testing Library's both fit. */
export interface UserEvent {
    click(element: Element, options?: any): Promise<unknown>;
    /** Moves the pointer off the element. */
    unhover(element: Element, options?: any): Promise<unknown>;
    keyboard(text: string): Promise<unknown>;
    type(element: Element, text: string, options?: any): Promise<unknown>;
    selectOptions(
        element: HTMLElement,
        values: string | string[],
        options?: any,
    ): Promise<unknown>;
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
export const userEvent = {
    click: async (element: Element, options?: unknown): Promise<void> => {
        await user().click(element, options);
    },
    unhover: async (element: Element): Promise<void> => {
        await user().unhover(element);
    },
    keyboard: async (text: string): Promise<void> => {
        await user().keyboard(text);
    },
    type: async (
        element: Element,
        text: string,
        options?: unknown,
    ): Promise<void> => {
        await user().type(element, text, options);
    },
    selectOptions: async (
        element: HTMLElement,
        values: string | string[],
        options?: unknown,
    ): Promise<void> => {
        await user().selectOptions(element, values, options);
    },
};
