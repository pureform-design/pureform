// Zag's switch, re-exported so bindings take every machine from one package, with pureform's form
// rules on its machine: the browser's fieldset rule around the native input, and no reset of its
// own (the bindings own it; Zag's sends an untrusted change during the `reset` event).

import { machine as zagMachine } from "@zag-js/switch";

import { withFieldsetRule, zagElement } from "./zag-form";

export * from "@zag-js/switch";

/** Zag's switch machine, with pureform's fieldset rule and no reset of its own. */
export const machine: typeof zagMachine = withFieldsetRule(
    zagMachine,
    zagElement("hiddenInput", (id) => `switch:${id}:input`),
);
