// The user events the cases act through in Storybook: `storybook/test`'s, which the Interactions
// panel records. Under Vitest, `.storybook/main.ts` aliases `#user-event` to
// `user-event.vitest.ts` instead.

export { userEvent } from "storybook/test";
