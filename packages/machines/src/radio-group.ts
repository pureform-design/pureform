// Zag's radio group, re-exported so bindings take every machine from one package, with pureform's
// form rules on its machine: the browser's fieldset rule around the group element, and no reset of
// its own (the bindings own it).

import { machine as zagMachine } from "@zag-js/radio-group";

import { withFieldsetRule, zagElement } from "./zag-form";

export * from "@zag-js/radio-group";

/** Zag's radio group machine, with pureform's fieldset rule and no reset of its own. */
export const machine: typeof zagMachine = withFieldsetRule(
    zagMachine,
    zagElement("root", (id) => `radio-group:${id}`),
);
