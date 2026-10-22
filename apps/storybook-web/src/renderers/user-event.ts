// The user events the cases act through in Storybook: `storybook/test`'s, which the Interactions
// panel records. Under Vitest, `.storybook/main.ts` aliases `#user-event` to
// `user-event.vitest.ts` instead.

import { userEvent as storybookUserEvent } from "storybook/test";

// Imported, then exported: Storybook's build rewrites `storybook/test` imports to a global, which
// a re-export (`export … from`) breaks.
export const userEvent = storybookUserEvent;
